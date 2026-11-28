---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Export

Export variable group configuration to JSON or YAML file.

**Usage**: `/azure:vg-export <variable-group-id> [--output=<file>] [--format=json|yaml]`

**Examples**:
- `/azure:vg-export 5` - Export to JSON (vg-5.json)
- `/azure:vg-export 5 --output=config.json` - Export to specific file
- `/azure:vg-export 5 --format=yaml` - Export to YAML format

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Fetch variable group details
2. Mask secret values in export
3. Format output (JSON or YAML)
4. Write to file
5. Display export location

### Output Format (JSON)

```json
{
  "id": 5,
  "name": "app-config",
  "description": "Application configuration",
  "type": "V1",
  "variables": {
    "API_URL": "https://api.example.com",
    "APP_ENV": "production",
    "DEBUG": "false"
  },
  "secretVariables": {
    "API_KEY": "***",
    "DB_PASSWORD": "***"
  },
  "exportedAt": "2024-01-15T10:30:00Z"
}
```

### Output Format (YAML)

```yaml
id: 5
name: app-config
description: Application configuration
type: V1
variables:
  API_URL: https://api.example.com
  APP_ENV: production
  DEBUG: "false"
secretVariables:
  API_KEY: "***"
  DB_PASSWORD: "***"
exportedAt: 2024-01-15T10:30:00Z
```

### Security Warning

```
⚠️  SECURITY WARNING

Secret values are MASKED in export:
  - API_KEY: *** (hidden)
  - DB_PASSWORD: *** (hidden)

To export actual secrets (DANGEROUS):
  /azure:vg-export 5 --reveal-secrets

💡 Best practice: Store exports in secure location
```

### Success Output

```
✅ Variable group exported successfully!

📋 Export Details:
- Variable Group: #5 - app-config
- Format: JSON
- File: vg-5.json (245 bytes)
- Location: /current/directory/vg-5.json

📊 Export Summary:
- Plain variables: 3
- Secret variables: 2 (masked)
- Total: 5 variables

💡 Next steps:
- Import: /azure:vg-import vg-5.json
- Version control: git add vg-5.json
- Backup: cp vg-5.json backups/
```

### Error Handling

| Error | Solution |
|-------|----------|
| VG not found | Check ID: /azure:vg-list |
| Write permission | Check directory permissions |
| Invalid format | Use json or yaml |

## See Also

- `/azure:vg-import` - Import from file
- `/azure:vg-show` - Show before export
