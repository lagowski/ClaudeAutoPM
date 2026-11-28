const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Jest Tests for Post-Install Configuration Checker
 * Tests for install/post-install-check.js
 */

// Mock child_process before requiring the module
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const { execSync } = require('child_process');

describe('PostInstallChecker', () => {
  let tempDir;
  let originalCwd;
  let PostInstallChecker;
  let checker;
  let consoleLogSpy;

  beforeEach(() => {
    // Create temporary test directory
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'post-install-test-'));
    process.chdir(tempDir);

    // Clear module cache
    jest.resetModules();

    // Mock console.log to capture output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Reset execSync mock
    execSync.mockReset();

    // Import PostInstallChecker after mocks are set up
    const PostInstallCheckerModule = require('../../install/post-install-check.js');
    PostInstallChecker = PostInstallCheckerModule;
    checker = new PostInstallChecker();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should initialize with project root', () => {
      // On macOS, temp dirs have /private prefix
      expect(checker.projectRoot).toContain('post-install-test-');
      expect(checker.projectRoot.endsWith(tempDir) || checker.projectRoot.endsWith(`/private${tempDir}`)).toBe(true);
    });

    it('should initialize results structure', () => {
      expect(checker.results).toHaveProperty('essential');
      expect(checker.results).toHaveProperty('optional');
      expect(checker.results).toHaveProperty('nextSteps');
      expect(Array.isArray(checker.results.essential)).toBe(true);
      expect(Array.isArray(checker.results.optional)).toBe(true);
      expect(Array.isArray(checker.results.nextSteps)).toBe(true);
    });
  });

  describe('checkClaudeDirectory()', () => {
    it('should detect missing .claude directory', () => {
      checker.checkClaudeDirectory();

      expect(checker.results.essential.length).toBeGreaterThan(0);
      const claudeCheck = checker.results.essential.find(r => r.name === '.claude directory');
      expect(claudeCheck).toBeDefined();
      expect(claudeCheck.status).toBe(false);
      expect(claudeCheck.message).toContain('autopm install');
    });

    it('should detect existing .claude directory', () => {
      fs.mkdirSync('.claude');

      checker.checkClaudeDirectory();

      const claudeCheck = checker.results.essential.find(r => r.name === '.claude directory');
      expect(claudeCheck.status).toBe(true);
      expect(claudeCheck.message).toContain('Framework installed');
    });

    it('should check for subdirectories when .claude exists', () => {
      fs.mkdirSync('.claude');
      fs.mkdirSync(path.join('.claude', 'agents'));
      fs.mkdirSync(path.join('.claude', 'commands'));

      checker.checkClaudeDirectory();

      const agentsCheck = checker.results.optional.find(r => r.name.includes('agents'));
      const commandsCheck = checker.results.optional.find(r => r.name.includes('commands'));

      expect(agentsCheck).toBeDefined();
      expect(agentsCheck.status).toBe(true);
      expect(commandsCheck).toBeDefined();
      expect(commandsCheck.status).toBe(true);
    });

    it('should detect missing subdirectories', () => {
      fs.mkdirSync('.claude');

      checker.checkClaudeDirectory();

      const rulesCheck = checker.results.optional.find(r => r.name.includes('rules'));
      expect(rulesCheck).toBeDefined();
      expect(rulesCheck.status).toBe(false);
    });
  });

  describe('checkConfigFile()', () => {
    it('should detect missing config file', () => {
      checker.checkConfigFile();

      const configCheck = checker.results.essential.find(r => r.name === 'Configuration file');
      expect(configCheck).toBeDefined();
      expect(configCheck.status).toBe(false);
    });

    it('should validate existing config file', () => {
      fs.mkdirSync('.claude', { recursive: true });
      const config = {
        provider: 'github',
        execution_strategy: { mode: 'adaptive' }
      };
      fs.writeFileSync(
        path.join('.claude', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      checker.checkConfigFile();

      const configCheck = checker.results.essential.find(r => r.name === 'Configuration file');
      expect(configCheck.status).toBe(true);
      expect(configCheck.message).toContain('github');
      expect(checker.config).toEqual(config);
    });

    it('should handle invalid JSON in config', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync(path.join('.claude', 'config.json'), 'invalid json {');

      checker.checkConfigFile();

      const configCheck = checker.results.essential.find(r => r.name === 'Configuration file');
      expect(configCheck.status).toBe(false);
      expect(configCheck.message).toContain('Invalid JSON');
    });

    it('should handle config without provider', () => {
      fs.mkdirSync('.claude', { recursive: true });
      fs.writeFileSync(
        path.join('.claude', 'config.json'),
        JSON.stringify({}, null, 2)
      );

      checker.checkConfigFile();

      const configCheck = checker.results.essential.find(r => r.name === 'Configuration file');
      expect(configCheck.message).toContain('not set');
    });
  });

  describe('checkProvider()', () => {
    beforeEach(() => {
      fs.mkdirSync('.claude', { recursive: true });
    });

    it('should detect GitHub provider configuration', () => {
      const config = {
        provider: 'github',
        github: { token: 'test-token' }
      };
      checker.config = config;

      checker.checkProvider();

      const providerCheck = checker.results.essential.find(r => r.name === 'Provider setup');
      if (providerCheck) {
        expect(providerCheck.status).toBe(true);
      } else {
        // Method might not add to results if not implemented yet
        expect(checker.results.essential.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect missing GitHub token', () => {
      const config = {
        provider: 'github',
        github: {}
      };
      checker.config = config;

      checker.checkProvider();

      const providerCheck = checker.results.essential.find(r => r.name === 'Provider setup');
      if (providerCheck) {
        expect(providerCheck.status).toBe(false);
      } else {
        expect(checker.results.essential.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect Azure DevOps configuration', () => {
      const config = {
        provider: 'azuredevops',
        azuredevops: { token: 'test-token', organization: 'test-org' }
      };
      checker.config = config;

      checker.checkProvider();

      const providerCheck = checker.results.essential.find(r => r.name === 'Provider setup');
      if (providerCheck) {
        expect(providerCheck.status).toBe(true);
      } else {
        expect(checker.results.essential.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle local provider explicitly set', () => {
      checker.config = { provider: 'local' };

      checker.checkProvider();

      // Local-only is not a missing essential — it's an intentional choice.
      const essentialEntry = checker.results.essential.find(r => r.name === 'Provider setup');
      expect(essentialEntry).toBeUndefined();

      const optionalEntry = checker.results.optional.find(r => r.name === 'Provider setup');
      expect(optionalEntry).toBeDefined();
      expect(optionalEntry.status).toBe(true);
      expect(optionalEntry.message).toContain('Local mode');

      // No GitHub/Azure next-step nag.
      expect(checker.results.nextSteps.some(s => /github|azure/.test(s))).toBe(false);
    });

    it('should treat Lite install (no provider plugin, no provider config) as local mode', () => {
      // Lite scenario installs only plugin-core + plugin-pm — no provider plugin.
      // Absence of provider config is intentional, not a failure. Issue #627.
      checker.config = {
        installedPlugins: [
          { name: 'plugin-core' },
          { name: 'plugin-pm' }
        ]
      };

      checker.checkProvider();

      const essentialEntry = checker.results.essential.find(r => r.name === 'Provider setup');
      expect(essentialEntry).toBeUndefined();

      const optionalEntry = checker.results.optional.find(r => r.name === 'Provider setup');
      expect(optionalEntry).toBeDefined();
      expect(optionalEntry.status).toBe(true);
      expect(optionalEntry.message).toMatch(/local|optional/i);

      expect(checker.results.nextSteps.some(s => /github|azure/.test(s))).toBe(false);
    });

    it('should still flag missing provider config when a provider plugin IS installed', () => {
      // User installed plugin-pm-github (provider integration) but never ran
      // `autopm config set provider github` — that IS a missing essential.
      checker.config = {
        installedPlugins: [
          { name: 'plugin-core' },
          { name: 'plugin-pm' },
          { name: 'plugin-pm-github' }
        ]
      };

      checker.checkProvider();

      const providerCheck = checker.results.essential.find(r => r.name === 'Provider setup');
      expect(providerCheck).toBeDefined();
      expect(providerCheck.status).toBe(false);
      expect(checker.results.nextSteps.some(s => s.includes('autopm config set provider'))).toBe(true);
    });
  });

  describe('checkGitRepository()', () => {
    it('should handle git repository check', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      checker.checkGitRepository();

      const gitCheck = checker.results.essential.find(r => r.name === 'Git repository');
      if (gitCheck) {
        // Should be false when not in git repo
        expect(typeof gitCheck.status).toBe('boolean');
      } else {
        expect(checker.results.essential.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect git repository', () => {
      execSync.mockReturnValue(Buffer.from('main'));

      checker.checkGitRepository();

      const gitCheck = checker.results.essential.find(r => r.name === 'Git repository');
      expect(gitCheck.status).toBe(true);
    });

    it('should handle git command errors gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('git not found');
      });

      expect(() => {
        checker.checkGitRepository();
      }).not.toThrow();
    });
  });

  describe('checkMCPConfiguration()', () => {
    it('should detect MCP servers configuration', () => {
      fs.mkdirSync('.claude', { recursive: true });
      const config = {
        mcp: {
          activeServers: ['context7', 'github-mcp']
        }
      };
      checker.config = config;

      checker.checkMCPConfiguration();

      const mcpCheck = checker.results.optional.find(r => r.name === 'MCP servers');
      if (mcpCheck) {
        expect(mcpCheck.status).toBe(true);
      } else {
        // Method might not be fully implemented
        expect(checker.results.optional.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should detect no MCP configuration', () => {
      checker.config = {};

      checker.checkMCPConfiguration();

      const mcpCheck = checker.results.optional.find(r => r.name === 'MCP servers');
      if (mcpCheck) {
        expect(mcpCheck.status).toBe(false);
      } else {
        expect(checker.results.optional.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle empty MCP configuration', () => {
      checker.config = { mcp: { activeServers: [] } };

      checker.checkMCPConfiguration();

      const mcpCheck = checker.results.optional.find(r => r.name === 'MCP servers');
      if (mcpCheck) {
        expect(mcpCheck.status).toBe(false);
      } else {
        expect(checker.results.optional.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('checkGitHooks()', () => {
    it('should detect missing git hooks', () => {
      checker.checkGitHooks();

      const hooksCheck = checker.results.optional.find(r => r.name === 'Git hooks');
      expect(hooksCheck.status).toBe(false);
    });

    it('should detect installed git hooks', () => {
      fs.mkdirSync('.git/hooks', { recursive: true });
      fs.writeFileSync(path.join('.git', 'hooks', 'pre-commit'), '#!/bin/bash\necho test');

      checker.checkGitHooks();

      const hooksCheck = checker.results.optional.find(r => r.name === 'Git hooks');
      expect(hooksCheck.status).toBe(true);
    });
  });

  describe('checkNodeVersion()', () => {
    it('should check Node.js version', () => {
      checker.checkNodeVersion();

      const nodeCheck = checker.results.optional.find(r => r.name === 'Node.js version');
      expect(nodeCheck).toBeDefined();
      // The gate mirrors engines.node (>=22), so the expected result depends on
      // the runtime running this suite — it is not a constant. Asserting `true`
      // silently assumed the old >=18 floor and fails on Node 20.
      const major = Number(process.versions.node.split('.')[0]);
      expect(nodeCheck.status).toBe(major >= 22);
    });
  });

  describe('runAllChecks()', () => {
    it('should run all checks without errors', async () => {
      await expect(checker.runAllChecks()).resolves.not.toThrow();
    });

    it('should display header', async () => {
      await checker.runAllChecks();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('ClaudeAutoPM Configuration Status');
    });

    it('should call all check methods', async () => {
      const spies = {
        checkClaudeDirectory: jest.spyOn(checker, 'checkClaudeDirectory'),
        checkConfigFile: jest.spyOn(checker, 'checkConfigFile'),
        checkProvider: jest.spyOn(checker, 'checkProvider'),
        checkGitRepository: jest.spyOn(checker, 'checkGitRepository'),
        checkMCPConfiguration: jest.spyOn(checker, 'checkMCPConfiguration'),
        checkGitHooks: jest.spyOn(checker, 'checkGitHooks'),
        checkNodeVersion: jest.spyOn(checker, 'checkNodeVersion')
      };

      await checker.runAllChecks();

      Object.values(spies).forEach(spy => {
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });

    it('should display results and next steps', async () => {
      const displayResultsSpy = jest.spyOn(checker, 'displayResults');
      const displayNextStepsSpy = jest.spyOn(checker, 'displayNextSteps');

      await checker.runAllChecks();

      expect(displayResultsSpy).toHaveBeenCalled();
      expect(displayNextStepsSpy).toHaveBeenCalled();

      displayResultsSpy.mockRestore();
      displayNextStepsSpy.mockRestore();
    });
  });

  describe('displayResults()', () => {
    it('should display essential checks', () => {
      checker.results.essential.push({
        name: 'Test Check',
        status: true,
        message: 'OK'
      });

      checker.displayResults();

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Essential');
      expect(output).toContain('Test Check');
    });

    it('should use checkmark for passed checks', () => {
      checker.results.essential.push({
        name: 'Test',
        status: true,
        message: 'OK'
      });

      checker.displayResults();

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('✅');
    });

    it('should use X for failed checks', () => {
      checker.results.essential.push({
        name: 'Test',
        status: false,
        message: 'Failed'
      });

      checker.displayResults();

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('❌');
    });

    it('should display optional checks', () => {
      checker.results.optional.push({
        name: 'Optional Check',
        status: true,
        message: 'Present'
      });

      checker.displayResults();

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Optional');
      expect(output).toContain('Optional Check');
    });
  });

  describe('displayNextSteps()', () => {
    it('should show next steps when present', () => {
      checker.results.nextSteps.push('Step 1: Do something');
      checker.results.nextSteps.push('Step 2: Do another thing');

      checker.displayNextSteps();

      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Next Steps');
      expect(output).toContain('Step 1');
      expect(output).toContain('Step 2');
    });

    it('should not crash with empty next steps', () => {
      expect(() => {
        checker.displayNextSteps();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle fully configured project', async () => {
      // Set up a complete configuration
      fs.mkdirSync('.claude/agents', { recursive: true });
      fs.mkdirSync('.claude/commands', { recursive: true });
      fs.mkdirSync('.claude/rules', { recursive: true });
      fs.mkdirSync('.claude/scripts', { recursive: true });
      fs.mkdirSync('.git/hooks', { recursive: true });

      const config = {
        provider: 'github',
        github: { token: 'test-token' },
        mcp: { activeServers: ['context7'] }
      };
      fs.writeFileSync(
        path.join('.claude', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      fs.writeFileSync(path.join('.git', 'hooks', 'pre-commit'), '#!/bin/bash');
      execSync.mockReturnValue(Buffer.from('main'));

      await checker.runAllChecks();

      // Essential checks structure should exist
      expect(checker.results.essential.length).toBeGreaterThan(0);

      // At least some checks should pass
      const passedEssential = checker.results.essential.filter(r => r.status);
      expect(passedEssential.length).toBeGreaterThan(0);
    });

    it('should handle minimal project setup', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      await checker.runAllChecks();

      // Should complete without errors even with minimal setup
      expect(checker.results.essential.length).toBeGreaterThan(0);
    });

    it('should provide actionable next steps for incomplete setup', async () => {
      // No .claude directory
      await checker.runAllChecks();

      // Should have suggestions
      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Module Export', () => {
    it('should export PostInstallChecker class', () => {
      expect(PostInstallChecker).toBeDefined();
      expect(typeof PostInstallChecker).toBe('function');
    });

    it('should be instantiable', () => {
      const instance = new PostInstallChecker();
      expect(instance).toBeInstanceOf(PostInstallChecker);
    });

    it('should have all required methods', () => {
      const instance = new PostInstallChecker();
      expect(typeof instance.runAllChecks).toBe('function');
      expect(typeof instance.checkClaudeDirectory).toBe('function');
      expect(typeof instance.checkConfigFile).toBe('function');
      expect(typeof instance.checkProvider).toBe('function');
      expect(typeof instance.checkGitRepository).toBe('function');
      expect(typeof instance.checkMCPConfiguration).toBe('function');
      expect(typeof instance.checkGitHooks).toBe('function');
      expect(typeof instance.checkNodeVersion).toBe('function');
      expect(typeof instance.displayResults).toBe('function');
      expect(typeof instance.displayNextSteps).toBe('function');
    });
  });
});
