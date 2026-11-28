/**
 * Plugin manifests, agent files and AGENT-REGISTRY.md agree (#863).
 *
 * - every file listed in a packages/<plugin>/.claude-plugin/plugin.json (metadata) exists
 * - every agent file under packages/<plugin>/agents/ is listed in that plugin.json
 * - no agent basename is owned by two plugins (installs pick whichever copy lands last)
 * - AGENT-REGISTRY.md lists exactly the agents that exist, at their installed location
 */
const fs = require('fs');
const path = require('path');
const PluginManager = require('../../lib/plugins/PluginManager');

const ROOT = path.resolve(__dirname, '../..');
const PACKAGES = path.join(ROOT, 'packages');
const REGISTRIES = [
  'autopm/.claude/agents/AGENT-REGISTRY.md',
  '.claude/agents/AGENT-REGISTRY.md'
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

const plugins = fs
  .readdirSync(PACKAGES)
  .filter((p) => PluginManager.manifestPath(path.join(PACKAGES, p)))
  .map((p) => ({
    name: p,
    dir: path.join(PACKAGES, p),
    manifest: PluginManager.readManifest(path.join(PACKAGES, p))
  }));

// Installed path, mirroring PluginManager.installAgents (agentDir/<category>/<file>);
// plugin-core has no top-level category and ships agents/core/ as-is.
function installedLocation(plugin, agentFile) {
  const { category } = plugin.manifest;
  return category
    ? `.claude/agents/${category}/${path.basename(agentFile)}`
    : `.claude/${agentFile}`;
}

const agents = plugins.flatMap((plugin) =>
  (plugin.manifest.agents || []).map((a) => ({
    plugin: plugin.name,
    name: path.basename(a.file, '.md'),
    location: installedLocation(plugin, a.file)
  }))
);

function parseRegistry(text) {
  // Agent sections end where the non-agent sections begin.
  const agentPart = text.split(/^## Decision Matrices/m)[0];
  const entries = {};
  let current = null;
  for (const line of agentPart.split('\n')) {
    const heading = line.match(/^### ([a-z0-9-]+)\s*$/);
    if (heading) {
      current = heading[1];
      entries[current] = null;
      continue;
    }
    const loc = line.match(/^\*\*Location\*\*: `([^`]+)`/);
    if (loc && current) entries[current] = loc[1];
  }
  return entries;
}

describe('plugin manifest consistency (#863)', () => {
  test('every file listed in a plugin.json exists', () => {
    const missing = [];
    for (const plugin of plugins) {
      for (const [key, value] of Object.entries(plugin.manifest)) {
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
          if (entry && typeof entry.file === 'string' &&
              !fs.existsSync(path.join(plugin.dir, entry.file))) {
            missing.push(`${plugin.name} ${key}: ${entry.file}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('every agent file is listed in its plugin.json', () => {
    const unlisted = [];
    for (const plugin of plugins) {
      const agentDir = path.join(plugin.dir, 'agents');
      if (!fs.existsSync(agentDir)) continue;
      const listed = new Set((plugin.manifest.agents || []).map((a) => path.normalize(a.file)));
      for (const file of walk(agentDir)) {
        if (!file.endsWith('.md') || path.basename(file) === 'README.md') continue;
        const rel = path.relative(plugin.dir, file);
        if (!listed.has(rel)) unlisted.push(`${plugin.name}: ${rel}`);
      }
    }
    expect(unlisted).toEqual([]);
  });

  test('no agent basename exists in two plugins', () => {
    const owners = {};
    for (const plugin of plugins) {
      const agentDir = path.join(plugin.dir, 'agents');
      if (!fs.existsSync(agentDir)) continue;
      for (const file of walk(agentDir)) {
        if (!file.endsWith('.md') || path.basename(file) === 'README.md') continue;
        const base = path.basename(file, '.md');
        (owners[base] = owners[base] || []).push(plugin.name);
      }
    }
    const duplicates = Object.entries(owners)
      .filter(([, list]) => list.length > 1)
      .map(([base, list]) => `${base}: ${list.join(', ')}`);
    expect(duplicates).toEqual([]);
  });

  test('both AGENT-REGISTRY.md copies are identical', () => {
    const [a, b] = REGISTRIES.map((r) => fs.readFileSync(path.join(ROOT, r), 'utf8'));
    expect(b).toBe(a);
  });

  test('AGENT-REGISTRY.md lists exactly the existing agents at their installed location', () => {
    const registry = parseRegistry(
      fs.readFileSync(path.join(ROOT, REGISTRIES[0]), 'utf8')
    );
    const expected = Object.fromEntries(agents.map((a) => [a.name, a.location]));

    const notInRegistry = Object.keys(expected).filter((n) => !(n in registry)).sort();
    const noAgentFile = Object.keys(registry).filter((n) => !(n in expected)).sort();
    const wrongLocation = Object.keys(expected)
      .filter((n) => n in registry && registry[n] !== expected[n])
      .map((n) => `${n}: ${registry[n]} (want ${expected[n]})`);

    expect({ notInRegistry, noAgentFile, wrongLocation })
      .toEqual({ notInRegistry: [], noAgentFile: [], wrongLocation: [] });
  });
});
