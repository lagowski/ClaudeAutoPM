---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps Task Show

Display detailed information about a specific Task.

**Usage**: `/azure:task-show <task-id> [--format=<type>]`

**Examples**:
- `/azure:task-show 102`
- `/azure:task-show 102 --include-history`
- `/azure:task-show 102 --format=json`

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

### Display Format

```
═══════════════════════════════════════════════════════════════
⚙️ Task #102
═══════════════════════════════════════════════════════════════

Title: Implementation - Core password reset logic
State: 🔄 In Progress
URL: https://dev.azure.com/rafal0387/Speacher/_workitems/edit/102

📝 Details
─────────────────────────────────────────────────────────────
Description:
Implement the core password reset functionality including:
- Token generation and validation
- Email service integration
- Password complexity validation
- Database updates
- Security logging

Activity: Development
Original Estimate: 12h
Remaining Work: 8h
Completed Work: 4h

👤 Assignment
─────────────────────────────────────────────────────────────
Assigned To: john@example.com
Created: 2025-01-08 09:00 AM
Started: 2025-01-09 10:00 AM
Last Updated: 2 hours ago

📍 Context
─────────────────────────────────────────────────────────────
Parent Story: #34 - Implement user password reset
Sprint: Sprint 2 (Day 8/10)
Area: Speacher\Security
Priority: High

🔗 Dependencies
─────────────────────────────────────────────────────────────
Blocks:
  → Task #103: Unit tests
  → Task #104: Integration tests
  
Blocked by:
  ← Task #101: Technical Design (✅ Complete)

📊 Progress
─────────────────────────────────────────────────────────────
Progress: ████████░░░░░░░░ 33% (4h/12h)
Velocity: 2h/day
Est. Completion: 2 days

Git Branch: task-102-implementation
Commits: 8
Files Changed: 12
Lines: +456 -123

💬 Recent Activity
─────────────────────────────────────────────────────────────
• 2h ago: John logged 2 hours of work
• 4h ago: Status changed to In Progress
• Yesterday: Branch created and pushed
• 2 days ago: Task assigned to John

📎 Attachments
─────────────────────────────────────────────────────────────
• technical-design.md (8 KB)
• api-spec.yaml (4 KB)

🔧 Quick Actions
─────────────────────────────────────────────────────────────
[1] Edit task (/azure:task-edit 102)
[2] Log time
[3] Add comment
[4] View parent story (/azure:us-show 34)
[5] Close task (/azure:task-close 102)

Select (1-5): _
```