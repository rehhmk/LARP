import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [projectArg, policyArg] = process.argv.slice(2);
if (!projectArg || !policyArg) {
  console.error('usage: node work/verify-auth-policy.js <project.json> <auth-policy.js>');
  process.exit(2);
}

const projectPath = resolve(projectArg);
const policyPath = resolve(policyArg);
const project = JSON.parse(await readFile(projectPath, 'utf8'));
const { AUTH_POLICY } = await import(`${pathToFileURL(policyPath).href}?v=${Date.now()}`);
const decision = project.nodes?.['decision:auth'];
assert.ok(decision, 'decision:auth missing');
assert.equal(decision.kind, 'Decision');

const statement = decision.data?.statement ?? '';
const expectedDpop = /DPoP/i.test(statement);
assert.equal(AUTH_POLICY.flow, 'authorization_code');
assert.equal(AUTH_POLICY.pkce, 'S256');
assert.equal(AUTH_POLICY.dpop, expectedDpop, `AUTH_POLICY.dpop=${AUTH_POLICY.dpop} does not reflect decision expectation ${expectedDpop}`);
assert.equal(AUTH_POLICY.governingDecisionVersion, decision.version, `governingDecisionVersion=${AUTH_POLICY.governingDecisionVersion} does not match decision version=${decision.version}`);

console.log(JSON.stringify({
  status: 'PASS',
  projectPosition: project.projectPosition,
  decisionVersion: decision.version,
  expectedDpop,
  governingDecisionVersion: AUTH_POLICY.governingDecisionVersion,
}, null, 2));
