import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util'

import { CallToolResult, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { McpTool } from "../types";

const readFileAsync = promisify(fs.readFile);

const examples: [string, ...string[]] = [
  'minimalSetup',
  'commonUsage',
  'toolbarExample',
  'filters',
  'table',
  'resizeableColumns',
  'treeTable',
  'loadingState',
  'tableStates'
];

export function getImplementationExampleTool(): McpTool {
  async function tool(args: any): Promise<CallToolResult>  {
    const { exampleName } = args;
    if (!examples.includes(exampleName)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid example name: ${exampleName}. Valid examples are: ${examples.join(', ')}.`
      );
    }

    try {
      const filePath = path.resolve(__dirname, `../examples/${exampleName}.md`);
      const exampleContent = await readFileAsync(filePath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: exampleContent,
          }
        ]
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read implementation example '${exampleName}': ${errorMessage}`
      );
    }
  }
  return [
    "getPatternFlyDataViewExample",
    {
      description: "Get an implementation example of the @patternfly/react-data-view package in a React application. Choose from multiple scenarios including basic usage, advanced features like sorting, filtering, pagination, and selection, and integration with other PatternFly components.",
      inputSchema: {
        exampleName: z.enum(examples).describe(`The name of the @patternfly/react-data-view implementation example to retrieve. Available examples: ${examples.join(', ')}.`),
      },
    },
    tool
  ]
}
