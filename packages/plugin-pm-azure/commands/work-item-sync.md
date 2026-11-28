---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Work Item Synchronization

Synchronizes GitHub Issues with Azure DevOps Work Items bidirectionally.

**Usage**: `/azure:work-item-sync [--direction=both|github-to-azure|azure-to-github] [--project=project-name] [--area-path=area]`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


**Example**: `/azure:work-item-sync --direction=both --project=MyProject --area-path=MyProject\Team1`

**What this does**:
- Authenticates with Azure DevOps using PAT
- Fetches GitHub Issues and Azure DevOps Work Items
- Maps fields between systems (title, description, labels, assignees, status)
- Creates missing work items/issues in target systems
- Updates existing items with latest changes
- Maintains relationship links and sync metadata

Use the azure-devops-specialist agent to implement bidirectional synchronization between GitHub Issues and Azure DevOps Work Items.

Requirements for the agent:
- Set up Azure DevOps REST API authentication using Personal Access Token
- Implement GitHub Issues API integration using GitHub CLI or REST API
- Create field mapping between GitHub Issues and Azure DevOps Work Items
- Handle bidirectional synchronization with conflict resolution
- Maintain sync metadata to track relationships and prevent duplicates
- Implement proper error handling and retry logic for API failures
- Add progress reporting and detailed logging of sync operations