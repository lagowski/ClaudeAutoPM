// Jest suite (uses Jest globals). The -jest suffix is historical (#608).
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EpicOneshot = require('../../../../packages/plugin-pm/scripts/pm/epic-oneshot.cjs');

describe('EpicOneshot', () => {
  let tempDir;
  let oneshot;
  let originalCwd;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epic-oneshot-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create required directories
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.claude', 'prds'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.claude', 'epics'), { recursive: true });

    // Initialize EpicOneshot instance
    oneshot = new EpicOneshot();
  });

  afterEach(() => {
    // Restore working directory
    process.chdir(originalCwd);

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with correct paths', () => {
      assert.ok(oneshot.scriptsDir);
      assert.ok(oneshot.claudeDir);
      assert.ok(oneshot.prdsDir);
      assert.ok(oneshot.epicsDir);
    });
  });

  describe('extractListItems', () => {
    it('should extract bullet list items from section', () => {
      const content = `
## Features

- Feature 1
- Feature 2
- Feature 3

## Other Section
- Item A
      `;

      const items = oneshot.extractListItems(content, 'Features');
      assert.strictEqual(items.length, 3);
      assert.strictEqual(items[0], 'Feature 1');
      assert.strictEqual(items[1], 'Feature 2');
      assert.strictEqual(items[2], 'Feature 3');
    });

    it('should extract numbered list items', () => {
      const content = `
## Requirements

1. Requirement 1
2. Requirement 2

## Other Section
      `;

      const items = oneshot.extractListItems(content, 'Requirements');
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items[0], 'Requirement 1');
      assert.strictEqual(items[1], 'Requirement 2');
    });

    it('should return empty array if section not found', () => {
      const content = '## Some Section\n- Item';
      const items = oneshot.extractListItems(content, 'NonExistent');
      assert.strictEqual(items.length, 0);
    });

    it('should handle different bullet styles', () => {
      const content = `
## Features

- Hyphen item
* Asterisk item
• Bullet point item
      `;

      const items = oneshot.extractListItems(content, 'Features');
      assert.strictEqual(items.length, 3);
      assert.strictEqual(items[0], 'Hyphen item');
      assert.strictEqual(items[1], 'Asterisk item');
      assert.strictEqual(items[2], 'Bullet point item');
    });
  });

  describe('generateTasksFromEpic', () => {
    it('should generate tasks from epic content', () => {
      const epicContent = `
# Epic: Test Feature

## Features

- User authentication
- Dashboard UI
- Data export

## Requirements

- RESTful API
- PostgreSQL database
      `;

      const tasksMarkdown = oneshot.generateTasksFromEpic(epicContent, 'test-feature');

      assert.ok(tasksMarkdown.includes('## Implementation Tasks'));
      assert.ok(tasksMarkdown.includes('TASK-001'));
      assert.ok(tasksMarkdown.includes('Project setup and configuration'));
      assert.ok(tasksMarkdown.includes('User authentication'));
      assert.ok(tasksMarkdown.includes('Dashboard UI'));
      assert.ok(tasksMarkdown.includes('Data export'));
      assert.ok(tasksMarkdown.includes('RESTful API'));
      assert.ok(tasksMarkdown.includes('PostgreSQL database'));
    });

    it('should include all standard task types', () => {
      const epicContent = `
## Features
- Feature 1

## Requirements
- Requirement 1
      `;

      const tasksMarkdown = oneshot.generateTasksFromEpic(epicContent, 'test');

      // Check for all task types
      assert.ok(tasksMarkdown.includes('Type:** setup'));
      assert.ok(tasksMarkdown.includes('Type:** feature'));
      assert.ok(tasksMarkdown.includes('Type:** requirement'));
      assert.ok(tasksMarkdown.includes('Type:** integration'));
      assert.ok(tasksMarkdown.includes('Type:** testing'));
      assert.ok(tasksMarkdown.includes('Type:** deployment'));
    });

    it('should assign proper effort estimates', () => {
      const epicContent = `
## Features
- Simple feature
      `;

      const tasksMarkdown = oneshot.generateTasksFromEpic(epicContent, 'test');

      assert.ok(tasksMarkdown.includes('Effort:** 2h')); // setup
      assert.ok(tasksMarkdown.includes('Effort:** 1d')); // feature tasks
      assert.ok(tasksMarkdown.includes('Effort:** 4h')); // deployment
    });
  });

  describe('step2DecomposeTasks', () => {
    it('should append tasks to existing epic', async () => {
      const featureName = 'test-feature';
      const epicDir = path.join(tempDir, '.claude', 'epics', featureName);
      const epicFile = path.join(epicDir, 'epic.md');

      // Create epic directory and file
      fs.mkdirSync(epicDir, { recursive: true });
      fs.writeFileSync(epicFile, `
# Epic: Test Feature

## Features
- Feature A
      `, 'utf8');

      // Decompose tasks
      const success = await oneshot.step2DecomposeTasks(featureName);

      assert.strictEqual(success, true);

      // Read updated epic
      const updatedContent = fs.readFileSync(epicFile, 'utf8');
      assert.ok(updatedContent.includes('## Implementation Tasks'));
      assert.ok(updatedContent.includes('TASK-001'));
    });

    it('should skip if tasks already exist', async () => {
      const featureName = 'test-feature';
      const epicDir = path.join(tempDir, '.claude', 'epics', featureName);
      const epicFile = path.join(epicDir, 'epic.md');

      // Create epic with existing tasks
      fs.mkdirSync(epicDir, { recursive: true });
      fs.writeFileSync(epicFile, `
# Epic: Test

## Implementation Tasks
- Existing task
      `, 'utf8');

      // Try to decompose
      const success = await oneshot.step2DecomposeTasks(featureName);

      // Should succeed but not modify
      assert.strictEqual(success, true);
    });

    it('should return false if epic file not found', async () => {
      const success = await oneshot.step2DecomposeTasks('nonexistent');
      assert.strictEqual(success, false);
    });
  });

  describe('logging methods', () => {
    it('should have log method', () => {
      assert.ok(typeof oneshot.log === 'function');
    });

    it('should have error method', () => {
      assert.ok(typeof oneshot.error === 'function');
    });

    it('should have success method', () => {
      assert.ok(typeof oneshot.success === 'function');
    });
  });
});
