---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Task Close

Complete a task, update status, and prepare for next work.

**Usage**: `/azure:task-close <task-id> [--create-pr] [--hours-spent=<hours>]`

**Examples**:
- `/azure:task-close 102` - Close task and update status
- `/azure:task-close 102 --create-pr` - Close task and create pull request
- `/azure:task-close 102 --hours-spent=10` - Close with time tracking

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

### 1. Preflight Checks

1. **Validate Task:**
   - Verify task exists and is assigned to current user
   - Check status is "Active" or "In Progress"
   - If not active, ask: "Task not active. Mark as complete anyway?"

2. **Check Prerequisites:**
   - Verify all subtasks are complete
   - Check if code is committed
   - Verify tests are passing (if applicable)

### 2. Completion Checklist

Present interactive checklist:

```
📋 Task #102 Completion Checklist

Before closing this task, please confirm:
✓ Code implementation complete
✓ Unit tests written and passing
✓ Integration tests passing
? Documentation updated (y/n): _
? Code reviewed by peer (y/n): _
? Branch ready to merge (y/n): _

Hours spent on task: 10h (estimated: 12h)
Efficiency: 120% 🎉
```

### 3. Update Task in Azure DevOps

Use azure-devops-specialist agent:

```json
[
  {
    "op": "replace",
    "path": "/fields/System.State",
    "value": "Closed"
  },
  {
    "op": "replace",
    "path": "/fields/Microsoft.VSTS.Scheduling.RemainingWork",
    "value": 0
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.ClosedDate",
    "value": "{current_datetime}"
  },
  {
    "op": "add",
    "path": "/fields/System.History",
    "value": "Task completed. Hours spent: {hours_spent}. {completion_notes}"
  }
]
```

### 4. Git Operations

#### Create Pull Request (if --create-pr)

```bash
# Ensure all changes are committed
git add -A
git commit -m "Complete Task #${TASK_ID}: ${TASK_TITLE}

- Implementation complete
- Tests passing
- Documentation updated

Closes #${TASK_ID}"

# Push branch
git push origin ${BRANCH_NAME}

# Create PR using GitHub CLI
gh pr create \
  --title "Task #${TASK_ID}: ${TASK_TITLE}" \
  --body "## Summary
  Completes Task #${TASK_ID} from User Story #${STORY_ID}
  
  ## Changes
  - ${CHANGE_SUMMARY}
  
  ## Testing
  - Unit tests: ✅
  - Integration tests: ✅
  - Manual testing: ✅
  
  ## Checklist
  - [x] Code complete
  - [x] Tests passing
  - [x] Documentation updated
  - [x] Ready for review
  
  Azure DevOps Task: [#${TASK_ID}](https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${TASK_ID})" \
  --base main \
  --assignee @me \
  --label "task-${TASK_ID}"
```

#### Clean up branch (after merge)

```bash
# Switch back to main
git checkout main
git pull origin main

# Delete local branch
git branch -d ${BRANCH_NAME}

# Delete remote branch
git push origin --delete ${BRANCH_NAME}
```

### 5. Time Tracking

Record time spent:

```bash
# Update time log
echo "${TIMESTAMP}|COMPLETED|${TASK_ID}|${HOURS_SPENT}h" >> .claude/azure/time-tracking.log

# Update work log
cat >> .claude/azure/tasks/${TASK_ID}/work.md << EOF

## Completion Summary
- Completed: ${TIMESTAMP}
- Hours Spent: ${HOURS_SPENT}h
- Efficiency: ${EFFICIENCY}%
- PR: ${PR_URL}
EOF
```

### 6. Parent Story Update

Check if User Story can be closed:

```
📊 User Story #34 Progress Update

With Task #102 complete:
- Tasks Completed: 4/6 (67%)
- Hours Completed: 20/27h (74%)
- Remaining Tasks:
  - #104: Integration tests (6h)
  - #105: Documentation (3h)

❓ All development tasks complete. Close User Story? (y/n): _
```

### 7. Success Output

```
✅ Task #${TASK_ID} closed successfully!

📋 Task Summary:
- Title: ${TASK_TITLE}
- Hours Spent: ${HOURS_SPENT}h (Estimated: ${ESTIMATED}h)
- Efficiency: ${EFFICIENCY}%
- Duration: ${START_DATE} → ${END_DATE}

🔧 Development Summary:
- Branch: ${BRANCH_NAME}
- Commits: ${COMMIT_COUNT}
- Files Changed: ${FILES_CHANGED}
- Lines Added: +${LINES_ADDED} / Removed: -${LINES_REMOVED}

🔗 Links:
- Azure DevOps: https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${TASK_ID}
- Pull Request: ${PR_URL}

📊 Your Sprint Progress:
- Tasks Completed Today: 2
- Tasks Remaining: 3
- Sprint Velocity: On Track ✅

🚀 Next Available Tasks:
1. Task #104: Integration tests (6h) - Ready to start
2. Task #105: Documentation (3h) - Blocked by #104

Start next task? (y/n): _
```

### 8. Automated Next Steps

If user confirms, automatically:

1. **Start next task:**
   ```bash
   /azure:task-start 104
   ```

2. **Update sprint board:**
   ```bash
   /azure:sprint-update
   ```

3. **Generate status report:**
   ```bash
   /azure:status --generate-report
   ```

### 9. Metrics Collection

Track completion metrics:

```json
{
  "task_id": 102,
  "completed_date": "2024-01-10T15:30:00Z",
  "hours_estimated": 12,
  "hours_actual": 10,
  "efficiency": 120,
  "quality_metrics": {
    "tests_added": 15,
    "coverage_change": "+5%",
    "bugs_found": 0,
    "review_iterations": 1
  }
}
```

### 10. Celebration Features

For milestone completions:

```
🎉 Milestone Achieved!

You've completed your 10th task this sprint!
Your average efficiency: 115%
Team ranking: #2

           🏆
    ________________
   |                |
   |   EXCELLENT    |
   |     WORK!      |
   |________________|
         \||/
          ||
```

## Smart Features

### Auto-detect completion
- Check if PR is merged
- Verify CI/CD passing
- Detect if tests added

### Suggest improvements
- If over estimate, suggest better estimation
- If under, check if scope was reduced
- Recommend process improvements

### Learn patterns
- Track common completion times
- Identify task types user excels at
- Suggest optimal task assignments

## Error Handling

- **Task not found**: Show similar tasks
- **Not assigned to user**: Show actual assignee
- **Tests failing**: Block closure, show failures
- **Uncommitted changes**: Prompt to commit first

## Hooks

- `pre-task-close`: Validate before closing
- `post-task-close`: Cleanup and notifications

Example hook:
```bash
#!/bin/bash
# .claude/hooks/pre-task-close.sh
# Ensure all tests pass
npm test || exit 1
# Check code coverage
npm run coverage:check || exit 1
```