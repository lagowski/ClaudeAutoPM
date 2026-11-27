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

# Get repository info; a placeholder repo would be written into every task file
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
if [[ -z "$REPO" ]]; then
    echo "❌ Error: could not read the repository (gh repo view failed); no files changed"
    exit 1
fi

echo "🔗 Updating task references and renaming files"

# Keep only numeric "old new" pairs: the values end up in file names and regexes
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

if ! grep -q '[^[:space:]]' "$MAPPING_FILE"; then
    echo "   Mapping is empty: no task files to rename"
    exit 0
fi
if [[ ! -s "$VALID_MAPPING" ]]; then
    echo "❌ Error: no valid mapping entries in $MAPPING_FILE; no files changed"
    exit 1
fi

failed=0

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

    # Update frontmatter; only a successful awk replaces the original
    if awk -v url="$github_url" -v ts="$timestamp" '
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
    ' "$old_file" > "$new_file.tmp" && mv "$new_file.tmp" "$new_file"; then
        rm "$old_file" "$old_file.backup"
        echo "✓"
    else
        # awk or mv failed: keep the original, drop the partial output
        mv "$old_file.backup" "$old_file"
        rm -f "$new_file.tmp"
        echo "FAILED"
        failed=$((failed + 1))
    fi

done < "$VALID_MAPPING"

# Second pass: Update cross-references within renamed files
echo ""
echo "   Updating cross-references within task files..."

# One pass per file with every mapping in a single regex, so replaced text is
# never matched again (no chaining like #10 -> #20 -> #30). perl, not sed: \b
# and case-insensitive flags are not portable to BSD/macOS sed.
while read -r task_file; do
    if perl -e '
        open(my $m, "<", shift) or die "mapping: $!";
        my %map = map { chomp; split / / } <$m>;
        my $ids = join "|", sort { length($b) <=> length($a) } keys %map;
        while (<STDIN>) {
            s/(\b(?:task|issue|depends on) |#)($ids)\b/($1 eq "#" ? "#" : "$1#") . $map{$2}/gie if %map;
            print;
        }
    ' "$VALID_MAPPING" < "$task_file" > "$task_file.tmp" && mv "$task_file.tmp" "$task_file"; then
        :
    else
        rm -f "$task_file.tmp"
        echo "⚠️  Could not update cross-references in $task_file"
        failed=$((failed + 1))
    fi
done < <(find "$EPIC_DIR" -name "[0-9]*.md" -type f)

echo ""
if [[ $failed -gt 0 ]]; then
    echo "❌ $failed task file(s) could not be renamed or updated"
    exit 1
fi
echo "✅ Task files renamed and frontmatter updated"
