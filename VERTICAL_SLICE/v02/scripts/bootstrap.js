#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapFromIrFile } from '../src/bootstrap.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const [irArg = 'emitted/project.ir.json', projectArg = 'run/project.json', runtimeArg = 'run/.larp/runtime'] = process.argv.slice(2);

try {
  const result = await bootstrapFromIrFile({
    irPath: resolve(irArg),
    projectPath: resolve(projectArg),
    runtimeDir: resolve(runtimeArg),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: 'BOOTSTRAP_FAILED',
    code: error?.code ?? 'BOOTSTRAP_INTERNAL',
    message: error?.message ?? String(error),
    details: error?.details ?? {},
    root: ROOT,
  }, null, 2));
  process.exitCode = 1;
}
