---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Validate

Validate work item structure and relationships for consistency.

**Usage**: `/azure:validate [--fix] [--type=<type>]`

**Examples**:
- `/azure:validate` - Check all items
- `/azure:validate --fix` - Auto-fix issues
- `/azure:validate --type=story` - Validate stories only

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### Validation Report

```
🔍 Azure DevOps Validation Report
═══════════════════════════════════════════════════════════════

Checking work item integrity...

✅ PASSED (45 items)
─────────────────────────────────────────────────────────────
✓ All tasks have parent stories
✓ All stories have valid estimates
✓ No duplicate work items
✓ All required fields populated

⚠️ WARNINGS (8 items)
─────────────────────────────────────────────────────────────
• Story #34: Missing acceptance criteria
• Task #102: No remaining hours set
• Task #105: Not assigned
• Feature #27: No target date

❌ ERRORS (3 items)
─────────────────────────────────────────────────────────────
• Task #108: Orphaned (parent deleted)
• Story #39: Invalid state transition
• Task #112: Circular dependency

📋 Recommendations:
─────────────────────────────────────────────────────────────
1. Add acceptance criteria to Story #34
2. Assign Task #105 to team member
3. Delete orphaned Task #108
4. Fix Story #39 state

Auto-fix available for 2 issues.
Run with --fix? (y/n): _
```

### Validation Rules

```
Checking:
✓ Parent-child relationships
✓ Required fields
✓ State transitions
✓ Estimate ranges
✓ Date consistency
✓ Assignment validity
✓ Dependency cycles
✓ Duplicate detection
```