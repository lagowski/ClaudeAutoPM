#!/bin/bash
# Update Task References
# Renames task files to GitHub issue numbers and updates frontmatter

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPIC_NAME="${1:-}"
MAPPING_FILE="${2:-}"

if [[ -z "$EPIC_NAME" ]] || [[ -z "$MAPPING_FILE" ]]; then
    echo "❌ Error: Epic name and mapping file required"
    echo "Usage: $0 <epic_name> <mapping_file>"
    exit 1
fi

if [[ ! -f "$MAPPING_FILE" ]]; then
    echo "❌ Error: Mapping file not found: $MAPPING_FILE"
    exit 1
fi

EPIC_DIR=".claude/epics/$EPIC_NAME"

if [[ ! -d "$EPIC_DIR" ]]; then
    echo "❌ Error: Epic directory not found: $EPIC_DIR"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown/repo")

echo "🔗 Updating task references and renaming files"

# First pass: Rename files and update frontmatter
while read -r old_name new_number; do
    old_file="$EPIC_DIR/$old_name.md"
    new_file="$EPIC_DIR/$new_number.md"

    if [[ ! -f "$old_file" ]]; then
        echo "⚠️  File not found: $old_file (skipping)"
        continue
    fi

    echo -n "   Renaming $old_name.md → $new_number.md... "

    # Create backup
    cp "$old_file" "$old_file.backup"

    # Update frontmatter with GitHub URL and timestamp
    github_url="https://github.com/$REPO/issues/$new_number"
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Update frontmatter
    awk -v url="$github_url" -v ts="$timestamp" '
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
    ' "$old_file" > "$new_file"

    # Remove old file if new file was created successfully
    if [[ -f "$new_file" ]]; then
        rm "$old_file"
        rm "$old_file.backup"
        echo "✓"
    else
        # Restore from backup if something went wrong
        mv "$old_file.backup" "$old_file"
        echo "FAILED"
    fi

done < "$MAPPING_FILE"

# Second pass: Update cross-references within renamed files
echo ""
echo "   Updating cross-references within task files..."

# Read all renamed files
find "$EPIC_DIR" -name "[0-9]*.md" -type f | while read -r task_file; do
    # Create temp file for updates
    cp "$task_file" "$task_file.tmp"

    # Update all task references using the mapping
    while read -r old_name new_number; do
        # Update patterns like "task 001", "Task 001", "#001", "issue 001"
        sed "s/\btask $old_name\b/task #$new_number/gi" "$task_file.tmp" > "$task_file.tmp2"
        mv "$task_file.tmp2" "$task_file.tmp"

        sed "s/#$old_name\b/#$new_number/g" "$task_file.tmp" > "$task_file.tmp2"
        mv "$task_file.tmp2" "$task_file.tmp"

        sed "s/\bissue $old_name\b/issue #$new_number/gi" "$task_file.tmp" > "$task_file.tmp2"
        mv "$task_file.tmp2" "$task_file.tmp"

        # Update dependency format: "depends on 001" -> "depends on #46"
        sed "s/depends on $old_name\b/depends on #$new_number/gi" "$task_file.tmp" > "$task_file.tmp2"
        mv "$task_file.tmp2" "$task_file.tmp"
    done < "$MAPPING_FILE"

    # Replace original with updated version
    mv "$task_file.tmp" "$task_file"
done

echo ""
echo "✅ Task files renamed and frontmatter updated"
