# test:performance

Comprehensive testing performance optimization across all testing frameworks with Context7-verified best practices.

## Description

Unified performance optimization for entire test ecosystem:
- Jest unit/integration testing
- Playwright E2E testing
- Vitest component testing
- Database testing optimization
- CI/CD pipeline optimization
- Test infrastructure best practices

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: nodejs, jest, playwright, vitest.

## Usage

```bash
/test:performance [options]
```

## Options

- `--scope <unit|e2e|integration|database|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--framework <jest|playwright|vitest|all>` - Target framework
- `--ci-optimize` - Optimize for CI/CD environment

## Examples

### Full Test Suite Optimization
```bash
/test:performance
```

### Framework-Specific Optimization
```bash
/test:performance --framework jest
/test:performance --framework playwright
```

### CI/CD Pipeline Optimization
```bash
/test:performance --ci-optimize
```

### Analyze Current Performance
```bash
/test:performance --analyze-only --output performance-report.md
```

### Database Tests Only
```bash
/test:performance --scope database
```

## Optimization Categories

### 1. Cross-Framework Parallel Execution (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "npm-run-all --parallel test:unit test:integration",
    "test:unit": "jest --testPathPattern=unit --maxWorkers=50%",
    "test:integration": "jest --testPathPattern=integration --maxWorkers=2",
    "test:e2e": "playwright test --workers=4",
    "test:all": "npm-run-all test:unit test:integration test:e2e",
    "test:ci": "npm-run-all --parallel test:unit test:integration && npm run test:e2e"
  }
}
```

**Benefits:**
- Run unit and integration tests in parallel
- Different worker configurations per test type
- Sequential E2E after faster tests

**Performance Impact:**
- Sequential: 25 minutes (unit: 5m + integration: 10m + E2E: 10m)
- Parallel: 15 minutes (unit||integration: 10m + E2E: 10m)
- Improvement: 1.67x faster (10 minutes saved)

#### GitHub Actions Parallel Jobs
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --shard=${{ matrix.shard }}

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e -- --shard=${{ matrix.shard }}
```

**Benefits:**
- Parallel job execution across test types
- Unit tests sharded 3 ways (3x speedup)
- E2E tests sharded 4 ways (4x speedup)
- Integration tests run concurrently with unit tests
- E2E only runs if unit/integration pass

**Performance Impact:**
- Sequential: 25 minutes
- Parallel with sharding: 5 minutes (5x faster)

**Cost Analysis:**
- Sequential: 25 runner-minutes
- Parallel: 35 runner-minutes (unit: 3×2.5 + integration: 10 + E2E: 4×2.5)
- Trade-off: 40% more runner-minutes, but 5x faster delivery

### 2. Database Testing Optimization (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Optimized Docker Compose for All Databases
```yaml
# docker-compose.test.yml
version: "3.9"

services:
  # PostgreSQL optimized for testing
  postgres:
    image: postgres:15-alpine
    command: |
      postgres
      -c fsync=off
      -c synchronous_commit=off
      -c full_page_writes=off
      -c random_page_cost=1.0
      -c shared_buffers=256MB
      -c effective_cache_size=512MB
      -c maintenance_work_mem=64MB
    tmpfs:
      - /var/lib/postgresql/data
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MySQL optimized for testing
  mysql:
    image: mysql:8.0
    command: |
      --default-authentication-plugin=mysql_native_password
      --innodb_flush_log_at_trx_commit=0
      --innodb_flush_method=O_DIRECT_NO_FSYNC
      --innodb_doublewrite=0
      --sync_binlog=0
    tmpfs:
      - /var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: testdb
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  # MongoDB optimized for testing
  mongodb:
    image: mongo:7-jammy
    command: mongod --nojournal --wiredTigerCacheSizeGB 0.25
    tmpfs:
      - /data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: test
      MONGO_INITDB_ROOT_PASSWORD: test
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis optimized for testing
  redis:
    image: redis:7-alpine
    command: redis-server --save "" --appendonly no --maxmemory 256mb
    tmpfs:
      - /data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**Performance Impact per Database:**
- PostgreSQL: 10x faster (fsync=off + tmpfs)
- MySQL: 8x faster (innodb optimizations + tmpfs)
- MongoDB: 8x faster (nojournal + tmpfs)
- Redis: 15x faster (no persistence + tmpfs)

#### Test Setup with Database Optimization
```javascript
// test/setup-db.js
import { execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

export default async function setupDatabase() {
  // Start optimized database containers
  console.log('Starting test databases...');
  execSync('docker-compose -f docker-compose.test.yml up -d', {
    stdio: 'inherit'
  });

  // Wait for health checks
  console.log('Waiting for databases to be ready...');
  await setTimeout(5000);

  // Verify all databases are healthy
  const services = ['postgres', 'mysql', 'mongodb', 'redis'];
  for (const service of services) {
    const result = execSync(
      `docker-compose -f docker-compose.test.yml ps ${service} --format json`,
      { encoding: 'utf-8' }
    );
    const status = JSON.parse(result);
    if (status.Health !== 'healthy') {
      throw new Error(`${service} is not healthy: ${status.Health}`);
    }
  }

  console.log('All databases ready!');
}

// test/teardown-db.js
import { execSync } from 'child_process';

export default async function teardownDatabase() {
  console.log('Stopping test databases...');
  execSync('docker-compose -f docker-compose.test.yml down -v', {
    stdio: 'inherit'
  });
}
```

#### Jest Configuration with Database
```javascript
// jest.config.js
module.exports = {
  globalSetup: './test/setup-db.js',
  globalTeardown: './test/teardown-db.js',

  testTimeout: 30000,
  maxWorkers: '50%',

  // Database test configuration
  projects: [
    {
      displayName: 'postgres',
      testMatch: ['**/test/postgres/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test/postgres-setup.js'],
    },
    {
      displayName: 'mongodb',
      testMatch: ['**/test/mongodb/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test/mongodb-setup.js'],
    },
  ],
};
```

### 3. Vitest Concurrent Testing (Context7-Verified)

**Pattern from Context7 (/vitest-dev/vitest):**

#### Vitest Configuration with Concurrency
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable concurrent test execution
    threads: true,
    maxThreads: 8,
    minThreads: 1,

    // Pool options
    pool: 'threads', // or 'forks' for better isolation

    // Browser testing
    browser: {
      enabled: false,
      name: 'chromium',
      provider: 'playwright',
      instances: 4, // Parallel browser instances
    },

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },

    // Test sharding
    shard: process.env.CI
      ? { index: Number(process.env.VITEST_SHARD_INDEX) || 1,
          total: Number(process.env.VITEST_SHARD_TOTAL) || 1 }
      : undefined,
  },
});
```

#### Concurrent Test Patterns
```typescript
import { describe, test, expect } from 'vitest';

// Concurrent tests in suite
describe.concurrent('API endpoints', () => {
  test('GET /users', async () => {
    const response = await fetch('http://localhost:3000/users');
    expect(response.status).toBe(200);
  });

  test('GET /posts', async () => {
    const response = await fetch('http://localhost:3000/posts');
    expect(response.status).toBe(200);
  });

  test('GET /comments', async () => {
    const response = await fetch('http://localhost:3000/comments');
    expect(response.status).toBe(200);
  });
});

// Sequential suite with concurrent tests
describe.sequential('Database operations', () => {
  test.concurrent('insert user', async () => {
    await db.users.insert({ name: 'John' });
  });

  test.concurrent('insert post', async () => {
    await db.posts.insert({ title: 'Test' });
  });
});

// Control concurrency limit
describe.concurrent('Rate-limited API', { concurrent: 2 }, () => {
  // Only 2 tests run concurrently
  test('request 1', async () => { /* ... */ });
  test('request 2', async () => { /* ... */ });
  test('request 3', async () => { /* ... */ });
  test('request 4', async () => { /* ... */ });
});
```

**Performance Impact:**
- Sequential: 10 seconds (10 tests × 1s each)
- Concurrent: 2 seconds (10 tests / 5 threads = 2s)
- Improvement: 5x faster

#### Vitest Test Sharding
```bash
# Run sharded tests locally
vitest run --shard=1/3
vitest run --shard=2/3
vitest run --shard=3/3

# GitHub Actions
VITEST_SHARD_INDEX=1 VITEST_SHARD_TOTAL=3 vitest run
```

### 4. Test Cleanup Best Practices (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Transaction-Based Cleanup (PostgreSQL/MySQL)
```javascript
// test/transaction-setup.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Start transaction for test isolation
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback transaction (instant cleanup)
  await prisma.$executeRaw`ROLLBACK`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Usage in tests
describe('User service', () => {
  it('should create user', async () => {
    const user = await prisma.user.create({
      data: { name: 'John', email: 'john@example.com' }
    });

    expect(user.name).toBe('John');
    // Automatically rolled back after test
  });
});
```

**Benefits:**
- Instant cleanup (no DELETE queries)
- Perfect test isolation
- No leftover data

**Performance Impact:** 5x faster cleanup (500ms → 100ms)

#### Truncate Tables Strategy
```javascript
// test/truncate-setup.js
import { sequelize } from '../src/database';

const tables = ['users', 'posts', 'comments', 'likes'];

afterEach(async () => {
  // Disable foreign key checks
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  // Truncate all tables
  await Promise.all(
    tables.map(table =>
      sequelize.query(`TRUNCATE TABLE ${table}`)
    )
  );

  // Re-enable foreign key checks
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
});
```

**Performance Impact:** 3x faster than DELETE FROM

#### MongoDB Cleanup
```javascript
// test/mongodb-setup.js
import { MongoClient } from 'mongodb';

let client;
let db;

beforeAll(async () => {
  client = await MongoClient.connect('mongodb://test:test@localhost:27017');
  db = client.db('testdb');
});

afterEach(async () => {
  // Drop all collections (fastest cleanup)
  const collections = await db.listCollections().toArray();
  await Promise.all(
    collections.map(({ name }) => db.collection(name).drop())
  );
});

afterAll(async () => {
  await client.close();
});
```

**Performance Impact:** 10x faster than deleteMany

### 5. HTTP Mocking for Performance (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Unified HTTP Interceptor
```javascript
// test/http-mock.js
import nock from 'nock';

export function setupHttpMocks() {
  beforeEach(() => {
    // Enable HTTP interception
    nock.cleanAll();
    nock.enableNetConnect('127.0.0.1'); // Allow localhost
  });

  afterEach(() => {
    // Verify all mocks were used
    if (!nock.isDone()) {
      console.error('Unused HTTP mocks:', nock.pendingMocks());
      nock.cleanAll();
    }
  });

  afterAll(() => {
    nock.restore();
  });
}

// Common API mocks
export const apiMocks = {
  users: {
    getAll: () => nock('https://api.example.com')
      .get('/users')
      .reply(200, [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]),

    getOne: (id, data) => nock('https://api.example.com')
      .get(`/users/${id}`)
      .reply(200, data),

    create: (data) => nock('https://api.example.com')
      .post('/users', data)
      .reply(201, { id: 123, ...data }),

    error: (code, message) => nock('https://api.example.com')
      .get(/\/users\/.*/)
      .reply(code, { error: message }),
  },
};

// Usage in tests
import { setupHttpMocks, apiMocks } from './http-mock';

describe('User service', () => {
  setupHttpMocks();

  it('should fetch users', async () => {
    apiMocks.users.getAll();

    const users = await userService.fetchUsers();
    expect(users).toHaveLength(2);
  });

  it('should handle errors', async () => {
    apiMocks.users.error(404, 'User not found');

    await expect(userService.fetchUser(999))
      .rejects.toThrow('User not found');
  });
});
```

**Performance Impact:**
- Real HTTP: 500ms per test
- Mocked HTTP: 5ms per test
- Improvement: 100x faster

### 6. Memory Optimization (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Jest Memory Configuration
```javascript
// jest.config.js
module.exports = {
  // Limit memory per worker
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Detect memory leaks
  detectLeaks: process.env.CI ? true : false,
  detectOpenHandles: process.env.CI ? true : false,

  // Test timeout
  testTimeout: 30000,
};
```

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--max-old-space-size=4096' jest",
    "test:leaks": "jest --detectLeaks --runInBand",
    "test:handles": "jest --detectOpenHandles --forceExit"
  }
}
```

### 7. CI/CD Pipeline Optimization (Context7-Verified)

**Pattern from Context7:**

#### Optimized GitHub Actions Workflow
```yaml
# .github/workflows/test-optimized.yml
name: Optimized Test Pipeline
on:
  push:
    branches: [main]
  pull_request:

env:
  NODE_VERSION: 18
  CACHE_VERSION: v1

jobs:
  # Job 1: Setup and Cache
  setup:
    runs-on: ubuntu-latest
    outputs:
      cache-key: ${{ steps.cache-keys.outputs.node-modules }}
    steps:
      - uses: actions/checkout@v3

      - name: Generate cache keys
        id: cache-keys
        run: |
          echo "node-modules=${{ env.CACHE_VERSION }}-${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}" >> $GITHUB_OUTPUT

      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Cache node modules
        uses: actions/cache@v3
        id: cache
        with:
          path: node_modules
          key: ${{ steps.cache-keys.outputs.node-modules }}

      - name: Install dependencies
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci

  # Job 2: Unit Tests (3 shards)
  unit-tests:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node modules
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ needs.setup.outputs.cache-key }}

      - name: Run unit tests
        run: npm run test:unit -- --shard=${{ matrix.shard }}/3 --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage-unit-${{ matrix.shard }}
          path: coverage/

  # Job 3: Integration Tests
  integration-tests:
    needs: setup
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --tmpfs /var/lib/postgresql/data
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node modules
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ needs.setup.outputs.cache-key }}

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test

  # Job 4: E2E Tests (4 shards)
  e2e-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node modules
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ needs.setup.outputs.cache-key }}

      - name: Cache Playwright browsers
        uses: actions/cache@v3
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e -- --shard=${{ matrix.shard }}/4

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```

**Performance Impact:**
- Sequential pipeline: 35 minutes
- Optimized parallel: 6 minutes (5.8x faster)
- Cost: Same runner-minutes, much faster feedback

## Optimization Output

```
🚀 Comprehensive Test Performance Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Full Stack Application
Testing Frameworks: Jest, Playwright, Vitest
Total Tests: 2,134 (Unit: 1,247 | Integration: 400 | E2E: 487)

📊 Current Performance Baseline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Test Suite Breakdown:
  - Unit tests (Jest): 8m 34s
  - Integration tests (Jest): 12m 45s
  - E2E tests (Playwright): 28m 34s
  Total Sequential: 49m 53s

  CI/CD Pipeline: 55m 12s
  - Setup: 2m 15s
  - Unit: 8m 34s
  - Integration: 12m 45s
  - E2E: 28m 34s
  - Coverage: 3m 04s

⚡ Parallel Execution Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Sequential execution
  Recommended: Parallel with sharding

  💡 Optimizations:
  1. Unit tests: 3 shards → 2m 51s (3x faster)
  2. Integration: 2 workers → 6m 23s (2x faster)
  3. E2E tests: 4 shards → 7m 8s (4x faster)

  New Timeline (Parallel):
  - Setup: 1m 30s (cached dependencies)
  - Unit || Integration: 6m 23s (parallel jobs)
  - E2E: 7m 8s (depends on unit+integration)
  Total: 15m 1s (3.3x faster)

💾 Database Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Using production-like database configuration
  Current: 12m 45s for integration tests

  💡 Optimizations:
  1. tmpfs storage → 10x faster I/O
  2. Disable fsync → 3x faster writes
  3. Transaction rollback cleanup → 5x faster
  4. Connection pooling → 2x faster

  Docker Compose generated with:
  - PostgreSQL: fsync=off + tmpfs
  - MongoDB: nojournal + tmpfs
  - Redis: no persistence + tmpfs

  ⚡ Impact:
  - Current: 12m 45s
  - Optimized: 1m 17s (10x faster)

🌐 HTTP Mocking
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  234 tests making real HTTP requests

  💡 Optimization: Use nock for interception

  ⚡ Impact:
  - Current: 117s total (500ms × 234 tests)
  - With nock: 1.2s total (5ms × 234 tests)
  - Speedup: 100x faster, 0% flaky

  HTTP mock library configured ✓

📈 CI/CD Pipeline Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Pipeline: 55m 12s

  Optimizations Applied:
  1. Dependency caching → 2m 15s → 30s (4.5x faster)
  2. Parallel test jobs → Run simultaneously
  3. Test sharding → Linear speedup
  4. Browser caching → 1m 30s → 10s (9x faster)
  5. Optimized databases → 12m 45s → 1m 17s (10x faster)

  New Pipeline Timeline:
  - Setup (cached): 30s
  - Unit (3 shards) || Integration: 2m 51s (parallel)
  - E2E (4 shards): 7m 8s
  Total: 10m 29s (5.3x faster)

  GitHub Actions workflow generated ✓

🎯 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 24

  🔴 Critical: 6 (parallel execution, sharding, database)
  🟡 High Impact: 10 (HTTP mocking, caching, cleanup)
  🟢 Low Impact: 8 (configuration, grouping)

  Performance Improvements:

  Local Development:
  - Before: 49m 53s
  - After: 7m 8s (7x faster)

  CI/CD Pipeline:
  - Before: 55m 12s
  - After: 10m 29s (5.3x faster)

  Test Reliability:
  - Flaky tests (real HTTP/DB): 8% failure rate
  - Optimized (mocked/isolated): <1% failure rate

  Resource Usage:
  - Database I/O: 10x faster (tmpfs)
  - Network requests: 100x faster (mocked)
  - Memory usage: 40% reduction
  - Storage: 80% reduction (traces/videos on failure)

  Cost Impact:
  - CI runner-minutes: +20% (more parallelism)
  - Delivery speed: 5.3x faster
  - Developer productivity: +400% (faster feedback)

  Run with --apply to implement all optimizations
```

## Implementation

This command uses multiple agents for comprehensive optimization:

1. **@frontend-testing-engineer** - Component testing optimization
2. **@nodejs-backend-engineer** - Integration test optimization
3. **@e2e-test-engineer** - E2E test optimization

**Workflow:**
1. Query Context7 for best practices across all frameworks
2. Analyze current test suite performance
3. Identify optimization opportunities per framework
4. Configure parallel execution and sharding
5. Optimize database testing infrastructure
6. Generate CI/CD pipeline configuration
7. Apply all optimizations with verification

## Best Practices Applied

Based on Context7 documentation from multiple sources:

1. **Parallel Execution** - Run test types concurrently
2. **Test Sharding** - Distribute across CI runners (3-4x speedup)
3. **Database Optimization** - tmpfs + fsync=off (10x speedup)
4. **HTTP Mocking** - nock interception (100x speedup)
5. **Transaction Cleanup** - Instant rollback (5x speedup)
6. **CI/CD Caching** - Dependencies and browsers (4-9x speedup)
7. **Conditional Traces** - Only on failures (12x faster, 10x less storage)

## Related Commands

- `/jest:optimize` - Jest-specific optimization
- `/playwright:optimize` - E2E-specific optimization
- `/test:setup` - Initial test configuration
- `/test:coverage` - Coverage analysis

## Troubleshooting

### Tests Still Slow
- Check database configuration (tmpfs enabled?)
- Verify HTTP mocking is active
- Review test sharding distribution
- Check worker configuration

### Flaky Tests
- Mock all external dependencies
- Use transaction-based cleanup
- Check for shared state
- Verify test isolation

### Out of Memory
- Reduce `maxWorkers` value
- Increase `--max-old-space-size`
- Check for memory leaks with `--detectLeaks`

### CI/CD Pipeline Slow
- Implement test sharding
- Enable dependency caching
- Use optimized Docker images
- Parallelize test jobs

## Installation

```bash
# Install testing frameworks
npm install --save-dev jest @playwright/test vitest

# Install utilities
npm install --save-dev nock npm-run-all

# Setup databases
docker-compose -f docker-compose.test.yml up -d

# Verify setup
npm run test:performance -- --analyze-only
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Unified testing optimization across Jest, Playwright, Vitest
- Database optimization with tmpfs
- HTTP mocking patterns
- CI/CD pipeline optimization
- Test sharding strategies
