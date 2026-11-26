/**
 * Jest Tests for sync:batch Command
 *
 * Tests the CLI command for batch synchronization
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const SyncBatchCommand = require('../../autopm/.claude/scripts/pm/sync-batch');

describe('SyncBatchCommand', () => {
  let command;

  beforeEach(() => {
    command = new SyncBatchCommand();
  });

  describe('parseArgs', () => {
    test('should parse default options', () => {
      const options = command.parseArgs([]);

      expect(options).toEqual({
        type: 'all',
        dryRun: false,
        maxConcurrent: 10
      });
    });

    test('should parse --type option', () => {
      const options = command.parseArgs(['--type', 'prd']);

      expect(options.type).toBe('prd');
    });

    test('should parse -t short option', () => {
      const options = command.parseArgs(['-t', 'epic']);

      expect(options.type).toBe('epic');
    });

    test('should parse --dry-run option', () => {
      const options = command.parseArgs(['--dry-run']);

      expect(options.dryRun).toBe(true);
    });

    test('should parse -d short option', () => {
      const options = command.parseArgs(['-d']);

      expect(options.dryRun).toBe(true);
    });

    test('should parse --concurrent option', () => {
      const options = command.parseArgs(['--concurrent', '5']);

      expect(options.maxConcurrent).toBe(5);
    });

    test('should parse -c short option', () => {
      const options = command.parseArgs(['-c', '20']);

      expect(options.maxConcurrent).toBe(20);
    });

    test('should parse multiple options', () => {
      const options = command.parseArgs([
        '--type', 'task',
        '--dry-run',
        '--concurrent', '15'
      ]);

      expect(options).toEqual({
        type: 'task',
        dryRun: true,
        maxConcurrent: 15
      });
    });

    test('should throw error for invalid type', () => {
      expect(() => {
        command.parseArgs(['--type', 'invalid']);
      }).toThrow('Invalid type: invalid');
    });

    test('should throw error for invalid concurrent value', () => {
      expect(() => {
        command.parseArgs(['--concurrent', 'abc']);
      }).toThrow('--concurrent must be a positive number');
    });

    test('should throw error for negative concurrent value', () => {
      expect(() => {
        command.parseArgs(['--concurrent', '-1']);
      }).toThrow('--concurrent must be a positive number');
    });

    test('should throw error for unknown option', () => {
      expect(() => {
        command.parseArgs(['--unknown']);
      }).toThrow('Unknown option: --unknown');
    });
  });

  describe('formatDuration', () => {
    test('should format milliseconds', () => {
      expect(command.formatDuration(500)).toBe('500ms');
    });

    test('should format seconds', () => {
      expect(command.formatDuration(5000)).toBe('5s');
    });

    test('should format minutes and seconds', () => {
      expect(command.formatDuration(125000)).toBe('2m 5s');
    });

    test('should format exactly one minute', () => {
      expect(command.formatDuration(60000)).toBe('1m 0s');
    });
  });

  describe('getRepoInfo', () => {
    test('should parse HTTPS GitHub URL', async () => {
      const execSync = jest.fn(() => 'https://github.com/owner/repo.git\n');
      require('child_process').execSync = execSync;

      const repo = await command.getRepoInfo();

      expect(repo).toEqual({
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should parse SSH GitHub URL', async () => {
      const execSync = jest.fn(() => 'git@github.com:owner/repo.git\n');
      require('child_process').execSync = execSync;

      const repo = await command.getRepoInfo();

      expect(repo).toEqual({
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should parse GitHub URL without .git extension', async () => {
      const execSync = jest.fn(() => 'https://github.com/owner/repo\n');
      require('child_process').execSync = execSync;

      const repo = await command.getRepoInfo();

      expect(repo).toEqual({
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should throw error for non-GitHub URL', async () => {
      const execSync = jest.fn(() => 'https://gitlab.com/owner/repo.git\n');
      require('child_process').execSync = execSync;

      await expect(command.getRepoInfo()).rejects.toThrow('Could not parse GitHub repository URL');
    });

    test('should throw error when git command fails', async () => {
      const execSync = jest.fn(() => {
        throw new Error('Not a git repository');
      });
      require('child_process').execSync = execSync;

      await expect(command.getRepoInfo()).rejects.toThrow('Failed to get repository info');
    });
  });

  describe('printProgress', () => {
    let stdoutWrite;

    beforeEach(() => {
      stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    });

    afterEach(() => {
      stdoutWrite.mockRestore();
    });

    test('should print progress bar at 0%', () => {
      command.printProgress('prd', 0, 100);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0];
      expect(output).toContain('[PRD  ]');
      expect(output).toContain('0%');
      expect(output).toContain('(0/100)');
    });

    test('should print progress bar at 50%', () => {
      command.printProgress('epic', 50, 100);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0];
      expect(output).toContain('[EPIC ]');
      expect(output).toContain('50%');
      expect(output).toContain('(50/100)');
    });

    test('should print progress bar at 100%', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      command.printProgress('task', 100, 100);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0];
      expect(output).toContain('[TASK ]');
      expect(output).toContain('100%');
      expect(output).toContain('(100/100)');

      // Should print newline when complete
      expect(consoleLog).toHaveBeenCalled();

      consoleLog.mockRestore();
    });
  });

  describe('showHelp', () => {
    test('should display help message', () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      command.showHelp();

      expect(consoleLog).toHaveBeenCalled();
      const output = consoleLog.mock.calls.join('\n');
      expect(output).toContain('Batch Sync Command');
      expect(output).toContain('Usage:');
      expect(output).toContain('Options:');
      expect(output).toContain('Examples:');

      consoleLog.mockRestore();
    });
  });
});
