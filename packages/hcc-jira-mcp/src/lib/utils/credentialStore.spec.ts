// Mock dependencies BEFORE importing the module
jest.mock('keytar');
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn().mockReturnValue('/mock/home'),
}));

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as keytar from 'keytar';
import {
  storeCredentials,
  getCredentials,
  deleteCredentials,
  hasCredentials,
  JiraCredentials,
} from './credentialStore';

describe('credentialStore', () => {
  const mockHomeDir = '/mock/home';
  const mockConfigDir = path.join(mockHomeDir, '.hcc-jira-mcp');
  const mockConfigFile = path.join(mockConfigDir, 'config.json');

  const mockCredentials: JiraCredentials = {
    baseUrl: 'https://issues.redhat.com',
    apiToken: 'test-api-token-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (os.homedir as jest.Mock).mockReturnValue(mockHomeDir);
  });

  describe('storeCredentials', () => {
    it('should create config directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);

      await storeCredentials(mockCredentials);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
    });

    it('should not create config directory if it already exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);

      await storeCredentials(mockCredentials);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should write base URL to config file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);

      await storeCredentials(mockCredentials);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigFile,
        JSON.stringify({ baseUrl: mockCredentials.baseUrl }, null, 2)
      );
    });

    it('should store API token in keychain', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);

      await storeCredentials(mockCredentials);

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'hcc-jira-mcp',
        'jira-api-token',
        mockCredentials.apiToken
      );
    });

    it('should throw error if keychain storage fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (keytar.setPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(storeCredentials(mockCredentials)).rejects.toThrow(
        'Failed to store credentials: Keychain error'
      );
    });

    it('should throw error if file write fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File write error');
      });

      await expect(storeCredentials(mockCredentials)).rejects.toThrow(
        'Failed to store credentials: File write error'
      );
    });
  });

  describe('getCredentials', () => {
    it('should return null if config file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await getCredentials();

      expect(result).toBeNull();
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(keytar.getPassword).not.toHaveBeenCalled();
    });

    it('should read base URL from config file', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(mockCredentials.apiToken);

      await getCredentials();

      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigFile, 'utf-8');
    });

    it('should retrieve API token from keychain', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(mockCredentials.apiToken);

      await getCredentials();

      expect(keytar.getPassword).toHaveBeenCalledWith('hcc-jira-mcp', 'jira-api-token');
    });

    it('should return credentials when both config and token exist', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(mockCredentials.apiToken);

      const result = await getCredentials();

      expect(result).toEqual(mockCredentials);
    });

    it('should return null if API token is not in keychain', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(null);

      const result = await getCredentials();

      expect(result).toBeNull();
    });

    it('should throw error if config file is corrupted', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      await expect(getCredentials()).rejects.toThrow('Failed to retrieve credentials');
    });

    it('should throw error if keychain retrieval fails', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(getCredentials()).rejects.toThrow(
        'Failed to retrieve credentials: Keychain error'
      );
    });
  });

  describe('deleteCredentials', () => {
    it('should delete API token from keychain', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await deleteCredentials();

      expect(keytar.deletePassword).toHaveBeenCalledWith('hcc-jira-mcp', 'jira-api-token');
    });

    it('should delete config file if it exists', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await deleteCredentials();

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockConfigFile);
    });

    it('should not delete config file if it does not exist', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // config file
        .mockReturnValueOnce(false); // config dir

      await deleteCredentials();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should remove config directory if empty', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // config file exists
        .mockReturnValueOnce(true); // config dir exists
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await deleteCredentials();

      expect(fs.rmdirSync).toHaveBeenCalledWith(mockConfigDir);
    });

    it('should not remove config directory if not empty', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // config file exists
        .mockReturnValueOnce(true); // config dir exists
      (fs.readdirSync as jest.Mock).mockReturnValue(['other-file.txt']);

      await deleteCredentials();

      expect(fs.rmdirSync).not.toHaveBeenCalled();
    });

    it('should throw error if keychain deletion fails', async () => {
      (keytar.deletePassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(deleteCredentials()).rejects.toThrow(
        'Failed to delete credentials: Keychain error'
      );
    });

    it('should throw error if file deletion fails', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('File deletion error');
      });

      await expect(deleteCredentials()).rejects.toThrow(
        'Failed to delete credentials: File deletion error'
      );
    });
  });

  describe('hasCredentials', () => {
    it('should return true when credentials exist', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(mockCredentials.apiToken);

      const result = await hasCredentials();

      expect(result).toBe(true);
    });

    it('should return false when credentials do not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await hasCredentials();

      expect(result).toBe(false);
    });

    it('should return false when API token is missing', async () => {
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(null);

      const result = await hasCredentials();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = await hasCredentials();

      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete store-retrieve-delete cycle', async () => {
      // Store
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
      await storeCredentials(mockCredentials);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(keytar.setPassword).toHaveBeenCalled();

      // Retrieve
      jest.clearAllMocks();
      const mockConfig = { baseUrl: mockCredentials.baseUrl };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      (keytar.getPassword as jest.Mock).mockResolvedValue(mockCredentials.apiToken);

      const retrieved = await getCredentials();
      expect(retrieved).toEqual(mockCredentials);

      // Delete
      jest.clearAllMocks();
      (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      (fs.rmdirSync as jest.Mock).mockReturnValue(undefined);

      await deleteCredentials();
      expect(keytar.deletePassword).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
