# Agent Quick Reference

> Source of truth: .claude/agents/agent-registry.xml

<core_agents>

| Agent | Specialization | Example Use |
|-------|---------------|-------------|
| @agent-manager | Create, analyze, manage agents | New agent setup |
| @code-analyzer | Bug hunting, logic tracing, security | Code review |
| @file-analyzer | File/log analysis, context reduction | Large log files |
| @test-runner | Test execution, analysis, reports | Run test suite |
| @parallel-worker | Multi-stream parallel execution | Epic implementation |
| @mcp-manager | MCP installation, lifecycle, config | Add MCP server |
| @context-optimizer | Context optimization strategies | Reduce token usage |

</core_agents>

<plugin_agents>
All other specialist agents (databases, cloud, frameworks, languages, etc.)
are available as plugins. Install on demand via @agent-manager.

Examples: @postgresql-expert, @react-frontend-engineer, @aws-cloud-architect,
@docker-containerization-expert, @python-backend-engineer
</plugin_agents>

<usage_patterns>

<pattern name="Task Delegation">
<rule>Use specialized agents for ALL non-trivial tasks</rule>
<example>
Task: Build FastAPI authentication
Agent: @python-backend-engineer (install plugin first)
Context7: resolve-library-id fastapi, then query-docs on security
</example>
</pattern>

<pattern name="Context Preservation">
<rule>Agent responses must be 20% or less of input data</rule>
<when>
Large files -> @file-analyzer
Deep analysis -> @code-analyzer
Test execution -> @test-runner
</when>
</pattern>

<pattern name="Parallel Execution">
<rule>Use @parallel-worker for independent work streams</rule>
<example>
@parallel-worker execute:
- Stream 1: Frontend changes
- Stream 2: Backend changes
- Stream 3: Database migrations
</example>
</pattern>

<pattern name="Specialist Selection">
<decision_tree>
Core task? -> Use core agent directly
Specialist needed? -> Install plugin via @agent-manager
Tests? -> @test-runner
Logs? -> @file-analyzer
Bugs? -> @code-analyzer
</decision_tree>
</pattern>

</usage_patterns>

<obligations>
- ALWAYS use agents for non-trivial tasks
- Check agent registry before implementing
- Delegate to preserve context
- Use parallel execution when possible
</obligations>

<full_docs>
.claude/agents/agent-registry.xml - Complete agent registry
.claude/rules/agent-mandatory.xml - Usage enforcement
</full_docs>
