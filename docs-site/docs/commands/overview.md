# Command Reference Overview

ClaudeAutoPM has two command surfaces:

- **Terminal CLI** — `autopm <command> [sub-command] [options]`, run in your shell. Full list:
  [CLI Reference](/commands/cli-reference) or `autopm --help`.
- **Claude Code slash commands** — `/pm:<action>` (for example `/pm:status`, `/pm:prd-new`), run inside
  Claude Code after `autopm install`. They are not terminal commands, so never prefix them with `autopm`.

Examples:
- `autopm install` - Install the framework in the current project
- `autopm epic status <name>` - Show epic progress (terminal)
- `/pm:status` - Project overview (inside Claude Code)

## Getting Help

```bash
# General help
autopm --help

# Command-specific help
autopm prd --help
autopm prd parse --help
```

Inside Claude Code, `/pm:help` lists the slash commands.

## Command Categories

Apart from Core Commands, the tables below list Claude Code slash commands; prefix each name with `/`.

### Core Commands

Terminal commands for getting started:

| Command | Description |
|---------|------------|
| `install` | Install ClaudeAutoPM in project |
| `update` | Update the installed framework |
| `config` | Show and set configuration |
| `validate` | Check configuration and setup |
| `guide` | Interactive setup guide (deprecated: use `--help`) |

### Project Management (pm:)

GitHub-based project management:

| Command | Description |
|---------|------------|
| `pm:init` | Initialize PM system |
| `pm:status` | View project status |
| `pm:sync` | Synchronize all work items |
| `pm:standup` | Generate standup report |
| `pm:next` | Show next task to work on |

### Epic Management

| Command | Description |
|---------|------------|
| `pm:epic-new` | Create new epic |
| `pm:epic-list` | List all epics |
| `pm:epic-show` | Show epic details |
| `pm:epic-start` | Start working on epic |
| `pm:epic-close` | Close completed epic |

### Issue Management

| Command | Description |
|---------|------------|
| `pm:issue-new` | Create new issue |
| `pm:issue-list` | List all issues |
| `pm:issue-show` | Show issue details |
| `pm:issue-start` | Start working on issue |
| `pm:issue-edit` | Edit existing issue |

### PRD Management

| Command | Description |
|---------|------------|
| `pm:prd-new` | Create new PRD |
| `pm:prd-parse` | Parse PRD to epic |
| `pm:prd-list` | List all PRDs |
| `pm:prd-status` | Show PRD status |

### Azure DevOps (azure:)

Azure DevOps integration commands:

| Command | Description |
|---------|------------|
| `azure:init` | Initialize Azure DevOps |
| `azure:status` | View project status |
| `azure:sync-all` | Sync all work items |
| `azure:standup` | Daily standup report |
| `azure:sprint-status` | Sprint overview |

### Task Management

| Command | Description |
|---------|------------|
| `azure:task-new` | Create new task |
| `azure:task-list` | List all tasks |
| `azure:task-show` | Show task details |
| `azure:task-start` | Start working on task |
| `azure:task-close` | Close completed task |

### User Story Management

| Command | Description |
|---------|------------|
| `azure:us-new` | Create user story |
| `azure:us-list` | List user stories |
| `azure:us-show` | Show story details |
| `azure:us-edit` | Edit user story |

### Development Tools

#### Python Commands

| Command | Description |
|---------|------------|
| `python:scaffold` | Scaffold Python API |
| `python:api-scaffold` | Create API structure |
| `python:docs-query` | Query Python docs |

#### React Commands

| Command | Description |
|---------|------------|
| `react:scaffold` | Scaffold React app |
| `react:app-scaffold` | Create app structure |

#### Testing Commands

| Command | Description |
|---------|------------|
| `testing:prime` | Generate test strategy |
| `testing:run` | Run test suites |
| `playwright:test-scaffold` | Create Playwright tests |

### Infrastructure & DevOps

| Command | Description |
|---------|------------|
| `github:workflow` | Manage GitHub Actions |
| `kubernetes:deploy` | Deploy to Kubernetes |
| `cloud:infra-deploy` | Deploy infrastructure |
| `traefik:setup` | Setup Traefik proxy |
| `ssh:security` | SSH security audit |

### AI & Automation

| Command | Description |
|---------|------------|
| `ai:langgraph-workflow` | LangGraph workflows |
| `ai:openai-chat` | OpenAI integration |
| `langgraph:workflow` | Manage workflows |
| `openai:chat` | Chat with GPT models |

### Context & Documentation

| Command | Description |
|---------|------------|
| `context:create` | Create context file |
| `context:prime` | Load AI context |
| `context:update` | Update context |
| `api:documentation` | Generate API docs |
| `user:guide` | Generate user guides |

### Performance & Quality

| Command | Description |
|---------|------------|
| `performance:benchmark` | Run benchmarks |
| `regression:suite` | Run regression tests |
| `codeRabbit` | CodeRabbit review |

## Global Options

Every terminal command accepts these options:

| Option | Description |
|--------|------------|
| `--help` | Show help |
| `--version`, `-v` | Show version |
| `--verbose` | Verbose logging |
| `--debug` | Debug output |

Command-specific flags are listed by `autopm <command> --help`.

## Environment Variables

Commands read these environment variables:

```bash
# Provider tokens
GITHUB_TOKEN
AZURE_DEVOPS_PAT

# Project configuration
GITHUB_OWNER
GITHUB_REPO
AZURE_DEVOPS_ORG
AZURE_DEVOPS_PROJECT
```

## Next Steps

- Learn specific [Core Commands](/commands/cli-reference)
- Explore [Project Management Commands](/commands/pm-commands)
- Understand [Azure DevOps Commands](/commands/azure-devops)
- Read about [CLI Usage](/commands/cli-reference) patterns