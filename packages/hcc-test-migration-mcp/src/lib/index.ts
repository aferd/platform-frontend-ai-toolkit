import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpTool } from './types.js';
import { setRepoRoot } from './utils/pathSecurity.js';
import { auditTestCoverageAndRelevanceTool } from './tools/auditTestCoverageAndRelevance.js';
import { analyzeRepoStructureTool } from './tools/analyzeRepoStructure.js';
import { extractTestLogicTool } from './tools/extractTestLogic.js';
import { checkMSWReadinessTool } from './tools/checkMSWReadiness.js';

export async function run() {
  // Initialize repository root (defaults to cwd)
  setRepoRoot(process.cwd());

  const tools: McpTool[] = [
    auditTestCoverageAndRelevanceTool(),
    analyzeRepoStructureTool(),
    extractTestLogicTool(),
    checkMSWReadinessTool(),
  ];

  let server: McpServer | undefined = undefined;

  async function stopServer() {
    if (server) {
      await server.close();
      return process.exit(0);
    }

    throw new Error('HCC Test Migration MCP server is not running');
  }

  try {
    server = new McpServer({
      name: 'hcc-test-migration-mcp',
      version: '0.1.0',
    }, {
      instructions: `You are a Model Context Protocol (MCP) server for test migration.

You provide intelligent test migration capabilities for converting legacy Cypress tests to modern Playwright and Storybook environments.

## Core Capabilities

1. **Test Coverage Auditing**: Analyze whether legacy tests are still relevant to current code
2. **Repository Structure Analysis**: Map components to test coverage and identify gaps
3. **AST-Based Test Extraction**: Parse Cypress tests into structured logic maps
4. **MSW Readiness Detection**: Identify API mocking requirements for Storybook

## Safety Constraints

⚠️ CRITICAL: This server operates under STRICT READ-ONLY mandate for application code.

**Write Access ONLY for:**
- **/tests/** directories
- **/*.test.ts, **/*.test.tsx files
- **/*.stories.tsx files
- Playwright configuration files

**NEVER modify:**
- Application source code
- Non-test files
- Python/IQE tests (.py files, /iqe/ directories)

All file operations are protected by path-jailing and validation.`,
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
    throw new Error(`Failed to start HCC Test Migration MCP server: ${(error as Error).message}`);
  }
}
