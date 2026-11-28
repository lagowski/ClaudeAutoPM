// Mock child_process before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const {
  GitHubEpicList,
  execute,
  detectRepository,
  buildQuery,
  executeGitHubCLI,
  transformResults,
  mapStatus,
  countChildren,
  countCompleted,
  getMockData
} = require('../../autopm/.claude/providers/github/epic-list.js');

const { execSync } = require('child_process');

describe('GitHubEpicList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTOPM_USE_REAL_API;
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new GitHubEpicList();
      expect(instance).toBeInstanceOf(GitHubEpicList);
    });
  });

  describe('execute()', () => {
    it('should use mock data by default', async () => {
      const options = {};
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('status');
      expect(console.log).toHaveBeenCalledWith('📊 Using mock data (set AUTOPM_USE_REAL_API=true for real API)');
    });

    it('should detect repository when not provided in settings', async () => {
      const options = {};
      const settings = {};

      // Mock detectRepository to return a repo
      execSync.mockReturnValueOnce('git@github.com:user/detected-repo.git\n');

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when repository cannot be detected', async () => {
      const options = {};
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
      const options = {};
      const settings = { repository: 'user/test-repo' };

      // Mock successful gh command
      const mockGHOutput = JSON.stringify([
        {
          number: 101,
          title: 'Test Epic',
          body: 'Test description',
          state: 'open',
          assignees: [{ login: 'testuser' }],
          labels: [{ name: 'epic' }],
          url: 'https://github.com/user/test-repo/issues/101',
          milestone: { title: 'v1.0' }
        }
      ]);
      execSync.mockReturnValue(mockGHOutput);

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe('101');
      expect(result[0].title).toBe('Test Epic');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh issue list --repo user/test-repo --label epic'),
        { encoding: 'utf8' }
      );
    });

    it('should fallback to mock data when GitHub CLI fails', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {};
      const settings = { repository: 'user/test-repo' };

      execSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('GitHub CLI error, returning mock data:'),
        expect.any(String)
      );
    });

    it('should filter results based on options', async () => {
      const options = { status: 'closed' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      // Should only return completed epics
      result.forEach(epic => {
        expect(epic.status).toBe('completed');
      });
    });

    it('should filter by assignee', async () => {
      const options = { assignee: 'developer1' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(epic => {
        expect(epic.assignee).toBe('developer1');
      });
    });

    it('should filter by label', async () => {
      const options = { label: 'backend' };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(epic => {
        expect(epic.labels).toContain('backend');
      });
    });

    it('should limit results', async () => {
      const options = { limit: 1 };
      const settings = { repository: 'user/repo' };

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
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

  describe('buildQuery()', () => {
    it('should build basic query', () => {
      const repository = 'user/repo';
      const options = {};

      const query = buildQuery(repository, options);

      expect(query).toBe(
        'gh issue list --repo user/repo --label epic --state open --json number,title,body,state,assignees,labels,url,milestone'
      );
    });

    it('should build query with closed status', () => {
      const repository = 'user/repo';
      const options = { status: 'closed' };

      const query = buildQuery(repository, options);

      expect(query).toContain('--state closed');
    });

    it('should build query with all status', () => {
      const repository = 'user/repo';
      const options = { status: 'all' };

      const query = buildQuery(repository, options);

      expect(query).toContain('--state all');
    });

    it('should build query with assignee', () => {
      const repository = 'user/repo';
      const options = { assignee: 'developer1' };

      const query = buildQuery(repository, options);

      expect(query).toContain('--assignee developer1');
    });

    it('should build query with additional label', () => {
      const repository = 'user/repo';
      const options = { label: 'backend' };

      const query = buildQuery(repository, options);

      expect(query).toContain('--label backend');
    });

    it('should not add epic label twice', () => {
      const repository = 'user/repo';
      const options = { label: 'epic' };

      const query = buildQuery(repository, options);

      // Should only have one --label epic
      const matches = query.match(/--label epic/g);
      expect(matches).toHaveLength(1);
    });

    it('should build query with limit', () => {
      const repository = 'user/repo';
      const options = { limit: 10 };

      const query = buildQuery(repository, options);

      expect(query).toContain('--limit 10');
    });

    it('should build query with all options', () => {
      const repository = 'user/repo';
      const options = {
        status: 'all',
        assignee: 'developer1',
        label: 'backend',
        limit: 5
      };

      const query = buildQuery(repository, options);

      expect(query).toContain('--repo user/repo');
      expect(query).toContain('--label epic');
      expect(query).toContain('--state all');
      expect(query).toContain('--assignee developer1');
      expect(query).toContain('--label backend');
      expect(query).toContain('--limit 5');
      expect(query).toContain('--json number,title,body,state,assignees,labels,url,milestone');
    });
  });

  describe('executeGitHubCLI()', () => {
    it('should execute GitHub CLI command successfully', () => {
      const query = 'gh issue list --repo user/repo --label epic';
      const mockOutput = JSON.stringify([{ number: 1, title: 'Test' }]);
      execSync.mockReturnValue(mockOutput);

      const result = executeGitHubCLI(query);

      expect(result).toEqual([{ number: 1, title: 'Test' }]);
      expect(execSync).toHaveBeenCalledWith(query, { encoding: 'utf8' });
    });

    it('should handle gh command not found error', () => {
      const query = 'gh issue list --repo user/repo --label epic';
      const error = new Error('Command failed');
      error.stderr = 'gh: command not found';
      execSync.mockImplementation(() => {
        throw error;
      });

      expect(() => executeGitHubCLI(query)).toThrow('gh: command not found');
    });

    it('should handle other GitHub CLI errors', () => {
      const query = 'gh issue list --repo user/repo --label epic';
      execSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      expect(() => executeGitHubCLI(query)).toThrow('GitHub CLI error: API rate limit exceeded');
    });

    it('should handle invalid JSON response', () => {
      const query = 'gh issue list --repo user/repo --label epic';
      execSync.mockReturnValue('invalid json');

      expect(() => executeGitHubCLI(query)).toThrow();
    });
  });

  describe('transformResults()', () => {
    it('should transform GitHub issues to unified format', () => {
      const githubIssues = [
        {
          number: 101,
          title: 'Test Epic',
          body: 'Test description',
          state: 'open',
          assignees: [{ login: 'testuser' }],
          labels: [{ name: 'epic' }, { name: 'backend' }],
          url: 'https://github.com/user/repo/issues/101',
          milestone: { title: 'v1.0' }
        }
      ];

      const result = transformResults(githubIssues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '101',
        title: 'Test Epic',
        description: 'Test description',
        status: 'open',
        assignee: 'testuser',
        labels: ['epic', 'backend'],
        childCount: expect.any(Number),
        completedCount: expect.any(Number),
        url: 'https://github.com/user/repo/issues/101',
        milestone: 'v1.0'
      });
    });

    it('should handle issues with no assignees', () => {
      const githubIssues = [
        {
          number: 102,
          title: 'Unassigned Epic',
          body: null,
          state: 'closed',
          assignees: [],
          labels: [],
          url: 'https://github.com/user/repo/issues/102',
          milestone: null
        }
      ];

      const result = transformResults(githubIssues);

      expect(result[0]).toEqual({
        id: '102',
        title: 'Unassigned Epic',
        description: '',
        status: 'completed',
        assignee: null,
        labels: [],
        childCount: expect.any(Number),
        completedCount: expect.any(Number),
        url: 'https://github.com/user/repo/issues/102',
        milestone: null
      });
    });

    it('should handle multiple issues', () => {
      const githubIssues = [
        {
          number: 101,
          title: 'Epic 1',
          body: 'Description 1',
          state: 'open',
          assignees: [{ login: 'user1' }],
          labels: [{ name: 'epic' }],
          url: 'https://github.com/user/repo/issues/101',
          milestone: { title: 'v1.0' }
        },
        {
          number: 102,
          title: 'Epic 2',
          body: 'Description 2',
          state: 'closed',
          assignees: [{ login: 'user2' }],
          labels: [{ name: 'epic' }],
          url: 'https://github.com/user/repo/issues/102',
          milestone: { title: 'v1.1' }
        }
      ];

      const result = transformResults(githubIssues);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('101');
      expect(result[1].id).toBe('102');
    });
  });

  describe('mapStatus()', () => {
    it('should map open status correctly', () => {
      expect(mapStatus('open')).toBe('open');
      expect(mapStatus('OPEN')).toBe('open');
    });

    it('should map closed status correctly', () => {
      expect(mapStatus('closed')).toBe('completed');
      expect(mapStatus('CLOSED')).toBe('completed');
    });

    it('should handle unknown status', () => {
      expect(mapStatus('unknown')).toBe('unknown');
      expect(mapStatus('draft')).toBe('unknown');
    });

    it('should handle null/undefined status', () => {
      expect(mapStatus(null)).toBe('unknown');
      expect(mapStatus(undefined)).toBe('unknown');
    });
  });

  describe('countChildren()', () => {
    it('should return mock child count based on issue number', () => {
      const issue = { number: 25 };
      const count = countChildren(issue);

      expect(count).toBe(6); // 25 % 10 + 1 = 6
      expect(typeof count).toBe('number');
    });

    it('should handle different issue numbers', () => {
      expect(countChildren({ number: 10 })).toBe(1); // 10 % 10 + 1 = 1
      expect(countChildren({ number: 19 })).toBe(10); // 19 % 10 + 1 = 10
      expect(countChildren({ number: 101 })).toBe(2); // 101 % 10 + 1 = 2
    });
  });

  describe('countCompleted()', () => {
    it('should return mock completed count based on total children', () => {
      const issue = { number: 25 };
      const completed = countCompleted(issue);
      const total = countChildren(issue);

      expect(completed).toBe(Math.floor(total * 0.4));
      expect(completed).toBeLessThanOrEqual(total);
    });

    it('should handle different issue numbers consistently', () => {
      const issue1 = { number: 10 };
      const issue2 = { number: 19 };

      const completed1 = countCompleted(issue1);
      const total1 = countChildren(issue1);

      const completed2 = countCompleted(issue2);
      const total2 = countChildren(issue2);

      expect(completed1).toBe(Math.floor(total1 * 0.4));
      expect(completed2).toBe(Math.floor(total2 * 0.4));
    });
  });

  describe('getMockData()', () => {
    it('should return mock epics by default', () => {
      const options = {};
      const result = getMockData(options);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // 2 open epics by default
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('labels');
    });

    it('should filter by status - closed', () => {
      const options = { status: 'closed' };
      const result = getMockData(options);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('should filter by status - all', () => {
      const options = { status: 'all' };
      const result = getMockData(options);

      expect(result).toHaveLength(3); // All 3 mock epics
    });

    it('should filter by assignee', () => {
      const options = { assignee: 'developer1' };
      const result = getMockData(options);

      expect(result).toHaveLength(1);
      expect(result[0].assignee).toBe('developer1');
    });

    it('should filter by label', () => {
      const options = { label: 'backend', status: 'all' };
      const result = getMockData(options);

      expect(result).toHaveLength(2);
      result.forEach(epic => {
        expect(epic.labels).toContain('backend');
      });
    });

    it('should limit results', () => {
      const options = { status: 'all', limit: 2 };
      const result = getMockData(options);

      expect(result).toHaveLength(2);
    });

    it('should apply multiple filters', () => {
      const options = {
        status: 'all',
        label: 'backend',
        limit: 1
      };
      const result = getMockData(options);

      expect(result).toHaveLength(1);
      expect(result[0].labels).toContain('backend');
    });

    it('should return empty array when no matches', () => {
      const options = { assignee: 'nonexistent' };
      const result = getMockData(options);

      expect(result).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const githubEpicList = require('../../autopm/.claude/providers/github/epic-list.js');

      expect(githubEpicList).toHaveProperty('execute');
      expect(githubEpicList).toHaveProperty('GitHubEpicList');
      expect(githubEpicList).toHaveProperty('detectRepository');
      expect(githubEpicList).toHaveProperty('buildQuery');
      expect(githubEpicList).toHaveProperty('executeGitHubCLI');
      expect(githubEpicList).toHaveProperty('transformResults');
      expect(githubEpicList).toHaveProperty('mapStatus');
      expect(githubEpicList).toHaveProperty('countChildren');
      expect(githubEpicList).toHaveProperty('countCompleted');
      expect(githubEpicList).toHaveProperty('getMockData');
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

    it('should work with realistic GitHub API response', () => {
      const mockGitHubResponse = [
        {
          number: 101,
          title: 'Authentication System Implementation',
          body: 'Implement complete authentication system with JWT tokens, OAuth integration, and multi-factor authentication support.',
          state: 'open',
          assignees: [{ login: 'developer1' }, { login: 'security-lead' }],
          labels: [
            { name: 'epic' },
            { name: 'enhancement' },
            { name: 'backend' },
            { name: 'security' }
          ],
          url: 'https://github.com/company/webapp/issues/101',
          milestone: { title: 'v2.0.0' }
        },
        {
          number: 102,
          title: 'Dashboard Redesign',
          body: 'Complete redesign of the admin dashboard with new UI components and improved UX.',
          state: 'closed',
          assignees: [{ login: 'ui-designer' }],
          labels: [
            { name: 'epic' },
            { name: 'ui' },
            { name: 'frontend' }
          ],
          url: 'https://github.com/company/webapp/issues/102',
          milestone: { title: 'v1.9.0' }
        }
      ];

      const result = transformResults(mockGitHubResponse);

      expect(result).toHaveLength(2);

      // First epic
      expect(result[0]).toEqual({
        id: '101',
        title: 'Authentication System Implementation',
        description: 'Implement complete authentication system with JWT tokens, OAuth integration, and multi-factor authentication support.',
        status: 'open',
        assignee: 'developer1', // First assignee
        labels: ['epic', 'enhancement', 'backend', 'security'],
        childCount: 2, // 101 % 10 + 1 = 2
        completedCount: 0, // Math.floor(2 * 0.4) = 0
        url: 'https://github.com/company/webapp/issues/101',
        milestone: 'v2.0.0'
      });

      // Second epic
      expect(result[1]).toEqual({
        id: '102',
        title: 'Dashboard Redesign',
        description: 'Complete redesign of the admin dashboard with new UI components and improved UX.',
        status: 'completed',
        assignee: 'ui-designer',
        labels: ['epic', 'ui', 'frontend'],
        childCount: 3, // 102 % 10 + 1 = 3
        completedCount: 1, // Math.floor(3 * 0.4) = 1
        url: 'https://github.com/company/webapp/issues/102',
        milestone: 'v1.9.0'
      });
    });

    it('should handle comprehensive workflow', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {
        status: 'all',
        assignee: 'developer1',
        label: 'backend',
        limit: 10
      };
      const settings = { repository: 'company/webapp' };

      const mockGHOutput = JSON.stringify([
        {
          number: 101,
          title: 'Authentication Epic',
          body: 'Complete auth system',
          state: 'open',
          assignees: [{ login: 'developer1' }],
          labels: [{ name: 'epic' }, { name: 'backend' }],
          url: 'https://github.com/company/webapp/issues/101',
          milestone: { title: 'v2.0' }
        }
      ]);
      execSync.mockReturnValue(mockGHOutput);

      const result = await execute(options, settings);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('101');
      expect(result[0].assignee).toBe('developer1');
      expect(result[0].labels).toContain('backend');

      // Verify GitHub CLI was called with correct parameters
      expect(execSync).toHaveBeenCalledWith(
        'gh issue list --repo company/webapp --label epic --state all --assignee developer1 --label backend --limit 10 --json number,title,body,state,assignees,labels,url,milestone',
        { encoding: 'utf8' }
      );
    });

    it('should handle empty GitHub response', () => {
      const emptyResponse = [];
      const result = transformResults(emptyResponse);

      expect(result).toEqual([]);
    });
  });
});