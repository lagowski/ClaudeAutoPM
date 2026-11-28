/**
 * Issue #904: plugin-pm and plugin-pm-github keep command files without the
 * `pm:` / `github:` prefix (Windows can't store `:`); the plugin name adds the
 * namespace. The installer payload keeps its `pm:*` / `github:*` names, so the
 * sync script maps the stripped files back to them.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { pluginCommandFiles } = require('../../scripts/sync-plugin-commands');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    out.push(p);
    if (e.isDirectory()) walk(p, out);
  }
  return out;
}

describe('plugin-pm / plugin-pm-github file names (#904)', () => {
  test.each(['plugin-pm', 'plugin-pm-github'])('no path under packages/%s contains ":"', (pkg) => {
    const bad = walk(path.join(ROOT, 'packages', pkg))
      .map((p) => path.relative(ROOT, p))
      .filter((p) => p.includes(':'));
    expect(bad).toEqual([]);
  });

  test('the 17 GitHub pm commands live in plugin-pm; plugin-pm-github keeps only workflow-create', () => {
    const pmDir = path.join(ROOT, 'packages', 'plugin-pm', 'commands');
    for (const f of ['issue-start.md', 'epic-sync.md', 'sync.md', 'import.md']) {
      expect(fs.existsSync(path.join(pmDir, f))).toBe(true);
    }
    expect(fs.readdirSync(path.join(ROOT, 'packages', 'plugin-pm-github', 'commands'))).toEqual([
      'workflow-create.md',
    ]);
  });

  test('stripped files map back to the namespaced payload names', () => {
    const byFile = new Map(pluginCommandFiles().map((c) => [path.relative(ROOT, c.file), c.name]));
    expect(byFile.get('packages/plugin-pm/commands/issue-start.md')).toBe('pm:issue-start.md');
    expect(byFile.get('packages/plugin-pm/commands/help.md')).toBe('pm:help.md');
    expect(byFile.get('packages/plugin-pm-github/commands/workflow-create.md')).toBe(
      'github:workflow-create.md'
    );
  });
});

describe('autopm plugin install keeps the pm:* names (#904)', () => {
  const os = require('os');
  const PluginManager = require('../../lib/plugins/PluginManager');
  let tempDir;
  afterEach(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  test.each([
    ['plugin-pm', 'issue-start.md', 'pm:issue-start.md'],
    ['plugin-pm-github', 'workflow-create.md', 'github:workflow-create.md'],
  ])('installing %s writes %s as .claude/commands/%s', async (pkg, file, target) => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-904-'));
    const pm = new PluginManager({
      pluginDir: path.join(tempDir, 'node_modules'),
      agentDir: path.join(tempDir, '.claude', 'agents'),
      projectRoot: tempDir,
    });
    const pluginPath = path.join(ROOT, 'packages', pkg);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(pluginPath, '.claude-plugin', 'plugin.json'), 'utf8')
    );
    const plugin = { name: manifest.name, path: pluginPath, metadata: manifest.metadata };
    await pm.installCommands(plugin, pluginPath);
    const dir = path.join(tempDir, '.claude', 'commands');
    expect(fs.existsSync(path.join(dir, target))).toBe(true);
    expect(fs.existsSync(path.join(dir, file))).toBe(false);
  });
});
