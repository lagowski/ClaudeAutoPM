---
title: Plugin Development
description: Guide to creating ClaudeAutoPM plugins with plugin.json, agents, commands, and hooks
---

# Plugin Development

Plugins are the primary extension mechanism for ClaudeAutoPM. They package agents, commands, rules, hooks, and scripts into installable npm modules under the `@claudeautopm` scope. There are currently 13 plugins in the monorepo.

## Plugin Structure

```
packages/plugin-example/
├── package.json          # npm package configuration
├── plugin.json           # Plugin manifest (required, Schema v2.0)
├── README.md             # Plugin documentation
├── agents/               # Agent definitions (.md files)
│   └── category/
│       └── agent-name.md
├── commands/             # Command definitions
│   └── command-name.md
├── rules/                # Rule definitions (.xml or .md)
│   └── rule-name.xml
├── hooks/                # Hook implementations (.js, .sh)
│   └── hook-name.js
└── scripts/              # Utility scripts
    └── lib/
        └── utility.sh
```

## The plugin.json Manifest

The `plugin.json` file defines your plugin's contents and metadata using Schema v2.0:

```json
{
  "name": "@claudeautopm/plugin-example",
  "version": "1.0.0",
  "displayName": "Example Plugin",
  "description": "An example plugin demonstrating all features",
  "schemaVersion": "2.0",
  "metadata": {
    "category": "Example",
    "author": "Your Name",
    "license": "MIT",
    "homepage": "https://github.com/your-repo",
    "keywords": ["example", "demo"],
    "size": "5 KB (gzipped)",
    "required": false
  },
  "agents": [],
  "commands": [],
  "rules": [],
  "hooks": [],
  "scripts": [],
  "dependencies": {
    "required": [],
    "optional": []
  },
  "features": {},
  "installation": {
    "message": "Installing example plugin...",
    "postInstall": []
  },
  "compatibleWith": ">=3.0.0"
}
```

### Key Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | npm package name under `@claudeautopm` scope |
| `schemaVersion` | Yes | Must be `"2.0"` |
| `metadata.required` | No | If `true`, plugin is always installed (only `plugin-core`) |
| `agents` | No | Array of agent definitions |
| `compatibleWith` | Yes | Semver range for ClaudeAutoPM compatibility |

## Defining Agents

Agents are AI specialists injected into `agent-registry.xml` during installation. Add them to the `agents` array:

```json
{
  "agents": [
    {
      "name": "example-expert",
      "file": "agents/category/example-expert.md",
      "category": "example",
      "description": "Expert in example domain",
      "version": "1.0.0",
      "tags": ["example", "demo"]
    }
  ]
}
```

The agent markdown file:

```markdown
---
name: example-expert
description: Expert in example domain
tools: Glob, Grep, LS, Read, Edit, Write, Bash, Task, Agent
model: inherit
color: green
---

# Example Expert

You are a senior specialist in example domain.

## Test-Driven Development (TDD) Methodology

**MANDATORY**: Follow strict TDD principles:
1. Write failing tests FIRST
2. Red-Green-Refactor cycle
3. 100% coverage for new code

## Documentation Queries

- `mcp://context7/example/patterns` - Example patterns

## Core Expertise

- **Skill 1**: Description
- **Skill 2**: Description

## Self-Verification Protocol

Before delivering any solution, verify:
- [ ] Documentation from Context7 consulted
- [ ] Tests written and passing
- [ ] Best practices followed
```

### How Agents Are Installed

During `autopm install`, the installer:

1. Reads each plugin's `plugin.json`
2. Copies agent `.md` files to `.claude/agents/{category}/`
3. Injects agent entries into `agent-registry.xml` between `PLUGIN_AGENTS_START` and `PLUGIN_AGENTS_END` markers

This means agent availability is determined at install time, not runtime.

## Defining Commands

Commands are user-invokable actions. Add to the `commands` array:

```json
{
  "commands": [
    {
      "name": "example-action",
      "file": "commands/example-action.md",
      "description": "Perform an example action",
      "category": "example",
      "tags": ["example"]
    }
  ]
}
```

Command markdown file:

```markdown
---
allowed-tools: Bash, Read, Write, LS
---

# Example Action

## Usage
/example:action [name] [--flag]

## Quick Check
test -d .claude || echo "Missing .claude directory. Run: autopm install"

## Instructions
1. Validate input
2. Execute action
3. Handle errors

## Output
Example action complete
  - Result 1: [detail]
Next: /example:next-action

$ARGUMENTS
```

## Defining Rules

Rules enforce mandatory behaviors. Use XML format for auto-loaded rules (stronger model enforcement) or markdown for reference rules:

```json
{
  "rules": [
    {
      "name": "example-rule",
      "file": "rules/example-rule.xml",
      "priority": "medium",
      "description": "Enforce example behavior",
      "tags": ["enforcement"]
    }
  ]
}
```

Priority levels: `critical`, `high`, `medium`, `low`.

Rules are copied to `.claude/rules/` during installation and read on demand. To make a rule part of every session, add a short summary and its path to the CLAUDE.md template (`autopm/.claude/templates/claude-templates/`); Claude Code has no `@include` directive (its import syntax is `@path/to/file`).

## Defining Hooks

Hooks intercept operations for enforcement:

```json
{
  "hooks": [
    {
      "name": "pre-example-check",
      "file": "hooks/pre-example-check.js",
      "type": "pre-command",
      "description": "Check conditions before example commands",
      "blocking": true
    }
  ]
}
```

Hook types: `pre-command`, `pre-agent`, `pre-tool`, `wrapper`, `testing`, `documentation`.

## package.json Configuration

```json
{
  "name": "@claudeautopm/plugin-example",
  "version": "1.0.0",
  "description": "Example plugin for ClaudeAutoPM",
  "main": "index.js",
  "type": "module",
  "keywords": ["claude", "autopm", "plugin"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/lagowski/ClaudeAutoPM.git",
    "directory": "packages/plugin-example"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "agents/",
    "commands/",
    "rules/",
    "hooks/",
    "scripts/",
    "plugin.json",
    "README.md"
  ],
  "engines": {
    "node": ">=22.0.0"
  }
}
```

## Integration with Install Scenarios

To include your plugin in an installation scenario, add it to the scenario config in `install/install.js`:

```javascript
// In generateConfig()
docker: {
  plugins: ['plugin-core', 'plugin-languages', ..., 'plugin-example']
}
```

## Publishing to npm

Plugins are published under the `@claudeautopm` scope via CI-only workflow (GitHub Actions). Direct `npm publish` is not used.

### PR-Only Workflow

1. Create a branch with your plugin changes
2. Open a pull request to `main`
3. CI runs tests and validates `plugin.json`
4. After merge, the GitHub Actions workflow publishes to npm

## Testing Your Plugin

### Validate plugin.json

```bash
cd packages/plugin-example
npm run validate
```

### Test Installation

```bash
# From project root
npm run test:install

# Or manually
node bin/autopm.js plugin install plugin-example
node bin/autopm.js plugin info plugin-example
```

## Complete Minimal Example

**packages/plugin-example/plugin.json:**

```json
{
  "name": "@claudeautopm/plugin-example",
  "version": "1.0.0",
  "displayName": "Example Plugin",
  "description": "A minimal example plugin",
  "schemaVersion": "2.0",
  "metadata": {
    "category": "Examples",
    "author": "ClaudeAutoPM Team",
    "license": "MIT",
    "keywords": ["example"]
  },
  "agents": [
    {
      "name": "example-agent",
      "file": "agents/example/example-agent.md",
      "category": "example",
      "description": "A minimal example agent",
      "version": "1.0.0",
      "tags": ["example"]
    }
  ],
  "commands": [],
  "rules": [],
  "hooks": [],
  "scripts": [],
  "dependencies": {
    "required": ["@claudeautopm/plugin-core"],
    "optional": []
  },
  "compatibleWith": ">=3.0.0"
}
```

## Best Practices

1. **One domain per plugin** - Keep plugins focused on a single area
2. **Include TDD in agents** - All agents must have a TDD methodology section
3. **Add Context7 queries** - Every agent needs documentation query references
4. **Use XML for enforcement rules** - Stronger model adherence
5. **Test thoroughly** - Write tests for hooks and scripts
6. **Follow naming conventions** - kebab-case for files, consistent prefixes
7. **Version carefully** - Follow semantic versioning; CI handles publishing

## Next Steps

- [Agent Development](./agent-development.md) - Detailed agent creation guide
- [Command Development](./command-development.md) - Creating commands
- [Architecture](./architecture.md) - System design overview
