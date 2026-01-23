import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type McpTool = [string, { description: string; inputSchema: any }, (args: any) => Promise<CallToolResult>];

export interface JiraContext {
  baseUrl: string;
  apiToken: string;
}

export interface JiraConfig {
  baseUrl?: string;
  apiToken?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    reporter?: {
      displayName: string;
    };
    created: string;
    updated: string;
  };
}
