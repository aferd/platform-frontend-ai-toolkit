---
agent: hcc-frontend-jira-issue-creator
description: Dry run test cases for label, assignee, activity type, security level, and response format behavior.
---

# Test Cases

Run all tests as dry runs using `subagent_type: hcc-frontend-ai-toolkit:hcc-frontend-jira-issue-creator` from the root of this repository.

## How to Run

Paste this prompt into a Claude Code session from the root of this repository:

```text
Run the agent test suite for hcc-frontend-jira-issue-creator. Test cases are in tests/agents/hcc-frontend-jira-issue-creator.test.md in this repository.

Run all 6 tests in parallel using subagent_type: hcc-frontend-ai-toolkit:hcc-frontend-jira-issue-creator. Report pass/fail per expected field for each test.
```

---

## T1 — Framework team, bot assigned

**Prompt:**
> Dry run: Create a framework team ticket for insights-chrome to fix stale Tekton task bundle digests in .tekton/ files (security vulnerability). Assign to the bot. Show all fields.

**Expected:**

| Field | Value |
|-------|-------|
| Labels | `platform-experience-services`, `hcc-ai-framework`, `repo:insights-chrome` |
| Assignee | fetched email via `jira_get_user_profile` (not hardcoded) |
| Activity Type | Security & Compliance |
| Team | Console - Framework |
| Security Level | `Red Hat Employee` (auto-set — activity type is Security & Compliance) |
| Warning shown | yes — agent should note that creation response will be restricted to ticket number + URL |

---

## T2 — UI team, bot assigned

**Prompt:**
> Dry run: Create a UI team ticket for insights-chrome to fix stale Tekton task bundle digests in .tekton/ files (security vulnerability). Assign to the bot. Show all fields.

**Expected:**

| Field | Value |
|-------|-------|
| Labels | `platform-experience-ui`, `hcc-ai-framework`, `repo:insights-chrome` |
| Must NOT contain | `platform-experience-services` |
| Assignee | fetched email via `jira_get_user_profile` |
| Activity Type | Security & Compliance |
| Team | Console - UI |
| Security Level | `Red Hat Employee` (auto-set — activity type is Security & Compliance) |
| Warning shown | yes — agent should note that creation response will be restricted to ticket number + URL |

---

## T3 — Framework team, unassigned

**Prompt:**
> Dry run: Create an unassigned framework team ticket for insights-chrome — update PatternFly to latest major version. Show all fields.

**Expected:**

| Field | Value |
|-------|-------|
| Labels | `platform-experience-services` |
| Must NOT contain | `hcc-ai-framework`, `repo:insights-chrome` |
| Assignee | none |
| Activity Type | Future Sustainability |
| Team | Console - Framework |
| Security Level | not set |

---

## T4 — UI team, unassigned

**Prompt:**
> Dry run: Create an unassigned UI team bug ticket for insights-chrome — navigation sidebar collapses unexpectedly on mobile viewports. Show all fields.

**Expected:**

| Field | Value |
|-------|-------|
| Labels | `platform-experience-ui` |
| Must NOT contain | `platform-experience-services`, `hcc-ai-framework` |
| Assignee | none |
| Activity Type | Quality / Stability / Reliability |
| Team | Console - UI |
| Security Level | not set |

---

## T5 — Security level set via explicit phrase

**Prompt:**
> Dry run: Create a Red Hat Employee only framework team ticket for insights-chrome — update PatternFly to latest major version. Unassigned.

**Expected:**

| Field | Value |
|-------|-------|
| Activity Type | Future Sustainability (upgrade keyword — not Security & Compliance) |
| Security Level | `Red Hat Employee` (set via explicit phrase — not auto from activity type) |
| Response format | full dry run preview (restriction applies to post-creation response only) |
| Warning shown | yes — agent should note that creation response will be restricted to ticket number + URL |

---

## T6 — Security level not set (full response)

**Prompt:**
> Dry run: Create a framework team ticket for insights-chrome — update PatternFly to latest major version. Unassigned.

**Expected:**

| Field | Value |
|-------|-------|
| Security Level | not set |
| Response format | full field preview |
