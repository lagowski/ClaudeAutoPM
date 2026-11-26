# CLAUDE.md

> Think carefully. Implement the most concise solution possible.

## CRITICAL RULES (zero tolerance — read on every task)

@.claude/rules/tdd-reminder.md
@.claude/rules/context7-required.md

Read the one that applies before the work (not loaded automatically):
`.claude/rules/tdd.enforcement.xml`, `.claude/rules/coverage-thresholds.xml`,
`.claude/rules/agent-mandatory.xml`, `.claude/rules/context7.xml`

## COMMANDS

@.claude/commands/pm/pm-commands.md

## AGENTS

@.claude/agents/AGENT-REGISTRY.md

## EXTENDED RULES

See `.claude/rules/` for all operational rules:

- `standard-patterns.md` — Output formats, error messages, validation
- `github-operations.md` — gh CLI patterns, repo protection
- `frontmatter-operations.md` — YAML frontmatter read/write
- `command-pipelines.md` — Command sequences and prerequisites
- `naming-conventions.md` — Naming prohibitions, code quality
- `datetime.md` — ISO 8601 timestamps from system clock
- `context-optimization.md` — Agent delegation for context efficiency
- `git-strategy.md` — Branch-based development workflow
- `strip-frontmatter.md` — Remove YAML before GitHub sync
- `test-execution.md` — Test runner patterns and cleanup

## FORMATTING & QUALITY

All code MUST pass autoformatters before commit:
- **Python**: `black` + `ruff`
- **JS/TS**: `prettier` + `eslint`
- **Other**: Language-standard tools

## TONE

- Be concise. Be skeptical. Criticism welcome.
- Ask questions rather than guessing intent.
- No flattery. No compliments unless asked.
