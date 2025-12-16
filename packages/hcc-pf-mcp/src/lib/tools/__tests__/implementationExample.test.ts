// Mock the readFile function
const mockReadFile = jest.fn();
const mockReadFileAsync = jest.fn();
const mockPathResolve = jest.fn(() => '/mocked/path/to/file.md');

jest.mock('fs', () => ({
  default: {
    readFile: mockReadFile
  }
}));

jest.mock('path', () => ({
  default: {
    resolve: mockPathResolve
  }
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => {
    // When promisify is called with fs.readFile, return our mock async function
    if (fn === mockReadFile) {
      return mockReadFileAsync;
    }
    return jest.fn();
  })
}));

import { getImplementationExampleTool } from '../implementationExample';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  TEST_DATA,
  expectMcpTool,
  createMockError,
  validateExampleName,
  validateContent,
  errorTypeGuards
} from '../../__tests__/testUtils';

describe('getImplementationExampleTool', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset path.resolve to default mock behavior
    mockPathResolve.mockReturnValue('/mocked/path/to/file.md');
  });

  describe('tool configuration', () => {
    it('should return tool configuration with correct name and schema', () => {
      const tool = getImplementationExampleTool();
      expectMcpTool.toHaveValidConfiguration(tool, 'getPatternFlyDataViewExample');

      const [, config] = tool;
      expect(config.description).toContain('Get an implementation example of the @patternfly/react-data-view package');
      expect(config.inputSchema.exampleName).toBeDefined();
    });

    it('should include all valid example names in schema description', () => {
      const [, config] = getImplementationExampleTool();
      const description = config.inputSchema.exampleName._def?.description || '';

      validateExampleName.getValidExamples().forEach(example => {
        expect(description).toContain(example);
      });
    });

    it('should have consistent configuration across multiple calls', () => {
      const [toolName1, config1, toolFunction1] = getImplementationExampleTool();
      const [toolName2, config2, toolFunction2] = getImplementationExampleTool();

      expect(toolName1).toBe(toolName2);
      expect(config1.description).toBe(config2.description);
      expect(typeof toolFunction1).toBe(typeof toolFunction2);
    });
  });

  describe('successful file operations', () => {
    it('should successfully read and return example content', async () => {
      const mockContent = TEST_DATA.MARKDOWN.WITH_CODE;
      mockReadFileAsync.mockResolvedValue(mockContent);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(mockContent);
      expect(validateContent.isValidMarkdown(mockContent)).toBe(true);
    });

    it('should handle empty file content gracefully', async () => {
      mockReadFileAsync.mockResolvedValue(TEST_DATA.MARKDOWN.EMPTY);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(TEST_DATA.MARKDOWN.EMPTY);
    });

    it('should handle large file content', async () => {
      const largeContent = TEST_DATA.MARKDOWN.LARGE;
      mockReadFileAsync.mockResolvedValue(largeContent);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toHaveLength(largeContent.length);
      expect(validateContent.isPreserved(largeContent, expectMcpTool.getTextContent(result))).toBe(true);
      expect(validateContent.isValidMarkdown(largeContent)).toBe(true);
    });

    it('should handle content with special characters and encoding', async () => {
      const specialContent = TEST_DATA.MARKDOWN.WITH_EMOJI;
      mockReadFileAsync.mockResolvedValue(specialContent);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      expect(expectMcpTool.getTextContent(result)).toBe(specialContent);
      expect(validateContent.hasSpecialCharacters(expectMcpTool.getTextContent(result))).toBe(true);
      expect(validateContent.isPreserved(specialContent, expectMcpTool.getTextContent(result))).toBe(true);
    });

    it('should construct correct file path for each example', async () => {
      const exampleName = 'commonUsage';
      mockReadFileAsync.mockResolvedValue('Mock content');

      const [, , toolFunction] = getImplementationExampleTool();
      await toolFunction({ exampleName });

      expect(mockPathResolve).toHaveBeenCalledWith(
        expect.any(String), // __dirname
        `../examples/${exampleName}.md`
      );
    });

    it('should read file with utf-8 encoding', async () => {
      mockReadFileAsync.mockResolvedValue('Mock content');

      const [, , toolFunction] = getImplementationExampleTool();
      await toolFunction({ exampleName: 'minimalSetup' });

      expect(mockReadFileAsync).toHaveBeenCalledWith(
        expect.any(String), // resolved path
        'utf-8'
      );
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid example name', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'invalidExample' })).rejects.toThrow(
        'Invalid example name: invalidExample'
      );
    });

    it('should throw McpError with InvalidParams for invalid example', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      try {
        await toolFunction({ exampleName: 'invalidExample' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        if (errorTypeGuards.isMcpError(error)) {
          expect(error.code).toBe(ErrorCode.InvalidParams);
          expect(error.message).toContain('Invalid example name: invalidExample');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should include available examples in error message', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      try {
        await toolFunction({ exampleName: 'invalidExample' });
      } catch (error) {
        if (errorTypeGuards.isMcpError(error)) {
          const errorMessage = error.message;
          expect(errorMessage).toContain('Valid examples are:');
          expect(errorMessage).toContain('minimalSetup');
          expect(errorMessage).toContain('commonUsage');
        } else {
          fail('Expected error to be McpError');
        }
      }
    });

    it('should handle null exampleName', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: null })).rejects.toThrow(
        'Invalid example name: null'
      );
    });

    it('should handle undefined exampleName', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: undefined })).rejects.toThrow(
        'Invalid example name: undefined'
      );
    });

    it('should handle empty string exampleName', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: '' })).rejects.toThrow(
        'Invalid example name:'
      );
    });

    it('should handle missing exampleName property', async () => {
      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({})).rejects.toThrow(
        'Invalid example name: undefined'
      );
    });
  });

  describe('file system error handling', () => {
    it('should handle file not found errors', async () => {
      const mockError = createMockError.fileSystem('ENOENT', 'no such file or directory');
      mockReadFileAsync.mockRejectedValue(mockError);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'minimalSetup' })).rejects.toThrow(
        `Failed to read implementation example 'minimalSetup': ${TEST_DATA.ERRORS.FILE_NOT_FOUND}`
      );
    });

    it('should handle permission errors', async () => {
      const permissionError = createMockError.fileSystem('EACCES', 'permission denied');
      mockReadFileAsync.mockRejectedValue(permissionError);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'minimalSetup' })).rejects.toThrow(
        `Failed to read implementation example 'minimalSetup': ${TEST_DATA.ERRORS.PERMISSION}`
      );
    });

    it('should handle generic file read errors', async () => {
      const genericError = new Error('File system error occurred');
      mockReadFileAsync.mockRejectedValue(genericError);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'minimalSetup' })).rejects.toThrow(
        "Failed to read implementation example 'minimalSetup': File system error occurred"
      );
    });

    it('should throw McpError with InternalError for file system errors', async () => {
      const fsError = createMockError.standard('File system error');
      mockReadFileAsync.mockRejectedValue(fsError);

      const [, , toolFunction] = getImplementationExampleTool();

      try {
        await toolFunction({ exampleName: 'minimalSetup' });
        fail('Expected function to throw McpError');
      } catch (error) {
        expectMcpTool.toBeValidMcpError(error, ErrorCode.InternalError);
      }
    });

    it('should handle non-Error objects thrown during file operations', async () => {
      const stringError = createMockError.nonError('String error from file system');
      mockReadFileAsync.mockRejectedValue(stringError);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'minimalSetup' })).rejects.toThrow(
        "Failed to read implementation example 'minimalSetup': String error from file system"
      );
    });

    it('should handle undefined error objects', async () => {
      mockReadFileAsync.mockRejectedValue(undefined);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: 'minimalSetup' })).rejects.toThrow(
        "Failed to read implementation example 'minimalSetup': undefined"
      );
    });
  });

  describe('valid example names', () => {
    const validExamples = validateExampleName.getValidExamples();

    validExamples.forEach(exampleName => {
      it(`should accept ${exampleName} as valid example name`, async () => {
        mockReadFileAsync.mockResolvedValue('Mock content');

        const [, , toolFunction] = getImplementationExampleTool();
        const result = await toolFunction({ exampleName });

        expect(result).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(mockReadFileAsync).toHaveBeenCalledWith(
          expect.any(String),
          'utf-8'
        );
      });

      it(`should construct correct path for ${exampleName}`, async () => {
        mockReadFileAsync.mockResolvedValue('Mock content');

        const [, , toolFunction] = getImplementationExampleTool();
        await toolFunction({ exampleName });

        expect(mockPathResolve).toHaveBeenCalledWith(
          expect.any(String),
          `../examples/${exampleName}.md`
        );
      });
    });
  });

  describe('response format validation', () => {
    it('should always return content array with text type', async () => {
      mockReadFileAsync.mockResolvedValue(TEST_DATA.MARKDOWN.SIMPLE);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
    });

    it('should not include additional properties in response', async () => {
      mockReadFileAsync.mockResolvedValue(TEST_DATA.MARKDOWN.SIMPLE);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      const expectedKeys = ['content'];
      expect(Object.keys(result)).toEqual(expectedKeys);
    });

    it('should preserve exact file content without modification', async () => {
      const originalContent = TEST_DATA.MARKDOWN.SPECIAL_CHARS;
      mockReadFileAsync.mockResolvedValue(originalContent);

      const [, , toolFunction] = getImplementationExampleTool();
      const result = await toolFunction({ exampleName: 'minimalSetup' });

      expectMcpTool.toHaveValidResponse(result);
      expect(validateContent.isPreserved(originalContent, expectMcpTool.getTextContent(result))).toBe(true);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very long example names', async () => {
      const longName = 'a'.repeat(1000);

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: longName })).rejects.toThrow(
        `Invalid example name: ${longName}`
      );
      expect(validateExampleName.isValid(longName)).toBe(false);
    });

    it('should handle special characters in example names', async () => {
      const invalidExamples = validateExampleName.getInvalidExamples();
      const specialName = invalidExamples.find(example => typeof example === 'string' && example.includes('@'));

      const [, , toolFunction] = getImplementationExampleTool();

      await expect(toolFunction({ exampleName: specialName })).rejects.toThrow(
        `Invalid example name: ${specialName}`
      );
      expect(validateExampleName.isValid(specialName as string)).toBe(false);
    });

    it('should be case-sensitive for example names', async () => {
      const [, , toolFunction] = getImplementationExampleTool();
      const invalidExamples = validateExampleName.getInvalidExamples();
      const uppercaseExample = invalidExamples.find(ex => ex === 'MINIMALSETUP');
      const titleCaseExample = invalidExamples.find(ex => ex === 'MinimalSetup');

      await expect(toolFunction({ exampleName: uppercaseExample })).rejects.toThrow(
        `Invalid example name: ${uppercaseExample}`
      );

      await expect(toolFunction({ exampleName: titleCaseExample })).rejects.toThrow(
        `Invalid example name: ${titleCaseExample}`
      );

      expect(validateExampleName.isValid(uppercaseExample as string)).toBe(false);
      expect(validateExampleName.isValid(titleCaseExample as string)).toBe(false);
    });

    it('should handle numeric example names', async () => {
      const [, , toolFunction] = getImplementationExampleTool();
      const invalidExamples = validateExampleName.getInvalidExamples();
      const numericExample = invalidExamples.find(ex => ex === 123);

      await expect(toolFunction({ exampleName: numericExample as any })).rejects.toThrow(
        `Invalid example name: ${numericExample}`
      );
      expect(validateExampleName.isValid(numericExample as any)).toBe(false);
    });
  });
});