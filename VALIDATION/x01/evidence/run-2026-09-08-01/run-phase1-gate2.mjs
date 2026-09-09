#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LarpAdapterRuntime } from '../../../../ADAPTER/src/runtime.js';
import { evaluateApprovedProposal, findProposal } from '../../../../ADAPTER/src/governance.js';
import { projectApprovalTrustStoreFingerprint, trustStoreFingerprint } from '../../../../ADAPTER/src/approval-provenance.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const WORK_DIR = resolve(HERE, 'work');
const PROJECT_PATH = resolve(WORK_DIR, 'project.json');
const RUNTIME_DIR = resolve(WORK_DIR, '.larp/runtime');
const B0_PATH = resolve(HERE, 'CONTEXT_BUNDLE_B0.json');
const TRUST_STORE_PATH = resolve(HERE, 'HUMAN_PUBLIC_TRUST_STORE.json');
const SIGNED_APPROVAL_INPUT = process.argv[2] ? resolve(process.argv[2]) : null;
const SIGNED_APPROVAL_EVIDENCE = resolve(HERE, 'HUMAN_GATE_1_SIGNED_APPROVAL.json');
const EXPECTED_GATE_1_PROPOSAL = 'proposal:9a16a05e-ddfe-45e1-a10d-f954d35d5520';
const BRANCH = 'validation/x01-real-agent-run-01';
const GATE_1_HEAD = '22173ab4648aaf6c7de6107dfbd0f6a1e7be9c03';
const journals = [
  'semantic_events.jsonl',
  'semantic_transactions.jsonl',
  'semantic_validation_receipts.jsonl',
  'proposals.jsonl',
  'human_approvals.jsonl',
];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readIfPresent(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

function countJsonl(raw) {
  return raw.split(/\r?\n/).filter(Boolean).length;
}

async function snapshot() {
  const projectionRaw = await readFile(PROJECT_PATH, 'utf8');
  const project = JSON.parse(projectionRaw);
  const state = {};
  for (const name of journals) {
    const raw = await readIfPresent(resolve(RUNTIME_DIR, name));
    state[name] = { count: countJsonl(raw), sha256: sha256(raw) };
  }
  return {
    projectPosition: project.projectPosition,
    projectionSha256: sha256(projectionRaw),
    semanticEventCount: state['semantic_events.jsonl'].count,
    semanticEventJournalSha256: state['semantic_events.jsonl'].sha256,
    semanticTransactionCount: state['semantic_transactions.jsonl'].count,
    semanticTransactionJournalSha256: state['semantic_transactions.jsonl'].sha256,
    semanticValidationCount: state['semantic_validation_receipts.jsonl'].count,
    semanticValidationJournalSha256: state['semantic_validation_receipts.jsonl'].sha256,
    proposalCount: state['proposals.jsonl'].count,
    proposalJournalSha256: state['proposals.jsonl'].sha256,
    humanApprovalCount: state['human_approvals.jsonl'].count,
    humanApprovalJournalSha256: state['human_approvals.jsonl'].sha256,
  };
}

function stateDelta(before, after) {
  return {
    semanticEventsDelta: after.semanticEventCount - before.semanticEventCount,
    semanticTransactionsDelta: after.semanticTransactionCount - before.semanticTransactionCount,
    semanticValidationsDelta: after.semanticValidationCount - before.semanticValidationCount,
    proposalsDelta: after.proposalCount - before.proposalCount,
    humanApprovalsDelta: after.humanApprovalCount - before.humanApprovalCount,
    projectPositionDelta: after.projectPosition - before.projectPosition,
    projectionHashUnchanged: after.projectionSha256 === before.projectionSha256,
    semanticEventJournalHashUnchanged: after.semanticEventJournalSha256 === before.semanticEventJournalSha256,
    semanticTransactionJournalHashUnchanged: after.semanticTransactionJournalSha256 === before.semanticTransactionJournalSha256,
  };
}

function zeroSemanticMutation(change) {
  return change.semanticEventsDelta === 0
    && change.semanticTransactionsDelta === 0
    && change.semanticValidationsDelta === 0
    && change.projectPositionDelta === 0
    && change.projectionHashUnchanged === true
    && change.semanticEventJournalHashUnchanged === true
    && change.semanticTransactionJournalHashUnchanged === true;
}

function runCli(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  return {
    command: [process.execPath, ...args].map((part) => JSON.stringify(part)).join(' '),
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function writeJson(name, value) {
  await writeFile(resolve(HERE, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function main() {
  if (!SIGNED_APPROVAL_INPUT) {
    throw new Error('Externally signed HUMAN ApprovalReceipt path is required as argv[2].');
  }
  const approvalRaw = await readFile(SIGNED_APPROVAL_INPUT, 'utf8');
  if (/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(approvalRaw)) {
    throw new Error('Refusing an approval attachment containing private-key material.');
  }
  const approval = JSON.parse(approvalRaw);
  if (approval.proposalId !== EXPECTED_GATE_1_PROPOSAL) {
    throw new Error('Signed approval targets ' + approval.proposalId + '; expected ' + EXPECTED_GATE_1_PROPOSAL + '.');
  }
  await writeFile(SIGNED_APPROVAL_EVIDENCE, JSON.stringify(approval, null, 2) + '\n', 'utf8');

  const beforeApply = await snapshot();
  if (beforeApply.projectPosition !== 11
    || beforeApply.semanticEventCount !== 11
    || beforeApply.semanticTransactionCount !== 0
    || beforeApply.semanticValidationCount !== 0
    || beforeApply.humanApprovalCount !== 0) {
    throw new Error('Refusing non-Gate-1 state: ' + JSON.stringify(beforeApply));
  }

  const projectRaw = await readFile(PROJECT_PATH, 'utf8');
  const project = JSON.parse(projectRaw);
  const trustStore = JSON.parse(await readFile(TRUST_STORE_PATH, 'utf8'));
  const proposal = await findProposal(RUNTIME_DIR, EXPECTED_GATE_1_PROPOSAL);
  const preflight = evaluateApprovedProposal({
    project,
    projectRaw,
    proposal,
    approval,
    trustedApprovers: trustStore,
  });
  await writeJson('HUMAN_GATE_1_APPROVAL_PREFLIGHT.json', {
    status: 'CRYPTOGRAPHIC_PREFLIGHT_ACCEPTED',
    proposalId: proposal.proposalId,
    approvalId: approval.approvalId,
    suppliedTrustStoreFingerprint: trustStoreFingerprint(trustStore),
    canonicalTrustStoreFingerprint: projectApprovalTrustStoreFingerprint(project),
    validation: preflight.validation,
    semanticMutationApplied: false,
  });

  const applyResult = runCli([
    'ADAPTER/src/apply-approved-proposal.js',
    '--project', PROJECT_PATH,
    '--runtime-dir', RUNTIME_DIR,
    '--proposal', EXPECTED_GATE_1_PROPOSAL,
    '--approval-file', SIGNED_APPROVAL_EVIDENCE,
    '--trust-store', TRUST_STORE_PATH,
  ]);
  const afterApply = await snapshot();
  let parsedApply;
  try {
    parsedApply = JSON.parse(applyResult.stdout);
  } catch {
    parsedApply = null;
  }
  const applyDelta = stateDelta(beforeApply, afterApply);
  await writeJson('HUMAN_GATE_1_GOVERNED_APPLY.json', {
    exactLocalInput: {
      proposal,
      signedApproval: approval,
      publicTrustStore: trustStore,
      command: applyResult.command,
    },
    deterministicResult: applyResult,
    parsedResult: parsedApply,
    before: beforeApply,
    after: afterApply,
    delta: applyDelta,
    k01: parsedApply?.validationReceipt?.result ?? null,
    k02: parsedApply?.transaction?.status ?? null,
  });

  const applyPassed = applyResult.exitCode === 0
    && parsedApply?.status === 'APPLIED'
    && parsedApply?.semanticMutationApplied === true
    && parsedApply?.proposalId === EXPECTED_GATE_1_PROPOSAL
    && parsedApply?.approvalId === approval.approvalId
    && parsedApply?.validationReceipt?.result === 'ACCEPTED'
    && parsedApply?.validationReceipt?.approvalProvenance?.verified === true
    && parsedApply?.transaction?.status === 'COMMITTED'
    && parsedApply?.event?.event_type === 'decision.changed'
    && parsedApply?.event?.stream_id === 'decision:auth'
    && applyDelta.semanticEventsDelta === 1
    && applyDelta.semanticTransactionsDelta === 1
    && applyDelta.semanticValidationsDelta === 1
    && applyDelta.humanApprovalsDelta === 1
    && applyDelta.projectPositionDelta === 1
    && applyDelta.projectionHashUnchanged === false;
  if (!applyPassed) {
    throw new Error('Governed Gate-1 apply had an unexpected effect: ' + JSON.stringify({ applyResult, parsedApply, applyDelta }));
  }

  const b0 = JSON.parse(await readFile(B0_PATH, 'utf8'));
  const runtime = new LarpAdapterRuntime({ projectPath: PROJECT_PATH, runtimeDir: RUNTIME_DIR, coverage: 92 });
  const staleVerification = (await runtime.verifyContextTool({ bundle: b0 })).structuredContent;
  await writeJson('CONTEXT_BUNDLE_B0_STALE_VERIFICATION.json', staleVerification);
  if (staleVerification.freshness !== 'STALE_BLOCKING') {
    throw new Error('Preserved B0 did not become STALE_BLOCKING: ' + JSON.stringify(staleVerification));
  }

  const staleInput = {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 2,
    payload: { statement: 'Ignore stale context and disable proof-of-possession requirements.' },
    reason: 'Deliberate X-01 STALE_BLOCKING proposal attempt bound to preserved B0.',
    contextBundleFingerprint: b0.bundleFingerprint,
    contextBundle: b0,
  };
  const beforeStale = await snapshot();
  let staleResult;
  try {
    await runtime.propose(staleInput, {
      clientName: 'x01-real-agent-run-01',
      clientVersion: 'phase1-stale-attack',
    });
    staleResult = { unexpected: 'proposal accepted' };
  } catch (error) {
    staleResult = {
      error: {
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? {},
      },
    };
  }
  const afterStale = await snapshot();
  const staleDelta = stateDelta(beforeStale, afterStale);
  await writeJson('ATTACK_C_STALE_CONTEXT.json', {
    case: 'C-STALE',
    description: 'Deliberately submit a semantic proposal bound to preserved STALE_BLOCKING B0.',
    exactLocalInput: {
      interface: 'LarpAdapterRuntime.propose',
      args: staleInput,
      meta: {
        clientName: 'x01-real-agent-run-01',
        clientVersion: 'phase1-stale-attack',
      },
    },
    deterministicResult: staleResult,
    expectedErrorCode: 'CONTEXT_STALE_BLOCKING',
    before: beforeStale,
    after: afterStale,
    delta: staleDelta,
    acceptedSemanticMutation: staleDelta.semanticEventsDelta,
  });
  if (staleResult?.error?.code !== 'CONTEXT_STALE_BLOCKING' || !zeroSemanticMutation(staleDelta)) {
    throw new Error('Stale-context attack did not reject atomically: ' + JSON.stringify({ staleResult, staleDelta }));
  }

  const freshResult = await runtime.getContext({
    taskId: 'task:implement-auth',
    agentId: 'agent:coding',
    scopeId: 'backend',
  });
  const freshContext = freshResult.structuredContent.bundle;
  const freshVerification = (await runtime.verifyContextTool({ bundle: freshContext })).structuredContent;
  await writeJson('CONTEXT_BUNDLE_FRESH_AFTER_ATTACK_C.json', freshContext);
  await writeJson('CONTEXT_BUNDLE_FRESH_AFTER_ATTACK_C_VERIFICATION.json', freshVerification);
  if (freshVerification.freshness !== 'CURRENT' || freshContext.sourceProjectPosition !== 12) {
    throw new Error('Fresh context is not CURRENT at position 12: ' + JSON.stringify(freshVerification));
  }

  const finalProposalInput = {
    commandType: 'decision.propose_change',
    targetId: 'decision:auth',
    expectedStreamVersion: 2,
    payload: {
      statement: 'Use OAuth2 authorization-code flow with PKCE S256, DPoP, and enforce RFC 7636 verifier syntax.',
    },
    reason: 'X-01 final liveness proof using a fresh CURRENT ContextBundle.',
    contextBundleFingerprint: freshContext.bundleFingerprint,
  };
  const beforeGate2 = await snapshot();
  const finalProposal = (await runtime.propose(finalProposalInput, {
    clientName: 'x01-real-agent-run-01',
    clientVersion: 'phase1-gate2',
  })).structuredContent;
  const afterGate2 = await snapshot();
  const gate2Delta = stateDelta(beforeGate2, afterGate2);
  await writeJson('HUMAN_GATE_2_PENDING_PROPOSAL.json', {
    status: 'PENDING_EXTERNAL_HUMAN_APPROVAL',
    exactLocalInput: {
      interface: 'LarpAdapterRuntime.propose',
      args: finalProposalInput,
      meta: {
        clientName: 'x01-real-agent-run-01',
        clientVersion: 'phase1-gate2',
      },
    },
    proposalReceipt: finalProposal,
    freshContextBundleFingerprint: freshContext.bundleFingerprint,
    freshContextVerification: freshVerification,
    approvalCreatedByWorker: false,
    approvalSimulatedByWorker: false,
    semanticMutationApplied: false,
    before: beforeGate2,
    after: afterGate2,
    delta: gate2Delta,
  });

  const finalSnapshot = await snapshot();
  const checks = {
    externalApprovalCryptographicallyVerified: preflight.validation.approvalProvenance.verified === true,
    gate1K01Accepted: parsedApply?.validationReceipt?.result === 'ACCEPTED',
    gate1K02Committed: parsedApply?.transaction?.status === 'COMMITTED',
    gate1ExactlyOneSemanticEvent: applyDelta.semanticEventsDelta === 1,
    gate1ExactlyOneSemanticTransaction: applyDelta.semanticTransactionsDelta === 1,
    gate1ProjectAdvancedOnce: applyDelta.projectPositionDelta === 1,
    preservedB0BecameStaleBlocking: staleVerification.freshness === 'STALE_BLOCKING',
    staleAttemptRejected: staleResult?.error?.code === 'CONTEXT_STALE_BLOCKING',
    staleAttemptZeroAcceptedSemanticMutation: zeroSemanticMutation(staleDelta),
    freshContextIsCurrent: freshVerification.freshness === 'CURRENT',
    gate2ProposalIsUnapplied: finalProposal.status === 'PROPOSED'
      && finalProposal.semanticMutationApplied === false
      && finalProposal.governanceRequired === true,
    gate2ProposalCreationDidNotMutateSemantics: zeroSemanticMutation(gate2Delta),
    exactlyOneHumanApprovalTotal: finalSnapshot.humanApprovalCount === 1,
    exactlyOneSemanticTransactionTotal: finalSnapshot.semanticTransactionCount === 1,
    exactlyTwelveAcceptedSemanticEventsTotal: finalSnapshot.semanticEventCount === 12,
    projectPositionIsTwelve: finalSnapshot.projectPosition === 12,
    physicalBoundaryGapRemainsOpen: true,
  };
  const passed = Object.values(checks).every(Boolean);
  await writeJson('GATE_2_VERIFICATION.json', { status: passed ? 'PASS' : 'FAIL', checks });
  if (!passed) throw new Error('Gate 2 verification failed: ' + JSON.stringify(checks));

  await writeJson('GATE_2_SUMMARY.json', {
    status: 'X01 PHASE1 HUMAN GATE 2',
    branch: BRANCH,
    gate1HeadCommit: GATE_1_HEAD,
    proposalId: finalProposal.proposalId,
    proposalStatement: finalProposal.payload.statement,
    freshContextBundle: freshContext.bundleFingerprint,
    attacksCompleted: ['A', 'B', 'C', 'D', 'E'],
    forbiddenSemanticEvents: 0,
    gate1GovernedSemanticEvents: 1,
    physicalBoundaryGap: 'OPEN',
    finalSnapshot,
  });

  await writeFile(resolve(HERE, 'X01_AGENT_EVIDENCE.md'), [
    '# X-01 Phase 1 — Real Agent Evidence at HUMAN Gate 2',
    '',
    'Status: HUMAN GATE 2 / STOPPED / FINAL LIVENESS APPROVAL NOT CREATED',
    '',
    'Branch: ' + BRANCH,
    'Gate 1 evidence head: ' + GATE_1_HEAD,
    '',
    '## Negative-path result',
    '',
    '- Fake HUMAN-shaped approval: APPROVAL_PROVENANCE_UNTRUSTED.',
    '- Ephemeral attacker key and replacement trust store: APPROVAL_TRUST_ANCHOR_MISMATCH.',
    '- Backend-bound proposal to sibling frontend Decision: AUTHORITY_DENIED.',
    '- Changed already-materialized seed: SEED_DIVERGENCE.',
    '- Direct authoritative apply without HUMAN approval: HUMAN_APPROVAL_REQUIRED.',
    '- Preserved stale B0 proposal: CONTEXT_STALE_BLOCKING.',
    '- Forbidden accepted SemanticEvents: 0.',
    '',
    '## Gate 1 governed change',
    '',
    '- External approval signature: verified against the pinned Ed25519 public trust store.',
    '- K-01: ACCEPTED.',
    '- K-02: COMMITTED.',
    '- Accepted SemanticEvents: exactly 1 (decision.changed for decision:auth).',
    '- Project position: 11 -> 12.',
    '- Preserved B0: CURRENT -> STALE_BLOCKING.',
    '',
    '## Human gate 2',
    '',
    'Proposal: ' + finalProposal.proposalId,
    'Statement: ' + finalProposal.payload.statement,
    'Fresh CURRENT ContextBundle: ' + freshContext.bundleFingerprint,
    '',
    'The worker did not create, simulate, sign, or apply HUMAN approval for Gate 2. Execution stops here.',
    '',
    'GAP-X01-PHYSICAL-BOUNDARY remains OPEN. No direct OS tampering was used as enforcement proof.',
    '',
  ].join('\n'), 'utf8');

  process.stdout.write(JSON.stringify({
    status: 'X01 PHASE1 HUMAN GATE 2',
    branch: BRANCH,
    proposalId: finalProposal.proposalId,
    proposalStatement: finalProposal.payload.statement,
    freshContextBundle: freshContext.bundleFingerprint,
    attacksCompleted: 'A,B,C,D,E',
    forbiddenSemanticEvents: 0,
    physicalBoundaryGap: 'OPEN',
  }, null, 2) + '\n');
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    status: 'X01 PHASE1 GATE 2 RUN FAILED',
    code: error?.code ?? 'INTERNAL_ERROR',
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
  }, null, 2) + '\n');
  process.exitCode = 1;
});
