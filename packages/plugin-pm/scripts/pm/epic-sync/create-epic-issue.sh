#!/bin/bash
# Create Epic Issue
# Creates the main GitHub issue for an epic with proper labels and stats

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPIC_NAME="${1:-}"

if [[ -z "$EPIC_NAME" ]]; then
    echo "❌ Error: Epic name required" >&2
    echo "Usage: $0 <epic_name>" >&2
    exit 1
fi

# Source utilities if they exist
if [[ -f "$SCRIPT_DIR/../../lib/github-utils.sh" ]]; then
    source "$SCRIPT_DIR/../../lib/github-utils.sh"
fi

EPIC_FILE=".claude/epics/$EPIC_NAME/epic.md"

if [[ ! -f "$EPIC_FILE" ]]; then
    echo "❌ Error: Epic file not found: $EPIC_FILE" >&2
    exit 1
fi

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) not installed" >&2
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Error: GitHub CLI not authenticated. Run: gh auth login" >&2
    exit 1
fi

# Strip frontmatter; a file whose first line is not --- has none and is kept whole
epic_content=$(awk 'NR==1 && !/^---$/ {body=1} body {print; next} /^---$/ {if (++n==2) body=1}' "$EPIC_FILE")
if [[ -z "$epic_content" ]]; then
    echo "⚠️  Warning: epic body is empty: $EPIC_FILE" >&2
fi

# Count tasks
task_count=$(find ".claude/epics/$EPIC_NAME" -name "[0-9]*.md" -type f 2>/dev/null | wc -l)

# Detect epic type: an explicit frontmatter type: wins, else whole words bug/bugfix
epic_type=$(awk 'NR==1 && !/^---$/ {exit} /^---$/ {if (++n==2) exit; next} /^type:/ {sub(/^type:[ ]*/, ""); print; exit}' "$EPIC_FILE")
if [[ "$epic_type" != "bug" && "$epic_type" != "feature" ]]; then
    if grep -qiw -e bug -e bugfix <<< "$epic_content"; then
        epic_type="bug"
    else
        epic_type="feature"
    fi
fi

# Create issue
echo "📝 Creating epic issue for: $EPIC_NAME" >&2
echo "   Tasks: $task_count" >&2
echo "   Labels: epic, $epic_type" >&2

# Write body to temp file for --body-file
body_tmpfile=$(mktemp /tmp/epic-body-XXXXXX.md)
cat > "$body_tmpfile" <<EOF
$epic_content

---
**Epic Statistics:**
- Tasks: $task_count
- Status: Planning
- Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

# Create the issue and extract number from URL
issue_url=$(gh issue create \
    --title "Epic: $EPIC_NAME" \
    --body-file "$body_tmpfile" \
    --label "epic" \
    --label "$epic_type")
rm -f "$body_tmpfile"

epic_number=$(echo "$issue_url" | grep -o '[0-9]\+$' || true)

if [[ -z "$epic_number" ]]; then
    echo "❌ Error: Failed to create epic issue" >&2
    exit 1
fi

# Add documentation comment to issue
echo "📎 Adding local documentation links to issue #$epic_number..." >&2

# Extract PRD name from epic file
prd_name=$(awk '/^---$/ {if (++n==2) exit; next} n==1 && /^prd:/ {sub(/^prd:[ ]*/, ""); gsub(/[ \t\r]/, ""); print; exit}' "$EPIC_FILE")
if [[ -z "$prd_name" ]]; then
    prd_name="$EPIC_NAME"
fi

# Create comment with documentation links
doc_tmpfile=$(mktemp /tmp/doc-comment-XXXXXX.md)
cat > "$doc_tmpfile" <<EOF
📁 **Local Documentation**

This epic is tracked locally at:
- **Epic file**: \`.claude/epics/$EPIC_NAME/epic.md\`
- **PRD**: \`.claude/prds/$prd_name.md\`

**For developers**: Clone the repository and review these files for:
- Complete technical specifications
- Acceptance criteria
- Implementation details
- Task breakdown

**File Structure**:
\`\`\`
.claude/epics/$EPIC_NAME/
├── epic.md           # This epic (#$epic_number)
├── 001.md           # Task 1 (will be issue #XX)
├── 002.md           # Task 2 (will be issue #XX)
└── ...              # Additional tasks
\`\`\`

Tasks will be created as sub-issues and linked here.
EOF

# Add comment to issue
if gh issue comment "$epic_number" --body-file "$doc_tmpfile" &> /dev/null; then
    echo "✅ Documentation links added to issue #$epic_number" >&2
else
    echo "⚠️ Warning: Failed to add documentation comment (issue created successfully)" >&2
fi

# Cleanup
rm -f "$doc_tmpfile"

echo "$epic_number"
