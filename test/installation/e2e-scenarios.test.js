const fs = require('fs');
const path = require('path');
const os = require('os');
const PluginManager = require('../../lib/plugins/PluginManager');

const originalArgv = process.argv;
let Installer;

beforeAll(() => {
  process.argv = ['node', 'install.js', '--force'];
  Installer = require('../../install/install.js');
});

afterAll(() => {
  process.argv = originalArgv;
});

function runScenario(scenario) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `autopm-e2e-${scenario}-`));
  const installer = new Installer();
  installer.targetDir = tempDir;
  installer.options.force = true;

  // Run install steps in order (skip interactive selectScenario and installDependencies)
  installer.installFramework();
  installer.installConfig(scenario);
  installer.currentConfig = installer.generateConfig(scenario);
  // installPlugins is async but we can call it synchronously for testing
  // since it only does file copies
  const pluginsToInstall = installer.currentConfig.plugins || [];
  const packagesDir = path.join(installer.baseDir, 'packages');

  for (const pluginName of pluginsToInstall) {
    const pluginPath = path.join(packagesDir, pluginName);
    const metadata = PluginManager.readManifest(pluginPath);
    if (!metadata) continue;

    // Copy agents
    if (metadata.agents) {
      for (const agent of metadata.agents) {
        if (!agent.file || !agent.category) continue;
        const targetAgentDir = path.join(tempDir, '.claude', 'agents', agent.category);
        fs.mkdirSync(targetAgentDir, { recursive: true });
        const src = path.join(pluginPath, agent.file);
        const dst = path.join(targetAgentDir, path.basename(agent.file));
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
      }
    }

    // Copy commands
    if (metadata.commands) {
      const cmdDir = path.join(tempDir, '.claude', 'commands');
      fs.mkdirSync(cmdDir, { recursive: true });
      for (const cmd of metadata.commands) {
        if (cmd.subdirectory) {
          // Flat copy like install.js; namePrefix maps help.md -> azure:help.md (#905)
          const srcDir = path.join(pluginPath, cmd.subdirectory);
          if (fs.existsSync(srcDir)) {
            for (const f of fs.readdirSync(srcDir).filter((n) => n.endsWith('.md'))) {
              const name = cmd.namePrefix && !f.includes(':') ? `${cmd.namePrefix}:${f}` : f;
              fs.copyFileSync(path.join(srcDir, f), path.join(cmdDir, name));
            }
          }
        } else if (cmd.file) {
          const src = path.join(pluginPath, cmd.file);
          if (fs.existsSync(src)) fs.copyFileSync(src, path.join(cmdDir, path.basename(cmd.file)));
        }
      }
    }
  }

  // Update agent registry with plugin agents
  installer.updateAgentRegistry(pluginsToInstall);

  return { tempDir, installer, config: installer.currentConfig };
}

function cleanup(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function readFile(tempDir, relativePath) {
  const fp = path.join(tempDir, relativePath);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
}

function dirExists(tempDir, relativePath) {
  return fs.existsSync(path.join(tempDir, relativePath));
}

function listDir(tempDir, relativePath) {
  const fp = path.join(tempDir, relativePath);
  return fs.existsSync(fp) ? fs.readdirSync(fp) : [];
}

describe('E2E: Lite Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('lite'));
  });
  afterAll(() => cleanup(tempDir));

  test('.claude directory exists', () => {
    expect(dirExists(tempDir, '.claude')).toBe(true);
  });

  test('config.json has lite settings', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).toContain('plugin-core');
    expect(config.plugins).toContain('plugin-pm');
    expect(config.plugins.length).toBe(2);
  });

  test('agent-registry.xml has core agents only', () => {
    const xml = readFile(tempDir, '.claude/agents/agent-registry.xml');
    expect(xml).toContain('<agents category="core">');
    expect(xml).toContain('agent-manager');
    expect(xml).toContain('test-runner');
    // No plugin agents
    expect(xml).not.toContain('<agents category="languages">');
    expect(xml).not.toContain('<agents category="frameworks">');
  });

  test('core agent files exist', () => {
    const coreAgents = listDir(tempDir, '.claude/agents/core');
    expect(coreAgents.length).toBeGreaterThanOrEqual(4); // at least agent-manager, code-analyzer, file-analyzer, test-runner
  });

  test('no azure commands', () => {
    expect(fs.existsSync(path.join(tempDir, '.claude/commands/azure:help.md'))).toBe(false);
  });
});

describe('E2E: GitHub Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('github'));
  });
  afterAll(() => cleanup(tempDir));

  test('config has github plugins', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).toContain('plugin-pm-github');
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('language agents installed', () => {
    const xml = readFile(tempDir, '.claude/agents/agent-registry.xml');
    expect(xml).toContain('python-backend-engineer');
  });

  test('no azure commands', () => {
    expect(fs.existsSync(path.join(tempDir, '.claude/commands/azure:help.md'))).toBe(false);
  });
});

describe('E2E: Azure Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('azure'));
  });
  afterAll(() => cleanup(tempDir));

  test('config has azure plugin', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).toContain('plugin-pm-azure');
  });

  test('azure commands installed', () => {
    expect(fs.existsSync(path.join(tempDir, '.claude/commands/azure:help.md'))).toBe(true);
  });
});

describe('E2E: Docker Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('docker'));
  });
  afterAll(() => cleanup(tempDir));

  test('config has docker enabled', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.tools.docker.enabled).toBe(true);
  });

  test('NO azure plugin', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('devops agents installed', () => {
    const xml = readFile(tempDir, '.claude/agents/agent-registry.xml');
    expect(xml).toContain('docker-containerization-expert');
  });
});

describe('E2E: Full Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('full'));
  });
  afterAll(() => cleanup(tempDir));

  test('config has many plugins', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins.length).toBeGreaterThanOrEqual(9);
  });

  test('NO azure plugin', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('multiple agent categories in registry', () => {
    const xml = readFile(tempDir, '.claude/agents/agent-registry.xml');
    expect(xml).toContain('category="core"');
    expect(xml).toContain('category="languages"');
    expect(xml).toContain('python-backend-engineer');
  });

  test('kubernetes enabled', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.tools.kubernetes.enabled).toBe(true);
  });
});

describe('E2E: Full-Azure Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('full-azure'));
  });
  afterAll(() => cleanup(tempDir));

  test('has BOTH github and azure', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).toContain('plugin-pm-github');
    expect(config.plugins).toContain('plugin-pm-azure');
  });

  test('azure commands installed', () => {
    expect(fs.existsSync(path.join(tempDir, '.claude/commands/azure:help.md'))).toBe(true);
  });
});

describe('E2E: Performance Scenario', () => {
  let tempDir;

  beforeAll(() => {
    ({ tempDir } = runScenario('performance'));
  });
  afterAll(() => cleanup(tempDir));

  test('hybrid execution strategy', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.execution_strategy).toBe('hybrid');
  });

  test('NO azure plugin', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('all major agent categories present', () => {
    const xml = readFile(tempDir, '.claude/agents/agent-registry.xml');
    expect(xml).toContain('category="core"');
    expect(xml).toContain('category="languages"');
  });

  test('parallel limit set', () => {
    const config = JSON.parse(readFile(tempDir, '.claude/config.json'));
    expect(config.parallel_limit).toBe(5);
  });
});
