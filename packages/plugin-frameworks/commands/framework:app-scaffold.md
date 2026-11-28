---
allowed-tools: Task, Read, Write, Edit, MultiEdit, Bash, Glob, Grep
---

# React Application Scaffolding

Creates a complete React application with TypeScript and modern tooling.

**Usage**: `/react:app-scaffold [app-name] [--framework=vite|next] [--styling=tailwind|styled] [--state=zustand|redux]`

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react.


**Example**: `/react:app-scaffold dashboard-app --framework=vite --styling=tailwind --state=zustand`

**What this does**:
- Creates complete React application structure
- Sets up TypeScript configuration
- Implements styling system (Tailwind CSS or styled-components)
- Configures state management solution
- Adds testing setup (Vitest + React Testing Library)
- Creates Docker configuration for containerization
- Sets up ESLint + Prettier for code quality

Use the react-frontend-engineer agent to create a complete React application scaffold.

Requirements for the agent:
- Create modern project structure with proper React organization
- Include TypeScript configuration with strict mode
- Add component library structure with examples
- Implement state management setup
- Configure build tools (Vite or Next.js)
- Add comprehensive testing setup
- Include accessibility utilities and patterns
- Ensure responsive design setup
- Add proper error boundaries and loading states