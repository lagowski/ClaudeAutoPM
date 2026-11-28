// Mock child_process before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const {
  GitHubEpicShow,
  execute,
  formatEpicDetails
} = require('../../autopm/.claude/providers/github/epic-show.js');

const { execSync } = require('child_process');

describe('GitHubEpicShow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new GitHubEpicShow();
      expect(instance).toBeInstanceOf(GitHubEpicShow);
    });
  });

  describe('execute()', () => {
    const mockIssue = {
      number: 101,
      title: 'Authentication System Implementation',
      body: 'Implement complete authentication system with JWT tokens',
      state: 'OPEN',
      assignees: [{ login: 'developer1' }, { login: 'security-lead' }],
      labels: [
        { name: 'epic' },
        { name: 'enhancement' },
        { name: 'backend' }
      ],
      milestone: {
        title: 'v2.0',
        dueOn: '2024-12-31T00:00:00Z'
      },
      projectItems: [
        {
          project: { title: 'Development Board' },
          status: 'In Progress'
        }
      ],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-15T15:30:00Z',
      url: 'https://github.com/user/repo/issues/101'
    };

    const mockChildren = [
      {
        number: 102,
        title: 'Implement JWT token generation',
        state: 'CLOSED',
        assignees: [{ login: 'developer1' }],
        labels: [{ name: 'backend' }]
      },
      {
        number: 103,
        title: 'Add OAuth integration',
        state: 'OPEN',
        assignees: [],
        labels: [{ name: 'backend' }]
      },
      {
        number: 104,
        title: 'Implement password reset',
        state: 'OPEN',
        assignees: [{ login: 'developer2' }],
        labels: [{ name: 'backend' }]
      }
    ];

    it('should throw error when epic ID is missing', async () => {
      const options = {};
      const settings = {};

      const result = await execute(options, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Epic ID is required');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to show epic: Epic ID is required');
    });

    it('should successfully show epic with children', async () => {
      const options = { id: '101' };
      const settings = {};

      // Mock the gh issue view command
      execSync
        .mockReturnValueOnce(JSON.stringify(mockIssue))
        .mockReturnValueOnce(JSON.stringify(mockChildren));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic.id).toBe(101);
      expect(result.epic.title).toBe('Authentication System Implementation');
      expect(result.epic.state).toBe('OPEN');
      expect(result.epic.url).toBe('https://github.com/user/repo/issues/101');

      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 101 --json number,title,body,state,assignees,labels,milestone,projectItems,createdAt,updatedAt,url',
        { encoding: 'utf8' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh issue list --search "is:issue references:101" --json number,title,state,assignees,labels --limit 100',
        { encoding: 'utf8' }
      );

      expect(console.log).toHaveBeenCalled();
    });

    it('should warn when issue is not labeled as epic', async () => {
      const nonEpicIssue = {
        ...mockIssue,
        labels: [{ name: 'bug' }, { name: 'backend' }]
      };

      const options = { id: '102' };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(nonEpicIssue))
        .mockReturnValueOnce(JSON.stringify([]));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('⚠️ Issue #102 is not labeled as an epic/feature');
    });

    it('should recognize feature label as epic', async () => {
      const featureIssue = {
        ...mockIssue,
        labels: [{ name: 'feature' }, { name: 'enhancement' }]
      };

      const options = { id: '103' };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(featureIssue))
        .mockReturnValueOnce(JSON.stringify([]));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive label matching', async () => {
      const epicIssue = {
        ...mockIssue,
        labels: [{ name: 'EPIC' }, { name: 'FEATURE-REQUEST' }]
      };

      const options = { id: '104' };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(epicIssue))
        .mockReturnValueOnce(JSON.stringify([]));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle epic without children', async () => {
      const options = { id: '105' };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(mockIssue))
        .mockReturnValueOnce(JSON.stringify([]));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic.id).toBe(101);
    });

    it('should handle children search failure gracefully', async () => {
      const options = { id: '106' };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(mockIssue))
        .mockImplementationOnce(() => {
          throw new Error('Search failed');
        });

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic.id).toBe(101);
    });

    it('should handle GitHub CLI error', async () => {
      const options = { id: '107' };
      const settings = {};

      execSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });

      const result = await execute(options, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('gh: command not found');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to show epic: gh: command not found');
    });

    it('should handle invalid JSON response', async () => {
      const options = { id: '108' };
      const settings = {};

      execSync.mockReturnValue('invalid json');

      const result = await execute(options, settings);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Unexpected token/);
    });

    it('should handle numeric issue ID', async () => {
      const options = { id: 109 };
      const settings = {};

      execSync
        .mockReturnValueOnce(JSON.stringify(mockIssue))
        .mockReturnValueOnce(JSON.stringify([]));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 109 --json number,title,body,state,assignees,labels,milestone,projectItems,createdAt,updatedAt,url',
        { encoding: 'utf8' }
      );
    });
  });

  describe('formatEpicDetails()', () => {
    const mockIssue = {
      number: 101,
      title: 'Authentication System Implementation',
      body: 'Implement complete authentication system with JWT tokens and OAuth integration',
      state: 'OPEN',
      assignees: [{ login: 'developer1' }, { login: 'security-lead' }],
      labels: [
        { name: 'epic' },
        { name: 'enhancement' },
        { name: 'backend' }
      ],
      milestone: {
        title: 'v2.0',
        dueOn: '2024-12-31T00:00:00Z'
      },
      projectItems: [
        {
          project: { title: 'Development Board' },
          status: 'In Progress'
        }
      ],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-15T15:30:00Z',
      url: 'https://github.com/user/repo/issues/101'
    };

    const mockChildren = [
      {
        number: 102,
        title: 'Implement JWT token generation',
        state: 'CLOSED',
        assignees: [{ login: 'developer1' }],
        labels: [{ name: 'backend' }]
      },
      {
        number: 103,
        title: 'Add OAuth integration',
        state: 'OPEN',
        assignees: [],
        labels: [{ name: 'backend' }]
      }
    ];

    it('should format complete epic details', () => {
      const output = formatEpicDetails(mockIssue, mockChildren);

      expect(output).toContain('# Epic #101: Authentication System Implementation');
      expect(output).toContain('**Status:** 🟢 OPEN');
      expect(output).toContain('**Assignees:** developer1, security-lead');
      expect(output).toContain('**Milestone:** v2.0');
      expect(output).toContain('**Due Date:** 12/31/2024');
      expect(output).toContain('**Labels:** epic, enhancement, backend');
      expect(output).toContain('## Projects');
      expect(output).toContain('- Development Board: In Progress');
      expect(output).toContain('## Description');
      expect(output).toContain('Implement complete authentication system');
      expect(output).toContain('## Related Issues (2)');
      expect(output).toContain('### Open (1)');
      expect(output).toContain('🟢 #103 Add OAuth integration (Unassigned)');
      expect(output).toContain('### Closed (1)');
      expect(output).toContain('✅ #102 Implement JWT token generation');
      expect(output).toContain('**Progress:** 1/2 issues completed (50%)');
      expect(output).toContain('## Timeline');
      expect(output).toContain('**Created:** 1/1/2024');
      expect(output).toContain('**Last Updated:** 1/15/2024');
      expect(output).toContain('🔗 [View on GitHub](https://github.com/user/repo/issues/101)');
    });

    it('should handle closed epic state', () => {
      const closedIssue = { ...mockIssue, state: 'CLOSED' };
      const output = formatEpicDetails(closedIssue, []);

      expect(output).toContain('**Status:** 🔴 CLOSED');
    });

    it('should handle epic without assignees', () => {
      const unassignedIssue = { ...mockIssue, assignees: [] };
      const output = formatEpicDetails(unassignedIssue, []);

      expect(output).toContain('**Assignees:** Unassigned');
    });

    it('should handle epic without milestone', () => {
      const noMilestoneIssue = { ...mockIssue, milestone: null };
      const output = formatEpicDetails(noMilestoneIssue, []);

      expect(output).not.toContain('**Milestone:**');
      expect(output).not.toContain('**Due Date:**');
    });

    it('should handle milestone without due date', () => {
      const milestoneNoDueIssue = {
        ...mockIssue,
        milestone: { title: 'v2.0', dueOn: null }
      };
      const output = formatEpicDetails(milestoneNoDueIssue, []);

      expect(output).toContain('**Milestone:** v2.0');
      expect(output).not.toContain('**Due Date:**');
    });

    it('should handle epic without labels', () => {
      const noLabelsIssue = { ...mockIssue, labels: [] };
      const output = formatEpicDetails(noLabelsIssue, []);

      expect(output).not.toContain('**Labels:**');
    });

    it('should handle epic without project items', () => {
      const noProjectsIssue = { ...mockIssue, projectItems: [] };
      const output = formatEpicDetails(noProjectsIssue, []);

      expect(output).not.toContain('## Projects');
    });

    it('should handle project items without status', () => {
      const projectNoStatusIssue = {
        ...mockIssue,
        projectItems: [{ project: { title: 'Test Project' }, status: null }]
      };
      const output = formatEpicDetails(projectNoStatusIssue, []);

      expect(output).toContain('- Test Project: No status');
    });

    it('should handle epic without description', () => {
      const noBodyIssue = { ...mockIssue, body: null };
      const output = formatEpicDetails(noBodyIssue, []);

      expect(output).not.toContain('## Description');
    });

    it('should handle empty description', () => {
      const emptyBodyIssue = { ...mockIssue, body: '' };
      const output = formatEpicDetails(emptyBodyIssue, []);

      expect(output).not.toContain('## Description');
    });

    it('should handle epic without children', () => {
      const output = formatEpicDetails(mockIssue, []);

      expect(output).not.toContain('## Related Issues');
      expect(output).not.toContain('**Progress:**');
    });

    it('should handle children with null assignees', () => {
      const childrenNullAssignees = [
        {
          number: 102,
          title: 'Test issue',
          state: 'OPEN',
          assignees: null,
          labels: []
        }
      ];
      const output = formatEpicDetails(mockIssue, childrenNullAssignees);

      expect(output).toContain('🟢 #102 Test issue (Unassigned)');
    });

    it('should calculate progress correctly with all closed children', () => {
      const allClosedChildren = [
        { number: 102, title: 'Issue 1', state: 'CLOSED', assignees: [] },
        { number: 103, title: 'Issue 2', state: 'CLOSED', assignees: [] }
      ];
      const output = formatEpicDetails(mockIssue, allClosedChildren);

      expect(output).toContain('**Progress:** 2/2 issues completed (100%)');
    });

    it('should calculate progress correctly with all open children', () => {
      const allOpenChildren = [
        { number: 102, title: 'Issue 1', state: 'OPEN', assignees: [] },
        { number: 103, title: 'Issue 2', state: 'OPEN', assignees: [] }
      ];
      const output = formatEpicDetails(mockIssue, allOpenChildren);

      expect(output).toContain('**Progress:** 0/2 issues completed (0%)');
    });

    it('should handle mixed case states', () => {
      const mixedCaseChildren = [
        { number: 102, title: 'Issue 1', state: 'OPEN', assignees: [] },
        { number: 103, title: 'Issue 2', state: 'CLOSED', assignees: [] }
      ];
      const output = formatEpicDetails(mockIssue, mixedCaseChildren);

      // Should handle uppercase states correctly (GitHub API returns uppercase)
      expect(output).toContain('### Open (1)');
      expect(output).toContain('### Closed (1)');
    });

    it('should format dates correctly', () => {
      const specificDateIssue = {
        ...mockIssue,
        createdAt: '2024-03-15T14:30:45Z',
        updatedAt: '2024-03-20T09:15:30Z'
      };
      const output = formatEpicDetails(specificDateIssue, []);

      expect(output).toContain('**Created:** 3/15/2024');
      expect(output).toContain('**Last Updated:** 3/20/2024');
    });

    it('should handle very long epic titles', () => {
      const longTitleIssue = {
        ...mockIssue,
        title: 'This is a very long epic title that might wrap to multiple lines and should be handled gracefully'
      };
      const output = formatEpicDetails(longTitleIssue, []);

      expect(output).toContain('# Epic #101: This is a very long epic title');
    });

    it('should handle special characters in epic content', () => {
      const specialCharIssue = {
        ...mockIssue,
        title: 'Epic with "quotes" & <brackets> and symbols',
        body: 'Description with **markdown** and `code` blocks'
      };
      const output = formatEpicDetails(specialCharIssue, []);

      expect(output).toContain('Epic with "quotes" & <brackets> and symbols');
      expect(output).toContain('Description with **markdown** and `code` blocks');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const githubEpicShow = require('../../autopm/.claude/providers/github/epic-show.js');

      expect(githubEpicShow).toHaveProperty('execute');
      expect(githubEpicShow).toHaveProperty('GitHubEpicShow');
      expect(githubEpicShow).toHaveProperty('formatEpicDetails');
    });

    it('should handle realistic epic workflow', async () => {
      const options = { id: '42' };
      const settings = {};

      const realisticIssue = {
        number: 42,
        title: 'User Authentication & Authorization System',
        body: '# Epic: User Authentication & Authorization System\n\n## Overview\nImplement a comprehensive authentication and authorization system for the application.\n\n## Requirements\n- JWT token-based authentication\n- Role-based access control\n- OAuth integration (Google, GitHub)\n- Multi-factor authentication\n- Password reset functionality\n\n## Acceptance Criteria\n- [ ] Users can register and login\n- [ ] Secure password storage\n- [ ] Token refresh mechanism\n- [ ] Admin dashboard for user management\n- [ ] API endpoints are properly secured',
        state: 'OPEN',
        assignees: [
          { login: 'security-lead' },
          { login: 'backend-dev' }
        ],
        labels: [
          { name: 'epic' },
          { name: 'security' },
          { name: 'backend' },
          { name: 'high-priority' }
        ],
        milestone: {
          title: 'v2.0 Security Release',
          dueOn: '2024-06-30T23:59:59Z'
        },
        projectItems: [
          {
            project: { title: 'Security Roadmap' },
            status: 'In Progress'
          },
          {
            project: { title: 'Backend Development' },
            status: 'Todo'
          }
        ],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-02-01T16:30:00Z',
        url: 'https://github.com/company/webapp/issues/42'
      };

      const realisticChildren = [
        {
          number: 43,
          title: 'Implement JWT token generation and validation',
          state: 'CLOSED',
          assignees: [{ login: 'backend-dev' }],
          labels: [{ name: 'backend' }, { name: 'security' }]
        },
        {
          number: 44,
          title: 'Add user registration endpoint',
          state: 'CLOSED',
          assignees: [{ login: 'backend-dev' }],
          labels: [{ name: 'backend' }]
        },
        {
          number: 45,
          title: 'Implement OAuth integration',
          state: 'OPEN',
          assignees: [{ login: 'security-lead' }],
          labels: [{ name: 'security' }, { name: 'integration' }]
        },
        {
          number: 46,
          title: 'Add multi-factor authentication',
          state: 'OPEN',
          assignees: [],
          labels: [{ name: 'security' }, { name: 'enhancement' }]
        },
        {
          number: 47,
          title: 'Create admin dashboard for user management',
          state: 'OPEN',
          assignees: [{ login: 'frontend-dev' }],
          labels: [{ name: 'frontend' }, { name: 'admin' }]
        }
      ];

      execSync
        .mockReturnValueOnce(JSON.stringify(realisticIssue))
        .mockReturnValueOnce(JSON.stringify(realisticChildren));

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic.id).toBe(42);
      expect(result.epic.title).toBe('User Authentication & Authorization System');
      expect(result.epic.state).toBe('OPEN');

      // Verify GitHub CLI commands were called correctly
      expect(execSync).toHaveBeenCalledWith(
        'gh issue view 42 --json number,title,body,state,assignees,labels,milestone,projectItems,createdAt,updatedAt,url',
        { encoding: 'utf8' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'gh issue list --search "is:issue references:42" --json number,title,state,assignees,labels --limit 100',
        { encoding: 'utf8' }
      );

      // Verify output was logged
      expect(console.log).toHaveBeenCalled();
      const loggedOutput = console.log.mock.calls[0][0];

      // Check that key information is in the output
      expect(loggedOutput).toContain('# Epic #42: User Authentication & Authorization System');
      expect(loggedOutput).toContain('**Assignees:** security-lead, backend-dev');
      expect(loggedOutput).toContain('**Milestone:** v2.0 Security Release');
      expect(loggedOutput).toContain('**Progress:** 2/5 issues completed (40%)');
      expect(loggedOutput).toContain('### Open (3)');
      expect(loggedOutput).toContain('### Closed (2)');
    });
  });
});