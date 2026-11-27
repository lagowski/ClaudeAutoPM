---
title: Installation
description: Complete installation guide for ClaudeAutoPM v4.0.0 with all scenarios and configuration options
---

# Installation Guide

This guide covers npm/npx installation methods and configuration options for ClaudeAutoPM v4.0.0. For the shell-based installer, see `install/install.sh`.

## System Requirements

### Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js | >= 22.0.0 |
| npm | >= 10.0.0 |
| Git | Latest stable |

### Platform Support

- **macOS**: Intel and Apple Silicon
- **Linux**: Ubuntu, Debian, CentOS, RHEL, and other distributions
- **Windows**: Git Bash, WSL, PowerShell

### Optional Dependencies

- **Docker**: For Docker-first development scenarios (3-6: Docker, Full, Full-Azure, Performance)
- **Kubernetes CLI (kubectl)**: For full, full-azure, and performance scenarios (4-6)
- **GitHub CLI (gh)**: For GitHub provider sync
- **Azure CLI (az)**: For Azure DevOps provider sync

## Installation Methods

### Global Installation (Recommended)

```bash
# Install ClaudeAutoPM globally
npm install -g claude-autopm

# Verify installation
autopm --version

# Navigate to your project
cd your-project

# Install the framework (interactive scenario selection)
autopm install
```

### Using npx (No Global Install)

The package's command is `autopm`, not `claude-autopm`, so tell npx which package
provides it with `-p`:

```bash
npx -p claude-autopm autopm install
```

### Non-Interactive Installation

```bash
# Install with a specific scenario
autopm install --scenario=lite
autopm install --scenario=github
autopm install --scenario=full-azure
```

One command, no global install:

```bash
npx -p claude-autopm autopm install --scenario=lite
```

`--scenario` skips the scenario menu, but the installer can still ask yes/no questions
(for example, whether to overwrite existing files). For CI or scripts, set one of:

- `AUTOPM_AUTO_ACCEPT=1`: answer yes to every confirmation prompt.
- `AUTOPM_TEST_MODE=1`: answer yes to every confirmation prompt and, when no
  `--scenario` is given, pick `lite` instead of showing the menu.

```bash
AUTOPM_TEST_MODE=1 npx -p claude-autopm autopm install --scenario=lite
```

## Installation Scenarios

ClaudeAutoPM offers 7 predefined scenarios + Custom. Each installs a different set of plugins from the `@claudeautopm` npm scope.

### 0. Lite

**Best for**: Local-first PM, learning, minimal context usage

```bash
autopm install --scenario=lite
```

- Local PM only, no provider sync
- Core + PM essentials (~32 commands)
- Lowest context footprint (73% fewer agent tokens vs full)
- Plugins: `plugin-core`, `plugin-pm` (2 plugins)

### 1. GitHub (Default)

**Best for**: GitHub-based projects

```bash
autopm install --scenario=github
```

- Core + languages + PM + GitHub sync (~50 commands)
- Issues, PRs, and workflow sync
- 59% fewer agent tokens vs full
- Plugins: `plugin-core`, `plugin-languages`, `plugin-pm`, `plugin-pm-github` (4 plugins)

### 2. Azure

**Best for**: Azure DevOps projects

```bash
autopm install --scenario=azure
```

- Core + languages + PM + Azure sync (~70 commands)
- Work items, sprints, and feature sync
- Plugins: `plugin-core`, `plugin-languages`, `plugin-pm`, `plugin-pm-azure` (4 plugins)

### 3. Docker

**Best for**: Containerized development (requires Docker)

```bash
autopm install --scenario=docker
```

- Adaptive execution (smart sequential/parallel choice)
- Docker containers for development environment
- GitHub integration included
- Plugins: `plugin-core`, `plugin-languages`, `plugin-frameworks`, `plugin-testing`, `plugin-devops`, `plugin-pm`, `plugin-pm-github` (7 plugins)

### 4. Full DevOps (Recommended for Teams)

**Best for**: Production applications, enterprise projects (requires Docker + kubectl)

```bash
autopm install --scenario=full
```

- Adaptive execution with Docker-first priority
- Kubernetes + cloud deployment ready
- GitHub integration included
- Plugins: `plugin-core`, `plugin-languages`, `plugin-frameworks`, `plugin-testing`, `plugin-devops`, `plugin-cloud`, `plugin-databases`, `plugin-pm`, `plugin-pm-github`, `plugin-ai` (10 plugins)

### 5. Full Azure

**Best for**: Enterprise teams using both GitHub and Azure DevOps (requires Docker + kubectl)

```bash
autopm install --scenario=full-azure
```

- Everything in Full DevOps plus Azure DevOps integration
- Plugins: `plugin-core`, `plugin-languages`, `plugin-frameworks`, `plugin-testing`, `plugin-devops`, `plugin-cloud`, `plugin-databases`, `plugin-pm`, `plugin-pm-github`, `plugin-pm-azure`, `plugin-ai` (11 plugins)

### 6. Performance

**Best for**: Large projects, power users (requires Docker + kubectl)

```bash
autopm install --scenario=performance
```

- Hybrid strategy: up to 5 parallel agents
- Advanced context isolation and security
- All plugins except Azure (12 plugins including `plugin-data`, `plugin-ml`)

### 7. Custom

**Best for**: Specific requirements

Allows manual configuration of execution strategy, agents, and workflows.

## Scenario Comparison

| Feature | Lite | GitHub | Azure | Docker | Full | Full-Azure | Performance |
|---------|------|--------|-------|--------|------|------------|-------------|
| Plugins | 2 | 4 | 4 | 7 | 10 | 11 | 12 |
| Provider | local | github | azure | github | github | github+azure | github |
| Docker | - | - | - | Yes | Yes | Yes | Yes |
| Kubernetes | - | - | - | - | Yes | Yes | Yes |
| Execution | sequential | sequential | sequential | adaptive | adaptive | adaptive | hybrid |
| Token savings | 73% | 59% | ~59% | ~30% | baseline | baseline | - |

## Token Savings

ClaudeAutoPM uses a plugin architecture specifically to reduce context window usage. Only installed plugin agents are injected into `agent-registry.xml`:

- **Lite**: 73% fewer agent tokens than full — ideal for simple PM tasks
- **GitHub**: 59% fewer tokens — good balance for most projects
- **Full/Performance**: All agents available, maximum capability

The dynamic `agent-registry.xml` uses `PLUGIN_AGENTS_START`/`PLUGIN_AGENTS_END` markers. The installer injects only the agents from your selected plugins between these markers.

## Local Provider (Default)

The lite scenario uses a **local provider** for issue tracking without any external service. Local issue files are stored in `.claude/issues/` and support:

- `issue-create` - Create issues locally
- `issue-list` - List all local issues
- `issue-show` - View issue details
- `issue-start` - Begin work on an issue
- `issue-close` - Close a completed issue

No GitHub CLI or Azure CLI required. Upgrade to a synced provider later by re-running `autopm install` with a different scenario.

## Post-Installation Setup

After installation, complete these setup steps:

### 1. Initialize Project Management

```bash
# In Claude Code, run:
/pm:init
```

This creates the `.claude/` directory tree (prds/, epics/, issues/, etc.) and configures your selected provider.

### 2. Configure Environment (Optional)

```bash
autopm setup-env
```

### 3. Enable MCP Servers (Optional)

```bash
autopm mcp list
autopm mcp enable context7
autopm mcp sync
```

## Verify Installation

### Check Installed Files

```bash
autopm --version
ls -la .claude/
```

Expected structure:
```
.claude/
├── agents/              # AI agent definitions
│   └── agent-registry.xml  # Dynamic registry
├── commands/            # Command definitions
├── rules/               # 8 XML rules + MD references
├── providers/           # Provider scripts (local/)
├── scripts/             # Utility scripts
├── hooks/               # Enforcement hooks
└── config.json          # Scenario configuration
```

### Test Core Commands

In Claude Code:
```
/pm:help          # Show available commands
/pm:validate      # Validate configuration
```

## Troubleshooting

### Permission Denied Errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

### Node.js Version Issues

```bash
node --version
npm install -g n
n latest
```

### Installation Hangs

```bash
npm cache clean --force
autopm install --verbose
```

## Updates and Maintenance

```bash
# Update global package
npm update -g claude-autopm

# Update existing project installation
autopm update

# Force update with latest templates
autopm install --no-backup
```

## Next Steps

- [Your First Project](./first-project.md) - Create your first PRD and start development
- [Configuration](./configuration.md) - Customize your setup
