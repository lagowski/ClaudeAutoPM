---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Delete

Delete a variable group from Azure DevOps.

**Usage**: `/azure:vg-delete <variable-group-id> [--confirm]`

**Examples**:
- `/azure:vg-delete 5` - Delete with prompt
- `/azure:vg-delete 5 --confirm` - Delete without prompt

## Required Documentation Access

**Documentation Queries:**
- `mcp://context7/azure-devops/variable-groups` - Variable groups documentation
- `mcp://context7/infrastructure/change-management` - Change control

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Validate variable group exists
2. Check if linked to pipelines (WARN if yes)
3. Prompt for confirmation (unless --confirm)
4. Delete with `az pipelines variable-group delete --group-id <id> --yes`
5. Confirm deletion

### Confirmation Prompt

```
⚠️  About to delete variable group #5: app-config

This will:
✗ Permanently delete the variable group
✗ Remove all variables
✗ Unlink from all pipelines
✗ This action CANNOT be undone

Continue? (yes/no): yes
```

### Linked Pipelines Warning

```
⚠️  WARNING: This variable group is linked to 3 pipelines:
  - #51: CI Build
  - #52: CD Deploy
  - #53: Release

Deleting will break these pipelines!
Consider unlinking first: /azure:vg-unlink 5 --pipeline=<id>

Continue anyway? (yes/no):
```

### Success Output

```
✅ Variable group #5 deleted successfully!

📋 Deleted:
- Name: app-config
- Variables: 8 (5 plain, 3 secret)
- Pipelines affected: 3

💡 Next steps:
- Fix broken pipelines
- Create replacement: /azure:vg-create <name>
```

### Error Handling

| Error | Solution |
|-------|----------|
| VG not found | Check ID: /azure:vg-list |
| Linked to pipelines | Unlink first or force delete |
| Insufficient permissions | Verify PAT permissions |

## See Also

- `/azure:vg-unlink` - Unlink before deleting
- `/azure:vg-export` - Export before deletion
- `/azure:vg-create` - Create replacement
