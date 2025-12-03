# Scripts Documentation

This directory contains automation scripts for the HCC Frontend AI Toolkit.

## Available Scripts

### `convert-to-cursor.js`
**Purpose:** Converts Claude agents to Cursor .mdc format

**Usage:**
```bash
npm run convert-cursor
# or
node scripts/convert-to-cursor.js
```

**What it does:**
- Reads all Claude agent files from `claude/agents/`
- Converts YAML frontmatter to Cursor format
- Maps agent types to appropriate file globs
- Outputs `.mdc` files to `cursor/rules/`

### `check-cursor-sync.js`
**Purpose:** Verifies that Cursor rules are in sync with Claude agents

**Usage:**
```bash
npm run check-cursor-sync
# or
node scripts/check-cursor-sync.js
```

**What it does:**
- Removes existing cursor rules
- Regenerates rules from Claude agents
- Checks for git differences
- Validates agent count matches
- Exits with error if out of sync

**Used in:**
- CI/CD pipeline (PR checks)
- Husky pre-commit hooks (automatic)
- Local development verification

## Development Workflow

When modifying Claude agents:

1. **Edit** Claude agent files in `claude/agents/`
2. **Convert** to Cursor format: `npm run convert-cursor`
3. **Verify** sync: `npm run check-cursor-sync`
4. **Commit** both Claude and Cursor files

## CI Integration

Both scripts are integrated into our development pipeline:
- **Husky pre-commit hooks** prevent committing out-of-sync rules
- **PR checks** ensure Cursor rules stay in sync
- **Release workflow** uses converted rules for distribution
- **Quality gates** prevent out-of-sync deployments