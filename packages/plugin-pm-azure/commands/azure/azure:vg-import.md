---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Import

Import variable group configuration from JSON or YAML file.

**Usage**: `/azure:vg-import <file> [--name=<name>] [--merge]`

**Examples**:
- `/azure:vg-import config.json` - Import from JSON
- `/azure:vg-import config.yaml --name=new-config` - Import with new name
- `/azure:vg-import config.json --merge` - Merge with existing

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Validate input file exists
2. Parse JSON or YAML format
3. Validate configuration structure
4. Create or update variable group
5. Handle secrets securely

### Input File Format (JSON)

```json
{
  "name": "app-config",
  "description": "Application config",
  "variables": {
    "API_URL": "https://api.example.com",
    "APP_ENV": "production"
  },
  "secretVariables": {
    "API_KEY": "your-api-key-here",
    "DB_PASSWORD": "your-db-password"
  }
}
```

### Input File Format (YAML)

```yaml
name: app-config
description: Application config
variables:
  API_URL: https://api.example.com
  APP_ENV: production
secretVariables:
  API_KEY: your-api-key-here
  DB_PASSWORD: your-db-password
```

### Security Warning

```
⚠️  SECURITY WARNING

Import file contains SECRET VALUES!
  - API_KEY (plain text)
  - DB_PASSWORD (plain text)

💡 Security best practices:
  - Delete import file after use
  - Don't commit secrets to git
  - Use .env files with .gitignore
  - Consider Azure Key Vault instead

Continue? (yes/no):
```

### Success Output

```
✅ Variable group imported successfully!

📋 Import Details:
- Source: config.json
- Variable Group: #6 - app-config
- Variables: 2 plain, 2 secret
- Created: 2024-01-15T10:30:00Z

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId=6

💡 Next steps:
- Link to pipeline: /azure:vg-link 6 --pipeline=<id>
- Verify: /azure:vg-show 6
- Delete file: rm config.json (contains secrets!)
```

### Error Handling

| Error | Solution |
|-------|----------|
| File not found | Check file path |
| Invalid format | Use valid JSON or YAML |
| Name conflict | Use --name flag |
| Invalid values | Check variable names and values |

## See Also

- `/azure:vg-export` - Export before import
- `/azure:vg-create` - Create new manually
