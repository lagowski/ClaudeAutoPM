---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Active Work

Show all currently active work items across the team or for specific user.

**Usage**: `/azure:active-work [--user=<email>] [--type=<type>]`

**Examples**:
- `/azure:active-work` - All active work
- `/azure:active-work --user=me` - Your active work
- `/azure:active-work --type=task` - Active tasks only
- `/azure:active-work --team=dev` - Dev team active work

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

### 1. Query Active Items

Use azure-devops-specialist agent to fetch:
- State = "Active" or "In Progress"
- Group by type (Feature, User Story, Task)
- Include progress metrics

### 2. Display Format

```
🔄 Active Work Items - Real-time Status
═══════════════════════════════════════════════════════════════
Last updated: 10:45 AM | Sprint: Day 8/10

📦 FEATURES (1 active)
────────────────────────────────────────────────────────────────
#25 Authentication System
Progress: ████████████████░░░░ 82% | 4/5 stories complete
Owner: Product Team | Due: End of Sprint 2
└── Remaining: OAuth integration (90%), Search integration (10%)

📋 USER STORIES (4 active)
────────────────────────────────────────────────────────────────
#34 Password Reset ████████████░░░░░░░░ 75%
    Owner: John | 3/5 tasks done | 15h/27h complete
    ⚡ In Progress: Task #104 (Integration tests)

#35 User Profile ██████░░░░░░░░░░░░░░ 40%
    Owner: Sarah | 2/6 tasks done | 8h/20h complete
    ⚠️ At Risk: Behind schedule by 1 day

#36 OAuth Login ████████████████░░░░ 90%
    Owner: Mike | 5/6 tasks done | 18h/20h complete
    ✅ On Track: Completing today

#37 Search Feature ██░░░░░░░░░░░░░░░░░░ 10%
    Owner: Lisa | 1/8 tasks done | 2h/32h complete
    🔴 Blocked: Waiting for search API

⚙️ TASKS (12 active)
────────────────────────────────────────────────────────────────
Currently In Progress:
┌──────┬────────────────────┬──────────┬─────────┬────────────┐
│ ID   │ Task               │ Assigned │ Hours   │ Started    │
├──────┼────────────────────┼──────────┼─────────┼────────────┤
│ #104 │ Integration tests  │ John     │ 2h/6h   │ 2 hrs ago  │
│ #218 │ UI components      │ Sarah    │ 5h/8h   │ Yesterday  │
│ #301 │ API endpoints      │ Mike     │ 7h/10h  │ 3 days ago │
│ #402 │ Database schema    │ Lisa     │ 1h/4h   │ Today      │
└──────┴────────────────────┴──────────┴─────────┴────────────┘

🔥 HOT ITEMS (Need Attention)
────────────────────────────────────────────────────────────────
⏰ Due Today:
  • Task #301: API endpoints (Mike) - 3h remaining
  • Story #36: OAuth Login - Final testing needed

⚠️ Overdue:
  • Task #215: Bug fix (unassigned) - 1 day overdue

🔄 Long Running (>3 days):
  • Task #301: API endpoints - Consider breaking down
  • Story #35: User Profile - May need help

📊 TEAM UTILIZATION
────────────────────────────────────────────────────────────────
John:   ████████░░ 80% (2 active items, 32h/40h)
Sarah:  █████████░ 88% (3 active items, 28h/32h)
Mike:   ███████░░░ 75% (2 active items, 30h/40h)
Lisa:   ██████░░░░ 67% (1 active item, 16h/24h)

Team Average: 78% utilized
Available Capacity: 30h across team

💡 RECOMMENDATIONS
────────────────────────────────────────────────────────────────
1. Help Mike complete Task #301 (due today)
2. Assign Task #215 (overdue bug)
3. Check on Story #35 progress with Sarah
4. Unblock Story #37 or defer to next sprint

⚡ Quick Actions:
[1] Update progress on my items
[2] Take on Task #215
[3] View blocked items details
[4] Export active work list
[5] Refresh status

Select (1-5): _
```

### 3. Personal Active Work View

```
👤 Your Active Work
═══════════════════════════════════════════════════════════════

🎯 Current Focus:
Task #104: Integration tests (Story #34)
Progress: ███░░░░░░░ 33% | 2h/6h complete
Started: 2 hours ago | Branch: task-104-integration

📋 Your Active Items:
1. Task #104: Integration tests - 33% (In Progress)
2. Task #105: Documentation - 0% (Assigned, Not Started)
3. Story #34: Password Reset - 75% (Owner)

⏱️ Time Tracking:
Today: 2h logged (6h remaining)
This Week: 28h logged (12h remaining)
Sprint: 80% capacity used

📅 Upcoming:
• Task #105: Documentation (3h) - Start after #104
• Code Review: PR #457 waiting
• Story #38: Planning needed

[Press Enter to update progress]
```

### 4. Quick Filters

```bash
# By status
/azure:active-work --status="In Progress"

# By priority
/azure:active-work --priority=1

# By type
/azure:active-work --type=story

# By time
/azure:active-work --started-today
/azure:active-work --overdue
```

## Smart Features

### Stale Detection
- Flag items active >5 days
- Suggest intervention
- Recommend breakdown

### Load Balancing
- Identify overloaded members
- Suggest redistribution
- Show available capacity

### Risk Assessment
- Calculate completion probability
- Flag at-risk items
- Suggest mitigation