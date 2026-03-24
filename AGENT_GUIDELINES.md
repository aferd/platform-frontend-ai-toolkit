# Agent Development Guidelines

This document provides guidelines for creating effective sub agents for the HCC Frontend AI Toolkit.

## Agent Philosophy

Agents should be **small and focused** on specific, well-defined areas of expertise. Rather than creating broad, general-purpose agents, aim for specialized tools that excel in narrow domains.

### Good Agent Examples

- **CSS Utility Agent** - Focused on applying PatternFly CSS variables and utility classes
- **Hook Testing Agent** - Specialized in testing React hooks with proper setup and teardown
- **Form Validation Agent** - Dedicated to implementing form validation patterns
- **Accessibility Agent** - Focused on ARIA attributes and accessibility best practices
- **API Integration Agent** - Specialized in setting up API calls and error handling

### Poor Agent Examples

- **General React Agent** - Too broad, covers everything from components to testing to styling
- **Frontend Helper** - Vague scope, unclear responsibilities
- **Debug Everything Agent** - Overly generic, lacks focus

## Development Process

### Primary Method: Claude Code

The recommended approach is to use **Claude Code** as your primary development environment:

1. **Create new agents** using the `/agents` command in Claude Code
2. **Edit existing agents** directly in the Claude Code interface
3. **Test agents** within Claude Code before publishing

### Agent File Format

Agents use the **Claude format** with YAML frontmatter. For detailed specifications, refer to the [official Claude Code documentation](https://code.claude.com/docs/en/sub-agents#file-format).

```markdown
---
description: Brief description of what this agent specializes in
capabilities: ["specific-task-1", "specific-task-2", "specific-task-3"]
---

# Agent Name

Detailed description of when and how Claude should use this agent...

## When to Use This Agent

- Specific scenario 1
- Specific scenario 2
- Specific scenario 3

## Examples

[Include relevant examples of the agent's usage]
```

## Agent Scope Guidelines

### ✅ Well-Scoped Agents

**PatternFly CSS Utility Specialist**
- **Scope**: Applying PatternFly CSS variables and utility classes
- **Focus**: Layout, spacing, colors, responsive design using PF utilities
- **Clear boundaries**: Does NOT handle component creation or business logic

**React Hook Testing Specialist**
- **Scope**: Writing tests specifically for React hooks
- **Focus**: `renderHook`, cleanup, state changes, effect testing
- **Clear boundaries**: Does NOT handle component testing or E2E tests

**Form Validation Agent**
- **Scope**: Implementing form validation patterns
- **Focus**: Yup schemas, validation rules, error message formatting
- **Clear boundaries**: Does NOT handle form UI or submission logic

### ❌ Poorly-Scoped Agents

**Frontend Development Helper**
- **Problem**: Too broad, unclear what it should and shouldn't do
- **Better approach**: Split into focused agents (CSS, testing, components, etc.)

**React Everything Agent**
- **Problem**: Covers components, hooks, testing, styling - too much
- **Better approach**: Separate agents for each concern

## Naming Convention

All agents must use the `hcc-frontend-` prefix to avoid name collisions:

- ✅ `hcc-frontend-css-utilities`
- ✅ `hcc-frontend-hook-testing`
- ✅ `hcc-frontend-form-validation`
- ❌ `css-helper` (missing prefix)
- ❌ `frontend-css` (wrong prefix format)

## Agent Capabilities

### Define Clear Capabilities

List specific, actionable capabilities in the frontmatter:

```yaml
capabilities: [
  "apply-patternfly-spacing-utilities",
  "implement-responsive-breakpoints",
  "use-patternfly-color-tokens"
]
```

### Avoid Vague Capabilities

❌ `["help-with-css", "make-things-look-good", "frontend-stuff"]`

✅ `["apply-pf-utility-classes", "implement-responsive-grid", "use-css-custom-properties"]`

## Documentation Requirements

Each agent should include:

1. **Clear description** of its specific purpose
2. **When to use** - specific scenarios where the agent should be invoked
3. **Examples** - concrete usage examples
4. **Boundaries** - what the agent does NOT do
5. **Related agents** - which other agents complement this one

## Testing and Quality

### Before Submitting

1. **Test in Claude Code** - Verify the agent works as expected
2. **Check scope** - Ensure the agent has a focused, clear purpose
3. **Validate naming** - Confirm it follows the `hcc-frontend-` convention
4. **Review documentation** - Ensure clear usage guidelines

### Integration Process

1. Create/edit agents in `claude/agents/` directory
2. Run `npm run convert-cursor` to generate Cursor rules
3. Verify sync with `npm run check-cursor-sync`
4. **Bump the version in `claude/.claude-plugin/plugin.json`** — this is required to trigger automated plugin updates for users who have the plugin installed. Without a version bump, their Claude Code will not pick up the new or modified agent. Use semantic versioning: patch for bug fixes, minor for new agents/features, major for breaking changes.
5. Test in both Claude Code and Cursor (if applicable)
6. Submit pull request with both Claude and Cursor files

## Best Practices

### Agent Design

- **Single responsibility** - Each agent should have one clear job
- **Composability** - Agents should work well together
- **Clarity** - Purpose and usage should be immediately obvious
- **Consistency** - Follow established patterns from existing agents

### Documentation

- **Be specific** - Avoid generic phrases like "helps with" or "improves"
- **Include examples** - Show concrete usage scenarios
- **Define boundaries** - Clearly state what the agent does NOT do
- **Use active voice** - Write clear, actionable descriptions

### Technical Considerations

- **Prompt efficiency** - Keep prompts focused and efficient
- **Context awareness** - Consider what context the agent needs
- **Error handling** - Include guidance for edge cases
- **Integration** - Ensure compatibility with existing toolkit

## Examples of Good Agent Specifications

### CSS Utilities Agent

```yaml
description: Expert in applying PatternFly CSS utility classes for styling and layout
capabilities: [
  "apply-patternfly-spacing-utilities",
  "implement-responsive-breakpoints-with-pf-classes",
  "use-patternfly-color-and-background-tokens",
  "apply-patternfly-typography-utilities",
  "implement-flexbox-and-grid-with-pf-utilities"
]
```

### Hook Testing Agent

```yaml
description: Expert in writing unit tests specifically for React hooks
capabilities: [
  "setup-react-hook-testing-environment",
  "write-renderHook-test-cases",
  "test-hook-state-changes-and-effects",
  "handle-hook-cleanup-and-unmounting",
  "mock-dependencies-for-hook-testing"
]
```

## Contributing

When contributing new agents:

1. **Follow these guidelines** for scope and naming
2. **Use Claude Code** for development and testing
3. **Ensure sync** between Claude and Cursor formats
4. **Document clearly** with examples and boundaries
5. **Test thoroughly** before submission

For questions or clarification, refer to the [official Claude Code agent documentation](https://code.claude.com/docs/en/sub-agents#file-format) or open an issue in this repository.