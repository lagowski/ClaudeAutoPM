---
title: User Guide
description: Complete guide to using ClaudeAutoPM for automated project management and AI-powered development workflows.
---

# User Guide

Welcome to the ClaudeAutoPM User Guide. This comprehensive documentation will help you master the automated project management system and leverage AI agents to accelerate your development workflow.

## What You Will Learn

This guide covers everything you need to become productive with ClaudeAutoPM:

| Section | What You'll Learn |
|---------|-------------------|
| [PM Workflow](./pm-workflow) | The complete flow from PRD to production code |
| [Commands Overview](./commands-overview) | All available command categories and their purposes |
| [Agents Overview](./agents-overview) | How to work with AI agents using the @agent syntax |
| [MCP Servers](./mcp-servers) | Integrating with Context7, Playwright, and filesystem servers |
| [Best Practices](./best-practices) | Tips, patterns, and common pitfalls to avoid |

## Quick Reference

### Essential Commands

```bash
# Initialize project management
/pm:init

# Create a new feature from scratch
/pm:prd-new user-authentication

# Parse PRD into actionable tasks
/pm:prd-parse user-authentication

# Check project status
/pm:status

# Get your next recommended task
/pm:next
```

### Essential Agents

```bash
# Code review and analysis
@code-analyzer review this file for security issues

# Run and analyze tests
@test-runner execute all tests with failure analysis

# Container setup
@docker-containerization-expert create optimized Dockerfile
```

## Understanding the ClaudeAutoPM Philosophy

ClaudeAutoPM is built on three core principles:

### 1. Spec-Driven Development

Every feature starts with a specification. PRDs define what to build, epics break it down into manageable pieces, and tasks become the atomic units of work. This traceability ensures nothing gets lost between idea and implementation.

### 2. AI-Assisted Automation

Specialized AI agents handle specific domains of expertise. Rather than one general-purpose assistant, you have access to experts in React, Python, Docker, Kubernetes, and more. Each agent knows its domain deeply and can coordinate with others.

### 3. Provider Flexibility

Whether you use GitHub Issues or Azure DevOps, ClaudeAutoPM abstracts the underlying provider. Your workflow remains consistent while the system handles provider-specific details.

## How to Use This Guide

### If You're New to ClaudeAutoPM

1. Start with [PM Workflow](./pm-workflow) to understand the development lifecycle
2. Review [Commands Overview](./commands-overview) to see available operations
3. Read [Best Practices](./best-practices) to avoid common mistakes

### If You're Looking for Specific Information

- **Need to create a feature?** See [PM Workflow - Creating PRDs](./pm-workflow#creating-a-prd)
- **Want to understand agents?** See [Agents Overview](./agents-overview)
- **Setting up MCP integration?** See [MCP Servers](./mcp-servers)
- **Looking for command syntax?** See [Commands Overview](./commands-overview)

### If You're an Advanced User

- Review [Best Practices - Advanced Patterns](./best-practices#advanced-patterns) for optimization techniques
- Explore [MCP Servers - Custom Configuration](./mcp-servers#custom-configuration) for advanced setups
- Check [Agents Overview - Agent Combinations](./agents-overview#agent-combinations) for complex workflows

## Prerequisites

Before diving into this guide, ensure you have:

- ClaudeAutoPM installed (`npm install -g claude-autopm`)
- Claude Code CLI configured and authenticated
- A project initialized with `/pm:init`
- Provider credentials set up (GitHub or Azure DevOps)

For installation help, see the [Getting Started Guide](/getting-started/).

## Getting Help

If you get stuck:

1. Run `/pm:help` to see available commands
2. Check the [Troubleshooting Guide](/reference/troubleshooting)
3. Search [GitHub Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
4. Join [Community Discussions](https://github.com/lagowski/ClaudeAutoPM/discussions)

## Next Steps

Ready to begin? Start with the [PM Workflow](./pm-workflow) to understand how ClaudeAutoPM transforms your development process.
