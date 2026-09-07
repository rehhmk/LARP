import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson, irFingerprint, semanticFingerprint } from './compiler.js';
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
    ...ir.seeds.nodes.map((node) => ({ seedId: `node:${node.id}`, type: 'node', value: node })),
    ...ir.seeds.relations.map((relation) => ({ seedId: `relation:${relation.id}`, type: 'relation', value: relation })),
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
    stream_id: entry.value.id,
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

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new BootstrapError('IR_INVALID', `${label} must be an array.`);
}

export function validateBootstrapIr(ir) {
  if (!ir || typeof ir !== 'object' || Array.isArray(ir)) throw new BootstrapError('IR_INVALID', 'Expected a LARP IR object.');
  if (ir.irVersion !== '0.1' || ir.languageVersion !== '0.1' || typeof ir.projectId !== 'string' || !ir.projectId) {
    throw new BootstrapError('IR_INVALID', 'Expected LARP IR v0.1 with projectId.');
  }
  requireArray(ir.scopes, 'scopes');
  requireArray(ir.seeds?.nodes, 'seeds.nodes');
  requireArray(ir.seeds?.relations, 'seeds.relations');
  if (typeof ir.module !== 'string' || !ir.module) throw new BootstrapError('IR_INVALID', 'IR module is missing.');
  if (!/^[a-f0-9]{64}$/.test(ir.source?.fingerprint ?? '')) throw new BootstrapError('IR_INVALID', 'IR source fingerprint is missing or invalid.');
  const expectedSemantic = semanticFingerprint(ir);
  if (ir.semanticFingerprint !== expectedSemantic) {
    throw new BootstrapError('IR_SEMANTIC_FINGERPRINT_INVALID', 'IR semantic fingerprint does not match its semantic payload.', {
      expected: expectedSemantic,
      actual: ir.semanticFingerprint ?? null,
    });
  }
  const expectedIr = irFingerprint(ir);
  if (ir.irFingerprint !== expectedIr) {
    throw new BootstrapError('IR_FINGERPRINT_INVALID', 'IR fingerprint does not match its payload.', {
      expected: expectedIr,
      actual: ir.irFingerprint ?? null,
    });
  }
  const entries = seedEntries(ir);
  if (new Set(entries.map(({ seedId }) => seedId)).size !== entries.length) {
    throw new BootstrapError('IR_INVALID', 'IR contains duplicate typed seed identities.');
  }
  const scopeIds = new Set();
  for (const scope of ir.scopes) {
    if (typeof scope?.id !== 'string' || !scope.id || scope.version !== 1 || scopeIds.has(scope.id)) {
      throw new BootstrapError('IR_INVALID', 'IR contains an invalid or duplicate scope seed.');
    }
    scopeIds.add(scope.id);
  }
  if (!scopeIds.has('root')) throw new BootstrapError('IR_INVALID', 'IR must contain the root scope.');
  for (const scope of ir.scopes) {
    if (scope.parentId != null && !scopeIds.has(scope.parentId)) throw new BootstrapError('IR_INVALID', `Scope ${scope.id} has an invalid parent.`);
  }
  for (const scope of ir.scopes) {
    const seen = new Set();
    let cursor = scope.id;
    while (cursor != null) {
      if (seen.has(cursor)) throw new BootstrapError('IR_INVALID', `Scope ${scope.id} has a cyclic parent chain.`);
      seen.add(cursor);
      cursor = ir.scopes.find(({ id }) => id === cursor)?.parentId ?? null;
    }
  }
  const nodeIds = new Set();
  for (const node of ir.seeds.nodes) {
    if (typeof node?.id !== 'string' || !node.id || typeof node.kind !== 'string' || node.version !== 1 || nodeIds.has(node.id) || !scopeIds.has(node.scopeId)) {
      throw new BootstrapError('IR_INVALID', 'IR contains an invalid or duplicate node seed.');
    }
    nodeIds.add(node.id);
  }
  const relationIds = new Set();
  for (const relation of ir.seeds.relations) {
    if (typeof relation?.id !== 'string' || !relation.id || relation.version !== 1 || relationIds.has(relation.id)
      || !scopeIds.has(relation.scopeId) || !nodeIds.has(relation.source) || !nodeIds.has(relation.target)) {
      throw new BootstrapError('IR_INVALID', 'IR contains an invalid or duplicate relation seed.');
    }
    relationIds.add(relation.id);
  }
  return entries;
}

async function readRegistry(path) {
  const rows = await readJsonLines(path);
  if (new Set(rows.map(({ seedId }) => seedId)).size !== rows.length) {
    throw new BootstrapError('SEED_HISTORY_INVALID', 'Seed registry contains duplicate identities.');
  }
  return new Map(rows.map((row) => [row.seedId, row]));
}

export async function bootstrapIr({ ir, projectPath, runtimeDir }) {
  const entries = validateBootstrapIr(ir);

  const runtime = resolve(runtimeDir);
  const eventsPath = resolve(runtime, 'semantic_events.jsonl');
  const transactionsPath = resolve(runtime, 'seed_transactions.jsonl');
  const validationsPath = resolve(runtime, 'seed_validation_receipts.jsonl');
  const registryPath = resolve(runtime, 'seed_registry.jsonl');
  await mkdir(runtime, { recursive: true });

  const existingEvents = await readJsonLines(eventsPath);
  const registry = await readRegistry(registryPath);
  if (existingEvents.some((event) => event.project_id !== ir.projectId)) {
    throw new BootstrapError('PROJECT_MISMATCH', 'Semantic history belongs to a different project.');
  }
  if (existingEvents.length > 0) replayEvents(existingEvents, { projectId: ir.projectId });

  for (const [seedId, prior] of registry) {
    const event = existingEvents.find(({ event_id: eventId }) => eventId === prior.eventId);
    if (!event) throw new BootstrapError('SEED_HISTORY_INVALID', `Registry entry ${seedId} has no accepted seed event.`);
  }
  for (const event of existingEvents.filter(({ event_type: type }) => type?.endsWith('.seeded'))) {
    if (![...registry.values()].some(({ eventId }) => eventId === event.event_id)) {
      throw new BootstrapError('SEED_HISTORY_INVALID', `Accepted seed event ${event.event_id} has no registry entry.`);
    }
  }

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
    return {
      status: 'ALREADY_MATERIALIZED',
      projectId: ir.projectId,
      sourceFingerprint: ir.source.fingerprint,
      irFingerprint: ir.irFingerprint,
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
    irFingerprint: ir.irFingerprint,
    appendedEvents: newEvents.length,
    projectPosition: projection.projectPosition,
    project: projection,
  };
}

export async function bootstrapFromIrFile({ irPath, projectPath, runtimeDir }) {
  const ir = JSON.parse(await readFile(irPath, 'utf8'));
  return bootstrapIr({ ir, projectPath, runtimeDir });
}
