# @claudeautopm/plugin-pm

> **Complete Project Management Plugin for ClaudeAutoPM Framework**

[![npm version](https://img.shields.io/npm/v/@claudeautopm/plugin-pm.svg)](https://www.npmjs.com/package/@claudeautopm/plugin-pm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

`@claudeautopm/plugin-pm` provides comprehensive project management capabilities for the ClaudeAutoPM framework. This plugin includes complete workflows for epic management, issue tracking, GitHub synchronization, PRD (Product Requirements Document) management, release automation, and project analytics.

### Package Information

- **Package Name:** `@claudeautopm/plugin-pm`
- **Version:** 2.0.0
- **Schema Version:** 2.0
- **Category:** Project Management
- **Size:** ~25 KB (gzipped)
- **Total Scripts:** 66+ PM workflow scripts
- **Lines of Code:** ~13,500 lines

---

## 🎯 What's Included

### PM Workflow Scripts (66 files)

This plugin contains the complete PM workflow automation suite organized into:

#### Epic Management (13 scripts)
- **epic-close.js** - Close completed epics
- **epic-edit.js** - Edit epic metadata and content
- **epic-list.js/sh** - List all epics with filtering
- **epic-show.js/sh** - Display detailed epic information
- **epic-split.js** - Split large epics into smaller ones
- **epic-start/** - Epic initialization workflows
- **epic-status.js/sh** - Get epic status and progress
- **epic-sync/** - Synchronize epics with GitHub issues

#### Issue Management (7 scripts)
- **issue-close.js** - Close completed issues
- **issue-edit.js** - Edit issue metadata
- **issue-show.js** - Display issue details
- **issue-start.js** - Start work on an issue
- **issue-sync/** - Synchronize issues with GitHub
- **blocked.js/sh** - Manage blocked issues

#### PRD Management (5 scripts)
- **prd-new.js** - Create new PRD from template
- **prd-list.js/sh** - List Product Requirements Documents
- **prd-parse.js** - Parse PRD into actionable items
- **prd-status.js/sh** - Show PRD implementation status

#### Release & Publishing (1 script)
- **release.js** - Automated release workflow

#### GitHub Integration (6 scripts)
- **sync.js** - Synchronize PM artifacts with GitHub
- **sync-batch.js** - Batch synchronization
- **pr-create.js** - Create pull requests
- **pr-list.js** - List pull requests

#### Workflow Automation (10 scripts)
- **init.js/sh** - Initialize PM workflows
- **next.js/sh** - Determine next work item
- **what-next.js** - Intelligent next action recommendation
- **in-progress.js/sh** - Show in-progress items
- **status.js/sh** - Project status dashboard
- **standup.js/sh** - Generate standup reports

#### Context Management (4 scripts)
- **context.js** - Unified context management
- **context-create.js** - Create new context
- **context-prime.js** - Prime context with setup
- **context-update.js** - Update existing context

#### Analytics & Reporting (2 scripts)
- **analytics.js** - Generate project analytics
- **standup.js** - Standup report generation

#### Template Management (2 scripts)
- **template-list.js** - List available templates
- **template-new.js** - Create new templates

#### Utilities & Libraries (8 scripts)
- **lib/epic-discovery.js** - Epic discovery utilities
- **lib/logger.js** - Logging functions
- **help.js/sh** - Command help
- **search.js/sh** - Search PM artifacts
- **validate.js/sh** - Validate PM structure
- **clean.js** - Cleanup stale artifacts
- **optimize.js** - Optimize PM workflows

---

## 🚀 Installation

### Prerequisites

This plugin requires `@claudeautopm/plugin-core`:

```bash
npm install -g @claudeautopm/plugin-core
```

### Install Plugin

```bash
# Install from npm
npm install -g @claudeautopm/plugin-pm

# Activate in your project
cd your-project
autopm plugin install pm
```

---

## 💡 Usage

### Epic Management

```bash
# Initialize PM workflows
pm:init

# Create new epic
pm:epic-start "Epic Name"

# List all epics
pm:epic-list

# Show epic details
pm:epic-show epic-001

# Update epic status
pm:epic-status epic-001

# Close epic
pm:epic-close epic-001

# Sync epic with GitHub
pm:epic-sync epic-001
```

### Issue Management

```bash
# Start working on issue
pm:issue-start #123

# Show issue details
pm:issue-show #123

# Edit issue
pm:issue-edit #123

# Close issue
pm:issue-close #123

# Manage blocked issues
pm:blocked
```

### PRD (Product Requirements Document)

```bash
# Create new PRD
pm:prd-new "Feature Name"

# List all PRDs
pm:prd-list

# Parse PRD into tasks
pm:prd-parse prd-001

# Show PRD implementation status
pm:prd-status prd-001
```

### Release Management

```bash
# Automated release workflow
pm:release
```

### Workflow Automation

```bash
# Get next recommended action
pm:what-next

# Show in-progress work
pm:in-progress

# Overall project status
pm:status

# Generate standup report
pm:standup

# Search PM artifacts
pm:search "query"
```

### GitHub Integration

```bash
# Sync all artifacts with GitHub
pm:sync

# Batch synchronization
pm:sync-batch

# Create pull request
pm:pr-create

# List pull requests
pm:pr-list
```

### Analytics

```bash
# Generate project analytics
pm:analytics
```

---

## 🎨 Features

### ✅ Epic Management
Complete epic lifecycle from creation to closure, including splitting, editing, and GitHub synchronization.

### ✅ Issue Tracking
Comprehensive issue management with GitHub integration, blocking/unblocking, and workflow automation.

### ✅ GitHub Synchronization
Bidirectional sync with GitHub issues, pull requests, and project boards.

### ✅ PRD Management
Product Requirements Document workflows with templates, parsing, and status tracking.

### ✅ Release Automation
Automated release preparation, changelog generation, and publishing.

### ✅ Analytics & Reporting
Project metrics, standup reports, and status dashboards.

### ✅ Context Management
Track work context, manage state, and maintain continuity across sessions.

### ✅ Workflow Intelligence
AI-powered recommendations for next actions and workflow optimization.

---

## 📦 Package Structure

```
@claudeautopm/plugin-pm/
├── package.json              # npm package metadata
├── plugin.json               # v2.0 schema with all PM scripts
├── README.md                 # This file
├── LICENSE                   # MIT license
└── scripts/
    └── pm/                   # PM workflow scripts
        ├── analytics.js
        ├── blocked.js/sh
        ├── clean.js
        ├── context*.js
        ├── epic-*.js/sh
        ├── issue-*.js
        ├── prd-*.js/sh
        ├── pr-*.js
        ├── release.js
        ├── sync*.js
        ├── template-*.js
        ├── help.js/sh
        ├── init.js/sh
        ├── next.js/sh
        ├── optimize.js
        ├── search.js/sh
        ├── standup.js/sh
        ├── status.js/sh
        ├── validate.js/sh
        ├── what-next.js
        ├── epic-start/       # Epic start workflows
        ├── epic-sync/        # Epic GitHub sync
        ├── issue-sync/       # Issue GitHub sync
        └── lib/              # Shared libraries
```

---

## 🔗 Dependencies

### Peer Dependencies

- **@claudeautopm/plugin-core** (^2.0.0) - Core framework plugin (REQUIRED)

This plugin requires `plugin-core` for:
- Core agents (agent-manager, code-analyzer, test-runner)
- Framework rules (TDD, Context7 enforcement)
- Shared utilities (lib/, mcp/)

---

## 🔧 Configuration

The plugin integrates seamlessly with ClaudeAutoPM's plugin system. All PM scripts are automatically registered and available after installation.

### Plugin Metadata

```json
{
  "name": "@claudeautopm/plugin-pm",
  "version": "2.0.0",
  "schemaVersion": "2.0",
  "category": "project-management",
  "peerPlugins": ["@claudeautopm/plugin-core"]
}
```

---

## 📊 Statistics

- **Total Scripts:** 66 files
- **Lines of Code:** ~13,500 lines
- **Main Categories:** 8 (epic, issue, prd, release, github, workflow, context, analytics)
- **Subdirectories:** 4 (epic-start, epic-sync, issue-sync, lib)
- **Shell Wrappers:** 15 wrapper scripts for easy CLI access

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](https://github.com/rafeekpro/ClaudeAutoPM/blob/main/CONTRIBUTING.md).

---

## 📄 License

MIT © ClaudeAutoPM Team

---

## 🔗 Links

- **Homepage:** https://github.com/rafeekpro/ClaudeAutoPM
- **Issues:** https://github.com/rafeekpro/ClaudeAutoPM/issues
- **NPM:** https://www.npmjs.com/package/@claudeautopm/plugin-pm
- **Documentation:** https://github.com/rafeekpro/ClaudeAutoPM/tree/main/packages/plugin-pm

---

## 🎯 Compatibility

- **Node.js:** >= 22.0.0
- **ClaudeAutoPM:** >= 3.0.0
- **Plugin Core:** ^2.0.0

---

**Made with ❤️ by the ClaudeAutoPM Team**
