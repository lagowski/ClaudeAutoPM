---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps User Story New

Create a new User Story in Azure DevOps with comprehensive planning and task breakdown.

**Usage**: `/azure:us-new <story-name>`

**Example**: `/azure:us-new user-authentication`

## Required Environment Variables

Ensure `.claude/.env` contains:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Preflight Checklist

### Input Validation

1. **Validate story name format:**
   - Must contain only lowercase letters, numbers, and hyphens
   - Must start with a letter
   - No spaces or special characters allowed
   - If invalid, tell user: "❌ Story name must be kebab-case (lowercase letters, numbers, hyphens only). Examples: user-auth, payment-v2, notification-system"

2. **Check Azure DevOps connectivity:**
   - Verify PAT token is valid
   - Verify organization and project exist
   - If connection fails, provide specific error message

3. **Check for duplicates:**
   - Search for existing User Stories with similar titles
   - If found, ask: "⚠️ Similar User Story found: [title]. Continue anyway? (yes/no)"

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.


## Instructions

**CRITICAL**: This command MUST use the azure-devops-specialist agent for all Azure DevOps operations.

### Command Execution Pattern

```bash
# Use the Task tool to invoke the azure-devops-specialist agent
Task(subagent_type="azure-devops-specialist", 
     description="Create Azure DevOps User Story",
     prompt="Create a comprehensive User Story in Azure DevOps for: **$ARGUMENTS**
     
Follow the complete workflow:
1. Requirements gathering and discovery
2. User Story structure creation
3. Task breakdown and planning
4. Azure DevOps API integration
5. Local documentation and confirmation")
```

### Agent Instructions

You are acting as the azure-devops-specialist agent to create a comprehensive User Story in Azure DevOps for: **$ARGUMENTS**

#### 1. Discovery & Requirements Gathering

Engage in a structured conversation to gather:

- **User perspective**: Who is the user? What do they need?
- **Business value**: Why is this important?
- **Acceptance criteria**: How will we know it's done?
- **Technical considerations**: Any constraints or dependencies?
- **Scope boundaries**: What's included and excluded?

### 2. User Story Structure

Create the User Story with these components:

#### Title Format

`As a [user type], I want [functionality] so that [benefit]`

#### Description Structure

```markdown
## Story Overview
[Brief context and background]

## User Story
As a [specific user role]
I want [specific functionality]
So that [specific business value]

## Acceptance Criteria
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]
- [ ] [Additional criteria as needed]

## Technical Notes
- [Architecture considerations]
- [Integration points]
- [Performance requirements]

## Dependencies
- [List any blocking dependencies]
- [Required services or APIs]

## Out of Scope
- [What we're explicitly NOT doing in this story]

## Definition of Done
- [ ] Code complete and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Product Owner acceptance
```

### 3. Task Breakdown

Automatically create child Tasks for the User Story:

#### Standard Task Template

Each User Story should have these tasks at minimum:

1. **Technical Design** - Create technical design document
2. **Implementation** - Core functionality development
3. **Unit Tests** - Write and pass unit tests
4. **Integration Tests** - Write and pass integration tests
5. **Documentation** - Update relevant documentation
6. **Code Review** - Peer review and feedback incorporation
7. **Testing** - Manual testing and bug fixes
8. **Deployment** - Deploy to staging/production

#### Additional Tasks Based on Story Type

- **Frontend Stories**: UI/UX design, responsive testing, accessibility
- **Backend Stories**: API design, database schema, performance testing
- **Infrastructure Stories**: Security review, monitoring setup, scaling tests

#### 4. Azure DevOps Integration

Execute the Azure DevOps API operations:

1. **Create User Story Work Item:**

   ```bash
   # Example API call structure
   POST https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$User Story?api-version=7.0
   
   [
     {
       "op": "add",
       "path": "/fields/System.Title",
       "value": "[Story Title]"
     },
     {
       "op": "add",
       "path": "/fields/System.Description",
       "value": "[Full Description with Markdown]"
     },
     {
       "op": "add",
       "path": "/fields/Microsoft.VSTS.Common.AcceptanceCriteria",
       "value": "[Acceptance Criteria]"
     },
     {
       "op": "add",
       "path": "/fields/System.Tags",
       "value": "[Relevant Tags]"
     }
   ]
   ```

2. **Create Child Tasks:**
   - Each task linked as child to the User Story
   - Estimated hours for each task
   - Proper assignment if team members are known

3. **Set Metadata:**
   - Area Path: Based on project structure
   - Iteration Path: Current or next sprint
   - Priority: Based on discussion
   - Story Points: Estimated complexity

### 5. Local Documentation

Save a local copy to: `.claude/azure/user-stories/$ARGUMENTS.md` with:

```markdown
---
azure_id: [Work Item ID from Azure DevOps]
name: $ARGUMENTS
type: user-story
status: new
created: [Current ISO date/time]
story_points: [Estimated points]
sprint: [Target sprint]
---

# User Story: $ARGUMENTS

## Azure DevOps Details
- **Work Item ID**: [ID]
- **URL**: https://dev.azure.com/{org}/{project}/_workitems/edit/[ID]
- **Status**: New
- **Assigned To**: [Assignee if known]

[Rest of the User Story content...]

## Tasks
1. [Task Title] - ID: [Azure Task ID] - [Estimated Hours]h
2. [Task Title] - ID: [Azure Task ID] - [Estimated Hours]h
[...]
```

### 6. Success Confirmation

After creation:

1. Provide Azure DevOps Work Item URL
2. Show summary of User Story and Tasks created
3. Display total estimated hours
4. Suggest next steps:
   - "✅ User Story created with [N] tasks"
   - "📋 View in Azure DevOps: [URL]"
   - "🚀 Ready to start? Run: /azure:us-start $ARGUMENTS"

## Error Handling

- If Azure DevOps API fails: Retry with exponential backoff
- If authentication fails: Guide user to refresh PAT token
- If project not found: List available projects
- Always save local backup before API calls

## Quality Gates

Before creating in Azure DevOps, verify:

- [ ] Story follows "As a... I want... So that..." format
- [ ] At least 3 acceptance criteria defined
- [ ] All standard tasks included
- [ ] Story points estimated
- [ ] Dependencies identified
- [ ] Definition of Done included
