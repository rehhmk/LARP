#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { LarpAdapterRuntime, LarpAdapterError, TOOL_DEFINITIONS } from './runtime.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project') out.project = argv[++i];
    else if (arg === '--runtime-dir') out.runtimeDir = argv[++i];
    else if (arg === '--coverage') out.coverage = Number(argv[++i]);
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
const projectPath = resolve(opts.project ?? 'examples/project.json');
const runtimeDir = resolve(opts.runtimeDir ?? '.larp/runtime');
const runtime = new LarpAdapterRuntime({ projectPath, runtimeDir, coverage: Number.isFinite(opts.coverage) ? opts.coverage : 76 });

let initialized = false;
let clientMeta = { clientName: 'unknown', clientVersion: null };

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function success(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function rpcError(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } });
}

async function handle(message) {
  const id = Object.prototype.hasOwnProperty.call(message, 'id') ? message.id : undefined;
  const method = message?.method;

  if (message?.jsonrpc !== '2.0' || typeof method !== 'string') {
    if (id !== undefined) rpcError(id, -32600, 'Invalid Request');
    return;
  }

  try {
    if (method === 'initialize') {
      const requested = message.params?.protocolVersion;
      clientMeta = {
        clientName: message.params?.clientInfo?.name ?? 'unknown',
        clientVersion: message.params?.clientInfo?.version ?? null,
      };
      initialized = true;
      const supported = new Set(['2025-11-25', '2025-06-18']);
      const protocolVersion = supported.has(requested) ? requested : '2025-11-25';
      success(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'larp-a01-adapter', version: '0.1.0' },
      });
      return;
    }

    if (method === 'notifications/initialized') {
      initialized = true;
      return;
    }

    // Current MCP v2 clients probe modern stdio first; explicit method-not-found lets them fall back to legacy.
    if (method === 'server/discover') {
      rpcError(id, -32601, 'Method not found');
      return;
    }

    if (method === 'ping') {
      success(id, {});
      return;
    }

    if (!initialized) {
      rpcError(id, -32002, 'Server not initialized');
      return;
    }

    if (method === 'tools/list') {
      success(id, { tools: TOOL_DEFINITIONS });
      return;
    }

    if (method === 'tools/call') {
      const name = message.params?.name;
      const args = message.params?.arguments ?? {};
      if (typeof name !== 'string') {
        rpcError(id, -32602, 'Invalid params', { code: 'TOOL_NAME_REQUIRED' });
        return;
      }
      try {
        const result = await runtime.callTool(name, args, clientMeta);
        success(id, result);
      } catch (error) {
        if (error instanceof LarpAdapterError) {
          success(id, {
            content: [{ type: 'text', text: `${error.code}: ${error.message}` }],
            structuredContent: { error: { code: error.code, message: error.message, details: error.details } },
            isError: true,
          });
          return;
        }
        throw error;
      }
      return;
    }

    rpcError(id, -32601, 'Method not found');
  } catch (error) {
    console.error(error?.stack ?? String(error));
    if (id !== undefined) rpcError(id, -32603, 'Internal error');
  }
}

console.error(`LARP A-01 MCP adapter listening on stdio; project=${projectPath}`);
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    rpcError(null, -32700, 'Parse error');
    return;
  }
  void handle(message);
});
