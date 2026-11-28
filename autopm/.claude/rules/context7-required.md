# Context7 Documentation Access (Required)

Commands and agents that point here ("Query Context7 first") follow this
policy: query Context7 for current documentation BEFORE the main workflow.

Context7 is two MCP tools, not addressable URLs:

1. `resolve-library-id` with a library name (for example `react`) returns its
   Context7 library ID.
2. `query-docs` with that ID and the topic you need returns the docs.

Query the libraries the command or agent names on its pointer line
(`Libraries: ...`), plus any library the task itself uses. Process topics
(agile, estimation, project management) have no library: skip them.

## Fallback

If the Context7 MCP server is unavailable, state that documentation could not
be verified and proceed with extra caution — do not silently skip this step.
