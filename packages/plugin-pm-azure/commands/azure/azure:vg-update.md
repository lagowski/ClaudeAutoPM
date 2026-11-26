---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Update

Update an existing variable group in Azure DevOps.

**Usage**: `/azure:vg-update <variable-group-id> [--variables="KEY=value"] [--secrets="SECRET=value"] [--description="text"]`

**Examples**:
- `/azure:vg-update 5 --variables="APP_ENV=staging"` - Update plain variables
- `/azure:vg-update 5 --secrets="API_KEY=newsecret"` - Update secret variables
- `/azure:vg-update 5 --description="Updated config"` - Update description

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Validate variable group exists
2. Parse update parameters (variables, secrets, description)
3. Update using AzureDevOpsResourcesProvider
4. Display updated configuration
5. Show Azure DevOps link

### Success Output

```
✅ Variable group #5 updated successfully!

📋 Updates Applied:
- Variables: 2 updated
- Secrets: 1 updated
- Description: Updated

💡 Actions:
- View details: /azure:vg-show 5
- Revert if needed: /azure:vg-update 5 --variables="PREV=value"
```

### Error Handling

| Error | Solution |
|-------|----------|
| VG not found | Check ID: /azure:vg-list |
| Invalid format | Use KEY=value format |
| No changes | Verify at least one field specified |

## See Also

- `/azure:vg-show` - View variable group
- `/azure:vg-create` - Create new variable group
- `/azure:vg-export` - Export before update
