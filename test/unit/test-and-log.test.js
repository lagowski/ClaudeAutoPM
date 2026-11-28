// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');

const fs = require('fs');
const { spawn } = require('child_process');
const TestAndLog = require('../../autopm/.claude/scripts/test-and-log.js');

describe('TestAndLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.createWriteStream.mockReturnValue({
      write: jest.fn(),
      end: jest.fn()
    });

    // Mock spawn
    spawn.mockImplementation(() => ({
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn()
    }));
  });

  describe('Constructor', () => {
    it('should initialize with correct color codes', () => {
      const tester = new TestAndLog();

      expect(tester.colors).toHaveProperty('red');
      expect(tester.colors).toHaveProperty('green');
      expect(tester.colors).toHaveProperty('yellow');
      expect(tester.colors).toHaveProperty('reset');
    });
  });

  describe('print()', () => {
    it('should print message with color', () => {
      const tester = new TestAndLog();
      tester.print('Test message', 'green');

      expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
    });

    it('should print message without color', () => {
      const tester = new TestAndLog();
      tester.print('Test message');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });

    it('should handle invalid color', () => {
      const tester = new TestAndLog();
      tester.print('Test message', 'invalidcolor');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('showUsage()', () => {
    it('should display usage instructions', () => {
      const tester = new TestAndLog();

      tester.showUsage();

      expect(console.log).toHaveBeenCalledWith('Usage: test-and-log <test_file_path> [log_filename]');
      expect(console.log).toHaveBeenCalledWith('Example: test-and-log tests/e2e/my_test_name.py');
      expect(console.log).toHaveBeenCalledWith('Example: test-and-log tests/e2e/my_test_name.py my_test_name_v2.log');
    });
  });

  describe('ensureDirectoryExists()', () => {
    it('should create directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const tester = new TestAndLog();
      tester.ensureDirectoryExists('tests/logs');

      expect(fs.mkdirSync).toHaveBeenCalledWith('tests/logs', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);

      const tester = new TestAndLog();
      tester.ensureDirectoryExists('tests/logs');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getLogFilePath()', () => {
    it('should generate log path from test path', () => {
      const tester = new TestAndLog();
      const result = tester.getLogFilePath('tests/e2e/my_test.py');

      expect(result).toBe('tests/logs/my_test.log');
    });

    it('should use provided log name', () => {
      const tester = new TestAndLog();
      const result = tester.getLogFilePath('tests/e2e/my_test.py', 'custom_log');

      expect(result).toBe('tests/logs/custom_log.log');
    });

    it('should add .log extension if not present', () => {
      const tester = new TestAndLog();
      const result = tester.getLogFilePath('tests/e2e/my_test.py', 'custom_log');

      expect(result).toBe('tests/logs/custom_log.log');
    });

    it('should not add .log extension if already present', () => {
      const tester = new TestAndLog();
      const result = tester.getLogFilePath('tests/e2e/my_test.py', 'custom_log.log');

      expect(result).toBe('tests/logs/custom_log.log');
    });

    it('should handle complex test paths', () => {
      const tester = new TestAndLog();
      const result = tester.getLogFilePath('tests/integration/subfolder/complex_test.py');

      expect(result).toBe('tests/logs/complex_test.log');
    });
  });

  describe('runTest()', () => {
    it('should run Python test successfully', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);

      const tester = new TestAndLog();

      // Mock process completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      const resultPromise = tester.runTest('test.py', 'test.log');
      const result = await resultPromise;

      expect(result).toBe(0);
      expect(spawn).toHaveBeenCalledWith('python', ['test.py'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });
      expect(fs.createWriteStream).toHaveBeenCalledWith('test.log');
    });

    it('should handle test failure', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);

      const tester = new TestAndLog();

      // Mock process failure
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0);
        }
      });

      const result = await tester.runTest('test.py', 'test.log');

      expect(result).toBe(1);
      expect(mockLogStream.end).toHaveBeenCalled();
    });

    it('should capture stdout data', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);

      const tester = new TestAndLog();

      // Mock stdout data
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Test output'), 0);
        }
      });

      // Mock process completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await tester.runTest('test.py', 'test.log');

      expect(mockLogStream.write).toHaveBeenCalledWith('Test output');
    });

    it('should capture stderr data', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);

      const tester = new TestAndLog();

      // Mock stderr data
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Test error'), 0);
        }
      });

      // Mock process completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      await tester.runTest('test.py', 'test.log');

      expect(mockLogStream.write).toHaveBeenCalledWith('Test error');
    });

    it('should handle Python process error', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);

      const tester = new TestAndLog();

      // Mock process error
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Python not found')), 0);
        }
      });

      const result = await tester.runTest('test.py', 'test.log');

      expect(result).toBe(1);
      expect(mockLogStream.write).toHaveBeenCalledWith('Error starting Python process: Python not found\n');
      expect(mockLogStream.end).toHaveBeenCalled();
    });
  });

  describe('run()', () => {
    beforeEach(() => {
      // Mock successful test file
      fs.existsSync.mockReturnValue(true);
    });

    it('should show usage when no arguments provided', async () => {
      const tester = new TestAndLog();
      jest.spyOn(tester, 'showUsage');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run([]);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(tester.showUsage).toHaveBeenCalled();
    });

    it('should exit when test file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const tester = new TestAndLog();
      jest.spyOn(tester, 'print');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['nonexistent.py']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(tester.print).toHaveBeenCalledWith('❌ Test file not found: nonexistent.py', 'red');
    });

    it('should run test successfully', async () => {
      const tester = new TestAndLog();
      jest.spyOn(tester, 'ensureDirectoryExists');
      jest.spyOn(tester, 'getLogFilePath').mockReturnValue('tests/logs/test.log');
      jest.spyOn(tester, 'runTest').mockResolvedValue(0);
      jest.spyOn(tester, 'print');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['tests/test.py']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(tester.ensureDirectoryExists).toHaveBeenCalledWith('tests/logs');
      expect(tester.runTest).toHaveBeenCalledWith('tests/test.py', 'tests/logs/test.log');
      expect(tester.print).toHaveBeenCalledWith('✅ Test completed successfully. Log saved to tests/logs/test.log', 'green');
    });

    it('should handle test failure', async () => {
      const tester = new TestAndLog();
      jest.spyOn(tester, 'ensureDirectoryExists');
      jest.spyOn(tester, 'getLogFilePath').mockReturnValue('tests/logs/test.log');
      jest.spyOn(tester, 'runTest').mockResolvedValue(1);
      jest.spyOn(tester, 'print');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['tests/test.py']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(tester.print).toHaveBeenCalledWith('❌ Test failed with exit code 1. Check tests/logs/test.log for details', 'red');
    });

    it('should use custom log name when provided', async () => {
      const tester = new TestAndLog();
      jest.spyOn(tester, 'ensureDirectoryExists');
      jest.spyOn(tester, 'getLogFilePath');
      jest.spyOn(tester, 'runTest').mockResolvedValue(0);

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['tests/test.py', 'custom.log']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(tester.getLogFilePath).toHaveBeenCalledWith('tests/test.py', 'custom.log');
    });

    it('should display execution information', async () => {
      const tester = new TestAndLog();
      jest.spyOn(tester, 'ensureDirectoryExists');
      jest.spyOn(tester, 'getLogFilePath').mockReturnValue('tests/logs/test.log');
      jest.spyOn(tester, 'runTest').mockResolvedValue(0);

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['tests/test.py']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('Running test: tests/test.py');
      expect(console.log).toHaveBeenCalledWith('Logging to: tests/logs/test.log');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const TestAndLogClass = require('../../autopm/.claude/scripts/test-and-log.js');
      expect(typeof TestAndLogClass).toBe('function');
      expect(TestAndLogClass.prototype).toHaveProperty('print');
      expect(TestAndLogClass.prototype).toHaveProperty('showUsage');
      expect(TestAndLogClass.prototype).toHaveProperty('ensureDirectoryExists');
      expect(TestAndLogClass.prototype).toHaveProperty('getLogFilePath');
      expect(TestAndLogClass.prototype).toHaveProperty('runTest');
      expect(TestAndLogClass.prototype).toHaveProperty('run');
    });

    it('should handle complete workflow', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      const mockLogStream = {
        write: jest.fn(),
        end: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);
      fs.createWriteStream.mockReturnValue(mockLogStream);
      fs.existsSync.mockReturnValue(true);

      // Mock process completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      const tester = new TestAndLog();
      jest.spyOn(tester, 'print');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['tests/integration_test.py', 'integration.log']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(spawn).toHaveBeenCalledWith('python', ['tests/integration_test.py'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });
      expect(fs.createWriteStream).toHaveBeenCalledWith('tests/logs/integration.log');
      expect(tester.print).toHaveBeenCalledWith('✅ Test completed successfully. Log saved to tests/logs/integration.log', 'green');
    });

    it('should handle error scenarios gracefully', async () => {
      fs.existsSync.mockReturnValue(false);

      const tester = new TestAndLog();
      jest.spyOn(tester, 'print');

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await tester.run(['missing_test.py']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(tester.print).toHaveBeenCalledWith('❌ Test file not found: missing_test.py', 'red');
    });
  });
});