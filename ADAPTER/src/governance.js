import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export class GovernanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
    this.details = details;
  }
}

export function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

function requireHumanApproval(approval, proposalId) {
  if (!approval || approval.approved !== true) {
    throw new GovernanceError('HUMAN_APPROVAL_REQUIRED', 'A concrete human approval is required.');
  }
  if (approval.proposalId !== proposalId) {
    throw new GovernanceError('APPROVAL_PROPOSAL_MISMATCH', 'Approval does not reference the proposal being applied.');
  }
  if (approval.actor?.kind !== 'HUMAN') {
    throw new GovernanceError('AUTHORITY_DENIED', 'Only a HUMAN approval actor may authorize semantic mutation.');
  }
  if (typeof approval.actor?.id !== 'string' || approval.actor.id.trim() === '') {
    throw new GovernanceError('AUTHORITY_DENIED', 'Human approval actor must have a stable id.');
  }
  if (typeof approval.approvalId !== 'string' || approval.approvalId.trim() === '') {
    throw new GovernanceError('APPROVAL_ID_REQUIRED', 'Human approval must have a stable approvalId.');
  }
}

export async function readJsonLines(path) {
  try {
    const text = await readFile(path, 'utf8');
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function findProposal(runtimeDir, proposalId) {
  const proposals = await readJsonLines(resolve(runtimeDir, 'proposals.jsonl'));
  const proposal = proposals.find((entry) => entry.proposalId === proposalId);
  if (!proposal) throw new GovernanceError('PROPOSAL_NOT_FOUND', `Proposal ${proposalId} was not found.`);
  return proposal;
}

export function evaluateApprovedProposal({ project, projectRaw, proposal, approval }) {
  requireHumanApproval(approval, proposal.proposalId);

  if (proposal.status !== 'PROPOSED' || proposal.governanceRequired !== true || proposal.semanticMutationApplied !== false) {
    throw new GovernanceError('PROPOSAL_STATE_INVALID', 'Proposal is not an unapplied governed proposal.');
  }
  if (proposal.projectId !== project.projectId) {
    throw new GovernanceError('PROJECT_MISMATCH', 'Proposal belongs to a different project.');
  }
  if (proposal.projectPositionObserved !== project.projectPosition) {
    throw new GovernanceError('STATE_CONFLICT', 'Project position changed since the proposal was created.');
  }
  const currentHash = sha256Text(projectRaw);
  if (proposal.projectFileHashObserved !== currentHash) {
    throw new GovernanceError('STATE_CONFLICT', 'Project content changed since the proposal was created.');
  }

  const target = project.nodes?.[proposal.targetId];
  if (!target) throw new GovernanceError('REFERENCE_INVALID', `Target ${proposal.targetId} does not exist.`);
  if (proposal.expectedStreamVersion !== target.version) {
    throw new GovernanceError('STATE_CONFLICT', 'Target stream version does not match proposal expectation.');
  }

  if (proposal.commandType !== 'decision.propose_change') {
    throw new GovernanceError('COMMAND_UNSUPPORTED', `A-02 v0.1 does not support ${proposal.commandType}.`);
  }
  if (target.kind !== 'Decision') {
    throw new GovernanceError('REFERENCE_INVALID', 'decision.propose_change must target a Decision node.');
  }
  if (target.lifecycle !== 'ACTIVE') {
    throw new GovernanceError('TRANSITION_INVALID', 'Only an ACTIVE decision can be changed by this command.');
  }
  if (typeof proposal.payload?.statement !== 'string' || proposal.payload.statement.trim() === '') {
    throw new GovernanceError('SCHEMA_INVALID', 'Decision change requires a non-empty payload.statement.');
  }

  const candidate = structuredClone(project);
  const changed = candidate.nodes[proposal.targetId];
  const beforeStatement = changed.data?.statement ?? null;
  changed.data = { ...(changed.data ?? {}), statement: proposal.payload.statement };
  changed.version += 1;
  candidate.projectPosition += 1;

  return {
    candidateProject: candidate,
    validation: {
      result: 'ACCEPTED',
      proposalId: proposal.proposalId,
      approvalId: approval.approvalId,
      targetId: proposal.targetId,
      previousStreamVersion: target.version,
      nextStreamVersion: changed.version,
      previousProjectPosition: project.projectPosition,
      nextProjectPosition: candidate.projectPosition,
      beforeStatement,
      afterStatement: changed.data.statement,
      actor: approval.actor,
    },
  };
}

export async function applyApprovedProposal({
  projectPath,
  runtimeDir,
  proposalId,
  approval,
  now = () => new Date().toISOString(),
  idFactory = () => randomUUID(),
}) {
  const resolvedProject = resolve(projectPath);
  const resolvedRuntime = resolve(runtimeDir);
  const projectRaw = await readFile(resolvedProject, 'utf8');
  const project = JSON.parse(projectRaw);
  const proposal = await findProposal(resolvedRuntime, proposalId);
  const { candidateProject, validation } = evaluateApprovedProposal({ project, projectRaw, proposal, approval });

  const suffix = idFactory();
  const recordedAt = now();
  const validationReceipt = {
    validationReceiptId: `validation:${suffix}`,
    ...validation,
    recordedAt,
  };
  const transaction = {
    transactionId: `tx:${suffix}`,
    projectId: project.projectId,
    proposalId,
    approvalId: approval.approvalId,
    status: 'COMMITTED',
    eventCount: 1,
    recordedAt,
  };
  const event = {
    event_id: `event:${suffix}`,
    project_id: project.projectId,
    event_type: 'decision.changed',
    schema_version: 1,
    stream_id: proposal.targetId,
    stream_version: validation.nextStreamVersion,
    transaction_id: transaction.transactionId,
    transaction_index: 0,
    project_position: validation.nextProjectPosition,
    command_id: proposal.proposalId,
    causation_ref: proposal.proposalId,
    correlation_id: approval.approvalId,
    actor_ref: approval.actor.id,
    machine_id: 'decision.lifecycle',
    machine_version: '0.1',
    validation_receipt_ref: validationReceipt.validationReceiptId,
    recorded_at: recordedAt,
    payload: {
      targetId: proposal.targetId,
      before: { statement: validation.beforeStatement },
      after: { statement: validation.afterStatement },
    },
  };

  await mkdir(resolvedRuntime, { recursive: true });

  // Canonical semantic history is appended first. The JSON project file is a disposable
  // projection fixture for this adapter prototype and can be rebuilt from accepted events.
  await appendFile(resolve(resolvedRuntime, 'human_approvals.jsonl'), `${JSON.stringify(approval)}\n`, 'utf8');
  await appendFile(resolve(resolvedRuntime, 'semantic_validation_receipts.jsonl'), `${JSON.stringify(validationReceipt)}\n`, 'utf8');
  await appendFile(resolve(resolvedRuntime, 'semantic_transactions.jsonl'), `${JSON.stringify(transaction)}\n`, 'utf8');
  await appendFile(resolve(resolvedRuntime, 'semantic_events.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');

  const nextRaw = `${JSON.stringify(candidateProject, null, 2)}\n`;
  const tempProject = `${resolvedProject}.a02-${suffix}.tmp`;
  await writeFile(tempProject, nextRaw, 'utf8');
  await rename(tempProject, resolvedProject);

  return {
    status: 'APPLIED',
    proposalId,
    approvalId: approval.approvalId,
    semanticMutationApplied: true,
    projectPosition: candidateProject.projectPosition,
    targetStreamVersion: candidateProject.nodes[proposal.targetId].version,
    event,
    transaction,
    validationReceipt,
    projectFileHashAfter: sha256Text(nextRaw),
  };
}
