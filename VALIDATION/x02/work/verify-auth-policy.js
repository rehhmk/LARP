#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [projectArg, policyArg] = process.argv.slice(2);
if (!projectArg || !policyArg) {
  console.error('usage: node verify-auth-policy.js <project.json> <auth-policy.js>');
  process.exit(2);
}

const projectPath = resolve(projectArg);
const policyPath = resolve(policyArg);
const project = JSON.parse(await readFile(projectPath, 'utf8'));
const decision = project.nodes?.['decision:auth'];
assert.ok(decision, 'decision:auth must exist');

const source = await readFile(policyPath, 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
const { AUTH_POLICY, buildAuthorizationHeaders } = await import(moduleUrl);

assert.ok(AUTH_POLICY, 'AUTH_POLICY export must exist');
assert.equal(typeof buildAuthorizationHeaders, 'function', 'buildAuthorizationHeaders export must exist');

const statement = String(decision.data?.statement ?? '');
const expectsDpop = /\bDPoP\b/i.test(statement);
const expectedScheme = expectsDpop ? 'DPoP' : 'Bearer';

assert.equal(AUTH_POLICY.flow, 'authorization_code', 'auth flow must remain authorization_code');
assert.equal(AUTH_POLICY.pkce, 'S256', 'PKCE method must remain S256');
assert.equal(AUTH_POLICY.accessTokenAuthorization, expectedScheme, 'authorization scheme must reflect current decision:auth');
assert.equal(AUTH_POLICY.dpopProofRequired, expectsDpop, 'DPoP proof requirement must reflect current decision:auth');

if (expectsDpop) {
  assert.throws(
    () => buildAuthorizationHeaders({ accessToken: 'token-123' }),
    /DPoP/i,
    'DPoP policy must reject a request without proof input',
  );
  const headers = buildAuthorizationHeaders({ accessToken: 'token-123', dpopProof: 'proof-456' });
  assert.equal(headers.authorization, 'DPoP token-123');
  assert.equal(headers.DPoP, 'proof-456');
} else {
  const headers = buildAuthorizationHeaders({ accessToken: 'token-123' });
  assert.equal(headers.authorization, 'Bearer token-123');
  assert.equal(Object.hasOwn(headers, 'DPoP'), false, 'Bearer policy must not emit DPoP proof header');
}

console.log(JSON.stringify({
  status: 'PASS',
  projectId: project.projectId,
  projectPosition: project.projectPosition,
  decisionVersion: decision.version,
  decisionStatement: statement,
  expectsDpop,
  expectedScheme,
  authPolicy: AUTH_POLICY,
}));
