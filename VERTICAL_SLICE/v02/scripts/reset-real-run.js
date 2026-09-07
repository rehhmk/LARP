import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileFile } from '../src/compiler.js';
import { bootstrapIr } from '../src/bootstrap.js';

const root = resolve(import.meta.dirname, '..');
const runDir = resolve(root, 'run');
const runtimeDir = resolve(runDir, '.larp/runtime');
const sourcePath = resolve(root, 'program/auth.larp');
const irPath = resolve(runDir, 'program.ir.json');
const projectPath = resolve(runDir, 'project.json');
const workPath = resolve(root, 'work/auth-policy.js');
const initialWorkPath = resolve(root, 'fixture/auth-policy.initial.js');

await rm(runDir, { recursive: true, force: true });
await mkdir(runtimeDir, { recursive: true });
await cp(initialWorkPath, workPath);

const ir = await compileFile(sourcePath);
await writeFile(irPath, `${JSON.stringify(ir, null, 2)}\n`, 'utf8');
const bootstrap = await bootstrapIr({ ir, projectPath, runtimeDir });
const project = JSON.parse(await readFile(projectPath, 'utf8'));

console.log(JSON.stringify({
  status: 'RESET',
  projectId: project.projectId,
  projectPosition: project.projectPosition,
  decisionAuthVersion: project.nodes['decision:auth']?.version,
  sourcePath,
  sourceFingerprint: ir.source.fingerprint,
  irPath,
  projectPath,
  runtimeDir,
  workPath,
  bootstrapStatus: bootstrap.status,
  bootstrapEvents: bootstrap.appendedEvents,
}, null, 2));
