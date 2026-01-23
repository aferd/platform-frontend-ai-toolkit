import prompts from 'prompts';
import { storeCredentials, getCredentials, deleteCredentials, hasCredentials } from './credentialStore.js';
import logger from './logger.js';

export async function runSetup(isFirstRun: boolean = false): Promise<boolean> {
  if (isFirstRun) {
    logger.log('\n🔧 JIRA MCP Server - First Time Setup\n');
    logger.log('Welcome! Let\'s configure your JIRA connection.\n');
  } else {
    logger.log('\n🔧 HCC JIRA MCP Setup\n');
  }

  // Check if credentials already exist
  const hasExisting = await hasCredentials();
  if (hasExisting && !isFirstRun) {
    const existing = await getCredentials();
    logger.log('⚠️  Existing configuration found:');
    logger.log(`   JIRA URL: ${existing?.baseUrl}\n`);

    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Do you want to overwrite the existing configuration?',
      initial: false,
    });

    if (!overwrite) {
      logger.log('\n✅ Setup cancelled. Existing configuration preserved.');
      return false;
    }

    // Delete existing credentials
    await deleteCredentials();
    logger.log('\n🗑️  Existing configuration removed.\n');
  }

  // Prompt for JIRA credentials
  const responses = await prompts([
    {
      type: 'text',
      name: 'baseUrl',
      message: 'JIRA Base URL (e.g., https://your-domain.atlassian.net):',
      validate: (value) => {
        if (!value) return 'JIRA URL is required';
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
    {
      type: 'password',
      name: 'apiToken',
      message: 'JIRA API Token:',
      validate: (value) => {
        if (!value) return 'API Token is required';
        return true;
      },
    },
  ]);

  // Check if user cancelled
  if (!responses.baseUrl || !responses.apiToken) {
    logger.log('\n❌ Setup cancelled.');
    return false;
  }

  try {
    // Store credentials
    await storeCredentials({
      baseUrl: responses.baseUrl.trim(),
      apiToken: responses.apiToken,
    });

    logger.log('\n✅ Configuration saved successfully!');
    logger.log('\n📝 Your JIRA API token has been securely stored in your system keychain.');
    logger.log('   - macOS: Keychain Access');
    logger.log('   - Windows: Credential Manager');
    logger.log('   - Linux: Secret Service API / libsecret\n');

    if (isFirstRun) {
      logger.log('🚀 Setup complete! The MCP server will now start...\n');
    } else {
      logger.log('You can now use the HCC JIRA MCP server with your AI assistant.\n');
    }

    return true;
  } catch (error) {
    logger.error('\n❌ Failed to save configuration:', (error as Error).message);
    return false;
  }
}
