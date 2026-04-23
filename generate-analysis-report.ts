#!/usr/bin/env tsx
import { analyzeRepoStructureTool } from './packages/hcc-test-migration-mcp/src/lib/tools/analyzeRepoStructure';
import { setRepoRoot } from './packages/hcc-test-migration-mcp/src/lib/utils/pathSecurity';
import { writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

async function generateAnalysisReport(repoPath: string) {
  console.log('🔍 Analyzing repository structure...\n');

  setRepoRoot(repoPath);

  // Run repository structure analysis
  const [, , analyzeFunc] = analyzeRepoStructureTool();
  const result = await analyzeFunc({
    sourcePath: 'src',
    includeNodeModules: false
  });

  // Find Cypress tests
  const findCypressTests = (dir: string): string[] => {
    const tests: string[] = [];
    try {
      const items = readdirSync(join(repoPath, dir), { withFileTypes: true });
      for (const item of items) {
        const relativePath = join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules') {
          tests.push(...findCypressTests(relativePath));
        } else if (item.isFile() && item.name.match(/\.cy\.(ts|tsx|js)$/)) {
          tests.push(relativePath);
        }
      }
    } catch (err) {
      // Directory doesn't exist or can't be read
    }
    return tests;
  };

  const cypressTests = findCypressTests('.');

  // Build comprehensive report
  const content = result.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected content type');
  }

  let report = `# Test Coverage Analysis - Notifications Frontend
Generated: ${new Date().toISOString()}

---

`;

  // Add Cypress tests section
  report += `## 🧪 Existing Cypress Tests (${cypressTests.length})\n\n`;
  if (cypressTests.length > 0) {
    report += '**Found Cypress tests that can be migrated:**\n\n';
    cypressTests.forEach(test => {
      report += `- \`${test}\`\n`;
    });
    report += '\n';
  } else {
    report += '_No Cypress tests found._\n\n';
  }

  report += '---\n\n';

  // Add important notes
  report += `## ⚠️ Important Notes\n\n`;
  report += `**Icon Components**: Icon components (e.g., \`*Icon.tsx\`) do NOT require tests. Icons are purely presentational and testing them provides minimal value. The analysis below may list icon components in coverage gaps - these can be safely ignored.\n\n`;
  report += `---\n\n`;

  // Add repository structure analysis
  report += content.text;

  // Save report
  const reportPath = join(repoPath, 'TEST_COVERAGE_ANALYSIS.md');
  writeFileSync(reportPath, report);

  console.log('✅ Analysis complete!\n');
  console.log(`📄 Report saved: ${reportPath}\n`);
  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY\n');

  // Extract summary from report
  const lines = content.text.split('\n');
  const summaryStart = lines.findIndex(l => l.includes('## Summary'));
  const summaryEnd = lines.findIndex((l, i) => i > summaryStart && l.startsWith('## '));
  const summary = lines.slice(summaryStart, summaryEnd).join('\n');
  console.log(summary);

  console.log('\n🧪 CYPRESS TESTS\n');
  console.log(`Found ${cypressTests.length} Cypress test file(s) ready for migration\n`);

  return {
    cypressTests,
    reportPath,
    summary: content.text
  };
}

const repoPath = process.env.NOTIFICATIONS_REPO || '/Users/aferdina/notifications-frontend';

if (!existsSync(repoPath)) {
  console.error(`❌ Repository not found: ${repoPath}`);
  process.exit(1);
}

generateAnalysisReport(repoPath)
  .then(({ cypressTests }) => {
    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 NEXT STEPS - What would you like to do?\n');

    if (cypressTests.length > 0) {
      console.log(`1️⃣  Migrate Existing Cypress Tests (${cypressTests.length} found)`);
      console.log('   → Convert legacy Cypress tests to modern Playwright/Storybook');
      console.log('   → Uses hcc-frontend-cypress-migration-specialist agent\n');
    }

    console.log('2️⃣  Build Tests for Coverage Gaps');
    console.log('   → Generate new tests for components missing coverage');
    console.log('   → Focus on high-priority components');
    console.log('   → Uses test generation agents (Storybook, Jest, Playwright)\n');

    console.log('📖 Review the full report: TEST_COVERAGE_ANALYSIS.md');
    console.log('=' .repeat(80) + '\n');
  })
  .catch(console.error);
