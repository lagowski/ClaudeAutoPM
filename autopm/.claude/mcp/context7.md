---
name: context7
command: npx
args: ["-y", "@upstash/context7-mcp"]
description: MCP server for Context7 - Up-to-date documentation database
category: documentation
status: inactive
env:
  DEFAULT_MINIMUM_TOKENS: "${DEFAULT_MINIMUM_TOKENS:-10000}"
---

# Context7 MCP Server

Official MCP server for [Context7](https://context7.com) - provides up-to-date documentation for libraries and frameworks.

## 🎯 Features

- **Up-to-date Documentation**: Always current library documentation
- **Smart Search**: Resolve library names to Context7 IDs
- **Token Control**: Configure minimum tokens for documentation retrieval
- **Multi-library Support**: Access documentation for any supported library

## 📦 Installation

### Option 1: Using AutoPM (Recommended)

```bash
# Install from npm with automatic configuration
autopm mcp install @upstash/context7-mcp --enable

# Configure API key
echo "CONTEXT7_API_KEY=your-key-here" >> .claude/.env

# Test connection
autopm mcp test context7
```

### Option 2: Manual Setup

```bash
# Copy this example to your project
cp .claude/examples/mcp/context7.md .claude/mcp/

# Enable the server
autopm mcp enable context7

# Sync configuration
autopm mcp sync
```

## 🔑 Configuration

### Environment Variables

Add to `.claude/.env`:

```bash
# Optional: Minimum tokens for documentation retrieval (default: 10000)
DEFAULT_MINIMUM_TOKENS=10000
```

Note: Context7 API key is not required for basic usage.

## 🔧 Available Tools

### 1. `resolve-library-id`
Resolves a general library name into a Context7-compatible library ID.

**Example:**
```
Library: "react" → ID: "react/latest"
Library: "nextjs" → ID: "next/latest"
```

### 2. `get-library-docs`
Fetches documentation for a library using a Context7-compatible library ID.

**Parameters:**
- `libraryId` (required): Context7 library ID (e.g., "react/latest")
- `topic` (optional): Specific topic to focus on
- `tokens` (optional): Minimum tokens to retrieve (default: 10000)

**Example:**
```
get-library-docs("react/latest", topic="hooks")
get-library-docs("nextjs/14", topic="app-router", tokens=15000)
```

## 📚 Usage in Agent Definitions

Reference Context7 documentation in your agents:

```markdown
## MCP Servers Used

This agent uses Context7 for up-to-date documentation:
Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react, nextjs, typescript.
```

## 🧪 Testing

```bash
# Test the connection
autopm mcp test context7

# Check status
autopm mcp status

# Verify in Claude Code
/mcp
```

## 🔐 Security

- Context7 MCP server does not require authentication for basic usage
- Never commit `.claude/.env` with sensitive data
- Review Context7's [privacy policy](https://context7.com/privacy)

## 📖 Supported Libraries

Context7 supports hundreds of libraries including:
- **Frontend**: React, Vue, Angular, Svelte, Next.js
- **Backend**: Express, Fastify, NestJS, Django, Flask
- **Databases**: PostgreSQL, MongoDB, Redis, MySQL
- **Cloud**: AWS, Azure, GCP services
- **And many more...**

Visit [Context7](https://context7.com) to browse all available documentation.

## 🆘 Troubleshooting

### Server Not Starting

```bash
# Check npm package is available
npm view @upstash/context7-mcp

# Reinstall
npm install -g @upstash/context7-mcp

# Test manually
npx -y @upstash/context7-mcp
```

### Library Not Found

Use `resolve-library-id` to find the correct library ID:
```
resolve-library-id("your-library-name")
```

### Token Limit Issues

Adjust `DEFAULT_MINIMUM_TOKENS` in your environment:
```bash
echo "DEFAULT_MINIMUM_TOKENS=5000" >> .claude/.env
```

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/@upstash/context7-mcp
- **GitHub**: https://github.com/upstash/context7
- **Context7 Website**: https://context7.com
- **Documentation**: https://upstash.com/docs/redis/integrations/mcp
- **Blog Post**: https://upstash.com/blog/context7-mcp

## 📝 Example Agent Configuration

```markdown
---
name: react-expert
description: React development expert with Context7 documentation
mcpServers:
  - context7
---

# React Expert Agent

This agent has access to:
Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react, react-router, redux.
```

## 🎓 Best Practices

1. **Use Specific Library IDs**: `react/18` instead of `react/latest` for stability
2. **Configure Token Limits**: Adjust based on your needs
3. **Cache Results**: Context7 provides fresh docs but cache for performance
4. **Topic Filtering**: Use specific topics to reduce token usage
5. **Test Regularly**: Ensure documentation sources are accessible

## 🆕 Updates

Context7 MCP server is actively maintained by Upstash. Check for updates:

```bash
npm update -g @upstash/context7-mcp
```

---

**Need help?** Visit [Context7 documentation](https://context7.com) or [Upstash support](https://upstash.com/support)
