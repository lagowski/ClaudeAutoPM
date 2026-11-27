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
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
if [[ -z "$REPO" ]]; then
    echo "❌ Error: could not read the repository (gh repo view failed); epic file not changed"
    exit 1
fi
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

    # Keep only numeric "old new" pairs: the values end up in a regex
    VALID_MAPPING=$(mktemp)
    trap 'rm -f "$VALID_MAPPING"' EXIT
    while read -r old_name new_number _; do
        [[ -z "${old_name:-}" ]] && continue
        if [[ "$old_name" =~ ^[0-9]+$ && "${new_number:-}" =~ ^[0-9]+$ ]]; then
            echo "$old_name $new_number" >> "$VALID_MAPPING"
        else
            echo "⚠️  Skipping invalid mapping entry: $old_name ${new_number:-}"
        fi
    done < "$MAPPING_FILE"

    # One perl pass with every mapping in a single regex: replaced text is never
    # matched again, and \b works on BSD/macOS too (sed's \b is GNU-only).
    # "- [ ] 001" / "- [x] 001" / "Task 001" become "#<issue number>".
    perl -e '
        open(my $m, "<", shift) or die "mapping: $!";
        my %map = map { chomp; split / / } <$m>;
        my $ids = join "|", sort { length($b) <=> length($a) } keys %map;
        while (<STDIN>) {
            s/(- \[[ x]\] |Task )($ids)\b/$1#$map{$2}/g if %map;
            print;
        }
    ' "$VALID_MAPPING" < "$EPIC_FILE.tmp" > "$EPIC_FILE.tmp2"
    mv "$EPIC_FILE.tmp2" "$EPIC_FILE.tmp"
fi

# Finalize
mv "$EPIC_FILE.tmp" "$EPIC_FILE"
rm "$EPIC_FILE.backup"

echo "✅ Epic file updated"
echo "   GitHub: $EPIC_URL"
