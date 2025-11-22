import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUnifiedTools } from './unifiedTools.js';

export const createMcpServer = () => {
  const server = new McpServer({
    name: 'paper-search-mcp-ts',
    version: '0.3.5',
  });
  registerUnifiedTools(server);
  return server;
};
