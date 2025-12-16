import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpTool } from "./types";
import { getDescriptionTool } from "./tools/description.js";
import { getImplementationExampleTool } from "./tools/implementationExample";
import { getAvailableModulesTool } from "./tools/getAvailableModules";
import { getComponentSourceCode } from "./tools/getComponentSourceCode";
import { getReactUtilityClasses } from "./tools/getReactUtilityClasses";

export async function run() {
  const tools: McpTool[] = [
    getDescriptionTool(),
    getImplementationExampleTool(),
    getAvailableModulesTool(),
    getComponentSourceCode(),
    getReactUtilityClasses()
  ]
  let server: McpServer | undefined = undefined;

  async function stopServer() {
    if(server) {
      await server.close();
     return  process.exit(0);
    }

    throw new Error("HCC PatternFly MCP server is not running");
  }


  try {
    server = new McpServer({
      name: 'HCC PatternFly MCP Server',
      version: '1.0.0',
    }, {
      instructions: 'You are a Model Context Protocol (MCP) server for all PatternFly packages and components. You provide comprehensive assistance with PatternFly development, including component documentation, implementation examples, source code access, module discovery, and CSS utility integration. You support all PatternFly packages: react-core, react-icons, react-table, react-data-view, react-component-groups, and react-styles.',
      capabilities: {
        resources: {},
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
    throw new Error(`Failed to start HCC PatternFly MCP server: ${(error as Error).message}`);
  }
}
