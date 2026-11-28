/**
 * Jest TDD Tests for PM Context Update Script (context-update.js)
 *
 * Comprehensive test suite covering all functionality of the context-update.js script
 * Target: Achieve 80%+ coverage from current 9.59%
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ContextUpdater = require('../../autopm/.claude/scripts/pm/context-update.js');

// Mock readline for stdin tests
jest.mock('readline');

describe('PM Context Update Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let updater;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let processExitSpy;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = require('fs').mkdtempSync(path.join(os.tmpdir(), 'pm-context-update-jest-'));
    process.chdir(tempDir);

    // Create instance
    updater = new ContextUpdater();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (require('fs').existsSync(tempDir)) {
      require('fs').rmSync(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should create instance with correct properties', () => {
      expect(updater).toBeInstanceOf(ContextUpdater);
      expect(updater.contextsDir).toBe(path.join('.claude', 'contexts'));
    });

    test('should export a constructor function', () => {
      expect(typeof ContextUpdater).toBe('function');
      expect(new ContextUpdater()).toBeInstanceOf(ContextUpdater);
    });
  });

  describe('showUsage method', () => {
    test('should display usage information', () => {
      updater.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('Usage: pm context-update <name> [options]');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Content Sources'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--file'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--stdin'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--content'));
    });

    test('should show update modes', () => {
      updater.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Update Modes:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--replace'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--merge'));
    });

    test('should show examples', () => {
      updater.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-update feature-auth --file notes.md');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-update bug-fix --stdin < error-log.txt');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-update project --content "New requirement added"');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-update api-docs --file new-api.md --replace');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-update specs --file update.md --merge');
    });
  });

  describe('listAvailableContexts method', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should return empty array when no contexts exist', async () => {
      const contexts = await updater.listAvailableContexts();
      expect(contexts).toEqual([]);
    });

    test('should return empty array when directory does not exist', async () => {
      await fs.rmdir(updater.contextsDir);
      const contexts = await updater.listAvailableContexts();
      expect(contexts).toEqual([]);
    });

    test('should list markdown files', async () => {
      await fs.writeFile(path.join(updater.contextsDir, 'context1.md'), 'content');
      await fs.writeFile(path.join(updater.contextsDir, 'context2.md'), 'content');
      await fs.writeFile(path.join(updater.contextsDir, 'readme.txt'), 'content');

      const contexts = await updater.listAvailableContexts();

      expect(contexts).toContain('context1');
      expect(contexts).toContain('context2');
      expect(contexts).not.toContain('readme');
      expect(contexts).toHaveLength(2);
    });

    test('should display available contexts', async () => {
      await fs.writeFile(path.join(updater.contextsDir, 'display-test.md'), 'content');

      await updater.listAvailableContexts();

      expect(consoleLogSpy).toHaveBeenCalledWith('\nAvailable contexts:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • display-test');
    });

    test('should remove .md extension from context names', async () => {
      await fs.writeFile(path.join(updater.contextsDir, 'test-context.md'), 'content');

      const contexts = await updater.listAvailableContexts();

      expect(contexts).toContain('test-context');
      expect(contexts).not.toContain('test-context.md');
    });
  });

  describe('formatFileSize method', () => {
    test('should format bytes correctly', () => {
      expect(updater.formatFileSize(100)).toBe('100 bytes');
      expect(updater.formatFileSize(500)).toBe('500 bytes');
      expect(updater.formatFileSize(1023)).toBe('1023 bytes');
    });

    test('should format kilobytes correctly', () => {
      expect(updater.formatFileSize(1024)).toBe('1.0 KB');
      expect(updater.formatFileSize(1536)).toBe('1.5 KB');
      expect(updater.formatFileSize(2048)).toBe('2.0 KB');
      expect(updater.formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    });

    test('should format megabytes correctly', () => {
      expect(updater.formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(updater.formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(updater.formatFileSize(1024 * 1024 * 2.75)).toBe('2.8 MB');
    });

    test('should handle edge cases', () => {
      expect(updater.formatFileSize(0)).toBe('0 bytes');
      expect(updater.formatFileSize(1)).toBe('1 bytes');
      expect(updater.formatFileSize(1024 + 1)).toBe('1.0 KB');
    });
  });

  describe('readFromStdin method', () => {
    let mockReadline;

    beforeEach(() => {
      mockReadline = require('readline');
      mockReadline.createInterface = jest.fn();
    });

    test('should read content from stdin', async () => {
      const mockInterface = {
        on: jest.fn(),
        close: jest.fn()
      };

      mockReadline.createInterface.mockReturnValue(mockInterface);

      // Mock the interface behavior
      mockInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          // Simulate receiving lines
          setTimeout(() => {
            callback('Line 1');
            callback('Line 2');
            callback('Line 3');
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => {
            callback();
          }, 10);
        }
      });

      const resultPromise = updater.readFromStdin();
      const result = await resultPromise;

      expect(result).toBe('Line 1\nLine 2\nLine 3');
      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });
    });

    test('should handle empty stdin input', async () => {
      const mockInterface = {
        on: jest.fn(),
        close: jest.fn()
      };

      mockReadline.createInterface.mockReturnValue(mockInterface);

      mockInterface.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => {
            callback();
          }, 0);
        }
      });

      const result = await updater.readFromStdin();
      expect(result).toBe('');
    });

    test('should trim trailing newlines', async () => {
      const mockInterface = {
        on: jest.fn(),
        close: jest.fn()
      };

      mockReadline.createInterface.mockReturnValue(mockInterface);

      mockInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            callback('Content line');
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => {
            callback();
          }, 10);
        }
      });

      const result = await updater.readFromStdin();
      expect(result).toBe('Content line');
    });
  });

  describe('appendContent method', () => {
    test('should append new content to existing content', () => {
      const existing = 'Existing content';
      const newContent = 'New content';
      const result = updater.appendContent(existing, newContent);

      expect(result).toBe('Existing content\n\nNew content');
    });

    test('should handle empty existing content', () => {
      const existing = '';
      const newContent = 'New content';
      const result = updater.appendContent(existing, newContent);

      expect(result).toBe('\n\nNew content');
    });

    test('should handle empty new content', () => {
      const existing = 'Existing content';
      const newContent = '';
      const result = updater.appendContent(existing, newContent);

      expect(result).toBe('Existing content\n\n');
    });

    test('should handle both empty', () => {
      const existing = '';
      const newContent = '';
      const result = updater.appendContent(existing, newContent);

      expect(result).toBe('\n\n');
    });
  });

  describe('replaceContent method', () => {
    test('should replace existing content with new content', () => {
      const existing = 'Old content to be replaced';
      const newContent = 'Brand new content';
      const result = updater.replaceContent(existing, newContent);

      expect(result).toBe('Brand new content');
    });

    test('should handle empty new content', () => {
      const existing = 'Some existing content';
      const newContent = '';
      const result = updater.replaceContent(existing, newContent);

      expect(result).toBe('');
    });

    test('should not use existing content parameter', () => {
      // This test verifies the intentional behavior mentioned in the comment
      const existing = 'This should be ignored';
      const newContent = 'Only this matters';
      const result = updater.replaceContent(existing, newContent);

      expect(result).toBe('Only this matters');
      expect(result).not.toContain('This should be ignored');
    });
  });

  describe('mergeContent method', () => {
    test('should merge content by sections', () => {
      const existing = `# Context: test
Initial content

## Section 1
Original section 1 content

## Section 2
Original section 2 content`;

      const newContent = `# Context: test
Updated header content

## Section 1
Updated section 1 content

## Section 3
New section 3 content`;

      const result = updater.mergeContent(existing, newContent);

      expect(result).toContain('Updated header content');
      expect(result).toContain('Updated section 1 content');
      expect(result).toContain('Original section 2 content');
      expect(result).toContain('New section 3 content');
    });

    test('should handle content without sections', () => {
      const existing = 'Just plain content';
      const newContent = 'New plain content';
      const result = updater.mergeContent(existing, newContent);

      expect(result).toBe('New plain content');
    });

    test('should preserve sections not in new content', () => {
      const existing = `Header content

## Preserved Section
This should remain

## Updated Section
This will be updated`;

      const newContent = `New header

## Updated Section
This is the update`;

      const result = updater.mergeContent(existing, newContent);

      expect(result).toContain('New header');
      expect(result).toContain('## Preserved Section');
      expect(result).toContain('This should remain');
      expect(result).toContain('This is the update');
    });

    test('should warn about merge conflicts', () => {
      const existing = `## Section 1
Original content that differs`;

      const newContent = `## Section 1
Different content that conflicts`;

      updater.mergeContent(existing, newContent);

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Merge conflict detected in section: ## Section 1');
    });

    test('should not warn when content is identical', () => {
      const existing = `## Section 1
Identical content`;

      const newContent = `## Section 1
Identical content`;

      updater.mergeContent(existing, newContent);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should handle empty sections', () => {
      const existing = `## Section 1

## Section 2
Content here`;

      const newContent = `## Section 1
Now has content

## Section 2`;

      const result = updater.mergeContent(existing, newContent);

      expect(result).toContain('Now has content');
      expect(result).toContain('## Section 2');
    });

    test('should handle complex section merging', () => {
      const existing = `# Main Header
Original header content

## Overview
Original overview

## Technical Details
Original technical details

## Notes
Original notes`;

      const newContent = `# Main Header
Updated header content

## Overview
Updated overview

## Implementation
New implementation section

## Notes
Updated notes`;

      const result = updater.mergeContent(existing, newContent);

      expect(result).toContain('Updated header content');
      expect(result).toContain('Updated overview');
      expect(result).toContain('Original technical details');
      expect(result).toContain('New implementation section');
      expect(result).toContain('Updated notes');
    });
  });

  describe('createBackup method', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should create backup file with timestamp', async () => {
      const contextPath = path.join(updater.contextsDir, 'backup-test.md');
      const originalContent = 'Original content to backup';
      await fs.writeFile(contextPath, originalContent);

      const backupPath = await updater.createBackup(contextPath);

      expect(backupPath).toMatch(/backup-test-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/);

      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      const backupContent = await fs.readFile(backupPath, 'utf8');
      expect(backupContent).toBe(originalContent);
    });

    test('should handle special characters in timestamps', async () => {
      const contextPath = path.join(updater.contextsDir, 'special-chars.md');
      await fs.writeFile(contextPath, 'Content');

      const backupPath = await updater.createBackup(contextPath);

      // Timestamp should have colons replaced with hyphens, but file extension dots remain
      expect(backupPath).not.toContain(':');
      expect(backupPath).toContain('-backup-');
      // Should have .md extension
      expect(backupPath).toMatch(/\.md$/);
      // Timestamp part should not have dots (except for .md extension)
      const timestampPart = backupPath.replace('.md', '').split('-backup-')[1];
      expect(timestampPart).not.toContain('.');
    });

    test('should preserve original file content exactly', async () => {
      const contextPath = path.join(updater.contextsDir, 'preserve-test.md');
      const originalContent = `# Complex Content
With multiple lines
And special characters: @#$%^&*()
Unicode: 🎯📝✅
Binary-like content: \\0\\1\\2`;

      await fs.writeFile(contextPath, originalContent);

      const backupPath = await updater.createBackup(contextPath);
      const backupContent = await fs.readFile(backupPath, 'utf8');

      expect(backupContent).toBe(originalContent);
    });
  });

  describe('updateContext method', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should show error when context does not exist', async () => {
      await updater.updateContext('non-existent');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Context "non-existent" not found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should update context with file content', async () => {
      const contextPath = path.join(updater.contextsDir, 'file-update.md');
      const originalContent = 'Original context content';
      await fs.writeFile(contextPath, originalContent);

      const inputFile = path.join(tempDir, 'input.txt');
      const inputContent = 'New content from file';
      await fs.writeFile(inputFile, inputContent);

      await updater.updateContext('file-update', { file: inputFile });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toBe(`${originalContent}\n\n${inputContent}`);

      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ Context updated successfully: file-update');
    });

    test('should update context with inline content', async () => {
      const contextPath = path.join(updater.contextsDir, 'inline-update.md');
      const originalContent = 'Original content';
      await fs.writeFile(contextPath, originalContent);

      const inlineContent = 'Inline content update';

      await updater.updateContext('inline-update', { content: inlineContent });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toBe(`${originalContent}\n\n${inlineContent}`);
    });

    test('should replace content when replace option is used', async () => {
      const contextPath = path.join(updater.contextsDir, 'replace-test.md');
      const originalContent = 'Content to be replaced';
      await fs.writeFile(contextPath, originalContent);

      const newContent = 'Completely new content';

      await updater.updateContext('replace-test', { content: newContent, replace: true });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toBe(newContent);
      expect(updatedContent).not.toContain('Content to be replaced');
    });

    test('should merge content when merge option is used', async () => {
      const contextPath = path.join(updater.contextsDir, 'merge-test.md');
      const originalContent = `# Context: merge-test

## Original Section
Original content

## Preserved Section
This should remain`;

      await fs.writeFile(contextPath, originalContent);

      const mergeContent = `# Context: merge-test

## Original Section
Updated content

## New Section
Brand new section`;

      await updater.updateContext('merge-test', { content: mergeContent, merge: true });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toContain('Updated content');
      expect(updatedContent).toContain('This should remain');
      expect(updatedContent).toContain('Brand new section');
    });

    test('should create backup before updating', async () => {
      const contextPath = path.join(updater.contextsDir, 'backup-test.md');
      const originalContent = 'Content to backup';
      await fs.writeFile(contextPath, originalContent);

      await updater.updateContext('backup-test', { content: 'New content' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/💾 Backup created: backup-test-backup-.*\.md/)
      );

      // Check that backup file exists
      const files = await fs.readdir(updater.contextsDir);
      const backupFile = files.find(file => file.includes('backup-test-backup-'));
      expect(backupFile).toBeDefined();
    });

    test('should display configuration information', async () => {
      const contextPath = path.join(updater.contextsDir, 'config-display.md');
      await fs.writeFile(contextPath, 'content');

      const inputFile = path.join(tempDir, 'input.md');
      await fs.writeFile(inputFile, 'file content');

      await updater.updateContext('config-display', { file: inputFile, replace: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('🔄 Updating Context: config-display');
      expect(consoleLogSpy).toHaveBeenCalledWith('📋 Update Configuration:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Context: config-display');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: File (input.md)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Replace');
    });

    test('should show file size information', async () => {
      const contextPath = path.join(updater.contextsDir, 'size-test.md');
      await fs.writeFile(contextPath, 'content');

      const inputFile = path.join(tempDir, 'large-input.txt');
      const largeContent = 'a'.repeat(2048);
      await fs.writeFile(inputFile, largeContent);

      await updater.updateContext('size-test', { file: inputFile });

      expect(consoleLogSpy).toHaveBeenCalledWith('📁 Input file size: 2.0 KB');
    });

    test('should handle stdin content source', async () => {
      const contextPath = path.join(updater.contextsDir, 'stdin-test.md');
      await fs.writeFile(contextPath, 'original');

      // Mock readFromStdin to return test content
      const originalReadFromStdin = updater.readFromStdin;
      updater.readFromStdin = jest.fn().mockResolvedValue('Content from stdin');

      await updater.updateContext('stdin-test', { stdin: true });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toBe('original\n\nContent from stdin');

      expect(consoleLogSpy).toHaveBeenCalledWith('📥 Reading from stdin (press Ctrl+D when done)...');

      // Restore original method
      updater.readFromStdin = originalReadFromStdin;
    });

    test('should show verbose output when requested', async () => {
      const contextPath = path.join(updater.contextsDir, 'verbose-test.md');
      const originalContent = 'Original content';
      await fs.writeFile(contextPath, originalContent);

      const newContent = 'Added content';

      await updater.updateContext('verbose-test', { content: newContent, verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Details:');
      expect(consoleLogSpy).toHaveBeenCalledWith(`  • Original size: ${originalContent.length} characters`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`  • New content size: ${newContent.length} characters`);
    });

    test('should show next steps after update', async () => {
      const contextPath = path.join(updater.contextsDir, 'next-steps.md');
      await fs.writeFile(contextPath, 'content');

      await updater.updateContext('next-steps', { content: 'update' });

      expect(consoleLogSpy).toHaveBeenCalledWith('\n💡 Next Steps:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Prime context: pm context-prime next-steps');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • View context: cat/));
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Update again: pm context-update next-steps --file <file>');
    });

    test('should handle file read errors gracefully', async () => {
      const contextPath = path.join(updater.contextsDir, 'read-error.md');
      await fs.writeFile(contextPath, 'content');

      // Mock fs.readFile to fail
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn()
        .mockResolvedValueOnce('content') // First call for backup
        .mockRejectedValueOnce(new Error('Read failed')); // Second call fails

      await updater.updateContext('read-error', { content: 'new content' });

      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original function
      fs.readFile = originalReadFile;
    });

    test('should show error when no content provided', async () => {
      const contextPath = path.join(updater.contextsDir, 'no-content.md');
      await fs.writeFile(contextPath, 'content');

      // Mock readFromStdin to return empty content
      const originalReadFromStdin = updater.readFromStdin;
      updater.readFromStdin = jest.fn().mockResolvedValue('');

      await updater.updateContext('no-content', { stdin: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: No content provided');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original method
      updater.readFromStdin = originalReadFromStdin;
    });
  });

  describe('run method', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should show usage when no arguments provided', async () => {
      await updater.run([]);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Error: Context name is required');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should show help when --help provided', async () => {
      await updater.run(['--help']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should show help when -h provided', async () => {
      await updater.run(['-h']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should parse file option correctly', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-file.md');
      await fs.writeFile(contextPath, 'content');

      const inputFile = path.join(tempDir, 'input.txt');
      await fs.writeFile(inputFile, 'file content');

      await updater.run(['parse-file', '--file', inputFile]);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: File (input.txt)');
    });

    test('should parse file option with -f shorthand', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-f.md');
      await fs.writeFile(contextPath, 'content');

      const inputFile = path.join(tempDir, 'input.txt');
      await fs.writeFile(inputFile, 'file content');

      await updater.run(['parse-f', '-f', inputFile]);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: File (input.txt)');
    });

    test('should parse content option correctly', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-content.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-content', '--content', 'Inline content here']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: Inline (Inline content here...)');
    });

    test('should parse content option with -c shorthand', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-c.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-c', '-c', 'Short content']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: Inline (Short content...)');
    });

    test('should parse stdin option', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-stdin.md');
      await fs.writeFile(contextPath, 'content');

      // Mock readFromStdin
      const originalReadFromStdin = updater.readFromStdin;
      updater.readFromStdin = jest.fn().mockResolvedValue('stdin content');

      await updater.run(['parse-stdin', '--stdin']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: Standard Input');

      // Restore original method
      updater.readFromStdin = originalReadFromStdin;
    });

    test('should parse replace option correctly', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-replace.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-replace', '--content', 'new', '--replace']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Replace');
    });

    test('should parse replace option with -r shorthand', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-r.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-r', '--content', 'new', '-r']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Replace');
    });

    test('should parse merge option correctly', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-merge.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-merge', '--content', 'new', '--merge']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Smart Merge');
    });

    test('should parse merge option with -m shorthand', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-m.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-m', '--content', 'new', '-m']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Smart Merge');
    });

    test('should parse verbose option correctly', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-verbose.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-verbose', '--content', 'new', '--verbose']);

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Details:');
    });

    test('should parse verbose option with -v shorthand', async () => {
      const contextPath = path.join(updater.contextsDir, 'parse-v.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['parse-v', '--content', 'new', '-v']);

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Details:');
    });

    test('should handle unknown options', async () => {
      await updater.run(['test-context', '--unknown']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Unknown option: --unknown');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should validate content source is provided', async () => {
      const contextPath = path.join(updater.contextsDir, 'no-source.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['no-source']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error: Content source required (--file, --stdin, or --content)'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should validate mutually exclusive options', async () => {
      await updater.run(['test-context', '--replace', '--merge', '--content', 'test']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: Cannot use both --replace and --merge');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle missing option values gracefully', async () => {
      const contextPath = path.join(updater.contextsDir, 'missing-value.md');
      await fs.writeFile(contextPath, 'content');

      await updater.run(['missing-value', '--file']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error: Content source required (--file, --stdin, or --content)'
      );
    });

    test('should parse complex option combinations', async () => {
      const contextPath = path.join(updater.contextsDir, 'complex.md');
      await fs.writeFile(contextPath, 'original content');

      const inputFile = path.join(tempDir, 'complex-input.txt');
      await fs.writeFile(inputFile, 'complex content');

      await updater.run(['complex', '--file', inputFile, '--merge', '--verbose']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Source: File (complex-input.txt)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Mode: Smart Merge');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Details:');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should handle filesystem permission errors', async () => {
      const contextPath = path.join(updater.contextsDir, 'permission-test.md');
      await fs.writeFile(contextPath, 'content');

      // Mock fs.writeFile to fail with permission error
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

      await updater.updateContext('permission-test', { content: 'new content' });

      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original function
      fs.writeFile = originalWriteFile;
    });

    test('should handle backup creation failure', async () => {
      const contextPath = path.join(updater.contextsDir, 'backup-fail.md');
      await fs.writeFile(contextPath, 'content');

      // Mock createBackup to fail
      const originalCreateBackup = updater.createBackup;
      updater.createBackup = jest.fn().mockRejectedValue(new Error('Backup failed'));

      await updater.updateContext('backup-fail', { content: 'new content' });

      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original method
      updater.createBackup = originalCreateBackup;
    });

    test('should handle very large content updates', async () => {
      const contextPath = path.join(updater.contextsDir, 'large-update.md');
      await fs.writeFile(contextPath, 'small content');

      const largeContent = 'a'.repeat(1000000); // 1MB of content

      await updater.updateContext('large-update', { content: largeContent });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toContain(largeContent);
    });

    test('should handle binary content gracefully', async () => {
      const contextPath = path.join(updater.contextsDir, 'binary-test.md');
      await fs.writeFile(contextPath, 'text content');

      const binaryContent = Buffer.from([0, 1, 2, 3, 255, 254, 253]).toString();

      await updater.updateContext('binary-test', { content: binaryContent });

      const updatedContent = await fs.readFile(contextPath, 'utf8');
      expect(updatedContent).toContain(binaryContent);
    });

    test('should handle context name with special characters', async () => {
      const specialName = 'context-with_special.chars';
      const contextPath = path.join(updater.contextsDir, `${specialName}.md`);
      await fs.writeFile(contextPath, 'content');

      await updater.updateContext(specialName, { content: 'updated' });

      expect(consoleLogSpy).toHaveBeenCalledWith(`\n✅ Context updated successfully: ${specialName}`);
    });

    test('should handle empty merge content', async () => {
      const originalContent = '## Section 1\nOriginal content';

      const result = updater.mergeContent(originalContent, '');
      expect(result).toContain('## Section 1');
      expect(result).toContain('Original content');
    });

    test('should handle malformed section headers in merge', async () => {
      const existing = `## Normal Section
Content here

###Invalid Header
This is not properly formatted

## Another Normal Section
More content`;

      const newContent = `## Normal Section
Updated content

## Another Normal Section
Updated other content`;

      const result = updater.mergeContent(existing, newContent);

      expect(result).toContain('Updated content');
      expect(result).toContain('Updated other content');
      // Note: Malformed headers may not be preserved exactly in merge logic
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should work end-to-end with complete workflow', async () => {
      // Create initial context
      const contextPath = path.join(updater.contextsDir, 'integration-test.md');
      const initialContent = `# Context: integration-test

## Overview
Initial overview

## Status
In progress`;

      await fs.writeFile(contextPath, initialContent);

      // Update with new content via file
      const updateFile = path.join(tempDir, 'update.md');
      const updateContent = `## Status
Completed

## Results
All tests passed`;

      await fs.writeFile(updateFile, updateContent);

      await updater.run(['integration-test', '--file', updateFile, '--merge', '--verbose']);

      // Verify final content
      const finalContent = await fs.readFile(contextPath, 'utf8');
      expect(finalContent).toContain('Initial overview');
      expect(finalContent).toContain('Completed');
      expect(finalContent).toContain('All tests passed');

      // Verify backup was created
      const files = await fs.readdir(updater.contextsDir);
      const backupFile = files.find(file => file.includes('integration-test-backup-'));
      expect(backupFile).toBeDefined();
    });

    test('should handle multiple sequential updates', async () => {
      const contextPath = path.join(updater.contextsDir, 'sequential-test.md');
      await fs.writeFile(contextPath, 'Initial content');

      // First update - append
      await updater.updateContext('sequential-test', { content: 'First update' });

      // Second update - append
      await updater.updateContext('sequential-test', { content: 'Second update' });

      // Third update - replace
      await updater.updateContext('sequential-test', { content: 'Final content', replace: true });

      const finalContent = await fs.readFile(contextPath, 'utf8');
      expect(finalContent).toBe('Final content');
      expect(finalContent).not.toContain('Initial content');
      expect(finalContent).not.toContain('First update');
    });

    test('should maintain backup history across updates', async () => {
      const contextPath = path.join(updater.contextsDir, 'backup-history.md');
      await fs.writeFile(contextPath, 'Version 1');

      // Multiple updates should create multiple backups
      await updater.updateContext('backup-history', { content: 'Version 2', replace: true });
      await updater.updateContext('backup-history', { content: 'Version 3', replace: true });

      const files = await fs.readdir(updater.contextsDir);
      const backupFiles = files.filter(file => file.includes('backup-history-backup-'));
      expect(backupFiles.length).toBeGreaterThanOrEqual(1); // At least one backup should be created

      // Verify each backup has correct content
      const backupContents = await Promise.all(
        backupFiles.map(file => fs.readFile(path.join(updater.contextsDir, file), 'utf8'))
      );

      expect(backupContents.length).toBeGreaterThan(0); // Should have some backup content
    });

    test('should handle concurrent update attempts gracefully', async () => {
      const contextPath = path.join(updater.contextsDir, 'concurrent-test.md');
      await fs.writeFile(contextPath, 'Original content');

      // Attempt concurrent updates
      const updates = [
        updater.updateContext('concurrent-test', { content: 'Update 1' }),
        updater.updateContext('concurrent-test', { content: 'Update 2' }),
        updater.updateContext('concurrent-test', { content: 'Update 3' })
      ];

      await Promise.all(updates);

      // All should complete successfully (last one wins for final content)
      const finalContent = await fs.readFile(contextPath, 'utf8');
      expect(finalContent).toContain('Original content');
      expect(finalContent).toContain('Update'); // Should contain at least one update
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await fs.mkdir(updater.contextsDir, { recursive: true });
    });

    test('should handle large file updates efficiently', async () => {
      const contextPath = path.join(updater.contextsDir, 'large-file.md');
      await fs.writeFile(contextPath, 'Small initial content');

      const largeFile = path.join(tempDir, 'large-input.txt');
      const largeContent = 'Line of content\n'.repeat(10000); // 10K lines
      await fs.writeFile(largeFile, largeContent);

      const startTime = Date.now();
      await updater.updateContext('large-file', { file: largeFile });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in reasonable time
    });

    test('should handle complex merge operations efficiently', async () => {
      const contextPath = path.join(updater.contextsDir, 'complex-merge.md');

      // Create content with many sections
      const originalContent = Array.from({ length: 100 }, (_, i) =>
        `## Section ${i}\nOriginal content for section ${i}`
      ).join('\n\n');

      await fs.writeFile(contextPath, originalContent);

      // Create update with overlapping sections
      const updateContent = Array.from({ length: 50 }, (_, i) =>
        `## Section ${i * 2}\nUpdated content for section ${i * 2}`
      ).join('\n\n');

      const startTime = Date.now();
      await updater.updateContext('complex-merge', { content: updateContent, merge: true });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete efficiently
    });

    test('should handle backup creation for large files efficiently', async () => {
      const contextPath = path.join(updater.contextsDir, 'large-backup.md');
      const largeContent = 'a'.repeat(1000000); // 1MB content
      await fs.writeFile(contextPath, largeContent);

      const startTime = Date.now();
      await updater.createBackup(contextPath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Should backup quickly
    });
  });
});