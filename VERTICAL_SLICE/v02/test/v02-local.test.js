import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContext, verifyContext } from '../../../ADAPTER/src/context-compiler.js';
import { LineMcpClient } from '../../../ADAPTER/test/mcp-client.js';
import { bootstrapIr, BootstrapError } from '../src/bootstrap.js';
import { canonicalJson, compileFile, compileSource, emitIrFile, irFingerprint, semanticFingerprint } from '../src/compiler.js';
import { logicalProjection } from '../src/projection.js';
import { readJsonLines, replayEvents } from '../src/replay.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '../..');
const SOURCE = join(ROOT, 'source/project.larp');
const COMPILE_SCRIPT = join(ROOT, 'scripts/compile.js');
const RESET_SCRIPT = join(ROOT, 'scripts/reset-real-run.js');
const SERVER = join(REPO, 'ADAPTER/src/server.js');
const SEED_COUNT = 12;

function hash(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function setupBootstrap() {
  const dir = await mkdtemp(join(tmpdir(), 'larp-v02-'));
  const runtimeDir = join(dir, '.larp/runtime');
  const projectPath = join(dir, 'project.json');
  const ir = await compileFile(SOURCE, { sourcePath: 'source/project.larp' });
  const result = await bootstrapIr({ ir, projectPath, runtimeDir });
  return { dir, runtimeDir, projectPath, ir, result };
}

async function snapshot(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await readFile(path, 'utf8')])));
}

test('V02-L01 real *.larp compiles deterministically to canonical IR and fingerprints', async () => {
  const first = await compileFile(SOURCE, { sourcePath: 'source/project.larp' });
  const second = await compileFile(SOURCE, { sourcePath: 'source/project.larp' });
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(first.semanticFingerprint, semanticFingerprint(first));
  assert.equal(first.irFingerprint, irFingerprint(first));
  assert.match(first.source.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.seeds.nodes.find(({ id }) => id === 'decision:auth').data.statement, 'Use OAuth2 authorization-code flow with PKCE S256.');
});

test('V02-L02 invalid source emits diagnostics and leaves no bootstrap-loadable IR', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'larp-v02-invalid-'));
  const sourcePath = join(dir, 'invalid.larp');
  const outputPath = join(dir, 'invalid.ir.json');
  await writeFile(sourcePath, 'larp "0.1"\nmodule broken\nproject "v02-demo"\nscope backend parent missing\n', 'utf8');
  await writeFile(outputPath, '{"stale":"must be removed"}\n', 'utf8');
  await assert.rejects(
    execFileAsync(process.execPath, [COMPILE_SCRIPT, sourcePath, outputPath], { cwd: ROOT }),
    (error) => {
      const receipt = JSON.parse(error.stderr);
      assert.equal(receipt.status, 'COMPILE_FAILED');
      assert.equal(receipt.outputWritten, false);
      assert.ok(receipt.diagnostics.length > 0);
      assert.equal(receipt.diagnostics[0].severity, 'ERROR');
      return true;
    },
  );
  assert.equal(await exists(outputPath), false);
});

test('V02-L03 explicit bootstrap materializes accepted seed events and a derived projection', async () => {
  const state = await setupBootstrap();
  assert.equal(state.result.status, 'MATERIALIZED');
  assert.equal(state.result.appendedEvents, SEED_COUNT);
  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  assert.equal(project.projectId, 'v02-demo');
  assert.equal(project.projectPosition, SEED_COUNT);
  assert.equal(project.nodes['decision:auth'].version, 1);
  assert.equal((await readJsonLines(join(state.runtimeDir, 'semantic_events.jsonl'))).length, SEED_COUNT);
  assert.equal((await readJsonLines(join(state.runtimeDir, 'seed_validation_receipts.jsonl'))).length, SEED_COUNT);
  assert.equal((await readJsonLines(join(state.runtimeDir, 'seed_transactions.jsonl'))).length, SEED_COUNT);
  assert.equal((await readJsonLines(join(state.runtimeDir, 'seed_registry.jsonl'))).length, SEED_COUNT);
});

test('V02-L04 identical bootstrap is ALREADY_MATERIALIZED and performs zero writes', async () => {
  const state = await setupBootstrap();
  const paths = [
    state.projectPath,
    join(state.runtimeDir, 'semantic_events.jsonl'),
    join(state.runtimeDir, 'seed_validation_receipts.jsonl'),
    join(state.runtimeDir, 'seed_transactions.jsonl'),
    join(state.runtimeDir, 'seed_registry.jsonl'),
  ];
  const before = await snapshot(paths);
  const rerun = await bootstrapIr({ ir: state.ir, projectPath: state.projectPath, runtimeDir: state.runtimeDir });
  assert.equal(rerun.status, 'ALREADY_MATERIALIZED');
  assert.equal(rerun.appendedEvents, 0);
  assert.deepEqual(await snapshot(paths), before);
});

test('V02-L05 changed materialized seed yields SEED_DIVERGENCE with zero semantic rewrite', async () => {
  const state = await setupBootstrap();
  const paths = [
    state.projectPath,
    join(state.runtimeDir, 'semantic_events.jsonl'),
    join(state.runtimeDir, 'seed_validation_receipts.jsonl'),
    join(state.runtimeDir, 'seed_transactions.jsonl'),
    join(state.runtimeDir, 'seed_registry.jsonl'),
  ];
  const before = await snapshot(paths);
  const originalSource = await readFile(SOURCE, 'utf8');
  const changedIr = compileSource(originalSource.replace('PKCE S256.', 'PKCE S256 and DPoP.'), { sourcePath: 'source/project.larp' });
  await assert.rejects(
    bootstrapIr({ ir: changedIr, projectPath: state.projectPath, runtimeDir: state.runtimeDir }),
    (error) => error instanceof BootstrapError && error.code === 'SEED_DIVERGENCE' && error.details.seedId === 'node:decision:auth',
  );
  assert.deepEqual(await snapshot(paths), before);
});

test('V02-L06 compiling changed source alone cannot mutate accepted history or projection', async () => {
  const state = await setupBootstrap();
  const paths = [state.projectPath, join(state.runtimeDir, 'semantic_events.jsonl')];
  const before = await snapshot(paths);
  const changedSource = join(state.dir, 'changed.larp');
  const changedIr = join(state.dir, 'changed.ir.json');
  const originalSource = await readFile(SOURCE, 'utf8');
  await writeFile(changedSource, originalSource.replace('PKCE S256.', 'PKCE S256 and DPoP.'), 'utf8');
  await emitIrFile({ sourcePath: changedSource, outputPath: changedIr, recordedSourcePath: 'source/project.larp' });
  assert.equal(await exists(changedIr), true);
  assert.deepEqual(await snapshot(paths), before);
});

test('V02-L07 ContextBundle from bootstrapped projection includes governing dependencies and is CURRENT', async () => {
  const state = await setupBootstrap();
  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  const bundle = compileContext({
    project,
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  assert.ok(bundle.decisions.some(({ id }) => id === 'decision:auth'));
  assert.ok(bundle.dependencies.some(({ id, kind }) => id === 'rel:task-requires-auth' && kind === 'requires'));
  assert.equal(bundle.authorityContext.agent.id, 'agent:coding');
  assert.equal(verifyContext(bundle, project).freshness, 'CURRENT');
});

test('V02-L08 replay from accepted semantic history reconstructs the same logical projection and versions', async () => {
  const state = await setupBootstrap();
  const live = JSON.parse(await readFile(state.projectPath, 'utf8'));
  const events = await readJsonLines(join(state.runtimeDir, 'semantic_events.jsonl'));
  const replayed = replayEvents(events, { projectId: 'v02-demo' });
  assert.deepEqual(logicalProjection(replayed), logicalProjection(live));
  assert.equal(replayed.projectPosition, live.projectPosition);
  assert.equal(replayed.nodes['decision:auth'].version, live.nodes['decision:auth'].version);
  assert.equal(replayed.nodes['task:implement-auth'].version, live.nodes['task:implement-auth'].version);
});

test('V02-L09 reset-real-run derives runtime from *.larp and never consumes a semantic JSON fixture', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'larp-v02-reset-'));
  const runDir = join(dir, 'run');
  const irPath = join(dir, 'emitted', 'project.ir.json');
  const workPath = join(dir, 'work', 'auth-policy.js');
  const { stdout } = await execFileAsync(process.execPath, [
    RESET_SCRIPT,
    '--source', SOURCE,
    '--ir', irPath,
    '--run-dir', runDir,
    '--work', workPath,
  ], { cwd: ROOT });
  const receipt = JSON.parse(stdout);
  assert.equal(receipt.status, 'RESET_FROM_LARP');
  assert.equal(receipt.bootstrapStatus, 'MATERIALIZED');
  assert.equal(receipt.bootstrapEventCount, SEED_COUNT);
  const project = JSON.parse(await readFile(join(runDir, 'project.json'), 'utf8'));
  const events = await readJsonLines(join(runDir, '.larp/runtime/semantic_events.jsonl'));
  assert.deepEqual(project, replayEvents(events, { projectId: 'v02-demo' }));
  assert.equal(JSON.parse(await readFile(join(runDir, 'context-verification.json'), 'utf8')).freshness, 'CURRENT');
  assert.equal(JSON.parse(await readFile(join(runDir, 'context-bundle.json'), 'utf8')).bundleFingerprint, receipt.contextBundleFingerprint);
  assert.equal(hash(await readFile(workPath, 'utf8')), hash(await readFile(join(ROOT, 'fixture/auth-policy.initial.js'), 'utf8')));
  await assert.rejects(execFileAsync(process.execPath, [join(ROOT, 'work/verify-auth-policy.js'), join(runDir, 'project.json'), workPath], { cwd: REPO }));
  assert.deepEqual((await readdir(join(ROOT, 'fixture'))).filter((name) => name.endsWith('.json')), []);
});

test('V02-L10 generated projection is directly usable by the existing MCP adapter server', async (t) => {
  const state = await setupBootstrap();
  const client = new LineMcpClient({
    command: process.execPath,
    args: [SERVER, '--project', state.projectPath, '--runtime-dir', state.runtimeDir, '--coverage', '88'],
    cwd: REPO,
  });
  t.after(() => client.close());
  await client.initialize({ name: 'v02-local-harness', version: '0.1.0' });
  const status = await client.callTool('larp_status');
  assert.equal(status.structuredContent.projectId, 'v02-demo');
  assert.equal(status.structuredContent.semanticMutationAllowed, false);
  const context = await client.callTool('larp_get_context', {
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  assert.equal(context.structuredContent.freshness, 'CURRENT');
  const verification = await client.callTool('larp_verify_context', {
    bundleFingerprint: context.structuredContent.bundle.bundleFingerprint,
  });
  assert.equal(verification.structuredContent.freshness, 'CURRENT');
});

test('V02-L11 tampered IR is rejected before runtime materialization', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'larp-v02-tamper-'));
  const ir = await compileFile(SOURCE, { sourcePath: 'source/project.larp' });
  ir.seeds.nodes.find(({ id }) => id === 'decision:auth').data.statement = 'tampered';
  await assert.rejects(
    bootstrapIr({ ir, projectPath: join(dir, 'project.json'), runtimeDir: join(dir, 'runtime') }),
    (error) => error instanceof BootstrapError && error.code === 'IR_SEMANTIC_FINGERPRINT_INVALID',
  );
  assert.equal(await exists(join(dir, 'runtime')), false);
});
