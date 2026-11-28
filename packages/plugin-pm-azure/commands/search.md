---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Search

Search work items across Azure DevOps with advanced filters.

**Usage**: `/azure:search <query> [--type=<type>] [--field=<field>]`

**Examples**:
- `/azure:search "password reset"` - Search all items
- `/azure:search "bug" --type=task` - Search tasks only
- `/azure:search "john" --field=assigned-to` - Search by assignee

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Search Interface

```
🔍 Azure DevOps Search
═══════════════════════════════════════════════════════════════

Query: "password reset"
Filters: All types, All fields, Active items

Searching... Found 8 results

📋 Results:
─────────────────────────────────────────────────────────────

USER STORIES (2)
► #34 Implement user password reset [Active]
  Relevance: ████████████ 100%
  Assigned: john@example.com | Sprint 2
  
► #89 Forgot password flow [Closed]
  Relevance: ████████░░░░ 65%
  Closed: 2 months ago

TASKS (5)
► #102 Implementation - password reset logic [Active]
  Relevance: ████████████ 100%
  Parent: Story #34 | Assigned: john
  
► #103 Unit tests for password reset [Done]
  Relevance: ██████████░░ 85%
  Parent: Story #34 | Completed: Yesterday
  
► #104 Integration tests - password flow [Active]
  Relevance: ████████░░░░ 70%
  Parent: Story #34 | 33% complete

BUGS (1)
► #456 Password reset email not sending [Fixed]
  Relevance: ██████░░░░░░ 50%
  Fixed: Last week | Version: 1.2.3

📊 Search Summary:
- User Stories: 2 (1 active)
- Tasks: 5 (2 active)
- Bugs: 1 (0 active)

Refine search:
[1] Filter by type
[2] Filter by status
[3] Filter by date
[4] New search
[5] Export results

Select (1-5): _
```

### 2. Advanced Query Syntax

```
Supported queries:
- Exact match: "exact phrase"
- Wildcard: pass*
- Field search: assigned:john
- Operators: AND, OR, NOT
- Date: created:>2024-01-01
- State: state:active
- Tags: tag:security

Examples:
/azure:search "state:active AND assigned:@me"
/azure:search "created:>7d AND type:bug"
/azure:search "tag:security OR tag:auth"
```

### 3. Quick Filters

```
🔍 Quick Search Templates:

[1] My active items
[2] Unassigned tasks
[3] Overdue items
[4] Recent changes (last 7d)
[5] High priority bugs
[6] Blocked items
[7] Items without estimates
[8] Custom query

Select template: _
```

### 4. Search Results Actions

```
Select item for actions:
► #34 Implement user password reset

Actions:
[1] View details (/azure:us-show 34)
[2] Edit (/azure:us-edit 34)
[3] Start work (/azure:us-start 34)
[4] View in browser
[5] Copy link
[6] Back to results

Select: _
```

### 5. Export Options

```
Export search results:
- CSV: search-results.csv
- JSON: search-results.json
- Markdown: search-results.md
- HTML: search-results.html

Include:
✓ Title and ID
✓ Status
✓ Assigned To
✓ Dates
□ Description
□ Comments
□ History
```