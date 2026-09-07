import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { LineMcpClient } from './mcp-client.js';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SERVER = join(ROOT, 'src/server.js');
const FIXTURE = join(ROOT, 'examples/project.json');

function hash(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'larp-a01-'));
  const projectPath = join(dir, 'project.json');
  const runtimeDir = join(dir, '.larp/runtime');
  await cp(FIXTURE, projectPath);
  const client = new LineMcpClient({
    command: process.execPath,
    args: [SERVER, '--project', projectPath, '--runtime-dir', runtimeDir, '--coverage', '76'],
    cwd: ROOT,
  });
  await client.initialize();
  return { dir, projectPath, runtimeDir, client };
}

async function mutateProject(projectPath, fn) {
  const project = JSON.parse(await readFile(projectPath, 'utf8'));
  fn(project);
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
}

async function hydrate(client) {
  const result = await client.callTool('larp_get_context', {
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  return result.structuredContent.bundle;
}

test('T01 initializes over MCP legacy stdio and reports tool capability', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const init = await client.request('ping');
  assert.deepEqual(init, {});
  assert.ok(client.stderrLines.some((line) => line.includes('listening on stdio')));
});

test('T02 tools/list exposes exactly context, status, proposal, and verification tools', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const { tools } = await client.request('tools/list');
  assert.deepEqual(tools.map((x) => x.name).sort(), [
    'larp_get_context', 'larp_propose', 'larp_status', 'larp_verify_context',
  ]);
  for (const tool of tools) assert.equal(tool.inputSchema.type, 'object');
  const proposalTool = tools.find((tool) => tool.name === 'larp_propose');
  assert.ok(proposalTool.inputSchema.required.includes('contextBundleFingerprint'));
});

test('T03 larp_status is read-only and exposes project position/coverage', async (t) => {
  const { client, projectPath } = await setup();
  t.after(() => client.close());
  const before = hash(await readFile(projectPath, 'utf8'));
  const result = await client.callTool('larp_status');
  assert.equal(result.structuredContent.projectId, 'demo');
  assert.equal(result.structuredContent.projectPosition, 43);
  assert.equal(result.structuredContent.verifiedCoverage, 76);
  assert.equal(result.structuredContent.semanticMutationAllowed, false);
  const after = hash(await readFile(projectPath, 'utf8'));
  assert.equal(after, before);
});

test('T04 larp_get_context returns governed ContextBundle with Decision/Evidence/Unknown', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const result = await client.callTool('larp_get_context', {
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  const { bundle, receipt } = result.structuredContent;
  assert.equal(bundle.taskContract.id, 'task:implement-auth');
  assert.ok(bundle.decisions.some((x) => x.id === 'decision:auth'));
  assert.ok(bundle.evidence.some((x) => x.id === 'evidence:oidc-doc'));
  assert.ok(bundle.unknowns.some((x) => x.id === 'unknown:refresh-policy'));
  assert.equal(receipt.bundleFingerprint, bundle.bundleFingerprint);
});

test('T05 freshly issued context verifies CURRENT', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  const check = await client.callTool('larp_verify_context', {
    bundleFingerprint: ctx.bundleFingerprint,
  });
  assert.equal(check.structuredContent.freshness, 'CURRENT');
});

test('T06 unrelated project drift stays CURRENT', async (t) => {
  const { client, projectPath } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  await mutateProject(projectPath, (p) => {
    p.projectPosition += 1;
    p.nodes['artifact:readme'].version += 1;
    p.nodes['artifact:readme'].data.note = 'Changed unrelated docs';
  });
  const check = await client.callTool('larp_verify_context', {
    bundleFingerprint: ctx.bundleFingerprint,
  });
  assert.equal(check.structuredContent.freshness, 'CURRENT');
});

test('T07 required Decision drift becomes STALE_BLOCKING', async (t) => {
  const { client, projectPath } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  await mutateProject(projectPath, (p) => {
    p.projectPosition += 1;
    p.nodes['decision:auth'].version += 1;
    p.nodes['decision:auth'].data.statement = 'Use signed session cookies';
  });
  const check = await client.callTool('larp_verify_context', {
    bundleFingerprint: ctx.bundleFingerprint,
  });
  assert.equal(check.structuredContent.freshness, 'STALE_BLOCKING');
  assert.ok(check.structuredContent.changes.some((x) => x.ref === 'decision:auth'));
});

test('T08 larp_propose records a context-bound proposal but does not mutate semantic fixture', async (t) => {
  const { client, projectPath, runtimeDir } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  const beforeText = await readFile(projectPath, 'utf8');
  const proposal = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 3,
    payload: { statement: 'Use OAuth2 with PKCE' },
    reason: 'Implementation requires public-client flow',
    contextBundleFingerprint: ctx.bundleFingerprint,
  });
  assert.equal(proposal.structuredContent.status, 'PROPOSED');
  assert.equal(proposal.structuredContent.semanticMutationApplied, false);
  assert.equal(proposal.structuredContent.governanceRequired, true);
  assert.equal(proposal.structuredContent.contextBundleFingerprint, ctx.bundleFingerprint);
  assert.equal(proposal.structuredContent.contextFreshnessAtProposal, 'CURRENT');
  assert.equal(hash(await readFile(projectPath, 'utf8')), hash(beforeText));
  const journal = await readFile(join(runtimeDir, 'proposals.jsonl'), 'utf8');
  const entry = JSON.parse(journal.trim());
  assert.equal(entry.targetId, 'decision:auth');
  assert.equal(entry.actor.name, 'test-coding-agent-host');
});

test('T09 proposal tool cannot be mistaken for accepted SemanticEvent', async (t) => {
  const { client, runtimeDir } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  const proposal = await client.callTool('larp_propose', {
    commandType: 'task.start',
    targetId: 'task:implement-auth',
    payload: {},
    contextBundleFingerprint: ctx.bundleFingerprint,
  });
  assert.equal(proposal.structuredContent.semanticMutationApplied, false);
  await assert.rejects(stat(join(runtimeDir, 'semantic_events.jsonl')));
});

test('T10 tool argument errors return MCP tool error without crashing server', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const bad = await client.callTool('larp_get_context', { scopeId: 'backend' });
  assert.equal(bad.isError, true);
  assert.equal(bad.structuredContent.error.code, 'INVALID_ARGUMENT');
  const ping = await client.request('ping');
  assert.deepEqual(ping, {});
});

test('T11 unknown tool returns an ordinary MCP tool error result', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const result = await client.callTool('larp_destroy_everything', {});
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, 'TOOL_NOT_FOUND');
});

test('T12 stdout contains JSON-RPC only', async (t) => {
  const { client } = await setup();
  await client.request('tools/list');
  await client.callTool('larp_status');
  await client.close();
  for (const line of client.stdoutLines) {
    const parsed = JSON.parse(line);
    assert.equal(parsed.jsonrpc, '2.0');
  }
});

test('T13 current 2026 discovery probe receives Method not found for documented legacy fallback', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'larp-a01-probe-'));
  const projectPath = join(dir, 'project.json');
  await cp(FIXTURE, projectPath);
  const client = new LineMcpClient({ command: process.execPath, args: [SERVER, '--project', projectPath], cwd: ROOT });
  t.after(() => client.close());
  await assert.rejects(
    client.request('server/discover', {}),
    (error) => error.rpcError?.code === -32601,
  );
  const init = await client.initialize({ name: 'modern-host-fallback-test', version: '0.1' });
  assert.equal(init.protocolVersion, '2025-11-25');
});

test('T14 verification can accept full bundle, not only process-local cache', async (t) => {
  const { client } = await setup();
  t.after(() => client.close());
  const ctx = await hydrate(client);
  const check = await client.callTool('larp_verify_context', { bundle: ctx });
  assert.equal(check.structuredContent.freshness, 'CURRENT');
});

test('T15 unbound proposal is rejected before proposal journal creation', async (t) => {
  const { client, runtimeDir } = await setup();
  t.after(() => client.close());
  const result = await client.callTool('larp_propose', {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    payload: { statement: 'Unsafe unbound proposal' },
  });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, 'INVALID_ARGUMENT');
  await assert.rejects(stat(join(runtimeDir, 'proposals.jsonl')));
});
