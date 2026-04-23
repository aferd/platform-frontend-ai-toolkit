# Scope Amendment: Analysis vs Migration

## Key Changes to hcc-frontend-cypress-migration-specialist

### ✅ UPDATED: Scope Clarification

The agent now clearly distinguishes between two different scopes:

---

## 📊 ANALYSIS SCOPE (Comprehensive - ALL Test Types)

When analyzing, the agent scans **ALL** test types in the repository:

✅ **Cypress** tests (.cy.ts, .cy.tsx)  
✅ **Jest** unit tests (.test.ts, .test.tsx)  
✅ **Storybook** stories (.stories.ts, .stories.tsx)  
✅ **Playwright** E2E tests (.spec.ts in e2e/ or playwright/)

### Analysis Modes

**Mode 1: Single Test Analysis**
- Analyzes ANY test type (not just Cypress)
- For Cypress: Full migration analysis
- For Jest/Storybook/Playwright: Coverage and quality analysis

**Mode 2: Repository Analysis**
- Scans entire repository for ALL test types
- Shows breakdown by test type:
  - Total components
  - Jest coverage: X%
  - Storybook coverage: Y%
  - Playwright coverage: Z%
  - Cypress (legacy): N tests
- Identifies coverage gaps across ALL types
- Generates priority matrix for:
  - Components with zero tests
  - Components missing Storybook
  - Components missing Jest
  - Cypress tests to migrate

**Mode 3: Coverage Report**
- Component-by-component breakdown
- Shows which test types each component has
- Categories:
  - ✅ Well Covered (Jest + Storybook)
  - 🟡 Partial (Jest OR Storybook, not both)
  - 🔴 Zero Coverage (no tests)
  - 🔵 Legacy Only (only Cypress)

---

## 🔄 MIGRATION SCOPE (Focused - Cypress Only)

When migrating, the agent handles **ONLY** Cypress tests:

✅ **Cypress** → Storybook/Playwright/Jest  
❌ **NOT** Jest (already modern)  
❌ **NOT** Storybook (already modern)  
❌ **NOT** Playwright (already modern)

### Migration Modes

**Mode 4: Migration Plan (Cypress Only)**
- Creates detailed plan for Cypress test migration
- Shows what will be created
- Waits for user approval

**Mode 5: Single Migration (Cypress Only)**
- Migrates one Cypress test
- Routes to appropriate framework
- Verifies and cleans up

**Mode 6: Batch Migration (Cypress Only)**
- Finds ALL Cypress tests
- Asks about each one
- Migrates approved tests

---

## 🎯 Why This Matters

### Before Amendment
- Unclear if agent could analyze Jest/Storybook tests
- Might only focus on Cypress for analysis
- User couldn't get full repository picture

### After Amendment
- **Analysis**: Get complete view of ALL testing
- **Migration**: Focus only on legacy Cypress tests
- **Clear separation**: Know what to expect for each mode

---

## 📋 Example Scenarios

### Scenario 1: Repository Analysis
```
User: "Show me all test coverage"

Agent Response:
📊 Repository Analysis (ALL Test Types)

Found:
- Components: 157
- Jest tests: 52 (33.1% coverage)
- Storybook stories: 37 (23.6% coverage)
- Playwright E2E: 0 (0% coverage)
- Cypress (legacy): 3 tests

Coverage Gaps:
- 🔴 CRITICAL: 15 components with ZERO tests
- 🟡 PARTIAL: 32 components missing Storybook
- 🔵 LEGACY: 3 Cypress tests to migrate

Would you like to:
1. Migrate the 3 Cypress tests
2. Generate tests for the 15 untested components
3. Both
```

### Scenario 2: Cypress Migration
```
User: "Migrate all tests"

Agent Response:
⚠️ Clarification needed!

I found tests of different types:
- Cypress: 3 tests (can migrate to modern frameworks)
- Jest: 52 tests (already modern - no migration needed)
- Storybook: 37 stories (already modern - no migration needed)

Did you mean:
1. Migrate all CYPRESS tests (3 tests)
2. Analyze ALL test types (show full coverage)
```

### Scenario 3: Jest Test Analysis
```
User: "src/components/Button.test.tsx"

Agent Response:
📊 Analyzing Jest test (no migration needed - already modern)

Found:
- Test file: Button.test.tsx
- Component: Button.tsx
- Test coverage: 8 test cases
- Patterns: Good (uses React Testing Library)

Also checked:
- Has Storybook story? ❌ No
- Recommendation: Add Button.stories.tsx for visual testing

Would you like me to:
1. Analyze the component for test gaps
2. Show you a Storybook story template
```

---

## 🔧 Agent Behavior Matrix

| User Input | Test Type | Agent Action |
|------------|-----------|--------------|
| "Analyze cypress/login.cy.ts" | Cypress | Full migration analysis |
| "Analyze Button.test.tsx" | Jest | Coverage + quality analysis |
| "Analyze Card.stories.tsx" | Storybook | Play function + MSW check |
| "Analyze e2e/login.spec.ts" | Playwright | Scenario coverage analysis |
| "Show all test coverage" | All | Repository-wide analysis |
| "Migrate cypress/login.cy.ts" | Cypress | Full migration workflow |
| "Migrate Button.test.tsx" | Jest | ⚠️ "Jest is already modern - no migration needed" |
| "Migrate all tests" | Ambiguous | ⚠️ Ask: "Cypress only or analyze all?" |

---

## 📝 Updated Initial Prompt

When user invokes the agent, it now asks:

```
I can help you with test analysis and Cypress migration. What would you like to do?

📊 ANALYSIS (scans ALL test types: Cypress, Jest, Storybook, Playwright):
1. Single Test Analysis - Analyze one specific test file
2. Repository Analysis - Full scan of all tests, coverage gaps, priorities
3. Coverage Report - Detailed breakdown by component with recommendations

🔄 MIGRATION (converts ONLY Cypress tests to modern frameworks):
4. Migration Plan - Plan Cypress migration (requires approval before executing)
5. Single Migration - Migrate one Cypress test to Storybook/Playwright/Jest
6. Batch Migration - Migrate multiple Cypress tests (interactive)

Which option would you like?
```

---

## 🎉 Benefits

### For Analysis
✅ Complete visibility into ALL testing (not just Cypress)  
✅ Understand full coverage landscape  
✅ Identify gaps across all test types  
✅ Prioritize work holistically  

### For Migration
✅ Clear focus on legacy Cypress tests  
✅ No confusion about migrating modern tests  
✅ Efficient - only migrate what needs it  
✅ Safe - modern tests stay untouched  

---

## 🚀 Next Steps

1. **Restart Claude Code** to load updated agent
2. **Test with analysis**: "Show me all test coverage in notifications-frontend"
3. **Test with migration**: "Migrate cypress/components/NotificationsDrawer.cy.tsx"
4. **Verify separation**: Try analyzing a Jest test - should analyze not migrate

---

**Amendment Status**: ✅ Complete  
**Agent Updated**: hcc-frontend-cypress-migration-specialist.md  
**Cursor Synced**: ✅ Yes  
**Documentation**: This file
