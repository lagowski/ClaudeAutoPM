---
allowed-tools: Bash, Read, Write, LS, Task
---

# Issue Start

Begin work on an issue. Auto-detects local (Lite) or GitHub mode from git remote.

## Usage
```
/pm:issue-start <issue_id> [--analyze]
```

`issue_id` can be a local file ID (`demo-001`, `001`) or a GitHub issue number.

## Step 0 — Detect provider

```bash
ISSUE_ID=$(echo "$ARGUMENTS" | awk '{print $1}')
HAS_ANALYZE=$(echo "$ARGUMENTS" | grep -q '\-\-analyze' && echo "true" || echo "false")

PROVIDER="local"
if git remote get-url origin 2>/dev/null | grep -q "github.com"; then
  PROVIDER="github"
elif [ -n "$AZURE_DEVOPS_ORG" ] || [ -f ".azure" ]; then
  PROVIDER="azure"
fi
echo "Provider: $PROVIDER"
```

**PROVIDER=`local`** → LOCAL FLOW · **PROVIDER=`github`** → GITHUB FLOW

---

## LOCAL FLOW (Lite — no GitHub remote)

```bash
ISSUE_FILE=$(find .claude/issues -name "${ISSUE_ID}.md" 2>/dev/null | head -1)
[ -z "$ISSUE_FILE" ] && echo "❌ Not found: .claude/issues/${ISSUE_ID}.md — ls .claude/issues/" && exit 1
```

1. Update `status: open` → `status: in-progress` in frontmatter
2. Update `updated:` with `date -u +"%Y-%m-%dT%H:%M:%SZ"`
3. Add entry to `.claude/active-work.json`
4. Show issue content and begin working on it
5. Output: `🚀 Local issue $ISSUE_ID started — close with: /pm:issue-close $ISSUE_ID`

---

## GITHUB FLOW

### Quick Check

1. **Get issue details:**
   ```bash
   ISSUE_NUMBER=$ISSUE_ID
   gh issue view $ISSUE_NUMBER --json state,title,labels,body
   ```
   If it fails: "❌ Cannot access issue #$ISSUE_NUMBER. Check number or run: gh auth login"

2. **Find local task file:**
   ```bash
   # Primary: search frontmatter for github issue URL (works with any filename)
   task_file=$(grep -rl "github:.*issues/$ISSUE_NUMBER" .claude/epics/ 2>/dev/null | head -1)
   if [ -z "$task_file" ]; then
     # Fallback: check for issue-number filename
     task_file=$(find .claude/epics -name "$ISSUE_NUMBER.md" 2>/dev/null | head -1)
   fi
   ```
   - If not found: "❌ No local task for issue #$ISSUE_NUMBER. Import it first: /pm:import $ISSUE_NUMBER — then run /pm:issue-start $ISSUE_NUMBER again."
   - Use `$task_file` as the canonical path for ALL subsequent steps

3. **Check for analysis (when NOT using --analyze flag):**
   - Extract epic name from `$task_file` path: `epic_name=$(echo "$task_file" | sed 's|.claude/epics/||' | cut -d/ -f1)`
   - If `$HAS_ANALYZE` is "false", check if analysis file exists
   - Analysis file location: `.claude/epics/$epic_name/$ISSUE_NUMBER-analysis.md`
   - If no analysis AND `$HAS_ANALYZE` is "false": Stop and suggest using `--analyze` flag

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: git.

## TDD REMINDER - READ THIS FIRST

**CRITICAL: This project follows Test-Driven Development (TDD).**

Before ANY coding work begins, you MUST follow the RED → GREEN → REFACTOR cycle (see `.claude/rules/tdd-reminder.md`).

**For this issue:**
- Read the task requirements from the task file
- Identify what tests are needed BEFORE any implementation
- All agents must start with test creation
- No implementation without tests first

See `.claude/rules/tdd.enforcement.md` for complete TDD requirements.

---

## Instructions

### 0. Handle --analyze Flag (if provided)

If `$HAS_ANALYZE` is "true", delegate to the Node.js script:
```bash
node .claude/scripts/pm/issue-start.cjs $ISSUE_NUMBER --analyze
```

This script will:
1. Find the task file for the issue
2. Generate analysis file with parallel work streams
3. Create workspace structure
4. Launch parallel agents based on analysis
5. Handle all subsequent steps automatically

**STOP HERE** if using `--analyze` flag - the script handles everything.

---

### 1. Ensure Branch Exists (Non-analyze workflow)

Check if epic branch exists:
```bash
# Find epic name from task file
epic_name={extracted_from_path}

# Check branch
if ! git branch -a | grep -q "epic/$epic_name"; then
  echo "❌ No branch for epic. Run: /pm:epic-start $epic_name"
  exit 1
fi

# Check out the branch
git checkout epic/$epic_name
git pull origin epic/$epic_name
```

### 2. Read Analysis

Read `.claude/epics/{epic_name}/$ISSUE_NUMBER-analysis.md`:
- Parse parallel streams
- Identify which can start immediately
- Note dependencies between streams

### 3. Setup Progress Tracking

Get current datetime: `date -u +"%Y-%m-%dT%H:%M:%SZ"`

Create workspace structure:
```bash
mkdir -p .claude/epics/{epic_name}/updates/$ISSUE_NUMBER
```

Update task file frontmatter `updated` field with current datetime.

### 4. Launch Parallel Agents

For each stream that can start immediately:

Create `.claude/epics/{epic_name}/updates/$ISSUE_NUMBER/stream-{X}.md`:
```markdown
---
issue: $ISSUE_NUMBER
stream: {stream_name}
agent: {agent_type}
started: {current_datetime}
status: in_progress
---

# Stream {X}: {stream_name}

## Scope
{stream_description}

## Files
{file_patterns}

## Progress
- Starting implementation
```

Launch agent using Task tool:
```yaml
Task:
  description: "Issue #$ISSUE_NUMBER Stream {X}"
  subagent_type: "{agent_type}"
  prompt: |
    **CRITICAL RULE #1: Test-Driven Development (TDD) is MANDATORY**

    You MUST follow the RED-GREEN-REFACTOR cycle:
    1. **RED**: Write a FAILING test first that describes the desired behavior
    2. **GREEN**: Write MINIMUM code to make the test pass
    3. **REFACTOR**: Clean up code while keeping all tests green

    **NO CODE WITHOUT TESTS FIRST.** Zero exceptions.
    - Every function starts with a test
    - Every bug fix starts with a test that reproduces it
    - Every feature starts with failing acceptance tests

    See `.claude/rules/tdd.enforcement.md` for complete requirements.

    ---

    **CRITICAL RULE #2: This project uses 'Docker-first development'.**
    - All commands (dependency installation, tests, running the application) MUST be executed inside a Docker container using `docker compose run --rm <service_name> <command>`.
    - DO NOT run `npm`, `pip`, `pytest`, etc., directly on the host.
    - The source code is mounted as a VOLUME, so file changes will be immediately visible in the container (hot-reloading).
    - Full rules can be found in `.claude/rules/docker-first-development.md`.

    ---

    You are working on Issue #$ISSUE_NUMBER in the epic branch.

    Branch: epic/{epic_name}
    Your stream: {stream_name}

    Your scope:
    - Files to modify: {file_patterns}
    - Work to complete: {stream_description}

    Requirements:
    1. Read full task from: .claude/epics/{epic_name}/{task_file}
    2. **START WITH TESTS**: Write failing tests BEFORE any implementation
    3. Work ONLY in your assigned files
    4. Follow TDD cycle: RED (test fails) → GREEN (minimal code) → REFACTOR (cleanup)
    5. Commit frequently with format: "Issue #$ISSUE_NUMBER: {specific change}"
    6. Update progress in: .claude/epics/{epic_name}/updates/$ISSUE_NUMBER/stream-{X}.md
    7. Follow coordination rules in /rules/agent-coordination.md

    If you need to modify files outside your scope:
    - Check if another stream owns them
    - Wait if necessary
    - Update your progress file with coordination notes

    Complete your stream's work and mark as completed when done.
```

### 5. GitHub Assignment

```bash
# Assign to self and mark in-progress
gh issue edit $ISSUE_NUMBER --add-assignee @me --add-label "in-progress"
```

### 6. Output

```
Started parallel work on issue #$ISSUE_NUMBER

Epic: {epic_name}
Branch: epic/{epic_name}

Launching {count} parallel agents:
  Stream A: {name} (Agent-1) - Started
  Stream B: {name} (Agent-2) - Started
  Stream C: {name} - Waiting (depends on A)

Progress tracking:
  .claude/epics/{epic_name}/updates/$ISSUE_NUMBER/

TDD CHECKLIST - All agents MUST follow:
  1. RED: Write failing test
  2. GREEN: Make test pass (minimal code)
  3. REFACTOR: Clean up code

Monitor with: /pm:epic-status {epic_name}
Sync updates: /pm:issue-sync $ISSUE_NUMBER
```

## Error Handling

If any step fails, report clearly:
- "❌ {What failed}: {How to fix}"
- Continue with what's possible
- Never leave partial state

## Important Notes

Follow `/rules/datetime.md` for timestamps.
Keep it simple - trust that GitHub and file system work.
