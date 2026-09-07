import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileFile, canonicalJson, sha256 } from '../src/compiler.js';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error('usage: node scripts/compile.js <source.larp> <output.json>');
  process.exit(2);
}

const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const ir = await compileFile(sourcePath);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(ir, null, 2)}\n`, 'utf8');
const semanticFingerprint = sha256(canonicalJson({
  irVersion: ir.irVersion,
  languageVersion: ir.languageVersion,
  module: ir.module,
  projectId: ir.projectId,
  scopes: ir.scopes,
  seeds: ir.seeds,
}));
console.log(JSON.stringify({
  status: 'COMPILED',
  sourcePath,
  outputPath,
  projectId: ir.projectId,
  sourceFingerprint: ir.source.fingerprint,
  semanticFingerprint,
}, null, 2));
