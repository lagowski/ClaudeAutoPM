---
allowed-tools: Bash, Read, LS
---

# Issue Show

Display issue and sub-issues with detailed information.

## Usage
```
/pm:issue-show <issue_number>
```

## Required Documentation Access

**MANDATORY:** Query Context7 for project-management best practices before proceeding. Use the standard PM query set in `.claude/rules/context7-required.md`.


## Instructions

Run `node .claude/scripts/pm/issue-show.js $ARGUMENTS` using the Bash tool and show me the complete output.

This will display comprehensive information about the GitHub issue including:
1. Issue details and status
2. Local file mappings and task files
3. Sub-issues and dependencies
4. Recent activity and comments
5. Progress tracking with acceptance criteria
6. Quick action suggestions
