---
allowed-tools: Task, Read, Write, Edit, MultiEdit, Bash, Glob, Grep
---

# Kubernetes Deployment

Deploys applications to Kubernetes clusters.

**Usage**: `/kubernetes:deploy [app-name] [--chart=helm|kustomize] [--namespace=default] [--gitops=argocd|flux]`

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: kubernetes.


**Example**: `/kubernetes:deploy my-app --chart=helm --namespace=production --gitops=argocd`

**What this does**:
- Creates Kubernetes manifests or Helm charts
- Configures deployments with best practices
- Sets up services and ingress
- Implements autoscaling and monitoring
- Configures GitOps if requested
- Adds security policies

Use the kubernetes-orchestrator agent to deploy applications to Kubernetes.