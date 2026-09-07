import { createHash } from 'node:crypto';

const SEVERITY = Object.freeze({ NONE: 0, REVIEW: 1, BLOCK: 2, INVALID: 3 });
const FRESHNESS = Object.freeze({
  CURRENT: 'CURRENT',
  STALE_NON_BLOCKING: 'STALE_NON_BLOCKING',
  STALE_BLOCKING: 'STALE_BLOCKING',
});

export class ContextCompilerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ContextCompilerError';
    this.code = code;
    this.details = details;
  }
}

export function canonicalize(value) {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
    case 'string':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new ContextCompilerError('CANONICALIZATION_INVALID_NUMBER', 'JCS/I-JSON does not allow non-finite numbers.');
      }
      return JSON.stringify(value);
    case 'object':
      if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(',')}]`;
      }
      return `{${Object.keys(value)
        .sort()
        .map((key) => {
          const child = value[key];
          if (child === undefined || typeof child === 'function' || typeof child === 'symbol' || typeof child === 'bigint') {
            throw new ContextCompilerError('CANONICALIZATION_INVALID_VALUE', `Unsupported JSON value at key ${key}.`);
          }
          return `${JSON.stringify(key)}:${canonicalize(child)}`;
        })
        .join(',')}}`;
    default:
      throw new ContextCompilerError('CANONICALIZATION_INVALID_VALUE', `Unsupported JSON type: ${typeof value}.`);
  }
}

export function sha256Canonical(value) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

export const DEFAULT_POLICY = Object.freeze({
  policyId: 'larp/context/default',
  version: '0.1',
  supersededRequiredImpact: 'BLOCK',
  relationSemantics: {
    requires: {
      traversal: 'OUTGOING',
      inclusionClass: 'MANDATORY',
      impactOnChange: 'BLOCK',
      watchedDimensions: ['current', 'invalid', 'lifecycle', 'data'],
    },
    depends_on: {
      traversal: 'OUTGOING',
      inclusionClass: 'MANDATORY',
      impactOnChange: 'BLOCK',
      watchedDimensions: ['current', 'invalid', 'lifecycle', 'data'],
    },
    governed_by: {
      traversal: 'OUTGOING',
      inclusionClass: 'MANDATORY',
      impactOnChange: 'BLOCK',
      watchedDimensions: ['current', 'invalid', 'lifecycle', 'data'],
    },
    authorized_by: {
      traversal: 'OUTGOING',
      inclusionClass: 'MANDATORY',
      impactOnChange: 'BLOCK',
      watchedDimensions: ['current', 'invalid', 'lifecycle', 'data'],
    },
    uses: {
      traversal: 'OUTGOING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
    assumes: {
      traversal: 'OUTGOING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
    has_unknown: {
      traversal: 'OUTGOING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
    unknown_about: {
      traversal: 'OUTGOING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
    supports: {
      traversal: 'INCOMING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
    contradicts: {
      traversal: 'INCOMING',
      inclusionClass: 'SUPPORTING',
      impactOnChange: 'REVIEW',
      watchedDimensions: ['current', 'invalid', 'data'],
    },
  },
});

function mergePolicy(policy = {}) {
  return {
    ...DEFAULT_POLICY,
    ...policy,
    relationSemantics: {
      ...DEFAULT_POLICY.relationSemantics,
      ...(policy.relationSemantics ?? {}),
    },
  };
}

function getByPath(value, path) {
  return path.split('.').reduce((current, key) => (current == null ? undefined : current[key]), value);
}

function projectDimensions(value, dimensions) {
  const out = {};
  for (const dimension of [...new Set(dimensions)].sort()) {
    out[dimension] = getByPath(value, dimension) ?? null;
  }
  return out;
}

function maxSeverity(a, b) {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function normalizeNode(node) {
  return {
    id: node.id,
    kind: node.kind,
    scopeId: node.scopeId,
    version: node.version ?? 0,
    current: node.current ?? true,
    invalid: node.invalid ?? false,
    lifecycle: node.lifecycle ?? null,
    data: node.data ?? {},
  };
}

function normalizeRelation(relation) {
  return {
    id: relation.id,
    kind: relation.kind,
    source: relation.source,
    target: relation.target,
    scopeId: relation.scopeId ?? null,
    active: relation.active ?? true,
    version: relation.version ?? 0,
    watchedDimensions: relation.watchedDimensions ?? null,
    impactOnChange: relation.impactOnChange ?? null,
    data: relation.data ?? {},
  };
}

function normalizeScope(id, scope) {
  return {
    id,
    parentId: scope?.parentId ?? null,
    version: scope?.version ?? 0,
    data: scope?.data ?? {},
  };
}

function isAncestorOrSelf(scopes, possibleAncestor, scopeId) {
  if (possibleAncestor == null || scopeId == null) return false;
  let cursor = scopeId;
  const seen = new Set();
  while (cursor != null) {
    if (cursor === possibleAncestor) return true;
    if (seen.has(cursor)) {
      throw new ContextCompilerError('SCOPE_CYCLE', `Scope cycle detected at ${cursor}.`);
    }
    seen.add(cursor);
    cursor = scopes[cursor]?.parentId ?? null;
  }
  return false;
}

function isVisible(project, node, compileScopeId) {
  return isAncestorOrSelf(project.scopes, node.scopeId, compileScopeId);
}

function scopeChain(project, scopeId) {
  const chain = [];
  let cursor = scopeId;
  const seen = new Set();
  while (cursor != null) {
    if (seen.has(cursor)) throw new ContextCompilerError('SCOPE_CYCLE', `Scope cycle detected at ${cursor}.`);
    seen.add(cursor);
    const scope = project.scopes[cursor];
    if (!scope) throw new ContextCompilerError('SCOPE_NOT_FOUND', `Scope ${cursor} does not exist.`);
    chain.push(normalizeScope(cursor, scope));
    cursor = scope.parentId ?? null;
  }
  return chain;
}

function semanticFingerprint(refType, value, watchedDimensions) {
  if (refType === 'node') {
    return sha256Canonical(projectDimensions(normalizeNode(value), watchedDimensions));
  }
  if (refType === 'relation') {
    return sha256Canonical(projectDimensions(normalizeRelation(value), watchedDimensions));
  }
  if (refType === 'scope') {
    return sha256Canonical(projectDimensions(value, watchedDimensions));
  }
  throw new ContextCompilerError('UNKNOWN_REF_TYPE', `Unknown ref type ${refType}.`);
}

function entryKey(refType, ref) {
  return `${refType}:${ref}`;
}

function stableSortById(items) {
  return [...items].sort((a, b) => String(a.id ?? a.ref).localeCompare(String(b.id ?? b.ref), 'en'));
}

function categorizeSelected(nodes) {
  const sections = {
    decisions: [],
    rules: [],
    evidence: [],
    claims: [],
    assumptions: [],
    unknowns: [],
    artifacts: [],
    other: [],
  };

  for (const node of nodes) {
    const normalized = normalizeNode(node);
    switch (normalized.kind) {
      case 'Decision': sections.decisions.push(normalized); break;
      case 'Rule':
      case 'Policy':
      case 'Gate': sections.rules.push(normalized); break;
      case 'Evidence': sections.evidence.push(normalized); break;
      case 'Claim': sections.claims.push(normalized); break;
      case 'Assumption': sections.assumptions.push(normalized); break;
      case 'Unknown': sections.unknowns.push(normalized); break;
      case 'Artifact': sections.artifacts.push(normalized); break;
      case 'Task':
      case 'Agent': break;
      default: sections.other.push(normalized);
    }
  }

  for (const key of Object.keys(sections)) sections[key] = stableSortById(sections[key]);
  return sections;
}

function logicalBundleForHash(bundle) {
  const { sourceProjectPosition: _sourceProjectPosition, ...logical } = bundle;
  return logical;
}

export function compileContext(input) {
  const {
    project,
    taskId,
    agentId,
    scopeId,
    compilerVersion = '0.1',
    policy: rawPolicy = {},
  } = input;

  if (!project?.nodes || !project?.relations || !project?.scopes) {
    throw new ContextCompilerError('PROJECT_SHAPE_INVALID', 'Project must contain nodes, relations and scopes.');
  }

  const policy = mergePolicy(rawPolicy);
  const task = project.nodes[taskId];
  if (!task || task.kind !== 'Task') throw new ContextCompilerError('TASK_NOT_FOUND', `Task ${taskId} does not exist.`);
  if (!project.scopes[scopeId]) throw new ContextCompilerError('SCOPE_NOT_FOUND', `Scope ${scopeId} does not exist.`);
  if (!isVisible(project, task, scopeId)) throw new ContextCompilerError('TASK_INVISIBLE', `Task ${taskId} is not visible from ${scopeId}.`);

  const selected = new Map();
  const selectedRelations = new Map();
  const warnings = [];
  const blockers = [];
  const queue = [];

  function selectNode(nodeId, reason) {
    const node = project.nodes[nodeId];
    if (!node) {
      if (reason.inclusionClass === 'MANDATORY') {
        throw new ContextCompilerError('MANDATORY_DEPENDENCY_MISSING', `Mandatory dependency ${nodeId} is missing.`, { reason });
      }
      return false;
    }
    if (!isVisible(project, node, scopeId)) {
      if (reason.inclusionClass === 'MANDATORY') {
        throw new ContextCompilerError('MANDATORY_DEPENDENCY_INVISIBLE', `Mandatory dependency ${nodeId} is invisible from ${scopeId}.`, { reason });
      }
      return false;
    }

    const existing = selected.get(nodeId);
    const dimensions = reason.watchedDimensions ?? ['current', 'invalid', 'lifecycle', 'data'];
    if (!existing) {
      selected.set(nodeId, {
        node,
        inclusionClass: reason.inclusionClass,
        impactOnChange: reason.impactOnChange,
        watchedDimensions: new Set(dimensions),
        reasons: [reason.selectedBecause],
      });
      queue.push(nodeId);
      return true;
    }

    if (reason.inclusionClass === 'MANDATORY') existing.inclusionClass = 'MANDATORY';
    existing.impactOnChange = maxSeverity(existing.impactOnChange, reason.impactOnChange);
    for (const dimension of dimensions) existing.watchedDimensions.add(dimension);
    if (!existing.reasons.includes(reason.selectedBecause)) existing.reasons.push(reason.selectedBecause);
    return false;
  }

  function selectRelation(relation, semantic) {
    const existing = selectedRelations.get(relation.id);
    const dimensions = ['active', 'kind', 'source', 'target', 'data'];
    const impact = relation.impactOnChange ?? semantic.impactOnChange;
    if (!existing) {
      selectedRelations.set(relation.id, {
        relation,
        impactOnChange: impact,
        watchedDimensions: new Set(dimensions),
        reasons: [`${relation.kind}:${relation.source}->${relation.target}`],
      });
    } else {
      existing.impactOnChange = maxSeverity(existing.impactOnChange, impact);
      for (const dimension of dimensions) existing.watchedDimensions.add(dimension);
    }
  }

  selectNode(taskId, {
    inclusionClass: 'MANDATORY',
    impactOnChange: 'BLOCK',
    watchedDimensions: ['current', 'invalid', 'lifecycle', 'data.goal', 'data.acceptanceCriteria', 'data.allowedScope'],
    selectedBecause: 'TASK_CONTRACT',
  });

  if (agentId && project.nodes[agentId]) {
    selectNode(agentId, {
      inclusionClass: 'MANDATORY',
      impactOnChange: 'BLOCK',
      watchedDimensions: ['current', 'invalid', 'data.capabilities', 'data.roles'],
      selectedBecause: 'EXECUTING_AGENT',
    });
  }

  const sortedRelations = stableSortById(project.relations.filter((relation) => relation.active ?? true));

  while (queue.length > 0) {
    const currentId = queue.shift();

    for (const relation of sortedRelations) {
      const semantic = policy.relationSemantics[relation.kind];
      if (!semantic) continue;

      const followsOutgoing = semantic.traversal === 'OUTGOING' && relation.source === currentId;
      const followsIncoming = semantic.traversal === 'INCOMING' && relation.target === currentId;
      if (!followsOutgoing && !followsIncoming) continue;

      const targetId = followsOutgoing ? relation.target : relation.source;
      const watched = relation.watchedDimensions ?? semantic.watchedDimensions;
      selectRelation(relation, semantic);
      selectNode(targetId, {
        inclusionClass: semantic.inclusionClass,
        impactOnChange: relation.impactOnChange ?? semantic.impactOnChange,
        watchedDimensions: watched,
        selectedBecause: `${relation.kind}:${relation.id}`,
      });
    }
  }

  // Preserve superseded required dependencies and expose their current replacement.
  for (const [nodeId, selectedInfo] of [...selected.entries()]) {
    const normalized = normalizeNode(selectedInfo.node);
    if (selectedInfo.inclusionClass !== 'MANDATORY') continue;
    if (normalized.current !== false && normalized.lifecycle !== 'SUPERSEDED') continue;

    const supersession = sortedRelations.find((relation) => relation.kind === 'supersedes' && relation.target === nodeId);
    if (!supersession) {
      warnings.push({ code: 'MANDATORY_DEPENDENCY_NOT_CURRENT', ref: nodeId });
      if (policy.supersededRequiredImpact === 'BLOCK') blockers.push({ code: 'MANDATORY_DEPENDENCY_NOT_CURRENT', ref: nodeId });
      continue;
    }

    const replacement = project.nodes[supersession.source];
    if (replacement && isVisible(project, replacement, scopeId)) {
      const pseudoSemantic = {
        inclusionClass: 'MANDATORY',
        impactOnChange: policy.supersededRequiredImpact,
        watchedDimensions: ['current', 'invalid', 'lifecycle', 'data'],
      };
      selectRelation(supersession, pseudoSemantic);
      selectNode(supersession.source, {
        inclusionClass: 'MANDATORY',
        impactOnChange: policy.supersededRequiredImpact,
        watchedDimensions: pseudoSemantic.watchedDimensions,
        selectedBecause: `CURRENT_REPLACEMENT_FOR:${nodeId}`,
      });
      warnings.push({ code: 'SUPERSEDED_DEPENDENCY', ref: nodeId, replacement: supersession.source });
      if (policy.supersededRequiredImpact === 'BLOCK') {
        blockers.push({ code: 'SUPERSEDED_DEPENDENCY', ref: nodeId, replacement: supersession.source });
      }
    } else {
      warnings.push({ code: 'SUPERSEDED_DEPENDENCY_REPLACEMENT_INVISIBLE', ref: nodeId, replacement: supersession.source });
      blockers.push({ code: 'SUPERSEDED_DEPENDENCY_REPLACEMENT_INVISIBLE', ref: nodeId, replacement: supersession.source });
    }
  }

  const selectedNodes = stableSortById([...selected.values()].map((item) => item.node));
  const taskNode = normalizeNode(task);
  const agentNode = agentId && project.nodes[agentId] ? normalizeNode(project.nodes[agentId]) : null;
  const sections = categorizeSelected(selectedNodes);

  const manifest = [];
  const selectionTrace = [];

  for (const [nodeId, info] of [...selected.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const watchedDimensions = [...info.watchedDimensions].sort();
    manifest.push({
      refType: 'node',
      ref: nodeId,
      kind: info.node.kind,
      observedVersion: info.node.version ?? 0,
      watchedDimensions,
      semanticFingerprint: semanticFingerprint('node', info.node, watchedDimensions),
      inclusionClass: info.inclusionClass,
      impactOnChange: info.impactOnChange,
      selectedBecause: [...info.reasons].sort(),
    });
    selectionTrace.push({ refType: 'node', ref: nodeId, selectedBecause: [...info.reasons].sort() });
  }

  for (const [relationId, info] of [...selectedRelations.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const watchedDimensions = [...info.watchedDimensions].sort();
    manifest.push({
      refType: 'relation',
      ref: relationId,
      kind: info.relation.kind,
      observedVersion: info.relation.version ?? 0,
      watchedDimensions,
      semanticFingerprint: semanticFingerprint('relation', info.relation, watchedDimensions),
      inclusionClass: 'STRUCTURAL',
      impactOnChange: info.impactOnChange,
      selectedBecause: [...info.reasons].sort(),
    });
    selectionTrace.push({ refType: 'relation', ref: relationId, selectedBecause: [...info.reasons].sort() });
  }

  for (const scope of scopeChain(project, scopeId)) {
    const watchedDimensions = ['parentId', 'data'];
    manifest.push({
      refType: 'scope',
      ref: scope.id,
      kind: 'Scope',
      observedVersion: scope.version ?? 0,
      watchedDimensions,
      semanticFingerprint: semanticFingerprint('scope', scope, watchedDimensions),
      inclusionClass: 'STRUCTURAL',
      impactOnChange: 'BLOCK',
      selectedBecause: ['SCOPE_VISIBILITY_CHAIN'],
    });
    selectionTrace.push({ refType: 'scope', ref: scope.id, selectedBecause: ['SCOPE_VISIBILITY_CHAIN'] });
  }

  manifest.sort((a, b) => entryKey(a.refType, a.ref).localeCompare(entryKey(b.refType, b.ref), 'en'));
  selectionTrace.sort((a, b) => entryKey(a.refType, a.ref).localeCompare(entryKey(b.refType, b.ref), 'en'));

  const omissionManifest = Object.values(project.nodes)
    .filter((node) => !selected.has(node.id))
    .map((node) => ({
      ref: node.id,
      kind: node.kind,
      reason: isVisible(project, node, scopeId) ? 'NOT_RELEVANT' : 'INVISIBLE',
    }))
    .sort((a, b) => a.ref.localeCompare(b.ref, 'en'));

  const authorityContext = {
    agent: agentNode,
    rules: sections.rules,
  };

  const bundle = {
    schemaVersion: '0.1',
    compilerVersion,
    policy: { id: policy.policyId, version: policy.version },
    projectId: project.projectId,
    compileScopeId: scopeId,
    sourceProjectPosition: project.projectPosition ?? 0,
    taskContract: {
      id: taskNode.id,
      scopeId: taskNode.scopeId,
      lifecycle: taskNode.lifecycle,
      goal: taskNode.data.goal ?? null,
      acceptanceCriteria: taskNode.data.acceptanceCriteria ?? [],
      allowedScope: taskNode.data.allowedScope ?? null,
    },
    authorityContext,
    decisions: sections.decisions,
    dependencies: stableSortById([...selectedRelations.values()].map((item) => normalizeRelation(item.relation))),
    evidence: sections.evidence,
    claims: sections.claims,
    assumptions: sections.assumptions,
    unknowns: sections.unknowns,
    artifacts: sections.artifacts,
    other: sections.other,
    warnings: [...warnings].sort((a, b) => canonicalize(a).localeCompare(canonicalize(b), 'en')),
    blockers: [...blockers].sort((a, b) => canonicalize(a).localeCompare(canonicalize(b), 'en')),
    dependencyManifest: manifest,
    selectionTrace,
    omissionManifest,
  };

  const inputFingerprint = sha256Canonical({
    compilerVersion,
    policy: { id: policy.policyId, version: policy.version },
    projectId: project.projectId,
    taskId,
    agentId: agentId ?? null,
    scopeId,
    dependencyManifest: manifest.map((entry) => ({
      refType: entry.refType,
      ref: entry.ref,
      watchedDimensions: entry.watchedDimensions,
      semanticFingerprint: entry.semanticFingerprint,
      inclusionClass: entry.inclusionClass,
      impactOnChange: entry.impactOnChange,
    })),
  });

  const bundleFingerprint = sha256Canonical(logicalBundleForHash(bundle));

  return {
    ...bundle,
    inputFingerprint,
    bundleFingerprint,
  };
}

function resolveManifestRef(project, entry) {
  if (entry.refType === 'node') return project.nodes[entry.ref] ?? null;
  if (entry.refType === 'relation') return project.relations.find((relation) => relation.id === entry.ref) ?? null;
  if (entry.refType === 'scope') {
    const scope = project.scopes[entry.ref];
    return scope ? normalizeScope(entry.ref, scope) : null;
  }
  return null;
}

export function verifyContext(bundle, currentProject) {
  const changes = [];
  let max = 'NONE';

  for (const entry of bundle.dependencyManifest) {
    const current = resolveManifestRef(currentProject, entry);
    if (!current) {
      const severity = entry.impactOnChange === 'NONE' ? 'REVIEW' : entry.impactOnChange;
      max = maxSeverity(max, severity);
      changes.push({
        refType: entry.refType,
        ref: entry.ref,
        reason: 'MISSING',
        severity,
      });
      continue;
    }

    if (entry.refType === 'node' && !isVisible(currentProject, current, bundle.compileScopeId)) {
      const severity = entry.inclusionClass === 'MANDATORY' ? 'BLOCK' : 'REVIEW';
      max = maxSeverity(max, severity);
      changes.push({ refType: entry.refType, ref: entry.ref, reason: 'INVISIBLE', severity });
      continue;
    }

    const fingerprint = semanticFingerprint(entry.refType, current, entry.watchedDimensions);
    if (fingerprint !== entry.semanticFingerprint) {
      const severity = entry.impactOnChange;
      max = maxSeverity(max, severity);
      changes.push({
        refType: entry.refType,
        ref: entry.ref,
        reason: 'SEMANTIC_FINGERPRINT_CHANGED',
        severity,
        before: entry.semanticFingerprint,
        after: fingerprint,
      });
    }
  }

  const freshness = SEVERITY[max] >= SEVERITY.BLOCK
    ? FRESHNESS.STALE_BLOCKING
    : SEVERITY[max] >= SEVERITY.REVIEW
      ? FRESHNESS.STALE_NON_BLOCKING
      : FRESHNESS.CURRENT;

  return {
    freshness,
    severity: max,
    changes: changes.sort((a, b) => entryKey(a.refType, a.ref).localeCompare(entryKey(b.refType, b.ref), 'en')),
    checkedAgainstProjectPosition: currentProject.projectPosition ?? 0,
  };
}

export { FRESHNESS };
