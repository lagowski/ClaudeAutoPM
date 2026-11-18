# 🔧 CLI Reference

Complete reference for all ClaudeAutoPM command-line tools with unified provider-agnostic commands.

## 🎯 Unified Project Management Commands

ClaudeAutoPM provides a unified command interface that works across different providers (GitHub, Azure DevOps, etc.). All commands use the `/pm:` prefix and are automatically routed to the configured provider.

### Command Structure
```
/pm:<resource>:<action> [parameters] [--options]
```

## 📋 Core PM Commands

### Issue/Work Item Management

| Command | Description | Example |
|---------|-------------|---------|
| `/pm:issue:show <id>` | Display issue details | `/pm:issue:show 123` |
| `/pm:issue:list [--filter]` | List all issues | `/pm:issue:list --status=open` |
| `/pm:issue:create` | Create new issue | `/pm:issue:create --title="Bug fix"` |
| `/pm:issue:start <id>` | Start working on issue | `/pm:issue:start 456 --assign` |
| `/pm:issue:close <id>` | Close issue | `/pm:issue:close 789` |
| `/pm:issue:edit <id>` | Edit issue fields | `/pm:issue:edit 101 --status=in_progress` |
| `/pm:issue:assign <id> <user>` | Assign to user | `/pm:issue:assign 202 @johndoe` |
| `/pm:issue:comment <id>` | Add comment | `/pm:issue:comment 303 "Fixed in PR #45"` |

### Epic/Feature Management

| Command | Description | Example |
|---------|-------------|---------|
| `/pm:epic:list` | List all epics | `/pm:epic:list` |
| `/pm:epic:show <id>` | Display epic details | `/pm:epic:show 5` |
| `/pm:epic:create` | Create new epic | `/pm:epic:create --title="Q1 Features"` |
| `/pm:epic:update <id>` | Update epic | `/pm:epic:update 5 --status=active` |
| `/pm:epic:close <id>` | Close epic | `/pm:epic:close 5` |
| `/pm:epic:progress <id>` | Show epic progress | `/pm:epic:progress 5` |

### Pull/Merge Request Management

| Command | Description | Example |
|---------|-------------|---------|
| `/pm:pr:create` | Create pull request | `/pm:pr:create --title="Feature X"` |
| `/pm:pr:list` | List pull requests | `/pm:pr:list --status=open` |
| `/pm:pr:show <id>` | Display PR details | `/pm:pr:show 99` |
| `/pm:pr:review <id>` | Start PR review | `/pm:pr:review 99` |
| `/pm:pr:approve <id>` | Approve PR | `/pm:pr:approve 99` |
| `/pm:pr:merge <id>` | Merge PR | `/pm:pr:merge 99` |
| `/pm:pr:close <id>` | Close without merging | `/pm:pr:close 99` |

### Board/Sprint Management

| Command | Description | Example |
|---------|-------------|---------|
| `/pm:board:show` | Display project board | `/pm:board:show` |
| `/pm:board:update` | Update board items | `/pm:board:update` |
| `/pm:sprint:current` | Show current sprint | `/pm:sprint:current` |
| `/pm:sprint:plan` | Plan next sprint | `/pm:sprint:plan` |
| `/pm:sprint:close` | Close sprint | `/pm:sprint:close` |

### Search and Reporting

| Command | Description | Example |
|---------|-------------|---------|
| `/pm:search <query>` | Search all items | `/pm:search "authentication bug"` |
| `/pm:report:velocity` | Team velocity | `/pm:report:velocity` |
| `/pm:report:burndown` | Sprint burndown | `/pm:report:burndown` |
| `/pm:report:summary` | Project summary | `/pm:report:summary` |

## 🔧 Framework Installation Commands

### `autopm install [path]`
Install ClaudeAutoPM framework to a project directory.

```bash
# Install to current directory
autopm install

# Install to specific directory  
autopm install ~/my-project
autopm install /path/to/project

# Options
--verbose    # Show detailed installation progress
--no-backup  # Skip creating backups (not recommended)
```

**What it does:**
- Detects fresh install vs update mode automatically
- Creates backups for existing installations
- Copies framework files (.claude/, .github/, scripts/)
- Interactive configuration selection (Minimal/Docker/Full DevOps)
- Generates appropriate CLAUDE.md template
- Preserves user customizations (.github/, .claude-code/)

**Interactive prompts:**
```
🔧 Choose your development configuration:
  1) 🏃 Minimal     - Traditional development (no Docker/K8s)
  2) 🐳 Docker-only - Docker-first development without Kubernetes  
  3) 🚀 Full DevOps - All features (Docker + Kubernetes + CI/CD)
  4) ⚙️  Custom     - Use existing config.json template
```

### `autopm update [path]`
Update existing ClaudeAutoPM installation.

```bash
# Update current project
autopm update

# Update specific project
autopm update ~/my-project

# Same options as install
--verbose --no-backup
```

**What it does:**
- Preserves your configuration settings
- Updates framework files with new features
- Protects .github/ and .claude-code/ from overwriting
- Creates timestamped backups before changes
- Shows detailed file change reports

### `autopm config`
Interactive configuration tool for feature toggles.

```bash
autopm config
```

**Features:**
- Visual display of current configuration
- Toggle Docker-first development on/off
- Toggle Kubernetes testing on/off  
- Toggle GitHub Actions integration
- Load predefined templates (minimal/docker-only/full-devops)
- Automatic CLAUDE.md regeneration
- Configuration validation and consistency checks

**Interface:**
```
Current Configuration:
🐳 Docker-first development: ✅ ENABLED
☸️ Kubernetes testing: ❌ DISABLED  
🔧 GitHub Actions K8s: ❌ DISABLED
🛡️ Integration tests: ✅ ENABLED

Available Actions:
[1] Toggle Docker-first development
[2] Toggle Kubernetes DevOps testing  
[3] Toggle GitHub Actions K8s
[4] Load template: minimal
[5] Load template: docker-only
[6] Load template: full-devops
[0] Save and exit
```

### `autopm setup-env [path]`
Interactive environment variable configuration.

```bash
# Configure .env for current project
autopm setup-env

# Configure for specific project
autopm setup-env ~/my-project
```

**Configures:**
- MCP (Model Context Protocol) servers
- Context7 integration
- GitHub token
- Playwright browser settings
- Azure DevOps credentials
- Cloud provider credentials (AWS, Azure, GCP)
- AI provider API keys (OpenAI, Gemini)

### `autopm merge`
Generate intelligent CLAUDE.md merge prompts.

```bash
autopm merge
```

**Use cases:**
- Resolving conflicts between your CLAUDE.md and framework updates
- Combining custom rules with new framework features
- AI-assisted configuration merging

**Options:**
```
How would you like to receive the merge prompt?
  1) Print to console
  2) Save to file (merge_prompt.md)
```

### `autopm init <project-name>`
Initialize new project with ClaudeAutoPM.

```bash
# Create new project
autopm init my-awesome-project
cd my-awesome-project

# Project is ready with ClaudeAutoPM installed
```

**What it does:**
- Creates new directory
- Initializes git repository
- Installs ClaudeAutoPM framework
- Interactive configuration selection
- Sets up .env variables

## 🔍 Information Commands

### `autopm --version` / `autopm version`
Display version information.

```bash
autopm --version
# ClaudeAutoPM v1.0.3
# Node.js v20.10.0
# Platform: darwin arm64
```

### `autopm --help` / `autopm help`
Show comprehensive help information.

```bash
autopm --help
# Shows complete command reference with examples
```

## ⚙️ Global Options

These options work with most commands:

```bash
--help, -h       # Show command-specific help
--version, -v    # Show version information  
--verbose        # Detailed output with file listings
--no-backup      # Skip backup creation (not recommended)
```

## 🎯 Usage Examples

### Basic Installation Workflow
```bash
# Install globally
npm install -g claude-autopm

# Set up existing project
cd my-existing-project
autopm install
# Choose configuration → Configure .env → Ready!

# Update later
autopm update
```

### New Project Workflow  
```bash
# Create new project with ClaudeAutoPM
autopm init my-new-project
cd my-new-project

# Configure features
autopm config
# Toggle features as needed

# Set up environment
autopm setup-env
# Enter API keys and credentials
```

### Configuration Management
```bash
# View current settings
autopm config

# Switch from Minimal to Docker-only
autopm config
# Select: [6] Load template: docker-only
# CLAUDE.md automatically regenerates!

# Fine-tune individual features
autopm config
# Toggle specific features on/off
```

### Project Updates
```bash
# Get latest ClaudeAutoPM version
npm install -g claude-autopm@latest

# Update project with new features
cd my-project
autopm update
# 🔒 Preserving existing configuration
# New features added, settings preserved
```

## 🛠️ Advanced Usage

### Batch Operations
```bash
# Install to multiple projects
for project in project1 project2 project3; do
  autopm install $project
done
```

### CI/CD Integration
```bash
# In GitHub Actions
- name: Install ClaudeAutoPM
  run: |
    npm install -g claude-autopm
    autopm install --no-backup
```

### Custom Templates
```bash
# Use custom configuration
cp my-custom-config.json .claude/config.json
autopm config  # Validate and apply
```

## 📁 File Locations

### Global Installation
- **Binary**: `~/.npm/bin/autopm` (or equivalent)
- **Package**: `~/.npm/lib/node_modules/claude-autopm/`

### Project Installation  
- **Configuration**: `.claude/config.json`
- **Environment**: `.claude/.env`
- **Templates**: `.claude/config-templates/`
- **Scripts**: `.claude/scripts/`
- **Generated**: `CLAUDE.md`

## 🛠️ Self-Maintenance Commands

ClaudeAutoPM includes powerful self-maintenance capabilities implemented in Node.js:

### `pm health`
Generate comprehensive health report for the ClaudeAutoPM system.

```bash
npm run pm:health
# or
node scripts/self-maintenance.js health
```

**Output includes:**
- Agent ecosystem metrics
- Installation health
- File integrity checks
- Test coverage status
- Performance metrics

### `pm validate`
Validate the entire framework installation and configuration.

```bash
npm run pm:validate
# or
node scripts/self-maintenance.js validate
```

**Validates:**
- Agent registry consistency
- Configuration files
- Installation completeness
- Template availability
- Strategy configuration

### `pm optimize`
Analyze and optimize the agent ecosystem for better performance.

```bash
npm run pm:optimize
# or
node scripts/self-maintenance.js optimize
```

**Performs:**
- Agent consolidation analysis
- Context efficiency calculation
- Duplicate detection
- Performance recommendations

### `pm metrics`
Display detailed metrics about the framework.

```bash
npm run pm:metrics
# or
node scripts/self-maintenance.js metrics
```

**Shows:**
- Total agents by category
- Deprecated agent count
- Context usage statistics
- Installation statistics

### `pm test-install`
Test the installation process in various scenarios.

```bash
npm run pm:test-install
# or
node scripts/self-maintenance.js test-install
```

**Tests:**
- Minimal installation
- Docker-only installation
- Full DevOps installation
- Performance installation
- Upgrade scenarios

### `pm release`
Prepare a new release of the framework.

```bash
npm run pm:release
# or
node scripts/self-maintenance.js release
```

**Steps:**
1. Run validation checks
2. Execute test suite
3. Update version
4. Generate changelog
5. Create GitHub release
6. Publish to npm

## 🔧 Direct Script Access

For advanced users, you can run scripts directly:

```bash
# Self-maintenance script (Node.js)
node scripts/self-maintenance.js <command>

# Configuration toggle script
.claude/scripts/config/toggle-features.sh

# Environment setup script
.claude/scripts/setup-env.sh

# PM initialization script
.claude/scripts/pm/init.sh
```

## ⚙️ Provider Configuration

### Setting Provider
Configure your provider in `.claude/config.json`:

```json
{
  "projectManagement": {
    "provider": "github",  // or "azure"
    "settings": {
      "github": {
        "owner": "username",
        "repo": "repository"
      },
      "azure": {
        "organization": "org-name",
        "project": "project-name",
        "team": "team-name"
      }
    }
  }
}
```

### Provider Selection Priority
1. **Environment Variable**: `export AUTOPM_PROVIDER=azure`
2. **Configuration File**: `.claude/config.json`
3. **Default**: GitHub (if not configured)

### Authentication
```bash
# GitHub
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Azure DevOps
export AZURE_DEVOPS_TOKEN=xxxxxxxxxxxx
```

## 🔍 Filter Syntax

All list commands support advanced filtering:

### Status Filters
```bash
/pm:issue:list --status=open
/pm:issue:list --status=in_progress
/pm:issue:list --status=closed
/pm:pr:list --status=open
```

### Assignee Filters
```bash
/pm:issue:list --assignee=@me
/pm:issue:list --assignee=johndoe
/pm:issue:list --assignee=none
```

### Label/Tag Filters
```bash
/pm:issue:list --label=bug
/pm:issue:list --label=enhancement
/pm:issue:list --tag=frontend
```

### Combined Filters
```bash
/pm:issue:list --status=open --assignee=@me --label=bug
/pm:pr:list --status=open --author=@me
```

### Date Filters
```bash
/pm:issue:list --created-after=2024-01-01
/pm:issue:list --updated-since=7d
/pm:pr:list --created-today
```

## 🎨 Output Formats

### Verbose Mode
```bash
autopm install --verbose

# Shows detailed file operations:
▶ Installing: .claude
    📁 Installing directory: .claude
      📋 Files to install: 127
      ➕ agents/AGENT-REGISTRY.md
      ➕ commands/pm/epic-start.md
      ... and 122 more files
✓ Installed: .claude
```

### Standard Mode
```bash
autopm install

# Concise output:
📦 Installing ClaudeAutoPM...
✓ Configuration applied
✓ Files installed
✓ CLAUDE.md generated
🎉 Installation complete!
```

## 🚨 Error Handling

### Common Issues
```bash
# Missing dependencies
autopm install
# ❌ Missing requirements: Git
# Solution: Install git first

# Permission issues  
autopm install /protected/path
# ❌ Permission denied
# Solution: Use sudo or choose different path

# Network issues
autopm install  
# ❌ Failed to download from GitHub
# Solution: Check internet connection, try again
```

### Recovery
```bash
# Restore from backup
ls -d .claude-backup-*
cp -r .claude-backup-20240113-143022/. .claude/

# Reset configuration
autopm config
# [7] Load template: full-devops
```

## 📖 Related Documentation

- **[Configuration Options](/reference/configuration)** - Detailed configuration guide
- **[Installation Guide](/getting-started/installation)** - Step-by-step installation
- **[Feature Toggles](/reference/feature-toggles)** - Feature management
- **[Troubleshooting](/reference/troubleshooting)** - Common issues and solutions

## 💡 Tips & Tricks

### Performance
- Use `--no-backup` for faster updates (only if you have git backup)
- Use `--verbose` to debug installation issues

### Automation
- Script installations with predefined configs
- Use environment variables to skip interactive prompts  

### Maintenance
- Run `autopm update` regularly for new features
- Use `autopm config` to explore new capabilities
- Backup your `.claude/config.json` for custom setups