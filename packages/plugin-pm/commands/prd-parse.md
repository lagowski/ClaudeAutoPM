---
allowed-tools: Bash, Read, Write, LS
---

# PRD Parse

Convert PRD to technical implementation epic.

## Usage
```
/pm:prd-parse <feature_name>
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Instructions

Run `node .claude/scripts/pm/prd-parse.js $ARGUMENTS` using the Bash tool and show me the complete output.

This will convert the Product Requirements Document into a detailed technical implementation epic including:
1. Technical analysis and architecture decisions
2. Implementation strategy and phases
3. Task breakdown preview (limited to 10 or fewer tasks)
4. Dependencies and success criteria
5. Effort estimates and timeline

The script handles all validation, reads the PRD file, and creates the epic structure at `.claude/epics/$ARGUMENTS/epic.md`.
