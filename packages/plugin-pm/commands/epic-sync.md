---
allowed-tools: Bash, Read, Write, LS, Task
---

# Epic Sync - Modular Version

Push epic and tasks to GitHub as issues using modular scripts.

## Usage
```
/pm:epic-sync <feature_name>
```

## Quick Start

The simplest way to sync an epic to GitHub:

```bash
# Full automated sync (recommended)
bash .claude/scripts/pm/epic-sync.sh "$ARGUMENTS"
```

This orchestration script automatically runs all 4 steps:
1. Creates epic issue
2. Creates task issues
3. Renames files to issue numbers
4. Updates all references

## Required Documentation Access

**MANDATORY:** Query Context7 for project-management best practices before proceeding. Use the standard PM query set in `.claude/rules/context7-required.md`.


## Quick Check

```bash
# Check for single epic or multi-epic structure
if [ -f ".claude/epics/$ARGUMENTS/epic.md" ]; then
    echo "Single epic mode detected"
    # Count task files
    ls .claude/epics/$ARGUMENTS/*.md 2>/dev/null | grep -v epic.md | wc -l
elif [ -d ".claude/epics/$ARGUMENTS" ] && ls .claude/epics/$ARGUMENTS/*/epic.md 2>/dev/null | head -1; then
    echo "Multi-epic mode detected (from epic-split)"
    # Count task files in all subdirectories
    find .claude/epics/$ARGUMENTS -name "*.md" ! -name "epic.md" ! -name "meta.yaml" | wc -l
else
    echo "❌ Epic not found. Run: /pm:prd-parse $ARGUMENTS or /pm:epic-split $ARGUMENTS"
fi
```

If no tasks found: "❌ No tasks to sync. Run: /pm:epic-decompose $ARGUMENTS"

## Instructions

**⚡ Quick Command:**
```bash
bash .claude/scripts/pm/epic-sync.sh "$ARGUMENTS"
```

The epic sync process is modularized into 4 specialized scripts that handle different aspects of the synchronization. Each script is designed for reliability, testability, and maintainability.

The orchestration script (`.claude/scripts/pm/epic-sync.sh`) automatically runs all 4 steps in sequence. The individual scripts are documented below for reference and debugging.

### Processing Mode Detection

**Single Epic Mode:**
- Process `.claude/epics/$ARGUMENTS/epic.md` and its tasks
- Create one epic issue with all tasks linked

**Multi-Epic Mode (from epic-split):**
- Process each subdirectory separately
- Create separate epic issues for each subdirectory
- Maintain epic dependencies as specified in meta.yaml
- Show progress for each epic being synced

### 1. Repository Protection Check

This is handled automatically by our modular scripts, but you can run the check manually:

```bash
# Check repository protection (built into all scripts)
bash .claude/scripts/lib/github-utils.sh
```

The scripts will automatically:
- ✅ Verify GitHub CLI authentication
- ✅ Check repository protection against template repos
- ✅ Validate epic structure and inputs

### 2. Create Epic Issue

Create the main GitHub issue for the epic:

```bash
# Create epic issue with proper stats and labels
epic_number=$(bash .claude/scripts/pm/epic-sync/create-epic-issue.sh "$ARGUMENTS")

echo "✅ Epic issue created: #$epic_number"
```

This script handles:
- ✅ Frontmatter stripping and content processing
- ✅ Epic type detection (bug vs feature)
- ✅ Statistics calculation (tasks, parallel/sequential breakdown)
- ✅ GitHub issue creation with proper labels
- ✅ Epic vs bug labeling based on content analysis

### 3. Create Task Issues

Create GitHub issues for all tasks with automatic parallel processing:

```bash
# Create task issues (automatically chooses sequential/parallel)
task_mapping_file=$(bash .claude/scripts/pm/epic-sync/create-task-issues.sh "$ARGUMENTS" "$epic_number")

echo "✅ Task issues created. Mapping: $task_mapping_file"
```

This script handles:
- ✅ Automatic strategy selection (sequential < 5 tasks, parallel ≥ 5 tasks)
- ✅ Sub-issues support (if gh-sub-issue extension available)
- ✅ Parallel batch processing for large task sets
- ✅ Proper labeling with `task,epic:$ARGUMENTS`
- ✅ Error handling and partial failure recovery
- ✅ Progress reporting and result consolidation

**Environment Configuration:**
```bash
# Optional: Set custom parallel threshold
export AUTOPM_PARALLEL_THRESHOLD=3  # Default: 5
```

### 4. Update Task References

Update all task dependencies and rename files to use GitHub issue numbers:

```bash
# Update references and rename files
bash .claude/scripts/pm/epic-sync/update-references.sh "$ARGUMENTS" "$task_mapping_file"

echo "✅ Task references updated and files renamed"
```

This script handles:
- ✅ ID mapping generation (001 → real issue numbers)
- ✅ Dependency reference updates (`depends_on`, `conflicts_with`)
- ✅ File renaming (001.md → 123.md)
- ✅ Frontmatter updates with GitHub URLs
- ✅ Timestamp updates
- ✅ Cleanup of old-format files

### 5. Update Epic File

Update the epic.md file with GitHub information and real task IDs:

```bash
# Update epic file with GitHub info and real task IDs
bash .claude/scripts/pm/epic-sync/update-epic-file.sh "$ARGUMENTS" "$epic_number"

echo "✅ Epic file updated with GitHub information"
```

This script handles:
- ✅ Epic frontmatter updates (GitHub URL, timestamp)
- ✅ Tasks Created section replacement with real issue numbers
- ✅ Statistics recalculation
- ✅ GitHub mapping file creation
- ✅ Content structure preservation

### 6. Create Development Branch

Follow `/rules/git-strategy.md` to create development branch:

```bash
# Ensure main is current
git checkout main
git pull origin main

# Create branch for epic
git checkout -b epic/$ARGUMENTS
git push -u origin epic/$ARGUMENTS

echo "✅ Created branch: epic/$ARGUMENTS"
```

## Complete Workflow Examples

### Single Epic Workflow (Automated - Recommended)

The **easiest way** is to use the orchestration script that handles everything:

```bash
# One command does it all!
bash .claude/scripts/pm/epic-sync.sh "$ARGUMENTS"
```

This automatically runs all 4 steps and provides a complete summary.

### Single Epic Workflow (Manual Steps)

If you need to run steps individually for debugging:

```bash
#!/bin/bash
# Complete epic sync using modular scripts (manual)

EPIC_NAME="$ARGUMENTS"

echo "🚀 Starting modular epic sync for: $EPIC_NAME"

# Step 1: Create epic issue
echo "📝 Creating epic issue..."
epic_number=$(bash .claude/scripts/pm/epic-sync/create-epic-issue.sh "$EPIC_NAME")

if [[ -z "$epic_number" ]]; then
    echo "❌ Failed to create epic issue"
    exit 1
fi

echo "✅ Epic issue created: #$epic_number"

# Step 2: Create task issues
echo "📋 Creating task issues..."
task_mapping_file=$(bash .claude/scripts/pm/epic-sync/create-task-issues.sh "$EPIC_NAME" "$epic_number")

if [[ ! -f "$task_mapping_file" ]]; then
    echo "❌ Failed to create task issues"
    exit 1
fi

task_count=$(wc -l < "$task_mapping_file")
echo "✅ Created $task_count task issues"

# Step 3: Update references
echo "🔗 Updating task references..."
bash .claude/scripts/pm/epic-sync/update-references.sh "$EPIC_NAME" "$task_mapping_file"

echo "✅ Task references updated"

# Step 4: Update epic file
echo "📄 Updating epic file..."
bash .claude/scripts/pm/epic-sync/update-epic-file.sh "$EPIC_NAME" "$epic_number"

echo "✅ Epic file updated"

# Step 5: Create branch
echo "🌿 Creating development branch..."
git checkout main
git pull origin main
git checkout -b epic/$EPIC_NAME
git push -u origin epic/$EPIC_NAME

echo "✅ Created branch: epic/$EPIC_NAME"

# Get repository info for final output
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Final output
echo ""
echo "🎉 Epic sync completed successfully!"
echo ""
echo "📊 Summary:"
echo "  Epic: #$epic_number - $EPIC_NAME"
echo "  Tasks: $task_count sub-issues created"
echo "  Branch: epic/$EPIC_NAME"
echo ""
echo "🔗 Links:"
echo "  Epic: https://github.com/$repo/issues/$epic_number"
echo "  Branch: https://github.com/$repo/tree/epic/$EPIC_NAME"
echo ""
echo "📋 Next steps:"
echo "  - Start parallel execution: /pm:epic-start $EPIC_NAME"
echo "  - Or work on single issue: /pm:issue-start <issue_number>"
echo ""
```

### Multi-Epic Workflow (from epic-split)

Here's the workflow for syncing multiple epics created by epic-split:

```bash
#!/bin/bash
# Sync multiple epics from split structure

FEATURE_NAME="$ARGUMENTS"
EPICS_DIR=".claude/epics/$FEATURE_NAME"

echo "🚀 Starting multi-epic sync for: $FEATURE_NAME"

# Find all epic subdirectories
epic_dirs=$(find "$EPICS_DIR" -maxdepth 1 -type d -name "[0-9]*-*" | sort)
epic_count=$(echo "$epic_dirs" | wc -l)

echo "📦 Found $epic_count epics to sync"

# Track all created epic issues
all_epic_numbers=""
total_tasks=0

# Process each epic
for epic_dir in $epic_dirs; do
    epic_name=$(basename "$epic_dir")
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📂 Processing: $epic_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Step 1: Create epic issue
    echo "📝 Creating epic issue..."
    epic_number=$(bash .claude/scripts/pm/epic-sync/create-epic-issue.sh "$FEATURE_NAME/$epic_name")

    if [[ -z "$epic_number" ]]; then
        echo "⚠️  Failed to create epic issue for $epic_name"
        continue
    fi

    all_epic_numbers="$all_epic_numbers $epic_number"
    echo "✅ Epic issue created: #$epic_number"

    # Step 2: Create task issues for this epic
    echo "📋 Creating task issues..."
    task_mapping_file=$(bash .claude/scripts/pm/epic-sync/create-task-issues.sh "$FEATURE_NAME/$epic_name" "$epic_number")

    if [[ -f "$task_mapping_file" ]]; then
        task_count=$(wc -l < "$task_mapping_file")
        total_tasks=$((total_tasks + task_count))
        echo "✅ Created $task_count task issues"

        # Step 3: Update references
        echo "🔗 Updating task references..."
        bash .claude/scripts/pm/epic-sync/update-references.sh "$FEATURE_NAME/$epic_name" "$task_mapping_file"

        # Step 4: Update epic file
        bash .claude/scripts/pm/epic-sync/update-epic-file.sh "$FEATURE_NAME/$epic_name" "$epic_number"
    fi
done

# Create meta-branch for all epics
echo ""
echo "🌿 Creating meta-branch for feature..."
git checkout main
git pull origin main
git checkout -b feature/$FEATURE_NAME
git push -u origin feature/$FEATURE_NAME

# Final summary
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

echo ""
echo "🎉 Multi-epic sync completed!"
echo ""
echo "📊 Summary:"
echo "  Feature: $FEATURE_NAME"
echo "  Epics created: $epic_count"
echo "  Epic issues:$all_epic_numbers"
echo "  Total tasks: $total_tasks"
echo "  Branch: feature/$FEATURE_NAME"
echo ""
echo "🔗 Links:"
for epic_num in $all_epic_numbers; do
    echo "  Epic #$epic_num: https://github.com/$repo/issues/$epic_num"
done
echo "  Branch: https://github.com/$repo/tree/feature/$FEATURE_NAME"
echo ""
echo "📋 Next steps:"
echo "  - Work on P0 epics first (infrastructure, auth backend)"
echo "  - Start specific epic: /pm:issue-start <issue_number>"
echo ""
```

## Benefits of Modular Approach

### ✅ **Reliability**
- Each script handles one specific responsibility
- Comprehensive error handling and validation
- Atomic operations with proper rollback

### ✅ **Performance**
- Automatic parallel processing for large task sets
- Configurable thresholds via environment variables
- Background job management for concurrent operations

### ✅ **Maintainability**
- Modular scripts are easier to test and debug
- Shared libraries ensure consistency
- Clear separation of concerns

### ✅ **Testability**
- Each script can be tested independently
- Mock-friendly interfaces
- TDD-driven development approach

### ✅ **Flexibility**
- Scripts can be used independently
- Easy to extend or modify individual components
- Environment-based configuration

## Error Handling

Each modular script includes comprehensive error handling:

- **Validation**: Input validation before processing
- **Authentication**: GitHub CLI authentication checks
- **Repository Protection**: Automatic template repository detection
- **Partial Failures**: Graceful handling of partial operations
- **Logging**: Detailed logging with configurable levels
- **Cleanup**: Automatic temporary file cleanup

## Configuration Options

### Environment Variables

```bash
# Parallel processing threshold
export AUTOPM_PARALLEL_THRESHOLD=5  # Default: 5

# Logging level (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR)
export AUTOPM_LOG_LEVEL=1  # Default: 1 (INFO)
```

### GitHub Extensions

The scripts automatically detect and use GitHub CLI extensions:

- **gh-sub-issue**: For hierarchical issue management
- Fallback to regular issues if extension not available

## Troubleshooting

### Common Issues

1. **"No tasks to sync"**
   ```bash
   # Generate tasks first
   /pm:epic-decompose $ARGUMENTS
   ```

2. **"GitHub CLI not authenticated"**
   ```bash
   gh auth login
   ```

3. **"Template repository detected"**
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```

4. **Partial task creation failure**
   - Scripts handle partial failures gracefully
   - Check logs for specific task errors
   - Retry individual scripts as needed

### Script Debugging

Enable debug logging for detailed troubleshooting:

```bash
export AUTOPM_LOG_LEVEL=0  # Enable debug logging
bash .claude/scripts/pm/epic-sync/create-epic-issue.sh "$EPIC_NAME"
```

## Migration from Legacy Epic Sync

The modular version is fully backward compatible. To migrate:

1. **No changes required** - existing commands work unchanged
2. **Optional**: Use individual scripts for fine-grained control
3. **Optional**: Configure environment variables for optimization

Legacy workflows continue to work, but benefit from improved reliability and performance.

---

*This modular implementation provides the same functionality as the original epic-sync with improved reliability, testability, and maintainability.*