---
allowed-tools: Task, Read, WebFetch, Glob, Grep
---

# Azure DevOps Documentation Query

Queries latest Azure DevOps documentation via context7 before integration work.

**Usage**: `/azure:docs-query [--topic=rest-api|pipelines|work-items|extensions] [--version=latest|7.0|6.0] [--examples]`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


**Examples**: 
- `/azure:docs-query --topic=rest-api --version=latest`
- `/azure:docs-query --topic=work-items --examples`
- `/azure:docs-query --topic=pipelines --examples`

**What this does**:
- Queries context7 for latest Azure DevOps documentation
- Retrieves API endpoints, schemas, and authentication methods  
- Returns relevant examples and integration patterns
- Provides version compatibility and feature availability info
- Shows security best practices and rate limiting guidelines

Use the azure-devops-specialist agent to query documentation and provide integration guidance.

Requirements for the agent:
- Query MCP context7 documentation servers for Azure DevOps topics
- Retrieve latest API versions, endpoints, and authentication patterns
- Extract relevant integration examples and configuration samples
- Verify feature availability across different Azure DevOps tiers
- Format results with clear API examples and authentication code
- Include security recommendations and rate limiting best practices