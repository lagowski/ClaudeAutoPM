# CLAUDE Templates

The CLAUDE.md file is the heart of your project's AI instructions. ClaudeAutoPM uses a sophisticated template system to generate customized CLAUDE.md files based on your project's configuration and needs.

## Template System Architecture

The template system consists of:

1. **Base Template**: Core instructions present in all configurations
2. **Add-on Modules**: Feature-specific instructions added based on configuration
3. **Configuration Templates**: Preset combinations for common scenarios
4. **Strategy Templates**: Execution strategy definitions

## Template Structure

### Directory Layout

```
autopm/.claude/templates/
├── claude-templates/           # CLAUDE.md components
│   ├── base.md                # Base template
│   └── addons/                # Feature-specific add-ons
│       ├── azure-devops.md
│       ├── devops-agents.md
│       ├── devops-workflow.md
│       ├── docker-agents.md
│       ├── docker-workflow.md
│       ├── git-safety.md
│       ├── github-actions.md
│       ├── gitlab-ci.md
│       ├── jenkins.md
│       ├── minimal-agents.md
│       ├── minimal-workflow.md
│       └── no-cicd.md
├── config-templates/          # Configuration presets
│   ├── minimal.json
│   ├── docker-only.json
│   ├── full-devops.json
│   └── performance.json
└── strategies-templates/     # Execution strategies
    ├── sequential-safe.md
    ├── adaptive-smart.md
    └── hybrid-parallel.md
```

## Base Template

The `base.md` template contains core instructions that apply to all projects:

```markdown
# Project: {PROJECT_NAME}

You are an AI assistant helping with the {PROJECT_NAME} project.

## Core Guidelines
- Follow Test-Driven Development (TDD)
- Maintain code quality and documentation
- Use semantic commit messages
- Ensure security best practices

## Available Resources
- Agents: .claude/agents/
- Commands: .claude/commands/
- Rules: .claude/rules/
- Scripts: .claude/scripts/
```

## Add-on Modules

### Docker Workflow Add-on

When Docker is enabled, `docker-workflow.md` is included:

```markdown
## Docker-First Development

All development MUST happen inside Docker containers:
- Use docker compose for local development
- Commands like npm, pip, gem run in containers
- Database operations through containerized services

Example:
- ❌ npm install express
- ✅ docker compose run app npm install express
```

### DevOps Agents Add-on

For DevOps-enabled projects, `devops-agents.md` adds:

```markdown
## DevOps Agents

You have access to specialized DevOps agents:
- @docker-containerization-expert
- @kubernetes-orchestrator
- @github-operations-specialist
- @azure-devops-specialist
```

### Azure DevOps Add-on

When Azure DevOps is configured, `azure-devops.md` includes:

```markdown
## Azure DevOps Integration

Work items are managed in Azure DevOps:
- Use /pm:issue:show to view work items
- Use /pm:issue:start to begin work
- Use /pm:pr:create for pull requests
```

## Configuration Presets

### Minimal Configuration

`minimal.json` generates a basic CLAUDE.md:

```json
{
  "includes": ["base.md", "minimal-agents.md", "minimal-workflow.md"],
  "execution_strategy": "sequential-safe",
  "features": {
    "docker": false,
    "kubernetes": false,
    "parallel": false
  }
}
```

### Docker-Only Configuration

`docker-only.json` for containerized development:

```json
{
  "includes": ["base.md", "docker-workflow.md", "docker-agents.md"],
  "execution_strategy": "adaptive-smart",
  "features": {
    "docker": true,
    "kubernetes": false,
    "parallel": true
  }
}
```

### Full DevOps Configuration

`full-devops.json` enables all features:

```json
{
  "includes": [
    "base.md",
    "docker-workflow.md",
    "devops-workflow.md",
    "docker-agents.md",
    "devops-agents.md",
    "github-actions.md",
    "azure-devops.md"
  ],
  "execution_strategy": "adaptive-smart",
  "features": {
    "docker": true,
    "kubernetes": true,
    "parallel": true,
    "auto_pr": true
  }
}
```

## Template Generation Process

### 1. Configuration Selection

During installation, users choose a configuration:

```bash
Select your installation scenario:
1) Minimal
2) Docker-only
3) Full DevOps
4) Performance
5) Custom
```

### 2. Template Assembly

The installer assembles the CLAUDE.md:

```bash
# Load base template
content=$(cat base.md)

# Add selected add-ons
if [[ "$DOCKER_ENABLED" == "true" ]]; then
  content+=$(cat addons/docker-workflow.md)
fi

# Replace variables
content=${content//\{PROJECT_NAME\}/$project_name}
content=${content//\{EXECUTION_STRATEGY\}/$strategy}
```

### 3. Variable Substitution

Templates use placeholders replaced during generation:

| Placeholder | Replaced With |
|-------------|---------------|
| `{PROJECT_NAME}` | Your project name |
| `{GITHUB_OWNER}` | GitHub username/org |
| `{GITHUB_REPO}` | Repository name |
| `{EXECUTION_STRATEGY}` | Selected strategy |
| `{PRIMARY_LANGUAGE}` | Main programming language |
| `{DOCKER_ENABLED}` | Docker configuration |

### 4. Final Output

The generated CLAUDE.md is placed in your project root.

## Customizing Templates

### Adding Custom Add-ons

Create a new add-on in `.claude/templates/claude-templates/addons/`:

```markdown
# custom-feature.md
## My Custom Feature

Special instructions for my feature:
- Custom rule 1
- Custom rule 2
```

### Modifying Base Template

Edit the base template for project-wide changes:

```bash
# Edit base template
nano autopm/.claude/templates/claude-templates/base.md

# Regenerate CLAUDE.md (the old one is kept as CLAUDE.md.backup.<timestamp>)
autopm install --force
```

### Creating Custom Presets

Add a new configuration preset:

```json
// custom-preset.json
{
  "name": "Custom Configuration",
  "includes": [
    "base.md",
    "custom-feature.md"
  ],
  "execution_strategy": "adaptive-smart",
  "features": {
    "custom_feature": true
  }
}
```

## Merging with Existing CLAUDE.md

If you have an existing CLAUDE.md:

### Regenerate, then merge

There is no merge command in the CLI. `autopm install --force` writes a fresh CLAUDE.md from the templates and
keeps your previous file as `CLAUDE.md.backup.<timestamp>`; copy your customizations back from it. Inside
Claude Code, `/re-init` updates CLAUDE.md with the rules from `.claude/CLAUDE.md`.

## Strategy Templates

### Sequential Safe Strategy

For simple projects:

```markdown
## Execution Strategy: Sequential

- Agents execute one at a time
- Safe for beginners
- Predictable behavior
- No resource conflicts
```

### Adaptive Smart Strategy

For most projects:

```markdown
## Execution Strategy: Adaptive

- Intelligent parallelization
- Automatic dependency detection
- Optimal performance
- Resource-aware scheduling
```

### Hybrid Parallel Strategy

For power users:

```markdown
## Execution Strategy: Hybrid

- Maximum parallelization
- Aggressive optimization
- Requires powerful hardware
- Expert-level control
```

## Examples

### Example 1: React Project

Configuration chosen: Docker-only

Generated CLAUDE.md includes:
- Base instructions
- Docker workflow rules
- React-specific agents
- Container-based testing

### Example 2: Python API

Configuration chosen: Full DevOps

Generated CLAUDE.md includes:
- Base instructions
- Docker + Kubernetes workflows
- Python backend agents
- CI/CD pipeline instructions
- Azure DevOps integration

### Example 3: Simple Script

Configuration chosen: Minimal

Generated CLAUDE.md includes:
- Base instructions only
- Sequential execution
- Basic agents
- No containerization

## Template Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PROJECT_NAME` | Project name | "my-app" |
| `PROJECT_TYPE` | Project type | "web", "api", "cli" |
| `PRIMARY_LANGUAGE` | Main language | "python", "javascript" |
| `FRAMEWORK` | Framework used | "react", "django", "express" |
| `DATABASE` | Database type | "postgresql", "mongodb" |
| `CLOUD_PROVIDER` | Cloud platform | "aws", "azure", "gcp" |
| `CI_CD_PLATFORM` | CI/CD system | "github", "azure-devops" |

## Best Practices

1. **Start Simple**: Begin with minimal configuration
2. **Iterative Enhancement**: Add features as needed
3. **Version Control**: Track CLAUDE.md changes in git
4. **Team Alignment**: Ensure team uses same configuration
5. **Regular Updates**: Regenerate after framework updates

## Troubleshooting

### Template Not Found

```bash
# Check template exists
ls autopm/.claude/templates/claude-templates/

# Reinstall if missing
autopm install --force
```

### Variables Not Replaced

```bash
# Check for typos in placeholders
grep '{.*}' CLAUDE.md

# Manually replace if needed
sed -i 's/{PROJECT_NAME}/my-project/g' CLAUDE.md
```

### Merge Conflicts

```bash
# Backup existing
cp CLAUDE.md CLAUDE.md.backup

# Generate fresh
autopm install --force

# Compare and merge manually
diff CLAUDE.md.backup CLAUDE.md
```

## Related Pages

- [Configuration Options](/reference/configuration)
- [First Project](/getting-started/first-project)
- [Custom Agents](/agents/custom-agents)
- Docker First Development