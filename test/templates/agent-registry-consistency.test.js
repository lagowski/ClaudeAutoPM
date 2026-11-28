const fs = require('fs');
const path = require('path');
const PluginManager = require('../../lib/plugins/PluginManager');

const AUTOPM_DIR = path.join(__dirname, '..', '..', 'autopm', '.claude', 'agents');
const PACKAGES_DIR = path.join(__dirname, '..', '..', 'packages');
const REGISTRY_XML = path.join(AUTOPM_DIR, 'agent-registry.xml');
const REGISTRY_MD = path.join(AUTOPM_DIR, 'AGENT-REGISTRY.md');

const CORE_AGENTS = [
  'agent-manager', 'file-analyzer', 'code-analyzer', 'test-runner',
  'parallel-worker', 'mcp-manager', 'context-optimizer'
];

function parseXmlAgents(xmlContent) {
  const agents = [];
  const agentRegex = /<agent\s+name="([^"]+)"\s+path="([^"]+)"[^>]*>/g;
  let match;
  while ((match = agentRegex.exec(xmlContent)) !== null) {
    agents.push({ name: match[1], path: match[2] });
  }
  return agents;
}

function getPluginAgents(pluginDir) {
  try {
    const metadata = PluginManager.readManifest(pluginDir);
    if (!metadata) return [];
    return (metadata.agents || []).map(a => ({
      name: a.name,
      file: a.file,
      category: a.category,
      pluginDir
    }));
  } catch { return []; }
}

describe('Agent Registry Consistency', () => {
  let xmlContent;
  let xmlAgents;

  beforeAll(() => {
    if (!fs.existsSync(REGISTRY_XML)) {
      throw new Error(`agent-registry.xml not found at ${REGISTRY_XML}`);
    }
    xmlContent = fs.readFileSync(REGISTRY_XML, 'utf8');
    xmlAgents = parseXmlAgents(xmlContent);
  });

  test('agent-registry.xml exists and is non-empty', () => {
    expect(xmlAgents.length).toBeGreaterThan(0);
  });

  test('agent-registry.xml contains only core agents in static section', () => {
    // Before plugin injection, XML should have exactly 7 core agents
    const coreXmlAgents = xmlAgents.filter(a => a.path.startsWith('agents/core/'));
    expect(coreXmlAgents.length).toBe(7);

    const names = coreXmlAgents.map(a => a.name).sort();
    expect(names).toEqual(CORE_AGENTS.sort());
  });

  test('every core agent in XML has a .md file on disk', () => {
    const missing = [];
    for (const agent of xmlAgents) {
      const filePath = path.join(AUTOPM_DIR, '..', agent.path);
      if (!fs.existsSync(filePath)) {
        missing.push(`${agent.name} -> ${agent.path}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every core agent .md file has required frontmatter fields', () => {
    const errors = [];
    for (const agent of xmlAgents) {
      const filePath = path.join(AUTOPM_DIR, '..', agent.path);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!fmMatch) { errors.push(`${agent.name}: missing frontmatter`); continue; }
      const fm = fmMatch[1];
      if (!fm.includes('name:')) errors.push(`${agent.name}: missing 'name' in frontmatter`);
      if (!fm.includes('category:')) errors.push(`${agent.name}: missing 'category' in frontmatter`);
      if (!fm.includes('tools:')) errors.push(`${agent.name}: missing 'tools' in frontmatter`);
    }
    expect(errors).toEqual([]);
  });

  test('every core agent .md file has required sections', () => {
    const errors = [];
    const requiredSections = ['## Scope', '## NOT For', '## Context7 Queries', '## Key Patterns'];

    for (const agent of xmlAgents) {
      const filePath = path.join(AUTOPM_DIR, '..', agent.path);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          errors.push(`${agent.name}: missing '${section}'`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  test('no duplicate agent names in XML registry', () => {
    const names = xmlAgents.map(a => a.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    expect(duplicates).toEqual([]);
  });

  test('autopm/.claude/agents/ has no non-core agent directories', () => {
    const dirs = fs.readdirSync(AUTOPM_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const allowedDirs = ['core', 'decision-matrices'];
    const unexpected = dirs.filter(d => !allowedDirs.includes(d));
    expect(unexpected).toEqual([]);
  });
});

describe('Plugin Core Completeness', () => {
  const pluginCorePath = path.join(PACKAGES_DIR, 'plugin-core');

  test('plugin-core plugin.json declares all 7 core agents', () => {
    const agents = getPluginAgents(pluginCorePath);
    const coreAgents = agents.filter(a => a.category === 'core');
    const names = coreAgents.map(a => a.name).sort();
    expect(names).toEqual(CORE_AGENTS.sort());
  });

  test('plugin-core agent files exist on disk', () => {
    const agents = getPluginAgents(pluginCorePath);
    const missing = [];
    for (const agent of agents) {
      const filePath = path.join(pluginCorePath, agent.file);
      if (!fs.existsSync(filePath)) {
        missing.push(`${agent.name} -> ${agent.file}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('Plugin Agent Files Exist', () => {
  const pluginDirs = fs.existsSync(PACKAGES_DIR)
    ? fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('plugin-'))
        .map(d => d.name)
    : [];

  for (const pluginName of pluginDirs) {
    const pluginDir = path.join(PACKAGES_DIR, pluginName);
    const agents = getPluginAgents(pluginDir);

    if (agents.length === 0) continue;

    test(`${pluginName}: all declared agent files exist`, () => {
      const missing = [];
      for (const agent of agents) {
        const filePath = path.join(pluginDir, agent.file);
        if (!fs.existsSync(filePath)) {
          missing.push(`${agent.name} -> ${agent.file}`);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});
