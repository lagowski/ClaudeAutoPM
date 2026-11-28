---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Task Status

Show status overview of tasks for a story or sprint.

**Usage**: `/azure:task-status [story-id] [--sprint=<name>]`

**Examples**:
- `/azure:task-status 34` - Tasks for Story #34
- `/azure:task-status --sprint="Sprint 2"` - All sprint tasks
- `/azure:task-status --my-tasks` - Your task status

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### Display Format

```
📊 Task Status Overview - Story #34
═══════════════════════════════════════════════════════════════

Progress: ████████████░░░░░░░░ 60% (3/5 tasks)
Hours: ███████████░░░░░░░░░ 55% (15h/27h)

Task Breakdown:
✅ Completed: 3 tasks (15h)
🔄 In Progress: 1 task (4h remaining)
🆕 Not Started: 1 task (8h)
🚫 Blocked: 0 tasks

| Status | Task | Hours | Assigned | Health |
|--------|------|-------|----------|--------|
| ✅ | #101 Technical Design | 4h/4h | John | ✓ |
| ✅ | #102 Implementation | 12h/12h | John | ✓ |
| ✅ | #103 Unit tests | 4h/4h | Sarah | ✓ |
| 🔄 | #104 Integration tests | 2h/6h | Sarah | ⚠️ |
| 🆕 | #105 Documentation | 0h/3h | - | - |

⚠️ Attention Needed:
- Task #104 behind schedule
- Task #105 not assigned

Est. Completion: 2 days
Sprint Ends: 2 days
Risk: Medium
```