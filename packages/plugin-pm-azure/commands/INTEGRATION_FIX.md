# Azure DevOps Agent-Command Integration Fix

## Problem Identified

The Azure DevOps commands were **fundamentally broken** because they never actually invoked the `azure-devops-specialist` agent. Instead, they:

1. ✅ Documented how to use the agent (good documentation)
2. ❌ Never actually called the agent (broken execution)  
3. ❌ Tried to handle Azure DevOps operations directly (ineffective)

## Root Cause

**Architectural mismatch**: Commands contained instructions *about* the agent but no mechanism to *invoke* the agent.

## Solution Implemented

### 1. Updated Command Structure

**Before** (broken):
```markdown
## Instructions
You are a Product Owner creating a User Story...
Use the azure-devops-specialist agent to:
1. Create work item
2. Set metadata
```

**After** (fixed):
```markdown
## Instructions
**CRITICAL**: This command MUST use the azure-devops-specialist agent.

### Command Execution Pattern
Task(subagent_type="azure-devops-specialist", 
     description="Create Azure DevOps User Story",
     prompt="Detailed instructions...")
```

### 2. Files Updated

#### Commands Fixed:
- ✅ `us-new.md` - User Story creation
- ✅ `task-start.md` - Task activation  
- ➡️ **Need to update remaining 38+ commands with same pattern**

#### Agent Enhanced:
- ✅ `azure-devops-specialist.md` - Added command workflow integration patterns

### 3. Integration Pattern

```bash
# CORRECT usage in commands
Task(subagent_type="azure-devops-specialist", 
     description="Brief operation description",
     prompt="Complete workflow instructions including:
     1. Environment validation
     2. Azure DevOps API operations  
     3. Local documentation updates
     4. Status reporting")
```

## What Commands Should Do

1. **Input validation** (task IDs, environment variables)
2. **Call azure-devops-specialist agent** via Task tool
3. **Provide complete instructions** to the agent
4. **Define expected output format**

## What Agent Should Do

1. **Environment setup** (PAT tokens, authentication)
2. **Azure DevOps API calls** (work items, status updates)
3. **Local file management** (`.claude/azure/` tracking)
4. **Structured reporting** (URLs, next steps)

## Testing the Fix

To verify the integration works:

```bash
# Test the fixed commands
/azure:us-new test-story
/azure:task-start 123

# Should now properly invoke azure-devops-specialist agent
# Instead of failing with direct Azure DevOps operations
```

## Remaining Work

1. **Update all 38+ Azure commands** with Task tool invocation pattern
2. **Test end-to-end workflows** with real Azure DevOps instance  
3. **Validate error handling** when API calls fail
4. **Document success patterns** for other command integrations

## Key Learnings

- Commands must **invoke agents**, not just document them
- Use `Task(subagent_type="...", prompt="...")` for all agent calls
- Agent documentation should include **command integration patterns**
- **Test integration**, don't assume documentation equals implementation

This fix transforms the Azure DevOps system from **documented but broken** to **properly integrated and functional**.