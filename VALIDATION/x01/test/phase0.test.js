import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileSource } from '../../../VERTICAL_SLICE/v02/src/compiler.js';
import { bootstrapIr } from '../../../VERTICAL_SLICE/v02/src/bootstrap.js';
import { LarpAdapterRuntime, LarpAdapterError } from '../../../ADAPTER/src/runtime.js';
import { applyApprovedProposal, GovernanceError, sha256Text } from '../../../ADAPTER/src/governance.js';
import { signHumanApproval, trustStoreFingerprint } from '../../../ADAPTER/src/approval-provenance.js';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SOURCE_TEMPLATE = join(ROOT, 'fixture/project.larp');
const HUMAN_KEY_ID = 'human:x01-owner';
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

async function readIfPresent(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'larp-x01-phase0-'));
  const projectPath = join(dir, 'project.json');
  const runtimeDir = join(dir, '.larp/runtime');
  await mkdir(runtimeDir, { recursive: true });
  const source = (await readFile(SOURCE_TEMPLATE, 'utf8')).replace(
    '__EXTERNAL_TRUST_STORE_FINGERPRINT__',
    trustStoreFingerprint(trustedApprovers),
  );
  const ir = compileSource(source, { sourcePath: 'VALIDATION/x01/fixture/project.larp' });
  await bootstrapIr({ ir, projectPath, runtimeDir });
  const runtime = new LarpAdapterRuntime({ projectPath, runtimeDir, coverage: 92 });
  const context = (await runtime.getContext({
    taskId: 'task:implement-auth', agentId: 'agent:coding', scopeId: 'backend',
  })).structuredContent.bundle;
  return { dir, projectPath, runtimeDir, runtime, context, ir };
}

async function semanticSnapshot(state) {
  const journals = [
    'proposals.jsonl',
    'human_approvals.jsonl',
    'semantic_validation_receipts.jsonl',
    'semantic_transactions.jsonl',
    'semantic_events.jsonl',
  ];
  return {
    project: await readFile(state.projectPath, 'utf8'),
    journals: Object.fromEntries(await Promise.all(journals.map(async (name) => (
      [name, await readIfPresent(join(state.runtimeDir, name))]
    )))),
  };
}

async function proposeBackend(state) {
  return (await state.runtime.propose({
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 1,
    payload: { statement: 'Use OAuth2 authorization-code flow with PKCE S256 and DPoP.' },
    reason: 'X-01 Phase 0 legitimate control path',
    contextBundleFingerprint: state.context.bundleFingerprint,
  }, { clientName: 'x01-phase0-agent', clientVersion: '0.1' })).structuredContent;
}

function signedApproval(proposalId, privateKey = humanPrivateKey) {
  return signHumanApproval({
    approvalId: `approval:${proposalId}`,
    proposalId,
    approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'External X-01 Human' },
    reason: 'Explicit external approval for deterministic Phase 0 liveness proof',
  }, { keyId: HUMAN_KEY_ID, privateKey });
}

function apply(state, proposalId, approval, trustStore = trustedApprovers) {
  return applyApprovedProposal({
    projectPath: state.projectPath,
    runtimeDir: state.runtimeDir,
    proposalId,
    approval,
    trustedApprovers: trustStore,
    now: () => '2026-09-07T18:00:00.000Z',
    idFactory: () => 'x01-phase0-stable',
  });
}

test('X01-P0-L01 fixture has sibling scopes while backend context excludes frontend target', async () => {
  const state = await setup();
  const project = JSON.parse(await readFile(state.projectPath, 'utf8'));
  assert.equal(project.scopes.backend.parentId, 'root');
  assert.equal(project.scopes.frontend.parentId, 'root');
  assert.equal(project.nodes['decision:frontend-theme'].scopeId, 'frontend');
  assert.equal(state.context.decisions.some(({ id }) => id === 'decision:frontend-theme'), false);
  assert.equal(state.context.taskContract.scopeId, 'backend');
});

test('X01-P0-L02 proposal-time scope authorization rejects frontend target with zero append', async () => {
  const state = await setup();
  const before = await semanticSnapshot(state);
  await assert.rejects(
    state.runtime.propose({
      commandType: 'decision.propose_change',
      targetId: 'decision:frontend-theme',
      expectedStreamVersion: 1,
      payload: { statement: 'Agent-selected frontend state' },
      contextBundleFingerprint: state.context.bundleFingerprint,
    }),
    (error) => error instanceof LarpAdapterError && error.code === 'AUTHORITY_DENIED',
  );
  assert.deepEqual(await semanticSnapshot(state), before);
});

test('X01-P0-L03 fabricated HUMAN JSON rejects with zero semantic mutation', async () => {
  const state = await setup();
  const proposal = await proposeBackend(state);
  const forged = {
    approvalId: 'approval:forged-json', proposalId: proposal.proposalId, approved: true,
    actor: { kind: 'HUMAN', id: HUMAN_KEY_ID, name: 'Fabricated Human' },
  };
  const before = await semanticSnapshot(state);
  await assert.rejects(
    apply(state, proposal.proposalId, forged),
    (error) => error instanceof GovernanceError && error.code === 'APPROVAL_PROVENANCE_UNTRUSTED',
  );
  assert.deepEqual(await semanticSnapshot(state), before);
});

test('X01-P0-L04 attacker-signed approval cannot substitute its own trust store', async () => {
  const state = await setup();
  const proposal = await proposeBackend(state);
  const attackerTrustStore = {
    schemaVersion: '0.1',
    approvers: {
      [HUMAN_KEY_ID]: {
        algorithm: 'Ed25519', status: 'ACTIVE',
        publicKeyPem: attackerPublicKey.export({ type: 'spki', format: 'pem' }),
      },
    },
  };
  const before = await semanticSnapshot(state);
  await assert.rejects(
    apply(state, proposal.proposalId, signedApproval(proposal.proposalId, attackerPrivateKey), attackerTrustStore),
    (error) => error instanceof GovernanceError && error.code === 'APPROVAL_TRUST_ANCHOR_MISMATCH',
  );
  assert.deepEqual(await semanticSnapshot(state), before);
});

test('X01-P0-L05 apply re-check rejects an injected backend-to-frontend proposal', async () => {
  const state = await setup();
  const projectRaw = await readFile(state.projectPath, 'utf8');
  const project = JSON.parse(projectRaw);
  const injected = {
    proposalId: 'proposal:injected-frontend', projectId: project.projectId,
    projectPositionObserved: project.projectPosition, projectFileHashObserved: sha256Text(projectRaw),
    commandType: 'decision.propose_change', targetId: 'decision:frontend-theme',
    payload: { statement: 'Injected frontend mutation' }, expectedStreamVersion: 1,
    status: 'PROPOSED', semanticMutationApplied: false, governanceRequired: true,
    authorityBinding: {
      taskId: 'task:implement-auth', taskScopeId: 'backend', taskAllowedScopeId: 'backend',
      agentId: 'agent:coding', agentScopeId: 'backend', compileScopeId: 'backend',
      targetId: 'decision:frontend-theme', targetScopeId: 'frontend', decision: 'ALLOW',
    },
  };
  await writeFile(join(state.runtimeDir, 'proposals.jsonl'), `${JSON.stringify(injected)}\n`, 'utf8');
  const before = await semanticSnapshot(state);
  await assert.rejects(
    apply(state, injected.proposalId, signedApproval(injected.proposalId)),
    (error) => error instanceof GovernanceError && error.code === 'AUTHORITY_DENIED',
  );
  assert.deepEqual(await semanticSnapshot(state), before);
});

test('X01-P0-L06 legitimate externally signed human approval still applies', async () => {
  const state = await setup();
  const proposal = await proposeBackend(state);
  const before = JSON.parse(await readFile(state.projectPath, 'utf8'));
  const result = await apply(state, proposal.proposalId, signedApproval(proposal.proposalId));
  assert.equal(result.status, 'APPLIED');
  assert.equal(result.projectPosition, before.projectPosition + 1);
  assert.equal(result.targetStreamVersion, 2);
  assert.equal(result.validationReceipt.approvalProvenance.verified, true);
  assert.equal(
    result.validationReceipt.approvalProvenance.trustStoreFingerprint,
    trustStoreFingerprint(trustedApprovers),
  );
  assert.equal(result.validationReceipt.authorityBinding.decision, 'ALLOW');
});
