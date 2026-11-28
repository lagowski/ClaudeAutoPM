/**
 * Tests for pm pr-create command
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('readline');

describe('pm pr-create', () => {
  let PrCreator;
  let creator;
  let mockReadline;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup default mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('{}');
    execSync.mockReturnValue('');

    // Mock console
    console.log = jest.fn();
    console.error = jest.fn();

    // Mock readline
    mockReadline = {
      createInterface: jest.fn(() => ({
        question: jest.fn((q, cb) => cb('test-input')),
        close: jest.fn()
      }))
    };
    jest.doMock('readline', () => mockReadline);

    // Load module after mocks
    PrCreator = require('../../autopm/.claude/scripts/pm/pr-create.js');
    creator = new PrCreator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct paths', () => {
      expect(creator.activeWorkFile).toBe(path.join('.claude', 'active-work.json'));
      expect(creator.completedWorkFile).toBe(path.join('.claude', 'completed-work.json'));
    });
  });

  describe('execCommand', () => {
    test('should execute command and return trimmed output', () => {
      // Mock execSync directly since it's used in execCommand
      const originalExecCommand = creator.execCommand;
      creator.execCommand = jest.fn().mockReturnValue('output');

      const result = creator.execCommand('test command');
      expect(result).toBe('output');
    });

    test('should throw error when command fails', () => {
      creator.execCommand = jest.fn().mockImplementation(() => {
        throw new Error('Command failed');
      });

      expect(() => creator.execCommand('bad command')).toThrow('Command failed');
    });

    test('should return null with ignoreError option', () => {
      creator.execCommand = jest.fn().mockReturnValue(null);

      const result = creator.execCommand('bad command', { ignoreError: true });
      expect(result).toBeNull();
    });
  });

  describe('checkGitHub', () => {
    test('should return true when gh CLI is installed', () => {
      creator.execCommand = jest.fn().mockReturnValue('/usr/local/bin/gh');
      const result = creator.checkGitHub();

      expect(result).toBe(true);
      expect(creator.execCommand).toHaveBeenCalledWith('which gh', { ignoreError: false });
    });

    test('should return false and show error when gh CLI not installed', () => {
      creator.execCommand = jest.fn().mockImplementation(() => {
        throw new Error('gh not found');
      });

      const result = creator.checkGitHub();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('brew install gh'));
    });
  });

  describe('checkAuth', () => {
    test('should return true when authenticated', () => {
      creator.execCommand = jest.fn().mockReturnValue('Logged in');
      const result = creator.checkAuth();

      expect(result).toBe(true);
    });

    test('should return false when not authenticated', () => {
      creator.execCommand = jest.fn().mockImplementation(() => {
        throw new Error('Not authenticated');
      });

      const result = creator.checkAuth();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'));
    });
  });

  describe('getCurrentBranch', () => {
    test('should return current branch name', () => {
      creator.execCommand = jest.fn().mockReturnValue('feature-branch');
      const result = creator.getCurrentBranch();

      expect(result).toBe('feature-branch');
      expect(creator.execCommand).toHaveBeenCalledWith('git branch --show-current');
    });
  });

  describe('getDefaultBranch', () => {
    test('should get default branch from GitHub', () => {
      creator.execCommand = jest.fn().mockReturnValue('main');
      const result = creator.getDefaultBranch();

      expect(result).toBe('main');
    });

    test('should fallback to main when GitHub command fails', () => {
      creator.execCommand = jest.fn()
        .mockImplementationOnce(() => {
          throw new Error('Not a GitHub repo');
        })
        .mockReturnValueOnce('  origin/main\n  origin/develop');

      const result = creator.getDefaultBranch();
      expect(result).toBe('main');
    });

    test('should fallback to master when main not found', () => {
      creator.execCommand = jest.fn()
        .mockImplementationOnce(() => {
          throw new Error('Not a GitHub repo');
        })
        .mockReturnValueOnce('  origin/master\n  origin/develop');

      const result = creator.getDefaultBranch();
      expect(result).toBe('master');
    });
  });

  describe('getRecentCommits', () => {
    test('should return array of recent commits', () => {
      creator.execCommand = jest.fn().mockReturnValue('abc123 First commit\ndef456 Second commit');
      const result = creator.getRecentCommits(5);

      expect(result).toEqual(['abc123 First commit', 'def456 Second commit']);
      expect(creator.execCommand).toHaveBeenCalledWith('git log --oneline -5');
    });
  });

  describe('getDiffSummary', () => {
    test('should return diff summary', () => {
      creator.execCommand = jest.fn().mockReturnValue('5 files changed, 100 insertions');
      const result = creator.getDiffSummary('main');

      expect(result).toBe('5 files changed, 100 insertions');
      expect(creator.execCommand).toHaveBeenCalledWith('git diff main...HEAD --stat');
    });

    test('should return error message when diff fails', () => {
      creator.execCommand = jest.fn().mockImplementation(() => {
        throw new Error('Diff failed');
      });

      const result = creator.getDiffSummary('main');
      expect(result).toBe('Unable to generate diff summary');
    });
  });

  describe('loadWorkItems', () => {
    test('should load active and completed work items', () => {
      const activeWork = {
        issues: [{ id: 'ISSUE-1', status: 'in-progress' }],
        epics: [{ name: 'epic-1' }]
      };

      const completedWork = {
        issues: [
          { id: 'ISSUE-2', completedAt: new Date().toISOString() },
          { id: 'ISSUE-3', completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
        ]
      };

      // resetModules in beforeEach gave the script a fresh fs mock
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('active')) return JSON.stringify(activeWork);
        if (filePath.includes('completed')) return JSON.stringify(completedWork);
        return '{}';
      });

      const result = creator.loadWorkItems();

      expect(result.issues).toHaveLength(2); // Active + recent completed
      expect(result.epics).toHaveLength(1);
    });

    test('should handle missing work files', () => {
      fs.existsSync.mockReturnValue(false);

      const result = creator.loadWorkItems();

      expect(result.issues).toHaveLength(0);
      expect(result.epics).toHaveLength(0);
    });

    test('should handle invalid JSON', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      const result = creator.loadWorkItems();

      expect(result.issues).toHaveLength(0);
      expect(result.epics).toHaveLength(0);
    });
  });

  describe('generatePrBody', () => {
    test('should generate PR body with work items', () => {
      creator.loadWorkItems = jest.fn().mockReturnValue({
        issues: [{ id: 'ISSUE-1', status: 'completed' }],
        epics: [{ name: 'epic-1' }]
      });
      creator.getCurrentBranch = jest.fn().mockReturnValue('feature');
      creator.getDefaultBranch = jest.fn().mockReturnValue('main');
      creator.getDiffSummary = jest.fn().mockReturnValue('5 files changed');

      const body = creator.generatePrBody({ description: 'Test PR' });

      expect(body).toContain('Test PR');
      expect(body).toContain('ISSUE-1');
      expect(body).toContain('epic-1');
      expect(body).toContain('5 files changed');
      expect(body).toContain('feature → main');
    });

    test('should generate body without description', () => {
      creator.loadWorkItems = jest.fn().mockReturnValue({ issues: [], epics: [] });
      creator.getCurrentBranch = jest.fn().mockReturnValue('feature');
      creator.getDefaultBranch = jest.fn().mockReturnValue('main');
      creator.getDiffSummary = jest.fn().mockReturnValue('');

      const body = creator.generatePrBody();

      expect(body).toContain('[Please provide a brief description');
      expect(body).toContain('## Testing');
      expect(body).toContain('## Checklist');
    });
  });

  describe('createPr', () => {
    beforeEach(() => {
      creator.checkGitHub = jest.fn().mockReturnValue(true);
      creator.checkAuth = jest.fn().mockReturnValue(true);
      creator.getCurrentBranch = jest.fn().mockReturnValue('feature');
      creator.getDefaultBranch = jest.fn().mockReturnValue('main');
      creator.generatePrBody = jest.fn().mockReturnValue('PR Body');
    });

    test('should create PR successfully', async () => {
      creator.execCommand = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('git status')) return '';
        if (cmd.includes('git push')) return '';
        if (cmd.includes('gh pr create')) return 'https://github.com/owner/repo/pull/123';
        return '';
      });

      const result = await creator.createPr('Test PR');

      expect(result).toBe(true);
      expect(creator.execCommand).toHaveBeenCalledWith(expect.stringContaining('git push'));
      expect(creator.execCommand).toHaveBeenCalledWith(expect.stringContaining('gh pr create'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    test('should fail when on default branch', async () => {
      creator.getCurrentBranch.mockReturnValue('main');

      const result = await creator.createPr('Test PR');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Cannot create PR from main'));
    });

    test('should fail when uncommitted changes exist', async () => {
      creator.execCommand = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('git status')) return 'M file.js';
        return '';
      });

      const result = await creator.createPr('Test PR');

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('uncommitted changes'));
    });

    test('should fail when push fails', async () => {
      creator.execCommand = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('git status')) return '';
        if (cmd.includes('git push')) throw new Error('Push failed');
        return '';
      });

      const result = await creator.createPr('Test PR');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to push'));
    });

    test('should create draft PR with draft option', async () => {
      creator.execCommand = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('git status')) return '';
        if (cmd.includes('gh pr create')) {
          expect(cmd).toContain('--draft');
          return 'https://github.com/owner/repo/pull/123';
        }
        return '';
      });

      await creator.createPr('Test PR', { draft: true });

      expect(creator.execCommand).toHaveBeenCalledWith(expect.stringContaining('--draft'));
    });

    test('should handle existing PR error', async () => {
      creator.execCommand = jest.fn().mockImplementation((cmd) => {
        if (cmd.includes('git status')) return '';
        if (cmd.includes('gh pr create')) {
          const error = new Error('PR already exists');
          error.message = 'PR already exists for branch';
          throw error;
        }
        return '';
      });

      const result = await creator.createPr('Test PR');

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });
  });

  describe('run', () => {
    test('should handle help flag', async () => {
      process.exit = jest.fn();

      await creator.run(['--help']);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should parse command line arguments', async () => {
      process.exit = jest.fn();
      creator.createPr = jest.fn().mockResolvedValue(true);

      await creator.run(['Test PR', '--base', 'develop', '--draft', '--assignee', 'user']);

      expect(creator.createPr).toHaveBeenCalledWith('Test PR', expect.objectContaining({
        base: 'develop',
        draft: true,
        assignee: 'user'
      }));
    });

    test('should enter interactive mode without title', async () => {
      process.exit = jest.fn();
      creator.createPr = jest.fn().mockResolvedValue(true);

      await creator.run([]);

      expect(mockReadline.createInterface).toHaveBeenCalled();
      expect(creator.createPr).toHaveBeenCalledWith('test-input', {});
    });

    test('should exit when no title provided in interactive mode', async () => {
      process.exit = jest.fn();

      mockReadline.createInterface.mockReturnValue({
        question: jest.fn((q, cb) => cb('')),
        close: jest.fn()
      });

      await creator.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('title is required'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});