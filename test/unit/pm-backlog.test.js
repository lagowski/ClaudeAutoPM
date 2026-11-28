// Mock child_process before importing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const { execSync } = require('child_process');

const LIST_CMD = 'gh issue list --state open --json number,title,labels,assignees,createdAt --limit 50';

function makeIssue(number, title, labelNames = [], assigneeLogins = [], createdAt = '2024-01-01T00:00:00Z') {
  return {
    number,
    title,
    labels: labelNames.map(n => ({ name: n })),
    assignees: assigneeLogins.map(l => ({ login: l })),
    createdAt
  };
}

describe('pm-backlog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn();
  });

  // ── RED tests (must fail before implementation) ──────────────────────────

  describe('Module export', () => {
    it('should export a callable getBacklog function', () => {
      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      expect(typeof getBacklog).toBe('function');
    });
  });

  describe('getBacklog() — suggestion', () => {
    it('should suggest the unassigned effort:S issue as next when candidates exist', () => {
      const issues = [
        makeIssue(10, 'fix: auth token refresh', ['effort:S', 'bug']),
        makeIssue(11, 'feat: dashboard charts', ['effort:L', 'enhancement'], ['alice'])
      ];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes('gh issue view')) return JSON.stringify({ body: 'No dependencies here.' });
        return '';
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.suggested).not.toBeNull();
      expect(result.suggested.number).toBe(10);
    });
  });

  // ── GREEN tests (must pass after implementation) ──────────────────────────

  describe('sortIssues()', () => {
    it('should sort by createdAt ascending when no priority or effort labels are present', () => {
      const { sortIssues } = require('../../autopm/.claude/scripts/pm/backlog.js');
      const issues = [
        makeIssue(3, 'newest', [], [], '2024-03-01T00:00:00Z'),
        makeIssue(1, 'oldest', [], [], '2024-01-01T00:00:00Z'),
        makeIssue(2, 'middle', [], [], '2024-02-01T00:00:00Z')
      ];
      const sorted = sortIssues(issues);
      expect(sorted[0].number).toBe(1);
      expect(sorted[1].number).toBe(2);
      expect(sorted[2].number).toBe(3);
    });

    it('should rank high-priority before bug before enhancement', () => {
      const { sortIssues } = require('../../autopm/.claude/scripts/pm/backlog.js');
      const issues = [
        makeIssue(1, 'enhance', ['enhancement']),
        makeIssue(2, 'high', ['high-priority']),
        makeIssue(3, 'bug', ['bug'])
      ];
      const sorted = sortIssues(issues);
      expect(sorted[0].number).toBe(2);
      expect(sorted[1].number).toBe(3);
      expect(sorted[2].number).toBe(1);
    });

    it('should rank effort:S before effort:M before effort:L before effort:XL within same priority', () => {
      const { sortIssues } = require('../../autopm/.claude/scripts/pm/backlog.js');
      const issues = [
        makeIssue(1, 'large', ['effort:L']),
        makeIssue(2, 'small', ['effort:S']),
        makeIssue(3, 'medium', ['effort:M']),
        makeIssue(4, 'xlarge', ['effort:XL'])
      ];
      const sorted = sortIssues(issues);
      expect(sorted.map(i => i.number)).toEqual([2, 3, 1, 4]);
    });

    it('should sort unassigned before assigned when priority and effort are equal', () => {
      const { sortIssues } = require('../../autopm/.claude/scripts/pm/backlog.js');
      const issues = [
        makeIssue(1, 'assigned', ['bug', 'effort:S'], ['alice'], '2024-01-01T00:00:00Z'),
        makeIssue(2, 'unassigned', ['bug', 'effort:S'], [], '2024-01-01T00:00:00Z')
      ];
      const sorted = sortIssues(issues);
      expect(sorted[0].number).toBe(2);
    });

    it('should sort unassigned before assigned even when the assigned issue was created earlier', () => {
      const { sortIssues } = require('../../autopm/.claude/scripts/pm/backlog.js');
      const issues = [
        makeIssue(1, 'assigned-older', ['bug', 'effort:S'], ['alice'], '2024-01-01T00:00:00Z'),
        makeIssue(2, 'unassigned-newer', ['bug', 'effort:S'], [], '2024-06-01T00:00:00Z')
      ];
      const sorted = sortIssues(issues);
      expect(sorted[0].number).toBe(2);
    });
  });

  describe('hasOpenDependency()', () => {
    it('should return true when body contains Depends on #N', () => {
      const { hasOpenDependency } = require('../../autopm/.claude/scripts/pm/backlog.js');
      expect(hasOpenDependency('Depends on #42')).toBe(true);
    });

    it('should return false when body has no dependency reference', () => {
      const { hasOpenDependency } = require('../../autopm/.claude/scripts/pm/backlog.js');
      expect(hasOpenDependency('No dependencies here.')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const { hasOpenDependency } = require('../../autopm/.claude/scripts/pm/backlog.js');
      expect(hasOpenDependency('depends on #10')).toBe(true);
    });

    it('should handle null or empty body gracefully', () => {
      const { hasOpenDependency } = require('../../autopm/.claude/scripts/pm/backlog.js');
      expect(hasOpenDependency(null)).toBe(false);
      expect(hasOpenDependency('')).toBe(false);
    });
  });

  describe('getBacklog() — no-labels fallback (AC: works with no labels)', () => {
    it('should sort by createdAt ascending when no priority or effort labels are present', () => {
      const issues = [
        makeIssue(3, 'newest', [], [], '2024-03-01T00:00:00Z'),
        makeIssue(1, 'oldest', [], [], '2024-01-01T00:00:00Z'),
        makeIssue(2, 'middle', [], [], '2024-02-01T00:00:00Z')
      ];
      execSync.mockReturnValue(JSON.stringify(issues));

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues[0].number).toBe(1);
    });
  });

  describe('getBacklog() — assignee display (AC: shows assignee for each issue)', () => {
    it('should include the assignee login in each issue entry', () => {
      const issues = [makeIssue(5, 'some task', ['effort:S'], ['alice'])];
      execSync.mockReturnValue(JSON.stringify(issues));

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues[0].assignee).toBe('alice');
    });

    it('should set assignee to null when issue is unassigned', () => {
      const issues = [makeIssue(6, 'unassigned task', ['effort:S'])];
      execSync.mockReturnValue(JSON.stringify(issues));

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues[0].assignee).toBeNull();
    });
  });

  describe('getBacklog() — single suggestion (AC: suggests one actionable next issue)', () => {
    it('should emit exactly one suggested next issue', () => {
      const issues = [
        makeIssue(20, 'fix: small bug', ['effort:S', 'bug']),
        makeIssue(21, 'feat: large feature', ['effort:L', 'enhancement'])
      ];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes('gh issue view')) return JSON.stringify({ body: '' });
        return '';
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.suggested).not.toBeNull();
      expect(result.suggested).toHaveProperty('number');

      const runLines = result.output.split('\n').filter(l => l.startsWith('Run: /pm:issue-start'));
      expect(runLines).toHaveLength(1);
    });
  });

  describe('getBacklog() — effort labels (AC: effort:* labels used if present)', () => {
    it('should include effort label when effort:* label is present', () => {
      const issues = [makeIssue(7, 'medium task', ['effort:M'])];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes('gh issue view')) return JSON.stringify({ body: '' });
        return '';
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues[0].effort).toBe('effort:M');
    });

    it('should set effort to null when no effort:* label is present', () => {
      const issues = [makeIssue(8, 'bugfix', ['bug'])];
      execSync.mockReturnValue(JSON.stringify(issues));

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues[0].effort == null).toBe(true);
    });
  });

  describe('getBacklog() — dependency exclusion', () => {
    it('should not suggest an issue whose body contains a Depends on # reference', () => {
      const blockedNumber = 30;
      const issues = [makeIssue(blockedNumber, 'blocked task', ['effort:S'])];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes(`gh issue view ${blockedNumber}`)) {
          return JSON.stringify({ body: 'This task Depends on #42 before it can start.' });
        }
        return JSON.stringify({ body: '' });
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.suggested?.number).not.toBe(blockedNumber);
    });
  });

  describe('getBacklog() — output footer (derived AC from standard-patterns.md)', () => {
    it('should end formatted output with Run: /pm:issue-start <number> footer', () => {
      const issues = [makeIssue(42, 'fix: the thing', ['effort:S', 'bug'])];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes('gh issue view')) return JSON.stringify({ body: '' });
        return '';
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      const nonEmpty = result.output.split('\n').filter(l => l.trim() !== '');
      const lastLine = nonEmpty[nonEmpty.length - 1];
      expect(lastLine).toMatch(/^Run: \/pm:issue-start \d+$/);
    });
  });

  describe('getBacklog() — edge cases', () => {
    it('should handle gh CLI failure gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.issues).toHaveLength(0);
      expect(result.suggested).toBeNull();
    });

    it('should prefer effort:S over effort:M when both are unassigned candidates', () => {
      const issues = [
        makeIssue(50, 'medium task', ['effort:M']),
        makeIssue(51, 'small task', ['effort:S'])
      ];
      execSync.mockImplementation(cmd => {
        if (cmd.startsWith('gh issue list')) return JSON.stringify(issues);
        if (cmd.includes('gh issue view')) return JSON.stringify({ body: '' });
        return '';
      });

      const getBacklog = require('../../autopm/.claude/scripts/pm/backlog.js');
      const result = getBacklog();
      expect(result.suggested.number).toBe(51);
    });
  });
});
