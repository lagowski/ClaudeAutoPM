#!/bin/bash

# PM Status Script - Wrapper for Node.js implementation
# This wrapper maintains backward compatibility while delegating to the Node.js version

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Node.js is available
if command -v node >/dev/null 2>&1; then
  # Use the Node.js implementation
  node "$SCRIPT_DIR/status.js"
  exit $?
else
  # Fallback to the original bash implementation if Node.js is not available
  echo "⚠️ Node.js not found, falling back to bash implementation"
  echo ""

  # Original bash implementation (preserved for fallback)
  echo "Getting status..."
  echo ""
  echo ""

  echo "📊 Project Status"
  echo "================"
  echo ""

  echo "📄 PRDs:"
  if [ -d ".claude/prds" ]; then
    total=$(ls .claude/prds/*.md 2>/dev/null | wc -l)
    echo "  Total:        $total"
  else
    echo "  No PRDs found"
  fi

  echo ""
  echo "📚 Epics:"
  if [ -d ".claude/epics" ]; then
    total=$(ls -d .claude/epics/*/ 2>/dev/null | wc -l)
    echo "  Total:        $total"
  else
    echo "  No epics found"
  fi

  echo ""
  echo "📝 Tasks:"
  if [ -d ".claude/epics" ]; then
    total=$(find .claude/epics -name "[0-9]*.md" 2>/dev/null | wc -l)
    open=$(find .claude/epics -name "[0-9]*.md" -exec grep -l "^status: *open" {} \; 2>/dev/null | wc -l)
    closed=$(find .claude/epics -name "[0-9]*.md" -exec grep -l "^status: *closed" {} \; 2>/dev/null | wc -l)
    echo "  Open:        $open"
    echo "  Closed:        $closed"
    echo "  Total:        $total"
  else
    echo "  No tasks found"
  fi

  exit 0
fi
