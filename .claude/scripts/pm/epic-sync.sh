#!/bin/bash
# Epic Sync - Complete Orchestration
# Orchestrates the full epic sync workflow with all 4 modular scripts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPIC_NAME="${1:-}"

if [[ -z "$EPIC_NAME" ]]; then
    echo ""
    echo "❌ Error: Epic name required"
    echo ""
    echo "Usage: $0 <epic_name>"
    echo ""
    echo "Example:"
    echo "  $0 postgresql-connection-module"
    echo ""
    exit 1
fi

EPIC_DIR=".claude/epics/$EPIC_NAME"

# Validate epic exists
if [[ ! -d "$EPIC_DIR" ]]; then
    echo "❌ Error: Epic directory not found: $EPIC_DIR"
    echo ""
    echo "Create an epic first:"
    echo "  /pm:prd-new $EPIC_NAME"
    echo "  /pm:prd-parse $EPIC_NAME"
    echo "  /pm:epic-decompose $EPIC_NAME"
    exit 1
fi

if [[ ! -f "$EPIC_DIR/epic.md" ]]; then
    echo "❌ Error: Epic file not found: $EPIC_DIR/epic.md"
    exit 1
fi

# Check for tasks
task_count=$(find "$EPIC_DIR" -name "[0-9]*.md" -type f 2>/dev/null | wc -l)
if [[ $task_count -eq 0 ]]; then
    echo "❌ Error: No tasks found in $EPIC_DIR"
    echo ""
    echo "Create tasks first:"
    echo "  /pm:epic-decompose $EPIC_NAME"
    exit 1
fi

echo ""
echo "🚀 Starting Epic Sync"
echo "═══════════════════════════════════════════"
echo "  Epic: $EPIC_NAME"
echo "  Tasks: $task_count"
echo "═══════════════════════════════════════════"
echo ""

# Step 1: Create epic issue
echo "📝 Step 1/4: Creating Epic Issue"
echo "─────────────────────────────────────────"

epic_number=$(bash "$SCRIPT_DIR/epic-sync/create-epic-issue.sh" "$EPIC_NAME")

if [[ -z "$epic_number" ]]; then
    echo ""
    echo "❌ Failed to create epic issue"
    exit 1
fi

echo ""
echo "✅ Epic issue created: #$epic_number"
echo ""

# Step 2: Create task issues
echo "📋 Step 2/4: Creating Task Issues"
echo "─────────────────────────────────────────"

task_mapping_file=$(bash "$SCRIPT_DIR/epic-sync/create-task-issues.sh" "$EPIC_NAME" "$epic_number")

if [[ ! -f "$task_mapping_file" ]]; then
    echo ""
    echo "❌ Failed to create task issues or mapping file"
    exit 1
fi

echo ""
echo "✅ Task issues created"
echo "   Mapping: $task_mapping_file"
echo ""

# Step 3: Update references and rename files
echo "🔗 Step 3/4: Updating References & Renaming Files"
echo "─────────────────────────────────────────"

bash "$SCRIPT_DIR/epic-sync/update-references.sh" "$EPIC_NAME" "$task_mapping_file"

echo ""
echo "✅ Files renamed and references updated"
echo ""

# Step 4: Update epic file
echo "📄 Step 4/4: Updating Epic File"
echo "─────────────────────────────────────────"

bash "$SCRIPT_DIR/epic-sync/update-epic-file.sh" "$EPIC_NAME" "$epic_number"

echo ""

# Get repository info for final output
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/repo")

# Final summary
echo ""
echo "✨ Epic Sync Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  Epic: #$epic_number - $EPIC_NAME"
echo "  Tasks: $task_count issues created"
echo "  Files: Renamed to GitHub issue numbers"
echo ""
echo "🔗 Links:"
echo "  Epic:   https://github.com/$REPO/issues/$epic_number"
echo "  Tasks:  View in GitHub project board"
echo ""
echo "📁 Local Files:"
echo "  Epic:    $EPIC_DIR/epic.md"
echo "  Tasks:   $EPIC_DIR/<issue_number>.md"
echo "  Mapping: $EPIC_DIR/.task-mapping.txt"
echo ""
echo "📋 Next Steps:"
echo "  1. Review epic and tasks on GitHub"
echo "  2. Start working on a task:"
echo "     /pm:issue-start <issue_number>"
echo "  3. Or start the full epic in parallel:"
echo "     /pm:epic-start $EPIC_NAME"
echo ""
