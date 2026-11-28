---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Daily Standup

Generate daily standup report with yesterday's progress, today's plan, and blockers.

**Usage**: `/azure:standup [--user=<email>] [--team=<name>] [--format=<type>]`

**Examples**:
- `/azure:standup` - Your personal standup
- `/azure:standup --team=all` - Full team standup
- `/azure:standup --user=john@example.com` - Specific user standup
- `/azure:standup --format=slack` - Format for Slack

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

### 1. Query Work Items

Use azure-devops-specialist agent to fetch:
- Tasks completed yesterday
- Tasks in progress
- Tasks planned for today
- Blocked items
- PR status

### 2. Personal Standup Format

```
🌅 Daily Standup - January 10, 2025
👤 John Smith (john@example.com)
═══════════════════════════════════════════════════════════

📅 YESTERDAY
────────────────────────────────────────────────────────────
✅ Completed:
• Task #102: Implementation (12h) - Password reset logic
• Task #103: Unit tests (4h) - All tests passing
• PR #456: Merged - Authentication service refactor

⏳ Worked on but not completed:
• Task #104: Integration tests (2h/6h) - 33% complete

📊 Yesterday's metrics:
- Completed: 2 tasks (16h)
- Commits: 8
- PRs merged: 1
- Code coverage: +5%

📅 TODAY
────────────────────────────────────────────────────────────
🎯 Planned:
• Task #104: Complete integration tests (4h remaining)
• Task #105: Start documentation (3h)
• Code review for PR #457

📋 Sprint goals:
- Complete User Story #34 (75% done)
- Start User Story #35 if time permits

⏰ Capacity: 8h available

🚧 BLOCKERS
────────────────────────────────────────────────────────────
⚠️ Task #104: Waiting for test environment fix (DevOps team)
⚠️ Story #35: Needs design review before starting

💬 NOTES
────────────────────────────────────────────────────────────
• Sprint ends in 2 days - on track
• Will pair with Sarah on integration tests
• Team retrospective at 3 PM

📈 Sprint Progress: Day 8/10
Story Points: 21/34 completed (62%)
Your velocity: 2.6 points/day
```

### 3. Team Standup Format

```
🌅 Team Standup - January 10, 2025
👥 Team: Development (4 members)
═══════════════════════════════════════════════════════════

📊 TEAM OVERVIEW
────────────────────────────────────────────────────────────
Sprint: Sprint 2 (Day 8/10)
Progress: ████████████░░░░░░░░ 62% (21/34 points)
Yesterday: 4 tasks completed, 2 blocked
Today: 6 tasks in progress, 3 starting

👤 John Smith
────────────────────────────────────────────────────────────
Yesterday: ✅ Task #102, #103 | 🔄 Task #104 (33%)
Today: Complete #104, Start #105
Blockers: Test environment down
Capacity: 8h

👤 Sarah Johnson
────────────────────────────────────────────────────────────
Yesterday: ✅ Task #215 | 🔄 Task #218 (60%)
Today: Complete #218, Review PR #457
Blockers: None
Capacity: 7h

👤 Mike Chen
────────────────────────────────────────────────────────────
Yesterday: 🔄 Task #301 (80%), #302 (40%)
Today: Complete #301, Continue #302
Blockers: Waiting for API specs
Capacity: 8h

👤 Lisa Anderson
────────────────────────────────────────────────────────────
Yesterday: ✅ Task #401, #402
Today: Start Story #36 tasks
Blockers: None
Capacity: 6h

🚧 TEAM BLOCKERS
────────────────────────────────────────────────────────────
1. Test environment down - affecting 2 people
2. API specs missing - affecting Mike
3. Design review pending - affecting Story #35

📈 METRICS
────────────────────────────────────────────────────────────
Yesterday's velocity: 4.5 points
Projected completion: 89% by sprint end
At risk: Story #37 (may slip to next sprint)

🎯 TODAY'S FOCUS
────────────────────────────────────────────────────────────
1. Unblock test environment (Critical)
2. Complete in-progress tasks (6 tasks)
3. Review and merge 3 PRs
4. Prepare for sprint review demo

💡 RECOMMENDATIONS
────────────────────────────────────────────────────────────
• Pair John & Sarah on integration tests
• Move Story #37 to next sprint
• Schedule emergency fix for test environment
```

### 4. Export Formats

#### Slack Format
```markdown
*Daily Standup - Jan 10*
*John Smith*

*Yesterday:* ✅ 2 tasks done (#102, #103), 1 PR merged
*Today:* Finishing #104, starting #105 documentation
*Blockers:* Test environment down (waiting for DevOps)
*Sprint:* 62% complete, on track
```

#### Email Format
```html
Subject: Daily Standup - Jan 10 - John Smith

<h3>Yesterday</h3>
<ul>
  <li>✅ Completed Task #102: Implementation</li>
  <li>✅ Completed Task #103: Unit tests</li>
</ul>
...
```

#### Markdown Format
For documentation/wiki:
```markdown
## Daily Standup - 2025-01-10

### Yesterday
- [x] Task #102: Implementation
- [x] Task #103: Unit tests
...
```

### 5. Quick Actions

After standup display:

```
⚡ Quick Actions:
[1] Start next task (/azure:next-task)
[2] Update blocked items
[3] Send standup to Slack
[4] Export to file
[5] View sprint board

Select (1-5): _
```

### 6. Automated Standup

Schedule daily standup:

```bash
# Add to cron/scheduler
0 9 * * * /azure:standup --team=all --format=slack --send
```

## Smart Features

### Insights
- Velocity trends
- Blocker patterns
- Capacity warnings
- Risk identification

### Recommendations
- Task prioritization
- Pairing suggestions
- Resource reallocation
- Sprint adjustments

## Configuration

`.claude/azure/standup-config.yml`:
```yaml
standup:
  default_time: "09:00"
  include_metrics: true
  show_blockers: true
  include_prs: true
  slack_channel: "#dev-standup"
  email_list: "team@example.com"
```