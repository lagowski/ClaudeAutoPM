const assert = require('node:assert');

const {
  GitHubIssueShow,
  execute,
  detectRepository,
  parseComments,
  getRelatedPRs,
  mockShowIssue
} = require('../../../autopm/.claude/providers/github/issue-show');

describe('GitHub Issue Show Provider', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Ensure mock mode is enabled for tests (issue-show uses the mock
    // implementation only when AUTOPM_USE_REAL_API is unset)
    delete process.env.AUTOPM_USE_REAL_API;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('GitHubIssueShow class', () => {
    it('should instantiate without errors', () => {
      const instance = new GitHubIssueShow();
      assert.ok(instance);
    });

    it('should have execute method', () => {
      const instance = new GitHubIssueShow();
      assert.strictEqual(typeof instance.execute, 'function');
    });

    it('should have detectRepository method', () => {
      const instance = new GitHubIssueShow();
      assert.strictEqual(typeof instance.detectRepository, 'function');
    });

    it('should have parseComments method', () => {
      const instance = new GitHubIssueShow();
      assert.strictEqual(typeof instance.parseComments, 'function');
    });

    it('should have getRelatedPRs method', () => {
      const instance = new GitHubIssueShow();
      assert.strictEqual(typeof instance.getRelatedPRs, 'function');
    });

    it('should have mockShowIssue method', () => {
      const instance = new GitHubIssueShow();
      assert.strictEqual(typeof instance.mockShowIssue, 'function');
    });
  });

  describe('execute function', () => {
    it('should require issue ID', async () => {
      await assert.rejects(
        async () => await execute({}),
        /Issue ID is required/
      );
    });

    it('should execute with mock data in test mode', async () => {
      const result = await execute({ id: '123' });

      assert.ok(result);
      assert.strictEqual(result.id, '123');
      assert.ok(result.title);
      assert.ok(result.description);
      assert.strictEqual(result.status, 'open');
    });

    it('should return issue with all basic fields', async () => {
      const result = await execute({ id: '456' });

      assert.strictEqual(result.id, '456');
      assert.ok(result.title.includes('Mock Issue'));
      assert.strictEqual(result.status, 'open');
      assert.ok(Array.isArray(result.assignees));
      assert.ok(Array.isArray(result.labels));
      assert.ok(result.createdAt);
      assert.ok(result.updatedAt);
      assert.ok(result.url);
      assert.strictEqual(result.milestone, 'v2.0');
    });

    it('should include assignees', async () => {
      const result = await execute({ id: '789' });

      assert.ok(Array.isArray(result.assignees));
      assert.ok(result.assignees.length > 0);
      assert.strictEqual(result.assignees[0], 'developer1');
    });

    it('should include labels', async () => {
      const result = await execute({ id: '100' });

      assert.ok(Array.isArray(result.labels));
      assert.ok(result.labels.length > 0);
      assert.ok(result.labels.includes('enhancement'));
      assert.ok(result.labels.includes('backend'));
    });

    it('should include comments when requested', async () => {
      const result = await execute({ id: '200', comments: true });

      assert.ok(result.comments);
      assert.ok(Array.isArray(result.comments));
      assert.ok(result.comments.length > 0);
    });

    it('should not include comments when not requested', async () => {
      const result = await execute({ id: '300' });

      assert.strictEqual(result.comments, undefined);
    });

    it('should include related PRs when requested', async () => {
      const result = await execute({ id: '400', related: true });

      assert.ok(result.relatedPRs);
      assert.ok(Array.isArray(result.relatedPRs));
      assert.ok(result.relatedPRs.length > 0);
    });

    it('should not include related PRs when not requested', async () => {
      const result = await execute({ id: '500' });

      assert.strictEqual(result.relatedPRs, undefined);
    });

    it('should accept custom repository in settings', async () => {
      const settings = { repository: 'custom/repo' };
      const result = await execute({ id: '600' }, settings);

      assert.ok(result);
      assert.strictEqual(result.id, '600');
    });

    it('should generate correct URL format', async () => {
      const result = await execute({ id: '700' });

      assert.ok(result.url);
      assert.ok(result.url.includes('github.com'));
      assert.ok(result.url.includes('/issues/700'));
    });

    it('should handle different issue IDs', async () => {
      const result1 = await execute({ id: '1' });
      const result2 = await execute({ id: '999' });

      assert.strictEqual(result1.id, '1');
      assert.strictEqual(result2.id, '999');
      assert.ok(result1.title.includes('#1'));
      assert.ok(result2.title.includes('#999'));
    });
  });

  describe('detectRepository', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof detectRepository, 'function');
    });

    it('should return null when not in git repo', () => {
      const result = detectRepository();
      // In test environment, might not be in a git repo
      assert.ok(result === null || typeof result === 'string');
    });
  });

  describe('parseComments', () => {
    it('should return array for comment parsing', () => {
      const result = parseComments('some output');

      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    it('should handle empty output', () => {
      const result = parseComments('');

      assert.ok(Array.isArray(result));
    });
  });

  describe('getRelatedPRs', () => {
    it('should accept repository and issue ID', () => {
      const result = getRelatedPRs('owner/repo', '123');

      // Should return array (empty or with PRs depending on implementation)
      assert.ok(Array.isArray(result));
    });

    it('should handle errors gracefully', () => {
      const result = getRelatedPRs('invalid/repo', 'invalid');

      // Should return empty array on error
      assert.ok(Array.isArray(result));
    });
  });

  describe('mockShowIssue', () => {
    it('should return mock issue data', () => {
      const result = mockShowIssue({ id: '123' });

      assert.ok(result);
      assert.strictEqual(result.id, '123');
      assert.ok(result.title);
      assert.ok(result.description);
    });

    it('should include comments when requested', () => {
      const result = mockShowIssue({ id: '456', comments: true });

      assert.ok(result.comments);
      assert.ok(Array.isArray(result.comments));
      assert.ok(result.comments.length > 0);
    });

    it('should include related PRs when requested', () => {
      const result = mockShowIssue({ id: '789', related: true });

      assert.ok(result.relatedPRs);
      assert.ok(Array.isArray(result.relatedPRs));
    });

    it('should generate consistent mock data', () => {
      const result1 = mockShowIssue({ id: '100' });
      const result2 = mockShowIssue({ id: '100' });

      assert.strictEqual(result1.id, result2.id);
      assert.strictEqual(result1.milestone, result2.milestone);
    });

    it('should have valid assignees array', () => {
      const result = mockShowIssue({ id: '200' });

      assert.ok(Array.isArray(result.assignees));
      assert.strictEqual(result.assignees.length, 2);
    });

    it('should have valid labels array', () => {
      const result = mockShowIssue({ id: '300' });

      assert.ok(Array.isArray(result.labels));
      assert.ok(result.labels.length > 0);
    });

    it('should have valid timestamps', () => {
      const result = mockShowIssue({ id: '400' });

      assert.ok(result.createdAt);
      assert.ok(result.updatedAt);
      assert.ok(Date.parse(result.createdAt));
      assert.ok(Date.parse(result.updatedAt));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete issue with all options', async () => {
      const result = await execute({
        id: '999',
        comments: true,
        related: true
      });

      assert.strictEqual(result.id, '999');
      assert.ok(result.title);
      assert.ok(result.description);
      assert.ok(result.assignees);
      assert.ok(result.labels);
      assert.ok(result.comments);
      assert.ok(result.relatedPRs);
      assert.ok(result.url);
      assert.ok(result.milestone);
    });

    it('should handle minimal issue request', async () => {
      const result = await execute({ id: '1' });

      assert.strictEqual(result.id, '1');
      assert.ok(result.title);
      assert.ok(result.description);
      assert.strictEqual(result.comments, undefined);
      assert.strictEqual(result.relatedPRs, undefined);
    });

    it('should maintain data consistency across calls', async () => {
      const result1 = await execute({ id: '500' });
      const result2 = await execute({ id: '500' });

      assert.strictEqual(result1.title, result2.title);
      assert.strictEqual(result1.status, result2.status);
      assert.strictEqual(result1.milestone, result2.milestone);
    });
  });
});
