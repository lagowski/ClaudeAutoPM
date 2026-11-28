/**
 * Jest TDD Tests for PM Issue Start Script (issue-start.js)
 *
 * Comprehensive test suite covering all functionality of the issue-start.js script
 * Target: Improve coverage from ~11% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const IssueStarter = require('../../packages/plugin-pm/scripts/pm/issue-start.cjs');

// Mock child_process for controlled testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('PM Issue Start Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let issueStarter;
  const mockExecSync = require('child_process').execSync;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-issue-start-jest-'));
    process.chdir(tempDir);

    // Create IssueStarter instance
    issueStarter = new IssueStarter();

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
    test('should create IssueStarter instance with correct paths', () => {
      expect(issueStarter).toBeInstanceOf(IssueStarter);
      expect(issueStarter.providersDir).toContain('providers');
      expect(issueStarter.issueDir).toBe('.claude/issues');
      expect(issueStarter.activeWorkFile).toBe('.claude/active-work.json');
    });

    test('should have correct default directory structure', () => {
      const expectedPaths = [
        'providersDir',
        'issueDir',
        'activeWorkFile'
      ];

      expectedPaths.forEach(prop => {
        expect(issueStarter).toHaveProperty(prop);
        expect(typeof issueStarter[prop]).toBe('string');
      });
    });
  });

  describe('Provider Detection', () => {
    test('should detect Azure DevOps provider from .azure directory', () => {
      fs.mkdirSync('.azure', { recursive: true });

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('azure');
    });

    test('should detect Azure DevOps provider from environment variable', () => {
      const originalEnv = process.env.AZURE_DEVOPS_ORG;
      process.env.AZURE_DEVOPS_ORG = 'test-org';

      const provider = issueStarter.detectProvider();
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

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('github');
    });

    test('should detect GitHub provider from git remote', () => {
      fs.mkdirSync('.git', { recursive: true });
      mockExecSync.mockReturnValue('https://github.com/user/repo.git');

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('github');
    });

    test('should default to local provider when no git/azure/github detected', () => {
      const provider = issueStarter.detectProvider();
      expect(provider).toBe('local');
    });

    test('should handle git command errors gracefully', () => {
      fs.mkdirSync('.git', { recursive: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('local');
    });

    test('should not detect GitHub for non-github git remotes', () => {
      fs.mkdirSync('.git', { recursive: true });
      mockExecSync.mockReturnValue('https://gitlab.com/user/repo.git');

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('local');
    });

    test('should prioritize Azure over GitHub when both are present', () => {
      fs.mkdirSync('.azure', { recursive: true });
      fs.mkdirSync('.github', { recursive: true });
      mockExecSync.mockReturnValue('https://github.com/user/repo.git');

      const provider = issueStarter.detectProvider();
      expect(provider).toBe('azure');
    });
  });

  describe('Active Work Management', () => {
    test('should load empty active work when file does not exist', () => {
      const activeWork = issueStarter.loadActiveWork();

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

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork).toEqual(workData);
    });

    test('should handle corrupted active work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', 'invalid json');

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should save active work and create directory if needed', () => {
      const workData = {
        issues: [
          { id: 'issue-1', provider: 'azure', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      issueStarter.saveActiveWork(workData);

      expect(fs.existsSync('.claude/active-work.json')).toBe(true);
      const savedData = JSON.parse(fs.readFileSync('.claude/active-work.json', 'utf8'));
      expect(savedData).toEqual(workData);
    });

    test('should save active work with proper JSON formatting', () => {
      const workData = {
        issues: [
          { id: 'issue-1', provider: 'azure', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      issueStarter.saveActiveWork(workData);

      const fileContent = fs.readFileSync('.claude/active-work.json', 'utf8');
      expect(fileContent).toContain('  '); // Should be pretty-printed with 2 spaces
      expect(() => JSON.parse(fileContent)).not.toThrow();
    });
  });

  describe('Issue Starting Functionality', () => {
    beforeEach(() => {
      // Setup basic directory structure
      fs.mkdirSync('.claude/issues', { recursive: true });
    });

    test('should start new issue and add to active work', async () => {
      const issueId = 'TEST-123';

      // Mock current time
      const startTime = new Date('2023-01-01T10:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(startTime.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(startTime.toISOString());

      await issueStarter.startIssue(issueId);

      // Check active work is updated
      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(1);
      expect(activeWork.issues[0]).toMatchObject({
        id: issueId,
        provider: 'local',
        status: 'in-progress',
        startedAt: startTime.toISOString()
      });

      Date.now.mockRestore();
      Date.prototype.toISOString.mockRestore();
    });

    test('should move existing issue to top of active list', async () => {
      const issueId = 'TEST-123';

      // Setup existing active work
      const existingWork = {
        issues: [
          { id: 'OLD-ISSUE', provider: 'azure', startedAt: '2023-01-01T09:00:00Z' },
          { id: issueId, provider: 'github', startedAt: '2023-01-01T08:00:00Z' }
        ],
        epics: []
      };
      issueStarter.saveActiveWork(existingWork);

      await issueStarter.startIssue(issueId);

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(2);
      expect(activeWork.issues[0].id).toBe(issueId); // Should be first
      expect(activeWork.issues[1].id).toBe('OLD-ISSUE');
    });

    test('should limit active issues to 10', async () => {
      // Create 10 existing active issues
      const existingWork = {
        issues: Array.from({ length: 10 }, (_, i) => ({
          id: `issue-${i}`,
          provider: 'local',
          startedAt: '2023-01-01T10:00:00Z'
        })),
        epics: []
      };
      issueStarter.saveActiveWork(existingWork);

      await issueStarter.startIssue('NEW-ISSUE');

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(10);
      expect(activeWork.issues[0].id).toBe('NEW-ISSUE');
      expect(activeWork.issues.find(issue => issue.id === 'issue-9')).toBeUndefined(); // Last one removed
    });

    test('should create issue file when it does not exist', async () => {
      const issueId = 'TEST-123';

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      expect(fs.existsSync(issueFile)).toBe(true);

      const content = fs.readFileSync(issueFile, 'utf8');
      expect(content).toContain(`# Issue ${issueId}`);
      expect(content).toContain('**State**: In Progress');
      expect(content).toContain('## Tasks');
      expect(content).toContain('- [ ] Task 1');
      expect(content).toContain('## Updates');
      expect(content).toContain('Issue started');
    });

    test('should not overwrite existing issue file', async () => {
      const issueId = 'TEST-123';
      const existingContent = 'Existing issue content';

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, existingContent);

      await issueStarter.startIssue(issueId);

      const content = fs.readFileSync(issueFile, 'utf8');
      expect(content).toBe(existingContent);
    });

    test('should include current user in issue template', async () => {
      const issueId = 'TEST-123';
      const originalUser = process.env.USER;
      process.env.USER = 'testuser';

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      const content = fs.readFileSync(issueFile, 'utf8');
      expect(content).toContain('**Assigned**: testuser');

      if (originalUser) {
        process.env.USER = originalUser;
      } else {
        delete process.env.USER;
      }
    });

    test('should handle missing USER environment variable', async () => {
      const issueId = 'TEST-123';
      const originalUser = process.env.USER;
      delete process.env.USER;

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      const content = fs.readFileSync(issueFile, 'utf8');
      expect(content).toContain('**Assigned**: current-user');

      if (originalUser) {
        process.env.USER = originalUser;
      }
    });

    test('should use provider-specific script when available', async () => {
      const issueId = 'TEST-123';

      // Create mock provider script
      const providerDir = path.join(issueStarter.providersDir, 'azure');
      fs.mkdirSync(providerDir, { recursive: true });

      const providerScript = path.join(providerDir, 'issue-start.js');
      fs.writeFileSync(providerScript, 'module.exports = function() { console.log("Provider script executed"); };');

      await issueStarter.startIssue(issueId, { provider: 'azure' });

      // The script should attempt to use the provider script
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Using azure provider'));
    });

    test('should handle provider script errors gracefully', async () => {
      const issueId = 'TEST-123';

      // Create mock provider script that will error
      const providerDir = path.join(issueStarter.providersDir, 'azure');
      fs.mkdirSync(providerDir, { recursive: true });

      const providerScript = path.join(providerDir, 'issue-start.js');
      fs.writeFileSync(providerScript, 'throw new Error("Provider script error");');

      await issueStarter.startIssue(issueId, { provider: 'azure' });

      // Should fall back to local tracking
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Provider script failed'));
    });

    test('should create issues directory if it does not exist', async () => {
      const issueId = 'TEST-123';

      // Remove issues directory
      if (fs.existsSync('.claude/issues')) {
        fs.rmSync('.claude/issues', { recursive: true });
      }

      await issueStarter.startIssue(issueId);

      expect(fs.existsSync('.claude/issues')).toBe(true);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      expect(fs.existsSync(issueFile)).toBe(true);
    });

    test('should use correct date formatting in issue template', async () => {
      const issueId = 'TEST-123';
      const fixedDate = new Date('2023-01-01T10:00:00.000Z');

      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate.toISOString());
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/1/2023');

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      const content = fs.readFileSync(issueFile, 'utf8');

      expect(content).toContain('**Started**: 2023-01-01T10:00:00.000Z');
      expect(content).toContain('- Started work on 1/1/2023');
      expect(content).toContain('- 2023-01-01T10:00:00.000Z: Issue started');

      Date.prototype.toISOString.mockRestore();
      Date.prototype.toLocaleDateString.mockRestore();
    });
  });

  describe('Command Line Interface', () => {
    test('should require issue ID argument', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueStarter.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Issue ID required'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should show active issues when no argument provided', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Setup some active work
      const activeWork = {
        issues: [
          { id: 'ISSUE-1', provider: 'azure', startedAt: '2023-01-01T10:00:00Z' },
          { id: 'ISSUE-2', provider: 'github', startedAt: '2023-01-02T10:00:00Z' }
        ],
        epics: []
      };
      issueStarter.saveActiveWork(activeWork);

      await issueStarter.run([]);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Currently active issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-2'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should limit displayed active issues to 5', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Setup 7 active issues
      const activeWork = {
        issues: Array.from({ length: 7 }, (_, i) => ({
          id: `ISSUE-${i + 1}`,
          provider: 'local',
          startedAt: '2023-01-01T10:00:00Z'
        })),
        epics: []
      };
      issueStarter.saveActiveWork(activeWork);

      await issueStarter.run([]);

      // Should only show first 5
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-5'));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('ISSUE-6'));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('ISSUE-7'));

      mockExit.mockRestore();
    });

    test('should parse provider option correctly', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueStarter, 'startIssue').mockResolvedValue(undefined);

      await issueStarter.run([issueId, '--provider=github']);

      expect(issueStarter.startIssue).toHaveBeenCalledWith(issueId, { provider: 'github' });
    });

    test('should handle malformed provider option', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueStarter, 'startIssue').mockResolvedValue(undefined);

      await issueStarter.run([issueId, '--provider=']);

      // Should pass empty provider
      expect(issueStarter.startIssue).toHaveBeenCalledWith(issueId, { provider: '' });
    });

    test('should handle unknown options gracefully', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueStarter, 'startIssue').mockResolvedValue(undefined);

      await issueStarter.run([issueId, '--unknown-option', '--provider=local']);

      // Should still process known options
      expect(issueStarter.startIssue).toHaveBeenCalledWith(issueId, { provider: 'local' });
    });

    test('should handle multiple provider options (last one wins)', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueStarter, 'startIssue').mockResolvedValue(undefined);

      await issueStarter.run([issueId, '--provider=azure', '--provider=github']);

      expect(issueStarter.startIssue).toHaveBeenCalledWith(issueId, { provider: 'github' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file system permission errors gracefully', async () => {
      const issueId = 'TEST-123';

      // Mock fs.writeFileSync to throw permission error
      const originalWriteFileSync = fs.writeFileSync;
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Should not crash
      await expect(issueStarter.startIssue(issueId)).resolves.not.toThrow();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle malformed JSON files gracefully', async () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', '{ invalid json');

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork).toEqual({ issues: [], epics: [] });
    });

    test('should handle missing directories gracefully', async () => {
      const issueId = 'TEST-123';

      // Remove .claude directory if it exists
      if (fs.existsSync('.claude')) {
        fs.rmSync('.claude', { recursive: true });
      }

      await issueStarter.startIssue(issueId);

      // Should create necessary directories
      expect(fs.existsSync('.claude')).toBe(true);
      expect(fs.existsSync('.claude/issues')).toBe(true);
    });

    test('should handle empty active work file', async () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', '');

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork).toEqual({ issues: [], epics: [] });
    });

    test('should handle very long issue IDs', async () => {
      const longIssueId = 'A'.repeat(1000);

      await expect(issueStarter.startIssue(longIssueId)).resolves.not.toThrow();

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues[0].id).toBe(longIssueId);
    });

    test('should handle special characters in issue IDs', async () => {
      const specialIssueId = 'ISSUE-123_@#$%^&*()';

      await expect(issueStarter.startIssue(specialIssueId)).resolves.not.toThrow();

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues[0].id).toBe(specialIssueId);
    });

    test('should handle issue file creation errors gracefully', async () => {
      const issueId = 'TEST-123';

      // Mock fs.mkdirSync to work but fs.writeFileSync to fail
      const originalWriteFileSync = fs.writeFileSync;
      let writeCallCount = 0;
      fs.writeFileSync = jest.fn().mockImplementation((path, content) => {
        writeCallCount++;
        if (path.includes('active-work.json')) {
          return originalWriteFileSync(path, content);
        }
        throw new Error('Cannot create issue file');
      });

      await issueStarter.startIssue(issueId);

      // Should still update active work
      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(1);

      fs.writeFileSync = originalWriteFileSync;
    });
  });

  describe('Integration Tests', () => {
    test('should complete full start workflow', async () => {
      const issueId = 'INTEGRATION-TEST';

      // Setup existing active work
      const existingWork = {
        issues: [
          { id: 'OLD-ISSUE', provider: 'local', startedAt: '2023-01-01T09:00:00Z' }
        ],
        epics: []
      };
      issueStarter.saveActiveWork(existingWork);

      // Mock current time
      const startTime = new Date('2023-01-01T10:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(startTime.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(startTime.toISOString());
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/1/2023');
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/1/2023, 10:00:00 AM');

      await issueStarter.startIssue(issueId, { provider: 'azure' });

      // Verify active work changes
      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(2);
      expect(activeWork.issues[0]).toMatchObject({
        id: issueId,
        provider: 'azure',
        status: 'in-progress',
        startedAt: startTime.toISOString()
      });

      // Verify issue file created
      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      expect(fs.existsSync(issueFile)).toBe(true);

      const content = fs.readFileSync(issueFile, 'utf8');
      expect(content).toContain(`# Issue ${issueId}`);
      expect(content).toContain('**State**: In Progress');
      expect(content).toContain(`**Started**: ${startTime.toISOString()}`);
      expect(content).toContain('- Started work on 1/1/2023');
      expect(content).toContain(`- ${startTime.toISOString()}: Issue started`);

      // Verify console output
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`🚀 Starting work on issue: ${issueId}`));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📦 Provider: azure'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 Issue Status:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡 Next steps:'));

      Date.now.mockRestore();
      Date.prototype.toISOString.mockRestore();
      Date.prototype.toLocaleDateString.mockRestore();
      Date.prototype.toLocaleString.mockRestore();
    });

    test('should handle restarting same issue multiple times', async () => {
      const issueId = 'RESTART-TEST';

      // Start issue first time
      await issueStarter.startIssue(issueId);

      let activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(1);
      const firstStartTime = activeWork.issues[0].startedAt;

      // Wait a bit and start again
      const secondStartTime = new Date('2023-01-01T11:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(secondStartTime.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(secondStartTime.toISOString());

      await issueStarter.startIssue(issueId);

      activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(1); // Still only one
      expect(activeWork.issues[0].startedAt).toBe(secondStartTime.toISOString()); // Updated time

      Date.now.mockRestore();
      Date.prototype.toISOString.mockRestore();
    });

    test('should handle concurrent issue starts', async () => {
      const issueIds = ['CONCURRENT-1', 'CONCURRENT-2', 'CONCURRENT-3'];

      // Start all issues concurrently
      await Promise.all(issueIds.map(id => issueStarter.startIssue(id)));

      // Verify final state
      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(3);

      const activeIds = activeWork.issues.map(issue => issue.id);
      issueIds.forEach(id => {
        expect(activeIds).toContain(id);
      });

      // Verify all issue files created
      issueIds.forEach(id => {
        const issueFile = path.join('.claude', 'issues', `${id}.md`);
        expect(fs.existsSync(issueFile)).toBe(true);
      });
    });
  });

  describe('Template Generation', () => {
    test('should generate correct issue template structure', async () => {
      const issueId = 'TEMPLATE-TEST';
      const fixedDate = new Date('2023-01-01T10:00:00.000Z');

      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate.toISOString());
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/1/2023');

      process.env.USER = 'testuser';

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      const content = fs.readFileSync(issueFile, 'utf8');

      const expectedTemplate = `# Issue ${issueId}

## Status
- **State**: In Progress
- **Started**: 2023-01-01T10:00:00.000Z
- **Assigned**: testuser

## Description
[Add issue description here]

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes
- Started work on 1/1/2023

## Updates
- 2023-01-01T10:00:00.000Z: Issue started
`;

      expect(content).toBe(expectedTemplate);

      Date.prototype.toISOString.mockRestore();
      Date.prototype.toLocaleDateString.mockRestore();
      delete process.env.USER;
    });

    test('should handle template with different number of default tasks', async () => {
      const issueId = 'TASKS-TEST';

      await issueStarter.startIssue(issueId);

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      const content = fs.readFileSync(issueFile, 'utf8');

      // Should have exactly 3 default tasks
      const taskMatches = content.match(/- \[ \] Task \d+/g);
      expect(taskMatches).toHaveLength(3);
      expect(taskMatches[0]).toBe('- [ ] Task 1');
      expect(taskMatches[1]).toBe('- [ ] Task 2');
      expect(taskMatches[2]).toBe('- [ ] Task 3');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large number of active issues efficiently', () => {
      const start = Date.now();

      const largeActiveWork = {
        issues: Array.from({ length: 1000 }, (_, i) => ({
          id: `issue-${i}`,
          provider: 'local',
          startedAt: '2023-01-01T00:00:00Z'
        })),
        epics: []
      };

      issueStarter.saveActiveWork(largeActiveWork);
      const loadedWork = issueStarter.loadActiveWork();

      const end = Date.now();

      expect(loadedWork.issues).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    test('should handle starting many issues quickly', async () => {
      const start = Date.now();

      const issueIds = Array.from({ length: 50 }, (_, i) => `PERF-${i}`);

      for (const id of issueIds) {
        await issueStarter.startIssue(id);
      }

      const end = Date.now();

      expect(end - start).toBeLessThan(5000); // Should complete in reasonable time

      const activeWork = issueStarter.loadActiveWork();
      expect(activeWork.issues).toHaveLength(10); // Limited to 10
    });
  });

  describe('--analyze Flag Support (NEW FUNCTIONALITY)', () => {
    beforeEach(() => {
      // Setup basic epic structure
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
    });

    test('should recognize --analyze flag in arguments', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueStarter, 'analyzeIssue').mockResolvedValue(true);
      jest.spyOn(issueStarter, 'startIssueWithAnalysis').mockResolvedValue(undefined);

      await issueStarter.run([issueId, '--analyze']);

      expect(issueStarter.analyzeIssue).toHaveBeenCalledWith(issueId, {});
      expect(issueStarter.startIssueWithAnalysis).toHaveBeenCalledWith(issueId, {});
    });

    test('should call analysis before starting when --analyze flag present', async () => {
      const issueId = 'TEST-123';
      const callOrder = [];

      jest.spyOn(issueStarter, 'analyzeIssue').mockImplementation(async () => {
        callOrder.push('analyze');
        return true;
      });
      jest.spyOn(issueStarter, 'startIssueWithAnalysis').mockImplementation(async () => {
        callOrder.push('start');
      });

      await issueStarter.run([issueId, '--analyze']);

      expect(callOrder).toEqual(['analyze', 'start']);
    });

    test('should find issue task file by number pattern', () => {
      const issueId = '123';

      // Create task file with GitHub issue URL in frontmatter
      const taskFile = path.join('.claude/epics/test-epic', '123.md');
      fs.writeFileSync(taskFile, `---
github: https://github.com/user/repo/issues/123
title: Test Issue
---
# Test Issue Content
`);

      const foundFile = issueStarter.findTaskFile(issueId);
      expect(foundFile).toBe(taskFile);
    });

    test('should find issue task file by old naming convention', () => {
      const issueId = '123';

      // Create task file with old naming
      const taskFile = path.join('.claude/epics/test-epic', 'feature-name.md');
      fs.writeFileSync(taskFile, `---
github: https://github.com/user/repo/issues/123
title: Test Issue
---
# Test Issue Content
`);

      const foundFile = issueStarter.findTaskFile(issueId);
      expect(foundFile).toBe(taskFile);
    });

    test('should create analysis file with correct structure', async () => {
      const issueId = '123';
      const epicName = 'test-epic';

      // Create task file
      const taskFile = path.join('.claude/epics', epicName, `${issueId}.md`);
      fs.writeFileSync(taskFile, `---
github: https://github.com/user/repo/issues/123
title: Add authentication feature
epic: ${epicName}
---
# Add Authentication Feature

Implement user authentication with JWT tokens.
`);

      // Mock gh command
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('gh issue view')) {
          return JSON.stringify({
            title: 'Add authentication feature',
            body: 'Need to implement JWT-based authentication',
            labels: [{name: 'enhancement'}]
          });
        }
        throw new Error('Command not found');
      });

      await issueStarter.analyzeIssue(issueId);

      const analysisFile = path.join('.claude/epics', epicName, `${issueId}-analysis.md`);
      expect(fs.existsSync(analysisFile)).toBe(true);

      const content = fs.readFileSync(analysisFile, 'utf8');
      expect(content).toContain('# Parallel Work Analysis: Issue #123');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Parallel Streams');
    });

    test('should parse analysis file and extract streams', () => {
      const issueId = '123';
      const epicName = 'test-epic';

      // Create analysis file
      const analysisFile = path.join('.claude/epics', epicName, `${issueId}-analysis.md`);
      const analysisContent = `---
issue: 123
title: Test Issue
analyzed: 2023-01-01T10:00:00Z
---
# Parallel Work Analysis: Issue #123

## Parallel Streams

### Stream A: Backend API
**Scope**: Create REST endpoints
**Files**:
- src/api/auth.js
- src/middleware/jwt.js
**Agent Type**: nodejs-backend-engineer
**Can Start**: immediately
**Estimated Hours**: 4
**Dependencies**: none

### Stream B: Frontend Components
**Scope**: Build login UI
**Files**:
- src/components/Login.jsx
**Agent Type**: react-frontend-engineer
**Can Start**: immediately
**Estimated Hours**: 3
**Dependencies**: none
`;
      fs.writeFileSync(analysisFile, analysisContent);

      const streams = issueStarter.parseAnalysisStreams(analysisFile);

      expect(streams).toHaveLength(2);
      expect(streams[0]).toMatchObject({
        name: 'Backend API',
        agentType: 'nodejs-backend-engineer',
        canStart: 'immediately',
        files: ['src/api/auth.js', 'src/middleware/jwt.js']
      });
      expect(streams[1]).toMatchObject({
        name: 'Frontend Components',
        agentType: 'react-frontend-engineer',
        canStart: 'immediately'
      });
    });

    test('should create workspace structure for issue', async () => {
      const issueId = '123';
      const epicName = 'test-epic';

      await issueStarter.createWorkspace(issueId, epicName);

      const workspaceDir = path.join('.claude/epics', epicName, 'updates', issueId);
      expect(fs.existsSync(workspaceDir)).toBe(true);
    });

    test('should create stream tracking files', async () => {
      const issueId = '123';
      const epicName = 'test-epic';
      const stream = {
        name: 'Backend API',
        scope: 'Create REST endpoints',
        files: ['src/api/auth.js'],
        agentType: 'nodejs-backend-engineer',
        canStart: 'immediately'
      };

      await issueStarter.createStreamFile(issueId, epicName, stream, 1);

      const streamFile = path.join('.claude/epics', epicName, 'updates', issueId, 'stream-1.md');
      expect(fs.existsSync(streamFile)).toBe(true);

      const content = fs.readFileSync(streamFile, 'utf8');
      expect(content).toContain('stream: Backend API');
      expect(content).toContain('agent: nodejs-backend-engineer');
      expect(content).toContain('status: in_progress');
    });

    test('should fail gracefully when no task file found', async () => {
      const issueId = '999';

      await expect(issueStarter.analyzeIssue(issueId)).rejects.toThrow('No task file found for issue #999');
    });

    test('should skip analysis if analysis file already exists', async () => {
      const issueId = '123';
      const epicName = 'test-epic';

      // Create task file
      const taskFile = path.join('.claude/epics', epicName, `${issueId}.md`);
      fs.writeFileSync(taskFile, `---
github: https://github.com/user/repo/issues/123
title: Test
epic: ${epicName}
---
# Test
`);

      // Create existing analysis
      const analysisFile = path.join('.claude/epics', epicName, `${issueId}-analysis.md`);
      fs.writeFileSync(analysisFile, 'Existing analysis');

      // Mock console.log to capture output
      const logSpy = jest.spyOn(console, 'log');

      await issueStarter.analyzeIssue(issueId, { force: false });

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Analysis already exists'));
    });

    test('should overwrite analysis when force flag is true', async () => {
      const issueId = '123';
      const epicName = 'test-epic';

      // Create task file
      const taskFile = path.join('.claude/epics', epicName, `${issueId}.md`);
      fs.writeFileSync(taskFile, `---
github: https://github.com/user/repo/issues/123
title: Test
epic: ${epicName}
---
# Test
`);

      // Create existing analysis
      const analysisFile = path.join('.claude/epics', epicName, `${issueId}-analysis.md`);
      fs.writeFileSync(analysisFile, 'Old analysis');

      // Mock gh command
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('gh issue view')) {
          return JSON.stringify({
            title: 'Test',
            body: 'Test body',
            labels: []
          });
        }
        throw new Error('Command not found');
      });

      await issueStarter.analyzeIssue(issueId, { force: true });

      const content = fs.readFileSync(analysisFile, 'utf8');
      expect(content).not.toBe('Old analysis');
      expect(content).toContain('# Parallel Work Analysis');
    });
  });
});