import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bootstrapFromIrFile } from '../src/bootstrap.js';

const [irArg, projectArg, runtimeArg] = process.argv.slice(2);
if (!irArg || !projectArg || !runtimeArg) {
  console.error('usage: node scripts/bootstrap.js <program.ir.json> <project.json> <runtime-dir>');
  process.exit(2);
}

try {
  const result = await bootstrapFromIrFile({
    irPath: resolve(irArg),
    projectPath: resolve(projectArg),
    runtimeDir: resolve(runtimeArg),
  });
  console.log(JSON.stringify({
    status: result.status,
    projectId: result.projectId,
    sourceFingerprint: result.sourceFingerprint,
    appendedEvents: result.appendedEvents,
    projectPosition: result.projectPosition,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: 'REJECTED',
    code: error?.code ?? 'BOOTSTRAP_ERROR',
    message: error?.message ?? String(error),
    details: error?.details ?? {},
  }, null, 2));
  process.exit(1);
}
