/**
 * Jest TDD Tests for PM Issue Show Script (issue-show.js)
 *
 * Comprehensive test suite covering all functionality of the issue-show.js script
 * Target: Improve coverage from ~9% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const IssueShower = require('../../autopm/.claude/scripts/pm/issue-show.js');

// Mock child_process for controlled testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('PM Issue Show Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let issueShower;
  const mockExecSync = require('child_process').execSync;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-issue-show-jest-'));
    process.chdir(tempDir);

    // Create IssueShower instance
    issueShower = new IssueShower();

    // Clear all mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockExecSync.mockImplementation((command) => {
      if (command.includes('git remote get-url origin')) {
        throw new Error('Not a git repository');
      }
      throw new Error('Command not found');
    });

    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should create IssueShower instance with correct paths', () => {
      expect(issueShower).toBeInstanceOf(IssueShower);
      expect(issueShower.providersDir).toContain('providers');
      expect(issueShower.issueDir).toBe('.claude/issues');
      expect(issueShower.activeWorkFile).toBe('.claude/active-work.json');
      expect(issueShower.completedFile).toBe('.claude/completed-work.json');
    });

    test('should have correct default directory structure', () => {
      const expectedPaths = [
        'providersDir',
        'issueDir',
        'activeWorkFile',
        'completedFile'
      ];

      expectedPaths.forEach(prop => {
        expect(issueShower).toHaveProperty(prop);
        expect(typeof issueShower[prop]).toBe('string');
      });
    });
  });

  describe('Provider Detection', () => {
    test('should detect Azure DevOps provider from .azure directory', () => {
      fs.mkdirSync('.azure', { recursive: true });

      const provider = issueShower.detectProvider();
      expect(provider).toBe('azure');
    });

    test('should detect Azure DevOps provider from environment variable', () => {
      const originalEnv = process.env.AZURE_DEVOPS_ORG;
      process.env.AZURE_DEVOPS_ORG = 'test-org';

      const provider = issueShower.detectProvider();
      expect(provider).toBe('azure');

      if (originalEnv) {
        process.env.AZURE_DEVOPS_ORG = originalEnv;
      } else {
        delete process.env.AZURE_DEVOPS_ORG;
      }
    });

    test('should detect GitHub provider from .github directory', () => {
      fs.mkdirSync('.github', { recursive: true });
      mockExecSync.mockReturnValue('https://github.com/user/repo.git');

      const provider = issueShower.detectProvider();
      expect(provider).toBe('github');
    });

    test('should detect GitHub provider from git remote', () => {
      fs.mkdirSync('.git', { recursive: true });
      mockExecSync.mockReturnValue('https://github.com/user/repo.git');

      const provider = issueShower.detectProvider();
      expect(provider).toBe('github');
    });

    test('should default to local provider when no git/azure/github detected', () => {
      const provider = issueShower.detectProvider();
      expect(provider).toBe('local');
    });

    test('should handle git command errors gracefully', () => {
      fs.mkdirSync('.git', { recursive: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      const provider = issueShower.detectProvider();
      expect(provider).toBe('local');
    });
  });

  describe('Active Work Management', () => {
    test('should load empty active work when file does not exist', () => {
      const activeWork = issueShower.loadActiveWork();

      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should load active work from existing file', () => {
      const workData = {
        issues: [
          { id: 'issue-1', provider: 'azure', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      const activeWork = issueShower.loadActiveWork();
      expect(activeWork).toEqual(workData);
    });

    test('should handle corrupted active work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', 'invalid json');

      const activeWork = issueShower.loadActiveWork();
      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });
  });

  describe('Completed Work Management', () => {
    test('should load empty completed work when file does not exist', () => {
      const completedWork = issueShower.loadCompletedWork();

      expect(completedWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should load completed work from existing file', () => {
      const workData = {
        issues: [
          {
            id: 'issue-1',
            provider: 'azure',
            completedAt: '2023-01-01T00:00:00Z',
            duration: '2h 30m'
          }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/completed-work.json', JSON.stringify(workData));

      const completedWork = issueShower.loadCompletedWork();
      expect(completedWork).toEqual(workData);
    });

    test('should handle corrupted completed work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/completed-work.json', 'invalid json');

      const completedWork = issueShower.loadCompletedWork();
      expect(completedWork).toEqual({
        issues: [],
        epics: []
      });
    });
  });

  describe('Duration Formatting', () => {
    test('should format duration in minutes for short periods', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-01T10:30:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('30 minutes');
    });

    test('should format duration in hours and minutes', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-01T12:30:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('2h 30m');
    });

    test('should format duration in days and hours for long periods', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-03T14:30:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('2 days 4h');
    });

    test('should handle single day correctly', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-02T14:30:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('1 day 4h');
    });

    test('should handle single minute correctly', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-01T10:01:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('1 minute');
    });

    test('should use current time when endTime not provided', () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago

      const duration = issueShower.formatDuration(startTime);
      expect(duration).toMatch(/^\d+ minutes?$/);
    });

    test('should handle zero duration', () => {
      const startTime = '2023-01-01T10:00:00Z';
      const endTime = '2023-01-01T10:00:00Z';

      const duration = issueShower.formatDuration(startTime, endTime);
      expect(duration).toBe('0 minutes');
    });
  });

  describe('Issue Display Functionality', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/issues', { recursive: true });
    });

    test('should show active issue with status information', async () => {
      const issueId = 'TEST-123';

      // Setup active work
      const activeWork = {
        issues: [
          {
            id: issueId,
            provider: 'azure',
            startedAt: '2023-01-01T10:00:00Z',
            status: 'in-progress'
          }
        ],
        epics: []
      };
      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📋 Issue Details: TEST-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 Status Information:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔄 In Progress'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Provider: azure'));
    });

    test('should show completed issue with duration', async () => {
      const issueId = 'TEST-123';

      // Setup completed work
      const completedWork = {
        issues: [
          {
            id: issueId,
            provider: 'github',
            startedAt: '2023-01-01T10:00:00Z',
            completedAt: '2023-01-01T12:30:00Z',
            duration: '2h 30m',
            status: 'completed'
          }
        ],
        epics: []
      };
      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(completedWork);

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Completed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Duration: 2h 30m'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Completed:'));
    });

    test('should show issue file content when available', async () => {
      const issueId = 'TEST-123';
      const issueContent = `# Issue TEST-123

## Status
- **State**: In Progress

## Description
This is a test issue for validation.

## Tasks
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

## Notes
- Some note about the issue
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📄 Issue Content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 STATUS'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 DESCRIPTION'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 TASKS'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Completed task'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⬜ Incomplete task'));
    });

    test('should format different content types correctly', async () => {
      const issueId = 'FORMAT-TEST';
      const issueContent = `# Issue FORMAT-TEST

## Tasks
- [x] Completed checkbox task
- [ ] Incomplete checkbox task
- Regular bullet point
- **Bold text item**

## Notes
Regular note content
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Completed checkbox task'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⬜ Incomplete checkbox task'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('• Regular bullet point'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('**Bold text item**'));
    });

    test('should handle issue not found locally', async () => {
      const issueId = 'NOT-FOUND';

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ Issue not found locally'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡 Try fetching from local:'));
    });

    test('should show related issues when available', async () => {
      const issueId = 'TEST-123';

      const activeWork = {
        issues: [
          { id: 'TEST-123', startedAt: '2023-01-01T10:00:00Z' },
          { id: 'OTHER-1', startedAt: '2023-01-01T09:00:00Z' },
          { id: 'OTHER-2', startedAt: '2023-01-01T08:00:00Z' }
        ],
        epics: []
      };

      const completedWork = {
        issues: [
          { id: 'COMPLETED-1', completedAt: '2023-01-01T07:00:00Z' },
          { id: 'COMPLETED-2', completedAt: '2023-01-01T06:00:00Z' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(completedWork);

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📚 Related Issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔄 Active:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('OTHER-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('OTHER-2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Recently Completed:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('COMPLETED-1'));
    });

    test('should limit related issues display to 3 each', async () => {
      const issueId = 'TEST-123';

      const activeWork = {
        issues: [
          { id: 'TEST-123', startedAt: '2023-01-01T10:00:00Z' },
          { id: 'ACTIVE-1', startedAt: '2023-01-01T09:00:00Z' },
          { id: 'ACTIVE-2', startedAt: '2023-01-01T08:00:00Z' },
          { id: 'ACTIVE-3', startedAt: '2023-01-01T07:00:00Z' },
          { id: 'ACTIVE-4', startedAt: '2023-01-01T06:00:00Z' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      await issueShower.showIssue(issueId);

      const activeLines = logCalls.filter(line => line.includes('ACTIVE-'));
      expect(activeLines).toHaveLength(3); // Should only show 3

      console.log = originalLog;
    });

    test('should show appropriate actions for active issue', async () => {
      const issueId = 'ACTIVE-123';

      const activeWork = {
        issues: [
          { id: issueId, startedAt: '2023-01-01T10:00:00Z', status: 'in-progress' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡 Available Actions:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Close issue: pm issue-close'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Edit issue: pm issue-edit'));
    });

    test('should show appropriate actions for completed issue', async () => {
      const issueId = 'COMPLETED-123';

      const completedWork = {
        issues: [
          { id: issueId, completedAt: '2023-01-01T10:00:00Z', status: 'completed' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(completedWork);

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Reopen issue: pm issue-reopen'));
    });

    test('should show appropriate actions for unknown issue', async () => {
      const issueId = 'UNKNOWN-123';

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Start work: pm issue-start'));
    });

    test('should use provider-specific script when available', async () => {
      const issueId = 'PROVIDER-123';

      // Create mock provider script
      const providerDir = path.join(issueShower.providersDir, 'azure');
      fs.mkdirSync(providerDir, { recursive: true });

      const providerScript = path.join(providerDir, 'issue-show.js');
      fs.writeFileSync(providerScript, 'module.exports = function() { console.log("Provider script executed"); };');

      await issueShower.showIssue(issueId, { provider: 'azure' });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📦 Provider: azure'));
    });

    test('should handle provider script errors gracefully', async () => {
      const issueId = 'PROVIDER-123';

      // Create mock provider script that will error
      const providerDir = path.join(issueShower.providersDir, 'azure');
      fs.mkdirSync(providerDir, { recursive: true });

      const providerScript = path.join(providerDir, 'issue-show.js');
      fs.writeFileSync(providerScript, 'throw new Error("Provider script error");');

      await issueShower.showIssue(issueId, { provider: 'azure' });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Provider script failed, showing local data'));
    });

    test('should skip provider script when local option used', async () => {
      const issueId = 'LOCAL-123';

      // Create mock provider script
      const providerDir = path.join(issueShower.providersDir, 'azure');
      fs.mkdirSync(providerDir, { recursive: true });

      const providerScript = path.join(providerDir, 'issue-show.js');
      fs.writeFileSync(providerScript, 'module.exports = function() { console.log("Should not execute"); };');

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      await issueShower.showIssue(issueId, { local: true, provider: 'azure' });

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Should not execute'));
    });
  });

  describe('Command Line Interface', () => {
    test('should require issue ID argument', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueShower.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Issue ID required'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should show recent issues when no argument provided', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Setup some work data
      const activeWork = {
        issues: [
          { id: 'ACTIVE-1', status: 'in-progress' },
          { id: 'ACTIVE-2', status: 'blocked' }
        ],
        epics: []
      };

      const completedWork = {
        issues: [
          { id: 'COMPLETED-1', completedAt: '2023-01-01T10:00:00Z' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(completedWork);

      await issueShower.run([]);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📋 Recent issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Active:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ACTIVE-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Completed:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('COMPLETED-1'));

      mockExit.mockRestore();
    });

    test('should limit displayed recent issues to 3', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      const activeWork = {
        issues: [
          { id: 'ACTIVE-1', status: 'in-progress' },
          { id: 'ACTIVE-2', status: 'blocked' },
          { id: 'ACTIVE-3', status: 'review' },
          { id: 'ACTIVE-4', status: 'in-progress' }
        ],
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      await issueShower.run([]);

      const activeLines = logCalls.filter(line => line.includes('ACTIVE-'));
      expect(activeLines).toHaveLength(3); // Should only show first 3

      console.log = originalLog;
      mockExit.mockRestore();
    });

    test('should parse local option correctly', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueShower, 'showIssue').mockResolvedValue(undefined);

      await issueShower.run([issueId, '--local']);

      expect(issueShower.showIssue).toHaveBeenCalledWith(issueId, { local: true });
    });

    test('should parse fetch option correctly', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueShower, 'showIssue').mockResolvedValue(undefined);

      await issueShower.run([issueId, '--fetch']);

      expect(issueShower.showIssue).toHaveBeenCalledWith(issueId, { fetch: true });
    });

    test('should parse provider option correctly', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueShower, 'showIssue').mockResolvedValue(undefined);

      await issueShower.run([issueId, '--provider=github']);

      expect(issueShower.showIssue).toHaveBeenCalledWith(issueId, { provider: 'github' });
    });

    test('should parse multiple options correctly', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueShower, 'showIssue').mockResolvedValue(undefined);

      await issueShower.run([issueId, '--local', '--fetch', '--provider=azure']);

      expect(issueShower.showIssue).toHaveBeenCalledWith(issueId, {
        local: true,
        fetch: true,
        provider: 'azure'
      });
    });

    test('should handle unknown options gracefully', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueShower, 'showIssue').mockResolvedValue(undefined);

      await issueShower.run([issueId, '--unknown-option', '--local']);

      expect(issueShower.showIssue).toHaveBeenCalledWith(issueId, { local: true });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file system permission errors gracefully', async () => {
      const issueId = 'TEST-123';

      // Mock fs.readFileSync to throw permission error
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Should not crash
      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();

      fs.readFileSync = originalReadFileSync;
    });

    test('should handle malformed JSON files gracefully', async () => {
      const issueId = 'TEST-123';

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', '{ invalid json');

      // Should handle gracefully and load empty data
      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle missing directories gracefully', async () => {
      const issueId = 'TEST-123';

      // Remove .claude directory if it exists
      if (fs.existsSync('.claude')) {
        fs.rmSync('.claude', { recursive: true });
      }

      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle very long issue IDs', async () => {
      const longIssueId = 'A'.repeat(1000);

      await expect(issueShower.showIssue(longIssueId)).resolves.not.toThrow();
    });

    test('should handle special characters in issue IDs', async () => {
      const specialIssueId = 'ISSUE-123_@#$%^&*()';

      await expect(issueShower.showIssue(specialIssueId)).resolves.not.toThrow();
    });

    test('should handle corrupted issue files gracefully', async () => {
      const issueId = 'CORRUPTED-123';

      fs.mkdirSync('.claude/issues', { recursive: true });

      // Create a file with binary content
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      fs.writeFileSync('.claude/issues/CORRUPTED-123.md', buffer);

      // Should not crash when reading corrupted file
      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle empty issue files', async () => {
      const issueId = 'EMPTY-123';

      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/issues/EMPTY-123.md', '');

      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle issue files with only whitespace', async () => {
      const issueId = 'WHITESPACE-123';

      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/issues/WHITESPACE-123.md', '   \n\n\t\t  \n  ');

      await expect(issueShower.showIssue(issueId)).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full show workflow for active issue with file', async () => {
      const issueId = 'INTEGRATION-123';

      // Setup active work
      const activeWork = {
        issues: [
          {
            id: issueId,
            provider: 'azure',
            startedAt: '2023-01-01T10:00:00Z',
            status: 'in-progress'
          },
          {
            id: 'OTHER-1',
            provider: 'local',
            startedAt: '2023-01-01T09:00:00Z',
            status: 'blocked'
          }
        ],
        epics: []
      };

      const completedWork = {
        issues: [
          {
            id: 'COMPLETED-1',
            provider: 'github',
            completedAt: '2023-01-01T08:00:00Z',
            duration: '1h 30m'
          }
        ],
        epics: []
      };

      // Setup issue file
      const issueContent = `# Issue ${issueId}

## Status
- **State**: In Progress
- **Started**: 2023-01-01T10:00:00Z

## Description
This is an integration test issue.

## Tasks
- [x] Setup test environment
- [ ] Write comprehensive tests
- [ ] Validate functionality

## Notes
- 2023-01-01T10:30:00Z: Started working on tests
- 2023-01-01T11:00:00Z: Making good progress
`;

      fs.mkdirSync('.claude/issues', { recursive: true });
      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(completedWork);

      await issueShower.showIssue(issueId);

      // Verify all sections are displayed
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📋 Issue Details: INTEGRATION-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 Status Information:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔄 In Progress'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Provider: azure'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📄 Issue Content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 STATUS'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 DESCRIPTION'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔹 TASKS'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Setup test environment'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⬜ Write comprehensive tests'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📚 Related Issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔄 Active:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('OTHER-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Recently Completed:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('COMPLETED-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡 Available Actions:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Close issue: pm issue-close'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Edit issue: pm issue-edit'));
    });

    test('should handle concurrent issue shows', async () => {
      const issueIds = ['CONCURRENT-1', 'CONCURRENT-2', 'CONCURRENT-3'];

      // Setup work data
      const activeWork = {
        issues: issueIds.map(id => ({
          id,
          provider: 'local',
          startedAt: '2023-01-01T10:00:00Z',
          status: 'in-progress'
        })),
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(activeWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      // Show all issues concurrently
      await Promise.all(issueIds.map(id => issueShower.showIssue(id)));

      // Should not crash and should show all issues
      issueIds.forEach(id => {
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`📋 Issue Details: ${id}`));
      });
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large number of related issues efficiently', async () => {
      const issueId = 'PERF-TEST';

      const largeActiveWork = {
        issues: [
          { id: issueId, startedAt: '2023-01-01T10:00:00Z' },
          ...Array.from({ length: 1000 }, (_, i) => ({
            id: `ISSUE-${i}`,
            startedAt: '2023-01-01T09:00:00Z'
          }))
        ],
        epics: []
      };

      const largeCompletedWork = {
        issues: Array.from({ length: 1000 }, (_, i) => ({
          id: `COMPLETED-${i}`,
          completedAt: '2023-01-01T08:00:00Z'
        })),
        epics: []
      };

      issueShower.loadActiveWork = jest.fn().mockReturnValue(largeActiveWork);
      issueShower.loadCompletedWork = jest.fn().mockReturnValue(largeCompletedWork);

      const start = Date.now();
      await issueShower.showIssue(issueId);
      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should handle large data efficiently
    });

    test('should handle large issue files efficiently', async () => {
      const issueId = 'LARGE-123';
      const largeContent = `# Issue ${issueId}

## Description
${'A'.repeat(10000)}

## Tasks
${Array.from({ length: 1000 }, (_, i) => `- [ ] Task ${i + 1}`).join('\n')}
`;

      fs.mkdirSync('.claude/issues', { recursive: true });
      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, largeContent);

      issueShower.loadActiveWork = jest.fn().mockReturnValue({ issues: [], epics: [] });
      issueShower.loadCompletedWork = jest.fn().mockReturnValue({ issues: [], epics: [] });

      const start = Date.now();
      await issueShower.showIssue(issueId);
      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should handle large files efficiently
    });
  });
});