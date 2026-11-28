/**
 * Duplication guard: plugin packages are the source of truth for command
 * prompts that also ship in the installable payload (autopm/.claude/commands).
 *
 * Any command file that exists under BOTH packages/plugin-X/commands/ and
 * autopm/.claude/commands/ (same basename) must be byte-identical.
 *
 * If this test fails, do NOT hand-edit both copies. Edit the plugin copy and
 * run: npm run sync:commands
 *
 * See scripts/sync-plugin-commands.js (issue #609).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAYLOAD_COMMANDS = path.join(ROOT, 'autopm', '.claude', 'commands');

// Recursive, and maps namespaced plugins' stripped files (plugin-pm's
// issue-start.md) to their payload name (pm:issue-start.md), issue #904.
const { pluginCommandFiles } = require('../../scripts/sync-plugin-commands');

describe('plugin/payload command sync (issue #609)', () => {
  const pluginFiles = pluginCommandFiles();

  test('finds plugin command files', () => {
    expect(pluginFiles.length).toBeGreaterThan(0);
  });

  test('no command basename is owned by two different plugins', () => {
    const seen = new Map();
    const conflicts = [];
    for (const { plugin, name } of pluginFiles) {
      if (seen.has(name) && seen.get(name) !== plugin) {
        conflicts.push(`${name} (in ${seen.get(name)} and ${plugin})`);
      }
      seen.set(name, plugin);
    }
    expect(conflicts).toEqual([]);
  });

  test('every payload command that also exists in a plugin is byte-identical', () => {
    const diverged = [];
    for (const { plugin, name, file } of pluginFiles) {
      const payloadFile = path.join(PAYLOAD_COMMANDS, name);
      if (!fs.existsSync(payloadFile)) continue; // plugin-only command
      const pluginContent = fs.readFileSync(file);
      const payloadContent = fs.readFileSync(payloadFile);
      if (!pluginContent.equals(payloadContent)) {
        diverged.push(`${name} (plugin: packages/${plugin}/commands, payload: autopm/.claude/commands)`);
      }
    }
    if (diverged.length > 0) {
      throw new Error(
        'Diverged command copies (edit the plugin copy, then run "npm run sync:commands"):\n  ' +
          diverged.join('\n  ')
      );
    }
  });
});
