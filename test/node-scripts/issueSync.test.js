const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseFrontmatter,
  updateFrontmatterField,
  stripFrontmatter,
  gatherUpdates,
  formatComment,
  postComment,
  syncIssue
} = require('../../autopm/.claude/lib/commands/pm/issueSync');

describe('issueSync.js', () => {
  let tempDir;
  let originalExecSync;
  let execSyncCalls = [];

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-sync-test-'));

    // Mock execSync
    originalExecSync = require('child_process').execSync;
    execSyncCalls = [];

    require('child_process').execSync = (cmd, options) => {
      execSyncCalls.push({ cmd, options });

      // Mock gh CLI responses
      if (cmd.includes('gh issue comment')) {
        return 'https://github.com/test-user/test-repo/issues/123#issuecomment-456';
      }

      if (cmd.includes('gh issue view')) {
        return JSON.stringify({
          number: 123,
          title: 'Test Issue',
          state: 'open'
        });
      }

      if (cmd.includes('git log')) {
        return 'abc123 feat: add feature\ndef456 fix: bug fix';
      }

      return '';
    };
  });

  afterEach(() => {
    // Restore execSync
    require('child_process').execSync = originalExecSync;

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseFrontmatter', () => {
    it('should parse frontmatter from markdown file', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
issue: 123
status: in-progress
progress: 50%
---

Body content.
`);

      const frontmatter = parseFrontmatter(testFile);

      assert.strictEqual(frontmatter.issue, '123');
      assert.strictEqual(frontmatter.status, 'in-progress');
      assert.strictEqual(frontmatter.progress, '50%');
    });

    it('should return null for non-existent file', () => {
      const frontmatter = parseFrontmatter('/non/existent/file.md');
      assert.strictEqual(frontmatter, null);
    });

    it('should return empty object for file without frontmatter', () => {
      const testFile = path.join(tempDir, 'no-fm.md');
      fs.writeFileSync(testFile, '# Just content\n\nNo frontmatter here.');

      const frontmatter = parseFrontmatter(testFile);

      assert.deepStrictEqual(frontmatter, {});
    });
  });

  describe('updateFrontmatterField', () => {
    it('should update existing frontmatter field', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
status: pending
progress: 0%
---

Content.
`);

      updateFrontmatterField(testFile, 'status', 'completed');

      const content = fs.readFileSync(testFile, 'utf8');
      assert.ok(content.includes('status: completed'));
      assert.ok(content.includes('progress: 0%'));
    });

    it('should add new field if not exists', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
status: pending
---

Content.
`);

      updateFrontmatterField(testFile, 'last_sync', '2025-01-01');

      const content = fs.readFileSync(testFile, 'utf8');
      assert.ok(content.includes('last_sync: 2025-01-01'));
      assert.ok(content.includes('status: pending'));
    });
  });

  // getTimestamp is not exported, skip test
  describe.skip('getTimestamp', () => {
    it('should return ISO timestamp', () => {
      // Function not exported
    });
  });

  describe('stripFrontmatter', () => {
    it('should strip frontmatter and return body only', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
title: Test
status: active
---

# Body Title

This is the body content.
`);

      const body = stripFrontmatter(testFile);

      assert.ok(body.includes('# Body Title'));
      assert.ok(body.includes('body content'));
      assert.ok(!body.includes('---'));
      assert.ok(!body.includes('title: Test'));
    });

    it('should return empty string for non-existent file', () => {
      const body = stripFrontmatter('/non/existent.md');
      assert.strictEqual(body, '');
    });

    it('should handle file with no frontmatter', () => {
      const testFile = path.join(tempDir, 'no-fm.md');
      fs.writeFileSync(testFile, '# Content\n\nJust content.');

      const body = stripFrontmatter(testFile);

      assert.strictEqual(body, '# Content\n\nJust content.');
    });

    it('should keep horizontal rules in the body (#858)', () => {
      const testFile = path.join(tempDir, 'hr.md');
      fs.writeFileSync(testFile, '---\nname: x\n---\nAbove\n\n---\n\nBelow');

      assert.strictEqual(stripFrontmatter(testFile), 'Above\n\n---\n\nBelow');
    });
  });

  describe('gatherUpdates', () => {
    it('should gather updates from all files', () => {
      const updatesDir = path.join(tempDir, 'updates');
      fs.mkdirSync(updatesDir);

      // Create update files
      fs.writeFileSync(path.join(updatesDir, 'progress.md'), `---
completion: 75%
---

Implemented feature X.
`);

      fs.writeFileSync(path.join(updatesDir, 'notes.md'), `---
title: Notes
---

Technical decision: Use Redis for caching.
`);

      fs.writeFileSync(path.join(updatesDir, 'commits.md'), `---
title: Commits
---

abc123 feat: add feature
def456 fix: bug fix`);

      const updates = gatherUpdates(123, updatesDir);

      assert.ok(updates.progress.includes('Implemented feature X'));
      assert.ok(updates.notes.includes('Technical decision'));
      assert.ok(updates.commits.includes('abc123'));
      assert.ok(updates.commits.includes('def456'));
    });

    it('should throw error if updates directory not found', () => {
      assert.throws(
        () => gatherUpdates(123, '/non/existent/dir'),
        /Updates directory not found/
      );
    });

    it('should handle missing optional files gracefully', () => {
      const updatesDir = path.join(tempDir, 'updates');
      fs.mkdirSync(updatesDir);

      // Only create progress file (with frontmatter for stripFrontmatter to work)
      fs.writeFileSync(path.join(updatesDir, 'progress.md'), `---
completion: 25%
---

Progress here.`);

      const updates = gatherUpdates(123, updatesDir);

      assert.ok(updates.progress.includes('Progress here'));
      assert.strictEqual(updates.notes, '');
      assert.strictEqual(updates.acceptanceCriteria, '');
    });
  });

  describe('formatComment', () => {
    it('should format comment with all sections', () => {
      const updates = {
        progress: 'Completed authentication module',
        notes: 'Used JWT for tokens',
        commits: 'abc123 feat: add auth\ndef456 test: add tests',
        acceptanceCriteria: '- [x] User can login\n- [ ] User can logout',
        nextSteps: 'Implement logout functionality',
        blockers: ''
      };

      const comment = formatComment(123, updates);

      assert.ok(comment.includes('# 📊 Progress Update'));
      assert.ok(comment.includes('Completed authentication module'));
      assert.ok(comment.includes('## Technical Notes'));
      assert.ok(comment.includes('Used JWT for tokens'));
      assert.ok(comment.includes('## Recent Commits'));
      assert.ok(comment.includes('abc123'));
      assert.ok(comment.includes('## Acceptance Criteria'));
      assert.ok(comment.includes('[x] User can login'));
      assert.ok(comment.includes('## Next Steps'));
      assert.ok(comment.includes('Implement logout'));
    });

    it('should format completion comment', () => {
      const updates = {
        progress: 'Feature complete',
        notes: '',
        commits: '',
        acceptanceCriteria: '',
        nextSteps: '',
        blockers: ''
      };

      const comment = formatComment(123, updates, true);

      assert.ok(comment.includes('# ✅ Task Completed'));
      assert.ok(comment.includes('Feature complete'));
    });

    it('should omit empty sections', () => {
      const updates = {
        progress: 'Made progress',
        notes: '',
        commits: '',
        acceptanceCriteria: '',
        nextSteps: '',
        blockers: ''
      };

      const comment = formatComment(123, updates);

      assert.ok(comment.includes('# 📊 Progress Update'));
      assert.ok(!comment.includes('## Technical Notes'));
      assert.ok(!comment.includes('## Recent Commits'));
    });
  });

  describe('postComment', () => {
    it.skip('should post comment using gh CLI', () => {
      const comment = 'Test comment';

      const url = postComment(123, comment);

      assert.ok(url.includes('github.com'));
      assert.ok(url.includes('issues/123'));
      assert.strictEqual(execSyncCalls.length, 1);
      assert.ok(execSyncCalls[0].cmd.includes('gh issue comment'));
    });

    it.skip('should handle dry run mode', () => {
      const comment = 'Test comment';

      const url = postComment(123, comment, true);

      assert.strictEqual(url, null);
      assert.strictEqual(execSyncCalls.length, 0);
    });
  });

  describe('syncIssue', () => {
    it.skip('should run full sync workflow', () => {
      const updatesDir = path.join(tempDir, 'updates');
      fs.mkdirSync(updatesDir);

      // Create progress file
      const progressFile = path.join(updatesDir, 'progress.md');
      fs.writeFileSync(progressFile, `---
completion: 50%
---

Made progress on feature.
`);

      const result = syncIssue(123, updatesDir);

      assert.ok(result.commentUrl);
      assert.ok(result.commentUrl.includes('github.com'));
    });

    it.skip('should handle completion workflow', () => {
      const updatesDir = path.join(tempDir, 'updates');
      fs.mkdirSync(updatesDir);

      const progressFile = path.join(updatesDir, 'progress.md');
      fs.writeFileSync(progressFile, `---
completion: 100%
status: pending
---

Task completed.
`);

      const result = syncIssue(123, updatesDir, true);

      assert.ok(result.commentUrl);

      // Check frontmatter updated
      const content = fs.readFileSync(progressFile, 'utf8');
      assert.ok(content.includes('status: completed'));
    });

    it.skip('should handle dry run mode', () => {
      const updatesDir = path.join(tempDir, 'updates');
      fs.mkdirSync(updatesDir);

      fs.writeFileSync(path.join(updatesDir, 'progress.md'), 'Progress here.');

      const result = syncIssue(123, updatesDir, false, true);

      assert.strictEqual(result.commentUrl, null);
      assert.strictEqual(execSyncCalls.length, 0);
    });
  });
});
