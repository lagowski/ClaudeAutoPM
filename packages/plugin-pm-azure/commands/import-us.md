---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Import User Stories

Import User Stories from PRDs or Epics into Azure DevOps with automatic task breakdown.

**Usage**: `/azure:import-us <prd-name|epic-name>`

**Example**: `/azure:import-us authentication-system`

## Required Environment Variables

Ensure `.claude/.env` contains:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Preflight Checklist

### Input Validation

1. **Check source document exists:**
   - First check `.claude/prds/$ARGUMENTS.md`
   - Then check `.claude/epics/$ARGUMENTS.md`
   - If neither exists, tell user: "❌ No PRD or Epic found: $ARGUMENTS"

2. **Verify Azure DevOps connectivity:**
   - Validate PAT token
   - Verify organization and project exist
   - If fails, provide specific error

3. **Check for existing imports:**
   - Look for `.claude/azure/imports/$ARGUMENTS.log`
   - If exists, ask: "⚠️ Already imported on [date]. Re-import? (yes/no)"

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Parse Source Document

Use the file-analyzer agent to:
- Extract user stories/requirements from PRD
- Extract tasks from Epic issues
- Identify acceptance criteria
- Map dependencies

### 2. Transform to Azure DevOps Structure

#### From PRD

Convert each requirement section to User Story:

```markdown
PRD Section: "User Authentication"
→ User Story: "As a user, I want to authenticate securely"
→ Tasks: Design, Implementation, Testing, Documentation
```

#### From Epic

Convert each issue to User Story with subtasks:

```markdown
Epic Issue: "#123 - Implement login flow"
→ User Story: "As a user, I want to log in to the system"
→ Tasks: From issue checklist and description
```

### 3. Batch Creation Strategy

Use azure-devops-specialist agent to:

1. **Create Epic/Feature** (if not exists):
   - Parent container for all User Stories
   - Link to source PRD/Epic

2. **Create User Stories in batches:**
   - Process 5 stories at a time
   - Each with standard tasks
   - Maintain relationships

3. **Link Dependencies:**
   - Predecessor/successor links
   - Blocked by relationships
   - Related work items

### 4. Mapping Rules

#### Field Mappings

| Source (PRD/Epic) | Azure DevOps Field |
|-------------------|-------------------|
| Section Title | Story Title |
| Requirements | Acceptance Criteria |
| Technical Notes | Description |
| Priority | Priority (1-4) |
| Complexity | Story Points |
| Dependencies | Links/Relations |

#### Task Templates

For each User Story, create:

1. **Analysis Task** (4h)
   - Review requirements
   - Technical design

2. **Development Task** (8-16h)
   - Implementation
   - Unit tests

3. **Testing Task** (4-8h)
   - Integration tests
   - Manual testing

4. **Documentation Task** (2h)
   - Code documentation
   - User documentation

5. **Review Task** (2h)
   - Code review
   - Approval

### 5. Import Tracking

Create import log at `.claude/azure/imports/$ARGUMENTS.log`:

```markdown
# Import Log: $ARGUMENTS

## Import Details
- **Source**: [PRD|Epic] - $ARGUMENTS
- **Date**: [ISO timestamp]
- **Azure DevOps URL**: [Parent item URL]

## Created Items

### Epic/Feature
- ID: [Azure ID]
- Title: [Title]
- URL: [Direct link]

### User Stories
1. [ID] - [Title] - [Story Points]pts - [N tasks]
2. [ID] - [Title] - [Story Points]pts - [N tasks]
...

### Summary
- Total User Stories: [N]
- Total Tasks: [N]
- Total Story Points: [N]
- Total Estimated Hours: [N]

## Field Mappings Used
[Document any custom mappings]

## Skipped Items
[List any sections not imported and why]
```

### 6. Incremental Import Support

If re-importing:
- Check existing Azure items
- Skip duplicates
- Update changed items only
- Add new items
- Report what was updated

### 7. Validation & Rollback

Before committing import:
- Preview all items to be created
- Estimate total work (hours/points)
- Get user confirmation for large imports (>10 stories)

If import fails:
- Save progress to log
- Provide rollback instructions
- List successfully created items

### 8. Success Output

After successful import:

```
✅ Import Complete: $ARGUMENTS → Azure DevOps

📊 Summary:
- Created 1 Epic/Feature
- Created [N] User Stories  
- Created [N] Tasks
- Total Story Points: [N]
- Total Hours: [N]

📋 View in Azure DevOps:
[URL to parent Epic/Feature]

📁 Import log saved:
.claude/azure/imports/$ARGUMENTS.log

🚀 Next steps:
- Review imported items in Azure DevOps
- Assign team members to tasks
- Add to current/next sprint
- Run: /azure:us-status $ARGUMENTS
```

## Advanced Options

### Custom Field Mapping

Support custom field mappings via configuration:

```yaml
# .claude/azure/config.yml
field_mappings:
  custom_field_1: "Custom.ProjectCode"
  risk_level: "Custom.RiskAssessment"
```

### Sprint Assignment

- If current sprint detected, ask to assign stories
- Otherwise, assign to backlog

### Team Assignment

- If team members configured, suggest assignments
- Based on expertise areas if defined

## Error Handling

- **Partial import failure**: Continue with remaining items
- **API rate limits**: Implement exponential backoff
- **Invalid data**: Skip item, log reason, continue
- **Network issues**: Retry 3 times before failing

## Quality Checks

Before import:

- [ ] All User Stories have clear titles
- [ ] Acceptance criteria defined
- [ ] Story points estimated
- [ ] Tasks have hour estimates
- [ ] No duplicate stories
- [ ] Parent Epic/Feature identified