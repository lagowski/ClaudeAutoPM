# @claudeautopm/plugin-core

> Core framework functionality for ClaudeAutoPM

**Version:** 2.0.0
**Category:** Core Framework
**Size:** ~8 KB (gzipped)
**Status:** ✅ Required (always installed)

---

## Overview

This is the **core framework plugin** that provides essential functionality for ClaudeAutoPM. It includes universal agents, rules, hooks, and utilities that apply to ALL projects regardless of technology stack.

**This plugin is REQUIRED** and is automatically installed with ClaudeAutoPM.

---

## What's Included

### 🤖 Agents (4)

Core agents for framework functionality:

1. **agent-manager** - Create, analyze, and manage agents in the registry
2. **code-analyzer** - Analyze code changes for bugs, trace logic flow, investigate issues
3. **test-runner** - Run tests and provide comprehensive analysis of results
4. **file-analyzer** - Analyze and summarize large files to reduce context usage

### 📋 Commands (3)

Framework utility commands:

1. **code-rabbit** - Process CodeRabbit review comments with context-aware discretion
2. **prompt** - Handle complex prompts with many @ references
3. **re-init** - Reinitialize CLAUDE.md with framework rules

### 📜 Rules (23)

Universal rules that apply to all projects:

**Critical Priority:**
- `tdd.enforcement` - Enforce Test-Driven Development (Red-Green-Refactor)
- `context7-enforcement` - Enforce Context7 documentation queries
- `framework-path-rules` - Path convention enforcement
- `golden-rules` - Core framework principles
- `security-checklist` - Universal security standards

**High Priority:**
- `agent-coordination` - Agent orchestration patterns
- `agent-mandatory` - Agent usage requirements
- `command-pipelines` - Command orchestration
- `development-workflow` - Universal development workflow
- `git-strategy` - Git workflow and branching
- `definition-of-done` - Quality standards
- `pipeline-mandatory` - Pipeline enforcement

**Medium Priority:**
- `ai-integration-patterns` - AI integration best practices
- `context-optimization` - Context management strategies
- `development-environments` - Environment setup
- `naming-conventions` - Naming standards
- `no-pr-workflow` - Alternative git workflow
- `performance-guidelines` - Performance optimization
- `standard-patterns` - Universal coding patterns

**Low Priority:**
- `datetime` - Date/time handling conventions
- `frontmatter-operations` - Frontmatter parsing
- `strip-frontmatter` - Frontmatter utilities
- `use-ast-grep` - AST parsing utilities

### 🪝 Hooks (7)

Enforcement hooks for framework behavior:

**Context7 Enforcement:**
- `pre-command-context7.js` - Enforce Context7 queries before command execution (BLOCKING)
- `pre-agent-context7.js` - Enforce Context7 queries before agent invocation (BLOCKING)
- `unified-context7-enforcement.sh` - Unified Context7 wrapper
- `context7-reminder.md` - Context7 reminder text

**Agent Enforcement:**
- `enforce-agents.js` + `.sh` - Enforce agent usage over direct tool calls (BLOCKING)
- `strict-enforce-agents.sh` - Stricter agent enforcement (BLOCKING)

**Testing:**
- `test-hook.sh` - Hook testing utility

### 📦 Scripts (10)

Framework utilities and libraries:

**lib/ - Shared Libraries (5 scripts):**
- `datetime-utils.sh` - Date and time utilities
- `frontmatter-utils.sh` - Markdown frontmatter parsing
- `github-utils.sh` - GitHub API utilities
- `logging-utils.sh` - Logging utilities
- `validation-utils.sh` - Validation utilities

**mcp/ - MCP Management (5 scripts):**
- `add.sh` - Add MCP server
- `enable.sh` - Enable MCP server
- `disable.sh` - Disable MCP server
- `list.sh` - List MCP servers
- `sync.sh` - Sync MCP configuration

---

## Installation

This plugin is **automatically installed** with ClaudeAutoPM. No manual installation needed.

```bash
# When you install ClaudeAutoPM:
npm install -g claudeautopm
autopm init

# plugin-core is automatically included
```

---

## Features

### TDD Enforcement ✅

**Always enabled** - Enforces Test-Driven Development:
- Red-Green-Refactor cycle mandatory
- Tests MUST be written before implementation
- 100% test coverage for new code
- Zero tolerance policy

```bash
# Enforced by: rules/tdd.enforcement.md
```

### Context7 Enforcement ✅

**Always enabled** - Enforces Context7 documentation queries:
- MUST query Context7 before ALL command/agent execution
- Live documentation verification
- API signature validation
- Zero tolerance policy

```bash
# Enforced by:
# - rules/context7-enforcement.md
# - hooks/pre-command-context7.js
# - hooks/pre-agent-context7.js
```

### Agent Coordination ✅

**Always enabled** - Agent orchestration and coordination:
- Agent selection patterns
- Parallel vs sequential execution
- Error handling in agent workflows
- Context management between agents

```bash
# Enforced by: rules/agent-coordination.md
```

### MCP Management ✅

**Always enabled** - MCP server management utilities:
- Add/enable/disable MCP servers
- List configured servers
- Sync MCP configuration

```bash
# Provided by: scripts/mcp/*.sh
```

---

## Usage

### Using Core Agents

```bash
# Invoke agents directly
@agent-manager create a new specialized agent for GraphQL
@code-analyzer review recent changes for bugs
@test-runner execute full test suite with analysis
@file-analyzer summarize large-log-file.log
```

### Using Core Commands

```bash
# Process CodeRabbit reviews
/code-rabbit

# Handle complex prompts
/prompt

# Reinitialize framework
/re-init
```

### Using Scripts

```bash
# Use utility libraries (sourced by other scripts)
source .claude/scripts/lib/github-utils.sh
source .claude/scripts/lib/logging-utils.sh

# MCP management
bash .claude/scripts/mcp/add.sh context7
bash .claude/scripts/mcp/list.sh
bash .claude/scripts/mcp/sync.sh
```

---

## Dependencies

### Peer Dependencies

None - this is the base plugin.

### Required By

All other plugins depend on `plugin-core`:
- `@claudeautopm/plugin-pm` - PM workflows
- `@claudeautopm/plugin-devops` - DevOps automation
- `@claudeautopm/plugin-cloud` - Cloud infrastructure
- `@claudeautopm/plugin-frameworks` - Frontend frameworks
- `@claudeautopm/plugin-databases` - Databases
- `@claudeautopm/plugin-languages` - Programming languages
- `@claudeautopm/plugin-data` - Data engineering

---

## Configuration

No configuration needed - all core features are always enabled.

---

## Size and Performance

- **Package size:** ~8 KB (gzipped) / ~80 KB (uncompressed)
- **Installation time:** < 1 second
- **Memory footprint:** Minimal (utilities loaded on-demand)

---

## Compatibility

- **Minimum ClaudeAutoPM version:** 3.0.0
- **Node.js:** >= 22.0.0
- **Platform:** Cross-platform (macOS, Linux, Windows)

---

## License

MIT

---

## Support

- **Issues:** https://github.com/lagowski/ClaudeAutoPM/issues
- **Documentation:** https://github.com/lagowski/ClaudeAutoPM#readme
- **Changelog:** See [CHANGELOG.md](../../CHANGELOG.md)

---

**Part of ClaudeAutoPM v3.0.0 Plugin Architecture**
