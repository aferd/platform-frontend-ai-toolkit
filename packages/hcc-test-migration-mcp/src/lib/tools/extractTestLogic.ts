import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as ts from 'typescript';
import { McpTool, TestLogicMap, SetupAction, TriggerAction, AssertionAction, CypressNode } from '../types.js';
import { safeReadFile } from '../utils/pathSecurity.js';

const ExtractInputSchema = z.object({
  testFilePath: z.string().describe('Path to the Cypress test file to analyze'),
});

export function extractTestLogicTool(): McpTool {
  async function tool(args: any): Promise<CallToolResult> {
    try {
      const input = ExtractInputSchema.parse(args);

      // Read test file
      const testCode = safeReadFile(input.testFilePath);

      // Parse with TypeScript compiler API
      const sourceFile = ts.createSourceFile(
        input.testFilePath,
        testCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract test logic
      const testMaps: TestLogicMap[] = [];
      extractTests(sourceFile, testMaps, input.testFilePath, testCode);

      // Generate detailed report
      const report = generateReport(testMaps);

      return {
        content: [
          {
            type: 'text',
            text: report,
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
        `Error extracting test logic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return [
    'extract_test_logic',
    {
      description: 'Parses Cypress test files using AST (Abstract Syntax Tree) and extracts structured test logic map containing Setup (mocks, intercepts), Triggers (user actions), and Assertions (expected outcomes)',
      inputSchema: ExtractInputSchema.shape,
    },
    tool
  ];
}

/**
 * Extract tests from source file
 */
function extractTests(sourceFile: ts.SourceFile, testMaps: TestLogicMap[], filePath: string, testCode: string): void {
  function visit(node: ts.Node) {
    // Look for it() or test() calls
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (ts.isIdentifier(expression) && (expression.text === 'it' || expression.text === 'test')) {
        const testName = extractTestName(node);
        const testMap = extractTestBody(node, testName, filePath, testCode);

        if (testMap) {
          testMaps.push(testMap);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

/**
 * Extract test name from it() or test() call
 */
function extractTestName(node: ts.CallExpression): string {
  if (node.arguments.length > 0) {
    const firstArg = node.arguments[0];

    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }
  }

  return 'Unnamed test';
}

/**
 * Extract test body and categorize actions
 */
function extractTestBody(node: ts.CallExpression, testName: string, filePath: string, testCode: string): TestLogicMap | null {
  const setup: SetupAction[] = [];
  const triggers: TriggerAction[] = [];
  const assertions: AssertionAction[] = [];
  const cypressNodes: CypressNode[] = [];

  // Get the test function body (second argument)
  if (node.arguments.length < 2) return null;

  const testFunction = node.arguments[1];

  if (!ts.isFunctionLike(testFunction)) return null;

  const body = testFunction.body;

  if (!body || !ts.isBlock(body)) return null;

  // Visit each statement in the test body
  for (const statement of body.statements) {
    visitStatement(statement, setup, triggers, assertions, cypressNodes);
  }

  // Determine test category
  const category = categorizeTest(setup, triggers, assertions, testCode);

  return {
    testName,
    filePath,
    setup,
    triggers,
    assertions,
    category,
    cypressNodes,
  };
}

/**
 * Visit a statement and categorize Cypress commands
 */
function visitStatement(
  statement: ts.Statement,
  setup: SetupAction[],
  triggers: TriggerAction[],
  assertions: AssertionAction[],
  cypressNodes: CypressNode[]
): void {
  if (!ts.isExpressionStatement(statement)) return;

  const expression = statement.expression;

  analyzeCypressChain(expression, setup, triggers, assertions, cypressNodes);
}

/**
 * Analyze Cypress command chains (cy.get().click(), etc.)
 */
function analyzeCypressChain(
  node: ts.Node,
  setup: SetupAction[],
  triggers: TriggerAction[],
  assertions: AssertionAction[],
  cypressNodes: CypressNode[]
): void {
  if (!ts.isCallExpression(node)) {
    ts.forEachChild(node, child => analyzeCypressChain(child, setup, triggers, assertions, cypressNodes));
    return;
  }

  const expression = node.expression;
  const code = node.getText();
  const lineNumber = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // Check for cy.intercept()
  if (isPropertyAccess(expression, 'intercept')) {
    const interceptAction = extractIntercept(node, code, lineNumber);
    if (interceptAction) setup.push(interceptAction);
  }

  // Check for cy.visit()
  else if (isPropertyAccess(expression, 'visit')) {
    const visitAction: SetupAction = {
      type: 'visit',
      code,
      lineNumber,
      details: { url: extractFirstStringArg(node) },
    };
    setup.push(visitAction);
  }

  // Check for cy.request()
  else if (isPropertyAccess(expression, 'request')) {
    const requestAction: SetupAction = {
      type: 'request',
      code,
      lineNumber,
      details: { url: extractFirstStringArg(node) },
    };
    setup.push(requestAction);
  }

  // Check for .click()
  else if (isPropertyAccess(expression, 'click')) {
    const selector = extractSelector(node);
    const clickAction: TriggerAction = {
      type: 'click',
      selector,
      code,
      lineNumber,
      details: {},
    };
    triggers.push(clickAction);
  }

  // Check for .type()
  else if (isPropertyAccess(expression, 'type')) {
    const selector = extractSelector(node);
    const typeAction: TriggerAction = {
      type: 'type',
      selector,
      code,
      lineNumber,
      details: { value: extractFirstStringArg(node) },
    };
    triggers.push(typeAction);
  }

  // Check for .select()
  else if (isPropertyAccess(expression, 'select')) {
    const selector = extractSelector(node);
    const selectAction: TriggerAction = {
      type: 'select',
      selector,
      code,
      lineNumber,
      details: { value: extractFirstStringArg(node) },
    };
    triggers.push(selectAction);
  }

  // Check for .check()
  else if (isPropertyAccess(expression, 'check')) {
    const selector = extractSelector(node);
    const checkAction: TriggerAction = {
      type: 'check',
      selector,
      code,
      lineNumber,
      details: {},
    };
    triggers.push(checkAction);
  }

  // Check for assertions: .should()
  else if (isPropertyAccess(expression, 'should')) {
    const selector = extractSelector(node);
    const assertionAction = extractAssertion(node, selector, code, lineNumber);
    if (assertionAction) assertions.push(assertionAction);
  }

  // Recursively analyze the expression chain
  if (ts.isPropertyAccessExpression(expression)) {
    analyzeCypressChain(expression.expression, setup, triggers, assertions, cypressNodes);
  }
}

/**
 * Check if expression is a property access with specific name
 */
function isPropertyAccess(expression: ts.Node, propertyName: string): boolean {
  return ts.isPropertyAccessExpression(expression) && expression.name.text === propertyName;
}

/**
 * Extract cy.intercept() details
 */
function extractIntercept(node: ts.CallExpression, code: string, lineNumber: number): SetupAction | null {
  if (node.arguments.length < 2) return null;

  const method = ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : 'GET';
  const url = extractStringFromArg(node.arguments[1]);

  return {
    type: 'intercept',
    code,
    lineNumber,
    details: { method, url },
  };
}

/**
 * Extract assertion details from .should()
 */
function extractAssertion(
  node: ts.CallExpression,
  selector: string | undefined,
  code: string,
  lineNumber: number
): AssertionAction | null {
  const chainer = extractFirstStringArg(node);

  let type: AssertionAction['type'] = 'custom';

  if (chainer?.includes('exist')) type = 'exist';
  else if (chainer?.includes('visible')) type = 'visible';
  else if (chainer?.includes('contain')) type = 'contain';
  else if (chainer?.includes('equal')) type = 'equal';
  else if (chainer?.includes('match')) type = 'match';

  return {
    type,
    selector,
    code,
    lineNumber,
    details: { chainer },
  };
}

/**
 * Extract selector from Cypress chain
 */
function extractSelector(node: ts.Node): string | undefined {
  let current: ts.Node = node;

  // Walk up the chain looking for Cypress selection methods
  while (current) {
    if (ts.isCallExpression(current)) {
      const expr = current.expression;

      if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text;
        // Support cy.get(), cy.contains(), cy.find(), cy.within()
        if (['get', 'contains', 'find', 'within'].includes(methodName)) {
          const selector = extractFirstStringArg(current);
          if (selector) {
            return selector;
          }
        }

        // Continue walking up the chain
        current = expr.expression;
        continue;
      }
    }

    break;
  }

  return undefined;
}

/**
 * Extract first string argument from call expression
 */
function extractFirstStringArg(node: ts.CallExpression): string | undefined {
  if (node.arguments.length > 0) {
    return extractStringFromArg(node.arguments[0]);
  }
  return undefined;
}

/**
 * Extract string value from argument
 */
function extractStringFromArg(arg: ts.Expression): string | undefined {
  if (ts.isStringLiteral(arg)) {
    return arg.text;
  }
  return undefined;
}

/**
 * Categorize test based on its actions
 */
function categorizeTest(
  setup: SetupAction[],
  triggers: TriggerAction[],
  assertions: AssertionAction[],
  testCode: string
): 'storybook' | 'unit' | 'e2e' {
  // CRITICAL: Check for cy.mount() - definitive indicator of component test
  if (testCode.includes('cy.mount(')) {
    return 'storybook';
  }

  // If has visit, definitely E2E
  if (setup.some(s => s.type === 'visit')) {
    return 'e2e';
  }

  // If only assertions, likely unit test
  if (triggers.length === 0 && assertions.length > 0) {
    return 'unit';
  }

  // If has intercepts and triggers, likely component test (Storybook)
  if (setup.some(s => s.type === 'intercept') && triggers.length > 0) {
    return 'storybook';
  }

  // Multiple triggers without mount or visit, likely E2E
  if (triggers.length > 3) {
    return 'e2e';
  }

  // Simple interactions, likely Storybook
  if (triggers.length > 0) {
    return 'storybook';
  }

  // Default to E2E if unclear
  return 'e2e';
}

/**
 * Generate detailed report
 */
function generateReport(testMaps: TestLogicMap[]): string {
  let report = `# Test Logic Extraction Report

Found **${testMaps.length}** test case(s)

---

`;

  for (const testMap of testMaps) {
    report += `## Test: ${testMap.testName}

**Category**: ${testMap.category.toUpperCase()}
**File**: ${testMap.filePath}

### Setup Actions (${testMap.setup.length})
${testMap.setup.length > 0 ? testMap.setup.map(s => `
- **${s.type.toUpperCase()}** (line ${s.lineNumber})
  - URL: ${s.details.url || 'N/A'}
  - Method: ${s.details.method || 'N/A'}
  \`\`\`typescript
  ${s.code}
  \`\`\`
`).join('\n') : '_No setup actions_'}

### Trigger Actions (${testMap.triggers.length})
${testMap.triggers.length > 0 ? testMap.triggers.map(t => `
- **${t.type.toUpperCase()}** (line ${t.lineNumber})
  - Selector: ${t.selector || 'N/A'}
  - Value: ${t.details.value || 'N/A'}
  \`\`\`typescript
  ${t.code}
  \`\`\`
`).join('\n') : '_No trigger actions_'}

### Assertions (${testMap.assertions.length})
${testMap.assertions.length > 0 ? testMap.assertions.map(a => `
- **${a.type.toUpperCase()}** (line ${a.lineNumber})
  - Selector: ${a.selector || 'N/A'}
  - Chainer: ${a.details.chainer || 'N/A'}
  \`\`\`typescript
  ${a.code}
  \`\`\`
`).join('\n') : '_No assertions_'}

### Migration Recommendation
${getMigrationRecommendation(testMap)}

---

`;
  }

  return report;
}

/**
 * Get migration recommendation based on test category
 */
function getMigrationRecommendation(testMap: TestLogicMap): string {
  switch (testMap.category) {
    case 'storybook':
      return `✅ **Migrate to Storybook**

This test focuses on component-level interactions and should be converted to a Storybook story with play functions.

**Next Steps:**
1. Create \`.stories.tsx\` file for the component
2. Convert setup actions to MSW handlers
3. Convert triggers to Storybook play function using \`@storybook/test\`
4. Use the \`hcc-frontend-storybook-specialist\` agent`;

    case 'unit':
      return `✅ **Migrate to Jest Unit Test**

This test focuses on logic validation without complex UI interactions.

**Next Steps:**
1. Create \`.test.ts\` or \`.test.tsx\` file
2. Use Jest and React Testing Library
3. Focus on testing the pure logic or hook behavior
4. Use the \`hcc-frontend-unit-test-writer\` agent`;

    case 'e2e':
      return `✅ **Migrate to Playwright E2E Test**

This test covers complete user workflows and navigation.

**Next Steps:**
1. Create Playwright test in \`e2e/\` directory
2. Use Red Hat SSO authentication from \`@redhat-cloud-services/playwright-test-auth\`
3. Convert cy.visit() to page.goto()
4. Convert selectors to accessible queries (getByRole, etc.)
5. Follow patterns from \`hcc-frontend-iqe-to-playwright-migration\` agent`;

    case 'obsolete':
      return `⚠️ **Potentially Obsolete**

This test may no longer be relevant. Run \`audit_test_coverage_and_relevance\` to confirm.

**Next Steps:**
1. Verify component still exists
2. Check if test selectors match current implementation
3. If obsolete, delete using \`hcc-frontend-dependency-cleanup-agent\``;

    default:
      return 'Review test manually to determine migration strategy';
  }
}
