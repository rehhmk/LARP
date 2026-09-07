import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileContext, verifyContext, ContextCompilerError } from './context-compiler.js';

export class LarpAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'LarpAdapterError';
    this.code = code;
    this.details = details;
  }
}

export function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

export async function readProject(projectPath) {
  const raw = await readFile(projectPath, 'utf8');
  const project = JSON.parse(raw);
  if (!project?.projectId || !project?.nodes || !Array.isArray(project?.relations) || !project?.scopes) {
    throw new LarpAdapterError('PROJECT_SHAPE_INVALID', 'Project file must contain projectId, nodes, relations and scopes.');
  }
  return { project, raw, fileHash: sha256Text(raw) };
}

function toolResult(data, { isError = false } = {}) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    ...(isError ? { isError: true } : {}),
  };
}

function requireString(args, key) {
  if (typeof args?.[key] !== 'string' || args[key].trim() === '') {
    throw new LarpAdapterError('INVALID_ARGUMENT', `${key} must be a non-empty string.`);
  }
  return args[key];
}

export class LarpAdapterRuntime {
  constructor({ projectPath, runtimeDir, coverage = 76, adapterVersion = '0.1.0' }) {
    this.projectPath = resolve(projectPath);
    this.runtimeDir = resolve(runtimeDir);
    this.coverage = coverage;
    this.adapterVersion = adapterVersion;
    this.bundleCache = new Map();
  }

  async status() {
    const { project, fileHash } = await readProject(this.projectPath);
    const taskCounts = {};
    for (const node of Object.values(project.nodes)) {
      if (node.kind !== 'Task') continue;
      const state = node.lifecycle ?? 'UNKNOWN';
      taskCounts[state] = (taskCounts[state] ?? 0) + 1;
    }
    return toolResult({
      adapterVersion: this.adapterVersion,
      projectId: project.projectId,
      projectPosition: project.projectPosition ?? 0,
      projectFileHash: fileHash,
      verifiedCoverage: this.coverage,
      semanticMutationAllowed: false,
      taskCounts,
    });
  }

  async getContext(args) {
    const taskId = requireString(args, 'taskId');
    const scopeId = requireString(args, 'scopeId');
    const agentId = typeof args.agentId === 'string' && args.agentId ? args.agentId : null;
    const { project } = await readProject(this.projectPath);
    try {
      const bundle = compileContext({ project, taskId, agentId, scopeId });
      this.bundleCache.set(bundle.bundleFingerprint, bundle);
      return toolResult({
        freshness: 'CURRENT',
        bundle,
        receipt: {
          taskId,
          agentId,
          scopeId,
          sourceProjectPosition: bundle.sourceProjectPosition,
          bundleFingerprint: bundle.bundleFingerprint,
          inputFingerprint: bundle.inputFingerprint,
        },
      });
    } catch (error) {
      if (error instanceof ContextCompilerError) {
        throw new LarpAdapterError(error.code, error.message, error.details);
      }
      throw error;
    }
  }

  async verifyContextTool(args) {
    const fingerprint = typeof args?.bundleFingerprint === 'string' ? args.bundleFingerprint : null;
    const bundle = args?.bundle ?? (fingerprint ? this.bundleCache.get(fingerprint) : null);
    if (!bundle) {
      throw new LarpAdapterError(
        'CONTEXT_BUNDLE_NOT_FOUND',
        'Provide bundle or a bundleFingerprint previously issued by this adapter process.',
      );
    }
    const { project } = await readProject(this.projectPath);
    try {
      const verification = verifyContext(bundle, project);
      return toolResult({
        bundleFingerprint: bundle.bundleFingerprint,
        ...verification,
      });
    } catch (error) {
      if (error instanceof ContextCompilerError) {
        throw new LarpAdapterError(error.code, error.message, error.details);
      }
      throw error;
    }
  }

  async propose(args, meta = {}) {
    const commandType = requireString(args, 'commandType');
    const targetId = requireString(args, 'targetId');
    if (args.payload === undefined || args.payload === null || Array.isArray(args.payload) || typeof args.payload !== 'object') {
      throw new LarpAdapterError('INVALID_ARGUMENT', 'payload must be a JSON object.');
    }

    const { project, fileHash } = await readProject(this.projectPath);
    const receipt = {
      proposalId: `proposal:${randomUUID()}`,
      projectId: project.projectId,
      projectPositionObserved: project.projectPosition ?? 0,
      projectFileHashObserved: fileHash,
      commandType,
      targetId,
      payload: args.payload,
      expectedStreamVersion: Number.isInteger(args.expectedStreamVersion) ? args.expectedStreamVersion : null,
      reason: typeof args.reason === 'string' ? args.reason : null,
      actor: {
        kind: 'MCP_CLIENT',
        name: meta.clientName ?? 'unknown',
        version: meta.clientVersion ?? null,
      },
      status: 'PROPOSED',
      semanticMutationApplied: false,
      governanceRequired: true,
    };

    const journalPath = resolve(this.runtimeDir, 'proposals.jsonl');
    await mkdir(dirname(journalPath), { recursive: true });
    await appendFile(journalPath, `${JSON.stringify(receipt)}\n`, 'utf8');

    return toolResult(receipt);
  }

  async callTool(name, args, meta = {}) {
    switch (name) {
      case 'larp_status': return this.status();
      case 'larp_get_context': return this.getContext(args ?? {});
      case 'larp_verify_context': return this.verifyContextTool(args ?? {});
      case 'larp_propose': return this.propose(args ?? {}, meta);
      default: throw new LarpAdapterError('TOOL_NOT_FOUND', `Unknown tool: ${name}`);
    }
  }
}

export const TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'larp_status',
    description: 'Read current LARP project status. This tool never mutates semantic state.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'larp_get_context',
    description: 'Compile a task-specific governed ContextBundle for an agent and scope.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', minLength: 1 },
        agentId: { type: 'string', minLength: 1 },
        scopeId: { type: 'string', minLength: 1 },
      },
      required: ['taskId', 'scopeId'],
      additionalProperties: false,
    },
  },
  {
    name: 'larp_verify_context',
    description: 'Verify whether an issued ContextBundle is CURRENT, STALE_NON_BLOCKING, or STALE_BLOCKING.',
    inputSchema: {
      type: 'object',
      properties: {
        bundleFingerprint: { type: 'string', minLength: 1 },
        bundle: { type: 'object' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'larp_propose',
    description: 'Record a proposed semantic command in the runtime journal. This does NOT apply semantic mutation or bypass LARP governance.',
    inputSchema: {
      type: 'object',
      properties: {
        commandType: { type: 'string', minLength: 1 },
        targetId: { type: 'string', minLength: 1 },
        payload: { type: 'object' },
        expectedStreamVersion: { type: 'integer', minimum: 0 },
        reason: { type: 'string' },
      },
      required: ['commandType', 'targetId', 'payload'],
      additionalProperties: false,
    },
  },
]);
