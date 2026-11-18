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

See `autopm/.claude/templates/xml-prompts/TEMPLATE_REGISTRY.md` for staged workflow templates.
Builder: `.claude/lib/xml-prompt-builder.js` — invoke with template path and variables.

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

- **What this is**: the source of the `claude-autopm` npm package (CLI `autopm`, entry `bin/autopm.js`)
  and the 14 `@claudeautopm/plugin-*` workspaces under `packages/`. This file is the working
  instructions for this repo; the CLAUDE.md that `autopm install` writes into user projects is
  generated from `autopm/.claude/templates/claude-templates/` (`base.md` + `addons/`).
- **Language**: JavaScript/Node.js (`engines`: Node >= 22, npm >= 10; CI runs 22.x and 24.x)
- **Testing**: Jest (`npm test`, `npm run test:coverage`); lint with `npm run lint:js`
- **Install**: `autopm install` copies `autopm/.claude/` to target
- **Path rule**: Never hardcode `autopm/` in framework files — use `.claude/`
- **Synced copies**: shared scripts and plugin commands are edited only under `packages/`
  (scripts: `packages/plugin-core/scripts/`), then copied with `npm run sync:scripts` (into
  `autopm/.claude/scripts/` and this repo's `.claude/scripts/`) and `npm run sync:commands` (into
  `autopm/.claude/commands/`). Never edit the copies: CI (`scripts-sync-check.yml`,
  `commands-sync-check.yml`) fails a PR whose copies diverge. Details: `install/README.md`.
- **Branches**: PRs go into `develop` (the default branch). `main` only takes PRs from `develop`
  (`.github/workflows/enforce-main-source.yml`).
- **Release**: pushing a `v*` tag runs `.github/workflows/npm-publish.yml`; the docs site
  (`docs-site/`, VitePress) deploys from `main` via `deploy-docs.yml`. Record user-visible changes
  under `[Unreleased]` in `CHANGELOG.md`.
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

**Who may approve (owner rule 2026-10-15).** The PR's creator and every account that committed to it
can't approve it; any other of the three accounts can. Usually one account creates the PR and makes every
commit, so the other two can approve; if two accounts committed, the third still can. `rlagowski` is not a
mandatory approver: rlagowski can create a PR and Dixter999 approve it. So keep **one identity per PR**:
create, commit and push follow-ups as the same account, and never push to a PR as an account that should
approve it — that turns an approver into a committer. Auto-approve approves as `github-actions[bot]`, which
is never a committer.

A session may merge a PR itself once all of these hold:
- an APPROVED review from one of those three accounts is on the PR's **current head commit** (a
  push that changes the diff dismisses it);
- every required check is green and GitHub reports the PR mergeable. The ruleset decides whether
  that approval satisfies any code-owner rule;
- no PR comment asks to hold (for example "DO NOT MERGE").

Merge with `gh pr merge <n> --match-head-commit <approved-sha>`, using this repo's merge method.
Never use `--admin` to get past a missing approval or a missing check.

## GitHub API polling (fleet rule, owner 2026-10-15)

REST core is **5000 calls/hour per USER**, shared by every token and every session of that user. On 2026-10-15 Dixter999 and rlagowski were exhausted for most of the day.
- No REST poller faster than every **120 s**. Prefer GraphQL (`gh pr view --json statusCheckRollup,reviews,mergeStateStatus`) over `gh run list/view`, `gh api repos/...` and REST `gh pr checks`.
- For repeated reads, use `gh api --cache 60s`.
- Every waiter or watcher has an **iteration cap** and **stops on a 403 / "rate limit exceeded"**. Don't retry; report it.
- Never leave a background loop running past its purpose: kill it when the PR merges or the task ends. A 23.7 h orphan loop was found.
- On the maintainers' machines, `gh` **reads** go out as rafeekpro via a shim; writes stay on your account. Don't work around it.
