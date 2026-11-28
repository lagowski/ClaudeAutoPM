---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Groups List

List all variable groups in the Azure DevOps project with optional filtering.

**Usage**: `/azure:vg-list [--filter=<pattern>] [--type=<type>]`

**Examples**:
- `/azure:vg-list` - List all variable groups
- `/azure:vg-list --filter=prod` - Filter by name pattern
- `/azure:vg-list --filter=v1` - Show only V1 variable groups

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
     description="List Azure DevOps variable groups",
     prompt="List all variable groups in the project with filters:

Filter: **$FILTER**
Type: **$TYPE**

Follow the complete workflow:
1. Validate Azure CLI authentication
2. List variable groups with `az pipelines variable-group list`
3. Apply filters if specified
4. Display in formatted table
5. Show variable count and pipeline links")
```

### Agent Instructions

#### 1. Preflight Checks

**Validate Environment:**
- Check AZURE_DEVOPS_PAT is set
- Verify Azure CLI is installed
- Check access to project

**Validate Filters:**
- Parse filter pattern if provided
- Validate type filter if specified

#### 2. List Variable Groups

Use `az pipelines variable-group list`:

```bash
export AZURE_DEVOPS_EXT_PAT="$AZURE_DEVOPS_PAT"
az pipelines variable-group list \
  --org "https://dev.azure.com/$AZURE_DEVOPS_ORG" --project "$AZURE_DEVOPS_PROJECT" \
  ${FILTER:+--group-name "$FILTER"} -o json
```

#### 3. Display Output

**Table Format:**

```
📋 Variable Groups in {project}

┌──────────┬─────────────────────┬──────────┬────────┬─────────────┐
│ ID       │ Name                │ Type     │ Vars   │ Pipelines   │
├──────────┼─────────────────────┼──────────┼────────┼─────────────┤
│ 1        │ app-config          │ V1       │ 5      │ 3           │
│ 2        │ prod-secrets        │ Azure    │ 3      │ 2           │
│ 3        │ staging-vars        │ V1       │ 8      │ 1           │
└──────────┴─────────────────────┴──────────┴────────┴─────────────┘

Total: 3 variable groups
```

**Detailed List Format:**

```
📋 Variable Groups in {project}

🔹 [1] app-config (V1)
   Variables: 5 (all plain)
   Pipelines: 3 pipelines linked
   Created: 2024-01-15
   Updated: 2024-01-20

🔹 [2] prod-secrets (Azure Key Vault)
   Variables: 3 (all secret)
   Pipelines: 2 pipelines linked
   Key Vault: my-kv.vault.azure.net
   Created: 2024-01-10
   Updated: 2024-01-18

🔹 [3] staging-vars (V1)
   Variables: 8 (all plain)
   Pipelines: 1 pipeline linked
   Created: 2024-01-05
   Updated: 2024-01-15

💡 Total: 3 variable groups
```

#### 4. Filtering

**By Name Pattern:**

```bash
/azure:vg-list --filter=prod
# Shows only variable groups containing "prod" in name
```

**By Type:**

```bash
/azure:vg-list --type=Azure Key Vault
# Shows only Azure Key Vault variable groups
```

**Combined Filters:**

```bash
/azure:vg-list --filter=config --type=V1
# Shows V1 variable groups with "config" in name
```

#### 5. Success Output

**No Filter:**
```
✅ Found 3 variable groups

📊 Summary:
- Total variable groups: 3
- Plain variables: 13
- Secret variables: 3
- Total pipelines linked: 6

💡 Actions:
- View details: /azure:vg-show <id>
- Create new: /azure:vg-create <name>
- Link to pipeline: /azure:vg-link <vg-id> --pipeline=<id>
```

**With Filter:**
```
✅ Found 2 variable groups matching "prod"

📊 Filtered Results:
- app-prod-config (5 variables)
- prod-secrets (3 secrets)

💡 Actions:
- View details: /azure:vg-show <id>
- Remove filter: /azure:vg-list
```

#### 6. Error Handling

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid PAT | Check AZURE_DEVOPS_PAT |
| No variable groups found | Empty project | Create VG: /azure:vg-create |
| Filter too restrictive | No matches | Try broader filter |

**No Results:**

```
📋 No variable groups found

💡 Next steps:
- Create first variable group: /azure:vg-create <name>
- Check filter pattern: /azure:vg-list (no filter)
- Verify project access
```

### 7. Advanced Features

**Show Pipeline Links:**

```bash
/azure:vg-list --show-pipelines
# Shows which pipelines use each variable group
```

**Export to JSON:**

```bash
/azure:vg-list --output=json
# Output as JSON for parsing
```

**Detailed View:**

```bash
/azure:vg-list --detailed
# Show full variable names and counts
```

### 8. Integration Examples

**Quick Overview:**
```bash
# See all variable groups at a glance
/azure:vg-list
```

**Find Production Configs:**
```bash
# Find all production-related variable groups
/azure:vg-list --filter=prod
```

**Check Before Deletion:**
```bash
# List before deleting to verify ID
/azure:vg-list
/azure:vg-delete <id-from-list>
```

**Audit Variable Groups:**
```bash
# Get full inventory with details
/azure:vg-list --detailed --show-pipelines
```

## See Also

- `/azure:vg-show` - View variable group details
- `/azure:vg-create` - Create new variable group
- `/azure:vg-update` - Update variable group
- `/azure:vg-delete` - Delete variable group
- `/azure:vg-link` - Link variable group to pipeline
