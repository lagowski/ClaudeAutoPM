---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Init

Initialize Azure DevOps integration for the project.

**Usage**: `/azure:init`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Configuration Wizard

```
🔧 Azure DevOps Integration Setup
═══════════════════════════════════════════════════════════════

Step 1: Azure DevOps Credentials
─────────────────────────────────────────────────────────────
Personal Access Token (PAT): [Enter PAT]
Organization: [rafal0387]
Project: [Speacher]

Testing connection... ✓ Connected

Step 2: Project Configuration
─────────────────────────────────────────────────────────────
Default Area Path: [Speacher]
Default Iteration: [Speacher\Sprint 2]
Work Item Types:
  ✓ Feature/Epic
  ✓ User Story
  ✓ Task
  ✓ Bug

Step 3: Team Configuration
─────────────────────────────────────────────────────────────
Team Name: [Development Team]
Team Members:
  - john@example.com (Developer)
  - sarah@example.com (Developer)
  - mike@example.com (Tech Lead)
  - lisa@example.com (QA)

Step 4: Integration Options
─────────────────────────────────────────────────────────────
✓ Enable bi-directional sync
✓ Auto-create branches for tasks
✓ Link commits to work items
✓ Sync PR status
□ Auto-assign based on expertise
□ Time tracking integration

Step 5: Local Setup
─────────────────────────────────────────────────────────────
Creating directories...
✓ .claude/azure/
✓ .claude/azure/user-stories/
✓ .claude/azure/tasks/
✓ .claude/azure/features/
✓ .claude/azure/cache/
✓ .claude/azure/imports/

Saving configuration...
✓ .claude/.env updated
✓ .claude/azure/config.yml created
```

### 2. Create Configuration Files

`.claude/.env`:
```bash
AZURE_DEVOPS_PAT=xxx
AZURE_DEVOPS_ORG=rafal0387
AZURE_DEVOPS_PROJECT=Speacher
```

`.claude/azure/config.yml`:
```yaml
azure_devops:
  organization: rafal0387
  project: Speacher
  
defaults:
  area_path: Speacher
  iteration_path: Speacher\Sprint 2
  
team:
  name: Development Team
  members:
    - email: john@example.com
      role: Developer
      expertise: [backend, auth]
    - email: sarah@example.com
      role: Developer
      expertise: [frontend, ui]
      
sync:
  enabled: true
  interval: 5m
  bidirectional: true
  
git:
  auto_branch: true
  branch_prefix: "azure"
  link_commits: true
  
features:
  time_tracking: false
  auto_assign: false
  notifications: true
```

### 3. Validation & Import

```
📊 Existing Work Items Found
─────────────────────────────────────────────────────────────
Found in Azure DevOps:
- 3 Features
- 12 User Stories
- 45 Tasks

Would you like to:
[1] Import all to local cache
[2] Import active items only
[3] Start fresh (no import)
[4] Select items to import

Choice: 2

Importing active items...
✓ Imported 1 Feature
✓ Imported 4 User Stories
✓ Imported 12 Tasks

Cache populated: .claude/azure/cache/
```

### 4. Git Hooks Setup

```bash
#!/bin/bash
# .git/hooks/commit-msg
# Auto-link commits to Azure DevOps items

commit_regex="(#[0-9]+)"
if grep -qE "$commit_regex" "$1"; then
  echo "Azure DevOps work item detected"
  # Add work item link
fi
```

### 5. Success Summary

```
✅ Azure DevOps Integration Initialized!

📋 Configuration Summary:
- Organization: rafal0387
- Project: Speacher
- Team: 4 members
- Active Items: 17 imported

🔧 Available Commands:
- /azure:us-new - Create User Story
- /azure:task-start - Start task
- /azure:sprint-status - Sprint dashboard
- /azure:standup - Daily standup
- /azure:help - Full command list

🚀 Quick Start:
1. View current sprint: /azure:sprint-status
2. See your tasks: /azure:task-list --my-tasks
3. Start work: /azure:next-task

📚 Documentation: .claude/commands/azure/README.md

Happy coding! 🎉
```

### 6. Health Check

```
Running health check...
✓ API connection: OK
✓ Permissions: Read/Write
✓ Git integration: Configured
✓ Local cache: Ready
✓ Sync service: Running

All systems operational!
```