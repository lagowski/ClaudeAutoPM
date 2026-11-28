const assert = require('node:assert');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

const { ConfigCommand } = require('../../bin/commands/config');

describe('ConfigCommand', () => {
  let tempDir;
  let cmd;
  let originalCwd;
  let originalEnv;
  let originalLog;
  let originalError;

  beforeEach(async () => {
    // Silence command output: under `node --test` the volume of box-drawing
    // output interleaved with the runner's IPC stream made it fail with
    // "Unable to deserialize cloned data" (#858). No test asserts on output.
    originalLog = console.log;
    originalError = console.error;
    console.log = () => {};
    console.error = () => {};

    // Create temp directory for tests
    tempDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));

    // Save original working directory and environment
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Change to temp directory
    process.chdir(tempDir);

    // Create .claude directory
    await fs.mkdir(path.join(tempDir, '.claude'), { recursive: true });

    // Create new command instance
    cmd = new ConfigCommand();
  });

  afterEach(async () => {
    // Restore environment and working directory
    process.env = originalEnv;
    process.chdir(originalCwd);
    console.log = originalLog;
    console.error = originalError;

    // Clean up temp directory
    if (tempDir && fsSync.existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should return null for non-existent config', async () => {
      const config = await cmd.loadConfig();
      assert.strictEqual(config, null);
    });

    it('should load existing config', async () => {
      const testConfig = {
        provider: 'github',
        providers: {
          github: {
            owner: 'testuser',
            repo: 'testrepo'
          }
        }
      };

      await fs.writeFile(cmd.configPath, JSON.stringify(testConfig, null, 2));

      const config = await cmd.loadConfig();
      assert.deepStrictEqual(config, testConfig);
    });

    it('should return null on JSON parse error', async () => {
      await fs.writeFile(cmd.configPath, 'invalid json');

      const config = await cmd.loadConfig();
      assert.strictEqual(config, null);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const testConfig = {
        provider: 'azure',
        providers: {
          azure: {
            organization: 'testorg',
            project: 'testproject'
          }
        }
      };

      await cmd.saveConfig(testConfig);

      const saved = JSON.parse(await fs.readFile(cmd.configPath, 'utf8'));
      assert.deepStrictEqual(saved, testConfig);
    });

    it('should create directory if not exists', async () => {
      // Remove .claude directory
      await fs.rm(path.join(tempDir, '.claude'), { recursive: true, force: true });

      const testConfig = { provider: 'github' };
      await cmd.saveConfig(testConfig);

      assert.ok(fsSync.existsSync(cmd.configPath));
    });

    it('should format JSON with 2 spaces', async () => {
      const testConfig = { provider: 'github' };
      await cmd.saveConfig(testConfig);

      const content = await fs.readFile(cmd.configPath, 'utf8');
      assert.ok(content.includes('  "provider"'));
    });
  });

  describe('padRight', () => {
    it('should pad string to specified length', () => {
      assert.strictEqual(cmd.padRight('test', 10), 'test      ');
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(cmd.padRight(null, 5), '     ');
      assert.strictEqual(cmd.padRight(undefined, 5), '     ');
    });

    it('should convert non-strings to string', () => {
      assert.strictEqual(cmd.padRight(123, 5), '123  ');
    });
  });

  describe('set', () => {
    it('should set simple key-value', async () => {
      await cmd.set('provider', 'github');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.provider, 'github');
    });

    it('should set nested key with dot notation', async () => {
      await cmd.set('features.autoCommit', true);

      const config = await cmd.loadConfig();
      assert.strictEqual(config.features.autoCommit, true);
    });

    it('should expand provider shortcuts (azure.organization)', async () => {
      await cmd.set('azure.organization', 'testorg');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.providers.azure.organization, 'testorg');
    });

    it('should expand provider shortcuts (github.owner)', async () => {
      await cmd.set('github.owner', 'testuser');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.providers.github.owner, 'testuser');
    });

    it('should validate provider values', async () => {
      await cmd.set('provider', 'invalid');

      const config = await cmd.loadConfig();
      assert.strictEqual(config, null); // Should not save invalid provider
    });

    it('should initialize provider config when setting provider', async () => {
      await cmd.set('provider', 'azure');

      const config = await cmd.loadConfig();
      assert.ok(config.providers);
      assert.ok(config.providers.azure);
    });

    it('should create nested objects as needed', async () => {
      await cmd.set('a.b.c.d', 'value');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.a.b.c.d, 'value');
    });
  });

  describe('toggle', () => {
    it('should toggle feature from false to true', async () => {
      await cmd.saveConfig({ features: { dockerFirst: false } });

      await cmd.toggle('docker-first');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.features.dockerFirst, true);
    });

    it('should toggle feature from true to false', async () => {
      await cmd.saveConfig({ features: { kubernetes: true } });

      await cmd.toggle('kubernetes');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.features.kubernetes, false);
    });

    it('should initialize features object if missing', async () => {
      await cmd.saveConfig({ provider: 'github' });

      await cmd.toggle('auto-commit');

      const config = await cmd.loadConfig();
      assert.ok(config.features);
      assert.strictEqual(config.features.autoCommit, true);
    });

    it('should map hyphenated names to camelCase', async () => {
      await cmd.toggle('docker-first');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.features.dockerFirst, true);
    });
  });

  describe('loadEnv', () => {
    it('should load environment variables from .claude/.env', async () => {
      const envContent = 'GITHUB_TOKEN=test_github_token_from_env\nAZURE_DEVOPS_PAT=test_azure_token';
      await fs.writeFile(cmd.envPath, envContent);

      // Create new instance to trigger loadEnv()
      const newCmd = new ConfigCommand();

      assert.strictEqual(process.env.GITHUB_TOKEN, 'test_github_token_from_env');
      assert.strictEqual(process.env.AZURE_DEVOPS_PAT, 'test_azure_token');
    });

    it('should not fail if .env file does not exist', () => {
      // Should not throw error even if .env doesn't exist
      const newCmd = new ConfigCommand();
      assert.ok(newCmd);
    });

    it('should validate config with token from .env file', async () => {
      // Write .env file with token
      const envContent = 'GITHUB_TOKEN=test_token_from_file';
      await fs.writeFile(cmd.envPath, envContent);

      // Write config
      await cmd.saveConfig({
        provider: 'github',
        providers: {
          github: {
            owner: 'testuser',
            repo: 'testrepo'
          }
        }
      });

      // Create required directories
      await fs.mkdir(path.join(tempDir, '.claude', 'agents'), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.claude', 'commands'), { recursive: true });

      // Create new instance to load .env
      const newCmd = new ConfigCommand();

      const valid = await newCmd.validate();
      assert.strictEqual(valid, true);
    });
  });

  describe('validate', () => {
    it('should return false for missing config', async () => {
      const valid = await cmd.validate();
      assert.strictEqual(valid, false);
    });

    it('should validate GitHub config with all required fields', async () => {
      await cmd.saveConfig({
        provider: 'github',
        providers: {
          github: {
            owner: 'testuser',
            repo: 'testrepo'
          }
        }
      });

      // Set environment variable
      process.env.GITHUB_TOKEN = 'test_token';

      // Create required directories
      await fs.mkdir(path.join(tempDir, '.claude', 'agents'), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.claude', 'commands'), { recursive: true });

      const valid = await cmd.validate();
      assert.strictEqual(valid, true);
    });

    it('should fail validation for missing GitHub owner', async () => {
      await cmd.saveConfig({
        provider: 'github',
        providers: {
          github: {
            repo: 'testrepo'
          }
        }
      });

      process.env.GITHUB_TOKEN = 'test_token';

      const valid = await cmd.validate();
      assert.strictEqual(valid, false);
    });

    it('should fail validation for missing GitHub token', async () => {
      await cmd.saveConfig({
        provider: 'github',
        providers: {
          github: {
            owner: 'testuser',
            repo: 'testrepo'
          }
        }
      });

      delete process.env.GITHUB_TOKEN;

      const valid = await cmd.validate();
      assert.strictEqual(valid, false);
    });

    it('should validate Azure config with all required fields', async () => {
      await cmd.saveConfig({
        provider: 'azure',
        providers: {
          azure: {
            organization: 'testorg',
            project: 'testproject'
          }
        }
      });

      process.env.AZURE_DEVOPS_PAT = 'test_token';

      await fs.mkdir(path.join(tempDir, '.claude', 'agents'), { recursive: true });
      await fs.mkdir(path.join(tempDir, '.claude', 'commands'), { recursive: true });

      const valid = await cmd.validate();
      assert.strictEqual(valid, true);
    });

    it('should fail validation for missing Azure organization', async () => {
      await cmd.saveConfig({
        provider: 'azure',
        providers: {
          azure: {
            project: 'testproject'
          }
        }
      });

      process.env.AZURE_DEVOPS_PAT = 'test_token';

      const valid = await cmd.validate();
      assert.strictEqual(valid, false);
    });

    it('should fail validation for missing required directories', async () => {
      await cmd.saveConfig({
        provider: 'github',
        providers: {
          github: {
            owner: 'testuser',
            repo: 'testrepo'
          }
        }
      });

      process.env.GITHUB_TOKEN = 'test_token';

      // Don't create directories

      const valid = await cmd.validate();
      assert.strictEqual(valid, false);
    });
  });

  describe('switch', () => {
    it('should switch provider to github', async () => {
      await cmd.saveConfig({ provider: 'azure' });

      await cmd.switch('github');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.provider, 'github');
    });

    it('should switch provider to azure', async () => {
      await cmd.saveConfig({ provider: 'github' });

      await cmd.switch('azure');

      const config = await cmd.loadConfig();
      assert.strictEqual(config.provider, 'azure');
    });
  });
});
