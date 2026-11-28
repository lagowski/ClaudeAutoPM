// Mock child_process before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const {
  GitHubIssueClose,
  execute,
  detectRepository,
  mockCloseIssue
} = require('../../autopm/.claude/providers/github/issue-close.js');

const { execSync } = require('child_process');

describe('GitHubIssueClose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTOPM_USE_REAL_API;
    console.log = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new GitHubIssueClose();
      expect(instance).toBeInstanceOf(GitHubIssueClose);
    });
  });

  describe('execute()', () => {
    it('should use mock implementation by default', async () => {
      const options = { id: '123' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('123');
      expect(result.issue.status).toBe('closed');
      expect(console.log).toHaveBeenCalledWith('📊 Using mock implementation');
    });

    it('should throw error when issue ID is missing', async () => {
      const options = {};
      const settings = { repository: 'user/repo' };

      await expect(execute(options, settings)).rejects.toThrow(
        'Issue ID is required. Usage: issue:close <issue-id>'
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
        'GitHub repository not configured'
      );
    });

    it('should use real GitHub CLI when AUTOPM_USE_REAL_API is set', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '100' };
      const settings = { repository: 'user/test-repo' };

      // Mock successful gh commands
      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('100');
      expect(result.actions).toContain('Closed issue');
      expect(execSync).toHaveBeenCalledWith(
        'gh issue close 100 --repo user/test-repo',
        { stdio: 'inherit' }
      );
    });

    it('should add comment when specified in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '200',
        comment: 'Fixed in latest release'
      };
      const settings = { repository: 'user/test-repo' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.actions).toContain('Added closing comment');
      expect(execSync).toHaveBeenCalledWith(
        'gh issue comment 200 --repo user/test-repo --body "Fixed in latest release"',
        { stdio: 'inherit' }
      );
    });

    it('should add resolution label when specified in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '300',
        resolution: 'duplicate'
      };
      const settings = { repository: 'user/test-repo' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.actions).toContain('Added resolution: duplicate');
      expect(execSync).toHaveBeenCalledWith(
        'gh issue edit 300 --repo user/test-repo --add-label "resolution:duplicate"',
        { stdio: 'inherit' }
      );
    });

    it('should delete branch by default in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '400' };
      const settings = { repository: 'user/test-repo' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.actions).toContain('Deleted branch feature/issue-400');
      expect(execSync).toHaveBeenCalledWith(
        'git branch -d feature/issue-400',
        { stdio: 'inherit' }
      );
    });

    it('should not delete branch when no_branch_delete is true', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '500',
        no_branch_delete: true
      };
      const settings = { repository: 'user/test-repo' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.actions).not.toContain('Deleted branch feature/issue-500');
      expect(execSync).not.toHaveBeenCalledWith(
        'git branch -d feature/issue-500',
        { stdio: 'inherit' }
      );
    });

    it('should handle branch deletion failure gracefully', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '600' };
      const settings = { repository: 'user/test-repo' };

      // Mock gh commands to succeed but git branch deletion to fail
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git branch -d')) {
          throw new Error('Branch not found or not merged');
        }
        return '';
      });

      const result = await execute(options, settings);

      // Should still succeed even if branch deletion fails
      expect(result.success).toBe(true);
      expect(result.actions).toContain('Closed issue');
      expect(result.actions).not.toContain('Deleted branch');
    });

    it('should include all specified options in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '700',
        comment: 'Comprehensive fix',
        resolution: 'fixed'
      };
      const settings = { repository: 'user/test-repo' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.actions).toContain('Closed issue');
      expect(result.actions).toContain('Added closing comment');
      expect(result.actions).toContain('Added resolution: fixed');
      expect(result.actions).toContain('Deleted branch feature/issue-700');
      expect(result.issue.resolution).toBe('fixed');
    });

    it('should handle GitHub CLI errors', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '800' };
      const settings = { repository: 'user/test-repo' };

      execSync.mockImplementation(() => {
        throw new Error('gh: command failed');
      });

      await expect(execute(options, settings)).rejects.toThrow('gh: command failed');
    });

    it('should generate correct timestamp', async () => {
      const options = { id: '900' };
      const settings = { repository: 'user/repo' };

      const beforeTime = new Date().toISOString();
      const result = await execute(options, settings);
      const afterTime = new Date().toISOString();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.timestamp >= beforeTime).toBe(true);
      expect(result.timestamp <= afterTime).toBe(true);
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

    it('should handle repository without .git suffix', () => {
      execSync.mockReturnValue('git@github.com:user/no-git-suffix\n');

      const repo = detectRepository();

      expect(repo).toBe('user/no-git-suffix');
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

    it('should handle malformed remote URLs', () => {
      execSync.mockReturnValue('invalid-remote-url\n');

      const repo = detectRepository();

      expect(repo).toBe(null);
    });
  });

  describe('mockCloseIssue()', () => {
    it('should return mock response with basic options', () => {
      const options = { id: '123' };
      const repository = 'user/repo';

      const result = mockCloseIssue(options, repository);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('123');
      expect(result.issue.status).toBe('closed');
      expect(result.issue.resolution).toBe('fixed');
      expect(result.issue.url).toBe('https://github.com/user/repo/issues/123');
      expect(result.actions).toContain('Closed issue');
      expect(result.actions).toContain('Deleted branch feature/issue-123');
      expect(console.log).toHaveBeenCalledWith('🔒 Would close issue #123');
    });

    it('should include comment in mock response', () => {
      const options = {
        id: '456',
        comment: 'Test comment'
      };
      const repository = 'user/repo';

      const result = mockCloseIssue(options, repository);

      expect(result.actions).toContain('Added closing comment');
      expect(console.log).toHaveBeenCalledWith('💬 Would add comment: Test comment');
    });

    it('should include resolution in mock response', () => {
      const options = {
        id: '789',
        resolution: 'wontfix'
      };
      const repository = 'user/repo';

      const result = mockCloseIssue(options, repository);

      expect(result.actions).toContain('Added resolution: wontfix');
      expect(result.issue.resolution).toBe('wontfix');
      expect(console.log).toHaveBeenCalledWith('🏷️  Would add resolution: wontfix');
    });

    it('should not delete branch when no_branch_delete is true', () => {
      const options = {
        id: '101',
        no_branch_delete: true
      };
      const repository = 'user/repo';

      const result = mockCloseIssue(options, repository);

      expect(result.actions).not.toContain('Deleted branch feature/issue-101');
      expect(console.log).not.toHaveBeenCalledWith('🌿 Would delete branch: feature/issue-101');
    });

    it('should include all options in comprehensive mock', () => {
      const options = {
        id: '999',
        comment: 'Comprehensive test',
        resolution: 'duplicate'
      };
      const repository = 'user/test-repo';

      const result = mockCloseIssue(options, repository);

      expect(result.actions).toEqual([
        'Closed issue',
        'Added closing comment',
        'Added resolution: duplicate',
        'Deleted branch feature/issue-999'
      ]);
      expect(result.issue.resolution).toBe('duplicate');
      expect(result.issue.url).toBe('https://github.com/user/test-repo/issues/999');
    });

    it('should generate valid timestamp', () => {
      const options = { id: '202' };
      const repository = 'user/repo';

      const result = mockCloseIssue(options, repository);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const githubIssueClose = require('../../autopm/.claude/providers/github/issue-close.js');

      expect(githubIssueClose).toHaveProperty('execute');
      expect(githubIssueClose).toHaveProperty('GitHubIssueClose');
      expect(githubIssueClose).toHaveProperty('detectRepository');
      expect(githubIssueClose).toHaveProperty('mockCloseIssue');
    });

    it('should handle edge cases in repository detection', () => {
      // Test various GitHub URL formats
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

    it('should handle numeric issue IDs correctly', async () => {
      const options = { id: 42 };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.issue.id).toBe(42);
      expect(result.issue.url).toBe('https://github.com/user/repo/issues/42');
    });

    it('should handle string issue IDs correctly', async () => {
      const options = { id: '1337' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.issue.id).toBe('1337');
      expect(result.issue.url).toBe('https://github.com/user/repo/issues/1337');
    });

    it('should work with realistic workflow', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '42',
        comment: 'Fixed the critical bug in user authentication',
        resolution: 'fixed'
      };
      const settings = { repository: 'company/webapp' };

      execSync.mockReturnValue('');

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('42');
      expect(result.issue.status).toBe('closed');
      expect(result.issue.resolution).toBe('fixed');
      expect(result.actions).toHaveLength(4); // close, comment, resolution, branch
      expect(result.issue.url).toBe('https://github.com/company/webapp/issues/42');

      // Verify all GitHub CLI commands were called
      expect(execSync).toHaveBeenCalledWith(
        'gh issue close 42 --repo company/webapp',
        { stdio: 'inherit' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh issue comment 42 --repo company/webapp --body "Fixed the critical bug in user authentication"',
        { stdio: 'inherit' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh issue edit 42 --repo company/webapp --add-label "resolution:fixed"',
        { stdio: 'inherit' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'git branch -d feature/issue-42',
        { stdio: 'inherit' }
      );
    });
  });
});