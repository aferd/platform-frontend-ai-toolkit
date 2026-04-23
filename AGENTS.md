# HCC Frontend AI Toolkit - Agent Documentation

This document serves as the central index for AI agent context and guidelines within the HCC Frontend AI Toolkit repository.

## Purpose

This file provides cross-cutting conventions and AI-specific repository guidance that applies to all AI agents (Claude Code, Cursor, and other AI development tools) working with this codebase.

## Documentation Hierarchy

The toolkit follows a layered documentation architecture to provide AI agents with comprehensive context:

```
AGENTS.md (this file)
├── Entry point for AI agent context
├── Indexes domain-specific guidelines
└── References project-specific rules

AGENT_GUIDELINES.md
├── Agent development best practices
├── Agent file format specifications
└── Integration and testing procedures

docs/testing-guidelines.md
├── Testing standards and best practices
├── Test types and organization
├── Migration standards (Cypress to modern stack)
└── CI optimization requirements

DB_UPGRADE_AGENTS.md
├── Database upgrade orchestration
├── Blue/green deployment patterns
└── RDS upgrade procedures

OUTSTANDING_WORK.md
├── Current work in progress
└── Known issues and TODOs
```

## Domain-Specific Guidelines

### Testing Guidelines
**File**: [docs/testing-guidelines.md](docs/testing-guidelines.md)

Comprehensive testing standards including:
- TypeScript-only requirement for all tests
- Test types: Unit (Jest), Component (Storybook), E2E (Playwright)
- Red Hat SSO authentication patterns
- Test migration standards (Cypress → Playwright/Storybook)
- CI optimization requirements
- MSW (Mock Service Worker) setup and usage
- Accessibility testing requirements

**When to reference**: When writing, reviewing, or migrating tests.

### Agent Development
**File**: [AGENT_GUIDELINES.md](AGENT_GUIDELINES.md)

Guidelines for creating and maintaining sub-agents including:
- Agent philosophy (small and focused)
- File format specifications
- Naming conventions (hcc-frontend-* prefix)
- Integration process (convert-cursor sync)
- Version bumping requirements

**When to reference**: When creating or modifying agents.

### Database Upgrades
**File**: [DB_UPGRADE_AGENTS.md](DB_UPGRADE_AGENTS.md)

Specialized documentation for database upgrade orchestration:
- Blue/green deployment patterns
- RDS upgrade procedures
- Status page integration
- Post-maintenance operations

**When to reference**: When working with database upgrade agents.

## Repository Conventions

### Technology Stack
- **Language**: TypeScript (strict mode)
- **Testing**: Jest, Storybook, Playwright
- **UI Framework**: React + PatternFly
- **Build System**: Nx monorepo
- **Package Manager**: npm

### Code Quality
- All code must pass TypeScript type checking
- Tests are required for new features
- Follow existing code patterns and conventions
- Use accessible selectors in tests (roles, labels)

### MCP Servers
The toolkit includes Model Context Protocol (MCP) servers for enhanced AI capabilities:

**hcc-patternfly-data-view**
- PatternFly DataView component assistance
- Located: `packages/hcc-pf-mcp`

**hcc-feo-mcp**
- Frontend Operator (FEO) configuration management
- Located: `packages/hcc-feo-mcp`

**hcc-kessel-mcp**
- Kessel authorization service integration
- Located: `packages/hcc-kessel-mcp`

**hcc-test-migration-mcp** (NEW)
- Cypress test migration to Playwright/Storybook
- AST-based test analysis and extraction
- Located: `packages/hcc-test-migration-mcp`

## Available Agents

### Test Migration
- **hcc-frontend-cypress-migration-specialist**: Orchestrates Cypress → Playwright/Storybook migrations

### Testing
- **hcc-frontend-unit-test-writer**: Jest unit test creation
- **hcc-frontend-storybook-specialist**: Storybook story creation with play functions
- **hcc-frontend-iqe-to-playwright-migration**: IQE/Selenium → Playwright conversion

### Code Quality
- **hcc-frontend-react-patternfly-code-quality-scanner**: Anti-pattern detection
- **hcc-frontend-dependency-cleanup-agent**: Safe file and dependency removal
- **hcc-frontend-typescript-type-refiner**: Type safety improvements
- **hcc-frontend-js-to-ts-migration**: JavaScript → TypeScript conversion

### UI Development
- **hcc-frontend-patternfly-component-builder**: PatternFly component creation
- **hcc-frontend-patternfly-dataview-specialist**: DataView component specialist
- **hcc-frontend-patternfly-css-utility-specialist**: PatternFly CSS utilities
- **hcc-frontend-a11y-specialist**: Accessibility compliance
- **hcc-frontend-dark-mode-css-helper**: Dark mode CSS configuration

### Infrastructure
- **hcc-frontend-feo-migration-specialist**: Frontend Operator migration
- **hcc-frontend-yaml-setup-specialist**: Frontend.yaml configuration
- **hcc-frontend-konflux-e2e-pipeline-setup**: Konflux E2E pipeline setup
- **hcc-frontend-konflux-namespace-mover**: Konflux namespace migration
- **hcc-frontend-vault-external-secret-configurator**: Vault ExternalSecrets setup

### Database
- **hcc-frontend-db-upgrade-orchestrator**: RDS upgrade orchestration
- **hcc-frontend-db-upgrade-switchover**: Blue/green switchover
- **hcc-frontend-db-upgrade-cleanup**: Post-upgrade cleanup
- **hcc-frontend-db-upgrade-status-page**: Status page incident creation
- **hcc-frontend-db-upgrade-replication-check**: Replication slot verification
- **hcc-frontend-db-upgrade-post-maintenance**: VACUUM and REINDEX operations

### Analytics & Debugging
- **hcc-frontend-analytics-investigator**: Segment/Amplitude debugging
- **hcc-frontend-go-unit-test-writer**: Go unit test creation

### Project Management
- **hcc-frontend-jira-issue-creator**: JIRA issue creation
- **hcc-frontend-weekly-report**: Team report generation

### Misc
- **hcc-frontend-widget-layout-migration-specialist**: Widget layout migration
- **hcc-frontend-storybook-configurator**: Storybook configuration setup
- **hcc-frontend-hello-world**: Plugin verification

## Integration with Other AI Tools

### Claude Code
Primary development environment. Agents are defined in `claude/agents/` directory using the Claude format with YAML frontmatter.

### Cursor
Auto-synced from Claude agents via `npm run convert-cursor`. Cursor rules are generated in `cursor/rules/` directory.

**IMPORTANT**: After modifying agents, always run:
```bash
npm run convert-cursor
```

This ensures consistency between Claude and Cursor environments.

## Version Management

When adding or modifying agents:
1. Update agent files in `claude/agents/`
2. Run `npm run convert-cursor` to sync
3. **Bump version** in `claude/.claude-plugin/plugin.json`
4. Commit both Claude and Cursor files

Version bumping is required for automated plugin updates. Use semantic versioning:
- **Patch**: Bug fixes (1.10.2 → 1.10.3)
- **Minor**: New agents or features (1.10.2 → 1.11.0)
- **Major**: Breaking changes (1.10.2 → 2.0.0)

## Contributing

See [AGENT_GUIDELINES.md](AGENT_GUIDELINES.md) for detailed agent development guidelines.

## Related Documentation

- [README.md](README.md) - Project overview and installation
- [AGENT_GUIDELINES.md](AGENT_GUIDELINES.md) - Agent development
- [docs/testing-guidelines.md](docs/testing-guidelines.md) - Testing standards
- [DB_UPGRADE_AGENTS.md](DB_UPGRADE_AGENTS.md) - Database upgrade procedures
- [OUTSTANDING_WORK.md](OUTSTANDING_WORK.md) - Current work and issues
