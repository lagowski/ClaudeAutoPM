---
allowed-tools: Read, Write, Edit, Bash, Glob
---

# Context Update

Update project context after significant changes to maintain AI agent memory accuracy.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Instructions

Intelligently update project context files based on detected changes.

### 1. Verify context exists

```bash
if [ ! -d ".claude/context" ]; then
  echo "❌ Context not found. Run /pm:context-create first."
  exit 1
fi
```

### 2. Detect changes since last update

**Check multiple sources for changes:**

1. **package.json changes:**
   - Compare current dependencies with tech-context.md
   - Detect new dependencies added
   - Identify version updates
   - Note removed dependencies

2. **Directory structure changes:**
   - Scan current directory structure
   - Compare with project-structure.md
   - Detect new directories
   - Note removed directories

3. **Git history (if available):**
   - Check recent commits since last context update
   - Extract meaningful changes from commit messages
   - Identify completed features/tasks

4. **README.md changes:**
   - Compare current README with project-brief.md
   - Detect updated project description
   - Note new features or objectives

### 3. Update relevant files

**Update tech-context.md if tech stack changed:**

If new dependencies detected:
```markdown
## Dependencies
[Existing dependencies]

**Recently Added:**
- [new-package-name]: [Purpose/description]
  Added: [Date]
```

If versions changed:
```markdown
## Development Environment
- Node.js: [new version] (updated from [old version])
```

**Update progress.md for project progress:**

Always update:
1. **Last Updated timestamp** to current date
2. Move completed items from "In Progress" to "Completed"
3. Update progress percentage based on completed tasks
4. Add new tasks to "In Progress" or "Next Steps"
5. Update or remove blockers

Example update:
```markdown
## Current Status
- Phase: [Current phase]
- Progress: [Updated]%
- Last Updated: [Current date]

## Completed
- [x] [Previously in-progress task now completed]
- [x] [Another completed task]

## In Progress
- [ ] [New current task]
- [ ] [Another current task]

## Next Steps
1. [Updated next action]
2. [New next action]

## Blockers
- [Updated or new blocker, or note "None" if resolved]

## Recent Updates
- [Date]: [Description of recent change]
- [Date]: [Description of recent change]
```

**Update project-structure.md if structure changed:**

If new directories detected:
```markdown
## Directory Layout
```
project/
├── src/           # Source code
├── test/          # Tests
├── .claude/       # AutoPM configuration
├── [new-dir]/     # [Purpose of new directory]
└── docs/          # Documentation
```
```

If new key files added:
```markdown
## Key Files
- **[new-file]**: [Purpose and description]
```

**Update project-brief.md if scope changed:**

Only if README.md or objectives significantly changed:
- Update project description
- Add new objectives
- Update success criteria
- Note scope expansions or reductions

### 4. Generate change summary

Track what was updated:
```json
{
  "updatedFiles": [],
  "changes": {
    "techContext": {
      "addedDependencies": [],
      "updatedVersions": [],
      "removedDependencies": []
    },
    "progress": {
      "completedTasks": [],
      "newTasks": [],
      "progressIncrease": "X%",
      "resolvedBlockers": []
    },
    "structure": {
      "newDirectories": [],
      "newFiles": []
    },
    "brief": {
      "updated": false,
      "changes": []
    }
  }
}
```

### 5. Smart update logic

**Only update files with actual changes:**

```javascript
// Pseudocode for update logic
if (techStackChanged) {
  updateTechContext();
  updatedFiles.push("tech-context.md");
}

if (progressChanged || tasksCompleted) {
  updateProgress();
  updatedFiles.push("progress.md");
}

if (structureChanged) {
  updateProjectStructure();
  updatedFiles.push("project-structure.md");
}

if (scopeChanged) {
  updateProjectBrief();
  updatedFiles.push("project-brief.md");
}

// Always update progress.md with "Last Updated" timestamp
if (!updatedFiles.includes("progress.md")) {
  updateProgressTimestamp();
  updatedFiles.push("progress.md");
}
```

### 6. Confirm updates

Display comprehensive update summary:

```
✅ Context updated

══════════════════════════════════════════════════════════════════

📝 UPDATED FILES
  - tech-context.md
  - progress.md
  - project-structure.md

══════════════════════════════════════════════════════════════════

🔧 TECH CONTEXT CHANGES
  Added Dependencies:
  - [new-package]: [Purpose]

  Updated Versions:
  - Node.js: [old] → [new]

══════════════════════════════════════════════════════════════════

📊 PROGRESS UPDATES
  Completed Tasks:
  ✅ [Task 1]
  ✅ [Task 2]

  Progress: [Old]% → [New]%
  Phase: [Phase name]

  Next Steps:
  1. [Next action]
  2. [Next action]

══════════════════════════════════════════════════════════════════

📁 STRUCTURE CHANGES
  New Directories:
  + [new-dir]/  # [Purpose]

  New Key Files:
  + [new-file]  # [Purpose]

══════════════════════════════════════════════════════════════════

💡 RECOMMENDATIONS
  - Run /pm:context-prime to reload updated context
  - Consider updating project-brief.md if objectives changed
  - [Other relevant recommendations]

══════════════════════════════════════════════════════════════════
```

### 7. Handle no-change scenario

If no changes detected:

```
ℹ️  No significant changes detected since last update

Context is up-to-date:
- Tech stack: No changes
- Progress: No new completions
- Structure: No changes
- Last updated: [Date from progress.md]

💡 Context will be updated when changes are detected:
  - New dependencies in package.json
  - New directories or files
  - Changes to README.md
  - Git commits (if available)
```

## Output Format

Return:
- List of updated files
- Detailed change summary for each file
- Recommendations based on changes
- Prompt to reload context if significant updates made
