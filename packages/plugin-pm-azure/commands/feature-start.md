---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Feature Start

Start working on a Feature - update status, create branch, decompose into stories.

**Usage**: `/azure:feature-start <feature-id> [--branch-name=<name>]`

**Examples**:
- `/azure:feature-start 25`
- `/azure:feature-start 25 --branch-name=feature/auth-system`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Feature Activation

```
🚀 Starting Feature #25: Authentication System

Preflight Checklist:
✓ Feature approved by Product Owner
✓ Technical design reviewed
✓ Team capacity available
✓ Dependencies identified

Creating feature branch...
✓ Branch: feature/authentication-system
✓ Protected branch rules applied
✓ CI/CD pipeline configured

Status updated to: In Progress
Assigned to: Development Team

Next Actions:
[1] Decompose into User Stories
[2] Assign team members
[3] Schedule kickoff meeting
[4] Create technical design doc

Select (1-4): _
```

### 2. Update Feature Status

```json
{
  "op": "replace",
  "path": "/fields/System.State",
  "value": "In Progress"
},
{
  "op": "add",
  "path": "/fields/System.History",
  "value": "Feature development started"
}
```

### 3. Setup Workspace

```bash
# Create feature branch
git checkout -b feature/authentication-system

# Create feature directory
mkdir -p .claude/azure/features/authentication-system

# Initialize feature tracking
cat > .claude/azure/features/authentication-system/README.md << EOF
# Feature: Authentication System

Started: $(date)
Target: End of Q1
Team: John, Sarah, Mike

## User Stories
- [ ] User Registration
- [ ] Login/Logout
- [ ] Password Reset
- [ ] MFA Setup

## Milestones
- [ ] Week 1: Core auth
- [ ] Week 2: MFA
- [ ] Week 3: Testing
- [ ] Week 4: Deploy
EOF
```

### 4. Success Output

```
✅ Feature #25 started successfully!

📦 Authentication System
Status: In Progress
Branch: feature/authentication-system
Team: 3 developers assigned

📋 Generated 6 User Stories:
- #41: User Registration (5 pts)
- #42: Login/Logout (8 pts)
- #43: Password Reset (5 pts)
- #44: MFA Setup (13 pts)
- #45: Session Management (8 pts)
- #46: Admin Controls (8 pts)

Total: 47 story points
Estimated: 4 sprints

Ready to start first story: /azure:us-start 41
```