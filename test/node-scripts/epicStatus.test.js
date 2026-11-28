const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseFrontmatter,
  findTaskFiles,
  countTasksByStatus,
  generateProgressBar,
  getSubEpicBreakdown,
  formatEpicStatus,
  listAvailableEpics
} = require('../../autopm/.claude/lib/commands/pm/epicStatus');

describe('epicStatus.js', () => {
  let tempDir;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epic-status-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseFrontmatter', () => {
    it('should parse frontmatter from markdown file', () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, `---
name: Test Task
status: completed
priority: high
---

# Task Content
Some content here.
`);

      const frontmatter = parseFrontmatter(testFile);

      assert.strictEqual(frontmatter.name, 'Test Task');
      assert.strictEqual(frontmatter.status, 'completed');
      assert.strictEqual(frontmatter.priority, 'high');
    });

    it('should return empty object for file without frontmatter', () => {
      const testFile = path.join(tempDir, 'no-frontmatter.md');
      fs.writeFileSync(testFile, '# Just a title\n\nSome content.');

      const frontmatter = parseFrontmatter(testFile);

      assert.deepStrictEqual(frontmatter, {});
    });

    it('should return empty object for non-existent file', () => {
      const frontmatter = parseFrontmatter('/non/existent/file.md');

      assert.deepStrictEqual(frontmatter, {});
    });
  });

  describe('findTaskFiles', () => {
    it('should find task files matching pattern', () => {
      // Create test structure
      fs.mkdirSync(path.join(tempDir, 'epic1'));
      fs.writeFileSync(path.join(tempDir, 'epic1', '001.md'), 'task 1');
      fs.writeFileSync(path.join(tempDir, 'epic1', '002.md'), 'task 2');
      fs.writeFileSync(path.join(tempDir, 'epic1', 'other.md'), 'not a task');

      const files = findTaskFiles(path.join(tempDir, 'epic1'));

      assert.strictEqual(files.length, 2);
      assert.ok(files.some(f => f.endsWith('001.md')));
      assert.ok(files.some(f => f.endsWith('002.md')));
      assert.ok(!files.some(f => f.endsWith('other.md')));
    });

    it('should find tasks in subdirectories up to maxDepth', () => {
      // Create nested structure
      fs.mkdirSync(path.join(tempDir, 'epic1'));
      fs.mkdirSync(path.join(tempDir, 'epic1', 'sub1'));
      fs.writeFileSync(path.join(tempDir, 'epic1', '001.md'), 'task 1');
      fs.writeFileSync(path.join(tempDir, 'epic1', 'sub1', '002.md'), 'task 2');

      const files = findTaskFiles(path.join(tempDir, 'epic1'), 2);

      assert.strictEqual(files.length, 2);
    });

    it('should return empty array for non-existent directory', () => {
      const files = findTaskFiles('/non/existent/dir');

      assert.deepStrictEqual(files, []);
    });
  });

  describe('countTasksByStatus', () => {
    it('should count tasks by status correctly', () => {
      // Create task files
      const epic = path.join(tempDir, 'epic1');
      fs.mkdirSync(epic);

      // Completed task
      fs.writeFileSync(path.join(epic, '001.md'), `---
status: completed
---
Task 1`);

      // In-progress task
      fs.writeFileSync(path.join(epic, '002.md'), `---
status: in-progress
---
Task 2`);

      // Pending task (no status)
      fs.writeFileSync(path.join(epic, '003.md'), `---
name: Task 3
---
Task 3`);

      const files = findTaskFiles(epic);
      const counts = countTasksByStatus(files);

      assert.strictEqual(counts.total, 3);
      assert.strictEqual(counts.completed, 1);
      assert.strictEqual(counts.in_progress, 1);
      assert.strictEqual(counts.pending, 1);
    });

    it('should handle in_progress status variant', () => {
      const epic = path.join(tempDir, 'epic1');
      fs.mkdirSync(epic);

      fs.writeFileSync(path.join(epic, '001.md'), `---
status: in_progress
---
Task 1`);

      const files = findTaskFiles(epic);
      const counts = countTasksByStatus(files);

      assert.strictEqual(counts.in_progress, 1);
    });

    it('should return zero counts for empty array', () => {
      const counts = countTasksByStatus([]);

      assert.strictEqual(counts.total, 0);
      assert.strictEqual(counts.completed, 0);
      assert.strictEqual(counts.in_progress, 0);
      assert.strictEqual(counts.pending, 0);
    });
  });

  describe('generateProgressBar', () => {
    it('should generate progress bar for 0%', () => {
      const bar = generateProgressBar(0, 10);
      assert.strictEqual(bar, '[----------] 0%');
    });

    it('should generate progress bar for 50%', () => {
      const bar = generateProgressBar(50, 10);
      assert.strictEqual(bar, '[=====-----] 50%');
    });

    it('should generate progress bar for 100%', () => {
      const bar = generateProgressBar(100, 10);
      assert.strictEqual(bar, '[==========] 100%');
    });

    it('should generate progress bar with default length', () => {
      const bar = generateProgressBar(75);
      assert.ok(bar.includes('['));
      assert.ok(bar.includes(']'));
      assert.ok(bar.includes('75%'));
    });
  });

  describe('getSubEpicBreakdown', () => {
    it('should get breakdown of sub-epics', () => {
      // Create structure with sub-epics
      const epic = path.join(tempDir, 'epic1');
      fs.mkdirSync(epic);
      fs.mkdirSync(path.join(epic, 'auth'));
      fs.mkdirSync(path.join(epic, 'api'));

      // Auth tasks
      fs.writeFileSync(path.join(epic, 'auth', '001.md'), `---
status: completed
---
Auth task 1`);
      fs.writeFileSync(path.join(epic, 'auth', '002.md'), `---
status: pending
---
Auth task 2`);

      // API tasks
      fs.writeFileSync(path.join(epic, 'api', '001.md'), `---
status: completed
---
API task 1`);

      const breakdown = getSubEpicBreakdown(epic);

      assert.strictEqual(breakdown.length, 2);

      const auth = breakdown.find(s => s.name === 'auth');
      assert.strictEqual(auth.total, 2);
      assert.strictEqual(auth.completed, 1);

      const api = breakdown.find(s => s.name === 'api');
      assert.strictEqual(api.total, 1);
      assert.strictEqual(api.completed, 1);
    });

    it('should return empty array for non-existent directory', () => {
      const breakdown = getSubEpicBreakdown('/non/existent');
      assert.deepStrictEqual(breakdown, []);
    });

    it('should skip subdirectories without task files', () => {
      const epic = path.join(tempDir, 'epic1');
      fs.mkdirSync(epic);
      fs.mkdirSync(path.join(epic, 'empty-sub'));

      const breakdown = getSubEpicBreakdown(epic);
      assert.strictEqual(breakdown.length, 0);
    });
  });

  describe('formatEpicStatus', () => {
    it('should format complete epic status report', () => {
      const epic = path.join(tempDir, 'test-epic');
      fs.mkdirSync(epic);

      fs.writeFileSync(path.join(epic, '001.md'), `---
status: completed
---
Task 1`);
      fs.writeFileSync(path.join(epic, '002.md'), `---
status: in-progress
---
Task 2`);

      const status = formatEpicStatus('test-epic', epic);

      assert.ok(status.includes('Epic: test-epic'));
      assert.ok(status.includes('Total tasks:     2'));
      assert.ok(status.includes('Completed:       1 (50%)'));
      assert.ok(status.includes('In Progress:     1'));
      assert.ok(status.includes('Pending:         0'));
      assert.ok(status.includes('Progress:'));
      assert.ok(status.includes('50%'));
    });

    it('should include sub-epic breakdown when present', () => {
      const epic = path.join(tempDir, 'test-epic');
      fs.mkdirSync(epic);
      fs.mkdirSync(path.join(epic, 'backend'));

      fs.writeFileSync(path.join(epic, 'backend', '001.md'), `---
status: completed
---
Backend task`);

      const status = formatEpicStatus('test-epic', epic);

      assert.ok(status.includes('Sub-Epic Breakdown:'));
      assert.ok(status.includes('backend'));
    });

    it('should handle epic with no tasks', () => {
      const epic = path.join(tempDir, 'empty-epic');
      fs.mkdirSync(epic);

      const status = formatEpicStatus('empty-epic', epic);

      assert.ok(status.includes('Total tasks:     0'));
      assert.ok(status.includes('Completed:       0 (0%)'));
    });
  });

  describe('listAvailableEpics', () => {
    it('should list all epic directories', () => {
      const epicsDir = path.join(tempDir, 'epics');
      fs.mkdirSync(epicsDir);
      fs.mkdirSync(path.join(epicsDir, 'epic1'));
      fs.mkdirSync(path.join(epicsDir, 'epic2'));
      fs.writeFileSync(path.join(epicsDir, 'not-a-dir.txt'), 'file');

      const epics = listAvailableEpics(epicsDir);

      assert.strictEqual(epics.length, 2);
      assert.ok(epics.includes('epic1'));
      assert.ok(epics.includes('epic2'));
      assert.ok(!epics.includes('not-a-dir.txt'));
    });

    it('should return empty array for non-existent directory', () => {
      const epics = listAvailableEpics('/non/existent');
      assert.deepStrictEqual(epics, []);
    });
  });
});
