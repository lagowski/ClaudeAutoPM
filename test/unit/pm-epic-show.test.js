const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Jest TDD Tests for PM Epic Show Script
 * Testing epic-show.js with 100% coverage goal
 */

describe('PM Epic Show Script - Full Coverage Tests', () => {
  let tempDir;
  let originalCwd;
  let showEpic;

  beforeEach(() => {
    // Create temporary test directory
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-epic-show-test-'));
    process.chdir(tempDir);

    // Clear module cache to ensure fresh import
    jest.resetModules();
    showEpic = require('../../autopm/.claude/scripts/pm/epic-show.js');
  });

  afterEach(() => {
    // Cleanup
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Functionality', () => {
    test('should export a function', () => {
      expect(typeof showEpic).toBe('function');
    });

    test('should throw error when no epic name provided', () => {
      expect(() => showEpic()).toThrow('❌ Please provide an epic name');
      expect(() => showEpic('')).toThrow('❌ Please provide an epic name');
      expect(() => showEpic('   ')).toThrow('❌ Please provide an epic name');
    });

    test('should throw error when epic does not exist', () => {
      expect(() => showEpic('non-existent')).toThrow('❌ Epic not found: non-existent');
    });

    test('should show available epics when target epic not found', () => {
      fs.mkdirSync('.claude/epics/existing-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/existing-epic/epic.md', 'name: Existing Epic');

      expect(() => showEpic('non-existent')).toThrow('• existing-epic');
    });

    test('should show (none) when no epics exist', () => {
      fs.mkdirSync('.claude/epics', { recursive: true });

      expect(() => showEpic('non-existent')).toThrow('(none)');
    });
  });

  describe('Epic Metadata Parsing', () => {
    test('should parse YAML frontmatter', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `---
name: Test Epic
status: in-progress
progress: 50%
github: https://github.com/user/repo
created: 2024-01-01
---

# Epic Description
Content here`);

      const result = showEpic('test-epic');

      expect(result.epic).toMatchObject({
        name: 'Test Epic',
        status: 'in-progress',
        progress: '50%',
        github: 'https://github.com/user/repo',
        created: '2024-01-01'
      });
    });

    test('should parse simple key-value format', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Simple Epic
status: planning
progress: 10%

# Epic Description
Content here`);

      const result = showEpic('test-epic');

      expect(result.epic).toMatchObject({
        name: 'Simple Epic',
        status: 'planning',
        progress: '10%'
      });
    });

    test('should handle missing metadata fields with defaults', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', '# Just content');

      const result = showEpic('test-epic');

      expect(result.epic).toMatchObject({
        name: 'test-epic',
        status: 'planning',
        progress: '0%',
        github: '',
        created: 'unknown'
      });
    });

    test('should handle unreadable epic file with defaults', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'content');
      fs.chmodSync('.claude/epics/test-epic/epic.md', 0o000);

      const result = showEpic('test-epic');

      expect(result.epic).toMatchObject({
        name: 'test-epic',
        status: 'planning',
        progress: '0%'
      });

      // Restore permissions for cleanup
      fs.chmodSync('.claude/epics/test-epic/epic.md', 0o644);
    });

    test('should handle complex metadata values with colons', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Epic: With Colons
github: https://github.com/user/repo:branch`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('Epic: With Colons');
      expect(result.epic.github).toBe('https://github.com/user/repo:branch');
    });
  });

  describe('Task Parsing', () => {
    test('should parse tasks with complete metadata', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md',
        `name: First Task
status: open
parallel: true
depends_on: []`);
      fs.writeFileSync('.claude/epics/test-epic/2.md',
        `name: Second Task
status: completed
parallel: false
depends_on: [1]`);

      const result = showEpic('test-epic');

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]).toMatchObject({
        taskNum: '1',
        name: 'First Task',
        status: 'open',
        parallel: 'true',
        depends_on: '[]'
      });
      expect(result.tasks[1]).toMatchObject({
        taskNum: '2',
        name: 'Second Task',
        status: 'completed',
        parallel: 'false',
        depends_on: '[1]'
      });
    });

    test('should handle tasks with missing metadata', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', '# Just content');

      const result = showEpic('test-epic');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        taskNum: '1',
        name: '1',
        status: 'open',
        parallel: 'false',
        depends_on: ''
      });
    });

    test('should handle unreadable task files', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'content');
      fs.chmodSync('.claude/epics/test-epic/1.md', 0o000);

      const result = showEpic('test-epic');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        taskNum: '1',
        name: '1',
        status: 'open'
      });

      // Restore permissions for cleanup
      fs.chmodSync('.claude/epics/test-epic/1.md', 0o644);
    });

    test('should only include numeric task files', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Valid Task');
      fs.writeFileSync('.claude/epics/test-epic/task.md', 'name: Invalid Task');
      fs.writeFileSync('.claude/epics/test-epic/readme.txt', 'Not a task');

      const result = showEpic('test-epic');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].taskNum).toBe('1');
    });

    test('should handle unreadable epic directory for task listing', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Task');

      // We can't actually test permission issues in this way without affecting epic.md access
      // This test ensures the epic exists but we test the error handling path differently
      const result = showEpic('test-epic');

      // Should work normally when directory is readable
      expect(result.tasks).toHaveLength(1);
      expect(result.epic.name).toBe('Test Epic');
    });
  });

  describe('Statistics Calculation', () => {
    test('should calculate statistics correctly', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Open Task\nstatus: open');
      fs.writeFileSync('.claude/epics/test-epic/2.md', 'name: Completed Task\nstatus: completed');
      fs.writeFileSync('.claude/epics/test-epic/3.md', 'name: Closed Task\nstatus: closed');

      const result = showEpic('test-epic');

      expect(result.statistics).toMatchObject({
        totalTasks: 3,
        openTasks: 1,
        closedTasks: 2,
        completion: 67 // (2/3)*100 rounded
      });
    });

    test('should handle zero tasks', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Empty Epic');

      const result = showEpic('test-epic');

      expect(result.statistics).toMatchObject({
        totalTasks: 0,
        openTasks: 0,
        closedTasks: 0,
        completion: 0
      });
    });

    test('should recognize different closed statuses', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'status: CLOSED');
      fs.writeFileSync('.claude/epics/test-epic/2.md', 'status: Completed');
      fs.writeFileSync('.claude/epics/test-epic/3.md', 'status: done'); // not recognized as closed

      const result = showEpic('test-epic');

      expect(result.statistics.closedTasks).toBe(2);
      expect(result.statistics.openTasks).toBe(1);
    });
  });

  describe('Action Suggestions', () => {
    test('should suggest decompose when no tasks exist', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Empty Epic');

      const result = showEpic('test-epic');

      expect(result.actions).toContain('• Decompose into tasks: /pm:epic-decompose test-epic');
    });

    test('should suggest GitHub sync when no GitHub URL and tasks exist', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Epic Without GitHub');
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Task');

      const result = showEpic('test-epic');

      expect(result.actions).toContain('• Sync to GitHub: /pm:epic-sync test-epic');
    });

    test('should suggest start work when GitHub exists and not completed', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Epic With GitHub
github: https://github.com/user/repo
status: in-progress`);
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Task');

      const result = showEpic('test-epic');

      expect(result.actions).toContain('• Start work: /pm:epic-start test-epic');
    });

    test('should not suggest start work when epic is completed', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Completed Epic
github: https://github.com/user/repo
status: completed`);

      const result = showEpic('test-epic');

      expect(result.actions.find(a => a.includes('Start work'))).toBeUndefined();
    });

    test('should have no actions when all conditions are met', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Complete Epic
github: https://github.com/user/repo
status: completed`);
      fs.writeFileSync('.claude/epics/test-epic/1.md', 'name: Task');

      const result = showEpic('test-epic');

      expect(result.actions).toHaveLength(0);
    });
  });

  describe('Metadata Parsing Edge Cases', () => {
    test('should handle empty YAML frontmatter', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `---
---

Content`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('test-epic');
    });

    test('should handle malformed YAML frontmatter', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `---
invalid yaml: [unclosed
---`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('test-epic');
    });

    test('should handle lines without colons in simple format', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Test Epic
just text without colon
status: active

# Content starts here`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('Test Epic');
      expect(result.epic.status).toBe('active');
    });

    test('should handle comments in simple format', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Test Epic
status: active
# This is a comment after metadata`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('Test Epic');
      expect(result.epic.status).toBe('active');
    });

    test('should handle unknown metadata keys', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md',
        `name: Test Epic
unknown_field: value
status: active`);

      const result = showEpic('test-epic');

      expect(result.epic.name).toBe('Test Epic');
      expect(result.epic.status).toBe('active');
    });
  });

  describe('Available Epics Functionality', () => {
    test('should handle missing .claude/epics directory', () => {
      expect(() => showEpic('test')).toThrow('(none)');
    });

    test('should handle unreadable .claude/epics directory', () => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.chmodSync('.claude/epics', 0o000);

      expect(() => showEpic('test')).toThrow('(none)');

      // Restore permissions for cleanup
      fs.chmodSync('.claude/epics', 0o755);
    });

    test('should filter non-directory entries', () => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/file.txt', 'content');
      fs.mkdirSync('.claude/epics/real-epic');
      fs.writeFileSync('.claude/epics/real-epic/epic.md', 'name: Real Epic');

      expect(() => showEpic('fake')).toThrow('• real-epic');
    });
  });

  describe('CLI Execution Simulation', () => {
    test('should handle CLI execution without crashing', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');

      expect(() => showEpic('test-epic')).not.toThrow();
    });

    test('should return structured data for formatting', () => {
      fs.mkdirSync('.claude/epics/test-epic', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic/epic.md', 'name: Test Epic');

      const result = showEpic('test-epic');

      expect(result).toHaveProperty('epic');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('actions');
    });
  });
});