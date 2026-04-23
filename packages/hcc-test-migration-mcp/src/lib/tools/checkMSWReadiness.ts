import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as ts from 'typescript';
import { McpTool, MSWReadiness, ApiCallInfo, MSWHandler } from '../types.js';
import { safeReadFile, safeExists } from '../utils/pathSecurity.js';

const CheckMSWInputSchema = z.object({
  componentPath: z.string().describe('Path to the component file to check for API calls'),
  storybookConfigPath: z.string().optional().describe('Path to Storybook config to check for MSW setup'),
});

export function checkMSWReadinessTool(): McpTool {
  async function tool(args: any): Promise<CallToolResult> {
    try {
      const input = CheckMSWInputSchema.parse(args);

      if (!safeExists(input.componentPath)) {
        throw new Error(`Component file does not exist: ${input.componentPath}`);
      }

      // Read component code
      const componentCode = safeReadFile(input.componentPath);

      // Parse component for API calls
      const apiCalls = extractApiCalls(componentCode, input.componentPath);

      // Check if MSW is set up in Storybook
      let hasMSWSetup = false;
      if (input.storybookConfigPath && safeExists(input.storybookConfigPath)) {
        const storybookConfig = safeReadFile(input.storybookConfigPath);
        hasMSWSetup = checkMSWSetup(storybookConfig);
      }

      // Generate MSW handler recommendations
      const requiredHandlers = generateHandlerRecommendations(apiCalls);

      const result: MSWReadiness = {
        componentPath: input.componentPath,
        hasApiCalls: apiCalls.length > 0,
        apiCalls,
        hasMSWSetup,
        recommendation: generateRecommendation(apiCalls, hasMSWSetup),
        requiredHandlers,
      };

      return {
        content: [
          {
            type: 'text',
            text: `# MSW Readiness Check

## Component Analysis
- **Path**: ${input.componentPath}
- **Has API Calls**: ${result.hasApiCalls ? '⚠️ Yes' : '✅ No'}
- **API Calls Found**: ${apiCalls.length}

## MSW Setup Status
- **MSW Configured**: ${hasMSWSetup ? '✅ Yes' : '❌ No'}
${input.storybookConfigPath ? `- **Config Path**: ${input.storybookConfigPath}` : '- **Config Path**: Not provided'}

## Recommendation
${result.recommendation}

${apiCalls.length > 0 ? `
## API Calls Detected

${apiCalls.map(call => `
### ${call.type.toUpperCase()} - Line ${call.lineNumber}
- **Method**: ${call.method}
- **URL**: ${call.url || 'Dynamic/Unknown'}
\`\`\`typescript
${call.code}
\`\`\`
`).join('\n')}

## Required MSW Handlers

${requiredHandlers.length > 0 ? requiredHandlers.map(handler => `
### ${handler.method} ${handler.url}
\`\`\`typescript
import { http, HttpResponse } from 'msw';

export const ${generateHandlerName(handler)} = http.${handler.method.toLowerCase()}('${handler.url}', () => {
  return HttpResponse.json(${JSON.stringify(handler.suggestedResponse, null, 2)});
});
\`\`\`
`).join('\n') : '_No handlers needed (no API calls detected)_'}
` : ''}

## Next Steps

${generateNextSteps(result)}`,
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
        `Error checking MSW readiness: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return [
    'check_msw_readiness',
    {
      description: 'Scans component files for API calls (fetch, axios, cy.intercept) and checks if Mock Service Worker (MSW) is configured for Storybook. Provides MSW handler recommendations.',
      inputSchema: CheckMSWInputSchema.shape,
    },
    tool
  ];
}

/**
 * Extract API calls from component code
 */
function extractApiCalls(code: string, filePath: string): ApiCallInfo[] {
  const apiCalls: ApiCallInfo[] = [];

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node) {
    // Check for fetch() calls
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (ts.isIdentifier(expression) && expression.text === 'fetch') {
        const url = extractUrlFromFetch(node);
        const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        apiCalls.push({
          type: 'fetch',
          url: url || 'dynamic',
          method: extractMethodFromFetchOptions(node) || 'GET',
          lineNumber,
          code: node.getText(),
        });
      }

      // Check for axios calls
      if (ts.isPropertyAccessExpression(expression)) {
        const obj = expression.expression;
        const method = expression.name.text;

        if (ts.isIdentifier(obj) && obj.text === 'axios') {
          const url = extractFirstStringArg(node);
          const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

          apiCalls.push({
            type: 'axios',
            url: url || 'dynamic',
            method: method.toUpperCase(),
            lineNumber,
            code: node.getText(),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Also check for cy.intercept in Cypress tests
  const cypressIntercepts = extractCypressIntercepts(code, sourceFile);
  apiCalls.push(...cypressIntercepts);

  return apiCalls;
}

/**
 * Extract URL from fetch call
 */
function extractUrlFromFetch(node: ts.CallExpression): string | undefined {
  if (node.arguments.length > 0) {
    const firstArg = node.arguments[0];

    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }

    if (ts.isTemplateExpression(firstArg)) {
      // Template literal - extract static parts
      return firstArg.head.text + '...';
    }
  }

  return undefined;
}

/**
 * Extract HTTP method from fetch options
 */
function extractMethodFromFetchOptions(node: ts.CallExpression): string | undefined {
  if (node.arguments.length > 1) {
    const options = node.arguments[1];

    if (ts.isObjectLiteralExpression(options)) {
      for (const prop of options.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name;

          if (ts.isIdentifier(name) && name.text === 'method') {
            if (ts.isStringLiteral(prop.initializer)) {
              return prop.initializer.text;
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract first string argument from call expression
 */
function extractFirstStringArg(node: ts.CallExpression): string | undefined {
  if (node.arguments.length > 0) {
    const arg = node.arguments[0];

    if (ts.isStringLiteral(arg)) {
      return arg.text;
    }
  }

  return undefined;
}

/**
 * Extract cy.intercept calls from Cypress tests
 */
function extractCypressIntercepts(code: string, sourceFile: ts.SourceFile): ApiCallInfo[] {
  const intercepts: ApiCallInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (ts.isPropertyAccessExpression(expression)) {
        if (expression.name.text === 'intercept') {
          let method = 'GET';
          let url = 'dynamic';

          // cy.intercept can be: cy.intercept(url), cy.intercept(method, url), or cy.intercept(routeMatcher)
          if (node.arguments.length === 1) {
            const arg = node.arguments[0];
            if (ts.isStringLiteral(arg)) {
              url = arg.text;
            } else if (ts.isObjectLiteralExpression(arg)) {
              // routeMatcher object - try to extract url property
              const urlProp = arg.properties.find(
                p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'url'
              );
              if (urlProp && ts.isPropertyAssignment(urlProp) && ts.isStringLiteral(urlProp.initializer)) {
                url = urlProp.initializer.text;
              }
            }
          } else if (node.arguments.length >= 2) {
            const firstArg = extractFirstStringArg(node);
            if (firstArg && ts.isStringLiteral(node.arguments[1])) {
              method = firstArg;
              url = node.arguments[1].text;
            } else if (ts.isStringLiteral(node.arguments[0])) {
              url = node.arguments[0].text;
            }
          }

          const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

          intercepts.push({
            type: 'cy.intercept',
            url,
            method: method.toUpperCase(),
            lineNumber,
            code: node.getText(),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return intercepts;
}

/**
 * Check if MSW is set up in Storybook config
 */
function checkMSWSetup(storybookConfig: string): boolean {
  // Check for MSW imports or setup
  return (
    storybookConfig.includes('msw') ||
    storybookConfig.includes('Mock Service Worker') ||
    storybookConfig.includes('initialize') ||
    storybookConfig.includes('mswDecorator')
  );
}

/**
 * Generate MSW handler recommendations
 */
function generateHandlerRecommendations(apiCalls: ApiCallInfo[]): MSWHandler[] {
  const handlers: MSWHandler[] = [];

  // Group by URL and method
  const uniqueCalls = new Map<string, ApiCallInfo>();

  for (const call of apiCalls) {
    const key = `${call.method}:${call.url}`;

    if (!uniqueCalls.has(key)) {
      uniqueCalls.set(key, call);
    }
  }

  // Generate handlers
  for (const call of uniqueCalls.values()) {
    handlers.push({
      method: call.method,
      url: call.url,
      suggestedResponse: generateMockResponse(call),
    });
  }

  return handlers;
}

/**
 * Generate mock response based on API call
 */
function generateMockResponse(call: ApiCallInfo): any {
  // Generate appropriate mock based on URL patterns
  if (call.url.includes('user')) {
    return { id: 1, name: 'Test User', email: 'test@example.com' };
  }

  if (call.url.includes('list') || call.url.includes('items')) {
    return [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
  }

  return { success: true, data: {} };
}

/**
 * Generate handler function name
 */
function generateHandlerName(handler: MSWHandler): string {
  let urlPart = handler.url
    .replace(/^\/api\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!urlPart) {
    urlPart = 'Root';
  }

  const methodPart = handler.method.charAt(0).toUpperCase() + handler.method.slice(1).toLowerCase();
  return `handle${methodPart}${urlPart}`;
}

/**
 * Generate recommendation text
 */
function generateRecommendation(apiCalls: ApiCallInfo[], hasMSWSetup: boolean): string {
  if (apiCalls.length === 0) {
    return '✅ **No API calls detected** - Component does not make API calls. No MSW setup needed.';
  }

  if (hasMSWSetup) {
    return `⚠️ **MSW Already Configured** - Component makes ${apiCalls.length} API call(s). MSW is already set up. Add handlers for the detected endpoints.`;
  }

  return `❌ **MSW Setup Required** - Component makes ${apiCalls.length} API call(s) but MSW is not configured. Set up MSW before creating Storybook stories.`;
}

/**
 * Generate next steps
 */
function generateNextSteps(result: MSWReadiness): string {
  if (!result.hasApiCalls) {
    return `1. ✅ Component is ready for Storybook
2. Create \`.stories.tsx\` file without MSW setup
3. Use \`hcc-frontend-storybook-specialist\` agent`;
  }

  if (result.hasMSWSetup) {
    return `1. Add the MSW handlers shown above to your story
2. Include handlers in story parameters: \`parameters: { msw: { handlers } }\`
3. Test that mocked responses work correctly
4. Use \`hcc-frontend-storybook-specialist\` agent for story creation`;
  }

  return `1. ❌ **Set up MSW first** - Follow Storybook MSW integration guide
2. Add MSW decorator to \`.storybook/preview.tsx\`
3. Then add the handlers shown above
4. Use \`hcc-frontend-storybook-specialist\` agent for story creation`;
}
