---
title: Developer Guide
description: Comprehensive guide for developers and contributors to ClaudeAutoPM framework
---

# Developer Guide

Welcome to the ClaudeAutoPM Developer Guide. This documentation is designed for developers who want to contribute to the framework, create plugins, develop agents, or extend the system's capabilities.

## Who Should Read This

- **Contributors** looking to improve ClaudeAutoPM
- **Plugin Developers** creating new functionality
- **Agent Developers** building specialized AI agents
- **Command Developers** adding new commands to the framework
- **Integration Engineers** connecting ClaudeAutoPM with external systems

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Architecture](./architecture.md) | Project structure and system design |
| [Plugin Development](./plugin-development.md) | Creating plugins with plugin.json |
| [Agent Development](./agent-development.md) | Building specialized AI agents |
| [Command Development](./command-development.md) | Adding new commands |
| [Testing](./testing.md) | TDD approach and Jest setup |
| [Contributing](./contributing.md) | How to contribute and PR process |

## Core Principles

ClaudeAutoPM development follows strict principles that ensure quality and consistency:

### 1. Test-Driven Development (TDD)

**MANDATORY** for all code changes:
- Write failing tests FIRST
- Follow Red-Green-Refactor cycle
- Achieve 100% coverage for new code
- Use Jest framework

```javascript
// Example: TDD approach
describe('PluginManager', () => {
  it('should discover plugins in node_modules', async () => {
    // RED: Write test first
    const manager = new PluginManager();
    await manager.initialize();

    expect(manager.plugins.size).toBeGreaterThan(0);
  });
});
```

### 2. Context7 Documentation Verification

All implementations must query Context7 for current documentation:

```markdown
**Documentation Queries:**
- `mcp://context7/framework/latest` - Framework documentation
- `mcp://context7/tool/patterns` - Tool-specific patterns
```

### 3. Agent-First Development

Use specialized agents for complex tasks rather than direct tool calls:

```markdown
# Instead of direct grep/find
@code-analyzer review recent changes for bugs

# Instead of manual testing
@test-runner execute all tests with analysis
```

### 4. Minimal Viable Implementation

- Do not over-engineer
- Trust the system
- Fail fast with clear errors
- Use smart defaults over excessive questions

## Development Environment Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Git
- Claude Code CLI (for testing agents)

### Installation

```bash
# Clone the repository
git clone https://github.com/lagowski/ClaudeAutoPM.git
cd ClaudeAutoPM

# Install dependencies
npm install

# Setup git hooks (run once)
npm run setup:githooks

# Run tests to verify setup
npm test
```

### Project Structure Overview

```
ClaudeAutoPM/
├── lib/                    # Core library code
│   ├── cli/commands/       # CLI command implementations
│   ├── plugins/            # Plugin management system
│   ├── providers/          # Provider implementations (GitHub, Azure)
│   ├── services/           # Business logic services
│   └── utils/              # Utility functions
├── packages/               # Plugin packages (npm workspaces)
│   ├── plugin-core/        # Core framework plugin
│   ├── plugin-pm/          # Project management plugin
│   ├── plugin-languages/   # Language-specific agents
│   └── ...                 # Additional plugins
├── autopm/                 # Framework resources (copied during install)
│   └── .claude/            # Claude configuration resources
├── .claude/                # Project's own maintenance configuration
├── bin/                    # CLI executables
├── test/                   # Test suites
├── install/                # Installation scripts
└── docs-site/              # Documentation website
```

## Key Concepts

### Plugins

Plugins are modular packages that extend ClaudeAutoPM with new agents, commands, rules, hooks, and scripts. Each plugin has a `plugin.json` manifest file that defines its contents.

```json
{
  "name": "@claudeautopm/plugin-core",
  "version": "2.0.0",
  "displayName": "Core Framework",
  "agents": [...],
  "commands": [...],
  "rules": [...]
}
```

### Agents

Agents are specialized AI assistants with defined expertise areas and toolsets. They handle complex tasks through the Task tool delegation pattern.

```markdown
---
name: code-analyzer
description: Analyze code changes for bugs
tools: Glob, Grep, Read, Task, Agent
---

# Code Analyzer

You are an expert code analyst...
```

### Commands

Commands are user-invokable actions that Claude executes. They follow a standard structure with frontmatter, usage instructions, and output formats.

```markdown
---
allowed-tools: Bash, Read, Write
---

# Command Name

## Usage
/namespace:command [arguments]

## Instructions
...
```

## Development Workflow

### Starting Development

1. **Check existing code** for patterns and conventions
2. **Create a branch** for your feature: `git checkout -b feat/my-feature`
3. **Write failing tests first** (TDD)
4. **Implement minimal code** to pass tests
5. **Refactor** while keeping tests green
6. **Run full test suite**: `npm test`
7. **Submit PR** with clear description

### Testing Your Changes

```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific test file
npm test -- test/core/PluginManager.test.js

# Run coverage report
npm run test:coverage

# Run security tests
npm run test:security
```

### Before Committing

1. Ensure all tests pass
2. Run path validation: `npm run validate:paths`
3. Follow conventional commit format
4. Do not include Claude collaboration signatures

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lagowski/ClaudeAutoPM/discussions)
- **Documentation**: Review `.claude/DEVELOPMENT-STANDARDS.md`
- **Agent Registry**: See `.claude/agents/AGENT-REGISTRY.md`

## Next Steps

1. Read the [Architecture](./architecture.md) to understand the system design
2. Learn [Plugin Development](./plugin-development.md) for creating extensions
3. Study [Testing](./testing.md) for proper TDD practices
4. Review [Contributing](./contributing.md) before submitting PRs
