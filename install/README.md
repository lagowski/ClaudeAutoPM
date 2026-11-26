# 🚀 ClaudeAutoPM Installation Scripts

This directory contains installation and configuration scripts for the **ClaudeAutoPM (Autonomous Project Management)** framework.

## 📁 Contents

| File | Description |
|------|-------------|
| `install.sh` / `install.js` | Main installation script for ClaudeAutoPM framework (`install.sh` is a wrapper around `install.js`; `autopm install` runs `install.js`) |
| `update.sh` | Update existing installation to latest framework version |
| `merge-claude.sh` / `merge-claude.js` | Helper for merging CLAUDE.md configurations |
| `setup-env.sh` / `setup-env.js` | Interactive `.claude/.env` setup |
| `post-install-check.js` | Post-installation validation |
| `plugin-manifest-generator.js` | Generates the installed-plugins manifest |
| `README.md` | This documentation file |

## 🎯 Quick Start

### Fresh Installation

```bash
# Clone or download ClaudeAutoPM, then run:
cd ClaudeAutoPM
./install/install.sh

# Or install to specific directory:
./install/install.sh /path/to/your/project
```

### Update Existing Installation

**Recommended method (via CLI):**
```bash
# Update to latest framework version (recommended)
autopm update

# Force update with options
autopm update --force --no-backup
```

**Manual method (direct script):**
```bash
# Run update script directly
./install/update.sh

# Or use installer (legacy method)
./install/install.sh
```

## 📋 Installation Script (`install.sh`)

### What It Does

✅ **Installs/Updates Core Components:**

- `.claude/` - agents, commands, rules, hooks, scripts, checklists, strategies, MCP definitions, templates and quick-reference docs
- `.claude-code/` - Claude Code specific settings
- `scripts/` - `safe-commit` and `setup-hooks` helpers
- The agents and commands of the plugins that belong to the chosen scenario

✅ **Handles CLAUDE.md Migration:**

- Generates `CLAUDE.md` from `.claude/templates/claude-templates/base.md` plus the add-ons that match your configuration (new installations)
- Detects conflicts with existing `CLAUDE.md`
- Offers intelligent merge prompts for combining configurations

✅ **Smart Update Logic:**

- Creates automatic backups during updates
- Only updates changed files
- Preserves user customizations
- Handles version synchronization

### Usage Examples

```bash
# Interactive installation in current directory
./install/install.sh

# Install to specific project
./install/install.sh ~/my-project

# The script will guide you through the process
```

### Installation Modes

#### 🆕 Fresh Installation

- Copies all framework files
- Generates `CLAUDE.md` from the `claude-templates` base and add-ons
- Sets up complete project structure

#### 🔄 Update/Sync Mode

- Detects existing installation
- Creates automatic backup
- Updates only changed files
- Offers merge assistance for `CLAUDE.md`

## 🔄 Update Script (`update.sh`)

### What It Does

**Smart Framework Updates** that preserve your work:

✅ **Version Management:**
- Detects current and new framework versions
- Only updates when necessary (unless forced)
- Shows clear before/after version information

✅ **Data Protection:**
- Creates automatic backup before updating
- Preserves all configuration files (`config.json`, `.env.local`, etc.)
- Protects project data (`epics/`, `prds/` directories)
- Maintains custom settings and team configurations

✅ **Framework Updates:**
- Updates all framework components (`agents/`, `commands/`, `rules/`, etc.)
- Installs new features and capabilities
- Fixes bugs and security issues
- Updates documentation and examples

### Usage

```bash
# Standard update (recommended)
autopm update

# Force update regardless of version
autopm update --force

# Update without backup (not recommended)
autopm update --no-backup

# Update without preserving config (fresh start)
autopm update --no-preserve-config
```

### Safety Features

🛡️ **Automatic Backup** - Copies `.claude/` to `.claude-backup-YYYYMMDD-HHMMSS/` before any changes
🔒 **Config Preservation** - Keeps your settings and customizations
📁 **Data Protection** - Never touches your epics, PRDs, or project files
⚡ **Quick Rollback** - Easy to restore from backup if needed

### What Gets Updated

**Framework Components (Updated):**
- `agents/` - Latest agent definitions and capabilities
- `commands/` - New PM commands and improvements
- `scripts/` - Bug fixes and performance improvements
- `rules/` - Updated development patterns
- `templates/` - New project templates

> **Local edits to framework files are kept** ([#790](https://github.com/lagowski/ClaudeAutoPM/issues/790)).
> `install` and `update` record the sha256 of each shipped file in `.claude/.autopm-manifest`. On update, a file
> that differs from its recorded hash is left as it is, and the shipped version is written next to it as
> `<file>.autopm-new` (take it with `mv .claude/<file>.autopm-new .claude/<file>`). A shipped file you deleted is
> not reinstalled, files the framework never shipped are left alone, and a retired file is removed only if
> unedited. An install older than the manifest has no record yet: its first update replaces changed files (your
> copy stays in the backup directory) and writes the manifest.

**Your Data (Preserved):**
- `config.json` - Your provider and settings
- `settings.local.json` - Your local Claude Code settings
- `epics/` - All your epic files and tasks
- `prds/` - All your product requirements
- `teams.json` - Your team configurations
- `.env.local` - Your environment variables

## 🤖 Merge Helper (`merge-claude.sh`)

### What It Does

Generates comprehensive AI prompts for intelligently merging:

- Your existing `CLAUDE.md` (with customizations)
- A newly generated framework `CLAUDE.md` (framework updates)

### Usage

```bash
# Interactive mode (auto-discovers files)
./install/merge-claude.sh

# Explicit file paths
./install/merge-claude.sh CLAUDE.md <new-CLAUDE.md>

# Save prompt to file
./install/merge-claude.sh CLAUDE.md <new-CLAUDE.md> merge_prompt.md
```

### Output Options

1. **Console Output**: Print merge prompt to terminal
2. **File Output**: Save prompt to file for later use
3. **Both**: Print and save simultaneously

### Merge Strategy

The generated prompt instructs AI to:

🎯 **Preserve** (Highest Priority):

- All user customizations and preferences
- Custom rules and workflows  
- Project-specific configurations
- User's tone and behavior settings

🎯 **Integrate** (High Priority):

- New framework agents and capabilities
- Updated documentation paths
- New rule files and commands
- Enhanced patterns and examples

🎯 **Optimize** (Medium Priority):

- Remove duplications
- Update outdated references
- Improve organization and structure
- Merge similar sections intelligently

## 🔧 Installation Process Flow

```
flowchart TD
    A[Run install.sh] --> B{Existing Installation?}
    
    B -->|No| C[Fresh Installation]
    C --> D[Copy all framework files]
    D --> E[Generate CLAUDE.md from templates]
    E --> F[Setup complete]
    
    B -->|Yes| G[Update Mode]
    G --> H[Create backup]
    H --> I[Update changed files]
    I --> J{CLAUDE.md already exists?}
    
    J -->|No| K[Update complete]
    J -->|Yes| L[Offer merge assistance]
    L --> M{User wants merge prompt?}
    
    M -->|No| K
    M -->|Yes| N[Generate merge prompt]
    N --> O{Output preference?}
    
    O --> P[Console/File/Both]
    P --> K
```

## 📋 File Change Detection

The installer uses intelligent file comparison to:

- ✅ **Skip unchanged files** - Faster updates
- ✅ **Update only modified files** - Preserve customizations  
- ✅ **Detect an existing CLAUDE.md** - Trigger merge assistance
- ✅ **Create backups before changes** - Safety first

## 🛡️ Safety Features

### Automatic Backups

- `autopm update` copies the whole `.claude/` directory to `.claude-backup-YYYYMMDD-HHMMSS/` first
  (skipped with `--no-backup`).
- `autopm install` leaves existing files alone unless `--force` is given; with `--force` the replaced
  file is kept next to it as `<file>.backup`. An existing `CLAUDE.md` or `.claude/config.json` that is
  replaced is kept as `<file>.backup.<timestamp>`.

### Error Handling

- Validates all file paths before operations
- Checks dependencies (git, diff)
- Graceful failure with helpful error messages
- Cleanup of temporary files on exit

## 🔍 Troubleshooting

### Common Issues

**Permission denied:**

```bash
chmod +x install/install.sh
chmod +x install/merge-claude.sh
```

**Missing dependencies:**

```bash
# Install git and standard utilities
sudo apt-get install git diffutils  # Ubuntu/Debian
brew install git                    # macOS
```

**Backup location:**

```bash
# Update backups are created with a timestamp
ls -d .claude-backup-*
```

### Getting Help

1. **Check logs**: Installation provides detailed output
2. **Review backups**: All changes are backed up
3. **Manual merge**: Use `merge-claude.sh` separately
4. **Roll back an update**: restore `.claude/` from the newest `.claude-backup-*` directory

## 🗂️ Shared Scripts Architecture (Source of Truth)

Shared scripts exist in three locations in this repository:

| Location | Role |
|----------|------|
| `packages/plugin-core/scripts/` | **Single source of truth** — edit scripts ONLY here |
| `autopm/.claude/scripts/` | Installer payload — copied into user projects by `autopm install` (generated, do not edit) |
| `.claude/scripts/` | This repo's own installed copy — consumer (generated, do not edit) |

The two consumer trees are refreshed from plugin-core by an automated sync.
Files that exist only in a consumer tree (e.g. the payload's `pm/*.js`
command implementations) are not managed by the sync and live where they are.

### Sync Commands

```bash
npm run sync:scripts        # copy plugin-core/scripts → both consumer trees
npm run sync:scripts:check  # report divergence without writing (CI uses this)
```

The `Scripts Sync Check` workflow (`.github/workflows/scripts-sync-check.yml`)
fails any PR where a consumer copy diverges (content, mode, or missing file)
from plugin-core, and runs `bash -n` over every `.sh` file in all three trees.

### Adding a New Shared Script

1. Create the script under `packages/plugin-core/scripts/` (use the correct
   subdirectory: `lib/`, `mcp/`, `config/`, `hooks/`, or root). Make `.sh`
   files executable (`chmod +x`).
2. Register it in `packages/plugin-core/plugin.json` under `scripts`.
3. Run `npm run sync:scripts` and commit all three copies together.
4. Never edit the copies in `autopm/.claude/scripts/` or `.claude/scripts/`
   directly — the CI check will reject the PR.

### Repo-Only Scripts

Repo maintenance scripts in `scripts/` at the repository root (build, CI,
migration tooling) are not part of the framework payload and are maintained
independently.

## 📖 Related Documentation

- [`PLAYBOOK.md`](../autopm/PLAYBOOK.md) - ClaudeAutoPM usage guide
- [`COMMIT_CHECKLIST.md`](../autopm/.claude/checklists/COMMIT_CHECKLIST.md) - Quality standards
- [`autopm/.claude/rules/`](../autopm/.claude/rules/) - Development rules shipped to user projects

## 🎉 Post-Installation

After successful installation:

1. **Review `CLAUDE.md`** - Customize for your project
2. **Setup `.env`** - Copy `.claude/.env.example` → `.claude/.env`
3. **Add API keys** - Fill in your service credentials
4. **Explore `.claude/rules/`** - Understand development standards

---

**Ready to install?** Run `autopm install` and let ClaudeAutoPM transform your development workflow! 🚀
