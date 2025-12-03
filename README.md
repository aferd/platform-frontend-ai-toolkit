# HCC Frontend AI Toolkit

A custom Claude Code marketplace and plugin repository for frontend development teams.

## What is this?

This repository serves as both:
1. A **Claude Code plugin** containing custom agents for frontend development
2. A **custom plugin marketplace** for your team's agent distribution

This approach allows your team to have a centralized location for all frontend development agents and easily distribute them across the team.

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
# Update all plugins
claude plugins update

# Update this specific plugin
claude plugins update hcc-frontend-ai-toolkit

# Update to a specific version
claude plugins install github:your-org/platform-frontend-ai-toolkit@v2.0.0
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

## Agent Naming Convention

All agents use the `hcc-frontend-` prefix to avoid name collisions with other plugins and built-in agents.

## Contributing

1. Follow the naming convention with `hcc-frontend-` prefix
2. Place agent files in the `agents/` directory
3. Include proper frontmatter with description and capabilities
4. Test agents before submitting pull requests
5. Update plugin version in `plugin.json` for releases
