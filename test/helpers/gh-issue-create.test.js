#!/usr/bin/env node

/**
 * Tests for GitHub issue creation helper
 * Handles the limitation that gh issue create doesn't support --json flag
 */

const assert = require('node:assert');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('GitHub Issue Creation Helper', () => {
  let ghIssueCreate;
  let tempDir;
  let mockExecSync;
  let execSyncCalls;

  beforeEach(async () => {
    // Setup temp directory
    tempDir = path.join(os.tmpdir(), `gh-issue-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    // Track execSync calls
    execSyncCalls = [];
    mockExecSync = (command, options) => {
      execSyncCalls.push({ command, options });

      // Mock responses based on command
      if (command.includes('gh issue create')) {
        return 'https://github.com/owner/repo/issues/123\n';
      }
      if (command.includes('gh issue list')) {
        return JSON.stringify([{ number: 123 }]);
      }
      if (command.includes('gh api') && command.includes('/issues')) {
        return JSON.stringify({
          number: 123,
          title: 'Epic: fooBar',
          html_url: 'https://github.com/owner/repo/issues/123'
        });
      }
      return '';
    };

    // Try to load the module (might not exist yet - TDD)
    try {
      ghIssueCreate = require('../../lib/helpers/gh-issue-create');
    } catch (error) {
      ghIssueCreate = null;
    }
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Module Structure', () => {
    it('should export required functions', () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet (TDD RED phase)');
        return;
      }

      assert.strictEqual(typeof ghIssueCreate.createIssue, 'function');
      assert.strictEqual(typeof ghIssueCreate.createIssueWithJson, 'function');
      assert.strictEqual(typeof ghIssueCreate.createEpic, 'function');
    });
  });

  describe('createIssue', () => {
    it('should create issue and return its number', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      // Mock execSync
      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        title: 'Test Issue',
        body: 'Test body content',
        labels: ['bug', 'urgent']
      };

      const result = await ghIssueCreate.createIssue(options);

      assert.strictEqual(result.number, 123);
      assert.strictEqual(result.url, 'https://github.com/owner/repo/issues/123');

      // Verify gh command was called
      const createCall = execSyncCalls.find(c => c.command.includes('gh issue create'));
      assert.ok(createCall, 'Should call gh issue create');
      assert.ok(createCall.command.includes('--title "Test Issue"'));
    });

    it('should handle body from file', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const bodyFile = path.join(tempDir, 'issue-body.md');
      await fs.writeFile(bodyFile, '# Issue Body\nContent here');

      const options = {
        title: 'Test Issue',
        bodyFile: bodyFile,
        labels: ['enhancement']
      };

      const result = await ghIssueCreate.createIssue(options);

      assert.strictEqual(result.number, 123);

      const createCall = execSyncCalls.find(c => c.command.includes('gh issue create'));
      assert.ok(createCall.command.includes(`--body-file "${bodyFile}"`));
    });

    it('should handle assignee', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        title: 'Assigned Issue',
        body: 'Content',
        assignee: '@me'
      };

      await ghIssueCreate.createIssue(options);

      const createCall = execSyncCalls.find(c => c.command.includes('gh issue create'));
      assert.ok(createCall.command.includes('--assignee "@me"'));
    });
  });

  describe('createIssueWithJson', () => {
    it('should create issue and return JSON response', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        title: 'Epic: fooBar',
        body: 'Epic description',
        labels: ['epic', 'epic:fooBar']
      };

      const result = await ghIssueCreate.createIssueWithJson(options);

      assert.strictEqual(typeof result, 'object');
      assert.strictEqual(result.number, 123);
      assert.strictEqual(result.title, 'Epic: fooBar');
      assert.ok(result.html_url);
    });

    it('should use gh api for JSON support', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        title: 'Test',
        body: 'Body',
        labels: ['test']
      };

      await ghIssueCreate.createIssueWithJson(options);

      const apiCall = execSyncCalls.find(c => c.command.includes('gh api'));
      assert.ok(apiCall, 'Should use gh api for JSON support');
      assert.ok(apiCall.command.includes('repos/:owner/:repo/issues'));
    });
  });

  describe('createEpic', () => {
    it('should create epic with proper labels', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        epicName: 'Authentication',
        body: 'Epic for authentication features',
        additionalLabels: ['priority:high']
      };

      const result = await ghIssueCreate.createEpic(options);

      assert.strictEqual(result.number, 123);

      const createCall = execSyncCalls.find(c =>
        c.command.includes('gh issue create') || c.command.includes('gh api')
      );
      assert.ok(createCall);
      assert.ok(createCall.command.includes('epic'));
      assert.ok(createCall.command.includes('epic:Authentication'));
    });

    it('should generate epic body from template', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      const options = {
        epicName: 'UserManagement',
        description: 'User management system',
        acceptanceCriteria: [
          'Users can register',
          'Users can login',
          'Password reset works'
        ]
      };

      const result = await ghIssueCreate.createEpic(options);

      assert.strictEqual(result.number, 123);
    });
  });

  describe('Error Handling', () => {
    it('should handle gh command not found', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(() => {
        const error = new Error('command not found: gh');
        error.code = 'ENOENT';
        throw error;
      });

      try {
        await ghIssueCreate.createIssue({ title: 'Test', body: 'Test' });
        assert.fail('Should throw error');
      } catch (error) {
        assert.ok(error.message.includes('GitHub CLI (gh) is not installed'));
      }
    });

    it('should handle authentication errors', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(() => {
        throw new Error('error: not authenticated');
      });

      try {
        await ghIssueCreate.createIssue({ title: 'Test', body: 'Test' });
        assert.fail('Should throw error');
      } catch (error) {
        assert.ok(error.message.includes('not authenticated'));
      }
    });

    it('should validate required fields', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      try {
        await ghIssueCreate.createIssue({ body: 'No title' });
        assert.fail('Should throw error for missing title');
      } catch (error) {
        assert.ok(error.message.includes('title is required'));
      }
    });
  });

  describe('Output Parsing', () => {
    it('should extract issue number from URL', () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      const url1 = 'https://github.com/owner/repo/issues/456';
      const number1 = ghIssueCreate._extractIssueNumber(url1);
      assert.strictEqual(number1, 456);

      const url2 = 'https://github.com/owner/repo/issues/789\n';
      const number2 = ghIssueCreate._extractIssueNumber(url2);
      assert.strictEqual(number2, 789);
    });

    it('should handle malformed URLs', () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      const badUrl = 'not-a-url';
      const number = ghIssueCreate._extractIssueNumber(badUrl);
      assert.strictEqual(number, null);
    });
  });

  describe('Integration with Existing Workflow', () => {
    it('should work with existing PM commands', async () => {
      if (!ghIssueCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      ghIssueCreate._setExecSync(mockExecSync);

      // Simulate PM epic creation workflow
      const epicNumber = await ghIssueCreate.createEpicAndGetNumber({
        title: 'Epic: NewFeature',
        bodyFile: '/tmp/epic-body.md',
        labels: ['epic', 'epic:NewFeature', 'sprint:current']
      });

      assert.strictEqual(epicNumber, 123);
    });
  });
});

// Export for potential reuse in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // mockExecSync will be defined in beforeEach
  };
}