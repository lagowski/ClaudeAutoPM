---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Next Task

Get AI-powered recommendation for the next task to work on based on priorities, dependencies, and capacity.

**Usage**: `/azure:next-task [--user=<email>] [--auto-start]`

**Examples**:
- `/azure:next-task` - Get your next recommended task
- `/azure:next-task --auto-start` - Get and immediately start the task
- `/azure:next-task --user=sarah@example.com` - Recommend for specific user

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

### 1. Analyze Context

Use azure-devops-specialist agent to analyze:
- Current sprint goals
- User's active tasks
- Task dependencies
- Priority scores
- Team capacity
- Blockers

### 2. Recommendation Algorithm

Score tasks based on:
- **Priority**: Critical > High > Medium > Low
- **Dependencies**: Unblocked tasks first
- **Sprint goals**: Align with sprint objectives
- **Story completion**: Prefer finishing stories
- **Skills match**: Match user expertise
- **Time available**: Fit within capacity

### 3. Display Recommendation

```
🎯 Next Task Recommendation
═══════════════════════════════════════════════════════════

Based on your current context, I recommend:

📋 Task #104: Integration tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parent Story: #34 - Implement user password reset
Estimated Time: 4h remaining
Priority: High
Status: In Progress (33% complete)

📊 Why this task?
────────────────────────────────────────────────────────────
✓ Continues your current work (already 33% done)
✓ High priority - blocks Story #34 completion
✓ No dependencies - can start immediately
✓ Fits your available time (4h task, 8h capacity)
✓ Aligns with sprint goal (complete Story #34)
✓ You have context from Task #102, #103

📈 Impact of completing this:
────────────────────────────────────────────────────────────
• Story #34 will be 80% complete
• Unblocks Task #105 (Documentation)
• Moves sprint progress to 65%
• Keeps team on track for sprint goal

🔄 Alternative recommendations:
────────────────────────────────────────────────────────────
2. Task #220: Update API docs (2h) - Quick win
3. Task #301: Bug fix (3h) - High priority
4. Task #105: Documentation (3h) - If #104 blocked

⚡ Quick Actions:
────────────────────────────────────────────────────────────
[1] Start Task #104 now
[2] View task details
[3] Check dependencies
[4] See alternative tasks
[5] Skip and get next recommendation

Select (1-5): _
```

### 4. Auto-Start Mode

If `--auto-start` flag is used:

```
🚀 Auto-starting recommended task...

✅ Task #104 started!
- Status: Active
- Branch created: task-104-integration-tests
- Assigned to: You
- Timer started

Opening work environment...
- Work file: .claude/azure/tasks/104/work.md
- Parent story: Loaded
- Test files: Located at tests/integration/

Ready to work! Good luck with integration tests!
```

### 5. No Tasks Available

When no suitable tasks:

```
📭 No immediate tasks available

Current situation:
- All high-priority tasks are blocked
- Your current tasks are waiting for review
- No unassigned tasks match your skills

Suggestions:
1. Help unblock Task #215 (waiting for API specs)
2. Review PR #457 (Sarah's code)
3. Start planning next sprint
4. Update documentation
5. Pair with team member

Would you like to:
[1] View blocked tasks
[2] See all available tasks
[3] Check other team members' needs
[4] Start sprint planning

Select (1-4): _
```

### 6. Smart Context Features

#### Continuation Detection
If user has in-progress work:
```
💡 You have an in-progress task!

Task #102: Implementation (60% complete)
Last worked: 2 hours ago
Recommendation: Continue this task

Resume work? (y/n): _
```

#### End-of-Sprint Mode
When sprint is ending:
```
⏰ Sprint ends in 1 day!

Focusing on sprint completion:
1. Task #104 (4h) - Must complete for Story #34
2. Task #215 (1h) - Quick fix, high impact
3. Skip Task #305 - Save for next sprint

Start sprint-critical Task #104? (y/n): _
```

#### Skill-Based Matching
```
🎯 Matched to your expertise:

Task #401: React component optimization
Why: You completed 5 similar React tasks
Success rate: 95% on React tasks
Estimated time: 3h (based on your history)
```

### 7. Team Coordination

Show when pairing would help:

```
👥 Pairing Opportunity!

Task #104: Integration tests
Sarah is also available and has context
Pair programming would reduce time by 40%

Invite Sarah to pair? (y/n): _
```

### 8. Learning Opportunities

Suggest growth tasks:

```
📚 Learning Opportunity!

Task #501: GraphQL implementation
- New technology for you
- Mike can mentor (he's available)
- Good for skill development
- Medium priority, good timing

Take on this growth task? (y/n): _
```

## Configuration

`.claude/azure/next-task-config.yml`:
```yaml
recommendation:
  algorithm: "smart" # smart, priority, random
  consider_skills: true
  consider_capacity: true
  prefer_story_completion: true
  growth_tasks_weight: 0.2
  
filters:
  min_priority: 3
  max_hours: 8
  exclude_types: ["research"]
```

## Analytics

Track recommendation success:

```
📊 Recommendation Analytics (Last 30 days)

Acceptance rate: 78%
Completion rate: 92%
Average time saved: 1.2h/task
Most declined reason: "Already working on something"

Top patterns:
- Morning: Prefer complex tasks
- Afternoon: Prefer quick wins
- Friday: Prefer documentation
```