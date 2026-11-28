#!/bin/bash
# Create Task Issues
# Creates GitHub issues for all tasks and generates mapping file

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPIC_NAME="${1:-}"
EPIC_NUMBER="${2:-}"

if [[ -z "$EPIC_NAME" ]] || [[ -z "$EPIC_NUMBER" ]]; then
    echo "❌ Error: Epic name and epic number required" >&2
    echo "Usage: $0 <epic_name> <epic_number>" >&2
    exit 1
fi

EPIC_DIR=".claude/epics/$EPIC_NAME"

if [[ ! -d "$EPIC_DIR" ]]; then
    echo "❌ Error: Epic directory not found: $EPIC_DIR" >&2
    exit 1
fi

# Mapping file - PERSISTENT location (not in /tmp)
MAPPING_FILE="$EPIC_DIR/.task-mapping.txt"
> "$MAPPING_FILE"  # Clear/create file

echo "📋 Creating task issues for epic #$EPIC_NUMBER" >&2

# A task file is already synced when its frontmatter github: holds an issue URL
is_synced() {
    awk 'NR==1 && !/^---$/ {exit} /^---$/ {if (++n==2) exit; next}
         /^github:[[:space:]]*https?:\/\/[^[:space:]]+\/issues\/[0-9]+/ {f=1; exit}
         END {exit !f}' "$1"
}

# Find all task files (sequential numbered files); skip ones already synced so
# a re-run never creates duplicate issues
task_files=""
for f in $(find "$EPIC_DIR" -name "[0-9]*.md" -type f | sort); do
    if is_synced "$f"; then
        echo "   Skipping, already synced: $(basename "$f")" >&2
    else
        task_files="$task_files$f"$'\n'
    fi
done
task_files="${task_files%$'\n'}"

if [[ -z "$task_files" ]]; then
    echo "❌ Error: No unsynced task files found in $EPIC_DIR" >&2
    exit 1
fi

task_count=$(echo "$task_files" | wc -l)
echo "   Found $task_count tasks to create" >&2

current=0
created=0

# Create issues for each task
for task_file in $task_files; do
    current=$((current + 1))

    task_basename=$(basename "$task_file" .md)

    # Strip frontmatter; a file whose first line is not --- has none and is kept whole
    task_content=$(awk 'NR==1 && !/^---$/ {body=1} body {print; next} /^---$/ {if (++n==2) body=1}' "$task_file")
    if [[ -z "$task_content" ]]; then
        echo "⚠️  Warning: task body is empty: $task_file" >&2
    fi

    # Extract title from first heading or use basename
    task_title=$(echo "$task_content" | grep -m1 "^#" | sed 's/^# *//' || true)
    if [[ -z "$task_title" ]]; then
        task_title="Task $task_basename"
    fi

    echo -n "   [$current/$task_count] Creating issue for task $task_basename... " >&2

    # Write body to temp file for --body-file
    body_tmpfile=$(mktemp /tmp/task-body-XXXXXX.md)
    cat > "$body_tmpfile" <<EOF
$task_content

---
**Task Information:**
- Epic: #$EPIC_NUMBER
- Original ID: $task_basename
- Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

    # Create task issue and extract number from URL
    # A failed create is reported per task below instead of aborting the run
    issue_url=$(gh issue create \
        --title "$task_title" \
        --body-file "$body_tmpfile" \
        --label "task" \
        --label "epic:$EPIC_NAME") || issue_url=""
    rm -f "$body_tmpfile"

    issue_number=$(echo "$issue_url" | grep -o '[0-9]\+$' || true)

    if [[ -n "$issue_number" ]]; then
        echo "#$issue_number ✓" >&2
        created=$((created + 1))
        # Save mapping: old_name -> new_number
        echo "$task_basename $issue_number" >> "$MAPPING_FILE"

        # Add documentation comment to task issue
        doc_tmpfile=$(mktemp /tmp/doc-comment-XXXXXX.md)
        cat > "$doc_tmpfile" <<EOF
📁 **Local Documentation**

This task is tracked locally at:
- **Task file**: \`.claude/epics/$EPIC_NAME/$task_basename.md\`
- **Epic file**: \`.claude/epics/$EPIC_NAME/epic.md\`

**For developers**: Clone the repository and review the local task file for:
- Detailed implementation requirements
- Acceptance criteria
- Technical specifications
- Dependencies and related tasks

**Part of Epic**: #$EPIC_NUMBER
EOF

        # Add comment (silent to avoid clutter in output)
        if gh issue comment "$issue_number" --body-file "$doc_tmpfile" &> /dev/null; then
            echo "      📎 Documentation links added" >&2
        fi

        rm -f "$doc_tmpfile"
    else
        echo "FAILED" >&2
        echo "⚠️  Failed to create issue for $task_basename" >&2
    fi
done

echo "" >&2
echo "   Mapping saved to: $MAPPING_FILE" >&2

# Output the mapping file path for next script, even on a shortfall
echo "$MAPPING_FILE"

if [[ $created -ne $task_count ]]; then
    echo "❌ Created $created of $task_count task issues" >&2
    exit 1
fi
echo "✅ Created $created of $task_count task issues" >&2
