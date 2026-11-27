---
title: CLI Reference
description: Every command of the `autopm` terminal CLI, taken from its --help output
---

# CLI Reference

`autopm` is the terminal CLI installed by `npm install -g claude-autopm` (or run with
`npx -p claude-autopm autopm`). It installs and updates the framework in a project and offers some
standalone PM utilities.

The AI-driven workflow runs inside Claude Code as slash commands such as `/pm:prd-new` and
`/pm:issue-start`. Those are not terminal commands; see [PM Commands](./pm-commands.md).

This page follows `autopm --help` and `autopm <command> --help` for v4.0.0. When in doubt,
the CLI's own help is authoritative.

## Commands

| Command | Purpose |
|---------|---------|
| `autopm install` | Install the framework into the current project |
| `autopm update` | Update an installed framework to the current version |
| `autopm validate` | Check the installation and configuration |
| `autopm config <action>` | Show or change configuration and provider settings |
| `autopm mcp <action>` | Manage MCP servers |
| `autopm plugin <action>` | Manage `@claudeautopm` plugins |
| `autopm team <action>` | Load and list agent teams |
| `autopm prd <action>` | Work with PRDs |
| `autopm epic <action>` | Work with epics |
| `autopm issue <action>` | Work with issues |
| `autopm task <action>` | List and prioritize tasks in an epic |
| `autopm pm <action>` | Project-wide PM utilities |
| `autopm agent <action>` | List, search and invoke agents |
| `autopm context <action>` | Manage project context files |
| `autopm obsidian <action>` | Obsidian vault integration |
| `autopm guide [action]` | Setup guide (deprecated; use `--help`) |

### Global options

| Option | Effect |
|--------|--------|
| `--help` | Show help (for a command: `autopm <command> --help`) |
| `--version`, `-v` | Print the installed version |
| `--verbose` | Verbose logging |
| `--debug` | Debug output |

The short form `-h` works only at the top level and for: `install`, `update`, `guide`, `team`, `config`, `mcp`, `plugin`, `validate`.

## Framework

### `autopm install`

Run in the project root. Without options it asks which scenario to install.

```bash
autopm install                      # interactive scenario selection
autopm install --scenario=lite      # skip the prompt
autopm install --force              # overwrite existing framework files
```

| Option | Effect |
|--------|--------|
| `--scenario=<name>` | `lite`, `github`, `azure`, `docker`, `full`, `full-azure`, `performance`, `obsidian` |
| `--force` | Overwrite existing files |

The help also lists a numeric `[preset]` argument; the installer does not read it, so use
`--scenario`. Scenario contents: [Installation](../getting-started/installation.md).

### `autopm update`

```bash
autopm update                       # back up .claude/ then update
autopm update --no-backup           # skip the .claude-backup-<timestamp> copy
autopm update --force               # update even if the project structure differs
```

| Option | Default | Effect |
|--------|---------|--------|
| `--backup` / `--no-backup` | on | Copy `.claude/` to `.claude-backup-<timestamp>` first |
| `--preserve-config` / `--no-preserve-config` | on | Keep existing configuration files |
| `--force` | off | Update even if the project structure differs |

### `autopm validate`

Checks the installation, configuration and provider tokens (it reads `.claude/.env`).

```bash
autopm validate
autopm validate --verbose
```

## Configuration

### `autopm config <action> [key] [value]`

Actions: `show`, `set`, `get`, `validate`, `switch`, `toggle`, `init`.

```bash
autopm config show
autopm config set provider github
autopm config set github.owner <username>
autopm config set github.repo <repository>
autopm config set azure.organization <org>
autopm config set azure.project <project>
autopm config get provider
autopm config switch azure          # change provider
autopm config toggle docker-first   # also: kubernetes, mcp, auto-commit
autopm config validate
```

Tokens go in `.claude/.env` (or the environment):

```bash
echo "GITHUB_TOKEN=ghp_your_token" >> .claude/.env
echo "AZURE_DEVOPS_PAT=your_pat" >> .claude/.env
```

### `autopm mcp <action> [name]`

Actions: `list`, `add`, `remove`, `enable`, `disable`, `sync`, `validate`, `info`, `search`,
`browse`, `install`, `uninstall`, `agents`, `agent`, `usage`, `setup`, `check`, `diagnose`,
`test`, `tree`, `status`.

```bash
autopm mcp list
autopm mcp enable context7
autopm mcp sync                     # write .claude/mcp-servers.json
autopm mcp status
autopm mcp diagnose
```

### `autopm plugin <action> [name]`

Actions: `list`, `search`, `install`, `uninstall`, `update`, `info`, `enable`, `disable`.
`name` is the plugin name without the `@claudeautopm/plugin-` prefix.

```bash
autopm plugin list
autopm plugin info devops
autopm plugin install devops
```

### `autopm team <action> [name]`

Actions: `list`, `load`, `current`.

```bash
autopm team list
autopm team load fullstack
autopm team current
```

## Standalone PM utilities

These read and write the local `.claude/` files directly, without Claude Code.

| Command | Actions |
|---------|---------|
| `autopm prd` | `list`, `new <name>`, `show <name>`, `edit <name>`, `status <name>`, `parse <name>`, `extract-epics <name>`, `summarize <name>`, `validate <name>` |
| `autopm epic` | `list`, `show <name>`, `new <name>`, `edit <name>`, `status <name>`, `validate <name>`, `start <name>`, `close <name>`, `sync <name>` |
| `autopm issue` | `show <n>`, `start <n>`, `close <n>`, `status <n>`, `edit <n>`, `sync <n>`, `sync-status <n>`, `sync-resolve <n>` |
| `autopm task` | `list <epic>`, `prioritize <epic>` |
| `autopm pm` | `next`, `what-next`, `standup`, `status`, `in-progress`, `blocked`, `init`, `validate`, `sync`, `clean`, `search <query>`, `import <source>` |
| `autopm agent` | `list`, `search <query>`, `invoke <name>` |
| `autopm context` | `create <type>`, `prime`, `update <type>`, `show [type]` |
| `autopm obsidian` | `setup`, `sync`, `link`, `doctor` |

```bash
autopm prd parse my-feature
autopm prd validate my-feature
autopm task list epic-001
autopm pm status
autopm agent search kubernetes
```

Each action has its own options: `autopm <command> <action> --help`.

## Related

- [PM Commands](./pm-commands.md): the `/pm:*` slash commands used inside Claude Code
- [Installation](../getting-started/installation.md): scenarios and first-time setup
- [Configuration](../getting-started/configuration.md)
