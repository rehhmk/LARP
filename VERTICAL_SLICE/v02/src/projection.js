export function emptyProject(projectId) {
  if (typeof projectId !== 'string' || projectId.length === 0) throw new Error('PROJECT_ID_REQUIRED');
  return { projectId, projectPosition: 0, scopes: {}, nodes: {}, relations: [] };
}

function assertNextPosition(project, event) {
  if (!Number.isInteger(event.project_position) || event.project_position !== project.projectPosition + 1) {
    throw new Error(`EVENT_ORDER_INVALID:${event.event_id}`);
  }
}

function assertSeedVersion(event, entity) {
  if (event.stream_id !== entity.id || event.stream_version !== 1 || entity.version !== 1) {
    throw new Error(`STREAM_VERSION_INVALID:${event.event_id}`);
  }
}

export function applySemanticEvent(project, event) {
  if (event.project_id !== project.projectId) throw new Error(`PROJECT_MISMATCH:${event.project_id}`);
  assertNextPosition(project, event);

  if (event.event_type === 'scope.seeded') {
    const scope = structuredClone(event.payload?.scope);
    if (!scope?.id || project.scopes[scope.id]) throw new Error(`SCOPE_SEED_INVALID:${event.event_id}`);
    assertSeedVersion(event, scope);
    project.scopes[scope.id] = { parentId: scope.parentId ?? null, version: scope.version, data: scope.data ?? {} };
  } else if (event.event_type === 'node.seeded') {
    const node = structuredClone(event.payload?.node);
    if (!node?.id || project.nodes[node.id]) throw new Error(`NODE_SEED_INVALID:${event.event_id}`);
    assertSeedVersion(event, node);
    project.nodes[node.id] = node;
  } else if (event.event_type === 'relation.seeded') {
    const relation = structuredClone(event.payload?.relation);
    if (!relation?.id || project.relations.some(({ id }) => id === relation.id)) {
      throw new Error(`RELATION_SEED_INVALID:${event.event_id}`);
    }
    assertSeedVersion(event, relation);
    project.relations.push(relation);
  } else if (event.event_type === 'decision.changed') {
    const node = project.nodes[event.stream_id];
    if (!node || node.kind !== 'Decision') throw new Error(`REPLAY_REFERENCE_INVALID:${event.stream_id}`);
    if (event.stream_version !== node.version + 1) throw new Error(`STREAM_VERSION_INVALID:${event.event_id}`);
    if (typeof event.payload?.after?.statement !== 'string') throw new Error(`EVENT_PAYLOAD_INVALID:${event.event_id}`);
    node.data = { ...(node.data ?? {}), statement: event.payload.after.statement };
    node.version = event.stream_version;
  } else {
    throw new Error(`EVENT_TYPE_UNSUPPORTED:${event.event_type}`);
  }

  project.projectPosition = event.project_position;
  return project;
}

export function finalizeProjection(project) {
  project.relations.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return project;
}

export function logicalProjection(project) {
  return structuredClone(project);
}
