---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Sync All

Full bidirectional synchronization of all work items.

**Usage**: `/azure:sync-all [--force] [--dry-run]`

**Examples**:
- `/azure:sync-all` - Normal sync
- `/azure:sync-all --dry-run` - Preview changes
- `/azure:sync-all --force` - Overwrite conflicts

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### Full Sync Process

```
🔄 Full Azure DevOps Synchronization
═══════════════════════════════════════════════════════════════

Scanning work items...
- Features: 4 in Azure, 3 local
- User Stories: 12 in Azure, 10 local
- Tasks: 45 in Azure, 42 local

Changes to sync:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Push to Azure (5 items):
  ↑ Story #34: Status update
  ↑ Task #102: Hours logged
  ↑ Task #103: Completed
  ↑ Feature #25: Progress update
  ↑ Bug #215: Fixed

Pull from Azure (8 items):
  ↓ Story #35: New story
  ↓ Task #110-115: New tasks
  ↓ Feature #26: Updated

Conflicts (2 items):
  ⚠️ Task #102: Different hours
  ⚠️ Story #34: Different status

Resolution strategy:
[1] Azure wins all conflicts
[2] Local wins all conflicts
[3] Resolve individually
[4] Cancel sync

Choose: 3

Syncing... ████████████████████ 100%

✅ Sync Complete!
- Pushed: 5 items
- Pulled: 8 items
- Conflicts resolved: 2
- Errors: 0

Next sync scheduled: 5 minutes
```

### Sync Report

```
📊 Sync Report - 2025-01-10 16:00

Items Synced:
- Features: 4/4 ✓
- Stories: 12/12 ✓
- Tasks: 45/45 ✓

Performance:
- Duration: 3.2s
- API calls: 15
- Cache hits: 80%

Health Status: ✅ Excellent
```