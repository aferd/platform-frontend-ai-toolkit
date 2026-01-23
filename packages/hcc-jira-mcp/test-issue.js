#!/usr/bin/env node

/**
 * Test script for JIRA JQL search tool
 *
 * Usage:
 *   JIRA_BASE_URL=https://your-domain.atlassian.net JIRA_API_TOKEN=your-token node test-issue.js "JQL-QUERY"
 *
 * Examples:
 *   # Get a specific issue (shorthand - no quotes needed)
 *   JIRA_BASE_URL=https://issues.redhat.com JIRA_API_TOKEN=your-token node test-issue.js RHCLOUD-12345
 *
 *   # Show me all open issues
 *   JIRA_BASE_URL=https://issues.redhat.com JIRA_API_TOKEN=your-token node test-issue.js "status=Open"
 *
 *   # Show me my open issues
 *   JIRA_BASE_URL=https://issues.redhat.com JIRA_API_TOKEN=your-token node test-issue.js "assignee=currentUser() AND status=Open"
 *
 *   # Issues closed last week by a user
 *   JIRA_BASE_URL=https://issues.redhat.com JIRA_API_TOKEN=your-token node test-issue.js "assignee=jdoe AND status=Closed AND updated >= -7d"
 *
 *   # High priority bugs
 *   JIRA_BASE_URL=https://issues.redhat.com JIRA_API_TOKEN=your-token node test-issue.js "type=Bug AND priority=High"
 */

const { getIssueTool } = require('./dist/lib/tools/getIssue.js');

async function main() {
  // Get JQL query from command line
  const input = process.argv[2];

  if (!input) {
    console.error('Usage: node test-issue.js <JQL-QUERY|ISSUE-KEY>');
    console.error('\nExamples:');
    console.error('\n  Get a specific issue:');
    console.error('    node test-issue.js RHCLOUD-12345');
    console.error('    node test-issue.js "issuekey=RHCLOUD-12345"');
    console.error('\n  Show me all open issues:');
    console.error('    node test-issue.js "status=Open"');
    console.error('    node test-issue.js "assignee=currentUser() AND status=Open"');
    console.error('\n  Find issues closed last week:');
    console.error('    node test-issue.js "status=Closed AND updated >= -7d"');
    console.error('    node test-issue.js "assignee=jdoe AND status=Closed AND updated >= -7d"');
    console.error('\n  High priority bugs:');
    console.error('    node test-issue.js "type=Bug AND priority=High"');
    console.error('\n  Recent issues in a project:');
    console.error('    node test-issue.js "project=RHCLOUD AND created >= -30d"');
    console.error('\nEnvironment variables required:');
    console.error('  JIRA_BASE_URL - Your JIRA instance URL');
    console.error('  JIRA_API_TOKEN - Your JIRA API token');
    process.exit(1);
  }

  // If input doesn't contain '=' or spaces, treat it as an issue key
  const jql = (input.includes('=') || input.includes(' ')) ? input : `issuekey=${input}`;

  // Get credentials from environment
  const baseUrl = process.env.JIRA_BASE_URL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !apiToken) {
    console.error('Error: Missing required environment variables');
    console.error('Please set:');
    console.error('  JIRA_BASE_URL - Your JIRA instance URL (e.g., https://issues.redhat.com)');
    console.error('  JIRA_API_TOKEN - Your JIRA API token');
    process.exit(1);
  }

  console.log(`Testing JIRA JQL search...`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  JQL Query: ${jql}\n`);

  // Create JIRA context (without email!)
  const jiraContext = {
    baseUrl,
    apiToken,
  };

  // Get the tool
  const [toolName, toolConfig, toolFunc] = getIssueTool(jiraContext);

  console.log(`Calling tool: ${toolName}\n`);

  try {
    // Call the tool
    const result = await toolFunc({ jql });

    // Print the result
    if (result.isError) {
      console.error('❌ Error occurred:');
      console.error(result.content[0].text);
      process.exit(1);
    } else {
      console.log('✅ Success!\n');
      console.log(result.content[0].text);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error.message);
    process.exit(1);
  }
}

main();
