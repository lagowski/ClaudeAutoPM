# Plugin format migration: `packages/plugin-*` to Claude Code plugins

Spike for #860. Measured on `develop@21ec176` on 2026-11-26. The format facts come from the Claude Code docs
cited in [Sources](#sources). The bracketed tags ([A] to [H]) point at those pages.

## Today

- Each of the 14 `packages/plugin-*` workspaces has a homemade `plugin.json` with `"schemaVersion": "2.0"`. It
  lists `agents`, `commands`, `rules`, `hooks`, `scripts`, `features`, `peerPlugins`, `mcpServers` (a
  `recommended`/`optional` name list, not server configs) and `compatibleWith`.
- `lib/plugins/PluginManager.js` reads that file and copies files flat into the user project, under
  `.claude/{agents,commands,rules,hooks,scripts}`. Removing a plugin deletes the copies.
- Command names carry their namespace in the file name, for example `pm:issue-start.md`. 226 tracked files
  have a `:` in their path: 159 under `packages/`, 62 in `autopm/.claude/commands/` and 5 elsewhere. The issue
  says 75; the measured count is higher. Windows can't store any of them.
- The `hooks` entries use homemade types: `pre-command`, `pre-agent`, `pre-tool`, `wrapper`, `documentation`
  and `testing`. No `settings.json` in the repo registers them (`PreToolUse` appears nowhere), so copying them
  does nothing at runtime.
- `.claude-plugin/marketplace.json` already exists but it is stale. Its 13 entries point at `./plugins/*`,
  which doesn't exist, and they carry keys like `agents: ["@name"]` that the real format doesn't have.

## Target format (verified)

- **Manifest.** The manifest goes at `.claude-plugin/plugin.json`, and every other plugin file goes at the
  plugin root ([A] "Manifest file").
  - `name` is the only required key. Use kebab-case: no spaces, `@`, `:` or path separators ([A] "`name`").
  - Names starting with `claude-` or `anthropic-` are reserved ([A] "`name`").
  - Unknown top-level keys are stripped with a warning ([A] "Fields"). So `schemaVersion`, `features`,
    `peerPlugins` and `compatibleWith` can't move over as they are.
- **Default folders.** All sit at the plugin root ([A] "Standard layout"):
  - `skills/<name>/SKILL.md`
  - `commands/*.md`, which the docs call legacy ("Prefer `skills/` for new plugins")
  - `agents/*.md`
  - `hooks/hooks.json`
  - `.mcp.json`
  - `bin/`, whose contents are on the Bash tool's PATH while the plugin is enabled
- **Namespacing.** "Every component is namespaced under" the plugin name ([A] "`name`"):
  - `commands/<file>.md` becomes `/<plugin>:<file>`, and a subdirectory adds a segment:
    `commands/db/migrate.md` is `/my-plugin:db:migrate` ([D] "Commands").
  - Agents become `<plugin>:<agent>` ([D] "Organize agents in subfolders").
  - Skills become `/<plugin>:<dir>` ([D] "Skills").
- **Hooks.** `hooks/hooks.json` has a top-level `"hooks"` key "in the same shape as the `hooks` object in
  `settings.json`" ([A] "`hooks`").
  - The paths inside it use `${CLAUDE_PLUGIN_ROOT}` ([A] "Environment variables").
  - `${CLAUDE_PLUGIN_ROOT}` changes on every update, so state goes in `${CLAUDE_PLUGIN_DATA}` ([A]).
  - These variables are not set in the Bash tool's environment ([A]).
- **Caching.** Marketplace plugins are copied to a cache. "Files outside the plugin directory aren't copied"
  ([E] "In-place and copied plugins"), and `..` paths are rejected ([A] "Path rules"). So no plugin may
  reference `packages/plugin-core/...` from a sibling.
- **Dependencies.** A plugin can depend on another plugin through `dependencies`, and missing ones install
  automatically ([A] "`dependencies`"; [H]). This replaces `peerPlugins`.
- **No CLAUDE.md.** "A `CLAUDE.md` at the plugin root isn't loaded as context... put them in a skill" ([A]
  "Standard layout"). The docs describe no way for a plugin to ship rule files.
- **Marketplace.** The marketplace file is `.claude-plugin/marketplace.json` ([B]).
  - It requires `name`, `owner.name` and `plugins[]`, where each entry has a `name` and a `source` ([F]
    "Top-level fields", "Plugin entries").
  - Relative `./` sources resolve from the repo root ([F] "Plugin sources").
  - `strict` defaults to `true`, which means `plugin.json` is the manifest ([F] "Strict mode").
  - Users install with `/plugin marketplace add lagowski/ClaudeAutoPM`, then
    `/plugin install pm@claudeautopm` ([B]).

## How `/pm:*` names survive

The plugin name becomes the prefix. So **name each plugin after the command prefix it uses today**, and drop
the prefix from the file name: `packages/plugin-pm/commands/pm:issue-start.md` becomes
`packages/plugin-pm/commands/issue-start.md` in plugin `pm`, which is still invoked as `/pm:issue-start` ([D]).
Don't use a `commands/pm/` subdirectory: it would add a segment and give `/pm:pm:issue-start`. Renaming the
files this way removes every `:` from `packages/`. The 62 copies in `autopm/.claude/commands/` go away when the
installer stops shipping commands (child issue 9).

The four exceptions:

1. `plugin-pm-github` ships 17 `pm:*` commands, for example `pm:issue-sync` and `pm:epic-sync`, none of which
   collide with `plugin-pm`. A plugin named `github` would rename them to `/github:*`. **Decision: move the 17
   files into plugin `pm`**, which keeps their names. Plugin `github` keeps only `github:workflow-create`.
2. `plugin-pm-azure` keeps its `azure:*` names as plugin `azure`.
3. `plugin-core`'s unprefixed `code-rabbit`, `prompt` and `re-init` become `/core:code-rabbit`,
   `/core:prompt` and `/core:re-init`. These are the only renames that users will see. They go in the
   CHANGELOG.
4. Agents are renamed too, from `code-analyzer` to `core:code-analyzer` ([D]). Every agent reference in
   rules, `agent-registry.xml` and command bodies must be updated (child issue 8).

## Mapping table

The counts are files on disk. "Cmd prefix" is the namespace today, and "Plugin name" is the new plugin name,
which gives the same prefix. Every plugin gets `.claude-plugin/plugin.json` with `name`, `version`,
`description`, `author`, `repository`, `license` and `keywords`. `peerPlugins` becomes
`dependencies: ["core"]`, plus `"pm"` for `azure` and `github`.

| Workspace | Plugin name | Cmd prefix | Agents | Commands | Rules | Hooks | Scripts | `commands/` | `agents/` | `skills/` | `hooks/hooks.json` | `bin/` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `plugin-core` | `core` | `core:` + 3 unprefixed | 7 | 5 | 17 | 8 | 28 | strip `core:`; 3 renamed | as-is | rules as skills (see below) | `enforce-agents` and `strict-enforce-agents` as `PreToolUse`; the rest dropped or turned into skills | `scripts/` |
| `plugin-ai` | `ai` | `ai:` | 8 | 9 | 2 | 0 | 4 | strip `ai:` | as-is | 2 rules | none | `scripts/` |
| `plugin-cloud` | `cloud` | `cloud:` | 9 | 8 | 2 | 1 | 5 | strip `cloud:` | as-is | 2 rules | `pre-cloud-deploy` as `PreToolUse` on `Bash` | `scripts/` |
| `plugin-data` | `data` | `data:` | 3 | 4 | 2 | 0 | 4 | strip `data:` | as-is | 2 rules | none | `scripts/` |
| `plugin-databases` | `db` | `db:` | 6 | 4 | 2 | 0 | 5 | strip `db:` | as-is | 2 rules | none | `scripts/` |
| `plugin-devops` | `devops` | `devops:` | 8 | 7 | 4 | 1 | 5 | strip `devops:` | as-is | 4 rules | `pre-docker-build` as `PreToolUse` on `Bash` | `scripts/` |
| `plugin-frameworks` | `framework` | `framework:` | 7 | 4 | 3 | 0 | 3 | strip `framework:` | as-is | 3 rules | none | `scripts/` |
| `plugin-languages` | `lang` | `lang:` | 6 | 5 | 2 | 0 | 5 | strip `lang:` | as-is | 2 rules | none | `scripts/` |
| `plugin-ml` | `ml` | `ml:` | 10 | 6 | 0 | 0 | 0 | strip `ml:` | as-is | none | none | none |
| `plugin-obsidian` | `obsidian` | `obsidian:` | 0 | 5 | 0 | 0 | 5 | strip `obsidian:` | none | `claude-md/` and `templates/` as skills | none | `scripts/` |
| `plugin-pm` | `pm` | `pm:` | 0 | 29 | 1 | 0 | 69 | strip `pm:`; also gets the 17 `pm:*` files from `plugin-pm-github` | none | 1 rule | none | `scripts/` |
| `plugin-pm-github` | `github` | `pm:` (17), `github:` (1) | 0 | 18 | 0 | 0 | 0 | keep `workflow-create` only | none | none | none | none |
| `plugin-pm-azure` | `azure` | `azure:` | 0 | 51 | 0 | 0 | 0 | flatten `commands/azure/azure:*` to `commands/*` | none | none | none | none |
| `plugin-testing` | `test` | `test:` | 1 | 7 | 2 | 0 | 3 | strip `test:` | as-is | 2 rules | none | `scripts/` |

**Scripts.** Command and agent bodies hardcode `.claude/scripts/...` in 207 places. Inside a cached plugin
those files sit at `${CLAUDE_PLUGIN_ROOT}/scripts/...`. The body can use that variable, because it is expanded
in command bodies, but the Bash tool doesn't see it ([A] "Environment variables"). Rewrite each reference to
`${CLAUDE_PLUGIN_ROOT}/scripts/<x>` in the body text, or put the scripts in `bin/` and call them by name.

## Do rules become skills?

**Partly.** A plugin can't load `CLAUDE.md` or rule files ([A]), and a skill is loaded only when its
`description` matches the task ([G]).

- **Situational guidance becomes skills.** That covers the domain rules in `ai`, `cloud`, `data`, `db`,
  `devops`, `framework`, `lang` and `test`, and also `git-strategy`, `frontmatter-operations`, `datetime` and
  `standard-patterns`. Each one becomes `skills/<rule>/SKILL.md` with a `description` that says when it applies.
- **The zero-tolerance rules stay with the installer.** These are `tdd.enforcement`, `agent-mandatory`,
  `context7-enforcement` and `naming-conventions`. They must be in context on every turn, so they stay in the
  generated `CLAUDE.md` addons and `.claude/rules/`. Any part that can be checked mechanically becomes a hook.

## What the installer still does

The plugins carry agents, commands, skills and hooks. `autopm install` keeps doing what a plugin can't:

1. Write the project `CLAUDE.md` from `autopm/.claude/templates/claude-templates/`, and copy the always-on
   rules.
2. Write project state and config: `.claude/config.json`, provider settings, `.claude/epics/` and `prds/`.
3. Add the marketplace and enable the chosen plugins. It does this by writing `extraKnownMarketplaces` and
   `enabledPlugins` into the project's `.claude/settings.json`, or by printing the `/plugin install`
   commands. Which one works must be confirmed against the settings docs (child issue 10).
4. Install git hooks (`--setup-hooks`). These are git hooks, not Claude Code hooks.

## Backwards compatibility

- **Existing installs keep working.** A project installed today has flat copies in `.claude/commands/` and
  the rest. Nothing removes them, and the copied `pm:*.md` files still give `/pm:*`.
- **Duplicates.** If such a project also enables the `pm` plugin, both the project command and the plugin
  command answer `/pm:issue-start`. `autopm update` must therefore remove the copies it installed, matched by
  the hash `autopm` recorded. It must keep any file the user edited, following the `.autopm-new` behaviour
  from #790, and report it.
- **Windows.** The files with `:` stay in existing Linux and macOS installs until `update` migrates them.
  Windows users get plugin installs only.
- **`autopm plugin install`** keeps working through one minor release behind a deprecation warning, and then
  becomes a wrapper around `claude plugin install <name>@claudeautopm`.
- **npm packages.** `@claudeautopm/plugin-*` keep publishing until the marketplace release. Their
  `plugin.json` is renamed, so the old `PluginManager` reads it from `.claude-plugin/plugin.json`. During the
  transition the homemade keys live under `metadata`, a key the format allows ([A] "Fields").
- **Renamed names.** `/code-rabbit`, `/prompt` and `/re-init` become `/core:*`, and agents gain the `core:`
  prefix. Both go in the CHANGELOG under a breaking-change note.

## Child issues

Each is one PR. Labels: `type:chore`, `area:packages` unless stated otherwise.

1. Rewrite `.claude-plugin/marketplace.json` for the 14 plugins (`name: claudeautopm`, `./packages/plugin-*`
   sources) and add a schema test. `size:S`
2. Add `.claude-plugin/plugin.json` to all 14 workspaces, with the homemade keys under `metadata`, and teach
   `PluginManager` to read it. `size:M` (`area:lib`)
3. Plugins `pm` and `github`: strip the `pm:` prefix and move the 17 `pm:*` files into `plugin-pm`; update
   `sync:commands`. `size:M`
4. Plugin `azure`: flatten `commands/azure/azure:*` into `commands/*`. `size:S`
5. Strip the prefix from the domain plugins: `ai`, `cloud`, `data`, `db`, `devops`, `framework`, `lang`, `ml`,
   `obsidian`, `test`. `size:M`
6. Plugin `core`: strip `core:`, rename the 3 unprefixed commands, and write `hooks/hooks.json` with real
   `PreToolUse` entries for the enforce-agents hooks. Also covers `pre-cloud-deploy` and `pre-docker-build`.
   `size:M`
7. Rewrite the 207 hardcoded `.claude/scripts/...` references to `${CLAUDE_PLUGIN_ROOT}/scripts/...`, with a
   test that fails on any that remain. `size:M`
8. Rename agent references to `<plugin>:<agent>` in rules, `agent-registry.xml` and command bodies. `size:M`
   (`area:framework`)
9. Turn the situational rules into `skills/<rule>/SKILL.md`, and keep the zero-tolerance rules in the
   installer. `size:M`
10. Change `autopm install` and `autopm update` to enable plugins, remove the hash-matched flat copies, and
    keep user-edited ones. Also stop copying `autopm/.claude/commands/*:*`. `size:M` (`area:install`)
11. Deprecate `autopm plugin install` so it wraps `claude plugin install`, and document the move in the
    CHANGELOG and docs-site. `size:S` (`area:cli`)

Order: 1 and 2 first. Then 3 to 8, which can run in parallel but touch disjoint files only when 3, 4 and 5
are kept to their own workspaces. Then 9, then 10 and 11.

## Sources

The Claude Code docs, read on 2026-11-26:

- [A] <https://code.claude.com/docs/en/plugins-reference> (Plugin manifest reference)
- [B] <https://code.claude.com/docs/en/plugin-marketplaces> (Create a marketplace)
- [C] <https://code.claude.com/docs/en/plugins> (Plugins overview)
- [D] <https://code.claude.com/docs/en/plugins/components>
- [E] <https://code.claude.com/docs/en/plugins/loading>
- [F] <https://code.claude.com/docs/en/plugins/marketplace-reference>
- [G] <https://code.claude.com/docs/en/skills>
- [H] <https://code.claude.com/docs/en/plugins/dependencies>

Not checked here: the full list of hook events (`hooks.md#hook-events`) and the `settings.json` keys for
marketplaces (`extraKnownMarketplaces` and `enabledPlugins`). Child issues 6 and 10 must confirm both before
relying on them.
