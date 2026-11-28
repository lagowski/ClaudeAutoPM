/**
 * Jest TDD Tests for PM Issue Edit Script (issue-edit.js)
 *
 * Comprehensive test suite covering all functionality of the issue-edit.js script
 * Target: Improve coverage from ~11% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { exec } = require('child_process');
const IssueEditor = require('../../autopm/.claude/scripts/pm/issue-edit.js');

// Mock readline for interactive testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock child_process for editor testing
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('PM Issue Edit Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let issueEditor;
  let mockRl;
  let mockExec;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-issue-edit-jest-'));
    process.chdir(tempDir);

    // Create IssueEditor instance
    issueEditor = new IssueEditor();

    // Setup mocks
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockRl);
    mockExec = require('child_process').exec;

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
    test('should create IssueEditor instance with correct paths', () => {
      expect(issueEditor).toBeInstanceOf(IssueEditor);
      expect(issueEditor.issueDir).toBe('.claude/issues');
      expect(issueEditor.activeWorkFile).toBe('.claude/active-work.json');
    });

    test('should have correct default directory structure', () => {
      const expectedPaths = [
        'issueDir',
        'activeWorkFile'
      ];

      expectedPaths.forEach(prop => {
        expect(issueEditor).toHaveProperty(prop);
        expect(typeof issueEditor[prop]).toBe('string');
      });
    });
  });

  describe('Active Work Management', () => {
    test('should load empty active work when file does not exist', () => {
      const activeWork = issueEditor.loadActiveWork();

      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should load active work from existing file', () => {
      const workData = {
        issues: [
          { id: 'issue-1', status: 'in-progress', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      const activeWork = issueEditor.loadActiveWork();
      expect(activeWork).toEqual(workData);
    });

    test('should handle corrupted active work file gracefully', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', 'invalid json');

      const activeWork = issueEditor.loadActiveWork();
      expect(activeWork).toEqual({
        issues: [],
        epics: []
      });
    });

    test('should update active work when issue status changes', () => {
      const workData = {
        issues: [
          { id: 'TEST-123', status: 'in-progress', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      issueEditor.updateActiveWork('TEST-123', 'Review');

      const updatedWork = JSON.parse(fs.readFileSync('.claude/active-work.json', 'utf8'));
      expect(updatedWork.issues[0].status).toBe('review');
    });

    test('should handle active work update when issue not found', () => {
      const workData = {
        issues: [
          { id: 'OTHER-123', status: 'in-progress', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      // Should not crash when issue not found
      expect(() => issueEditor.updateActiveWork('TEST-123', 'Review')).not.toThrow();
    });
  });

  describe('Issue Listing Functionality', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/issues', { recursive: true });
    });

    test('should list available issues from issues directory', () => {
      fs.writeFileSync('.claude/issues/ISSUE-1.md', '# Issue 1');
      fs.writeFileSync('.claude/issues/ISSUE-2.md', '# Issue 2');

      issueEditor.listAvailableIssues();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-2'));
    });

    test('should show message when no issues found', () => {
      issueEditor.listAvailableIssues();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No issues found'));
    });

    test('should list active issues from active work', () => {
      const workData = {
        issues: [
          { id: 'ACTIVE-1', status: 'in-progress' },
          { id: 'ACTIVE-2', status: 'blocked' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      issueEditor.listAvailableIssues();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Active issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ACTIVE-1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ACTIVE-2'));
    });

    test('should ignore non-markdown files', () => {
      fs.writeFileSync('.claude/issues/ISSUE-1.md', '# Issue 1');
      fs.writeFileSync('.claude/issues/readme.txt', 'Not an issue');

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      issueEditor.listAvailableIssues();

      const issueLines = logCalls.filter(line => line.includes('ISSUE-1'));
      const txtLines = logCalls.filter(line => line.includes('readme'));

      expect(issueLines).toHaveLength(1);
      expect(txtLines).toHaveLength(0);

      console.log = originalLog;
    });
  });

  describe('Title Editing', () => {
    test('should update issue title correctly', async () => {
      const issueContent = `# Issue: Old Title

## Description
Some content here.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('New Title');

      await issueEditor.editTitle(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter new title: ');
      expect(console.log).toHaveBeenCalledWith('✅ Title updated');
    });

    test('should not update title when empty input provided', async () => {
      const issueContent = `# Issue: Old Title

## Description
Some content here.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.editTitle(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle issue without existing title', async () => {
      const issueContent = `Some content without a title.

## Description
Content here.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('New Title');

      await issueEditor.editTitle(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe('Description Editing', () => {
    test('should update issue description correctly', async () => {
      const issueContent = `# Issue: Test Issue

## Description
Old description content.

## Tasks
Some tasks here.
`;

      const issueFile = '/test/issue.md';
      let promptCallCount = 0;
      const mockPrompt = jest.fn().mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) return Promise.resolve('New description line 1');
        if (promptCallCount === 2) return Promise.resolve('New description line 2');
        return Promise.resolve(''); // End input
      });

      await issueEditor.editDescription(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith('Enter new description (end with empty line):');
      expect(console.log).toHaveBeenCalledWith('✅ Description updated');
    });

    test('should handle empty description input', async () => {
      const issueContent = `# Issue: Test Issue

## Description
Old description.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue(''); // Immediate empty line

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.editDescription(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle issue without Description section', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
Some tasks here.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('New description')
        .mockResolvedValueOnce(''); // End input

      await issueEditor.editDescription(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('Task Management', () => {
    test('should add task to existing tasks section', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
- [x] First task
- [ ] Second task

## Notes
Notes here.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('New task');

      await issueEditor.addTask(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter new task: ');
      expect(console.log).toHaveBeenCalledWith('✅ Task added');
    });

    test('should handle empty task input', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
- [x] Existing task
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.addTask(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should mark task as complete', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
- [x] Completed task
- [ ] First incomplete task
- [ ] Second incomplete task

## Notes
Notes content.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('1'); // Select first incomplete

      await issueEditor.markTaskComplete(issueFile, issueContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Incomplete tasks:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1. First incomplete task'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2. Second incomplete task'));
      expect(console.log).toHaveBeenCalledWith('✅ Task marked as complete');
    });

    test('should handle no incomplete tasks', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
- [x] All tasks completed

## Notes
Notes content.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn();

      await issueEditor.markTaskComplete(issueFile, issueContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith('No incomplete tasks found.');
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    test('should handle invalid task selection', async () => {
      const issueContent = `# Issue: Test Issue

## Tasks
- [ ] Only task

## Notes
Notes content.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('99'); // Invalid selection

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.markTaskComplete(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });
  });

  describe('Notes Management', () => {
    test('should add note to existing notes section', async () => {
      const issueContent = `# Issue: Test Issue

## Notes
- 2023-01-01T10:00:00.000Z: Existing note

## Tasks
Task content.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('New note content');

      // Mock Date to have consistent timestamp
      const fixedDate = new Date('2023-01-01T12:00:00.000Z');
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate.toISOString());

      await issueEditor.addNote(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter note: ');
      expect(console.log).toHaveBeenCalledWith('✅ Note added');

      Date.prototype.toISOString.mockRestore();
    });

    test('should create notes section when it does not exist', async () => {
      const issueContent = `# Issue: Test Issue

## Description
Issue description.

## Tasks
Task content.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('First note');

      const fixedDate = new Date('2023-01-01T12:00:00.000Z');
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate.toISOString());

      await issueEditor.addNote(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter note: ');
      expect(console.log).toHaveBeenCalledWith('✅ Note added');

      Date.prototype.toISOString.mockRestore();
    });

    test('should handle empty note input', async () => {
      const issueContent = `# Issue: Test Issue

## Notes
- Existing note
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.addNote(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });
  });

  describe('Status Management', () => {
    test('should change issue status', async () => {
      const issueContent = `# Issue: Test Issue

## Status
- **State**: In Progress

## Description
Issue description.
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('3'); // Select Blocked

      await issueEditor.changeStatus(issueFile, issueContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Select new status:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1. Not Started'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2. In Progress'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3. Blocked'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('4. Review'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('5. Completed'));
      expect(console.log).toHaveBeenCalledWith('✅ Status changed to: Blocked');
    });

    test('should update active work when status changed to In Progress', async () => {
      const issueContent = `# Issue: TEST-123

## Status
- **State**: Not Started
`;

      const issueFile = '.claude/issues/TEST-123.md';
      const mockPrompt = jest.fn().mockResolvedValue('2'); // Select In Progress

      // Setup active work
      const workData = {
        issues: [
          { id: 'TEST-123', status: 'not-started', startedAt: '2023-01-01T00:00:00Z' }
        ],
        epics: []
      };

      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));
      fs.writeFileSync(issueFile, issueContent);

      await issueEditor.changeStatus(issueFile, issueContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith('✅ Status changed to: In Progress');

      const updatedWork = JSON.parse(fs.readFileSync('.claude/active-work.json', 'utf8'));
      expect(updatedWork.issues[0].status).toBe('in-progress');
    });

    test('should handle invalid status choice', async () => {
      const issueContent = `# Issue: Test Issue

## Status
- **State**: In Progress
`;

      const issueFile = '/test/issue.md';
      const mockPrompt = jest.fn().mockResolvedValue('99'); // Invalid choice

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await issueEditor.changeStatus(issueFile, issueContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle all valid status choices', async () => {
      const issueContent = `# Issue: Test Issue

## Status
- **State**: In Progress
`;

      const issueFile = '/test/issue.md';
      const statuses = [
        { choice: '1', expected: 'Not Started' },
        { choice: '2', expected: 'In Progress' },
        { choice: '3', expected: 'Blocked' },
        { choice: '4', expected: 'Review' },
        { choice: '5', expected: 'Completed' }
      ];

      for (const status of statuses) {
        const mockPrompt = jest.fn().mockResolvedValue(status.choice);

        await issueEditor.changeStatus(issueFile, issueContent, mockRl, mockPrompt);

        expect(console.log).toHaveBeenCalledWith(`✅ Status changed to: ${status.expected}`);
      }
    });
  });

  describe('Editor Integration', () => {
    test('should open issue in external editor', async () => {
      const issueFile = '/test/issue.md';
      const originalEditor = process.env.EDITOR;
      process.env.EDITOR = 'nano';

      mockExec.mockImplementation((command, callback) => {
        expect(command).toBe('nano "/test/issue.md"');
        callback(null); // Success
      });

      await issueEditor.openInEditor(issueFile);

      expect(console.log).toHaveBeenCalledWith('Opening in nano...');
      expect(console.log).toHaveBeenCalledWith('✅ Editor closed');

      if (originalEditor) {
        process.env.EDITOR = originalEditor;
      } else {
        delete process.env.EDITOR;
      }
    });

    test('should use vi as default editor when EDITOR not set', async () => {
      const issueFile = '/test/issue.md';
      const originalEditor = process.env.EDITOR;
      delete process.env.EDITOR;

      mockExec.mockImplementation((command, callback) => {
        expect(command).toBe('vi "/test/issue.md"');
        callback(null);
      });

      await issueEditor.openInEditor(issueFile);

      expect(console.log).toHaveBeenCalledWith('Opening in vi...');

      if (originalEditor) {
        process.env.EDITOR = originalEditor;
      }
    });

    test('should handle editor errors gracefully', async () => {
      const issueFile = '/test/issue.md';
      process.env.EDITOR = 'nonexistent-editor';

      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Editor not found'));
      });

      await issueEditor.openInEditor(issueFile);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to open editor'));
    });
  });

  describe('Main Edit Workflow', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/issues', { recursive: true });
    });

    test('should handle issue editing workflow with title edit', async () => {
      const issueId = 'TEST-123';
      const issueContent = `# Issue: Old Title

## Description
Some content.
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('New Issue Title'); // New title

      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📝 Editing Issue: TEST-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Current issue content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('What would you like to edit?'));
    });

    test('should handle cancellation', async () => {
      const issueId = 'TEST-123';
      const issueContent = `# Issue: Test Issue

## Description
Some content.
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Edit cancelled.');
    });

    test('should handle invalid choice', async () => {
      const issueId = 'TEST-123';
      const issueContent = `# Issue: Test Issue

## Description
Some content.
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('99'); // Invalid choice

      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Invalid choice.');
    });

    test('should handle issue not found', async () => {
      const result = await issueEditor.editIssue('NON-EXISTENT');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Issue file not found'));
    });

    test('should show updated content preview after edit', async () => {
      const issueId = 'TEST-123';
      const issueContent = `# Issue: Test Issue

## Description
Some content.
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('Updated Title'); // New title

      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('✅ Issue updated successfully!');
      expect(console.log).toHaveBeenCalledWith('Updated content preview:');
    });

    test('should handle long issue content truncation', async () => {
      const issueId = 'LONG-123';
      const longContent = `# Issue: Long Issue

${'A'.repeat(1000)}

## Description
More content here.
`;

      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, longContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      await issueEditor.editIssue(issueId);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('... (truncated)'));
    });
  });

  describe('Command Line Interface', () => {
    test('should require issue ID argument', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueEditor.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Issue ID required'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should show available issues when no argument provided', async () => {
      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/issues/ISSUE-1.md', '# Issue 1');

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueEditor.run([]);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Available issues:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ISSUE-1'));

      mockExit.mockRestore();
    });

    test('should exit with code 0 on success', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueEditor, 'editIssue').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueEditor.run([issueId]);

      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    test('should exit with code 1 on failure', async () => {
      const issueId = 'TEST-123';

      jest.spyOn(issueEditor, 'editIssue').mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await issueEditor.run([issueId]);

      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file system permission errors gracefully', async () => {
      const issueId = 'TEST-123';
      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/issues/TEST-123.md', '# Test Issue');

      // Mock fs.writeFileSync to throw permission error
      const originalWriteFileSync = fs.writeFileSync;
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('New Title');

      // Should not crash
      await expect(issueEditor.editIssue(issueId)).resolves.not.toThrow();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle readline interface errors gracefully', async () => {
      const issueId = 'TEST-123';
      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync('.claude/issues/TEST-123.md', '# Test Issue');

      // Mock readline to throw error
      const mockPrompt = jest.fn().mockRejectedValue(new Error('Input error'));

      // Should handle error gracefully
      await expect(issueEditor.editIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle corrupted issue files gracefully', async () => {
      const issueId = 'CORRUPTED-123';
      fs.mkdirSync('.claude/issues', { recursive: true });

      // Create a file with binary content
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      fs.writeFileSync('.claude/issues/CORRUPTED-123.md', buffer);

      // Should not crash when reading corrupted file
      await expect(issueEditor.editIssue(issueId)).resolves.not.toThrow();
    });

    test('should handle missing directories gracefully', async () => {
      const issueId = 'TEST-123';

      // Don't create directories
      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Issue file not found'));
    });

    test('should handle very long issue IDs', async () => {
      const longIssueId = 'A'.repeat(1000);

      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync(`.claude/issues/${longIssueId}.md`, '# Long Issue ID');

      // Should not crash with long IDs
      await expect(issueEditor.editIssue(longIssueId)).resolves.not.toThrow();
    });

    test('should handle special characters in issue IDs', async () => {
      const specialIssueId = 'ISSUE-123_@#$%^&*()';

      fs.mkdirSync('.claude/issues', { recursive: true });
      fs.writeFileSync(`.claude/issues/${specialIssueId}.md`, '# Special Issue');

      await expect(issueEditor.editIssue(specialIssueId)).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full edit workflow', async () => {
      const issueId = 'INTEGRATION-123';
      const issueContent = `# Issue: Original Issue

## Status
- **State**: In Progress

## Description
Original description.

## Tasks
- [x] First task
- [ ] Second task

## Notes
- 2023-01-01T10:00:00.000Z: Original note
`;

      fs.mkdirSync('.claude/issues', { recursive: true });
      const issueFile = path.join('.claude/issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      // Setup active work
      const workData = {
        issues: [
          { id: issueId, status: 'in-progress', startedAt: '2023-01-01T10:00:00Z' }
        ],
        epics: []
      };
      fs.writeFileSync('.claude/active-work.json', JSON.stringify(workData));

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('6') // Choose status change
        .mockResolvedValueOnce('4'); // Choose Review

      const result = await issueEditor.editIssue(issueId);

      expect(result).toBe(true);

      // Verify workflow steps
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📝 Editing Issue: INTEGRATION-123'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Current issue content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('What would you like to edit?'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Select new status:'));
      expect(console.log).toHaveBeenCalledWith('✅ Status changed to: Review');
      expect(console.log).toHaveBeenCalledWith('✅ Issue updated successfully!');

      // Verify active work was updated
      const updatedWork = JSON.parse(fs.readFileSync('.claude/active-work.json', 'utf8'));
      expect(updatedWork.issues[0].status).toBe('review');
    });

    test('should handle multiple consecutive edits', async () => {
      const issueId = 'MULTI-EDIT-123';
      const issueContent = `# Issue: Multi Edit Issue

## Description
Original content.
`;

      fs.mkdirSync('.claude/issues', { recursive: true });
      const issueFile = path.join('.claude', 'issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, issueContent);

      // Simulate multiple edit operations
      for (let i = 0; i < 3; i++) {
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('1') // Choose title edit
          .mockResolvedValueOnce(`Updated Title ${i + 1}`);

        await issueEditor.editIssue(issueId);
        expect(console.log).toHaveBeenCalledWith('✅ Title updated');
      }
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large issue files efficiently', async () => {
      const issueId = 'LARGE-123';
      const largeContent = `# Issue: Large Issue

${'A'.repeat(10000)}

## Description
Large description here.

${Array.from({ length: 100 }, (_, i) => `- [ ] Task ${i + 1}`).join('\n')}
`;

      fs.mkdirSync('.claude/issues', { recursive: true });
      const issueFile = path.join('.claude/issues', `${issueId}.md`);
      fs.writeFileSync(issueFile, largeContent);

      const start = Date.now();

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      await issueEditor.editIssue(issueId);

      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should handle large files quickly
    });

    test('should handle many available issues efficiently', () => {
      fs.mkdirSync('.claude/issues', { recursive: true });

      // Create many issue files
      for (let i = 0; i < 1000; i++) {
        fs.writeFileSync(`.claude/issues/ISSUE-${i}.md`, `# Issue ${i}`);
      }

      const start = Date.now();
      issueEditor.listAvailableIssues();
      const end = Date.now();

      expect(end - start).toBeLessThan(500); // Should list many issues quickly
    });
  });
});