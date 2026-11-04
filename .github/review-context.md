# Project Context Brief — ClaudeAutoPM (lagowski/ClaudeAutoPM)

> Node.js CLI / npm package (`claude-autopm`) — an autonomous project-management framework for Claude Code. Reviewer's only orientation brief — not evidence of what any file contains (#560). **PUBLIC repo** (see deployment-security).

## Stack summary
JavaScript / Node.js (`>=16`, npm `>=8`) CLI published to npm as `claude-autopm`. Entry `bin/autopm.js`; npm workspaces under `packages/*`. Shell scripts (`scripts/*.sh`, bash) plus some Python and TypeScript in the framework payload. The CLI ships a `.claude/` payload (`autopm install` copies `autopm/.claude/` to target projects) — **path rule: never hardcode `autopm/` in framework files, use `.claude/`**. Git access is a shell-out (`execSync('git …')` via `child_process`), not a library. Dependencies are not listed here: a hand-kept list named `simple-git` and `execa` long after neither had an import site (#560) — read `package.json` and the diff when a dependency matters. **No frontend.** Testing is heavyweight and mixed: Jest (`npm test` → `jest.config.quick.js`) **and** the node built-in test runner (`node --test`), c8 coverage, plus dedicated security/regression/installation suites (`test:security`, `test:regression`, `test:install`). Lint is markdownlint + prettier on `.md` only — **no JS lint/type gate in CI**. The PR-review workflow itself runs Sonnet 4.6 via OpenRouter (single-call, advisory).

## Recurring failure class
No named saga in-repo, but the test scripts and rules reveal the priors. Hot zones: (a) **frontmatter strip** — issue #599 documents that the naive `sed '1,/^---$/d; 1,/^---$/d'` idiom destroys the body when there is no frontmatter or when the body contains a `---` horizontal rule; the repo mandates the `awk` variant / `strip_frontmatter` helper. (b) **install/path correctness** — hardcoded `autopm/` paths in framework files break installed projects (own `test:install` + `validate:paths` suites guard this). (c) **prompt-injection / hybrid-strategy** security (`test/security/prompt-injection.test.js`, `hybrid-strategy.test.js`). Be skeptical of: shell-out via `child_process` (`exec`/`execSync`/`spawn`) with unsanitized issue/PR/branch strings (arbitrary command exec is the top CLI risk); GitHub/Azure sync writes; frontmatter read/write/strip changes; and any framework-payload edit that hardcodes `autopm/`.

## Reuse hot-spots
- CLI entry / command routing → `bin/autopm.js`, `lib/`
- framework payload (the installed product) → `autopm/.claude/`
- frontmatter read/write/strip → use the `awk` idiom / `strip_frontmatter` helper, NOT `sed` (rule: `frontmatter-operations.md`)
- XML prompt templates → `lib/xml-prompt-builder.js` + `.claude/templates/xml-prompts/`
- self-maintenance / validation → `scripts/self-maintenance.js` (`pm:validate`, `pm:health`)
- path validation → `scripts/validate-framework-paths.sh`

## OUT OF SCOPE — DO NOT flag
- style nits — no JS ESLint/prettier/type CI gate exists; only markdownlint on `*.md`. Lint is advisory.
- doc / markdown wording, missing docstrings on internal helpers
- pre-existing tech debt outside the diff hunk
- legacy / un-migrated code under `packages/` and the ongoing `node --test` ↔ Jest migration (`migration:*` scripts) — mixed test runners are intentional, not a bug
- `console.log` / chalk chattiness in `scripts/*` and CLI output (flag silent failures in critical paths only)
- absence of TDD/Context7 ceremony in a diff — those are authoring rules, not review gates

## Deployment security context
**PUBLIC repo** — external fork PRs ARE possible, so the prompt-injection surface is real, not theoretical. The review workflow defends with: `head.repo.full_name == github.repository` gate (fork-head PRs do not run the AI step — they get no automated review rather than an injectable one), draft-PR skip, diff truncation at 200 KB, secret-redaction regexes (JWT, `sk-or-`, `sk-ant-`, `sk-`, `ghp_`, `github_pat_`) on both the model output and the check summary, `temperature 0.1`, and advisory verdict (REQUEST_CHANGES does not hard-block merge). Concrete diff-introduced regressions in any of those layers — weakening the fork gate, the redaction regexes, or leaking `OPENROUTER_API_KEY`/`secrets.*` into logs — ARE in scope. Do NOT REQUEST_CHANGES merely for the advisory (non-blocking) design or for the fork-PR coverage gap; those are intentional.
