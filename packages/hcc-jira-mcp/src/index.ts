#!/usr/bin/env node

import { run } from './lib/jira-mcp.js';
import { hasCredentials } from './lib/utils/credentialStore.js';
import { runSetup } from './lib/utils/setupPrompts.js';
import prompts from 'prompts';
import logger from './lib/utils/logger.js';

export { run };

// CLI entry point
if (require.main === module) {
  (async () => {
    try {
      // Check for environment variables first (easiest method)
      const hasEnvVars = process.env.JIRA_BASE_URL &&
                         process.env.JIRA_API_TOKEN;

      // Check if credentials are configured via keychain
      const configured = await hasCredentials();

      if (!configured && !hasEnvVars) {
        // No credentials found - need setup
        // Check if running in an interactive terminal (not as MCP server)
        const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

        if (isInteractive) {
          // Interactive terminal - run setup automatically
          logger.log('⚠️  JIRA credentials not configured.\n');

          // Handle prompts cancellation
          prompts.override({ onCancel: () => {
            logger.log('\n❌ Setup cancelled. Run "npx hcc-jira-mcp-setup" to configure later.');
            process.exit(1);
          }});

          const success = await runSetup(true);
          if (!success) {
            logger.error('\n❌ Setup failed. Please try again with "npx hcc-jira-mcp-setup"');
            process.exit(1);
          }

          // Continue to start the server after successful setup
          logger.log('Starting JIRA MCP server...\n');
        } else {
          // Running as MCP server (no TTY) - can't prompt, show error
          logger.error('╔════════════════════════════════════════════════════════════════╗');
          logger.error('║  JIRA MCP Server - Configuration Required                     ║');
          logger.error('╚════════════════════════════════════════════════════════════════╝');
          logger.error('');
          logger.error('JIRA credentials are not configured.');
          logger.error('');
          logger.error('Option 1: Run the setup command (recommended):');
          logger.error('  hcc-jira-mcp-setup');
          logger.error('');
          logger.error('Option 2: Use environment variables when adding MCP server:');
          logger.error('  claude mcp add --transport stdio \\');
          logger.error('    --env JIRA_BASE_URL=https://your-domain.atlassian.net \\');
          logger.error('    --env JIRA_API_TOKEN=your-api-token \\');
          logger.error('    jira -- hcc-jira-mcp');
          logger.error('');
          logger.error('After configuration, restart your MCP client.');
          logger.error('');
          process.exit(1);
        }
      }

      // Start the MCP server
      await run();
    } catch (error) {
      logger.error('Failed to start JIRA MCP server:', (error as Error).message);
      process.exit(1);
    }
  })();
}
