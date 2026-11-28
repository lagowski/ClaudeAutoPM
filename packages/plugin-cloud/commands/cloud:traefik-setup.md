---
name: traefik-reverse-proxy-setup
type: epic-management
category: infrastructure
---

# Traefik Reverse Proxy Setup Command

Configure Traefik reverse proxy with SSL termination, load balancing, and service discovery.

## Command
```
/infra:traefik-setup
```

## Purpose
Use the traefik-proxy-expert agent to create a complete Traefik reverse proxy configuration with SSL automation, load balancing, and microservices routing.

## Parameters
- `environment`: Target environment (development, staging, production)
- `ssl`: SSL configuration (letsencrypt, custom-certs, self-signed)
- `discovery`: Service discovery method (docker, kubernetes, file)
- `features`: Additional features (dashboard, metrics, rate-limiting, auth)

## Agent Usage
```
Use the traefik-proxy-expert agent to create a comprehensive Traefik reverse proxy setup.
```

## Expected Outcome
- Complete Traefik configuration (traefik.yml)
- Docker Compose setup with Traefik service
- SSL certificate automation
- Service discovery configuration
- Load balancing and health checks
- Security middleware and authentication
- Monitoring and logging setup

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: traefik.

## Example Usage
```
Task: Set up Traefik reverse proxy for microservices with Let's Encrypt SSL and Docker discovery
Agent: traefik-proxy-expert
Parameters: environment=production, ssl=letsencrypt, discovery=docker, features=dashboard,metrics,auth
```

## Related Agents
- docker-containerization-expert: For container configuration
- kubernetes-orchestrator: For K8s integration