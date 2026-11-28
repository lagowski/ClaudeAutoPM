---
allowed-tools: Task, Bash, Read, Write, WebFetch, Glob, Grep
---

# Azure DevOps User Story Show

Display detailed information about a specific User Story.

**Usage**: `/azure:us-show <story-id> [--format=<type>]`

**Examples**:
- `/azure:us-show 34`
- `/azure:us-show 34 --format=json`
- `/azure:us-show 34 --include-tasks`
- `/azure:us-show 34 --history`

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

### 1. Fetch User Story Details

Use azure-devops-specialist agent to get full work item:
- All fields and metadata
- Child tasks
- Parent feature/epic
- Related work items
- Comments and history

### 2. Display Format

```
═══════════════════════════════════════════════════════════════
📋 User Story #34
═══════════════════════════════════════════════════════════════

Title: Implement user password reset
State: 🔄 Active
URL: https://dev.azure.com/rafal0387/Speacher/_workitems/edit/34

📝 Details
─────────────────────────────────────────────────────────────
Description:
As a registered user, I want to reset my password when I forget it,
so that I can regain access to my account without contacting support.

Acceptance Criteria:
✓ User can initiate password reset from login page
✓ System sends reset link to registered email address
✓ Reset link expires after 24 hours
✓ User can set new password meeting security requirements
✓ System confirms successful password reset via email
✓ Old password becomes invalid immediately after reset

📊 Metadata
─────────────────────────────────────────────────────────────
Story Points: 8
Priority: 2 (High)
Value Area: Business
Risk: Medium
Effort: 8
Business Value: 85

👤 Assignment
─────────────────────────────────────────────────────────────
Assigned To: john@example.com
Created By: rafal@lagowski.es
Created Date: 2025-01-10T15:51:05.667Z
Modified Date: 2025-01-10T16:45:23.123Z

📍 Organization
─────────────────────────────────────────────────────────────
Area Path: Speacher\Security
Iteration Path: Speacher\Sprint 2
Tags: security, authentication, mvp

🔗 Relationships
─────────────────────────────────────────────────────────────
Parent Feature: #25 - Authentication System
Child Tasks: 6 tasks (27h total)
  ├── #101 ✅ Technical Design (4h)
  ├── #102 ✅ Implementation (12h)
  ├── #103 ✅ Unit tests (4h)
  ├── #104 🔄 Integration tests (6h)
  ├── #105 🆕 Documentation (3h)
  └── #106 🆕 Code review (2h)

Related Items:
  → #35 User Profile (depends on this)
  ← #32 API Gateway setup (blocks this)

📈 Progress
─────────────────────────────────────────────────────────────
Tasks: ████████████░░░░░░░░ 60% (3/5 completed)
Hours: ███████████░░░░░░░░░ 55% (15h/27h)
Sprint Progress: Day 3 of 10

💬 Recent Activity
─────────────────────────────────────────────────────────────
• 2h ago: Sarah started integration tests (Task #104)
• 5h ago: John completed implementation (Task #102)
• Yesterday: Priority changed from 3 to 2
• 2 days ago: Moved to Sprint 2
• 3 days ago: Story created and parsed into tasks

📎 Attachments
─────────────────────────────────────────────────────────────
• mockup-password-reset.png (125 KB)
• security-requirements.pdf (89 KB)
• email-templates.html (12 KB)

🔧 Actions
─────────────────────────────────────────────────────────────
[1] Edit story (/azure:us-edit 34)
[2] View tasks (/azure:task-list 34)
[3] Update status (/azure:us-status 34)
[4] Add comment
[5] Export to JSON/CSV
[6] Open in browser

Select action (1-6) or press Enter to exit: _
```

### 3. Compact Mode

For quick overview (default when listing multiple):

```
📋 #34: Implement user password reset
Status: Active | Points: 8 | Assigned: john@example.com
Progress: 60% tasks, 55% hours | Sprint 2
Next: Complete integration tests (#104)
```

### 4. Export Formats

Support various export formats:

```bash
# JSON format for integration
/azure:us-show 34 --format=json > story-34.json

# Markdown for documentation
/azure:us-show 34 --format=markdown > STORY-34.md

# CSV for reporting
/azure:us-show 34 --format=csv > story-34.csv
```

### 5. Include Options

- `--include-tasks`: Show all child tasks
- `--include-comments`: Show all comments
- `--include-history`: Show change history
- `--include-attachments`: List attachments
- `--include-links`: Show all links
- `--full`: Include everything

## Error Handling

- Story not found: Suggest similar IDs
- No permission: Show access request info
- API timeout: Use cached data if available