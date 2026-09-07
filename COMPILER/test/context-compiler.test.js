import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalize,
  compileContext,
  ContextCompilerError,
  sha256Canonical,
  verifyContext,
} from '../src/context-compiler.js';

function baseProject() {
  return {
    projectId: 'P1',
    projectPosition: 10,
    scopes: {
      root: { parentId: null, version: 1 },
      feature: { parentId: 'root', version: 1 },
      sibling: { parentId: 'root', version: 1 },
      private: { parentId: 'feature', version: 1 },
    },
    nodes: {
      T1: {
        id: 'T1', kind: 'Task', scopeId: 'feature', version: 2, lifecycle: 'RUNNING',
        data: { goal: 'Ship API', acceptanceCriteria: ['tests pass'], allowedScope: 'feature' },
      },
      A1: {
        id: 'A1', kind: 'Agent', scopeId: 'root', version: 1,
        data: { capabilities: ['code'], roles: ['implementer'] },
      },
      D1: {
        id: 'D1', kind: 'Decision', scopeId: 'root', version: 3, current: true, lifecycle: 'ACTIVE',
        data: { apiVersion: 'v1', quota: 20 },
      },
      C1: {
        id: 'C1', kind: 'Claim', scopeId: 'feature', version: 1,
        data: { statement: 'Endpoint needs caching' },
      },
      E1: {
        id: 'E1', kind: 'Evidence', scopeId: 'root', version: 1,
        data: { result: 'latency high' },
      },
      U1: {
        id: 'U1', kind: 'Unknown', scopeId: 'feature', version: 1,
        data: { question: 'What is production QPS?' },
      },
      X1: {
        id: 'X1', kind: 'Decision', scopeId: 'sibling', version: 1,
        data: { unrelated: true },
      },
    },
    relations: [
      { id: 'R1', kind: 'requires', source: 'T1', target: 'D1', active: true, version: 1 },
      { id: 'R2', kind: 'uses', source: 'T1', target: 'C1', active: true, version: 1 },
      { id: 'R3', kind: 'supports', source: 'E1', target: 'C1', active: true, version: 1 },
      { id: 'R4', kind: 'has_unknown', source: 'T1', target: 'U1', active: true, version: 1 },
    ],
  };
}

function compile(project = baseProject()) {
  return compileContext({ project, taskId: 'T1', agentId: 'A1', scopeId: 'feature' });
}

test('JCS-like canonicalization is stable under object key order', () => {
  assert.equal(canonicalize({ b: 2, a: 1 }), canonicalize({ a: 1, b: 2 }));
  assert.equal(sha256Canonical({ b: 2, a: 1 }), sha256Canonical({ a: 1, b: 2 }));
});

test('same canonical inputs produce identical fingerprints', () => {
  const one = compile();
  const two = compile();
  assert.equal(one.inputFingerprint, two.inputFingerprint);
  assert.equal(one.bundleFingerprint, two.bundleFingerprint);
});

test('unknowns remain a distinct semantic section', () => {
  const bundle = compile();
  assert.deepEqual(bundle.unknowns.map((u) => u.id), ['U1']);
  assert.equal(bundle.assumptions.length, 0);
  assert.equal(bundle.unknowns[0].kind, 'Unknown');
});

test('required decision is selected while sibling-scope unrelated state is omitted', () => {
  const bundle = compile();
  assert.deepEqual(bundle.decisions.map((d) => d.id), ['D1']);
  const x = bundle.omissionManifest.find((item) => item.ref === 'X1');
  assert.equal(x.reason, 'INVISIBLE');
});

test('irrelevant project change does not stale context or change fingerprints after recompile', () => {
  const project = baseProject();
  const before = compile(project);
  const changed = structuredClone(project);
  changed.projectPosition = 11;
  changed.nodes.X1.version += 1;
  changed.nodes.X1.data.unrelated = 'changed';

  assert.equal(verifyContext(before, changed).freshness, 'CURRENT');
  const after = compile(changed);
  assert.equal(after.inputFingerprint, before.inputFingerprint);
  assert.equal(after.bundleFingerprint, before.bundleFingerprint);
});

test('relevant required dependency change yields STALE_BLOCKING', () => {
  const project = baseProject();
  const bundle = compile(project);
  const changed = structuredClone(project);
  changed.projectPosition = 11;
  changed.nodes.D1.version += 1;
  changed.nodes.D1.data.apiVersion = 'v2';

  const result = verifyContext(bundle, changed);
  assert.equal(result.freshness, 'STALE_BLOCKING');
  assert.equal(result.changes.some((c) => c.ref === 'D1' && c.severity === 'BLOCK'), true);
});

test('supporting evidence change yields STALE_NON_BLOCKING', () => {
  const project = baseProject();
  const bundle = compile(project);
  const changed = structuredClone(project);
  changed.projectPosition = 11;
  changed.nodes.E1.version += 1;
  changed.nodes.E1.data.result = 'latency moderate';

  const result = verifyContext(bundle, changed);
  assert.equal(result.freshness, 'STALE_NON_BLOCKING');
  assert.equal(result.changes.some((c) => c.ref === 'E1' && c.severity === 'REVIEW'), true);
});

test('supersession makes old bundle stale-blocking and new bundle exposes old + replacement', () => {
  const project = baseProject();
  const oldBundle = compile(project);
  const changed = structuredClone(project);
  changed.projectPosition = 12;
  changed.nodes.D1.version += 1;
  changed.nodes.D1.current = false;
  changed.nodes.D1.lifecycle = 'SUPERSEDED';
  changed.nodes.D2 = {
    id: 'D2', kind: 'Decision', scopeId: 'root', version: 1, current: true, lifecycle: 'ACTIVE',
    data: { apiVersion: 'v2', quota: 20 },
  };
  changed.relations.push({ id: 'R5', kind: 'supersedes', source: 'D2', target: 'D1', active: true, version: 1 });

  assert.equal(verifyContext(oldBundle, changed).freshness, 'STALE_BLOCKING');

  const fresh = compile(changed);
  assert.deepEqual(fresh.decisions.map((d) => d.id), ['D1', 'D2']);
  assert.equal(fresh.warnings.some((w) => w.code === 'SUPERSEDED_DEPENDENCY' && w.replacement === 'D2'), true);
  assert.equal(fresh.blockers.some((w) => w.code === 'SUPERSEDED_DEPENDENCY'), true);
});

test('unknown change is relevant but non-blocking', () => {
  const project = baseProject();
  const bundle = compile(project);
  const changed = structuredClone(project);
  changed.nodes.U1.version += 1;
  changed.nodes.U1.data.question = 'What is production peak QPS?';
  const result = verifyContext(bundle, changed);
  assert.equal(result.freshness, 'STALE_NON_BLOCKING');
});

test('recompiling after relevant change produces a CURRENT bundle', () => {
  const changed = baseProject();
  changed.projectPosition = 11;
  changed.nodes.D1.version += 1;
  changed.nodes.D1.data.apiVersion = 'v2';
  const fresh = compile(changed);
  assert.equal(verifyContext(fresh, changed).freshness, 'CURRENT');
});

test('removing a structural requires relation makes the old bundle stale-blocking', () => {
  const project = baseProject();
  const bundle = compile(project);
  const changed = structuredClone(project);
  changed.relations = changed.relations.filter((r) => r.id !== 'R1');
  const result = verifyContext(bundle, changed);
  assert.equal(result.freshness, 'STALE_BLOCKING');
  assert.equal(result.changes.some((c) => c.refType === 'relation' && c.ref === 'R1'), true);
});

test('mandatory invisible dependency fails compilation instead of silently omitting it', () => {
  const project = baseProject();
  project.nodes.D1.scopeId = 'sibling';
  assert.throws(
    () => compile(project),
    (error) => error instanceof ContextCompilerError && error.code === 'MANDATORY_DEPENDENCY_INVISIBLE',
  );
});
