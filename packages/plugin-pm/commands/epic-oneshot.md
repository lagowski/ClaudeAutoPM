---
allowed-tools: Read, LS
---

# Epic Oneshot

Decompose epic into tasks and sync to GitHub in one operation.

## Usage
```
/pm:epic-oneshot <feature_name>
```

## ⚠️ TDD REMINDER

**CRITICAL: All tasks generated will include TDD requirements.**

This command will create tasks that REQUIRE Test-Driven Development:
- Each task includes TDD Requirements section
- Definition of Done starts with "Tests written FIRST"
- All agents must follow RED-GREEN-REFACTOR cycle

See `.claude/rules/tdd.enforcement.md` for complete requirements.

---

## Required Documentation Access

**MANDATORY:** Query Context7 for project-management best practices before proceeding. Use the standard PM query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Validate Prerequisites

```bash
# Check if PRD exists
if [ ! -f ".claude/prds/$ARGUMENTS.md" ]; then
  echo "❌ PRD not found: $ARGUMENTS.md"
  echo "💡 Create it first with: /pm:prd-new $ARGUMENTS"
  exit 1
fi

echo "✅ PRD found"

# Check if epic already exists
if [ -f ".claude/epics/$ARGUMENTS/epic.md" ]; then
  echo "⚠️ Epic already exists: $ARGUMENTS"
  echo "💡 View it with: /pm:epic-show $ARGUMENTS"
  echo "💡 Or use a different name"
  exit 1
fi

echo "✅ Ready to create epic"
```

### 2. Execute Epic Oneshot Script

Run the all-in-one script that handles:
- PRD parsing
- Task decomposition
- GitHub/Azure sync

```bash
node .claude/scripts/pm/epic-oneshot.cjs $ARGUMENTS
```

### 3. Verify Success

```bash
# Check epic was created
if [ -f ".claude/epics/$ARGUMENTS/epic.md" ]; then
  echo ""
  echo "✅ Epic Oneshot Complete!"
  echo ""
  echo "📋 Next steps:"
  echo "  • View epic: /pm:epic-show $ARGUMENTS"
  echo "  • Start work: /pm:epic-start $ARGUMENTS"
  echo "  • Get next task: /pm:next"
  echo ""
else
  echo "❌ Epic creation failed. Check output above for errors."
  exit 1
fi
```

## What It Does

This command executes a complete workflow in one operation:

**Step 1: Parse PRD**
- Reads `.claude/prds/$ARGUMENTS.md`
- Extracts features, requirements, technical details
- Creates epic structure

**Step 2: Decompose Tasks**
- Analyzes epic content
- Generates implementation tasks
- Adds tasks to epic.md

**Step 3: Sync to Provider**
- Creates epic issue on GitHub/Azure
- Creates sub-issues for each task
- Links everything together

## Output Structure

After successful execution:

```
.claude/
  epics/
    <feature-name>/
      epic.md              # Main epic with embedded tasks
      metadata.json        # Epic metadata
      tasks/               # Individual task files (if created)
```

## Example Usage

```bash
# Complete workflow in one command
/pm:epic-oneshot gym-trading-env

# What happens:
# 1. Parses .claude/prds/gym-trading-env.md
# 2. Creates .claude/epics/gym-trading-env/epic.md
# 3. Generates implementation tasks
# 4. Syncs to GitHub/Azure DevOps
# 5. Ready to start work!
```

## Important Notes

**Advantages of Oneshot:**
- ✅ Fastest way from PRD to implementation
- ✅ No manual intervention needed
- ✅ Automatic task generation
- ✅ Immediate GitHub sync

**When NOT to use:**
- ❌ Complex PRDs needing manual review between steps
- ❌ Custom task decomposition required
- ❌ Learning the PM workflow (use step-by-step instead)

**Alternative: Step-by-Step**
```bash
# If you prefer manual control:
/pm:prd-parse <feature>       # Step 1: Create epic
/pm:epic-decompose <feature>  # Step 2: Add tasks (if available)
/pm:epic-sync <feature>       # Step 3: Sync to provider
```