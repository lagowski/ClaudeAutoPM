# ClaudeAutoPM: source of the `claude-autopm` npm package (CLI `autopm`) and its 14 plugin workspaces
Verified against `develop@8f4550a` on 2026-11-19 (open PRs: 0). Public repo: yes.

This file is the working instructions for this repo. The CLAUDE.md that `autopm install` writes into user
projects is a product file, generated from `autopm/.claude/templates/claude-templates/` (`base.md` + `addons/`).
`autopm install` copies `autopm/.claude/` into the target project; the plugins are the
`@claudeautopm/plugin-*` workspaces under `packages/`. JavaScript on Node >= 22 and npm >= 10 (`engines`).

## Commands

- Install: `npm ci`
- Test (what CI runs): `npm test` (Jest, `jest.config.js`), then `npm run test:coverage`
- Run one test: `npx jest test/unit/agent-model-default.test.js`
- Lint: `npm run lint:js` (CI); `npm run lint` adds markdownlint
- Synced copies: `npm run sync:scripts` and `npm run sync:commands`; check only with
  `npm run sync:scripts:check` and `npm run sync:commands:check`
- Other runners: `npm run test:quick` (smoke allowlist), `npm run test:full` (`jest.config.clean.js`;
  `jest.config.js` says many of its suites still fail (verify)), `npm run test:security`, `npm run test:regression`
- Release: push a `v*` tag (runs `.github/workflows/npm-publish.yml`)

## Owner rules

- **GitHub API polling (fleet rule, owner 2026-10-15).** REST core is **5000 calls/hour per USER**, shared by
  every token and every session of that user; on 2026-10-15 two maintainer accounts were exhausted for most of
  the day.
  - No REST poller faster than every **120 s**. Prefer GraphQL
    (`gh pr view --json statusCheckRollup,reviews,mergeStateStatus`) over `gh run list/view`,
    `gh api repos/...` and REST `gh pr checks`.
  - For repeated reads, use `gh api --cache 60s`.
  - Every waiter or watcher has an **iteration cap** and **stops on a 403 / "rate limit exceeded"**. Don't
    retry; report it.
  - Never leave a background loop running past its purpose: kill it when the PR merges or the task ends.
    A 23.7 h orphan loop was found.
  - Where the maintainers' setup routes `gh` reads through a separate read account, writes stay on your
    account. Don't work around it.
- **Who may approve (owner 2026-10-15).** The PR's creator and every account that committed to it can't
  approve it; any other maintainer account can. Usually one account creates the PR and makes every commit, so
  the others can approve; if two accounts committed, a third still can. No single account is a mandatory
  approver. So keep **one identity per PR**: create, commit and push follow-ups as the same account, and never
  push to a PR as an account that should approve it (that turns an approver into a committer). An automated
  approval comes from `github-actions[bot]`, which is never a committer.
- **The account that pushed the latest commit can't approve it either (owner 2026-10-08).** Enforced by
  GitHub: `require_last_push_approval: true` on every org ruleset. An author can't approve their own PR.
- **An approval is an approval, whichever account gives it (fleet policy, owner 2026-10-02).** An APPROVED
  review from any maintainer account counts. Don't hold back a merge because the approval came from a
  different account than you expected: not the PR author's, not this session's, and not the "usual" owner's.
  A session may merge a PR itself once all of these hold:
  - an APPROVED review from a maintainer account is on the PR's **current head commit** (a push that changes
    the diff dismisses it);
  - every required check is green and GitHub reports the PR mergeable. The ruleset decides whether that
    approval satisfies any code-owner rule;
  - no PR comment asks to hold (for example "DO NOT MERGE").

  Merge with `gh pr merge <n> --match-head-commit <approved-sha>`, using this repo's merge method. Never use
  `--admin` to get past a missing approval or a missing check.

## Traps

- A cross-repo label query returns an empty set, which looks exactly like a backlog with nothing in it ->
  the label was written with a space after the colon -> write `size:M`, never `size: M`.
- An unlabelled epic was dispatched and produced seven issues in one 3,074-line PR, three of them in no
  sprint at all -> dispatching the wrong issue is expensive -> label every issue at creation (Workflow, Labels);
  `needs-split`, `not-code` and `tracking` all mean **do not dispatch**.
- A PR fails `scripts-sync-check.yml` or `commands-sync-check.yml` -> a synced copy was edited instead of its
  source -> edit only under `packages/`, then run the sync commands (Workflow, Synced copies).
- A framework file works here and breaks in an installed project -> it hardcodes `autopm/` -> never hardcode
  `autopm/` in framework files, use `.claude/`.
- The rule files under Pointers are not in a session's context by themselves -> this file used to list them
  as `@include <path>`, which is not Claude Code import syntax, so nothing was loaded (#790) -> read the rule
  file that applies before the work; turning them into real imports waits for the size trim in #791.
- `autopm update` replaces the installed framework directories, so local edits to rules or commands in a
  target project are lost (#790) -> change the source here, not the installed copy.

## Workflow

- Think carefully. Implement the most concise solution possible.
- **Tone**: be concise, be skeptical, criticism welcome. Ask questions rather than guessing intent. No
  flattery, no compliments unless asked.
- **Branches**: PRs go into `develop` (the default branch). `main` only takes PRs from `develop`
  (`.github/workflows/enforce-main-source.yml`).
- **Commits**: semantic format, no Claude attribution signatures.
- **CI** (`.github/workflows/test.yml`): `npm ci`, `npm run lint:js`, `npm test`, `npm run test:coverage` on
  Node 22.x and 24.x; plus the two sync checks and the AI review gate
  (`.github/workflows/copilot-review-required.yml`).
- **Synced copies**: shared scripts and plugin commands are edited only under `packages/` (scripts:
  `packages/plugin-core/scripts/`), then copied with `npm run sync:scripts` (into `autopm/.claude/scripts/`
  and this repo's `.claude/scripts/`) and `npm run sync:commands` (into `autopm/.claude/commands/`). Never
  edit the copies. Details: `install/README.md`.
- **Release**: pushing a `v*` tag runs `.github/workflows/npm-publish.yml`; the docs site (`docs-site/`,
  VitePress) deploys from `main` via `.github/workflows/deploy-docs.yml`. Record user-visible changes under
  `[Unreleased]` in `CHANGELOG.md`.

### Labels

Every issue opened here carries `type:`, `area:` and `size:` **at creation**, including issues filed by
`gh issue create` or the REST API, neither of which picks up issue forms.

- `type:` is one of `feat`, `bug`, `chore`, `infra`, `spike`, `docs`
- `area:` is one of `framework` (autopm/), `lib`, `cli` (bin/), `packages`, `install`, `scripts`, `test`,
  `docs` (docs/ + docs-site/), `ci` (.github/)
- `size:` is `S` one sitting, `M` a day or so, `L` more than a day (split it first)

An epic also carries `tracking`, and is never dispatched to a worker.
`.github/workflows/issue-label-guard.yml` applies `needs-triage` to anything filed without them.

## Pointers

- Critical rules (zero tolerance; read the one that applies, see Traps): `.claude/rules/tdd.enforcement.xml`,
  `.claude/rules/coverage-thresholds.xml`, `.claude/rules/agent-mandatory.xml`, `.claude/rules/context7.xml`,
  `.claude/rules/github-operations.xml`, `.claude/rules/naming-conventions.xml`,
  `.claude/rules/command-pipelines.xml`, `.claude/rules/issue-structure.xml`
- Operational guidance: `.claude/rules/standard-patterns.md` (output formats, datetime handling, error
  messages), `.claude/rules/frontmatter-operations.md` (YAML frontmatter read/write/strip),
  `.claude/rules/git-strategy.md` (branch naming, commit standards, merge workflow)
- PM commands: `.claude/commands/pm/pm-commands.md`
- Agents: `.claude/agents/agent-registry.xml`; full descriptions in `.claude/agents/AGENT-REGISTRY.md`
- XML prompt templates: `autopm/.claude/templates/xml-prompts/TEMPLATE_REGISTRY.md` (staged workflow
  templates); builder `.claude/lib/xml-prompt-builder.js`, invoked with a template path and variables
- `CONTRIBUTING.md` (setup, PR process), `install/README.md` (installer, update, shared scripts), `@README.md`
