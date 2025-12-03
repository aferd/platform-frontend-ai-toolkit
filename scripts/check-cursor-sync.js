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

    // Remove existing cursor rules
    const existingMdcFiles = fs.readdirSync(cursorRulesDir)
      .filter(file => file.endsWith('.mdc'));

    existingMdcFiles.forEach(file => {
      fs.unlinkSync(path.join(cursorRulesDir, file));
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

    // Check for git changes
    let finalStatus;
    try {
      finalStatus = execSync('git status --porcelain cursor/rules/', { encoding: 'utf8' });
    } catch (error) {
      console.log('✅ Cursor rules are in sync');
      return;
    }

    if (finalStatus.trim()) {
      console.error('❌ Cursor rules are out of sync with Claude agents!');
      console.error('\nFiles with changes:');
      console.error(finalStatus);
      console.error('\nFix: npm run convert-cursor && git add cursor/rules/');

      try {
        const diff = execSync('git diff cursor/rules/', { encoding: 'utf8' });
        if (diff.trim()) {
          console.error('\nDiff:');
          console.error(diff);
        }
      } catch (error) {
        // Ignore diff errors
      }

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