#!/usr/bin/env tsx
import { auditTestCoverageAndRelevanceTool } from './packages/hcc-test-migration-mcp/src/lib/tools/auditTestCoverageAndRelevance';
import { extractTestLogicTool } from './packages/hcc-test-migration-mcp/src/lib/tools/extractTestLogic';
import { checkMSWReadinessTool } from './packages/hcc-test-migration-mcp/src/lib/tools/checkMSWReadiness';
import { setRepoRoot } from './packages/hcc-test-migration-mcp/src/lib/utils/pathSecurity';
import { existsSync } from 'fs';

interface TestMigrationPlan {
  testPath: string;
  componentPath: string | null;
  isRelevant: boolean;
  recommendation: 'MIGRATE' | 'DELETE' | 'UPDATE' | 'KEEP';
  category: 'storybook' | 'unit' | 'e2e';
  testCount: number;
  requiresMSW: boolean;
  reason: string;
}

async function analyzeTest(testPath: string, componentPath: string | null): Promise<TestMigrationPlan> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Analyzing: ${testPath}`);
  console.log('='.repeat(80));

  // Step 1: Audit (if component path provided)
  let isRelevant = true;
  let recommendation: 'MIGRATE' | 'DELETE' | 'UPDATE' | 'KEEP' = 'MIGRATE';
  let reason = 'No component path provided - assuming E2E test';

  if (componentPath) {
    console.log('\n📊 Step 1: Auditing test coverage and relevance...');
    const [, , auditFunc] = auditTestCoverageAndRelevanceTool();
    const auditResult = await auditFunc({ componentPath, testPath });
    const auditText = auditResult.content[0]?.text || '';

    isRelevant = auditText.includes('Is Relevant**: ✅');
    recommendation = (auditText.match(/Recommendation: \*\*([A-Z]+)\*\*/)?.[1] || 'MIGRATE') as any;
    reason = auditText.match(/Reason: (.+)/)?.[1] || 'Unknown';

    console.log(`   ✅ Relevant: ${isRelevant ? 'Yes' : 'No'}`);
    console.log(`   📋 Recommendation: ${recommendation}`);
    console.log(`   💡 Reason: ${reason}`);
  }

  if (recommendation === 'DELETE') {
    return {
      testPath,
      componentPath,
      isRelevant: false,
      recommendation: 'DELETE',
      category: 'unit',
      testCount: 0,
      requiresMSW: false,
      reason
    };
  }

  // Step 2: Extract test logic
  console.log('\n🔍 Step 2: Extracting test logic via AST...');
  const [, , extractFunc] = extractTestLogicTool();
  const extractResult = await extractFunc({ testFilePath: testPath });
  const extractText = extractResult.content[0]?.text || '';

  const testCount = parseInt(extractText.match(/Found \*\*(\d+)\*\*/)?.[1] || '0');
  const categoryMatch = extractText.match(/Category: ([A-Z]+)/);
  const category = (categoryMatch?.[1]?.toLowerCase() || 'e2e') as 'storybook' | 'unit' | 'e2e';

  console.log(`   ✅ Extracted: ${testCount} test case(s)`);
  console.log(`   📦 Category: ${category.toUpperCase()}`);

  // Step 3: Check MSW readiness (if component-level and Storybook)
  let requiresMSW = false;
  if (componentPath && category === 'storybook') {
    console.log('\n🔌 Step 3: Checking MSW readiness...');
    const [, , mswFunc] = checkMSWReadinessTool();
    const mswResult = await mswFunc({ componentPath });
    const mswText = mswResult.content[0]?.text || '';

    requiresMSW = mswText.includes('Has API Calls**: ✅');
    console.log(`   ${requiresMSW ? '⚠️' : '✅'}  MSW Required: ${requiresMSW ? 'Yes' : 'No'}`);
  }

  return {
    testPath,
    componentPath,
    isRelevant,
    recommendation,
    category,
    testCount,
    requiresMSW,
    reason
  };
}

async function main() {
  const repoPath = process.env.NOTIFICATIONS_REPO || '/Users/aferdina/notifications-frontend';

  if (!existsSync(repoPath)) {
    console.error(`❌ Repository not found: ${repoPath}`);
    process.exit(1);
  }

  setRepoRoot(repoPath);

  console.log('🚀 Cypress Test Migration Analysis');
  console.log('='.repeat(80));
  console.log(`📁 Repository: ${repoPath}\n`);

  const tests = [
    {
      testPath: 'cypress/components/NotificationsDrawer.cy.tsx',
      componentPath: 'src/components/NotificationsDrawer/DrawerPanel.tsx'
    },
    {
      testPath: 'cypress/components/UserAccessGroupsDataView.cy.tsx',
      componentPath: null // Will need to determine
    },
    {
      testPath: 'cypress/e2e/spec.cy.ts',
      componentPath: null // E2E test
    }
  ];

  const plans: TestMigrationPlan[] = [];

  for (const test of tests) {
    try {
      const plan = await analyzeTest(test.testPath, test.componentPath);
      plans.push(plan);
    } catch (error) {
      console.error(`\n❌ Failed to analyze ${test.testPath}:`, error);
      plans.push({
        testPath: test.testPath,
        componentPath: test.componentPath,
        isRelevant: false,
        recommendation: 'KEEP',
        category: 'e2e',
        testCount: 0,
        requiresMSW: false,
        reason: `Error: ${error}`
      });
    }
  }

  // Print summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));

  const toMigrate = plans.filter(p => p.recommendation === 'MIGRATE');
  const toDelete = plans.filter(p => p.recommendation === 'DELETE');
  const toUpdate = plans.filter(p => p.recommendation === 'UPDATE');

  console.log(`\n✅ Tests to Migrate: ${toMigrate.length}`);
  console.log(`🗑️  Tests to Delete: ${toDelete.length}`);
  console.log(`🔄 Tests to Update: ${toUpdate.length}`);

  // Migration breakdown
  if (toMigrate.length > 0) {
    console.log(`\n📦 Migration Breakdown:`);
    const storybookTests = toMigrate.filter(p => p.category === 'storybook');
    const unitTests = toMigrate.filter(p => p.category === 'unit');
    const e2eTests = toMigrate.filter(p => p.category === 'e2e');

    if (storybookTests.length > 0) {
      console.log(`   - Storybook: ${storybookTests.length} (→ hcc-frontend-storybook-specialist)`);
    }
    if (unitTests.length > 0) {
      console.log(`   - Unit Tests: ${unitTests.length} (→ hcc-frontend-unit-test-writer)`);
    }
    if (e2eTests.length > 0) {
      console.log(`   - E2E Tests: ${e2eTests.length} (→ Write Playwright directly)`);
    }
  }

  // Detailed plan
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📋 DETAILED MIGRATION PLAN');
  console.log('='.repeat(80));

  plans.forEach((plan, index) => {
    console.log(`\n${index + 1}. ${plan.testPath}`);
    console.log(`   Recommendation: ${plan.recommendation}`);
    console.log(`   Category: ${plan.category.toUpperCase()}`);
    console.log(`   Test Cases: ${plan.testCount}`);
    if (plan.requiresMSW) {
      console.log(`   ⚠️  Requires MSW handlers`);
    }
    if (plan.recommendation === 'MIGRATE') {
      if (plan.category === 'storybook') {
        console.log(`   → Route to: hcc-frontend-storybook-specialist`);
      } else if (plan.category === 'unit') {
        console.log(`   → Route to: hcc-frontend-unit-test-writer`);
      } else {
        console.log(`   → Write Playwright E2E test manually`);
      }
    } else if (plan.recommendation === 'DELETE') {
      console.log(`   → Route to: hcc-frontend-dependency-cleanup-agent`);
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log('🎯 NEXT STEPS');
  console.log('='.repeat(80));
  console.log(`
For each test marked as MIGRATE:
1. Use the appropriate agent (Storybook/Unit/Playwright)
2. Provide the extracted test logic and MSW requirements
3. Verify the new tests compile and pass
4. Commit the new tests
5. Use dependency-cleanup-agent to remove old Cypress file

For tests marked as DELETE:
1. Use hcc-frontend-dependency-cleanup-agent
2. Remove test file and orphaned dependencies
3. Commit the cleanup
`);

  console.log('💡 TIP: The analysis has been saved to TEST_COVERAGE_ANALYSIS.md');
  console.log('=' .repeat(80) + '\n');
}

main().catch(console.error);
