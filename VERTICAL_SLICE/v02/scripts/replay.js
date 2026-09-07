#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../src/compiler.js';
import { logicalProjection } from '../src/projection.js';
import { replayHistory } from '../src/replay.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const [eventsArg = 'run/.larp/runtime/semantic_events.jsonl', outputArg = 'run/replayed.project.json', liveArg = 'run/project.json'] = process.argv.slice(2);
const outputPath = resolve(outputArg);
const replayed = await replayHistory({ eventsPath: resolve(eventsArg), projectId: 'v02-demo', outputPath });
const live = JSON.parse(await readFile(resolve(liveArg), 'utf8'));
assert.deepEqual(logicalProjection(replayed), logicalProjection(live));
const logicalFingerprint = createHash('sha256').update(canonicalJson(logicalProjection(replayed))).digest('hex');

console.log(JSON.stringify({
  status: 'REPLAY_MATCH',
  projectId: replayed.projectId,
  projectPosition: replayed.projectPosition,
  logicalFingerprint,
  outputPath,
  root: ROOT,
}, null, 2));
