# Epic Sync Modular Scripts

This directory contains the modular implementation of the epic-sync workflow that pushes epics and tasks to GitHub as issues.

## Architecture

The epic-sync process is split into 4 specialized scripts:

1. **create-epic-issue.sh** - Creates the main epic GitHub issue
2. **create-task-issues.sh** - Creates GitHub issues for all tasks
3. **update-references.sh** - Renames task files to match GitHub issue numbers
4. **update-epic-file.sh** - Updates epic.md with real issue numbers

## Orchestration

The **recommended way** to use these scripts is via the orchestration script:

```bash
# From project root
bash .claude/scripts/pm/epic-sync.sh <epic_name>
```

This automatically runs all 4 steps in the correct order.

## Individual Scripts

### 1. create-epic-issue.sh

**Purpose:** Creates the main GitHub issue for the epic

**Input:**
- Epic name (e.g., `postgresql-connection-module`)

**Output:**
- GitHub issue number (stdout)

**What it does:**
- Strips frontmatter from epic.md
- Counts tasks in epic directory
- Detects epic type (bug vs feature)
- Creates GitHub issue with proper labels
- Returns epic issue number

**Usage:**
```bash
epic_number=$(bash .claude/scripts/pm/epic-sync/create-epic-issue.sh "my-feature")
echo "Epic created: #$epic_number"
```

### 2. create-task-issues.sh

**Purpose:** Creates GitHub issues for all task files

**Input:**
- Epic name
- Epic issue number (from step 1)

**Output:**
- Path to task mapping file (stdout)

**What it does:**
- Finds all `[0-9]*.md` files in epic directory
- Strips frontmatter from each task
- Creates GitHub issue for each task
- Labels with `task,epic:<epic_name>`
- Saves mapping of old_name -> issue_number to `.task-mapping.txt`
- **Mapping file is saved in epic directory** (persistent, not in /tmp)

**Usage:**
```bash
mapping=$(bash .claude/scripts/pm/epic-sync/create-task-issues.sh "my-feature" "42")
echo "Mapping saved: $mapping"
```

**Important:** The mapping file is saved as `.claude/epics/<epic>/.task-mapping.txt` for use in subsequent steps.

### 3. update-references.sh

**Purpose:** Renames task files to GitHub issue numbers and updates frontmatter

**Input:**
- Epic name
- Path to task mapping file (from step 2)

**Output:**
- None (modifies files in place)

**What it does:**
- Reads `.task-mapping.txt` file
- For each mapping (e.g., `001 -> 2`):
  - Renames `001.md` to `2.md`
  - Updates frontmatter with GitHub URL
  - Updates frontmatter timestamp
- Creates backups during rename (removed on success)

**Usage:**
```bash
bash .claude/scripts/pm/epic-sync/update-references.sh "my-feature" ".claude/epics/my-feature/.task-mapping.txt"
```

**Before:**
```
.claude/epics/my-feature/
├── 001.md (github: [Will be updated...])
├── 002.md (github: [Will be updated...])
```

**After:**
```
.claude/epics/my-feature/
├── 2.md (github: https://github.com/user/repo/issues/2)
├── 3.md (github: https://github.com/user/repo/issues/3)
```

### 4. update-epic-file.sh

**Purpose:** Updates epic.md with GitHub URL and real task references

**Input:**
- Epic name
- Epic issue number

**Output:**
- None (modifies epic.md in place)

**What it does:**
- Updates epic.md frontmatter with GitHub URL
- Updates timestamp
- Reads `.task-mapping.txt`
- Replaces task references (e.g., `- [ ] 001` → `- [ ] #2`)
- Creates backup during update (removed on success)

**Usage:**
```bash
bash .claude/scripts/pm/epic-sync/update-epic-file.sh "my-feature" "42"
```

## File Persistence Fix

**IMPORTANT:** The task mapping file is saved to a **persistent location**:

```
.claude/epics/<epic_name>/.task-mapping.txt
```

This fixes the bug where the mapping file was being saved to `/tmp` and deleted before subsequent scripts could use it.

## Error Handling

All scripts use `set -euo pipefail` for robust error handling:
- `-e`: Exit on error
- `-u`: Error on undefined variables
- `-o pipefail`: Fail if any command in pipeline fails

## Testing

Test individual scripts:

```bash
# Create a test epic first
mkdir -p .claude/epics/test-epic
echo "---\ntitle: Test\n---\n# Test Epic" > .claude/epics/test-epic/epic.md
echo "---\ntitle: Task 1\n---\n# Task 1" > .claude/epics/test-epic/001.md
echo "---\ntitle: Task 2\n---\n# Task 2" > .claude/epics/test-epic/002.md

# Run orchestration script
bash .claude/scripts/pm/epic-sync.sh test-epic

# Verify files were renamed
ls .claude/epics/test-epic/
# Should show: epic.md, <issue_number>.md files
```

## Dependencies

- **bash** >= 4.0
- **gh** (GitHub CLI) - authenticated
- **awk** - for frontmatter processing
- **find** - for file discovery
- **grep** - for pattern matching

## Common Issues

### "Template repository detected"
```bash
# Fix: Set correct remote
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### "GitHub CLI not authenticated"
```bash
gh auth login
```

### "Mapping file not found"
- Ensure step 2 completed successfully
- Check `.claude/epics/<epic>/.task-mapping.txt` exists

### "Task files still numbered 001, 002..."
- Step 3 (update-references.sh) may not have run
- Check for errors in step 2 output
- Run orchestration script instead of individual scripts

## Related Files

- **/.claude/commands/pm/epic-sync.md** - Command documentation
- **/.claude/commands/pm/issue-start.md** - Works with renamed files
- **/.claude/commands/pm/issue-analyze.md** - Expects GitHub issue numbers
