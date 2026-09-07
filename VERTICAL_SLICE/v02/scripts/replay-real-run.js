import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson, sha256 } from '../src/compiler.js';
import { replayHistory } from '../src/replay.js';

const root = resolve(import.meta.dirname, '..');
const runDir = resolve(root, 'run');
const runtimeDir = resolve(runDir, '.larp/runtime');
const projectPath = resolve(runDir, 'project.json');
const replayPath = resolve(runDir, 'replayed-project.json');
const eventsPath = resolve(runtimeDir, 'semantic_events.jsonl');

await mkdir(runDir, { recursive: true });
const current = JSON.parse(await readFile(projectPath, 'utf8'));
const replayed = await replayHistory({ eventsPath, projectId: current.projectId, outputPath: replayPath });
const currentHash = sha256(canonicalJson(current));
const replayHash = sha256(canonicalJson(replayed));
const sameProjection = currentHash === replayHash;

console.log(JSON.stringify({
  status: sameProjection ? 'REPLAY_MATCH' : 'REPLAY_MISMATCH',
  projectId: current.projectId,
  projectPosition: current.projectPosition,
  currentHash,
  replayHash,
  sameProjection,
  replayPath,
}, null, 2));

if (!sameProjection) process.exitCode = 1;
