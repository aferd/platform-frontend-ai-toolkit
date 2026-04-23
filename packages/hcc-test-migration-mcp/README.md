# HCC Test Migration MCP Server

Model Context Protocol (MCP) server for migrating legacy Cypress tests to modern Playwright and Storybook environments.

## Overview

This MCP server provides intelligent test migration capabilities for HCC Frontend projects. It uses Abstract Syntax Tree (AST) parsing to analyze legacy Cypress tests and convert them into modern testing patterns while maintaining test coverage and intent.

## Features

- **AST-Based Migration**: High-fidelity parsing of Cypress test syntax
- **Intelligent Categorization**: Routes tests to appropriate frameworks (Storybook, Jest, Playwright)
- **Coverage Analysis**: Identifies gaps and obsolete tests
- **MSW Detection**: Flags API mocking requirements
- **Security**: Read-only enforcement for application code, write access only for test files

## Tools

### `audit_test_coverage_and_relevance`
Analyzes component source code and legacy test code to determine if tests are still relevant to current UI state.

### `analyze_repo_structure`
Maps components against existing test coverage (Jest, Storybook, Playwright, Cypress) to identify gaps.

### `extract_test_logic`
Parses Cypress AST into structured JSON map of:
- **Trigger**: User actions (clicks, typing, navigation)
- **Assertion**: Expected outcomes and validations
- **Setup**: Mocks, intercepts, test data

### `check_msw_readiness`
Scans for API calls and determines MSW (Mock Service Worker) requirements for Storybook stories.

## Usage

This MCP server is designed to be used with the `hcc-frontend-cypress-migration-specialist` agent, which orchestrates the migration workflow.

### Installation

```bash
npm install @redhat-cloud-services/hcc-test-migration-mcp
```

### Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "hcc-test-migration": {
      "command": "npx",
      "args": ["@redhat-cloud-services/hcc-test-migration-mcp"]
    }
  }
}
```

## Safety Constraints

### Read-Only Application Code
The server operates under strict read-only mandate for all non-test application files. Write access is limited to:
- `**/tests/**`
- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.stories.tsx`
- Playwright E2E configuration files

### Path Security
All file system operations are protected by:
- Path jailing (confined to repository root)
- Path sanitization (prevents directory traversal)
- Write-path validation (enforces test-only writing)

### Exclusions
- **Python/IQE Tests**: Completely ignored (`.py` files, `/iqe/` paths)
- Handled by separate `hcc-frontend-iqe-to-playwright-migration` agent

## Architecture

### Core Components

**MCP Server** (TypeScript/Node.js)
- Local file system access via `fs` and `child_process`
- Zod-based tool validation
- Secure utility layer with path jailing

**AST Parser** (TypeScript Compiler API)
- Visitor pattern for Cypress node identification
- Structured test mapping (Trigger → Assertion → Setup)
- High-fidelity syntax conversion

**Orchestrator Integration**
- Works with Ralph (Hat-based framework)
- Event-driven lifecycle management
- Backpressure gates for quality enforcement

## Test Migration Workflow

1. **Audit**: Check if test is still relevant
2. **Analyze**: Identify coverage gaps
3. **Extract**: Parse test logic via AST
4. **Categorize**: Determine target framework
5. **Delegate**: Route to specialist agents
6. **Cleanup**: Remove migrated Cypress files

## Related Documentation

- [Testing Guidelines](../../docs/testing-guidelines.md)
- [Agent Development Guidelines](../../AGENT_GUIDELINES.md)
- [Cypress Migration Specialist Agent](../../claude/agents/hcc-frontend-cypress-migration-specialist.md)

## License

Apache-2.0 - see LICENSE file for details
