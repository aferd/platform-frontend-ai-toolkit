import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'path';
import { McpTool, ComponentInfo, TestInfo, CoverageGap } from '../types.js';
import { safeReadDir, safeExists, safeStat, getRepoRoot } from '../utils/pathSecurity.js';

const AnalyzeInputSchema = z.object({
  sourcePath: z.string().default('src').describe('Source directory to analyze (default: src)'),
  includeNodeModules: z.boolean().default(false).describe('Include node_modules in analysis'),
});

export function analyzeRepoStructureTool(): McpTool {
  async function tool(args: any): Promise<CallToolResult> {
    try {
      const input = AnalyzeInputSchema.parse(args);

      const repoRoot = getRepoRoot();
      const sourcePath = path.join(repoRoot, input.sourcePath);

      if (!safeExists(sourcePath)) {
        throw new Error(`Source path does not exist: ${input.sourcePath}`);
      }

      // Scan for components and tests
      const components: ComponentInfo[] = [];
      const tests: TestInfo[] = [];

      scanDirectory(sourcePath, components, tests, input.includeNodeModules);

      // Identify coverage gaps
      const gaps = identifyCoverageGaps(components);

      // Generate report
      const totalComponents = components.length;
      const componentsWithJest = components.filter(c => c.hasTests.jest).length;
      const componentsWithStorybook = components.filter(c => c.hasTests.storybook).length;
      const componentsWithPlaywright = components.filter(c => c.hasTests.playwright).length;
      const componentsWithCypress = components.filter(c => c.hasTests.cypress).length;
      const componentsWithNoTests = components.filter(c =>
        !c.hasTests.jest && !c.hasTests.storybook && !c.hasTests.playwright && !c.hasTests.cypress
      ).length;

      const highPriorityGaps = gaps.filter(g => g.priority === 'high');
      const mediumPriorityGaps = gaps.filter(g => g.priority === 'medium');
      const lowPriorityGaps = gaps.filter(g => g.priority === 'low');

      return {
        content: [
          {
            type: 'text',
            text: `# Repository Structure Analysis

## Summary

- **Total Components**: ${totalComponents}
- **Components with Tests**: ${totalComponents - componentsWithNoTests} (${((totalComponents - componentsWithNoTests) / totalComponents * 100).toFixed(1)}%)
- **Components without Tests**: ${componentsWithNoTests} (${(componentsWithNoTests / totalComponents * 100).toFixed(1)}%)

## Test Coverage by Type

- **Jest Unit Tests**: ${componentsWithJest} (${(componentsWithJest / totalComponents * 100).toFixed(1)}%)
- **Storybook Stories**: ${componentsWithStorybook} (${(componentsWithStorybook / totalComponents * 100).toFixed(1)}%)
- **Playwright E2E**: ${componentsWithPlaywright} (${(componentsWithPlaywright / totalComponents * 100).toFixed(1)}%)
- **Cypress (Legacy)**: ${componentsWithCypress} (${(componentsWithCypress / totalComponents * 100).toFixed(1)}%)

## Coverage Gaps

### High Priority (${highPriorityGaps.length})
${highPriorityGaps.length > 0 ? highPriorityGaps.map(g =>
  `- **${g.component}**: Missing ${g.missingTests.join(', ')}`
).join('\n') : '_No high priority gaps_'}

### Medium Priority (${mediumPriorityGaps.length})
${mediumPriorityGaps.length > 0 ? mediumPriorityGaps.slice(0, 10).map(g =>
  `- **${g.component}**: Missing ${g.missingTests.join(', ')}`
).join('\n') : '_No medium priority gaps_'}
${mediumPriorityGaps.length > 10 ? `\n_...and ${mediumPriorityGaps.length - 10} more_` : ''}

### Low Priority (${lowPriorityGaps.length})
${lowPriorityGaps.length > 0 ? `_${lowPriorityGaps.length} components with minor coverage gaps_` : '_No low priority gaps_'}

## Legacy Cypress Tests

Found **${tests.filter(t => t.type === 'cypress').length}** Cypress test files that should be migrated:

${tests.filter(t => t.type === 'cypress').slice(0, 15).map(t =>
  `- ${t.path}${t.component ? ` → tests **${t.component}**` : ''}`
).join('\n')}
${tests.filter(t => t.type === 'cypress').length > 15 ? `\n_...and ${tests.filter(t => t.type === 'cypress').length - 15} more_` : ''}

## Recommendations

1. **Migrate Cypress Tests**: ${componentsWithCypress} components have legacy Cypress tests that should be converted
2. **Add Storybook Stories**: ${totalComponents - componentsWithStorybook} components lack component-level tests
3. **Add Unit Tests**: ${totalComponents - componentsWithJest} components lack unit test coverage
4. **Prioritize High-Value Components**: Focus on ${highPriorityGaps.length} high-priority components first

## Detailed Component List

${components.slice(0, 20).map(c => `
### ${c.name}
- **Path**: ${c.path}
- **Jest**: ${c.hasTests.jest ? '✅' : '❌'}
- **Storybook**: ${c.hasTests.storybook ? '✅' : '❌'}
- **Playwright**: ${c.hasTests.playwright ? '✅' : '❌'}
- **Cypress**: ${c.hasTests.cypress ? '✅' : '❌'}
`).join('\n')}
${components.length > 20 ? `\n_...and ${components.length - 20} more components_` : ''}`,
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
        `Error analyzing repository structure: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return [
    'analyze_repo_structure',
    {
      description: 'Maps components against existing test coverage (Jest, Storybook, Playwright, Cypress) to identify coverage gaps and prioritize migration work',
      inputSchema: AnalyzeInputSchema.shape,
    },
    tool
  ];
}

/**
 * Recursively scan directory for components and tests
 */
function scanDirectory(
  dirPath: string,
  components: ComponentInfo[],
  tests: TestInfo[],
  includeNodeModules: boolean,
  depth: number = 0
): void {
  // Prevent infinite recursion
  if (depth > 20) return;

  // Skip node_modules unless explicitly included
  if (!includeNodeModules && dirPath.includes('node_modules')) return;

  // Skip common non-source directories
  if (dirPath.match(/\/(dist|build|coverage|\.git|\.next)\//)) return;

  try {
    const entries = safeReadDir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);

      try {
        const stats = safeStat(fullPath);

        if (stats.isDirectory()) {
          scanDirectory(fullPath, components, tests, includeNodeModules, depth + 1);
        } else if (stats.isFile()) {
          processFile(fullPath, components, tests);
        }
      } catch (error) {
        // Skip files we can't access
        continue;
      }
    }
  } catch (error) {
    // Skip directories we can't access
    return;
  }
}

/**
 * Process a file and categorize it
 */
function processFile(filePath: string, components: ComponentInfo[], tests: TestInfo[]): void {
  const relativePath = path.relative(getRepoRoot(), filePath);

  // Skip Python/IQE files
  if (filePath.endsWith('.py') || filePath.includes('/iqe/')) {
    return;
  }

  // Test files
  if (filePath.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
    const testType = filePath.includes('playwright') || filePath.match(/\.spec\.(ts|tsx)$/)
      ? 'playwright'
      : 'jest';

    tests.push({
      path: relativePath,
      type: testType,
      component: guessComponentPath(filePath),
    });

    // Mark component as having tests
    markComponentWithTest(components, filePath, testType);
    return;
  }

  // Storybook files
  if (filePath.match(/\.stories\.(ts|tsx|js|jsx)$/)) {
    tests.push({
      path: relativePath,
      type: 'storybook',
      component: guessComponentPath(filePath),
    });

    markComponentWithTest(components, filePath, 'storybook');
    return;
  }

  // Cypress files
  if (filePath.match(/\.cy\.(ts|tsx|js|jsx)$/) || filePath.includes('/cypress/')) {
    tests.push({
      path: relativePath,
      type: 'cypress',
      component: guessComponentPath(filePath),
    });

    markComponentWithTest(components, filePath, 'cypress');
    return;
  }

  // Component files (React/TypeScript)
  if (filePath.match(/\.(tsx|jsx)$/) && !filePath.match(/\.(test|spec|stories|cy)\./)) {
    const componentName = path.basename(filePath, path.extname(filePath));

    components.push({
      path: relativePath,
      name: componentName,
      hasTests: {
        jest: false,
        storybook: false,
        playwright: false,
        cypress: false,
      },
    });
  }
}

/**
 * Mark a component as having a specific type of test
 */
function markComponentWithTest(
  components: ComponentInfo[],
  testPath: string,
  testType: 'jest' | 'storybook' | 'playwright' | 'cypress'
): void {
  const componentPath = guessComponentPath(testPath);
  if (!componentPath) return;

  const component = components.find(c => c.path.includes(componentPath));
  if (component) {
    component.hasTests[testType] = true;
  }
}

/**
 * Guess the component path from a test file path
 */
function guessComponentPath(testPath: string): string | undefined {
  // Remove test extensions
  const cleaned = testPath
    .replace(/\.(test|spec|stories|cy)\.(ts|tsx|js|jsx)$/, '')
    .replace(/\.tsx$/, '')
    .replace(/\.jsx$/, '')
    .replace(/\.ts$/, '')
    .replace(/\.js$/, '');

  const basename = path.basename(cleaned);

  return basename || undefined;
}

/**
 * Identify coverage gaps and prioritize them
 */
function identifyCoverageGaps(components: ComponentInfo[]): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const component of components) {
    const missingTests: ('jest' | 'storybook' | 'playwright')[] = [];

    // Check for missing test types
    if (!component.hasTests.jest) missingTests.push('jest');
    if (!component.hasTests.storybook) missingTests.push('storybook');

    if (missingTests.length === 0) continue;

    // Prioritize based on component type and location
    const priority = calculatePriority(component, missingTests);

    gaps.push({
      component: component.name,
      missingTests,
      priority,
    });
  }

  // Sort by priority
  return gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate gap priority based on component characteristics
 */
function calculatePriority(
  component: ComponentInfo,
  missingTests: string[]
): 'high' | 'medium' | 'low' {
  // High priority: components in critical paths or with legacy Cypress tests
  if (component.hasTests.cypress) return 'high';
  if (component.path.includes('/components/') && missingTests.length >= 2) return 'high';

  // Medium priority: shared components or missing multiple test types
  if (component.path.includes('/shared/') || component.path.includes('/common/')) return 'medium';
  if (missingTests.length >= 2) return 'medium';

  // Low priority: everything else
  return 'low';
}
