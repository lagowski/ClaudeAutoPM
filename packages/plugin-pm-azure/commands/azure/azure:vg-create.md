---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Create

Create a new variable group in Azure DevOps with optional secret variables.

**Usage**: `/azure:vg-create <name> --variables="KEY=value" [--secrets="SECRET=value"] [--description="text"]`

**Examples**:
- `/azure:vg-create app-config --variables="APP_ENV=prod"` - Create with plain variables
- `/azure:vg-create app-secrets --secrets="API_KEY=secret123"` - Create with secrets only
- `/azure:vg-create full-config --variables="ENV=prod" --secrets="DB_PASS=secret" --description="Production config"`

## Required Environment Variables

Ensure `.claude/.env` contains:
```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.

## Instructions

**CRITICAL**: This command MUST use the azure-devops-specialist agent for all operations.

### Command Execution Pattern

```bash
Task(subagent_type="azure-devops-specialist",
     description="Create Azure DevOps variable group",
     prompt="Create variable group with the following configuration:

Name: **$ARGUMENTS**
Variables: **$VARIABLES**
Secrets: **$SECRETS**
Description: **$DESCRIPTION**

Follow the complete workflow:
1. Validate Azure CLI and PAT authentication
2. Create variable group using AzureDevOpsResourcesProvider
3. Handle plain variables via CLI
4. Handle secret variables via REST API
5. Display created variable group details with ID
6. Show link to Azure DevOps UI")
```

### Agent Instructions

#### 1. Preflight Checks

**Validate Environment:**
- Check for AZURE_DEVOPS_PAT environment variable
- Verify Azure CLI is installed: `az --version`
- Verify PAT has necessary permissions (Variable Groups: Read, Create, Manage)
- Check organization and project are accessible

**Validate Inputs:**
- Variable group name must be provided
- Name must be unique within project
- Variables and secrets must be in KEY=value format
- Warn if name already exists

#### 2. Variable Group Creation Process

**Parse Input Variables:**

```bash
# Parse --variables argument
VARIABLES="$VARIABLES"  # e.g., "KEY1=value1,KEY2=value2"
# Convert to object: {KEY1: "value1", KEY2: "value2"}

# Parse --secrets argument
SECRETS="$SECRETS"  # e.g., "SECRET1=secret123,SECRET2=password"
# Convert to object: {SECRET1: "secret123", SECRET2: "password"}
```

**Create Variable Group:**

Use `AzureDevOpsResourcesProvider.createVariableGroupWithSecrets()`:

1. **Step 1**: Create variable group with plain variables using Azure CLI
2. **Step 2**: Add secret variables using REST API
3. **Step 3**: Return created variable group with ID

```javascript
const provider = new AzureDevOpsResourcesProvider({
  token: process.env.AZURE_DEVOPS_PAT,
  organization: process.env.AZURE_DEVOPS_ORG,
  project: process.env.AZURE_DEVOPS_PROJECT
});

// Hybrid approach: CLI for plain vars, REST for secrets
const vg = await provider.createVariableGroupWithSecrets(
  name,
  variables,  // {KEY1: "value1"}
  secrets,    // {SECRET1: "secret123"}
  description
);
```

#### 3. Security Considerations

**Secret Handling:**
- ✅ Never log secret values
- ✅ Mask secret values in output: `SECRET1=***`
- ✅ Confirm before creating secrets
- ✅ Store secrets in Azure Key Vault when possible

**Best Practices:**
- Use descriptive variable names
- Group related variables together
- Document secret variables clearly
- Rotate secrets regularly

#### 4. Success Output

```
✅ Variable group created successfully!

📋 Variable Group Details:
- ID: {vg_id}
- Name: {name}
- Description: {description}

📊 Variables: {count} plain, {secret_count} secrets
- Plain variables: VAR1, VAR2, VAR3
- Secret variables: SECRET1, SECRET2 (values hidden)

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId={vg_id}

💡 Next steps:
- Link to pipeline: /azure:vg-link {vg_id} --pipeline=<id>
- View details: /azure:vg-show {vg_id}
- Export config: /azure:vg-export {vg_id}
```

#### 5. Error Handling

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid PAT | Check AZURE_DEVOPS_PAT in .claude/.env |
| Variable group already exists | Name conflict | Choose different name or use /azure:vg-update |
| Insufficient permissions | PAT lacks scope | Grant "Variable Groups" permissions |
| Invalid variable format | Malformed KEY=value | Use format: KEY=value (no spaces around =) |
| CLI not found | Azure CLI not installed | Install from https://aka.ms/installazurecliwindows |

**Error Output Format:**

```
❌ Failed to create variable group: {error message}

💡 Troubleshooting:
- Check PAT has "Variable Groups" permissions
- Verify Azure CLI is installed: az --version
- Ensure variable format is KEY=value
- Check network connectivity to dev.azure.com
```

### 6. Integration Examples

**Basic Variable Group:**
```bash
/azure:vg-create frontend-config \
  --variables="API_URL=https://api.example.com,BUILD_ENV=production"
```

**With Secrets:**
```bash
/azure:vg-create backend-secrets \
  --variables="DB_HOST=mssql.example.com" \
  --secrets="DB_PASSWORD=SecretPass123,API_KEY=sk_live_12345"
```

**Full Configuration:**
```bash
/azure:vg-create production-config \
  --variables="ENV=production,DEBUG=false,LOG_LEVEL=info" \
  --secrets="DB_PASS=Secret123,API_KEY=key_abc" \
  --description="Production environment configuration"
```

### 7. Validation

**After Creation:**
1. Verify variable group appears in Azure DevOps UI
2. Check all variables are present
3. Verify secret values are masked
4. Test linking to a test pipeline
5. Validate variable accessibility in pipeline

### 8. Hooks

Support for custom hooks:
- `pre-vg-create`: Run before creating variable group
- `post-vg-create`: Run after variable group created

Example: `.claude/hooks/pre-vg-create.sh`
```bash
#!/bin/bash
# Ensure variable group doesn't exceed limits
VG_COUNT=$(az pipelines variable-group list --query "length(@)")
if [ $VG_COUNT -gt 100 ]; then
  echo "Warning: Approaching variable group limit"
fi
```

## Advanced Features

### Import From .env File

```bash
# Create from .env file
/azure:vg-create app-config --env-file=.env.production
```

### Template-Based Creation

```bash
# Create from template
/azure:vg-create app-config --template=.claude/templates/variable-group.yaml
```

### Bulk Creation

```bash
# Create multiple from JSON file
/azure:vg-create --bulk=variable-groups.json
```

## See Also

- `/azure:vg-show` - View variable group details
- `/azure:vg-update` - Update existing variable group
- `/azure:vg-link` - Link variable group to pipeline
- `/azure:vg-delete` - Delete variable group
- `/azure:vg-export` - Export variable group configuration
