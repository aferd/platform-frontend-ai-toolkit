import { z } from "zod";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { McpTool, JiraContext } from "../types";

const SearchIssuesSchema = z.object({
  jql: z.string().describe("JQL (JIRA Query Language) query string. Examples: 'assignee=currentUser() AND status=Open', 'project=MYPROJ AND created >= -7d', 'issuekey=PROJ-123'"),
  maxResults: z.number().optional().describe("Maximum number of results to return (default: 50, max: 100)")
});

export function getIssueTool(context: JiraContext): McpTool {
  return [
    "search_jira_issues",
    {
      description: "Search for JIRA issues using JQL (JIRA Query Language). Can retrieve a single issue by key or search with complex criteria like assignee, status, date ranges, etc.",
      inputSchema: SearchIssuesSchema
    },
    async (args) => {
      try {
        const { jql, maxResults = 50 } = args as z.infer<typeof SearchIssuesSchema>;

        // Limit maxResults to 100
        const limit = Math.min(maxResults, 100);

        // Fetch issues from JIRA API
        const url = `${context.baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`;
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${context.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to search JIRA issues: ${response.status} ${response.statusText}\n${errorText}`
          );
        }

        const searchResult = await response.json() as any;

        // Search endpoint returns { issues: [...], total: number }
        if (!searchResult.issues || searchResult.issues.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  jql,
                  total: 0,
                  issues: []
                }, null, 2)
              }
            ]
          };
        }

        // Return the raw response data as JSON for chaining with other tools
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                jql,
                total: searchResult.total || 0,
                maxResults: limit,
                issues: searchResult.issues
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error searching JIRA issues: ${(error as Error).message}`
        );
      }
    }
  ];
}
