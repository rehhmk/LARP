import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson } from './compiler.js';
import { readJsonLines, replayEvents } from './replay.js';

export class BootstrapError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BootstrapError';
    this.code = code;
    this.details = details;
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function seedEntries(ir) {
  return [
    ...ir.scopes.map((scope) => ({ seedId: `scope:${scope.id}`, type: 'scope', value: scope })),
    ...ir.seeds.nodes.map((node) => ({ seedId: node.id, type: 'node', value: node })),
    ...ir.seeds.relations.map((relation) => ({ seedId: relation.id, type: 'relation', value: relation })),
  ].map((entry) => ({ ...entry, fingerprint: sha256(canonicalJson({ type: entry.type, value: entry.value })) }));
}

function deterministicSuffix(projectId, seedId, fingerprint) {
  return sha256(`${projectId}\u0000${seedId}\u0000${fingerprint}`).slice(0, 32);
}

function eventForSeed({ projectId, entry, position }) {
  const suffix = deterministicSuffix(projectId, entry.seedId, entry.fingerprint);
  const eventType = `${entry.type}.seeded`;
  const payloadKey = entry.type;
  return {
    event_id: `event:seed:${suffix}`,
    project_id: projectId,
    event_type: eventType,
    schema_version: 1,
    stream_id: entry.seedId,
    stream_version: 1,
    transaction_id: `tx:seed:${suffix}`,
    transaction_index: 0,
    project_position: position,
    command_id: `bootstrap:${entry.seedId}`,
    causation_ref: `seed:${entry.seedId}`,
    correlation_id: `bootstrap:${projectId}`,
    actor_ref: 'system:bootstrap',
    machine_id: 'seed.bootstrap',
    machine_version: '0.1',
    validation_receipt_ref: `validation:seed:${suffix}`,
    payload: { [payloadKey]: structuredClone(entry.value), seedFingerprint: entry.fingerprint },
  };
}

async function readRegistry(path) {
  const rows = await readJsonLines(path);
  return new Map(rows.map((row) => [row.seedId, row]));
}

export async function bootstrapIr({ ir, projectPath, runtimeDir }) {
  if (!ir?.projectId || ir?.irVersion !== '0.1') throw new BootstrapError('IR_INVALID', 'Expected LARP IR v0.1 with projectId.');

  const runtime = resolve(runtimeDir);
  const eventsPath = resolve(runtime, 'semantic_events.jsonl');
  const transactionsPath = resolve(runtime, 'semantic_transactions.jsonl');
  const validationsPath = resolve(runtime, 'semantic_validation_receipts.jsonl');
  const registryPath = resolve(runtime, 'seed_registry.jsonl');
  await mkdir(runtime, { recursive: true });

  const existingEvents = await readJsonLines(eventsPath);
  const registry = await readRegistry(registryPath);
  const entries = seedEntries(ir);

  // Validate all existing identities before appending anything.
  for (const entry of entries) {
    const prior = registry.get(entry.seedId);
    if (prior && prior.fingerprint !== entry.fingerprint) {
      throw new BootstrapError('SEED_DIVERGENCE', `Seed ${entry.seedId} was already materialized with a different fingerprint.`, {
        seedId: entry.seedId,
        previousFingerprint: prior.fingerprint,
        nextFingerprint: entry.fingerprint,
      });
    }
  }

  const pending = entries.filter((entry) => !registry.has(entry.seedId));
  if (pending.length === 0) {
    const projection = replayEvents(existingEvents, { projectId: ir.projectId });
    await writeFile(projectPath, `${JSON.stringify(projection, null, 2)}\n`, 'utf8');
    return {
      status: 'ALREADY_MATERIALIZED',
      projectId: ir.projectId,
      sourceFingerprint: ir.source.fingerprint,
      appendedEvents: 0,
      projectPosition: projection.projectPosition,
      project: projection,
    };
  }

  const newEvents = [];
  let position = existingEvents.length ? existingEvents.at(-1).project_position : 0;
  for (const entry of pending) {
    position += 1;
    const event = eventForSeed({ projectId: ir.projectId, entry, position });
    const validation = {
      validationReceiptId: event.validation_receipt_ref,
      result: 'ACCEPTED',
      commandType: 'seed.materialize',
      projectId: ir.projectId,
      seedId: entry.seedId,
      seedFingerprint: entry.fingerprint,
      nextProjectPosition: position,
      actor: { kind: 'SYSTEM', id: 'system:bootstrap' },
    };
    const transaction = {
      transactionId: event.transaction_id,
      projectId: ir.projectId,
      commandId: event.command_id,
      status: 'COMMITTED',
      eventCount: 1,
    };
    await appendFile(validationsPath, `${JSON.stringify(validation)}\n`, 'utf8');
    await appendFile(transactionsPath, `${JSON.stringify(transaction)}\n`, 'utf8');
    await appendFile(eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
    await appendFile(registryPath, `${JSON.stringify({ seedId: entry.seedId, fingerprint: entry.fingerprint, eventId: event.event_id })}\n`, 'utf8');
    newEvents.push(event);
  }

  const allEvents = [...existingEvents, ...newEvents];
  const projection = replayEvents(allEvents, { projectId: ir.projectId });
  await writeFile(projectPath, `${JSON.stringify(projection, null, 2)}\n`, 'utf8');

  return {
    status: 'MATERIALIZED',
    projectId: ir.projectId,
    sourceFingerprint: ir.source.fingerprint,
    appendedEvents: newEvents.length,
    projectPosition: projection.projectPosition,
    project: projection,
  };
}

export async function bootstrapFromIrFile({ irPath, projectPath, runtimeDir }) {
  const ir = JSON.parse(await readFile(irPath, 'utf8'));
  return bootstrapIr({ ir, projectPath, runtimeDir });
}
