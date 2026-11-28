---
allowed-tools: Bash, Read, Write
---

# Azure DevOps Help

Display help information for Azure DevOps commands.

**Usage**: `/azure:help [command]`

**Examples**:
- `/azure:help` - Show all commands
- `/azure:help us-new` - Help for specific command

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### Display Help

```
📚 Azure DevOps Commands Help
═══════════════════════════════════════════════════════════════

QUICK START
─────────────────────────────────────────────────────────────
/azure:init                Initialize Azure DevOps integration
/azure:standup            Daily standup report
/azure:sprint-status      Current sprint dashboard
/azure:next-task          Get next recommended task

USER STORIES (Work with User Stories)
─────────────────────────────────────────────────────────────
/azure:us-new            Create new User Story
/azure:us-list           List User Stories
/azure:us-show <id>      Show User Story details
/azure:us-edit <id>      Edit User Story
/azure:us-parse <id>     Parse Story into Tasks
/azure:us-status [id]    Story status overview
/azure:import-us         Import from PRD/Epic

TASKS (Work with Tasks)
─────────────────────────────────────────────────────────────
/azure:task-new          Create new Task
/azure:task-list         List Tasks
/azure:task-show <id>    Show Task details
/azure:task-edit <id>    Edit Task
/azure:task-start <id>   Start working on Task
/azure:task-close <id>   Complete Task
/azure:task-status       Task status overview

FEATURES (Work with Features/Epics)
─────────────────────────────────────────────────────────────
/azure:feature-new       Create new Feature
/azure:feature-list      List Features
/azure:feature-start     Start Feature work
/azure:feature-decompose Break down Feature

WORKFLOW (Sprint & Team Management)
─────────────────────────────────────────────────────────────
/azure:sprint-status     Sprint dashboard
/azure:standup          Daily standup
/azure:active-work      Show active items
/azure:blocked-items    Show blocked items
/azure:next-task        Task recommendations

UTILITIES
─────────────────────────────────────────────────────────────
/azure:search <query>    Search work items
/azure:init             Initialize integration
/azure:help [cmd]       Show help

📖 Examples:
─────────────────────────────────────────────────────────────
# Start your day
/azure:standup
/azure:next-task --auto-start

# Create and work on a story
/azure:us-new "User login"
/azure:us-parse 34
/azure:task-start 101

# Check progress
/azure:sprint-status
/azure:us-status 34

💡 Tips:
─────────────────────────────────────────────────────────────
• Use TAB for command completion
• Add --help to any command for details
• Commands support shortcuts (e.g., 'us' for 'user-story')
• Most lists support filters (--status, --assigned-to, etc.)

📚 Documentation: .claude/commands/azure/README.md
🔧 Configuration: .claude/azure/config.yml
```

### Command-Specific Help

When specific command requested:

```
📖 Help: /azure:us-new

Create a new User Story in Azure DevOps

USAGE:
  /azure:us-new <story-name>

ARGUMENTS:
  story-name    Name for the User Story (kebab-case)

OPTIONS:
  --points      Story points (1,2,3,5,8,13,21)
  --sprint      Target sprint
  --assigned-to Assignee email
  --priority    Priority (1-4)

EXAMPLES:
  /azure:us-new user-authentication
  /azure:us-new login-flow --points=8 --sprint="Sprint 2"
  /azure:us-new api-integration --assigned-to=john@example.com

WORKFLOW:
  1. Creates User Story with interactive prompts
  2. Sets acceptance criteria
  3. Optionally parses into tasks
  4. Links to current sprint if specified

RELATED:
  /azure:us-parse    - Break story into tasks
  /azure:us-edit     - Edit existing story
  /azure:us-status   - Check story progress
```