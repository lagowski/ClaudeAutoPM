# @claudeautopm/plugin-languages

Programming language specialists for JavaScript, TypeScript, Python, Node.js, and Bash.

## 📦 Installation

```bash
# Install the plugin package
npm install -g @claudeautopm/plugin-languages

# Install plugin agents to your project
autopm plugin install languages
```

## 🤖 Agents Included

### JavaScript & TypeScript
- **javascript-frontend-engineer** - Modern JavaScript and TypeScript frontend development
  - ES6+ features and modern syntax
  - TypeScript type system
  - Browser APIs (Fetch, WebSockets, Storage)
  - Async programming (Promises, async/await)
  - Module systems (ESM, CommonJS)

### Node.js Backend
- **nodejs-backend-engineer** - Node.js server-side development
  - Express, Fastify, NestJS frameworks
  - REST API and GraphQL development
  - Middleware and authentication
  - Database integration (SQL, NoSQL)
  - Performance optimization

### Python Development
- **python-backend-engineer** - Python backend application development
  - FastAPI and Flask frameworks
  - Async Python (asyncio, aiohttp)
  - REST API development
  - ORM integration (SQLAlchemy, Django ORM)
  - Testing with pytest

- **python-backend-expert** - Advanced Python backend architecture
  - Microservices patterns
  - Celery task queues
  - WebSocket integration
  - Performance profiling
  - Production deployment

### Scripting & Automation
- **bash-scripting-expert** - Bash shell scripting and automation
  - Shell script best practices
  - Command-line tools
  - CI/CD pipeline scripts
  - System administration automation
  - POSIX compliance

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load language agents -->
- @include .claude/agents/languages/nodejs-backend-engineer.md
- @include .claude/agents/languages/python-backend-engineer.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load language-focused team
autopm team load languages

# Or include languages in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke nodejs-backend-engineer "Build REST API with Express"
```

## 📋 Agent Capabilities

### JavaScript Development
- Modern ECMAScript features
- TypeScript integration
- Frontend build tools (Vite, Webpack)
- Testing frameworks (Jest, Vitest)

### Node.js Backend
- Framework selection and setup
- API design and implementation
- Authentication and authorization
- Database connection pooling
- Logging and monitoring

### Python Backend
- Framework comparison (FastAPI, Django, Flask)
- Async programming patterns
- API documentation (OpenAPI, Swagger)
- Background task processing
- Deployment strategies

### Shell Scripting
- Automation scripts
- CI/CD pipelines
- System monitoring
- Log processing
- Cross-platform compatibility

## 🚀 Examples

### Node.js REST API

```
@nodejs-backend-engineer

Build REST API for task management:

Requirements:
- Express.js framework
- PostgreSQL database
- JWT authentication
- Input validation
- Error handling middleware
- API documentation

Endpoints:
- POST /auth/login
- GET /tasks
- POST /tasks
- PUT /tasks/:id
- DELETE /tasks/:id

Include:
1. Project structure
2. Route handlers
3. Middleware
4. Database models
5. Tests
```

### Python FastAPI Service

```
@python-backend-engineer

Create microservice with FastAPI:

Requirements:
- Async endpoints
- SQLAlchemy ORM
- Pydantic validation
- OAuth2 authentication
- OpenAPI documentation
- Docker containerization

Features:
- User registration and login
- CRUD operations
- Pagination and filtering
- Background tasks with Celery

Include:
1. API structure
2. Database models
3. Schemas and validation
4. Authentication logic
5. Dockerfile
```

### JavaScript Frontend Logic

```
@javascript-frontend-engineer

Implement data fetching layer:

Requirements:
- TypeScript types
- Fetch API with error handling
- Request/response interceptors
- Caching strategy
- Retry logic
- Loading states

Features:
- GET, POST, PUT, DELETE methods
- Query parameter handling
- File uploads
- AbortController support

Include:
1. API client class
2. TypeScript interfaces
3. Error handling
4. Unit tests
```

### Bash Automation Script

```
@bash-scripting-expert

Create deployment automation script:

Requirements:
- POSIX compliance
- Error handling and logging
- Environment validation
- Backup before deployment
- Rollback on failure
- Notification on completion

Steps:
1. Pull latest code from Git
2. Run tests
3. Build application
4. Backup current version
5. Deploy new version
6. Health check
7. Rollback if unhealthy

Include:
1. Main script
2. Helper functions
3. Configuration file
4. Usage documentation
```

### Python Advanced Backend

```
@python-backend-expert

Design scalable microservices architecture:

Requirements:
- FastAPI services
- Message queue (RabbitMQ/Redis)
- Celery for background tasks
- Service discovery
- Circuit breaker pattern
- Distributed tracing

Services:
- API Gateway
- User Service
- Order Service
- Notification Service

Include:
1. Architecture diagram
2. Service implementations
3. Message patterns
4. Error handling strategies
5. Monitoring setup
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# Node.js
export NODE_ENV=production
export PORT=3000
export DATABASE_URL=postgresql://localhost/myapp

# Python
export PYTHONPATH=/app
export DJANGO_SETTINGS_MODULE=myapp.settings
export FLASK_APP=app.py

# Shell
export SCRIPT_DEBUG=1
export LOG_LEVEL=info
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  languages:
    javascript:
      prefer_typescript: true
      module_system: esm
      target: es2022
    nodejs:
      framework: express
      orm: prisma
      test_framework: jest
    python:
      framework: fastapi
      orm: sqlalchemy
      linter: ruff
    bash:
      strict_mode: true
      posix_compliant: true
```

## 📖 Documentation

- [JavaScript Frontend Engineer Guide](./agents/javascript-frontend-engineer.md)
- [Node.js Backend Engineer Guide](./agents/nodejs-backend-engineer.md)
- [Python Backend Engineer Guide](./agents/python-backend-engineer.md)
- [Python Backend Expert Guide](./agents/python-backend-expert.md)
- [Bash Scripting Expert Guide](./agents/bash-scripting-expert.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-languages)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
