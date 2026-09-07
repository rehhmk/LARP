export class AuthorityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AuthorityError';
    this.code = code;
    this.details = details;
  }
}

function requireScope(project, scopeId, role) {
  if (typeof scopeId !== 'string' || !project.scopes?.[scopeId]) {
    throw new AuthorityError('AUTHORITY_CONTEXT_INVALID', `${role} scope ${scopeId ?? '<missing>'} does not exist.`);
  }
  return scopeId;
}

export function isWithinScope(project, targetScopeId, boundaryScopeId) {
  requireScope(project, targetScopeId, 'Target');
  requireScope(project, boundaryScopeId, 'Boundary');
  let cursor = targetScopeId;
  const seen = new Set();
  while (cursor != null) {
    if (cursor === boundaryScopeId) return true;
    if (seen.has(cursor)) throw new AuthorityError('SCOPE_CYCLE', `Scope cycle detected at ${cursor}.`);
    seen.add(cursor);
    cursor = project.scopes[cursor]?.parentId ?? null;
  }
  return false;
}

export function authorizeProposalTarget({
  project,
  targetId,
  taskId,
  agentId,
  compileScopeId,
  observed = null,
}) {
  const target = project.nodes?.[targetId];
  const task = project.nodes?.[taskId];
  const agent = project.nodes?.[agentId];
  if (!target) throw new AuthorityError('REFERENCE_INVALID', `Target ${targetId} does not exist.`);
  if (!task || task.kind !== 'Task') throw new AuthorityError('AUTHORITY_CONTEXT_INVALID', `Task ${taskId ?? '<missing>'} is unavailable.`);
  if (!agent || agent.kind !== 'Agent') throw new AuthorityError('AUTHORITY_CONTEXT_INVALID', `Agent ${agentId ?? '<missing>'} is unavailable.`);

  const targetScopeId = requireScope(project, target.scopeId, 'Target');
  const taskScopeId = requireScope(project, task.scopeId, 'Task');
  const agentScopeId = requireScope(project, agent.scopeId, 'Agent');
  const effectiveTaskScopeId = requireScope(project, task.data?.allowedScope ?? taskScopeId, 'Task allowed');
  requireScope(project, compileScopeId, 'Compile');

  const binding = {
    taskId,
    taskScopeId,
    taskAllowedScopeId: effectiveTaskScopeId,
    agentId,
    agentScopeId,
    compileScopeId,
    targetId,
    targetScopeId,
  };

  if (observed) {
    for (const [key, value] of Object.entries(binding)) {
      if (observed[key] !== value) {
        throw new AuthorityError(
          'AUTHORITY_CONTEXT_CHANGED',
          `Proposal authority binding ${key} no longer matches canonical project state.`,
          { key, observed: observed[key] ?? null, current: value },
        );
      }
    }
  }

  const boundaries = [effectiveTaskScopeId, agentScopeId, compileScopeId];
  const deniedBy = boundaries.filter((boundary) => !isWithinScope(project, targetScopeId, boundary));
  if (deniedBy.length > 0) {
    throw new AuthorityError(
      'AUTHORITY_DENIED',
      `Target ${targetId} in scope ${targetScopeId} is outside the effective proposal scope.`,
      { ...binding, deniedBy },
    );
  }

  return { ...binding, decision: 'ALLOW' };
}
