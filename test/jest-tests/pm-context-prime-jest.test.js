/**
 * Jest TDD Tests for PM Context Prime Script (context-prime.js)
 *
 * Comprehensive test suite covering all functionality of the context-prime.js script
 * Target: Achieve 80%+ coverage from current 9.55%
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ContextPrimer = require('../../autopm/.claude/scripts/pm/context-prime.js');

describe('PM Context Prime Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let primer;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let processExitSpy;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = require('fs').mkdtempSync(path.join(os.tmpdir(), 'pm-context-prime-jest-'));
    process.chdir(tempDir);

    // Create instance
    primer = new ContextPrimer();

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
      expect(primer).toBeInstanceOf(ContextPrimer);
      expect(primer.contextsDir).toBe(path.join('.claude', 'contexts'));
      expect(primer.sessionFile).toBe(path.join('.claude', 'contexts', '.current-session.json'));
    });

    test('should export a constructor function', () => {
      expect(typeof ContextPrimer).toBe('function');
      expect(new ContextPrimer()).toBeInstanceOf(ContextPrimer);
    });
  });

  describe('showUsage method', () => {
    test('should display usage information', () => {
      primer.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('Usage: pm context-prime [name] [options]');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--list'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--chunked'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--verbose'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--dry-run'));
    });

    test('should show examples in usage', () => {
      primer.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-prime feature-auth');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-prime --list');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-prime project-overview --verbose');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-prime large-context --chunked');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-prime test-context --dry-run');
    });
  });

  describe('formatSize method', () => {
    test('should format bytes correctly', () => {
      expect(primer.formatSize(100)).toBe('100 bytes');
      expect(primer.formatSize(500)).toBe('500 bytes');
      expect(primer.formatSize(1023)).toBe('1023 bytes');
    });

    test('should format kilobytes correctly', () => {
      expect(primer.formatSize(1024)).toBe('1.0 KB');
      expect(primer.formatSize(1536)).toBe('1.5 KB');
      expect(primer.formatSize(2048)).toBe('2.0 KB');
      expect(primer.formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    });

    test('should format megabytes correctly', () => {
      expect(primer.formatSize(1024 * 1024)).toBe('1.0 MB');
      expect(primer.formatSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(primer.formatSize(1024 * 1024 * 2.75)).toBe('2.8 MB');
    });

    test('should handle edge cases', () => {
      expect(primer.formatSize(0)).toBe('0 bytes');
      expect(primer.formatSize(1)).toBe('1 bytes');
      expect(primer.formatSize(1024 + 1)).toBe('1.0 KB');
    });
  });

  describe('getCurrentSession method', () => {
    test('should return null when no session file exists', async () => {
      const session = await primer.getCurrentSession();
      expect(session).toBeNull();
    });

    test('should return null when session file is invalid JSON', async () => {
      await fs.mkdir(path.dirname(primer.sessionFile), { recursive: true });
      await fs.writeFile(primer.sessionFile, 'invalid json');

      const session = await primer.getCurrentSession();
      expect(session).toBeNull();
    });

    test('should return null when session has no context', async () => {
      await fs.mkdir(path.dirname(primer.sessionFile), { recursive: true });
      await fs.writeFile(primer.sessionFile, JSON.stringify({ timestamp: new Date().toISOString() }));

      const session = await primer.getCurrentSession();
      expect(session).toBeNull();
    });

    test('should return session when valid', async () => {
      const sessionData = {
        context: 'test-context',
        timestamp: new Date().toISOString(),
        size: 1024
      };

      await fs.mkdir(path.dirname(primer.sessionFile), { recursive: true });
      await fs.writeFile(primer.sessionFile, JSON.stringify(sessionData));

      const session = await primer.getCurrentSession();
      expect(session).toEqual(sessionData);
    });

    test('should handle file system errors gracefully', async () => {
      // Create directory instead of file (will cause read error)
      await fs.mkdir(primer.sessionFile, { recursive: true });

      const session = await primer.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('saveSession method', () => {
    test('should create session file with correct data', async () => {
      const contextName = 'test-context';
      const contextSize = 2048;

      const session = await primer.saveSession(contextName, contextSize);

      expect(session.context).toBe(contextName);
      expect(session.size).toBe(contextSize);
      expect(session.timestamp).toBeDefined();
      expect(new Date(session.timestamp)).toBeInstanceOf(Date);

      // Verify file was created
      const fileContent = await fs.readFile(primer.sessionFile, 'utf8');
      const savedSession = JSON.parse(fileContent);
      expect(savedSession).toEqual(session);
    });

    test('should create directory if it does not exist', async () => {
      await primer.saveSession('test', 100);

      const dirExists = await fs.access(path.dirname(primer.sessionFile))
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('should format JSON with proper indentation', async () => {
      await primer.saveSession('formatted-test', 512);

      const fileContent = await fs.readFile(primer.sessionFile, 'utf8');
      expect(fileContent).toContain('  "context": "formatted-test"');
      expect(fileContent).toContain('  "size": 512');
    });

    test('should overwrite existing session file', async () => {
      // Create initial session
      await primer.saveSession('first-context', 100);

      // Create new session
      await primer.saveSession('second-context', 200);

      const fileContent = await fs.readFile(primer.sessionFile, 'utf8');
      const session = JSON.parse(fileContent);
      expect(session.context).toBe('second-context');
      expect(session.size).toBe(200);
    });
  });

  describe('showContextDetails method', () => {
    beforeEach(async () => {
      // Create contexts directory
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should return null for non-existent context', async () => {
      const details = await primer.showContextDetails('non-existent');

      expect(details).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error reading context')
      );
    });

    test('should return details for existing context', async () => {
      const contextContent = `# Context: test-context
## Type: feature
## Description
Test description

## Overview
This is a test context.

## Technical Details
Some technical information.`;

      const contextPath = path.join(primer.contextsDir, 'test-context.md');
      await fs.writeFile(contextPath, contextContent);

      const details = await primer.showContextDetails('test-context');

      expect(details).toBeDefined();
      expect(details.size).toBe(Buffer.byteLength(contextContent, 'utf8'));
      expect(details.content).toBe(contextContent);
    });

    test('should display context information', async () => {
      const contextContent = '# Context: display-test\nContent here';
      const contextPath = path.join(primer.contextsDir, 'display-test.md');
      await fs.writeFile(contextPath, contextContent);

      await primer.showContextDetails('display-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Context Details:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Name: display-test');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • Size: \d+ bytes/));
    });

    test('should count sections correctly', async () => {
      const contextContent = `# Context: sections-test
## Section 1
Content 1
## Section 2
Content 2
## Section 3
Content 3`;

      const contextPath = path.join(primer.contextsDir, 'sections-test.md');
      await fs.writeFile(contextPath, contextContent);

      await primer.showContextDetails('sections-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Sections: 3');
    });

    test('should detect standard format', async () => {
      const contextContent = '# Context: standard-test\nStandard format content';
      const contextPath = path.join(primer.contextsDir, 'standard-test.md');
      await fs.writeFile(contextPath, contextContent);

      await primer.showContextDetails('standard-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Structure: ✅ Standard format');
    });

    test('should detect non-standard format', async () => {
      const contextContent = '# Non-standard format\nNo context marker';
      const contextPath = path.join(primer.contextsDir, 'non-standard-test.md');
      await fs.writeFile(contextPath, contextContent);

      await primer.showContextDetails('non-standard-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Structure: ⚠️  Non-standard format');
    });

    test('should estimate tokens correctly', async () => {
      const contextContent = 'a'.repeat(400); // 400 characters
      const contextPath = path.join(primer.contextsDir, 'tokens-test.md');
      await fs.writeFile(contextPath, contextContent);

      await primer.showContextDetails('tokens-test');

      // 400 characters / 4 = 100 tokens
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Estimated tokens: ~100');
    });
  });

  describe('listAvailableContexts method', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should return empty array when no contexts exist', async () => {
      const contexts = await primer.listAvailableContexts();
      expect(contexts).toEqual([]);
    });

    test('should return empty array when directory does not exist', async () => {
      await fs.rmdir(primer.contextsDir);
      const contexts = await primer.listAvailableContexts();
      expect(contexts).toEqual([]);
    });

    test('should list markdown files without backup files', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'context1.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'context2.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'normal-file.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'regular.txt'), 'content');

      const contexts = await primer.listAvailableContexts();

      expect(contexts).toContain('context1');
      expect(contexts).toContain('context2');
      expect(contexts).toContain('normal-file');
      expect(contexts).not.toContain('regular');
      expect(contexts).toHaveLength(3);
    });

    test('should exclude files with backup in name', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'normal-context.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'context-backup.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'backup-context.md'), 'content');

      const contexts = await primer.listAvailableContexts();

      expect(contexts).toContain('normal-context');
      expect(contexts).not.toContain('context-backup');
      expect(contexts).not.toContain('backup-context');
      expect(contexts).toHaveLength(1);
    });

    test('should remove .md extension from results', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'test-context.md'), 'content');

      const contexts = await primer.listAvailableContexts();

      expect(contexts).toContain('test-context');
      expect(contexts).not.toContain('test-context.md');
    });
  });

  describe('listContextsWithDetails method', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should show message when no contexts found', async () => {
      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📭 No contexts found.');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n💡 Create one with: pm context-create <name>');
    });

    test('should list contexts with details', async () => {
      const contextContent = 'Test context content with description line';
      await fs.writeFile(path.join(primer.contextsDir, 'test-context.md'), contextContent);

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📚 Available Contexts:');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • test-context/));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/    Size: \d+ bytes/));
    });

    test('should show current context when session exists', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'current-context.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'other-context.md'), 'content');

      // Create session file
      const sessionData = {
        context: 'current-context',
        timestamp: new Date().toISOString(),
        size: 100
      };
      await fs.writeFile(primer.sessionFile, JSON.stringify(sessionData));

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  ▶ current-context \(current\)/));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • other-context$/));
      expect(consoleLogSpy).toHaveBeenCalledWith('\nCurrently primed: current-context');
    });

    test('should show preview of context content', async () => {
      const contextContent = `# Context: preview-test

This is a description line that should be shown as preview.

## Section
More content here.`;

      await fs.writeFile(path.join(primer.contextsDir, 'preview-test.md'), contextContent);

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/    Preview: This is a description line that should be shown/)
      );
    });

    test('should truncate long previews', async () => {
      const longLine = 'a'.repeat(100);
      const contextContent = `# Context: long-preview

${longLine}`;

      await fs.writeFile(path.join(primer.contextsDir, 'long-preview.md'), contextContent);

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/    Preview: a{50}\.\.\./)
      );
    });

    test('should handle unreadable contexts gracefully', async () => {
      // Create a directory with the same name as context file
      await fs.mkdir(path.join(primer.contextsDir, 'bad-context.md'));

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • bad-context/));
      expect(consoleLogSpy).toHaveBeenCalledWith('    Status: ⚠️  Unable to read');
    });

    test('should show correct context count', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'context1.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'context2.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'context3.md'), 'content');

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith('Total: 3 contexts');
    });

    test('should use singular form for single context', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'single-context.md'), 'content');

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith('Total: 1 context');
    });
  });

  describe('primeContext method', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should handle list option without context name', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'list-test.md'), 'content');

      await primer.primeContext(null, { list: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('\n📚 Available Contexts:');
    });

    test('should show error when no context name provided', async () => {
      await primer.primeContext(null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: Context name is required');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should show error when context does not exist', async () => {
      await primer.primeContext('non-existent');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: Context "non-existent" not found');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should show available contexts when target not found', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'available1.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'available2.md'), 'content');

      await primer.primeContext('missing');

      expect(consoleLogSpy).toHaveBeenCalledWith('\nAvailable contexts:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • available1');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • available2');
    });

    test('should prime existing context successfully', async () => {
      const contextContent = '# Context: prime-test\nTest content for priming';
      await fs.writeFile(path.join(primer.contextsDir, 'prime-test.md'), contextContent);

      await primer.primeContext('prime-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('🎯 Priming Context: prime-test');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Context loaded successfully: prime-test');
    });

    test('should show current session when switching contexts', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'old-context.md'), 'old content');
      await fs.writeFile(path.join(primer.contextsDir, 'new-context.md'), 'new content');

      // Create existing session
      const sessionData = {
        context: 'old-context',
        timestamp: new Date().toISOString(),
        size: 100
      };
      await fs.writeFile(primer.sessionFile, JSON.stringify(sessionData));

      await primer.primeContext('new-context');

      expect(consoleLogSpy).toHaveBeenCalledWith('📌 Current context: old-context');
      expect(consoleLogSpy).toHaveBeenCalledWith('   Switching to: new-context\n');
    });

    test('should suggest chunked loading for large contexts', async () => {
      const largeContent = 'a'.repeat(150 * 1024); // 150KB content
      await fs.writeFile(path.join(primer.contextsDir, 'large-context.md'), largeContent);

      await primer.primeContext('large-context');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💡 Tip: This is a large context. Consider using --chunked for better loading.'
      );
    });

    test('should not suggest chunked loading when option already set', async () => {
      const largeContent = 'a'.repeat(150 * 1024);
      await fs.writeFile(path.join(primer.contextsDir, 'chunked-context.md'), largeContent);

      await primer.primeContext('chunked-context', { chunked: true });

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Consider using --chunked')
      );
    });

    test('should handle dry run mode', async () => {
      const contextContent = '# Context: dry-run-test\nDry run content';
      await fs.writeFile(path.join(primer.contextsDir, 'dry-run-test.md'), contextContent);

      await primer.primeContext('dry-run-test', { dryRun: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('Dry run: Would load context "dry-run-test"');

      // Should not create session file in dry run
      const sessionExists = await fs.access(primer.sessionFile).then(() => true).catch(() => false);
      expect(sessionExists).toBe(false);
    });

    test('should save session in normal mode', async () => {
      const contextContent = '# Context: session-test\nSession content';
      await fs.writeFile(path.join(primer.contextsDir, 'session-test.md'), contextContent);

      await primer.primeContext('session-test');

      const sessionExists = await fs.access(primer.sessionFile).then(() => true).catch(() => false);
      expect(sessionExists).toBe(true);

      const sessionData = JSON.parse(await fs.readFile(primer.sessionFile, 'utf8'));
      expect(sessionData.context).toBe('session-test');
      expect(sessionData.size).toBe(Buffer.byteLength(contextContent, 'utf8'));
    });

    test('should update history file', async () => {
      const contextContent = '# Context: history-test\nHistory content';
      await fs.writeFile(path.join(primer.contextsDir, 'history-test.md'), contextContent);

      await primer.primeContext('history-test');

      const historyFile = path.join(primer.contextsDir, '.history.json');
      const historyExists = await fs.access(historyFile).then(() => true).catch(() => false);
      expect(historyExists).toBe(true);

      const history = JSON.parse(await fs.readFile(historyFile, 'utf8'));
      expect(history).toHaveLength(1);
      expect(history[0].context).toBe('history-test');
    });

    test('should limit history to 50 entries', async () => {
      // Create existing history with 50 entries
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        context: `old-context-${i}`,
        timestamp: new Date().toISOString(),
        size: 100
      }));

      const historyFile = path.join(primer.contextsDir, '.history.json');
      await fs.writeFile(historyFile, JSON.stringify(existingHistory));

      // Prime new context
      const contextContent = '# Context: new-history\nNew content';
      await fs.writeFile(path.join(primer.contextsDir, 'new-history.md'), contextContent);

      await primer.primeContext('new-history');

      // Check history is still limited to 50
      const history = JSON.parse(await fs.readFile(historyFile, 'utf8'));
      expect(history).toHaveLength(50);
      expect(history[0].context).toBe('new-history');
      expect(history[49].context).toBe('old-context-0');
    });

    test('should show verbose output when requested', async () => {
      const contextContent = '# Context: verbose-test\nVerbose content';
      await fs.writeFile(path.join(primer.contextsDir, 'verbose-test.md'), contextContent);

      await primer.primeContext('verbose-test', { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Session created at: \d{4}-\d{2}-\d{2}T/)
      );
    });

    test('should warn about non-standard structure', async () => {
      const contextContent = 'Non-standard context without proper markers';
      await fs.writeFile(path.join(primer.contextsDir, 'non-standard.md'), contextContent);

      await primer.primeContext('non-standard');

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Warning: Context may not have standard structure');
    });

    test('should show success banner and preview', async () => {
      const contextContent = `# Context: success-test
First line of content
Second line of content
Third line of content
Fourth line of content
Fifth line of content`;

      await fs.writeFile(path.join(primer.contextsDir, 'success-test.md'), contextContent);

      await primer.primeContext('success-test');

      expect(consoleLogSpy).toHaveBeenCalledWith('✨ Context successfully primed!');
      expect(consoleLogSpy).toHaveBeenCalledWith('📝 The AI now has access to:');
      expect(consoleLogSpy).toHaveBeenCalledWith('💡 Next Steps:');
    });

    test('should handle context read failure after existence check', async () => {
      // Create context file
      await fs.writeFile(path.join(primer.contextsDir, 'read-fail.md'), 'content');

      // Mock fs.readFile to fail on second call (after showContextDetails)
      const originalReadFile = fs.readFile;
      let callCount = 0;
      fs.readFile = jest.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount <= 2) {
          return originalReadFile(...args);
        }
        throw new Error('Read failed');
      });

      await primer.primeContext('read-fail');

      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original function
      fs.readFile = originalReadFile;
    });
  });

  describe('run method', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should show help when --help provided', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'help-test.md'), 'content');

      await primer.run(['--help']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should show help when -h provided', async () => {
      await primer.run(['-h']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should parse list options', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'list-option.md'), 'content');

      await primer.run(['--list']);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📚 Available Contexts:');

      jest.clearAllMocks();

      await primer.run(['-l']);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📚 Available Contexts:');
    });

    test('should parse context name and options', async () => {
      const contextContent = '# Context: parse-test\nParse content';
      await fs.writeFile(path.join(primer.contextsDir, 'parse-test.md'), contextContent);

      await primer.run(['parse-test', '--verbose', '--chunked', '--dry-run']);

      expect(consoleLogSpy).toHaveBeenCalledWith('🎯 Priming Context: parse-test');
      expect(consoleLogSpy).toHaveBeenCalledWith('Dry run: Would load context "parse-test"');
    });

    test('should handle verbose flag variations', async () => {
      const contextContent = '# Context: verbose-flag\nVerbose content';
      await fs.writeFile(path.join(primer.contextsDir, 'verbose-flag.md'), contextContent);

      await primer.run(['verbose-flag', '-v']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Session created at:/)
      );
    });

    test('should handle unknown options', async () => {
      await primer.run(['test-context', '--unknown']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Unknown option: --unknown');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle multiple option flags', async () => {
      const contextContent = '# Context: multi-options\nMulti content';
      await fs.writeFile(path.join(primer.contextsDir, 'multi-options.md'), contextContent);

      await primer.run(['multi-options', '--verbose', '--chunked', '--dry-run']);

      expect(consoleLogSpy).toHaveBeenCalledWith('Dry run: Would load context "multi-options"');
    });

    test('should ignore extra non-option arguments', async () => {
      const contextContent = '# Context: extra-args\nExtra content';
      await fs.writeFile(path.join(primer.contextsDir, 'extra-args.md'), contextContent);

      await primer.run(['extra-args', 'ignored-arg', '--verbose']);

      expect(consoleLogSpy).toHaveBeenCalledWith('🎯 Priming Context: extra-args');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should handle corrupted session file', async () => {
      await fs.mkdir(path.dirname(primer.sessionFile), { recursive: true });
      await fs.writeFile(primer.sessionFile, '{ invalid json');

      const session = await primer.getCurrentSession();
      expect(session).toBeNull();
    });

    test('should handle permission errors when saving session', async () => {
      const contextContent = '# Context: permission-test\nPermission content';
      await fs.writeFile(path.join(primer.contextsDir, 'permission-test.md'), contextContent);

      // Mock fs.writeFile to fail
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));

      await expect(primer.primeContext('permission-test')).rejects.toThrow('Permission denied');

      // Restore original function
      fs.writeFile = originalWriteFile;
    });

    test('should handle empty context files', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'empty-context.md'), '');

      const details = await primer.showContextDetails('empty-context');

      expect(details.size).toBe(0);
      expect(details.content).toBe('');
    });

    test('should handle context files with only whitespace', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'whitespace-context.md'), '   \n  \n  ');

      await primer.listContextsWithDetails();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/  • whitespace-context/));
    });

    test('should handle context directory being a file', async () => {
      await fs.writeFile('.claude', 'This is a file, not a directory');

      const contexts = await primer.listAvailableContexts();
      expect(contexts).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should work end-to-end with complete workflow', async () => {
      // Create multiple contexts
      const contexts = ['project-overview', 'feature-auth', 'bug-fixes'];
      for (const name of contexts) {
        const content = `# Context: ${name}\nContent for ${name}`;
        await fs.writeFile(path.join(primer.contextsDir, `${name}.md`), content);
      }

      // List contexts
      await primer.primeContext(null, { list: true });

      // Prime a context
      await primer.primeContext('feature-auth', { verbose: true });

      // Switch to another context
      await primer.primeContext('project-overview');

      // Verify final state
      const session = await primer.getCurrentSession();
      expect(session.context).toBe('project-overview');

      const history = JSON.parse(await fs.readFile(path.join(primer.contextsDir, '.history.json'), 'utf8'));
      expect(history).toHaveLength(2);
      expect(history[0].context).toBe('project-overview');
      expect(history[1].context).toBe('feature-auth');
    });

    test('should maintain history across multiple priming sessions', async () => {
      const contexts = ['ctx1', 'ctx2', 'ctx3', 'ctx4', 'ctx5'];

      for (const name of contexts) {
        const content = `# Context: ${name}\nContent`;
        await fs.writeFile(path.join(primer.contextsDir, `${name}.md`), content);
        await primer.primeContext(name);
      }

      const history = JSON.parse(await fs.readFile(path.join(primer.contextsDir, '.history.json'), 'utf8'));
      expect(history).toHaveLength(5);
      expect(history.map(h => h.context)).toEqual(['ctx5', 'ctx4', 'ctx3', 'ctx2', 'ctx1']);
    });

    test('should handle mixed file types in contexts directory', async () => {
      await fs.writeFile(path.join(primer.contextsDir, 'valid-context.md'), 'content');
      await fs.writeFile(path.join(primer.contextsDir, 'readme.txt'), 'not a context');
      await fs.writeFile(path.join(primer.contextsDir, 'config.json'), '{}');
      await fs.mkdir(path.join(primer.contextsDir, 'subdirectory'));

      const contexts = await primer.listAvailableContexts();

      expect(contexts).toEqual(['valid-context']);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await fs.mkdir(primer.contextsDir, { recursive: true });
    });

    test('should handle listing many contexts efficiently', async () => {
      // Create 100 context files
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(path.join(primer.contextsDir, `context-${i}.md`), `Content ${i}`);
      }

      const startTime = Date.now();
      await primer.listContextsWithDetails();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should prime large context efficiently', async () => {
      const largeContent = 'Line of content\n'.repeat(10000); // 10K lines
      await fs.writeFile(path.join(primer.contextsDir, 'large-context.md'), largeContent);

      const startTime = Date.now();
      await primer.primeContext('large-context');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete in reasonable time
    });

    test('should handle concurrent priming attempts', async () => {
      const contexts = ['concurrent1', 'concurrent2', 'concurrent3'];

      for (const name of contexts) {
        const content = `# Context: ${name}\nConcurrent content`;
        await fs.writeFile(path.join(primer.contextsDir, `${name}.md`), content);
      }

      const promises = contexts.map(name => primer.primeContext(name));
      await Promise.all(promises);

      // All should complete successfully
      const session = await primer.getCurrentSession();
      expect(contexts).toContain(session.context);
    });
  });
});