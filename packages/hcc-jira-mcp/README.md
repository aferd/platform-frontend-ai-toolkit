# HCC JIRA MCP Server

A Model Context Protocol (MCP) server for JIRA integration, providing AI assistants with the ability to interact with JIRA issues, projects, and workflows.

## Features

- 🔐 **Secure Credential Storage**: API tokens are stored in your system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- 🎫 Retrieve JIRA issue details
- 🔍 Search for issues
- ✏️ Create and update issues
- 📊 Manage project information
- 💬 Query issue comments and attachments

## Installation

```bash
npm install @redhat-cloud-services/hcc-jira-mcp
```

## Quick Start

### Option 1: Using Environment Variables (Easiest! ⚡)

The fastest way to get started with Claude Code CLI:

1. **Get your JIRA API token**:
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Give it a label (e.g., "HCC JIRA MCP")
   - Copy the token

2. **Add the MCP server with credentials**:
   ```bash
   claude mcp add --transport stdio \
     --env JIRA_BASE_URL=https://your-domain.atlassian.net \
     --env JIRA_API_TOKEN=your-api-token \
     jira -- hcc-jira-mcp
   ```

3. **Reload VSCode/Claude Code** and start using JIRA immediately!
   - "Get me the details for issue RHCLOUD-12345"
   - "Show me all open issues assigned to me"
   - "Find all high priority bugs closed last week"

**Note**: This method stores credentials in your VSCode settings. For more security, use Option 2 below.

### Option 2: Using Keychain (Most Secure 🔐)

For secure credential storage in your system keychain:

1. **Get your JIRA API token** (see step 1 above)

2. **Run the setup command**:
   ```bash
   hcc-jira-mcp-setup
   ```

   You'll be prompted for:
   - **JIRA Base URL**: Your JIRA instance URL (e.g., `https://your-domain.atlassian.net`)
   - **JIRA API Token**: The token you created in step 1

3. **Add the MCP server** (no credentials needed!):
   ```bash
   claude mcp add --transport stdio jira -- hcc-jira-mcp
   ```

4. **Reload VSCode/Claude Code** and start using JIRA!

### Option 3: Using Traditional MCP Configuration

For Claude Desktop or other MCP clients:

Add this to your MCP settings file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@redhat-cloud-services/hcc-jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Or use keychain (run `hcc-jira-mcp-setup` first) and omit the `env` section.

### How Credentials Are Stored

Your API token is **securely stored** in your system keychain:
- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: Secret Service API / libsecret

**Note**: You never need to put credentials in your MCP configuration!

## Available Tools

### search_jira_issues

Search for JIRA issues using JQL (JIRA Query Language). Can retrieve a single issue by key or search with complex criteria.

**Parameters:**
- `jql` (string): JQL query string
- `maxResults` (number, optional): Maximum number of results to return (default: 50, max: 100)

**Examples:**

**Get a single issue:**
```
User: "Get details for RHCLOUD-12345"
Assistant: *Searches with JQL: issuekey=RHCLOUD-12345*
```

**Search by assignee and status:**
```
User: "Show me all open issues assigned to jdoe"
Assistant: *Searches with JQL: assignee=jdoe AND status=Open*
```

**Search by date range:**
```
User: "Give me all issues assigned to user FooBar which he closed in last week"
Assistant: *Searches with JQL: assignee=FooBar AND status=Closed AND updated >= -7d*
```

**JQL Query Examples:**
- `issuekey=PROJ-123` - Get a specific issue
- `assignee=currentUser() AND status=Open` - My open issues
- `project=MYPROJ AND created >= -30d` - Issues created in last 30 days
- `assignee=jdoe AND status=Closed AND resolved >= -7d` - Closed by user in last week
- `status in (Open, "In Progress") AND priority=High` - High priority active issues

## Use Case: Generating Weekly Team Reports

The JIRA MCP server works seamlessly with the **hcc-frontend-weekly-report** agent to generate comprehensive team reports automatically.

### Prerequisites

1. **Install the HCC Frontend AI Toolkit plugin** (see [main README](../../README.md))
2. **Configure the JIRA MCP server** (see Quick Start section above)
3. **Reload Claude Code/VSCode** to activate the agent and MCP server

### How to Generate a Weekly Report

Once configured, simply ask Claude Code to generate a report:

```
User: "Show me what Platform Framework accomplished this week"
```

Claude Code will:
1. Use the **weekly report agent** to determine the current date and calculate the lookback period to the most recent Wednesday
2. Query JIRA using the **search_jira_issues** tool with the appropriate team criteria and date range
3. Analyze all returned issues and categorize them into:
   - **Outcome, Accomplishments, Celebrations** (incidents, security, quality, sustainability, product work, AI initiatives)
   - **Risks, Blockers, Challenges, Issues** (delivery risks, quality concerns, unexpected interruptions)
   - **Peer Requests** (cross-team dependencies, coordination needs)
   - **Associate Wellness & Development** (arrivals, departures, kudos, morale indicators)
4. Generate a formatted markdown report with summary statistics, JIRA issue links, and actionable insights

### Example Report Request

**Simple request:**
```
User: "Generate weekly report for Platform Framework team"
```

The agent will automatically use the correct team criteria:
- Component: "Console Framework" OR
- Labels: "platform-experience-services"

**Custom team criteria:**
```
User: "Generate weekly report for the API team using component='API Gateway' OR labels=api-backend"
```

### What the Report Includes

- **Summary Statistics**: Total issues closed, breakdown by type
- **Categorized Accomplishments**: Security fixes, quality improvements, product features, infrastructure work
- **Actionable Insights**: Risks, blockers, cross-team dependencies
- **Team Health Indicators**: Recognition opportunities, workload patterns
- **Clickable JIRA Links**: Direct links to referenced issues

### Report Scope

Reports automatically cover from **the most recent Wednesday through today**, regardless of when you run the report. Only includes issues with status:
- "Release pending"
- "Closed"

This ensures the report reflects completed work from the week.

### Tips for Best Results

1. **Run on Monday or Tuesday** for the previous week's summary
2. **Provide specific team criteria** if the default doesn't match your team
3. **Review the generated report** for accuracy before sharing
4. **Use it regularly** to track team progress and identify trends

### Customizing Team Criteria

If you have a different team structure, provide your own JQL criteria:

```
User: "Generate weekly report for teams identified by: project=RHCLOUD AND (labels=my-team OR component='My Component')"
```

The agent will use your criteria combined with the automatic date range calculation.

## Configuration Management

### Reconfigure Credentials

To update your JIRA credentials, run the setup command again:

```bash
npx hcc-jira-mcp-setup
```

It will detect existing configuration and ask if you want to overwrite it.

### Where Are Credentials Stored?

- **API Token**: Stored securely in your system keychain
  - macOS: `Keychain Access.app` → Search for "hcc-jira-mcp"
  - Windows: `Control Panel` → `Credential Manager` → `Windows Credentials`
  - Linux: Uses Secret Service API (GNOME Keyring, KWallet, etc.)

- **Configuration File**: `~/.hcc-jira-mcp/config.json`
  - Contains: JIRA base URL (non-sensitive)
  - Does NOT contain: API token (stored in keychain)

### Remove Credentials

To remove all stored credentials and configuration:

```bash
# Option 1: Run setup and decline to overwrite, then manually remove
rm -rf ~/.hcc-jira-mcp

# Option 2: Remove from keychain manually
# macOS: Open Keychain Access, search "hcc-jira-mcp", delete entry
# Windows: Open Credential Manager, find "hcc-jira-mcp", remove
# Linux: Use your distribution's keyring manager
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
src/
├── index.ts                      # Main MCP server entry point
├── setup.ts                      # Interactive setup CLI
└── lib/
    ├── jira-mcp.ts              # MCP server implementation
    ├── types.ts                 # TypeScript type definitions
    ├── tools/
    │   └── getIssue.ts          # JIRA issue retrieval tool
    └── utils/
        └── credentialStore.ts   # Secure credential storage utilities
```

## Security

- API tokens are **never** stored in plain text
- Credentials are stored using native OS keychain/credential managers
- Configuration file contains only non-sensitive information
- All JIRA API calls use HTTPS

## Troubleshooting

### MCP Server Won't Start - "Configuration Required" Error

**Symptoms**: You see an error message in your MCP client logs about missing JIRA credentials.

**Solution**: Run the setup command to configure your credentials:
```bash
npx hcc-jira-mcp-setup
```

After setup completes, restart your MCP client.

### "Failed to load JIRA credentials" Error

**Cause**: The keychain entry was deleted but the config file still exists.

**Solution**: Run setup again to reconfigure:
```bash
npx hcc-jira-mcp-setup
```

### Connection Issues / API Errors

Verify your JIRA credentials:
1. Check that your JIRA base URL is correct (no trailing slash)
2. Ensure your API token is valid and hasn't been revoked
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Check if your token is still active

### Testing Configuration Interactively

You can test the server interactively in your terminal:

```bash
# This will prompt for setup if needed, then try to start the server
npx hcc-jira-mcp
```

This is useful for:
- Verifying your configuration works
- Testing before adding to your MCP client
- Debugging connection issues

Press Ctrl+C to stop the server when done testing.

## Quick Reference

### MCP Server Setup (One-Time)

```bash
# Install and configure
npm install -g @redhat-cloud-services/hcc-jira-mcp
hcc-jira-mcp-setup

# Add to Claude Code
claude mcp add --transport stdio jira -- hcc-jira-mcp

# Reload VSCode/Claude Code
```

### Weekly Report Generation (Regular Use)

```bash
# In Claude Code chat:
"Show me what Platform Framework accomplished this week"

# With custom team criteria:
"Generate weekly report for teams with component='API Gateway'"
```

### Available Agents

When the **HCC Frontend AI Toolkit** plugin is installed, the following agent is available:

- **hcc-frontend-weekly-report** - Automatically generates weekly reports by:
  - Calculating date ranges (last Wednesday through today)
  - Querying JIRA with team criteria
  - Analyzing and categorizing issues
  - Generating formatted markdown reports

See the [main toolkit README](../../README.md) for agent installation instructions.

## License

Apache-2.0

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.
