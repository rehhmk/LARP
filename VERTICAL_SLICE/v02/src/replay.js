import { readFile, writeFile } from 'node:fs/promises';

export function emptyProject(projectId) {
  return { projectId, projectPosition: 0, scopes: {}, nodes: {}, relations: [] };
}

export function replayEvents(events, { projectId = null } = {}) {
  const inferred = projectId ?? events[0]?.project_id;
  if (!inferred) throw new Error('PROJECT_ID_REQUIRED');
  const project = emptyProject(inferred);
  const relationIndex = new Map();

  for (const event of events) {
    if (event.project_id !== inferred) throw new Error(`PROJECT_MISMATCH:${event.project_id}`);
    if (!Number.isInteger(event.project_position) || event.project_position <= project.projectPosition) {
      throw new Error(`EVENT_ORDER_INVALID:${event.event_id}`);
    }

    if (event.event_type === 'scope.seeded') {
      const scope = structuredClone(event.payload.scope);
      project.scopes[scope.id] = { parentId: scope.parentId ?? null, version: scope.version ?? 1, data: scope.data ?? {} };
    } else if (event.event_type === 'node.seeded') {
      const node = structuredClone(event.payload.node);
      project.nodes[node.id] = node;
    } else if (event.event_type === 'relation.seeded') {
      const relation = structuredClone(event.payload.relation);
      if (relationIndex.has(relation.id)) throw new Error(`RELATION_DUPLICATE:${relation.id}`);
      relationIndex.set(relation.id, relation);
      project.relations.push(relation);
    } else if (event.event_type === 'decision.changed') {
      const node = project.nodes[event.stream_id];
      if (!node || node.kind !== 'Decision') throw new Error(`REPLAY_REFERENCE_INVALID:${event.stream_id}`);
      node.data = { ...(node.data ?? {}), statement: event.payload.after.statement };
      node.version = event.stream_version;
    } else {
      throw new Error(`EVENT_TYPE_UNSUPPORTED:${event.event_type}`);
    }
    project.projectPosition = event.project_position;
  }

  project.relations.sort((a, b) => a.id.localeCompare(b.id));
  return project;
}

export async function readJsonLines(path) {
  try {
    const raw = await readFile(path, 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function replayHistory({ eventsPath, projectId, outputPath = null }) {
  const events = await readJsonLines(eventsPath);
  const project = replayEvents(events, { projectId });
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
  return project;
}
