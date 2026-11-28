/**
 * Every packages/plugin-* workspace ships a real Claude Code plugin manifest at
 * .claude-plugin/plugin.json (#903, docs/plugin-format-migration.md).
 * Claude Code strips unknown top-level keys, so the homemade keys live under `metadata`.
 * Reference: https://code.claude.com/docs/en/plugins-reference
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const PluginManager = require('../../lib/plugins/PluginManager');

const PACKAGES = path.join(__dirname, '..', '..', 'packages');

const EXPECTED = {
  'plugin-core': { name: 'core', dependencies: undefined },
  'plugin-ai': { name: 'ai', dependencies: ['core'] },
  'plugin-cloud': { name: 'cloud', dependencies: ['core'] },
  'plugin-data': { name: 'data', dependencies: ['core'] },
  'plugin-databases': { name: 'db', dependencies: ['core'] },
  'plugin-devops': { name: 'devops', dependencies: ['core'] },
  'plugin-frameworks': { name: 'framework', dependencies: ['core'] },
  'plugin-languages': { name: 'lang', dependencies: ['core'] },
  'plugin-ml': { name: 'ml', dependencies: ['core'] },
  'plugin-obsidian': { name: 'obsidian', dependencies: ['core'] },
  'plugin-pm': { name: 'pm', dependencies: ['core'] },
  'plugin-pm-github': { name: 'github', dependencies: ['core', 'pm'] },
  'plugin-pm-azure': { name: 'azure', dependencies: ['core', 'pm'] },
  'plugin-testing': { name: 'test', dependencies: ['core'] }
};

// Documented plugin.json fields (plugins-reference). Anything else is stripped by Claude Code.
const DOCUMENTED_KEYS = new Set([
  '$schema', 'name', 'displayName', 'version', 'description', 'author', 'homepage', 'repository',
  'license', 'keywords', 'metadata', 'icon', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl',
  'termsOfServiceUrl', 'defaultEnabled', 'engines', 'dependencies', 'network', 'userConfig', 'types',
  'channels', 'skills', 'commands', 'agents', 'hooks', 'mcpServers', 'lspServers', 'outputStyles',
  'workflows', 'experimental'
]);
const HOMEMADE_KEYS = ['schemaVersion', 'features', 'compatibleWith', 'peerPlugins', 'category', 'rules', 'scripts'];

describe('.claude-plugin/plugin.json in every workspace (#903)', () => {
  test('the 14 workspaces are exactly the expected set', () => {
    const workspaces = fs.readdirSync(PACKAGES).filter((d) => d.startsWith('plugin-')).sort();
    expect(workspaces).toEqual(Object.keys(EXPECTED).sort());
  });

  describe.each(Object.entries(EXPECTED))('%s', (dir, expected) => {
    const manifestPath = path.join(PACKAGES, dir, '.claude-plugin', 'plugin.json');
    const read = () => JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    test('has a parseable .claude-plugin/plugin.json and no root plugin.json', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      expect(() => read()).not.toThrow();
      expect(fs.existsSync(path.join(PACKAGES, dir, 'plugin.json'))).toBe(false);
    });

    test('name is the kebab-case plugin name', () => {
      const m = read();
      expect(m.name).toBe(expected.name);
      expect(m.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    test('only documented top-level keys; homemade keys sit under metadata', () => {
      const m = read();
      expect(Object.keys(m).filter((k) => !DOCUMENTED_KEYS.has(k))).toEqual([]);
      for (const k of ['agents', 'commands', 'hooks', 'mcpServers']) expect(m).not.toHaveProperty(k);
      for (const k of HOMEMADE_KEYS) expect(m).not.toHaveProperty(k);
      expect(m.metadata).toEqual(expect.objectContaining({ schemaVersion: expect.any(String) }));
    });

    test('carries the required descriptive fields', () => {
      const m = read();
      expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof m.description).toBe('string');
      expect(m.author).toEqual({ name: expect.any(String) });
      expect(m.repository).toBe('https://github.com/lagowski/ClaudeAutoPM');
      expect(m.license).toBe('MIT');
      expect(Array.isArray(m.keywords) && m.keywords.length > 0).toBe(true);
      expect(m.dependencies).toEqual(expected.dependencies);
    });
  });
});

describe('PluginManager.readManifest (#903)', () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('reads .claude-plugin/plugin.json and flattens metadata', () => {
    fs.mkdirSync(path.join(tmp, '.claude-plugin'));
    fs.writeFileSync(path.join(tmp, '.claude-plugin', 'plugin.json'), JSON.stringify({
      name: 'x', version: '1.0.0', description: 'd',
      metadata: { schemaVersion: '2.0', category: 'cat', agents: [{ name: 'a', file: 'agents/a.md' }] }
    }));
    expect(PluginManager.readManifest(tmp)).toEqual(expect.objectContaining({
      name: 'x', version: '1.0.0', description: 'd', category: 'cat',
      agents: [{ name: 'a', file: 'agents/a.md' }]
    }));
  });

  test('falls back to a legacy root plugin.json unchanged', () => {
    const legacy = { name: '@claudeautopm/plugin-x', schemaVersion: '2.0', category: 'c', metadata: { category: 'Label' } };
    fs.writeFileSync(path.join(tmp, 'plugin.json'), JSON.stringify(legacy));
    expect(PluginManager.readManifest(tmp)).toEqual(legacy);
  });

  test('returns null when no manifest exists', () => {
    expect(PluginManager.readManifest(tmp)).toBeNull();
  });

  test('discoverPlugins finds every bundled workspace via .claude-plugin/plugin.json', async () => {
    const manager = new PluginManager({ projectRoot: path.join(__dirname, '..', '..'), searchGlobal: false });
    await manager.discoverPlugins();
    for (const dir of Object.keys(EXPECTED)) {
      const plugin = manager.plugins.get(`@claudeautopm/${dir}`);
      expect(plugin).toBeDefined();
      expect(plugin.metadata.schemaVersion).toBeDefined();
    }
    const ai = manager.plugins.get('@claudeautopm/plugin-ai');
    expect(ai.metadata.category).toBe('ai');
    expect(ai.metadata.agents.length).toBeGreaterThan(0);
  });
});
