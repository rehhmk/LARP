import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export class LineMcpClient {
  constructor({ command, args, cwd }) {
    this.proc = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutLines = [];
    this.stderrLines = [];

    const out = createInterface({ input: this.proc.stdout, crlfDelay: Infinity });
    out.on('line', (line) => {
      this.stdoutLines.push(line);
      let msg;
      try { msg = JSON.parse(line); }
      catch (error) {
        for (const { reject } of this.pending.values()) reject(new Error(`Non-JSON stdout: ${line}`));
        this.pending.clear();
        return;
      }
      if (Object.prototype.hasOwnProperty.call(msg, 'id') && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(Object.assign(new Error(msg.error.message), { rpcError: msg.error }));
        else resolve(msg.result);
      }
    });

    const err = createInterface({ input: this.proc.stderr, crlfDelay: Infinity });
    err.on('line', (line) => this.stderrLines.push(line));
  }

  request(method, params = {}) {
    const id = this.nextId++;
    const message = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for ${method}`));
      }, 3000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
      this.proc.stdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  notify(method, params = {}) {
    this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  async initialize(clientInfo = { name: 'test-coding-agent-host', version: '0.1' }) {
    const result = await this.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo,
    });
    this.notify('notifications/initialized');
    return result;
  }

  callTool(name, args = {}) {
    return this.request('tools/call', { name, arguments: args });
  }

  async close() {
    this.proc.stdin.end();
    if (this.proc.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.proc.kill('SIGTERM');
          resolve();
        }, 500);
        this.proc.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
  }
}
