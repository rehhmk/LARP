import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export class CompileError extends Error {
  constructor(code, message, line = null) {
    super(message);
    this.name = 'CompileError';
    this.code = code;
    this.line = line;
  }
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseQuoted(raw, line) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    throw new CompileError('STRING_EXPECTED', `Expected quoted string, got: ${raw}`, line);
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new CompileError('STRING_INVALID', `Invalid quoted string: ${raw}`, line);
  }
}

function parseValue(raw, line) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"')) return parseQuoted(trimmed, line);
  if (trimmed.startsWith('[')) {
    try {
      const value = JSON.parse(trimmed);
      if (!Array.isArray(value)) throw new Error();
      return value;
    } catch {
      throw new CompileError('ARRAY_INVALID', `Invalid JSON-like array: ${raw}`, line);
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  throw new CompileError('VALUE_INVALID', `Unsupported value: ${raw}`, line);
}

function parseHeaderTokens(line, lineNumber) {
  const tokens = line.trim().split(/\s+/);
  const attrs = {};
  for (let i = 4; i < tokens.length; i += 2) {
    if (tokens[i + 1] === undefined) {
      throw new CompileError('HEADER_INVALID', `Expected key/value pair in: ${line}`, lineNumber);
    }
    attrs[tokens[i]] = tokens[i + 1];
  }
  return { tokens, attrs };
}

export function compileSource(source, { sourcePath = '<memory>' } = {}) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const meaningful = lines
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter(({ text }) => text && !text.startsWith('#'));

  let cursor = 0;
  const next = () => meaningful[cursor++];

  const lang = next();
  if (!lang || !/^larp\s+"0\.1"$/.test(lang.text)) {
    throw new CompileError('LANGUAGE_HEADER_REQUIRED', 'First declaration must be: larp "0.1"', lang?.line ?? 1);
  }

  const moduleDecl = next();
  if (!moduleDecl || !/^module\s+[A-Za-z0-9_.-]+$/.test(moduleDecl.text)) {
    throw new CompileError('MODULE_REQUIRED', 'Second declaration must define a module.', moduleDecl?.line ?? null);
  }
  const moduleName = moduleDecl.text.slice('module '.length);

  const projectDecl = next();
  if (!projectDecl || !projectDecl.text.startsWith('project ')) {
    throw new CompileError('PROJECT_REQUIRED', 'Third declaration must define project.', projectDecl?.line ?? null);
  }
  const projectId = parseQuoted(projectDecl.text.slice('project '.length), projectDecl.line);

  const scopes = [];
  const nodes = [];
  const relations = [];
  const seenIds = new Set();

  while (cursor < meaningful.length) {
    const item = next();
    if (item.text.startsWith('scope ')) {
      const match = item.text.match(/^scope\s+([^\s]+)(?:\s+parent\s+([^\s]+))?$/);
      if (!match) throw new CompileError('SCOPE_INVALID', `Invalid scope declaration: ${item.text}`, item.line);
      const [, id, parentId = null] = match;
      if (seenIds.has(`scope:${id}`)) throw new CompileError('DUPLICATE_ID', `Duplicate scope ${id}`, item.line);
      seenIds.add(`scope:${id}`);
      scopes.push({ id, parentId, version: 1, data: {} });
      continue;
    }

    if (item.text.startsWith('seed node ')) {
      const { tokens, attrs } = parseHeaderTokens(item.text, item.line);
      if (tokens.length < 8 || tokens[0] !== 'seed' || tokens[1] !== 'node') {
        throw new CompileError('NODE_SEED_INVALID', `Invalid node seed: ${item.text}`, item.line);
      }
      const id = tokens[2];
      if (tokens[3] !== 'kind' || !attrs.scope) {
        throw new CompileError('NODE_SEED_INVALID', `Node seed requires kind and scope: ${item.text}`, item.line);
      }
      const kind = tokens[4];
      const scopeIndex = tokens.indexOf('scope');
      const scopeId = tokens[scopeIndex + 1];
      const lifecycleIndex = tokens.indexOf('lifecycle');
      const lifecycle = lifecycleIndex >= 0 ? tokens[lifecycleIndex + 1] : null;
      if (seenIds.has(id)) throw new CompileError('DUPLICATE_ID', `Duplicate seed id ${id}`, item.line);
      seenIds.add(id);

      const data = {};
      let ended = false;
      while (cursor < meaningful.length) {
        const prop = next();
        if (prop.text === 'end') {
          ended = true;
          break;
        }
        const propertyMatch = prop.text.match(/^([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/);
        if (!propertyMatch) throw new CompileError('NODE_PROPERTY_INVALID', `Invalid node property: ${prop.text}`, prop.line);
        data[propertyMatch[1]] = parseValue(propertyMatch[2], prop.line);
      }
      if (!ended) throw new CompileError('NODE_END_REQUIRED', `Node ${id} is missing end`, item.line);
      nodes.push({ id, kind, scopeId, lifecycle, version: 1, current: true, invalid: false, data });
      continue;
    }

    if (item.text.startsWith('seed relation ')) {
      const match = item.text.match(/^seed\s+relation\s+([^\s]+)\s+kind\s+([^\s]+)\s+source\s+([^\s]+)\s+target\s+([^\s]+)\s+scope\s+([^\s]+)$/);
      if (!match) throw new CompileError('RELATION_SEED_INVALID', `Invalid relation seed: ${item.text}`, item.line);
      const [, id, kind, source, target, scopeId] = match;
      if (seenIds.has(id)) throw new CompileError('DUPLICATE_ID', `Duplicate seed id ${id}`, item.line);
      seenIds.add(id);
      relations.push({ id, kind, source, target, scopeId, active: true, version: 1, data: {} });
      continue;
    }

    throw new CompileError('DECLARATION_UNKNOWN', `Unknown declaration: ${item.text}`, item.line);
  }

  if (!scopes.some((scope) => scope.id === 'root')) {
    throw new CompileError('ROOT_SCOPE_REQUIRED', 'A root scope is required.');
  }

  const scopeIds = new Set(scopes.map(({ id }) => id));
  for (const scope of scopes) {
    if (scope.parentId && !scopeIds.has(scope.parentId)) throw new CompileError('REFERENCE_INVALID', `Scope ${scope.id} parent ${scope.parentId} does not exist.`);
  }
  for (const node of nodes) {
    if (!scopeIds.has(node.scopeId)) throw new CompileError('REFERENCE_INVALID', `Node ${node.id} scope ${node.scopeId} does not exist.`);
  }
  const nodeIds = new Set(nodes.map(({ id }) => id));
  for (const relation of relations) {
    if (!scopeIds.has(relation.scopeId) || !nodeIds.has(relation.source) || !nodeIds.has(relation.target)) {
      throw new CompileError('REFERENCE_INVALID', `Relation ${relation.id} has an invalid reference.`);
    }
  }

  const semanticProgram = {
    irVersion: '0.1',
    languageVersion: '0.1',
    module: moduleName,
    projectId,
    scopes: scopes.sort((a, b) => a.id.localeCompare(b.id)),
    seeds: {
      nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
      relations: relations.sort((a, b) => a.id.localeCompare(b.id)),
    },
  };
  const sourceFingerprint = sha256(canonicalJson(semanticProgram));
  return {
    ...semanticProgram,
    source: { path: sourcePath, fingerprint: sourceFingerprint },
  };
}

export async function compileFile(path) {
  return compileSource(await readFile(path, 'utf8'), { sourcePath: path });
}
