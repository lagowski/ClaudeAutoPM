---
title: Configuration
description: Configure ClaudeAutoPM with plugins, settings, and environment variables
---

# Configuration

This guide covers how to configure ClaudeAutoPM to match your development workflow, including plugin selection, directory structure, and environment variables.

## Directory Structure

After installation, ClaudeAutoPM creates the following structure in your project:

```
your-project/
├── .claude/                    # Main configuration directory
│   ├── agents/                 # AI agent definitions
│   │   ├── core/              # Core utility agents
│   │   ├── languages/         # Language-specific agents
│   │   ├── databases/         # Database experts
│   │   ├── cloud/             # Cloud platform architects
│   │   ├── devops/            # DevOps specialists
│   │   └── testing/           # Testing engineers
│   ├── commands/              # PM command definitions
│   │   └── pm/               # Project management commands
│   ├── rules/                 # Development rules
│   │   ├── tdd.enforcement.md
│   │   ├── naming-conventions.md
│   │   └── git-strategy.md
│   ├── scripts/               # Utility scripts
│   │   └── pm/               # PM automation scripts
│   ├── checklists/            # Quality checklists
│   ├── prds/                  # Product Requirements Documents
│   ├── epics/                 # Epics and tasks
│   ├── context/               # Project context files
│   ├── config.json           # Main configuration file
│   └── .env                   # Environment variables
├── .claude-code/              # Claude Code settings
│   └── config.json           # Editor configuration
├── scripts/                   # Project scripts
│   ├── safe-commit.sh        # Safe commit utility
│   └── setup-hooks.sh        # Hook installer
├── CLAUDE.md                  # Project instructions for Claude
└── PLAYBOOK.md                # Usage guidelines
```

## Configuration File

The main configuration file is `.claude/config.json`. Here's a typical configuration:

```json
{
  "version": "4.0.0",
  "features": {
    "docker_first_development": false,
    "kubernetes_devops_testing": false,
    "github_actions_k8s": false,
    "enforce_docker_tests": false,
    "integration_tests": true
  },
  "execution_strategy": "adaptive",
  "projectManagement": {
    "provider": "github",
    "repository": "owner/repo",
    "features": {
      "auto_assign": true,
      "auto_label": true,
      "epic_tracking": true
    }
  },
  "plugins": {
    "enabled": [
      "plugin-pm",
      "plugin-pm-github"
    ]
  }
}
```

### Configuration Options

#### Features

| Feature | Type | Description |
|---------|------|-------------|
| `docker_first_development` | boolean | Enable Docker-first development mode |
| `kubernetes_devops_testing` | boolean | Enable Kubernetes testing in CI/CD |
| `github_actions_k8s` | boolean | Enable K8s jobs in GitHub Actions |
| `enforce_docker_tests` | boolean | Require tests to run in containers |
| `integration_tests` | boolean | Enable integration test workflows |

#### Execution Strategy

| Strategy | Description |
|----------|-------------|
| `sequential` | Run agents one at a time (safe, predictable) |
| `adaptive` | Automatically choose based on task complexity |
| `hybrid-parallel` | Maximum parallelization for power users |

#### Project Management

| Option | Description |
|--------|-------------|
| `provider` | `github` or `azure-devops` |
| `repository` | Repository identifier (owner/repo) |
| `auto_assign` | Automatically assign issues when starting |
| `auto_label` | Apply labels based on content analysis |
| `epic_tracking` | Enable epic-level progress tracking |

## Plugin System

ClaudeAutoPM uses a modular plugin system. Plugins add commands, agents, and functionality.

### Core Plugins

| Plugin | Description | Commands |
|--------|-------------|----------|
| `plugin-pm` | Core project management | `/pm:init`, `/pm:prd-new`, `/pm:prd-parse`, `/pm:epic-decompose` |
| `plugin-pm-github` | GitHub integration | `/pm:epic-sync`, `/pm:issue-start`, `/pm:issue-close` |
| `plugin-pm-azure` | Azure DevOps integration | `/azure:*` commands |

### Language Plugins

| Plugin | Description |
|--------|-------------|
| `plugin-nodejs` | Node.js/JavaScript/TypeScript support |
| `plugin-python` | Python development support |
| `plugin-go` | Go development support |

### Infrastructure Plugins

| Plugin | Description |
|--------|-------------|
| `plugin-docker` | Docker containerization |
| `plugin-kubernetes` | Kubernetes orchestration |
| `plugin-terraform` | Infrastructure as Code |

### Enabling/Disabling Plugins

Edit `.claude/config.json`:

```json
{
  "plugins": {
    "enabled": [
      "plugin-pm",
      "plugin-pm-github",
      "plugin-nodejs",
      "plugin-docker"
    ]
  }
}
```

Or use the CLI:

```bash
# List available plugins
autopm plugin list

# Enable a plugin
autopm plugin enable devops

# Disable a plugin
autopm plugin disable pm-azure
```

## Environment Variables

Environment variables are stored in `.claude/.env`. Copy from the template and configure:

```bash
# Copy template
cp .claude/.env.example .claude/.env

# Or use interactive setup
autopm setup-env
```

### Common Environment Variables

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_REPOSITORY=owner/repo

# Azure DevOps Configuration (if using Azure)
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your-personal-access-token

# Feature Toggles
DOCKER_FIRST_DEVELOPMENT=false
KUBERNETES_DEVOPS_TESTING=false
GITHUB_ACTIONS_K8S=false
INTEGRATION_TESTS=true

# Execution Configuration
AUTOPM_PARALLEL_THRESHOLD=5
AUTOPM_LOG_LEVEL=1
```

### Environment Variable Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub personal access token | - |
| `GITHUB_REPOSITORY` | Target repository (owner/repo) | Auto-detected |
| `AZURE_DEVOPS_ORG` | Azure DevOps organization | - |
| `AZURE_DEVOPS_PROJECT` | Azure DevOps project name | - |
| `AZURE_DEVOPS_PAT` | Azure DevOps personal access token | - |
| `AUTOPM_PARALLEL_THRESHOLD` | Task count before parallel processing | 5 |
| `AUTOPM_LOG_LEVEL` | Logging verbosity (0=DEBUG, 3=ERROR) | 1 |

## Feature Toggles

Feature toggles allow dynamic configuration without code changes. Use the toggle command:

```bash
# In Claude Code
/config:toggle-features
```

This interactive command lets you:
- View current feature states
- Toggle features on/off
- Load predefined templates
- Regenerate CLAUDE.md based on changes

### Toggle via CLI

```bash
# Enable Docker-first development
autopm config set docker_first_development true

# Disable Kubernetes testing
autopm config set kubernetes_devops_testing false

# View current configuration
autopm config show
```

## Provider Configuration

### GitHub Provider

For GitHub-based project management:

```json
{
  "projectManagement": {
    "provider": "github",
    "repository": "your-username/your-repo",
    "project": "Project Board Name",
    "features": {
      "auto_assign": true,
      "auto_label": true,
      "epic_tracking": true,
      "sub_issues": true
    }
  }
}
```

### Azure DevOps Provider

For Azure DevOps integration:

```json
{
  "projectManagement": {
    "provider": "azure-devops",
    "organization": "your-org",
    "project": "your-project",
    "features": {
      "auto_assign": true,
      "work_item_sync": true,
      "sprint_tracking": true
    }
  }
}
```

## MCP Server Configuration

MCP (Model Context Protocol) servers extend Claude's capabilities:

```bash
# List available MCP servers
autopm mcp list

# Enable a server
autopm mcp enable context7
autopm mcp enable github-mcp
autopm mcp enable playwright-mcp

# View enabled servers
autopm mcp status

# Sync configuration
autopm mcp sync
```

### MCP Configuration in config.json

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "enabled": true,
        "priority": 1
      },
      "github-mcp": {
        "enabled": true
      },
      "playwright-mcp": {
        "enabled": false
      }
    }
  }
}
```

## CLAUDE.md Configuration

The `CLAUDE.md` file provides instructions to Claude. `autopm install` generates it from
`.claude/templates/claude-templates/` (`base.md` plus addons for your scenario); you can edit it.
It summarizes the critical rules and points to the full files, which Claude reads on demand:

```markdown
<rule id="tdd" priority="HIGHEST">
TDD mandatory|No code before tests|RED→GREEN→REFACTOR
📖 Full: .claude/rules/tdd.enforcement.xml
</rule>
```

Claude Code has no `@include` directive (its import syntax is `@path/to/file`), so nothing in `.claude/rules/` or `.claude/agents/` is loaded into context automatically.
To put a file's content into every session, use Claude Code's import syntax, for example
`@.claude/rules/tdd.enforcement.xml`, and mind the context it costs.

### Agent models

Shipped agent definitions pin a `model:` in their frontmatter: `sonnet` by default, `haiku` for the read-only
search/analysis agents (`code-analyzer`, `file-analyzer`). None inherits the parent session's model. No agent file
covers the built-in `general-purpose` agent, so repos that rely on it should set the session-level subagent model
themselves, for example `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`.

### Regenerate CLAUDE.md

After configuration changes:

```bash
# Regenerate based on current config
autopm merge

# Or in Claude Code
/re-init
```

## Configuration Presets

ClaudeAutoPM provides configuration presets for common scenarios:

### Minimal Development

```bash
autopm config preset minimal
```

```json
{
  "features": {
    "docker_first_development": false,
    "kubernetes_devops_testing": false
  },
  "execution_strategy": "sequential"
}
```

### Docker Development

```bash
autopm config preset docker
```

```json
{
  "features": {
    "docker_first_development": true,
    "enforce_docker_tests": true
  },
  "execution_strategy": "adaptive"
}
```

### Full DevOps

```bash
autopm config preset devops
```

```json
{
  "features": {
    "docker_first_development": true,
    "kubernetes_devops_testing": true,
    "github_actions_k8s": true,
    "integration_tests": true
  },
  "execution_strategy": "adaptive"
}
```

## Validation

Validate your configuration:

```bash
# CLI validation
autopm validate

# In Claude Code
/pm:validate
```

This checks:
- Configuration file syntax
- Plugin compatibility
- Environment variable presence
- Provider connectivity

## Troubleshooting

### Invalid Configuration

```
❌ Invalid config.json: Unexpected token at line 15
```

**Solution:** Check JSON syntax. Use a JSON validator or:

```bash
cat .claude/config.json | python -m json.tool
```

### Missing Environment Variables

```
⚠️ GITHUB_TOKEN not set
```

**Solution:** Configure the required variable:

```bash
autopm setup-env
# Or manually add to .claude/.env
```

### Plugin Not Found

```
❌ Plugin not found: plugin-custom
```

**Solution:** Verify plugin name and availability:

```bash
autopm plugin list
```

## Next Steps

With configuration complete, you can:

- Review [PM Commands](/commands/pm-commands) for available commands
- Explore the [Agent Registry](/agents/registry) for specialized agents
- Learn about [Azure DevOps Integration](/commands/azure-devops) if using Azure
