# @claudeautopm/plugin-cloud

> **Complete Cloud Infrastructure Plugin for ClaudeAutoPM Framework**

[![npm version](https://img.shields.io/npm/v/@claudeautopm/plugin-cloud.svg)](https://www.npmjs.com/package/@claudeautopm/plugin-cloud)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

`@claudeautopm/plugin-cloud` provides comprehensive cloud infrastructure capabilities for the ClaudeAutoPM framework. This plugin includes agents for AWS, Azure, GCP, Kubernetes orchestration, Terraform infrastructure as code, AI API integrations, cloud deployment commands, infrastructure rules, and example scripts.

### Package Information

- **Package Name:** `@claudeautopm/plugin-cloud`
- **Version:** 2.0.0
- **Schema Version:** 2.0
- **Category:** Cloud Infrastructure
- **Size:** ~15 KB (gzipped)
- **Total Resources:** 18 (8 agents + 4 commands + 1 rule + 5 scripts)

## 📦 Installation

```bash
# Install the plugin package
npm install -g @claudeautopm/plugin-cloud

# Install plugin agents to your project
autopm plugin install cloud
```

## 🎯 What's Included

### Cloud Architecture Agents (8 agents)

#### AWS
- **aws-cloud-architect** - AWS cloud architecture and infrastructure design patterns
  - Tags: aws, cloud, architecture, ec2, s3, vpc
  - Context7: AWS documentation, Terraform AWS provider
  - MCP: aws, terraform

### Azure
- **azure-cloud-architect** - Azure cloud architecture and design patterns
  - Virtual Networks, NSGs, Application Gateways
  - VMs, App Services, Container Instances
  - Storage accounts, Azure SQL, Cosmos DB

### Google Cloud Platform
- **gcp-cloud-architect** - GCP architecture and design
  - VPCs, Cloud NAT, Load Balancers
  - Compute Engine, GKE, Cloud Run
  - Cloud Storage, Cloud SQL, Firestore

- **gcp-cloud-functions-engineer** - Google Cloud Functions development
  - Function architecture and triggers
  - Event-driven design patterns
  - Integration with GCP services

### AI & APIs
`gemini-api-expert` and `openai-python-expert` are owned by
[`@claudeautopm/plugin-ai`](../plugin-ai/README.md) (a peer plugin of this one); install it for them.

### Infrastructure & Orchestration
- **kubernetes-orchestrator** - Kubernetes orchestration
  - Cluster design and architecture
  - Deployment strategies, service mesh
  - Monitoring, logging, security

- **terraform-infrastructure-expert** - Infrastructure as Code
  - Multi-cloud Terraform patterns
  - Module design, state management
  - CI/CD integration

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load cloud agents -->
- @include .claude/agents/cloud/aws-cloud-architect.md
- @include .claude/agents/cloud/terraform-infrastructure-expert.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load cloud-focused team
autopm team load cloud

# Or include cloud in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke aws-cloud-architect "Design VPC for microservices"
```

## 📋 Agent Capabilities

### Architecture Design
- Cloud-native application architecture
- Microservices patterns
- Serverless architectures
- Hybrid cloud strategies

### Infrastructure as Code
- Terraform modules and best practices
- CloudFormation templates
- Azure Resource Manager templates
- Google Cloud Deployment Manager

### Security & Compliance
- IAM policies and least privilege
- Network security (VPCs, NSGs, firewalls)
- Encryption at rest and in transit
- Compliance frameworks (SOC2, HIPAA, GDPR)

### Cost Optimization
- Right-sizing recommendations
- Reserved instances and savings plans
- Auto-scaling strategies
- Resource tagging and allocation

## 🔌 MCP Servers

This plugin works with the following MCP servers for enhanced capabilities:

- **aws** - AWS service documentation and examples
- **azure-cli** - Azure CLI commands and patterns
- **terraform** - Terraform provider documentation

Enable MCP servers:

```bash
autopm mcp enable aws
autopm mcp enable azure-cli
autopm mcp enable terraform
```

## 🚀 Examples

### AWS Architecture

```
@aws-cloud-architect

I need to design a highly available web application on AWS.

Requirements:
- Multi-AZ deployment
- Auto-scaling
- Load balancing
- RDS for database
- S3 for static assets
- CloudFront CDN

Please provide:
1. VPC architecture diagram
2. Security groups configuration
3. Auto-scaling policies
4. Cost estimation
```

### Terraform IaC

```
@terraform-infrastructure-expert

Create Terraform modules for:
- VPC with public/private subnets
- Application Load Balancer
- ECS Fargate cluster
- RDS PostgreSQL instance

Requirements:
- Multi-environment support (dev, staging, prod)
- Remote state in S3
- Module reusability
```

### Kubernetes Deployment

```
@kubernetes-orchestrator

Design Kubernetes deployment for microservices:
- 5 microservices (API, Auth, Orders, Payments, Notifications)
- Service mesh with Istio
- Monitoring with Prometheus/Grafana
- Ingress with cert-manager

Include:
- Deployment YAMLs
- Service definitions
- Ingress configuration
- HPA policies
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# AWS credentials (optional, for enhanced suggestions)
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1

# Azure credentials
export AZURE_SUBSCRIPTION_ID=your-subscription-id

# GCP credentials
export GOOGLE_CLOUD_PROJECT=your-project-id
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  cloud:
    aws:
      default_region: us-west-2
      prefer_fargate: true
    azure:
      default_location: eastus
    gcp:
      default_region: us-central1
```

## 📖 Documentation

- [AWS Cloud Architect Guide](./agents/aws-cloud-architect.md)
- [Azure Cloud Architect Guide](./agents/azure-cloud-architect.md)
- [GCP Cloud Architect Guide](./agents/gcp-cloud-architect.md)
- [Terraform Expert Guide](./agents/terraform-infrastructure-expert.md)
- [Kubernetes Orchestrator Guide](./agents/kubernetes-orchestrator.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/rafeekpro/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/rafeekpro/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-cloud)
- [Issues](https://github.com/rafeekpro/ClaudeAutoPM/issues)
