---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps User Story Edit

Edit User Story fields and properties in Azure DevOps.

**Usage**: `/azure:us-edit <story-id> [--field=value]`

**Examples**:
- `/azure:us-edit 34 --title="Updated title"`
- `/azure:us-edit 34 --points=13 --priority=1`
- `/azure:us-edit 34 --status=Active --assigned-to=john@example.com`
- `/azure:us-edit 34 --description="New description" --sprint="Sprint 2"`

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

### 1. Parse Edit Arguments

Extract field updates from arguments:
- `--title`: Story title
- `--description`: Full description
- `--acceptance-criteria`: Acceptance criteria
- `--points`: Story points
- `--priority`: Priority (1-4)
- `--status`: State (New, Active, Resolved, Closed)
- `--assigned-to`: Assignee email
- `--sprint`: Iteration path
- `--area`: Area path
- `--tags`: Comma-separated tags

### 2. Interactive Edit Mode

If no fields specified, enter interactive mode:

```
📝 Editing User Story #34: Implement user password reset

Current values shown in [brackets]. Press Enter to keep current value.

Title [Implement user password reset]: 
Description [As a user, I want...]: 
Story Points [8]: 13
Priority [2]: 1
Status [New]: Active
Assigned To [Unassigned]: john@example.com
Sprint [Backlog]: Sprint 2
Area [Speacher]: Speacher\Security
Tags []: security, high-priority

Confirm changes? (y/n): _
```

### 3. Update via Azure DevOps API

Use azure-devops-specialist agent to update:

```json
[
  {
    "op": "replace",
    "path": "/fields/System.Title",
    "value": "{new_title}"
  },
  {
    "op": "replace",
    "path": "/fields/Microsoft.VSTS.Scheduling.StoryPoints",
    "value": {story_points}
  },
  {
    "op": "replace",
    "path": "/fields/System.State",
    "value": "{state}"
  }
]
```

### 4. Success Output

```
✅ User Story #34 updated successfully!

📋 Changed fields:
- Title: "Implement user password reset" → "Implement secure password reset"
- Story Points: 8 → 13
- Priority: 2 → 1
- Status: New → Active
- Assigned To: Unassigned → john@example.com
- Sprint: Backlog → Sprint 2

🔗 View in Azure DevOps:
https://dev.azure.com/{org}/{project}/_workitems/edit/34

📊 Impact:
- Sprint capacity: 45/50 points (was 40/50)
- Tasks affected: 6 child tasks
- Dependencies: May affect Story #35

Next steps:
- Update child tasks: /azure:task-list 34
- Notify team: /azure:notify-team 34
- View status: /azure:us-status 34
```

## Bulk Edit Mode

Edit multiple stories:

```bash
# Edit multiple stories
/azure:us-edit 34,35,36 --sprint="Sprint 2"

# Edit all stories in sprint
/azure:us-edit --sprint="Sprint 1" --set-priority=2

# Edit by query
/azure:us-edit --query="status=New" --assigned-to=me
```

## Field Validation

- Story points: 0, 1, 2, 3, 5, 8, 13, 20, 40, 100
- Priority: 1 (Critical), 2 (High), 3 (Medium), 4 (Low)
- Status transitions must be valid
- Assignee must exist in project

## History Tracking

Add comment with changes:
```
Changes made via AutoPM Azure integration:
- Updated story points: 8 → 13
- Changed priority: 2 → 1
- Reassigned to john@example.com
Reason: Sprint planning adjustment
```