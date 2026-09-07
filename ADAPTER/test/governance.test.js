import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { applyApprovedProposal, GovernanceError, sha256Text } from '../src/governance.js';

function fixture() {
  return {
    projectId: 'demo',
    projectPosition: 42,
    scopes: { root: { parentId: null, version: 1, data: {} }, backend: { parentId: 'root', version: 1, data: {} } },
    nodes: {
      'decision:auth': { id: 'decision:auth', kind: 'Decision', scopeId: 'backend', version: 2, current: true, invalid: false, lifecycle: 'ACTIVE', data: { statement: 'Use OAuth2' } },
      'task:implement-auth': { id: 'task:implement-auth', kind: 'Task', scopeId: 'backend', version: 3, current: true, invalid: false, lifecycle: 'READY', data: {} },
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
    ...overrides,
  };
  await writeFile(join(runtimeDir, 'proposals.jsonl'), `${JSON.stringify(proposal)}\n`, 'utf8');
  const approval = {
    approvalId: 'approval:test-1', proposalId: proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: 'human:owner', name: 'Project Owner' },
    reason: 'Explicit human approval for A-02 verification',
  };
  return { dir, projectPath, runtimeDir, projectRaw, proposal, approval };
}

const stable = { now: () => '2026-09-07T12:00:00-03:00', idFactory: () => 'stable-id' };

test('A02-T01 no approval means zero semantic mutation', async () => {
  const s = await setup();
  await assert.rejects(
    applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: null, ...stable }),
    (e) => e instanceof GovernanceError && e.code === 'HUMAN_APPROVAL_REQUIRED',
  );
  assert.equal(await readFile(s.projectPath, 'utf8'), s.projectRaw);
});

test('A02-T02 MCP/agent actor cannot approve its own proposal', async () => {
  const s = await setup();
  const bad = { ...s.approval, actor: { kind: 'MCP_CLIENT', id: 'agent:codex', name: 'codex' } };
  await assert.rejects(
    applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: bad, ...stable }),
    (e) => e instanceof GovernanceError && e.code === 'AUTHORITY_DENIED',
  );
});

test('A02-T03 stale project position is rejected before mutation', async () => {
  const s = await setup({ projectPositionObserved: 41 });
  await assert.rejects(
    applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: s.approval, ...stable }),
    (e) => e instanceof GovernanceError && e.code === 'STATE_CONFLICT',
  );
});

test('A02-T04 stale stream version is rejected before mutation', async () => {
  const s = await setup({ expectedStreamVersion: 1 });
  await assert.rejects(
    applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: s.approval, ...stable }),
    (e) => e instanceof GovernanceError && e.code === 'STATE_CONFLICT',
  );
});

test('A02-T05 explicit human approval yields validated semantic event and projection update', async () => {
  const s = await setup();
  const receipt = await applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: s.approval, ...stable });
  assert.equal(receipt.status, 'APPLIED');
  assert.equal(receipt.semanticMutationApplied, true);
  assert.equal(receipt.event.event_type, 'decision.changed');
  assert.equal(receipt.event.stream_version, 3);
  assert.equal(receipt.event.project_position, 43);
  assert.equal(receipt.event.command_id, 'proposal:test-1');
  assert.equal(receipt.event.correlation_id, 'approval:test-1');
  assert.equal(receipt.event.actor_ref, 'human:owner');
  const project = JSON.parse(await readFile(s.projectPath, 'utf8'));
  assert.equal(project.projectPosition, 43);
  assert.equal(project.nodes['decision:auth'].version, 3);
  assert.equal(project.nodes['decision:auth'].data.statement, 'Use OAuth2 authorization-code flow with PKCE S256');
});

test('A02-T06 accepted path writes approval, validation, transaction and event journals', async () => {
  const s = await setup();
  await applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: s.approval, ...stable });
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
  const ra = await applyApprovedProposal({ projectPath: a.projectPath, runtimeDir: a.runtimeDir, proposalId: a.proposal.proposalId, approval: a.approval, ...stable });
  const rb = await applyApprovedProposal({ projectPath: b.projectPath, runtimeDir: b.runtimeDir, proposalId: b.proposal.proposalId, approval: b.approval, ...stable });
  assert.deepEqual(ra.event, rb.event);
  assert.deepEqual(ra.validationReceipt, rb.validationReceipt);
});

test('A02-T08 unsupported command is rejected even with human approval', async () => {
  const s = await setup({ commandType: 'task.start', targetId: 'task:implement-auth', expectedStreamVersion: 3, payload: {} });
  await assert.rejects(
    applyApprovedProposal({ projectPath: s.projectPath, runtimeDir: s.runtimeDir, proposalId: s.proposal.proposalId, approval: s.approval, ...stable }),
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
  const run = await runCli([
    '--project', s.projectPath,
    '--runtime-dir', s.runtimeDir,
    '--proposal', s.proposal.proposalId,
    '--approval-file', approvalFile,
  ]);
  assert.equal(run.code, 0, run.stderr);
  const receipt = JSON.parse(run.stdout);
  assert.equal(receipt.status, 'APPLIED');
  assert.equal(receipt.approvalId, 'approval:test-1');
});
