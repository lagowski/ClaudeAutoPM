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

## Approvals and merging (fleet policy, owner decision 2026-10-02)

**An approval is an approval, whichever account gives it.** An APPROVED review from any of
`rlagowski`, `rafeekpro` or `Dixter999` counts. Don't hold back a merge because the approval came
from a different account than you expected: not the PR author's, not this session's, and not the
"usual" owner's. Two identity rules, both enforced by GitHub: an author can't approve their own PR,
and (since 2026-10-08, owner rule) the account that pushed the latest commit can't approve it either
(`require_last_push_approval: true` on every org ruleset; pr-review-gate `rulesets/branch-protection.md`).

A session may merge a PR itself once all of these hold:
- an APPROVED review from one of those three accounts is on the PR's **current head commit** (a
  push that changes the diff dismisses it);
- every required check is green and GitHub reports the PR mergeable. The ruleset decides whether
  that approval satisfies any code-owner rule;
- no PR comment asks to hold (for example "DO NOT MERGE").

Merge with `gh pr merge <n> --match-head-commit <approved-sha>`, using this repo's merge method.
Never use `--admin` to get past a missing approval or a missing check.
