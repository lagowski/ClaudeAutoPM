#!/bin/bash
# Update Epic File
# Updates epic.md with GitHub URL and real task issue numbers

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPIC_NAME="${1:-}"
EPIC_NUMBER="${2:-}"

if [[ -z "$EPIC_NAME" ]] || [[ -z "$EPIC_NUMBER" ]]; then
    echo "❌ Error: Epic name and epic number required"
    echo "Usage: $0 <epic_name> <epic_number>"
    exit 1
fi

EPIC_DIR=".claude/epics/$EPIC_NAME"
EPIC_FILE="$EPIC_DIR/epic.md"
MAPPING_FILE="$EPIC_DIR/.task-mapping.txt"

if [[ ! -f "$EPIC_FILE" ]]; then
    echo "❌ Error: Epic file not found: $EPIC_FILE"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/repo")
EPIC_URL="https://github.com/$REPO/issues/$EPIC_NUMBER"

echo "📄 Updating epic file: $EPIC_FILE"

# Create backup
cp "$EPIC_FILE" "$EPIC_FILE.backup"

# Update frontmatter
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

awk -v url="$EPIC_URL" -v ts="$timestamp" '
BEGIN { in_front=0; front_done=0 }
/^---$/ {
    if (!front_done) {
        in_front = !in_front
        if (!in_front) front_done=1
    }
    print
    next
}
in_front && /^github:/ {
    print "github: " url
    next
}
in_front && /^updated:/ {
    print "updated: " ts
    next
}
{ print }
' "$EPIC_FILE.backup" > "$EPIC_FILE.tmp"

# If mapping file exists, update task references in the body
if [[ -f "$MAPPING_FILE" ]]; then
    echo "   Updating task references with real issue numbers..."

    # Read mapping and update task references
    while read -r old_name new_number; do
        # Cross-platform sed: create temp file instead of in-place
        # Update checkbox items like "- [ ] 001" to "- [ ] #2"
        sed "s/- \[ \] $old_name\b/- [ ] #$new_number/g" "$EPIC_FILE.tmp" > "$EPIC_FILE.tmp2"
        mv "$EPIC_FILE.tmp2" "$EPIC_FILE.tmp"

        sed "s/- \[x\] $old_name\b/- [x] #$new_number/g" "$EPIC_FILE.tmp" > "$EPIC_FILE.tmp2"
        mv "$EPIC_FILE.tmp2" "$EPIC_FILE.tmp"

        # Update task links
        sed "s/Task $old_name\b/Task #$new_number/g" "$EPIC_FILE.tmp" > "$EPIC_FILE.tmp2"
        mv "$EPIC_FILE.tmp2" "$EPIC_FILE.tmp"
    done < "$MAPPING_FILE"
fi

# Finalize
mv "$EPIC_FILE.tmp" "$EPIC_FILE"
rm "$EPIC_FILE.backup"

echo "✅ Epic file updated"
echo "   GitHub: $EPIC_URL"
