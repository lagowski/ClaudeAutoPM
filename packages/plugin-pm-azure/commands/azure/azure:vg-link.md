---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Link

**[KEY FEATURE]** Link a variable group to a pipeline using REST API.

**This operation is NOT supported by Azure CLI - REST API is REQUIRED!**

**Usage**: `/azure:vg-link <variable-group-id> --pipeline=<pipeline-id> [--confirm]`

**Examples**:
- `/azure:vg-link 5 --pipeline=51` - Link variable group 5 to pipeline 51
- `/azure:vg-link 5 --pipeline=51 --confirm` - Link with confirmation prompt
- `/azure:vg-link 5 --pipeline=51,52,53` - Link to multiple pipelines at once

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
     description="Link variable group to pipeline",
     prompt="Link variable group to pipeline using REST API:

Variable Group ID: **$ARGUMENTS**
Pipeline ID: **$PIPELINE**
Confirm: **$CONFIRM**

Follow the complete workflow:
1. Validate both variable group and pipeline exist
2. Check if already linked (idempotent operation)
3. Link via the pipeline's `variablegroups` REST endpoint (`az pipelines variable-group` has no link subcommand)
4. Display success with confirmation
5. Show all pipelines now using this variable group")
```

### Agent Instructions

#### 1. Preflight Checks

**Validate Inputs:**
- Variable group ID must be numeric
- Pipeline ID must be numeric
- Both must exist in the project

**Check Current State:**
```bash
# Check if variable group exists
az pipelines variable-group show --id $VG_ID

# Check if pipeline exists
az pipelines show --id $PIPELINE_ID --query "[id,name,folder]"

# Check current variable groups on pipeline
# (This requires REST API - use provider)
```

**Verify Not Already Linked:**
```javascript
const pipelineVGs = await provider.getPipelineVariableGroups(pipelineId);
const alreadyLinked = pipelineVGs.variableGroups.includes(variableGroupId);

if (alreadyLinked) {
  console.log('⚠️  Variable group already linked to this pipeline');
  return;
}
```

#### 2. Link Variable Group to Pipeline

Check the group exists with `az pipelines variable-group show --group-id <id>`, then link it.
`az pipelines variable-group` has no link subcommand, so the REST API is REQUIRED for this operation
(call it with `curl` using the PAT, or `az devops invoke`).

**REST API Call:**
```http
PUT https://dev.azure.com/{org}/{project}/_apis/pipelines/{pipelineId}/variablegroups?api-version=7.0
Content-Type: application/json

{
  "variableGroups": [
    {"id": 5},
    {"id": 12},
    {"id": 17}
  ]
}
```

#### 3. Multiple Pipelines

**Link to Multiple Pipelines:**

```bash
# Comma-separated list
/azure:vg-link 5 --pipeline=51,52,53
```

**Agent Implementation:**
```javascript
const pipelineIds = pipeline.split(',').map(id => id.trim());

for (const pipelineId of pipelineIds) {
  await provider.linkVariableGroupToPipeline(variableGroupId, parseInt(pipelineId));
  console.log(`✅ Linked to pipeline #${pipelineId}`);
}
```

#### 4. Success Output

**Single Pipeline:**

```
✅ Variable group linked successfully!

📋 Link Details:
- Variable Group: #5 - app-config
- Pipeline: #51 - CI Build Pipeline
- Project: {project}

🔗 Verification:
- Variable group now accessible in pipeline
- Variables available as $(VAR_NAME)
- Secret variables securely injected

🎯 Next Steps:
- Run pipeline to verify: az pipelines run --id 51
- View variable group: /azure:vg-show 5
- View all linked: /azure:vg-show 5 --show-pipelines

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId=5
```

**Multiple Pipelines:**

```
✅ Variable group linked to 3 pipelines!

📊 Link Summary:
- Variable Group: #5 - app-config
- Pipelines Linked:
  ✓ #51 - CI Build
  ✓ #52 - CD Deploy
  ✓ #53 - Release

💡 Variable group now available in all 3 pipelines
```

#### 5. Confirmation (Optional)

**With --confirm Flag:**

```bash
/azure:vg-link 5 --pipeline=51 --confirm
```

**Prompts:**
```
⚠️  About to link variable group to pipeline

Variable Group: #5 (app-config)
Pipeline: #51 (CI Build Pipeline)

This will:
✓ Make variables available in pipeline
✓ Allow pipeline to use $(VAR_NAME) syntax
✓ Grant pipeline access to secrets

Continue? (yes/no): yes

✅ Linking in progress...
✅ Linked successfully!
```

#### 6. Error Handling

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| Variable group not found | Invalid VG ID | Check ID: /azure:vg-list |
| Pipeline not found | Invalid pipeline ID | Check ID: az pipelines list |
| Already linked | Idempotent operation | No action needed |
| Insufficient permissions | PAT lacks scope | Grant "Build: Read & Execute" |
| REST API failed | Network/endpoint issue | Verify connectivity |

**Already Linked:**
```
⚠️  Variable group #5 already linked to pipeline #51

Current state:
- Variable group: app-config
- Pipeline: CI Build Pipeline
- Linked: Yes

💡 No action needed
```

**Not Found:**
```
❌ Variable group #999 not found

💡 Troubleshooting:
- List variable groups: /azure:vg-list
- Check ID is correct
- Verify you have access to the project
```

### 7. Verification

**After Linking:**

```bash
# View variable group details
/azure:vg-show 5 --show-pipelines

# Verify in pipeline YAML
# The variable group should appear in pipeline definition
```

**Test in Pipeline:**

```yaml
# azure-pipelines.yml
variables:
- group: app-config  # Now available!

steps:
- script: echo $(API_URL)
```

### 8. Real-World Example

**User's Problem - Solved!**

**Before (Manual UI Work):**
1. Go to Azure DevOps → Pipelines → Library
2. Click variable group
3. Click "Pipeline permissions"
4. Search for pipeline (3 times!)
5. Click "Add" for each pipeline
6. Click "OK"
7. Repeat for each pipeline

**After (Automated):**
```bash
/azure:vg-link 5 --pipeline=51,52,53
✅ Variable group linked to 3 pipelines!

# Done! No UI work needed!
```

### 9. Integration Examples

**Link Single Pipeline:**
```bash
/azure:vg-link 5 --pipeline=51
```

**Link Multiple Pipelines:**
```bash
/azure:vg-link 5 --pipeline=51,52,53,54
```

**Link All Production Pipelines:**
```bash
# Get all prod pipelines, then link
az pipelines list --query "[?contains(folder, 'production')].id" -o tsv | \
  xargs -I {} /azure:vg-link 5 --pipeline={}
```

### 10. Unlinking

**To unlink a variable group:**
```bash
/azure:vg-unlink 5 --pipeline=51
```

## See Also

- `/azure:vg-unlink` - Unlink variable group from pipeline
- `/azure:vg-show` - Show variable group with pipeline links
- `/azure:vg-list` - List all variable groups
- `/azure:pipeline-list` - List all pipelines
