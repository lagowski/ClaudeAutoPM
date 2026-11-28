#!/usr/bin/env node

/**
 * Plugin Manifest Generator
 *
 * Generates compressed plugin manifests for token-optimized CLAUDE.md
 * Reduces plugin metadata from thousands of tokens to ~50 tokens per plugin
 */

const fs = require('fs');
const path = require('path');
const PluginManager = require('../lib/plugins/PluginManager');

const CHARS_PER_TOKEN = 4;

function estimateTokens(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return Math.ceil(normalized.length / CHARS_PER_TOKEN);
}

/**
 * Generate compressed manifest for a single plugin
 */
function generatePluginManifest(pluginData, pluginId) {
  const agentNames = (pluginData.agents || []).map(a => a.name).join('|');
  const commandNames = (pluginData.commands || []).map(c => c.name).join('|');
  const ruleCount = (pluginData.rules || []).length;

  const manifest = `<plugin id="${pluginId}">
  agents: ${agentNames || 'None'}
  commands: ${commandNames || 'None'}
  rules: ${ruleCount} files (on-demand)
  📖 .claude/plugins/${pluginId}/
</plugin>`;

  return {
    manifest,
    tokens: estimateTokens(manifest),
    stats: {
      agents: pluginData.agents?.length || 0,
      commands: pluginData.commands?.length || 0,
      rules: ruleCount
    }
  };
}

/**
 * Generate complete plugins section for CLAUDE.md
 */
function generatePluginsSection(installedPlugins, packagesDir) {
  const manifests = [];
  const pluginList = [];
  let totalTokens = 0;
  let totalFiles = 0;

  installedPlugins.forEach(pluginId => {
    const pluginDir = path.join(packagesDir, `plugin-${pluginId}`);
    const pluginPath = PluginManager.manifestPath(pluginDir) || path.join(pluginDir, '.claude-plugin', 'plugin.json');

    if (!fs.existsSync(pluginPath)) {
      console.warn(`⚠️  Plugin ${pluginId} not found at ${pluginPath}`);
      return;
    }

    try {
      const pluginData = PluginManager.readManifest(pluginDir);
      const result = generatePluginManifest(pluginData, pluginId);

      manifests.push(result.manifest);
      pluginList.push(pluginId);
      totalTokens += result.tokens;
      totalFiles += result.stats.agents + result.stats.commands + result.stats.rules;

      console.log(`✅ ${pluginId}: ${result.tokens} tokens (${result.stats.agents} agents, ${result.stats.commands} commands, ${result.stats.rules} rules)`);
    } catch (error) {
      console.error(`❌ Error processing ${pluginId}:`, error.message);
    }
  });

  const pluginsSection = `<plugins>
<installed>${pluginList.join('|')}</installed>

<manifest>
${manifests.join('\n\n')}
</manifest>

<lazy_loading>
<enabled>true</enabled>
<triggers>
  commands: "/[plugin-id]:[command-name]"
  agents: "@[agent-name]" (from plugin)
  rules: on-violation or explicit reference
</triggers>
</lazy_loading>

<usage>
Commands: Type /[plugin-id]:[command] to invoke
Agents: Type @[agent-name] to invoke
Rules: Automatically loaded when needed
Files: All available in .claude/plugins/[plugin-id]/
</usage>
</plugins>`;

  return {
    section: pluginsSection,
    tokens: estimateTokens(pluginsSection),
    totalFiles,
    pluginCount: pluginList.length
  };
}

/**
 * Calculate token savings
 */
function calculateSavings(optimizedTokens, totalFiles) {
  // Estimate: average 600 tokens per agent, 300 per command, 1500 per rule
  const estimatedOldTokens = totalFiles * 800; // Conservative average
  const savings = estimatedOldTokens - optimizedTokens;
  const percent = ((savings / estimatedOldTokens) * 100).toFixed(1);

  return {
    old: estimatedOldTokens,
    new: optimizedTokens,
    saved: savings,
    percent
  };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node plugin-manifest-generator.js <packages-dir> <plugin1,plugin2,...>');
    console.log('Example: node plugin-manifest-generator.js ./packages core,pm,cloud');
    process.exit(1);
  }

  const packagesDir = path.resolve(args[0]);
  const pluginIds = args[1].split(',').map(p => p.trim());

  console.log('\n🔧 Plugin Manifest Generator');
  console.log('='.repeat(70));
  console.log(`Packages directory: ${packagesDir}`);
  console.log(`Plugins to process: ${pluginIds.join(', ')}`);
  console.log('');

  const result = generatePluginsSection(pluginIds, packagesDir);

  console.log('\n' + '='.repeat(70));
  console.log('📊 Generation Complete');
  console.log('='.repeat(70));
  console.log(`Plugins processed: ${result.pluginCount}`);
  console.log(`Total files: ${result.totalFiles}`);
  console.log(`Manifest tokens: ${result.tokens}`);

  const savings = calculateSavings(result.tokens, result.totalFiles);
  console.log(`\n💰 Token Savings:`);
  console.log(`  Old system (est): ${savings.old.toLocaleString()} tokens`);
  console.log(`  New manifest: ${savings.new.toLocaleString()} tokens`);
  console.log(`  Savings: ${savings.saved.toLocaleString()} tokens (${savings.percent}%)`);

  console.log('\n📄 Generated Manifest:');
  console.log('='.repeat(70));
  console.log(result.section);
  console.log('='.repeat(70));

  return result;
}

// Export for use in other scripts
module.exports = {
  generatePluginManifest,
  generatePluginsSection,
  calculateSavings,
  estimateTokens
};

// Run if called directly
if (require.main === module) {
  main();
}
