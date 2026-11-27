#!/bin/bash

# PM Next Script - Wrapper for Node.js implementation
# This wrapper maintains backward compatibility while delegating to the Node.js version

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Node.js is available
if command -v node >/dev/null 2>&1; then
  # Use the Node.js implementation
  node "$SCRIPT_DIR/next.js"
  exit $?
else
  # Fallback to the original bash implementation if Node.js is not available
  echo "⚠️ Node.js not found, falling back to bash implementation"
  echo ""

  # Original bash implementation (preserved for fallback)
  echo "Getting status..."
  echo ""
  echo ""

  echo "📋 Next Available Tasks"
  echo "======================="
  echo ""

  # Find tasks that are open and have no dependencies or whose dependencies are closed
  found=0

  for epic_dir in .claude/epics/*/; do
    [ -d "$epic_dir" ] || continue
    epic_name=$(basename "$epic_dir")

    for task_file in "$epic_dir"[0-9]*.md; do
      [ -f "$task_file" ] || continue

      # Check if task is open
      status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
      [ "$status" != "open" ] && [ -n "$status" ] && continue

      # Check dependencies
      deps=$(grep "^depends_on:" "$task_file" | head -1 | sed 's/^depends_on: *\[//' | sed 's/\]//')

      # If no dependencies or empty, task is available
      if [ -z "$deps" ] || [ "$deps" = "depends_on:" ]; then
        task_name=$(grep "^name:" "$task_file" | head -1 | sed 's/^name: *//')
        task_num=$(basename "$task_file" .md)
        parallel=$(grep "^parallel:" "$task_file" | head -1 | sed 's/^parallel: *//')

        echo "✅ Ready: #$task_num - $task_name"
        echo "   Epic: $epic_name"
        [ "$parallel" = "true" ] && echo "   🔄 Can run in parallel"
        echo ""
        ((found++))
      fi
    done
  done

  if [ $found -eq 0 ]; then
    echo "No available tasks found."
    echo ""
    echo "💡 Suggestions:"
    echo "  • Check blocked tasks: /pm:blocked"
    echo "  • View all tasks: /pm:epic-list"
  fi

  echo ""
  echo "📊 Summary: $found tasks ready to start"

  exit 0
fi
