---
allowed-tools: Bash, Read, Write, Glob
---

# Context Create

Initialize project context documentation for AI agent memory.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Instructions

Create comprehensive project context in `.claude/context/` directory.

### 1. Check if context already exists

```bash
if [ -d ".claude/context" ]; then
  echo "⚠️  Context already exists. Use /pm:context-update to modify."
  exit 1
fi
```

### 2. Create context directory structure

```bash
mkdir -p .claude/context
```

### 3. Copy and customize templates

**Read templates from AutoPM installation:**
- `.claude/templates/context-templates/project-brief.md.template`
- `.claude/templates/context-templates/tech-context.md.template`
- `.claude/templates/context-templates/progress.md.template`
- `.claude/templates/context-templates/project-structure.md.template`

### 4. Auto-populate with project information

**Analyze project and pre-fill templates:**

1. **Read package.json** for tech stack:
   - Extract dependencies and devDependencies
   - Determine Node.js version from engines
   - Identify testing framework (Jest, Mocha, etc.)
   - Detect package manager from lock files

2. **Read README.md** for project description:
   - Extract project name and description
   - Identify key features and objectives
   - Find usage examples

3. **Detect directory structure:**
   - Scan top-level directories
   - Identify common patterns (src/, test/, docs/, etc.)
   - Map key configuration files

4. **Initialize progress:**
   - Set initial phase as "Setup" or "Development"
   - Mark context creation as first completed task
   - Set progress to appropriate starting percentage

### 5. Create context README

Write `.claude/context/README.md`:

```markdown
# Project Context

This directory maintains comprehensive project information for AI agents.

## Files
- **project-brief.md**: Project scope and objectives
- **tech-context.md**: Technology stack and dependencies
- **progress.md**: Current status and next steps
- **project-structure.md**: Directory layout and key files

## Usage
- `/pm:context-prime`: Load context for new session
- `/pm:context-update`: Update after changes
- `/pm:context`: View current context

## Maintenance
Keep these files updated as the project evolves. Run `/pm:context-update` after:
- Adding new dependencies
- Completing major tasks
- Changing project structure
- Updating technical stack
```

### 6. Write populated templates

Create the following files in `.claude/context/`:
- `project-brief.md` (populated from README and package.json)
- `tech-context.md` (populated from package.json and file detection)
- `progress.md` (initialized with setup phase)
- `project-structure.md` (populated from directory scan)

### 7. Confirm creation

Display success message:

```
✅ Context created in .claude/context/

📝 Files created:
   - project-brief.md (auto-populated from README)
   - tech-context.md (auto-populated from package.json)
   - progress.md (initialized)
   - project-structure.md (auto-populated from directory scan)
   - README.md (usage guide)

💡 Next steps:
   1. Review and customize the context files
   2. Run /pm:context-prime to load context into session
   3. Update regularly with /pm:context-update
```

## Output Format

Return a structured summary of:
- Files created with auto-populated content preview
- Any information that couldn't be auto-detected
- Recommendations for manual customization
