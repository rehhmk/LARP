import { resolve } from 'node:path';
import { LineMcpClient } from '../test/mcp-client.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const client = new LineMcpClient({
  command: process.execPath,
  args: [resolve(root, 'src/server.js'), '--project', resolve(root, 'examples/project.json'), '--runtime-dir', resolve(root, '.larp/runtime')],
  cwd: root,
});

try {
  const init = await client.initialize({ name: 'manual-smoke-host', version: '0.1' });
  const tools = await client.request('tools/list');
  const status = await client.callTool('larp_status');
  const context = await client.callTool('larp_get_context', {
    taskId: 'task:implement-auth', agentId: 'agent:coding', scopeId: 'backend',
  });
  const verify = await client.callTool('larp_verify_context', {
    bundleFingerprint: context.structuredContent.bundle.bundleFingerprint,
  });
  process.stderr.write(`${JSON.stringify({ init, tools: tools.tools.map((t) => t.name), status: status.structuredContent, verify: verify.structuredContent }, null, 2)}\n`);
} finally {
  await client.close();
}
