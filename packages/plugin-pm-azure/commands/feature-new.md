---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Feature New

Create a new Feature/Epic in Azure DevOps with comprehensive planning.

**Usage**: `/azure:feature-new <feature-name>`

**Examples**:
- `/azure:feature-new authentication-system`
- `/azure:feature-new payment-integration`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Interactive Feature Creation

```
🎯 Creating new Feature: authentication-system

Feature Planning:
─────────────────────────────────────────────────
Title: Authentication System
Description: [Complete user authentication and authorization system]
Business Value: [85/100]
Time Criticality: [High/Medium/Low]
Effort (Story Points): [89]
Target Date: [End of Q1]
Risk: [Medium]

Key Capabilities:
□ User registration
□ Login/logout
□ Password management
□ Multi-factor auth
□ Role-based access
□ Session management

Dependencies:
- Database schema
- Email service
- Security audit

Confirm creation? (y/n): _
```

### 2. Create Feature

Use azure-devops-specialist agent:

```json
{
  "op": "add",
  "path": "/fields/System.Title",
  "value": "Authentication System"
},
{
  "op": "add",
  "path": "/fields/Microsoft.VSTS.Common.BusinessValue",
  "value": 85
},
{
  "op": "add",
  "path": "/fields/Microsoft.VSTS.Scheduling.Effort",
  "value": 89
}
```

### 3. Success Output

```
✅ Feature #25 created successfully!

Authentication System
Business Value: 85
Effort: 89 points
Risk: Medium

Next steps:
1. Decompose into stories: /azure:feature-decompose 25
2. Assign to team
3. Schedule planning session

View: https://dev.azure.com/{org}/{project}/_workitems/edit/25
```

### 4. Auto-Decomposition Option

```
Would you like to:
[1] Decompose into User Stories now
[2] Schedule planning session
[3] Add team members
[4] Exit

Select: _
```