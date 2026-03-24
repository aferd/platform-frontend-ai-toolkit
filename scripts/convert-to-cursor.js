#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Convert Claude agents to Cursor .mdc format
 */

// Mapping agent types to file globs
const AGENT_GLOBS = {
  'typescript': '**/*.{ts,tsx}',
  'patternfly': '**/*.{jsx,tsx,js,ts}',
  'storybook': '**/*.{stories.ts,stories.tsx,stories.js}',
  'unit-test': '**/*.{test.ts,spec.ts,test.js,spec.js}',
  'code-quality': '**/*.{ts,tsx,js,jsx}',
  'dependency-cleanup': '**/*.{ts,tsx,js,jsx,json}',
  'css-utility': '**/*.{tsx,jsx,css,scss}',
  'dataview': '**/*.{tsx,jsx}',
  'component-builder': '**/*.{tsx,jsx}',
  'hello-world': '**/*',
  'db-upgrade': '**/*.{yml,yaml}',
  'infrastructure': '**/*.{yml,yaml,tf,json}'
};

function determineGlobs(agentName, capabilities = []) {
  // Extract agent type from name
  const name = agentName.toLowerCase();

  if (name.includes('typescript')) return AGENT_GLOBS.typescript;
  if (name.includes('storybook-configurator') || name.includes('storybook-config')) return '**/.storybook/**,**/package.json,**/.github/workflows/chromatic*.yml';
  if (name.includes('storybook')) return AGENT_GLOBS.storybook;
  if (name.includes('unit-test') || name.includes('test-writer')) return AGENT_GLOBS['unit-test'];
  if (name.includes('code-quality') || name.includes('scanner')) return AGENT_GLOBS['code-quality'];
  if (name.includes('dependency-cleanup')) return AGENT_GLOBS['dependency-cleanup'];
  if (name.includes('css-utility')) return AGENT_GLOBS['css-utility'];
  if (name.includes('dataview')) return AGENT_GLOBS.dataview;
  if (name.includes('component-builder') || name.includes('patternfly')) return AGENT_GLOBS['component-builder'];
  if (name.includes('hello-world')) return AGENT_GLOBS['hello-world'];
  if (['db-upgrade', 'infra', 'konflux'].some(t => name.includes(t))) return AGENT_GLOBS['db-upgrade'];

  // Default for frontend agents
  return AGENT_GLOBS.patternfly;
}

function extractFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('No frontmatter found');
  }

  const frontmatterText = match[1];
  const markdownContent = match[2];

  // Parse frontmatter manually to handle edge cases
  const frontmatter = {};
  const lines = frontmatterText.split('\n');

  let currentKey = null;
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);

    if (keyMatch) {
      // Save previous key-value pair
      if (currentKey) {
        frontmatter[currentKey] = cleanValue(currentValue.trim());
      }

      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && line.trim()) {
      // Continue multi-line value
      currentValue += ' ' + line.trim();
    }
  }

  // Save last key-value pair
  if (currentKey) {
    frontmatter[currentKey] = cleanValue(currentValue.trim());
  }

  return {
    frontmatter,
    content: markdownContent.trim()
  };
}

function cleanValue(value) {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  // Parse array-like values
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Clean up description - remove examples and excessive formatting
  if (value.includes('Examples:')) {
    value = value.split('Examples:')[0].trim();
  }

  // Limit description length and clean up
  if (value.length > 200) {
    value = value.substring(0, 200).trim() + '...';
  }

  return value;
}

function convertToCursorFormat(frontmatter, agentName) {
  const cursorFrontmatter = {
    description: frontmatter.description || frontmatter.name || agentName,
    globs: determineGlobs(agentName, frontmatter.capabilities)
  };

  return cursorFrontmatter;
}

function convertFile(inputPath, outputPath) {
  console.log(`Converting: ${path.basename(inputPath)}`);

  const content = fs.readFileSync(inputPath, 'utf8');
  const { frontmatter, content: markdownContent } = extractFrontmatter(content);

  const agentName = path.basename(inputPath, '.md');
  const cursorFrontmatter = convertToCursorFormat(frontmatter, agentName);

  // Generate new .mdc content
  const cursorContent = `---
description: "${cursorFrontmatter.description}"
globs: "${cursorFrontmatter.globs}"
---

${markdownContent}`;

  // Write to cursor/rules directory
  fs.writeFileSync(outputPath, cursorContent, 'utf8');
  console.log(`✅ Created: ${path.basename(outputPath)}`);
}

function main() {
  const claudeAgentsDir = path.join(__dirname, '../claude/agents');
  const cursorRulesDir = path.join(__dirname, '../cursor/rules');

  // Ensure output directory exists
  if (!fs.existsSync(cursorRulesDir)) {
    fs.mkdirSync(cursorRulesDir, { recursive: true });
  }

  // Get all .md files from claude/agents
  const agentFiles = fs.readdirSync(claudeAgentsDir)
    .filter(file => file.endsWith('.md'))
    .filter(file => file.startsWith('hcc-frontend-') || file.startsWith('hcc-infra-'));

  console.log(`🔄 Converting ${agentFiles.length} Claude agents to Cursor format...\n`);

  agentFiles.forEach(file => {
    const inputPath = path.join(claudeAgentsDir, file);
    const outputName = file
      .replace('hcc-frontend-', '')
      .replace('hcc-infra-', '')
      .replace('.md', '.mdc');
    const outputPath = path.join(cursorRulesDir, outputName);

    try {
      convertFile(inputPath, outputPath);
    } catch (error) {
      console.error(`❌ Error converting ${file}:`, error.message);
    }
  });

  console.log(`\n🎉 Conversion complete! Files saved to: cursor/rules/`);
  console.log(`\n💡 Tip: You can now distribute these .mdc files to your team for Cursor usage.`);
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

module.exports = { convertFile, determineGlobs };