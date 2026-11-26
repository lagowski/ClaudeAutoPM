---
name: ssh-security-and-operations
type: epic-management
category: infrastructure
---

# SSH Security and Operations Command

Set up secure SSH configurations, key management, and remote operations.

## Command
```
/infra:ssh-security
```

## Purpose
Use the ssh-operations-expert agent to create secure SSH configurations, implement key rotation strategies, and set up remote management workflows.

## Parameters
- `scope`: Configuration scope (client, server, both)
- `security_level`: Security hardening level (basic, advanced, paranoid)
- `key_management`: Key management strategy (manual, automated, ca-based)
- `features`: Additional features (tunneling, jump-hosts, automation)

## Agent Usage
```
Use the ssh-operations-expert agent to create comprehensive SSH security and operations setup.
```

## Expected Outcome
- Hardened SSH client/server configurations
- SSH key generation and management scripts
- Automated key rotation workflows
- Tunnel and port forwarding setup
- Jump host and bastion configuration
- Remote operations and automation scripts
- Security audit and monitoring tools

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: openssh.

## Example Usage
```
Task: Set up secure SSH infrastructure with key rotation, jump hosts, and automated remote operations
Agent: ssh-operations-expert
Parameters: scope=both, security_level=advanced, key_management=automated, features=tunneling,jump-hosts,automation
```

## Related Agents
- bash-scripting-expert: For automation scripts
- terraform-infrastructure-expert: For infrastructure automation