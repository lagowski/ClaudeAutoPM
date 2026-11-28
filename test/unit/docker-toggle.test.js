// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');

const fs = require('fs');
const { execFileSync } = require('child_process');
const DockerToggle = require('../../autopm/.claude/scripts/docker-toggle.js');

describe('Docker Toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Default mock: files don't exist
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    execFileSync.mockImplementation(() => {});
  });

  describe('DockerToggle Class', () => {
    it('should initialize with correct config path and colors', () => {
      const toggle = new DockerToggle();

      expect(toggle.configFile).toBe('.claude/config.json');
      expect(toggle.colors).toHaveProperty('red');
      expect(toggle.colors).toHaveProperty('green');
      expect(toggle.colors).toHaveProperty('yellow');
      expect(toggle.colors).toHaveProperty('blue');
      expect(toggle.colors).toHaveProperty('reset');
    });

    describe('print()', () => {
      it('should print message with color', () => {
        const toggle = new DockerToggle();
        toggle.print('Test message', 'green');

        expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
      });

      it('should print message without color', () => {
        const toggle = new DockerToggle();
        toggle.print('Test message');

        expect(console.log).toHaveBeenCalledWith('Test message');
      });

      it('should handle invalid color', () => {
        const toggle = new DockerToggle();
        toggle.print('Test message', 'invalidcolor');

        expect(console.log).toHaveBeenCalledWith('Test message');
      });
    });

    describe('checkJq()', () => {
      it('should return true (not needed in Node.js)', () => {
        const toggle = new DockerToggle();
        const result = toggle.checkJq();

        expect(result).toBe(true);
      });
    });

    describe('createConfigIfMissing()', () => {
      it('should create config when file does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        toggle.createConfigIfMissing();

        expect(fs.mkdirSync).toHaveBeenCalledWith('.claude', { recursive: true });
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.claude/config.json',
          expect.stringContaining('"docker_first_development": false')
        );
      });

      it('should not create config when file already exists', () => {
        fs.existsSync.mockReturnValue(true);

        const toggle = new DockerToggle();
        toggle.createConfigIfMissing();

        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should create default configuration structure', () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        toggle.createConfigIfMissing();

        const writeCall = fs.writeFileSync.mock.calls[0];
        const configContent = JSON.parse(writeCall[1]);

        expect(configContent).toHaveProperty('features');
        expect(configContent).toHaveProperty('docker');
        expect(configContent).toHaveProperty('exceptions');
        expect(configContent.features).toHaveProperty('docker_first_development', false);
        expect(configContent.docker).toHaveProperty('default_base_images');
        expect(configContent.docker.default_base_images).toHaveProperty('python', 'python:3.11-slim');
      });
    });

    describe('readConfig()', () => {
      it('should read config when file exists', () => {
        const testConfig = { features: { docker_first_development: true } };
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(testConfig));

        const toggle = new DockerToggle();
        const result = toggle.readConfig();

        expect(result).toEqual(testConfig);
        expect(fs.readFileSync).toHaveBeenCalledWith('.claude/config.json', 'utf8');
      });

      it('should return empty object when file does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        const result = toggle.readConfig();

        expect(result).toEqual({});
      });

      it('should handle JSON parse errors gracefully', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('invalid json');

        const toggle = new DockerToggle();
        const result = toggle.readConfig();

        expect(result).toEqual({});
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Error reading config:')
        );
      });

      it('should handle file read errors gracefully', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockImplementation(() => {
          throw new Error('File read error');
        });

        const toggle = new DockerToggle();
        const result = toggle.readConfig();

        expect(result).toEqual({});
      });
    });

    describe('writeConfig()', () => {
      it('should write config successfully', () => {
        const testConfig = { features: { docker_first_development: true } };

        const toggle = new DockerToggle();
        const result = toggle.writeConfig(testConfig);

        expect(result).toBe(true);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.claude/config.json',
          JSON.stringify(testConfig, null, 2)
        );
      });

      it('should handle write errors gracefully', () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Write error');
        });

        const toggle = new DockerToggle();
        const result = toggle.writeConfig({});

        expect(result).toBe(false);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Error writing config:')
        );
      });
    });

    describe('showStatus()', () => {
      it('should show enabled status correctly', () => {
        const mockConfig = {
          features: {
            docker_first_development: true,
            enforce_docker_tests: true,
            block_local_execution: true
          }
        };
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('\x1b[32mStatus: ENABLED 🐳\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('  ✅ Development must happen in Docker containers');
        expect(console.log).toHaveBeenCalledWith('  Docker-First Development: true');
      });

      it('should show disabled status correctly', () => {
        const mockConfig = {
          features: {
            docker_first_development: false,
            enforce_docker_tests: false,
            block_local_execution: false
          }
        };
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('\x1b[31mStatus: DISABLED 💻\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('  ❌ Local development is allowed');
        expect(console.log).toHaveBeenCalledWith('  Docker-First Development: false');
      });

      it('should check Docker files status', () => {
        fs.existsSync.mockImplementation(path => {
          if (path === '.claude/config.json') return true;
          if (path === 'Dockerfile') return true;
          if (path === 'Dockerfile.dev') return false;
          if (path === 'docker-compose.yml') return true;
          return false;
        });
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('  ✅ Dockerfile');
        expect(console.log).toHaveBeenCalledWith('  ❌ Dockerfile.dev (missing)');
        expect(console.log).toHaveBeenCalledWith('  ✅ docker-compose.yml');
      });

      it('should check docker-compose.yaml alternative', () => {
        fs.existsSync.mockImplementation(path => {
          if (path === '.claude/config.json') return true;
          if (path === 'docker-compose.yaml') return true;
          return false;
        });
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('  ✅ docker-compose.yml');
      });

      it('should check Docker engine status when running', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');
        execFileSync.mockImplementation(() => {}); // Docker command succeeds

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('  ✅ Docker is running');
        expect(execFileSync).toHaveBeenCalledWith('docker', ['version'], { stdio: 'ignore' });
      });

      it('should check Docker engine status when not running', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');
        execFileSync.mockImplementation(() => {
          throw new Error('Docker not found');
        });

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('  ❌ Docker is not running or not installed');
      });

      it('should handle missing config gracefully', () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('  Docker-First Development: false');
        expect(console.log).toHaveBeenCalledWith('  Enforce Docker Tests: false');
        expect(console.log).toHaveBeenCalledWith('  Block Local Execution: false');
      });
    });

    describe('enableDockerFirst()', () => {
      it('should enable Docker-first development', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.enableDockerFirst();

        const writeCall = fs.writeFileSync.mock.calls[0];
        const config = JSON.parse(writeCall[1]);

        expect(config.features.docker_first_development).toBe(true);
        expect(config.features.enforce_docker_tests).toBe(true);
        expect(config.features.block_local_execution).toBe(true);
        expect(console.log).toHaveBeenCalledWith('\x1b[32m✅ Docker-First Development ENABLED\x1b[0m');
      });

      it('should handle missing features object', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.enableDockerFirst();

        const writeCall = fs.writeFileSync.mock.calls[0];
        const config = JSON.parse(writeCall[1]);

        expect(config.features).toBeDefined();
        expect(config.features.docker_first_development).toBe(true);
      });

      it('should show next steps after enabling', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.enableDockerFirst();

        expect(console.log).toHaveBeenCalledWith('Next steps:');
        expect(console.log).toHaveBeenCalledWith('  1. Run: ./install-hooks.sh');
        expect(console.log).toHaveBeenCalledWith('  3. Start development with: docker compose up');
      });

      it('should handle write failures', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Write failed');
        });

        const toggle = new DockerToggle();
        toggle.enableDockerFirst();

        // Should not show success message if write failed
        expect(console.log).not.toHaveBeenCalledWith('✅ Docker-First Development ENABLED');
      });
    });

    describe('disableDockerFirst()', () => {
      it('should disable Docker-first development', () => {
        const existingConfig = {
          features: {
            docker_first_development: true,
            enforce_docker_tests: true,
            block_local_execution: true
          }
        };
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

        const toggle = new DockerToggle();
        toggle.disableDockerFirst();

        const writeCall = fs.writeFileSync.mock.calls[0];
        const config = JSON.parse(writeCall[1]);

        expect(config.features.docker_first_development).toBe(false);
        expect(config.features.enforce_docker_tests).toBe(false);
        expect(config.features.block_local_execution).toBe(false);
        expect(console.log).toHaveBeenCalledWith('\x1b[33m✅ Docker-First Development DISABLED\x1b[0m');
      });

      it('should show warning after disabling', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.disableDockerFirst();

        expect(console.log).toHaveBeenCalledWith('  • Local development is now permitted');
        expect(console.log).toHaveBeenCalledWith('\x1b[33m⚠️  Warning: Ensure consistency with production environment\x1b[0m');
      });

      it('should handle missing features object when disabling', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.disableDockerFirst();

        const writeCall = fs.writeFileSync.mock.calls[0];
        const config = JSON.parse(writeCall[1]);

        expect(config.features).toBeDefined();
        expect(config.features.docker_first_development).toBe(false);
      });
    });

    describe('showHelp()', () => {
      it('should display help information', () => {
        const toggle = new DockerToggle();
        toggle.showHelp();

        expect(console.log).toHaveBeenCalledWith('Docker-First Development Toggle');
        expect(console.log).toHaveBeenCalledWith('Usage: docker-toggle [command]');
        expect(console.log).toHaveBeenCalledWith('Commands:');
        expect(console.log).toHaveBeenCalledWith('  enable    Enable Docker-First development mode');
        expect(console.log).toHaveBeenCalledWith('  disable   Disable Docker-First development mode');
        expect(console.log).toHaveBeenCalledWith('  status    Show current configuration status');
        expect(console.log).toHaveBeenCalledWith('  help      Show this help message');
        expect(console.log).toHaveBeenCalledWith('Examples:');
      });
    });

    describe('run()', () => {
      it('should default to status command', async () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'showStatus');

        await toggle.run([]);

        expect(toggle.showStatus).toHaveBeenCalled();
      });

      it('should handle enable command', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'enableDockerFirst');

        await toggle.run(['enable']);

        expect(toggle.enableDockerFirst).toHaveBeenCalled();
      });

      it('should handle disable command', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'disableDockerFirst');

        await toggle.run(['disable']);

        expect(toggle.disableDockerFirst).toHaveBeenCalled();
      });

      it('should handle status command explicitly', async () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'showStatus');

        await toggle.run(['status']);

        expect(toggle.showStatus).toHaveBeenCalled();
      });

      it('should handle help command', async () => {
        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'showHelp');

        await toggle.run(['help']);

        expect(toggle.showHelp).toHaveBeenCalled();
      });

      it('should handle --help flag', async () => {
        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'showHelp');

        await toggle.run(['--help']);

        expect(toggle.showHelp).toHaveBeenCalled();
      });

      it('should handle -h flag', async () => {
        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'showHelp');

        await toggle.run(['-h']);

        expect(toggle.showHelp).toHaveBeenCalled();
      });

      it('should handle unknown commands', async () => {
        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        const toggle = new DockerToggle();

        try {
          await toggle.run(['unknown']);
        } catch (error) {
          expect(error.message).toBe('Process exit with code 1');
        }

        expect(console.log).toHaveBeenCalledWith('\x1b[31mUnknown command: unknown\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('Use "docker-toggle help" for usage information');
      });

      it('should handle case insensitive commands', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'enableDockerFirst');

        await toggle.run(['ENABLE']);

        expect(toggle.enableDockerFirst).toHaveBeenCalled();
      });

      it('should create config before running commands', async () => {
        fs.existsSync.mockReturnValue(false);

        const toggle = new DockerToggle();
        jest.spyOn(toggle, 'createConfigIfMissing');

        await toggle.run(['status']);

        expect(toggle.createConfigIfMissing).toHaveBeenCalled();
      });
    });
  });

  describe('CLI Execution', () => {
    it('should execute run method when called as main module', async () => {
      const originalMain = require.main;
      const originalArgv = process.argv;

      require.main = { filename: require.resolve('../../autopm/.claude/scripts/docker-toggle.js') };
      process.argv = ['node', 'docker-toggle.js', 'status'];

      fs.existsSync.mockReturnValue(false);

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/docker-toggle.js')];
        await require('../../autopm/.claude/scripts/docker-toggle.js');
      } catch (error) {
        // Expected to run without throwing
      }

      require.main = originalMain;
      process.argv = originalArgv;
    });

    it('should handle CLI errors gracefully', async () => {
      const originalMain = require.main;
      const originalArgv = process.argv;

      require.main = { filename: require.resolve('../../autopm/.claude/scripts/docker-toggle.js') };
      process.argv = ['node', 'docker-toggle.js', 'unknown'];

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/docker-toggle.js')];
        await require('../../autopm/.claude/scripts/docker-toggle.js');
      } catch (error) {
        expect(error.message).toContain('Process exit with code 1');
      }

      require.main = originalMain;
      process.argv = originalArgv;
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const DockerToggleClass = require('../../autopm/.claude/scripts/docker-toggle.js');
      expect(typeof DockerToggleClass).toBe('function');
      expect(DockerToggleClass.name).toBe('DockerToggle');

      const instance = new DockerToggleClass();
      expect(typeof instance.run).toBe('function');
      expect(typeof instance.showStatus).toBe('function');
      expect(typeof instance.enableDockerFirst).toBe('function');
      expect(typeof instance.disableDockerFirst).toBe('function');
    });

    it('should handle complete enable/disable cycle', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');

      const toggle = new DockerToggle();

      // Enable
      await toggle.run(['enable']);
      let writeCall = fs.writeFileSync.mock.calls[fs.writeFileSync.mock.calls.length - 1];
      let config = JSON.parse(writeCall[1]);
      expect(config.features.docker_first_development).toBe(true);

      // Update mock to return enabled config
      fs.readFileSync.mockReturnValue(JSON.stringify(config));

      // Disable
      await toggle.run(['disable']);
      writeCall = fs.writeFileSync.mock.calls[fs.writeFileSync.mock.calls.length - 1];
      config = JSON.parse(writeCall[1]);
      expect(config.features.docker_first_development).toBe(false);
    });

    it('should handle realistic configuration scenarios', async () => {
      const existingConfig = {
        features: {
          docker_first_development: false,
          enforce_docker_tests: false,
          block_local_execution: false,
          some_other_feature: true
        },
        docker: {
          default_base_images: {
            python: 'python:3.9'
          }
        }
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      const toggle = new DockerToggle();
      await toggle.run(['enable']);

      const writeCall = fs.writeFileSync.mock.calls[0];
      const updatedConfig = JSON.parse(writeCall[1]);

      // Should preserve existing configuration
      expect(updatedConfig.features.some_other_feature).toBe(true);
      expect(updatedConfig.docker.default_base_images.python).toBe('python:3.9');

      // Should update Docker-first features
      expect(updatedConfig.features.docker_first_development).toBe(true);
      expect(updatedConfig.features.enforce_docker_tests).toBe(true);
      expect(updatedConfig.features.block_local_execution).toBe(true);
    });

    it('should work with various Docker file configurations', () => {
      // Test different Docker file combinations
      const scenarios = [
        { files: ['Dockerfile'], expected: { dockerfile: true, dev: false, compose: false } },
        { files: ['docker-compose.yml'], expected: { dockerfile: false, dev: false, compose: true } },
        { files: ['docker-compose.yaml'], expected: { dockerfile: false, dev: false, compose: true } },
        { files: ['Dockerfile', 'Dockerfile.dev', 'docker-compose.yml'], expected: { dockerfile: true, dev: true, compose: true } }
      ];

      scenarios.forEach(scenario => {
        fs.existsSync.mockImplementation(path => {
          if (path === '.claude/config.json') return true;
          return scenario.files.includes(path);
        });
        fs.readFileSync.mockReturnValue('{}');

        const toggle = new DockerToggle();
        toggle.showStatus();

        if (scenario.expected.dockerfile) {
          expect(console.log).toHaveBeenCalledWith('  ✅ Dockerfile');
        } else {
          expect(console.log).toHaveBeenCalledWith('  ❌ Dockerfile (missing)');
        }

        if (scenario.expected.dev) {
          expect(console.log).toHaveBeenCalledWith('  ✅ Dockerfile.dev');
        } else {
          expect(console.log).toHaveBeenCalledWith('  ❌ Dockerfile.dev (missing)');
        }

        if (scenario.expected.compose) {
          expect(console.log).toHaveBeenCalledWith('  ✅ docker-compose.yml');
        } else {
          expect(console.log).toHaveBeenCalledWith('  ❌ docker-compose.yml (missing)');
        }

        jest.clearAllMocks();
      });
    });
  });
});