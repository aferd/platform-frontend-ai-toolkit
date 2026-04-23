# Test Toolkit - Usage Guide

## Overview

The HCC Test Toolkit helps you build and maintain comprehensive test coverage using our **standard testing stack**:

- **Storybook** - Component tests with visual regression and interaction testing
- **Jest** - Unit tests for pure functions, utilities, and business logic
- **Playwright** - End-to-end tests for complete user workflows

The toolkit provides two distinct sets of tools:

1. **General Test Toolkit** - Analyze coverage and build tests for your standard stack
2. **Cypress Migration Toolkit** - Migrate legacy Cypress tests to the standard stack

---

## Testing Strategy

This toolkit implements a **prescriptive testing stack**:

| Test Type | Framework | Purpose | Agent |
|-----------|-----------|---------|-------|
| **Component Tests** | Storybook | Visual regression, interaction testing, isolated component behavior | `hcc-frontend-storybook-specialist` |
| **Unit Tests** | Jest | Pure functions, utilities, hooks, business logic | `hcc-frontend-unit-test-writer` |
| **E2E Tests** | Playwright | Complete user workflows, integration across pages | Manual or templates |

**Why this stack?**
- **Storybook**: Best-in-class component development and testing with visual regression
- **Jest**: Fast, reliable unit testing with great TypeScript support
- **Playwright**: Modern, reliable E2E testing with better debugging than Cypress

---

## Prerequisites

```bash
npm install
npm run build
```

---

# Part 1: General Test Toolkit

Tools for analyzing coverage and building tests using the standard testing stack (Storybook, Jest, Playwright).

## Tool 1: Analyze Test Coverage

Scans your repository and reports on test coverage for all test types.

### Usage

```bash
# Option 1: Pass repository path as argument
tsx analyze-test-coverage.ts /path/to/your/repo

# Option 2: Use environment variable
TARGET_REPO=/path/to/your/repo tsx analyze-test-coverage.ts

# Option 3: Run from within the target repository
cd /path/to/your/repo
tsx /path/to/platform-frontend-ai-toolkit/analyze-test-coverage.ts
```

### What It Analyzes

- **All components** in `src/` directory
- **Current test coverage**: Detects Jest, Storybook, Playwright, and legacy Cypress tests
- **Coverage gaps** - Components missing tests from the standard stack:
  - Missing Storybook stories (component tests)
  - Missing Jest tests (unit tests)
  - Missing Playwright tests (E2E tests)
- **Priority levels** - high/medium/low based on component complexity

### Output

Creates `TEST_COVERAGE_ANALYSIS.md` with:
- Total component count and coverage percentages
- Components WITH tests (shows what you have: Jest, Storybook, Playwright, Cypress)
- **Coverage Gaps** by priority - Components that need tests from the standard stack
- List of existing Cypress tests (candidates for migration)
- Notes about icon components (don't need tests)

---

## Tool 2: Build Test Gaps

Analyzes coverage gaps and provides actionable plan for building the standard testing stack.

### Usage

```bash
# Analyze all gaps (shows what's missing from Storybook, Jest, Playwright)
tsx build-test-gaps.ts /path/to/your/repo

# Filter by priority
tsx build-test-gaps.ts /path/to/your/repo --priority=high

# Filter by test type from standard stack
tsx build-test-gaps.ts /path/to/your/repo --type=storybook    # Component test gaps
tsx build-test-gaps.ts /path/to/your/repo --type=jest         # Unit test gaps
tsx build-test-gaps.ts /path/to/your/repo --type=playwright   # E2E test gaps

# Combine filters
tsx build-test-gaps.ts /path/to/your/repo --priority=high --type=storybook
```

### What It Does

1. Identifies components missing tests from the **standard stack** (Storybook/Jest/Playwright)
2. Groups components by missing test type
3. Prioritizes by complexity (high/medium/low)
4. Provides **agent routing recommendations**:
   - **Storybook gaps** → `hcc-frontend-storybook-specialist` agent
   - **Jest gaps** → `hcc-frontend-unit-test-writer` agent
   - **Playwright gaps** → Manual E2E test creation or templates
5. Outputs detailed component list ready for agent consumption

### Example Workflow

```bash
# Step 1: Analyze coverage
tsx analyze-test-coverage.ts ~/my-app

# Step 2: Review the report
cat ~/my-app/TEST_COVERAGE_ANALYSIS.md

# Step 3: Build tests for high-priority Storybook gaps
tsx build-test-gaps.ts ~/my-app --priority=high --type=storybook

# Step 4: Use the recommended agent
# (In Claude Code): Invoke hcc-frontend-storybook-specialist for listed components
```

---

# Part 2: Cypress Migration Toolkit

Migrates legacy Cypress tests to the standard testing stack (Storybook, Jest, Playwright).

## Tool: Migrate Cypress Tests

Analyzes Cypress tests and provides detailed migration guidance to the standard stack.

### Usage

```bash
# Option 1: Pass repository path as argument
tsx migrate-cypress-tests.ts /path/to/your/repo

# Option 2: Use environment variable
TARGET_REPO=/path/to/your/repo tsx migrate-cypress-tests.ts

# Option 3: Run from within the target repository
cd /path/to/your/repo
tsx /path/to/platform-frontend-ai-toolkit/migrate-cypress-tests.ts
```

### What It Does

**Auto-discovers Cypress tests** in:
- `cypress/` directory
- `test/` directory  
- `tests/` directory

**For each test found:**

1. **Extracts test logic** via AST parsing:
   - Setup actions (intercepts, visits, mocks)
   - Trigger actions (clicks, typing, selections)
   - Assertions (visibility, content, state checks)

2. **Categorizes test type** and routes to standard stack:
   - `storybook` - Component tests with `cy.mount()` → **Migrate to Storybook**
   - `unit` - Logic-only tests → **Migrate to Jest**
   - `e2e` - Full user workflow tests → **Migrate to Playwright**

3. **Checks MSW readiness** (for Storybook migrations)

4. **Generates migration plan** with agent routing to standard stack

### Output

Console output showing:
- All Cypress tests found
- Test categorization (Storybook/Jest/Playwright target)
- Migration recommendations per test:
  - Storybook component tests → Use `hcc-frontend-storybook-specialist`
  - Jest unit tests → Use `hcc-frontend-unit-test-writer`
  - Playwright E2E tests → Write manually with templates
- Detailed next steps

### Migration Workflow

```bash
# Step 1: Discover and analyze Cypress tests
tsx migrate-cypress-tests.ts ~/my-app

# Step 2: Review migration plan

# Step 3: Migrate tests by category:
#   - Storybook → Use hcc-frontend-storybook-specialist
#   - Unit → Use hcc-frontend-unit-test-writer  
#   - E2E → Write Playwright tests

# Step 4: Verify new tests work

# Step 5: Remove old Cypress files using hcc-frontend-dependency-cleanup-agent
```

---

# Complete Workflow Example

## Scenario: New repository needs test coverage

```bash
# 1. Analyze current state
tsx analyze-test-coverage.ts ~/my-new-app

# Review: TEST_COVERAGE_ANALYSIS.md shows:
#   - 50 components
#   - 10 with tests (20%)
#   - 40 with gaps (80%)
#   - 5 existing Cypress tests

# 2. Check Cypress migration needs
tsx migrate-cypress-tests.ts ~/my-new-app

# Output shows:
#   - 3 Storybook migrations needed
#   - 2 E2E migrations needed

# 3. Build tests for high-priority gaps
tsx build-test-gaps.ts ~/my-new-app --priority=high --type=storybook

# Output shows:
#   - 15 high-priority components need Storybook stories
#   - Routes to hcc-frontend-storybook-specialist

# 4. Take action:
#   a. Migrate 3 Cypress component tests → Storybook
#   b. Generate 15 new Storybook stories for gaps
#   c. Migrate 2 Cypress E2E tests → Playwright
#   d. Clean up old Cypress files

# 5. Re-analyze
tsx analyze-test-coverage.ts ~/my-new-app

# New results:
#   - 50 components
#   - 28 with tests (56% coverage)
#   - 22 with gaps (44%)
```

---

# Tool Comparison

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| **analyze-test-coverage** | See what you have | Repository | Coverage report (all frameworks) |
| **build-test-gaps** | Plan what to build | Repository | Action plan for filling gaps |
| **migrate-cypress-tests** | Migrate old tests | Repository with Cypress | Migration plan for Cypress → Modern |

---

# MCP Tools (Underlying Implementation)

The orchestration scripts use these MCP tools:

| Tool | Category | Purpose |
|------|----------|---------|
| `analyzeRepoStructure` | General | Scans all components and tests |
| `auditTestCoverageAndRelevance` | General | Checks test/component relevance |
| `checkMSWReadiness` | General | Analyzes components for API calls |
| `extractTestLogic` | Cypress-specific | Parses Cypress AST |

---

# Command Reference

```bash
# General Testing
tsx analyze-test-coverage.ts <repo-path>
tsx build-test-gaps.ts <repo-path> [--priority=high|medium|low] [--type=storybook|jest|playwright]

# Cypress Migration
tsx migrate-cypress-tests.ts <repo-path>
```

---

# Troubleshooting

**"No test gaps found"**
- Great! Your repository has full coverage
- Consider running `migrate-cypress-tests.ts` if you have legacy Cypress tests

**"No Cypress tests found"**
- This is expected if your repo doesn't use Cypress
- Focus on `build-test-gaps.ts` to build new tests

**"Repository not found"**
- Verify the path exists
- Use absolute paths or run from the repository directory

---

# Notes

- **Icon components don't need tests** - Explicitly noted in reports
- **Path security** - All operations are jailed to specified repository
- **Read-only** - Analysis tools won't modify your repository
- **Standard testing stack** - Prescriptive approach using Storybook, Jest, and Playwright
- **Repository-agnostic** - No hardcoded repository names or paths; works with any repo
