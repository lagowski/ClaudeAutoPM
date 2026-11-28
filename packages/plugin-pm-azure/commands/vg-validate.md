---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Variable Group Validate

Validate variable group configuration and check for issues.

**Usage**: `/azure:vg-validate <variable-group-id> [--detailed]`

**Examples**:
- `/azure:vg-validate 5` - Basic validation
- `/azure:vg-validate 5 --detailed` - Detailed validation

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: azure-devops.

## Instructions

Use azure-devops-specialist agent for all operations.

### Agent Workflow

1. Fetch variable group details
2. Validate variable names (format, conflicts)
3. Check for issues:
   - Duplicate variables
   - Invalid variable names
   - Missing required variables
   - Secret rotation needed
   - Pipeline link issues
4. Display validation report

### Validation Checks

**Variable Names:**
- ✓ Valid characters (alphanumeric, underscore)
- ✓ No spaces
- ✓ Not a reserved name
- ✓ Case-sensitive uniqueness

**Variable Values:**
- ✓ Plain variables not empty
- ✓ Secret variables have values
- ✓ No circular references
- ✓ Valid YAML/JSON in values

**Security:**
- ✓ Secrets not expired
- ✓ Secrets rotated recently
- ✓ No hardcoded secrets in plain vars
- ✓ Proper key length

**Pipeline Integration:**
- ✓ Linked pipelines exist
- ✓ No broken references
- ✓ Variables accessible in pipelines

### Success Output (All Valid)

```
✅ Variable group #5 validation: PASSED

📋 Validation Summary:
- Variable Names: ✓ Valid
- Variable Values: ✓ Valid
- Security: ✓ No issues
- Pipeline Links: ✓ 3 links active

📊 Details:
- Total variables: 5
- Plain variables: 3
- Secret variables: 2
- Linked pipelines: 3

💡 All checks passed!
```

### Warning Output

```
⚠️  Variable group #5 validation: WARNINGS

📋 Validation Summary:
- Variable Names: ✓ Valid
- Variable Values: ⚠️ 2 warnings
- Security: ⚠️ 1 warning
- Pipeline Links: ✓ Valid

⚠️  Warnings:
1. Variable API_KEY not rotated in 90 days
2. Variable DB_PASSWORD uses weak pattern
3. Plain variable contains "password" in value

💡 Recommendations:
- Rotate stale secrets
- Use stronger passwords
- Move sensitive values to secrets

🔗 Azure DevOps:
https://dev.azure.com/{org}/{project}/_library?variableGroupId=5
```

### Error Output

```
❌ Variable group #5 validation: FAILED

❌ Errors found:
1. Duplicate variable: API_URL (defined twice)
2. Invalid variable name: 123STARTS (cannot start with number)
3. Circular reference: VAR1 → VAR2 → VAR1
4. Broken pipeline link: Pipeline #99 not found

💡 Fix these issues:
- Remove duplicate variables
- Rename invalid variables
- Fix circular references
- Unlink broken pipelines: /azure:vg-unlink 5 --pipeline=99
```

### Detailed Validation

```bash
/azure:vg-validate 5 --detailed
```

Shows:
- All variable names and values
- Security analysis
- Pipeline link status
- Recommendations

### Error Handling

| Error | Solution |
|-------|----------|
| VG not found | Check ID: /azure:vg-list |
| Cannot fetch details | Check permissions |
| Validation timeout | Retry with --detailed flag |

## See Also

- `/azure:vg-show` - View variable group
- `/azure:vg-update` - Fix issues found
- `/azure:vg-export` - Export before changes
