import * as keytar from 'keytar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SERVICE_NAME = 'hcc-jira-mcp';
const ACCOUNT_NAME = 'jira-api-token';
const CONFIG_DIR = path.join(os.homedir(), '.hcc-jira-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface JiraCredentials {
  baseUrl: string;
  apiToken: string;
}

export interface JiraConfig {
  baseUrl: string;
}

/**
 * Store JIRA credentials securely
 * - API token is stored in system keychain
 * - Base URL is stored in a config file
 */
export async function storeCredentials(credentials: JiraCredentials): Promise<void> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Store non-sensitive config in file
    const config: JiraConfig = {
      baseUrl: credentials.baseUrl,
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    // Store API token in system keychain
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, credentials.apiToken);
  } catch (error) {
    throw new Error(`Failed to store credentials: ${(error as Error).message}`);
  }
}

/**
 * Retrieve JIRA credentials
 * - Reads base URL from config file
 * - Retrieves API token from system keychain
 */
export async function getCredentials(): Promise<JiraCredentials | null> {
  try {
    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    // Read config file
    const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config: JiraConfig = JSON.parse(configData);

    // Retrieve API token from keychain
    const apiToken = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

    if (!apiToken) {
      return null;
    }

    return {
      baseUrl: config.baseUrl,
      apiToken,
    };
  } catch (error) {
    throw new Error(`Failed to retrieve credentials: ${(error as Error).message}`);
  }
}

/**
 * Delete stored credentials
 */
export async function deleteCredentials(): Promise<void> {
  try {
    // Delete API token from keychain
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);

    // Delete config file
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }

    // Remove config directory if empty
    if (fs.existsSync(CONFIG_DIR) && fs.readdirSync(CONFIG_DIR).length === 0) {
      fs.rmdirSync(CONFIG_DIR);
    }
  } catch (error) {
    throw new Error(`Failed to delete credentials: ${(error as Error).message}`);
  }
}

/**
 * Check if credentials are configured
 */
export async function hasCredentials(): Promise<boolean> {
  try {
    const credentials = await getCredentials();
    return credentials !== null;
  } catch (error) {
    return false;
  }
}
