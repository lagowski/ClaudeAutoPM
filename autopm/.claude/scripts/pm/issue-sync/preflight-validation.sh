#!/bin/bash
# Preflight Validation Script for Issue Sync
# Performs all necessary checks before syncing issue updates

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../lib/logging-utils.sh"
source "${SCRIPT_DIR}/../../lib/github-utils.sh"
source "${SCRIPT_DIR}/../../lib/frontmatter-utils.sh"
source "${SCRIPT_DIR}/../../lib/validation-utils.sh"
source "${SCRIPT_DIR}/../../lib/datetime-utils.sh"

# Script configuration
readonly ISSUE_NUMBER="${1:-}"

# Global variables
declare -g epic_name=""
declare -g updates_dir=""
declare -g progress_file=""

# Main function
main() {
    print_banner "Issue Sync Preflight Validation" "1.0.0"

    # Validate inputs
    log_info "Validating issue: #$ISSUE_NUMBER"
    validate_inputs || exit 1

    # Run all preflight checks
    with_error_handling "Repository protection check" \
        check_repository_protection

    with_error_handling "GitHub authentication check" \
        check_github_authentication

    with_error_handling "Issue validation" \
        validate_issue_exists

    with_error_handling "Local updates check" \
        check_local_updates

    with_error_handling "Sync timing check" \
        check_sync_timing

    with_error_handling "Changes verification" \
        verify_changes_exist

    # Output validation results
    display_validation_results

    log_success "All preflight checks passed successfully"
}

# Validate script inputs
validate_inputs() {
    log_function_entry "validate_inputs"

    validate_issue_number "$ISSUE_NUMBER" || return 1

    log_function_exit "validate_inputs"
    return 0
}

# Check repository protection
check_repository_protection() {
    log_function_entry "check_repository_protection"

    log_info "Checking repository protection against template repos"
    check_repo_protection

    log_function_exit "check_repository_protection"
}

# Check GitHub authentication
check_github_authentication() {
    log_function_entry "check_github_authentication"

    log_info "Verifying GitHub CLI authentication"
    validate_github_auth

    log_function_exit "check_github_authentication"
}

# Validate that the issue exists and get its state
validate_issue_exists() {
    log_function_entry "validate_issue_exists"

    log_info "Validating issue #$ISSUE_NUMBER exists"

    local issue_state
    issue_state=$(check_issue_exists "$ISSUE_NUMBER")

    if [[ $? -ne 0 ]]; then
        log_error "Issue #$ISSUE_NUMBER not found"
        echo "❌ Issue #$ISSUE_NUMBER not found"
        echo "Please verify the issue number and try again."
        return 1
    fi

    log_info "Issue #$ISSUE_NUMBER exists with state: $issue_state"

    # Warn if issue is closed but we're still syncing
    if [[ "$issue_state" == "closed" ]]; then
        log_warning "Issue #$ISSUE_NUMBER is closed"
        echo "⚠️ Issue #$ISSUE_NUMBER is closed but you're syncing updates."
        echo "This is unusual but allowed - the sync will proceed."
    fi

    log_function_exit "validate_issue_exists"
    return 0
}

# Check for local updates directory and files
check_local_updates() {
    log_function_entry "check_local_updates"

    log_info "Checking for local updates directory"

    # Find the epic that contains this issue
    local found_epic=""
    for epic_dir in .claude/epics/*/; do
        [[ -d "$epic_dir" ]] || continue

        local epic_updates_dir="$epic_dir/updates/$ISSUE_NUMBER"
        if [[ -d "$epic_updates_dir" ]]; then
            found_epic=$(basename "$epic_dir")
            updates_dir="$epic_updates_dir"
            progress_file="$epic_updates_dir/progress.md"
            break
        fi
    done

    if [[ -z "$found_epic" ]]; then
        log_error "No local updates found for issue #$ISSUE_NUMBER"
        echo "❌ No local updates found for issue #$ISSUE_NUMBER"
        echo "Initialize issue tracking with: /pm:issue-start $ISSUE_NUMBER"
        return 1
    fi

    epic_name="$found_epic"
    log_info "Found updates in epic: $epic_name"
    log_debug "Updates directory: $updates_dir"

    # Check if progress.md exists
    if [[ ! -f "$progress_file" ]]; then
        log_error "No progress tracking found"
        echo "❌ No progress tracking found for issue #$ISSUE_NUMBER"
        echo "Initialize with: /pm:issue-start $ISSUE_NUMBER"
        return 1
    fi

    log_success "Local updates directory found: $updates_dir"
    log_function_exit "check_local_updates"
    return 0
}

# Check timing of last sync to avoid too frequent syncs
check_sync_timing() {
    log_function_entry "check_sync_timing"

    log_info "Checking last sync timing"

    local last_sync
    last_sync=$(get_frontmatter_field "$progress_file" "last_sync" 2>/dev/null || echo "")

    if [[ -n "$last_sync" ]]; then
        local current_time
        current_time=$(get_current_datetime)

        local time_diff
        time_diff=$(datetime_diff_minutes "$last_sync" "$current_time" 2>/dev/null || echo "999")

        log_debug "Last sync: $last_sync, Current: $current_time, Diff: ${time_diff}m"

        if [[ "$time_diff" -lt 5 ]]; then
            log_warning "Recent sync detected (${time_diff} minutes ago)"
            echo "⚠️ Issue was synced recently (${time_diff} minutes ago at $last_sync)"

            # Interactive confirmation in non-automated environments
            if [[ -t 0 ]] && [[ "${AUTOPM_FORCE_SYNC:-}" != "true" ]]; then
                echo "Force sync anyway? Set AUTOPM_FORCE_SYNC=true to skip this check."
                if ! confirm "Continue with sync?"; then
                    echo "Sync cancelled by user"
                    exit 0
                fi
            fi
        fi
    else
        log_info "No previous sync timestamp found - this appears to be the first sync"
    fi

    log_function_exit "check_sync_timing"
    return 0
}

# Verify that there are actually changes to sync
verify_changes_exist() {
    log_function_entry "verify_changes_exist"

    log_info "Verifying that changes exist to sync"

    # Get last sync timestamp
    local last_sync
    last_sync=$(get_frontmatter_field "$progress_file" "last_sync" 2>/dev/null || echo "")

    local has_changes=false

    # Check if progress.md has been modified since last sync
    if [[ -f "$progress_file" ]]; then
        if [[ -z "$last_sync" ]]; then
            # No previous sync, so there are changes
            has_changes=true
            log_debug "No previous sync - treating as changes exist"
        else
            # Check file modification time vs last sync
            local file_mtime_iso
            if command -v gstat >/dev/null 2>&1; then
                # GNU stat (macOS with coreutils)
                file_mtime_iso=$(gstat -c %Y "$progress_file" | xargs -I {} date -u -d "@{}" +"%Y-%m-%dT%H:%M:%SZ")
            else
                # BSD stat (macOS default) or Linux stat
                file_mtime_iso=$(stat -f %m "$progress_file" 2>/dev/null | xargs -I {} date -u -r {} +"%Y-%m-%dT%H:%M:%SZ" ||
                                 stat -c %Y "$progress_file" | xargs -I {} date -u -d "@{}" +"%Y-%m-%dT%H:%M:%SZ")
            fi

            if datetime_is_after "$file_mtime_iso" "$last_sync" 2>/dev/null; then
                has_changes=true
                log_debug "Progress file modified after last sync"
            fi
        fi
    fi

    # Check for other update files
    if [[ -d "$updates_dir" ]]; then
        local update_files
        update_files=$(find "$updates_dir" -name "*.md" -type f | wc -l)
        if [[ "$update_files" -gt 1 ]]; then  # More than just progress.md
            has_changes=true
            log_debug "Found $update_files update files"
        fi
    fi

    if [[ "$has_changes" != "true" ]]; then
        local last_sync_formatted
        last_sync_formatted=$(echo "$last_sync" | sed 's/T/ /' | sed 's/Z//')

        log_info "No new updates found since last sync"
        echo "ℹ️ No new updates to sync since $last_sync_formatted"
        echo "All changes have already been synchronized to GitHub."
        exit 0
    fi

    log_success "Changes detected - sync can proceed"
    log_function_exit "verify_changes_exist"
    return 0
}

# Display validation results summary
display_validation_results() {
    print_section "✅ Preflight Validation Results"

    echo "Issue: #$ISSUE_NUMBER"
    echo "Epic: $epic_name"
    echo "Updates Directory: $updates_dir"
    echo "Progress File: $progress_file"

    # Show basic issue info if possible
    if command -v gh >/dev/null 2>&1; then
        local issue_title
        issue_title=$(gh issue view "$ISSUE_NUMBER" --json title -q .title 2>/dev/null || echo "Unknown")
        echo "Issue Title: $issue_title"
    fi

    # Show completion status
    local completion
    completion=$(get_frontmatter_field "$progress_file" "completion" 2>/dev/null || echo "Unknown")
    echo "Current Completion: $completion"

    # Show last sync info
    local last_sync
    last_sync=$(get_frontmatter_field "$progress_file" "last_sync" 2>/dev/null || echo "Never")
    echo "Last Sync: $last_sync"

    echo ""
    echo "✅ All preflight checks passed"
    echo "✅ Ready to sync updates to GitHub"
}

# Get epic name for the issue
get_epic_name() {
    echo "$epic_name"
}

# Get updates directory path
get_updates_directory() {
    echo "$updates_dir"
}

# Get progress file path
get_progress_file() {
    echo "$progress_file"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Preflight validation failed with exit code: $exit_code"
    log_error "Issue sync preflight failed for: #$ISSUE_NUMBER"
    exit "$exit_code"
}

# Set up error handling
trap handle_error ERR

# Validate arguments
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <issue_number>"
    echo ""
    echo "Performs preflight validation for issue sync operation."
    echo ""
    echo "Checks performed:"
    echo "  1. Repository protection (prevents syncing to template repos)"
    echo "  2. GitHub CLI authentication"
    echo "  3. Issue existence and state validation"
    echo "  4. Local updates directory and files"
    echo "  5. Sync timing (prevents too frequent syncs)"
    echo "  6. Changes verification (ensures there's something to sync)"
    echo ""
    echo "Environment Variables:"
    echo "  AUTOPM_FORCE_SYNC=true    Skip timing checks and force sync"
    echo "  AUTOPM_LOG_LEVEL=0        Enable debug logging"
    echo ""
    echo "Examples:"
    echo "  $0 123"
    echo "  AUTOPM_FORCE_SYNC=true $0 456"
    echo ""
    echo "Output Functions (for use by other scripts):"
    echo "  get_epic_name             Returns the epic name containing the issue"
    echo "  get_updates_directory     Returns the path to updates directory"
    echo "  get_progress_file         Returns the path to progress.md file"
    echo ""
    exit 1
fi

# Run main function
main "$@"