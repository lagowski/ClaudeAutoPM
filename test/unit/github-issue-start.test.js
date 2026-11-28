// Mock child_process and fs before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

const {
  GitHubIssueStart,
  execute,
  detectRepository,
  getIssue,
  branchExists,
  createBranch,
  getCurrentUser,
  assignIssue,
  addLabel,
  addComment,
  moveToProjectColumn,
  mockStartIssue
} = require('../../autopm/.claude/providers/github/issue-start.js');

const { execSync } = require('child_process');
const fs = require('fs');

describe('GitHubIssueStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTOPM_USE_REAL_API;
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new GitHubIssueStart();
      expect(instance).toBeInstanceOf(GitHubIssueStart);
    });
  });

  describe('execute()', () => {
    it('should use mock implementation by default', async () => {
      const options = { id: '123' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('123');
      expect(result.issue.status).toBe('in_progress');
      expect(console.log).toHaveBeenCalledWith('📊 Using mock implementation (set AUTOPM_USE_REAL_API=true for real API)');
    });

    it('should throw error when issue ID is missing', async () => {
      const options = {};
      const settings = { repository: 'user/repo' };

      await expect(execute(options, settings)).rejects.toThrow(
        'Issue ID is required. Usage: issue:start <issue-id>'
      );
    });

    it('should detect repository when not provided in settings', async () => {
      const options = { id: '456' };
      const settings = {};

      // Mock detectRepository to return a repo
      execSync.mockReturnValueOnce('git@github.com:user/detected-repo.git\n');

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.url).toContain('user/detected-repo');
    });

    it('should throw error when repository cannot be detected', async () => {
      const options = { id: '789' };
      const settings = {};

      // Mock detectRepository to fail
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      await expect(execute(options, settings)).rejects.toThrow(
        'GitHub repository not configured. Set projectManagement.settings.github.repository in config.json'
      );
    });

    it('should use real GitHub CLI when AUTOPM_USE_REAL_API is set', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '100' };
      const settings = { repository: 'user/test-repo' };

      // Mock getIssue to return valid issue
      const mockIssue = {
        number: 100,
        title: 'Test Issue',
        state: 'open',
        assignee: null,
        url: 'https://github.com/user/test-repo/issues/100'
      };
      execSync.mockReturnValueOnce(JSON.stringify(mockIssue));

      // Mock other operations
      execSync.mockReturnValue('');
      execSync.mockReturnValueOnce('testuser'); // getCurrentUser

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('100');
      expect(result.issue.status).toBe('in_progress');
    });

    it('should handle issue not found error', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '999' };
      const settings = { repository: 'user/test-repo' };

      // Mock getIssue to return null (issue not found)
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh issue view')) {
          throw new Error('issue not found');
        }
        return '';
      });

      await expect(execute(options, settings)).rejects.toThrow('Issue #999 not found');
    });

    it('should handle closed issue error', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '200' };
      const settings = { repository: 'user/test-repo' };

      // Mock getIssue to return closed issue
      const closedIssue = {
        number: 200,
        title: 'Closed Issue',
        state: 'closed',
        assignee: null,
        url: 'https://github.com/user/test-repo/issues/200'
      };
      execSync.mockReturnValueOnce(JSON.stringify(closedIssue));

      await expect(execute(options, settings)).rejects.toThrow('Issue #200 is closed and cannot be started');
    });

    it('should skip branch creation when branch exists', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '300' };
      const settings = { repository: 'user/test-repo' };

      // Mock getIssue
      const mockIssue = {
        number: 300,
        title: 'Test Issue',
        state: 'open',
        assignee: null,
        url: 'https://github.com/user/test-repo/issues/300'
      };
      execSync.mockReturnValueOnce(JSON.stringify(mockIssue));

      // Mock branch exists check to return true
      execSync.mockImplementationOnce((cmd) => {
        if (cmd.includes('git show-ref')) {
          return ''; // Branch exists
        }
        return '';
      });

      execSync.mockReturnValue('');
      execSync.mockReturnValueOnce('testuser'); // getCurrentUser

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('⚠️  Branch feature/issue-300 already exists, skipping creation');
    });

    it('should use custom branch name when specified', async () => {
      const options = { id: '400', branch: 'custom-branch' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.issue.branch).toBe('custom-branch');
    });

    it('should skip branch creation when no_branch is true', async () => {
      const options = { id: '500', no_branch: true };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.issue.branch).toBe(null);
    });

    it('should assign issue when assign option is true', async () => {
      const options = { id: '600', assign: true };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.issue.assignee).toBe('current-user');
      expect(result.actions).toContain('Assigned to current-user');
    });

    it('should add custom comment when specified', async () => {
      const options = { id: '700', comment: 'Starting work on this feature' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.actions).toContain('Added comment');
    });

    it('should move to project column when specified', async () => {
      const options = { id: '800', project: 'In Progress' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.actions).toContain('Moved to In Progress column');
    });
  });

  describe('detectRepository()', () => {
    it('should detect GitHub repository from git remote', () => {
      execSync.mockReturnValue('git@github.com:user/repo.git\n');

      const repo = detectRepository();

      expect(repo).toBe('user/repo');
      expect(execSync).toHaveBeenCalledWith('git remote get-url origin', { encoding: 'utf8' });
    });

    it('should detect repository from HTTPS remote', () => {
      execSync.mockReturnValue('https://github.com/user/another-repo.git\n');

      const repo = detectRepository();

      expect(repo).toBe('user/another-repo');
    });

    it('should return null when git command fails', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const repo = detectRepository();

      expect(repo).toBe(null);
    });

    it('should return null when remote is not GitHub', () => {
      execSync.mockReturnValue('git@gitlab.com:user/repo.git\n');

      const repo = detectRepository();

      expect(repo).toBe(null);
    });
  });

  describe('getIssue()', () => {
    it('should return issue data when found', async () => {
      const mockIssue = {
        number: 123,
        title: 'Test Issue',
        state: 'open',
        assignees: [],
        labels: [],
        url: 'https://github.com/user/repo/issues/123'
      };
      execSync.mockReturnValue(JSON.stringify(mockIssue));

      const result = await getIssue('user/repo', '123');

      expect(result).toEqual(mockIssue);
      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 123 --repo user/repo --json number,title,state,assignees,labels,url',
        { encoding: 'utf8' }
      );
    });

    it('should return null when issue not found', async () => {
      execSync.mockImplementation(() => {
        throw new Error('issue not found');
      });

      const result = await getIssue('user/repo', '999');

      expect(result).toBe(null);
    });
  });

  describe('branchExists()', () => {
    it('should return true when branch exists', () => {
      execSync.mockReturnValue('');

      const result = branchExists('feature/test-branch');

      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        'git show-ref --verify --quiet refs/heads/feature/test-branch'
      );
    });

    it('should return false when branch does not exist', () => {
      execSync.mockImplementation(() => {
        throw new Error('branch not found');
      });

      const result = branchExists('nonexistent-branch');

      expect(result).toBe(false);
    });
  });

  describe('createBranch()', () => {
    it('should create and checkout new branch', () => {
      execSync.mockReturnValue(''); // Reset mock for this test

      createBranch('feature/new-branch');

      expect(execSync).toHaveBeenCalledWith(
        'git checkout -b feature/new-branch',
        { stdio: 'inherit' }
      );
    });
  });

  describe('getCurrentUser()', () => {
    it('should return current GitHub user', async () => {
      execSync.mockReturnValue('testuser\n');

      const result = await getCurrentUser();

      expect(result).toBe('testuser');
      expect(execSync).toHaveBeenCalledWith('gh api user --jq .login', { encoding: 'utf8' });
    });

    it('should return default when API call fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('API call failed');
      });

      const result = await getCurrentUser();

      expect(result).toBe('current-user');
    });
  });

  describe('assignIssue()', () => {
    it('should assign issue to user', async () => {
      await assignIssue('user/repo', '123', 'testuser');

      expect(execSync).toHaveBeenCalledWith(
        'gh issue edit 123 --repo user/repo --add-assignee testuser',
        { stdio: 'inherit' }
      );
    });

    it('should handle assignment errors gracefully', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Assignment failed');
      });

      await assignIssue('user/repo', '123', 'testuser');

      expect(console.warn).toHaveBeenCalledWith('Could not assign issue:', 'Assignment failed');
    });
  });

  describe('addLabel()', () => {
    it('should add label to issue', async () => {
      await addLabel('user/repo', '123', 'in-progress');

      expect(execSync).toHaveBeenCalledWith(
        'gh issue edit 123 --repo user/repo --add-label in-progress',
        { stdio: 'inherit' }
      );
    });

    it('should handle label errors gracefully', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Label failed');
      });

      await addLabel('user/repo', '123', 'in-progress');

      expect(console.warn).toHaveBeenCalledWith('Could not add label:', 'Label failed');
    });
  });

  describe('addComment()', () => {
    it('should add comment to issue', async () => {
      await addComment('user/repo', '123', 'Starting work');

      expect(execSync).toHaveBeenCalledWith(
        'gh issue comment 123 --repo user/repo --body "Starting work"',
        { stdio: 'inherit' }
      );
    });

    it('should handle comment errors gracefully', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Comment failed');
      });

      await addComment('user/repo', '123', 'Starting work');

      expect(console.warn).toHaveBeenCalledWith('Could not add comment:', 'Comment failed');
    });
  });

  describe('moveToProjectColumn()', () => {
    it('should log project column move', async () => {
      await moveToProjectColumn('user/repo', '123', 'In Progress');

      expect(console.log).toHaveBeenCalledWith('Would move issue #123 to In Progress column');
    });
  });

  describe('mockStartIssue()', () => {
    it('should return mock response with basic options', () => {
      const options = { id: '123' };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('123');
      expect(result.issue.status).toBe('in_progress');
      expect(result.issue.branch).toBe('feature/issue-123');
      expect(result.actions).toContain('Created branch feature/issue-123');
      expect(result.actions).toContain('Added in-progress label');
      expect(result.actions).toContain('Added start notification');
    });

    it('should throw error for non-existent issue', () => {
      const options = { id: '999' };
      const repository = 'user/repo';

      expect(() => mockStartIssue(options, repository)).toThrow('Issue #999 not found');
    });

    it('should throw error for closed issue', () => {
      const options = { id: '998' };
      const repository = 'user/repo';

      expect(() => mockStartIssue(options, repository)).toThrow('Issue #998 is closed and cannot be started');
    });

    it('should use custom branch name', () => {
      const options = { id: '456', branch: 'custom-feature' };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.issue.branch).toBe('custom-feature');
      expect(result.actions).toContain('Created branch custom-feature');
    });

    it('should skip branch creation when no_branch is true', () => {
      const options = { id: '789', no_branch: true };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.issue.branch).toBe(null);
      expect(result.actions).not.toContain('Created branch feature/issue-789');
    });

    it('should handle assignment option', () => {
      const options = { id: '101', assign: true };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.issue.assignee).toBe('current-user');
      expect(result.actions).toContain('Assigned to current-user');
    });

    it('should handle custom comment', () => {
      const options = { id: '202', comment: 'Custom start comment' };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.actions).toContain('Added comment');
      expect(console.log).toHaveBeenCalledWith('💬 Would add comment: Custom start comment');
    });

    it('should handle project column move', () => {
      const options = { id: '303', project: 'In Development' };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.actions).toContain('Moved to In Development column');
      expect(console.log).toHaveBeenCalledWith('📋 Would move to project column: In Development');
    });

    it('should handle all options together', () => {
      const options = {
        id: '404',
        branch: 'feature/comprehensive',
        assign: true,
        comment: 'Starting comprehensive work',
        project: 'Active'
      };
      const repository = 'user/repo';

      const result = mockStartIssue(options, repository);

      expect(result.success).toBe(true);
      expect(result.issue.branch).toBe('feature/comprehensive');
      expect(result.issue.assignee).toBe('current-user');
      expect(result.actions).toEqual([
        'Created branch feature/comprehensive',
        'Assigned to current-user',
        'Added in-progress label',
        'Added comment',
        'Moved to Active column'
      ]);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const githubIssueStart = require('../../autopm/.claude/providers/github/issue-start.js');

      expect(githubIssueStart).toHaveProperty('execute');
      expect(githubIssueStart).toHaveProperty('GitHubIssueStart');
      expect(githubIssueStart).toHaveProperty('detectRepository');
    });

    it('should handle realistic workflow in mock mode', async () => {
      const options = {
        id: '42',
        assign: true,
        comment: 'Starting work on this critical bug fix',
        project: 'Sprint Backlog'
      };
      const settings = { repository: 'company/webapp' };

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('42');
      expect(result.issue.status).toBe('in_progress');
      expect(result.issue.assignee).toBe('current-user');
      expect(result.issue.branch).toBe('feature/issue-42');
      expect(result.actions).toHaveLength(5); // branch, assign, label, comment, project
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle edge cases in URL parsing', () => {
      const testCases = [
        'git@github.com:user/repo.git',
        'https://github.com/user/repo.git',
        'git@github.com:user/repo',
        'https://github.com/user/repo'
      ];

      testCases.forEach(url => {
        execSync.mockReturnValueOnce(url + '\n');
        const repo = detectRepository();
        expect(repo).toBe('user/repo');
      });
    });

    it('should handle numeric and string issue IDs', async () => {
      const numericOptions = { id: 123 };
      const stringOptions = { id: '456' };
      const settings = { repository: 'user/repo' };

      const numericResult = await execute(numericOptions, settings);
      const stringResult = await execute(stringOptions, settings);

      expect(numericResult.issue.id).toBe(123);
      expect(stringResult.issue.id).toBe('456');
    });
  });
});