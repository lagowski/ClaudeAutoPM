---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Task Start

Start working on a Task - update status, create branch, and set up work environment.

**Usage**: `/azure:task-start <task-id> [--branch-name=<name>]`

**Examples**:
- `/azure:task-start 101` - Start task and auto-create branch
- `/azure:task-start 101 --branch-name=fix-login-bug` - Start with custom branch name

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

**CRITICAL**: This command MUST use the azure-devops-specialist agent for all Azure DevOps operations.

### Command Execution Pattern

```bash
# Use the Task tool to invoke the azure-devops-specialist agent
Task(subagent_type="azure-devops-specialist", 
     description="Start Azure DevOps Task",
     prompt="Start working on Azure DevOps Task ID: **$ARGUMENTS**
     
Follow the complete workflow:
1. Preflight checks and task validation
2. Task activation and status updates
3. Development environment setup
4. Context preparation and documentation
5. Progress tracking and confirmation")
```

### Agent Instructions

#### 1. Preflight Checks

1. **Validate Task ID:**
   - Verify task exists in Azure DevOps
   - Check current status (should be "New" or "To Do")
   - If already "Active", ask: "Task already in progress. Continue anyway?"

2. **Get Task Details:**
   - Fetch task title, description, parent User Story
   - Display current assignee and remaining hours
   - Show related tasks if any

#### 2. Task Activation Process

Execute the following Azure DevOps operations:

#### Update Task Status

```json
[
  {
    "op": "replace",
    "path": "/fields/System.State",
    "value": "Active"
  },
  {
    "op": "add",
    "path": "/fields/System.AssignedTo",
    "value": "{current_user_email}"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.ActivatedDate",
    "value": "{current_datetime}"
  }
]
```

#### Record Work Started

Add a comment to track start:
```json
{
  "text": "Work started on this task at {timestamp}\nBranch: {branch_name}\nEstimated hours: {remaining_hours}"
}
```

### 3. Development Environment Setup

#### Create Git Branch

```bash
# Generate branch name if not provided
if [ -z "$BRANCH_NAME" ]; then
  BRANCH_NAME="task-{task_id}-{sanitized_title}"
fi

# Create and checkout branch
git checkout -b $BRANCH_NAME

# Push branch with upstream tracking
git push -u origin $BRANCH_NAME
```

#### Create Work Directory Structure

```bash
# Create task work directory
mkdir -p .claude/azure/tasks/{task_id}

# Create task tracking file
cat > .claude/azure/tasks/{task_id}/work.md << EOF
# Task #{task_id}: {title}

## Status
- Started: {timestamp}
- Branch: {branch_name}
- Assignee: {user}

## Parent User Story
- ID: {story_id}
- Title: {story_title}

## Work Log
- {timestamp}: Task started

## Notes
[Add implementation notes here]

## Test Coverage
[ ] Unit tests
[ ] Integration tests
[ ] Manual testing

## Checklist
[ ] Implementation complete
[ ] Tests passing
[ ] Code reviewed
[ ] Documentation updated
EOF
```

### 4. Context Preparation

#### Fetch Related Information

1. **Parent User Story details:**
   - Acceptance criteria
   - Technical notes
   - Dependencies

2. **Related code files:**
   - Previous commits for similar tasks
   - Existing implementation patterns
   - Test files to update

3. **Documentation:**
   - API specs if applicable
   - Architecture diagrams
   - Coding standards

### 5. Task Board Update

Show current sprint task board:

```
🏃 Sprint 1 - Your Active Tasks

Currently Working On:
┌─────────────────────────────────────────┐
│ Task #101: Technical Design (4h)        │
│ Parent: US#34 - Password Reset          │
│ Branch: task-101-technical-design       │
│ Started: 10 minutes ago                 │
└─────────────────────────────────────────┘

Up Next:
- Task #102: Implementation (12h)
- Task #103: Unit tests (4h)

📊 Your Sprint Progress:
Tasks: 1/5 active, 0/5 completed
Hours: 4h in progress, 28h remaining
```

### 6. Success Output

```
✅ Task #$ARGUMENTS started successfully!

📋 Task Details:
- Title: {task_title}
- Remaining Hours: {hours}h
- Parent Story: #{story_id} - {story_title}

🔧 Development Setup:
- Branch created: {branch_name}
- Status: Active
- Assigned to: You

📁 Work tracking:
.claude/azure/tasks/{task_id}/work.md

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_workitems/edit/{task_id}

💡 Next steps:
1. Review acceptance criteria from parent story
2. Update technical design if needed
3. Begin implementation
4. Track progress: /azure:task-update {task_id} --hours-remaining=3
5. When complete: /azure:task-close {task_id}

🚀 Ready to code! Good luck with {task_title}!
```

### 7. Integration Features

#### Link to IDE

If VS Code integration available:
```bash
# Open relevant files in VS Code
code .claude/azure/tasks/{task_id}/work.md
code {related_files}
```

#### Set up Testing

```bash
# Create test file structure if needed
touch tests/test_task_{task_id}.py
echo "# Tests for Task #{task_id}" > tests/test_task_{task_id}.py
```

#### Time Tracking

Start a time tracking session:
```bash
# Create time tracking entry
echo "{timestamp_start}|IN_PROGRESS|{task_id}" >> .claude/azure/time-tracking.log
```

### 8. Smart Features

#### Auto-assign if Unassigned
- Automatically assign to current user
- Update Azure DevOps assignment

#### Parent Story Status Check
- If parent story not "Active", offer to activate it
- Check for blocking dependencies

#### Related Tasks Detection
- Find tasks that might block this one
- Suggest parallel tasks that could be started

## Error Handling

- **Task not found**: Show similar task IDs
- **Already active**: Show who's working on it
- **No permission**: Guide to request access
- **Git conflicts**: Help resolve branch issues

## Hooks

Support for custom hooks:
- `pre-task-start`: Run before starting task
- `post-task-start`: Run after task started

Example: `.claude/hooks/pre-task-start.sh`
```bash
#!/bin/bash
# Ensure latest code
git pull origin main
# Run linters
npm run lint
```