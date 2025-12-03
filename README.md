# HCC Frontend AI Toolkit

A custom Claude Code marketplace and plugin repository for frontend development teams.

## What is this?

This repository serves as both:
1. A **Claude Code plugin** containing custom agents and MCP servers for frontend development
2. A **custom plugin marketplace** for your team's agent distribution

This approach allows your team to have a centralized location for all frontend development agents, MCP servers, and easily distribute them across the team.

## Installation

### Add Marketplace and Install Plugin

```bash
# 1. Add this repository as a marketplace
/plugin marketplace add RedHatInsights/platform-frontend-ai-toolkit

# 2. Install the plugin from the marketplace
/plugin install hcc-frontend-ai-toolkit@hcc-frontend-toolkit
```

📖 For more details on Claude Code plugins, see the [official plugin guide](https://code.claude.com/docs/en/plugins#install-and-manage-plugins).

### ⚠️ Important: Restart Required

**After installation, restart your Claude Code session to see the agents and other features.**

### Team Configuration (Optional)

For automatic marketplace setup across your team, add this to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "hcc-frontend-toolkit": {
      "source": {
        "source": "github",
        "repo": "RedHatInsights/platform-frontend-ai-toolkit"
      }
    }
  }
}
```

## Available Agents

- **hcc-frontend-hello-world** - Simple greeting agent to verify plugin installation and functionality
- **hcc-frontend-patternfly-component-builder** - Expert in creating PatternFly React components for forms, layouts, navigation, and modals
- **hcc-frontend-patternfly-dataview-specialist** - Expert in PatternFly DataView components for tables, lists, and data grids
- **hcc-frontend-patternfly-css-utility-specialist** - Expert in applying PatternFly CSS utility classes for styling and layout
- **hcc-frontend-storybook-specialist** - Expert in creating comprehensive Storybook stories with testing and documentation
- **hcc-frontend-typescript-type-refiner** - Expert in analyzing and refining TypeScript types to eliminate 'any' and improve type safety
- **hcc-frontend-unit-test-writer** - Expert in writing focused unit tests for JavaScript/TypeScript functions and React hooks
- **hcc-frontend-react-patternfly-code-quality-scanner** - Expert in scanning React + PatternFly projects for anti-patterns and technical debt
- **hcc-frontend-dependency-cleanup-agent** - Expert in safely removing files and cleaning up orphaned dependencies

## Available MCP Servers

- **hcc-patternfly-data-view** - Model Context Protocol server providing @patternfly/react-data-view component documentation, examples, and implementation guidance

📋 **For detailed MCP server documentation and standalone usage**, see: [packages/hcc-pf-mcp/README.md](packages/hcc-pf-mcp/README.md)

### MCP Server Tools

When the plugin is installed, these MCP tools become available:
- **getPatternFlyDataViewDescription** - Get comprehensive documentation about @patternfly/react-data-view package capabilities
- **getPatternFlyDataViewExample** - Get implementation examples for various data table scenarios (basic usage, sorting, filtering, pagination, selection, etc.)

## Testing Installation

After installation and restart, test the plugin:

```bash
# Test the hello world agent
Task with subagent_type='hcc-frontend-hello-world' to greet the user
```

The hello world agent should identify itself as part of the HCC Frontend AI Toolkit plugin, confirming successful installation.

## Repository Structure

This repository is organized to support multiple agenic configurations:

```
platform-frontend-ai-toolkit/           # Repository root
├── .claude-plugin/
│   └── marketplace.json                 # Marketplace configuration (root level)
├── claude/                              # Claude Code plugin subdirectory
│   ├── .claude-plugin/
│   │   └── plugin.json                  # Plugin manifest
│   └── agents/                          # Agent definitions
│       └── hcc-frontend-hello-world.md
├── LICENSE
└── README.md                           # This file
```

This structure allows you to:
- Add other agenic configurations in separate subdirectories (e.g., `openai/`, `anthropic/`, etc.)
- Keep the marketplace configuration at the root level
- Organize different AI toolkits by subdirectory

## Agent Format

Agents in this plugin use the standard format with frontmatter:

```markdown
---
description: What this agent specializes in
capabilities: ["task1", "task2", "task3"]
---

# Agent Name

Detailed description of when and how Claude should use this agent...
```

## Updating the Plugin

### Check for Updates

```bash
# List installed plugins and their versions
claude plugins list

# Check if updates are available
claude plugins status
```

### Update the Plugin

```bash
# Update the marketplace to get latest plugin versions
/plugin marketplace update hcc-frontend-toolkit

# Then update the plugin (via CLI interface or manually)
/plugin install hcc-frontend-ai-toolkit@hcc-frontend-toolkit

# Or update all plugins
claude plugins update
```

### Manual Update Process

If automatic updates don't work:

```bash
# Uninstall current version
claude plugins uninstall hcc-frontend-ai-toolkit

# Reinstall latest version
claude plugins install github:your-org/platform-frontend-ai-toolkit
```

## Development

### Adding New Agents

1. Create a new `.md` file in the `agents/` directory
2. Use the `hcc-frontend-` naming prefix to avoid collisions
3. Follow the agent format with proper frontmatter
4. Test locally before committing

### Plugin Configuration

Edit `.claude-plugin/plugin.json` to update:
- Plugin metadata (name, version, description)
- Author information
- Custom agent paths (if needed)

## Troubleshooting

### Common Issues

**Plugin not found after installation:**
```bash
# Refresh plugin list
claude plugins refresh

# Check installation status
claude plugins list --verbose
```

**Agents not available:**
```bash
# Check agent availability
claude agents list

# Verify plugin is loaded
claude plugins status hcc-frontend-ai-toolkit
```

**Permission errors:**
```bash
# Check repository access
git ls-remote https://github.com/RedHatInsights/platform-frontend-ai-toolkit.git

# Re-authenticate if needed
gh auth login
```

### Getting Help

- Check plugin logs: `claude plugins logs hcc-frontend-ai-toolkit`
- Verify installation: `claude plugins verify hcc-frontend-ai-toolkit`
- Debug mode: `claude --debug` to see plugin loading details
- Report issues: [GitHub Issues](https://github.com/RedHatInsights/platform-frontend-ai-toolkit/issues)

---

## 🖱️ Using with Cursor

This repository contains **Agents** (Rules) and **Tools** (MCPs) configured specifically for our team's workflows.

### Option A: Install Script (Recommended)

Download and run the install script in the root of **your** project:

```bash
curl -sSL https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/install-cursor.sh | bash
```

### Option B: Manual One-Liner

Run this command in the root of **your** project (the app you are working on, not this repo) to download the latest agents:

```bash
# Creates .cursor/rules and downloads our team agents
mkdir -p .cursor/rules && \
curl -o .cursor/rules/hello-world.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/hello-world.mdc && \
curl -o .cursor/rules/patternfly-component-builder.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/patternfly-component-builder.mdc && \
curl -o .cursor/rules/patternfly-dataview-specialist.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/patternfly-dataview-specialist.mdc && \
curl -o .cursor/rules/storybook-specialist.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/storybook-specialist.mdc && \
curl -o .cursor/rules/typescript-type-refiner.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/typescript-type-refiner.mdc && \
curl -o .cursor/rules/unit-test-writer.mdc https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules/unit-test-writer.mdc
```

*Restart Cursor after running this.*

### Option C: Manual Setup

#### 1\. Installing Agents (Rules)

1.  Navigate to your project's root folder.
2.  Create a folder named `.cursor/rules/`.
3.  Copy the `.mdc` files from `cursor/rules/` in this repo into that folder.
4.  **Verify:** Open Cursor, type `Cmd+K` (or `Ctrl+K`), and you should see the agents appear in the context menu.

#### 2\. Connecting Tools (MCPs)

1.  Open Cursor Settings (`Cmd/Ctrl + ,`).
2.  Navigate to **General \> MCP**.
3.  Locate `cursor/mcp-template.json` in this repo.
4.  Copy the configuration for the tools you need and click **"Add new MCP server"** in Cursor.
5.  **Note:** The MCP server will automatically use the published NPM package `@redhat-cloud-services/hcc-pf-mcp`.

### How to Use

  * **Chat:** Tag an agent by typing `@patternfly-component-builder` or `@typescript-type-refiner` in the chat window.
  * **Composer:** In Composer (`Cmd+I`), the agents will automatically activate based on the file types you are editing (e.g., TypeScript files will auto-activate the type refiner).

### Available Cursor Agents

- **hello-world** - Verification agent for testing setup
- **patternfly-component-builder** - Expert in PatternFly React components (forms, modals, navigation)
- **patternfly-dataview-specialist** - Expert in PatternFly DataView components (tables, data grids)
- **patternfly-css-utility-specialist** - Expert in PatternFly CSS utility classes
- **storybook-specialist** - Expert in Storybook story creation and testing
- **typescript-type-refiner** - Expert in TypeScript type safety and refinement
- **unit-test-writer** - Expert in JavaScript/TypeScript unit testing
- **react-patternfly-code-quality-scanner** - Expert in React + PatternFly code quality
- **dependency-cleanup-agent** - Expert in safe file removal and dependency cleanup

---

## Agent Naming Convention

All agents use the `hcc-frontend-` prefix to avoid name collisions with other plugins and built-in agents.

## Contributing

### Adding or Updating Agents

1. **Follow naming convention** with `hcc-frontend-` prefix
2. **Place agent files** in the `claude/agents/` directory
3. **Include proper frontmatter** with description and capabilities
4. **Regenerate Cursor rules** after making changes:
   ```bash
   npm run convert-cursor
   ```
5. **Verify sync** before committing:
   ```bash
   npm run check-cursor-sync
   ```
6. **Test agents** before submitting pull requests
7. **Update plugin version** in `plugin.json` for releases

### ⚠️ Important: Cursor Rules Sync

**When you modify Claude agents, you MUST regenerate the Cursor rules before committing.**

Our CI will **automatically fail** if Cursor rules are out of sync with Claude agents. This ensures both editors always have the same functionality.

#### Workflow:
```bash
# 1. Edit a Claude agent
vim claude/agents/hcc-frontend-example.md

# 2. Regenerate Cursor rules
npm run convert-cursor

# 3. Verify everything is in sync
npm run check-cursor-sync

# 4. Commit both changes
git add claude/agents/hcc-frontend-example.md cursor/rules/example.mdc
git commit -m "feat: update example agent"
```

#### CI Check:
- **Triggers on:** PRs that modify `claude/agents/`, `cursor/rules/`, or conversion scripts
- **Validates:** Cursor rules match Claude agents exactly
- **Fails if:** Rules are out of sync or conversion script produces different output

#### Local Development:
```bash
# Check if rules are in sync
npm run check-cursor-sync

# Fix sync issues
npm run convert-cursor

# Pre-commit hook runs automatically via Husky
git commit -m "feat: update agent" # Will run sync check
```

#### Pre-commit Protection:
- **Husky pre-commit hook** automatically runs `npm run check-cursor-sync`
- **Commits will fail** if Cursor rules are out of sync
- **Fix by running** `npm run convert-cursor` before committing
