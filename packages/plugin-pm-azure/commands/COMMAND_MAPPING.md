# PM and Azure DevOps Command Mapping

## 🤝 Complementary Systems

**IMPORTANT**: The PM and Azure systems are designed to **coexist and complement** each other, not replace one another.

- **PM System** (`/pm:*`): Local, file-based, works offline, universal git platform support
- **Azure System** (`/azure:*`): Enterprise integration, team collaboration, metrics tracking

See [PM-AZURE-COEXISTENCE.md](../../docs/PM-AZURE-COEXISTENCE.md) for detailed strategy.

## Command Translation Table

Below is a mapping showing equivalent commands between systems. Use the system that best fits your current context.

### PRD Commands → User Story Commands

| PM Command | Azure DevOps Command | Status | Description |
|------------|---------------------|---------|-------------|
| `/pm:prd-new` | `/azure:us-new` | ✅ Created | Create new User Story |
| `/pm:prd-list` | `/azure:us-list` | ✅ Created | List User Stories |
| `/pm:prd-edit` | `/azure:us-edit` | ✅ Created | Edit User Story |
| `/pm:prd-parse` | `/azure:us-parse` | ✅ Created | Parse User Story into Tasks |
| `/pm:prd-status` | `/azure:us-status` | ✅ Created | User Story status dashboard |

### Issue Commands → Task Commands

| PM Command | Azure DevOps Command | Status | Description |
|------------|---------------------|---------|-------------|
| `/pm:issue-start` | `/azure:task-start` | ✅ Created | Start working on Task |
| `/pm:issue-close` | `/azure:task-close` | ✅ Created | Complete Task |
| `/pm:issue-edit` | `/azure:task-edit` | ✅ Created | Edit Task details |
| `/pm:issue-show` | `/azure:task-show` | ✅ Created | Show Task details |
| `/pm:issue-status` | `/azure:task-status` | ✅ Created | Task status |
| `/pm:issue-sync` | `/azure:task-sync` | ✅ Created | Sync Tasks |
| `/pm:issue-reopen` | `/azure:task-reopen` | ✅ Created | Reopen closed Task |
| `/pm:issue-analyze` | `/azure:task-analyze` | 🔧 TODO | Analyze Task patterns |

### Epic Commands → Feature Commands

| PM Command | Azure DevOps Command | Status | Description |
|------------|---------------------|---------|-------------|
| `/pm:epic-decompose` | `/azure:feature-decompose` | ✅ Created | Break down Feature into User Stories |
| `/pm:epic-start` | `/azure:feature-start` | ✅ Created | Start Feature development |
| `/pm:epic-close` | `/azure:feature-close` | 🔧 TODO | Complete Feature |
| `/pm:epic-edit` | `/azure:feature-edit` | 🔧 TODO | Edit Feature details |
| `/pm:epic-list` | `/azure:feature-list` | ✅ Created | List Features |
| `/pm:epic-show` | `/azure:feature-show` | 🔧 TODO | Show Feature details |
| `/pm:epic-status` | `/azure:feature-status` | 🔧 TODO | Feature progress dashboard |
| `/pm:epic-sync` | `/azure:feature-sync` | 🔧 TODO | Sync Features |
| `/pm:epic-merge` | `/azure:feature-merge` | 🔧 TODO | Merge Feature branches |
| `/pm:epic-refresh` | `/azure:feature-refresh` | 🔧 TODO | Refresh Feature from source |
| `/pm:epic-oneshot` | `/azure:feature-oneshot` | 🔧 TODO | Quick Feature creation |

### Workflow Commands → Sprint/Board Commands

| PM Command | Azure DevOps Command | Status | Description |
|------------|---------------------|---------|-------------|
| `/pm:status` | `/azure:sprint-status` | ✅ Created | Sprint overview dashboard |
| `/pm:standup` | `/azure:standup` | ✅ Created | Daily standup report |
| `/pm:next` | `/azure:next-task` | ✅ Created | Get next recommended task |
| `/pm:in-progress` | `/azure:active-work` | ✅ Created | Show all active work items |
| `/pm:blocked` | `/azure:blocked-items` | ✅ Created | List blocked work items |
| `/pm:search` | `/azure:search` | 🔧 TODO | Search work items |
| `/pm:validate` | `/azure:validate` | 🔧 TODO | Validate work item structure |
| `/pm:clean` | `/azure:clean` | 🔧 TODO | Clean up completed items |

### System Commands → Azure DevOps Config

| PM Command | Azure DevOps Command | Status | Description |
|------------|---------------------|---------|-------------|
| `/pm:init` | `/azure:init` | 🔧 TODO | Initialize Azure DevOps project |
| `/pm:import` | `/azure:import-us` | ✅ Created | Import from external source |
| `/pm:sync` | `/azure:sync-all` | 🔧 TODO | Full bi-directional sync |
| `/pm:help` | `/azure:help` | 🔧 TODO | Azure DevOps command help |
| `/pm:test-reference-update` | `/azure:test-sync` | 🔧 TODO | Sync test references |

## Implementation Priority

### 🎯 High Priority (Core Workflow)
1. `/azure:us-edit` - Edit User Stories
2. `/azure:task-edit` - Edit Tasks
3. `/azure:task-show` - View Task details
4. `/azure:sprint-status` - Sprint dashboard
5. `/azure:standup` - Daily standup

### 📊 Medium Priority (Management)
1. `/azure:feature-list` - List all Features
2. `/azure:feature-status` - Feature dashboard
3. `/azure:feature-start` - Start Feature work
4. `/azure:feature-close` - Complete Feature
5. `/azure:active-work` - Active items view
6. `/azure:blocked-items` - Blocked items

### 🔧 Low Priority (Advanced)
1. `/azure:feature-merge` - Merge Feature branches
2. `/azure:task-analyze` - Task analytics
4. `/azure:search` - Advanced search
5. `/azure:validate` - Validation tools
6. `/azure:clean` - Cleanup utilities

## Command Files to Create

### Next Batch (High Priority)

```bash
# User Story Management
.claude/commands/azure/us-edit.md
.claude/commands/azure/us-show.md
.claude/commands/azure/us-sync.md
.claude/commands/azure/us-close.md

# Task Management
.claude/commands/azure/task-edit.md
.claude/commands/azure/task-show.md
.claude/commands/azure/task-status.md
.claude/commands/azure/task-sync.md
.claude/commands/azure/task-reopen.md
.claude/commands/azure/task-analyze.md
.claude/commands/azure/task-new.md

# Feature Management
.claude/commands/azure/feature-new.md
.claude/commands/azure/feature-list.md
.claude/commands/azure/feature-show.md
.claude/commands/azure/feature-edit.md
.claude/commands/azure/feature-status.md
.claude/commands/azure/feature-start.md
.claude/commands/azure/feature-close.md
.claude/commands/azure/feature-sync.md
.claude/commands/azure/feature-merge.md

# Sprint/Workflow
.claude/commands/azure/sprint-status.md
.claude/commands/azure/sprint-plan.md
.claude/commands/azure/standup.md
.claude/commands/azure/next-task.md
.claude/commands/azure/active-work.md
.claude/commands/azure/blocked-items.md

# System
.claude/commands/azure/init.md
.claude/commands/azure/sync-all.md
.claude/commands/azure/search.md
.claude/commands/azure/validate.md
.claude/commands/azure/clean.md
.claude/commands/azure/help.md
```

## Azure DevOps Work Item Hierarchy

```
Feature/Epic
    └── User Story
            └── Task
                  └── Sub-task (optional)
```

## Field Mapping

### User Story Fields
- **Title** → System.Title
- **Description** → System.Description  
- **Acceptance Criteria** → Microsoft.VSTS.Common.AcceptanceCriteria
- **Story Points** → Microsoft.VSTS.Scheduling.StoryPoints
- **Priority** → Microsoft.VSTS.Common.Priority
- **Sprint** → System.IterationPath
- **Area** → System.AreaPath

### Task Fields
- **Title** → System.Title
- **Description** → System.Description
- **Remaining Work** → Microsoft.VSTS.Scheduling.RemainingWork
- **Original Estimate** → Microsoft.VSTS.Scheduling.OriginalEstimate
- **Completed Work** → Microsoft.VSTS.Scheduling.CompletedWork
- **Activity** → Microsoft.VSTS.Common.Activity

### Feature Fields
- **Title** → System.Title
- **Description** → System.Description
- **Business Value** → Microsoft.VSTS.Common.BusinessValue
- **Time Criticality** → Microsoft.VSTS.Common.TimeCriticality
- **Effort** → Microsoft.VSTS.Scheduling.Effort
- **Target Date** → Microsoft.VSTS.Scheduling.TargetDate

## State Mappings

### User Story States
- `backlog` → New
- `ready` → Ready
- `active` → Active
- `resolved` → Resolved
- `closed` → Closed
- `removed` → Removed

### Task States
- `new` → To Do
- `active` → In Progress
- `resolved` → Done
- `closed` → Closed
- `removed` → Removed

### Feature States
- `new` → New
- `in_progress` → In Progress
- `testing` → Testing
- `done` → Done
- `closed` → Closed

## Quick Reference

### Most Used Commands

```bash
# Daily workflow
/azure:standup                    # Morning standup
/azure:task-start <id>            # Start task
/azure:task-close <id>            # Complete task
/azure:next-task                  # Get next task

# Planning
/azure:us-new <name>              # Create User Story
/azure:us-parse <id>              # Break into tasks
/azure:sprint-plan                # Plan sprint

# Status
/azure:sprint-status              # Sprint dashboard
/azure:us-status <id>             # Story progress
/azure:blocked-items              # Show blockers
```

## Integration Points

### Git Integration
- Branch naming: `task-{id}-{title}`
- PR templates included
- Auto-merge capabilities

### CI/CD Integration
- Pipeline status tracking
- Build associations
- Deployment tracking

### Time Tracking
- Automatic time logging
- Capacity planning
- Velocity calculations

### Notifications
- Status change alerts
- Assignment notifications
- Blocker escalations