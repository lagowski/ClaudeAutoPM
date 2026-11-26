---
command: test:mutation-testing
plugin: testing
category: testing-operations
description: Mutation testing for test suite quality assessment
tags:
  - testing
  - mutation-testing
  - quality-assurance
  - stryker
  - code-quality
tools:
  - @e2e-test-engineer
  - @test-runner
  - Read
  - Write
  - Bash
usage: |
  /test:mutation-testing --target src/ --mutators all --threshold 80
examples:
  - input: /test:mutation-testing --target lib/calculator.js --report html
    description: Run mutation testing on calculator module
  - input: /test:mutation-testing --incremental --only-changed
    description: Run mutation tests only on changed files
  - input: /test:mutation-testing --threshold 90 --parallel
    description: Run mutation testing with 90% threshold in parallel mode
---

# Test Mutation Testing Command

**Command**: `/test:mutation-testing`
**Category**: Testing & QA
**Priority**: High

## Description

Perform mutation testing to assess test suite quality beyond code coverage. Mutation testing introduces controlled changes (mutations) to your code and verifies that your tests catch these changes. This command provides comprehensive mutation analysis, identifies weak tests, and recommends improvements based on Context7-verified best practices.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: stryker-mutator, jest.

## Usage

```bash
# Basic mutation testing
/test:mutation-testing

# Target specific files
/test:mutation-testing --target src/utils/validation.js

# Use all mutation types
/test:mutation-testing --mutators all --threshold 80

# Incremental (changed files only)
/test:mutation-testing --incremental --only-changed

# Parallel execution for speed
/test:mutation-testing --parallel --max-workers 4

# Generate HTML report
/test:mutation-testing --report html --open

# Compare with code coverage
/test:mutation-testing --compare-coverage
```

## Parameters

```yaml
target:
  type: string
  default: "src/"
  description: "Directory or file to mutate"

mutators:
  type: string|array
  enum: [all, arithmetic, logical, conditional, statement]
  default: all
  description: "Types of mutations to generate"

threshold:
  type: number
  default: 75
  description: "Minimum mutation score threshold (industry: 70-95%)"

testRunner:
  type: string
  enum: [jest, vitest, mocha]
  default: auto
  description: "Test framework to use"

parallel:
  type: boolean
  default: true
  description: "Run mutants in parallel"

maxWorkers:
  type: number
  default: 4
  description: "Maximum parallel workers"

incremental:
  type: boolean
  default: false
  description: "Only test changed files"

onlyChanged:
  type: boolean
  default: false
  description: "Git diff changed files only"

report:
  type: string|array
  enum: [html, json, text, console]
  default: [html, console]
  description: "Report output format(s)"

open:
  type: boolean
  default: false
  description: "Open HTML report in browser"

compareCoverage:
  type: boolean
  default: true
  description: "Compare mutation score vs code coverage"

timeout:
  type: number
  default: 5000
  description: "Test timeout per mutant (ms)"

coverageAnalysis:
  type: string
  enum: [off, all, perTest]
  default: perTest
  description: "Stryker coverage analysis mode"
```

## Implementation Steps

### 1. Query Context7 Documentation

```bash
# MANDATORY: Query Context7 before proceeding
# This ensures you use Context7-verified patterns

echo "Querying Context7 for mutation testing best practices..."
# - Stryker mutator configuration
# - Mutation types and strategies
# - Industry standard thresholds (70-95%)
# - Test quality assessment patterns
```

### 2. Detect Test Framework

```javascript
import { detectTestFramework } from '../lib/mutation-testing';

const testRunner = detectTestFramework(); // jest, vitest, or mocha
console.log(`Detected test framework: ${testRunner}`);
```

### 3. Configure Stryker Mutator

```javascript
import { configureStryker } from '../lib/mutation-testing';

const config = configureStryker({
  testRunner: 'jest',
  coverageAnalysis: 'perTest', // Context7-verified optimal setting
  mutators: ['arithmetic', 'logical', 'conditional', 'statement'],
  threshold: 75,
  reporters: ['html', 'json', 'console'],
  timeoutMS: 5000,
  maxConcurrentTestRunners: 4
});
```

### 4. Generate Mutations

```javascript
import { generateMutants, MutationType } from '../lib/mutation-testing';

const code = fs.readFileSync('src/utils/validation.js', 'utf-8');

const mutants = generateMutants(code, [
  MutationType.ARITHMETIC,  // + → -, * → /, etc.
  MutationType.LOGICAL,     // && → ||, ! → identity
  MutationType.CONDITIONAL, // > → >=, == → !=, etc.
  MutationType.STATEMENT    // Remove statements
]);

console.log(`Generated ${mutants.length} mutants`);
```

### 5. Execute Mutation Testing

```javascript
import { runStryker, executeMutants } from '../lib/mutation-testing';

// Option 1: Use Stryker (recommended)
const results = await runStryker(config);

// Option 2: Custom execution
const mutationResults = await executeMutants(mutants, 'npm test', {
  parallel: true,
  maxWorkers: 4,
  timeout: 5000
});
```

### 6. Calculate Mutation Score

```javascript
import { calculateMutationScore } from '../lib/mutation-testing';

const score = calculateMutationScore(results, { threshold: 75 });

console.log(`
Mutation Score: ${score.percentage}%
  Killed: ${score.killed}
  Survived: ${score.survived}
  Timeout: ${score.timeout}
  Meets Threshold (${score.threshold}%): ${score.meetsThreshold ? '✅' : '❌'}
`);
```

### 7. Identify Surviving Mutants

```javascript
import { identifySurvivingMutants } from '../lib/mutation-testing';

const surviving = identifySurvivingMutants(results, {
  sortByPriority: true,
  includeRecommendations: true
});

console.log(`\n⚠️  ${surviving.length} surviving mutants found:\n`);

surviving.forEach(mutant => {
  console.log(`
  ${mutant.file}:${mutant.location.line}
  Type: ${mutant.type}
  Mutation: ${mutant.description}
  Priority: ${mutant.priority}

  💡 Recommendation: ${mutant.recommendation}
  `);
});
```

### 8. Analyze Test Quality

```javascript
import { analyzeTestQuality } from '../lib/mutation-testing';

const mutationScore = 75.5;
const codeCoverage = 90.0;

const analysis = analyzeTestQuality(mutationScore, codeCoverage);

console.log(`
🔍 TEST QUALITY ANALYSIS
========================

Mutation Score:  ${mutationScore}%
Code Coverage:   ${codeCoverage}%
Gap:            ${analysis.gap}%
Quality:        ${analysis.quality} ${analysis.qualityEmoji}

${analysis.interpretation}
`);
```

### 9. Generate Reports

```javascript
import { generateReport } from '../lib/mutation-testing';

// HTML Report
const htmlReport = generateReport(results, 'html');
console.log(`HTML report: ${htmlReport.outputPath}`);

// JSON Report
const jsonReport = generateReport(results, 'json');
fs.writeFileSync('mutation-report.json', JSON.stringify(jsonReport.data, null, 2));

// Console Report
const textReport = generateReport(results, 'text');
console.log(textReport.content);
```

## Output Format

### Standard Console Output

```
🧬 MUTATION TESTING REPORT
==========================

📊 Mutation Score: 78.5%

  ✅ Killed:   157 mutants
  ⚠️  Survived: 43 mutants
  ⏱️  Timeout:  0 mutants

  Total Mutants: 200

📈 Score by Type:
  Arithmetic:   85.2%  ✅
  Logical:      76.3%  ⚠️
  Conditional:  72.1%  ⚠️
  Statement:    81.5%  ✅

📁 Score by File:
  src/utils/validation.js      65.2%  ❌  HIGH PRIORITY
  src/services/api.js           82.3%  ✅
  src/components/UserForm.jsx   91.5%  ✅
  src/hooks/useAuth.js          74.8%  ⚠️

⚠️  SURVIVING MUTANTS (43 total)
================================

Priority: HIGH (15 mutants)
─────────────────────────────────────────

File: src/utils/validation.js:42
Type: Conditional
Mutation: Changed > to >= in password length check

💡 Recommendation: Add boundary test for password length
   Example: expect(validatePassword('12345')).toBe(false);

File: src/utils/validation.js:58
Type: Logical
Mutation: Changed && to || in email validation

💡 Recommendation: Add test for partial email validation
   Example: expect(validateEmail('user@')).toBe(false);

Priority: MEDIUM (20 mutants)
─────────────────────────────────────────

File: src/hooks/useAuth.js:23
Type: Arithmetic
Mutation: Changed token expiry calculation + to -

💡 Recommendation: Add test for token expiry edge case

Priority: LOW (8 mutants)
─────────────────────────────────────────

File: src/components/UserForm.jsx:105
Type: Statement
Mutation: Removed console.log statement

💡 Recommendation: This may be acceptable (logging)

🎯 COMPARISON: Mutation Score vs Code Coverage
==============================================

Code Coverage:    92.3%  ✅
Mutation Score:   78.5%  ⚠️
Gap:             13.8%

Quality Assessment: MODERATE

📖 What This Means:
   Your code coverage is high (92.3%), but mutation testing
   reveals that 13.8% of your "covered" code lacks strong
   assertions. Tests execute the code but don't verify behavior.

💡 Key Insight (Context7-verified):
   Coverage measures test execution, not test quality.
   Mutation testing reveals weak tests that pass even when
   code behavior changes.

📈 ACTIONABLE RECOMMENDATIONS
==============================

To reach 85% mutation score:

1. 🔴 HIGH Priority (Est: 3 hours)
   ├─ Add boundary tests for validation.js
   ├─ Add logical operator edge case tests
   └─ Expected improvement: +6.5%

2. 🟡 MEDIUM Priority (Est: 2 hours)
   ├─ Add arithmetic mutation tests for calculations
   ├─ Add conditional branch tests
   └─ Expected improvement: +4.2%

3. 🟢 LOW Priority (Est: 1 hour)
   ├─ Review statement mutations (may be acceptable)
   └─ Expected improvement: +1.8%

Total estimated effort: 6 hours
Projected mutation score: 85.0%

📚 INDUSTRY BENCHMARKS (Context7)
=================================

Your Score:        78.5%
Minimum Acceptable: 70%   ✅
Recommended:       80%   ⚠️  (1.5% to go)
High Quality:      90%   ❌  (11.5% gap)

🎯 NEXT STEPS

1. Review HTML report: open reports/mutation/index.html
2. Focus on HIGH priority surviving mutants first
3. Run tests: npm test
4. Re-run mutation testing: /test:mutation-testing
5. Track progress: mutation score should increase

💾 Reports Generated:
   📄 HTML:    reports/mutation/index.html
   📊 JSON:    reports/mutation/mutation-report.json
   📈 Trend:   reports/mutation/trend.json
```

## Context7-Verified Best Practices

Based on Context7 documentation queries:

### Mutation Score Thresholds

```javascript
// Industry standards from Context7
const mutationThresholds = {
  // Minimum acceptable (basic quality)
  minimum: {
    score: 70,
    description: 'Tests catch most bugs',
    risk: 'moderate'
  },

  // Recommended for production (good quality)
  recommended: {
    score: 80,
    description: 'Strong test suite',
    risk: 'low'
  },

  // High quality (critical systems)
  high: {
    score: 90,
    description: 'Excellent test coverage and quality',
    risk: 'very low'
  },

  // Context-based thresholds
  byContext: {
    payment: 95,     // Financial transactions
    auth: 90,        // Authentication/security
    ui: 75,          // User interface
    logging: 70      // Non-critical utilities
  }
};
```

### Mutation Types (Stryker)

```javascript
// Context7-verified mutation operators
const mutationTypes = {
  // Arithmetic: +, -, *, /, %
  arithmetic: {
    operators: ['+', '-', '*', '/', '%'],
    examples: [
      'a + b → a - b',
      'x * 2 → x / 2',
      'y % 10 → y * 10'
    ]
  },

  // Logical: &&, ||, !
  logical: {
    operators: ['&&', '||', '!'],
    examples: [
      'a && b → a || b',
      '!valid → valid',
      'x || y → x && y'
    ]
  },

  // Conditional: <, >, <=, >=, ==, !=
  conditional: {
    operators: ['<', '>', '<=', '>=', '==', '!='],
    examples: [
      'x > 5 → x >= 5',
      'a == b → a != b',
      'y < 10 → y <= 10'
    ]
  },

  // Statement: Remove statements
  statement: {
    description: 'Remove or replace statements',
    examples: [
      'return value; → return undefined;',
      'console.log(x); → // removed',
      'throw error; → // removed'
    ]
  }
};
```

### Understanding Mutation Testing

```
MUTATION TESTING EXPLAINED
===========================

What It Does:
1. Takes your source code
2. Creates "mutants" (small changes to code)
3. Runs your tests against each mutant
4. Checks if tests catch the change

Example:

Original Code:
  if (age >= 18) {
    return 'adult';
  }

Mutant:
  if (age > 18) {  // Changed >= to >
    return 'adult';
  }

If your tests pass with the mutant:
  ❌ MUTANT SURVIVED - Your tests didn't catch the bug!
  💡 You need a test: expect(getStatus(18)).toBe('adult')

If your tests fail with the mutant:
  ✅ MUTANT KILLED - Your tests caught the change!

Mutation Score = (Killed Mutants / Total Mutants) × 100%
```

### What Mutation Testing Tells You

```
CODE COVERAGE vs MUTATION SCORE
================================

Scenario: You have 100% code coverage

Test:
  it('validates email', () => {
    validateEmail('test@example.com'); // ✅ Executes code
  });

Code:
  function validateEmail(email) {
    return email.includes('@');  // ✅ Line covered
  }

Mutant:
  function validateEmail(email) {
    return !email.includes('@');  // Changed to !
  }

Your test still passes! ⚠️
  - Code coverage: 100%  ✅
  - Mutation score: 0%   ❌

Why? Test executes code but doesn't assert correctness!

Better Test:
  it('validates email', () => {
    expect(validateEmail('test@example.com')).toBe(true);  ✅
    expect(validateEmail('invalid')).toBe(false);          ✅
  });

Now mutant is killed! ✅
  - Code coverage: 100%  ✅
  - Mutation score: 100% ✅
```

### When to Use Mutation Testing

```
✅ USE MUTATION TESTING WHEN:

- Code coverage > 80% (baseline established)
- Critical business logic (payment, auth, etc.)
- Complex algorithms (calculations, validation)
- Preparing for production release
- Team wants to improve test quality
- Investigating flaky or weak tests

❌ DON'T USE (YET) WHEN:

- Code coverage < 70% (fix coverage first)
- Proof of concept / prototype phase
- Time constraints (mutation testing is slow)
- Trivial code (getters, setters, simple logic)

⚡ PERFORMANCE TIPS:

- Run incrementally (changed files only)
- Use parallel execution (--max-workers 4)
- Enable per-test coverage analysis
- Cache results for unchanged files
- Run in CI/CD on PRs only, not every commit
```

## Stryker Configuration

### Basic Configuration

```javascript
// stryker.conf.js
module.exports = {
  // Test runner
  testRunner: 'jest',

  // Coverage analysis (Context7-recommended: perTest)
  coverageAnalysis: 'perTest',

  // Files to mutate
  mutate: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  // Mutation operators
  mutators: [
    'arithmetic',
    'logical',
    'conditional',
    'statement'
  ],

  // Thresholds (Context7 standards)
  thresholds: {
    high: 80,
    low: 70,
    break: 70
  },

  // Reports
  reporters: ['html', 'json', 'clear-text', 'progress'],

  // Performance
  timeoutMS: 5000,
  maxConcurrentTestRunners: 4,

  // Incremental mode
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json'
};
```

### Advanced Configuration

```javascript
// stryker.conf.js (advanced)
module.exports = {
  testRunner: 'jest',
  coverageAnalysis: 'perTest',

  // Ignore specific patterns
  mutate: [
    'src/**/*.js',
    '!src/**/*.{test,spec}.js',
    '!src/config/**',      // Skip config files
    '!src/constants/**',   // Skip constants
    '!src/**/*.d.ts'       // Skip type definitions
  ],

  // Selective mutators
  mutators: {
    // Enable specific operators
    arithmetic: {
      '+': ['-', '*'],  // + can become - or *
      '-': ['+'],       // - can become +
      '*': ['/', '+'],  // * can become / or +
      '/': ['*']        // / can become *
    },
    logical: {},
    conditional: {},
    statement: {}
  },

  // Context-based thresholds
  thresholds: {
    high: 90,     // Critical code
    low: 75,      // Standard code
    break: 70     // Fail build if below
  },

  // Plugins
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker'
  ],

  // Type checking (for TypeScript)
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // Performance optimization
  timeoutMS: 10000,
  maxConcurrentTestRunners: require('os').cpus().length,
  tempDirName: '.stryker-tmp',

  // Logging
  logLevel: 'info',
  fileLogLevel: 'debug'
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Mutation Testing

on:
  pull_request:
    branches: [main, develop]

jobs:
  mutation-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # For incremental mode

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run mutation testing (incremental)
        run: |
          npx stryker run --incremental --only-changed
        continue-on-error: true

      - name: Check mutation score threshold
        run: |
          SCORE=$(node -e "console.log(require('./reports/mutation-report.json').mutationScore)")
          if (( $(echo "$SCORE < 75" | bc -l) )); then
            echo "❌ Mutation score $SCORE% below threshold (75%)"
            exit 1
          fi
          echo "✅ Mutation score: $SCORE%"

      - name: Upload mutation report
        uses: actions/upload-artifact@v3
        with:
          name: mutation-report
          path: reports/mutation/

      - name: Comment PR with results
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./reports/mutation-report.json');
            const comment = `## 🧬 Mutation Testing Results

            **Mutation Score**: ${report.mutationScore}%
            - Killed: ${report.killed}
            - Survived: ${report.survived}
            - Timeout: ${report.timeout}

            ${report.mutationScore >= 75 ? '✅ Meets threshold' : '⚠️ Below threshold'}
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Related Commands

- `/test:coverage` - Code coverage analysis (run first)
- `/test:setup` - Setup testing framework
- `/test:performance` - Performance testing
- `/ci:setup` - Configure CI/CD pipeline

## Troubleshooting

### Common Issues

**Issue**: Mutation testing is very slow
**Solution**:
- Use incremental mode: `--incremental --only-changed`
- Enable parallel execution: `--parallel --max-workers 4`
- Use `coverageAnalysis: 'perTest'` in config

**Issue**: All mutants surviving
**Solution**: Tests are not asserting correctly. Add `expect()` assertions.

**Issue**: Stryker not found
**Solution**: Install Stryker: `npm install -D @stryker-mutator/core`

**Issue**: Test runner integration error
**Solution**: Install test runner plugin: `npm install -D @stryker-mutator/jest-runner`

## Performance Optimization

### Incremental Mode (Recommended)

```bash
# Only test changed files (10x faster)
/test:mutation-testing --incremental --only-changed

# Cache results for unchanged code
# Next run will skip unchanged files
```

### Parallel Execution

```bash
# Use all CPU cores
/test:mutation-testing --parallel --max-workers auto

# Limit workers (for CI)
/test:mutation-testing --parallel --max-workers 2
```

### Coverage Analysis Modes

```javascript
// Fastest: Skip coverage analysis
coverageAnalysis: 'off'  // Fast but less accurate

// Balanced: Per-test coverage (RECOMMENDED)
coverageAnalysis: 'perTest'  // Context7-verified optimal

// Slowest: All tests for all mutants
coverageAnalysis: 'all'  // Most accurate but slowest
```

## Support

For issues or questions:
- Review Context7 mutation testing documentation
- Check Stryker documentation: https://stryker-mutator.io/
- Consult @e2e-test-engineer or @test-runner agents
- Review HTML report for detailed analysis
