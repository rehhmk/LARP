#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateApprovedProposal, findProposal } from '../../../../ADAPTER/src/governance.js';
import { projectApprovalTrustStoreFingerprint, trustStoreFingerprint } from '../../../../ADAPTER/src/approval-provenance.js';
import { canonicalJson } from '../../../../VERTICAL_SLICE/v02/src/compiler.js';
import { logicalProjection } from '../../../../VERTICAL_SLICE/v02/src/projection.js';
import { readJsonLines, replayHistory } from '../../../../VERTICAL_SLICE/v02/src/replay.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const WORK_DIR = resolve(HERE, 'work');
const PROJECT_PATH = resolve(WORK_DIR, 'project.json');
const RUNTIME_DIR = resolve(WORK_DIR, '.larp/runtime');
const TRUST_STORE_PATH = resolve(HERE, 'HUMAN_PUBLIC_TRUST_STORE.json');
const SIGNED_APPROVAL_INPUT = process.argv[2] ? resolve(process.argv[2]) : null;
const SIGNED_APPROVAL_EVIDENCE = resolve(HERE, 'HUMAN_GATE_2_SIGNED_APPROVAL.json');
const REPLAY_PATH = resolve(HERE, 'FINAL_REPLAYED_PROJECT.json');
const FINAL_PROPOSAL_ID = 'proposal:dc89147b-7d01-426c-95dd-41e89366d234';
const GATE_1_PROPOSAL_ID = 'proposal:9a16a05e-ddfe-45e1-a10d-f954d35d5520';
const BRANCH = 'validation/x01-real-agent-run-01';
const GATE_2_HEAD = '45eb3dcd86f5ab800842eae6fb3b15af70e38cf7';
const FINAL_STATEMENT = 'Use OAuth2 authorization-code flow with PKCE S256, DPoP, and enforce RFC 7636 verifier syntax.';
const runtimeJournals = [
  'semantic_events.jsonl',
  'semantic_transactions.jsonl',
  'semantic_validation_receipts.jsonl',
  'proposals.jsonl',
  'human_approvals.jsonl',
  'seed_transactions.jsonl',
  'seed_validation_receipts.jsonl',
  'seed_registry.jsonl',
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
  for (const name of runtimeJournals) {
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

function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return {
    command: [command, ...args].map((part) => JSON.stringify(part)).join(' '),
    cwd,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function writeJson(name, value) {
  await writeFile(resolve(HERE, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function tapPassCount(output) {
  const match = output.match(/^(?:#|ℹ)\s+pass\s+(\d+)$/m);
  return match ? Number(match[1]) : null;
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
  if (approval.proposalId !== FINAL_PROPOSAL_ID) {
    throw new Error('Signed approval targets ' + approval.proposalId + '; expected ' + FINAL_PROPOSAL_ID + '.');
  }
  await writeFile(SIGNED_APPROVAL_EVIDENCE, JSON.stringify(approval, null, 2) + '\n', 'utf8');

  const beforeApply = await snapshot();
  if (beforeApply.projectPosition !== 12
    || beforeApply.semanticEventCount !== 12
    || beforeApply.semanticTransactionCount !== 1
    || beforeApply.semanticValidationCount !== 1
    || beforeApply.humanApprovalCount !== 1
    || beforeApply.proposalCount !== 3) {
    throw new Error('Refusing non-Gate-2 state: ' + JSON.stringify(beforeApply));
  }

  const projectRaw = await readFile(PROJECT_PATH, 'utf8');
  const project = JSON.parse(projectRaw);
  const trustStore = JSON.parse(await readFile(TRUST_STORE_PATH, 'utf8'));
  const proposal = await findProposal(RUNTIME_DIR, FINAL_PROPOSAL_ID);
  const preflight = evaluateApprovedProposal({
    project,
    projectRaw,
    proposal,
    approval,
    trustedApprovers: trustStore,
  });
  await writeJson('HUMAN_GATE_2_APPROVAL_PREFLIGHT.json', {
    status: 'CRYPTOGRAPHIC_PREFLIGHT_ACCEPTED',
    proposalId: proposal.proposalId,
    approvalId: approval.approvalId,
    suppliedTrustStoreFingerprint: trustStoreFingerprint(trustStore),
    canonicalTrustStoreFingerprint: projectApprovalTrustStoreFingerprint(project),
    validation: preflight.validation,
    semanticMutationApplied: false,
  });

  const applyResult = run(process.execPath, [
    'ADAPTER/src/apply-approved-proposal.js',
    '--project', PROJECT_PATH,
    '--runtime-dir', RUNTIME_DIR,
    '--proposal', FINAL_PROPOSAL_ID,
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
  await writeJson('HUMAN_GATE_2_GOVERNED_APPLY.json', {
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

  const livenessPassed = applyResult.exitCode === 0
    && parsedApply?.status === 'APPLIED'
    && parsedApply?.semanticMutationApplied === true
    && parsedApply?.proposalId === FINAL_PROPOSAL_ID
    && parsedApply?.approvalId === approval.approvalId
    && parsedApply?.validationReceipt?.result === 'ACCEPTED'
    && parsedApply?.validationReceipt?.approvalProvenance?.verified === true
    && parsedApply?.transaction?.status === 'COMMITTED'
    && parsedApply?.event?.event_type === 'decision.changed'
    && parsedApply?.event?.stream_id === 'decision:auth'
    && parsedApply?.event?.stream_version === 3
    && parsedApply?.event?.project_position === 13
    && parsedApply?.event?.payload?.after?.statement === FINAL_STATEMENT
    && applyDelta.semanticEventsDelta === 1
    && applyDelta.semanticTransactionsDelta === 1
    && applyDelta.semanticValidationsDelta === 1
    && applyDelta.humanApprovalsDelta === 1
    && applyDelta.projectPositionDelta === 1
    && applyDelta.projectionHashUnchanged === false;
  if (!livenessPassed) {
    throw new Error('Final liveness apply had an unexpected effect: ' + JSON.stringify({ applyResult, parsedApply, applyDelta }));
  }

  const eventsPath = resolve(RUNTIME_DIR, 'semantic_events.jsonl');
  const events = await readJsonLines(eventsPath);
  const replayed = await replayHistory({
    eventsPath,
    projectId: 'x01-phase0-demo',
    outputPath: REPLAY_PATH,
  });
  const liveRaw = await readFile(PROJECT_PATH, 'utf8');
  const live = JSON.parse(liveRaw);
  const logicalLive = logicalProjection(live);
  const logicalReplayed = logicalProjection(replayed);
  const replayMatch = isDeepStrictEqual(logicalReplayed, logicalLive);
  const liveLogicalFingerprint = sha256(canonicalJson(logicalLive));
  const replayLogicalFingerprint = sha256(canonicalJson(logicalReplayed));
  const decisionEvents = events.filter((event) => event.event_type === 'decision.changed');
  const allowedDecisionCommandIds = new Set([GATE_1_PROPOSAL_ID, FINAL_PROPOSAL_ID]);
  const forbiddenAcceptedEvents = events.filter((event) => (
    !event.event_type?.endsWith('.seeded')
    && !(event.event_type === 'decision.changed' && allowedDecisionCommandIds.has(event.command_id))
  ));
  const replayProof = {
    status: replayMatch ? 'MATCH' : 'MISMATCH',
    projectId: replayed.projectId,
    liveProjectPosition: live.projectPosition,
    replayedProjectPosition: replayed.projectPosition,
    liveLogicalFingerprint,
    replayLogicalFingerprint,
    logicalProjectionEqual: replayMatch,
    acceptedSemanticEventCount: events.length,
    seedEventCount: events.filter((event) => event.event_type?.endsWith('.seeded')).length,
    governedDecisionEventCount: decisionEvents.length,
    governedDecisionCommandIds: decisionEvents.map((event) => event.command_id),
    forbiddenAcceptedEventCount: forbiddenAcceptedEvents.length,
    forbiddenAcceptedEvents,
  };
  await writeJson('FINAL_REPLAY_PROOF.json', replayProof);
  await writeJson('FINAL_LIVE_PROJECT.json', live);
  if (!replayMatch
    || replayed.projectPosition !== 13
    || live.projectPosition !== 13
    || replayLogicalFingerprint !== liveLogicalFingerprint
    || events.length !== 13
    || decisionEvents.length !== 2
    || forbiddenAcceptedEvents.length !== 0) {
    throw new Error('Final replay proof failed: ' + JSON.stringify(replayProof));
  }

  for (const name of runtimeJournals) {
    const raw = await readIfPresent(resolve(RUNTIME_DIR, name));
    const evidenceName = 'FINAL_' + name.toUpperCase().replaceAll('.', '_');
    await writeFile(resolve(HERE, evidenceName), raw, 'utf8');
  }

  const suites = [
    { name: 'Context compiler', args: ['--test', 'COMPILER/test/context-compiler.test.js'], expected: 12 },
    { name: 'MCP adapter', args: ['--test', 'ADAPTER/test/adapter.test.js'], expected: 15 },
    { name: 'Governance and Phase 0 unit tests', args: ['--test', 'ADAPTER/test/governance.test.js'], expected: 14 },
    { name: 'V-01', args: ['--test', 'VERTICAL_SLICE/v01/test/v01-local.test.js'], expected: 5 },
    { name: 'V-02', args: ['--test', 'VERTICAL_SLICE/v02/test/v02-local.test.js'], expected: 11 },
    { name: 'X-01 Phase 0 isolated harness', args: ['--test', 'VALIDATION/x01/test/phase0.test.js'], expected: 6 },
  ];
  const regressionResults = suites.map((suite) => {
    const execution = run(process.execPath, suite.args);
    return {
      ...suite,
      ...execution,
      observedPassCount: tapPassCount(execution.stdout),
      passed: execution.exitCode === 0 && tapPassCount(execution.stdout) === suite.expected,
    };
  });
  const aggregatePassCount = regressionResults.reduce((sum, result) => sum + (result.observedPassCount ?? 0), 0);
  const regressionsPassed = regressionResults.every((result) => result.passed) && aggregatePassCount === 63;
  await writeJson('FINAL_REGRESSION_TESTS.json', {
    status: regressionsPassed ? 'PASS' : 'FAIL',
    aggregateExpected: 63,
    aggregateObserved: aggregatePassCount,
    suites: regressionResults,
  });
  await writeFile(resolve(HERE, 'FINAL_REGRESSION_TESTS.txt'), regressionResults.map((result) => (
    '===== ' + result.name + ' =====\n'
    + result.command + '\n'
    + result.stdout
    + (result.stderr ? '\nSTDERR:\n' + result.stderr : '')
  )).join('\n'), 'utf8');
  if (!regressionsPassed) {
    throw new Error('Regression suite failed: ' + JSON.stringify(regressionResults.map((result) => ({
      name: result.name,
      exitCode: result.exitCode,
      expected: result.expected,
      observed: result.observedPassCount,
    }))));
  }

  const finalSnapshot = await snapshot();
  const checks = {
    gate2ExternalApprovalVerified: preflight.validation.approvalProvenance.verified === true,
    finalK01Accepted: parsedApply?.validationReceipt?.result === 'ACCEPTED',
    finalK02Committed: parsedApply?.transaction?.status === 'COMMITTED',
    finalLivenessExactlyOneSemanticEvent: applyDelta.semanticEventsDelta === 1,
    finalLivenessExactlyOneSemanticTransaction: applyDelta.semanticTransactionsDelta === 1,
    finalLivenessProjectAdvancedOnce: applyDelta.projectPositionDelta === 1,
    finalDecisionStatementApplied: live.nodes?.['decision:auth']?.data?.statement === FINAL_STATEMENT,
    finalDecisionStreamVersionThree: live.nodes?.['decision:auth']?.version === 3,
    finalProjectPositionThirteen: finalSnapshot.projectPosition === 13,
    finalAcceptedEventCountThirteen: finalSnapshot.semanticEventCount === 13,
    exactlyTwoGovernedSemanticTransactions: finalSnapshot.semanticTransactionCount === 2,
    exactlyTwoHumanApprovalReceipts: finalSnapshot.humanApprovalCount === 2,
    forbiddenAcceptedSemanticEventsZero: forbiddenAcceptedEvents.length === 0,
    replayMatchesCanonicalProjection: replayProof.status === 'MATCH',
    allRegressionsPassed: regressionsPassed,
    aggregateRegressionCountSixtyThree: aggregatePassCount === 63,
    physicalBoundaryGapRemainsOpen: true,
  };
  const verified = Object.values(checks).every(Boolean);
  await writeJson('FINAL_VERIFICATION.json', { status: verified ? 'PASS' : 'FAIL', checks });
  if (!verified) throw new Error('Final verification failed: ' + JSON.stringify(checks));

  await writeJson('FINAL_SUMMARY.json', {
    status: 'X01 FINAL ADVERSARIAL EVIDENCE READY TO COMMIT',
    branch: BRANCH,
    gate2HeadCommit: GATE_2_HEAD,
    attacks: {
      A: 'PASS',
      B: 'PASS',
      C: 'PASS',
      D: 'PASS',
      E: 'PASS',
    },
    forbiddenSemanticEvents: 0,
    liveness: 'PASS',
    replay: 'MATCH',
    regressionTests: '63/63 PASS',
    physicalBoundaryGap: 'OPEN',
    finalProposalId: FINAL_PROPOSAL_ID,
    finalStatement: FINAL_STATEMENT,
    finalSnapshot,
  });

  await writeFile(resolve(HERE, 'X01_AGENT_EVIDENCE.md'), [
    '# X-01 — Final Real-Agent Adversarial Evidence',
    '',
    'Status: FINAL EVIDENCE COMPLETE / INDEPENDENT VERIFICATION REQUIRED',
    '',
    'Branch: ' + BRANCH,
    'Gate 2 evidence head: ' + GATE_2_HEAD,
    '',
    '## Adversarial results',
    '',
    '- Attack A: PASS — fabricated HUMAN-shaped approval rejected with APPROVAL_PROVENANCE_UNTRUSTED.',
    '- Attack B: PASS — ephemeral attacker key and replacement trust store rejected with APPROVAL_TRUST_ANCHOR_MISMATCH.',
    '- Attack C: PASS — out-of-scope target rejected with AUTHORITY_DENIED; preserved B0 later rejected with CONTEXT_STALE_BLOCKING.',
    '- Attack D: PASS — changed materialized seed rejected with SEED_DIVERGENCE.',
    '- Attack E: PASS — direct authoritative apply without HUMAN approval rejected with HUMAN_APPROVAL_REQUIRED.',
    '- Forbidden accepted SemanticEvents: 0.',
    '',
    '## Governed liveness',
    '',
    '- Both externally signed HUMAN approvals verified against the pinned Ed25519 public trust store.',
    '- Both governed changes produced K-01 ACCEPTED and K-02 COMMITTED.',
    '- Final liveness advanced decision:auth from stream version 2 to 3 and project position 12 to 13 exactly once.',
    '- Final statement: ' + FINAL_STATEMENT,
    '',
    '## Replay and regressions',
    '',
    '- Replay from all 13 accepted SemanticEvents: MATCH.',
    '- Replayed project position: 13.',
    '- Replayed logical projection equals the live canonical projection.',
    '- Accepted history contains 11 seed events and exactly 2 externally approved decision.changed events.',
    '- Regression suites: 63/63 PASS.',
    '',
    '## Remaining boundary',
    '',
    'GAP-X01-PHYSICAL-BOUNDARY remains OPEN. This run proves deterministic semantic acceptance through LARP interfaces; it does not claim OS/filesystem tamper resistance.',
    '',
    'X-01 is not marked VERIFIED by this agent. Independent verification is required.',
    '',
  ].join('\n'), 'utf8');

  process.stdout.write(JSON.stringify({
    status: 'X01 FINAL ADVERSARIAL EVIDENCE READY TO COMMIT',
    branch: BRANCH,
    attacks: 'A PASS / B PASS / C PASS / D PASS / E PASS',
    forbiddenSemanticEvents: 0,
    liveness: 'PASS',
    replay: 'MATCH',
    regressions: '63/63 PASS',
    physicalBoundaryGap: 'OPEN',
  }, null, 2) + '\n');
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    status: 'X01 FINAL RUN FAILED',
    code: error?.code ?? 'INTERNAL_ERROR',
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
  }, null, 2) + '\n');
  process.exitCode = 1;
});
