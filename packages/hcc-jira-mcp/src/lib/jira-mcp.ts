import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpTool, JiraContext } from "./types";
import { getIssueTool } from "./tools/getIssue";
import { getCredentials } from "./utils/credentialStore.js";
import logger from "./utils/logger.js";

export async function run() {
  let server: McpServer | undefined = undefined;

  async function stopServer() {
    if(server) {
      await server.close();
     return  process.exit(0);
    }

    throw new Error("HCC JIRA MCP server is not running");
  }

  try {
    let credentials;

    // Try environment variables first (easier for quick setup)
    const envBaseUrl = process.env.JIRA_BASE_URL;
    const envApiToken = process.env.JIRA_API_TOKEN;

    if (envBaseUrl && envApiToken) {
      // Use environment variables
      credentials = {
        baseUrl: envBaseUrl,
        apiToken: envApiToken,
      };
      logger.log('✓ Using JIRA credentials from environment variables');
    } else {
      // Fall back to keychain (already validated by index.ts)
      credentials = await getCredentials();
      if (!credentials) {
        throw new Error('Failed to load JIRA credentials from keychain.');
      }
      logger.log('✓ Using JIRA credentials from system keychain');
    }

    // Create JIRA context for tools
    const jiraContext: JiraContext = {
      baseUrl: credentials.baseUrl,
      apiToken: credentials.apiToken,
    };

    // Initialize tools with JIRA context
    const tools: McpTool[] = [
      getIssueTool(jiraContext)
    ];

    server = new McpServer({
      name: 'HCC JIRA MCP Server',
      version: '0.1.0',
    }, {
      instructions: `You are a Model Context Protocol (MCP) server for JIRA integration. You provide comprehensive assistance with JIRA operations, including issue management, searching, and project information retrieval.

Connected to JIRA instance: ${credentials.baseUrl}`,
      capabilities: {
        tools: {},
      }
    });

    tools.forEach(([name, config, func]) => {
      server?.registerTool(name, config, func);
    });

    process.on('SIGINT', async () => stopServer());

    const transport = new StdioServerTransport();

    await server.connect(transport);

  } catch (error) {
    logger.error(`Failed to start HCC JIRA MCP server: ${(error as Error).message}`);
    process.exit(1);
  }
}
