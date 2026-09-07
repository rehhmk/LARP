#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyApprovedProposal, GovernanceError } from './governance.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--project') out.project = argv[++i];
    else if (key === '--runtime-dir') out.runtimeDir = argv[++i];
    else if (key === '--proposal') out.proposalId = argv[++i];
    else if (key === '--approval-file') out.approvalFile = argv[++i];
  }
  return out;
}

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectPath = resolve(required(args.project, '--project'));
  const runtimeDir = resolve(required(args.runtimeDir, '--runtime-dir'));
  const proposalId = required(args.proposalId, '--proposal');
  const approvalFile = resolve(required(args.approvalFile, '--approval-file'));
  const approval = JSON.parse(await readFile(approvalFile, 'utf8'));
  const result = await applyApprovedProposal({ projectPath, runtimeDir, proposalId, approval });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const payload = error instanceof GovernanceError
    ? { error: { code: error.code, message: error.message, details: error.details } }
    : { error: { code: 'INTERNAL_ERROR', message: error?.message ?? String(error) } };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
