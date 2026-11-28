// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const path = require('path');
const FeatureToggle = require('../../autopm/.claude/scripts/config/toggle-features.js');

describe('Feature Toggle', () => {
  let originalArgv;
  let originalCwd;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn();

    // Mock process.argv
    originalArgv = process.argv;
    originalCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/test/project');

    // Default filesystem mocks
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{}');
    fs.writeFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.cwd = originalCwd;
  });

  describe('FeatureToggle Class', () => {
    it('should initialize with correct defaults', () => {
      process.argv = ['node', 'toggle-features.js'];
      const toggle = new FeatureToggle();

      expect(toggle.command).toBe('status');
      expect(toggle.feature).toBeUndefined();
      expect(toggle.value).toBeUndefined();
    });

    it('should parse command line arguments correctly', () => {
      process.argv = ['node', 'toggle-features.js', 'enable', 'docker', 'true'];
      const toggle = new FeatureToggle();

      expect(toggle.command).toBe('enable');
      expect(toggle.feature).toBe('docker');
      expect(toggle.value).toBe('true');
    });

    describe('Print methods', () => {
      it('should print status messages with blue color', () => {
        const toggle = new FeatureToggle();
        toggle.printStatus('Test status');

        expect(console.log).toHaveBeenCalledWith('\x1b[0;34mℹ️  Test status\x1b[0m');
      });

      it('should print success messages with green color', () => {
        const toggle = new FeatureToggle();
        toggle.printSuccess('Test success');

        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Test success\x1b[0m');
      });

      it('should print warning messages with yellow color', () => {
        const toggle = new FeatureToggle();
        toggle.printWarning('Test warning');

        expect(console.log).toHaveBeenCalledWith('\x1b[1;33m⚠️  Test warning\x1b[0m');
      });

      it('should print error messages with red color', () => {
        const toggle = new FeatureToggle();
        toggle.printError('Test error');

        expect(console.log).toHaveBeenCalledWith('\x1b[0;31m❌ Test error\x1b[0m');
      });

      it('should print header with cyan color', () => {
        const toggle = new FeatureToggle();
        toggle.printHeader();

        expect(console.log).toHaveBeenCalledWith('\x1b[0;36m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('\x1b[0;36m║                    ClaudeAutoPM Feature Toggle                   ║\x1b[0m');
        expect(console.log).toHaveBeenCalledWith('\x1b[0;36m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
      });
    });

    describe('loadConfig()', () => {
      it('should return default config when file does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        const toggle = new FeatureToggle();

        const config = toggle.loadConfig();

        expect(config).toEqual({
          execution_strategy: 'adaptive',
          tools: {
            docker: {
              enabled: false,
              first: false
            },
            kubernetes: {
              enabled: false
            }
          }
        });
      });

      it('should load existing config when file exists', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"execution_strategy":"sequential","tools":{"docker":{"enabled":true}}}');

        const toggle = new FeatureToggle();
        const config = toggle.loadConfig();

        expect(config.execution_strategy).toBe('sequential');
        expect(config.tools.docker.enabled).toBe(true);
      });
    });

    describe('saveConfig()', () => {
      it('should save config to JSON file', () => {
        const toggle = new FeatureToggle();
        const config = { test: 'value' };

        toggle.saveConfig(config);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
          toggle.configFile,
          JSON.stringify(config, null, 2)
        );
      });
    });

    describe('showStatus()', () => {
      it('should display current configuration status', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify({
          execution_strategy: 'adaptive',
          tools: {
            docker: { enabled: true, first: true },
            kubernetes: { enabled: false }
          }
        }));

        const toggle = new FeatureToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('Current Feature Configuration:');
        expect(console.log).toHaveBeenCalledWith('🐳 Docker Support: ENABLED');
        expect(console.log).toHaveBeenCalledWith('   Docker-first mode: YES');
        expect(console.log).toHaveBeenCalledWith('☸️  Kubernetes Support: DISABLED');
        expect(console.log).toHaveBeenCalledWith('📊 Execution Strategy: adaptive');
      });

      it('should handle missing docker configuration', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify({ execution_strategy: 'sequential' }));

        const toggle = new FeatureToggle();
        toggle.showStatus();

        expect(console.log).toHaveBeenCalledWith('🐳 Docker Support: DISABLED');
        expect(console.log).toHaveBeenCalledWith('☸️  Kubernetes Support: DISABLED');
      });
    });

    describe('Docker management', () => {
      it('should enable docker support', () => {
        const toggle = new FeatureToggle();
        toggle.enableDocker();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.docker.enabled).toBe(true);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker support enabled\x1b[0m');
      });

      it('should disable docker support', () => {
        const toggle = new FeatureToggle();
        toggle.disableDocker();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.docker.enabled).toBe(false);
        expect(savedConfig.tools.docker.first).toBe(false);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker support disabled\x1b[0m');
      });

      it('should enable docker-first mode', () => {
        const toggle = new FeatureToggle();
        toggle.enableDockerFirst();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.docker.enabled).toBe(true);
        expect(savedConfig.tools.docker.first).toBe(true);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker-first mode enabled\x1b[0m');
      });

      it('should disable docker-first mode', () => {
        const toggle = new FeatureToggle();
        toggle.disableDockerFirst();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.docker.first).toBe(false);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker-first mode disabled\x1b[0m');
      });
    });

    describe('Kubernetes management', () => {
      it('should enable kubernetes support', () => {
        const toggle = new FeatureToggle();
        toggle.enableKubernetes();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.kubernetes.enabled).toBe(true);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Kubernetes support enabled\x1b[0m');
      });

      it('should disable kubernetes support', () => {
        const toggle = new FeatureToggle();
        toggle.disableKubernetes();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = fs.writeFileSync.mock.calls[0];
        const savedConfig = JSON.parse(writeCall[1]);
        expect(savedConfig.tools.kubernetes.enabled).toBe(false);
        expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Kubernetes support disabled\x1b[0m');
      });
    });

    describe('showHelp()', () => {
      it('should display help information', () => {
        const toggle = new FeatureToggle();
        toggle.showHelp();

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: toggle-features.sh'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Features:'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      });
    });

    describe('run()', () => {
      it('should execute status command by default', () => {
        process.argv = ['node', 'toggle-features.js'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'showStatus').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should enable docker when enable docker command is used', () => {
        process.argv = ['node', 'toggle-features.js', 'enable', 'docker'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'enableDocker').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should enable kubernetes when enable kubernetes command is used', () => {
        process.argv = ['node', 'toggle-features.js', 'enable', 'kubernetes'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'enableKubernetes').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should show error for unknown enable feature', () => {
        process.argv = ['node', 'toggle-features.js', 'enable', 'unknown'];
        const toggle = new FeatureToggle();
        const helpSpy = jest.spyOn(toggle, 'showHelp').mockImplementation(() => {});

        toggle.run();

        expect(console.log).toHaveBeenCalledWith('\x1b[0;31m❌ Unknown feature: unknown\x1b[0m');
        expect(helpSpy).toHaveBeenCalled();
      });

      it('should disable docker when disable docker command is used', () => {
        process.argv = ['node', 'toggle-features.js', 'disable', 'docker'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'disableDocker').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should disable kubernetes when disable kubernetes command is used', () => {
        process.argv = ['node', 'toggle-features.js', 'disable', 'kubernetes'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'disableKubernetes').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should show error for unknown disable feature', () => {
        process.argv = ['node', 'toggle-features.js', 'disable', 'unknown'];
        const toggle = new FeatureToggle();
        const helpSpy = jest.spyOn(toggle, 'showHelp').mockImplementation(() => {});

        toggle.run();

        expect(console.log).toHaveBeenCalledWith('\x1b[0;31m❌ Unknown feature: unknown\x1b[0m');
        expect(helpSpy).toHaveBeenCalled();
      });

      it('should enable docker-first when docker-first on is used', () => {
        process.argv = ['node', 'toggle-features.js', 'docker-first', 'on'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'enableDockerFirst').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should enable docker-first when docker-first true is used', () => {
        process.argv = ['node', 'toggle-features.js', 'docker-first', 'true'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'enableDockerFirst').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should disable docker-first when docker-first off is used', () => {
        process.argv = ['node', 'toggle-features.js', 'docker-first', 'off'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'disableDockerFirst').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should disable docker-first when docker-first false is used', () => {
        process.argv = ['node', 'toggle-features.js', 'docker-first', 'false'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'disableDockerFirst').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should show error for invalid docker-first argument', () => {
        process.argv = ['node', 'toggle-features.js', 'docker-first', 'invalid'];
        const toggle = new FeatureToggle();

        toggle.run();

        expect(console.log).toHaveBeenCalledWith('\x1b[0;31m❌ docker-first requires on/off argument\x1b[0m');
      });

      it('should show help when help command is used', () => {
        process.argv = ['node', 'toggle-features.js', 'help'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'showHelp').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should show help when --help flag is used', () => {
        process.argv = ['node', 'toggle-features.js', '--help'];
        const toggle = new FeatureToggle();
        const spy = jest.spyOn(toggle, 'showHelp').mockImplementation(() => {});

        toggle.run();

        expect(spy).toHaveBeenCalled();
      });

      it('should exit with error for unknown command', () => {
        process.argv = ['node', 'toggle-features.js', 'unknown'];
        const toggle = new FeatureToggle();
        const helpSpy = jest.spyOn(toggle, 'showHelp').mockImplementation(() => {});

        process.exit.mockImplementation((code) => {
          throw new Error(`Process exit with code ${code}`);
        });

        expect(() => toggle.run()).toThrow('Process exit with code 1');
        expect(console.log).toHaveBeenCalledWith('\x1b[0;31m❌ Unknown command: unknown\x1b[0m');
        expect(helpSpy).toHaveBeenCalled();
      });
    });
  });

  describe('CLI execution', () => {
    it('should create instance when called as main module', () => {
      // Test that the module exports the correct class
      const FeatureToggleModule = require('../../autopm/.claude/scripts/config/toggle-features.js');
      const instance = new FeatureToggleModule();

      expect(instance).toBeInstanceOf(FeatureToggleModule);
      expect(typeof instance.run).toBe('function');
    });
  });

  describe('Integration tests', () => {
    it('should maintain backward compatibility', () => {
      const FeatureToggleModule = require('../../autopm/.claude/scripts/config/toggle-features.js');
      expect(typeof FeatureToggleModule).toBe('function');
      expect(FeatureToggleModule.name).toBe('FeatureToggle');
    });

    it('should handle complete enable/disable cycle', () => {
      process.argv = ['node', 'toggle-features.js', 'enable', 'docker'];

      const toggle = new FeatureToggle();

      // Enable docker
      toggle.enableDocker();
      let writeCall = fs.writeFileSync.mock.calls[0];
      let savedConfig = JSON.parse(writeCall[1]);
      expect(savedConfig.tools.docker.enabled).toBe(true);

      // Enable docker-first
      fs.writeFileSync.mockClear();
      toggle.enableDockerFirst();
      writeCall = fs.writeFileSync.mock.calls[0];
      savedConfig = JSON.parse(writeCall[1]);
      expect(savedConfig.tools.docker.enabled).toBe(true);
      expect(savedConfig.tools.docker.first).toBe(true);

      // Disable docker-first
      fs.writeFileSync.mockClear();
      toggle.disableDockerFirst();
      writeCall = fs.writeFileSync.mock.calls[0];
      savedConfig = JSON.parse(writeCall[1]);
      expect(savedConfig.tools.docker.first).toBe(false);

      // Disable docker
      fs.writeFileSync.mockClear();
      toggle.disableDocker();
      writeCall = fs.writeFileSync.mock.calls[0];
      savedConfig = JSON.parse(writeCall[1]);
      expect(savedConfig.tools.docker.enabled).toBe(false);
      expect(savedConfig.tools.docker.first).toBe(false);
    });

    it('should handle config merging with existing configuration', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        execution_strategy: 'hybrid',
        custom_field: 'preserved',
        tools: {
          existing_tool: { enabled: true }
        }
      }));

      const toggle = new FeatureToggle();
      toggle.enableDocker();

      const writeCall = fs.writeFileSync.mock.calls[0];
      const savedConfig = JSON.parse(writeCall[1]);

      expect(savedConfig.execution_strategy).toBe('hybrid');
      expect(savedConfig.custom_field).toBe('preserved');
      expect(savedConfig.tools.existing_tool.enabled).toBe(true);
      expect(savedConfig.tools.docker.enabled).toBe(true);
    });

    it('should handle realistic feature toggling scenario', () => {
      process.argv = ['node', 'toggle-features.js', 'enable', 'docker'];

      // Start with empty config
      fs.existsSync.mockReturnValue(false);

      const toggle = new FeatureToggle();

      // Show initial status
      console.log.mockClear();
      toggle.showStatus();
      expect(console.log).toHaveBeenCalledWith('🐳 Docker Support: DISABLED');
      expect(console.log).toHaveBeenCalledWith('☸️  Kubernetes Support: DISABLED');

      // Enable Docker
      console.log.mockClear();
      toggle.enableDocker();
      expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker support enabled\x1b[0m');

      // Enable Kubernetes
      console.log.mockClear();
      toggle.enableKubernetes();
      expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Kubernetes support enabled\x1b[0m');

      // Enable Docker-first
      console.log.mockClear();
      toggle.enableDockerFirst();
      expect(console.log).toHaveBeenCalledWith('\x1b[0;32m✅ Docker-first mode enabled\x1b[0m');

      // Mock config to show enabled state
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        execution_strategy: 'adaptive',
        tools: {
          docker: { enabled: true, first: true },
          kubernetes: { enabled: true }
        }
      }));

      // Show final status
      console.log.mockClear();
      toggle.showStatus();
      expect(console.log).toHaveBeenCalledWith('🐳 Docker Support: ENABLED');
      expect(console.log).toHaveBeenCalledWith('   Docker-first mode: YES');
      expect(console.log).toHaveBeenCalledWith('☸️  Kubernetes Support: ENABLED');
    });
  });
});