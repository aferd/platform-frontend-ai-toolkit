import { run } from './jira-mcp';
import { getCredentials } from './utils/credentialStore.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import logger from './utils/logger.js';

// Mock dependencies
jest.mock('./utils/credentialStore.js');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('./utils/logger.js');

describe('jira-mcp server', () => {
  let mockServer: jest.Mocked<McpServer>;
  let mockTransport: jest.Mocked<StdioServerTransport>;
  let originalEnv: NodeJS.ProcessEnv;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original environment
    originalEnv = { ...process.env };

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exited with code ${code}`);
    });

    // Create mock server instance
    mockServer = {
      registerTool: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock transport
    mockTransport = {} as any;

    // Mock constructors
    (McpServer as jest.Mock).mockReturnValue(mockServer);
    (StdioServerTransport as jest.Mock).mockReturnValue(mockTransport);
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    processExitSpy.mockRestore();
  });

  describe('initialization with environment variables', () => {
    it('should start server with environment variables', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(McpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'HCC JIRA MCP Server',
          version: '0.1.0',
        }),
        expect.objectContaining({
          instructions: expect.stringContaining('https://issues.redhat.com'),
          capabilities: { tools: {} },
        })
      );

      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(logger.log).toHaveBeenCalledWith(
        '✓ Using JIRA credentials from environment variables'
      );
    });

    it('should register search_jira_issues tool', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'search_jira_issues',
        expect.objectContaining({
          description: expect.stringContaining('JQL'),
        }),
        expect.any(Function)
      );
    });

    it('should connect server to stdio transport', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });
  });

  describe('initialization with keychain credentials', () => {
    it('should start server with keychain credentials', async () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;

      (getCredentials as jest.Mock).mockResolvedValue({
        baseUrl: 'https://issues.redhat.com',
        apiToken: 'keychain-token',
      });

      await run();

      expect(getCredentials).toHaveBeenCalled();
      expect(McpServer).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        '✓ Using JIRA credentials from system keychain'
      );
    });

    it('should fail if keychain credentials are missing', async () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;

      (getCredentials as jest.Mock).mockResolvedValue(null);

      await expect(run()).rejects.toThrow('Process exited with code 1');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load JIRA credentials from keychain')
      );
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 when credentials are missing', async () => {
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;
      (getCredentials as jest.Mock).mockResolvedValue(null);

      await expect(run()).rejects.toThrow('Process exited with code 1');
    });

    it('should handle server initialization errors', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      (McpServer as jest.Mock).mockImplementation(() => {
        throw new Error('Server init failed');
      });

      await expect(run()).rejects.toThrow('Process exited with code 1');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Server init failed')
      );
    });

    it('should handle transport connection errors', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockServer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(run()).rejects.toThrow('Process exited with code 1');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed')
      );
    });
  });

  describe('environment variable precedence', () => {
    it('should prefer environment variables over keychain', async () => {
      process.env.JIRA_BASE_URL = 'https://env.example.com';
      process.env.JIRA_API_TOKEN = 'env-token';

      (getCredentials as jest.Mock).mockResolvedValue({
        baseUrl: 'https://keychain.example.com',
        apiToken: 'keychain-token',
      });

      await run();

      expect(getCredentials).not.toHaveBeenCalled();
      expect(McpServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          instructions: expect.stringContaining('https://env.example.com'),
        })
      );
    });

    it('should require both environment variables to be set', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      delete process.env.JIRA_API_TOKEN;

      (getCredentials as jest.Mock).mockResolvedValue({
        baseUrl: 'https://keychain.example.com',
        apiToken: 'keychain-token',
      });

      await run();

      // Should fall back to keychain when only one env var is set
      expect(getCredentials).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        '✓ Using JIRA credentials from system keychain'
      );
    });
  });

  describe('server metadata', () => {
    it('should set correct server name and version', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(McpServer).toHaveBeenCalledWith(
        {
          name: 'HCC JIRA MCP Server',
          version: '0.1.0',
        },
        expect.any(Object)
      );
    });

    it('should include JIRA instance URL in instructions', async () => {
      process.env.JIRA_BASE_URL = 'https://custom-jira.example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(McpServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          instructions: expect.stringContaining('https://custom-jira.example.com'),
        })
      );
    });

    it('should declare tools capability', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      await run();

      expect(McpServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          capabilities: { tools: {} },
        })
      );
    });
  });

  describe('SIGINT handling', () => {
    it('should register SIGINT handler', async () => {
      process.env.JIRA_BASE_URL = 'https://issues.redhat.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      const processOnSpy = jest.spyOn(process, 'on');

      await run();

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      processOnSpy.mockRestore();
    });
  });
});
