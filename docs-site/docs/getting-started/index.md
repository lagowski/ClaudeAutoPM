---
title: Getting Started
description: Quick start guide for ClaudeAutoPM - AI-powered project management for Claude Code
---

# Getting Started with ClaudeAutoPM

Welcome to ClaudeAutoPM, the autonomous project management framework for Claude Code. This guide will help you get up and running quickly with AI-powered spec-driven development.

## What is ClaudeAutoPM?

ClaudeAutoPM transforms your development workflow by automating project management from requirements to production. It provides:

- **Spec-Driven Development**: Convert PRDs to epics, epics to issues, and issues to production code
- **AI-Powered Agents**: 96+ specialized CLI commands with parallel agent execution
- **Multi-Provider Support**: Seamless integration with GitHub Issues and Azure DevOps
- **Smart Context Management**: Intelligent context preservation prevents information loss

## Quick Start

Get started in under 5 minutes:

```bash
# 1. Install ClaudeAutoPM globally
npm install -g claude-autopm

# 2. Navigate to your project
cd your-project

# 3. Install the framework
autopm install

# 4. Start using PM commands in Claude Code
/pm:init
```

## Documentation Sections

### [Installation](./installation.md)

Complete installation guide covering:
- System requirements
- Installation methods (npm, npx, legacy)
- Installation scenarios (Lite, Standard, Azure, Docker, Full DevOps, Performance)
- Non-interactive installation for CI/CD
- Troubleshooting common issues

### [Your First Project](./first-project.md)

A hands-on 5-minute tutorial walking through:
- Creating your first PRD with `/pm:prd-new`
- Converting PRD to epic with `/pm:prd-parse`
- Breaking epic into tasks with `/pm:epic-decompose`
- Syncing to GitHub with `/pm:epic-sync`
- Starting development with `/pm:issue-start`

### [Configuration](./configuration.md)

Learn how to customize ClaudeAutoPM:
- Understanding the `.claude/` directory structure
- Plugin selection and management
- Configuration file (`config.json`) options
- Environment variables
- Feature toggles

## Core Workflow

ClaudeAutoPM follows a spec-driven development workflow:

```
PRD (Requirements) → Epic (Technical Plan) → Tasks → GitHub Issues → Code
```

| Step | Command | Output |
|------|---------|--------|
| 1. Initialize | `/pm:init` | Project configured |
| 2. Create PRD | `/pm:prd-new feature-name` | PRD document |
| 3. Parse to Epic | `/pm:prd-parse feature-name` | Technical epic |
| 4. Decompose | `/pm:epic-decompose feature-name` | Actionable tasks |
| 5. Sync | `/pm:epic-sync feature-name` | GitHub issues |
| 6. Work | `/pm:issue-start 123` | Development begins |

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **Git** installed and configured
- **Claude Code** or compatible AI coding assistant
- **GitHub CLI** (optional, installed automatically during setup)

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lagowski/ClaudeAutoPM/discussions)
- **Documentation**: Explore the sidebar for detailed guides

## Next Steps

Ready to dive in? Start with the [Installation Guide](./installation.md) to set up ClaudeAutoPM in your development environment.
