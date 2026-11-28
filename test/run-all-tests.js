#!/usr/bin/env node

/**
 * Comprehensive test runner for ClaudeAutoPM
 * Runs all test suites and generates a summary report
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Timeout configuration
function getSuiteTimeout() {
  const isCI = process.env.CI === 'true';
  const defaultLocal = 120000; // 2 minutes
  const defaultCI = 300000;    // 5 minutes
  if (isCI) {
    return parseInt(process.env.CI_TEST_TIMEOUT || defaultCI, 10);
  } else {
    return parseInt(process.env.TEST_TIMEOUT || defaultLocal, 10);
  }
}
// Test suites configuration
const testSuites = [
  {
    name: 'Unit Tests - Self Maintenance',
    command: 'npx',
    args: ['jest', 'test/unit/self-maintenance-simple-jest.test.js', '--config', 'jest.config.clean.js'],
    critical: true
  },
  {
    name: 'Integration Tests - Azure DevOps PR Create',
    command: 'node',
    args: ['--test', 'test/providers/azure/pr-create.test.js'],
    critical: true
  },
  {
    name: 'E2E Tests - PM Commands',
    command: 'node',
    args: ['--test', 'test/e2e/placeholder.test.js'],
    critical: false // May fail in CI environment
  },
  {
    name: 'Security Tests',
    command: 'npm',
    args: ['run', 'test:security'],
    critical: true
  },
  {
    name: 'Regression Tests',
    command: 'npm',
    args: ['run', 'test:regression'],
    critical: true
  },
  {
    name: 'Installation Tests',
    command: 'npm',
    args: ['run', 'test:install:validate'],
    critical: false // May require specific environment
  }
];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test results storage
const results = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

/**
 * Run a single test suite
 */
function runTestSuite(suite) {
  return new Promise((resolve) => {
    console.log(`${colors.cyan}▶ Running: ${suite.name}${colors.reset}`);
    const startTime = Date.now();
    const SUITE_TIMEOUT = getSuiteTimeout();

    const child = spawn(suite.command, suite.args, {
      stdio: 'pipe',
      env: { ...process.env, CI: process.env.CI || 'false' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    // Set timeout for test suite (configurable via environment)
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      console.log(`${colors.yellow}⚠ ${suite.name} timed out after ${SUITE_TIMEOUT/1000}s${colors.reset}\n`);
      resolve({
        suite: suite.name,
        passed: false,
        duration: 'timeout',
        error: `Test suite timed out after ${SUITE_TIMEOUT/1000} seconds`
      });
    }, SUITE_TIMEOUT);

    child.on('close', (code) => {
      // Clear timeout when test completes normally
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const passed = code === 0;

      // Parse test results from output
      const testMatch = stdout.match(/# tests (\d+)/);
      const passMatch = stdout.match(/# pass (\d+)/);
      const failMatch = stdout.match(/# fail (\d+)/);
      const skipMatch = stdout.match(/# skip(?:ped)? (\d+)/);

      const testCount = testMatch ? parseInt(testMatch[1]) : 0;
      const passCount = passMatch ? parseInt(passMatch[1]) : (passed ? testCount : 0);
      const failCount = failMatch ? parseInt(failMatch[1]) : (passed ? 0 : testCount);
      const skipCount = skipMatch ? parseInt(skipMatch[1]) : 0;

      totalTests += testCount;
      passedTests += passCount;
      failedTests += failCount;
      skippedTests += skipCount;

      const result = {
        suite: suite.name,
        passed,
        duration: `${(duration / 1000).toFixed(2)}s`,
        tests: testCount,
        passes: passCount,
        failures: failCount,
        skipped: skipCount,
        critical: suite.critical
      };

      results.push(result);

      if (passed) {
        console.log(`${colors.green}✓ ${suite.name} completed successfully (${result.duration})${colors.reset}\n`);
      } else {
        console.log(`${colors.red}✗ ${suite.name} failed (${result.duration})${colors.reset}\n`);
        if (suite.critical) {
          console.log(`${colors.red}${colors.bold}Critical test suite failed!${colors.reset}\n`);
        }
      }

      resolve(result);
    });
  });
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bold}${colors.cyan}TEST EXECUTION SUMMARY${colors.reset}`);
  console.log('='.repeat(80) + '\n');

  // Overall statistics
  const allPassed = results.every(r => r.passed || !r.critical);
  const statusColor = allPassed ? colors.green : colors.red;
  const statusSymbol = allPassed ? '✓' : '✗';

  console.log(`${colors.bold}Overall Status:${colors.reset} ${statusColor}${statusSymbol} ${allPassed ? 'PASSED' : 'FAILED'}${colors.reset}`);
  console.log(`${colors.bold}Total Tests:${colors.reset} ${totalTests}`);
  console.log(`${colors.bold}Passed:${colors.reset} ${colors.green}${passedTests}${colors.reset}`);
  console.log(`${colors.bold}Failed:${colors.reset} ${colors.red}${failedTests}${colors.reset}`);
  console.log(`${colors.bold}Skipped:${colors.reset} ${colors.yellow}${skippedTests}${colors.reset}`);
  console.log(`${colors.bold}Success Rate:${colors.reset} ${((passedTests / (totalTests || 1)) * 100).toFixed(1)}%\n`);

  // Detailed results table
  console.log(`${colors.bold}Test Suite Results:${colors.reset}`);
  console.log('-'.repeat(80));
  console.log('Suite Name'.padEnd(40) + 'Status'.padEnd(10) + 'Tests'.padEnd(10) + 'Duration'.padEnd(10) + 'Critical');
  console.log('-'.repeat(80));

  results.forEach(result => {
    const status = result.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    const testInfo = result.tests ? `${result.passes}/${result.tests}` : 'N/A';
    const critical = result.critical ? 'Yes' : 'No';

    console.log(
      result.suite.padEnd(40) +
      status.padEnd(19) + // Extra padding for color codes
      testInfo.padEnd(10) +
      result.duration.padEnd(10) +
      critical
    );
  });

  console.log('-'.repeat(80));

  // Failed critical tests
  const failedCritical = results.filter(r => !r.passed && r.critical);
  if (failedCritical.length > 0) {
    console.log(`\n${colors.red}${colors.bold}⚠ CRITICAL FAILURES:${colors.reset}`);
    failedCritical.forEach(r => {
      console.log(`  ${colors.red}• ${r.suite}${colors.reset}`);
    });
  }

  // Recommendations
  console.log(`\n${colors.bold}Recommendations:${colors.reset}`);
  if (failedTests > 0) {
    console.log('• Fix failing tests before merging to main branch');
    console.log('• Review test output above for specific failure details');
  }
  if (skippedTests > 0) {
    console.log('• Some tests were skipped - review if they should be enabled');
  }
  if (allPassed) {
    console.log('• All critical tests passed - safe to proceed with deployment');
  }

  // Save report to file
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      passed: allPassed,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      successRate: ((passedTests / (totalTests || 1)) * 100).toFixed(1)
    },
    results
  }, null, 2));

  console.log(`\n${colors.cyan}Report saved to: ${reportPath}${colors.reset}`);

  return allPassed;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}🧪 ClaudeAutoPM Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Running ${testSuites.length} test suites...${colors.reset}`);

  // Display configuration
  const IS_CI = process.env.CI === 'true';
  const SUITE_TIMEOUT = getSuiteTimeout();
  console.log(`${colors.cyan}Configuration:${colors.reset}`);
  console.log(`  Environment: ${IS_CI ? 'CI' : 'Local'}`);
  console.log(`  Test Timeout: ${SUITE_TIMEOUT/1000}s per suite`);
  console.log(`  To customize: Set TEST_TIMEOUT or CI_TEST_TIMEOUT env variables (in ms)\n`);

  const startTime = Date.now();

  // Run tests sequentially to avoid resource conflicts
  for (const suite of testSuites) {
    try {
      await runTestSuite(suite);
    } catch (error) {
      console.error(`${colors.red}Error running ${suite.name}: ${error.message}${colors.reset}`);
      results.push({
        suite: suite.name,
        passed: false,
        error: error.message,
        critical: suite.critical
      });
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${colors.bold}Total execution time: ${totalDuration}s${colors.reset}`);

  // Generate and display report
  const success = generateReport();

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}${colors.bold}Uncaught exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`${colors.red}${colors.bold}Unhandled rejection: ${reason}${colors.reset}`);
  process.exit(1);
});

// Run tests
main().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});