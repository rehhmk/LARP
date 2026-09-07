#!/usr/bin/env node
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PROJECT_SEED = join(ROOT, 'fixture/project.initial.json');
const POLICY_SEED = join(ROOT, 'fixture/auth-policy.initial.js');
const RUN_DIR = join(ROOT, 'run');
const PROJECT_PATH = join(RUN_DIR, 'project.json');
const RUNTIME_DIR = join(RUN_DIR, '.larp/runtime');
const POLICY_PATH = join(ROOT, 'work/auth-policy.js');

await rm(RUN_DIR, { recursive: true, force: true });
await mkdir(RUNTIME_DIR, { recursive: true });
await cp(PROJECT_SEED, PROJECT_PATH);
await cp(POLICY_SEED, POLICY_PATH);

const project = JSON.parse(await readFile(PROJECT_PATH, 'utf8'));
console.log(JSON.stringify({
  status: 'RESET',
  projectId: project.projectId,
  projectPosition: project.projectPosition,
  decisionAuthVersion: project.nodes?.['decision:auth']?.version ?? null,
  projectPath: PROJECT_PATH,
  runtimeDir: RUNTIME_DIR,
  workPath: POLICY_PATH,
}, null, 2));
