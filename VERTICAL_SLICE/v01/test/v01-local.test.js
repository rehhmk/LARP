import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LineMcpClient } from '../../../ADAPTER/test/mcp-client.js';
import { applyApprovedProposal } from '../../../ADAPTER/src/governance.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const REPO = resolve(ROOT, '../..');
const SERVER = join(REPO, 'ADAPTER/src/server.js');
const FIXTURE = join(ROOT, 'fixture/project.initial.json');
const POLICY_FIXTURE = join(ROOT, 'fixture/auth-policy.initial.js');
const VERIFIER = join(ROOT, 'work/verify-auth-policy.js');

async function countJsonl(path) {
  try {
    const text = await readFile(path, 'utf8');
    return text.split(/\r?\n/).filter(Boolean).length;
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    throw error;
  }
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'larp-v01-'));
  const projectPath = join(dir, 'project.json');
  const runtimeDir = join(dir, '.larp/runtime');
  const policyPath = join(dir, 'auth-policy.js');
  await cp(FIXTURE, projectPath);
  await cp(POLICY_FIXTURE, policyPath);
  const client = new LineMcpClient({
    command: process.execPath,
    args: [SERVER, '--project', projectPath, '--runtime-dir', runtimeDir, '--coverage', '84'],
    cwd: REPO,
  });
  await client.initialize({ name: 'v01-local-harness', version: '0.1.0' });
  return { dir, projectPath, runtimeDir, policyPath, client };
}

async function hydrate(client) {
  const response = await client.callTool('larp_get_context', {
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  assert.equal(response.isError, undefined);
  return response.structuredContent.bundle;
}

async function verifyPolicy(projectPath, policyPath) {
  return execFileAsync(process.execPath, [VERIFIER, projectPath, policyPath], { cwd: REPO });
}

async function mutateProject(projectPath, fn) {
  const project = JSON.parse(await readFile(projectPath, 'utf8'));
  fn(project);
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
}

test('V01-L01 full local causal chain enforces stale blocking and requires rehydrate', async (t) => {
  const { client, projectPath, runtimeDir, policyPath } = await setup();
  t.after(() => client.close());

  const initialPolicy = await verifyPolicy(projectPath, policyPath);
  assert.match(initialPolicy.stdout, /"status":"PASS"/);

  const b0 = await hydrate(client);
  const b0Check = await client.callTool('larp_verify_context', { bundleFingerprint: b0.bundleFingerprint });
  assert.equal(b0Check.structuredContent.freshness, 'CURRENT');

  const driftProposal = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: {
      statement: 'Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.',
    },
    reason: 'V-01 governed drift',
    contextBundleFingerprint: b0.bundleFingerprint,
  });
  assert.equal(driftProposal.structuredContent.status, 'PROPOSED');
  assert.equal(driftProposal.structuredContent.contextFreshnessAtProposal, 'CURRENT');

  const driftApproval = {
    approvalId: 'approval:v01-local-drift',
    proposalId: driftProposal.structuredContent.proposalId,
    approved: true,
    actor: { kind: 'HUMAN', id: 'human:v01-local', name: 'V-01 Local Human Fixture' },
    reason: 'Deterministic local harness approval fixture',
  };
  const applied = await applyApprovedProposal({
    projectPath,
    runtimeDir,
    proposalId: driftProposal.structuredContent.proposalId,
    approval: driftApproval,
    now: () => '2026-09-07T12:00:00.000Z',
    idFactory: () => 'v01-local-drift',
  });
  assert.equal(applied.status, 'APPLIED');
  assert.equal(applied.projectPosition, 1);
  assert.equal(applied.targetStreamVersion, 2);

  const staleCheck = await client.callTool('larp_verify_context', { bundleFingerprint: b0.bundleFingerprint });
  assert.equal(staleCheck.structuredContent.freshness, 'STALE_BLOCKING');
  assert.ok(staleCheck.structuredContent.changes.some((change) => change.ref === 'decision:auth'));

  const proposalsBefore = await countJsonl(join(runtimeDir, 'proposals.jsonl'));
  const staleProposal = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 2,
    payload: { statement: 'This must never be journaled from stale B0.' },
    contextBundleFingerprint: b0.bundleFingerprint,
  });
  assert.equal(staleProposal.isError, true);
  assert.equal(staleProposal.structuredContent.error.code, 'CONTEXT_STALE_BLOCKING');
  const proposalsAfter = await countJsonl(join(runtimeDir, 'proposals.jsonl'));
  assert.equal(proposalsAfter, proposalsBefore);

  await assert.rejects(verifyPolicy(projectPath, policyPath));

  const b1 = await hydrate(client);
  assert.notEqual(b1.bundleFingerprint, b0.bundleFingerprint);
  assert.ok(b1.decisions.some((decision) => decision.id === 'decision:auth' && /DPoP/.test(decision.data.statement)));
  const b1Check = await client.callTool('larp_verify_context', { bundleFingerprint: b1.bundleFingerprint });
  assert.equal(b1Check.structuredContent.freshness, 'CURRENT');

  await writeFile(policyPath, "export const AUTH_POLICY = Object.freeze({\n  flow: 'authorization_code',\n  pkce: 'S256',\n  dpop: true,\n});\n", 'utf8');
  const adaptedPolicy = await verifyPolicy(projectPath, policyPath);
  assert.match(adaptedPolicy.stdout, /"status":"PASS"/);

  const eventsBeforeFreshProposal = await countJsonl(join(runtimeDir, 'semantic_events.jsonl'));
  const freshProposal = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 2,
    payload: {
      statement: 'Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.',
    },
    reason: 'V-01 fresh post-adaptation proposal',
    contextBundleFingerprint: b1.bundleFingerprint,
  });
  assert.equal(freshProposal.structuredContent.status, 'PROPOSED');
  assert.equal(freshProposal.structuredContent.contextFreshnessAtProposal, 'CURRENT');
  assert.equal(freshProposal.structuredContent.semanticMutationApplied, false);
  assert.equal(freshProposal.structuredContent.governanceRequired, true);
  assert.equal(await countJsonl(join(runtimeDir, 'semantic_events.jsonl')), eventsBeforeFreshProposal);
});

test('V01-L02 unbound proposal is rejected with zero journal append', async (t) => {
  const { client, runtimeDir } = await setup();
  t.after(() => client.close());
  const before = await countJsonl(join(runtimeDir, 'proposals.jsonl'));
  const result = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    payload: { statement: 'unbound' },
  });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, 'INVALID_ARGUMENT');
  assert.equal(await countJsonl(join(runtimeDir, 'proposals.jsonl')), before);
});

test('V01-L03 STALE_NON_BLOCKING context may propose but receipt carries drift', async (t) => {
  const { client, projectPath, runtimeDir } = await setup();
  t.after(() => client.close());
  const b0 = await hydrate(client);

  await mutateProject(projectPath, (project) => {
    project.projectPosition += 1;
    project.nodes['evidence:oidc-doc'].version += 1;
    project.nodes['evidence:oidc-doc'].data.summary = 'Provider documentation was clarified; auth decision itself is unchanged.';
  });

  const check = await client.callTool('larp_verify_context', { bundleFingerprint: b0.bundleFingerprint });
  assert.equal(check.structuredContent.freshness, 'STALE_NON_BLOCKING');

  const proposal = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: { statement: 'Use OAuth2 authorization-code flow with PKCE S256.' },
    contextBundleFingerprint: b0.bundleFingerprint,
  });
  assert.equal(proposal.structuredContent.status, 'PROPOSED');
  assert.equal(proposal.structuredContent.contextFreshnessAtProposal, 'STALE_NON_BLOCKING');
  assert.ok(proposal.structuredContent.contextDrift.some((change) => change.ref === 'evidence:oidc-doc'));
  assert.equal(await countJsonl(join(runtimeDir, 'proposals.jsonl')), 1);
});

test('V01-L04 explicit ContextBundle fingerprint mismatch is rejected before append', async (t) => {
  const { client, runtimeDir } = await setup();
  t.after(() => client.close());
  const b0 = await hydrate(client);
  const result = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    payload: { statement: 'mismatch' },
    contextBundleFingerprint: 'not-the-bundle-fingerprint',
    contextBundle: b0,
  });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, 'CONTEXT_BUNDLE_FINGERPRINT_MISMATCH');
  assert.equal(await countJsonl(join(runtimeDir, 'proposals.jsonl')), 0);
});

test('V01-L05 full ContextBundle can bind proposal after MCP server restart', async (t) => {
  const first = await setup();
  const b0 = await hydrate(first.client);
  await first.client.close();

  const second = new LineMcpClient({
    command: process.execPath,
    args: [SERVER, '--project', first.projectPath, '--runtime-dir', first.runtimeDir, '--coverage', '84'],
    cwd: REPO,
  });
  t.after(() => second.close());
  await second.initialize({ name: 'v01-restarted-host', version: '0.1.0' });

  const proposal = await second.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: { statement: 'Use OAuth2 authorization-code flow with PKCE S256.' },
    contextBundleFingerprint: b0.bundleFingerprint,
    contextBundle: b0,
  });
  assert.equal(proposal.structuredContent.status, 'PROPOSED');
  assert.equal(proposal.structuredContent.contextFreshnessAtProposal, 'CURRENT');
});
