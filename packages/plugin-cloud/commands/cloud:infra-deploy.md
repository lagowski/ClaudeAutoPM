---
allowed-tools: Task, Read, Write, Edit, MultiEdit, Bash, Glob, Grep
---

# Cloud Infrastructure Deployment

Deploys infrastructure to cloud providers using Terraform.

**Usage**: `/cloud:infra-deploy [--provider=aws|azure|gcp] [--env=dev|staging|prod] [--services=compute,storage,database]`

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.


**Example**: `/cloud:infra-deploy --provider=aws --env=staging --services=eks,rds,s3`

**What this does**:
- Creates Terraform modules for selected cloud
- Configures provider and backend
- Sets up networking and security
- Deploys requested services
- Implements cost optimization
- Adds monitoring and alerting

Use the appropriate cloud architect agent (aws-cloud-architect, azure-cloud-architect, or gcp-cloud-architect) based on provider.