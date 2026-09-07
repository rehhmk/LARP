import { readFile, writeFile } from 'node:fs/promises';
import { applySemanticEvent, emptyProject, finalizeProjection } from './projection.js';

export function replayEvents(events, { projectId = null } = {}) {
  const inferred = projectId ?? events[0]?.project_id;
  if (!inferred) throw new Error('PROJECT_ID_REQUIRED');
  const project = emptyProject(inferred);

  for (const event of events) {
    applySemanticEvent(project, event);
  }

  return finalizeProjection(project);
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
