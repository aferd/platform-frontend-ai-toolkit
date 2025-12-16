import { createMockError } from '../../__tests__/testUtils';

/**
 * Test suite for verifyLocalPackage utility
 * Tests complex package verification with dependency mocking
 */

// Mock dependencies
const mockResolveModule = jest.fn();
const mockReadJsonFile = jest.fn();
const mockPathDirname = jest.fn();

jest.mock('../moduleResolver', () => ({
  resolveModule: mockResolveModule
}));

jest.mock('../readFile', () => ({
  readJsonFile: mockReadJsonFile
}));

jest.mock('path', () => ({
  default: {
    dirname: mockPathDirname
  },
  dirname: mockPathDirname
}));

// Import after mocking
let verifyLocalPackage: typeof import('../verifyLocalPackage').verifyLocalPackage;

beforeAll(async () => {
  const module = await import('../verifyLocalPackage');
  verifyLocalPackage = module.verifyLocalPackage;
});

describe('verifyLocalPackage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.cwd for each test
    jest.spyOn(process, 'cwd').mockReturnValue('/default/working/dir');

    // Setup path.dirname to extract directory from file path
    mockPathDirname.mockImplementation((filePath: string) => {
      // Remove file:// protocol if present, then get dirname
      const cleanPath = filePath.replace(/^file:\/\//, '');
      const lastSlashIndex = cleanPath.lastIndexOf('/');
      return lastSlashIndex >= 0 ? cleanPath.substring(0, lastSlashIndex) : cleanPath;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful package verification', () => {
    // Data-driven tests for successful package verification
    const successfulVerificationTestCases = [
      {
        description: 'should verify existing package and return correct status',
        packageName: 'existing-package',
        mockPackageJson: { version: '1.2.3' },
        mockResolvedPath: 'file:///path/to/node_modules/existing-package/package.json',
        expectedPackageRoot: '/path/to/node_modules/existing-package',
        expectedVersion: '1.2.3',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/existing-package/package.json'
      },
      {
        description: 'should handle scoped package names',
        packageName: '@scope/scoped-package',
        mockPackageJson: { version: '2.0.0-beta.1' },
        mockResolvedPath: 'file:///path/to/node_modules/@scope/scoped-package/package.json',
        expectedPackageRoot: '/path/to/node_modules/@scope/scoped-package',
        expectedVersion: '2.0.0-beta.1',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/@scope/scoped-package/package.json'
      },
      {
        description: 'should use provided nodeModulesRootPath when specified',
        packageName: 'test-package',
        mockPackageJson: { version: '3.1.4' },
        mockResolvedPath: 'file:///custom/node_modules/test-package/package.json',
        expectedPackageRoot: '/custom/node_modules/test-package',
        expectedVersion: '3.1.4',
        customNodeModulesPath: '/custom/node_modules',
        expectedResolveCall: '/custom/node_modules/test-package/package.json'
      },
      {
        description: 'should handle package.json without version field',
        packageName: 'no-version-package',
        mockPackageJson: { name: 'no-version-package' },
        mockResolvedPath: 'file:///path/to/node_modules/no-version-package/package.json',
        expectedPackageRoot: '/path/to/node_modules/no-version-package',
        expectedVersion: '',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/no-version-package/package.json'
      },
      {
        description: 'should handle file:// protocol in resolved paths',
        packageName: 'file-protocol-package',
        mockPackageJson: { version: '4.0.0' },
        mockResolvedPath: 'file:///some/path/to/node_modules/file-protocol-package/package.json',
        expectedPackageRoot: '/some/path/to/node_modules/file-protocol-package',
        expectedVersion: '4.0.0',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/file-protocol-package/package.json'
      },
      {
        description: 'should handle complex version strings',
        packageName: 'complex-version',
        mockPackageJson: { version: '1.0.0-alpha.1+build.123' },
        mockResolvedPath: 'file:///path/to/node_modules/complex-version/package.json',
        expectedPackageRoot: '/path/to/node_modules/complex-version',
        expectedVersion: '1.0.0-alpha.1+build.123',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/complex-version/package.json'
      },
      {
        description: 'should handle package names with special characters',
        packageName: '@my-org/package-with-dashes_and_underscores.and.dots',
        mockPackageJson: { version: '1.0.0' },
        mockResolvedPath: 'file:///node_modules/@my-org/package-with-dashes_and_underscores.and.dots/package.json',
        expectedPackageRoot: '/node_modules/@my-org/package-with-dashes_and_underscores.and.dots',
        expectedVersion: '1.0.0',
        customNodeModulesPath: undefined,
        expectedResolveCall: '/default/working/dir/node_modules/@my-org/package-with-dashes_and_underscores.and.dots/package.json'
      }
    ];

    test.each(successfulVerificationTestCases)(
      '$description',
      async ({ packageName, mockPackageJson, mockResolvedPath, expectedPackageRoot, expectedVersion, customNodeModulesPath, expectedResolveCall }) => {
        mockResolveModule.mockReturnValue(mockResolvedPath);
        mockReadJsonFile.mockResolvedValue(mockPackageJson);

        const result = await verifyLocalPackage(packageName, customNodeModulesPath);

        expect(mockResolveModule).toHaveBeenCalledWith(expectedResolveCall);
        expect(mockReadJsonFile).toHaveBeenCalledWith(mockResolvedPath.replace(/^file:\/\//, ''));
        expect(result).toEqual({
          exists: true,
          version: expectedVersion,
          packageRoot: expectedPackageRoot
        });
      }
    );

  });

  describe('input validation', () => {
    const invalidInputTestCases = [
      {
        description: 'should return error for empty package name',
        packageName: '',
        expectedErrorMessage: 'Invalid package name: '
      },
      {
        description: 'should return error for null package name',
        packageName: null,
        expectedErrorMessage: 'Invalid package name: null'
      },
      {
        description: 'should return error for undefined package name',
        packageName: undefined,
        expectedErrorMessage: 'Invalid package name: undefined'
      },
      {
        description: 'should return error for non-string package name',
        packageName: 123,
        expectedErrorMessage: 'Invalid package name: 123'
      }
    ];

    test.each(invalidInputTestCases)(
      '$description',
      async ({ packageName, expectedErrorMessage }) => {
        const result = await verifyLocalPackage(packageName as any);

        expect(result).toEqual({
          exists: false,
          version: '',
          packageRoot: '',
          error: new Error(expectedErrorMessage)
        });
        expect(mockResolveModule).not.toHaveBeenCalled();
        expect(mockReadJsonFile).not.toHaveBeenCalled();
      }
    );

  });

  describe('error handling', () => {
    const errorHandlingTestCases = [
      {
        description: 'should handle module resolution errors',
        packageName: 'non-existent-package',
        setupError: () => {
          const resolutionError = new Error('Module not found');
          mockResolveModule.mockImplementation(() => {
            throw resolutionError;
          });
          return resolutionError;
        },
        mockResolvedPath: undefined,
        expectedErrorMessage: 'Error resolving package "non-existent-package": Module not found',
        shouldCallReadJsonFile: false
      },
      {
        description: 'should handle file read errors',
        packageName: 'package-with-read-error',
        setupError: () => {
          const fileError = createMockError.fileSystem('ENOENT', 'no such file or directory');
          mockReadJsonFile.mockRejectedValue(fileError);
          return fileError;
        },
        mockResolvedPath: 'file:///path/to/node_modules/package-with-read-error/package.json',
        expectedErrorMessage: 'Error resolving package "package-with-read-error": ENOENT: no such file or directory',
        shouldCallReadJsonFile: true
      },
      {
        description: 'should handle permission errors',
        packageName: 'restricted-package',
        setupError: () => {
          const permissionError = createMockError.fileSystem('EACCES', 'permission denied');
          mockReadJsonFile.mockRejectedValue(permissionError);
          return permissionError;
        },
        mockResolvedPath: 'file:///path/to/restricted/package.json',
        expectedErrorMessage: 'Error resolving package "restricted-package": EACCES: permission denied',
        shouldCallReadJsonFile: true
      },
      {
        description: 'should handle JSON parsing errors',
        packageName: 'invalid-json-package',
        setupError: () => {
          const jsonError = new SyntaxError('Unexpected token in JSON');
          mockReadJsonFile.mockRejectedValue(jsonError);
          return jsonError;
        },
        mockResolvedPath: 'file:///path/to/node_modules/invalid-json-package/package.json',
        expectedErrorMessage: 'Error resolving package "invalid-json-package": Unexpected token in JSON',
        shouldCallReadJsonFile: true
      },
      {
        description: 'should handle non-Error thrown values',
        packageName: 'strange-error-package',
        setupError: () => {
          const strangeError = 'This is a string error';
          mockReadJsonFile.mockRejectedValue(strangeError);
          return strangeError;
        },
        mockResolvedPath: 'file:///path/to/node_modules/strange-error-package/package.json',
        expectedErrorMessage: 'Error resolving package "strange-error-package": This is a string error',
        shouldCallReadJsonFile: true
      },
      {
        description: 'should handle null/undefined errors gracefully',
        packageName: 'null-error-package',
        setupError: () => {
          mockReadJsonFile.mockRejectedValue(null);
          return null;
        },
        mockResolvedPath: 'file:///path/to/node_modules/null-error-package/package.json',
        expectedErrorMessage: 'Error resolving package "null-error-package": null',
        shouldCallReadJsonFile: true
      }
    ];

    test.each(errorHandlingTestCases)(
      '$description',
      async ({ packageName, setupError, mockResolvedPath, expectedErrorMessage, shouldCallReadJsonFile }) => {
        if (mockResolvedPath) {
          mockResolveModule.mockReturnValue(mockResolvedPath);
        }

        setupError();

        const result = await verifyLocalPackage(packageName);

        expect(result).toEqual({
          exists: false,
          version: '',
          packageRoot: '',
          error: new Error(expectedErrorMessage)
        });

        if (shouldCallReadJsonFile) {
          expect(mockReadJsonFile).toHaveBeenCalled();
        } else {
          expect(mockReadJsonFile).not.toHaveBeenCalled();
        }
      }
    );
  });

  describe('path handling', () => {
    it('should construct correct path for default node_modules', async () => {
      const packageName = 'test-package';

      jest.spyOn(process, 'cwd').mockReturnValue('/custom/working/directory');

      const result = await verifyLocalPackage(packageName);

      expect(mockResolveModule).toHaveBeenCalledWith('/custom/working/directory/node_modules/test-package/package.json');
    });

    it('should use provided nodeModulesRootPath directly when specified', async () => {
      const packageName = 'test-package';
      const customPath = '/totally/different/path';

      const result = await verifyLocalPackage(packageName, customPath);

      expect(mockResolveModule).toHaveBeenCalledWith('/totally/different/path/test-package/package.json');
    });

    it('should handle nodeModulesRootPath with trailing slash', async () => {
      const packageName = 'test-package';
      const customPath = '/path/with/trailing/slash/';

      const result = await verifyLocalPackage(packageName, customPath);

      expect(mockResolveModule).toHaveBeenCalledWith('/path/with/trailing/slash//test-package/package.json');
    });

    it('should handle complex nested scoped packages', async () => {
      const packageName = '@very/deeply/@nested/scoped-package';
      const mockPackageJson = { version: '1.0.0' };
      const mockResolvedPath = 'file:///node_modules/@very/deeply/@nested/scoped-package/package.json';

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(packageName);

      expect(mockResolveModule).toHaveBeenCalledWith('/default/working/dir/node_modules/@very/deeply/@nested/scoped-package/package.json');
      expect(result.exists).toBe(true);
    });

    it('should properly extract packageRoot from deeply nested paths', async () => {
      const packageName = 'deep-package';
      const mockPackageJson = { version: '1.0.0' };
      const mockResolvedPath = 'file:///very/deep/nested/path/to/node_modules/deep-package/package.json';
      const expectedPackageRoot = '/very/deep/nested/path/to/node_modules/deep-package';

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(packageName);

      expect(result.packageRoot).toBe(expectedPackageRoot);
    });
  });

  describe('edge cases', () => {
    it('should handle packages with no package.json version but other fields', async () => {
      const packageName = 'package-without-version';
      const mockPackageJson = {
        name: 'package-without-version',
        description: 'A package without version',
        main: 'index.js',
        dependencies: {}
      };
      const mockResolvedPath = 'file:///node_modules/package-without-version/package.json';

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(packageName);

      expect(result.exists).toBe(true);
      expect(result.version).toBe('');
    });

    it('should handle package.json with null version', async () => {
      const packageName = 'null-version-package';
      const mockPackageJson = { version: null };
      const mockResolvedPath = 'file:///node_modules/null-version-package/package.json';

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(packageName);

      expect(result.exists).toBe(true);
      expect(result.version).toBe('');
    });

    it('should handle package.json with undefined version', async () => {
      const packageName = 'undefined-version-package';
      const mockPackageJson = { version: undefined };
      const mockResolvedPath = 'file:///node_modules/undefined-version-package/package.json';

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(packageName);

      expect(result.exists).toBe(true);
      expect(result.version).toBe('');
    });

    it('should handle very long package names', async () => {
      const longPackageName = '@scope/' + 'very-long-package-name-'.repeat(10) + 'end';
      const mockPackageJson = { version: '1.0.0' };
      const mockResolvedPath = `file:///node_modules/${longPackageName}/package.json`;

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(longPackageName);

      expect(result.exists).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should handle packages with unicode characters in names', async () => {
      const unicodePackageName = '@unicode/pæckage-with-ünicøde';
      const mockPackageJson = { version: '2.1.0' };
      const mockResolvedPath = `file:///node_modules/${unicodePackageName}/package.json`;

      mockResolveModule.mockReturnValue(mockResolvedPath);
      mockReadJsonFile.mockResolvedValue(mockPackageJson);

      const result = await verifyLocalPackage(unicodePackageName);

      expect(result.exists).toBe(true);
      expect(result.version).toBe('2.1.0');
    });
  });
});