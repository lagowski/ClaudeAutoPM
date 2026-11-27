# Agent Registry

ClaudeAutoPM uses a **core + plugin** agent model. 7 core agents are always available. Additional specialized agents (50+) are installed on demand via plugins.

## Architecture

The agent registry is defined in `.claude/agents/agent-registry.xml`. This XML file:

1. Lists all 7 core agents (always present)
2. Contains `PLUGIN_AGENTS_START` / `PLUGIN_AGENTS_END` markers
3. During `autopm install`, the installer injects agents from selected plugins between these markers
4. Claude reads this file when it picks an agent; it is not imported into CLAUDE.md

This means only agents from your installed plugins consume context tokens.

```xml
<agent-registry version="2.0.0" core-agents="7">
  <agents category="core">
    <agent name="agent-manager" path="agents/core/agent-manager.md">...</agent>
    <!-- ... other core agents ... -->
  </agents>

  <!-- PLUGIN_AGENTS_START -->
  <!-- Injected by install.js based on installed plugins -->
  <!-- PLUGIN_AGENTS_END -->
</agent-registry>
```

## Core Agents (Always Available)

These 7 agents are included in every installation scenario, from lite to performance.

### agent-manager
**Path**: `.claude/agents/core/agent-manager.md`
**Purpose**: Agent lifecycle management, documentation standards, registry maintenance.
**Use for**: Creating new agents, updating agent definitions, managing the registry.

### file-analyzer
**Path**: `.claude/agents/core/file-analyzer.md`
**Purpose**: Analyze and summarize large files to reduce context usage.
**Use for**: Log analysis, documentation review, test output summarization, configuration review.

### code-analyzer
**Path**: `.claude/agents/core/code-analyzer.md`
**Purpose**: Code review, bug detection, and logic flow analysis.
**Use for**: Pre-commit reviews, security scanning, architecture analysis, dependency tracing.

### test-runner
**Path**: `.claude/agents/core/test-runner.md`
**Purpose**: Test execution and comprehensive result analysis.
**Use for**: Running test suites, failure analysis, coverage reports.

### parallel-worker
**Path**: `.claude/agents/core/parallel-worker.md`
**Purpose**: Coordinate multiple agents working on related tasks in a git branch.
**Use for**: Complex multi-step workflows, parallel task execution, multi-file operations.

### mcp-manager
**Path**: `.claude/agents/core/mcp-manager.md`
**Purpose**: MCP server install, configuration, process management, health checks.
**Use for**: MCP server setup, configuration, troubleshooting.

### context-optimizer
**Path**: `.claude/agents/core/context-optimizer.md`
**Purpose**: Context window efficiency, compaction, summarization, memory optimization.
**Use for**: Reducing context usage, optimizing prompt size, managing long conversations.

## Plugin Agents (Installed on Demand)

Plugin agents are only available after installing the corresponding plugin. They are organized across 13 plugins:

| Plugin | Agents | Category |
|--------|--------|----------|
| `plugin-languages` | 5 | Python, Node.js, JavaScript, Bash (see plugin.json) |
| `plugin-frameworks` | 4 | React, Tailwind, UX Design (see plugin.json) |
| `plugin-devops` | 7 | Docker, GitHub Actions, Azure DevOps, Observability, SSH, Traefik (see plugin.json) |
| `plugin-cloud` | 8 | AWS, Azure, GCP, Kubernetes, Terraform, OpenAI, Gemini (see plugin.json) |
| `plugin-databases` | 6 | PostgreSQL, MongoDB, Redis, CosmosDB, BigQuery |
| `plugin-testing` | 1 | Playwright specialist |
| `plugin-ai` | 8 | AI/ML integration agents |
| `plugin-data` | 3 | LangGraph, Airflow, Kedro |
| `plugin-ml` | 10 | Machine learning specialists |
| `plugin-pm` | 0 | PM commands (no agents) |
| `plugin-pm-github` | 0 | GitHub provider (no agents) |
| `plugin-pm-azure` | 0 | Azure provider (no agents) |
| `plugin-core` | 7 | Core agents (always installed) |

### Installing Plugin Agents

Plugin agents are installed automatically based on your chosen scenario:

```bash
# Lite: 7 core agents only
autopm install --scenario=lite

# GitHub: 7 core + 5 language agents
autopm install --scenario=github

# Full: 7 core + 45+ plugin agents
autopm install --scenario=full
```

### Example Plugin Agents

**From plugin-languages:**
- `@python-backend-expert` - Python backend development (FastAPI, Django, Flask)
- `@nodejs-backend-engineer` - Node.js backend with Express, NestJS
- `@bash-scripting-expert` - Shell scripting and automation

**From plugin-devops:**
- `@docker-containerization-expert` - Docker, Compose, multi-stage builds
- `@github-operations-specialist` - GitHub Actions, CI/CD pipelines

**From plugin-cloud:**
- `@aws-cloud-architect` - AWS infrastructure design
- `@azure-cloud-architect` - Azure resources, ARM templates
- `@kubernetes-orchestrator` - K8s deployments, Helm charts
- `@terraform-infrastructure-expert` - Infrastructure as Code

**From plugin-databases:**
- `@postgresql-expert` - Schema design, query optimization
- `@mongodb-expert` - Document design, aggregation pipelines
- `@redis-expert` - Caching strategies, data structures

## Agent Usage

```markdown
# Core agents work in any scenario
@code-analyzer review this authentication module for security vulnerabilities
@test-runner execute all integration tests and analyze any failures

# Plugin agents require the corresponding plugin
@docker-containerization-expert create optimized Docker setup  # Requires plugin-devops
@postgresql-expert optimize this slow query                     # Requires plugin-databases
```

## Legacy Agent Support

Deprecated agent names were removed in the v1.1.0 consolidation. Use the consolidated versions:

| Deprecated | Current |
|------------|---------|
| `@react-expert` | `@react-ui-expert` (plugin-frameworks) |
| `@docker-expert` | `@docker-containerization-expert` (plugin-devops) |
| `@python-expert` | `@python-backend-expert` (plugin-languages) |
| `@kubernetes-expert` | `@kubernetes-orchestrator` (plugin-cloud) |

## Related Pages

- [Agent Selection Guide](./selection-guide) - Choose the right agent
- [Plugin Development](/developer-guide/plugin-development) - Create your own plugins
- [Architecture](/developer-guide/architecture) - System design overview
