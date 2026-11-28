---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Unlink

Unlink a variable group from a pipeline using REST API.

**Usage**: `/azure:vg-unlink <variable-group-id> --pipeline=<pipeline-id> [--confirm]`

**Examples**:
- `/azure:vg-unlink 5 --pipeline=51` - Unlink from pipeline
- `/azure:vg-unlink 5 --pipeline=51,52,53` - Unlink from multiple

## Required Documentation Access

**Documentation Queries:**
- `mcp://context7/azure-devops/pipelines` - Pipelines documentation
- `mcp://context7/azure-devops/variable-groups` - Variable groups

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Validate variable group and pipeline exist
2. Check if currently linked
3. Unlink via the pipeline's `variablegroups` REST endpoint (`az pipelines variable-group` has no unlink subcommand); call it with `az devops invoke` or `curl`
4. Confirm unlinking
5. Show remaining links

### Success Output

```
✅ Variable group unlinked successfully!

📋 Unlink Details:
- Variable Group: #5 - app-config
- Pipeline: #51 - CI Build
- Remaining links: 2 pipelines

💡 Variable group no longer accessible in pipeline
💡 Update pipeline YAML to remove variable group reference
```

### Error Handling

| Error | Solution |
|-------|----------|
| Not linked | Already unlinked |
| VG not found | Check ID: /azure:vg-list |
| Pipeline not found | Verify pipeline ID |

## See Also

- `/azure:vg-link` - Link variable group to pipeline
- `/azure:vg-show` - Show current links
