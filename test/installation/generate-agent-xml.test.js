const fs = require('fs');
const path = require('path');
const os = require('os');

// The Installer constructor calls parseArgs() which reads process.argv.
// We need to require the class after setting up argv.
const originalArgv = process.argv;

let Installer;
let installer;
let tempDir;

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PACKAGES_DIR = path.join(PROJECT_ROOT, 'packages');

beforeAll(() => {
  process.argv = ['node', 'install.js'];
  Installer = require('../../install/install.js');
});

afterAll(() => {
  process.argv = originalArgv;
});

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-test-'));
  installer = new Installer();
  installer.baseDir = PROJECT_ROOT;
  installer.targetDir = tempDir;
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('generatePluginAgentXml', () => {
  test('generates XML for plugin with agents', () => {
    const xml = installer.generatePluginAgentXml(['plugin-languages']);
    expect(xml).toContain('<agents category="languages">');
    expect(xml).toContain('python-backend-engineer');
    expect(xml).toContain('</agents>');
  });

  test('skips core agents from plugin-core', () => {
    const xml = installer.generatePluginAgentXml(['plugin-core']);
    expect(xml).toBe('');
  });

  test('groups agents by category from plugin metadata', () => {
    const xml = installer.generatePluginAgentXml(['plugin-languages', 'plugin-frameworks']);
    expect(xml).toContain('<agents category="languages">');
    // frameworks plugin uses varied categories (frontend, ui, styling, design, etc.)
    // Verify multiple category blocks are generated
    const categoryCount = (xml.match(/<agents category="/g) || []).length;
    expect(categoryCount).toBeGreaterThanOrEqual(2);
  });

  test('escapes XML special characters in descriptions', () => {
    // Create a temp plugin with special chars
    const tempPlugin = path.join(tempDir, 'packages', 'plugin-test');
    fs.mkdirSync(tempPlugin, { recursive: true });
    fs.writeFileSync(path.join(tempPlugin, 'plugin.json'), JSON.stringify({
      agents: [{
        name: 'test-agent',
        file: 'agents/test/test-agent.md',
        category: 'test',
        description: 'Handles <input> & "output" processing'
      }]
    }));

    const savedBase = installer.baseDir;
    installer.baseDir = tempDir;
    const xml = installer.generatePluginAgentXml(['plugin-test']);
    installer.baseDir = savedBase;

    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).not.toContain('& ');
  });

  test('handles plugin with no agents', () => {
    const xml = installer.generatePluginAgentXml(['plugin-pm']);
    // plugin-pm has no agents (only commands)
    expect(xml).toBe('');
  });

  test('handles missing plugin.json gracefully', () => {
    const xml = installer.generatePluginAgentXml(['plugin-nonexistent']);
    expect(xml).toBe('');
  });

  test('generates valid XML agent entries with name and path', () => {
    const xml = installer.generatePluginAgentXml(['plugin-databases']);
    const agentMatch = xml.match(/<agent name="([^"]+)" path="([^"]+)">/);
    expect(agentMatch).not.toBeNull();
    expect(agentMatch[2]).toMatch(/^agents\/databases\/[a-z-]+\.md$/);
  });

  test('handles multiple plugins combining agents', () => {
    const xml = installer.generatePluginAgentXml([
      'plugin-languages', 'plugin-frameworks', 'plugin-databases'
    ]);
    const agentCount = (xml.match(/<agent /g) || []).length;
    // languages: 5, frameworks: ~6, databases: 5 (varies by plugin.json categories)
    expect(agentCount).toBeGreaterThanOrEqual(13);
  });
});

describe('updateAgentRegistry', () => {
  beforeEach(() => {
    // Copy agent-registry.xml to temp target
    const agentsDir = path.join(tempDir, '.claude', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.copyFileSync(
      path.join(PROJECT_ROOT, 'autopm', '.claude', 'agents', 'agent-registry.xml'),
      path.join(agentsDir, 'agent-registry.xml')
    );
  });

  test('injects plugin agents between markers', () => {
    installer.updateAgentRegistry(['plugin-languages']);
    const content = fs.readFileSync(
      path.join(tempDir, '.claude', 'agents', 'agent-registry.xml'), 'utf8'
    );
    expect(content).toContain('<!-- PLUGIN_AGENTS_START -->');
    expect(content).toContain('<!-- PLUGIN_AGENTS_END -->');
    expect(content).toContain('python-backend-engineer');
    expect(content).toContain('<agents category="languages">');
  });

  test('preserves core agents section', () => {
    installer.updateAgentRegistry(['plugin-languages']);
    const content = fs.readFileSync(
      path.join(tempDir, '.claude', 'agents', 'agent-registry.xml'), 'utf8'
    );
    expect(content).toContain('<agents category="core">');
    expect(content).toContain('agent-manager');
    expect(content).toContain('test-runner');
    expect(content).toContain('context-optimizer');
  });

  test('handles empty plugin list', () => {
    installer.updateAgentRegistry([]);
    const content = fs.readFileSync(
      path.join(tempDir, '.claude', 'agents', 'agent-registry.xml'), 'utf8'
    );
    // Markers present, no agents between them
    expect(content).toContain('<!-- PLUGIN_AGENTS_START -->');
    expect(content).toContain('<!-- PLUGIN_AGENTS_END -->');
    // No non-core agent categories
    expect(content).not.toContain('<agents category="languages">');
  });

  test('handles missing agent-registry.xml', () => {
    fs.rmSync(path.join(tempDir, '.claude', 'agents', 'agent-registry.xml'));
    // Should not throw
    expect(() => installer.updateAgentRegistry(['plugin-languages'])).not.toThrow();
  });

  test('handles missing markers in XML', () => {
    const registryPath = path.join(tempDir, '.claude', 'agents', 'agent-registry.xml');
    fs.writeFileSync(registryPath, '<agent-registry><agents category="core"></agents></agent-registry>');
    // Should not throw
    expect(() => installer.updateAgentRegistry(['plugin-languages'])).not.toThrow();
    // Content unchanged (no markers to inject into)
    const content = fs.readFileSync(registryPath, 'utf8');
    expect(content).not.toContain('python-backend-engineer');
  });
});

describe('Scenario Plugin Selection', () => {
  test('lite scenario has only core and pm plugins', () => {
    const config = installer.generateConfig('lite');
    expect(config.plugins).toEqual(['plugin-core', 'plugin-pm']);
  });

  test('github scenario includes pm-github, no azure', () => {
    const config = installer.generateConfig('github');
    expect(config.plugins).toContain('plugin-pm-github');
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('azure scenario includes pm-azure', () => {
    const config = installer.generateConfig('azure');
    expect(config.plugins).toContain('plugin-pm-azure');
  });

  test('docker scenario does NOT include azure', () => {
    const config = installer.generateConfig('docker');
    expect(config.plugins).not.toContain('plugin-pm-azure');
    expect(config.plugins).toContain('plugin-pm-github');
  });

  test('full scenario does NOT include azure', () => {
    const config = installer.generateConfig('full');
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('full-azure scenario includes both github and azure', () => {
    const config = installer.generateConfig('full-azure');
    expect(config.plugins).toContain('plugin-pm-github');
    expect(config.plugins).toContain('plugin-pm-azure');
  });

  test('performance scenario does NOT include azure', () => {
    const config = installer.generateConfig('performance');
    expect(config.plugins).not.toContain('plugin-pm-azure');
  });

  test('all scenarios include plugin-core', () => {
    const scenarios = ['lite', 'github', 'azure', 'docker', 'full', 'full-azure', 'performance'];
    for (const s of scenarios) {
      const config = installer.generateConfig(s);
      expect(config.plugins).toContain('plugin-core');
    }
  });

  test('unknown scenario falls back to full', () => {
    const config = installer.generateConfig('nonexistent');
    const fullConfig = installer.generateConfig('full');
    expect(config.plugins).toEqual(fullConfig.plugins);
  });
});

// #790 task 2: Claude Code imports with `@path`; `@include <path>` is plain
// text to it, so nothing listed that way was ever loaded.
describe('generated imports use Claude Code @path syntax (#790)', () => {
  const INCLUDE_LINE = /^\s*(?:-\s+)?@include\b/;
  const IMPORT = /(?:^|\s)@(\.claude\/[^\s`)]+)/g;

  async function installScenario(scenario, dir) {
    const inst = new Installer();
    inst.baseDir = PROJECT_ROOT;
    inst.targetDir = dir;
    inst.options.force = true;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      inst.installFramework();
      inst.installConfig(scenario);
      inst.currentConfig = inst.generateConfig(scenario);
      await inst.installPlugins();
    } finally {
      log.mockRestore();
    }
    return inst;
  }

  function importsOf(text) {
    return [...text.matchAll(IMPORT)].map(m => m[1]);
  }

  test.each(['lite', 'full'])('%s: no @include line, every @.claude import resolves', async (scenario) => {
    const inst = await installScenario(scenario, tempDir);
    const generated = {
      agentIncludes: inst.generateAgentIncludes(),
      // install/update.sh ships it next to the installed .claude/ tree.
      'base.md': fs.readFileSync(path.join(PROJECT_ROOT, 'autopm', '.claude', 'base.md'), 'utf-8')
    };

    expect(generated.agentIncludes).not.toBe('');
    for (const [name, text] of Object.entries(generated)) {
      const bad = text.split('\n').filter(l => INCLUDE_LINE.test(l));
      expect({ name, bad }).toEqual({ name, bad: [] });
      const missing = importsOf(text).filter(p => !fs.existsSync(path.join(tempDir, p)));
      expect({ name, missing }).toEqual({ name, missing: [] });
    }
    expect(importsOf(generated.agentIncludes).length).toBe(generated.agentIncludes.split('\n').length);
    expect(importsOf(generated['base.md']).length).toBeGreaterThan(0);
  }, 60000);

  test('team and plugin commands emit @path, not @include', () => {
    for (const f of ['bin/commands/team.js', 'bin/commands/plugin.js']) {
      const src = fs.readFileSync(path.join(PROJECT_ROOT, f), 'utf-8');
      expect({ f, hasInclude: /@include\b/.test(src) }).toEqual({ f, hasInclude: false });
    }
  });
});
