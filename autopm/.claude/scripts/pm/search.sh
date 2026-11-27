#!/bin/bash

# PM Search Script - Wrapper for Node.js implementation
# This wrapper maintains backward compatibility while delegating to the Node.js version

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Node.js is available
if command -v node >/dev/null 2>&1; then
  # Use the Node.js implementation
  node "$SCRIPT_DIR/search.js" "$@"
  exit $?
else
  # Fallback to the original bash implementation if Node.js is not available
  echo "⚠️ Node.js not found, falling back to bash implementation"
  echo ""

  # Original bash implementation (preserved for fallback)
  query="$1"

  if [ -z "$query" ]; then
    echo "❌ Please provide a search query"
    echo "Usage: /pm:search <query>"
    exit 1
  fi

  echo "Searching for '$query'..."
  echo ""
  echo ""

  echo "🔍 Search results for: '$query'"
  echo "================================"
  echo ""

  # Search in PRDs
  if [ -d ".claude/prds" ]; then
    echo "📄 PRDs:"
    results=$(grep -l -i "$query" .claude/prds/*.md 2>/dev/null)
    if [ -n "$results" ]; then
      for file in $results; do
        name=$(basename "$file" .md)
        matches=$(grep -c -i "$query" "$file")
        echo "  • $name ($matches matches)"
      done
    else
      echo "  No matches"
    fi
    echo ""
  fi

  # Search in Epics
  if [ -d ".claude/epics" ]; then
    echo "📚 Epics:"
    results=$(find .claude/epics -name "epic.md" -exec grep -l -i "$query" {} \; 2>/dev/null)
    if [ -n "$results" ]; then
      for file in $results; do
        epic_name=$(basename $(dirname "$file"))
        matches=$(grep -c -i "$query" "$file")
        echo "  • $epic_name ($matches matches)"
      done
    else
      echo "  No matches"
    fi
    echo ""
  fi

  # Search in Tasks
  if [ -d ".claude/epics" ]; then
    echo "📝 Tasks:"
    results=$(find .claude/epics -name "[0-9]*.md" -exec grep -l -i "$query" {} \; 2>/dev/null | head -10)
    if [ -n "$results" ]; then
      for file in $results; do
        epic_name=$(basename $(dirname "$file"))
        task_num=$(basename "$file" .md)
        echo "  • Task #$task_num in $epic_name"
      done
    else
      echo "  No matches"
    fi
  fi

  # Summary
  total=$(find .claude -name "*.md" -exec grep -l -i "$query" {} \; 2>/dev/null | wc -l)
  echo ""
  echo "📊 Total files with matches: $total"

  exit 0
fi
