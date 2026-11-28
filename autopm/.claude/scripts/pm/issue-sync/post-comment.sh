#!/bin/bash
# Post Comment Script for Issue Sync
# Posts formatted comments to GitHub issues

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../lib/logging-utils.sh"
source "${SCRIPT_DIR}/../../lib/github-utils.sh"
source "${SCRIPT_DIR}/../../lib/validation-utils.sh"
source "${SCRIPT_DIR}/../../lib/datetime-utils.sh"

# Script configuration
readonly ISSUE_NUMBER="${1:-}"
readonly COMMENT_FILE="${2:-}"
readonly IS_COMPLETION="${3:-false}"

# Global variables
declare -g comment_id=""
declare -g comment_url=""

# Main function
main() {
    print_banner "GitHub Comment Poster" "1.0.0"

    # Validate inputs
    log_info "Posting comment to issue #$ISSUE_NUMBER"
    validate_inputs || exit 1

    # Check GitHub authentication
    with_error_handling "GitHub authentication check" \
        check_github_authentication

    # Check if issue exists
    with_error_handling "Issue validation" \
        validate_issue_exists

    # Post comment to GitHub
    with_error_handling "Post comment to GitHub" \
        post_github_comment

    # Verify comment was posted
    with_error_handling "Verify comment posted" \
        verify_comment_posted

    # Display results
    display_results

    # Return comment URL
    echo "$comment_url"
}

# Validate script inputs
validate_inputs() {
    log_function_entry "validate_inputs"

    if [[ -z "$ISSUE_NUMBER" ]]; then
        log_error "Issue number is required"
        return 1
    fi

    if [[ ! -f "$COMMENT_FILE" ]]; then
        log_error "Comment file not found: $COMMENT_FILE"
        return 1
    fi

    # Validate issue number format
    if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
        log_error "Invalid issue number format: $ISSUE_NUMBER"
        return 1
    fi

    log_function_exit "validate_inputs"
    return 0
}

# Check GitHub authentication
check_github_authentication() {
    log_function_entry "check_github_authentication"

    log_info "Verifying GitHub CLI authentication"

    if ! validate_github_auth; then
        log_error "GitHub CLI authentication failed"
        echo "❌ GitHub CLI is not authenticated"
        echo "Please run: gh auth login"
        return 1
    fi

    log_success "GitHub CLI authenticated"
    log_function_exit "check_github_authentication"
    return 0
}

# Validate that the issue exists
validate_issue_exists() {
    log_function_entry "validate_issue_exists"

    log_info "Validating issue #$ISSUE_NUMBER exists"

    local issue_state
    issue_state=$(check_issue_exists "$ISSUE_NUMBER")

    if [[ $? -ne 0 ]]; then
        log_error "Issue #$ISSUE_NUMBER not found"
        echo "❌ Issue #$ISSUE_NUMBER not found"
        return 1
    fi

    log_info "Issue #$ISSUE_NUMBER exists with state: $issue_state"

    # Warn if issue is closed
    if [[ "$issue_state" == "closed" ]]; then
        log_warning "Issue #$ISSUE_NUMBER is closed"
        echo "⚠️ Issue #$ISSUE_NUMBER is closed"

        # Interactive confirmation for closed issues
        if [[ -t 0 ]] && [[ "${AUTOPM_FORCE_SYNC:-}" != "true" ]]; then
            if ! confirm "Post comment to closed issue?"; then
                echo "Comment posting cancelled"
                exit 0
            fi
        fi
    fi

    log_function_exit "validate_issue_exists"
    return 0
}

# Post comment to GitHub issue
post_github_comment() {
    log_function_entry "post_github_comment"

    log_info "Posting comment to issue #$ISSUE_NUMBER"

    # Check for dry run mode
    if [[ "${AUTOPM_DRY_RUN:-false}" == "true" ]]; then
        log_warning "DRY RUN mode - not posting comment"
        echo "🔸 DRY RUN: Would post comment to issue #$ISSUE_NUMBER"
        echo "Comment preview:"
        head -20 "$COMMENT_FILE" | sed 's/^/  /'
        echo "  ..."
        comment_id="DRY-RUN"
        comment_url="https://github.com/DRYRUN/issues/$ISSUE_NUMBER#issuecomment-DRYRUN"
        log_function_exit "post_github_comment"
        return 0
    fi

    # Post the comment using GitHub CLI
    local response
    response=$(gh issue comment "$ISSUE_NUMBER" \
        --body-file "$COMMENT_FILE" \
        --json id,url 2>&1) || {
        log_error "Failed to post comment: $response"
        echo "❌ Failed to post comment to issue #$ISSUE_NUMBER"
        echo "Error: $response"
        return 1
    }

    # Extract comment ID and URL from response
    comment_id=$(echo "$response" | jq -r '.id' 2>/dev/null || echo "")
    comment_url=$(echo "$response" | jq -r '.url' 2>/dev/null || echo "")

    if [[ -z "$comment_id" ]] || [[ "$comment_id" == "null" ]]; then
        # Try alternative parsing for non-JSON response
        log_debug "Attempting alternative response parsing"

        # GitHub CLI sometimes returns just the URL
        if [[ "$response" =~ https://github.com/.*/issues/.*#issuecomment-.* ]]; then
            comment_url="$response"
            comment_id=$(echo "$response" | sed 's/.*#issuecomment-//')
        else
            log_error "Could not parse comment response: $response"
            echo "⚠️ Comment may have been posted but could not parse response"
            # Continue anyway as the comment might have been posted
        fi
    fi

    log_success "Comment posted successfully"
    log_debug "Comment ID: $comment_id"
    log_debug "Comment URL: $comment_url"

    log_function_exit "post_github_comment"
    return 0
}

# Verify comment was posted
verify_comment_posted() {
    log_function_entry "verify_comment_posted"

    # Skip verification in dry run mode
    if [[ "${AUTOPM_DRY_RUN:-false}" == "true" ]]; then
        log_debug "Skipping verification in dry run mode"
        log_function_exit "verify_comment_posted"
        return 0
    fi

    log_info "Verifying comment was posted"

    # If we don't have a comment URL, try to get the latest comment
    if [[ -z "$comment_url" ]] || [[ "$comment_url" == "null" ]]; then
        log_debug "No comment URL, checking latest comments"

        # Get the last comment on the issue
        local latest_comment
        latest_comment=$(gh issue view "$ISSUE_NUMBER" \
            --json comments \
            --jq '.comments[-1].url' 2>/dev/null || echo "")

        if [[ -n "$latest_comment" ]]; then
            comment_url="$latest_comment"
            log_info "Found latest comment: $comment_url"
        else
            log_warning "Could not verify comment was posted"
            # Not a fatal error - comment might still have been posted
        fi
    else
        # Verify the comment exists by trying to view it
        local verify_response
        verify_response=$(gh api "${comment_url#https://github.com}" \
            --jq '.id' 2>/dev/null || echo "")

        if [[ -n "$verify_response" ]]; then
            log_success "Comment verified: exists at $comment_url"
        else
            log_warning "Could not verify comment at URL: $comment_url"
        fi
    fi

    log_function_exit "verify_comment_posted"
    return 0
}

# Display posting results
display_results() {
    print_section "✅ Comment Posting Results"

    echo "Issue: #$ISSUE_NUMBER"

    if [[ "$IS_COMPLETION" == "true" ]]; then
        echo "Comment Type: Completion Comment"
    else
        echo "Comment Type: Progress Update"
    fi

    # Show comment size
    local comment_size
    comment_size=$(wc -c < "$COMMENT_FILE" 2>/dev/null || echo "0")
    echo "Comment Size: $comment_size characters"

    # Show posting status
    if [[ "${AUTOPM_DRY_RUN:-false}" == "true" ]]; then
        echo ""
        echo "🔸 DRY RUN - No actual comment posted"
        echo "Review the formatted comment at: $COMMENT_FILE"
    else
        if [[ -n "$comment_url" ]] && [[ "$comment_url" != "null" ]]; then
            echo ""
            echo "✅ Comment posted successfully"
            echo "🔗 View comment: $comment_url"
        else
            echo ""
            echo "⚠️ Comment posting status uncertain"
            echo "Please check issue #$ISSUE_NUMBER manually"
        fi
    fi

    # Show timestamp
    local current_time
    current_time=$(get_current_datetime)
    echo ""
    echo "Posted at: $current_time"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Comment posting failed with exit code: $exit_code"
    log_error "Failed to post comment to issue: #$ISSUE_NUMBER"

    # Provide recovery suggestions
    echo ""
    echo "Recovery options:"
    echo "1. Check GitHub authentication: gh auth status"
    echo "2. Verify issue exists: gh issue view $ISSUE_NUMBER"
    echo "3. Try manual posting: gh issue comment $ISSUE_NUMBER --body-file $COMMENT_FILE"
    echo "4. Check network connectivity"

    exit "$exit_code"
}

# Set up error handling
trap handle_error ERR

# Validate arguments
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <issue_number> <comment_file> [is_completion]"
    echo ""
    echo "Posts a formatted comment to a GitHub issue."
    echo ""
    echo "Arguments:"
    echo "  issue_number    GitHub issue number to post comment to"
    echo "  comment_file    Path to formatted comment file"
    echo "  is_completion   Optional: 'true' if completion comment (default: false)"
    echo ""
    echo "Environment Variables:"
    echo "  AUTOPM_DRY_RUN=true     Perform dry run without posting"
    echo "  AUTOPM_FORCE_SYNC=true  Skip confirmations for closed issues"
    echo "  AUTOPM_LOG_LEVEL=0      Enable debug logging"
    echo ""
    echo "Examples:"
    echo "  $0 123 /tmp/formatted-comment.md"
    echo "  $0 456 /tmp/completion-comment.md true"
    echo "  AUTOPM_DRY_RUN=true $0 789 /tmp/test-comment.md"
    echo ""
    echo "Output:"
    echo "  Prints comment URL on success"
    echo "  Returns 0 on success, non-zero on failure"
    echo ""
    echo "Error Recovery:"
    echo "  - If posting fails, the formatted comment is preserved"
    echo "  - You can manually post using: gh issue comment <number> --body-file <file>"
    echo "  - Check GitHub status: gh auth status"
    echo ""
    exit 1
fi

# Run main function
main "$@"