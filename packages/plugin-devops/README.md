# @claudeautopm/plugin-devops

> **Complete DevOps Plugin for ClaudeAutoPM Framework**

[![npm version](https://img.shields.io/npm/v/@claudeautopm/plugin-devops.svg)](https://www.npmjs.com/package/@claudeautopm/plugin-devops)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

`@claudeautopm/plugin-devops` provides comprehensive DevOps capabilities for the ClaudeAutoPM framework. This plugin includes agents for Docker, GitHub Actions, Azure DevOps, observability (Prometheus/Grafana), infrastructure automation, CI/CD commands, DevOps rules, and example scripts.

### Package Information

- **Package Name:** `@claudeautopm/plugin-devops`
- **Version:** 2.0.0
- **Schema Version:** 2.0
- **Category:** DevOps & CI/CD
- **Size:** ~18 KB (gzipped)
- **Total Resources:** 18 (7 agents + 1 command + 4 rules + 5 scripts)

## 📦 Installation

```bash
# Install the plugin package
npm install -g @claudeautopm/plugin-devops

# Install plugin agents to your project
autopm plugin install devops
```

## 🎯 What's Included

### DevOps Agents (7 agents)

#### CI/CD & Version Control

- **azure-devops-specialist** - Azure DevOps pipelines, workflows, and work item management
  - Tags: azure, devops, pipelines, ci-cd, work-items
  - Context7: Azure documentation, Architecture center
  - MCP: azure-cli

- **github-operations-specialist** - GitHub Actions workflows, repository management, and automation
  - Tags: github, actions, workflows, ci-cd, automation
  - Context7: GitHub Actions toolkit, Starter workflows
  - MCP: github

#### Containerization

- **docker-containerization-expert** - Docker containerization, Dockerfile optimization, and Docker Compose
  - Tags: docker, containers, dockerfile, compose, multi-stage
  - Context7: Docker docs, Docker Compose
  - MCP: docker

#### Infrastructure & Networking

- **traefik-proxy-expert** - Traefik reverse proxy, load balancing, and service discovery
  - Tags: traefik, proxy, load-balancer, service-discovery, ssl
  - Context7: Traefik documentation
  - MCP: -

- **ssh-operations-expert** - SSH operations, key management, tunneling, and security
  - Tags: ssh, security, tunneling, keys, remote-access
  - Context7: AWS SSH best practices
  - MCP: -

#### Monitoring & Observability

- **observability-engineer** - Prometheus, Grafana, logging, tracing, and observability stack
  - Tags: observability, prometheus, grafana, monitoring, tracing
  - Context7: Prometheus, Grafana
  - MCP: prometheus, grafana

#### Context Management

- **mcp-context-manager** - Model Context Protocol server management and context optimization
  - Tags: mcp, context, optimization, model-context-protocol
  - Context7: -
  - MCP: -

### CI/CD Commands (1 command)

1. **workflow-create** - Create GitHub Actions workflow with best practices
   - Category: ci-cd
   - Required Agent: github-operations-specialist
   - Context7: GitHub Actions toolkit, Starter workflows

### DevOps Rules (4 rules)

1. **github-operations** - GitHub operations standards and best practices
   - Priority: high
   - Enforces on: github-operations-specialist

2. **docker-first-development** - Docker-first development workflow and containerization standards
   - Priority: medium
   - Enforces on: docker-containerization-expert

3. **devops-troubleshooting-playbook** - DevOps troubleshooting methodologies and debugging strategies
   - Priority: high
   - Enforces on: observability-engineer, docker-containerization-expert

4. **ci-cd-kubernetes-strategy** - CI/CD pipeline strategies for Kubernetes deployments
   - Priority: high
   - Enforces on: github-operations-specialist, azure-devops-specialist

### Example Scripts (5 scripts)

1. **docker-build-multistage.sh** - Multi-stage Docker build with BuildKit optimization
   - Category: docker
   - Demonstrates: Docker multi-stage builds, BuildKit, security scanning

2. **github-workflow-validate.sh** - GitHub Actions workflow validation and syntax check
   - Category: github
   - Demonstrates: GitHub CLI, workflow validation, YAML linting

3. **prometheus-health-check.sh** - Prometheus health check and metrics validation
   - Category: monitoring
   - Demonstrates: Prometheus API, health checks, alert monitoring

4. **docker-compose-validate.sh** - Docker Compose configuration validation
   - Category: docker
   - Demonstrates: Compose validation, syntax checking, health checks

5. **ssh-key-setup.sh** - SSH key generation and setup with ED25519
   - Category: ssh
   - Demonstrates: ED25519 key generation, SSH agent, best practices

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load DevOps agents -->
- @include .claude/agents/devops/docker-containerization-expert.md
- @include .claude/agents/devops/github-operations-specialist.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load DevOps-focused team
autopm team load devops

# Or include DevOps in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke docker-containerization-expert "Optimize multi-stage Dockerfile"
```

## 📋 Agent Capabilities

### CI/CD Pipeline Design
- GitHub Actions workflow automation
- Azure DevOps pipeline configuration
- Multi-environment deployment strategies
- Automated testing and quality gates

### Container Management
- Docker image optimization
- Container security scanning
- Multi-architecture builds
- Registry management

### Infrastructure Automation
- Reverse proxy configuration
- Service mesh integration
- Network security hardening
- SSH access management

### Monitoring & Alerting
- Metric collection and visualization
- Log aggregation pipelines
- Distributed tracing setup
- Alert routing and escalation

## 🔌 MCP Servers

This plugin works with the following MCP servers for enhanced capabilities:

- **docker** - Docker container management and documentation
- **kubernetes** - Kubernetes orchestration patterns
- **github** - GitHub API and workflow examples

Enable MCP servers:

```bash
autopm mcp enable docker
autopm mcp enable kubernetes
autopm mcp enable github
```

## 🚀 Examples

### Docker Multi-Stage Build

```
@docker-containerization-expert

Create optimized multi-stage Dockerfile for Node.js application:

Requirements:
- Production image < 200MB
- Security scanning with Trivy
- Non-root user
- Health check configuration
- Build cache optimization

Include:
1. Dockerfile with multi-stage build
2. .dockerignore configuration
3. docker-compose.yml for local dev
4. Security best practices
```

### GitHub Actions CI/CD

```
@github-operations-specialist

Setup CI/CD pipeline with GitHub Actions:

Requirements:
- Run tests on PR
- Build Docker image
- Deploy to staging on merge to develop
- Deploy to production on release tags
- Slack notifications

Include:
1. Workflow YAML files
2. Reusable workflow components
3. Secrets management
4. Branch protection rules
```

### Azure DevOps Pipeline

```
@azure-devops-specialist

Create Azure DevOps pipeline for .NET application:

Requirements:
- Multi-stage pipeline (Build, Test, Deploy)
- NuGet package restore
- Unit and integration tests
- Deploy to Azure App Service
- Environment approval gates

Include:
1. azure-pipelines.yml
2. Variable groups configuration
3. Service connection setup
4. Deployment slots strategy
```

### Traefik Configuration

```
@traefik-proxy-expert

Configure Traefik for microservices:

Requirements:
- Docker provider integration
- Let's Encrypt SSL automation
- Load balancing across 5 services
- Rate limiting middleware
- Access logs and metrics

Include:
1. traefik.yml configuration
2. Docker labels for services
3. Middleware configuration
4. Dashboard setup
```

### Observability Stack

```
@observability-engineer

Setup observability stack for microservices:

Components:
- Prometheus for metrics
- Grafana for visualization
- Loki for logs
- Jaeger for tracing
- AlertManager for notifications

Include:
1. Docker Compose setup
2. Prometheus scrape configs
3. Grafana dashboards
4. Alert rules
5. Service instrumentation examples
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# GitHub credentials (optional, for enhanced suggestions)
export GITHUB_TOKEN=your-token

# Azure DevOps
export AZURE_DEVOPS_PAT=your-pat
export AZURE_DEVOPS_ORG=your-org

# Docker registry
export DOCKER_REGISTRY=registry.example.com
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  devops:
    docker:
      default_registry: docker.io
      prefer_alpine: true
    github:
      default_branch: main
      require_reviews: 2
    observability:
      metrics_retention: 30d
```

## 📖 Documentation

- [Azure DevOps Specialist Guide](./agents/azure-devops-specialist.md)
- [Docker Containerization Expert Guide](./agents/docker-containerization-expert.md)
- [GitHub Operations Specialist Guide](./agents/github-operations-specialist.md)
- [Traefik Proxy Expert Guide](./agents/traefik-proxy-expert.md)
- [Observability Engineer Guide](./agents/observability-engineer.md)
- [SSH Operations Expert Guide](./agents/ssh-operations-expert.md)
- [MCP Context Manager Guide](./agents/mcp-context-manager.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-devops)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
