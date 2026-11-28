/**
 * Jest TDD Tests for PM Epic Close Script (epic-close.js)
 *
 * Comprehensive test suite covering all functionality of the epic-close.js script
 * Target: Improve coverage from ~8% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const EpicCloser = require('../../autopm/.claude/scripts/pm/epic-close.js');

describe('PM Epic Close Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let epicCloser;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-epic-close-jest-'));
    process.chdir(tempDir);

    // Create EpicCloser instance
    epicCloser = new EpicCloser();

    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should create EpicCloser instance with correct paths', () => {
      expect(epicCloser).toBeInstanceOf(EpicCloser);
      expect(epicCloser.epicsDir).toBe('.claude/epics');
      expect(epicCloser.prdsDir).toBe('.claude/prds');
      expect(epicCloser.activeWorkFile).toBe('.claude/active-work.json');
      expect(epicCloser.completedFile).toBe('.claude/completed-work.json');
    });

    test('should have correct default directory structure', () => {
      const expectedPaths = [
        'epicsDir',
        'prdsDir',
        'activeWorkFile',
        'completedFile'
      ];

      expectedPaths.forEach(prop => {
        expect(epicCloser).toHaveProperty(prop);
        expect(typeof epicCloser[prop]).toBe('string');
      });
    });
  });

  describe('Epic File Discovery', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.mkdirSync('.claude/prds', { recursive: true });
    });

    test('should find epic in epics directory', () => {
      const epicName = 'test-epic';
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, '# Test Epic');

      const result = epicCloser.findEpicFile(epicName);
      expect(result).toBe(epicPath);
    });

    test('should find epic in prds directory when not in epics', () => {
      const epicName = 'test-prd';
      const prdPath = path.join('.claude', 'prds', `${epicName}.md`);
      fs.writeFileSync(prdPath, '# Test PRD');

      const result = epicCloser.findEpicFile(epicName);
      expect(result).toBe(prdPath);
    });

    test('should prioritize epics directory over prds directory', () => {
      const epicName = 'duplicate-epic';
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      const prdPath = path.join('.claude', 'prds', `${epicName}.md`);

      fs.writeFileSync(epicPath, '# Epic Version');
      fs.writeFileSync(prdPath, '# PRD Version');

      const result = epicCloser.findEpicFile(epicName);
      expect(result).toBe(epicPath);
    });

    test('should return null when epic file not found', () => {
      const result = epicCloser.findEpicFile('non-existent-epic');
      expect(result).toBeNull();
    });

    test('should handle special characters in epic names', () => {
      const epicName = 'epic-with_special@chars';
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, '# Special Epic');

      const result = epicCloser.findEpicFile(epicName);
      expect(result).toBe(epicPath);
    });
  });

  describe('Active Work Management', () => {
    test('should load empty active work when file does not exist', () => {
      const activeWork = epicCloser.loadActiveWork();

      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should load active work from existing file', () => {
      const workData = {
        issues: [],
        epics: [
          { name: 'epic-1', startedAt: '2023-01-01T00:00:00Z' }
        ]
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      const activeWork = epicCloser.loadActiveWork();
      expect(activeWork).toEqual(workData);
    });

    test('should handle corrupted active work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', 'invalid json');

      const activeWork = epicCloser.loadActiveWork();
      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should save active work and create directory if needed', () => {
      const workData = {
        issues: [],
        epics: [
          { name: 'epic-1', startedAt: '2023-01-01T00:00:00Z' }
        ]
      };

      epicCloser.saveActiveWork(workData);

      expect(fs.existsSync('.claude/active-work.json')).toBe(true);
      const savedData = JSON.parse(fs.readFileSync('.claude/active-work.json', 'utf8'));
      expect(savedData).toEqual(workData);
    });
  });

  describe('Completed Work Management', () => {
    test('should load empty completed work when file does not exist', () => {
      const completedWork = epicCloser.loadCompletedWork();

      expect(completedWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should load completed work from existing file', () => {
      const workData = {
        issues: [],
        epics: [
          {
            name: 'epic-1',
            completedAt: '2023-01-01T00:00:00Z',
            status: 'completed'
          }
        ]
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/completed-work.json', JSON.stringify(workData));

      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork).toEqual(workData);
    });

    test('should handle corrupted completed work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/completed-work.json', 'invalid json');

      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should save completed work and create directory if needed', () => {
      const workData = {
        issues: [],
        epics: [
          {
            name: 'epic-1',
            completedAt: '2023-01-01T00:00:00Z',
            status: 'completed'
          }
        ]
      };

      epicCloser.saveCompletedWork(workData);

      expect(fs.existsSync('.claude/completed-work.json')).toBe(true);
      const savedData = JSON.parse(fs.readFileSync('.claude/completed-work.json', 'utf8'));
      expect(savedData).toEqual(workData);
    });

    test('should limit completed epics to 50', async () => {
      const epicName = 'new-epic';

      // Create 55 completed epics
      const completedWork = {
        issues: [],
        epics: Array.from({ length: 55 }, (_, i) => ({
          name: `epic-${i}`,
          completedAt: '2023-01-01T00:00:00Z'
        }))
      };
      epicCloser.saveCompletedWork(completedWork);

      // Setup epic file
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/new-epic.md', '# New Epic\n- [x] Task 1');

      await epicCloser.closeEpic(epicName, { force: true });

      const updatedCompletedWork = epicCloser.loadCompletedWork();
      expect(updatedCompletedWork.epics).toHaveLength(50);
      expect(updatedCompletedWork.epics[0].name).toBe(epicName); // Most recent first
    });
  });

  describe('Task Extraction and Analysis', () => {
    test('should extract completed and incomplete tasks correctly', () => {
      const epicContent = `# Test Epic

## Tasks
- [x] Completed task 1
- [ ] Incomplete task 1
- [x] Completed task 2
- [ ] Incomplete task 2
- [ ] Incomplete task 3

Some other content
- [x] Another completed task
- [ ] Another incomplete task
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(6);
      expect(tasks.completed).toBe(3);
      expect(tasks.incomplete).toBe(3);
      expect(tasks.completedTasks).toEqual([
        'Completed task 1',
        'Completed task 2',
        'Another completed task'
      ]);
      expect(tasks.incompleteTasks).toEqual([
        'Incomplete task 1',
        'Incomplete task 2',
        'Incomplete task 3',
        'Another incomplete task'
      ]);
    });

    test('should handle epic with no tasks', () => {
      const epicContent = `# Test Epic

This epic has no tasks.
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(0);
      expect(tasks.completed).toBe(0);
      expect(tasks.incomplete).toBe(0);
      expect(tasks.completedTasks).toEqual([]);
      expect(tasks.incompleteTasks).toEqual([]);
    });

    test('should handle epic with only completed tasks', () => {
      const epicContent = `# Test Epic

- [x] Task 1
- [x] Task 2
- [x] Task 3
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(3);
      expect(tasks.completed).toBe(3);
      expect(tasks.incomplete).toBe(0);
    });

    test('should handle epic with only incomplete tasks', () => {
      const epicContent = `# Test Epic

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(3);
      expect(tasks.completed).toBe(0);
      expect(tasks.incomplete).toBe(3);
    });

    test('should handle tasks with complex content', () => {
      const epicContent = `# Test Epic

- [x] Task with [link](http://example.com) and **bold** text
- [ ] Task with \`code\` and _italic_ text
- [x] Multi-line task description that
      continues on the next line
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(3);
      expect(tasks.completed).toBe(2);
      expect(tasks.incomplete).toBe(1);
    });

    test('should ignore checkbox-like content that is not a task', () => {
      const epicContent = `# Test Epic

This is not a task: [x] but looks like one
- [x] This is a real task
- This is not a checkbox: [ ] something
- [ ] This is a real incomplete task

Code block:
\`\`\`
- [x] This should not count
- [ ] Neither should this
\`\`\`
`;

      const tasks = epicCloser.extractTasksFromEpic(epicContent);

      expect(tasks.total).toBe(2);
      expect(tasks.completed).toBe(1);
      expect(tasks.incomplete).toBe(1);
    });
  });

  describe('Epic Metadata Management', () => {
    test('should update metadata in existing frontmatter', () => {
      const epicContent = `---
title: Test Epic
status: in-progress
author: test-user
---

# Test Epic

Content here
`;

      const updatedContent = epicCloser.updateEpicMetadata(epicContent, {
        status: 'completed',
        closedDate: '2023-01-01T12:00:00Z'
      });

      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).toContain('closedDate: 2023-01-01T12:00:00Z');
      expect(updatedContent).toContain('author: test-user'); // Should preserve existing
    });

    test('should add metadata to frontmatter when fields missing', () => {
      const epicContent = `---
title: Test Epic
author: test-user
---

# Test Epic

Content here
`;

      const updatedContent = epicCloser.updateEpicMetadata(epicContent, {
        status: 'completed',
        closedDate: '2023-01-01T12:00:00Z'
      });

      expect(updatedContent).toContain('title: Test Epic');
      expect(updatedContent).toContain('author: test-user');
      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).toContain('closedDate: 2023-01-01T12:00:00Z');
    });

    test('should create frontmatter when none exists', () => {
      const epicContent = `# Test Epic

This epic has no frontmatter.

## Tasks
- [x] Task 1
`;

      const updatedContent = epicCloser.updateEpicMetadata(epicContent, {
        status: 'completed',
        closedDate: '2023-01-01T12:00:00Z'
      });

      const lines = updatedContent.split('\n');
      expect(lines[1]).toBe(''); // Empty line after title
      expect(lines[2]).toBe('---');
      expect(lines[3]).toBe('status: completed');
      expect(lines[4]).toBe('closedDate: 2023-01-01T12:00:00Z');
      expect(lines[5]).toBe('---');
    });

    test('should handle epic without title header', () => {
      const epicContent = `This epic has no title header.

Content here.
`;

      const updatedContent = epicCloser.updateEpicMetadata(epicContent, {
        status: 'completed',
        closedDate: '2023-01-01T12:00:00Z'
      });

      // Should still add metadata, even without proper title
      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).toContain('closedDate: 2023-01-01T12:00:00Z');
    });

    test('should preserve complex frontmatter structure', () => {
      const epicContent = `---
title: Test Epic
tags:
  - backend
  - api
status: in-progress
team:
  lead: john
  members:
    - alice
    - bob
---

# Test Epic
`;

      const updatedContent = epicCloser.updateEpicMetadata(epicContent, {
        status: 'completed',
        closedDate: '2023-01-01T12:00:00Z'
      });

      expect(updatedContent).toContain('title: Test Epic');
      expect(updatedContent).toContain('tags:');
      expect(updatedContent).toContain('- backend');
      expect(updatedContent).toContain('team:');
      expect(updatedContent).toContain('lead: john');
      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).toContain('closedDate: 2023-01-01T12:00:00Z');
    });
  });

  describe('Epic Closing Functionality', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.mkdirSync('.claude/prds', { recursive: true });
    });

    test('should fail to close non-existent epic', async () => {
      const result = await epicCloser.closeEpic('non-existent-epic');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Epic not found'));
    });

    test('should close epic with all tasks completed', async () => {
      const epicName = 'completed-epic';
      const epicContent = `# Completed Epic

- [x] Task 1
- [x] Task 2
- [x] Task 3
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const result = await epicCloser.closeEpic(epicName);

      expect(result).toBe(true);

      // Check file was updated
      const updatedContent = fs.readFileSync(epicPath, 'utf8');
      expect(updatedContent).toContain('status: completed');
    });

    test('should refuse to close epic with incomplete tasks without force', async () => {
      const epicName = 'incomplete-epic';
      const epicContent = `# Incomplete Epic

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const result = await epicCloser.closeEpic(epicName);

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('incomplete tasks'));
    });

    test('should close epic with incomplete tasks when force option used', async () => {
      const epicName = 'force-close-epic';
      const epicContent = `# Force Close Epic

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const result = await epicCloser.closeEpic(epicName, { force: true });

      expect(result).toBe(true);

      const updatedContent = fs.readFileSync(epicPath, 'utf8');
      expect(updatedContent).toContain('status: completed');
    });

    test('should complete all tasks when completeAll option used', async () => {
      const epicName = 'complete-all-epic';
      const epicContent = `# Complete All Epic

- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const result = await epicCloser.closeEpic(epicName, { completeAll: true });

      expect(result).toBe(true);

      const updatedContent = fs.readFileSync(epicPath, 'utf8');
      expect(updatedContent).toContain('- [x] Task 1');
      expect(updatedContent).toContain('- [x] Task 2');
      expect(updatedContent).toContain('- [x] Task 3');
      expect(updatedContent).toContain('status: completed');
    });

    test('should move epic from active to completed work', async () => {
      const epicName = 'tracked-epic';
      const epicContent = `# Tracked Epic\n- [x] Task 1`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      // Setup active work
      const activeWork = {
        issues: [],
        epics: [
          { name: epicName, startedAt: '2023-01-01T10:00:00Z' }
        ]
      };
      epicCloser.saveActiveWork(activeWork);

      await epicCloser.closeEpic(epicName);

      // Check active work updated
      const updatedActiveWork = epicCloser.loadActiveWork();
      expect(updatedActiveWork.epics).toHaveLength(0);

      // Check completed work
      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork.epics).toHaveLength(1);
      expect(completedWork.epics[0]).toMatchObject({
        name: epicName,
        status: 'completed'
      });
      expect(completedWork.epics[0].completedAt).toBeDefined();
      expect(completedWork.epics[0].finalStats).toBeDefined();
    });

    test('should add epic to completed work even if not in active', async () => {
      const epicName = 'untracked-epic';
      const epicContent = `# Untracked Epic\n- [x] Task 1`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      await epicCloser.closeEpic(epicName);

      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork.epics).toHaveLength(1);
      expect(completedWork.epics[0]).toMatchObject({
        name: epicName,
        status: 'completed'
      });
    });

    test('should archive epic when archive option used', async () => {
      const epicName = 'archive-epic';
      const epicContent = `# Archive Epic\n- [x] Task 1`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      await epicCloser.closeEpic(epicName, { archive: true });

      // Original file should be moved
      expect(fs.existsSync(epicPath)).toBe(false);

      // Should exist in archive
      const archivePath = path.join('.claude', 'epics', 'archive', `${epicName}.md`);
      expect(fs.existsSync(archivePath)).toBe(true);

      const archivedContent = fs.readFileSync(archivePath, 'utf8');
      expect(archivedContent).toContain('# Archive Epic');
      expect(archivedContent).toContain('status: completed');
    });

    test('should display task statistics during close', async () => {
      const epicName = 'stats-epic';
      const epicContent = `# Stats Epic

- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
- [ ] Task 5
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      await epicCloser.closeEpic(epicName, { force: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total Tasks: 5'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Completed: 2 (40%)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Remaining: 3'));
    });

    test('should limit display of incomplete tasks to 5', async () => {
      const epicName = 'many-tasks-epic';
      const incompleteTasks = Array.from({ length: 8 }, (_, i) => `- [ ] Task ${i + 1}`);
      const epicContent = `# Many Tasks Epic\n\n${incompleteTasks.join('\n')}`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      await epicCloser.closeEpic(epicName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Task 1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Task 5'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('... and 3 more'));
    });
  });

  describe('Epic Listing Functionality', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.mkdirSync('.claude/prds', { recursive: true });
    });

    test('should list available epics from both directories', () => {
      fs.writeFileSync('.claude/epics/epic1.md', '# Epic 1');
      fs.writeFileSync('.claude/epics/epic2.md', '# Epic 2');
      fs.writeFileSync('.claude/prds/prd1.md', '# PRD 1');

      epicCloser.listAvailableEpics();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('epic1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('epic2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('prd1'));
    });

    test('should show message when no epics found', () => {
      epicCloser.listAvailableEpics();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No epics found'));
    });

    test('should deduplicate epics with same name in both directories', () => {
      fs.writeFileSync('.claude/epics/duplicate.md', '# Epic Version');
      fs.writeFileSync('.claude/prds/duplicate.md', '# PRD Version');

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      epicCloser.listAvailableEpics();

      const duplicateLines = logCalls.filter(line => line.includes('duplicate'));
      expect(duplicateLines).toHaveLength(1);

      console.log = originalLog;
    });

    test('should ignore non-markdown files', () => {
      fs.writeFileSync('.claude/epics/epic1.md', '# Epic 1');
      fs.writeFileSync('.claude/epics/readme.txt', 'Not an epic');
      fs.writeFileSync('.claude/epics/config.json', '{}');

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      epicCloser.listAvailableEpics();

      const epicLines = logCalls.filter(line => line.includes('epic1'));
      const txtLines = logCalls.filter(line => line.includes('readme'));
      const jsonLines = logCalls.filter(line => line.includes('config'));

      expect(epicLines).toHaveLength(1);
      expect(txtLines).toHaveLength(0);
      expect(jsonLines).toHaveLength(0);

      console.log = originalLog;
    });
  });

  describe('Command Line Interface', () => {
    test('should require epic name argument', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Epic name required'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should show usage options when no argument provided', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--force'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--complete-all'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--archive'));

      mockExit.mockRestore();
    });

    test('should parse force option correctly', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName, '--force']);

      expect(epicCloser.closeEpic).toHaveBeenCalledWith(epicName, { force: true });
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    test('should parse complete-all option correctly', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName, '--complete-all']);

      expect(epicCloser.closeEpic).toHaveBeenCalledWith(epicName, { completeAll: true });

      mockExit.mockRestore();
    });

    test('should parse archive option correctly', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName, '--archive']);

      expect(epicCloser.closeEpic).toHaveBeenCalledWith(epicName, { archive: true });

      mockExit.mockRestore();
    });

    test('should parse multiple options correctly', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName, '--force', '--complete-all', '--archive']);

      expect(epicCloser.closeEpic).toHaveBeenCalledWith(epicName, {
        force: true,
        completeAll: true,
        archive: true
      });

      mockExit.mockRestore();
    });

    test('should handle unknown options gracefully', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName, '--unknown-option', '--force']);

      expect(epicCloser.closeEpic).toHaveBeenCalledWith(epicName, { force: true });

      mockExit.mockRestore();
    });

    test('should exit with code 0 on success', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName]);

      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    test('should exit with code 1 on failure', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicCloser, 'closeEpic').mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicCloser.run([epicName]);

      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file system permission errors gracefully', async () => {
      const epicName = 'test-epic';

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic.md', '# Test Epic\n- [x] Task 1');

      // Mock fs.writeFileSync to throw permission error
      const originalWriteFileSync = fs.writeFileSync;
      fs.writeFileSync = jest.fn().mockImplementation((path, content) => {
        if (path.includes('test-epic.md')) {
          throw new Error('EACCES: permission denied');
        }
        return originalWriteFileSync(path, content);
      });

      // Should not crash but may not complete successfully
      await expect(epicCloser.closeEpic(epicName)).resolves.not.toThrow();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle malformed JSON files gracefully', async () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', '{ invalid json');

      const activeWork = epicCloser.loadActiveWork();
      expect(activeWork).toEqual({ issues: [], epics: [] });
    });

    test('should handle missing directories gracefully', async () => {
      const epicName = 'test-epic';

      // Create epic in non-existent directory structure
      if (fs.existsSync('.claude')) {
        fs.rmSync('.claude', { recursive: true });
      }

      // Should not crash when trying to load/save work
      await expect(epicCloser.closeEpic(epicName)).resolves.not.toThrow();
    });

    test('should handle very long epic names', async () => {
      const longEpicName = 'A'.repeat(1000);

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync(`.claude/epics/${longEpicName}.md`, '# Long Epic\n- [x] Task 1');

      await expect(epicCloser.closeEpic(longEpicName)).resolves.not.toThrow();
    });

    test('should handle special characters in epic names', async () => {
      const specialEpicName = 'epic-with_special@chars#123';

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync(`.claude/epics/${specialEpicName}.md`, '# Special Epic\n- [x] Task 1');

      await expect(epicCloser.closeEpic(specialEpicName)).resolves.not.toThrow();
    });

    test('should handle empty epic files', async () => {
      const epicName = 'empty-epic';

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/empty-epic.md', '');

      const result = await epicCloser.closeEpic(epicName);
      expect(result).toBe(true); // Should succeed even with empty file
    });

    test('should handle epic files with only whitespace', async () => {
      const epicName = 'whitespace-epic';

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/whitespace-epic.md', '   \n\n\t\t  \n  ');

      const result = await epicCloser.closeEpic(epicName);
      expect(result).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full close workflow with all options', async () => {
      const epicName = 'integration-epic';
      const epicContent = `---
title: Integration Epic
author: test-user
status: in-progress
---

# Integration Epic

This is a test epic for integration testing.

## Tasks
- [x] Completed task 1
- [ ] Incomplete task 2
- [ ] Incomplete task 3
- [x] Completed task 4

## Notes
Some notes about the epic.
`;

      // Setup files and directories
      fs.mkdirSync('.claude/epics', { recursive: true });
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      // Setup active work
      const activeWork = {
        issues: [],
        epics: [
          {
            name: epicName,
            startedAt: '2023-01-01T10:00:00Z',
            author: 'test-user'
          }
        ]
      };
      epicCloser.saveActiveWork(activeWork);

      // Close with all options
      const result = await epicCloser.closeEpic(epicName, {
        completeAll: true,
        archive: true
      });

      expect(result).toBe(true);

      // Verify epic was archived
      expect(fs.existsSync(epicPath)).toBe(false);
      const archivePath = path.join('.claude', 'epics', 'archive', `${epicName}.md`);
      expect(fs.existsSync(archivePath)).toBe(true);

      // Verify content was updated
      const archivedContent = fs.readFileSync(archivePath, 'utf8');
      expect(archivedContent).toContain('status: completed');
      expect(archivedContent).toContain('- [x] Completed task 1');
      expect(archivedContent).toContain('- [x] Incomplete task 2'); // Should be completed
      expect(archivedContent).toContain('- [x] Incomplete task 3'); // Should be completed
      expect(archivedContent).toContain('- [x] Completed task 4');

      // Verify work tracking updated
      const updatedActiveWork = epicCloser.loadActiveWork();
      expect(updatedActiveWork.epics).toHaveLength(0);

      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork.epics).toHaveLength(1);
      expect(completedWork.epics[0]).toMatchObject({
        name: epicName,
        status: 'completed'
      });
      expect(completedWork.epics[0].finalStats).toEqual({
        totalTasks: 4,
        completedTasks: 4
      });
    });

    test('should handle concurrent epic closures', async () => {
      const epicNames = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      // Setup epics
      fs.mkdirSync('.claude/epics', { recursive: true });
      epicNames.forEach(name => {
        fs.writeFileSync(`.claude/epics/${name}.md`, `# ${name}\n- [x] Task 1`);
      });

      // Setup active work for all epics
      const activeWork = {
        issues: [],
        epics: epicNames.map(name => ({
          name,
          startedAt: '2023-01-01T10:00:00Z'
        }))
      };
      epicCloser.saveActiveWork(activeWork);

      // Close all epics concurrently
      const results = await Promise.all(epicNames.map(name => epicCloser.closeEpic(name)));

      // Verify all succeeded
      results.forEach(result => expect(result).toBe(true));

      // Verify final state
      const updatedActiveWork = epicCloser.loadActiveWork();
      expect(updatedActiveWork.epics).toHaveLength(0);

      const completedWork = epicCloser.loadCompletedWork();
      expect(completedWork.epics).toHaveLength(3);

      const completedNames = completedWork.epics.map(epic => epic.name);
      epicNames.forEach(name => {
        expect(completedNames).toContain(name);
      });
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large number of tasks efficiently', async () => {
      const epicName = 'large-epic';
      const largeTasks = Array.from({ length: 1000 }, (_, i) =>
        i % 2 === 0 ? `- [x] Completed task ${i + 1}` : `- [ ] Incomplete task ${i + 1}`
      );
      const epicContent = `# Large Epic\n\n${largeTasks.join('\n')}`;

      fs.mkdirSync('.claude/epics', { recursive: true });
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const start = Date.now();
      const result = await epicCloser.closeEpic(epicName, { force: true });
      const end = Date.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(1000); // Should complete in reasonable time
    });

    test('should handle large number of completed epics efficiently', () => {
      const start = Date.now();

      const largeCompletedWork = {
        issues: [],
        epics: Array.from({ length: 1000 }, (_, i) => ({
          name: `epic-${i}`,
          completedAt: '2023-01-01T00:00:00Z'
        }))
      };

      epicCloser.saveCompletedWork(largeCompletedWork);
      const loadedWork = epicCloser.loadCompletedWork();

      const end = Date.now();

      expect(loadedWork.epics).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should be fast
    });
  });
});