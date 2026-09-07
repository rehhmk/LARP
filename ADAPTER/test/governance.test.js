import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { applyApprovedProposal, GovernanceError, sha256Text } from '../src/governance.js';
import { signHumanApproval, trustStoreFingerprint } from '../src/approval-provenance.js';

const HUMAN_KEY_ID = 'human:owner';
const { privateKey: humanPrivateKey, publicKey: humanPublicKey } = generateKeyPairSync('ed25519');
const { privateKey: attackerPrivateKey, publicKey: attackerPublicKey } = generateKeyPairSync('ed25519');
const trustedApprovers = {
  schemaVersion: '0.1',
  approvers: {
    [HUMAN_KEY_ID]: {
      algorithm: 'Ed25519',
      status: 'ACTIVE',
      publicKeyPem: humanPublicKey.export({ type: 'spki', format: 'pem' }),
    },
  },
};

function fixture() {
  return {
    projectId: 'demo',
    projectPosition: 42,
    scopes: {
      root: { parentId: null, version: 1, data: {} },
      backend: { parentId: 'root', version: 1, data: {} },
      frontend: { parentId: 'root', version: 1, data: {} },
    },
    nodes: {
      'decision:auth': { id: 'decision:auth', kind: 'Decision', scopeId: 'backend', version: 2, current: true, invalid: false, lifecycle: 'ACTIVE', data: { statement: 'Use OAuth2' } },
      'task:implement-auth': { id: 'task:implement-auth', kind: 'Task', scopeId: 'backend', version: 3, current: true, invalid: false, lifecycle: 'READY', data: {} },
      'agent:coding': { id: 'agent:coding', kind: 'Agent', scopeId: 'backend', version: 1, current: true, invalid: false, data: {} },
      'decision:frontend-theme': { id: 'decision:frontend-theme', kind: 'Decision', scopeId: 'frontend', version: 1, current: true, invalid: false, lifecycle: 'ACTIVE', data: { statement: 'Use dark theme' } },
      'authority:human-approval': {
        id: 'authority:human-approval', kind: 'Authority', scopeId: 'root', version: 1,
        current: true, invalid: false, lifecycle: 'ACTIVE',
        data: { approvalTrustStoreFingerprint: trustStoreFingerprint(trustedApprovers) },
      },
    },
    relations: [],
  };
}

async function setup(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'larp-a02-'));
  const projectPath = join(dir, 'project.json');
  const runtimeDir = join(dir, '.larp/runtime');
  await mkdir(runtimeDir, { recursive: true });
  const projectRaw = `${JSON.stringify(fixture(), null, 2)}\n`;
  await writeFile(projectPath, projectRaw, 'utf8');
  const proposal = {
    proposalId: 'proposal:test-1', projectId: 'demo', projectPositionObserved: 42,
    projectFileHashObserved: sha256Text(projectRaw), commandType: 'decision.propose_change',
    targetId: 'decision:auth', payload: { statement: 'Use OAuth2 authorization-code flow with PKCE S256' },
    expectedStreamVersion: 2, reason: 'Clarify auth flow', actor: { kind: 'MCP_CLIENT', name: 'codex-mcp-client', version: 'test' },
    status: 'PROPOSED', semanticMutationApplied: false, governanceRequired: true,
    authorityBinding: {
      taskId: 'task:implement-auth', taskScopeId: 'backend', taskAllowedScopeId: 'backend',
      agentId: 'agent:coding', agentScopeId: 'backend', compileScopeId: 'backend',
      targetId: 'decision:auth', targetScopeId: 'backend', decision: 'ALLOW',
    },
    ...overrides,
  };
  await writeFile(join(runtimeDir, 'proposals.jsonl'), `${JSON.stringify(proposal)}\n`, 'utf8');
  const approval = signHumanApproval({
    approvalId: 'approval:test-1', proposalId: proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'Project Owner' },
    reason: 'Explicit human approval for A-02 verification',
  }, { keyId: HUMAN_KEY_ID, privateKey: humanPrivateKey });
  return { dir, projectPath, runtimeDir, projectRaw, proposal, approval, trustedApprovers };
}

const stable = { now: () => '2026-09-07T12:00:00-03:00', idFactory: () => 'stable-id' };

function apply(s, overrides = {}) {
  return applyApprovedProposal({
    projectPath: s.projectPath,
    runtimeDir: s.runtimeDir,
    proposalId: s.proposal.proposalId,
    approval: s.approval,
    trustedApprovers: s.trustedApprovers,
    ...stable,
    ...overrides,
  });
}

async function readIfPresent(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function mutationSnapshot(s) {
  const names = [
    'human_approvals.jsonl',
    'semantic_validation_receipts.jsonl',
    'semantic_transactions.jsonl',
    'semantic_events.jsonl',
  ];
  return {
    project: await readFile(s.projectPath, 'utf8'),
    journals: Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readIfPresent(join(s.runtimeDir, name))]))),
  };
}

test('A02-T01 no approval means zero semantic mutation', async () => {
  const s = await setup();
  await assert.rejects(
    apply(s, { approval: null }),
    (e) => e instanceof GovernanceError && e.code === 'HUMAN_APPROVAL_REQUIRED',
  );
  assert.equal(await readFile(s.projectPath, 'utf8'), s.projectRaw);
});

test('A02-T02 MCP/agent actor cannot approve its own proposal', async () => {
  const s = await setup();
  const bad = { ...s.approval, actor: { kind: 'MCP_CLIENT', id: 'agent:codex', name: 'codex' } };
  await assert.rejects(
    apply(s, { approval: bad }),
    (e) => e instanceof GovernanceError && e.code === 'AUTHORITY_DENIED',
  );
});

test('A02-T03 stale project position is rejected before mutation', async () => {
  const s = await setup({ projectPositionObserved: 41 });
  await assert.rejects(
    apply(s),
    (e) => e instanceof GovernanceError && e.code === 'STATE_CONFLICT',
  );
});

test('A02-T04 stale stream version is rejected before mutation', async () => {
  const s = await setup({ expectedStreamVersion: 1 });
  await assert.rejects(
    apply(s),
    (e) => e instanceof GovernanceError && e.code === 'STATE_CONFLICT',
  );
});

test('A02-T05 explicit human approval yields validated semantic event and projection update', async () => {
  const s = await setup();
  const receipt = await apply(s);
  assert.equal(receipt.status, 'APPLIED');
  assert.equal(receipt.semanticMutationApplied, true);
  assert.equal(receipt.event.event_type, 'decision.changed');
  assert.equal(receipt.event.stream_version, 3);
  assert.equal(receipt.event.project_position, 43);
  assert.equal(receipt.event.command_id, 'proposal:test-1');
  assert.equal(receipt.event.correlation_id, 'approval:test-1');
  assert.equal(receipt.event.actor_ref, 'human:owner');
  assert.equal(receipt.validationReceipt.approvalProvenance.verified, true);
  assert.equal(receipt.validationReceipt.authorityBinding.decision, 'ALLOW');
  const project = JSON.parse(await readFile(s.projectPath, 'utf8'));
  assert.equal(project.projectPosition, 43);
  assert.equal(project.nodes['decision:auth'].version, 3);
  assert.equal(project.nodes['decision:auth'].data.statement, 'Use OAuth2 authorization-code flow with PKCE S256');
});

test('A02-T06 accepted path writes approval, validation, transaction and event journals', async () => {
  const s = await setup();
  await apply(s);
  for (const name of ['human_approvals.jsonl', 'semantic_validation_receipts.jsonl', 'semantic_transactions.jsonl', 'semantic_events.jsonl']) {
    const lines = (await readFile(join(s.runtimeDir, name), 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1, name);
  }
  const tx = JSON.parse((await readFile(join(s.runtimeDir, 'semantic_transactions.jsonl'), 'utf8')).trim());
  assert.equal(tx.status, 'COMMITTED');
  assert.equal(tx.eventCount, 1);
});

test('A02-T07 same canonical input with injected ids/time produces same logical event', async () => {
  const a = await setup();
  const b = await setup();
  const ra = await apply(a);
  const rb = await apply(b);
  assert.deepEqual(ra.event, rb.event);
  assert.deepEqual(ra.validationReceipt, rb.validationReceipt);
});

test('A02-T08 unsupported command is rejected even with human approval', async () => {
  const s = await setup({
    commandType: 'task.start', targetId: 'task:implement-auth', expectedStreamVersion: 3, payload: {},
    authorityBinding: {
      taskId: 'task:implement-auth', taskScopeId: 'backend', taskAllowedScopeId: 'backend',
      agentId: 'agent:coding', agentScopeId: 'backend', compileScopeId: 'backend',
      targetId: 'task:implement-auth', targetScopeId: 'backend', decision: 'ALLOW',
    },
  });
  await assert.rejects(
    apply(s),
    (e) => e instanceof GovernanceError && e.code === 'COMMAND_UNSUPPORTED',
  );
});

function runCli(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [new URL('../src/apply-approved-proposal.js', import.meta.url).pathname, ...args]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolveRun({ code, stdout, stderr }));
  });
}

test('A02-T09 control CLI consumes an existing approval receipt file; it does not synthesize approval', async () => {
  const s = await setup();
  const approvalFile = join(s.dir, 'approval.json');
  await writeFile(approvalFile, `${JSON.stringify(s.approval, null, 2)}\n`, 'utf8');
  const trustStoreFile = join(s.dir, 'trusted-approvers.json');
  await writeFile(trustStoreFile, `${JSON.stringify(s.trustedApprovers, null, 2)}\n`, 'utf8');
  const run = await runCli([
    '--project', s.projectPath,
    '--runtime-dir', s.runtimeDir,
    '--proposal', s.proposal.proposalId,
    '--approval-file', approvalFile,
    '--trust-store', trustStoreFile,
  ]);
  assert.equal(run.code, 0, run.stderr);
  const receipt = JSON.parse(run.stdout);
  assert.equal(receipt.status, 'APPLIED');
  assert.equal(receipt.approvalId, 'approval:test-1');
});

test('X01-P0-T01 fabricated HUMAN JSON without trusted provenance is rejected with zero mutation', async () => {
  const s = await setup();
  const forged = {
    approvalId: 'approval:forged', proposalId: s.proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'Fabricated Human' },
  };
  const before = await mutationSnapshot(s);
  await assert.rejects(
    apply(s, { approval: forged }),
    (error) => error instanceof GovernanceError && error.code === 'APPROVAL_PROVENANCE_UNTRUSTED',
  );
  assert.deepEqual(await mutationSnapshot(s), before);
});

test('X01-P0-T02 approval signed by an untrusted key is rejected with zero mutation', async () => {
  const s = await setup();
  const forged = signHumanApproval({
    approvalId: 'approval:forged-signature', proposalId: s.proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'Fabricated Human' },
  }, { keyId: HUMAN_KEY_ID, privateKey: attackerPrivateKey });
  const before = await mutationSnapshot(s);
  await assert.rejects(
    apply(s, { approval: forged }),
    (error) => error instanceof GovernanceError && error.code === 'APPROVAL_SIGNATURE_INVALID',
  );
  assert.deepEqual(await mutationSnapshot(s), before);
});

test('X01-P0-T03 attacker cannot replace the canonically pinned trust store', async () => {
  const s = await setup();
  const attackerTrustStore = {
    schemaVersion: '0.1',
    approvers: {
      [HUMAN_KEY_ID]: {
        algorithm: 'Ed25519',
        status: 'ACTIVE',
        publicKeyPem: attackerPublicKey.export({ type: 'spki', format: 'pem' }),
      },
    },
  };
  const forged = signHumanApproval({
    approvalId: 'approval:attacker-anchor', proposalId: s.proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'Fabricated Human' },
  }, { keyId: HUMAN_KEY_ID, privateKey: attackerPrivateKey });
  const before = await mutationSnapshot(s);
  await assert.rejects(
    apply(s, { approval: forged, trustedApprovers: attackerTrustStore }),
    (error) => error instanceof GovernanceError && error.code === 'APPROVAL_TRUST_ANCHOR_MISMATCH',
  );
  assert.deepEqual(await mutationSnapshot(s), before);
});

test('X01-P0-T04 backend-bound proposal cannot apply to sibling frontend target', async () => {
  const s = await setup({
    targetId: 'decision:frontend-theme',
    expectedStreamVersion: 1,
    authorityBinding: {
      taskId: 'task:implement-auth', taskScopeId: 'backend', taskAllowedScopeId: 'backend',
      agentId: 'agent:coding', agentScopeId: 'backend', compileScopeId: 'backend',
      targetId: 'decision:frontend-theme', targetScopeId: 'frontend', decision: 'ALLOW',
    },
  });
  const before = await mutationSnapshot(s);
  await assert.rejects(
    apply(s),
    (error) => error instanceof GovernanceError && error.code === 'AUTHORITY_DENIED',
  );
  assert.deepEqual(await mutationSnapshot(s), before);
});

test('X01-P0-T05 changed authority binding is rejected before semantic append', async () => {
  const s = await setup();
  const project = JSON.parse(s.projectRaw);
  project.nodes['agent:coding'].scopeId = 'frontend';
  await writeFile(s.projectPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
  const proposal = { ...s.proposal, projectFileHashObserved: sha256Text(await readFile(s.projectPath, 'utf8')) };
  await writeFile(join(s.runtimeDir, 'proposals.jsonl'), `${JSON.stringify(proposal)}\n`, 'utf8');
  const before = await mutationSnapshot(s);
  await assert.rejects(
    apply(s),
    (error) => error instanceof GovernanceError && error.code === 'AUTHORITY_CONTEXT_CHANGED',
  );
  assert.deepEqual(await mutationSnapshot(s), before);
});
