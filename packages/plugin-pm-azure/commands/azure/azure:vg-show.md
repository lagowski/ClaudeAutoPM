---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Show

Display detailed information about a specific variable group.

**Usage**: `/azure:vg-show <variable-group-id> [--reveal-count]`

**Examples**:
- `/azure:vg-show 5` - Show variable group details
- `/azure:vg-show 5 --reveal-count` - Show variable count (not values)

## Required Environment Variables

Ensure `.claude/.env` contains:
```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Required Documentation Access

**MANDATORY:** Before showing variable groups, query Context7 for best practices:

**Documentation Queries:**
- `mcp://context7/azure-devops/variable-groups` - Variable groups documentation
- `mcp://context7/security/secrets-display` - Secrets display security
- `mcp://context7/azure-devops/pipelines` - Pipeline integration

**Why This is Required:**
- Ensures secure handling of secret values
- Validates what information can be displayed
- Prevents accidental secret exposure

## Instructions

**CRITICAL**: This command MUST use the azure-devops-specialist agent for all operations.

### Command Execution Pattern

```bash
Task(subagent_type="azure-devops-specialist",
     description="Show Azure DevOps variable group details",
     prompt="Show details for variable group ID: **$ARGUMENTS**

Follow the complete workflow:
1. Validate variable group ID exists
2. Fetch variable group details with `az pipelines variable-group show`
3. Get linked pipelines information
4. Display formatted output with masked secrets
5. Show Azure DevOps UI link")
```

### Agent Instructions

#### 1. Preflight Checks

**Validate Input:**
- Variable group ID must be provided
- Verify ID is numeric
- Check if variable group exists

#### 2. Fetch Variable Group Details

Use `az pipelines variable-group show`:

```bash
export AZURE_DEVOPS_EXT_PAT="$AZURE_DEVOPS_PAT"
az pipelines variable-group show --group-id "$VG_ID" \
  --org "https://dev.azure.com/$AZURE_DEVOPS_ORG" --project "$AZURE_DEVOPS_PROJECT" -o json
```

Secret values come back as `null`; show them as `***`. Linked pipelines are not part of
this output: list the pipelines' definitions (`az pipelines list`) and match the group ID,
or say the links could not be determined.

#### 3. Display Output

**Detailed Format:**

```
📋 Variable Group Details

🔹 Basic Information
   ID: {vg_id}
   Name: {name}
   Description: {description}
   Type: {type} (V1 / Azure Key Vault)

📊 Variables
   Total: {total_count}
   Plain Variables: {plain_count}
   Secret Variables: {secret_count}

📝 Plain Variables:
   - VAR1: value1
   - VAR2: value2
   - VAR3: true

🔐 Secret Variables:
   - API_KEY: *** (hidden)
   - DB_PASSWORD: *** (hidden)
   - SECRET_TOKEN: *** (hidden)

🔗 Linked Pipelines: {count}
   - Pipeline #51: CI Build
   - Pipeline #52: CD Deploy
   - Pipeline #53: Release

📅 Timeline
   Created: {created_date} by {created_by}
   Modified: {modified_date} by {modified_by}

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId={vg_id}
```

#### 4. Security - Secret Masking

**NEVER display secret values:**
```javascript
// Always mask secret variables
if (variable.isSecret) {
  console.log(`  - ${name}: *** (hidden)`);
} else {
  console.log(`  - ${name}: ${value}`);
}
```

**Warn about secrets:**
```
⚠️  This variable group contains {count} secret variables
   Secret values are hidden for security
   To update secrets, use: /azure:vg-update {id} --secrets="..."
```

#### 5. Success Output

```
✅ Variable group #5: app-config

📋 Summary:
- Type: V1 (Standard)
- Variables: 8 total (5 plain, 3 secret)
- Pipelines: 3 linked

💡 Actions:
- Update: /azure:vg-update 5
- Link to pipeline: /azure:vg-link 5 --pipeline=<id>
- Export: /azure:vg-export 5
- Delete: /azure:vg-delete 5
```

#### 6. Error Handling

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| Variable group not found | Invalid ID | Check ID with /azure:vg-list |
| Access denied | Insufficient permissions | Verify PAT permissions |
| Authentication failed | Invalid PAT | Check AZURE_DEVOPS_PAT |

**Not Found:**
```
❌ Variable group #999 not found

💡 Troubleshooting:
- List all variable groups: /azure:vg-list
- Check ID is correct
- Verify you have access to the project
```

### 7. Advanced Features

**Show Variable Count Only:**

```bash
/azure:vg-show 5 --reveal-count
# Shows: "5 plain variables, 3 secrets" (no values)
```

**Show Linked Pipeline Details:**

```bash
/azure:vg-show 5 --show-pipelines
# Shows full pipeline information
```

**JSON Output:**

```bash
/azure:vg-show 5 --output=json
# Output as JSON (secrets still masked)
```

### 8. Integration Examples

**Check Before Update:**
```bash
# View current state
/azure:vg-show 5
# Then update
/azure:vg-update 5 --variables="NEW_VAR=value"
```

**Verify Link:**
```bash
# Check if variable group is linked
/azure:vg-show 5 --show-pipelines
```

**Audit Secrets:**
```bash
# Check how many secrets exist
/azure:vg-show 5 --reveal-count
```

### 9. Special Cases

**Azure Key Vault Variable Groups:**

```
📋 Variable Group Details (Azure Key Vault)

🔹 Basic Information
   ID: 10
   Name: kv-secrets
   Type: Azure Key Vault
   Key Vault: my-kv.vault.azure.net

🔐 Secrets from Key Vault:
   - prod-db-password
   - prod-api-key
   - prod-certificate

📝 Note: This variable group references Azure Key Vault
   Secrets are managed in Key Vault, not in Azure DevOps
   To update secrets, use Azure Key Vault

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId=10
```

## See Also

- `/azure:vg-list` - List all variable groups
- `/azure:vg-update` - Update variable group
- `/azure:vg-link` - Link to pipeline
- `/azure:vg-export` - Export configuration
