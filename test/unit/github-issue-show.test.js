// Mock child_process before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const {
  GitHubIssueShow,
  execute,
  detectRepository,
  parseComments,
  getRelatedPRs,
  mockShowIssue
} = require('../../autopm/.claude/providers/github/issue-show.js');

const { execSync } = require('child_process');

describe('GitHubIssueShow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTOPM_USE_REAL_API;
    console.log = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new GitHubIssueShow();
      expect(instance).toBeInstanceOf(GitHubIssueShow);
    });
  });

  describe('execute()', () => {
    it('should use mock implementation by default', async () => {
      const options = { id: '123' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(result.id).toBe('123');
      expect(result.title).toContain('Mock Issue #123');
      expect(console.log).toHaveBeenCalledWith('📊 Using mock implementation');
    });

    it('should throw error when issue ID is missing', async () => {
      const options = {};
      const settings = { repository: 'user/repo' };

      await expect(execute(options, settings)).rejects.toThrow(
        'Issue ID is required. Usage: issue:show <issue-id>'
      );
    });

    it('should detect repository when not provided in settings', async () => {
      const options = { id: '456' };
      const settings = {};

      // Mock detectRepository to return a repo
      execSync.mockReturnValueOnce('git@github.com:user/detected-repo.git\n');

      const result = await execute(options, settings);

      // In mock mode, URL is hardcoded, but the test verifies detectRepository was called
      expect(result.id).toBe('456');
      expect(execSync).toHaveBeenCalledWith('git remote get-url origin', { encoding: 'utf8' });
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

      const mockIssue = {
        number: 100,
        title: 'Real Test Issue',
        body: 'This is a real issue description',
        state: 'open',
        assignees: [{ login: 'user1' }, { login: 'user2' }],
        labels: [{ name: 'bug' }, { name: 'urgent' }],
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z',
        url: 'https://github.com/user/test-repo/issues/100',
        milestone: { title: 'v1.0' }
      };

      execSync.mockReturnValue(JSON.stringify(mockIssue));

      const result = await execute(options, settings);

      expect(result.id).toBe('100');
      expect(result.title).toBe('Real Test Issue');
      expect(result.description).toBe('This is a real issue description');
      expect(result.status).toBe('open');
      expect(result.assignees).toEqual(['user1', 'user2']);
      expect(result.labels).toEqual(['bug', 'urgent']);
      expect(result.milestone).toBe('v1.0');
      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 100 --repo user/test-repo --json number,title,body,state,assignees,labels,createdAt,updatedAt,url,milestone',
        { encoding: 'utf8' }
      );
    });

    it('should include comments when requested in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '200', comments: true };
      const settings = { repository: 'user/test-repo' };

      const mockIssue = {
        number: 200,
        title: 'Issue with comments',
        body: 'Description',
        state: 'open',
        assignees: [],
        labels: [],
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z',
        url: 'https://github.com/user/test-repo/issues/200',
        milestone: null
      };

      execSync.mockReturnValueOnce(JSON.stringify(mockIssue));
      execSync.mockReturnValueOnce('Comment output'); // For comments

      const result = await execute(options, settings);

      expect(result.comments).toEqual(['Comment parsing would be implemented here']);
      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 200 --repo user/test-repo --comments',
        { encoding: 'utf8' }
      );
    });

    it('should include related PRs when requested in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '300', related: true };
      const settings = { repository: 'user/test-repo' };

      const mockIssue = {
        number: 300,
        title: 'Issue with PRs',
        body: 'Description',
        state: 'open',
        assignees: [],
        labels: [],
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z',
        url: 'https://github.com/user/test-repo/issues/300',
        milestone: null
      };

      const mockPRs = [
        { number: 301, title: 'Fix for issue #300', state: 'OPEN' }
      ];

      execSync.mockReturnValueOnce(JSON.stringify(mockIssue));
      execSync.mockReturnValueOnce(JSON.stringify(mockPRs));

      const result = await execute(options, settings);

      expect(result.relatedPRs).toEqual(mockPRs);
    });

    it('should handle GitHub CLI errors', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '999' };
      const settings = { repository: 'user/test-repo' };

      execSync.mockImplementation(() => {
        throw new Error('Issue not found');
      });

      await expect(execute(options, settings)).rejects.toThrow('Issue not found');
    });

    it('should handle missing optional fields in real API response', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '400' };
      const settings = { repository: 'user/test-repo' };

      const minimalIssue = {
        number: 400,
        title: 'Minimal Issue',
        body: null,
        state: 'closed',
        assignees: null,
        labels: null,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T15:30:00Z',
        url: 'https://github.com/user/test-repo/issues/400',
        milestone: null
      };

      execSync.mockReturnValue(JSON.stringify(minimalIssue));

      const result = await execute(options, settings);

      expect(result.assignees).toEqual([]);
      expect(result.labels).toEqual([]);
      expect(result.milestone).toBe(null);
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

    it('should handle repository without .git suffix', () => {
      execSync.mockReturnValue('git@github.com:user/no-git-suffix\n');

      const repo = detectRepository();

      expect(repo).toBe('user/no-git-suffix');
    });
  });

  describe('parseComments()', () => {
    it('should return placeholder implementation', () => {
      const output = 'Some comment output';

      const result = parseComments(output);

      expect(result).toEqual(['Comment parsing would be implemented here']);
    });

    it('should handle empty output', () => {
      const output = '';

      const result = parseComments(output);

      expect(result).toEqual(['Comment parsing would be implemented here']);
    });
  });

  describe('getRelatedPRs()', () => {
    it('should return related PRs when found', () => {
      const mockPRs = [
        { number: 101, title: 'PR for issue #100', state: 'OPEN' },
        { number: 102, title: 'Another PR mentioning #100', state: 'MERGED' }
      ];

      execSync.mockReturnValue(JSON.stringify(mockPRs));

      const result = getRelatedPRs('user/repo', '100');

      expect(result).toEqual(mockPRs);
      expect(execSync).toHaveBeenCalledWith(
        'gh pr list --repo user/repo --search "100 in:title,body" --json number,title,state',
        { encoding: 'utf8' }
      );
    });

    it('should return empty array when no PRs found', () => {
      execSync.mockReturnValue('[]');

      const result = getRelatedPRs('user/repo', '999');

      expect(result).toEqual([]);
    });

    it('should return empty array when command fails', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = getRelatedPRs('user/repo', '123');

      expect(result).toEqual([]);
    });
  });

  describe('mockShowIssue()', () => {
    it('should return mock issue with basic details', () => {
      const options = { id: '123' };

      const result = mockShowIssue(options);

      expect(result.id).toBe('123');
      expect(result.title).toBe('Mock Issue #123: Authentication System');
      expect(result.description).toBe('Implement JWT-based authentication with refresh tokens');
      expect(result.status).toBe('open');
      expect(result.assignees).toEqual(['developer1', 'developer2']);
      expect(result.labels).toEqual(['enhancement', 'backend', 'priority-high']);
      expect(result.createdAt).toBe('2024-01-10T10:00:00Z');
      expect(result.updatedAt).toBe('2024-01-15T15:30:00Z');
      expect(result.url).toBe('https://github.com/owner/repo/issues/123');
      expect(result.milestone).toBe('v2.0');
    });

    it('should include comments when requested', () => {
      const options = { id: '456', comments: true };

      const result = mockShowIssue(options);

      expect(result.comments).toEqual([
        'Initial implementation plan approved',
        'Added refresh token functionality',
        'Security review requested'
      ]);
      expect(console.log).toHaveBeenCalledWith('\n💬 Comments:');
    });

    it('should include related PRs when requested', () => {
      const options = { id: '789', related: true };

      const result = mockShowIssue(options);

      expect(result.relatedPRs).toEqual([
        { number: 456, title: 'feat: Add JWT auth (#789)', state: 'OPEN' }
      ]);
      expect(console.log).toHaveBeenCalledWith('\n🔗 Related PRs:');
    });

    it('should include both comments and PRs when both requested', () => {
      const options = { id: '101', comments: true, related: true };

      const result = mockShowIssue(options);

      expect(result.comments).toBeDefined();
      expect(result.relatedPRs).toBeDefined();
      expect(result.comments.length).toBe(3);
      expect(result.relatedPRs.length).toBe(1);
    });

    it('should display formatted output to console', () => {
      const options = { id: '202' };

      mockShowIssue(options);

      expect(console.log).toHaveBeenCalledWith('\n📋 Issue #202: Mock Issue #202: Authentication System');
      expect(console.log).toHaveBeenCalledWith('\n📝 Description:\nImplement JWT-based authentication with refresh tokens');
      expect(console.log).toHaveBeenCalledWith('\n📊 Details:');
      expect(console.log).toHaveBeenCalledWith('   Status: open');
      expect(console.log).toHaveBeenCalledWith('   Assignees: developer1, developer2');
      expect(console.log).toHaveBeenCalledWith('   Labels: enhancement, backend, priority-high');
      expect(console.log).toHaveBeenCalledWith('   Milestone: v2.0');
      expect(console.log).toHaveBeenCalledWith('   URL: https://github.com/owner/repo/issues/202');
    });

    it('should handle different issue IDs correctly', () => {
      const numericId = { id: 999 };
      const stringId = { id: '888' };

      const numericResult = mockShowIssue(numericId);
      const stringResult = mockShowIssue(stringId);

      expect(numericResult.id).toBe(999);
      expect(stringResult.id).toBe('888');
      expect(numericResult.url).toBe('https://github.com/owner/repo/issues/999');
      expect(stringResult.url).toBe('https://github.com/owner/repo/issues/888');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const githubIssueShow = require('../../autopm/.claude/providers/github/issue-show.js');

      expect(githubIssueShow).toHaveProperty('execute');
      expect(githubIssueShow).toHaveProperty('GitHubIssueShow');
      expect(githubIssueShow).toHaveProperty('detectRepository');
      expect(githubIssueShow).toHaveProperty('parseComments');
      expect(githubIssueShow).toHaveProperty('getRelatedPRs');
      expect(githubIssueShow).toHaveProperty('mockShowIssue');
    });

    it('should handle realistic workflow in mock mode', async () => {
      const options = {
        id: '42',
        comments: true,
        related: true
      };
      const settings = { repository: 'company/webapp' };

      const result = await execute(options, settings);

      expect(result.id).toBe('42');
      expect(result.title).toContain('Authentication System');
      expect(result.comments).toBeDefined();
      expect(result.relatedPRs).toBeDefined();
      expect(result.url).toBe('https://github.com/owner/repo/issues/42');
    });

    it('should handle realistic workflow in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        id: '42',
        comments: true,
        related: true
      };
      const settings = { repository: 'company/webapp' };

      const mockIssue = {
        number: 42,
        title: 'Critical Authentication Bug',
        body: 'Users cannot log in after recent update',
        state: 'open',
        assignees: [{ login: 'securityteam' }],
        labels: [{ name: 'critical' }, { name: 'bug' }],
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        url: 'https://github.com/company/webapp/issues/42',
        milestone: { title: 'Hotfix v1.2.1' }
      };

      const mockPRs = [
        { number: 43, title: 'Hotfix: Authentication bug #42', state: 'OPEN' }
      ];

      execSync.mockReturnValueOnce(JSON.stringify(mockIssue)); // issue data
      execSync.mockReturnValueOnce('Comments output'); // comments
      execSync.mockReturnValueOnce(JSON.stringify(mockPRs)); // related PRs

      const result = await execute(options, settings);

      expect(result.id).toBe('42');
      expect(result.title).toBe('Critical Authentication Bug');
      expect(result.assignees).toEqual(['securityteam']);
      expect(result.labels).toEqual(['critical', 'bug']);
      expect(result.milestone).toBe('Hotfix v1.2.1');
      expect(result.comments).toBeDefined();
      expect(result.relatedPRs).toEqual(mockPRs);
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

    it('should handle various issue ID formats', async () => {
      const testCases = [
        { id: 123 },
        { id: '456' },
        { id: '0001' }
      ];

      for (const options of testCases) {
        const settings = { repository: 'user/repo' };
        const result = await execute(options, settings);
        expect(result.id).toBe(options.id);
      }
    });

    it('should handle malformed JSON gracefully in real API mode', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { id: '500' };
      const settings = { repository: 'user/repo' };

      execSync.mockReturnValue('invalid json response');

      await expect(execute(options, settings)).rejects.toThrow();
    });
  });
});