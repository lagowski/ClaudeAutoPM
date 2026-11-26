# Testing Framework Setup Command

**Command**: `/test:setup`
**Category**: Testing & QA
**Priority**: Medium

## Description

Setup comprehensive testing framework with Jest/Vitest, Testing Library, and coverage reporting. This command configures a complete testing environment following Context7-verified best practices for frontend, backend, and E2E testing.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Usage

```bash
# Interactive setup (prompts for framework choice)
/test:setup

# Setup with specific framework
/test:setup --framework=vitest

# Setup with coverage configuration
/test:setup --framework=jest --coverage

# Setup for specific project type
/test:setup --type=react --framework=vitest
```

## Parameters

```yaml
framework:
  type: string
  enum: [vitest, jest]
  default: vitest
  description: "Testing framework to configure"

type:
  type: string
  enum: [react, vue, angular, node, vanilla]
  default: react
  description: "Project type for testing setup"

coverage:
  type: boolean
  default: true
  description: "Enable coverage reporting"

e2e:
  type: boolean
  default: false
  description: "Include E2E testing setup (Playwright/Cypress)"

ci:
  type: boolean
  default: true
  description: "Configure for CI/CD integration"
```

## Implementation Steps

### 1. Framework Detection

```javascript
// Detect existing project structure
const packageJson = await readPackageJson();
const hasReact = packageJson.dependencies?.react;
const hasVue = packageJson.dependencies?.vue;
const hasAngular = packageJson.dependencies?.['@angular/core'];

// Recommend appropriate testing framework
const framework = detectFramework({ hasReact, hasVue, hasAngular });
```

### 2. Install Dependencies

**Vitest Setup (Recommended for Modern Projects)**:
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom jsdom
```

**Jest Setup (Traditional Projects)**:
```bash
npm install -D jest @types/jest
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom jest-environment-jsdom
```

### 3. Create Configuration Files

**Vitest Configuration** (`vitest.config.js`):
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.js',

    // Context7-verified coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Realistic thresholds based on project size
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },

      // Include only source files
      include: ['src/**/*.{js,jsx,ts,tsx}'],

      // Exclude non-testable code
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.js',
        '**/*.spec.js',
        '**/*.test.js',
        'src/main.js',
        'src/**/*.d.ts'
      ],

      clean: true,
      all: true
    },

    // Test sharding configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    }
  }
});
```

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/**/*.d.ts'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  coverageReporters: ['text', 'lcov', 'json', 'html']
};
```

### 4. Create Test Setup File

**Test Setup** (`test/setup.js`):
```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};
```

### 5. Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:shard": "vitest --shard=%SHARD%/%TOTAL_SHARDS%"
  }
}
```

### 6. Create Example Test

**Example Component Test** (`src/components/__tests__/Button.test.jsx`):
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);

    // Context7-verified query: Use getByRole for accessibility
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Cannot click</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 7. CI/CD Integration (GitHub Actions)

**GitHub Actions Workflow** (`.github/workflows/test.yml`):
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        shard: [1, 2, 3]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests (shard ${{ matrix.shard }}/3)
        run: npm run test:run -- --shard=${{ matrix.shard }}/3

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Output Format

```
🧪 TESTING FRAMEWORK SETUP
==========================

✅ Framework Detection:
   - Project type: React
   - Recommended: Vitest
   - Testing Library: @testing-library/react

📦 Dependencies Installed:
   - vitest@latest
   - @vitest/ui@latest
   - @vitest/coverage-v8@latest
   - @testing-library/react@latest
   - @testing-library/user-event@latest
   - @testing-library/jest-dom@latest

⚙️  Configuration Created:
   - vitest.config.js ✓
   - test/setup.js ✓
   - .github/workflows/test.yml ✓

📋 Scripts Added:
   - npm test (run tests in watch mode)
   - npm run test:run (run tests once)
   - npm run test:coverage (generate coverage report)
   - npm run test:ui (interactive test UI)

📚 Documentation:
   - Example test created: src/components/__tests__/Button.test.jsx
   - Testing guide: docs/TESTING.md

🎯 Next Steps:
   1. Write tests for existing components
   2. Run tests: npm test
   3. Check coverage: npm run test:coverage
   4. Integrate with CI/CD pipeline
```

## Context7-Verified Patterns Applied

Based on Context7 documentation from `/vitest-dev/vitest` and `/testing-library/testing-library-docs`:

1. **Query Priority**: Setup uses semantic queries (getByRole, getByLabelText)
2. **Coverage Configuration**: Realistic thresholds with proper exclusions
3. **Test Isolation**: beforeEach/afterEach cleanup configured
4. **Sharding Support**: Multi-process test execution enabled
5. **Browser Testing**: jsdom environment configured for component testing
6. **CI Integration**: GitHub Actions with test sharding

## Validation Checklist

Before completing setup, verify:
- [ ] Testing framework installed and configured
- [ ] Coverage reporting enabled with appropriate thresholds
- [ ] Test setup file created with necessary mocks
- [ ] Example test created and passing
- [ ] package.json scripts updated
- [ ] CI/CD workflow configured
- [ ] Documentation created for team

## Related Commands

- `/test:coverage` - Generate and analyze coverage reports
- `/e2e:setup` - Setup E2E testing with Playwright
- `/lint:setup` - Configure linting for test files

## Troubleshooting

### Common Issues

**Issue**: `ReferenceError: describe is not defined`
**Solution**: Add `globals: true` to vitest.config.js

**Issue**: `Cannot find module '@testing-library/jest-dom'`
**Solution**: Ensure setupFiles path is correct in config

**Issue**: Coverage thresholds not met
**Solution**: Review uncovered code, write additional tests, or adjust thresholds

## Support

For issues or questions:
- Review official documentation via Context7 MCP server
- Check example tests in `test/examples/`
- Consult frontend-testing-engineer agent
