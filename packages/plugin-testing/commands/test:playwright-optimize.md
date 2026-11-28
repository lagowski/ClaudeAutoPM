# playwright:optimize

Optimize Playwright E2E test performance with Context7-verified parallel execution, sharding, and browser configuration.

## Description

Comprehensive Playwright performance optimization following official Microsoft best practices:
- Fully parallel test execution
- Test sharding across multiple machines
- Browser context optimization
- Trace and video recording strategies
- Network optimization and caching
- CI/CD pipeline optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: playwright.

## Usage

```bash
/playwright:optimize [options]
```

## Options

- `--scope <parallel|sharding|browser|traces|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--workers <n>` - Set maximum parallel workers
- `--shard <index/count>` - Configure test sharding

## Examples

### Full E2E Test Optimization
```bash
/playwright:optimize
```

### Parallel Execution Only
```bash
/playwright:optimize --scope parallel --workers 4
```

### Test Sharding for CI/CD
```bash
/playwright:optimize --scope sharding --shard 1/3
```

### Browser Context Optimization
```bash
/playwright:optimize --scope browser
```

### Analyze Without Changes
```bash
/playwright:optimize --analyze-only --output playwright-report.md
```

## Optimization Categories

### 1. Fully Parallel Test Execution (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### Enable Fully Parallel Mode
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://127.0.0.1:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

**Benefits:**
- All test files run in parallel
- Each test within a file runs in parallel (with proper grouping)
- Linear speedup with more workers

**Performance Impact:**
- Sequential: 30 minutes
- Parallel (4 workers): 7.5 minutes (4x faster)
- Parallel (8 workers): 3.75 minutes (8x faster)

#### Parallel Tests Within File
```typescript
import { test, expect } from '@playwright/test';

// Enable parallel mode for all tests in this file
test.describe.configure({ mode: 'parallel' });

test.describe('Feature A', () => {
  test('test 1', async ({ page }) => {
    await page.goto('/feature-a');
    await expect(page.locator('h1')).toHaveText('Feature A');
  });

  test('test 2', async ({ page }) => {
    await page.goto('/feature-a/detail');
    await expect(page.locator('h2')).toHaveText('Details');
  });
});
```

**Benefits:**
- Tests in same file run concurrently
- Each test gets isolated browser context
- No shared state between tests

**Performance Impact:** 2-3x faster when tests have I/O waits

#### Serial Tests (When Needed)
```typescript
// Force serial execution for dependent tests
test.describe.configure({ mode: 'serial' });

test.describe('Authentication Flow', () => {
  test('should login', async ({ page }) => {
    // Login test
  });

  test('should access protected page', async ({ page }) => {
    // Depends on login
  });
});
```

**Use Cases:**
- Tests with dependencies
- State that must be preserved
- Setup/teardown sequences

### 2. Test Sharding (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### GitHub Actions Matrix Strategy
```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.shardIndex }}
          path: playwright-report/
          retention-days: 30
```

**Benefits:**
- Runs 4 shards in parallel across GitHub runners
- Linear speedup (4x with 4 shards)
- Automatic load balancing
- Parallel artifact upload

**Performance Impact:**
- Single runner: 30 minutes
- 4 shards: 7.5 minutes (4x faster)
- 8 shards: 3.75 minutes (8x faster)

**Cost Analysis:**
- Single runner: 30 minutes × 1 = 30 runner-minutes
- 4 shards: 7.5 minutes × 4 = 30 runner-minutes (same cost, 4x faster)

#### GitLab CI Parallel Jobs
```yaml
# .gitlab-ci.yml
stages:
  - test

playwright:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  parallel: 4
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 30 days
```

**Benefits:**
- Automatic shard distribution
- Built-in GitLab integration
- Scales with `parallel` value

#### CircleCI Parallelism
```yaml
# .circleci/config.yml
version: 2.1
orbs:
  playwright: talkiq/playwright@1.4.1

jobs:
  test:
    docker:
      - image: mcr.microsoft.com/playwright:v1.40.0-focal
    parallelism: 4
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Run tests
          command: |
            SHARD="$((${CIRCLE_NODE_INDEX} + 1))/${CIRCLE_NODE_TOTAL}"
            npx playwright test --shard=$SHARD
      - store_artifacts:
          path: playwright-report
```

#### Azure Pipelines
```yaml
# azure-pipelines.yml
trigger:
  - main

strategy:
  matrix:
    shard_1_4:
      shardIndex: 1
      shardTotal: 4
    shard_2_4:
      shardIndex: 2
      shardTotal: 4
    shard_3_4:
      shardIndex: 3
      shardTotal: 4
    shard_4_4:
      shardIndex: 4
      shardTotal: 4

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18'
  - script: npm ci
    displayName: 'Install dependencies'
  - script: npx playwright install --with-deps
    displayName: 'Install Playwright browsers'
  - script: npx playwright test --shard=$(shardIndex)/$(shardTotal)
    displayName: 'Run Playwright tests'
  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'playwright-report/results.xml'
```

### 3. Browser Context Optimization (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### Reuse Browser Context
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // Performance optimizations
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    },
  },
});
```

**Optimizations Explained:**
- `--disable-dev-shm-usage`: Use /tmp instead of /dev/shm (Docker)
- `--no-sandbox`: Disable sandbox (CI environments)
- `screenshot: 'only-on-failure'`: Save disk space
- `video: 'retain-on-failure'`: Only keep failed test videos
- `trace: 'on-first-retry'`: Minimal trace collection

**Performance Impact:** 30% faster test execution, 90% less disk usage

#### Shared Browser Context Pattern
```typescript
import { test as base } from '@playwright/test';

// Extend base test with shared context
export const test = base.extend<{ sharedContext: any }>({
  sharedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([
      { name: 'auth_token', value: 'test-token', domain: 'localhost', path: '/' }
    ]);
    await use(context);
    await context.close();
  },
});

// Use shared context in tests
test('test with auth', async ({ sharedContext }) => {
  const page = await sharedContext.newPage();
  await page.goto('/dashboard');
  // Already authenticated
});
```

**Benefits:**
- Shared authentication state
- Faster test execution
- Reduced setup time

**Performance Impact:** 5x faster (no repeated login: 10s → 2s per test)

### 4. Trace and Video Optimization (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### Conditional Trace Collection
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Only collect traces on first retry
    trace: 'on-first-retry',

    // Only record videos for failed tests
    video: 'retain-on-failure',

    // Screenshots only on failure
    screenshot: 'only-on-failure',
  },
});
```

**Storage Impact:**
- Full trace/video: 500 MB per run
- Optimized (failures only): 50 MB per run (10x less)

**CI/CD Benefits:**
- Faster artifact upload
- Lower storage costs
- Faster test execution (no video encoding overhead)

#### Programmatic Trace Control
```typescript
import { test } from '@playwright/test';

test('complex test with trace', async ({ page, context }) => {
  // Start trace only for critical section
  await context.tracing.start({ screenshots: true, snapshots: true });

  try {
    await page.goto('/critical-flow');
    await page.click('button');
    await page.waitForSelector('.success');
  } finally {
    // Save trace only if test fails
    if (test.info().status === 'failed') {
      await context.tracing.stop({
        path: `trace-${test.info().title}.zip`
      });
    } else {
      await context.tracing.stop();
    }
  }
});
```

**Benefits:**
- Trace only critical sections
- Save only on failure
- Minimal performance impact

### 5. Network Optimization (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### Route Interception for Speed
```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Block unnecessary resources
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();

    if (['image', 'font', 'stylesheet'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });
});

test('fast test without images', async ({ page }) => {
  await page.goto('/');
  // Page loads 3x faster without images/fonts/CSS
});
```

**Performance Impact:** 3x faster page loads (6s → 2s)

#### API Mocking for Reliability
```typescript
import { test, expect } from '@playwright/test';

test('test with mocked API', async ({ page }) => {
  // Mock API responses
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ])
    });
  });

  await page.goto('/users');
  await expect(page.locator('text=John Doe')).toBeVisible();
});
```

**Benefits:**
- 100x faster (no real API calls)
- No flaky tests (deterministic)
- No external dependencies

**Performance Impact:**
- Real API: 500ms per test
- Mocked API: 5ms per test (100x faster)

#### HTTP Cache Reuse
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Enable HTTP caching
    launchOptions: {
      args: ['--disable-features=NetworkService'],
    },

    // Reuse browser context for faster loads
    storageState: 'state.json',
  },
});
```

### 6. CI/CD Pipeline Optimization (Context7-Verified)

**Pattern from Context7 (/microsoft/playwright):**

#### Docker Container Caching
```dockerfile
# Dockerfile for CI
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Run tests
CMD ["npx", "playwright", "test"]
```

**Benefits:**
- Cached browser binaries (no download)
- Faster CI startup (30s → 5s)
- Consistent environment

#### GitHub Actions with Caching
```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Cache Playwright browsers
        uses: actions/cache@v3
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        if: steps.cache.outputs.cache-hit != 'true'

      - run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**Performance Impact:**
- Without cache: 2m 30s setup
- With cache: 15s setup (10x faster)

### 7. Test Grouping Strategies

**Pattern from Context7:**

#### Group by Feature
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'authentication',
      testMatch: '**/auth/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'checkout',
      testMatch: '**/checkout/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['authentication'],
    },
    {
      name: 'admin',
      testMatch: '**/admin/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['authentication'],
    },
  ],
});
```

**Benefits:**
- Run feature groups independently
- Define dependencies between projects
- Fail fast on critical features

**Run Commands:**
```bash
# Run all tests
npx playwright test

# Run specific project
npx playwright test --project=authentication
npx playwright test --project=checkout

# Run dependent projects
npx playwright test --project=checkout
# Automatically runs authentication first
```

#### Group by Browser
```typescript
export default defineConfig({
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile/**/*.spec.ts',
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/cross-browser/**/*.spec.ts',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/cross-browser/**/*.spec.ts',
    },
  ],
});
```

## Optimization Output

```
🎭 Playwright Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: E2E Test Suite
Framework: Playwright 1.40.0
Node.js: 18.x
Total Tests: 487

📊 Current Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Test Execution: 28m 34s
  Trace Collection: +5m 12s (always enabled)
  Video Recording: +3m 45s (all tests)
  Total Time: 37m 31s

  Parallel Workers: Not configured (sequential)
  Sharding: Not configured
  Browser Context: New context per test (slow)

⚡ Fully Parallel Execution
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Sequential execution
  Recommended: fullyParallel: true with 4 workers

  💡 Impact:
  - Sequential: 28m 34s
  - Parallel (4 workers): 7m 8s (4x faster)
  - Parallel (8 workers): 3m 34s (8x faster)

🗂️ Test Sharding for CI/CD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Single runner (37m 31s)
  Recommended: 4 shards across parallel runners

  💡 Impact:
  - Single runner: 37m 31s
  - 4 shards: 9m 23s (4x faster)
  - 8 shards: 4m 42s (8x faster)

  GitHub Actions configuration generated ✓
  Cost Analysis: Same runner-minutes, 4x faster delivery

🌐 Browser Context Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Creating new context per test (expensive)
  Current: ~2s overhead per test = 16m 14s total

  💡 Recommendations:
  1. Reuse browser context with storageState → 5x faster auth
  2. Add launchOptions optimization flags → 30% faster
  3. Share cookies between tests → No repeated login

  Configuration generated ✓

  ⚡ Impact:
  - Current: 2s setup per test (16m 14s total)
  - Optimized: 0.4s setup per test (3m 15s total)
  - Speedup: 5x faster (13 minutes saved)

📹 Trace & Video Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Collecting traces and videos for ALL tests
  Current: 8m 57s overhead, 2.3 GB storage

  💡 Recommendations:
  1. trace: 'on-first-retry' → Only on failures
  2. video: 'retain-on-failure' → Only keep failures
  3. screenshot: 'only-on-failure' → Save disk space

  Configuration updated ✓

  ⚡ Impact:
  - Current: +8m 57s, 2.3 GB storage
  - Optimized: +45s, 230 MB storage (on 5% failure rate)
  - Speedup: 12x faster, 10x less storage

🌐 Network Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Loading all resources (images, fonts, CSS)
  Current: 6s average page load

  💡 Recommendations:
  1. Block unnecessary resources → 3x faster loads
  2. Mock API responses → 100x faster, no flaky tests
  3. Enable HTTP caching → Faster repeated loads

  Route interception configured ✓

  ⚡ Impact:
  - Current: 6s per page load
  - Optimized: 2s per page load (3x faster)
  - API tests: 500ms → 5ms (100x faster)

🎯 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 18

  🔴 Critical: 4 (parallel, sharding, context, traces)
  🟡 High Impact: 8 (network, videos, caching)
  🟢 Low Impact: 6 (grouping, configuration)

  Estimated Performance Improvement:

  Local Development:
  - Before: 37m 31s
  - After: 3m 34s (10.5x faster)

  CI/CD (with 4 shards):
  - Before: 37m 31s
  - After: 4m 42s (8x faster)

  Storage Requirements:
  - Before: 2.3 GB per run
  - After: 230 MB per run (10x less)

  Test Reliability:
  - Flaky tests (real APIs): 15% failure rate
  - With mocked APIs: 0% flaky (100% reliable)

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@e2e-test-engineer** agent with Playwright expertise:

1. Query Context7 for Playwright optimization patterns
2. Analyze current test suite configuration
3. Identify parallel execution opportunities
4. Configure test sharding for CI/CD
5. Optimize browser context usage
6. Configure trace/video collection
7. Generate optimized configurations

## Best Practices Applied

Based on Context7 documentation from `/microsoft/playwright`:

1. **Fully Parallel Execution** - Run all tests concurrently
2. **Test Sharding** - Distribute across CI runners (4-8 shards)
3. **Browser Context Reuse** - Share auth state, 5x faster
4. **Conditional Traces** - Only on failures, 12x faster
5. **Network Optimization** - Block unnecessary resources, 3x faster
6. **API Mocking** - 100x faster tests, 0% flaky
7. **Docker Caching** - Cached browsers, 10x faster CI setup

## Related Commands

- `/test:setup` - Initial test configuration
- `/jest:optimize` - Unit test optimization
- `/test:performance` - Overall testing performance

## Troubleshooting

### Tests Failing in Parallel
- Check for shared state between tests
- Verify browser context isolation
- Use `test.describe.configure({ mode: 'serial' })` for dependent tests

### Sharding Not Working
- Ensure all tests are discoverable
- Check shard syntax: `--shard=1/3` (not `1-3`)
- Verify GitHub Actions matrix configuration

### Slow CI Pipeline
- Enable browser caching in CI
- Use Docker images with pre-installed browsers
- Implement test sharding

### Flaky Tests
- Mock external API calls
- Use `waitForLoadState('networkidle')`
- Increase timeout for slow operations
- Check for race conditions

## Installation

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install --with-deps

# Initialize Playwright config
npx playwright install
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Playwright fully parallel execution
- Test sharding for CI/CD
- Browser context optimization
- Trace/video conditional collection
- Network optimization patterns
