---
allowed-tools: Bash, Read, Write, LS, Task
---

# Epic Start

Launch parallel agents to work on epic tasks using the unified branch strategy.

## Usage
```
/pm:epic-start <epic_name>
```

## Required Documentation Access

**MANDATORY:** Query Context7 for project-management best practices before proceeding. Use the standard PM query set in `.claude/rules/context7-required.md`.


## Quick Check

1. **Verify epic exists:**
   ```bash
   test -f .claude/epics/$ARGUMENTS/epic.md || echo "❌ Epic not found. Run: /pm:prd-parse $ARGUMENTS"
   ```

2. **Check GitHub sync:**
   Look for `github:` field in epic frontmatter.
   If missing: "❌ Epic not synced. Run: /pm:epic-sync $ARGUMENTS first"

3. **Check for branch:**
   ```bash
   git branch -a | grep "epic/$ARGUMENTS"
   ```

4. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```
   If output is not empty: "❌ You have uncommitted changes. Please commit or stash them before starting an epic"

## ⚠️ TDD REMINDER - READ THIS FIRST

**CRITICAL: This project follows Test-Driven Development (TDD).**

Before ANY coding work begins on this epic, you MUST follow the RED → GREEN → REFACTOR cycle (see `.claude/rules/tdd-reminder.md`).

**For this epic:**
- All tasks have TDD requirements section
- Every agent must start with test creation
- No implementation without tests first

See `.claude/rules/tdd.enforcement.md` for complete TDD requirements.

---

## Instructions

### 1. Create or Enter Branch

Follow the unified Git strategy in `/rules/git-strategy.md`:

```bash
# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ You have uncommitted changes. Please commit or stash them before starting an epic."
  exit 1
fi

# If branch doesn't exist, create it
if ! git branch -a | grep -q "epic/$ARGUMENTS"; then
  git checkout main
  git pull origin main
  git checkout -b epic/$ARGUMENTS
  git push -u origin epic/$ARGUMENTS
  echo "✅ Created branch: epic/$ARGUMENTS"
else
  # Branch exists, check it out
  git checkout epic/$ARGUMENTS
  git pull origin epic/$ARGUMENTS
  echo "✅ Using existing branch: epic/$ARGUMENTS"
fi
```

### 2. Identify Ready Issues

Read all task files in `.claude/epics/$ARGUMENTS/`:
- Look for tasks with `status: ready` or `status: in_progress`
- Group by dependencies

### 3. Launch Parallel Agents

For each ready issue without dependencies:

```bash
# Example parallel launch
/agent python-backend-engineer "Work on issue #1234 from epic $ARGUMENTS"
/agent react-frontend-engineer "Work on issue #1235 from epic $ARGUMENTS"
```

### 4. Monitor Progress

```bash
# Check branch status
git log --oneline -10

# Check CI status
gh pr checks

# View agent progress
tail -f .claude/epics/$ARGUMENTS/progress.md
```

## Parallel Execution Rules

1. **File Coordination**: Agents working on different files can commit simultaneously
2. **Pull Before Push**: Always `git pull` before pushing changes
3. **Conflict Resolution**: Human intervention required for merge conflicts
4. **Commit Frequently**: Small, focused commits reduce conflict risk

## Example Workflow

```bash
# 1. Start epic
/pm:epic-start authentication

# 2. Agents work in parallel
# Agent A: Backend API
# Agent B: Frontend UI
# Agent C: Database schema

# 3. Monitor progress
/pm:epic-status authentication

# 4. When complete
/pm:epic-merge authentication
```

## Branch Management

The epic branch (`epic/$ARGUMENTS`) will be:
- Created if it doesn't exist
- Checked out if it exists
- Pulled to get latest changes
- Ready for parallel agent work

## Important Notes

⚠️ **NO WORKTREES**: This command uses the standard branch strategy. Git worktrees are not supported.

⚠️ **COMMIT BEFORE SWITCHING**: Always commit or stash changes before starting a new epic.

⚠️ **PULL FREQUENTLY**: Agents should pull changes regularly to avoid conflicts.

## Troubleshooting

### "You have uncommitted changes"
```bash
# Option 1: Commit changes
git add -A && git commit -m "WIP: Save work before epic start"

# Option 2: Stash changes
git stash save "WIP before starting epic"
```

### "Branch already exists"
```bash
# Use existing branch
git checkout epic/$ARGUMENTS
git pull origin epic/$ARGUMENTS
```

### "Merge conflicts"
```bash
# Resolve conflicts manually
git status  # See conflicted files
# Edit files to resolve
git add {resolved-files}
git commit -m "resolve: Merge conflicts"
```