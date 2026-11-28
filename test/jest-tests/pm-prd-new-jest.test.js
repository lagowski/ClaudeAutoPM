/**
 * Jest TDD Tests for PM PRD New Script (prd-new.js)
 *
 * Comprehensive test suite covering all functionality of the prd-new.js script
 * Target: Improve coverage from 8.76% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const PrdCreator = require('../../autopm/.claude/scripts/pm/prd-new.js');

// Mock readline for controlled testing
jest.mock('readline', () => ({
  createInterface: jest.fn()
}));

describe('PM PRD New Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let prdCreator;
  let mockRl;
  let originalExit;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-prd-new-jest-'));
    process.chdir(tempDir);

    // Create PrdCreator instance
    prdCreator = new PrdCreator();

    // Mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockRl);

    // Mock process.exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  describe('PrdCreator Class Initialization', () => {
    test('should initialize with correct directory paths', () => {
      expect(prdCreator.prdsDir).toBe('.claude/prds');
      expect(prdCreator.templatesDir).toBe(path.join(__dirname, '..', '..', '..', '..', 'autopm', '.claude', 'scripts', 'pm', '..', '..', 'templates'));
    });

    test('should be instantiatable', () => {
      expect(prdCreator).toBeInstanceOf(PrdCreator);
      expect(typeof prdCreator.createPrd).toBe('function');
      expect(typeof prdCreator.generatePrdContent).toBe('function');
      expect(typeof prdCreator.listExistingPrds).toBe('function');
      expect(typeof prdCreator.run).toBe('function');
    });
  });

  describe('PRD Creation - createPrd Method', () => {
    const prdName = 'test-feature';

    test('should create PRDs directory if it does not exist', async () => {
      expect(fs.existsSync('.claude/prds')).toBe(false);

      // Mock readline interactions
      mockRl.question
        .mockResolvedValueOnce('Test vision') // vision
        .mockResolvedValueOnce('Test users') // users
        .mockResolvedValueOnce('') // end features list
        .mockResolvedValueOnce('Test metrics') // metrics
        .mockResolvedValueOnce('Test technical') // technical
        .mockResolvedValueOnce('P1') // priority
        .mockResolvedValueOnce('2 weeks'); // timeline

      const result = await prdCreator.createPrd(prdName);

      expect(fs.existsSync('.claude/prds')).toBe(true);
      expect(result).toBe(true);
    });

    test('should return false if PRD already exists', async () => {
      // Create PRDs directory and existing file
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/test-feature.md', 'existing content');

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(false);
    });

    test('should collect user input for PRD creation', async () => {
      const mockAnswers = {
        vision: 'Improve user experience',
        users: 'End users and administrators',
        features: ['Feature 1', 'Feature 2'],
        metrics: 'User satisfaction score',
        technical: 'React and Node.js',
        priority: 'P0',
        timeline: '4 weeks'
      };

      // Mock readline interactions
      mockRl.question
        .mockResolvedValueOnce(mockAnswers.vision)
        .mockResolvedValueOnce(mockAnswers.users)
        .mockResolvedValueOnce('Feature 1') // first feature
        .mockResolvedValueOnce('Feature 2') // second feature
        .mockResolvedValueOnce('') // end features list
        .mockResolvedValueOnce(mockAnswers.metrics)
        .mockResolvedValueOnce(mockAnswers.technical)
        .mockResolvedValueOnce(mockAnswers.priority)
        .mockResolvedValueOnce(mockAnswers.timeline);

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(true);
      expect(fs.existsSync('.claude/prds/test-feature.md')).toBe(true);

      const prdContent = fs.readFileSync('.claude/prds/test-feature.md', 'utf8');
      expect(prdContent).toContain(mockAnswers.vision);
      expect(prdContent).toContain(mockAnswers.users);
      expect(prdContent).toContain('Feature 1');
      expect(prdContent).toContain('Feature 2');
      expect(prdContent).toContain(mockAnswers.metrics);
      expect(prdContent).toContain(mockAnswers.technical);
      expect(prdContent).toContain(mockAnswers.priority);
      expect(prdContent).toContain(mockAnswers.timeline);
    });

    test('should handle empty feature list', async () => {
      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('') // no features - immediate empty line
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P2')
        .mockResolvedValueOnce('TBD');

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(true);
      const prdContent = fs.readFileSync('.claude/prds/test-feature.md', 'utf8');
      expect(prdContent).toContain('- User stories to be defined...');
    });

    test('should handle default priority when empty', async () => {
      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('') // empty priority
        .mockResolvedValueOnce('2 weeks');

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(true);
      const prdContent = fs.readFileSync('.claude/prds/test-feature.md', 'utf8');
      expect(prdContent).toContain('priority: P2'); // default priority
    });

    test('should handle multiple features correctly', async () => {
      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('Feature A')
        .mockResolvedValueOnce('Feature B')
        .mockResolvedValueOnce('Feature C')
        .mockResolvedValueOnce('Feature D')
        .mockResolvedValueOnce('Feature E')
        .mockResolvedValueOnce('Feature F')
        .mockResolvedValueOnce('Feature G')
        .mockResolvedValueOnce('Feature H')
        .mockResolvedValueOnce('') // end features
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('3 weeks');

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(true);
      const prdContent = fs.readFileSync('.claude/prds/test-feature.md', 'utf8');

      // Check that features are distributed across priority levels
      expect(prdContent).toContain('Feature A');
      expect(prdContent).toContain('Feature H');
      expect(prdContent).toContain('- [ ] Feature A'); // Must have section
      expect(prdContent).toContain('- [ ] Feature D'); // Should have section
      expect(prdContent).toContain('- [ ] Feature G'); // Nice to have section
    });

    test('should always close readline interface', async () => {
      mockRl.question.mockRejectedValue(new Error('Test error'));

      try {
        await prdCreator.createPrd(prdName);
      } catch (error) {
        // Expected to throw
      }

      expect(mockRl.close).toHaveBeenCalled();
    });

    test('should display next steps after successful creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      await prdCreator.createPrd(prdName);

      expect(consoleSpy).toHaveBeenCalledWith('💡 Next Steps:');
      expect(consoleSpy).toHaveBeenCalledWith(`  1. Review and refine: pm prd-edit ${prdName}`);
      expect(consoleSpy).toHaveBeenCalledWith(`  2. Convert to epic: pm prd-parse ${prdName}`);
      expect(consoleSpy).toHaveBeenCalledWith(`  3. View PRD: pm prd-show ${prdName}`);
      expect(consoleSpy).toHaveBeenCalledWith(`  4. List all PRDs: pm prd-list`);

      consoleSpy.mockRestore();
    });

    test('should log error when PRD already exists', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create existing PRD
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/test-feature.md', 'existing');

      const result = await prdCreator.createPrd(prdName);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ PRD already exists: ${prdName}`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`💡 Use: pm prd-edit ${prdName}`);

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('PRD Content Generation - generatePrdContent Method', () => {
    test('should generate basic PRD structure', () => {
      const prdName = 'sample-feature';
      const prdData = {
        vision: 'Sample vision',
        users: 'Sample users',
        features: [],
        metrics: 'Sample metrics',
        technical: 'Sample technical',
        priority: 'P1',
        timeline: '2 weeks'
      };

      const content = prdCreator.generatePrdContent(prdName, prdData);

      expect(content).toContain(`# PRD: ${prdName}`);
      expect(content).toContain('status: draft');
      expect(content).toContain('priority: P1');
      expect(content).toContain('timeline: 2 weeks');
      expect(content).toContain('## Executive Summary');
      expect(content).toContain('## Problem Statement');
      expect(content).toContain('## Target Users');
      expect(content).toContain('## Key Features');
      expect(content).toContain('## Success Metrics');
      expect(content).toContain('## Technical Requirements');
      expect(content).toContain('## Implementation Plan');
      expect(content).toContain('## Risks and Mitigation');
      expect(content).toContain('## Open Questions');
      expect(content).toContain('## Appendix');
    });

    test('should include user data in generated content', () => {
      const prdData = {
        vision: 'Improve user productivity',
        users: 'Power users and beginners',
        features: ['Authentication', 'Dashboard', 'Reports'],
        metrics: 'Daily active users',
        technical: 'React frontend, Node.js backend',
        priority: 'P0',
        timeline: '6 weeks'
      };

      const content = prdCreator.generatePrdContent('user-productivity', prdData);

      expect(content).toContain('Improve user productivity');
      expect(content).toContain('Power users and beginners');
      expect(content).toContain('Daily active users');
      expect(content).toContain('React frontend, Node.js backend');
      expect(content).toContain('priority: P0');
      expect(content).toContain('timeline: 6 weeks');
    });

    test('should handle empty/undefined data gracefully', () => {
      const prdData = {
        vision: '',
        users: '',
        features: [],
        metrics: '',
        technical: '',
        priority: 'P2',
        timeline: ''
      };

      const content = prdCreator.generatePrdContent('empty-feature', prdData);

      expect(content).toContain('Product vision to be defined...');
      expect(content).toContain('Target user segments to be defined...');
      expect(content).toContain('Success metrics to be defined...');
      expect(content).toContain('Technical requirements to be specified...');
      expect(content).toContain('timeline: TBD');
      expect(content).toContain('- User stories to be defined...');
    });

    test('should generate proper feature sections based on number of features', () => {
      const prdData = {
        vision: 'Test',
        users: 'Test',
        features: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'],
        metrics: 'Test',
        technical: 'Test',
        priority: 'P1',
        timeline: 'Test'
      };

      const content = prdCreator.generatePrdContent('multi-feature', prdData);

      // Must Have (P0) - first 3 features
      expect(content).toContain('- [ ] F1');
      expect(content).toContain('- [ ] F2');
      expect(content).toContain('- [ ] F3');

      // Should Have (P1) - next 3 features
      expect(content).toContain('- [ ] F4');
      expect(content).toContain('- [ ] F5');
      expect(content).toContain('- [ ] F6');

      // Nice to Have (P2) - remaining features
      expect(content).toContain('- [ ] F7');
      expect(content).toContain('- [ ] F8');
    });

    test('should include metadata and timestamp', () => {
      const originalUser = process.env.USER;
      process.env.USER = 'testuser';

      const prdData = {
        vision: 'Test',
        users: 'Test',
        features: [],
        metrics: 'Test',
        technical: 'Test',
        priority: 'P1',
        timeline: 'Test'
      };

      const content = prdCreator.generatePrdContent('meta-test', prdData);

      expect(content).toContain('author: testuser');
      expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
      expect(content).toContain('Initial PRD created by testuser');

      // Restore original USER
      if (originalUser) {
        process.env.USER = originalUser;
      } else {
        delete process.env.USER;
      }
    });

    test('should handle missing USER environment variable', () => {
      const originalUser = process.env.USER;
      delete process.env.USER;

      const prdData = {
        vision: 'Test',
        users: 'Test',
        features: [],
        metrics: 'Test',
        technical: 'Test',
        priority: 'P1',
        timeline: 'Test'
      };

      const content = prdCreator.generatePrdContent('no-user', prdData);

      expect(content).toContain('author: unknown');
      expect(content).toContain('Initial PRD created by unknown');

      // Restore original USER
      if (originalUser) {
        process.env.USER = originalUser;
      }
    });

    test('should generate user stories from features', () => {
      const prdData = {
        vision: 'Test',
        users: 'Test',
        features: ['login securely', 'view dashboard', 'generate reports'],
        metrics: 'Test',
        technical: 'Test',
        priority: 'P1',
        timeline: 'Test'
      };

      const content = prdCreator.generatePrdContent('user-stories', prdData);

      expect(content).toContain('- As a user, I want to login securely');
      expect(content).toContain('- As a user, I want to view dashboard');
      expect(content).toContain('- As a user, I want to generate reports');
    });

    test('should handle undefined timeline', () => {
      const prdData = {
        vision: 'Test',
        users: 'Test',
        features: [],
        metrics: 'Test',
        technical: 'Test',
        priority: 'P1'
        // timeline is undefined
      };

      const content = prdCreator.generatePrdContent('no-timeline', prdData);

      expect(content).toContain('timeline: TBD');
    });
  });

  describe('Existing PRDs Management - listExistingPrds Method', () => {
    test('should show message when no PRDs exist', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      prdCreator.listExistingPrds();

      expect(consoleSpy).toHaveBeenCalledWith('  No PRDs found');

      consoleSpy.mockRestore();
    });

    test('should list existing PRDs with priority and status', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create test PRDs
      fs.mkdirSync('.claude/prds', { recursive: true });

      const prd1Content = `---
status: draft
priority: P1
---
# Test PRD 1`;

      const prd2Content = `---
status: approved
priority: P0
---
# Test PRD 2`;

      fs.writeFileSync('.claude/prds/feature-1.md', prd1Content);
      fs.writeFileSync('.claude/prds/feature-2.md', prd2Content);

      prdCreator.listExistingPrds();

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Existing PRDs:');
      expect(consoleSpy).toHaveBeenCalledWith('  • feature-1 [P1] (draft)');
      expect(consoleSpy).toHaveBeenCalledWith('  • feature-2 [P0] (approved)');

      consoleSpy.mockRestore();
    });

    test('should handle PRDs without metadata', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/no-meta.md', '# Simple PRD without metadata');

      prdCreator.listExistingPrds();

      expect(consoleSpy).toHaveBeenCalledWith('  • no-meta [P2] (draft)'); // defaults

      consoleSpy.mockRestore();
    });

    test('should ignore non-markdown files', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/valid.md', '# Valid PRD');
      fs.writeFileSync('.claude/prds/invalid.txt', 'Not a markdown file');
      fs.writeFileSync('.claude/prds/README', 'No extension');

      prdCreator.listExistingPrds();

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Existing PRDs:');
      expect(consoleSpy).toHaveBeenCalledWith('  • valid [P2] (draft)');
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('invalid'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('README'));

      consoleSpy.mockRestore();
    });

    test('should handle empty PRDs directory', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      fs.mkdirSync('.claude/prds', { recursive: true });

      prdCreator.listExistingPrds();

      expect(consoleSpy).toHaveBeenCalledWith('  No PRDs found');

      consoleSpy.mockRestore();
    });

    test('should not fail when PRDs directory does not exist', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Ensure .claude/prds does not exist
      expect(fs.existsSync('.claude/prds')).toBe(false);

      expect(() => prdCreator.listExistingPrds()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('CLI Execution - run Method', () => {
    test('should create PRD with provided name argument', async () => {
      mockRl.question
        .mockResolvedValueOnce('CLI vision')
        .mockResolvedValueOnce('CLI users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('CLI metrics')
        .mockResolvedValueOnce('CLI technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      await prdCreator.run(['my-feature']);

      expect(fs.existsSync('.claude/prds/my-feature.md')).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should sanitize PRD name', async () => {
      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      await prdCreator.run(['My Feature Name!@#$%']);

      expect(fs.existsSync('.claude/prds/my-feature-name-----.md')).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should enter interactive mode when no name provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock interactions for interactive mode
      mockRl.question
        .mockResolvedValueOnce('interactive-feature') // PRD name prompt
        .mockResolvedValueOnce('Interactive vision') // vision
        .mockResolvedValueOnce('Interactive users') // users
        .mockResolvedValueOnce('') // features end
        .mockResolvedValueOnce('Interactive metrics') // metrics
        .mockResolvedValueOnce('Interactive technical') // technical
        .mockResolvedValueOnce('P2') // priority
        .mockResolvedValueOnce('4 weeks'); // timeline

      await prdCreator.run([]);

      expect(consoleSpy).toHaveBeenCalledWith('\n🚀 PRD Creation Wizard');
      expect(fs.existsSync('.claude/prds/interactive-feature.md')).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(0);

      consoleSpy.mockRestore();
    });

    test('should exit with error when no name provided in interactive mode', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockRl.question.mockResolvedValueOnce(''); // empty PRD name

      await prdCreator.run([]);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: PRD name required');
      expect(process.exit).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });

    test('should display existing PRDs in interactive mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create some existing PRDs
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/existing-1.md', `---
status: draft
priority: P1
---
# Existing PRD 1`);

      mockRl.question
        .mockResolvedValueOnce('new-feature') // PRD name
        .mockResolvedValueOnce('New vision') // vision
        .mockResolvedValueOnce('New users') // users
        .mockResolvedValueOnce('') // features end
        .mockResolvedValueOnce('New metrics') // metrics
        .mockResolvedValueOnce('New technical') // technical
        .mockResolvedValueOnce('P1') // priority
        .mockResolvedValueOnce('3 weeks'); // timeline

      await prdCreator.run([]);

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Existing PRDs:');
      expect(consoleSpy).toHaveBeenCalledWith('  • existing-1 [P1] (draft)');

      consoleSpy.mockRestore();
    });

    test('should exit with failure code when PRD creation fails', async () => {
      // Create existing PRD to force failure
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/existing-feature.md', 'existing content');

      await prdCreator.run(['existing-feature']);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');

      // Mock readline to throw error
      mockRl.question.mockRejectedValue(testError);

      await prdCreator.run(['error-test']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Test error');
      expect(process.exit).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Module Export and CLI Integration', () => {
    test('should export PrdCreator class', () => {
      expect(PrdCreator).toBeDefined();
      expect(typeof PrdCreator).toBe('function');
      expect(PrdCreator.prototype.createPrd).toBeDefined();
      expect(PrdCreator.prototype.generatePrdContent).toBeDefined();
      expect(PrdCreator.prototype.listExistingPrds).toBeDefined();
      expect(PrdCreator.prototype.run).toBeDefined();
    });

    test('should be executable as CLI script', () => {
      // Test that the module can be required without throwing
      expect(() => {
        require('../../autopm/.claude/scripts/pm/prd-new.js');
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle file system errors during directory creation', async () => {
      // Mock fs.mkdirSync to throw error
      const originalMkdirSync = fs.mkdirSync;
      fs.mkdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      try {
        await prdCreator.createPrd('test-feature');
      } catch (error) {
        expect(error.message).toBe('Permission denied');
      }

      // Restore original function
      fs.mkdirSync = originalMkdirSync;
    });

    test('should handle file write errors', async () => {
      const originalWriteFileSync = fs.writeFileSync;
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Disk full');
      });

      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      try {
        await prdCreator.createPrd('test-feature');
      } catch (error) {
        expect(error.message).toBe('Disk full');
      }

      fs.writeFileSync = originalWriteFileSync;
    });

    test('should handle corrupted PRD files during listing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/corrupted.md', 'Invalid PRD content without proper structure');

      expect(() => prdCreator.listExistingPrds()).not.toThrow();

      // Should still list the file with defaults
      expect(consoleSpy).toHaveBeenCalledWith('  • corrupted [P2] (draft)');

      consoleSpy.mockRestore();
    });

    test('should handle very long feature lists', async () => {
      const features = Array.from({ length: 50 }, (_, i) => `Feature ${i + 1}`);

      mockRl.question
        .mockResolvedValueOnce('Test vision')
        .mockResolvedValueOnce('Test users');

      // Mock feature input
      for (const feature of features) {
        mockRl.question.mockResolvedValueOnce(feature);
      }
      mockRl.question
        .mockResolvedValueOnce('') // end features
        .mockResolvedValueOnce('Test metrics')
        .mockResolvedValueOnce('Test technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      const result = await prdCreator.createPrd('many-features');

      expect(result).toBe(true);
      const content = fs.readFileSync('.claude/prds/many-features.md', 'utf8');
      expect(content).toContain('Feature 1');
      expect(content).toContain('Feature 50');
    });

    test('should handle readline interface creation failure', async () => {
      // Mock readline.createInterface to throw
      readline.createInterface.mockImplementation(() => {
        throw new Error('Interface creation failed');
      });

      await expect(prdCreator.createPrd('test-feature')).rejects.toThrow('Interface creation failed');
    });

    test('should handle unicode characters in PRD name and content', async () => {
      mockRl.question
        .mockResolvedValueOnce('Vision with émojis 🚀')
        .mockResolvedValueOnce('Users with ñiño characters')
        .mockResolvedValueOnce('Feature with 中文')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Metrics with symbols ∞')
        .mockResolvedValueOnce('Technical with λ functions')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      const result = await prdCreator.createPrd('unicode-test-ñiño-中文');

      expect(result).toBe(true);
      const content = fs.readFileSync('.claude/prds/unicode-test------.md', 'utf8');
      expect(content).toContain('Vision with émojis 🚀');
      expect(content).toContain('Users with ñiño characters');
      expect(content).toContain('Feature with 中文');
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle rapid successive PRD creation attempts', async () => {
      const createPromises = [];

      for (let i = 0; i < 5; i++) {
        const creator = new PrdCreator();
        mockRl.question
          .mockResolvedValueOnce(`Vision ${i}`)
          .mockResolvedValueOnce(`Users ${i}`)
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce(`Metrics ${i}`)
          .mockResolvedValueOnce(`Technical ${i}`)
          .mockResolvedValueOnce('P1')
          .mockResolvedValueOnce('2 weeks');

        createPromises.push(creator.createPrd(`feature-${i}`));
      }

      const results = await Promise.all(createPromises);

      results.forEach((result, index) => {
        expect(result).toBe(true);
        expect(fs.existsSync(`.claude/prds/feature-${index}.md`)).toBe(true);
      });
    });

    test('should complete PRD creation within reasonable time', async () => {
      const startTime = Date.now();

      mockRl.question
        .mockResolvedValueOnce('Quick vision')
        .mockResolvedValueOnce('Quick users')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Quick metrics')
        .mockResolvedValueOnce('Quick technical')
        .mockResolvedValueOnce('P1')
        .mockResolvedValueOnce('2 weeks');

      await prdCreator.createPrd('performance-test');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly in test environment
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});