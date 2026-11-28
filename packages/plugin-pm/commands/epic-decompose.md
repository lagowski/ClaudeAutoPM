---
allowed-tools: Bash, Read, Write, LS, Task
---

# Epic Decompose

Break epic into concrete, actionable tasks.

**⚠️ IMPORTANT**: This is a Claude Code command file, not a standalone script.
- Execute via Claude Code as: `/pm:epic-decompose <feature_name>`
- Do NOT run as: `node .claude/scripts/pm/epic-decompose.js`
- This command has no standalone script equivalent

## Usage

**Single Epic:**
```bash
/pm:epic-decompose <feature_name> [--local]
```

**Multi-Epic (decomposes ALL epics at once):**
```bash
/pm:epic-decompose <feature_name> [--local]
# Example: /pm:epic-decompose ecommerce-platform --local
# This will automatically decompose ALL epics:
#   - 01-infrastructure
#   - 02-auth-backend
#   - 03-product-api
#   - etc.
```

**Single Epic from Multi-Epic structure:**
```bash
/pm:epic-decompose <feature_name>/<epic_folder> [--local]
# Example: /pm:epic-decompose ecommerce-platform/01-infrastructure --local
```

## Flags

`--local`, `-l`
: Use local mode (offline workflow)
: Creates task files in `.claude/epics/` directory structure
: No GitHub/Azure synchronization
: Task files remain local-only until manually synced
: Ideal for offline work or projects without remote tracking

Example:
```
/pm:epic-decompose user-authentication --local
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Agent Selection Strategy

Based on the PRD content and technical requirements, automatically determine which specialized agents should be assigned to tasks.

### Step 1: Analyze PRD for Technology Stack

Read `.claude/prds/$ARGUMENTS.md` and identify:
- **Programming languages** mentioned (Python, JavaScript/TypeScript, Go, Bash, etc.)
- **Frameworks** required (React, FastAPI, Next.js, Express, etc.)
- **Databases** needed (PostgreSQL, MongoDB, Redis, etc.)
- **Cloud platforms** (AWS, Azure, GCP)
- **Infrastructure** tools (Docker, Kubernetes, Terraform)
- **Testing** requirements (unit, integration, E2E)
- **CI/CD** platforms (GitHub Actions, Azure DevOps, GitLab CI)

### Step 2: Map Technologies to Specialized Agents

**Programming Languages**:
- Python → `.claude/agents/languages/python-backend-engineer.md`
- JavaScript/TypeScript/Node.js → `.claude/agents/languages/nodejs-backend-engineer.md`
- React → `.claude/agents/frontend/react-frontend-engineer.md`
- Bash/Shell scripting → `.claude/agents/languages/bash-scripting-expert.md`

**Databases**:
- PostgreSQL → `.claude/agents/databases/postgresql-expert.md`
- MongoDB → `.claude/agents/databases/mongodb-expert.md`
- Redis → `.claude/agents/databases/redis-expert.md`
- Cosmos DB → `.claude/agents/databases/cosmosdb-expert.md`

**Cloud Platforms**:
- AWS → `.claude/agents/cloud/aws-cloud-architect.md`
- Azure → `.claude/agents/cloud/azure-cloud-architect.md`
- GCP → `.claude/agents/cloud/gcp-cloud-architect.md`

**Infrastructure & Containers**:
- Docker → `.claude/agents/containers/docker-containerization-expert.md`
- Kubernetes → `.claude/agents/orchestration/kubernetes-orchestrator.md`
- Terraform → `.claude/agents/infrastructure/terraform-infrastructure-expert.md`

**Testing**:
- Unit/Integration tests → `.claude/agents/core/test-runner.md`
- Frontend E2E testing → `.claude/agents/testing/frontend-testing-engineer.md`
- E2E automation → `.claude/agents/testing/e2e-test-engineer.md`

**DevOps & CI/CD**:
- GitHub operations → `.claude/agents/devops/github-operations-specialist.md`
- Azure DevOps → `.claude/agents/devops/azure-devops-specialist.md`
- Observability → `.claude/agents/devops/observability-engineer.md`

### Step 3: Document Agent Assignments in Epic Frontmatter

Add `required_agents` array to epic.md frontmatter:

```yaml
---
name: user-authentication
prd: user-authentication
status: backlog
created: 2025-12-17T10:00:00Z
updated: 2025-12-17T10:00:00Z
required_agents:
  - path: .claude/agents/languages/python-backend-engineer.md
    role: API implementation
    tasks: [001, 002, 003]
  - path: .claude/agents/databases/postgresql-expert.md
    role: Database schema and migrations
    tasks: [004, 005]
  - path: .claude/agents/testing/frontend-testing-engineer.md
    role: Test suite development
    tasks: [006, 007]
  - path: .claude/agents/devops/github-operations-specialist.md
    role: CI/CD pipeline setup
    tasks: [008]
---
```

### Step 4: Assign Agents to Individual Tasks

Each task file should include `assigned_agent` in frontmatter:

```yaml
---
name: Implement JWT authentication endpoints
status: open
created: 2025-12-17T10:00:00Z
updated: 2025-12-17T10:00:00Z
assigned_agent: .claude/agents/languages/python-backend-engineer.md
agent_context:
  framework: fastapi
  auth_method: jwt
  libraries: [pyjwt, passlib]
github: [Will be updated when synced to GitHub]
depends_on: [004]  # Depends on user schema
parallel: true
conflicts_with: []
---
```

**Benefits of Agent Assignment**:
- ✅ Automatic selection of specialized agents based on technology
- ✅ Clear agent responsibilities per task
- ✅ Easier task assignment when starting work
- ✅ Better parallel execution planning with appropriate agents
- ✅ Consistent expertise application across similar tasks

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

1. **Verify epic exists:**
   - Check if `.claude/epics/$ARGUMENTS` directory exists
   - Check for either:
     a) Single epic: `.claude/epics/$ARGUMENTS/epic.md` exists
     b) Multiple epics: Subdirectories like `.claude/epics/$ARGUMENTS/01-infrastructure/epic.md`
   - If neither found, tell user: "❌ Epic not found: $ARGUMENTS. First create it with: /pm:prd-parse $ARGUMENTS or /pm:epic-split $ARGUMENTS"
   - Stop execution if no epics found

2. **Detect epic structure:**
   - If `.claude/epics/$ARGUMENTS/epic.md` exists → Single epic mode
   - If subdirectories with epic.md files exist → Multi-epic mode
   - Store the mode for later processing

3. **Check for existing tasks:**
   - For single epic: Check `.claude/epics/$ARGUMENTS/` for numbered task files
   - For multi-epic: Check each subdirectory for numbered task files
   - If tasks exist, list them and ask: "⚠️ Found {count} existing tasks. Delete and recreate all tasks? (yes/no)"
   - Only proceed with explicit 'yes' confirmation
   - If user says no, suggest: "View existing tasks with: /pm:epic-show $ARGUMENTS"

4. **Validate epic frontmatter:**
   - For single epic: Verify `.claude/epics/$ARGUMENTS/epic.md` has valid frontmatter
   - For multi-epic: Verify each subdirectory's epic.md has valid frontmatter
   - If invalid, tell user which epic file has invalid frontmatter

5. **Check epic status:**
   - For each epic, check if status is already "completed"
   - If any epic is completed, warn user: "⚠️ Epic(s) marked as completed. Are you sure you want to decompose again?"

## ⚠️ TDD REMINDER

**CRITICAL: All tasks MUST follow Test-Driven Development (TDD).**

When creating tasks, ensure each task includes:
- TDD Requirements section (RED-GREEN-REFACTOR cycle)
- "Tests written FIRST" as first item in Definition of Done
- References to `.claude/rules/tdd.enforcement.md`

Every generated task file will remind developers to write tests first.

---

## Instructions

You are decomposing epic(s) into specific, actionable tasks for: **$ARGUMENTS**

### 1. Determine Processing Mode

**Single Epic Mode:**
- Process `.claude/epics/$ARGUMENTS/epic.md`
- Create tasks in `.claude/epics/$ARGUMENTS/`

**Multi-Epic Mode (from epic-split):**
- Find all subdirectories in `.claude/epics/$ARGUMENTS/`
- Process each subdirectory's epic.md file separately
- Create tasks in each respective subdirectory
- Show progress for each epic being processed

### 2. Read the Epic(s)
- For single epic: Load from `.claude/epics/$ARGUMENTS/epic.md`
- For multi-epic: Load each `.claude/epics/$ARGUMENTS/*/epic.md`
- Understand the technical approach and requirements
- Review the task breakdown preview

### 3. Analyze PRD and Select Agents

**IMPORTANT**: Before creating tasks, determine which specialized agents should be used:

1. **Read the PRD** from `.claude/prds/$ARGUMENTS.md` (or linked PRD in epic frontmatter)

2. **Identify Technology Stack**:
   - Scan for programming languages (Python, JavaScript, Go, etc.)
   - Find frameworks (React, FastAPI, Django, Express, etc.)
   - Note databases (PostgreSQL, MongoDB, Redis, etc.)
   - Identify cloud platforms (AWS, Azure, GCP)
   - Check for infrastructure tools (Docker, K8s, Terraform)

3. **Map to Specialized Agents** using the Agent Selection Strategy section above:
   - **Backend tasks** → `python-backend-engineer` or `nodejs-backend-engineer`
   - **Frontend tasks** → `react-frontend-engineer` or `javascript-frontend-engineer`
   - **Database tasks** → `postgresql-expert`, `mongodb-expert`, or `redis-expert`
   - **Cloud tasks** → `aws-cloud-architect`, `azure-cloud-architect`, or `gcp-cloud-architect`
   - **Container tasks** → `docker-containerization-expert`
   - **Orchestration** → `kubernetes-orchestrator`
   - **IaC tasks** → `terraform-infrastructure-expert`
   - **Testing** → `test-runner`, `frontend-testing-engineer`, `e2e-test-engineer`
   - **CI/CD** → `github-operations-specialist` or `azure-devops-specialist`

4. **Update Epic Frontmatter** with `required_agents` array (see Agent Selection Strategy section)

5. **Prepare Agent Assignments** for each task to be created

**Example**:
```markdown
Technology Stack Detected:
- Backend: Python + FastAPI
- Database: PostgreSQL
- Testing: pytest
- Deployment: Docker

Agent Mapping:
- Tasks 001-003 (API): python-backend-engineer
- Tasks 004-005 (Database): postgresql-expert
- Tasks 006-007 (Tests): test-runner
- Task 008 (Docker): docker-containerization-expert
```

### 4. Analyze for Parallel Creation

Determine if tasks can be created in parallel:
- If tasks are mostly independent: Create in parallel using Task agents
- If tasks have complex dependencies: Create sequentially
- For best results: Group independent tasks for parallel creation

### 5. Parallel Task Creation (When Possible)

If tasks can be created in parallel, spawn sub-agents.

**IMPORTANT**: Do NOT use generic "general-purpose" agents. Task creation should be done directly by Claude Code, not delegated to sub-agents, as it requires careful analysis of PRD, agent selection, and proper frontmatter generation.

**Task Creation Process**:
1. For each task, determine the appropriate `assigned_agent` based on PRD analysis
2. Create task file with complete frontmatter including agent assignment
3. Generate proper task content with all required sections
4. Ensure sequential numbering (001.md, 002.md, etc.)

**Example Task Creation**:
```markdown
Creating task 001 (API endpoint):
- assigned_agent: .claude/agents/languages/python-backend-engineer.md
- agent_context: {framework: "fastapi", auth: "jwt"}
- File: .claude/epics/$ARGUMENTS/001.md
✓ Created

Creating task 002 (Database schema):
- assigned_agent: .claude/agents/databases/postgresql-expert.md
- agent_context: {orm: "sqlalchemy", migrations: "alembic"}
- File: .claude/epics/$ARGUMENTS/002.md
✓ Created
```

### 4. MANDATORY: Read Issue Template Before Creating Tasks

**CRITICAL**: Before creating ANY task, read the issue template:
```
Read .claude/templates/issue.xml
Read .claude/rules/issue-structure.xml
```

Every task file MUST include ALL required sections from `issue.xml`. Missing sections = auto-reject.

### 5. Task File Format with Frontmatter
For each task, create a file with this exact structure:

```markdown
---
name: [Task Title]
status: open
priority: [critical/high/medium/low]
effort: [S/M/L/XL]
created: [Current ISO date/time]
updated: [Current ISO date/time]
assigned_agent: .claude/agents/{category}/{agent-name}.md
agent_context:
  framework: [framework_name]
  language: [language_name]
github: [Will be updated when synced to GitHub]
depends_on: []
parallel: true
conflicts_with: []
---

# Task: [Task Title]

## Goal
[One sentence: WHAT this task delivers and WHY it matters]

## Context
[WHY this task exists — what triggered it, what currently works/doesn't,
 what must be in place first. Include specific file paths, URLs, services.]

## Acceptance Criteria
- [ ] Specific, measurable criterion 1
- [ ] Specific, measurable criterion 2
- [ ] Specific, measurable criterion 3

## Affected Files
- `path/to/file.ts` — [what changes]
- `path/to/test.ts` — [new test file]

## Related Issues
- depends on #NNN — [why]
- blocks #NNN — [why]
- (or "None" if standalone)

## Verification Steps
[Concrete commands to verify this task is done:]
- `npm test -- --filter=feature` → all pass
- `curl http://localhost:3000/api/endpoint` → 200
- `kubectl get pods -n app` → Running

## Definition of Done
- [ ] Tests written FIRST (RED phase)
- [ ] Code implemented (GREEN phase)
- [ ] Code refactored (REFACTOR phase)
- [ ] All tests passing
- [ ] Verification steps confirmed
- [ ] PR approved and merged

## ⚠️ TDD Requirements
1. 🔴 RED: Write failing test first
2. 🟢 GREEN: Write minimal code to make test pass
3. 🔵 REFACTOR: Clean up code while keeping tests green

## Technical Constraints
[Stack, patterns, prohibitions — optional but recommended]

## Out of Scope
[What NOT to touch — prevents AI from "improving" neighbors]
```

### 3. Task Naming Convention

**For Single Epic:**
Save tasks as: `.claude/epics/$ARGUMENTS/{task_number}.md`

**For Multi-Epic:**
Save tasks as: `.claude/epics/$ARGUMENTS/{epic_folder}/{task_number}.md`
Example: `.claude/epics/ecommerce/01-infrastructure/001.md`

- Use sequential numbering: 001.md, 002.md, etc.
- Keep task titles short but descriptive
- Each epic gets its own task number sequence

### 4. Frontmatter Guidelines
- **name**: Use a descriptive task title (without "Task:" prefix)
- **status**: Always start with "open" for new tasks
- **created**: Get REAL current datetime by running: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
- **updated**: Use the same real datetime as created for new tasks
- **assigned_agent**: Path to specialized agent file (e.g., `.claude/agents/languages/python-backend-engineer.md`)
  - Select based on technology stack from PRD
  - Use most specific agent for the task type
  - See Agent Selection Strategy section for mapping
- **agent_context**: Optional object with agent-specific configuration
  - **framework**: Specific framework being used (e.g., "fastapi", "react", "express")
  - **language**: Programming language if multiple options (e.g., "python", "typescript")
  - **approach**: Implementation approach or pattern to use
  - Add any task-specific parameters the agent needs
- **github**: Leave placeholder text - will be updated during sync
- **depends_on**: List task numbers that must complete before this can start (e.g., [001, 002])
- **parallel**: Set to true if this can run alongside other tasks without conflicts
- **conflicts_with**: List task numbers that modify the same files (helps coordination)

### 5. Task Types to Consider
- **Setup tasks**: Environment, dependencies, scaffolding
- **Data tasks**: Models, schemas, migrations
- **API tasks**: Endpoints, services, integration
- **UI tasks**: Components, pages, styling
- **Testing tasks**: Unit tests, integration tests
- **Documentation tasks**: README, API docs
- **Deployment tasks**: CI/CD, infrastructure

### 6. Parallelization
Mark tasks with `parallel: true` if they can be worked on simultaneously without conflicts.

### 7. Execution Strategy

Choose based on task count and complexity:

**Small Epic (< 5 tasks)**: Create sequentially for simplicity

**Medium Epic (5-10 tasks)**:
- Batch into 2-3 groups
- Spawn agents for each batch
- Consolidate results

**Large Epic (> 10 tasks)**:
- Analyze dependencies first
- Group independent tasks
- Launch parallel agents (max 5 concurrent)
- Create dependent tasks after prerequisites

Example for parallel execution:
```markdown
Spawning 3 agents for parallel task creation:
- Agent 1: Creating tasks 001-003 (Database layer)
- Agent 2: Creating tasks 004-006 (API layer)
- Agent 3: Creating tasks 007-009 (UI layer)
```

**Multi-Epic Processing Example:**
```markdown
Processing multiple epics from split:

📂 01-infrastructure/epic.md
   Creating 8 tasks...
   ✅ Done

📂 02-auth-backend/epic.md
   Creating 12 tasks...
   ✅ Done

📂 03-frontend/epic.md
   Creating 10 tasks...
   ✅ Done
```

### 8. Task Dependency Validation

When creating tasks with dependencies:
- Ensure referenced dependencies exist (e.g., if Task 003 depends on Task 002, verify 002 was created)
- Check for circular dependencies (Task A → Task B → Task A)
- If dependency issues found, warn but continue: "⚠️ Task dependency warning: {details}"

### 9. Update Epic with Task Summary
After creating all tasks, update the epic file by adding this section:
```markdown
## Tasks Created
- [ ] 001.md - {Task Title} (parallel: true/false)
- [ ] 002.md - {Task Title} (parallel: true/false)
- etc.

Total tasks: {count}
Parallel tasks: {parallel_count}
Sequential tasks: {sequential_count}
Estimated total effort: {sum of hours}
```

Also update the epic's frontmatter progress if needed (still 0% until tasks actually start).

### 9. Quality Validation

Before finalizing tasks, verify:
- [ ] All tasks have clear acceptance criteria
- [ ] Task sizes are reasonable (1-3 days each)
- [ ] Dependencies are logical and achievable
- [ ] Parallel tasks don't conflict with each other
- [ ] Combined tasks cover all epic requirements

### 10. Post-Decomposition

**For Single Epic:**
After successfully creating tasks:
1. Confirm: "✅ Created {count} tasks for epic: $ARGUMENTS"
2. Show summary:
   - Total tasks created
   - Parallel vs sequential breakdown
   - Total estimated effort
3. Suggest next step: "Ready to sync to GitHub? Run: /pm:epic-sync $ARGUMENTS"

**For Multi-Epic:**
After processing all epics:
1. Show per-epic summary:
   ```
   ✅ Epic Decomposition Complete

   📂 01-infrastructure: 8 tasks created
   📂 02-auth-backend: 12 tasks created
   📂 03-frontend: 10 tasks created

   Total: 30 tasks across 3 epics
   ```
2. Show combined statistics:
   - Total tasks across all epics
   - Total estimated effort
   - Breakdown by epic
3. Suggest next step: "Ready to sync all epics? Run: /pm:epic-sync $ARGUMENTS"

## Error Recovery

If any step fails:
- If task creation partially completes, list which tasks were created
- Provide option to clean up partial tasks
- Never leave the epic in an inconsistent state

Aim for tasks that can be completed in 1-3 days each. Break down larger tasks into smaller, manageable pieces for the "$ARGUMENTS" epic.
