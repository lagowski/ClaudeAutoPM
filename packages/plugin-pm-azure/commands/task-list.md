---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Task List

List Tasks from User Story or across the project.

**Usage**: `/azure:task-list [user-story-id] [--status=<state>] [--assigned-to=<user>]`

**Examples**:
- `/azure:task-list` - List all tasks in current sprint
- `/azure:task-list 34` - List tasks for User Story #34
- `/azure:task-list --assigned-to=me` - List my tasks
- `/azure:task-list --status=Active` - List active tasks

## Required Environment Variables

Ensure `.claude/.env` contains:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Query Mode Detection

Determine query based on arguments:
- **No args**: Show current sprint tasks
- **Number arg**: Show tasks for that User Story
- **Filters only**: Show filtered tasks across project

### 2. Execute Query

Use azure-devops-specialist agent with WIQL:

#### For User Story Tasks

```sql
SELECT [System.Id], [System.Title], [System.State], 
       [System.AssignedTo], [Microsoft.VSTS.Scheduling.RemainingWork]
FROM workitemLinks
WHERE Source.[System.Id] = {story_id}
  AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
  AND Target.[System.WorkItemType] = 'Task'
ORDER BY Target.[System.Id]
```

#### For My Tasks

```sql
SELECT [System.Id], [System.Title], [System.State],
       [Microsoft.VSTS.Scheduling.RemainingWork], [System.Parent]
FROM workitems
WHERE [System.WorkItemType] = 'Task'
  AND [System.AssignedTo] = @Me
  AND [System.State] <> 'Closed'
ORDER BY [System.State], [System.Id]
```

### 3. Display Formats

#### User Story Task View

```
📋 Tasks for User Story #34: Implement user password reset

Progress: ████████░░░░░░░░ 45% (12h/27h completed)

| ID  | Task                        | Status | Assigned  | Hours | Branch           |
|-----|----------------------------|--------|-----------|-------|------------------|
| 101 | Technical Design           | ✅     | John      | 0/4h  | merged           |
| 102 | Implementation             | 🔄     | John      | 8/12h | task-102-impl    |
| 103 | Unit tests                 | 🆕     | -         | 4h    | -                |
| 104 | Integration tests          | 🆕     | -         | 6h    | -                |
| 105 | Documentation              | 🆕     | -         | 3h    | -                |
| 106 | Code review                | 🆕     | -         | 2h    | -                |

📊 Summary:
- Total: 6 tasks (27h estimated)
- Completed: 1 (4h)
- In Progress: 1 (12h remaining)
- Not Started: 4 (11h)

🚀 Ready to start:
- Task #103: Unit tests (4h) - No dependencies
- Task #104: Integration tests (6h) - Blocked by #102

Commands:
- Start task: /azure:task-start <id>
- Update task: /azure:task-edit <id>
- View details: /azure:task-show <id>
```

#### My Tasks View

```
👤 My Active Tasks

🔄 In Progress:
| ID  | Task                  | Story              | Hours | Started    | Branch        |
|-----|--------------------- |-------------------|-------|------------|---------------|
| 102 | Implementation       | #34 Password Reset | 8/12h | 2 hours ago| task-102-impl |
| 215 | Fix validation bug   | #41 Form Updates   | 1/2h  | Yesterday  | bug-215-fix   |

📋 Assigned to Me:
| ID  | Task                  | Story              | Hours | Priority | Due     |
|-----|--------------------- |-------------------|-------|----------|---------|
| 103 | Unit tests           | #34 Password Reset | 4h    | High     | Today   |
| 220 | Update API docs      | #42 API v2         | 2h    | Medium   | Tomorrow|
| 225 | Review PR #456       | #43 Refactoring    | 1h    | Low      | This week|

⏱️ Time Tracking:
- Today: 3h logged
- This week: 18h logged
- Sprint capacity: 22h/40h used

💡 Recommendations:
- Complete Task #215 (only 1h remaining)
- Start Task #103 after finishing #102
- You have 18h capacity remaining this sprint
```

#### Sprint Board View

```
🏃 Sprint 1 Task Board

To Do (8)          | In Progress (3)      | In Review (2)    | Done (5)
-------------------|---------------------|------------------|------------------
#103 Unit tests    | #102 Implementation | #99 API changes  | #95 Setup
#104 Integration   | #215 Bug fix        | #101 Design doc  | #96 Config
#105 Documentation | #218 UI updates     |                  | #97 Database
#106 Code review   |                     |                  | #98 Auth flow
...                |                     |                  | #100 Logging

📊 Sprint Metrics:
- Velocity: 18h completed / 65h total
- Burn rate: 3.6h/day
- Days remaining: 5
- On track: ⚠️ Slightly behind

🎯 Focus Areas:
- 2 tasks in review need attention
- 3 tasks blocked by dependencies
- Consider pulling task from backlog
```

### 4. Filtering & Sorting

Support multiple filters:

```bash
# Complex query examples
/azure:task-list --status=Active --assigned-to=me --sort=priority
/azure:task-list --sprint="Sprint 1" --hours=">4"
/azure:task-list --parent-story=34,35,36 --status=New
/azure:task-list --blocked=true
/azure:task-list --due=today
```

### 5. Task Dependencies

Show task relationships:

```
🔗 Task Dependencies for Story #34

┌─────────────┐
│ #101 Design │ ✅
└─────┬───────┘
      ↓
┌─────────────────┐
│ #102 Implement  │ 🔄
└─────┬───────────┘
      ├──────────┐
      ↓          ↓
┌──────────┐ ┌──────────────┐
│ #103 Unit│ │ #104 Integ.  │
└──────────┘ └──────────────┘
      ↓          ↓
      └────┬─────┘
           ↓
    ┌──────────┐
    │ #105 Docs│
    └──────────┘
           ↓
    ┌──────────────┐
    │ #106 Review  │
    └──────────────┘
```

### 6. Quick Actions

Provide quick action commands:

```
⚡ Quick Actions:
1. Start next available task
2. Update all my task hours
3. Close completed tasks
4. Generate status report
5. Export to CSV

Select action (1-5): _
```

### 7. Export Options

```bash
# Export task list
/azure:task-list 34 --export=csv > tasks.csv
/azure:task-list --assigned-to=me --export=json > my-tasks.json
```

## Smart Features

### Auto-recommendations
- Suggest next task based on dependencies
- Warn about overdue tasks
- Highlight blockers

### Time Estimates
- Show if on track for sprint
- Calculate completion date
- Suggest task redistribution

### Integration Status
- Show linked PRs
- Display test results
- Link to builds

## Error Handling

- **No tasks found**: Suggest checking filters
- **Story not found**: List available stories
- **Connection error**: Check credentials

## Local Cache

- Cache results for 5 minutes
- Sync with local task files
- Offline mode support