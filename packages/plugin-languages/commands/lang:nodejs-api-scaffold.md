---
name: nodejs-api-scaffold
category: nodejs
priority: medium
tags:
  - nodejs
  - express
  - api
  - typescript
  - scaffold
mcpTools:
  - context7
---

# Node.js API Scaffolding Command

Generate production-ready Node.js REST API with Context7-verified best practices.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: nodejs.

## Purpose

Create a complete Node.js/Express API with TypeScript following Context7 best practices:
- Async/await with proper error handling
- ES6 syntax (object shorthand, spread, destructuring)
- Symbol.asyncIterator for streams
- AbortSignal for cancellation
- Middleware architecture
- Database integration (Prisma/TypeORM)
- JWT authentication
- Testing with Jest
- Docker containerization

## Usage

```bash
/nodejs:api-scaffold <project-name> [options]
```

## Options

- `--framework <type>` - Framework (express, fastify, nestjs) [default: express]
- `--db <type>` - Database (postgresql, mongodb, mysql) [default: postgresql]
- `--orm <type>` - ORM (prisma, typeorm, sequelize) [default: prisma]
- `--auth` - Include JWT authentication [default: true]
- `--docker` - Include Dockerfile and docker-compose [default: true]
- `--tests` - Include Jest setup [default: true]

## Generated Structure

```
<project-name>/
├── src/
│   ├── index.ts             # Entry point with ES6 exports
│   ├── app.ts               # Express app configuration
│   ├── server.ts            # Server startup
│   ├── config/
│   │   └── index.ts         # Environment configuration
│   ├── controllers/
│   │   └── user.controller.ts  # Request handlers
│   ├── services/
│   │   └── user.service.ts     # Business logic
│   ├── models/
│   │   └── user.model.ts       # Data models
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT verification
│   │   ├── error.middleware.ts # Error handling
│   │   └── logger.middleware.ts # Logging
│   ├── routes/
│   │   └── user.routes.ts      # API routes
│   ├── utils/
│   │   ├── asyncHandler.ts     # Async wrapper
│   │   └── AppError.ts         # Custom error class
│   └── types/
│       └── index.ts            # TypeScript types
├── prisma/
│   └── schema.prisma        # Database schema
├── tests/
│   ├── setup.ts             # Test configuration
│   └── user.test.ts         # API tests
├── package.json             # npm configuration
├── tsconfig.json            # TypeScript config
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # Development setup
└── README.md
```

## Implementation Steps

1. **Query Context7 Documentation** (MANDATORY FIRST STEP)
   - Retrieve Node.js async iteration patterns (for await...of)
   - Get ES6 syntax best practices (Airbnb guide)
   - Access AbortSignal usage for cancellation
   - Review Symbol.asyncIterator implementation

2. **Create Project Structure**
   - Initialize npm/yarn project with TypeScript
   - Setup tsconfig.json
   - Install dependencies

3. **ES6 Configuration** (Using Context7 Airbnb patterns)
   ```typescript
   // src/config/index.ts
   // ES6 default parameters
   export const config = {
     port: process.env.PORT ?? 3000,
     database: {
       host: process.env.DB_HOST,
       port: process.env.DB_PORT ?? 5432,
       ...getAdditionalConfig(), // ES6 spread
     },
   };

   // Object method shorthand
   export const logger = {
     info(message: string) {
       console.log(`[INFO] ${message}`);
     },
     error(message: string) {
       console.error(`[ERROR] ${message}`);
     },
   };
   ```

4. **Async Iteration Setup** (Context7 Node.js patterns)
   ```typescript
   // src/utils/streamProcessor.ts
   import { once } from 'node:events';
   import * as readline from 'node:readline';

   // Context7 async iteration pattern
   export async function processLineByLine(filePath: string) {
     const rl = readline.createInterface({
       input: fs.createReadStream(filePath),
       crlfDelay: Infinity,
     });

     // for await...of with Symbol.asyncIterator
     for await (const line of rl) {
       // Process each line
       await processLine(line);
     }
   }

   // AbortSignal for cancellation
   export async function fetchWithTimeout(url: string, timeout: number) {
     const controller = new AbortController();
     const id = setTimeout(() => controller.abort(), timeout);

     try {
       const response = await fetch(url, {
         signal: controller.signal,
       });
       return response;
     } finally {
       clearTimeout(id);
     }
   }
   ```

5. **Express App with ES6** (Context7 patterns)
   ```typescript
   // src/app.ts
   import express from 'express';
   import helmet from 'helmet';
   import cors from 'cors';

   // ES6 named exports
   export const app = express();

   // Middleware
   app.use(helmet());
   app.use(cors());
   app.use(express.json());

   // Routes with object property shorthand
   const routes = {
     user: userRouter,
     auth: authRouter,
     health: healthRouter,
   };

   Object.entries(routes).forEach(([path, router]) => {
     app.use(`/api/${path}`, router);
   });
   ```

6. **Controllers with Async/Await**
   ```typescript
   // src/controllers/user.controller.ts
   import { Request, Response, NextFunction } from 'express';

   // ES6 arrow functions with destructuring
   export const getUsers = async (
     req: Request,
     res: Response,
     next: NextFunction
   ) => {
     try {
       const { page = 1, limit = 10 } = req.query; // Destructuring with defaults
       const users = await userService.findAll({ page, limit });
       res.json({ users }); // Object property shorthand
     } catch (error) {
       next(error);
     }
   };
   ```

7. **Testing Setup with Jest**
   - Configure Jest for TypeScript
   - Create test fixtures
   - Add API endpoint tests

8. **Docker Configuration**
   - Multi-stage Dockerfile
   - docker-compose with PostgreSQL/MongoDB
   - Development and production configs

## Context7-Verified Best Practices Applied

From `/nodejs/node` (8,761 snippets, trust 9.1):
- **Async iteration**: for await...of with Symbol.asyncIterator
- **AbortSignal**: Request cancellation support
- **Mixed approach**: rl.on('line') + await once() for performance
- **Event handling**: Proper event emitter patterns
- **Streams**: Async iterators for stream processing

From `/airbnb/javascript` (221 snippets, trust 8.1):
- **ES6 defaults**: Default parameter values
- **Object shorthand**: { lukeSkywalker } instead of { lukeSkywalker: lukeSkywalker }
- **Spread syntax**: { ...original, c: 3 } for object copying
- **Destructuring**: const { a, b } = object
- **Arrow functions**: Consistent use for callbacks

## Expected Output

```
🟢 NODE.JS API SCAFFOLDING
==========================

Project: my-api
Framework: Express + TypeScript
Database: PostgreSQL
ORM: Prisma
Auth: JWT
Testing: Jest

📋 CREATED FILES:
✓ src/index.ts (Entry point with ES6 exports)
✓ src/app.ts (Express configuration with object shorthand)
✓ src/config/index.ts (Config with ES6 defaults)
✓ src/controllers/user.controller.ts (Async handlers)
✓ src/services/user.service.ts (Business logic)
✓ src/middlewares/auth.middleware.ts (JWT verification)
✓ src/middlewares/error.middleware.ts (Error handling)
✓ src/routes/user.routes.ts (API routes)
✓ src/utils/asyncHandler.ts (Async wrapper)
✓ src/utils/streamProcessor.ts (Async iteration)
✓ src/utils/AppError.ts (Custom error class)
✓ prisma/schema.prisma (Database schema)
✓ tests/user.test.ts (API tests)
✓ package.json (Dependencies)
✓ tsconfig.json (TypeScript config)
✓ Dockerfile (Multi-stage build)
✓ docker-compose.yml (Development setup)

🔧 NEXT STEPS:
1. cd my-api
2. npm install (install dependencies)
3. cp .env.example .env (configure environment)
4. docker-compose up -d (start PostgreSQL)
5. npx prisma migrate dev (run migrations)
6. npm run dev (start server)
7. npm test (run tests)

📖 API DOCUMENTATION: http://localhost:3000/api-docs
```

## Validation Checklist

- [ ] Context7 documentation queried for latest patterns
- [ ] All async code uses for await...of where appropriate
- [ ] ES6 syntax used (object shorthand, spread, destructuring)
- [ ] AbortSignal implemented for request cancellation
- [ ] Symbol.asyncIterator used for custom iterators
- [ ] Middleware properly configured
- [ ] JWT authentication implemented
- [ ] Error handling centralized
- [ ] Tests include async patterns
- [ ] Docker configuration is multi-stage
- [ ] TypeScript types properly defined

## Agent Coordination

This command works with:
- **nodejs-backend-engineer**: For implementation details
- **javascript-frontend-engineer**: For ES6 patterns
- **postgresql-expert**: For database schema design
- **docker-containerization-expert**: For containerization
- **test-runner**: For executing tests

## Related Commands

- `/testing:prime` - Setup testing environment
- `/docker:compose-generate` - Generate docker-compose configuration
- `/github:workflow-create` - Create CI/CD workflow

## Error Handling

- Missing project name → Prompt for name
- Invalid framework → Show valid options
- Invalid database type → Show valid options
- No Context7 access → Error with instructions
- Directory exists → Confirm overwrite

## Notes

- Always queries Context7 BEFORE generating code
- Uses latest Node.js async patterns from official docs
- Follows Airbnb JavaScript style guide
- Includes AbortSignal for cancellation support
- Uses Symbol.asyncIterator for custom iterators
- Production-ready with proper error handling and logging
- TypeScript for type safety
- Jest for comprehensive testing
