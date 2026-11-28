// Default Jest configuration — what `npm test` runs (#608).
//
// Scope: every suite under test/unit plus the stable cross-cutting suites
// from the old 7-file quick allowlist. The other runners stay available as
// npm scripts:
//   test:quick → jest.config.quick.js  (smoke allowlist, explicit files)
//   test:full  → jest.config.clean.js  (jest-tests/integration/cli — many
//                suites still failing; repair tracked in epic #605)
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directories
  roots: ['<rootDir>/test'],

  // Test file patterns
  testMatch: [
    '<rootDir>/test/unit/**/*.test.js',
    '<rootDir>/test/templates/agent-registry-consistency.test.js',
    '<rootDir>/test/templates/template-reader.test.js',
    '<rootDir>/test/local-mode/local-issues.test.js',
    '<rootDir>/test/local-mode/local-prd-epic.test.js',
    '<rootDir>/test/core/PluginManager.test.js',
    '<rootDir>/test/installation/generate-agent-xml.test.js',
    '<rootDir>/test/installation/e2e-scenarios.test.js',
    '<rootDir>/test/jest-tests/epic-sync-scripts-jest.test.js'
  ],

  // Parallel agent worktrees must never leak into test discovery or the
  // haste-map (duplicate module names) — ignore them everywhere (#608)
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.claude/worktrees/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.claude/worktrees/'
  ],

  // Coverage collection — lib/ and bin/ were previously invisible (#608)
  collectCoverageFrom: [
    'autopm/.claude/scripts/**/*.js',
    'lib/**/*.js',
    'bin/**/*.js',
    '!**/*.sh',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/*.backup.js'
  ],

  // Coverage thresholds.
  // Target per .claude/rules/coverage-thresholds.xml: 80/75/80/80
  // (statements/branches/functions/lines). The default suite currently
  // measures 52.0/49.3/53.5/52.0 with lib/ and bin/ included — most of bin/
  // and parts of lib/ have no unit tests yet. Values below are a ratchet set
  // just under the measured coverage of `npm test -- --coverage`; raise them
  // as suites are added, never lower them (#608, #611, epic #605).
  coverageThreshold: {
    global: {
      statements: 51,
      branches: 48,
      functions: 52,
      lines: 51
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Test timeout
  testTimeout: 15000,

  // Some suites still use process.chdir(); run serially so suites cannot
  // race on the process-wide working directory (#608)
  maxWorkers: 1,

  // Quiet by default; failures still print in full
  verbose: false,

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',

  // Test result processors
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporter', {
      pageTitle: 'AUTOPM Test Report',
      outputPath: 'test-results/report.html'
    }]
  ],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(module-to-transform)/)'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true
};
