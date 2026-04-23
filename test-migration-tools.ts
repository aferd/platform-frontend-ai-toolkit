#!/usr/bin/env ts-node
/**
 * Test script for MCP Test Migration Tools
 * Demonstrates the tools working on real Cypress tests from notifications-frontend
 */

import { setRepoRoot } from './packages/hcc-test-migration-mcp/src/lib/utils/pathSecurity';
import { auditTestCoverageAndRelevanceTool } from './packages/hcc-test-migration-mcp/src/lib/tools/auditTestCoverageAndRelevance';
import { extractTestLogicTool } from './packages/hcc-test-migration-mcp/src/lib/tools/extractTestLogic';
import { checkMSWReadinessTool } from './packages/hcc-test-migration-mcp/src/lib/tools/checkMSWReadiness';
import { analyzeRepoStructureTool } from './packages/hcc-test-migration-mcp/src/lib/tools/analyzeRepoStructure';

async function main() {
  console.log('🧪 Testing MCP Migration Tools on notifications-frontend\n');
  console.log('='.repeat(80));

  // Set the repository root to notifications-frontend
  const notificationsRepo = process.env.NOTIFICATIONS_REPO || './notifications-frontend';
  setRepoRoot(notificationsRepo);
  console.log(`📁 Repository: ${notificationsRepo}\n`);

  // Test 1: Audit Test Coverage and Relevance
  console.log('\n📊 TEST 1: Audit Test Coverage and Relevance');
  console.log('-'.repeat(80));

  const [, , auditFunc] = auditTestCoverageAndRelevanceTool();

  try {
    const auditResult = await auditFunc({
      componentPath: 'src/components/NotificationsDrawer/DrawerPanel.tsx',
      testPath: 'cypress/components/NotificationsDrawer.cy.tsx'
    });

    console.log('✅ Audit completed successfully');
    console.log('\nResult:');
    if (auditResult.content && auditResult.content.length > 0) {
      const content = auditResult.content[0];
      if (content.type === 'text') {
        console.log(content.text);
      }
    } else {
      console.log('⚠️  No content returned');
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }

  // Test 2: Extract Test Logic via AST
  console.log('\n\n🔍 TEST 2: Extract Test Logic (AST Parsing)');
  console.log('-'.repeat(80));

  const [, , extractFunc] = extractTestLogicTool();

  try {
    const extractResult = await extractFunc({
      testFilePath: 'cypress/components/NotificationsDrawer.cy.tsx'
    });

    console.log('✅ Test logic extraction completed');
    console.log('\nResult (first 2000 chars):');
    if (extractResult.content && extractResult.content.length > 0) {
      const content = extractResult.content[0];
      if (content.type === 'text') {
        const text = content.text;
        console.log(text.substring(0, 2000));
        if (text.length > 2000) {
          console.log(`\n... (${text.length - 2000} more characters)`);
        }
      }
    } else {
      console.log('⚠️  No content returned');
    }
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  }

  // Test 3: Check MSW Readiness
  console.log('\n\n🔌 TEST 3: Check MSW Readiness');
  console.log('-'.repeat(80));

  const [, , mswFunc] = checkMSWReadinessTool();

  try {
    const mswResult = await mswFunc({
      componentPath: 'src/components/NotificationsDrawer/DrawerPanel.tsx'
    });

    console.log('✅ MSW readiness check completed');
    console.log('\nResult:');
    if (mswResult.content && mswResult.content.length > 0) {
      const content = mswResult.content[0];
      if (content.type === 'text') {
        console.log(content.text);
      }
    } else {
      console.log('⚠️  No content returned');
    }
  } catch (error) {
    console.error('❌ MSW check failed:', error);
  }

  // Test 4: Analyze Repository Structure
  console.log('\n\n🗂️  TEST 4: Analyze Repository Structure');
  console.log('-'.repeat(80));

  const [, , analyzeFunc] = analyzeRepoStructureTool();

  try {
    const analyzeResult = await analyzeFunc({
      sourcePath: 'src',
      includeNodeModules: false
    });

    console.log('✅ Repository analysis completed');
    console.log('\nResult (first 3000 chars):');
    if (analyzeResult.content && analyzeResult.content.length > 0) {
      const content = analyzeResult.content[0];
      if (content.type === 'text') {
        const text = content.text;
        console.log(text.substring(0, 3000));
        if (text.length > 3000) {
          console.log(`\n... (${text.length - 3000} more characters)`);
        }
      }
    } else {
      console.log('⚠️  No content returned');
    }
  } catch (error) {
    console.error('❌ Repository analysis failed:', error);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✨ Test suite completed!');
}

main().catch(console.error);
