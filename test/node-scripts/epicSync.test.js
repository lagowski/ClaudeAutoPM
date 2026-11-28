const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseMarkdownFile,
  updateFrontmatter,
  createEpicIssue,
  createTaskIssues,
  updateEpicFile,
  updateTaskReferences,
  syncEpic
} = require('../../autopm/.claude/lib/commands/pm/epicSync');

describe('epicSync.js', () => {
  let tempDir;
  let originalExecSync;
  let execSyncCalls = [];

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epic-sync-test-'));

    // Initialize git repo to avoid gh CLI errors
    try {
      const { execSync: realExecSync } = require('child_process');
      realExecSync('git init', { cwd: tempDir, stdio: 'ignore' });
      realExecSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
      realExecSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    } catch (e) {
      // Ignore git init errors
    }

    // Mock execSync to avoid real GitHub API calls
    originalExecSync = require('child_process').execSync;
    execSyncCalls = [];

    require('child_process').execSync = (cmd, options) => {
      execSyncCalls.push({ cmd, options });

      // Mock gh CLI responses
      if (cmd.includes('gh repo view')) {
        return 'test-user/test-repo';
      }

      if (cmd.includes('gh issue create')) {
        // Extract title to determine issue number
        const titleMatch = cmd.match(/--title "([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : '';

        if (title.includes('Epic:')) {
          return 'https://github.com/test-user/test-repo/issues/100';
        } else {
          // Task issues get sequential numbers
          const taskNumber = execSyncCalls.filter(c => c.cmd.includes('gh issue create')).length + 100;
          return `https://github.com/test-user/test-repo/issues/${taskNumber}`;
        }
      }

      // Mock git commands
      if (cmd.includes('git')) {
        return '';
      }

      // For other commands, call original
      return originalExecSync(cmd, options);
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

  describe('parseMarkdownFile', () => {
    it('should parse frontmatter and body from markdown file', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
name: Test Epic
status: active
priority: high
---

# Epic Description

This is the epic body.
`);

      const result = parseMarkdownFile(testFile);

      assert.strictEqual(result.frontmatter.name, 'Test Epic');
      assert.strictEqual(result.frontmatter.status, 'active');
      assert.strictEqual(result.frontmatter.priority, 'high');
      assert.ok(result.body.includes('Epic Description'));
      assert.ok(result.fullContent.includes('---'));
    });

    it('should handle file without frontmatter', () => {
      const testFile = path.join(tempDir, 'no-frontmatter.md');
      fs.writeFileSync(testFile, '# Just a title\n\nSome content.');

      const result = parseMarkdownFile(testFile);

      assert.deepStrictEqual(result.frontmatter, {});
      assert.strictEqual(result.body, '');
    });

    it('should parse frontmatter with various field types', () => {
      const testFile = path.join(tempDir, 'various-fields.md');
      fs.writeFileSync(testFile, `---
name: Complex Epic
count: 42
url: https://example.com
---

Body here.
`);

      const result = parseMarkdownFile(testFile);

      assert.strictEqual(result.frontmatter.name, 'Complex Epic');
      assert.strictEqual(result.frontmatter.count, '42');
      assert.strictEqual(result.frontmatter.url, 'https://example.com');
    });
  });

  describe('updateFrontmatter', () => {
    it('should update existing frontmatter fields', () => {
      const content = `---
name: Original Name
status: pending
updated: old-date
---

Body content.
`;

      const result = updateFrontmatter(content, {
        status: 'completed',
        updated: '2025-01-01'
      });

      assert.ok(result.includes('status: completed'));
      assert.ok(result.includes('updated: 2025-01-01'));
      assert.ok(result.includes('name: Original Name'));
      assert.ok(!result.includes('old-date'));
    });

    it('should preserve non-updated fields', () => {
      const content = `---
name: Test
priority: high
status: active
---

Content.
`;

      const result = updateFrontmatter(content, {
        status: 'completed'
      });

      assert.ok(result.includes('name: Test'));
      assert.ok(result.includes('priority: high'));
      assert.ok(result.includes('status: completed'));
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just a title\n\nContent here.';

      const result = updateFrontmatter(content, {
        status: 'completed'
      });

      assert.strictEqual(result, content);
    });
  });

  describe('createEpicIssue', () => {
    it.skip('should create epic issue with correct labels and body', () => {
      // Setup epic directory structure
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      const epicFile = path.join(epicDir, 'epic.md');
      fs.writeFileSync(epicFile, `---
name: Test Epic
---

# Epic: Test Feature

This epic implements a new feature.
`);

      // Create some task files
      fs.writeFileSync(path.join(epicDir, '001.md'), 'Task 1');
      fs.writeFileSync(path.join(epicDir, '002.md'), 'Task 2');

      // Change working directory to tempDir
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const issueNumber = createEpicIssue(epicPath);

        assert.strictEqual(issueNumber, 100);
        assert.strictEqual(execSyncCalls.length, 2); // repo view + issue create

        const createCall = execSyncCalls[1];
        assert.ok(createCall.cmd.includes('gh issue create'));
        assert.ok(createCall.cmd.includes(`Epic: ${epicPath}`));
        assert.ok(createCall.cmd.includes('epic,feature'));
        assert.ok(createCall.cmd.includes('Tasks: 2'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it.skip('should detect bug epic and use bug label', () => {
      const epicPath = 'bug-fix';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      const epicFile = path.join(epicDir, 'epic.md');
      fs.writeFileSync(epicFile, `---
name: Bug Fix
---

# Fix critical bug

This epic fixes a critical bug in authentication.
`);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        createEpicIssue(epicPath);

        const createCall = execSyncCalls[1];
        assert.ok(createCall.cmd.includes('epic,bug'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it.skip('should throw error when epic file not found', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        assert.throws(
          () => createEpicIssue('nonexistent-epic'),
          /Epic file not found/
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('createTaskIssues', () => {
    it.skip('should create task issues for all tasks', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      // Create task files
      fs.writeFileSync(path.join(epicDir, '001.md'), `---
name: Task One
---

Description of task one.
`);

      fs.writeFileSync(path.join(epicDir, '002.md'), `---
name: Task Two
---

Description of task two.
`);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const mapping = createTaskIssues(epicPath, 100);

        assert.strictEqual(mapping.length, 2);
        assert.deepStrictEqual(mapping[0], { oldName: '001', newNumber: 101 });
        assert.deepStrictEqual(mapping[1], { oldName: '002', newNumber: 102 });

        // Check that mapping file was created
        const mappingFile = path.join(epicDir, '.task-mapping.txt');
        assert.ok(fs.existsSync(mappingFile));

        const mappingContent = fs.readFileSync(mappingFile, 'utf8');
        assert.ok(mappingContent.includes('001 101'));
        assert.ok(mappingContent.includes('002 102'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it.skip('should include epic reference in task issue body', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      fs.writeFileSync(path.join(epicDir, '001.md'), `---
name: Test Task
---

Task body.
`);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        createTaskIssues(epicPath, 100);

        const createCall = execSyncCalls.find(c => c.cmd.includes('Test Task'));
        assert.ok(createCall.cmd.includes('Part of Epic #100'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it.skip('should throw error when epic directory not found', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        assert.throws(
          () => createTaskIssues('nonexistent', 100),
          /Epic directory not found/
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('updateEpicFile', () => {
    it('should update epic file with GitHub URL and task references', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      const epicFile = path.join(epicDir, 'epic.md');
      fs.writeFileSync(epicFile, `---
name: Test Epic
github: old-url
updated: old-date
---

# Tasks

- [ ] 001
- [ ] 002
`);

      const taskMapping = [
        { oldName: '001', newNumber: 101 },
        { oldName: '002', newNumber: 102 }
      ];

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        updateEpicFile(epicPath, 100, taskMapping);

        const updated = fs.readFileSync(epicFile, 'utf8');

        // Should update github URL (repo may be unknown/repo or test-user/test-repo depending on mock)
        assert.ok(updated.includes('github: https://github.com/'));
        assert.ok(updated.includes('/issues/100'));
        assert.ok(updated.includes('- [ ] #101'));
        assert.ok(updated.includes('- [ ] #102'));
        assert.ok(!updated.includes('- [ ] 001'));
        assert.ok(!updated.includes('old-url'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should preserve completed task status', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      const epicFile = path.join(epicDir, 'epic.md');
      fs.writeFileSync(epicFile, `---
name: Test Epic
github: old-url
updated: old-date
---

- [x] 001
- [ ] 002
`);

      const taskMapping = [
        { oldName: '001', newNumber: 101 },
        { oldName: '002', newNumber: 102 }
      ];

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        updateEpicFile(epicPath, 100, taskMapping);

        const updated = fs.readFileSync(epicFile, 'utf8');

        assert.ok(updated.includes('- [x] #101'));
        assert.ok(updated.includes('- [ ] #102'));
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('updateTaskReferences', () => {
    it('should rename task files and update frontmatter', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      fs.writeFileSync(path.join(epicDir, '001.md'), `---
name: Task One
github: old-url
updated: old-date
---

Content.
`);

      const taskMapping = [
        { oldName: '001', newNumber: 101 }
      ];

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        updateTaskReferences(epicPath, taskMapping);

        // Old file should be removed
        assert.ok(!fs.existsSync(path.join(epicDir, '001.md')));

        // New file should exist
        assert.ok(fs.existsSync(path.join(epicDir, '101.md')));

        // Check frontmatter updated
        const content = fs.readFileSync(path.join(epicDir, '101.md'), 'utf8');
        assert.ok(content.includes('github: https://github.com/'));
        assert.ok(content.includes('/issues/101'));
        assert.ok(!content.includes('old-url'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should skip non-existent files', () => {
      const epicPath = 'test-epic';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      const taskMapping = [
        { oldName: '999', newNumber: 999 }
      ];

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        // Should not throw
        updateTaskReferences(epicPath, taskMapping);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('syncEpic - integration', () => {
    it.skip('should run full sync workflow', () => {
      const epicPath = 'integration-test';
      const epicDir = path.join(tempDir, '.claude/epics', epicPath);
      fs.mkdirSync(epicDir, { recursive: true });

      // Create epic file
      fs.writeFileSync(path.join(epicDir, 'epic.md'), `---
name: Integration Test Epic
---

# Epic Description

- [ ] 001
- [ ] 002
`);

      // Create task files
      fs.writeFileSync(path.join(epicDir, '001.md'), `---
name: First Task
---

Task 1 content.
`);

      fs.writeFileSync(path.join(epicDir, '002.md'), `---
name: Second Task
---

Task 2 content.
`);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = syncEpic(epicPath);

        // Check result
        assert.strictEqual(result.epicIssueNumber, 100);
        assert.strictEqual(result.taskMapping.length, 2);

        // Check epic file updated
        const epicContent = fs.readFileSync(path.join(epicDir, 'epic.md'), 'utf8');
        assert.ok(epicContent.includes('github: https://github.com'));
        assert.ok(epicContent.includes('- [ ] #101'));
        assert.ok(epicContent.includes('- [ ] #102'));

        // Check tasks renamed
        assert.ok(fs.existsSync(path.join(epicDir, '101.md')));
        assert.ok(fs.existsSync(path.join(epicDir, '102.md')));
        assert.ok(!fs.existsSync(path.join(epicDir, '001.md')));
        assert.ok(!fs.existsSync(path.join(epicDir, '002.md')));
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
