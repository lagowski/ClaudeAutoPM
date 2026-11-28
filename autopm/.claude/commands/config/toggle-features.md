---
name: toggle-features
type: epic-management
category: config
---

# Toggle Features Command

## /config:toggle-features

This command allows you to toggle development features on/off in your ClaudeAutoPM project.

### Usage

```bash
/config:toggle-features
```
## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.



### What It Does

1. **Shows Current Configuration** - Displays your current feature toggles
2. **Interactive Selection** - Allows you to toggle features on/off
3. **Validates Configuration** - Ensures settings are consistent
4. **Updates Files** - Regenerates workflows and configs based on new settings

### Available Toggles

#### 🐳 Docker Features
- **docker_first_development** - Enforce Docker-first development workflow
- **enforce_docker_tests** - Run all tests in Docker containers
- **auto_create_dockerfile** - Automatically generate Dockerfiles
- **block_local_execution** - Block execution outside Docker

#### ☸️ Kubernetes Features  
- **kubernetes_devops_testing** - Enable Kubernetes testing in CI/CD
- **github_actions_k8s** - Run Kubernetes tests in GitHub Actions
- **integration_tests** - Enable full integration testing
- **helm_chart_tests** - Validate Helm charts

#### ⚙️ CI/CD Features
- **matrix_testing** - Test against multiple environments
- **cache_optimization** - Optimize build caches
- **security_scanning** - Run security scans on containers/manifests

### Predefined Templates

Choose from pre-configured templates:

1. **minimal** - No Docker/K8s, traditional development
2. **docker-only** - Docker-first without Kubernetes
3. **full-devops** - All features enabled (Docker + Kubernetes + CI/CD)

### Configuration Persistence

All changes are saved to:
- `.claude/config.json` - Main configuration
- `.github/workflows/` - Workflow files (conditionally enabled/disabled)
- `.claude/rules/` - Development rules

### Example Output

```
Current Configuration:
🐳 Docker-first development: ✅ ENABLED
☸️ Kubernetes testing: ❌ DISABLED  
🔧 GitHub Actions K8s: ❌ DISABLED
🛡️ Integration tests: ✅ ENABLED

Select features to toggle:
[1] Enable Kubernetes testing
[2] Enable GitHub Actions K8s
[3] Disable Docker-first
[4] Load template: full-devops
[5] Load template: minimal
[0] Save and exit

Your choice: 
```

### Integration

This command integrates with:
- GitHub Actions workflows (conditional job execution)
- Docker development environment setup
- Kubernetes manifest validation
- ClaudeAutoPM agent behavior

### Related Commands

- `/config:validate` - Validate current configuration
- `/config:reset` - Reset to default configuration  
- `/config:export` - Export configuration for sharing