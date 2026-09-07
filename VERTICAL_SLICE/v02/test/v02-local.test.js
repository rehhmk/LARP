import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { compileFile, compileSource, CompileError, canonicalJson } from '../src/compiler.js';
import { bootstrapIr, BootstrapError } from '../src/bootstrap.js';
import { readJsonLines, replayEvents } from '../src/replay.js';
import { LarpAdapterRuntime } from '../../../ADAPTER/src/runtime.js';
import { applyApprovedProposal } from '../../../ADAPTER/src/governance.js';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'program/auth.larp');

async function makeRun() {
  const dir = await mkdtemp(resolve(tmpdir(), 'larp-v02-'));
  const runtimeDir = resolve(dir, '.larp/runtime');
  const projectPath = resolve(dir, 'project.json');
  const ir = await compileFile(sourcePath);
  const bootstrap = await bootstrapIr({ ir, projectPath, runtimeDir });
  return { dir, runtimeDir, projectPath, ir, bootstrap };
}

async function raw(path) {
  return readFile(path, 'utf8');
}

test('V02-L01 real .larp source compiles deterministically to loadable IR', async () => {
  const a = await compileFile(sourcePath);
  const b = await compileFile(sourcePath);
  assert.equal(a.source.fingerprint, b.source.fingerprint);
  assert.equal(canonicalJson({ ...a, source: { fingerprint: a.source.fingerprint } }), canonicalJson({ ...b, source: { fingerprint: b.source.fingerprint } }));
  assert.equal(a.projectId, 'v02-demo');
  assert.equal(a.seeds.nodes.find((node) => node.id === 'decision:auth')?.data.statement, 'Use OAuth2 authorization-code flow with PKCE S256');
  assert.ok(a.scopes.some((scope) => scope.id === 'backend'));
});

test('V02-L02 invalid source produces a compiler diagnostic and no IR', async () => {
  const source = await raw(sourcePath);
  assert.throws(
    () => compileSource(source.replace('larp "0.1"', 'larp "9.9"')),
    (error) => error instanceof CompileError && error.code === 'LANGUAGE_HEADER_REQUIRED',
  );
});

test('V02-L03 governed bootstrap materializes seed events and identical rerun is a no-op', async () => {
  const run = await makeRun();
  const expectedSeedCount = run.ir.scopes.length + run.ir.seeds.nodes.length + run.ir.seeds.relations.length;
  assert.equal(run.bootstrap.status, 'MATERIALIZED');
  assert.equal(run.bootstrap.appendedEvents, expectedSeedCount);
  assert.equal(run.bootstrap.projectPosition, expectedSeedCount);

  const eventsPath = resolve(run.runtimeDir, 'semantic_events.jsonl');
  const validationsPath = resolve(run.runtimeDir, 'semantic_validation_receipts.jsonl');
  const transactionsPath = resolve(run.runtimeDir, 'semantic_transactions.jsonl');
  const registryPath = resolve(run.runtimeDir, 'seed_registry.jsonl');
  assert.equal((await readJsonLines(eventsPath)).length, expectedSeedCount);
  assert.equal((await readJsonLines(validationsPath)).length, expectedSeedCount);
  assert.equal((await readJsonLines(transactionsPath)).length, expectedSeedCount);
  assert.equal((await readJsonLines(registryPath)).length, expectedSeedCount);

  const eventsBefore = await raw(eventsPath);
  const registryBefore = await raw(registryPath);
  const second = await bootstrapIr({ ir: run.ir, projectPath: run.projectPath, runtimeDir: run.runtimeDir });
  assert.equal(second.status, 'ALREADY_MATERIALIZED');
  assert.equal(second.appendedEvents, 0);
  assert.equal(await raw(eventsPath), eventsBefore);
  assert.equal(await raw(registryPath), registryBefore);
});

test('V02-L04 recompiling edited source cannot rewrite history; changed materialized seed is SEED_DIVERGENCE', async () => {
  const run = await makeRun();
  const source = await raw(sourcePath);
  const edited = compileSource(source.replace(
    'Use OAuth2 authorization-code flow with PKCE S256',
    'Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens',
  ));
  assert.notEqual(edited.source.fingerprint, run.ir.source.fingerprint);

  const eventsPath = resolve(run.runtimeDir, 'semantic_events.jsonl');
  const projectBefore = await raw(run.projectPath);
  const eventsBefore = await raw(eventsPath);

  // Compilation itself is pure: runtime files are untouched.
  assert.equal(await raw(run.projectPath), projectBefore);
  assert.equal(await raw(eventsPath), eventsBefore);

  await assert.rejects(
    bootstrapIr({ ir: edited, projectPath: run.projectPath, runtimeDir: run.runtimeDir }),
    (error) => error instanceof BootstrapError && error.code === 'SEED_DIVERGENCE' && error.details.seedId === 'decision:auth',
  );
  assert.equal(await raw(run.projectPath), projectBefore);
  assert.equal(await raw(eventsPath), eventsBefore);
});

test('V02-L05 source-derived state feeds ContextBundle, governed proposal, SemanticEvent, and replay-equivalent projection', async () => {
  const run = await makeRun();
  const runtime = new LarpAdapterRuntime({ projectPath: run.projectPath, runtimeDir: run.runtimeDir, coverage: 88 });
  const contextResult = await runtime.getContext({ taskId: 'task:implement-auth', agentId: 'agent:coding', scopeId: 'backend' });
  const context = contextResult.structuredContent;
  assert.equal(context.freshness, 'CURRENT');
  assert.equal(context.bundle.projectId, 'v02-demo');
  assert.equal(context.bundle.decisions[0].id, 'decision:auth');

  const verified = (await runtime.verifyContextTool({ bundle: context.bundle, bundleFingerprint: context.bundle.bundleFingerprint })).structuredContent;
  assert.equal(verified.freshness, 'CURRENT');

  const proposal = (await runtime.propose({
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: { statement: 'Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.' },
    reason: 'V-02 local governed language-to-runtime integration',
    contextBundleFingerprint: context.bundle.bundleFingerprint,
    contextBundle: context.bundle,
  }, { clientName: 'v02-local-test', clientVersion: '0.1' })).structuredContent;

  assert.equal(proposal.status, 'PROPOSED');
  assert.equal(proposal.semanticMutationApplied, false);
  assert.equal(proposal.governanceRequired, true);

  const seedCount = run.ir.scopes.length + run.ir.seeds.nodes.length + run.ir.seeds.relations.length;
  assert.equal((await readJsonLines(resolve(run.runtimeDir, 'semantic_events.jsonl'))).length, seedCount);

  const approval = {
    approvalId: 'approval:v02-local-human-01',
    proposalId: proposal.proposalId,
    approved: true,
    actor: { kind: 'HUMAN', id: 'human:test-owner', name: 'Test Owner' },
  };
  const applied = await applyApprovedProposal({
    projectPath: run.projectPath,
    runtimeDir: run.runtimeDir,
    proposalId: proposal.proposalId,
    approval,
    now: () => '2026-09-07T00:00:00.000Z',
    idFactory: () => 'v02-local-event-01',
  });
  assert.equal(applied.status, 'APPLIED');
  assert.equal(applied.validationReceipt.result, 'ACCEPTED');
  assert.equal(applied.transaction.status, 'COMMITTED');
  assert.equal(applied.event.event_type, 'decision.changed');
  assert.equal(applied.event.causation_ref, proposal.proposalId);
  assert.equal(applied.event.correlation_id, approval.approvalId);

  const current = JSON.parse(await raw(run.projectPath));
  assert.equal(current.nodes['decision:auth'].version, 2);
  assert.match(current.nodes['decision:auth'].data.statement, /DPoP/);

  const events = await readJsonLines(resolve(run.runtimeDir, 'semantic_events.jsonl'));
  assert.equal(events.length, seedCount + 1);
  const replayed = replayEvents(events, { projectId: 'v02-demo' });
  assert.equal(canonicalJson(replayed), canonicalJson(current));
});

test('V02-L06 independent clean bootstraps from the same .larp source produce the same logical projection', async () => {
  const a = await makeRun();
  const b = await makeRun();
  const projectA = JSON.parse(await raw(a.projectPath));
  const projectB = JSON.parse(await raw(b.projectPath));
  assert.equal(canonicalJson(projectA), canonicalJson(projectB));
  assert.equal(a.ir.source.fingerprint, b.ir.source.fingerprint);
});
