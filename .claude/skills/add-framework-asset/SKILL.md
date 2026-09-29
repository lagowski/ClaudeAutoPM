---
name: add-framework-asset
description: Add or change a ClaudeAutoPM command, agent or script in the right source-of-truth location (packages/), sync it into the autopm/ payload, update registries, and run the guards. Use whenever touching packages/*/commands, packages/plugin-core/scripts, autopm/.claude or agent registries.
---

# Add or change a framework asset

Asset: $ARGUMENTS

1. Edit the SOURCE: `packages/<plugin>/commands/**` (commands) or
   `packages/plugin-core/scripts` (scripts). Never edit the synced copy in
   `autopm/.claude` or `.claude/scripts`.
2. For agents: update `.claude/agents/agent-registry.xml` and
   `AGENT-REGISTRY.md` (and the `autopm/.claude` equivalents).
3. Use `.claude/` paths, never `autopm/` (framework path rule).
4. Write the failing test first (`tdd.enforcement.xml`), then implement.
5. Sync: `npm run sync:commands && npm run sync:scripts`
6. Verify:

   ```bash
   npm run sync:commands:check && npm run sync:scripts:check \
     && npm run validate:paths \
     && npx jest test/templates/agent-registry-consistency.test.js \
     && npm test
   ```
