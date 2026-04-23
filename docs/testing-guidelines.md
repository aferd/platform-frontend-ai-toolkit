# Testing Guidelines

This document outlines the testing standards and best practices for HCC Frontend projects.

## Core Testing Principles

### TypeScript Only
- All tests MUST be written in TypeScript, never JavaScript
- Test files use `.test.ts` or `.test.tsx` extensions
- Type safety is required for all test code

### Test Types and Organization

**Unit Tests** (Jest)
- Test individual functions, utilities, and React hooks
- Located adjacent to source files: `component.tsx` → `component.test.tsx`
- Focus on pure logic, no DOM rendering required
- Use `renderHook` from `@testing-library/react` for hook testing (React 18+)

**Component Tests** (Storybook with Play Functions)
- Test isolated UI components with user interactions
- Located in `.stories.tsx` files alongside components
- Use Storybook's `play` function for interaction testing
- Include MSW (Mock Service Worker) for API mocking
- Test accessibility, user interactions, and visual states

**End-to-End Tests** (Playwright)
- Test complete user workflows across the application
- Located in `e2e/` or `playwright/` directories
- Use Red Hat SSO authentication via `@redhat-cloud-services/playwright-test-auth`
- CI-optimized: single-threaded, max 2 failures per run

## Red Hat SSO Authentication

All Playwright E2E tests use the shared authentication package:

```typescript
import { test, expect } from '@redhat-cloud-services/playwright-test-auth';

test('user can access dashboard', async ({ page }) => {
  // Authentication handled automatically via global setup
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

### Authentication Setup
- Global setup authenticates once with a single user account
- Session stored in `playwright/.auth/user.json`
- Reused across all tests for performance
- **Limitation**: Only supports single-user tests (no multi-user or role-based tests)

## Test Migration Standards

### From Cypress to Modern Stack

When migrating legacy Cypress tests:

1. **Analyze Test Intent**: Understand what the test validates before converting
2. **Categorize by Type**:
   - Isolated UI behavior → Storybook play function
   - Pure logic/calculations → Jest unit test
   - Full user workflows → Playwright E2E test
3. **Preserve Coverage**: Ensure migrated tests maintain or improve coverage
4. **Update Selectors**: Use accessible selectors (roles, labels) not brittle CSS
5. **Add MSW Mocks**: Replace `cy.intercept()` with MSW handlers in Storybook

### AST-Based Migration

The test migration process uses Abstract Syntax Tree (AST) parsing to ensure high-fidelity conversion:

- **Trigger Extraction**: User actions like clicks, typing, navigation
- **Assertion Mapping**: Expect statements and their conditions
- **Setup Identification**: Mocks, intercepts, and test data

### Obsolete Test Detection

Before migration, verify test relevance:
- Compare test code against current component source
- Check if tested functionality still exists
- Flag obsolete tests for deletion rather than migration

## CI Optimization

All tests must be optimized for Continuous Integration:

### Playwright Configuration
```typescript
export default defineConfig({
  workers: 1, // Single-threaded for CI stability
  retries: 0, // No retries - fix flaky tests
  maxFailures: 2, // Fast fail to save CI time
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

### Storybook Test Runner
- Use `@storybook/test-runner` for CI
- Configure with `--maxWorkers=2` for small environments
- Enable `--coverage` for coverage tracking

## Mock Service Worker (MSW)

### MSW Setup for Storybook

All API calls in Storybook stories must use MSW:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),
];

export default {
  title: 'Components/UserList',
  component: UserList,
  parameters: {
    msw: { handlers },
  },
};
```

### MSW Readiness Check

Before writing stories for components that fetch data:
1. Scan component for `fetch`, `axios`, or API hooks
2. Verify MSW configuration exists in Storybook setup
3. Create handlers for all API endpoints the component uses
4. Test both success and error states

## Accessibility Testing

All component tests must verify accessibility:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('component meets accessibility standards', async ({ page }) => {
  await page.goto('/component');
  await injectAxe(page);
  await checkA11y(page);
});
```

### ARIA Requirements
- All interactive elements have accessible names
- Form inputs have associated labels
- Icon-only buttons include `aria-label`
- Dynamic content changes are announced to screen readers

## Test Quality Standards

### DO
- ✅ Write descriptive test names that explain the scenario
- ✅ Test edge cases and error conditions
- ✅ Use accessible selectors (roles, labels)
- ✅ Make tests idempotent (can run multiple times)
- ✅ Clean up test data after tests complete
- ✅ Test one specific behavior per test case

### DON'T
- ❌ Write shallow tests that only check rendering
- ❌ Test implementation details (internal state)
- ❌ Use brittle CSS selectors like `.class-name-123`
- ❌ Assume environment state without setting it up
- ❌ Mock everything (test real behavior when possible)
- ❌ Skip error scenarios or edge cases

## File Organization

```text
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx        # Unit tests
│   │   └── Button.stories.tsx     # Component tests with play functions
│   └── UserProfile/
│       ├── UserProfile.tsx
│       ├── UserProfile.test.tsx
│       └── UserProfile.stories.tsx
├── utils/
│   ├── formatters.ts
│   └── formatters.test.ts         # Pure function tests
└── hooks/
    ├── useAuth.ts
    └── useAuth.test.ts            # Hook tests

e2e/
└── user-flows/
    ├── login.spec.ts              # E2E user workflows
    └── checkout.spec.ts
```

## Test Naming Conventions

### Unit Tests
```typescript
describe('formatCurrency', () => {
  it('should format positive numbers with $ prefix', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('should handle zero values', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format negative numbers in parentheses', () => {
    expect(formatCurrency(-50)).toBe('($50.00)');
  });
});
```

### E2E Tests
```typescript
test('user can create and submit an expense report', async ({ page }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'New Expense' }).click();
  // ... test steps
});
```

## Coverage Expectations

- **Minimum Coverage**: 80% for new code
- **Focus**: Quality over quantity - meaningful tests that catch bugs
- **Exclude**: Generated files, types, constants
- **Priority**: Edge cases, error handling, critical paths

## Related Documentation

- [Agent Development Guidelines](../AGENT_GUIDELINES.md)
- [Storybook Specialist Agent](../claude/agents/hcc-frontend-storybook-specialist.md)
- [Unit Test Writer Agent](../claude/agents/hcc-frontend-unit-test-writer.md)
- [IQE to Playwright Migration Agent](../claude/agents/hcc-frontend-iqe-to-playwright-migration.md)
