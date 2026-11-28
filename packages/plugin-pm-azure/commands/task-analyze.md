---
name: /azure:task-analyze
type: task-management
category: azure
---

# /azure:task-analyze

Analyze Task patterns and metrics in Azure DevOps to identify bottlenecks and improvements.

## Usage

```bash
/azure:task-analyze [options]
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.


## Description

Performs deep analysis on Tasks to identify patterns, bottlenecks, and areas for improvement.

## Steps

1. **Gather Task data**
   ```bash
   # Get all tasks from current sprint
   sprint=$(az boards iteration project current --query "path" -o tsv)

   # Fetch task metrics
   az boards query --wiql "SELECT [System.Id], [System.Title], [System.State], \
     [Microsoft.VSTS.Scheduling.OriginalEstimate], \
     [Microsoft.VSTS.Scheduling.RemainingWork], \
     [Microsoft.VSTS.Scheduling.CompletedWork], \
     [System.CreatedDate], [Microsoft.VSTS.Common.ClosedDate], \
     [System.AssignedTo] \
     FROM WorkItems \
     WHERE [System.WorkItemType] = 'Task' \
     AND [System.IterationPath] = '$sprint'" \
     --output json > tasks.json
   ```

2. **Calculate metrics**
   ```bash
   # Cycle time analysis
   echo "📊 Task Cycle Time Analysis:"
   jq -r '.[] |
     select(.fields["Microsoft.VSTS.Common.ClosedDate"] != null) |
     {
       id: .id,
       title: .fields["System.Title"],
       created: .fields["System.CreatedDate"],
       closed: .fields["Microsoft.VSTS.Common.ClosedDate"],
       cycle_days: (((.fields["Microsoft.VSTS.Common.ClosedDate"] | fromdate) -
                     (.fields["System.CreatedDate"] | fromdate)) / 86400 | floor)
     }' tasks.json | jq -s 'sort_by(.cycle_days) | reverse'

   # Estimation accuracy
   echo "📈 Estimation Accuracy:"
   jq -r '.[] |
     select(.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] != null) |
     {
       id: .id,
       title: .fields["System.Title"],
       original: .fields["Microsoft.VSTS.Scheduling.OriginalEstimate"],
       completed: .fields["Microsoft.VSTS.Scheduling.CompletedWork"],
       accuracy: ((.fields["Microsoft.VSTS.Scheduling.CompletedWork"] // 0) /
                  .fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] * 100 | floor)
     }' tasks.json
   ```

3. **Identify patterns**
   ```bash
   # Blocked tasks
   echo "🚫 Frequently Blocked Tasks:"
   az boards query --wiql "SELECT [System.Id], [System.Title], [System.Tags] \
     FROM WorkItems \
     WHERE [System.WorkItemType] = 'Task' \
     AND [System.Tags] CONTAINS 'blocked'" \
     --output table

   # Overdue tasks
   echo "⏰ Overdue Tasks:"
   az boards query --wiql "SELECT [System.Id], [System.Title], [System.AssignedTo] \
     FROM WorkItems \
     WHERE [System.WorkItemType] = 'Task' \
     AND [System.State] != 'Closed' \
     AND [Microsoft.VSTS.Scheduling.TargetDate] < @today" \
     --output table
   ```

4. **Team performance**
   ```bash
   # Tasks per assignee
   echo "👥 Task Distribution:"
   jq -r '.[] | .fields["System.AssignedTo"].displayName' tasks.json | \
     sort | uniq -c | sort -rn

   # Average completion time per person
   echo "⏱️ Average Completion Time by Assignee:"
   jq -r '.[] |
     select(.fields["Microsoft.VSTS.Common.ClosedDate"] != null) |
     {
       assignee: .fields["System.AssignedTo"].displayName,
       cycle_days: (((.fields["Microsoft.VSTS.Common.ClosedDate"] | fromdate) -
                     (.fields["System.CreatedDate"] | fromdate)) / 86400 | floor)
     }' tasks.json | \
     jq -s 'group_by(.assignee) |
            map({assignee: .[0].assignee,
                 avg_days: (map(.cycle_days) | add / length | floor)})'
   ```

5. **Generate recommendations**
   ```bash
   echo "💡 Recommendations:"

   # Check for unassigned tasks
   unassigned=$(jq '[.[] | select(.fields["System.AssignedTo"] == null)] | length' tasks.json)
   [ "$unassigned" -gt 0 ] && echo "- Assign $unassigned unassigned tasks"

   # Check for tasks without estimates
   unestimated=$(jq '[.[] | select(.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] == null)] | length' tasks.json)
   [ "$unestimated" -gt 0 ] && echo "- Add estimates to $unestimated tasks"

   # Check for long-running tasks
   long_tasks=$(jq '[.[] |
     select(.fields["System.State"] == "In Progress") |
     select(((now - (.fields["System.CreatedDate"] | fromdate)) / 86400) > 5)] | length' tasks.json)
   [ "$long_tasks" -gt 0 ] && echo "- Review $long_tasks tasks in progress > 5 days"
   ```

## Options

- `--sprint <name>` - Analyze specific sprint
- `--team <name>` - Filter by team
- `--days <n>` - Look back n days (default: 30)
- `--export` - Export analysis to CSV
- `--detailed` - Show detailed task breakdown

## Examples

```bash
# Analyze current sprint
/azure:task-analyze

# Analyze specific sprint
/azure:task-analyze --sprint "Sprint 23"

# Export analysis
/azure:task-analyze --export > analysis.csv

# Detailed analysis for last 14 days
/azure:task-analyze --days 14 --detailed
```

## Metrics Provided

- **Cycle Time** - Time from creation to completion
- **Lead Time** - Time from ready to done
- **Estimation Accuracy** - Actual vs estimated hours
- **Throughput** - Tasks completed per day/week
- **WIP (Work in Progress)** - Current active tasks
- **Blockers** - Frequency and duration of blocks
- **Team Velocity** - Story points per sprint

## Related Commands

- `/azure:task-status` - Current task status
- `/azure:sprint-status` - Sprint overview
- `/azure:blocked-items` - List blocked items
- `/pm:issue-analyze` - Analyze local issues (PM system)