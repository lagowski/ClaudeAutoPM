/**
 * Issue #905: plugin-pm-azure keeps its command files flat in commands/ and
 * without the `azure:` prefix (Windows can't store `:`); the plugin name
 * `azure` adds the namespace, so /azure:<x> keeps working. Installs and the
 * sync script map the stripped files back to azure:<x>.md.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PKG = path.join(ROOT, 'packages', 'plugin-pm-azure');
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

describe('plugin-pm-azure file names (#905)', () => {
  test('no path under packages/plugin-pm-azure contains ":"', () => {
    const bad = walk(PKG)
      .map((p) => path.relative(ROOT, p))
      .filter((p) => p.includes(':'));
    expect(bad).toEqual([]);
  });

  test('the 51 commands sit flat in commands/ (no commands/azure/ subdirectory)', () => {
    const entries = fs.readdirSync(path.join(PKG, 'commands'), { withFileTypes: true });
    expect(entries.filter((e) => e.isDirectory())).toEqual([]);
    expect(entries.filter((e) => e.name.endsWith('.md'))).toHaveLength(51);
  });

  test('stripped files map back to azure:<x>.md', () => {
    const byFile = new Map(pluginCommandFiles().map((c) => [path.relative(ROOT, c.file), c.name]));
    expect(byFile.get('packages/plugin-pm-azure/commands/help.md')).toBe('azure:help.md');
    expect(byFile.get('packages/plugin-pm-azure/commands/task-new.md')).toBe('azure:task-new.md');
  });

  test('autopm plugin install writes help.md as .claude/commands/azure:help.md', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-905-'));
    try {
      const PluginManager = require('../../lib/plugins/PluginManager');
      const pm = new PluginManager({
        pluginDir: path.join(tempDir, 'node_modules'),
        agentDir: path.join(tempDir, '.claude', 'agents'),
        projectRoot: tempDir,
      });
      const manifest = JSON.parse(
        fs.readFileSync(path.join(PKG, '.claude-plugin', 'plugin.json'), 'utf8')
      );
      await pm.installCommands({ name: manifest.name, path: PKG, metadata: manifest.metadata }, PKG);
      const dir = path.join(tempDir, '.claude', 'commands');
      expect(fs.existsSync(path.join(dir, 'azure:help.md'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'help.md'))).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('autopm install (azure scenario) keeps azure:* and pm:* names apart', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'install.js', '--force'];
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-905-'));
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const Installer = require('../../install/install');
      const installer = new Installer();
      installer.targetDir = tempDir;
      installer.options.force = true;
      installer.installFramework();
      installer.installConfig('azure');
      installer.currentConfig = installer.generateConfig('azure');
      await installer.installPlugins();
      const dir = path.join(tempDir, '.claude', 'commands');
      expect(fs.existsSync(path.join(dir, 'azure:help.md'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'pm:help.md'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'help.md'))).toBe(false);
    } finally {
      log.mockRestore();
      process.argv = originalArgv;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
