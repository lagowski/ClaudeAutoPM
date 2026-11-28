---
allowed-tools: Task
---

# Azure DevOps Integration Fix - Example Command

This demonstrates the CORRECT way to integrate Azure DevOps commands with the azure-devops-specialist agent.

**Usage**: `/azure:example <work-item-id>`

## The Problem

The original commands had extensive documentation about using the azure-devops-specialist agent but never actually invoked it. They tried to handle Azure DevOps operations directly, which fails.

## The Solution

**ALWAYS use the Task tool to invoke the azure-devops-specialist agent:**

```bash
# CORRECT approach
Task(subagent_type="azure-devops-specialist", 
     description="Handle Azure DevOps operation",
     prompt="Your detailed instructions for the agent...")
```

## Example Implementation

When user runs `/azure:example 123`, this command should execute:

```bash
# Invoke the specialized agent
Task(subagent_type="azure-devops-specialist", 
     description="Process work item 123",
     prompt="Process Azure DevOps work item ID: **123**
     
Complete workflow:
1. Authenticate with Azure DevOps using PAT token
2. Fetch work item details and status
3. Perform requested operations (status updates, comments, etc.)
4. Update local documentation
5. Provide success confirmation with Azure DevOps URL
     
Environment variables:
- AZURE_DEVOPS_PAT: Personal access token
- AZURE_DEVOPS_ORG: Organization name  
- AZURE_DEVOPS_PROJECT: Project name
     
Return structured output with:
- Work item details
- Operations performed
- Azure DevOps links
- Next suggested actions")
```
## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.



## Key Changes Made

1. **us-new.md**: Added Task tool invocation at the top
2. **task-start.md**: Added Task tool invocation pattern
3. **All commands**: Should follow this pattern

## What the Agent Should Handle

The azure-devops-specialist agent should:
- Make all Azure DevOps API calls
- Handle authentication and error handling
- Process work item operations
- Generate local documentation
- Provide structured output

## What the Commands Should Do

The command files should:
- Validate inputs
- Call the agent with Task tool
- Provide agent instructions
- Define output format expectations