# CLAUDE.md

> Think carefully. Implement the most concise solution possible.

## CRITICAL RULES (zero tolerance — read on every task)

@include .claude/rules/tdd.enforcement.xml
@include .claude/rules/coverage-thresholds.xml
@include .claude/rules/agent-mandatory.xml
@include .claude/rules/context7.xml
@include .claude/rules/github-operations.xml
@include .claude/rules/naming-conventions.xml
@include .claude/rules/command-pipelines.xml
@include .claude/rules/issue-structure.xml

## COMMANDS

@include .claude/commands/pm/pm-commands.md

## AGENTS

@include .claude/agents/agent-registry.xml

Full agent descriptions: `.claude/agents/AGENT-REGISTRY.md`

## XML PROMPT TEMPLATES

See `.claude/templates/xml-prompts/TEMPLATE_REGISTRY.md` for staged workflow templates.
Builder: `lib/xml-prompt-builder.js` — invoke with template path and variables.

## OPERATIONAL GUIDANCE

See `.claude/rules/` for reference:

- `standard-patterns.md` — Output formats, datetime handling, error messages
- `frontmatter-operations.md` — YAML frontmatter read/write/strip
- `git-strategy.md` — Branch naming, commit standards, merge workflow

## Labels

Every issue opened here carries `type:`, `area:` and `size:` **at creation** — including
issues filed by `gh issue create` or the REST API, neither of which picks up issue forms.

- `type:` — `feat`, `bug`, `chore`, `infra`, `spike`, `docs`
- `area:` — `framework` (autopm/), `lib`, `cli` (bin/), `packages`, `install`, `scripts`,
  `test`, `docs` (docs/ + docs-site/), `ci` (.github/)
- `size:` — `S` one sitting, `M` a day or so, `L` more than a day (split it first)

An epic also carries `tracking`, and is never dispatched to a worker.
`needs-split`, `not-code` and `tracking` all mean **do not dispatch**.

No space after the colon: `size:M`, never `size: M` — a cross-repo query against the
spaced form returns an empty set, which looks exactly like a backlog with nothing in it.

These exist because dispatching the wrong issue is expensive: an unlabelled epic once
produced seven issues in one 3,074-line PR, three of them in no sprint at all.
`.github/workflows/issue-label-guard.yml` applies `needs-triage` to anything filed without them.

## PROJECT

- **Language**: JavaScript/Node.js
- **Testing**: Jest (`npm test`, `npm run test:coverage`)
- **Install**: `autopm install` copies `autopm/.claude/` to target
- **Path rule**: Never hardcode `autopm/` in framework files — use `.claude/`
- **Commits**: Semantic format, no Claude attribution signatures

## TONE

- Be concise. Be skeptical. Criticism welcome.
- Ask questions rather than guessing intent.
- No flattery. No compliments unless asked.
