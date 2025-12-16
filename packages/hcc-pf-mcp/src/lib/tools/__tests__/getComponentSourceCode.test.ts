// Mock the utility dependencies
const mockGetLocalModulesMap = jest.fn();
const mockVerifyLocalPackage = jest.fn();
const mockReadFileAsync = jest.fn();
const mockPathJoin = jest.fn();
const mockPathResolve = jest.fn();

jest.mock('../../utils/getLocalModulesMap', () => ({
  getLocalModulesMap: mockGetLocalModulesMap
}));

jest.mock('../../utils/verifyLocalPackage', () => ({
  verifyLocalPackage: mockVerifyLocalPackage
}));

jest.mock('../../utils/readFile', () => ({
  readFileAsync: mockReadFileAsync
}));

jest.mock('path', () => ({
  default: {
    join: mockPathJoin,
    resolve: mockPathResolve
  }
}));

import { getComponentSourceCode } from '../getComponentSourceCode';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  TEST_DATA,
  expectMcpTool,
  createMockError,
  errorTypeGuards
} from '../../__tests__/testUtils';

describe('getComponentSourceCode', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Set up default mocks
    mockPathJoin.mockImplementation((...args) => args.join('/'));
    mockPathResolve.mockImplementation((...args) => args.join('/'));
  });

  describe('tool configuration', () => {
    it('should return tool configuration with correct name and schema', () => {
      const tool = getComponentSourceCode();
      expectMcpTool.toHaveValidConfiguration(tool, 'getComponentSourceCode');

      const [, config] = tool;
      expect(config.description).toContain('Retrieve a source code of a specified Patternfly react-core module');
      expect(config.inputSchema.componentName).toBeDefined();
      expect(config.inputSchema.packageName).toBeDefined();
      expect(config.inputSchema.nodeModulesRootPath).toBeDefined();
    });

    it('should have proper package name enum values', () => {
      const [, config] = getComponentSourceCode();
      const packageSchema = config.inputSchema.packageName;

      // Check that the schema accepts valid enum values
      expect(() => packageSchema.parse('@patternfly/react-core')).not.toThrow();
      expect(() => packageSchema.parse('@patternfly/react-table')).not.toThrow();
      expect(() => packageSchema.parse('@patternfly/react-data-view')).not.toThrow();
      expect(() => packageSchema.parse('@patternfly/react-component-groups')).not.toThrow();

      // Check that invalid values are rejected
      expect(() => packageSchema.parse('invalid-package')).toThrow();
    });

    it('should have componentName as required parameter', () => {
      const [, config] = getComponentSourceCode();
      const componentNameSchema = config.inputSchema.componentName;

      expect(() => componentNameSchema.parse('Button')).not.toThrow();
      expect(() => componentNameSchema.parse(undefined)).toThrow();
    });

    it('should have optional packageName with default value', () => {
      const [, config] = getComponentSourceCode();
      const packageSchema = config.inputSchema.packageName;

      // Should be optional and default to @patternfly/react-core
      const result = packageSchema.parse(undefined);
      expect(result).toBe('@patternfly/react-core');
    });

    it('should have optional nodeModulesRootPath parameter', () => {
      const [, config] = getComponentSourceCode();
      const nodeModulesSchema = config.inputSchema.nodeModulesRootPath;

      expect(() => nodeModulesSchema.parse(undefined)).not.toThrow();
      expect(() => nodeModulesSchema.parse('/valid/path')).not.toThrow();
    });

    it('should have consistent configuration across multiple calls', () => {
      const [toolName1, config1, toolFunction1] = getComponentSourceCode();
      const [toolName2, config2, toolFunction2] = getComponentSourceCode();

      expect(toolName1).toBe(toolName2);
      expect(config1.description).toBe(config2.description);
      expect(typeof toolFunction1).toBe(typeof toolFunction2);
    });
  });

  describe('successful source code retrieval', () => {
    beforeEach(() => {
      // Default successful mocks
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });
      mockPathJoin.mockReturnValue('/node_modules/@patternfly/react-core/src/Button/index.ts');
    });

    it('should successfully retrieve component source code', async () => {
      const indexContent = `export { Button } from './Button';\nexport type { ButtonProps } from './Button';`;
      const componentContent = `import * as React from 'react';\nexport const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent) // index.ts
        .mockResolvedValueOnce(componentContent); // Button.ts

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });

    it('should handle .tsx file extension fallback', async () => {
      const indexContent = `export { Button } from './Button';\nexport type { ButtonProps } from './Button';`;
      const componentContent = `import * as React from 'react';\nexport const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent) // index.ts
        .mockRejectedValueOnce(new Error('File not found')) // Button.ts fails
        .mockResolvedValueOnce(componentContent); // Button.tsx succeeds

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });

    it('should use default package name when not provided', async () => {
      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      await toolFunction({ componentName: 'Button' });

      expect(mockVerifyLocalPackage).toHaveBeenCalledWith('@patternfly/react-core', undefined);
      expect(mockGetLocalModulesMap).toHaveBeenCalledWith('@patternfly/react-core', undefined);
    });

    it('should use provided package name', async () => {
      // Set up mocks for different package
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-data-view'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'DataView': 'dist/dynamic/DataView'
      });

      const indexContent = `export { DataView } from './DataView';`;
      const componentContent = `export const DataView = () => <div>DataView</div>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      await toolFunction({
        componentName: 'DataView',
        packageName: '@patternfly/react-data-view'
      });

      expect(mockVerifyLocalPackage).toHaveBeenCalledWith('@patternfly/react-data-view', undefined);
      expect(mockGetLocalModulesMap).toHaveBeenCalledWith('@patternfly/react-data-view', undefined);
    });

    it('should pass nodeModulesRootPath to utility functions', async () => {
      const customPath = '/custom/node_modules';
      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      await toolFunction({
        componentName: 'Button',
        nodeModulesRootPath: customPath
      });

      expect(mockVerifyLocalPackage).toHaveBeenCalledWith('@patternfly/react-core', customPath);
      expect(mockGetLocalModulesMap).toHaveBeenCalledWith('@patternfly/react-core', customPath);
    });

    it('should handle path transformation from dist to src', async () => {
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button/subfolder'
      });

      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      await toolFunction({ componentName: 'Button' });

      // Should replace 'dist/dynamic' with 'src'
      expect(mockPathJoin).toHaveBeenCalledWith(
        expect.stringContaining('src/Button/subfolder'),
        'index.ts'
      );
    });

    it('should handle complex import parsing with quotes and semicolons', async () => {
      const indexContent = `export { Button } from './Button';\nexport type { ButtonProps } from "./Button";`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });

    it('should handle multiline index.ts files', async () => {
      const indexContent = `// Button component exports
export { Button } from './Button';
export { ButtonVariant } from './Button';
export type {
  ButtonProps,
  ButtonState
} from './Button';

// Other exports
export { SomeOtherThing } from './Other';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });
  });

  describe('input validation', () => {
    it('should throw McpError for missing componentName', async () => {
      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({});
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'Missing required parameter: componentName');
      }
    });

    it('should throw McpError for null componentName', async () => {
      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: null });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'Missing required parameter: componentName');
      }
    });

    it('should throw McpError for undefined componentName', async () => {
      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: undefined });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'Missing required parameter: componentName');
      }
    });

    it('should throw McpError for non-string componentName', async () => {
      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 123 });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'Missing required parameter: componentName');
      }
    });

    it('should throw McpError for empty string componentName', async () => {
      mockVerifyLocalPackage.mockResolvedValue({ exists: true, packageRoot: '/test' });
      mockGetLocalModulesMap.mockResolvedValue({});

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: '' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'No valid path to "" found in available modules');
      }
    });
  });

  describe('package verification', () => {
    it('should throw McpError when package does not exist', async () => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: false,
        error: new Error('Package not found')
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'Package "@patternfly/react-core" not found locally');
      }
    });

    it('should include error message when package verification fails', async () => {
      const mockError = new Error('Permission denied');
      mockVerifyLocalPackage.mockResolvedValue({
        exists: false,
        error: mockError
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain('Permission denied');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should handle package verification for different package names', async () => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: false,
        error: new Error('Package not found')
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({
          componentName: 'DataView',
          packageName: '@patternfly/react-data-view'
        });
        fail('Expected function to throw McpError');
      } catch (error) {
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain('@patternfly/react-data-view');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });
  });

  describe('component path resolution', () => {
    beforeEach(() => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
    });

    it('should throw McpError when component not found in modules map', async () => {
      mockGetLocalModulesMap.mockResolvedValue({
        'Card': 'lib/Card/index.js',
        'Modal': 'lib/Modal/index.js'
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'No valid path to "Button" found in available modules');
      }
    });

    it('should throw McpError when component path is undefined', async () => {
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': undefined
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'No valid path to "Button" found in available modules');
      }
    });

    it('should throw McpError when component path is null', async () => {
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': null
      });

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams, 'No valid path to "Button" found in available modules');
      }
    });
  });

  describe('index file reading', () => {
    beforeEach(() => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });
    });

    it('should throw error when index.ts file cannot be read', async () => {
      const fsError = createMockError.fileSystem('ENOENT', 'no such file or directory');
      mockReadFileAsync.mockRejectedValue(fsError);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw error');
      } catch (error) {
        if (errorTypeGuards.isError(error)) {
          // This will propagate as the original error from readFileAsync
          expect(error.message).toContain('ENOENT: no such file or directory');
        } else {
          fail('Expected error to be Error');
        }
      }
    });

    it('should throw McpError when index.ts returns falsy content', async () => {
      mockReadFileAsync.mockResolvedValue(null);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to read index.ts for component "Button"');
      }
    });

    it('should throw McpError when index.ts returns empty string', async () => {
      mockReadFileAsync.mockResolvedValue('');

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to read index.ts for component "Button"');
      }
    });
  });

  describe('import parsing', () => {
    beforeEach(() => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });
    });

    it('should throw McpError when import pattern not found', async () => {
      const indexContent = `export { Card } from './Card';\nexport { Modal } from './Modal';`;
      mockReadFileAsync.mockResolvedValue(indexContent);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to find source code for component "Button"');
      }
    });

    it('should throw McpError when import path cannot be parsed', async () => {
      const indexContent = `export { Button }`; // Missing 'from' clause
      mockReadFileAsync.mockResolvedValue(indexContent);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to find source code for component "Button"');
      }
    });

    it('should throw McpError when import path is malformed', async () => {
      const indexContent = `export { Button } from `; // No path
      mockReadFileAsync.mockResolvedValue(indexContent);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        // This will trigger the "Failed to find source code" error first, since the regex won't match
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to find source code for component "Button"');
      }
    });

    it('should handle various quote types and semicolons', async () => {
      // Reset mocks for this test
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });

      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });

    it('should handle imports without semicolons', async () => {
      const indexContent = `export { Button } from './Button'`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(componentContent);
    });
  });

  describe('source file reading', () => {
    beforeEach(() => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });
    });

    it('should throw McpError when both .ts and .tsx files fail to read', async () => {
      const indexContent = `export { Button } from './Button';`;
      const fsError = createMockError.fileSystem('ENOENT', 'no such file or directory');

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent) // index.ts succeeds
        .mockRejectedValueOnce(fsError) // Button.ts fails
        .mockRejectedValueOnce(fsError); // Button.tsx fails

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to read source code file for component "Button"');
      }
    });

    it('should handle permission errors when reading source files', async () => {
      const indexContent = `export { Button } from './Button';`;
      const permissionError = createMockError.fileSystem('EACCES', 'permission denied');

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockRejectedValueOnce(permissionError)
        .mockRejectedValueOnce(permissionError);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError, 'Failed to read source code file for component "Button"');
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain('EACCES: permission denied');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should prioritize .ts file over .tsx file', async () => {
      const indexContent = `export { Button } from './Button';`;
      const tsContent = `export const Button = () => <button>TS Version</button>;`;
      const tsxContent = `export const Button = () => <button>TSX Version</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent) // index.ts
        .mockResolvedValueOnce(tsContent); // Button.ts succeeds first

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(tsContent);
      // Should not even try to read .tsx since .ts succeeded
      expect(mockReadFileAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle getLocalModulesMap errors', async () => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });

      const mapError = createMockError.standard('Failed to load modules map');
      mockGetLocalModulesMap.mockRejectedValue(mapError);

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw error');
      } catch (error) {
        if (errorTypeGuards.isError(error)) {
          expect(error.message).toContain('Failed to load modules map');
        } else {
          fail('Expected error to be Error');
        }
      }
    });

    it('should handle non-Error objects in file reading', async () => {
      const indexContent = `export { Button } from './Button';`;

      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockRejectedValueOnce('String error')
        .mockRejectedValueOnce('Another string error');

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: 'Button' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError);
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain('Another string error');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });
  });

  describe('response format validation', () => {
    beforeEach(() => {
      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'Button': 'dist/dynamic/Button'
      });
    });

    it('should always return content array with text type', async () => {
      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
    });

    it('should not include additional properties in response', async () => {
      const indexContent = `export { Button } from './Button';`;
      const componentContent = `export const Button = () => <button>Test</button>;`;

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(componentContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      const expectedKeys = ['content'];
      expect(Object.keys(result)).toEqual(expectedKeys);
    });

    it('should preserve exact source code content without modification', async () => {
      const indexContent = `export { Button } from './Button';`;
      const specialContent = TEST_DATA.MARKDOWN.WITH_EMOJI + '\n// Component with special chars @#$%^&*()';

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(specialContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'Button' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(specialContent);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very long component names', async () => {
      const longName = 'VeryLong' + 'ComponentName'.repeat(100);

      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/test'
      });
      mockGetLocalModulesMap.mockResolvedValue({});

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: longName });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams);
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain(longName);
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should handle component names with special characters', async () => {
      const specialName = 'Component-With_Special@Characters#123';

      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/test'
      });
      mockGetLocalModulesMap.mockResolvedValue({});

      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({ componentName: specialName });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams);
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.message).toContain(specialName);
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should handle missing arguments object', async () => {
      const [, , toolFunction] = getComponentSourceCode();

      try {
        await toolFunction({});
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InvalidParams);
      }
    });

    it('should handle large source code files', async () => {
      const indexContent = `export { LargeComponent } from './LargeComponent';`;
      const largeContent = 'const LargeComponent = () => {\n' + '  // '.repeat(10000) + 'Large content\n  return <div>Large</div>;\n};';

      mockVerifyLocalPackage.mockResolvedValue({
        exists: true,
        packageRoot: '/node_modules/@patternfly/react-core'
      });
      mockGetLocalModulesMap.mockResolvedValue({
        'LargeComponent': 'dist/dynamic/LargeComponent'
      });

      mockReadFileAsync
        .mockResolvedValueOnce(indexContent)
        .mockResolvedValueOnce(largeContent);

      const [, , toolFunction] = getComponentSourceCode();
      const result = await toolFunction({ componentName: 'LargeComponent' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(largeContent);
      expect(expectMcpTool.getTextContent(result).length).toBeGreaterThan(50000);
    });
  });
});