import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpTool } from './types';
import { getListServicesTool } from './tools/listServices';
import { getServicePermissionsTool } from './tools/getServicePermissions';
import { getKesselPermissionTool } from './tools/getKesselPermission';
import { getMigrationExampleTool } from './tools/getMigrationExample';

export async function run() {
  const tools: McpTool[] = [
    getListServicesTool(),
    getServicePermissionsTool(),
    getKesselPermissionTool(),
    getMigrationExampleTool(),
  ];

  let server: McpServer | undefined = undefined;
  let stopping = false;

  async function stopServer() {
    if (stopping) return;
    stopping = true;
    if (server) {
      await server.close();
    }
    process.exit(0);
  }

  try {
    server = new McpServer(
      { name: 'HCC Kessel MCP Server', version: '1.0.0' },
      {
        instructions:
          'You are a Model Context Protocol (MCP) server for migrating HCC frontend applications ' +
          'from RBAC v1 permission checks to Kessel (v2). You provide live permission mappings sourced ' +
          'directly from the rbac-config KSL schemas, code generation for useSelfAccessCheck, and ' +
          'guidance on host-centric permissions. All v2 checks target the default workspace.',
        capabilities: { resources: {}, tools: {} },
      }
    );

    tools.forEach(([name, config, func]) => {
      server?.registerTool(name, config, func);
    });

    process.on('SIGINT', async () => stopServer());

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    throw new Error(
      `Failed to start HCC Kessel MCP server: ${(error as Error).message}`
    );
  }
}
