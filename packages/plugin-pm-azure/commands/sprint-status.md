---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Sprint Status

Comprehensive sprint dashboard with burndown, velocity, and team performance metrics.

**Usage**: `/azure:sprint-status [sprint-name] [--format=<type>]`

**Examples**:
- `/azure:sprint-status` - Current sprint status
- `/azure:sprint-status "Sprint 2"` - Specific sprint
- `/azure:sprint-status --format=burndown` - Focus on burndown chart
- `/azure:sprint-status --format=executive` - Executive summary

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

### 1. Sprint Overview Dashboard

```
🏃 Sprint 2 Status - Day 8 of 10
═══════════════════════════════════════════════════════════════

📊 SPRINT HEALTH: ⚠️ AT RISK
────────────────────────────────────────────────────────────────

Overall Progress: ████████████░░░░░░░░ 62%
Story Points: 21/34 completed
Tasks: 18/42 completed
Hours: 84/156 completed

🎯 Sprint Goals:
────────────────────────────────────────────────────────────────
1. ✅ Complete authentication system (Done)
2. 🔄 Implement password reset (75% - On Track)
3. ⚠️ Launch user profile (40% - At Risk)
4. ❌ Search functionality (10% - Will Not Complete)

📈 Burndown Chart:
────────────────────────────────────────────────────────────────
Hours
160 |■ Ideal
140 |■■■.
120 |■■■■■■..
100 |■■■■■■■■■... (Ideal)
 80 |■■■■■■■■■■■■■■.. 
 60 |■■■■■■■■■■■■■■■■■■ (Actual)
 40 |■■■■■■■■■■■■■■■■■■■■■
 20 |■■■■■■■■■■■■■■■■■■■■■■■■
  0 +──────────────────────────→
    M  T  W  T  F  M  T  W  T  F
    1  2  3  4  5  6  7  8  9  10
                        ↑
                      Today

Status: 12 hours behind ideal
Projection: Need 36h/day to complete (have 29h capacity)

📋 User Stories Status:
────────────────────────────────────────────────────────────────
 ID | Title                      | Points | Progress | Status
----+----------------------------+--------+----------+----------
 34 | Password Reset             | 8      | 75%      | On Track
 35 | User Profile               | 5      | 40%      | At Risk
 36 | OAuth Integration          | 13     | 90%      | On Track
 37 | Search Feature             | 8      | 10%      | Blocked

👥 Team Performance:
────────────────────────────────────────────────────────────────
         | Assigned | Complete | In Prog | Capacity | Utilization
---------+----------+----------+---------+----------+------------
John     | 8 tasks  | 5        | 2       | 32h/40h  | 80%
Sarah    | 7 tasks  | 4        | 2       | 28h/32h  | 88%
Mike     | 6 tasks  | 3        | 1       | 30h/40h  | 75%
Lisa     | 5 tasks  | 4        | 1       | 16h/24h  | 67%
---------+----------+----------+---------+----------+------------
Total    | 26       | 16       | 6       | 106/136h | 78%

🚧 Blockers & Risks:
────────────────────────────────────────────────────────────────
🔴 CRITICAL:
• Story #37: Search API not ready (blocking 8 points)

⚠️ HIGH:
• Test environment unstable (affecting 3 people)
• Story #35: Needs 2 more days but only 1.5 available

🟡 MEDIUM:
• PR review backlog: 4 PRs waiting >24h
• Mike at risk of burnout (88% capacity)

🎬 Key Actions Needed:
────────────────────────────────────────────────────────────────
1. ⚡ Move Story #37 to next sprint (PM decision needed)
2. ⚡ Add Sarah to help with Story #35
3. ⚡ Schedule emergency fix for test environment
4. ⚡ Clear PR backlog today

📊 Velocity Metrics:
────────────────────────────────────────────────────────────────
Current Sprint: 21 points (tracking for 26)
Last 3 Sprints: 28, 31, 29 (avg: 29.3)
Velocity Trend: ↘️ Declining

Team capacity next sprint: -2 developers (vacation)
Recommended load: 24 points maximum
```

### 2. Burndown Focus View

```
📉 Sprint 2 Burndown Analysis
═══════════════════════════════════════════════════════════════

Remaining Work Trend:
Day 1: 156h ████████████████████████████████
Day 2: 148h ███████████████████████████████
Day 3: 135h ████████████████████████████
Day 4: 128h ██████████████████████████
Day 5: 115h ████████████████████████
Day 6: 102h █████████████████████
Day 7: 89h  ██████████████████
Day 8: 72h  ███████████████ ← Current
Day 9: ?    Projected: 45h
Day 10: ?   Projected: 18h (Need: 0h)

⚠️ Gap Analysis:
- Behind by: 12 hours
- Daily burn rate needed: 36h
- Current burn rate: 24h
- Gap: -12h/day

Recovery Options:
1. Reduce scope by 18h (Move 2-3 tasks)
2. Add overtime (not recommended)
3. Defer Story #37 (saves 24h)
```

### 3. Executive Summary

```
📊 Sprint 2 - Executive Summary
═══════════════════════════════════════════════════════════════

SPRINT STATUS: ⚠️ AT RISK

Completion Forecast: 76% of committed work
Key Deliverables:
  ✅ Authentication system - COMPLETE
  ⚠️ Password reset - 75% (will complete)
  ⚠️ User profile - 40% (at risk)
  ❌ Search feature - 10% (defer to Sprint 3)

Financial Impact:
- Sprint Budget: $45,000
- Burn Rate: $4,500/day
- At Risk Value: $12,000 (Story #37)

Recommendations:
1. Defer search feature (Story #37)
2. Reallocate resources to Story #35
3. Plan 24 points for Sprint 3 (team capacity reduced)

Next Sprint Planning: Thursday 2 PM
Sprint Review: Friday 3 PM
Retrospective: Friday 4 PM
```

### 4. Quick Actions Menu

```
⚡ Quick Actions:
[1] Update task hours
[2] Move story to next sprint
[3] Assign resources
[4] Export report
[5] Send to Slack
[6] View detailed metrics

Select (1-6): _
```

## Export Formats

- `--format=burndown` - Burndown chart focus
- `--format=executive` - Executive summary
- `--format=team` - Team performance
- `--format=risks` - Blockers and risks
- `--format=pdf` - Full PDF report
- `--format=json` - Raw data for dashboards

## Automated Alerts

```yaml
alerts:
  behind_schedule:
    threshold: 10%
    action: notify_pm
  
  blocked_stories:
    threshold: 2
    action: escalate
  
  capacity_exceeded:
    threshold: 90%
    action: warn_team
```