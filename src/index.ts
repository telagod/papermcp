#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBuiltInAdapters } from './platforms/index.js';
import { loadPluginAdapters } from './plugins/index.js';
import { createMcpServer } from './server/mcpServer.js';
import { logger } from './utils/logger.js';

const start = async () => {
  await registerBuiltInAdapters();
  await loadPluginAdapters();
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('papermcp 已启动');
};

start().catch(error => {
  logger.error({ err: error }, 'MCP 服务器启动失败');
  process.exitCode = 1;
});
