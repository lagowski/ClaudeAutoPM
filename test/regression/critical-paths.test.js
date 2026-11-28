const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * Critical Path Protection Tests - Fully Synchronous
 * Fixed Node.js v22.19.0 test runner concurrency issues
 *
 * These tests ensure that key implementation details
 * are not accidentally broken during development.
 */

class CriticalPathValidator {
  constructor() {
    this.criticalPaths = {
      // Core strategy files
      strategy: {
        path: 'autopm/.claude/strategies/ACTIVE_STRATEGY.md',
        required: true,
        minSize: 1000,
        maxSize: 100000,
        mustContain: [
          '## Core Principles',
          '## Implementation Strategy',
          'parallel execution',
          'context isolation'
        ]
      },

      // Configuration files
      claudeConfig: {
        path: 'autopm/.claude/config.json',
        required: true,
        minSize: 100,
        mustContain: [
          'features'
        ]
      },

      // Package configuration
      packageJson: {
        path: 'package.json',
        required: true,
        mustContain: [
          'claude-autopm',
          'scripts',
          'test'
        ],
        jsonSchema: {
          name: 'string',
          version: 'string',
          scripts: 'object'
        }
      },

      // Orchestrator (if exists)
      orchestrator: {
        path: '.claude/orchestrator.md',
        required: false,
        mustContain: [
          'orchestrat'
        ]
      }
    };

    this.criticalFeatures = {
      parallelExecution: {
        description: 'Parallel agent execution',
        testFiles: ['test/security/integration.test.js'],
        requiredPatterns: [/spawnAgent/, /parallel/, /concurrent/]
      },

      contextIsolation: {
        description: 'Context isolation between agents',
        testFiles: ['test/security/integration.test.js'],
        requiredPatterns: [/isolat/, /sandbox/, /separate.*context/]
      },

      resourceLimits: {
        description: 'Resource limit enforcement',
        testFiles: ['test/security/performance.test.js'],
        requiredPatterns: [/limit/, /max.*tokens/, /throttle/]
      },

      errorRecovery: {
        description: 'Error recovery mechanisms',
        testFiles: ['test/security/integration.test.js'],
        requiredPatterns: [/try.*catch/, /recover/, /fallback/]
      }
    };
  }

  validateFile(config) {
    const fullPath = path.join(process.cwd(), config.path);

    try {
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      const validation = {
        exists: true,
        size: stats.size,
        sizeValid: true,
        contentValid: true,
        missingPatterns: [],
        schemaValid: true
      };

      // Check size constraints
      if (config.minSize && stats.size < config.minSize) {
        validation.sizeValid = false;
        validation.error = `File too small: ${stats.size} < ${config.minSize}`;
      }

      if (config.maxSize && stats.size > config.maxSize) {
        validation.sizeValid = false;
        validation.error = `File too large: ${stats.size} > ${config.maxSize}`;
      }

      // Check required content
      if (config.mustContain) {
        for (const pattern of config.mustContain) {
          const regex = typeof pattern === 'string'
            ? new RegExp(pattern, 'i')
            : pattern;

          if (!regex.test(content)) {
            validation.contentValid = false;
            validation.missingPatterns.push(pattern.toString());
          }
        }
      }

      // Validate JSON schema if applicable
      if (config.jsonSchema && config.path.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          for (const [key, type] of Object.entries(config.jsonSchema)) {
            if (typeof json[key] !== type) {
              validation.schemaValid = false;
              validation.schemaError = `${key} should be ${type}`;
            }
          }
        } catch (err) {
          validation.schemaValid = false;
          validation.schemaError = err.message;
        }
      }

      return validation;
    } catch (err) {
      return {
        exists: false,
        error: err.message,
        required: config.required
      };
    }
  }

  validateFeature(feature) {
    const results = {
      feature: feature.description,
      testsExist: true,
      patternsFound: true,
      details: []
    };

    for (const testFile of feature.testFiles) {
      const fullPath = path.join(process.cwd(), testFile);

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        let patternsFound = 0;

        for (const pattern of feature.requiredPatterns) {
          if (pattern.test(content)) {
            patternsFound++;
          }
        }

        results.details.push({
          file: testFile,
          exists: true,
          patternsFound: patternsFound,
          totalPatterns: feature.requiredPatterns.length
        });

        if (patternsFound === 0) {
          results.patternsFound = false;
        }
      } catch (err) {
        results.testsExist = false;
        results.details.push({
          file: testFile,
          exists: false,
          error: err.message
        });
      }
    }

    return results;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      files: {},
      features: {},
      summary: {
        totalFiles: 0,
        validFiles: 0,
        totalFeatures: 0,
        validFeatures: 0
      }
    };

    // Validate files
    for (const [name, config] of Object.entries(this.criticalPaths)) {
      const validation = this.validateFile(config);
      report.files[name] = validation;
      report.summary.totalFiles++;

      if (validation.exists && validation.sizeValid && validation.contentValid) {
        report.summary.validFiles++;
      }
    }

    // Validate features
    for (const [name, feature] of Object.entries(this.criticalFeatures)) {
      const validation = this.validateFeature(feature);
      report.features[name] = validation;
      report.summary.totalFeatures++;

      if (validation.testsExist && validation.patternsFound) {
        report.summary.validFeatures++;
      }
    }

    report.summary.health =
      (report.summary.validFiles / report.summary.totalFiles) * 50 +
      (report.summary.validFeatures / report.summary.totalFeatures) * 50;

    return report;
  }
}

describe('Critical Path Protection', () => {
  let validator;
  let report;

  beforeAll(() => {
    try {
      validator = new CriticalPathValidator();
      report = validator.generateReport();
    } catch (error) {
      console.error('Error generating report:', error.message);
      report = null; // Tests will handle null gracefully
    }
  });

  describe('Essential Files', () => {
    it('should have all required files present', () => {
      if (!report) {
        report = validator.generateReport();
      }

      const requiredFiles = Object.entries(validator.criticalPaths)
        .filter(([_, config]) => config.required);

      for (const [name, config] of requiredFiles) {
        const validation = report.files[name];
        assert.ok(
          validation.exists,
          `Required file missing: ${config.path}`
        );
      }
    });

    it('should maintain HYBRID_STRATEGY.md integrity', () => {
      if (!report) {
        report = validator.generateReport();
      }

      const strategy = report.files.strategy;

      assert.ok(strategy.exists, 'HYBRID_STRATEGY.md must exist');
      assert.ok(strategy.sizeValid, 'HYBRID_STRATEGY.md size out of bounds');
      assert.ok(
        strategy.contentValid,
        `HYBRID_STRATEGY.md missing patterns: ${strategy.missingPatterns?.join(', ')}`
      );
    });

    it('should have valid package.json', () => {
      if (!report) {
        report = validator.generateReport();
      }

      const pkg = report.files.packageJson;

      assert.ok(pkg.exists, 'package.json must exist');
      assert.ok(pkg.schemaValid, pkg.schemaError || 'Invalid package.json schema');
      assert.ok(pkg.contentValid, 'package.json missing required fields');
    });

    it('should maintain configuration files', () => {
      const config = report.files.claudeConfig;

      if (config.exists) {
        assert.ok(
          config.contentValid,
          `Configuration missing patterns: ${config.missingPatterns?.join(', ')}`
        );
      }
    });
  });

  describe('Core Features', () => {
    it('should preserve parallel execution capability', () => {
      const parallel = report.features.parallelExecution;

      assert.ok(
        parallel.testsExist,
        'Parallel execution tests missing'
      );
      assert.ok(
        parallel.patternsFound,
        'Parallel execution patterns not found in tests'
      );
    });

    it('should maintain context isolation', () => {
      const isolation = report.features.contextIsolation;

      assert.ok(
        isolation.testsExist,
        'Context isolation tests missing'
      );
      assert.ok(
        isolation.patternsFound,
        'Context isolation patterns not found'
      );
    });

    it('should enforce resource limits', () => {
      const limits = report.features.resourceLimits;

      assert.ok(
        limits.testsExist,
        'Resource limit tests missing'
      );
      assert.ok(
        limits.patternsFound,
        'Resource limit patterns not found'
      );
    });

    it('should have error recovery mechanisms', () => {
      const recovery = report.features.errorRecovery;

      assert.ok(
        recovery.testsExist,
        'Error recovery tests missing'
      );
      assert.ok(
        recovery.patternsFound,
        'Error recovery patterns not found'
      );
    });
  });

  describe('Health Check', () => {
    it('should maintain overall system health above 80%', () => {
      assert.ok(
        report.summary.health >= 80,
        `System health too low: ${report.summary.health.toFixed(1)}%`
      );

      console.log('\n📊 System Health Report:');
      console.log(`   Overall Health: ${report.summary.health.toFixed(1)}%`);
      console.log(`   Valid Files: ${report.summary.validFiles}/${report.summary.totalFiles}`);
      console.log(`   Valid Features: ${report.summary.validFeatures}/${report.summary.totalFeatures}`);
    });

    it('should generate actionable report', () => {
      // Written outside the repo so a regression run leaves git status clean (#844)
      const reportPath = path.join(
        fs.mkdtempSync(path.join(require('os').tmpdir(), 'autopm-regression-')),
        'health-report.json'
      );

      try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Health report saved to: ${reportPath}`);
      } catch (err) {
        console.log('⚠️  Could not save health report:', err.message);
      }

      assert.ok(report.timestamp);
    });
  });
});

module.exports = { CriticalPathValidator };