#!/bin/bash

# Docker-First Development Enforcement Hook
# Blocks local execution when docker-first is enabled (.claude/config.json:
# tools.docker.first, or features.docker_first_development).
#
# Registered by the installer as a Claude Code PreToolUse hook (matcher Bash) in
# .claude/settings.json. Claude Code passes {tool_name, tool_input} as JSON on stdin;
# exit 2 blocks the call and shows stderr to Claude. Manual use: <tool> <params-json>.

if [[ $# -gt 0 ]]; then
    TOOL_NAME="$1"
    TOOL_PARAMS="$2"
elif command -v jq &> /dev/null; then
    HOOK_INPUT=$(cat)
    TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
    TOOL_PARAMS=$(echo "$HOOK_INPUT" | jq -c '.tool_input // {}' 2>/dev/null)
fi

# Function to check if Docker-first is enabled
is_docker_first_enabled() {
    local config_file=".claude/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        return 1  # Disabled if no config file
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "⚠️  WARNING: jq not found, cannot check Docker-first status"
        return 1
    fi
    
    local enabled=$(jq -r '(.features.docker_first_development // false) or (.tools.docker.first // false)' "$config_file" 2>/dev/null)
    [[ "$enabled" == "true" ]]
}

# Function to check if command is in allowed exceptions
is_command_allowed() {
    local command="$1"
    local config_file=".claude/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        return 1
    fi
    
    local allowed_commands=$(jq -r '.exceptions.allow_local_commands[]? // empty' "$config_file" 2>/dev/null)
    
    for allowed_cmd in $allowed_commands; do
        if [[ "$command" == "$allowed_cmd"* ]]; then
            return 0
        fi
    done
    
    return 1
}

# Function to suggest Docker alternative
suggest_docker_alternative() {
    local command="$1"
    local suggestion=""
    
    case "$command" in
        npm*)
            suggestion="docker compose run --rm app $command"
            ;;
        yarn*)
            suggestion="docker compose run --rm app $command"
            ;;
        pip*)
            suggestion="docker compose run --rm app $command"
            ;;
        python*)
            suggestion="docker compose run --rm app $command"
            ;;
        pytest*)
            suggestion="docker compose run --rm test pytest"
            ;;
        node*)
            suggestion="docker compose run --rm app $command"
            ;;
        go*)
            suggestion="docker compose run --rm app $command"
            ;;
        *)
            suggestion="docker compose run --rm app $command"
            ;;
    esac
    
    echo "✅ USE: $suggestion"
}

# Function to check if Docker files exist
check_docker_files() {
    local missing_files=()
    
    [[ ! -f "Dockerfile" ]] && missing_files+=("Dockerfile")
    [[ ! -f "docker compose.yml" ]] && missing_files+=("docker compose.yml")
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        echo ""
        echo "📝 MISSING FILES: ${missing_files[*]}"
        echo "💡 TIP: Use docker-containerization-expert agent to create Docker files:"
        echo "   Task: Create Docker development environment for this project"
        echo ""
    fi
}

# Exit early if Docker-first is disabled
if ! is_docker_first_enabled; then
    exit 0  # Allow all operations when disabled
fi

# Only check Bash commands
if [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
fi

# Extract command from tool parameters
COMMAND=$(echo "$TOOL_PARAMS" | jq -r '.command // ""' 2>/dev/null)
if [[ -z "$COMMAND" ]]; then
    exit 0
fi

# Get first word of command
FIRST_WORD=$(echo "$COMMAND" | awk '{print $1}')

# Check if command is explicitly allowed
if is_command_allowed "$FIRST_WORD"; then
    exit 0
fi

# Everything below explains a block: send it to stderr, which Claude Code shows to Claude
exec 1>&2

# Block development commands that should run in Docker
case "$FIRST_WORD" in
    npm|yarn|pnpm)
        echo "❌ BLOCKED: Local package manager execution"
        echo "🐳 REASON: docker_first_development is enabled"
        suggest_docker_alternative "$COMMAND"
        check_docker_files
        exit 2
        ;;
    
    pip|pipenv|poetry)
        echo "❌ BLOCKED: Local Python package management"
        echo "🐳 REASON: docker_first_development is enabled"
        suggest_docker_alternative "$COMMAND"
        check_docker_files
        exit 2
        ;;
    
    python|python3)
        # Allow version checks and basic commands
        if echo "$COMMAND" | grep -qE "(--version|-V|--help|-h)"; then
            exit 0
        fi
        
        echo "❌ BLOCKED: Local Python execution"
        echo "🐳 REASON: docker_first_development is enabled"
        suggest_docker_alternative "$COMMAND"
        check_docker_files
        exit 2
        ;;
    
    node|nodejs)
        # Allow version checks
        if echo "$COMMAND" | grep -qE "(--version|-v|--help|-h)"; then
            exit 0
        fi
        
        echo "❌ BLOCKED: Local Node.js execution"
        echo "🐳 REASON: docker_first_development is enabled"
        suggest_docker_alternative "$COMMAND"
        check_docker_files
        exit 2
        ;;
    
    pytest|nose|unittest)
        echo "❌ BLOCKED: Local test execution"
        echo "🐳 REASON: docker_first_development is enabled"
        echo "✅ USE: docker compose -f docker compose.yml -f docker compose.test.yml run --rm test"
        check_docker_files
        exit 2
        ;;
    
    jest|mocha|vitest)
        echo "❌ BLOCKED: Local test execution"
        echo "🐳 REASON: docker_first_development is enabled"
        echo "✅ USE: docker compose run --rm app npm test"
        check_docker_files
        exit 2
        ;;
    
    go)
        # Allow version and basic commands
        if echo "$COMMAND" | grep -qE "(version|help)"; then
            exit 0
        fi
        
        if echo "$COMMAND" | grep -qE "(run|build|test)"; then
            echo "❌ BLOCKED: Local Go execution"
            echo "🐳 REASON: docker_first_development is enabled"
            suggest_docker_alternative "$COMMAND"
            check_docker_files
            exit 2
        fi
        ;;
    
    mvn|gradle)
        echo "❌ BLOCKED: Local Java build tool execution"
        echo "🐳 REASON: docker_first_development is enabled"
        suggest_docker_alternative "$COMMAND"
        check_docker_files
        exit 2
        ;;
esac

# Allow all other commands
exit 0