---
allowed-tools: Task, Read, Write, Edit, MultiEdit, Bash, Glob, Grep
---

# GitHub Workflow Creation

Creates GitHub Actions workflows for CI/CD pipelines.

**Usage**: `/github:workflow-create [--type=ci|cd|release] [--stack=node|python|dotnet] [--deploy-to=aws|azure|gcp]`

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: github.


**Example**: `/github:workflow-create --type=ci --stack=node --deploy-to=aws`

**What this does**:
- Creates .github/workflows directory structure
- Generates workflow YAML with best practices
- Configures secrets and environment variables
- Sets up caching for dependencies
- Implements matrix testing strategies
- Adds deployment stages if needed

Use the github-operations-specialist agent to create comprehensive GitHub Actions workflows.

**CRITICAL INSTRUCTION FOR AGENT:**
The generated workflow MUST adhere to the Kubernetes-native CI/CD strategy for `containerd` runners.
Refer to the rules in `.claude/rules/ci-cd-kubernetes-strategy.md` for specific implementation details (use `kubectl` and `nerdctl`, not Docker services).