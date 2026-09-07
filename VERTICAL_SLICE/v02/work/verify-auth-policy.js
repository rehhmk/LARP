#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
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

const { AUTH_POLICY, isValidPkceVerifier } = await import(`${pathToFileURL(policyPath).href}?v=${Date.now()}`);
assert.ok(AUTH_POLICY, 'AUTH_POLICY export must exist');
const statement = String(decision.data?.statement ?? '');
const expectsDpop = /\bDPoP\b/i.test(statement);

assert.equal(AUTH_POLICY.flow, 'authorization_code', 'auth flow must remain authorization_code');
assert.equal(AUTH_POLICY.pkce, 'S256', 'PKCE method must be S256');
assert.equal(AUTH_POLICY.dpop, expectsDpop, 'AUTH_POLICY.dpop must reflect decision:auth');
assert.equal(typeof isValidPkceVerifier, 'function', 'isValidPkceVerifier export must exist');
assert.equal(isValidPkceVerifier('a'.repeat(43)), true, '43 unreserved characters must be accepted');
assert.equal(isValidPkceVerifier('A-._~z'.repeat(22).slice(0, 128)), true, '128 unreserved characters must be accepted');
assert.equal(isValidPkceVerifier('a'.repeat(42)), false, 'verifiers shorter than 43 characters must be rejected');
assert.equal(isValidPkceVerifier('a'.repeat(129)), false, 'verifiers longer than 128 characters must be rejected');
assert.equal(isValidPkceVerifier(`${'a'.repeat(42)}!`), false, 'non-unreserved characters must be rejected');

console.log(JSON.stringify({
  status: 'PASS',
  projectId: project.projectId,
  projectPosition: project.projectPosition,
  decisionVersion: decision.version,
  expectsDpop,
  authPolicy: AUTH_POLICY,
}));
