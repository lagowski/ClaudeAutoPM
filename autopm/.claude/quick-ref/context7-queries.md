# Context7 Documentation Queries (Quick Reference)

> Source of truth: .claude/rules/context7.xml

<context7_usage>
<when>
ALWAYS query BEFORE implementing:
- New features
- Framework usage
- API integration
- Best practices
- Design patterns
</when>

<why>
Training data is stale|APIs change|Best practices evolve
Context7 provides CURRENT documentation
</why>

<emergency_fallback>
If Context7 MCP is unavailable:
1. ALERT: "Context7 MCP unavailable"
2. ASK user: WAIT (recommended) or PROCEED (risky)
3. If proceed: add comment "// WARNING: No Context7 verification"
4. FLAG: TODO re-verify when Context7 available
</emergency_fallback>
</context7_usage>

<query_format>
Context7 is two MCP tools, not URLs:
1. `resolve-library-id` with the library name (fastapi, react, postgresql) → library ID
2. `query-docs` with that ID and the topic (authentication, hooks, indexing)
</query_format>

<common_libraries>
Backend: fastapi, sqlalchemy, pydantic, express, nestjs, prisma
Frontend: react, nextjs, tailwindcss, vue, nuxt
Testing: jest, pytest, playwright, cypress
Cloud: aws, cloudformation, azure, bicep, gcp, terraform
Databases: postgresql, mongodb, redis, elasticsearch
DevOps: docker, kubernetes, helm, github-actions
</common_libraries>

<workflow_integration>
<step1>Receive task</step1>
<step2>Query Context7 for relevant docs</step2>
<step3>Review documentation findings</step3>
<step4>Implement using current best practices</step4>
<step5>Verify against documentation</step5>
</workflow_integration>

<example>
Task: "Implement user authentication with JWT"

Queries: fastapi (security), pydantic (validation), sqlalchemy (user models)

Result: Current, secure implementation using latest patterns
</example>

<obligations>
- Query BEFORE implementing
- Never rely solely on training data
- Verify API signatures
- Check for deprecations
- Follow current patterns
</obligations>

<full_docs>.claude/rules/context7.xml</full_docs>
