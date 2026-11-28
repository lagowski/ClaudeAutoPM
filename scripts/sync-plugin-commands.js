#!/usr/bin/env node
/**
 * Sync command prompt files from plugin packages (source of truth) into the
 * installable payload at `autopm/` + `.claude/commands`.
 *
 * Scope: every "*.md" file anywhere under packages/<plugin>/commands/
 * (recursively — e.g. plugin-pm-azure keeps its files in commands/azure/)
 * that has a same-basename counterpart in the flat payload commands dir.
 * Plugin-only commands and payload-only commands are left alone.
 *
 * Plugins whose manifest sets a commands `namePrefix` store files without their namespace prefix
 * (`commands/issue-start.md`; Claude Code adds `/pm:` from the plugin name).
 * Their payload counterpart keeps the old name (`pm:issue-start.md`), issue #904.
 *
 * Usage:
 *   node scripts/sync-plugin-commands.js          # copy plugin -> payload
 *   node scripts/sync-plugin-commands.js --check  # exit 1 if any pair diverges
 *
 * Guarded by test/unit/plugin-command-sync.test.js (issue #609).
 * Note: scripts/sync-plugin-scripts.js (issue #610) does the same for
 * scripts; the two can be consolidated later.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAYLOAD_COMMANDS = path.join(ROOT, 'autopm', '.claude', 'commands');
const PACKAGES_DIR = path.join(ROOT, 'packages');

// The `namePrefix` of a plugin's auto-discovered commands entry
// (.claude-plugin/plugin.json metadata.commands), e.g. 'pm' for plugin-pm.
// PluginManager uses the same key when it installs the files (#904).
function namePrefix(pkg) {
  const manifest = path.join(PACKAGES_DIR, pkg, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) return null;
  const commands = (JSON.parse(fs.readFileSync(manifest, 'utf8')).metadata || {}).commands || [];
  const entry = commands.find((c) => c.namePrefix);
  return entry ? entry.namePrefix : null;
}

function collectMarkdownFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, result);
    } else if (entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  return result;
}

function pluginCommandFiles() {
  const result = [];
  for (const pkg of fs.readdirSync(PACKAGES_DIR)) {
    const commandsDir = path.join(PACKAGES_DIR, pkg, 'commands');
    if (!fs.existsSync(commandsDir) || !fs.statSync(commandsDir).isDirectory()) continue;
    const prefix = namePrefix(pkg);
    for (const file of collectMarkdownFiles(commandsDir)) {
      const base = path.basename(file);
      const name = prefix && !base.includes(':') ? `${prefix}:${base}` : base;
      result.push({ plugin: pkg, name, file });
    }
  }
  return result;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const owners = new Map();
  const diverged = [];
  let synced = 0;
  let identical = 0;

  for (const { plugin, name, file } of pluginCommandFiles()) {
    if (owners.has(name) && owners.get(name) !== plugin) {
      console.error(`ERROR: ${name} exists in both ${owners.get(name)} and ${plugin}`);
      process.exit(1);
    }
    owners.set(name, plugin);

    const payloadFile = path.join(PAYLOAD_COMMANDS, name);
    if (!fs.existsSync(payloadFile)) continue; // plugin-only command

    const pluginContent = fs.readFileSync(file);
    if (pluginContent.equals(fs.readFileSync(payloadFile))) {
      identical++;
      continue;
    }

    if (checkOnly) {
      diverged.push(`${name}  (packages/${plugin}/commands -> payload)`);
    } else {
      fs.writeFileSync(payloadFile, pluginContent);
      console.log(`synced: ${name}  (from packages/${plugin}/commands)`);
      synced++;
    }
  }

  if (checkOnly) {
    if (diverged.length > 0) {
      console.error('Diverged command copies (run "npm run sync:commands" after editing the plugin copy):');
      for (const d of diverged) console.error(`  ${d}`);
      process.exit(1);
    }
    console.log(`OK: ${identical} shared command files in sync.`);
  } else {
    console.log(`Done: ${synced} synced, ${identical} already in sync.`);
  }
}

if (require.main === module) main();

module.exports = { pluginCommandFiles };
