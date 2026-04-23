#!/usr/bin/env tsx
import { analyzeRepoStructureTool } from './packages/hcc-test-migration-mcp/src/lib/tools/analyzeRepoStructure';
import { setRepoRoot } from './packages/hcc-test-migration-mcp/src/lib/utils/pathSecurity';
import { existsSync } from 'fs';

interface ComponentGap {
  path: string;
  name: string;
  missingTests: ('jest' | 'storybook' | 'playwright')[];
  priority: 'high' | 'medium' | 'low';
}

async function buildTestGaps(repoPath: string, options: { priority?: string; type?: string; interactive?: boolean }) {
  console.log('🔨 Building Test Coverage for Gaps\n');

  setRepoRoot(repoPath);

  // Run analysis to get current gaps
  const [, , analyzeFunc] = analyzeRepoStructureTool();
  const result = await analyzeFunc({
    sourcePath: 'src',
    includeNodeModules: false
  });

  const content = result.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected content type');
  }

  const analysisText = content.text;

  // Parse coverage gaps from the report
  const gaps = parseGapsFromReport(analysisText);

  if (gaps.length === 0) {
    console.log('✅ No test coverage gaps found! All components have tests.\n');
    return;
  }

  console.log(`📊 Found ${gaps.length} component(s) with missing test coverage\n`);

  // Filter by priority if specified
  let filteredGaps = gaps;
  if (options.priority) {
    filteredGaps = gaps.filter(g => g.priority === options.priority);
    console.log(`🎯 Filtering to ${options.priority} priority: ${filteredGaps.length} component(s)\n`);
  }

  // Filter by test type if specified
  if (options.type) {
    const testType = options.type as 'jest' | 'storybook' | 'playwright';
    filteredGaps = filteredGaps.filter(g => g.missingTests.includes(testType));
    console.log(`🎯 Filtering to missing ${testType} tests: ${filteredGaps.length} component(s)\n`);
  }

  if (filteredGaps.length === 0) {
    console.log('⚠️  No components match the specified filters.\n');
    return;
  }

  // Group by test type needed
  const byTestType = {
    storybook: filteredGaps.filter(g => g.missingTests.includes('storybook')),
    jest: filteredGaps.filter(g => g.missingTests.includes('jest')),
    playwright: filteredGaps.filter(g => g.missingTests.includes('playwright')),
  };

  // Display summary
  console.log('📋 Coverage Gaps Summary:\n');

  if (byTestType.storybook.length > 0) {
    console.log(`  🎨 Storybook Stories Needed (${byTestType.storybook.length} components):`);
    byTestType.storybook.slice(0, 10).forEach(gap => {
      console.log(`     - ${gap.path} (${gap.priority} priority)`);
    });
    if (byTestType.storybook.length > 10) {
      console.log(`     ... and ${byTestType.storybook.length - 10} more`);
    }
    console.log();
  }

  if (byTestType.jest.length > 0) {
    console.log(`  🧪 Jest Unit Tests Needed (${byTestType.jest.length} components):`);
    byTestType.jest.slice(0, 10).forEach(gap => {
      console.log(`     - ${gap.path} (${gap.priority} priority)`);
    });
    if (byTestType.jest.length > 10) {
      console.log(`     ... and ${byTestType.jest.length - 10} more`);
    }
    console.log();
  }

  if (byTestType.playwright.length > 0) {
    console.log(`  🎭 Playwright E2E Tests Needed (${byTestType.playwright.length} components):`);
    byTestType.playwright.slice(0, 10).forEach(gap => {
      console.log(`     - ${gap.path} (${gap.priority} priority)`);
    });
    if (byTestType.playwright.length > 10) {
      console.log(`     ... and ${byTestType.playwright.length - 10} more`);
    }
    console.log();
  }

  // Generate action plan
  console.log('=' .repeat(80));
  console.log('🚀 RECOMMENDED ACTIONS\n');

  if (byTestType.storybook.length > 0) {
    console.log('1️⃣  Generate Storybook Stories:');
    console.log('   → Use the hcc-frontend-storybook-specialist agent');
    console.log('   → Components to prioritize:');
    byTestType.storybook
      .filter(g => g.priority === 'high')
      .slice(0, 5)
      .forEach(gap => {
        console.log(`      • ${gap.path}`);
      });
    console.log();
  }

  if (byTestType.jest.length > 0) {
    console.log('2️⃣  Generate Jest Unit Tests:');
    console.log('   → Use the hcc-frontend-unit-test-writer agent');
    console.log('   → Components to prioritize:');
    byTestType.jest
      .filter(g => g.priority === 'high')
      .slice(0, 5)
      .forEach(gap => {
        console.log(`      • ${gap.path}`);
      });
    console.log();
  }

  if (byTestType.playwright.length > 0) {
    console.log('3️⃣  Generate Playwright E2E Tests:');
    console.log('   → Write Playwright tests manually or use templates');
    console.log('   → User flows to prioritize:');
    byTestType.playwright
      .filter(g => g.priority === 'high')
      .slice(0, 5)
      .forEach(gap => {
        console.log(`      • ${gap.path}`);
      });
    console.log();
  }

  // Output detailed list for Claude Code agents
  console.log('=' .repeat(80));
  console.log('📝 DETAILED COMPONENT LIST (for agent use)\n');
  console.log('High priority components missing tests:\n');

  filteredGaps
    .filter(g => g.priority === 'high')
    .forEach(gap => {
      console.log(`Component: ${gap.path}`);
      console.log(`  Missing: ${gap.missingTests.join(', ')}`);
      console.log(`  Priority: ${gap.priority}`);
      console.log();
    });

  console.log('=' .repeat(80));
  console.log('💡 USAGE TIPS\n');
  console.log('Filter by priority:');
  console.log(`  tsx build-test-gaps.ts ${repoPath} --priority=high`);
  console.log();
  console.log('Filter by test type:');
  console.log(`  tsx build-test-gaps.ts ${repoPath} --type=storybook`);
  console.log(`  tsx build-test-gaps.ts ${repoPath} --type=jest`);
  console.log();
  console.log('Combine filters:');
  console.log(`  tsx build-test-gaps.ts ${repoPath} --priority=high --type=storybook`);
  console.log();
}

/**
 * Parse coverage gaps from the analysis report
 */
function parseGapsFromReport(reportText: string): ComponentGap[] {
  const gaps: ComponentGap[] = [];

  // Find the coverage gaps section
  const gapsSection = reportText.match(/## Coverage Gaps[\s\S]*?(?=##|$)/);
  if (!gapsSection) {
    return gaps;
  }

  const sectionText = gapsSection[0];

  // Parse high priority gaps
  const highPriorityMatch = sectionText.match(/### High Priority[\s\S]*?(?=###|$)/);
  if (highPriorityMatch) {
    parseGapLines(highPriorityMatch[0], 'high', gaps);
  }

  // Parse medium priority gaps
  const mediumPriorityMatch = sectionText.match(/### Medium Priority[\s\S]*?(?=###|$)/);
  if (mediumPriorityMatch) {
    parseGapLines(mediumPriorityMatch[0], 'medium', gaps);
  }

  // Parse low priority gaps
  const lowPriorityMatch = sectionText.match(/### Low Priority[\s\S]*?(?=###|$)/);
  if (lowPriorityMatch) {
    parseGapLines(lowPriorityMatch[0], 'low', gaps);
  }

  return gaps;
}

/**
 * Parse individual gap lines from a priority section
 */
function parseGapLines(sectionText: string, priority: 'high' | 'medium' | 'low', gaps: ComponentGap[]) {
  // Match lines like: - `src/components/Foo.tsx` - Missing: Jest, Storybook
  const regex = /- `(.+?)` - Missing: (.+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sectionText)) !== null) {
    const path = match[1];
    const missingStr = match[2];

    const missingTests: ('jest' | 'storybook' | 'playwright')[] = [];
    if (missingStr.toLowerCase().includes('jest')) missingTests.push('jest');
    if (missingStr.toLowerCase().includes('storybook')) missingTests.push('storybook');
    if (missingStr.toLowerCase().includes('playwright')) missingTests.push('playwright');

    const name = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || path;

    gaps.push({
      path,
      name,
      missingTests,
      priority
    });
  }
}

// Main execution
const repoPath = process.argv[2] || process.env.TARGET_REPO || process.cwd();

if (!existsSync(repoPath)) {
  console.error(`❌ Repository not found: ${repoPath}`);
  console.error(`\nUsage: tsx build-test-gaps.ts [repository-path] [options]`);
  console.error(`   or: TARGET_REPO=/path/to/repo tsx build-test-gaps.ts [options]`);
  console.error(`\nOptions:`);
  console.error(`  --priority=<high|medium|low>  Filter by priority`);
  console.error(`  --type=<storybook|jest|playwright>  Filter by test type`);
  process.exit(1);
}

// Parse options
const options: { priority?: string; type?: string; interactive?: boolean } = {};

process.argv.slice(3).forEach(arg => {
  if (arg.startsWith('--priority=')) {
    options.priority = arg.split('=')[1];
  } else if (arg.startsWith('--type=')) {
    options.type = arg.split('=')[1];
  } else if (arg === '--interactive') {
    options.interactive = true;
  }
});

buildTestGaps(repoPath, options)
  .then(() => {
    console.log('✅ Analysis complete!\n');
  })
  .catch(console.error);
