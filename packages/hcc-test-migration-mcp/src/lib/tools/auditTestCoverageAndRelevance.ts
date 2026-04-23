import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { McpTool } from '../types.js';
import { safeReadFile, safeExists, safeStat } from '../utils/pathSecurity.js';

const AuditInputSchema = z.object({
  componentPath: z.string().describe('Path to the component source file'),
  testPath: z.string().describe('Path to the legacy test file to audit'),
});

export function auditTestCoverageAndRelevanceTool(): McpTool {
  async function tool(args: any): Promise<CallToolResult> {
    try {
      const input = AuditInputSchema.parse(args);

      // Check if component exists
      const componentExists = safeExists(input.componentPath);
      let componentCode = '';
      let componentModified = '';

      if (componentExists) {
        componentCode = safeReadFile(input.componentPath);
        const stats = safeStat(input.componentPath);
        componentModified = stats.mtime.toISOString();
      }

      // Check if test exists
      const testExists = safeExists(input.testPath);
      let testCode = '';
      let testModified = '';
      let testType: 'cypress' | 'playwright' | 'jest' | 'storybook' = 'cypress';

      if (testExists) {
        testCode = safeReadFile(input.testPath);
        const stats = safeStat(input.testPath);
        testModified = stats.mtime.toISOString();

        // Determine test type from file path/content
        if (input.testPath.includes('.cy.') || testCode.includes('cy.')) {
          testType = 'cypress';
        } else if (input.testPath.includes('.stories.')) {
          testType = 'storybook';
        } else if (input.testPath.includes('playwright') || input.testPath.includes('.spec.')) {
          testType = 'playwright';
        } else {
          testType = 'jest';
        }
      }

      // Analyze relevance
      const analysis = analyzeRelevance(componentCode, testCode, componentExists, testExists);

      return {
        content: [
          {
            type: 'text',
            text: `# Test Coverage and Relevance Audit

## Component Analysis
- **Path**: ${input.componentPath}
- **Exists**: ${componentExists ? '✅ Yes' : '❌ No'}
${componentExists ? `- **Last Modified**: ${componentModified}` : ''}

## Test Analysis
- **Path**: ${input.testPath}
- **Exists**: ${testExists ? '✅ Yes' : '❌ No'}
- **Type**: ${testType}
${testExists ? `- **Last Modified**: ${testModified}` : ''}

## Relevance Assessment
- **Is Relevant**: ${analysis.isRelevant ? '✅ Yes' : '❌ No'}
- **Reason**: ${analysis.reason}
- **Recommendation**: **${analysis.recommendation.toUpperCase()}**

${analysis.details ? `\n## Details\n${analysis.details}` : ''}

## Component Code Preview
\`\`\`typescript
${componentCode.slice(0, 500)}${componentCode.length > 500 ? '...' : ''}
\`\`\`

## Test Code Preview
\`\`\`typescript
${testCode.slice(0, 500)}${testCode.length > 500 ? '...' : ''}
\`\`\``,
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Error auditing test coverage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return [
    'audit_test_coverage_and_relevance',
    {
      description: 'Analyzes component source code and legacy test code to determine if the test is still relevant to current UI state. Returns recommendation to migrate, delete, update, or keep.',
      inputSchema: AuditInputSchema.shape,
    },
    tool
  ];
}

/**
 * Analyze if test is still relevant to component
 */
function analyzeRelevance(
  componentCode: string,
  testCode: string,
  componentExists: boolean,
  testExists: boolean
): {
  isRelevant: boolean;
  reason: string;
  recommendation: 'migrate' | 'delete' | 'update' | 'keep';
  details?: string;
} {
  // Component doesn't exist - test is obsolete
  if (!componentExists) {
    return {
      isRelevant: false,
      reason: 'Component file no longer exists',
      recommendation: 'delete',
      details: 'The component this test was written for has been removed from the codebase.',
    };
  }

  // Test doesn't exist - nothing to audit
  if (!testExists) {
    return {
      isRelevant: false,
      reason: 'Test file does not exist',
      recommendation: 'keep',
      details: 'No test file found at the specified path.',
    };
  }

  // Extract test selectors and assertions
  const testSelectors = extractSelectors(testCode);
  const componentElements = extractElements(componentCode);

  // Check if test selectors match current component
  const matchingSelectors = testSelectors.filter(selector =>
    componentElements.some(element =>
      element.includes(selector) ||
      selector.includes(element)
    )
  );

  const matchPercentage = testSelectors.length > 0
    ? (matchingSelectors.length / testSelectors.length) * 100
    : 0;

  // High match - test is relevant
  if (matchPercentage >= 70) {
    return {
      isRelevant: true,
      reason: `${matchPercentage.toFixed(0)}% of test selectors match current component structure`,
      recommendation: 'migrate',
      details: `Found ${matchingSelectors.length}/${testSelectors.length} matching selectors. Test appears to be testing current functionality.`,
    };
  }

  // Medium match - test may need updates
  if (matchPercentage >= 30) {
    return {
      isRelevant: true,
      reason: `${matchPercentage.toFixed(0)}% of test selectors match - component may have been refactored`,
      recommendation: 'update',
      details: `Found ${matchingSelectors.length}/${testSelectors.length} matching selectors. Component structure may have changed. Review and update test before migration.`,
    };
  }

  // Low match - test is likely obsolete
  return {
    isRelevant: false,
    reason: `Only ${matchPercentage.toFixed(0)}% of test selectors match current component`,
    recommendation: 'delete',
    details: `Found ${matchingSelectors.length}/${testSelectors.length} matching selectors. Test appears to be testing old functionality that no longer exists.`,
  };
}

/**
 * Extract selectors from test code (Cypress cy.get(), getByRole, etc.)
 */
function extractSelectors(testCode: string): string[] {
  const selectors: string[] = [];

  // Cypress selectors: cy.get('selector')
  const cyGetMatches = testCode.matchAll(/cy\.get\(['"`]([^'"`]+)['"`]\)/g);
  for (const match of cyGetMatches) {
    selectors.push(match[1]);
  }

  // Cypress data attributes: cy.get('[data-testid="..."]')
  const dataTestIdMatches = testCode.matchAll(/data-testid=['"`]([^'"`]+)['"`]/g);
  for (const match of dataTestIdMatches) {
    selectors.push(match[1]);
  }

  // Testing Library queries: getByRole, getByText, etc.
  const queryMatches = testCode.matchAll(/(?:getBy|findBy|queryBy)\w+\(['"`]([^'"`]+)['"`]/g);
  for (const match of queryMatches) {
    selectors.push(match[1]);
  }

  // ARIA roles
  const roleMatches = testCode.matchAll(/role:\s*['"`]([^'"`]+)['"`]/g);
  for (const match of roleMatches) {
    selectors.push(match[1]);
  }

  return selectors;
}

/**
 * Extract elements and identifiers from component code
 */
function extractElements(componentCode: string): string[] {
  const elements: string[] = [];

  // data-testid attributes
  const testIdMatches = componentCode.matchAll(/data-testid=['"`]([^'"`]+)['"`]/g);
  for (const match of testIdMatches) {
    elements.push(match[1]);
  }

  // ARIA roles
  const roleMatches = componentCode.matchAll(/role=['"`]([^'"`]+)['"`]/g);
  for (const match of roleMatches) {
    elements.push(match[1]);
  }

  // aria-label
  const labelMatches = componentCode.matchAll(/aria-label=['"`]([^'"`]+)['"`]/g);
  for (const match of labelMatches) {
    elements.push(match[1]);
  }

  // Common element types
  const elementMatches = componentCode.matchAll(/<(button|input|select|textarea|a|form)/gi);
  for (const match of elementMatches) {
    elements.push(match[1].toLowerCase());
  }

  return elements;
}
