---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Task Sync

Synchronize tasks between local cache and Azure DevOps.

**Usage**: `/azure:task-sync [story-id] [--direction=both]`

**Examples**:
- `/azure:task-sync` - Sync all tasks
- `/azure:task-sync 34` - Sync tasks for Story #34
- `/azure:task-sync --direction=pull` - Only pull from Azure

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### Sync Process

```
🔄 Task Synchronization
═══════════════════════════════════════════════════════════════

Analyzing differences...

Local → Azure (Push):
- Task #102: Hours updated (8h → 6h)
- Task #103: Status changed (Active → Done)

Azure → Local (Pull):
- Task #104: New assignee (john → sarah)
- Task #105: New task created
- Task #106: Deleted in Azure

Conflicts (1):
- Task #102: Hours differ (Local: 6h, Azure: 7h)
  [1] Keep local (6h)
  [2] Keep Azure (7h)
  [3] Skip this task
  
Choose: _

Syncing...
✓ Pushed 2 changes to Azure
✓ Pulled 3 changes from Azure
✓ Resolved 1 conflict

Cache updated: .claude/azure/cache/
Last sync: 2025-01-10T16:00:00Z
```