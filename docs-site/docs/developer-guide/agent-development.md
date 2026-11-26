---
title: Agent Development
description: Complete guide to creating specialized AI agents for ClaudeAutoPM
---

# Agent Development

Agents are specialized AI assistants with defined expertise, tools, and behaviors. This guide covers everything you need to create effective agents for ClaudeAutoPM.

## Agent Fundamentals

### What is an Agent?

An agent is a markdown file that defines:
- **Identity**: Name, description, and area of expertise
- **Capabilities**: Allowed tools and permissions
- **Behavior**: How the agent should approach tasks
- **Constraints**: What the agent should and should not do

### When to Create an Agent

Create a new agent when:
- A domain requires specialized knowledge (e.g., PostgreSQL, Kubernetes)
- Tasks have consistent patterns that benefit from expertise
- You need to encapsulate best practices for a technology
- Complex operations require dedicated focus

## Agent File Structure

Every agent must follow this structure:

```markdown
---
name: agent-name
description: Use this agent for [purpose]. Expert in [technologies].
tools: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent
model: inherit
color: green
---

# Agent Name

You are a senior [role] with deep expertise in [domain].

## Test-Driven Development (TDD) Methodology

**MANDATORY**: Follow strict TDD principles...

## Documentation Access via MCP Context7

**Documentation Queries:**
- `mcp://context7/...`

## Core Expertise

### [Domain] Mastery
...

## Development Patterns
...

## Self-Verification Protocol
...
```

## Required Sections

### 1. Frontmatter (MANDATORY)

The YAML frontmatter defines agent metadata:

```yaml
---
name: postgresql-expert
description: Use this agent for PostgreSQL database design, optimization, and management including advanced features and performance tuning.
tools: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent
model: inherit
color: blue
---
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier (kebab-case) |
| `description` | Yes | What the agent does and when to use it |
| `tools` | Yes | Comma-separated list of allowed tools |
| `model` | No | AI model to use (`inherit` = use current) |
| `color` | No | Display color (blue, green, yellow, red) |

### 2. Introduction

Define the agent's identity and primary role:

```markdown
# PostgreSQL Expert

You are a senior PostgreSQL database architect with deep expertise in database design, performance optimization, and PostgreSQL-specific features.
```

### 3. TDD Methodology (MANDATORY)

Every agent MUST include this section:

```markdown
## Test-Driven Development (TDD) Methodology

**MANDATORY**: Follow strict TDD principles for all development:

1. **Write failing tests FIRST** - Before implementing any functionality
2. **Red-Green-Refactor cycle** - Test fails -> Make it pass -> Improve code
3. **One test at a time** - Focus on small, incremental development
4. **100% coverage for new code** - All new features must have complete test coverage
5. **Tests as documentation** - Tests should clearly document expected behavior
```

### 4. Documentation Queries (MANDATORY)

Every agent MUST include Context7 documentation queries:

```markdown
## Documentation Access via MCP Context7

Before starting any implementation, query live documentation:

**Documentation Queries:**
- `mcp://context7/postgresql/optimization` - Query optimization techniques
- `mcp://context7/postgresql/indexing` - Index design patterns
- `mcp://context7/postgresql/security` - Security best practices
- `mcp://context7/postgresql/replication` - Replication setup

Use these queries to access current documentation before implementing solutions.
```

### 5. Core Expertise

Define the agent's knowledge areas:

```markdown
## Core Expertise

### Database Design
- **Schema Architecture**: Normalized and denormalized patterns
- **Data Modeling**: Entity relationships, constraints, triggers
- **Partitioning**: Table partitioning strategies

### Performance Optimization
- **Query Optimization**: EXPLAIN ANALYZE, query plans
- **Index Strategy**: B-tree, hash, GIN, GiST indexes
- **Connection Pooling**: PgBouncer, connection management
```

### 6. Development Patterns

Include practical patterns and examples:

```markdown
## Development Patterns

### Schema Migration Pattern

```sql
-- Always use transactions for migrations
BEGIN;

-- Create migration
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Verify migration
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'last_login';

COMMIT;
```

### Query Optimization Pattern

1. Run EXPLAIN ANALYZE on slow query
2. Identify sequential scans on large tables
3. Add appropriate indexes
4. Re-run EXPLAIN ANALYZE to verify improvement
```

### 7. Self-Verification Protocol (MANDATORY)

Every agent MUST include verification steps:

```markdown
## Self-Verification Protocol

Before delivering any solution, verify:

- [ ] Documentation from Context7 has been consulted
- [ ] Code follows PostgreSQL best practices
- [ ] Tests are written and passing
- [ ] Performance impact has been assessed
- [ ] Security considerations addressed
- [ ] No resource leaks (connections, cursors)
- [ ] Error handling is comprehensive
- [ ] Query efficiency verified with EXPLAIN
```

## Agent Categories

Organize agents into these standard categories:

| Category | Directory | Purpose |
|----------|-----------|---------|
| **core** | `agents/core/` | Essential system agents |
| **languages** | `agents/languages/` | Language-specific experts |
| **frameworks** | `agents/frameworks/` | Framework specialists |
| **cloud** | `agents/cloud/` | Cloud platform architects |
| **devops** | `agents/devops/` | CI/CD and operations |
| **databases** | `agents/databases/` | Database specialists |
| **data** | `agents/data/` | Data engineering |
| **testing** | `agents/testing/` | Testing specialists |

## Tool Permissions

Select appropriate tools for your agent:

### Standard Tool Set

```yaml
tools: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent
```

### Tool Descriptions

| Tool | Purpose |
|------|---------|
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `LS` | List directory contents |
| `Read` | Read file contents |
| `WebFetch` | Fetch web content |
| `TodoWrite` | Manage task lists |
| `WebSearch` | Search the web |
| `Edit` | Edit files (string replacement) |
| `Write` | Write entire files |
| `MultiEdit` | Multiple file edits |
| `Bash` | Execute shell commands |
| `Task` | Delegate to sub-agents |
| `Agent` | Invoke other agents |

### Minimal Tool Set

For read-only agents:

```yaml
tools: Glob, Grep, LS, Read, WebSearch, Task
```

### Extended Tool Set

For DevOps agents:

```yaml
tools: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, BashOutput, KillBash, Task, Agent
```

## Agent Design Principles

### 1. Single Responsibility

Each agent should have clear, focused expertise:

```markdown
# Good: Focused expertise
## PostgreSQL Expert
Expert in PostgreSQL database design and optimization.

# Bad: Too broad
## Database Expert
Expert in MySQL, PostgreSQL, MongoDB, Redis, and SQLite.
```

### 2. Clear Boundaries

Define what the agent DOES and DOES NOT do:

```markdown
## Scope

**This agent handles:**
- PostgreSQL query optimization
- Index design and management
- Performance tuning
- Replication configuration

**This agent does NOT handle:**
- Application code (use language-specific engineers)
- Other databases (use mongodb-expert, redis-expert)
- Cloud infrastructure (use cloud architects)
```

### 3. Context Efficiency

Agents should return summarized results:

```markdown
## Output Guidelines

- Return maximum 20% of analyzed data
- Summarize findings into actionable insights
- Focus on decisions needed, not raw data
- Include only relevant code snippets
```

### 4. Composability

Design agents to work together:

```markdown
## Integration Points

- **Works with**: python-backend-engineer, nodejs-backend-engineer
- **Hands off to**: kubernetes-orchestrator (for deployment)
- **Receives from**: code-analyzer (for database query analysis)
```

## Parameterized Agents

Create flexible agents with parameters:

```markdown
---
name: python-backend-expert
description: Expert in Python backend development with configurable framework support.
tools: ...
---

# Python Backend Expert

## Parameters

Configure this agent with:
- `framework`: [fastapi|flask|django|none]
- `async_support`: boolean
- `database`: [postgresql|mongodb|redis]

## Framework-Specific Patterns

### FastAPI (when framework=fastapi)
[FastAPI-specific patterns]

### Flask (when framework=flask)
[Flask-specific patterns]

### Django (when framework=django)
[Django-specific patterns]
```

## Agent Implementation Checklist

Use this checklist when creating agents:

```markdown
## Implementation Checklist

- [ ] Create agent file: `.claude/agents/[category]/[name].md`
- [ ] Add complete frontmatter (name, description, tools, model, color)
- [ ] Include TDD Methodology section (MANDATORY)
- [ ] Add Documentation Queries with Context7 links (MANDATORY)
- [ ] Define core expertise areas
- [ ] Include development patterns with examples
- [ ] Add Self-Verification Protocol (MANDATORY)
- [ ] Add the agent to `.claude/agents/agent-registry.xml`
- [ ] Add entry to `.claude/agents/AGENT-REGISTRY.md`
- [ ] Create test scenarios (recommended)
- [ ] Document integration points
```

## Complete Example: redis-expert

Here is a complete agent example:

```markdown
---
name: redis-expert
description: Use this agent for Redis caching, pub/sub messaging, and data structure operations. Expert in Redis optimization and cluster management.
tools: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent
model: inherit
color: red
---

# Redis Expert

You are a senior Redis specialist with deep expertise in caching strategies, pub/sub patterns, and Redis data structures.

## Test-Driven Development (TDD) Methodology

**MANDATORY**: Follow strict TDD principles for all development:

1. **Write failing tests FIRST** - Before implementing any functionality
2. **Red-Green-Refactor cycle** - Test fails -> Make it pass -> Improve code
3. **One test at a time** - Focus on small, incremental development
4. **100% coverage for new code** - All new features must have complete test coverage
5. **Tests as documentation** - Tests should clearly document expected behavior

## Documentation Access via MCP Context7

Before starting any implementation, query live documentation:

**Documentation Queries:**
- `mcp://context7/redis/data-structures` - Redis data types and operations
- `mcp://context7/redis/caching` - Caching patterns and strategies
- `mcp://context7/redis/pubsub` - Pub/Sub messaging patterns
- `mcp://context7/redis/clustering` - Cluster setup and management
- `mcp://context7/redis/security` - Security best practices

## Scope

**This agent handles:**
- Redis caching strategies and implementation
- Pub/Sub messaging patterns
- Data structure selection and usage
- Performance optimization
- Cluster configuration

**This agent does NOT handle:**
- Application business logic (use language engineers)
- Other databases (use postgresql-expert, mongodb-expert)
- Infrastructure provisioning (use cloud architects)

## Core Expertise

### Data Structures
- **Strings**: Simple key-value caching
- **Hashes**: Object storage
- **Lists**: Queues and stacks
- **Sets**: Unique collections
- **Sorted Sets**: Leaderboards, rankings
- **Streams**: Event sourcing

### Caching Patterns
- **Cache-Aside**: Application manages cache
- **Read-Through**: Cache loads on miss
- **Write-Through**: Sync cache with database
- **Write-Behind**: Async cache persistence

### Pub/Sub Patterns
- **Fan-out**: One-to-many messaging
- **Work Queues**: Task distribution
- **Request/Reply**: RPC patterns

## Development Patterns

### Connection Pattern

```python
import redis
from redis import ConnectionPool

# Use connection pooling
pool = ConnectionPool(host='localhost', port=6379, db=0)
r = redis.Redis(connection_pool=pool)

# Always handle connection errors
try:
    r.ping()
except redis.ConnectionError:
    logger.error("Redis connection failed")
```

### Caching Pattern

```python
def get_user(user_id: str) -> dict:
    # Try cache first
    cached = r.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)

    # Cache miss - load from database
    user = db.get_user(user_id)

    # Store in cache with TTL
    r.setex(f"user:{user_id}", 3600, json.dumps(user))

    return user
```

### Pub/Sub Pattern

```python
# Publisher
def publish_event(channel: str, message: dict):
    r.publish(channel, json.dumps(message))

# Subscriber
def subscribe_events(channel: str):
    pubsub = r.pubsub()
    pubsub.subscribe(channel)

    for message in pubsub.listen():
        if message['type'] == 'message':
            handle_event(json.loads(message['data']))
```

## Integration Points

- **Works with**: python-backend-engineer, nodejs-backend-engineer
- **Hands off to**: kubernetes-orchestrator (for Redis cluster deployment)
- **Receives from**: code-analyzer (for cache usage analysis)

## Self-Verification Protocol

Before delivering any solution, verify:

- [ ] Documentation from Context7 has been consulted
- [ ] Code follows Redis best practices
- [ ] Tests are written and passing
- [ ] TTL values are appropriate
- [ ] Memory usage is considered
- [ ] Connection pooling is used
- [ ] Error handling is comprehensive
- [ ] Key naming is consistent
```

## Updating the Registry

After creating an agent, add it to the registry:

**`.claude/agents/AGENT-REGISTRY.md`:**

```markdown
### redis-expert

**Location**: `.claude/agents/databases/redis-expert.md`
**Description**: Use this agent for Redis caching, pub/sub messaging, and data structure operations.
**Tools**: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent
**Status**: Active
```

## Best Practices Summary

1. **Always include required sections** - TDD, Documentation Queries, Self-Verification
2. **Focus on single domain** - One technology or closely related set
3. **Provide practical examples** - Real code patterns, not theory
4. **Define clear boundaries** - What the agent does and does not do
5. **Enable composability** - Document integration points
6. **Follow naming conventions** - `category-specialty-expert` or `tool-specialist`
7. **Test your agent** - Verify it works as expected
8. **Keep context efficient** - Summarize, do not dump data

## Next Steps

- [Plugin Development](./plugin-development.md) - Package agents in plugins
- [Command Development](./command-development.md) - Create commands that use agents
- [Testing](./testing.md) - Test agent functionality
