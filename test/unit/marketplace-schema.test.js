/**
 * Schema test for .claude-plugin/marketplace.json (#902).
 * Keys per https://code.claude.com/docs/en/plugins/marketplace-reference
 * and the mapping table in docs/plugin-format-migration.md.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MARKETPLACE = path.join(ROOT, '.claude-plugin', 'marketplace.json');

const EXPECTED = {
  core: 'plugin-core',
  ai: 'plugin-ai',
  cloud: 'plugin-cloud',
  data: 'plugin-data',
  db: 'plugin-databases',
  devops: 'plugin-devops',
  framework: 'plugin-frameworks',
  lang: 'plugin-languages',
  ml: 'plugin-ml',
  obsidian: 'plugin-obsidian',
  pm: 'plugin-pm',
  github: 'plugin-pm-github',
  azure: 'plugin-pm-azure',
  test: 'plugin-testing',
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_PREFIX = /^(claude|anthropic)-/;

describe('.claude-plugin/marketplace.json', () => {
  const mp = JSON.parse(fs.readFileSync(MARKETPLACE, 'utf8'));

  test('has the required top-level keys', () => {
    expect(mp.name).toBe('claudeautopm');
    expect(typeof mp.owner).toBe('object');
    expect(typeof mp.owner.name).toBe('string');
    expect(mp.owner.name.length).toBeGreaterThan(0);
    expect(Array.isArray(mp.plugins)).toBe(true);
  });

  test('marketplace name is kebab-case and not reserved', () => {
    expect(mp.name).toMatch(KEBAB);
    expect(mp.name).not.toMatch(RESERVED_PREFIX);
  });

  test('has exactly one entry per plugin workspace, named per the mapping table', () => {
    const actual = Object.fromEntries(mp.plugins.map((p) => [p.name, p.source]));
    const expected = Object.fromEntries(
      Object.entries(EXPECTED).map(([n, dir]) => [n, `./packages/${dir}`])
    );
    expect(actual).toEqual(expected);
    expect(mp.plugins).toHaveLength(Object.keys(EXPECTED).length);

    const workspaces = fs
      .readdirSync(path.join(ROOT, 'packages'))
      .filter((d) => d.startsWith('plugin-'))
      .sort();
    expect(Object.values(EXPECTED).sort()).toEqual(workspaces);
  });

  test.each(Object.keys(EXPECTED))('plugin %s is valid', (name) => {
    const entry = mp.plugins.find((p) => p.name === name);
    expect(entry).toBeDefined();
    expect(entry.name).toMatch(KEBAB);
    expect(entry.name).not.toMatch(RESERVED_PREFIX);
    expect(typeof entry.source).toBe('string');
    expect(entry.source.startsWith('./')).toBe(true);
    expect(entry.source).not.toContain('..');
    const dir = path.join(ROOT, entry.source);
    expect(fs.existsSync(dir) && fs.statSync(dir).isDirectory()).toBe(true);
  });

  test('uses no keys outside the marketplace format', () => {
    const top = ['$schema', 'name', 'owner', 'plugins', 'metadata', 'description', 'version'];
    Object.keys(mp).forEach((k) => expect(top).toContain(k));
    const entryKeys = [
      'name', 'source', 'description', 'version', 'author', 'homepage', 'repository',
      'license', 'keywords', 'category', 'tags', 'strict', 'commands', 'agents', 'hooks',
      'mcpServers', 'lspServers', 'skills', 'dependencies',
    ];
    mp.plugins.forEach((p) => Object.keys(p).forEach((k) => expect(entryKeys).toContain(k)));
  });
});
