# Azure DevOps Command Aliases

Quick shortcuts for frequently used Azure DevOps commands.

## User Story Aliases

```bash
# Short forms
/az:us-new      → /azure:us-new
/az:us          → /azure:us-list
/az:story       → /azure:us-show
/az:parse       → /azure:us-parse

# Common workflows
/az:new-story   → /azure:us-new
/az:stories     → /azure:us-list
/az:import      → /azure:import-us
```

## Task Aliases

```bash
# Short forms
/az:task        → /azure:task-list
/az:start       → /azure:task-start
/az:done        → /azure:task-close
/az:t           → /azure:task-show

# Workflow shortcuts
/az:begin       → /azure:task-start
/az:finish      → /azure:task-close
/az:complete    → /azure:task-close --create-pr
/az:my-tasks    → /azure:task-list --assigned-to=me
```

## Sprint & Daily Aliases

```bash
# Daily workflow
/az:daily       → /azure:standup
/az:standup     → /azure:standup
/az:sprint      → /azure:sprint-status
/az:next        → /azure:next-task
/az:blocked     → /azure:blocked-items

# Status checks
/az:status      → /azure:sprint-status
/az:active      → /azure:active-work
/az:my-work     → /azure:active-work --user=me
```

## Feature Aliases

```bash
# Feature management
/az:feature     → /azure:feature-list
/az:epic        → /azure:feature-new
/az:decompose   → /azure:feature-decompose
/az:breakdown   → /azure:feature-decompose
```

## Quick Access Aliases

```bash
# Most used commands
/az:s           → /azure:search
/az:?           → /azure:help
/az:init        → /azure:init
/az:sync        → /azure:sync-all

# Productivity shortcuts
/az:now         → /azure:next-task --auto-start
/az:today       → /azure:standup --user=me
/az:update      → /azure:sync-all
```

## Workflow Combinations

```bash
# Morning routine
/az:morning     → /azure:standup && /azure:next-task

# End of day
/az:eod         → /azure:standup --summary && /azure:sync-all

# Sprint planning
/az:plan        → /azure:sprint-status && /azure:feature-decompose

# Quick status
/az:check       → /azure:active-work && /azure:blocked-items
```

## Custom Team Aliases

Add your team-specific aliases here:

```bash
# Example team shortcuts
/az:team-standup    → /azure:standup --team=dev
/az:qa-tasks        → /azure:task-list --type=bug --assigned-to=qa
/az:review          → /azure:task-list --needs-review
```

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Usage Examples

```bash
# Start your day
/az:morning         # Shows standup and suggests next task

# Quick task workflow
/az:next           # Get recommended task
/az:start 102      # Start working on it
/az:done 102       # Complete with PR

# Check status
/az:sprint         # Sprint dashboard
/az:my-work        # Your active items
/az:blocked        # See what's blocked
```

## Tips

- Use TAB completion with aliases
- Chain commands with && for workflows
- Create team-specific aliases in this file
- Aliases work in all contexts where commands work