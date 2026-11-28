---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Feature Decompose

Break down a Feature/Epic into User Stories with comprehensive planning.

**Usage**: `/azure:feature-decompose <feature-id|feature-name>`

**Examples**:
- `/azure:feature-decompose 25` - Decompose Feature #25
- `/azure:feature-decompose authentication-system` - Create and decompose new feature

## Required Environment Variables

Ensure `.claude/.env` contains:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.


## Instructions

### 1. Feature Analysis

If numeric ID provided:
- Fetch existing Feature/Epic from Azure DevOps
- Analyze description and requirements

If name provided:
- Create new Feature/Epic first
- Guide through feature definition

### 2. Decomposition Strategy

#### Interactive Discovery

```
🎯 Feature: Authentication System

Let's break this down into User Stories.

What types of users will interact with this feature?
1. End Users (customers)
2. Administrators
3. Support Staff
4. System/API consumers
5. All of the above

Select user types (comma-separated): _

What are the key capabilities needed?
[ ] User registration
[ ] Login/logout
[ ] Password management
[ ] Multi-factor authentication
[ ] Social login (OAuth)
[ ] Role-based access control
[ ] Session management
[ ] API authentication
[ ] Audit logging
[ ] Account lockout/security

Select capabilities (comma-separated): _
```

### 3. Generate User Stories

Based on selections, create stories:

#### Story Templates

**Registration Flow:**
```yaml
Title: "As a new user, I want to register an account"
Description: Complete registration flow with email verification
Acceptance Criteria:
  - User can enter email and password
  - Email verification sent
  - Account activated after verification
  - Welcome email sent
Story Points: 5
Priority: 1
```

**Login Flow:**
```yaml
Title: "As a registered user, I want to log in securely"
Description: Secure login with remember me option
Acceptance Criteria:
  - Email/password authentication
  - Remember me checkbox
  - Failed attempt tracking
  - Account lockout after N attempts
Story Points: 8
Priority: 1
```

**Password Reset:**
```yaml
Title: "As a user, I want to reset my forgotten password"
Description: Self-service password reset via email
Acceptance Criteria:
  - Reset link via email
  - Secure token validation
  - Password complexity requirements
  - Confirmation of reset
Story Points: 5
Priority: 2
```

### 4. Story Mapping

Create visual story map:

```
📊 Authentication System - Story Map

User Journey →
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Discovery   │ Registration │ Usage        │ Management   │
├─────────────┼──────────────┼──────────────┼──────────────┤
│             │ ▢ Register   │ ▢ Login      │ ▢ Profile    │ MVP
│             │   account    │              │   update     │
│             │              │ ▢ Logout     │              │
│             │ ▢ Verify     │              │ ▢ Password   │
│             │   email      │              │   change     │
├─────────────┼──────────────┼──────────────┼──────────────┤
│             │ ▢ Social     │ ▢ Remember   │ ▢ MFA setup  │ Release 2
│             │   signup     │   me         │              │
│             │              │              │ ▢ Security   │
│             │              │ ▢ SSO login  │   settings   │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ ▢ Landing   │ ▢ Bulk       │ ▢ API auth   │ ▢ Audit      │ Release 3
│   page      │   import     │              │   logs       │
│             │              │ ▢ Session    │              │
│             │              │   management │ ▢ Compliance │
└─────────────┴──────────────┴──────────────┴──────────────┘

Total Stories: 15
MVP Stories: 6 (26 points)
Total Points: 89
```

### 5. Dependency Mapping

Identify dependencies between stories:

```
🔗 Story Dependencies

┌─────────────────┐
│ Database Schema │
└────────┬────────┘
         ↓
┌─────────────────┐     ┌──────────────┐
│ User Registration├────→│ Email Service│
└────────┬────────┘     └──────────────┘
         ↓
┌─────────────────┐
│   User Login    │
└────────┬────────┘
         ├──────────────┐
         ↓              ↓
┌──────────────┐  ┌──────────────┐
│Password Reset│  │ User Profile │
└──────────────┘  └──────┬───────┘
                         ↓
                  ┌──────────────┐
                  │  MFA Setup   │
                  └──────────────┘
```

### 6. Create in Azure DevOps

Use azure-devops-specialist agent to create:

1. **Create Feature/Epic:**
```json
{
  "op": "add",
  "path": "/fields/System.Title",
  "value": "Authentication System"
}
```

2. **Create User Stories with hierarchy:**
```json
{
  "op": "add",
  "path": "/relations/-",
  "value": {
    "rel": "System.LinkTypes.Hierarchy-Reverse",
    "url": "feature_url"
  }
}
```

3. **Set dependencies between stories**

4. **Assign to iterations based on priority**

### 7. Output Summary

```
✅ Feature Decomposition Complete!

📦 Feature: Authentication System (#25)
URL: https://dev.azure.com/{org}/{project}/_workitems/edit/25

📋 Created User Stories:

Release 1 (MVP) - Sprint 1-2:
  #41 User Registration (5 pts) - Priority 1
  #42 Email Verification (3 pts) - Priority 1
  #43 User Login (8 pts) - Priority 1
  #44 Logout (2 pts) - Priority 2
  #45 Password Reset (5 pts) - Priority 2
  #46 Profile Management (3 pts) - Priority 3

Release 2 - Sprint 3-4:
  #47 Social Login (8 pts) - Priority 2
  #48 Remember Me (2 pts) - Priority 3
  #49 MFA Setup (13 pts) - Priority 2
  #50 SSO Integration (13 pts) - Priority 3

Release 3 - Sprint 5-6:
  #51 API Authentication (8 pts) - Priority 3
  #52 Session Management (5 pts) - Priority 3
  #53 Audit Logging (5 pts) - Priority 3
  #54 Compliance Reports (8 pts) - Priority 4

📊 Summary:
- Total User Stories: 14
- Total Story Points: 89
- Estimated Sprints: 6
- Team Capacity Needed: 2-3 developers

📈 Breakdown by Priority:
- Priority 1: 3 stories (16 pts)
- Priority 2: 4 stories (23 pts)
- Priority 3: 6 stories (34 pts)
- Priority 4: 1 story (8 pts)

🎯 Next Steps:
1. Review and prioritize stories with Product Owner
2. Assign stories to Sprint 1
3. Parse first story into tasks: /azure:us-parse 41
4. Create technical design documents
5. Set up development environment

📁 Documentation saved:
.claude/azure/features/authentication-system.md

Would you like to:
1. Start parsing the first User Story
2. Adjust priorities
3. View detailed story map
4. Export to different format

Select (1-4): _
```

### 8. Templates Library

Offer pre-built feature templates:

```
📚 Feature Templates Available:

1. Authentication System (14 stories, 89 pts)
2. E-commerce Checkout (12 stories, 76 pts)
3. Search & Filtering (8 stories, 55 pts)
4. Notification System (10 stories, 68 pts)
5. Admin Dashboard (15 stories, 102 pts)
6. Payment Integration (11 stories, 84 pts)
7. User Onboarding (7 stories, 42 pts)
8. API Gateway (9 stories, 71 pts)

Select template (1-8) or 'custom' for interactive: _
```

### 9. Estimation Assistance

Help with story point estimation:

```
📏 Story Point Estimation Helper

Analyzing: "User Login" story

Complexity Factors:
- UI Work: Medium (login form, validation)
- Backend: Medium (auth service, JWT)
- Database: Low (user lookup)
- Integration: Medium (session management)
- Testing: Medium (security tests needed)

Similar Stories from History:
- "User Profile Update" - 5 points (simpler)
- "Password Reset" - 5 points (similar)
- "OAuth Integration" - 13 points (more complex)

Suggested Points: 8
Confidence: High (based on 15 similar stories)

Accept suggestion? (y/n/adjust): _
```

## Smart Features

### AI-Powered Suggestions
- Analyze feature description
- Suggest missing user stories
- Identify common patterns

### Risk Assessment
- Highlight complex stories
- Flag dependencies
- Suggest mitigation strategies

### Capacity Planning
- Calculate team bandwidth
- Suggest sprint allocation
- Identify resource gaps

## Error Handling

- **Feature not found**: Offer to create new
- **Insufficient details**: Guide through discovery
- **Capacity exceeded**: Suggest phasing options

## Local Tracking

Save decomposition to `.claude/azure/features/{name}.md`:

```markdown
# Feature: Authentication System

Created: 2024-01-10
Feature ID: #25
Total Points: 89

## User Stories

### MVP (26 points)
1. [#41] User Registration (5 pts)
2. [#42] Email Verification (3 pts)
...

## Dependencies
- Email service required by Day 1
- Database schema must be complete
...

## Risks
- OAuth provider integration complexity
- MFA vendor selection pending
...
```