#!/bin/bash
# Gather Updates Script for Issue Sync
# Collects all local development updates for GitHub synchronization

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../lib/logging-utils.sh"
source "${SCRIPT_DIR}/../../lib/frontmatter-utils.sh"
source "${SCRIPT_DIR}/../../lib/validation-utils.sh"
source "${SCRIPT_DIR}/../../lib/datetime-utils.sh"

# Script configuration
readonly ISSUE_NUMBER="${1:-}"
readonly UPDATES_DIR="${2:-}"
readonly LAST_SYNC="${3:-}"

# Global variables
declare -g temp_dir=""
declare -g gathered_updates=""

# Main function
main() {
    print_banner "Issue Updates Gatherer" "1.0.0"

    # Validate inputs
    log_info "Gathering updates for issue #$ISSUE_NUMBER"
    validate_inputs || exit 1

    # Setup workspace
    setup_workspace

    # Gather all types of updates
    with_error_handling "Gather progress updates" \
        gather_progress_updates

    with_error_handling "Gather technical notes" \
        gather_technical_notes

    with_error_handling "Gather commit references" \
        gather_commit_references

    with_error_handling "Gather acceptance criteria updates" \
        gather_acceptance_criteria

    with_error_handling "Gather next steps and blockers" \
        gather_next_steps_and_blockers

    # Consolidate all updates
    with_error_handling "Consolidate updates" \
        consolidate_updates

    # Output results
    display_results

    # Return path to consolidated updates file
    echo "$gathered_updates"
}

# Validate script inputs
validate_inputs() {
    log_function_entry "validate_inputs"

    validate_issue_number "$ISSUE_NUMBER" || return 1
    validate_directory_exists "$UPDATES_DIR" "Updates directory" || return 1

    log_function_exit "validate_inputs"
    return 0
}

# Setup temporary workspace
setup_workspace() {
    log_function_entry "setup_workspace"

    temp_dir="/tmp/gather-updates-$$"
    gathered_updates="$temp_dir/consolidated-updates.md"

    log_info "Creating workspace: $temp_dir"
    mkdir -p "$temp_dir"

    # Cleanup on exit
    trap "cleanup_workspace" EXIT

    log_function_exit "setup_workspace"
}

# Cleanup workspace
cleanup_workspace() {
    if [[ -n "$temp_dir" ]] && [[ -d "$temp_dir" ]]; then
        log_debug "Cleaning up workspace: $temp_dir"
        # Don't remove - calling script needs the results
        # rm -rf "$temp_dir"
    fi
}

# Gather progress updates from progress.md
gather_progress_updates() {
    log_function_entry "gather_progress_updates"

    local progress_file="$UPDATES_DIR/progress.md"
    local progress_output="$temp_dir/progress-updates.md"

    if [[ ! -f "$progress_file" ]]; then
        log_warning "Progress file not found: $progress_file"
        echo "No progress updates available" > "$progress_output"
        log_function_exit "gather_progress_updates"
        return 0
    fi

    log_info "Processing progress file: $progress_file"

    # Extract content since last sync
    if [[ -n "$LAST_SYNC" ]]; then
        extract_content_since_sync "$progress_file" "$progress_output" "$LAST_SYNC"
    else
        # No previous sync - get all content except frontmatter
        strip_frontmatter "$progress_file" "$progress_output"
    fi

    # Get completion percentage
    local completion
    completion=$(get_frontmatter_field "$progress_file" "completion" 2>/dev/null || echo "0%")

    # Add completion info to progress updates
    cat >> "$progress_output" << EOF

**Current Progress:** $completion
EOF

    log_success "Progress updates gathered"
    log_function_exit "gather_progress_updates"
}

# Gather technical notes
gather_technical_notes() {
    log_function_entry "gather_technical_notes"

    local notes_file="$UPDATES_DIR/notes.md"
    local notes_output="$temp_dir/technical-notes.md"

    if [[ ! -f "$notes_file" ]]; then
        log_debug "Notes file not found: $notes_file"
        echo "No technical notes available" > "$notes_output"
        log_function_exit "gather_technical_notes"
        return 0
    fi

    log_info "Processing notes file: $notes_file"

    # Extract content since last sync
    if [[ -n "$LAST_SYNC" ]]; then
        extract_content_since_sync "$notes_file" "$notes_output" "$LAST_SYNC"
    else
        strip_frontmatter "$notes_file" "$notes_output"
    fi

    log_success "Technical notes gathered"
    log_function_exit "gather_technical_notes"
}

# Gather commit references
gather_commit_references() {
    log_function_entry "gather_commit_references"

    local commits_file="$UPDATES_DIR/commits.md"
    local commits_output="$temp_dir/commit-references.md"

    if [[ ! -f "$commits_file" ]]; then
        log_debug "Commits file not found: $commits_file"

        # Try to gather recent commits automatically
        gather_recent_commits_automatically "$commits_output"
    else
        log_info "Processing commits file: $commits_file"

        # Extract content since last sync
        if [[ -n "$LAST_SYNC" ]]; then
            extract_content_since_sync "$commits_file" "$commits_output" "$LAST_SYNC"
        else
            strip_frontmatter "$commits_file" "$commits_output"
        fi
    fi

    log_success "Commit references gathered"
    log_function_exit "gather_commit_references"
}

# Automatically gather recent commits
gather_recent_commits_automatically() {
    local output_file="$1"

    log_function_entry "gather_recent_commits_automatically"

    # Get recent commits (last 24 hours or since last sync)
    local since_date
    if [[ -n "$LAST_SYNC" ]]; then
        since_date="$LAST_SYNC"
    else
        since_date=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null ||
                    date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null ||
                    echo "")
    fi

    local commits_found=false

    if [[ -n "$since_date" ]] && command -v git >/dev/null 2>&1; then
        log_debug "Looking for commits since: $since_date"

        local commit_list
        if commit_list=$(git log --since="$since_date" --oneline --no-merges 2>/dev/null); then
            if [[ -n "$commit_list" ]]; then
                echo "**Recent Commits:**" > "$output_file"
                echo "$commit_list" | while read -r commit; do
                    echo "- $commit"
                done >> "$output_file"
                commits_found=true
                log_debug "Found recent commits automatically"
            fi
        fi
    fi

    if [[ "$commits_found" != "true" ]]; then
        echo "No recent commits found" > "$output_file"
        log_debug "No recent commits found"
    fi

    log_function_exit "gather_recent_commits_automatically"
}

# Gather acceptance criteria updates
gather_acceptance_criteria() {
    log_function_entry "gather_acceptance_criteria"

    local criteria_file="$UPDATES_DIR/acceptance-criteria.md"
    local criteria_output="$temp_dir/acceptance-criteria.md"

    if [[ ! -f "$criteria_file" ]]; then
        log_debug "Acceptance criteria file not found: $criteria_file"
        echo "No acceptance criteria updates available" > "$criteria_output"
        log_function_exit "gather_acceptance_criteria"
        return 0
    fi

    log_info "Processing acceptance criteria file: $criteria_file"

    # Extract content since last sync
    if [[ -n "$LAST_SYNC" ]]; then
        extract_content_since_sync "$criteria_file" "$criteria_output" "$LAST_SYNC"
    else
        strip_frontmatter "$criteria_file" "$criteria_output"
    fi

    log_success "Acceptance criteria gathered"
    log_function_exit "gather_acceptance_criteria"
}

# Gather next steps and blockers
gather_next_steps_and_blockers() {
    log_function_entry "gather_next_steps_and_blockers"

    local next_steps_output="$temp_dir/next-steps.md"
    local blockers_output="$temp_dir/blockers.md"

    # Check for dedicated files
    local next_steps_file="$UPDATES_DIR/next-steps.md"
    local blockers_file="$UPDATES_DIR/blockers.md"

    # Gather next steps
    if [[ -f "$next_steps_file" ]]; then
        log_info "Processing next steps file: $next_steps_file"
        if [[ -n "$LAST_SYNC" ]]; then
            extract_content_since_sync "$next_steps_file" "$next_steps_output" "$LAST_SYNC"
        else
            strip_frontmatter "$next_steps_file" "$next_steps_output"
        fi
    else
        echo "No specific next steps documented" > "$next_steps_output"
    fi

    # Gather blockers
    if [[ -f "$blockers_file" ]]; then
        log_info "Processing blockers file: $blockers_file"
        if [[ -n "$LAST_SYNC" ]]; then
            extract_content_since_sync "$blockers_file" "$blockers_output" "$LAST_SYNC"
        else
            strip_frontmatter "$blockers_file" "$blockers_output"
        fi
    else
        echo "No current blockers reported" > "$blockers_output"
    fi

    log_success "Next steps and blockers gathered"
    log_function_exit "gather_next_steps_and_blockers"
}

# Extract content from file since last sync timestamp
extract_content_since_sync() {
    local input_file="$1"
    local output_file="$2"
    local last_sync="$3"

    log_function_entry "extract_content_since_sync" "$(basename "$input_file")" "$last_sync"

    # For now, extract all content (incremental extraction is complex)
    # TODO: Implement proper incremental extraction with sync markers
    strip_frontmatter "$input_file" "$output_file"

    # Add note about sync timing
    if [[ -s "$output_file" ]]; then
        echo "" >> "$output_file"
        echo "*Updates since last sync at $last_sync*" >> "$output_file"
    else
        echo "No updates since last sync at $last_sync" > "$output_file"
    fi

    log_function_exit "extract_content_since_sync"
}

# Consolidate all gathered updates into single file
consolidate_updates() {
    log_function_entry "consolidate_updates"

    log_info "Consolidating all gathered updates"

    cat > "$gathered_updates" << EOF
# Consolidated Updates for Issue #${ISSUE_NUMBER}

*Gathered at: $(get_current_datetime)*

EOF

    # Add each section if it has meaningful content
    add_section_if_content "Progress Updates" "$temp_dir/progress-updates.md"
    add_section_if_content "Technical Notes" "$temp_dir/technical-notes.md"
    add_section_if_content "Recent Commits" "$temp_dir/commit-references.md"
    add_section_if_content "Acceptance Criteria" "$temp_dir/acceptance-criteria.md"
    add_section_if_content "Next Steps" "$temp_dir/next-steps.md"
    add_section_if_content "Blockers" "$temp_dir/blockers.md"

    # Add any additional update files found in the directory
    for update_file in "$UPDATES_DIR"/*.md; do
        [[ -f "$update_file" ]] || continue

        local basename_file
        basename_file=$(basename "$update_file" .md)

        # Skip already processed files
        case "$basename_file" in
            progress|notes|commits|acceptance-criteria|next-steps|blockers)
                continue
                ;;
            *)
                log_debug "Found additional update file: $basename_file"
                add_section_if_content "$(echo "$basename_file" | tr '-' ' ' | sed 's/\b\w/\u&/g')" "$update_file"
                ;;
        esac
    done

    log_success "Updates consolidated into: $gathered_updates"
    log_function_exit "consolidate_updates"
}

# Add section to consolidated file if it has meaningful content
add_section_if_content() {
    local section_title="$1"
    local section_file="$2"

    if [[ ! -f "$section_file" ]]; then
        return 0
    fi

    # Check if file has meaningful content (more than just "No ... available")
    local content
    content=$(cat "$section_file")

    if [[ -n "$content" ]] && [[ ! "$content" =~ ^[[:space:]]*No.*available[[:space:]]*$ ]]; then
        cat >> "$gathered_updates" << EOF

## $section_title

$content

EOF
        log_debug "Added section: $section_title"
    else
        log_debug "Skipped empty section: $section_title"
    fi
}

# Display gathering results
display_results() {
    print_section "✅ Updates Gathering Results"

    echo "Issue: #$ISSUE_NUMBER"
    echo "Updates Directory: $UPDATES_DIR"
    echo "Last Sync: ${LAST_SYNC:-Never}"

    # Show gathered file size
    local file_size
    if [[ -f "$gathered_updates" ]]; then
        file_size=$(wc -c < "$gathered_updates")
        echo "Consolidated Updates: $file_size characters"
    fi

    # Show sections found
    echo ""
    echo "Sections gathered:"
    if [[ -f "$gathered_updates" ]]; then
        grep "^## " "$gathered_updates" | sed 's/^## /  - /' || echo "  - No sections found"
    fi

    echo ""
    echo "✅ All updates gathered successfully"
    echo "📄 Consolidated file: $gathered_updates"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Updates gathering failed with exit code: $exit_code"
    log_error "Failed to gather updates for issue: #$ISSUE_NUMBER"
    exit "$exit_code"
}

# Set up error handling
trap handle_error ERR

# Validate arguments
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <issue_number> <updates_directory> [last_sync_timestamp]"
    echo ""
    echo "Gathers all local development updates for GitHub synchronization."
    echo ""
    echo "Arguments:"
    echo "  issue_number        GitHub issue number"
    echo "  updates_directory   Path to local updates directory"
    echo "  last_sync_timestamp Optional timestamp of last sync (ISO 8601)"
    echo ""
    echo "The script will gather updates from:"
    echo "  - progress.md         Development progress and completion status"
    echo "  - notes.md           Technical notes and decisions"
    echo "  - commits.md         Commit references (or auto-gather recent commits)"
    echo "  - acceptance-criteria.md  Acceptance criteria updates"
    echo "  - next-steps.md      Planned next actions"
    echo "  - blockers.md        Current blockers and impediments"
    echo "  - *.md               Any other markdown files in updates directory"
    echo ""
    echo "Examples:"
    echo "  $0 123 .claude/epics/auth/updates/123"
    echo "  $0 456 .claude/epics/dashboard/updates/456 2024-01-15T10:30:00Z"
    echo ""
    echo "Output:"
    echo "  Prints path to consolidated updates file on stdout"
    echo ""
    exit 1
fi

# Run main function
main "$@"