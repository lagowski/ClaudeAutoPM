# jest:optimize

Optimize Jest test performance with Context7-verified parallel execution, sharding, and best practices.

## Description

Comprehensive Jest performance optimization following official best practices:
- Parallel test execution across workers
- Test sharding for distributed execution
- Coverage optimization techniques
- Database optimization for testing
- Memory and resource management
- Test cleanup strategies

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: jest, nodejs.

## Usage

```bash
/jest:optimize [options]
```

## Options

- `--scope <parallel|sharding|database|coverage|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--max-workers <n>` - Set maximum parallel workers
- `--shard <index/count>` - Configure test sharding

## Examples

### Full Test Suite Optimization
```bash
/jest:optimize
```

### Parallel Execution Only
```bash
/jest:optimize --scope parallel --max-workers 4
```

### Test Sharding for CI/CD
```bash
/jest:optimize --scope sharding --shard 1/3
```

### Database Testing Optimization
```bash
/jest:optimize --scope database
```

### Analyze Without Changes
```bash
/jest:optimize --analyze-only --output jest-report.md
```

## Optimization Categories

### 1. Parallel Test Execution (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Default Parallel Execution
```json
{
  "scripts": {
    "test": "jest --maxWorkers=50%"
  }
}
```

**Benefits:**
- Uses 50% of CPU cores by default
- Automatic test distribution
- Faster test suite execution

**Performance Impact:**
- 2 cores: 1.8x faster (2 minutes → 1.1 minutes)
- 4 cores: 3.2x faster (2 minutes → 37 seconds)
- 8 cores: 5.5x faster (2 minutes → 22 seconds)

#### Custom Worker Configuration
```json
{
  "scripts": {
    "test": "jest --maxWorkers=4",
    "test:ci": "jest --maxWorkers=2",
    "test:local": "jest --maxWorkers=8"
  }
}
```

**Use Cases:**
- CI/CD: Limit to 2 workers (shared resources)
- Local dev: Use 8 workers (dedicated machine)
- Production: Use 50% (balanced approach)

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  maxWorkers: process.env.CI ? 2 : '50%',
  testTimeout: 30000, // 30 seconds
  bail: false, // Don't stop on first failure
  verbose: true,
};
```

### 2. Test Sharding (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### GitHub Actions Matrix Strategy
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --shard=${{ matrix.shard }}
```

**Benefits:**
- Runs 3 shards in parallel across GitHub runners
- Linear speedup with more shards
- Efficient CI resource usage

**Performance Impact:**
- Single runner: 15 minutes
- 3 shards: 5 minutes (3x faster)
- 5 shards: 3 minutes (5x faster)

#### GitLab CI Parallel Jobs
```yaml
# .gitlab-ci.yml
test:
  parallel: 3
  script:
    - npm ci
    - npm test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

**Benefits:**
- Automatic shard distribution
- Scales with `parallel` value
- Built-in GitLab integration

#### CircleCI Parallelism
```yaml
# .circleci/config.yml
version: 2.1
jobs:
  test:
    parallelism: 3
    steps:
      - checkout
      - run:
          name: Run tests
          command: |
            npm ci
            SHARD="$((${CIRCLE_NODE_INDEX} + 1))/${CIRCLE_NODE_TOTAL}"
            npm test -- --shard=$SHARD
```

### 3. Database Optimization for Testing (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Docker Compose with tmpfs
```yaml
# docker-compose.test.yml
version: "3.6"

services:
  db:
    image: postgres:13
    command: |
      postgres
      -c fsync=off
      -c synchronous_commit=off
      -c full_page_writes=off
      -c random_page_cost=1.0
    tmpfs:
      - /var/lib/postgresql/data
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"
```

**Optimizations Explained:**
- `fsync=off`: Disable disk synchronization (3x faster writes)
- `synchronous_commit=off`: Don't wait for WAL writes (2x faster commits)
- `full_page_writes=off`: Skip full-page WAL writes (20% faster)
- `random_page_cost=1.0`: Optimize for in-memory access
- `tmpfs`: Store database in RAM (10x faster I/O)

**Performance Impact:**
- Without optimization: 45 seconds per test suite
- With optimization: 4.5 seconds per test suite (10x faster)

**Safety Note:** ONLY use for testing, NEVER in production

#### MongoDB with tmpfs
```yaml
version: "3.6"

services:
  mongodb:
    image: mongo:6
    command: mongod --nojournal --wiredTigerCacheSizeGB 0.25
    tmpfs:
      - /data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: test
      MONGO_INITDB_ROOT_PASSWORD: test
    ports:
      - "27017:27017"
```

**Optimizations:**
- `--nojournal`: Disable journaling (2x faster writes)
- `--wiredTigerCacheSizeGB 0.25`: Limit cache (faster startup)
- `tmpfs`: RAM-based storage (8x faster I/O)

**Performance Impact:** 8x faster test execution with database operations

#### Redis with tmpfs
```yaml
version: "3.6"

services:
  redis:
    image: redis:7-alpine
    command: redis-server --save "" --appendonly no
    tmpfs:
      - /data
    ports:
      - "6379:6379"
```

**Optimizations:**
- `--save ""`: Disable RDB snapshots
- `--appendonly no`: Disable AOF persistence
- `tmpfs`: RAM-based storage

**Performance Impact:** 15x faster (no disk I/O overhead)

### 4. Test Cleanup Strategies (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Database Cleanup with Transactions
```javascript
// test/setup.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Start transaction
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback transaction (instant cleanup)
  await prisma.$executeRaw`ROLLBACK`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**Benefits:**
- Instant cleanup (no DELETE queries)
- Guaranteed isolation between tests
- No leftover test data

**Performance Impact:** 5x faster cleanup (500ms → 100ms per test)

#### Truncate Tables Strategy
```javascript
// test/setup.js
import { sequelize } from '../src/database';

afterEach(async () => {
  const tables = ['users', 'posts', 'comments'];

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE ${table}`);
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
});
```

**Benefits:**
- Faster than DELETE FROM
- Resets auto-increment counters
- Works with foreign keys

**Performance Impact:** 3x faster than DELETE (150ms → 50ms per test)

#### In-Memory Database Strategy
```javascript
// jest.config.js
module.exports = {
  globalSetup: './test/setup-db.js',
  globalTeardown: './test/teardown-db.js',
};

// test/setup-db.js
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export default async function globalSetup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri();
}

export default async function globalTeardown() {
  await mongod.stop();
}
```

**Benefits:**
- No external database required
- Instant setup/teardown
- Perfect for unit tests

**Performance Impact:** 10x faster (no network overhead)

### 5. HTTP Interceptor Testing (Context7-Verified)

**Pattern from Context7 (/goldbergyoni/nodejs-testing-best-practices):**

#### Using nock for HTTP Interception
```javascript
import nock from 'nock';

describe('API Integration', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('should fetch user from external API', async () => {
    // Mock external API
    nock('https://api.example.com')
      .get('/users/123')
      .reply(200, {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      });

    const user = await fetchUser(123);

    expect(user.name).toBe('John Doe');
  });

  it('should handle API errors', async () => {
    nock('https://api.example.com')
      .get('/users/999')
      .reply(404, { error: 'User not found' });

    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });
});
```

**Benefits:**
- No real HTTP requests (100x faster)
- Deterministic test results
- Test error scenarios easily
- No external dependencies

**Performance Impact:**
- Real HTTP: 500ms per test
- Mocked HTTP: 5ms per test (100x faster)

#### Advanced nock Patterns
```javascript
import nock from 'nock';

describe('Advanced HTTP Mocking', () => {
  it('should handle retries', async () => {
    // First call fails, second succeeds
    nock('https://api.example.com')
      .get('/data')
      .reply(500)
      .get('/data')
      .reply(200, { data: 'success' });

    const result = await fetchWithRetry('https://api.example.com/data');
    expect(result.data).toBe('success');
  });

  it('should match request body', async () => {
    nock('https://api.example.com')
      .post('/users', {
        name: 'John',
        email: 'john@example.com'
      })
      .reply(201, { id: 123 });

    const user = await createUser({ name: 'John', email: 'john@example.com' });
    expect(user.id).toBe(123);
  });

  it('should simulate network delay', async () => {
    nock('https://api.example.com')
      .get('/slow')
      .delay(2000)
      .reply(200, { data: 'slow response' });

    const start = Date.now();
    await fetchSlow();
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(2000);
  });
});
```

### 6. Coverage Optimization (Context7-Verified)

**Pattern from Context7 (Jest Documentation):**

#### Optimized Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverage: false, // Don't collect by default
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/dist/',
    '/build/',
    '\\.mock\\.',
    '\\.test\\.',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Run Coverage Only When Needed:**
```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --maxWorkers=2"
  }
}
```

**Performance Impact:**
- Without coverage: 10 seconds
- With coverage: 45 seconds (4.5x slower)
- **Solution:** Only run coverage in CI or on-demand

#### Incremental Coverage (Changed Files Only)
```json
{
  "scripts": {
    "test:changed": "jest --onlyChanged --coverage",
    "test:watch": "jest --watch --coverage=false"
  }
}
```

**Benefits:**
- Test only changed files
- Faster feedback loop
- Efficient local development

**Performance Impact:** 10x faster (45 seconds → 4.5 seconds)

### 7. Memory Optimization

**Pattern from Context7:**

#### Limit Memory per Worker
```json
{
  "scripts": {
    "test": "node --max-old-space-size=4096 node_modules/.bin/jest --maxWorkers=4"
  }
}
```

**Benefits:**
- Prevent out-of-memory errors
- Better resource control
- Faster garbage collection

#### Use --runInBand for Debugging
```json
{
  "scripts": {
    "test:debug": "jest --runInBand --detectOpenHandles"
  }
}
```

**Benefits:**
- Sequential execution (easier debugging)
- Detect resource leaks
- Better error messages

**Use Cases:**
- Debugging flaky tests
- Memory leak investigation
- CI/CD troubleshooting

### 8. Test Grouping Strategies

**Pattern from Context7:**

#### Group by Test Type
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.test.js'],
      maxWorkers: '50%',
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.test.js'],
      maxWorkers: 2,
      setupFilesAfterEnv: ['<rootDir>/test/setup-db.js'],
    },
    {
      displayName: 'e2e',
      testMatch: ['**/__tests__/e2e/**/*.test.js'],
      maxWorkers: 1,
      setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.js'],
    },
  ],
};
```

**Benefits:**
- Run test types independently
- Different worker configurations per type
- Parallel project execution

**Run Commands:**
```bash
# Run all tests
npm test

# Run specific project
npm test -- --selectProjects unit
npm test -- --selectProjects integration

# Run multiple projects
npm test -- --selectProjects unit integration
```

**Performance Impact:**
- Sequential: 20 minutes
- Grouped parallel: 7 minutes (2.8x faster)

## Optimization Output

```
🧪 Jest Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Node.js Application
Framework: Jest 29.x
Node.js: 18.x
Total Tests: 1,247

📊 Current Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Test Execution: 8m 34s
  Coverage Generation: +2m 15s (when enabled)
  Total Time: 10m 49s

  Parallel Workers: Not configured (sequential)
  Database Tests: Using production-like setup (slow)
  HTTP Tests: Making real requests (flaky)

⚡ Parallel Execution Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Sequential execution (1 worker)
  Recommended: --maxWorkers=50% (4 workers on 8-core machine)

  💡 Impact:
  - Unit tests: 8m 34s → 2m 10s (3.9x faster)
  - With proper test grouping: → 1m 32s (5.5x faster)

🗂️ Test Sharding for CI/CD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Single runner (10m 49s)
  Recommended: 3 shards across parallel runners

  💡 Impact:
  - Single runner: 10m 49s
  - 3 shards: 3m 36s (3x faster)
  - 5 shards: 2m 10s (5x faster)

  GitHub Actions configuration generated ✓

💾 Database Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  PostgreSQL using production configuration
  Current: fsync=on, full_page_writes=on (slow)

  💡 Recommendations:
  1. Use tmpfs for database storage → 10x faster I/O
  2. Disable fsync (testing only) → 3x faster writes
  3. Use transaction rollback for cleanup → 5x faster

  Docker Compose configuration generated ✓

  ⚡ Impact:
  - Current: 45s per test suite
  - Optimized: 4.5s per test suite (10x faster)

🌐 HTTP Testing Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  157 tests making real HTTP requests
  Issues: Slow (500ms avg), flaky, external dependencies

  💡 Recommendation: Use nock for HTTP interception

  ⚡ Impact:
  - Current: 78.5s total (500ms × 157 tests)
  - With nock: 0.8s total (5ms × 157 tests)
  - Speedup: 100x faster, 0% flaky

📈 Coverage Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Coverage collection always enabled
  Current: +2m 15s overhead (26% slower)

  💡 Recommendation: Collect coverage only in CI

  Scripts updated:
  - npm test → Fast (no coverage)
  - npm run test:coverage → Full coverage
  - npm run test:ci → CI with coverage

🎯 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 15

  🔴 Critical: 3 (parallel execution, database, HTTP)
  🟡 High Impact: 7 (sharding, cleanup, coverage)
  🟢 Low Impact: 5 (grouping, memory, configuration)

  Estimated Performance Improvement:

  Local Development:
  - Before: 10m 49s
  - After: 1m 32s (7x faster)

  CI/CD (with sharding):
  - Before: 10m 49s
  - After: 2m 10s (5x faster)

  Database Tests:
  - Before: 45s per suite
  - After: 4.5s per suite (10x faster)

  HTTP Tests:
  - Before: 78.5s, flaky
  - After: 0.8s, reliable (100x faster)

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@frontend-testing-engineer** agent with Jest expertise:

1. Query Context7 for Jest optimization patterns
2. Analyze current test suite configuration
3. Identify parallel execution opportunities
4. Check database testing strategies
5. Validate HTTP mocking patterns
6. Generate optimization configurations
7. Optionally apply automated fixes

## Best Practices Applied

Based on Context7 documentation from `/goldbergyoni/nodejs-testing-best-practices`:

1. **Parallel Execution** - Use 50% of CPU cores
2. **Test Sharding** - Distribute across CI runners
3. **Database Optimization** - tmpfs + fsync=off for 10x speedup
4. **HTTP Interception** - nock for 100x faster tests
5. **Transaction Rollback** - Instant cleanup between tests
6. **Coverage on Demand** - Only in CI or explicitly requested
7. **Test Grouping** - Separate unit/integration/e2e

## Related Commands

- `/test:setup` - Initial test configuration
- `/test:coverage` - Coverage analysis
- `/playwright:optimize` - E2E test optimization

## Troubleshooting

### Tests Timing Out
- Increase `testTimeout` in jest.config.js
- Check for async operations without proper cleanup
- Verify database connections are closed

### Out of Memory Errors
- Reduce `--maxWorkers` value
- Increase `--max-old-space-size`
- Use `--runInBand` to debug

### Flaky Tests with Parallel Execution
- Check for shared state between tests
- Verify database cleanup in `afterEach`
- Use transactions for test isolation

### Slow CI/CD Pipeline
- Implement test sharding
- Use tmpfs for databases
- Mock external HTTP requests

## Installation

```bash
# Install testing dependencies
npm install --save-dev jest nock mongodb-memory-server

# Install database drivers (if needed)
npm install --save-dev @prisma/client sequelize

# Setup Docker for test databases
docker-compose -f docker-compose.test.yml up -d
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Jest parallel execution patterns
- Test sharding for CI/CD
- Database optimization with tmpfs
- HTTP mocking with nock
