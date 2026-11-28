---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
markdownStyles: false

hero:
  name: "ClaudeAutoPM"
  text: "Plugin-Based AI Project Management"
  tagline: Ship faster with spec-driven development, 7 core agents, and 13 optional plugins — v4.0.0
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: Interactive Setup
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/lagowski/ClaudeAutoPM

features:
  - icon: 🔌
    title: Plugin Architecture
    details: 13 plugins under @claudeautopm scope on npm. Install only what you need — lite uses 73% fewer tokens than full.
  - icon: 🤖
    title: 7 Core + 50+ Plugin Agents
    details: 7 always-available core agents plus 50+ specialized agents installed on demand via plugins.
  - icon: 🔗
    title: Three Providers
    details: Local issue tracking (default), GitHub Issues, and Azure DevOps. Provider router auto-selects based on config.
  - icon: 📊
    title: Spec-Driven Development
    details: Transform PRDs into epics, epics into issues, and issues into production code with full traceability.
  - icon: ⚡
    title: Token-Optimized Context
    details: Rules are summarized in CLAUDE.md and read in full on demand. Dynamic agent-registry.xml injects only installed plugin agents.
  - icon: 🔄
    title: 7 Install Scenarios
    details: From lite (2 plugins) to performance (12 plugins). Choose your footprint — no Docker required for basic PM.

---

<style>
.content-container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

.content-container h2 {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 2em;
  font-weight: 600;
}

.content-container h2:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.content-container .language-bash {
  margin: 24px 0;
}

.content-container p {
  font-size: 1.1em;
  line-height: 1.7;
  margin: 16px 0;
}

.content-container ul {
  padding-left: 1.5rem;
  margin: 24px 0;
}

.content-container li {
  margin: 12px 0;
  line-height: 1.7;
  font-size: 1.05em;
}

.content-container strong {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
</style>

<div class="content-container">

## Quick Start

```bash
# Install globally
npm install -g claude-autopm

# Install the framework into your project
autopm install
```

## Why ClaudeAutoPM?

**Stop losing context. Stop blocking on tasks. Stop shipping bugs.**

ClaudeAutoPM transforms your development workflow by:

- **Plugin-based architecture** - 13 plugins on npm, install only what you need
- **Local-first PM** - Default local provider tracks issues without GitHub or Azure
- **Token-efficient context** - XML rules and dynamic agent registry minimize prompt size
- **Parallel agent execution** - Multiple specialized AI agents working simultaneously
- **Provider flexibility** - Local, GitHub, or Azure DevOps via a unified provider router

</div>
