---
title: Testing
description: Test-Driven Development approach, Jest setup, and testing patterns for ClaudeAutoPM
---

# Testing

ClaudeAutoPM follows strict Test-Driven Development (TDD) methodology. All code changes MUST have tests written FIRST. This guide covers the testing approach, Jest configuration, and testing patterns.

## TDD Philosophy

### The TDD Cycle

Every implementation follows the Red-Green-Refactor cycle:

```
1. RED    - Write a failing test that describes desired behavior
2. GREEN  - Write minimum code to make the test pass
3. REFACTOR - Improve code while keeping tests green
```

### TDD Rules

1. **Write failing tests FIRST** - Before any implementation
2. **One test at a time** - Focus on small, incremental development
3. **Minimum code to pass** - Do not over-engineer
4. **100% coverage for new code** - All new features must be tested
5. **Tests as documentation** - Tests describe expected behavior

### Example TDD Workflow

```javascript
// Step 1: RED - Write failing test
describe('EpicService', () => {
  it('should return empty array when no epics exist', async () => {
    const service = new EpicService();
    const result = await service.list();
    expect(result).toEqual([]);
  });
});

// Step 2: GREEN - Minimum implementation
class EpicService {
  async list() {
    return [];
  }
}

// Step 3: REFACTOR - Improve as needed
class EpicService {
  constructor(repository) {
    this.repository = repository;
  }

  async list() {
    return this.repository?.getAll() ?? [];
  }
}
```

## Test Framework: Jest

ClaudeAutoPM uses Jest for all testing. Jest provides:
- Fast parallel test execution
- Built-in mocking and spying
- Code coverage reporting
- Watch mode for development

### Jest Configuration

The project uses multiple Jest configurations:

**jest.config.quick.js** - Quick smoke allowlist (`npm run test:quick`), excerpt:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/templates/agent-registry-consistency.test.js',
    '**/test/core/PluginManager.test.js',
    // ...a short allowlist of fast suites
  ],
  testTimeout: 10000,
  maxWorkers: 1
};
```

**jest.config.clean.js** - Wider `*-jest.test.js` set (`npm run test:full`), excerpt:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/jest-tests/*-jest.test.js',
    '**/test/unit/*-jest.test.js',
    '**/test/integration/*-jest.test.js',
    '**/test/cli/*.test.js'
    // ...
  ],
  collectCoverageFrom: ['autopm/.claude/scripts/**/*.js'],
  testTimeout: 15000
};
```

## Running Tests

### Basic Commands

```bash
# Run quick tests (default)
npm test

# Run with watch mode
npm test -- --watch

# Run specific test file
npm test -- test/core/PluginManager.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should discover plugins"

# Run full test suite
npm run test:full

# Run with coverage
npm run test:coverage
```

### Test Categories

```bash
# Unit tests
npm run test:unit

# Integration tests (Azure DevOps sync)
npm run test:integration:azure

# CLI tests
npm run test:cli

# Security tests
npm run test:security

# Regression tests
npm run test:regression

# Installation tests
npm run test:install

# CLI tests
npm run test:cli

# Azure DevOps tests
npm run test:azure

# GitHub integration tests
npm run test:github:integration
```

### Comprehensive Testing

```bash
# Run all test suites
npm run test:all

# Run comprehensive tests with report
npm run test:comprehensive

# CI/CD testing
npm run test:comprehensive:ci
```

## Test Directory Structure

```
test/
├── cli/                    # CLI command tests
│   ├── autopm-commands.test.js
│   ├── basic-commands.test.js
│   ├── config-command.test.js
│   └── epic-command.test.js
├── core/                   # Core functionality tests
│   └── PluginManager.test.js
├── e2e/                    # End-to-end tests
│   └── critical-paths.test.js
├── installation/           # Installation tests
│   ├── package-based-install.test.js
│   └── install-scenarios.test.js
├── integration/            # Integration tests
│   ├── github-sync-integration.test.js
│   └── azure-sync-integration.test.js
├── jest-tests/             # Jest-specific tests
│   ├── ai-providers/
│   ├── config/
│   ├── errors/
│   └── scripts/
├── security/               # Security tests
│   ├── prompt-injection.test.js
│   └── integration.test.js
├── regression/             # Regression tests
│   └── critical-paths.test.js
└── helpers/                # Test helpers
    └── test-utils.js
```

## Writing Tests

### Test File Naming

- Use `.test.js` suffix
- Match source file structure
- Descriptive names: `PluginManager.test.js`

### Test Structure

```javascript
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const PluginManager = require('../../lib/plugins/PluginManager');

describe('PluginManager', () => {
  let manager;

  beforeEach(() => {
    // Setup before each test
    manager = new PluginManager({
      pluginDir: '/tmp/test-plugins'
    });
  });

  afterEach(() => {
    // Cleanup after each test
    manager = null;
  });

  describe('initialize()', () => {
    it('should discover plugins in node_modules', async () => {
      await manager.initialize();
      expect(manager.plugins.size).toBeGreaterThan(0);
    });

    it('should validate plugin compatibility', async () => {
      await manager.initialize();
      const plugins = manager.listPlugins();
      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('compatible');
      });
    });
  });

  describe('loadPlugin()', () => {
    it('should throw error for non-existent plugin', async () => {
      await expect(
        manager.loadPlugin('non-existent-plugin')
      ).rejects.toThrow('Plugin not found');
    });
  });
});
```

### Async Testing

```javascript
describe('AsyncService', () => {
  it('should handle async operations', async () => {
    const result = await service.fetchData();
    expect(result).toBeDefined();
  });

  it('should handle async errors', async () => {
    await expect(service.failingOperation()).rejects.toThrow();
  });

  it('should resolve promises', () => {
    return expect(service.promiseMethod()).resolves.toBe('value');
  });
});
```

### Mocking

```javascript
// Mock modules
jest.mock('fs');
const fs = require('fs');

describe('FileService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
  });

  it('should read file contents', () => {
    fs.readFileSync.mockReturnValue('file content');

    const service = new FileService();
    const content = service.read('test.txt');

    expect(content).toBe('file content');
    expect(fs.readFileSync).toHaveBeenCalledWith('test.txt', 'utf-8');
  });
});

// Spy on methods
describe('Logger', () => {
  it('should log messages', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    logger.info('test message');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    consoleSpy.mockRestore();
  });
});
```

### Testing Events

```javascript
describe('EventEmitter behavior', () => {
  it('should emit events on discovery', async () => {
    const discoveryHandler = jest.fn();
    manager.on('discover:found', discoveryHandler);

    await manager.discoverPlugins();

    expect(discoveryHandler).toHaveBeenCalled();
    expect(discoveryHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.any(String)
      })
    );
  });
});
```

## Test Patterns

### Arrange-Act-Assert

```javascript
it('should calculate progress correctly', () => {
  // Arrange
  const epic = new Epic({
    tasks: [
      { status: 'closed' },
      { status: 'closed' },
      { status: 'open' }
    ]
  });

  // Act
  const progress = epic.calculateProgress();

  // Assert
  expect(progress).toBe(66.67);
});
```

### Given-When-Then

```javascript
describe('Epic status transitions', () => {
  it('given a backlog epic, when started, then status is in-progress', () => {
    // Given
    const epic = new Epic({ status: 'backlog' });

    // When
    epic.start();

    // Then
    expect(epic.status).toBe('in-progress');
  });
});
```

### Table-Driven Tests

```javascript
describe('Status transitions', () => {
  const testCases = [
    { from: 'backlog', action: 'start', expected: 'in-progress' },
    { from: 'in-progress', action: 'complete', expected: 'completed' },
    { from: 'completed', action: 'reopen', expected: 'in-progress' }
  ];

  testCases.forEach(({ from, action, expected }) => {
    it(`should transition from ${from} to ${expected} on ${action}`, () => {
      const epic = new Epic({ status: from });
      epic[action]();
      expect(epic.status).toBe(expected);
    });
  });
});
```

### Error Testing

```javascript
describe('Error handling', () => {
  it('should throw on invalid input', () => {
    expect(() => {
      new Epic({ status: 'invalid' });
    }).toThrow('Invalid status');
  });

  it('should throw specific error type', () => {
    expect(() => {
      service.process(null);
    }).toThrow(ValidationError);
  });

  it('should include error details', () => {
    try {
      service.process({});
    } catch (error) {
      expect(error.message).toContain('required field');
      expect(error.code).toBe('VALIDATION_ERROR');
    }
  });
});
```

## Integration Testing

### GitHub Integration Tests

```javascript
describe('GitHub Sync Integration', () => {
  let provider;

  beforeAll(() => {
    // Skip if no GitHub token
    if (!process.env.GITHUB_TOKEN) {
      console.log('Skipping: GITHUB_TOKEN not set');
      return;
    }
    provider = new GitHubProvider({
      token: process.env.GITHUB_TOKEN
    });
  });

  it('should sync issues to GitHub', async () => {
    const result = await provider.syncIssue({
      title: 'Test Issue',
      body: 'Test body'
    });

    expect(result).toHaveProperty('number');
    expect(result).toHaveProperty('url');
  });
});
```

### Database Integration

```javascript
describe('Database Integration', () => {
  let db;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  beforeEach(async () => {
    await db.clear();
  });

  it('should persist and retrieve data', async () => {
    await db.insert({ name: 'test' });
    const result = await db.find({ name: 'test' });
    expect(result).toHaveLength(1);
  });
});
```

## Testing CLI Commands

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

describe('CLI Commands', () => {
  it('should display help', async () => {
    const { stdout } = await execPromise('node bin/autopm.js --help');
    expect(stdout).toContain('ClaudeAutoPM');
    expect(stdout).toContain('Commands:');
  });

  it('should show version', async () => {
    const { stdout } = await execPromise('node bin/autopm.js --version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should handle invalid commands', async () => {
    try {
      await execPromise('node bin/autopm.js invalid-command');
    } catch (error) {
      expect(error.stderr).toContain('Unknown command');
    }
  });
});
```

## Coverage Requirements

### Coverage Thresholds

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Improving Coverage

1. Identify uncovered code in coverage report
2. Write tests for edge cases
3. Test error paths
4. Test boundary conditions

## Testing Best Practices

### DO

- Write tests before implementation (TDD)
- Use descriptive test names
- Test one thing per test
- Use meaningful assertions
- Clean up after tests
- Test edge cases and errors
- Keep tests fast and isolated

### DO NOT

- Write tests after implementation
- Test implementation details
- Share state between tests
- Use sleep/timeouts when avoidable
- Ignore flaky tests
- Skip tests without good reason

## Debugging Tests

### Running with Debug Output

```bash
# Verbose output
npm test -- --verbose

# Show console output
npm test -- --silent=false

# Debug single test
node --inspect-brk node_modules/.bin/jest --runInBand test/specific.test.js
```

### Common Issues

**Test Timeout:**
```javascript
it('should complete long operation', async () => {
  jest.setTimeout(30000); // Increase timeout
  await longOperation();
}, 30000);
```

**Async Issues:**
```javascript
// Always await or return promises
it('should handle async', async () => {
  await expect(asyncOp()).resolves.toBe('value');
});

// OR
it('should handle async', () => {
  return asyncOp().then(result => {
    expect(result).toBe('value');
  });
});
```

**Mock Not Resetting:**
```javascript
afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});
```

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Testing

```bash
# Via git hooks (setup once)
npm run setup:githooks

# Or run manually before commit
npm test && npm run validate:paths
```

## Next Steps

- [Contributing](./contributing.md) - Submit your tested code
- [Plugin Development](./plugin-development.md) - Test plugins
- [Architecture](./architecture.md) - Understand testable structure
