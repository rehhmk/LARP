#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapIr } from '../src/bootstrap.js';
import { emitIrFile } from '../src/compiler.js';
import { compileContext, verifyContext } from '../../../ADAPTER/src/context-compiler.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function argsFrom(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--') || !argv[index + 1]) throw new Error(`Invalid argument: ${key}`);
    args[key.slice(2)] = argv[++index];
  }
  return args;
}

function safeResetDirectory(path) {
  const resolved = resolve(path);
  if (!isAbsolute(resolved) || resolved === '/' || resolved === ROOT || dirname(resolved) === resolved) {
    throw new Error(`Refusing unsafe reset target: ${resolved}`);
  }
  return resolved;
}

const args = argsFrom(process.argv.slice(2));
const sourcePath = resolve(args.source ?? resolve(ROOT, 'source/project.larp'));
const irPath = resolve(args.ir ?? resolve(ROOT, 'emitted/project.ir.json'));
const runDir = safeResetDirectory(args['run-dir'] ?? resolve(ROOT, 'run'));
const projectPath = resolve(runDir, 'project.json');
const runtimeDir = resolve(runDir, '.larp/runtime');
const policyFixture = resolve(ROOT, 'fixture/auth-policy.initial.js');
const workPath = resolve(args.work ?? resolve(ROOT, 'work/auth-policy.js'));
const recordedSourcePath = relative(ROOT, sourcePath).replaceAll('\\', '/');

await rm(runDir, { recursive: true, force: true });
await mkdir(runtimeDir, { recursive: true });
const ir = await emitIrFile({ sourcePath, outputPath: irPath, recordedSourcePath });
const bootstrap = await bootstrapIr({ ir, projectPath, runtimeDir });
const bundle = compileContext({
  project: bootstrap.project,
  taskId: 'task:implement-auth',
  agentId: 'agent:coding',
  scopeId: 'backend',
});
const verification = verifyContext(bundle, bootstrap.project);
const contextBundlePath = resolve(runDir, 'context-bundle.json');
const contextVerificationPath = resolve(runDir, 'context-verification.json');
await writeFile(contextBundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
await writeFile(contextVerificationPath, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
await mkdir(dirname(workPath), { recursive: true });
await cp(policyFixture, workPath);

console.log(JSON.stringify({
  status: 'RESET_FROM_LARP',
  sourcePath,
  sourceFingerprint: ir.source.fingerprint,
  semanticFingerprint: ir.semanticFingerprint,
  irPath,
  irFingerprint: ir.irFingerprint,
  bootstrapStatus: bootstrap.status,
  bootstrapEventCount: bootstrap.appendedEvents,
  projectId: bootstrap.projectId,
  projectPosition: bootstrap.projectPosition,
  projectPath,
  runtimeDir,
  contextBundlePath,
  contextBundleFingerprint: bundle.bundleFingerprint,
  contextVerificationPath,
  contextFreshness: verification.freshness,
  workPath,
}, null, 2));
