#!/bin/bash
# Update Frontmatter Script for Issue Sync
# Updates progress.md frontmatter after successful sync

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../lib/logging-utils.sh"
source "${SCRIPT_DIR}/../../lib/frontmatter-utils.sh"
source "${SCRIPT_DIR}/../../lib/datetime-utils.sh"
source "${SCRIPT_DIR}/../../lib/validation-utils.sh"

# Script configuration
readonly ISSUE_NUMBER="${1:-}"
readonly PROGRESS_FILE="${2:-}"
readonly COMMENT_URL="${3:-}"
readonly IS_COMPLETION="${4:-false}"

# Global variables
declare -g backup_file=""
declare -g updated_fields=0

# Main function
main() {
    print_banner "Frontmatter Updater" "1.0.0"

    # Validate inputs
    log_info "Updating frontmatter for issue #$ISSUE_NUMBER"
    validate_inputs || exit 1

    # Create backup
    with_error_handling "Create backup" \
        create_backup

    # Update sync timestamp
    with_error_handling "Update sync timestamp" \
        update_sync_timestamp

    # Update comment URL
    with_error_handling "Update comment URL" \
        update_comment_url

    # Update completion status if needed
    if [[ "$IS_COMPLETION" == "true" ]]; then
        with_error_handling "Update completion status" \
            update_completion_status
    fi

    # Update issue state if changed
    with_error_handling "Update issue state" \
        update_issue_state

    # Verify updates
    with_error_handling "Verify frontmatter updates" \
        verify_updates

    # Display results
    display_results

    log_success "Frontmatter updated successfully"
}

# Validate script inputs
validate_inputs() {
    log_function_entry "validate_inputs"

    if [[ -z "$ISSUE_NUMBER" ]]; then
        log_error "Issue number is required"
        return 1
    fi

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        log_error "Progress file not found: $PROGRESS_FILE"
        return 1
    fi

    # Validate progress file has frontmatter
    if ! has_frontmatter "$PROGRESS_FILE"; then
        log_error "Progress file does not have valid frontmatter"
        return 1
    fi

    log_function_exit "validate_inputs"
    return 0
}

# Create backup of progress file
create_backup() {
    log_function_entry "create_backup"

    backup_file="${PROGRESS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

    log_info "Creating backup: $backup_file"
    cp "$PROGRESS_FILE" "$backup_file"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Failed to create backup"
        return 1
    fi

    log_success "Backup created"
    log_function_exit "create_backup"
    return 0
}

# Update last sync timestamp
update_sync_timestamp() {
    log_function_entry "update_sync_timestamp"

    local current_time
    current_time=$(get_current_datetime)

    log_info "Updating last_sync to: $current_time"

    if update_frontmatter_field "$PROGRESS_FILE" "last_sync" "$current_time"; then
        ((updated_fields++))
        log_success "Sync timestamp updated"
    else
        log_warning "Failed to update sync timestamp"
    fi

    log_function_exit "update_sync_timestamp"
    return 0
}

# Update last comment URL
update_comment_url() {
    log_function_entry "update_comment_url"

    if [[ -z "$COMMENT_URL" ]] || [[ "$COMMENT_URL" == "null" ]]; then
        log_debug "No comment URL to update"
        log_function_exit "update_comment_url"
        return 0
    fi

    log_info "Updating last_comment_url to: $COMMENT_URL"

    if update_frontmatter_field "$PROGRESS_FILE" "last_comment_url" "$COMMENT_URL"; then
        ((updated_fields++))
        log_success "Comment URL updated"
    else
        log_warning "Failed to update comment URL"
    fi

    log_function_exit "update_comment_url"
    return 0
}

# Update completion status
update_completion_status() {
    log_function_entry "update_completion_status"

    log_info "Updating completion status to 100%"

    # Update completion percentage
    if update_frontmatter_field "$PROGRESS_FILE" "completion" "100"; then
        ((updated_fields++))
        log_success "Completion percentage updated"
    fi

    # Update status field
    if update_frontmatter_field "$PROGRESS_FILE" "status" "completed"; then
        ((updated_fields++))
        log_success "Status updated to completed"
    fi

    # Add completion timestamp
    local completion_time
    completion_time=$(get_current_datetime)

    if update_frontmatter_field "$PROGRESS_FILE" "completed_at" "$completion_time"; then
        ((updated_fields++))
        log_success "Completion timestamp added"
    fi

    log_function_exit "update_completion_status"
    return 0
}

# Update issue state from GitHub
update_issue_state() {
    log_function_entry "update_issue_state"

    # Check if GitHub CLI is available
    if ! command -v gh >/dev/null 2>&1; then
        log_debug "GitHub CLI not available, skipping state update"
        log_function_exit "update_issue_state"
        return 0
    fi

    log_info "Checking current issue state"

    # Get current issue state from GitHub
    local issue_state
    issue_state=$(gh issue view "$ISSUE_NUMBER" \
        --json state -q .state 2>/dev/null || echo "")

    if [[ -z "$issue_state" ]]; then
        log_warning "Could not retrieve issue state"
        log_function_exit "update_issue_state"
        return 0
    fi

    # Get current state from frontmatter
    local current_state
    current_state=$(get_frontmatter_field "$PROGRESS_FILE" "issue_state" 2>/dev/null || echo "")

    if [[ "$issue_state" != "$current_state" ]]; then
        log_info "Updating issue_state from '$current_state' to '$issue_state'"

        if update_frontmatter_field "$PROGRESS_FILE" "issue_state" "$issue_state"; then
            ((updated_fields++))
            log_success "Issue state updated"
        fi
    else
        log_debug "Issue state unchanged: $issue_state"
    fi

    log_function_exit "update_issue_state"
    return 0
}

# Verify frontmatter updates
verify_updates() {
    log_function_entry "verify_updates"

    log_info "Verifying frontmatter updates"

    # Check that last_sync was updated
    local last_sync
    last_sync=$(get_frontmatter_field "$PROGRESS_FILE" "last_sync" 2>/dev/null || echo "")

    if [[ -z "$last_sync" ]]; then
        log_warning "last_sync field not found after update"
    else
        log_success "last_sync verified: $last_sync"
    fi

    # Check completion if it was a completion sync
    if [[ "$IS_COMPLETION" == "true" ]]; then
        local completion
        completion=$(get_frontmatter_field "$PROGRESS_FILE" "completion" 2>/dev/null || echo "0")

        if [[ "$completion" == "100" ]]; then
            log_success "Completion verified: 100%"
        else
            log_warning "Completion not set to 100%: $completion"
        fi
    fi

    # Verify file integrity
    if ! has_frontmatter "$PROGRESS_FILE"; then
        log_error "Frontmatter corrupted after update"

        # Restore from backup
        log_warning "Restoring from backup"
        cp "$backup_file" "$PROGRESS_FILE"
        return 1
    fi

    log_success "All updates verified"
    log_function_exit "verify_updates"
    return 0
}

# Display update results
display_results() {
    print_section "✅ Frontmatter Update Results"

    echo "Issue: #$ISSUE_NUMBER"
    echo "Progress File: $PROGRESS_FILE"
    echo "Fields Updated: $updated_fields"

    echo ""
    echo "Updated Fields:"

    # Show current values of key fields
    local last_sync
    last_sync=$(get_frontmatter_field "$PROGRESS_FILE" "last_sync" 2>/dev/null || echo "Not set")
    echo "  - last_sync: $last_sync"

    if [[ -n "$COMMENT_URL" ]] && [[ "$COMMENT_URL" != "null" ]]; then
        echo "  - last_comment_url: $COMMENT_URL"
    fi

    if [[ "$IS_COMPLETION" == "true" ]]; then
        local completion
        completion=$(get_frontmatter_field "$PROGRESS_FILE" "completion" 2>/dev/null || echo "Unknown")
        echo "  - completion: ${completion}%"

        local status
        status=$(get_frontmatter_field "$PROGRESS_FILE" "status" 2>/dev/null || echo "Unknown")
        echo "  - status: $status"
    fi

    local issue_state
    issue_state=$(get_frontmatter_field "$PROGRESS_FILE" "issue_state" 2>/dev/null || echo "Unknown")
    echo "  - issue_state: $issue_state"

    echo ""
    echo "✅ Frontmatter updated successfully"

    if [[ -n "$backup_file" ]]; then
        echo "📄 Backup saved: $backup_file"
    fi
}

# Cleanup function
cleanup() {
    # Remove old backup files (keep last 5)
    if [[ -n "$PROGRESS_FILE" ]]; then
        local backup_dir
        backup_dir=$(dirname "$PROGRESS_FILE")

        log_debug "Cleaning old backups in: $backup_dir"

        # Find and remove old backups, keeping the 5 most recent
        find "$backup_dir" -name "$(basename "$PROGRESS_FILE").backup.*" -type f 2>/dev/null | \
            sort -r | \
            tail -n +6 | \
            while read -r old_backup; do
                log_debug "Removing old backup: $old_backup"
                rm -f "$old_backup"
            done
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Frontmatter update failed with exit code: $exit_code"
    log_error "Failed to update frontmatter for issue: #$ISSUE_NUMBER"

    # Restore from backup if available
    if [[ -n "$backup_file" ]] && [[ -f "$backup_file" ]]; then
        echo "⚠️ Restoring from backup: $backup_file"
        cp "$backup_file" "$PROGRESS_FILE"
        echo "✅ Backup restored"
    fi

    exit "$exit_code"
}

# Set up error handling and cleanup
trap handle_error ERR
trap cleanup EXIT

# Validate arguments
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <issue_number> <progress_file> [comment_url] [is_completion]"
    echo ""
    echo "Updates progress.md frontmatter after successful issue sync."
    echo ""
    echo "Arguments:"
    echo "  issue_number    GitHub issue number"
    echo "  progress_file   Path to progress.md file"
    echo "  comment_url     Optional: URL of posted comment"
    echo "  is_completion   Optional: 'true' if task is complete (default: false)"
    echo ""
    echo "Updates the following frontmatter fields:"
    echo "  - last_sync: Current timestamp"
    echo "  - last_comment_url: URL of the posted comment"
    echo "  - issue_state: Current state from GitHub (open/closed)"
    echo "  - completion: Set to 100 if is_completion=true"
    echo "  - status: Set to 'completed' if is_completion=true"
    echo "  - completed_at: Timestamp if is_completion=true"
    echo ""
    echo "Environment Variables:"
    echo "  AUTOPM_LOG_LEVEL=0    Enable debug logging"
    echo ""
    echo "Features:"
    echo "  - Automatic backup before modification"
    echo "  - Verification of updates"
    echo "  - Rollback on failure"
    echo "  - Old backup cleanup (keeps last 5)"
    echo ""
    echo "Examples:"
    echo "  $0 123 .claude/epics/auth/updates/123/progress.md"
    echo "  $0 456 ./progress.md https://github.com/owner/repo/issues/456#issuecomment-123"
    echo "  $0 789 ./progress.md \"\" true"
    echo ""
    exit 1
fi

# Run main function
main "$@"