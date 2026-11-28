// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');
jest.mock('readline');

const fs = require('fs');
const { execFileSync } = require('child_process');
const readline = require('readline');
const InstallHooks = require('../../autopm/.claude/scripts/install-hooks.js');

describe('Install Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Default mock: files don't exist
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.unlinkSync.mockImplementation(() => {});
    fs.symlinkSync.mockImplementation(() => {});
    fs.chmodSync.mockImplementation(() => {});
    execFileSync.mockImplementation(() => {});

    // Mock readline
    readline.createInterface.mockReturnValue({
      question: jest.fn(),
      close: jest.fn()
    });
  });

  describe('InstallHooks Class', () => {
    it('should initialize with correct properties', () => {
      const installer = new InstallHooks();

      expect(installer.projectRoot).toBe(process.cwd());
      expect(installer.force).toBe(false);
      expect(installer.colors).toHaveProperty('red');
      expect(installer.colors).toHaveProperty('green');
      expect(installer.colors).toHaveProperty('yellow');
      expect(installer.colors).toHaveProperty('blue');
      expect(installer.colors).toHaveProperty('reset');
    });

    describe('print()', () => {
      it('should print message with color', () => {
        const installer = new InstallHooks();
        installer.print('Test message', 'green');

        expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
      });

      it('should print message without color', () => {
        const installer = new InstallHooks();
        installer.print('Test message');

        expect(console.log).toHaveBeenCalledWith('Test message');
      });

      it('should handle invalid color', () => {
        const installer = new InstallHooks();
        installer.print('Test message', 'invalidcolor');

        expect(console.log).toHaveBeenCalledWith('Test message');
      });
    });

    describe('checkGitRepo()', () => {
      it('should return true when in git repository', () => {
        execFileSync.mockImplementation(() => {}); // Success

        const installer = new InstallHooks();
        const result = installer.checkGitRepo();

        expect(result).toBe(true);
        expect(execFileSync).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
      });

      it('should exit when not in git repository', () => {
        execFileSync.mockImplementation(() => {
          throw new Error('Not a git repository');
        });

        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();

        try {
          installer.checkGitRepo();
        } catch (error) {
          expect(error.message).toBe('Process exit with code 1');
        }

        expect(console.log).toHaveBeenCalledWith('\x1b[31m❌ Not in a Git repository\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('Run this script from the root of your Git repository');
      });
    });

    describe('ensureHooksDir()', () => {
      it('should create hooks directory when it does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const installer = new InstallHooks();
        installer.ensureHooksDir();

        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('.git/hooks'),
          { recursive: true }
        );
        expect(console.log).toHaveBeenCalledWith('\x1b[34mCreating .git/hooks directory...\x1b[0m');
      });

      it('should not create hooks directory when it already exists', () => {
        fs.existsSync.mockReturnValue(true);

        const installer = new InstallHooks();
        installer.ensureHooksDir();

        expect(fs.mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('installHook()', () => {
      it('should install hook successfully', async () => {
        fs.existsSync.mockImplementation(path => {
          return path.includes('source-hook'); // Source exists
        });

        const installer = new InstallHooks();
        const result = await installer.installHook('pre-commit', '/path/to/source-hook');

        expect(result).toBe(true);
        expect(fs.symlinkSync).toHaveBeenCalled();
        expect(fs.chmodSync).toHaveBeenCalledWith(expect.any(String), 0o755);
        expect(console.log).toHaveBeenCalledWith('\x1b[32m✅ Installed pre-commit hook\x1b[0m');
      });

      it('should fail when source does not exist', async () => {
        fs.existsSync.mockReturnValue(false);

        const installer = new InstallHooks();
        const result = await installer.installHook('pre-commit', '/nonexistent/source');

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('❌ Source hook not found:')
        );
        expect(fs.symlinkSync).not.toHaveBeenCalled();
      });

      it('should prompt for overwrite when target exists and not forcing', async () => {
        fs.existsSync.mockImplementation(path => {
          if (path.includes('source-hook')) return true;
          if (path.includes('.git/hooks/pre-commit')) return true;
          return false;
        });

        const mockRL = {
          question: jest.fn((question, callback) => callback('y')),
          close: jest.fn()
        };
        readline.createInterface.mockReturnValue(mockRL);

        const installer = new InstallHooks();
        const result = await installer.installHook('pre-commit', '/path/to/source-hook');

        expect(result).toBe(true);
        expect(mockRL.question).toHaveBeenCalledWith(
          'Overwrite? (y/N): ',
          expect.any(Function)
        );
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(fs.symlinkSync).toHaveBeenCalled();
      });

      it('should skip installation when user declines overwrite', async () => {
        fs.existsSync.mockImplementation(path => {
          if (path.includes('source-hook')) return true;
          if (path.includes('.git/hooks/pre-commit')) return true;
          return false;
        });

        const mockRL = {
          question: jest.fn((question, callback) => callback('n')),
          close: jest.fn()
        };
        readline.createInterface.mockReturnValue(mockRL);

        const installer = new InstallHooks();
        const result = await installer.installHook('pre-commit', '/path/to/source-hook');

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith('Skipping pre-commit');
        expect(fs.symlinkSync).not.toHaveBeenCalled();
      });

      it('should overwrite without prompting when force is enabled', async () => {
        fs.existsSync.mockImplementation(path => {
          if (path.includes('source-hook')) return true;
          if (path.includes('.git/hooks/pre-commit')) return true;
          return false;
        });

        const installer = new InstallHooks();
        installer.force = true;
        const result = await installer.installHook('pre-commit', '/path/to/source-hook');

        expect(result).toBe(true);
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(fs.symlinkSync).toHaveBeenCalled();
      });

      it('should handle symlink creation errors', async () => {
        fs.existsSync.mockImplementation(path => {
          return path.includes('source-hook');
        });
        fs.symlinkSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const installer = new InstallHooks();
        const result = await installer.installHook('pre-commit', '/path/to/source-hook');

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('❌ Failed to install pre-commit hook: Permission denied')
        );
      });

      it('should create relative symlink path correctly', async () => {
        fs.existsSync.mockImplementation(path => {
          return path.includes('pre-commit.sh');
        });

        const installer = new InstallHooks();
        await installer.installHook('pre-commit', '.claude/hooks/pre-commit.sh');

        expect(fs.symlinkSync).toHaveBeenCalledWith(
          expect.stringContaining('../../'),
          expect.any(String)
        );
      });
    });

    describe('prompt()', () => {
      it('should return user input', async () => {
        const mockRL = {
          question: jest.fn((question, callback) => callback('test answer')),
          close: jest.fn()
        };
        readline.createInterface.mockReturnValue(mockRL);

        const installer = new InstallHooks();
        const result = await installer.prompt('Test question: ');

        expect(result).toBe('test answer');
        expect(mockRL.question).toHaveBeenCalledWith('Test question: ', expect.any(Function));
        expect(mockRL.close).toHaveBeenCalled();
      });
    });

    describe('parseArgs()', () => {
      it('should set force flag when --force is provided', () => {
        const installer = new InstallHooks();
        installer.parseArgs(['--force']);

        expect(installer.force).toBe(true);
      });

      it('should show help when -h is provided', () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'showUsage');

        try {
          installer.parseArgs(['-h']);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(installer.showUsage).toHaveBeenCalled();
      });

      it('should show help when --help is provided', () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'showUsage');

        try {
          installer.parseArgs(['--help']);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(installer.showUsage).toHaveBeenCalled();
      });

      it('should exit on unknown option', () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();

        try {
          installer.parseArgs(['--unknown']);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 1');
        }

        expect(console.log).toHaveBeenCalledWith('\x1b[31mUnknown option: --unknown\x1b[0m');
      });
    });

    describe('showUsage()', () => {
      it('should display usage information', () => {
        const installer = new InstallHooks();
        installer.showUsage();

        expect(console.log).toHaveBeenCalledWith('Install Git hooks for Docker-first development');
        expect(console.log).toHaveBeenCalledWith('Usage: install-hooks [options]');
        expect(console.log).toHaveBeenCalledWith('Options:');
        expect(console.log).toHaveBeenCalledWith('  --force      Overwrite existing hooks');
        expect(console.log).toHaveBeenCalledWith('  -h, --help   Show this help message');
      });
    });

    describe('run()', () => {
      beforeEach(() => {
        // Setup default successful scenario
        execFileSync.mockImplementation(() => {}); // Git repo check passes
        fs.existsSync.mockImplementation(path => {
          if (path.includes('.git/hooks')) return true;
          if (path.includes('.claude/hooks/')) return true;
          return false;
        });
      });

      it('should complete installation successfully', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'installHook').mockResolvedValue(true);

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('=== Installing Docker-First Development Git Hooks ===')
        );
        expect(installer.installHook).toHaveBeenCalledTimes(2);
      });

      it('should exit when no hook files are found', async () => {
        fs.existsSync.mockImplementation(path => {
          if (path.includes('.git/hooks')) return true;
          return false; // No hook files exist
        });

        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 1');
        }

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('No hook files found in .claude/hooks/')
        );
      });

      it('should handle partial installation success', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'installHook')
          .mockResolvedValueOnce(true)  // First hook succeeds
          .mockResolvedValueOnce(false); // Second hook fails

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('✅ Successfully installed 1 hook(s)')
        );
      });

      it('should handle complete installation failure', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'installHook').mockResolvedValue(false);

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 1');
        }

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('⚠️  No hooks were installed')
        );
      });

      it('should parse arguments before running', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'parseArgs');
        jest.spyOn(installer, 'installHook').mockResolvedValue(true);

        try {
          await installer.run(['--force']);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(installer.parseArgs).toHaveBeenCalledWith(['--force']);
        expect(installer.force).toBe(true);
      });

      it('should validate environment before installation', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'checkGitRepo');
        jest.spyOn(installer, 'ensureHooksDir');
        jest.spyOn(installer, 'installHook').mockResolvedValue(true);

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(installer.checkGitRepo).toHaveBeenCalled();
        expect(installer.ensureHooksDir).toHaveBeenCalled();
      });

      it('should display installation summary', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const installer = new InstallHooks();
        jest.spyOn(installer, 'installHook').mockResolvedValue(true);

        try {
          await installer.run([]);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 0');
        }

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('=== Installation Summary ===')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Git hooks are now active. They will:')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('• Enforce Docker-first development on pre-commit')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('To bypass hooks temporarily, use --no-verify flag')
        );
      });
    });
  });

  describe('CLI Execution', () => {
    it('should execute run method when called as main module', async () => {
      const originalMain = require.main;
      const originalArgv = process.argv;

      require.main = { filename: require.resolve('../../autopm/.claude/scripts/install-hooks.js') };
      process.argv = ['node', 'install-hooks.js'];

      execFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/install-hooks.js')];
        await require('../../autopm/.claude/scripts/install-hooks.js');
      } catch (error) {
        expect(error.message).toContain('Process exit with code');
      }

      require.main = originalMain;
      process.argv = originalArgv;
    });

    it('should handle CLI errors gracefully', async () => {
      const originalMain = require.main;
      const originalArgv = process.argv;

      require.main = { filename: require.resolve('../../autopm/.claude/scripts/install-hooks.js') };
      process.argv = ['node', 'install-hooks.js'];

      // Mock critical error
      execFileSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/install-hooks.js')];
        await require('../../autopm/.claude/scripts/install-hooks.js');
      } catch (error) {
        expect(error.message).toContain('Process exit with code 1');
      }

      require.main = originalMain;
      process.argv = originalArgv;
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const InstallHooksClass = require('../../autopm/.claude/scripts/install-hooks.js');
      expect(typeof InstallHooksClass).toBe('function');
      expect(InstallHooksClass.name).toBe('InstallHooks');

      const instance = new InstallHooksClass();
      expect(typeof instance.run).toBe('function');
      expect(typeof instance.checkGitRepo).toBe('function');
      expect(typeof instance.installHook).toBe('function');
      expect(typeof instance.parseArgs).toBe('function');
    });

    it('should handle realistic installation scenario', async () => {
      execFileSync.mockImplementation(() => {}); // Git repo check passes
      fs.existsSync.mockImplementation(path => {
        if (path.includes('.git/hooks')) return true;
        if (path.includes('.claude/hooks/pre-push-docker-tests.sh')) return true;
        if (path.includes('.claude/hooks/docker-first-enforcement.sh')) return true;
        if (path.includes('.git/hooks/pre-')) return false; // Hooks don't exist yet
        return false;
      });

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      const installer = new InstallHooks();
      jest.spyOn(installer, 'installHook').mockResolvedValue(true);

      try {
        await installer.run(['--force']);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(installer.installHook).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Successfully installed 2 hook(s)')
      );
    });

    it('should handle edge cases and errors gracefully', async () => {
      // Mix of success and failure scenarios
      execFileSync.mockImplementation(() => {}); // Git repo check passes
      fs.existsSync.mockImplementation(path => {
        if (path.includes('.git/hooks')) return true;
        if (path.includes('.claude/hooks/pre-push-docker-tests.sh')) return true;
        if (path.includes('.claude/hooks/docker-first-enforcement.sh')) return false; // Missing hook
        return false;
      });

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      const installer = new InstallHooks();
      jest.spyOn(installer, 'installHook')
        .mockResolvedValueOnce(true)   // First hook succeeds
        .mockResolvedValueOnce(false); // Second hook fails

      try {
        await installer.run([]);
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(installer.installHook).toHaveBeenCalledTimes(1); // Only available hook called
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Successfully installed 1 hook(s)')
      );
    });

    it('should work with different argument combinations', async () => {
      execFileSync.mockImplementation(() => {});
      fs.existsSync.mockImplementation(path => {
        if (path.includes('.git/hooks')) return true;
        if (path.includes('.claude/hooks/')) return true;
        if (path.includes('.git/hooks/pre-')) return true; // Hooks exist
        return false;
      });

      const mockRL = {
        question: jest.fn((question, callback) => callback('y')),
        close: jest.fn()
      };
      readline.createInterface.mockReturnValue(mockRL);

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      const installer = new InstallHooks();

      try {
        await installer.run([]); // No force, should prompt
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(mockRL.question).toHaveBeenCalled(); // Should prompt for overwrite
    });
  });
});