---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps User Story Parse

Parse a User Story into Tasks with automatic creation in Azure DevOps.

**Usage**: `/azure:us-parse <user-story-id>`

**Example**: `/azure:us-parse 34`

## Required Environment Variables

Ensure `.claude/.env` contains:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Preflight Checklist

### Input Validation

1. **Validate User Story ID:**
   - Must be a valid number
   - If invalid, tell user: "❌ Invalid User Story ID. Please provide a numeric ID."

2. **Verify User Story exists:**
   - Fetch User Story from Azure DevOps
   - If not found, tell user: "❌ User Story #$ARGUMENTS not found in Azure DevOps"
   - If found, display title and current status

3. **Check for existing Tasks:**
   - Query for child Tasks of this User Story
   - If Tasks exist, ask: "⚠️ User Story already has [N] tasks. Create additional tasks? (yes/no)"

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Fetch User Story Details

Use azure-devops-specialist agent to:
- Get User Story title, description, and acceptance criteria
- Analyze the content to identify required tasks
- Check story points for complexity assessment

### 2. Analyze and Generate Tasks

Based on User Story analysis, generate tasks:

#### Standard Task Set

Every User Story should have these core tasks:

1. **Technical Design** (2-4h)
   - Create technical approach document
   - Define interfaces and data models
   - Review with team

2. **Implementation** (8-16h based on complexity)
   - Core functionality development
   - Unit tests creation
   - Self-review

3. **Integration Testing** (4-8h)
   - Integration test development
   - End-to-end testing
   - Bug fixes

4. **Documentation** (2-4h)
   - Code documentation
   - API documentation if applicable
   - Update README/wiki

5. **Code Review** (2h)
   - Peer review
   - Address feedback
   - Final approval

6. **Deployment Preparation** (2h)
   - Configuration updates
   - Migration scripts if needed
   - Deployment checklist

#### Context-Specific Tasks

Analyze the User Story to add specific tasks:

**For "password reset" example:**
- Design email template (2h)
- Implement token generation (4h)
- Create reset UI components (6h)
- Add security logging (2h)
- Configure email service (2h)

**For API stories:**
- Define OpenAPI spec (2h)
- Create API endpoints (8h)
- Add rate limiting (2h)
- Generate client SDK (2h)

**For UI stories:**
- Create mockups/wireframes (4h)
- Implement components (8h)
- Add responsive design (4h)
- Accessibility testing (2h)

### 3. Task Creation Process

Use azure-devops-specialist agent to create each task:

```json
{
  "op": "add",
  "path": "/fields/System.Title",
  "value": "[Task Title]"
},
{
  "op": "add",
  "path": "/fields/System.Description",
  "value": "[Task Description]"
},
{
  "op": "add",
  "path": "/fields/Microsoft.VSTS.Scheduling.RemainingWork",
  "value": [Hours]
},
{
  "op": "add",
  "path": "/relations/-",
  "value": {
    "rel": "System.LinkTypes.Hierarchy-Reverse",
    "url": "https://dev.azure.com/{org}/{project}/_apis/wit/workItems/{parent_id}"
  }
}
```

### 4. Task Organization

Group tasks by phase:
- **Analysis & Design**: Technical design, mockups, API specs
- **Development**: Implementation, unit tests
- **Testing**: Integration tests, user testing
- **Finalization**: Documentation, review, deployment

### 5. Output Format

After parsing and creating tasks:

```
✅ User Story #$ARGUMENTS parsed successfully!

📋 User Story: [Title]
Story Points: [N]

📝 Created Tasks:

Analysis & Design:
  ✓ Task #101: Technical Design (4h)
  ✓ Task #102: Create mockups (2h)

Development:
  ✓ Task #103: Implementation (12h)
  ✓ Task #104: Unit tests (4h)

Testing:
  ✓ Task #105: Integration testing (6h)
  ✓ Task #106: User acceptance testing (2h)

Finalization:
  ✓ Task #107: Documentation (3h)
  ✓ Task #108: Code review (2h)
  ✓ Task #109: Deployment prep (2h)

📊 Summary:
- Total Tasks: 9
- Total Hours: 37h
- Ready for sprint planning

🔗 View in Azure DevOps:
https://dev.azure.com/{org}/{project}/_workitems/edit/{story_id}

🚀 Next steps:
- Assign tasks to team members: /azure:task-assign
- Start work on first task: /azure:task-start [task-id]
- View task board: /azure:task-list {story_id}
```

### 6. Smart Parsing Features

#### Acceptance Criteria Analysis
- Each acceptance criterion → potential task
- Group related criteria into single tasks
- Identify testing tasks from criteria

#### Complexity-Based Hours
- Simple story (1-3 points): 20-30h total
- Medium story (5-8 points): 30-50h total  
- Complex story (13+ points): 50-80h total

#### Dependency Detection
- Identify tasks that block others
- Set predecessor/successor relationships
- Flag external dependencies

## Error Handling

- **API failures**: Retry with exponential backoff
- **Partial success**: Report created tasks, list failures
- **Invalid story**: Provide guidance on story structure

## Local Tracking

Save parsing results to `.claude/azure/parsed/{story_id}.md`:

```markdown
# Parsed: User Story #[ID]

Date: [ISO timestamp]
Title: [Story Title]

## Created Tasks
| ID | Title | Hours | Status |
|----|-------|-------|--------|
| 101 | Technical Design | 4h | New |
| 102 | Implementation | 12h | New |
...

## Parsing Rules Applied
- Standard task set: Yes
- API-specific tasks: No
- UI-specific tasks: Yes
- Total hours: 37h
```