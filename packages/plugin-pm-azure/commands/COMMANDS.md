# Azure DevOps Command Equivalents

## Complete PM → Azure Command Mapping

```bash
# PRD → User Story
/pm:prd-new         →  /azure:us-new
/pm:prd-list        →  /azure:us-list  
/pm:prd-edit        →  /azure:us-edit
/pm:prd-parse       →  /azure:us-parse
/pm:prd-status      →  /azure:us-status

# Issue → Task
/pm:issue-start     →  /azure:task-start
/pm:issue-close     →  /azure:task-close
/pm:issue-edit      →  /azure:task-edit
/pm:issue-show      →  /azure:task-show
/pm:issue-status    →  /azure:task-status
/pm:issue-sync      →  /azure:task-sync
/pm:issue-reopen    →  /azure:task-reopen
/pm:issue-analyze   →  /azure:task-analyze

# Epic → Feature
/pm:epic-decompose  →  /azure:feature-decompose
/pm:epic-start      →  /azure:feature-start
/pm:epic-close      →  /azure:feature-close
/pm:epic-edit       →  /azure:feature-edit
/pm:epic-list       →  /azure:feature-list
/pm:epic-show       →  /azure:feature-show
/pm:epic-status     →  /azure:feature-status
/pm:epic-sync       →  /azure:feature-sync
/pm:epic-merge      →  /azure:feature-merge
/pm:epic-refresh    →  /azure:feature-refresh
/pm:epic-oneshot    →  /azure:feature-oneshot

# Workflow → Sprint/Board
/pm:status          →  /azure:sprint-status
/pm:standup         →  /azure:standup
/pm:next            →  /azure:next-task
/pm:in-progress     →  /azure:active-work
/pm:blocked         →  /azure:blocked-items
/pm:search          →  /azure:search
/pm:validate        →  /azure:validate
/pm:clean           →  /azure:clean

# System → Config
/pm:init            →  /azure:init
/pm:import          →  /azure:import
/pm:sync            →  /azure:sync-all
/pm:help            →  /azure:help
/pm:test-reference-update → /azure:test-sync
```

## Already Implemented ✅

```bash
/azure:us-new          # ✅ Created
/azure:us-list         # ✅ Created
/azure:us-parse        # ✅ Created
/azure:us-status       # ✅ Created
/azure:import-us       # ✅ Created (maps to /pm:import)
/azure:task-start      # ✅ Created
/azure:task-list       # ✅ Created
/azure:task-close      # ✅ Created
/azure:feature-decompose # ✅ Created
```

## Need to Create 🔧

```bash
# High Priority
/azure:us-edit
/azure:us-show
/azure:task-edit
/azure:task-show
/azure:task-status
/azure:sprint-status
/azure:standup
/azure:next-task

# Medium Priority  
/azure:feature-new
/azure:feature-list
/azure:feature-start
/azure:feature-close
/azure:feature-status
/azure:active-work
/azure:blocked-items

# Low Priority
/azure:task-sync
/azure:task-reopen
/azure:task-analyze
/azure:feature-edit
/azure:feature-show
/azure:feature-sync
/azure:feature-merge
/azure:feature-refresh
/azure:feature-oneshot
/azure:search
/azure:validate
/azure:clean
/azure:init
/azure:sync-all
/azure:help
/azure:test-sync
```