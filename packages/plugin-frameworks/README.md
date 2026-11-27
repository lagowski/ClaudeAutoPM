# @claudeautopm/plugin-frameworks

Frontend and backend framework specialists for React, Next.js, Vue, Angular, and more.

**Version**: 2.0.0 | **Schema**: 2.0 | **Context7-Verified**: ✅

Complete frontend and UX framework plugin with Context7-verified React, Tailwind CSS, and Playwright patterns. Production-ready agents with up-to-date best practices from official documentation.

## 📦 Installation

```bash
# Install the plugin package
npm install @claudeautopm/plugin-frameworks

# Or install globally
npm install -g @claudeautopm/plugin-frameworks
```

## Context7 Integration

This plugin uses Context7 MCP server to ensure all patterns follow the latest official documentation:

**Libraries Verified**:
- **React**: `/reactjs/react.dev` (2,404 snippets, trust 10.0)
- **Tailwind CSS**: `/tailwindlabs/tailwindcss.com` (1,769 snippets, trust 10.0)
- **Playwright**: `/microsoft/playwright` (2,103 snippets, trust 9.9)

All code examples, patterns, and best practices are verified against current official documentation to prevent outdated implementations.

## 🤖 Agents Included

### Frontend Frameworks
- **react-frontend-engineer** - React application development
  - React 18+ features (Suspense, Concurrent Mode)
  - Hooks and custom hook patterns
  - State management (Context, Redux, Zustand)
  - Performance optimization

- **react-ui-expert** - React UI component development
  - Component architecture and patterns
  - Props and composition patterns
  - Accessibility (a11y) best practices
  - Component libraries integration

- **tailwindcss-expert** - Tailwind CSS styling
  - Utility-first CSS approach
  - Custom theme configuration
  - Responsive design patterns
  - Plugin development

### Design & UX
- **ux-design-expert** - User experience and interface design
  - User research and personas
  - Information architecture
  - Wireframing and prototyping
  - Usability testing

### Testing
- **e2e-test-engineer** - End-to-end testing
  - Playwright and Cypress
  - Visual regression testing
  - Test automation strategies
  - CI/CD integration

### Messaging & Communication
- **nats-messaging-expert** - NATS messaging system
  - Pub/Sub patterns
  - Request/Reply patterns
  - JetStream persistence
  - Microservices communication

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load framework agents -->
- @include .claude/agents/frameworks/react-frontend-engineer.md
- @include .claude/agents/frameworks/tailwindcss-expert.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load framework-focused team
autopm team load frameworks

# Or include frameworks in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke react-frontend-engineer "Build product catalog component"
```

## 📋 Agent Capabilities

### React Development
- Modern React patterns and best practices
- State management strategies
- Performance optimization techniques
- Server-side rendering (SSR/SSG)

### UI/UX Design
- Responsive component design
- Accessibility compliance
- Design system implementation
- User-centered design principles

### Testing Strategies
- Component testing
- Integration testing
- E2E test automation
- Visual regression testing

### Styling Solutions
- Utility-first CSS with Tailwind
- CSS-in-JS approaches
- Responsive design
- Dark mode implementation

## 🔌 MCP Servers

This plugin works with the following MCP servers for enhanced capabilities:

- **react-docs** - React documentation and API references
- **vue-docs** - Vue.js documentation and patterns

Enable MCP servers:

```bash
autopm mcp enable react-docs
autopm mcp enable vue-docs
```

## 🚀 Examples

### React Component Development

```
@react-frontend-engineer

Build a product listing component with:

Requirements:
- Fetch data from REST API
- Loading and error states
- Pagination support
- Filter and sort functionality
- Responsive grid layout

Include:
1. Component implementation with hooks
2. Custom hooks for data fetching
3. TypeScript types
4. Unit tests with React Testing Library
```

### Tailwind UI Implementation

```
@tailwindcss-expert

Create responsive navigation component:

Requirements:
- Mobile-first responsive design
- Dropdown menu support
- Dark mode toggle
- Accessible keyboard navigation
- Tailwind utility classes

Include:
1. Component markup
2. Tailwind configuration
3. Custom theme extensions
4. Accessibility features
```

### UX Design System

```
@ux-design-expert

Design component library for SaaS dashboard:

Requirements:
- Consistent design language
- 8pt grid system
- Color palette and typography
- Component documentation
- Accessibility guidelines

Include:
1. Design tokens
2. Component specifications
3. Usage guidelines
4. Figma/Sketch templates
```

### E2E Testing Suite

```
@e2e-test-engineer

Create E2E test suite for checkout flow:

Requirements:
- Playwright test framework
- Page Object Model pattern
- Cross-browser testing
- Visual regression tests
- CI/CD integration

Include:
1. Test specifications
2. Page object classes
3. Test data fixtures
4. GitHub Actions workflow
```

### NATS Microservices

```
@nats-messaging-expert

Setup NATS messaging for microservices:

Requirements:
- Service discovery pattern
- Request/Reply for sync calls
- Pub/Sub for events
- JetStream for persistence
- Error handling and retry

Include:
1. NATS connection setup
2. Message patterns
3. Service implementations
4. Error handling strategies
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# API endpoints
export REACT_APP_API_URL=https://api.example.com

# Feature flags
export REACT_APP_ENABLE_DARK_MODE=true

# NATS configuration
export NATS_URL=nats://localhost:4222
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  frameworks:
    react:
      version: 18
      prefer_typescript: true
      state_management: zustand
    tailwind:
      prefix: tw-
      important: true
    testing:
      framework: playwright
      coverage_threshold: 80
```

## 📖 Documentation

- [React Frontend Engineer Guide](./agents/react-frontend-engineer.md)
- [React UI Expert Guide](./agents/react-ui-expert.md)
- [Tailwind CSS Expert Guide](./agents/tailwindcss-expert.md)
- [UX Design Expert Guide](./agents/ux-design-expert.md)
- [E2E Test Engineer Guide](./agents/e2e-test-engineer.md)
- [NATS Messaging Expert Guide](./agents/nats-messaging-expert.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-frameworks)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
