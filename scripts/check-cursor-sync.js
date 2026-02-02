#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Check if cursor rules are in sync with Claude agents
 * This script is used both in CI and can be run locally
 */

function main() {
  try {
    // Check if cursor/rules directory exists
    const cursorRulesDir = path.join(__dirname, '../cursor/rules');
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true });
    }

    // Count Claude agents
    const claudeAgentsDir = path.join(__dirname, '../claude/agents');
    const claudeAgents = fs.readdirSync(claudeAgentsDir)
      .filter(file => file.startsWith('hcc-frontend-') && file.endsWith('.md'));

    // Save current cursor rule contents before regeneration
    const existingMdcFiles = fs.readdirSync(cursorRulesDir)
      .filter(file => file.endsWith('.mdc'));

    const originalContents = new Map();
    existingMdcFiles.forEach(file => {
      const filePath = path.join(cursorRulesDir, file);
      originalContents.set(file, fs.readFileSync(filePath, 'utf8'));
    });

    // Regenerate cursor rules (silently)
    try {
      execSync('npm run convert-cursor', {
        stdio: 'pipe', // Hide output
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      console.error('❌ Failed to run conversion script:', error.message);
      process.exit(1);
    }

    // Count generated cursor rules
    const cursorRules = fs.readdirSync(cursorRulesDir)
      .filter(file => file.endsWith('.mdc'));

    // Check if counts match
    if (claudeAgents.length !== cursorRules.length) {
      console.error(`❌ Agent count mismatch! Claude: ${claudeAgents.length}, Cursor: ${cursorRules.length}`);
      process.exit(1);
    }

    // Compare regenerated files with original contents
    const changedFiles = [];
    const newFiles = [];
    const deletedFiles = [];

    // Check for modified or new files
    cursorRules.forEach(file => {
      const filePath = path.join(cursorRulesDir, file);
      const newContent = fs.readFileSync(filePath, 'utf8');

      if (originalContents.has(file)) {
        if (originalContents.get(file) !== newContent) {
          changedFiles.push(file);
        }
      } else {
        newFiles.push(file);
      }
    });

    // Check for deleted files
    originalContents.forEach((_, file) => {
      if (!cursorRules.includes(file)) {
        deletedFiles.push(file);
      }
    });

    // Report results
    if (changedFiles.length > 0 || newFiles.length > 0 || deletedFiles.length > 0) {
      console.error('❌ Cursor rules are out of sync with Claude agents!');
      console.error('\nRegenerating produced different files:');

      if (changedFiles.length > 0) {
        console.error(`\nModified files (${changedFiles.length}):`);
        changedFiles.forEach(f => console.error(`  - ${f}`));
      }

      if (newFiles.length > 0) {
        console.error(`\nNew files (${newFiles.length}):`);
        newFiles.forEach(f => console.error(`  - ${f}`));
      }

      if (deletedFiles.length > 0) {
        console.error(`\nDeleted files (${deletedFiles.length}):`);
        deletedFiles.forEach(f => console.error(`  - ${f}`));
      }

      console.error('\n💡 Fix: npm run convert-cursor');
      console.error('   Then stage the changes: git add cursor/rules/');

      process.exit(1);
    }

    console.log('✅ Cursor rules are in sync');

  } catch (error) {
    console.error('❌ Sync check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };