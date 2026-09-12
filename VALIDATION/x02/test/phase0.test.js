import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { compileSource, canonicalJson } from '../../../VERTICAL_SLICE/v02/src/compiler.js';
import { bootstrapIr } from '../../../VERTICAL_SLICE/v02/src/bootstrap.js';
import { readJsonLines, replayEvents } from '../../../VERTICAL_SLICE/v02/src/replay.js';
import { logicalProjection } from '../../../VERTICAL_SLICE/v02/src/projection.js';
import { verifyContext } from '../../../ADAPTER/src/context-compiler.js';
import { LarpAdapterRuntime } from '../../../ADAPTER/src/runtime.js';
import { applyApprovedProposal } from '../../../ADAPTER/src/governance.js';
import { signHumanApproval, trustStoreFingerprint } from '../../../ADAPTER/src/approval-provenance.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_TEMPLATE = join(ROOT, 'fixture/project.larp');
const VERIFIER = join(ROOT, 'work/verify-auth-policy.js');
const HUMAN_KEY_ID = 'human:x02-owner';
const POST_HANDOFF_STATEMENT = 'Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access-token authorization.';
const PRE_HANDOFF_STATEMENT = 'Use OAuth2 authorization-code flow with PKCE S256 and Bearer access-token authorization.';
const SEED_EVENT_COUNT = 9;

const { privateKey: humanPrivateKey, publicKey: humanPublicKey } = generateKeyPairSync('ed25519');
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

const STALE_ARTIFACT = `export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  accessTokenAuthorization: 'Bearer',
  dpopProofRequired: false,
});
export function buildAuthorizationHeaders({ accessToken }) {
  return { authorization: \`Bearer \${accessToken}\` };
}
`;

const CURRENT_ARTIFACT = `export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  accessTokenAuthorization: 'DPoP',
  dpopProofRequired: true,
});
export function buildAuthorizationHeaders({ accessToken, dpopProof }) {
  if (!dpopProof) throw new Error('DPoP proof is required');
  return { authorization: \`DPoP \${accessToken}\`, DPoP: dpopProof };
}
`;

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'larp-x02-phase0-'));
  const projectPath = join(dir, 'project.json');
  const runtimeDir = join(dir, '.larp/runtime');
  await mkdir(runtimeDir, { recursive: true });
  const sourceTemplate = await readFile(SOURCE_TEMPLATE, 'utf8');
  const source = sourceTemplate.replace(
    '__EXTERNAL_TRUST_STORE_FINGERPRINT__',
    trustStoreFingerprint(trustedApprovers),
  );
  const ir = compileSource(source, { sourcePath: 'VALIDATION/x02/fixture/project.larp' });
  const bootstrap = await bootstrapIr({ ir, projectPath, runtimeDir });
  const runtime = new LarpAdapterRuntime({ projectPath, runtimeDir, coverage: 96 });
  const context = (await runtime.getContext({
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  })).structuredContent.bundle;
  return { dir, projectPath, runtimeDir, runtime, context, ir, source, sourceTemplate, bootstrap };
}

function signedApproval(proposalId) {
  return signHumanApproval({
    approvalId: `approval:${proposalId}`,
    proposalId,
    approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'External X-02 Human' },
    reason: 'Explicit external approval for X-02 deterministic readiness',
  }, { keyId: HUMAN_KEY_ID, privateKey: humanPrivateKey });
}

async function proposePostHandoff(state) {
  return (await state.runtime.propose({
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: { statement: POST_HANDOFF_STATEMENT },
    reason: 'X-02 pre-handoff governed transition',
    contextBundleFingerprint: state.context.bundleFingerprint,
  }, { clientName: 'x02-phase0-worker-a', clientVersion: '0.1' })).structuredContent;
}

async function applyPostHandoff(state, proposalId) {
  return applyApprovedProposal({
    projectPath: state.projectPath,
    runtimeDir: state.runtimeDir,
    proposalId,
    approval: signedApproval(proposalId),
    trustedApprovers,
    now: () => '2026-09-12T22:30:00.000Z',
    idFactory: () => 'x02-phase0-stable',
  });
}

async function runVerifier(projectPath, artifactSource, artifactName) {
  const artifactPath = join(dirname(projectPath), artifactName);
  await writeFile(artifactPath, artifactSource, 'utf8');
  return execFileAsync(process.execPath, [VERIFIER, projectPath, artifactPath], { cwd: ROOT });
}

test('X02-P0-L01 dedicated fixture compiles deterministically and bootstraps pre-handoff state', async () => {
  const state = await setup();
  const second = compileSource(state.source, { sourcePath: 'VALIDATION/x02/fixture/project.larp' });
  assert.equal(canonicalJson(state.ir), canonicalJson(second));
  assert.equal(state.bootstrap.status, 'MATERIALIZED');
  assert.equal(state.bootstrap.appendedEvents, SEED_EVENT_COUNT);
  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  assert.equal(project.projectId, 'x02-continuity-demo');
  assert.equal(project.projectPosition, SEED_EVENT_COUNT);
  assert.equal(project.nodes['decision:auth'].version, 1);
  assert.equal(project.nodes['decision:auth'].data.statement, PRE_HANDOFF_STATEMENT);
  assert.equal(state.sourceTemplate.includes(PRE_HANDOFF_STATEMENT), true);
});

test('X02-P0-L02 initial task context is CURRENT and carries governing decision/authority/dependencies', async () => {
  const state = await setup();
  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  const verification = verifyContext(state.context, project);
  assert.equal(verification.freshness, 'CURRENT');
  assert.equal(state.context.taskContract.id, 'task:implement-auth');
  assert.ok(state.context.decisions.some(({ id, data }) => id === 'decision:auth' && data.statement === PRE_HANDOFF_STATEMENT));
  assert.ok(state.context.dependencies.some(({ id, kind }) => id === 'rel:task-requires-auth' && kind === 'requires'));
  assert.equal(state.context.authorityContext.agent.id, 'agent:coding');
});

test('X02-P0-L03 governed decision changes without editing source and makes Worker-A context STALE_BLOCKING', async () => {
  const state = await setup();
  const eventsBefore = await readJsonLines(join(state.runtimeDir, 'semantic_events.jsonl'));
  const proposal = await proposePostHandoff(state);
  const eventsAfterProposal = await readJsonLines(join(state.runtimeDir, 'semantic_events.jsonl'));
  assert.equal(eventsAfterProposal.length, eventsBefore.length, 'proposal must cause zero semantic mutation');

  const result = await applyPostHandoff(state, proposal.proposalId);
  assert.equal(result.status, 'APPLIED');
  assert.equal(result.validationReceipt.approvalProvenance.verified, true);

  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  assert.equal(project.nodes['decision:auth'].version, 2);
  assert.equal(project.nodes['decision:auth'].data.statement, POST_HANDOFF_STATEMENT);
  assert.equal(verifyContext(state.context, project).freshness, 'STALE_BLOCKING');
  assert.equal(state.sourceTemplate.includes(PRE_HANDOFF_STATEMENT), true, 'seed source must retain pre-handoff statement');
  assert.equal(state.sourceTemplate.includes(POST_HANDOFF_STATEMENT), false, 'post-handoff answer must not be copied into seed source');

  const fresh = (await state.runtime.getContext({
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  })).structuredContent.bundle;
  assert.equal(verifyContext(fresh, project).freshness, 'CURRENT');
  assert.equal(fresh.decisions.find(({ id }) => id === 'decision:auth').data.statement, POST_HANDOFF_STATEMENT);
  assert.notEqual(fresh.bundleFingerprint, state.context.bundleFingerprint);
});

test('X02-P0-L04 verifier distinguishes stale Bearer artifact from current DPoP artifact using live projection', async () => {
  const state = await setup();

  const before = await runVerifier(state.projectPath, STALE_ARTIFACT, 'auth-policy-stale.js');
  assert.equal(JSON.parse(before.stdout).expectedScheme, 'Bearer');

  const proposal = await proposePostHandoff(state);
  await applyPostHandoff(state, proposal.proposalId);

  await assert.rejects(
    runVerifier(state.projectPath, STALE_ARTIFACT, 'auth-policy-stale-after.js'),
    (error) => error?.code !== 0,
  );

  const after = await runVerifier(state.projectPath, CURRENT_ARTIFACT, 'auth-policy-current.js');
  const receipt = JSON.parse(after.stdout);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.expectedScheme, 'DPoP');
  assert.equal(receipt.expectsDpop, true);
  assert.equal(receipt.decisionVersion, 2);
});

test('X02-P0-L05 replay after governed transition matches live logical projection', async () => {
  const state = await setup();
  const proposal = await proposePostHandoff(state);
  await applyPostHandoff(state, proposal.proposalId);
  const live = JSON.parse(await readFile(state.projectPath, 'utf8'));
  const events = await readJsonLines(join(state.runtimeDir, 'semantic_events.jsonl'));
  const replayed = replayEvents(events, { projectId: 'x02-continuity-demo' });
  assert.equal(events.length, SEED_EVENT_COUNT + 1);
  assert.equal(replayed.projectPosition, live.projectPosition);
  assert.equal(replayed.nodes['decision:auth'].version, 2);
  assert.equal(replayed.nodes['decision:auth'].data.statement, POST_HANDOFF_STATEMENT);
  assert.deepEqual(logicalProjection(replayed), logicalProjection(live));
});
