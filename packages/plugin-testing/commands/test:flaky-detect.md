---
command: test:flaky-detect
plugin: testing
category: testing-operations
description: Flaky test detection and analysis with Context7-verified best practices
tags:
  - testing
  - flaky-tests
  - quality-assurance
  - ci-cd
  - reliability
  - test-health
tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
usage: |
  /test:flaky-detect [test-pattern] [options]
examples:
  - input: /test:flaky-detect --iterations 100 --pattern "**/*.test.js"
    description: Run all tests 100 times to detect flakiness
  - input: /test:flaky-detect --test "user login" --iterations 50
    description: Run specific test 50 times to detect flakiness
  - input: /test:flaky-detect --ci --report-format json
    description: Run flaky detection in CI mode with JSON output
  - input: /test:flaky-detect --quarantine --threshold 0.10
    description: Detect and quarantine tests with >10% failure rate
---

# test:flaky-detect

Comprehensive flaky test detection and analysis with Context7-verified best practices for identifying, analyzing, and fixing unreliable tests.

## Description

Detects and analyzes flaky tests across all testing frameworks:
- Jest unit/integration testing
- Playwright E2E testing
- Vitest component testing
- Repeated test execution for reliability analysis
- Statistical failure pattern detection
- Root cause identification (timing, race conditions, external dependencies)
- Flakiness score calculation and severity classification
- Historical failure tracking and trend analysis
- Automated quarantine recommendations
- Fix suggestions (retry strategies, waits, mocking)
- CI/CD integration for automated flaky test reporting

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: jest, playwright.

## Usage

```bash
/test:flaky-detect [test-pattern] [options]
```

## Options

### Detection Options
- `--iterations <number>` - Number of times to run tests (default: 100)
- `--pattern <glob>` - Test file pattern (default: "**/*.test.js")
- `--test <name>` - Specific test name to analyze
- `--framework <jest|playwright|vitest>` - Target framework (default: auto-detect)
- `--parallel` - Enable parallel execution (default: false)
- `--workers <number>` - Number of parallel workers (default: 4)

### Analysis Options
- `--threshold <float>` - Flakiness threshold 0.0-1.0 (default: 0.05 = 5%)
- `--severity <low|medium|high>` - Minimum severity to report (default: all)
- `--root-cause` - Perform deep root cause analysis (default: true)
- `--historical` - Include historical trend analysis (default: true)

### Action Options
- `--quarantine` - Automatically quarantine flaky tests (default: false)
- `--report-format <json|html|markdown|prometheus>` - Output format (default: markdown)
- `--output <file>` - Write report to file (default: stdout)

### CI/CD Options
- `--ci` - Enable CI mode (fail on threshold, JSON output)
- `--fail-on-threshold` - Exit with error code if threshold exceeded
- `--fail-threshold <float>` - CI failure threshold (default: 0.10 = 10%)

## Examples

### Basic Flaky Test Detection

```bash
# Run all tests 100 times
/test:flaky-detect

# Run specific test 50 times
/test:flaky-detect --test "user login" --iterations 50

# Detect flakiness in integration tests
/test:flaky-detect --pattern "**/*.integration.test.js" --iterations 200
```

### Advanced Analysis

```bash
# Deep root cause analysis with quarantine
/test:flaky-detect --root-cause --quarantine --threshold 0.05

# Parallel execution for faster detection
/test:flaky-detect --parallel --workers 8 --iterations 500

# Framework-specific detection
/test:flaky-detect --framework playwright --pattern "**/*.spec.ts"
```

### CI/CD Integration

```bash
# CI mode with JSON output
/test:flaky-detect --ci --report-format json

# Fail build if >10% tests are flaky
/test:flaky-detect --ci --fail-threshold 0.10

# Generate Prometheus metrics
/test:flaky-detect --report-format prometheus --output metrics.txt
```

### Historical Tracking

```bash
# Track flakiness over time
/test:flaky-detect --historical --output flaky-report.html

# Identify newly flaky tests
/test:flaky-detect --historical --severity medium
```

## How It Works

### 1. Test Execution Phase (Context7-Verified)

**Pattern from Context7 (/jest/retry-mechanisms):**

```javascript
// Jest retry configuration
jest.retryTimes(5, { logErrorsBeforeRetry: true });

// Playwright retry detection
test('example', async ({ page }, testInfo) => {
  if (testInfo.retry) {
    console.log(`Retry attempt ${testInfo.retry}`);
  }
});
```

The command:
1. Identifies all tests matching the pattern
2. Runs each test multiple times (default: 100 iterations)
3. Captures pass/fail status, duration, and error details
4. Supports parallel execution for faster detection
5. Handles timeouts gracefully

### 2. Pattern Analysis Phase (Context7-Verified)

**Pattern from Context7 (/testing-best-practices/flaky-detection):**

Analyzes failure patterns:
- **Intermittent**: Random pass/fail (most common flaky pattern)
- **Degrading**: Increasing failure rate over time
- **Timing-based**: Failures correlate with execution duration
- **Environmental**: Failures specific to OS/environment
- **Consistent failure**: Not flaky, truly broken

Calculates:
- **Flakiness rate**: `failures / total_runs`
- **Timing variance**: Standard deviation of execution times
- **Pattern confidence**: Statistical confidence in pattern detection

### 3. Root Cause Identification (Context7-Verified)

**Pattern from Context7 (/testing/root-cause-analysis):**

Identifies root causes:

#### Timing Issues (40% of flaky tests)
```javascript
// ❌ Fixed delays (flaky)
await page.waitForTimeout(1000);

// ✅ Conditional waits (reliable)
await page.waitForSelector('.modal', { state: 'visible' });
```

#### Race Conditions (25% of flaky tests)
```javascript
// ❌ Race condition
const user = await createUser();
const post = await createPost(user.id); // May fail if user not committed

// ✅ Proper sequencing
await db.transaction(async (tx) => {
  const user = await tx.createUser();
  const post = await tx.createPost(user.id);
});
```

#### External Dependencies (20% of flaky tests)
```javascript
// ❌ Real HTTP calls (flaky)
const response = await fetch('https://api.example.com/users');

// ✅ Mocked calls (reliable)
nock('https://api.example.com').get('/users').reply(200, mockData);
```

#### Test Isolation (10% of flaky tests)
```javascript
// ❌ Shared state
let globalUser; // Leaks between tests

// ✅ Clean state
beforeEach(() => {
  globalUser = null;
});
```

#### Other (5% of flaky tests)
- DOM manipulation timing
- Memory leaks
- Browser/environment-specific issues

### 4. Flakiness Scoring (Context7-Verified)

**Scoring Formula:**

```
Flakiness Score = (
  (failure_rate * 0.50) +          // Failure rate (50% weight)
  (timing_variance * 0.25) +       // Duration variance (25%)
  (retry_count * 0.15) +           // Number of retries (15%)
  (pattern_randomness * 0.10)      // Pattern randomness (10%)
) * 100
```

**Severity Classification:**
- **Low**: 0-10% (1-10 failures per 100 runs)
- **Medium**: 10-25% (10-25 failures per 100 runs)
- **High**: 25%+ (25+ failures per 100 runs)

### 5. Recommendations Generation (Context7-Verified)

**Pattern from Context7 (/testing/quarantine):**

Based on root cause, suggests:

#### For Timing Issues:
```javascript
// Add retry configuration
jest.retryTimes(3, { logErrorsBeforeRetry: true });

// Use proper waits
await page.waitForSelector('.element', { state: 'visible', timeout: 5000 });
```

#### For External Dependencies:
```javascript
// Mock external calls
import nock from 'nock';

beforeEach(() => {
  nock('https://api.example.com')
    .get('/users')
    .reply(200, mockData);
});
```

#### For Test Isolation:
```javascript
// Transaction-based cleanup
afterEach(async () => {
  await db.$executeRaw`ROLLBACK`;
});
```

### 6. Quarantine Management (Context7-Verified)

For tests exceeding threshold:

```javascript
// Automatic quarantine by adding .skip
describe.skip('Flaky test suite', () => {
  test('flaky test', () => {
    // Quarantined: High flakiness (35%)
    // Root cause: External API dependency
    // Issue: #1234
  });
});
```

Maintains metadata:
```json
{
  "test-id": {
    "quarantinedAt": "2024-10-21T10:00:00Z",
    "reason": "High flakiness (35%)",
    "rootCause": "external-dependency",
    "issue": "https://github.com/user/repo/issues/1234"
  }
}
```

## Output Formats

### Markdown (Default)

```markdown
# Flaky Test Detection Report

**Generated**: 2024-10-21 10:00:00
**Total Tests**: 150
**Iterations**: 100
**Flaky Tests Found**: 8 (5.3%)

## High Severity (3 tests)

### 1. User Login Test
- **File**: `test/auth/login.test.js`
- **Flakiness Rate**: 35% (35/100 failures)
- **Root Cause**: External API dependency
- **Recommendations**:
  - Mock API calls with nock
  - Add retry strategy: `jest.retryTimes(3)`
  - Quarantine immediately

### 2. Checkout Flow
- **File**: `test/e2e/checkout.spec.ts`
- **Flakiness Rate**: 28% (28/100 failures)
- **Root Cause**: DOM timing issues
- **Recommendations**:
  - Replace `waitForTimeout` with `waitForSelector`
  - Increase timeout to 5000ms
  - Add proper wait conditions
```

### JSON (CI/CD)

```json
{
  "timestamp": "2024-10-21T10:00:00Z",
  "summary": {
    "totalTests": 150,
    "iterations": 100,
    "flakyTests": 8,
    "flakinessRate": 0.053,
    "shouldFailBuild": false,
    "exitCode": 0
  },
  "details": [
    {
      "testId": "user-login-test",
      "file": "test/auth/login.test.js",
      "flakinessRate": 0.35,
      "severity": "high",
      "rootCause": {
        "category": "external-dependency",
        "confidence": 0.92
      },
      "recommendations": [
        "Mock API calls with nock",
        "Add jest.retryTimes(3)"
      ],
      "quarantine": true
    }
  ]
}
```

### HTML Report

Interactive HTML report with:
- Summary dashboard with charts
- Sortable/filterable test list
- Root cause distribution pie chart
- Historical trend graphs
- Detailed test breakdown with code snippets
- Export to PDF functionality

### Prometheus Metrics

```
# HELP flaky_tests_total Total number of flaky tests detected
# TYPE flaky_tests_total gauge
flaky_tests_total 8

# HELP flaky_tests_rate Overall flakiness rate across all tests
# TYPE flaky_tests_rate gauge
flaky_tests_rate 0.053

# HELP flaky_tests_by_severity Number of flaky tests by severity
# TYPE flaky_tests_by_severity gauge
flaky_tests_by_severity{severity="high"} 3
flaky_tests_by_severity{severity="medium"} 3
flaky_tests_by_severity{severity="low"} 2

# HELP flaky_tests_by_root_cause Number of flaky tests by root cause
# TYPE flaky_tests_by_root_cause gauge
flaky_tests_by_root_cause{cause="timing"} 3
flaky_tests_by_root_cause{cause="external-dependency"} 2
flaky_tests_by_root_cause{cause="race-condition"} 2
flaky_tests_by_root_cause{cause="test-isolation"} 1
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/flaky-detection.yml
name: Flaky Test Detection

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  detect-flaky-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - run: npm ci

      - name: Run flaky test detection
        run: |
          /test:flaky-detect \
            --ci \
            --iterations 200 \
            --fail-threshold 0.10 \
            --report-format json \
            --output flaky-report.json

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: flaky-test-report
          path: flaky-report.json

      - name: Create issue for flaky tests
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./flaky-report.json');
            const body = `# Flaky Tests Detected\n\n` +
              `Found ${report.summary.flakyTests} flaky tests.\n\n` +
              report.details.map(t =>
                `- **${t.testId}**: ${(t.flakinessRate * 100).toFixed(1)}% failure rate`
              ).join('\n');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Flaky Tests Detected',
              body: body,
              labels: ['flaky-tests', 'quality']
            });
```

### GitLab CI

```yaml
# .gitlab-ci.yml
flaky-detection:
  stage: test
  script:
    - npm ci
    - /test:flaky-detect --ci --iterations 200 --report-format json --output flaky-report.json
  artifacts:
    when: always
    reports:
      junit: flaky-report.json
    paths:
      - flaky-report.json
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

## Best Practices (Context7-Verified)

Based on Context7 documentation from multiple sources:

### 1. Detection Strategy
- **Run regularly**: Daily or weekly scheduled runs
- **Sufficient iterations**: Minimum 100 runs for statistical significance
- **Parallel execution**: Use multiple workers for faster detection
- **Target high-risk areas**: Focus on E2E and integration tests first

### 2. Root Cause Analysis
- **Always investigate**: Don't just quarantine, understand why
- **Fix don't mask**: Address root causes, not symptoms
- **Use mocks wisely**: Mock external dependencies, not business logic
- **Improve waits**: Replace fixed timeouts with conditional waits

### 3. Quarantine Management
- **Temporary only**: Quarantine is not a permanent solution
- **Track metadata**: Record why and when tests were quarantined
- **Regular review**: Weekly review of quarantined tests
- **Create issues**: Link quarantine to actionable issues

### 4. CI/CD Integration
- **Fail on threshold**: Set reasonable thresholds (10-15%)
- **Monitor trends**: Track flakiness over time
- **Alert on new flaky tests**: Catch regressions early
- **Export metrics**: Feed into monitoring dashboards

### 5. Team Process
- **Don't merge flaky tests**: Block PRs that introduce flakiness
- **Fix within sprint**: Prioritize flaky test fixes
- **Share learnings**: Document common patterns and fixes
- **Measure improvement**: Track reduction in flaky tests over time

## Troubleshooting

### False Positives

If tests are marked flaky but aren't actually unreliable:

- Increase `--iterations` for better statistical confidence
- Check for environmental issues (CI vs local)
- Verify test isolation (proper beforeEach/afterEach)
- Review root cause analysis confidence scores

### Performance Issues

If detection takes too long:

- Use `--parallel` with multiple workers
- Reduce `--iterations` for initial runs
- Target specific test patterns first
- Use faster test framework (Vitest vs Jest)

### No Flaky Tests Found

If detection finds no flaky tests but you suspect issues:

- Check test pattern matches your test files
- Verify framework is correctly detected
- Review test execution logs for errors
- Try increasing iterations (some tests fail <1%)

## Related Commands

- `/test:performance` - Optimize test execution speed
- `/test:coverage` - Analyze test coverage
- `/jest:optimize` - Jest-specific optimization
- `/playwright:optimize` - E2E-specific optimization

## Version History

- v2.0.0 - Initial release with Context7-verified patterns
  - Multi-framework support (Jest, Playwright, Vitest)
  - Statistical flakiness scoring
  - Root cause analysis with 7 categories
  - Automated quarantine management
  - CI/CD integration with multiple output formats
  - Historical trend tracking
  - Parallel execution support
