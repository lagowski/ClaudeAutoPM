// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');
jest.mock('readline');

const fs = require('fs');
const { execFileSync, spawn } = require('child_process');
const readline = require('readline');
const PRValidation = require('../../autopm/.claude/scripts/pr-validation.js');

describe('PRValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/mock/project');

    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('mock content');

    // Mock execFileSync
    execFileSync.mockReturnValue('');

    // Mock spawn
    spawn.mockReturnValue({
      stdout: {
        on: jest.fn(),
        setEncoding: jest.fn()
      },
      stderr: {
        on: jest.fn(),
        setEncoding: jest.fn()
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    });

    // Mock readline
    const mockRl = {
      question: jest.fn((question, callback) => callback('yes')),
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockRl);
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const validator = new PRValidation();

      expect(validator.force).toBe(false);
      expect(validator.skipTests).toBe(false);
      expect(validator.colors).toHaveProperty('red');
      expect(validator.colors).toHaveProperty('green');
      expect(validator.colors).toHaveProperty('yellow');
      expect(validator.colors).toHaveProperty('blue');
      expect(validator.colors).toHaveProperty('reset');
      expect(validator.testResults).toEqual({
        passed: [],
        failed: [],
        skipped: []
      });
    });
  });

  describe('print()', () => {
    it('should print message with color', () => {
      const validator = new PRValidation();
      validator.print('Test message', 'green');

      expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
    });

    it('should print message without color', () => {
      const validator = new PRValidation();
      validator.print('Test message');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });

    it('should handle invalid color', () => {
      const validator = new PRValidation();
      validator.print('Test message', 'invalidcolor');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('parseArgs()', () => {
    it('should parse force flag', () => {
      const validator = new PRValidation();
      validator.parseArgs(['--force']);

      expect(validator.force).toBe(true);
    });

    it('should parse skip-tests flag', () => {
      const validator = new PRValidation();
      validator.parseArgs(['--skip-tests']);

      expect(validator.skipTests).toBe(true);
    });

    it('should parse multiple flags', () => {
      const validator = new PRValidation();
      validator.parseArgs(['--force', '--skip-tests']);

      expect(validator.force).toBe(true);
      expect(validator.skipTests).toBe(true);
    });

    it('should handle help flags', () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'showHelp').mockImplementation(() => {});
      validator.parseArgs(['--help']);

      expect(validator.showHelp).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle -h flag', () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'showHelp').mockImplementation(() => {});
      validator.parseArgs(['-h']);

      expect(validator.showHelp).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle unknown flags', () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      validator.parseArgs(['--unknown']);

      expect(validator.print).toHaveBeenCalledWith('Unknown option: --unknown', 'red');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('checkGitStatus()', () => {
    it('should return true when git status is clean', async () => {
      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        if (cmd === 'git branch --show-current') return 'feature-branch';
        return '';
      });

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkGitStatus();

      expect(result).toBe(true);
      expect(validator.print).toHaveBeenCalledWith('✅ Git status OK (branch: feature-branch)', 'green');
    });

    it('should return false when there are uncommitted changes', async () => {
      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        if (cmd === 'git diff-index --quiet HEAD --') {
          throw new Error('Uncommitted changes');
        }
        if (cmd === 'git branch --show-current') return 'feature-branch';
        return '';
      });

      // Mock prompt to return 'no'
      const mockRl = {
        question: jest.fn((question, callback) => callback('no')),
        close: jest.fn()
      };
      readline.createInterface.mockReturnValue(mockRl);

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkGitStatus();

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('⚠️  You have uncommitted changes', 'yellow');
    });

    it('should handle git command errors', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Git not found');
      });

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkGitStatus();

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('❌ Not in a Git repository', 'red');
    });
  });

  describe('isDockerFirstEnabled()', () => {
    it('should return true when docker_first_development is enabled in config', () => {
      const validator = new PRValidation();
      jest.spyOn(fs, 'existsSync').mockImplementation(file => file === '.claude/config.json');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        features: { docker_first_development: true }
      }));

      const result = validator.isDockerFirstEnabled();

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('.claude/config.json');
    });

    it('should return false when config file does not exist', () => {
      const validator = new PRValidation();
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = validator.isDockerFirstEnabled();

      expect(result).toBe(false);
    });

    it('should return false when docker_first_development is disabled', () => {
      const validator = new PRValidation();
      jest.spyOn(fs, 'existsSync').mockImplementation(file => file === '.claude/config.json');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        features: { docker_first_development: false }
      }));

      const result = validator.isDockerFirstEnabled();

      expect(result).toBe(false);
    });

    it('should return false when config is invalid JSON', () => {
      const validator = new PRValidation();
      jest.spyOn(fs, 'existsSync').mockImplementation(file => file === '.claude/config.json');
      jest.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');

      const result = validator.isDockerFirstEnabled();

      expect(result).toBe(false);
    });
  });

  describe('checkDockerPrerequisites()', () => {
    it('should return true when Docker is available', async () => {
      execFileSync.mockReturnValue(''); // docker info succeeds
      fs.existsSync.mockImplementation(file => file === 'Dockerfile' || file === 'docker-compose.yml');

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkDockerPrerequisites();

      expect(result).toBe(true);
      expect(validator.print).toHaveBeenCalledWith('✅ Docker prerequisites OK', 'green');
    });

    it('should return false when Docker is not available', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Docker not found');
      });

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkDockerPrerequisites();

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('❌ Docker is not running', 'red');
    });

    it('should return false when Docker files are missing', async () => {
      execFileSync.mockReturnValue(''); // docker info succeeds
      fs.existsSync.mockReturnValue(false); // no Docker files

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkDockerPrerequisites();

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('❌ Missing Docker files: Dockerfile, docker-compose.yml', 'red');
    });

    it('should accept docker-compose.yaml as alternative', async () => {
      execFileSync.mockReturnValue(''); // docker info succeeds
      fs.existsSync.mockImplementation(file => file === 'Dockerfile' || file === 'docker-compose.yaml');

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.checkDockerPrerequisites();

      expect(result).toBe(true);
      expect(validator.print).toHaveBeenCalledWith('✅ Docker prerequisites OK', 'green');
    });
  });

  describe('runDockerCommand()', () => {
    it('should return true when command succeeds', async () => {
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        })
      };
      spawn.mockReturnValue(mockProcess);

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.runDockerCommand(['docker', 'build', '.'], 'Building image');

      expect(result).toBe(true);
      expect(validator.print).toHaveBeenCalledWith('Building image', 'blue');
      // Security: commands run via argv array, never through `sh -c`
      expect(spawn).toHaveBeenCalledWith('docker', ['build', '.'], { stdio: 'inherit' });
    });

    it('should return false when command fails', async () => {
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1); // Failure exit code
        })
      };
      spawn.mockReturnValue(mockProcess);

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.runDockerCommand(['docker', 'build', '.'], 'Building image');

      expect(result).toBe(false);
    });

    it('should handle command errors', async () => {
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'error') callback(new Error('Command failed'));
        })
      };
      spawn.mockReturnValue(mockProcess);

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');
      const result = await validator.runDockerCommand(['invalid-command'], 'Running test');

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('❌ Error: Command failed', 'red');
    });
  });

  describe('runComprehensiveTests()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
    });

    it('should run all tests successfully', async () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'runDockerCommand').mockResolvedValue(true);
      jest.spyOn(validator, 'print');

      const result = await validator.runComprehensiveTests();

      expect(result).toBe(true);
      expect(validator.testResults.passed.length).toBeGreaterThan(0);
      expect(validator.testResults.failed.length).toBe(0);
    });

    it('should handle test failures', async () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'runDockerCommand').mockResolvedValue(false);
      jest.spyOn(validator, 'print');

      const result = await validator.runComprehensiveTests();

      expect(result).toBe(false);
      expect(validator.testResults.failed.length).toBeGreaterThan(0);
    });

    it('should run all tests regardless of Dockerfile presence', async () => {
      fs.existsSync.mockImplementation(file => file !== 'Dockerfile');

      const validator = new PRValidation();
      jest.spyOn(validator, 'runDockerCommand').mockResolvedValue(true);
      jest.spyOn(validator, 'print');

      const result = await validator.runComprehensiveTests();

      expect(result).toBe(true);
      expect(validator.testResults.passed.length).toBe(4); // All 4 tests should run
    });
  });

  describe('generateReport()', () => {
    it('should return true when all tests pass', () => {
      const validator = new PRValidation();
      validator.testResults.passed = ['Test 1', 'Test 2'];
      validator.testResults.failed = [];
      validator.testResults.skipped = [];
      jest.spyOn(validator, 'print');

      const result = validator.generateReport();

      expect(result).toBe(true);
      expect(validator.print).toHaveBeenCalledWith('✅ All validation checks passed! Ready for PR.', 'green');
    });

    it('should return false when tests fail', () => {
      const validator = new PRValidation();
      validator.testResults.passed = ['Test 1'];
      validator.testResults.failed = ['Test 2'];
      validator.testResults.skipped = [];
      jest.spyOn(validator, 'print');

      const result = validator.generateReport();

      expect(result).toBe(false);
      expect(validator.print).toHaveBeenCalledWith('❌ Validation failed. Please fix the issues above.', 'red');
    });

    it('should display test summary', () => {
      const validator = new PRValidation();
      validator.testResults.passed = ['Test 1', 'Test 2'];
      validator.testResults.failed = ['Test 3'];
      validator.testResults.skipped = ['Test 4'];
      jest.spyOn(validator, 'print');

      validator.generateReport();

      expect(validator.print).toHaveBeenCalledWith('=== PR Validation Report ===', 'blue');
      expect(validator.print).toHaveBeenCalledWith('✅ Passed: 2/4', 'green');
      expect(validator.print).toHaveBeenCalledWith('❌ Failed: 1/4', 'red');
      expect(validator.print).toHaveBeenCalledWith('⏭️  Skipped: 1/4', 'yellow');
    });
  });

  describe('createPRChecklist()', () => {
    it('should create checklist with passed tests', () => {
      const validator = new PRValidation();
      validator.testResults.passed = ['Docker build'];
      validator.testResults.failed = [];
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(true);

      const checklist = validator.createPRChecklist();

      expect(checklist).toContain('## PR Checklist');
      expect(checklist).toContain('### Docker Tests');
      expect(checklist).toContain('- [x] Docker build');
      expect(checklist).toContain('- [x] Docker-first development enabled');
    });

    it('should create checklist with failed tests', () => {
      const validator = new PRValidation();
      validator.testResults.passed = [];
      validator.testResults.failed = ['Docker build'];
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(false);

      const checklist = validator.createPRChecklist();

      expect(checklist).toContain('- [ ] Docker build (FAILED)');
      expect(checklist).toContain('- [ ] Docker-first development enabled');
    });

    it('should include standard checklist items', () => {
      const validator = new PRValidation();
      validator.testResults.passed = [];
      validator.testResults.failed = [];

      const checklist = validator.createPRChecklist();

      expect(checklist).toContain('### Pre-submission');
      expect(checklist).toContain('- [ ] Code reviewed');
      expect(checklist).toContain('- [ ] Documentation updated');
      expect(checklist).toContain('- [ ] Breaking changes noted');
    });
  });

  describe('showHelp()', () => {
    it('should display help information', () => {
      const validator = new PRValidation();
      validator.showHelp();

      expect(console.log).toHaveBeenCalledWith('PR Validation Script');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--force'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--skip-tests'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Docker prerequisites'));
    });
  });

  describe('run()', () => {
    beforeEach(() => {
      // Setup successful defaults
      execFileSync.mockReturnValue(''); // Clean git status
    });

    it('should complete full validation successfully', async () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'parseArgs').mockImplementation(() => {});
      jest.spyOn(validator, 'checkGitStatus').mockResolvedValue(true);
      jest.spyOn(validator, 'checkDockerPrerequisites').mockResolvedValue(true);
      jest.spyOn(validator, 'runComprehensiveTests').mockResolvedValue(true);
      jest.spyOn(validator, 'generateReport').mockReturnValue(true);
      jest.spyOn(validator, 'createPRChecklist').mockReturnValue('Mock checklist');
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(true);
      jest.spyOn(validator, 'print');

      await validator.run(['--force']);

      expect(validator.print).toHaveBeenCalledWith('🚀 PR Validation Starting...', 'blue');
      expect(validator.checkGitStatus).toHaveBeenCalled();
      expect(validator.checkDockerPrerequisites).toHaveBeenCalled();
      expect(validator.runComprehensiveTests).toHaveBeenCalled();
      expect(validator.generateReport).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should exit early when git status fails', async () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'parseArgs').mockImplementation(() => {});
      jest.spyOn(validator, 'checkGitStatus').mockResolvedValue(false);
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(false);

      await validator.run([]);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit early when Docker prerequisites fail', async () => {
      const validator = new PRValidation();
      jest.spyOn(validator, 'parseArgs').mockImplementation(() => {});
      jest.spyOn(validator, 'checkGitStatus').mockResolvedValue(true);
      jest.spyOn(validator, 'checkDockerPrerequisites').mockResolvedValue(false);
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(true);

      await validator.run([]);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should skip tests when --skip-tests flag is used', async () => {
      const validator = new PRValidation();
      validator.skipTests = true;
      jest.spyOn(validator, 'parseArgs').mockImplementation(() => {});
      jest.spyOn(validator, 'checkGitStatus').mockResolvedValue(true);
      jest.spyOn(validator, 'checkDockerPrerequisites').mockResolvedValue(true);
      jest.spyOn(validator, 'runComprehensiveTests').mockResolvedValue(true);
      jest.spyOn(validator, 'generateReport').mockReturnValue(true);
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(false);
      jest.spyOn(validator, 'print');

      await validator.run(['--skip-tests']);

      expect(validator.print).toHaveBeenCalledWith('⏭️  Skipping tests (--skip-tests flag)', 'yellow');
      expect(validator.runComprehensiveTests).not.toHaveBeenCalled();
    });

    it('should continue with force flag even when tests fail', async () => {
      const validator = new PRValidation();
      validator.force = true;
      jest.spyOn(validator, 'parseArgs').mockImplementation(() => {});
      jest.spyOn(validator, 'checkGitStatus').mockResolvedValue(true);
      jest.spyOn(validator, 'checkDockerPrerequisites').mockResolvedValue(true);
      jest.spyOn(validator, 'runComprehensiveTests').mockResolvedValue(false);
      jest.spyOn(validator, 'generateReport').mockReturnValue(false);
      jest.spyOn(validator, 'createPRChecklist').mockReturnValue('Mock checklist');
      jest.spyOn(validator, 'isDockerFirstEnabled').mockReturnValue(true);

      await validator.run(['--force']);

      expect(validator.generateReport).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1); // Still fails but generates checklist
    });
  });

  describe('prompt()', () => {
    it('should return user input', async () => {
      const validator = new PRValidation();
      const result = await validator.prompt('Test question?');

      expect(result).toBe('yes');
      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const PRValidationClass = require('../../autopm/.claude/scripts/pr-validation.js');
      expect(typeof PRValidationClass).toBe('function');
      expect(PRValidationClass.prototype).toHaveProperty('checkGitStatus');
      expect(PRValidationClass.prototype).toHaveProperty('checkDockerPrerequisites');
      expect(PRValidationClass.prototype).toHaveProperty('runComprehensiveTests');
      expect(PRValidationClass.prototype).toHaveProperty('generateReport');
      expect(PRValidationClass.prototype).toHaveProperty('createPRChecklist');
      expect(PRValidationClass.prototype).toHaveProperty('run');
    });

    it('should handle realistic validation workflow', async () => {
      execFileSync.mockReturnValue(''); // Clean git status
      fs.existsSync.mockReturnValue(true);

      const validator = new PRValidation();
      jest.spyOn(validator, 'runDockerCommand').mockResolvedValue(true);
      jest.spyOn(validator, 'print');

      await validator.run([]);

      expect(validator.print).toHaveBeenCalledWith('🚀 PR Validation Starting...', 'blue');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle complete failure scenario', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Git not found');
      });

      const validator = new PRValidation();
      jest.spyOn(validator, 'print');

      await validator.run([]);

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});