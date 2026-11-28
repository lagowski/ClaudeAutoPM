---
allowed-tools: Read, Bash
---

# Context Prime

Load project context into current AI session for better understanding and continuity.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Instructions

Load comprehensive project context into the current AI session.

### 1. Verify context exists

```bash
if [ ! -d ".claude/context" ]; then
  echo "❌ Context not found. Run /pm:context-create first."
  exit 1
fi
```

### 2. Read all context files

Read in order:
1. `.claude/context/project-brief.md` - Project overview and objectives
2. `.claude/context/tech-context.md` - Technical stack and dependencies
3. `.claude/context/project-structure.md` - Directory layout and organization
4. `.claude/context/progress.md` - Current status and next steps

### 3. Process and internalize context

**Parse key information:**

From **project-brief.md**:
- Project name and description
- Primary objectives and goals
- Target users and stakeholders
- Key constraints and limitations
- Success criteria

From **tech-context.md**:
- Technology stack (frontend, backend, database, infrastructure)
- Development environment (Node.js version, package manager, testing framework)
- Key dependencies and their purposes
- Architecture patterns in use
- Development practices

From **project-structure.md**:
- Directory layout and organization
- Key files and their purposes
- Module structure
- Configuration files

From **progress.md**:
- Current phase and progress percentage
- Completed tasks
- In-progress tasks
- Next steps
- Any blockers

### 4. Display loaded context summary

Present a comprehensive summary:

```
📋 Project Context Loaded

══════════════════════════════════════════════════════════════════

PROJECT: [Project Name]
PHASE: [Current Phase] | PROGRESS: [X]%
LAST UPDATED: [Date from progress.md]

══════════════════════════════════════════════════════════════════

🎯 OBJECTIVES
  - [Primary goal]
  - [Secondary goal]
  - [Tertiary goal]

🔧 TECH STACK
  - Frontend: [Technologies]
  - Backend: [Technologies]
  - Database: [Database]
  - Testing: [Framework]

📁 STRUCTURE
  [Brief structure overview]

✅ COMPLETED
  - [Recent completed task 1]
  - [Recent completed task 2]

🚧 IN PROGRESS
  - [Current task 1]
  - [Current task 2]

⏭️  NEXT STEPS
  1. [Next action 1]
  2. [Next action 2]

⚠️  BLOCKERS
  - [Blocker 1, if any]

══════════════════════════════════════════════════════════════════

✅ Context loaded. AI agent now has project memory.

💡 TIP: Run /pm:context-update after significant changes to keep context current.
```

### 5. Internal context retention

**CRITICAL:** After displaying the summary, the AI agent should:

1. **Retain project identity**: Remember project name, goals, and constraints
2. **Understand technical environment**: Keep tech stack and dependencies in mind
3. **Maintain progress awareness**: Know what's done, what's in progress, what's next
4. **Respect project structure**: Work within established organization patterns
5. **Align with practices**: Follow development practices outlined in context

This context should guide all subsequent interactions in the session:
- Suggestions should align with project objectives
- Recommendations should fit the tech stack
- Changes should consider current progress
- Code should match project structure

### 6. Confirmation

Return structured confirmation:

```json
{
  "status": "loaded",
  "project": "[Project Name]",
  "phase": "[Current Phase]",
  "progress": "[X]%",
  "filesRead": [
    "project-brief.md",
    "tech-context.md",
    "project-structure.md",
    "progress.md"
  ],
  "keyTakeaways": [
    "[Important point 1]",
    "[Important point 2]",
    "[Important point 3]"
  ]
}
```

## Output Format

Return:
- Formatted context summary (as shown above)
- Key information highlighted
- Current focus areas
- Recommendations based on loaded context
