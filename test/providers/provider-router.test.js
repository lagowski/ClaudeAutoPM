const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { ProviderRouter } = require('../../autopm/.claude/providers/router');

describe('ProviderRouter', () => {
  let tempDir;
  let originalCwd;
  let originalEnv;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));

    // Save original working directory and environment
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Change to temp directory
    process.chdir(tempDir);

    // Create .claude directory
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
  });

  afterEach(() => {
    // Restore environment and working directory
    process.env = originalEnv;
    assert.doesNotThrow(() => {
      process.chdir(originalCwd);
    }, Error, 'Failed to restore working directory');

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should instantiate without errors', () => {
      const router = new ProviderRouter();
      assert.ok(router);
    });

    it('should set configPath property', () => {
      const router = new ProviderRouter();
      assert.ok(router.configPath);
      assert.ok(router.configPath.includes('.claude'));
      assert.ok(router.configPath.includes('config.json'));
    });

    it('should load config on construction', () => {
      const router = new ProviderRouter();
      assert.ok(router.config !== undefined);
    });

    it('should determine active provider', () => {
      const router = new ProviderRouter();
      assert.ok(router.provider);
      assert.strictEqual(typeof router.provider, 'string');
    });
  });

  describe('loadConfig', () => {
    it('should return empty object when config does not exist', () => {
      const router = new ProviderRouter();
      const config = router.loadConfig();

      assert.ok(typeof config === 'object');
    });

    it('should load config from file when it exists', () => {
      const testConfig = {
        projectManagement: {
          provider: 'github',
          settings: {
            github: {
              repository: 'owner/repo'
            }
          }
        }
      };

      fs.writeFileSync(
        path.join(tempDir, '.claude', 'config.json'),
        JSON.stringify(testConfig)
      );

      const router = new ProviderRouter();
      const config = router.loadConfig();

      assert.deepStrictEqual(config, testConfig);
    });

    it('should handle invalid JSON gracefully', () => {
      fs.writeFileSync(
        path.join(tempDir, '.claude', 'config.json'),
        'invalid json'
      );

      const router = new ProviderRouter();
      const config = router.loadConfig();

      assert.deepStrictEqual(config, {});
    });
  });

  describe('getActiveProvider', () => {
    it('should default to local when no config', () => {
      const router = new ProviderRouter();
      const provider = router.getActiveProvider();

      assert.strictEqual(provider, 'local');
    });

    it('should use provider from config file', () => {
      const testConfig = {
        projectManagement: {
          provider: 'azure'
        }
      };

      fs.writeFileSync(
        path.join(tempDir, '.claude', 'config.json'),
        JSON.stringify(testConfig)
      );

      const router = new ProviderRouter();
      const provider = router.getActiveProvider();

      assert.strictEqual(provider, 'azure');
    });

    it('should prioritize environment variable over config', () => {
      const testConfig = {
        projectManagement: {
          provider: 'azure'
        }
      };

      fs.writeFileSync(
        path.join(tempDir, '.claude', 'config.json'),
        JSON.stringify(testConfig)
      );

      process.env.AUTOPM_PROVIDER = 'github';

      const router = new ProviderRouter();
      const provider = router.getActiveProvider();

      assert.strictEqual(provider, 'github');
    });

    it('should handle missing projectManagement section', () => {
      const testConfig = {
        someOtherSection: {}
      };

      fs.writeFileSync(
        path.join(tempDir, '.claude', 'config.json'),
        JSON.stringify(testConfig)
      );

      const router = new ProviderRouter();
      const provider = router.getActiveProvider();

      assert.strictEqual(provider, 'local');
    });
  });

  describe('parseArgs', () => {
    it('should parse empty args array', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs([]);

      assert.ok(typeof options === 'object');
      assert.strictEqual(options.status, 'open');
      assert.strictEqual(options.limit, 50);
    });

    it('should parse primary parameter as ID', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['123']);

      assert.strictEqual(options.id, '123');
    });

    it('should parse boolean flags', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['--assign', '--no-branch']);

      assert.strictEqual(options.assign, true);
      assert.strictEqual(options.no_branch, true);
    });

    it('should parse options with values', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['--status', 'closed', '--limit', '100']);

      assert.strictEqual(options.status, 'closed');
      assert.strictEqual(options.limit, '100');
    });

    it('should parse mixed args', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['456', '--assign', '--status', 'open']);

      assert.strictEqual(options.id, '456');
      assert.strictEqual(options.assign, true);
      assert.strictEqual(options.status, 'open');
    });

    it('should convert hyphens to underscores in option names', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['--no-branch', '--some-option', 'value']);

      assert.strictEqual(options.no_branch, true);
      assert.strictEqual(options.some_option, 'value');
    });

    it('should set default status to open', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs([]);

      assert.strictEqual(options.status, 'open');
    });

    it('should set default limit to 50', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs([]);

      assert.strictEqual(options.limit, 50);
    });

    it('should override defaults when provided', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['--status', 'all', '--limit', '200']);

      assert.strictEqual(options.status, 'all');
      assert.strictEqual(options.limit, '200');
    });

    it('should handle flags without values as true', () => {
      const router = new ProviderRouter();
      const options = router.parseArgs(['--verbose']);

      assert.strictEqual(options.verbose, true);
    });
  });

  describe('loadProviderModule', () => {
    it('should return null for non-existent module', () => {
      const router = new ProviderRouter();
      const module = router.loadProviderModule('non-existent-command');

      assert.strictEqual(module, null);
    });

    it('should handle load errors gracefully', () => {
      const router = new ProviderRouter();
      const module = router.loadProviderModule('invalid/path/command');

      assert.strictEqual(module, null);
    });
  });

  describe('outputResults', () => {
    it('should handle null results', () => {
      const router = new ProviderRouter();

      // Should not throw
      router.outputResults(null);
      assert.ok(true);
    });

    it('should handle undefined results', () => {
      const router = new ProviderRouter();

      // Should not throw
      router.outputResults(undefined);
      assert.ok(true);
    });

    it('should handle array results (list)', () => {
      const router = new ProviderRouter();
      const results = [
        { id: '1', title: 'Test 1', status: 'open', url: 'http://example.com/1' },
        { id: '2', title: 'Test 2', status: 'closed', url: 'http://example.com/2' }
      ];

      // Should not throw
      router.outputResults(results);
      assert.ok(true);
    });

    it('should handle empty array results', () => {
      const router = new ProviderRouter();

      // Should not throw
      router.outputResults([]);
      assert.ok(true);
    });

    it('should handle action results', () => {
      const router = new ProviderRouter();
      const results = {
        success: true,
        actions: ['Created branch', 'Assigned to user']
      };

      // Should not throw
      router.outputResults(results);
      assert.ok(true);
    });

    it('should handle object results as JSON', () => {
      const router = new ProviderRouter();
      const results = {
        id: '123',
        title: 'Test',
        status: 'open'
      };

      // Should not throw
      router.outputResults(results);
      assert.ok(true);
    });
  });

  describe('outputListResults', () => {
    it('should handle empty list', () => {
      const router = new ProviderRouter();

      // Should not throw
      router.outputListResults([]);
      assert.ok(true);
    });

    it('should handle list with items', () => {
      const router = new ProviderRouter();
      const results = [
        {
          id: '1',
          title: 'Test Issue',
          status: 'open',
          url: 'http://example.com/1'
        }
      ];

      // Should not throw
      router.outputListResults(results);
      assert.ok(true);
    });

    it('should handle list with optional fields', () => {
      const router = new ProviderRouter();
      const results = [
        {
          id: '1',
          title: 'Test Issue',
          status: 'open',
          url: 'http://example.com/1',
          assignee: 'user1',
          labels: ['bug', 'priority-high'],
          childCount: 5,
          completedCount: 3
        }
      ];

      // Should not throw
      router.outputListResults(results);
      assert.ok(true);
    });
  });

  describe('outputActionResult', () => {
    it('should handle successful action', () => {
      const router = new ProviderRouter();
      const result = {
        success: true,
        actions: ['Action 1', 'Action 2']
      };

      // Should not throw
      router.outputActionResult(result);
      assert.ok(true);
    });

    it('should handle failed action', () => {
      const router = new ProviderRouter();
      const result = {
        success: false,
        error: 'Something went wrong'
      };

      // Should not throw
      router.outputActionResult(result);
      assert.ok(true);
    });

    it('should handle action with issue details', () => {
      const router = new ProviderRouter();
      const result = {
        success: true,
        issue: {
          id: '123',
          title: 'Test Issue',
          status: 'open',
          assignee: 'user1',
          branch: 'feature/test',
          url: 'http://example.com/123'
        },
        actions: ['Created branch'],
        timestamp: '2024-01-01T00:00:00Z'
      };

      // Should not throw
      router.outputActionResult(result);
      assert.ok(true);
    });
  });
});
