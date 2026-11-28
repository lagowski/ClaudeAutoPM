#!/bin/bash
# Epic Start - Launch parallel agent execution for an epic

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(dirname "$SCRIPT_DIR")"
BASE_DIR="$(dirname "$(dirname "$SCRIPTS_DIR")")"

# Source common functions
source "$SCRIPTS_DIR/lib/common-functions.sh" 2>/dev/null || true

# Epic name from argument
EPIC_NAME="${1:-}"

if [ -z "$EPIC_NAME" ]; then
    echo "❌ Error: Epic name required"
    echo "Usage: /pm:epic-start <epic-name>"
    exit 1
fi

# Find epic file
EPIC_FILE=".claude/epics/${EPIC_NAME}.md"
if [ ! -f "$EPIC_FILE" ]; then
    EPIC_FILE=".claude/prds/${EPIC_NAME}.md"
    if [ ! -f "$EPIC_FILE" ]; then
        echo "❌ Error: Epic not found: ${EPIC_NAME}"
        echo "Available epics:"
        ls .claude/epics/*.md .claude/prds/*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//' | sed 's/^/  - /'
        exit 1
    fi
fi

echo "🚀 Starting parallel execution for epic: ${EPIC_NAME}"
echo "📄 Epic file: ${EPIC_FILE}"
echo ""

# Extract tasks from epic file
echo "📋 Extracting tasks from epic..."
TASKS=$(grep -E "^- \[ \]|^- \[x\]" "$EPIC_FILE" 2>/dev/null || true)

if [ -z "$TASKS" ]; then
    echo "⚠️  No tasks found in epic file"
    echo "Tip: Add tasks in format: - [ ] Task description"
    exit 1
fi

# Count tasks
TOTAL_TASKS=$(echo "$TASKS" | wc -l | tr -d ' ')
INCOMPLETE_TASKS=$(echo "$TASKS" | grep "^- \[ \]" | wc -l | tr -d ' ')
COMPLETE_TASKS=$(echo "$TASKS" | grep "^- \[x\]" | wc -l | tr -d ' ')

echo "📊 Task Status:"
echo "  • Total: $TOTAL_TASKS"
echo "  • Complete: $COMPLETE_TASKS"
echo "  • Remaining: $INCOMPLETE_TASKS"
echo ""

if [ "$INCOMPLETE_TASKS" -eq 0 ]; then
    echo "✅ All tasks are already complete!"
    exit 0
fi

# Start parallel execution
echo "🔄 Starting parallel execution for $INCOMPLETE_TASKS tasks..."
echo ""

# Check if parallel streams script exists
PARALLEL_SCRIPT="$SCRIPTS_DIR/start-parallel-streams.js"
if [ -f "$PARALLEL_SCRIPT" ]; then
    echo "Using Node.js parallel executor..."
    node "$PARALLEL_SCRIPT" --epic "$EPIC_NAME"
else
    # Fallback to basic parallel execution
    echo "Starting tasks in parallel..."

    # Process each incomplete task
    echo "$TASKS" | grep "^- \[ \]" | while IFS= read -r task; do
        # Extract task description
        TASK_DESC=$(echo "$task" | sed 's/^- \[ \] //')
        echo "  ▶ Starting: $TASK_DESC"

        # You can add actual task execution logic here
        # For example, launching agents or running specific scripts
    done

    echo ""
    echo "✅ Parallel execution initiated"
fi

echo ""
echo "💡 Monitor progress with: /pm:epic-status $EPIC_NAME"
echo "📝 View details with: /pm:epic-show $EPIC_NAME"