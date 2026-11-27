---
title: Architecture
description: ClaudeAutoPM v4.0.0 project architecture, plugin system, providers, and XML rules
---

# Project Architecture

ClaudeAutoPM v4.0.0 follows a plugin-based architecture with 14 npm packages, a provider router for issue tracking, and an XML rules system for token-efficient context loading.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ClaudeAutoPM v4.0.0                         │
├─────────────────────────────────────────────────────────────────┤
│  CLI Layer (bin/)                                               │
│  ├── autopm.js (main entry point)                               │
│  └── Command routing via yargs                                  │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (lib/services/)                                  │
│  ├── AgentService      │ PRDService                             │
│  ├── ContextService    │ TaskService                            │
│  ├── EpicService       │ UtilityService                         │
│  ├── IssueService      │ WorkflowService                        │
│  └── ServiceFactory (dependency injection)                      │
├─────────────────────────────────────────────────────────────────┤
│  Plugin System (lib/plugins/)                                   │
│  └── PluginManager (discovery, loading, installation)           │
├─────────────────────────────────────────────────────────────────┤
│  Provider Router (.claude/providers/router.js)                  │
│  ├── LocalProvider   (providers/local/)    ← default            │
│  ├── GitHubProvider  (lib/providers/)      ← plugin-pm-github   │
│  └── AzureProvider   (lib/providers/)      ← plugin-pm-azure   │
├─────────────────────────────────────────────────────────────────┤
│  14 Plugin Packages (packages/plugin-*)                          │
│  ├── plugin-core (7 agents)    │ plugin-pm (commands)           │
│  ├── plugin-languages (5)      │ plugin-frameworks (4)          │
│  ├── plugin-devops (7)         │ plugin-cloud (8)               │
│  ├── plugin-databases (6)      │ plugin-testing (1)             │
│  ├── plugin-ai (8)             │ plugin-ml (10)                 │
│  ├── plugin-data (3)           │ plugin-pm-github               │
│  └── plugin-pm-azure                                            │
├─────────────────────────────────────────────────────────────────┤
│  Rules System (8 XML + 3 MD, read on demand)                    │
│  ├── tdd.enforcement.xml       │ coverage-thresholds.xml        │
│  ├── agent-mandatory.xml       │ context7.xml                   │
│  ├── github-operations.xml     │ naming-conventions.xml         │
│  ├── command-pipelines.xml     │ issue-structure.xml            │
│  └── standard-patterns.md, git-strategy.md,                    │
│       frontmatter-operations.md                                 │
├─────────────────────────────────────────────────────────────────┤
│  Dynamic Agent Registry (agent-registry.xml)                    │
│  ├── 7 core agents (always present)                             │
│  └── PLUGIN_AGENTS_START/END markers for injected agents        │
└─────────────────────────────────────────────────────────────────┘
```

## Plugin System

### 14 Plugin Packages

All plugins are published under the `@claudeautopm` scope on npm and managed via npm workspaces:

```
packages/
├── plugin-core/         # 7 core agents, core commands, rules, hooks
├── plugin-pm/           # PM commands (prd, epic, issue, workflow)
├── plugin-pm-github/    # GitHub provider integration
├── plugin-pm-azure/     # Azure DevOps provider integration
├── plugin-languages/    # 5 language specialist agents (see plugin.json)
├── plugin-frameworks/   # 4 framework specialist agents (see plugin.json)
├── plugin-devops/       # 7 DevOps agents: Docker, CI/CD, observability (see plugin.json)
├── plugin-cloud/        # 8 cloud/infra agents: AWS, Azure, GCP, K8s, Terraform (see plugin.json)
├── plugin-databases/    # 6 database specialist agents
├── plugin-testing/      # 1 frontend testing engineer agent (see plugin.json)
├── plugin-ai/           # 8 AI/ML integration agents
├── plugin-data/         # 3 data pipeline agents
├── plugin-ml/           # 10 machine learning agents
└── plugin-obsidian/     # Obsidian vault integration
```

### Plugin Manifest (plugin.json)

Each plugin defines its contents in a `plugin.json` file using Schema v2.0:

```json
{
  "name": "@claudeautopm/plugin-core",
  "version": "2.0.0",
  "displayName": "Core Framework",
  "schemaVersion": "2.0",
  "metadata": {
    "category": "Core Framework",
    "required": true
  },
  "agents": [
    {
      "name": "agent-manager",
      "file": "agents/core/agent-manager.md",
      "category": "core"
    }
  ],
  "commands": [...],
  "rules": [...],
  "hooks": [...],
  "scripts": [...],
  "dependencies": { "required": [], "optional": [] },
  "compatibleWith": ">=3.0.0"
}
```

### Plugin Manager

```javascript
class PluginManager extends EventEmitter {
  async initialize() {
    await this.discoverPlugins();   // Monorepo: scan packages/; installed projects: scan node_modules/@claudeautopm/
    await this.validatePlugins();   // Check version compatibility
  }

  async installPlugin(pluginName) {
    // Install agents, commands, rules, hooks, scripts to .claude/
  }
}
```

## Provider System

ClaudeAutoPM supports three issue tracking providers, selected by installation scenario.

### Provider Router

The provider router (`providers/router.js`) auto-selects the active provider based on `.claude/config.json`:

```
config.json → PROVIDER: "local" | "github" | "azure"
    │
    ▼
router.js → delegates to appropriate provider
    │
    ├── local/   → File-based issue tracking (no external service)
    ├── github/  → GitHub Issues via gh CLI
    └── azure/   → Azure DevOps work items via az CLI
```

### Local Provider (Default)

The local provider stores issue data in `.claude/issues/` and provider scripts in `.claude/providers/local/`:

- `issue-create.js` - Create local issues
- `issue-list.js` - List issues from local store
- `issue-show.js` - Display issue details
- `issue-start.js` - Mark issue as in-progress
- `issue-close.js` - Close completed issues

No external service or authentication required. This is the default for the `lite` scenario.

### Provider Selection by Scenario

| Scenario | Provider |
|----------|----------|
| lite | local |
| github | github |
| azure | azure |
| docker | github |
| full | github |
| full-azure | github + azure |
| performance | github |

## XML Rules System

ClaudeAutoPM ships 8 XML rules in `.claude/rules/`:

- `tdd.enforcement.xml`, `coverage-thresholds.xml`, `agent-mandatory.xml`, `context7.xml`
- `github-operations.xml`, `naming-conventions.xml`, `command-pipelines.xml`, `issue-structure.xml`

They are **not** loaded into context automatically. The generated CLAUDE.md carries a short
summary of the critical rules with a pointer to each full file (`📖 Full: .claude/rules/...`),
and Claude reads the full rule when the work needs it. Claude Code has no `@include` directive (its import syntax is `@path/to/file`), so nothing below is loaded into context automatically.

XML format was chosen over markdown for rules because:
- Stronger enforcement by the model (XML tags are treated as structured instructions)
- More compact representation (fewer tokens)
- Clear nesting and hierarchy

Three additional MD rules are available as reference:
- `standard-patterns.md` - Output formats, error messages
- `git-strategy.md` - Branch-based workflow
- `frontmatter-operations.md` - YAML frontmatter read/write

## Dynamic Agent Registry

The `agent-registry.xml` file is the single source of truth for available agents:

```xml
<agent-registry version="2.0.0" core-agents="7">
  <agents category="core">
    <agent name="agent-manager" path="agents/core/agent-manager.md">...</agent>
    <agent name="file-analyzer" path="agents/core/file-analyzer.md">...</agent>
    <agent name="code-analyzer" path="agents/core/code-analyzer.md">...</agent>
    <agent name="test-runner" path="agents/core/test-runner.md">...</agent>
    <agent name="parallel-worker" path="agents/core/parallel-worker.md">...</agent>
    <agent name="mcp-manager" path="agents/core/mcp-manager.md">...</agent>
    <agent name="context-optimizer" path="agents/core/context-optimizer.md">...</agent>
  </agents>

  <!-- PLUGIN_AGENTS_START -->
  <!-- Injected by install.js based on installed plugins -->
  <!-- PLUGIN_AGENTS_END -->
</agent-registry>
```

During installation, `install.js` reads each plugin's `plugin.json`, extracts agent definitions, and injects them between the markers. This means a lite install has zero plugin agent entries (saving tokens), while a full install has 45+ entries.

## Data Flow

### Installation Flow

```
User runs: autopm install --scenario=github
    │
    ▼
install.js → selectScenario() → generateConfig()
    │
    ▼
PluginManager.initialize()
    │
    ├── discoverPlugins() → Scan packages/ (monorepo) or node_modules/@claudeautopm/
    ├── validatePlugins() → Check compatibility
    │
    ▼
For each plugin in scenario:
    ├── installAgents()   → Copy to .claude/agents/
    ├── installCommands() → Copy to .claude/commands/
    ├── installRules()    → Copy to .claude/rules/
    ├── installHooks()    → Copy to .claude/hooks/
    └── installScripts()  → Copy to scripts/
    │
    ▼
Generate agent-registry.xml with plugin agents injected
    │
    ▼
Generate CLAUDE.md (rule summaries + pointers)
```

### Command Execution Flow

```
User types: /pm:epic-list
    │
    ▼
Claude reads: .claude/commands/pm/epic-list.md
    │
    ▼
Validates prerequisites (Quick Check)
    │
    ▼
Provider router selects: local | github | azure
    │
    ▼
Executes instructions using allowed-tools
    │
    ▼
Formats output per command specification
```

## Token Optimization

The architecture is designed to minimize context window usage:

1. **Plugin-based agents** - Only installed agents are in the registry
2. **XML rules** - More compact than markdown equivalents
3. **Dynamic registry** - `PLUGIN_AGENTS_START/END` markers avoid loading unused agents
4. **Core-only default** - Lite scenario loads only 7 agent definitions

Result: Lite installs use 73% fewer agent tokens than full installs.

## Design Decisions

### Why Plugin Architecture?
- Selective installation reduces context footprint
- Independent versioning per plugin
- CI-only npm publish ensures quality
- PR-only workflow for all changes

### Why XML for Rules?
- Stronger model adherence to structured XML
- More token-efficient than markdown
- Clear hierarchy for nested rules

### Why Local Provider Default?
- Zero external dependencies for new users
- Works offline
- Easy upgrade path to GitHub/Azure later

### Why Dynamic Agent Registry?
- Single source of truth for agent availability
- Install-time generation avoids runtime overhead
- Marker-based injection is simple and reliable

## Security Considerations

1. **Token Management**: API tokens in environment variables only
2. **Input Validation**: All user inputs validated before processing
3. **Rate Limiting**: Built-in rate limiter for API calls
4. **Circuit Breaker**: Fault tolerance for external services
5. **PR-only workflow**: All changes require pull request review
6. **CI-only publish**: npm packages published only through GitHub Actions

## Next Steps

- [Plugin Development](./plugin-development.md) - Create your own plugins
- [Agent Development](./agent-development.md) - Build specialized agents
- [Command Development](./command-development.md) - Add new commands
