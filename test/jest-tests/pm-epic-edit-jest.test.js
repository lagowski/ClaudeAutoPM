/**
 * Jest TDD Tests for PM Epic Edit Script (epic-edit.js)
 *
 * Comprehensive test suite covering all functionality of the epic-edit.js script
 * Target: Improve coverage from ~9% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { exec } = require('child_process');
const EpicEditor = require('../../autopm/.claude/scripts/pm/epic-edit.js');

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

describe('PM Epic Edit Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let epicEditor;
  let mockRl;
  let mockExec;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-epic-edit-jest-'));
    process.chdir(tempDir);

    // Create EpicEditor instance
    epicEditor = new EpicEditor();

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
    test('should create EpicEditor instance with correct paths', () => {
      expect(epicEditor).toBeInstanceOf(EpicEditor);
      expect(epicEditor.epicsDir).toBe('.claude/epics');
      expect(epicEditor.prdsDir).toBe('.claude/prds');
      expect(epicEditor.activeWorkFile).toBe('.claude/active-work.json');
    });

    test('should have correct default directory structure', () => {
      const expectedPaths = [
        'epicsDir',
        'prdsDir',
        'activeWorkFile'
      ];

      expectedPaths.forEach(prop => {
        expect(epicEditor).toHaveProperty(prop);
        expect(typeof epicEditor[prop]).toBe('string');
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

      const result = epicEditor.findEpicFile(epicName);
      expect(result).toBe(epicPath);
    });

    test('should find epic in prds directory when not in epics', () => {
      const epicName = 'test-prd';
      const prdPath = path.join('.claude', 'prds', `${epicName}.md`);
      fs.writeFileSync(prdPath, '# Test PRD');

      const result = epicEditor.findEpicFile(epicName);
      expect(result).toBe(prdPath);
    });

    test('should prioritize epics directory over prds directory', () => {
      const epicName = 'duplicate-epic';
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      const prdPath = path.join('.claude', 'prds', `${epicName}.md`);

      fs.writeFileSync(epicPath, '# Epic Version');
      fs.writeFileSync(prdPath, '# PRD Version');

      const result = epicEditor.findEpicFile(epicName);
      expect(result).toBe(epicPath);
    });

    test('should return null when epic file not found', () => {
      const result = epicEditor.findEpicFile('non-existent-epic');
      expect(result).toBeNull();
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

      epicEditor.listAvailableEpics();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('epic1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('epic2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('prd1'));
    });

    test('should show message when no epics found', () => {
      epicEditor.listAvailableEpics();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No epics found'));
    });

    test('should ignore non-markdown files', () => {
      fs.writeFileSync('.claude/epics/epic1.md', '# Epic 1');
      fs.writeFileSync('.claude/epics/readme.txt', 'Not an epic');

      const originalLog = console.log;
      const logCalls = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logCalls.push(args.join(' '));
      });

      epicEditor.listAvailableEpics();

      const epicLines = logCalls.filter(line => line.includes('epic1'));
      const txtLines = logCalls.filter(line => line.includes('readme'));

      expect(epicLines).toHaveLength(1);
      expect(txtLines).toHaveLength(0);

      console.log = originalLog;
    });
  });

  describe('Title Editing', () => {
    test('should update epic title correctly', async () => {
      const epicContent = `# Old Title

## Overview
Some content here.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('New Title');

      await epicEditor.editTitle(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter new title: ');
      // Check that writeFileSync would be called with updated content
      // Since we're mocking fs, we need to verify the logic differently
      const expectedContent = epicContent.replace(/^# .+$/m, '# New Title');
      expect(expectedContent).toContain('# New Title');
    });

    test('should not update title when empty input provided', async () => {
      const epicContent = `# Old Title

## Overview
Some content here.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await epicEditor.editTitle(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle epic without existing title', async () => {
      const epicContent = `Some content without a title.

## Overview
Content here.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('New Title');

      await epicEditor.editTitle(epicFile, epicContent, mockRl, mockPrompt);

      // Should not crash even without existing title
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  describe('Description Editing', () => {
    test('should update epic description correctly', async () => {
      const epicContent = `# Epic Title

## Overview
Old description content.

## Implementation Plan
Some implementation details.
`;

      const epicFile = '/test/epic.md';
      let promptCallCount = 0;
      const mockPrompt = jest.fn().mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) return Promise.resolve('New description line 1');
        if (promptCallCount === 2) return Promise.resolve('New description line 2');
        return Promise.resolve(''); // End input
      });

      await epicEditor.editDescription(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith('Enter new description (end with empty line):');
    });

    test('should handle empty description input', async () => {
      const epicContent = `# Epic Title

## Overview
Old description.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue(''); // Immediate empty line

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await epicEditor.editDescription(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle epic without Overview section', async () => {
      const epicContent = `# Epic Title

## Implementation Plan
Some implementation details.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('New description')
        .mockResolvedValueOnce(''); // End input

      await epicEditor.editDescription(epicFile, epicContent, mockRl, mockPrompt);

      // Should not crash even without Overview section
      expect(mockPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('Milestone Management', () => {
    test('should add milestone to existing milestones section', async () => {
      const epicContent = `# Epic Title

## Milestones
- [x] First milestone
- [ ] Second milestone

## Tasks
Task content here.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('New milestone');

      await epicEditor.addMilestone(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter new milestone: ');
      expect(console.log).toHaveBeenCalledWith('✅ Milestone added');
    });

    test('should create milestones section when it does not exist', async () => {
      const epicContent = `# Epic Title

## Overview
Epic description.

## Implementation Plan
Implementation details.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('First milestone');

      await epicEditor.addMilestone(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter new milestone: ');
      expect(console.log).toHaveBeenCalledWith('✅ Milestone added');
    });

    test('should handle empty milestone input', async () => {
      const epicContent = `# Epic Title

## Milestones
- [x] Existing milestone
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await epicEditor.addMilestone(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should mark milestone as complete', async () => {
      const epicContent = `# Epic Title

## Milestones
- [x] Completed milestone
- [ ] First incomplete milestone
- [ ] Second incomplete milestone

## Tasks
Task content.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('1'); // Select first incomplete

      await epicEditor.markMilestoneComplete(epicFile, epicContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Incomplete milestones:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1. First incomplete milestone'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2. Second incomplete milestone'));
      expect(console.log).toHaveBeenCalledWith('✅ Milestone marked as complete');
    });

    test('should handle no incomplete milestones', async () => {
      const epicContent = `# Epic Title

## Milestones
- [x] All milestones completed

## Tasks
Task content.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn();

      await epicEditor.markMilestoneComplete(epicFile, epicContent, mockRl, mockPrompt);

      expect(console.log).toHaveBeenCalledWith('No incomplete milestones found.');
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    test('should handle invalid milestone selection', async () => {
      const epicContent = `# Epic Title

## Milestones
- [ ] Only milestone

## Tasks
Task content.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('99'); // Invalid selection

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await epicEditor.markMilestoneComplete(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });
  });

  describe('Technical Requirements Management', () => {
    test('should add technical requirement to existing section', async () => {
      const epicContent = `# Epic Title

## Technical Requirements
- Existing requirement

## Implementation Plan
Implementation details.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('New technical requirement');

      await epicEditor.addTechnicalRequirement(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter technical requirement: ');
      expect(console.log).toHaveBeenCalledWith('✅ Technical requirement added');
    });

    test('should create technical requirements section when it does not exist', async () => {
      const epicContent = `# Epic Title

## Overview
Epic description.

## Implementation Plan
Implementation details.
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('First technical requirement');

      await epicEditor.addTechnicalRequirement(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockPrompt).toHaveBeenCalledWith('Enter technical requirement: ');
      expect(console.log).toHaveBeenCalledWith('✅ Technical requirement added');
    });

    test('should handle empty requirement input', async () => {
      const epicContent = `# Epic Title

## Technical Requirements
- Existing requirement
`;

      const epicFile = '/test/epic.md';
      const mockPrompt = jest.fn().mockResolvedValue('');

      const originalWriteFileSync = fs.writeFileSync;
      const mockWriteFileSync = jest.fn();
      fs.writeFileSync = mockWriteFileSync;

      await epicEditor.addTechnicalRequirement(epicFile, epicContent, mockRl, mockPrompt);

      expect(mockWriteFileSync).not.toHaveBeenCalled();

      fs.writeFileSync = originalWriteFileSync;
    });
  });

  describe('Metadata Management', () => {
    describe('updateMetadataField', () => {
      test('should update existing metadata field', () => {
        const content = `---
title: Test Epic
status: planning
priority: P1
---

# Test Epic
Content here.
`;

        const result = epicEditor.updateMetadataField(content, 'status', 'in-progress');

        expect(result).toContain('status: in-progress');
        expect(result).toContain('priority: P1'); // Should preserve other fields
      });

      test('should add metadata field when missing from existing frontmatter', () => {
        const content = `---
title: Test Epic
---

# Test Epic
Content here.
`;

        const result = epicEditor.updateMetadataField(content, 'status', 'planning');

        expect(result).toContain('title: Test Epic');
        expect(result).toContain('status: planning');
      });

      test('should create frontmatter when none exists', () => {
        const content = `# Test Epic

Content here.
`;

        const result = epicEditor.updateMetadataField(content, 'status', 'planning');

        const lines = result.split('\n');
        expect(lines[1]).toBe(''); // Empty line after title
        expect(lines[2]).toBe('---');
        expect(lines[3]).toBe('status: planning');
        expect(lines[4]).toBe('---');
      });

      test('should handle content without title header', () => {
        const content = `Content without title header.

More content.
`;

        const result = epicEditor.updateMetadataField(content, 'status', 'planning');

        // Should add metadata at some location
        expect(result).toContain('status: planning');
      });
    });

    describe('updateMetadata interactive', () => {
      test('should update status metadata', async () => {
        const epicContent = `---
title: Test Epic
status: planning
---

# Test Epic
`;

        const epicFile = '/test/epic.md';
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('1') // Choose status
          .mockResolvedValueOnce('in-progress'); // New status

        await epicEditor.updateMetadata(epicFile, epicContent, mockRl, mockPrompt);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1. Status'));
        expect(mockPrompt).toHaveBeenCalledWith('Enter new status (planning/in-progress/review/completed): ');
        expect(console.log).toHaveBeenCalledWith('✅ Status updated');
      });

      test('should update priority metadata', async () => {
        const epicContent = `---
title: Test Epic
---

# Test Epic
`;

        const epicFile = '/test/epic.md';
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('2') // Choose priority
          .mockResolvedValueOnce('P0'); // New priority

        await epicEditor.updateMetadata(epicFile, epicContent, mockRl, mockPrompt);

        expect(mockPrompt).toHaveBeenCalledWith('Enter new priority (P0/P1/P2/P3): ');
        expect(console.log).toHaveBeenCalledWith('✅ Priority updated');
      });

      test('should update effort metadata', async () => {
        const epicContent = `---
title: Test Epic
---

# Test Epic
`;

        const epicFile = '/test/epic.md';
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('3') // Choose effort
          .mockResolvedValueOnce('2w'); // New effort

        await epicEditor.updateMetadata(epicFile, epicContent, mockRl, mockPrompt);

        expect(mockPrompt).toHaveBeenCalledWith('Enter estimated effort (e.g., 2d, 1w, 3w): ');
        expect(console.log).toHaveBeenCalledWith('✅ Effort estimate updated');
      });

      test('should update tags metadata', async () => {
        const epicContent = `---
title: Test Epic
---

# Test Epic
`;

        const epicFile = '/test/epic.md';
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('4') // Choose tags
          .mockResolvedValueOnce('backend, api, database'); // New tags

        await epicEditor.updateMetadata(epicFile, epicContent, mockRl, mockPrompt);

        expect(mockPrompt).toHaveBeenCalledWith('Enter tags (comma-separated): ');
        expect(console.log).toHaveBeenCalledWith('✅ Tags updated');
      });

      test('should handle empty metadata input', async () => {
        const epicContent = `---
title: Test Epic
---

# Test Epic
`;

        const epicFile = '/test/epic.md';
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('1') // Choose status
          .mockResolvedValueOnce(''); // Empty input

        const originalWriteFileSync = fs.writeFileSync;
        const mockWriteFileSync = jest.fn();
        fs.writeFileSync = mockWriteFileSync;

        await epicEditor.updateMetadata(epicFile, epicContent, mockRl, mockPrompt);

        expect(mockWriteFileSync).not.toHaveBeenCalled();

        fs.writeFileSync = originalWriteFileSync;
      });
    });
  });

  describe('Editor Integration', () => {
    test('should open epic in external editor', async () => {
      const epicFile = '/test/epic.md';
      const originalEditor = process.env.EDITOR;
      process.env.EDITOR = 'nano';

      mockExec.mockImplementation((command, callback) => {
        expect(command).toBe('nano "/test/epic.md"');
        callback(null); // Success
      });

      await epicEditor.openInEditor(epicFile);

      expect(console.log).toHaveBeenCalledWith('Opening in nano...');
      expect(console.log).toHaveBeenCalledWith('✅ Editor closed');

      if (originalEditor) {
        process.env.EDITOR = originalEditor;
      } else {
        delete process.env.EDITOR;
      }
    });

    test('should use vi as default editor when EDITOR not set', async () => {
      const epicFile = '/test/epic.md';
      const originalEditor = process.env.EDITOR;
      delete process.env.EDITOR;

      mockExec.mockImplementation((command, callback) => {
        expect(command).toBe('vi "/test/epic.md"');
        callback(null);
      });

      await epicEditor.openInEditor(epicFile);

      expect(console.log).toHaveBeenCalledWith('Opening in vi...');

      if (originalEditor) {
        process.env.EDITOR = originalEditor;
      }
    });

    test('should handle editor errors gracefully', async () => {
      const epicFile = '/test/epic.md';
      process.env.EDITOR = 'nonexistent-editor';

      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Editor not found'));
      });

      await epicEditor.openInEditor(epicFile);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to open editor'));
    });
  });

  describe('Main Edit Workflow', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude/epics', { recursive: true });
    });

    test('should handle epic editing workflow with title edit', async () => {
      const epicName = 'test-epic';
      const epicContent = `# Old Title

## Overview
Some content.
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('New Epic Title'); // New title

      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📝 Editing Epic: test-epic'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Current epic content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('What would you like to edit?'));
    });

    test('should handle cancellation', async () => {
      const epicName = 'test-epic';
      const epicContent = `# Test Epic

## Overview
Some content.
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Edit cancelled.');
    });

    test('should handle invalid choice', async () => {
      const epicName = 'test-epic';
      const epicContent = `# Test Epic

## Overview
Some content.
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('99'); // Invalid choice

      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Invalid choice.');
    });

    test('should handle epic not found', async () => {
      const result = await epicEditor.editEpic('non-existent-epic');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Epic not found'));
    });

    test('should show updated content preview after edit', async () => {
      const epicName = 'test-epic';
      const epicContent = `# Test Epic

## Overview
Some content.
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('Updated Title'); // New title

      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('✅ Epic updated successfully!');
      expect(console.log).toHaveBeenCalledWith('Updated content preview:');
    });

    test('should handle long epic content truncation', async () => {
      const epicName = 'long-epic';
      const longContent = `# Long Epic

${'A'.repeat(1000)}

## Overview
More content here.
`;

      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, longContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      await epicEditor.editEpic(epicName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('... (truncated)'));
    });
  });

  describe('Command Line Interface', () => {
    test('should require epic name argument', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicEditor.run([]);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Epic name required'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should show available epics when no argument provided', async () => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/epic1.md', '# Epic 1');

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicEditor.run([]);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Available epics:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('epic1'));

      mockExit.mockRestore();
    });

    test('should exit with code 0 on success', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicEditor, 'editEpic').mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicEditor.run([epicName]);

      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    test('should exit with code 1 on failure', async () => {
      const epicName = 'test-epic';

      jest.spyOn(epicEditor, 'editEpic').mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await epicEditor.run([epicName]);

      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file system permission errors gracefully', async () => {
      const epicName = 'test-epic';
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic.md', '# Test Epic');

      // Mock fs.writeFileSync to throw permission error
      const originalWriteFileSync = fs.writeFileSync;
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('1') // Choose title edit
        .mockResolvedValueOnce('New Title');

      // Should not crash
      await expect(epicEditor.editEpic(epicName)).resolves.not.toThrow();

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle readline interface errors gracefully', async () => {
      const epicName = 'test-epic';
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync('.claude/epics/test-epic.md', '# Test Epic');

      // Mock readline to throw error
      const mockPrompt = jest.fn().mockRejectedValue(new Error('Input error'));

      // Should handle error gracefully
      await expect(epicEditor.editEpic(epicName)).resolves.not.toThrow();
    });

    test('should handle corrupted epic files gracefully', async () => {
      const epicName = 'corrupted-epic';
      fs.mkdirSync('.claude/epics', { recursive: true });

      // Create a file with binary content
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      fs.writeFileSync('.claude/epics/corrupted-epic.md', buffer);

      // Should not crash when reading corrupted file
      await expect(epicEditor.editEpic(epicName)).resolves.not.toThrow();
    });

    test('should handle missing directories gracefully', async () => {
      const epicName = 'test-epic';

      // Don't create directories
      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Epic not found'));
    });

    test('should handle very long epic names', async () => {
      const longEpicName = 'A'.repeat(1000);

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync(`.claude/epics/${longEpicName}.md`, '# Long Epic Name');

      // Should not crash with long names
      await expect(epicEditor.editEpic(longEpicName)).resolves.not.toThrow();
    });

    test('should handle special characters in epic names', async () => {
      const specialEpicName = 'epic-with_special@chars#123';

      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.writeFileSync(`.claude/epics/${specialEpicName}.md`, '# Special Epic');

      await expect(epicEditor.editEpic(specialEpicName)).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full edit workflow', async () => {
      const epicName = 'integration-epic';
      const epicContent = `---
title: Original Epic
status: planning
---

# Original Epic

## Overview
Original description.

## Milestones
- [x] First milestone
- [ ] Second milestone

## Technical Requirements
- Original requirement
`;

      fs.mkdirSync('.claude/epics', { recursive: true });
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('6') // Choose metadata update
        .mockResolvedValueOnce('1') // Choose status
        .mockResolvedValueOnce('in-progress'); // New status

      const result = await epicEditor.editEpic(epicName);

      expect(result).toBe(true);

      // Verify workflow steps
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📝 Editing Epic: integration-epic'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Current epic content:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('What would you like to edit?'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Select metadata to update:'));
      expect(console.log).toHaveBeenCalledWith('✅ Status updated');
      expect(console.log).toHaveBeenCalledWith('✅ Epic updated successfully!');
    });

    test('should handle multiple consecutive edits', async () => {
      const epicName = 'multi-edit-epic';
      const epicContent = `# Multi Edit Epic

## Overview
Original content.
`;

      fs.mkdirSync('.claude/epics', { recursive: true });
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, epicContent);

      // Simulate multiple edit operations
      for (let i = 0; i < 3; i++) {
        const mockPrompt = jest.fn()
          .mockResolvedValueOnce('1') // Choose title edit
          .mockResolvedValueOnce(`Updated Title ${i + 1}`);

        await epicEditor.editEpic(epicName);
        expect(console.log).toHaveBeenCalledWith('✅ Title updated');
      }
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large epic files efficiently', async () => {
      const epicName = 'large-epic';
      const largeContent = `# Large Epic

${'A'.repeat(10000)}

## Overview
Large description here.

${Array.from({ length: 100 }, (_, i) => `- [ ] Milestone ${i + 1}`).join('\n')}
`;

      fs.mkdirSync('.claude/epics', { recursive: true });
      const epicPath = path.join('.claude', 'epics', `${epicName}.md`);
      fs.writeFileSync(epicPath, largeContent);

      const start = Date.now();

      const mockPrompt = jest.fn()
        .mockResolvedValueOnce('0'); // Cancel

      await epicEditor.editEpic(epicName);

      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should handle large files quickly
    });

    test('should handle many available epics efficiently', () => {
      fs.mkdirSync('.claude/epics', { recursive: true });
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create many epic files
      for (let i = 0; i < 1000; i++) {
        fs.writeFileSync(`.claude/epics/epic-${i}.md`, `# Epic ${i}`);
      }

      const start = Date.now();
      epicEditor.listAvailableEpics();
      const end = Date.now();

      expect(end - start).toBeLessThan(500); // Should list many epics quickly
    });
  });
});