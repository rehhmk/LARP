#!/usr/bin/env node
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagnosticFor, emitIrFile } from '../src/compiler.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const [sourceArg = 'source/project.larp', outputArg = 'emitted/project.ir.json'] = process.argv.slice(2);
const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const recordedSourcePath = relative(ROOT, sourcePath).replaceAll('\\', '/');

try {
  const ir = await emitIrFile({ sourcePath, outputPath, recordedSourcePath });
  console.log(JSON.stringify({
    status: 'COMPILED',
    sourcePath: recordedSourcePath,
    outputPath,
    sourceFingerprint: ir.source.fingerprint,
    semanticFingerprint: ir.semanticFingerprint,
    irFingerprint: ir.irFingerprint,
    diagnostics: [],
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: 'COMPILE_FAILED',
    sourcePath: recordedSourcePath,
    outputPath,
    outputWritten: false,
    diagnostics: [diagnosticFor(error)],
  }, null, 2));
  process.exitCode = 1;
}
