const fs = require('fs');
const path = require('path');
const { ProviderRouter } = require('../../autopm/.claude/providers/router');

// Mock fs module
jest.mock('fs');

describe('ProviderRouter', () => {
  let router;
  let mockConfig;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Default mock config
    mockConfig = {
      projectManagement: {
        provider: 'azure',
        settings: {
          azure: {
            organization: 'test-org',
            project: 'test-project'
          },
          github: {
            owner: 'test-owner',
            repo: 'test-repo'
          }
        }
      }
    };

    // Mock fs.existsSync to return true by default
    fs.existsSync.mockReturnValue(true);

    // Mock fs.readFileSync to return mock config
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    // Mock process.cwd()
    jest.spyOn(process, 'cwd').mockReturnValue('/test/project');

    // Clear environment variables
    delete process.env.AUTOPM_PROVIDER;

    // Create fresh router instance
    router = new ProviderRouter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct config path', () => {
      expect(router.configPath).toBe('/test/project/.claude/config.json');
    });

    test('should load config during initialization', () => {
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/project/.claude/config.json', 'utf8');
    });

    test('should set provider during initialization', () => {
      expect(router.provider).toBe('azure');
    });
  });

  describe('loadConfig()', () => {
    test('should load and parse valid config file', () => {
      const result = router.loadConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(router.configPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(router.configPath, 'utf8');
      expect(result).toEqual(mockConfig);
    });

    test('should return empty object when config file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = router.loadConfig();

      expect(result).toEqual({});
    });

    test('should handle JSON parse errors', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = router.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading config:', expect.any(String));
      expect(result).toEqual({});

      consoleSpy.mockRestore();
    });

    test('should handle file read errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = router.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading config:', 'Permission denied');
      expect(result).toEqual({});

      consoleSpy.mockRestore();
    });
  });

  describe('getActiveProvider()', () => {
    test('should prioritize environment variable', () => {
      process.env.AUTOPM_PROVIDER = 'github';

      const result = router.getActiveProvider();

      expect(result).toBe('github');
    });

    test('should use config file provider when env var not set', () => {
      const result = router.getActiveProvider();

      expect(result).toBe('azure');
    });

    test('should default to local when no provider configured', () => {
      router.config = {};

      const result = router.getActiveProvider();

      expect(result).toBe('local');
    });

    test('should handle missing projectManagement section', () => {
      router.config = { other: 'setting' };

      const result = router.getActiveProvider();

      expect(result).toBe('local');
    });
  });

  describe('loadProviderModule()', () => {
    test('should load existing provider module', () => {
      fs.existsSync.mockReturnValue(true);

      // Since we can't easily mock require in this context,
      // we'll test that it attempts to load the correct path
      const result = router.loadProviderModule('issue-list');

      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(path.dirname(require.resolve('../../autopm/.claude/providers/router')), 'azure', 'issue-list.js')
      );

      // For existing Azure module, it should return something
      expect(result).not.toBeNull();
    });

    test('should return null when module file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = router.loadProviderModule('nonexistent-command');

      expect(result).toBeNull();
    });

    test('should handle require errors', () => {
      fs.existsSync.mockReturnValue(true);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = router.loadProviderModule('broken-module');

      expect(consoleSpy).toHaveBeenCalledWith('Error loading provider module:', expect.any(String));
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('parseArgs()', () => {
    test('should parse simple arguments', () => {
      const args = ['123', '--status', 'open', '--limit', '10'];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        id: '123',
        status: 'open',
        limit: '10'
      });
    });

    test('should handle boolean flags', () => {
      const args = ['--assign', '--no-branch'];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        assign: true,
        no_branch: true,
        status: 'open',
        limit: 50
      });
    });

    test('should convert dashes to underscores in option names', () => {
      const args = ['--dry-run', '--skip-validation'];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        dry_run: true,
        skip_validation: true,
        status: 'open',
        limit: 50
      });
    });

    test('should handle flags without values', () => {
      const args = ['--verbose'];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        verbose: true,
        status: 'open',
        limit: 50
      });
    });

    test('should set defaults for list commands', () => {
      const args = [];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        status: 'open',
        limit: 50
      });
    });

    test('should handle mixed arguments', () => {
      const args = ['issue-123', '--status', 'closed', '--verbose', '--assignee', 'john.doe'];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        id: 'issue-123',
        status: 'closed',
        verbose: true,
        assignee: 'john.doe',
        limit: 50
      });
    });

    test('should handle empty arguments', () => {
      const args = [];

      const result = router.parseArgs(args);

      expect(result).toEqual({
        status: 'open',
        limit: 50
      });
    });
  });

  describe('outputResults()', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should handle null results', () => {
      router.outputResults(null);

      expect(consoleSpy).toHaveBeenCalledWith('📋 No results returned');
    });

    test('should handle undefined results', () => {
      router.outputResults(undefined);

      expect(consoleSpy).toHaveBeenCalledWith('📋 No results returned');
    });

    test('should handle action results', () => {
      const actionResult = {
        success: true,
        actions: ['Issue assigned', 'Branch created'],
        issue: {
          id: '123',
          title: 'Test Issue',
          status: 'In Progress',
          assignee: 'john.doe',
          branch: 'feature/test',
          url: 'https://example.com/issue/123'
        },
        timestamp: '2023-01-01T12:00:00Z'
      };

      router.outputResults(actionResult);

      expect(consoleSpy).toHaveBeenCalledWith('\n✅ Successfully executed action\n');
      expect(consoleSpy).toHaveBeenCalledWith('📋 Issue Details:');
      expect(consoleSpy).toHaveBeenCalledWith('   ID: 123');
      expect(consoleSpy).toHaveBeenCalledWith('   Title: Test Issue');
    });

    test('should handle failed action results', () => {
      const failedResult = {
        success: false,
        error: 'Permission denied',
        actions: [] // Required for action result detection
      };

      router.outputResults(failedResult);

      expect(consoleSpy).toHaveBeenCalledWith('\n❌ Action failed\n');
      expect(consoleSpy).toHaveBeenCalledWith('Error: Permission denied');
    });

    test('should handle list results', () => {
      const listResults = [
        {
          id: '123',
          title: 'First Issue',
          status: 'Open',
          assignee: 'john.doe',
          childCount: 3,
          completedCount: 1,
          labels: ['bug', 'high-priority'],
          url: 'https://example.com/issue/123'
        },
        {
          id: '124',
          title: 'Second Issue',
          status: 'Closed',
          url: 'https://example.com/issue/124'
        }
      ];

      router.outputResults(listResults);

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Found 2 item(s):\n');
      expect(consoleSpy).toHaveBeenCalledWith('1. [123] First Issue');
      expect(consoleSpy).toHaveBeenCalledWith('   Status: Open');
      expect(consoleSpy).toHaveBeenCalledWith('   Assignee: john.doe');
      expect(consoleSpy).toHaveBeenCalledWith('   Progress: 1/3 items completed');
      expect(consoleSpy).toHaveBeenCalledWith('   Labels: bug, high-priority');
    });

    test('should handle empty list results', () => {
      const emptyResults = [];

      router.outputResults(emptyResults);

      expect(consoleSpy).toHaveBeenCalledWith('📋 No items found matching criteria');
    });

    test('should handle generic object results', () => {
      const genericResult = { data: 'test', count: 5 };

      router.outputResults(genericResult);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(genericResult, null, 2));
    });
  });

  describe('execute()', () => {
    let consoleSpy;
    let processExitSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    test('should execute command successfully', async () => {
      const mockModule = {
        execute: jest.fn().mockResolvedValue({ success: true, data: 'test' })
      };

      router.loadProviderModule = jest.fn().mockReturnValue(mockModule);
      router.outputResults = jest.fn();

      await router.execute('issue-list', ['--status', 'open']);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Using azure provider for issue-list');
      expect(mockModule.execute).toHaveBeenCalledWith(
        { status: 'open', limit: 50 },
        { organization: 'test-org', project: 'test-project' }
      );
      expect(router.outputResults).toHaveBeenCalledWith({ success: true, data: 'test' });
    });

    test('should handle missing provider module', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      router.loadProviderModule = jest.fn().mockReturnValue(null);

      await router.execute('nonexistent-command');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Provider implementation not found for azure/nonexistent-command');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });

    test('should handle execution errors', async () => {
      const mockModule = {
        execute: jest.fn().mockRejectedValue(new Error('API Error'))
      };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      router.loadProviderModule = jest.fn().mockReturnValue(mockModule);

      await router.execute('issue-list');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error executing issue-list:', 'API Error');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });

    test('should use default settings when provider settings missing', async () => {
      router.config = {}; // No settings
      const mockModule = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      router.loadProviderModule = jest.fn().mockReturnValue(mockModule);
      router.outputResults = jest.fn();

      await router.execute('issue-list');

      expect(mockModule.execute).toHaveBeenCalledWith(
        { status: 'open', limit: 50 },
        {}
      );
    });
  });

  describe('outputListResults()', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should format list results with all fields', () => {
      const results = [{
        id: '123',
        title: 'Test Issue',
        status: 'Open',
        assignee: 'john.doe',
        childCount: 5,
        completedCount: 3,
        labels: ['bug', 'urgent'],
        url: 'https://example.com/123'
      }];

      router.outputListResults(results);

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Found 1 item(s):\n');
      expect(consoleSpy).toHaveBeenCalledWith('1. [123] Test Issue');
      expect(consoleSpy).toHaveBeenCalledWith('   Status: Open');
      expect(consoleSpy).toHaveBeenCalledWith('   Assignee: john.doe');
      expect(consoleSpy).toHaveBeenCalledWith('   Progress: 3/5 items completed');
      expect(consoleSpy).toHaveBeenCalledWith('   Labels: bug, urgent');
      expect(consoleSpy).toHaveBeenCalledWith('   URL: https://example.com/123');
    });

    test('should handle items without optional fields', () => {
      const results = [{
        id: '124',
        title: 'Simple Issue',
        status: 'Closed',
        url: 'https://example.com/124'
      }];

      router.outputListResults(results);

      expect(consoleSpy).toHaveBeenCalledWith('1. [124] Simple Issue');
      expect(consoleSpy).toHaveBeenCalledWith('   Status: Closed');
      expect(consoleSpy).toHaveBeenCalledWith('   URL: https://example.com/124');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Assignee:'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Progress:'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Labels:'));
    });

    test('should handle zero child count', () => {
      const results = [{
        id: '125',
        title: 'No Children Issue',
        status: 'Open',
        childCount: 0,
        completedCount: 0,
        url: 'https://example.com/125'
      }];

      router.outputListResults(results);

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Progress:'));
    });

    test('should handle empty labels array', () => {
      const results = [{
        id: '126',
        title: 'No Labels Issue',
        status: 'Open',
        labels: [],
        url: 'https://example.com/126'
      }];

      router.outputListResults(results);

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Labels:'));
    });
  });

  describe('outputActionResult()', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should format successful action result with all fields', () => {
      const result = {
        success: true,
        issue: {
          id: '123',
          title: 'Test Issue',
          status: 'In Progress',
          assignee: 'john.doe',
          branch: 'feature/test-123',
          url: 'https://example.com/123'
        },
        actions: ['Issue assigned to john.doe', 'Branch feature/test-123 created'],
        timestamp: '2023-01-01T12:00:00Z'
      };

      router.outputActionResult(result);

      expect(consoleSpy).toHaveBeenCalledWith('\n✅ Successfully executed action\n');
      expect(consoleSpy).toHaveBeenCalledWith('📋 Issue Details:');
      expect(consoleSpy).toHaveBeenCalledWith('   ID: 123');
      expect(consoleSpy).toHaveBeenCalledWith('   Title: Test Issue');
      expect(consoleSpy).toHaveBeenCalledWith('   Status: In Progress');
      expect(consoleSpy).toHaveBeenCalledWith('   Assignee: john.doe');
      expect(consoleSpy).toHaveBeenCalledWith('   Branch: feature/test-123');
      expect(consoleSpy).toHaveBeenCalledWith('   URL: https://example.com/123');
      expect(consoleSpy).toHaveBeenCalledWith('\n🎯 Actions performed:');
      expect(consoleSpy).toHaveBeenCalledWith('   ✓ Issue assigned to john.doe');
      expect(consoleSpy).toHaveBeenCalledWith('   ✓ Branch feature/test-123 created');
      expect(consoleSpy).toHaveBeenCalledWith('\n⏰ Timestamp: 2023-01-01T12:00:00Z');
    });

    test('should handle minimal successful result', () => {
      const result = {
        success: true
      };

      router.outputActionResult(result);

      expect(consoleSpy).toHaveBeenCalledWith('\n✅ Successfully executed action\n');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Issue Details:'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Actions performed:'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Timestamp:'));
    });

    test('should handle failed action result', () => {
      const result = {
        success: false,
        error: 'Authentication failed'
      };

      router.outputActionResult(result);

      expect(consoleSpy).toHaveBeenCalledWith('\n❌ Action failed\n');
      expect(consoleSpy).toHaveBeenCalledWith('Error: Authentication failed');
    });

    test('should handle failed result without error message', () => {
      const result = {
        success: false
      };

      router.outputActionResult(result);

      expect(consoleSpy).toHaveBeenCalledWith('\n❌ Action failed\n');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error:'));
    });
  });

  describe('Integration Tests', () => {
    test('should handle different provider configurations', () => {
      // Test GitHub provider
      process.env.AUTOPM_PROVIDER = 'github';
      const githubRouter = new ProviderRouter();
      expect(githubRouter.provider).toBe('github');

      // Test Azure provider from config
      delete process.env.AUTOPM_PROVIDER;
      const azureRouter = new ProviderRouter();
      expect(azureRouter.provider).toBe('azure');

      // Test default fallback
      fs.readFileSync.mockReturnValue('{}');
      const defaultRouter = new ProviderRouter();
      expect(defaultRouter.provider).toBe('local');
    });

    test('should maintain backward compatibility', () => {
      // Test that the exported functions work
      const { execute, loadConfig, getActiveProvider } = require('../../autopm/.claude/providers/router');

      expect(typeof execute).toBe('function');
      expect(typeof loadConfig).toBe('function');
      expect(typeof getActiveProvider).toBe('function');
    });
  });
});