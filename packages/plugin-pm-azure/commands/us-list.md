---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps User Story List

List and filter User Stories from Azure DevOps project.

**Usage**: `/azure:us-list [--status=<state>] [--assigned-to=<user>] [--sprint=<iteration>]`

**Examples**: 
- `/azure:us-list` - List all User Stories
- `/azure:us-list --status=Active` - List active User Stories
- `/azure:us-list --sprint="Sprint 1"` - List stories in specific sprint
- `/azure:us-list --assigned-to=me` - List my User Stories

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

### 1. Parse Arguments

Extract filters from arguments:
- `--status`: Filter by state (New, Active, Resolved, Closed)
- `--assigned-to`: Filter by assignee (email or "me")
- `--sprint`: Filter by iteration path
- `--area`: Filter by area path
- `--limit`: Maximum number of results (default: 20)

### 2. Query User Stories

Use azure-devops-specialist agent to execute WIQL query:

```sql
SELECT [System.Id], 
       [System.Title], 
       [System.State],
       [System.AssignedTo],
       [Microsoft.VSTS.Common.Priority],
       [Microsoft.VSTS.Scheduling.StoryPoints],
       [System.IterationPath]
FROM workitems
WHERE [System.WorkItemType] = 'User Story'
  AND [System.TeamProject] = @project
  [AND additional filters based on arguments]
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] DESC
```

### 3. Display Format

Present results in a clean table format:

```
📋 User Stories in Speacher

| ID  | Title                          | Status | Points | Assigned To      | Sprint    | Priority |
|-----|--------------------------------|--------|--------|------------------|-----------|----------|
| 34  | Implement user password reset  | New    | 8      | Unassigned      | Backlog   | 2        |
| 33  | Create user profile page       | Active | 5      | john@example.com | Sprint 1  | 1        |
| 32  | Add OAuth integration          | Active | 13     | jane@example.com | Sprint 1  | 1        |
| 31  | Implement search functionality | New    | 8      | Unassigned      | Sprint 2  | 3        |

📊 Summary:
- Total: 4 User Stories
- Total Points: 34
- Active: 2 | New: 2 | Resolved: 0 | Closed: 0

Filters applied: None

💡 Tips:
- View details: /azure:us-show <id>
- Edit story: /azure:us-edit <id>
- Parse into tasks: /azure:us-parse <id>
- Start work: /azure:us-start <id>
```

### 4. Status Indicators

Use visual indicators for status:
- 🆕 New
- 🔄 Active/In Progress
- ✅ Resolved
- 🔒 Closed
- 🚫 Removed

### 5. Sprint Overview Mode

If `--sprint` is specified, show sprint-specific metrics:

```
🏃 Sprint 1 User Stories

Progress: ████████░░░░░░░░ 45% (9/20 points)

| ID  | Title                    | Points | Status | Assigned  | Tasks  |
|-----|--------------------------|--------|--------|-----------|--------|
| 33  | Create user profile page | 5      | 🔄     | John      | 3/5    |
| 32  | Add OAuth integration    | 13     | 🔄     | Jane      | 2/8    |
| 30  | Fix login bug           | 2      | ✅     | Mike      | 5/5    |

Sprint Health:
- On Track: 2 stories
- At Risk: 1 story (OAuth integration - only 25% tasks complete)
- Completed: 1 story

Velocity: 2 points completed, 18 remaining
Sprint ends in: 5 days
```

### 6. My Work Mode

If `--assigned-to=me` show personalized view:

```
👤 My User Stories

Active Work:
| ID  | Title                    | Points | Sprint   | Tasks | Next Task           |
|-----|--------------------------|--------|----------|-------|---------------------|
| 33  | Create user profile page | 5      | Sprint 1 | 3/5   | Implement UI (4h)   |

Backlog:
| ID  | Title                 | Points | Priority | Sprint   |
|-----|----------------------|--------|----------|----------|
| 35  | Add notifications    | 8      | 2        | Sprint 2 |
| 36  | Implement dashboard  | 5      | 3        | Backlog  |

📊 Your Stats:
- Active: 1 story (5 points)
- Backlog: 2 stories (13 points)
- Completed this sprint: 0
- Average velocity: 8 points/sprint
```

### 7. Export Options

Add export capability:

```
Export options:
- Save as CSV: Add --export=csv
- Save as JSON: Add --export=json
- Save as Markdown: Add --export=md

Results saved to: .claude/azure/exports/us-list-[timestamp].[format]
```

## Advanced Filters

Support complex queries:

```bash
# Stories with high priority and no assignee
/azure:us-list --priority=1 --assigned-to=unassigned

# Stories with specific tags
/azure:us-list --tags="backend,api"

# Stories modified in last 7 days
/azure:us-list --modified-since=7d

# Stories with story points >= 8
/azure:us-list --points=">=8"
```

## Error Handling

- **No results**: Show helpful message with suggestion to adjust filters
- **Connection error**: Verify credentials and network
- **Invalid filter**: Show valid filter options

## Local Cache

Cache results locally for quick access:
- Cache file: `.claude/azure/cache/us-list.json`
- Cache duration: 5 minutes
- Force refresh: Add `--refresh` flag