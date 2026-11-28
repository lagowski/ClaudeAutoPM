/**
 * Plugin Command for autopm CLI
 * Manages ClaudeAutoPM plugins
 *
 * Commands:
 * - list: List installed plugins
 * - search: Search for plugins by keyword
 * - install: Install a plugin
 * - uninstall: Remove a plugin
 * - info: Show plugin details
 * - enable: Enable a plugin
 * - disable: Disable a plugin
 */

const PluginManager = require('../../lib/plugins/PluginManager');
const chalk = require('chalk');

module.exports = {
  command: 'plugin <action> [name]',
  describe: 'Manage ClaudeAutoPM plugins',

  builder: (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Plugin action to perform',
        type: 'string',
        choices: ['list', 'search', 'install', 'uninstall', 'update', 'info', 'enable', 'disable']
      })
      .positional('name', {
        describe: 'Plugin name (without @claudeautopm/plugin- prefix)',
        type: 'string'
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Show detailed output',
        type: 'boolean',
        default: false
      })
      .example('autopm plugin list', 'List installed plugins')
      .example('autopm plugin search cloud', 'Search for cloud-related plugins')
      .example('autopm plugin install cloud', 'Install cloud plugin')
      .example('autopm plugin uninstall cloud', 'Remove cloud plugin')
      .example('autopm plugin update', 'Update all installed plugins')
      .example('autopm plugin update cloud devops', 'Update specific plugins')
      .example('autopm plugin info cloud', 'Show cloud plugin details')
      .epilogue(`
📦 Plugin Management

Plugins extend ClaudeAutoPM with specialized agents for different technologies.

Available Official Plugins:
  • cloud       - AWS, Azure, GCP cloud architecture (9 agents)
  • devops      - Docker, K8s, CI/CD, monitoring (8 agents)
  • frameworks  - React, Next.js, Vue, Django (7 agents)
  • databases   - PostgreSQL, MongoDB, Redis (6 agents)
  • languages   - Node.js, Python, TypeScript (6 agents)
  • data        - Data engineering, ML, ETL (3 agents)
  • decisions   - Architecture advisors (3 agents)

Installation:
  1. Install plugin package: npm install -g @claudeautopm/plugin-<name>
  2. Install plugin agents: autopm plugin install <name>

Usage:
  After installation, use 'autopm team load' to include plugin agents
  or reference agent files from CLAUDE.md (e.g. @.claude/agents/<category>/<agent>.md)
      `);
  },

  handler: async (argv) => {
    const manager = new PluginManager();

    try {
      switch (argv.action) {
        case 'list':
          await handleList(manager, argv);
          break;
        case 'search':
          if (!argv.name) {
            console.error(chalk.red('Error: Search keyword required'));
            console.log('Usage: autopm plugin search <keyword>');
            process.exit(1);
          }
          await handleSearch(manager, argv.name, argv);
          break;
        case 'install':
          if (!argv.name) {
            console.error(chalk.red('Error: Plugin name required'));
            console.log('Usage: autopm plugin install <name>');
            process.exit(1);
          }
          await handleInstall(manager, argv.name, argv);
          break;
        case 'uninstall':
          if (!argv.name) {
            console.error(chalk.red('Error: Plugin name required'));
            console.log('Usage: autopm plugin uninstall <name>');
            process.exit(1);
          }
          await handleUninstall(manager, argv.name, argv);
          break;
        case 'info':
          if (!argv.name) {
            console.error(chalk.red('Error: Plugin name required'));
            console.log('Usage: autopm plugin info <name>');
            process.exit(1);
          }
          await handleInfo(manager, argv.name, argv);
          break;
        case 'enable':
          if (!argv.name) {
            console.error(chalk.red('Error: Plugin name required'));
            console.log('Usage: autopm plugin enable <name>');
            process.exit(1);
          }
          await handleEnable(manager, argv.name, argv);
          break;
        case 'disable':
          if (!argv.name) {
            console.error(chalk.red('Error: Plugin name required'));
            console.log('Usage: autopm plugin disable <name>');
            process.exit(1);
          }
          await handleDisable(manager, argv.name, argv);
          break;
        case 'update': {
          // argv.name is optional - if not provided, update all
          // argv._ contains additional arguments after the command
          const pluginsToUpdate = argv.name ? [argv.name, ...(argv._.slice(3) || [])] : null;
          await handleUpdate(manager, pluginsToUpdate, argv);
          break;
        }
        default:
          console.error(chalk.red(`Unknown action: ${argv.action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (argv.verbose || argv.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
};

/**
 * Handle 'list' command
 */
async function handleList(manager, argv) {
  const installed = manager.getInstalledPlugins();
  const enabled = manager.getEnabledPlugins();

  console.log(chalk.bold('\n📦 Installed Plugins\n'));

  if (installed.length === 0) {
    console.log('No plugins installed.\n');
    console.log('💡 Tip: Run ' + chalk.cyan('autopm plugin search <keyword>') + ' to find plugins');
    console.log('   Or install directly: ' + chalk.cyan('autopm plugin install <name>'));
    return;
  }

  for (const pluginName of installed) {
    try {
      const metadata = await manager.loadPluginMetadata(pluginName);
      const isEnabled = enabled.includes(pluginName);
      const statusIcon = isEnabled ? chalk.green('✓') : chalk.gray('○');
      const statusText = isEnabled ? chalk.green('enabled') : chalk.gray('disabled');

      console.log(`${statusIcon} ${chalk.bold(metadata.displayName)} ${chalk.gray(`(@claudeautopm/${pluginName})`)}`);
      console.log(`  ${metadata.description}`);
      console.log(`  ${chalk.gray(`Category: ${metadata.category} | Agents: ${metadata.agents.length} | Status: ${statusText}`)}`);

      if (argv.verbose) {
        console.log(`  ${chalk.gray(`Version: ${metadata.version}`)}`);
        console.log(`  ${chalk.gray(`Agents: ${metadata.agents.map(a => a.name).join(', ')}`)}`);
      }

      console.log('');
    } catch (error) {
      console.log(`${chalk.red('✗')} ${chalk.bold(pluginName)} ${chalk.red('(error loading)')}`);
      if (argv.verbose) {
        console.log(`  ${chalk.red(error.message)}`);
      }
      console.log('');
    }
  }

  console.log(chalk.gray(`Total: ${installed.length} installed, ${enabled.length} enabled`));
  console.log('');
}

/**
 * Handle 'search' command
 */
async function handleSearch(manager, keyword, argv) {
  console.log(chalk.bold(`\n🔍 Searching for: "${keyword}"\n`));

  const results = await manager.searchPlugins(keyword);

  if (results.length === 0) {
    console.log('No plugins found matching your search.\n');
    console.log('💡 Tip: Try different keywords or check available plugins:');
    console.log('   ' + chalk.cyan('autopm plugin list --all'));
    return;
  }

  for (const plugin of results) {
    const isInstalled = manager.isInstalled(plugin.pluginName);
    const installIcon = isInstalled ? chalk.green('✓ installed') : chalk.gray('not installed');

    console.log(`${chalk.bold(plugin.displayName)} ${chalk.gray(`(@claudeautopm/${plugin.pluginName})`)}`);
    console.log(`  ${plugin.description}`);
    console.log(`  ${chalk.gray(`Category: ${plugin.category} | Agents: ${plugin.agents.length} | ${installIcon}`)}`);

    if (argv.verbose && plugin.agents.length > 0) {
      console.log(`  ${chalk.gray(`Agents: ${plugin.agents.map(a => a.name).join(', ')}`)}`);
    }

    console.log('');
  }

  console.log(chalk.gray(`Found ${results.length} plugin(s)`));
  console.log('');
}

/**
 * Handle 'install' command
 */
async function handleInstall(manager, pluginName, argv) {
  // #846: the name ends up in an npm argument; allow only a plain package-name segment.
  if (!/^[a-z0-9-]+$/.test(pluginName)) {
    console.error(chalk.red(`Error: Invalid plugin name: ${JSON.stringify(pluginName)}`));
    console.log('Plugin names may contain only lowercase letters, digits and hyphens.');
    process.exit(1);
  }

  const fullPluginName = pluginName.startsWith('plugin-') ? pluginName : `plugin-${pluginName}`;

  console.log(chalk.bold(`\n📦 Installing plugin: ${pluginName}\n`));

  // Check if already installed
  if (manager.isInstalled(fullPluginName)) {
    console.log(chalk.yellow(`⚠ Plugin ${pluginName} is already installed`));
    console.log('');
    console.log('To reinstall, first uninstall:');
    console.log(`  ${chalk.cyan(`autopm plugin uninstall ${pluginName}`)}`);
    return;
  }

  // Check if npm package exists
  const { execFileSync } = require('child_process');
  let packageInstalled = false;

  try {
    execFileSync('npm', ['list', '-g', `@claudeautopm/${fullPluginName}`], { stdio: 'ignore' });
    packageInstalled = true;
  } catch {
    // Package not installed
  }

  // Install npm package if needed
  if (!packageInstalled) {
    console.log(chalk.gray('Installing npm package...'));
    try {
      execFileSync('npm', ['install', '-g', `@claudeautopm/${fullPluginName}`], { stdio: 'inherit' });
      console.log('');
    } catch (error) {
      console.error(chalk.red(`\n✗ Failed to install npm package: @claudeautopm/${fullPluginName}`));
      console.error(chalk.gray('Make sure the package exists on npm'));
      process.exit(1);
    }
  } else {
    console.log(chalk.gray(`npm package already installed: @claudeautopm/${fullPluginName}`));
  }

  // Discover and install plugin resources
  console.log(chalk.gray('Discovering plugins...'));
  await manager.initialize();
  console.log(chalk.gray('Installing plugin resources...'));
  const result = await manager.installPlugin(fullPluginName);

  console.log(chalk.green(`\n✓ Plugin installed successfully!`));
  console.log('');
  console.log(`  ${chalk.bold(result.displayName)}`);
  console.log(`  Category: ${result.category}`);
  console.log(`  Agents installed: ${result.agentsInstalled}`);

  if (argv.verbose) {
    console.log('');
    console.log('  Installed agents:');
    for (const agent of result.agents) {
      console.log(`    • ${agent.name}`);
    }
  }

  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. Load agents: ${chalk.cyan('autopm team load <team>')}`);
  console.log(`  2. Or manually add to CLAUDE.md:`);
  console.log(`     ${chalk.gray(`@.claude/agents/${result.category}/<agent>.md`)}`);
  console.log('');
}

/**
 * Handle 'uninstall' command
 */
async function handleUninstall(manager, pluginName, argv) {
  const fullPluginName = pluginName.startsWith('plugin-') ? pluginName : `plugin-${pluginName}`;

  console.log(chalk.bold(`\n📦 Uninstalling plugin: ${pluginName}\n`));

  // Check if installed
  if (!manager.isInstalled(fullPluginName)) {
    console.log(chalk.yellow(`⚠ Plugin ${pluginName} is not installed`));
    return;
  }

  // Uninstall plugin agents
  const result = await manager.uninstallPlugin(fullPluginName);

  console.log(chalk.green(`✓ Plugin uninstalled successfully!`));
  console.log('');
  console.log(`  Agents removed: ${result.agentsRemoved}`);

  if (argv.verbose && result.agents.length > 0) {
    console.log('');
    console.log('  Removed agents:');
    for (const agentName of result.agents) {
      console.log(`    • ${agentName}`);
    }
  }

  console.log('');
  console.log(chalk.gray('Note: npm package not removed. To remove completely:'));
  console.log(`  ${chalk.cyan(`npm uninstall -g @claudeautopm/${fullPluginName}`)}`);
  console.log('');
}

/**
 * Handle 'info' command
 */
async function handleInfo(manager, pluginName, argv) {
  const fullPluginName = pluginName.startsWith('plugin-') ? pluginName : `plugin-${pluginName}`;

  try {
    const info = await manager.getPluginInfo(fullPluginName);

    console.log(chalk.bold(`\n📦 ${info.displayName}\n`));
    console.log(`${info.description}\n`);

    console.log(chalk.bold('Details:'));
    console.log(`  Package: ${chalk.cyan(`@claudeautopm/${fullPluginName}`)}`);
    console.log(`  Version: ${info.version}`);
    console.log(`  Category: ${info.category}`);
    console.log(`  Status: ${info.installed ? chalk.green('installed') : chalk.gray('not installed')}`);
    if (info.installed) {
      console.log(`  Enabled: ${info.enabled ? chalk.green('yes') : chalk.gray('no')}`);
    }

    console.log('');
    console.log(chalk.bold(`Agents (${info.agents.length}):`));
    for (const agent of info.agents) {
      console.log(`  • ${chalk.bold(agent.name)}`);
      console.log(`    ${chalk.gray(agent.description)}`);
      if (argv.verbose) {
        console.log(`    ${chalk.gray(`File: ${agent.file}`)}`);
      }
    }

    if (info.keywords && info.keywords.length > 0) {
      console.log('');
      console.log(`Keywords: ${chalk.gray(info.keywords.join(', '))}`);
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n✗ Plugin not found: ${pluginName}`));
    console.error(chalk.gray(`Package @claudeautopm/${fullPluginName} not installed`));
    console.log('');
    console.log('To install:');
    console.log(`  ${chalk.cyan(`autopm plugin install ${pluginName}`)}`);
    console.log('');
    process.exit(1);
  }
}

/**
 * Handle 'enable' command
 */
async function handleEnable(manager, pluginName, argv) {
  const fullPluginName = pluginName.startsWith('plugin-') ? pluginName : `plugin-${pluginName}`;

  try {
    manager.enablePlugin(fullPluginName);
    console.log(chalk.green(`\n✓ Plugin enabled: ${pluginName}\n`));
  } catch (error) {
    console.error(chalk.red(`\n✗ ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Handle 'disable' command
 */
async function handleDisable(manager, pluginName, argv) {
  const fullPluginName = pluginName.startsWith('plugin-') ? pluginName : `plugin-${pluginName}`;

  manager.disablePlugin(fullPluginName);
  console.log(chalk.yellow(`\n⚠ Plugin disabled: ${pluginName}\n`));
  console.log(chalk.gray('Note: Agents remain in .claude/agents/ but plugin is marked as disabled'));
  console.log('');
}

/**
 * Handle 'update' command
 */
async function handleUpdate(manager, pluginNames, argv) {
  console.log(chalk.bold('\n🔄 Updating Plugins\n'));

  // Get list of installed plugins
  const installed = manager.getInstalledPlugins();

  if (installed.length === 0) {
    console.log(chalk.yellow('No plugins installed to update.'));
    console.log('');
    return;
  }

  // Determine which plugins to update
  let toUpdate = [];
  if (pluginNames && pluginNames.length > 0) {
    // Update specific plugins
    for (const name of pluginNames) {
      const fullName = name.startsWith('plugin-') ? name : `plugin-${name}`;
      if (!installed.includes(fullName)) {
        console.log(chalk.yellow(`⚠ Plugin ${name} is not installed, skipping`));
      } else {
        toUpdate.push(fullName);
      }
    }
  } else {
    // Update all installed plugins
    toUpdate = installed;
    console.log(chalk.gray(`Updating all ${installed.length} installed plugin(s)...\n`));
  }

  if (toUpdate.length === 0) {
    console.log(chalk.yellow('No plugins to update.'));
    console.log('');
    return;
  }

  const results = {
    updated: [],
    failed: [],
    skipped: [],
    upToDate: []
  };

  // Update each plugin
  for (const pluginName of toUpdate) {
    const shortName = pluginName.replace('plugin-', '');

    try {
      console.log(chalk.bold(`\n📦 Updating ${shortName}...`));

      const result = await manager.updatePlugin(pluginName, {
        verbose: argv.verbose,
        force: argv.force
      });

      if (result.updated) {
        results.updated.push({
          name: shortName,
          oldVersion: result.oldVersion,
          newVersion: result.newVersion,
          stats: result.stats
        });
        console.log(chalk.green(`✅ Updated ${shortName} (${result.oldVersion} → ${result.newVersion})`));

        if (argv.verbose && result.stats) {
          console.log(chalk.gray(`   Agents: ${result.stats.agents || 0}, Commands: ${result.stats.commands || 0}, Rules: ${result.stats.rules || 0}`));
        }
      } else if (result.upToDate) {
        results.upToDate.push(shortName);
        console.log(chalk.gray(`✓ ${shortName} is already up to date (${result.currentVersion})`));
      } else {
        results.skipped.push(shortName);
        console.log(chalk.yellow(`⚠ Skipped ${shortName}: ${result.reason || 'Unknown reason'}`));
      }
    } catch (error) {
      results.failed.push({ name: shortName, error: error.message });
      console.log(chalk.red(`✗ Failed to update ${shortName}: ${error.message}`));

      if (argv.verbose) {
        console.error(chalk.red(error.stack));
      }
    }
  }

  // Summary
  console.log(chalk.bold('\n📊 Update Summary\n'));
  console.log(`${chalk.green('✅ Updated:')} ${results.updated.length}`);
  console.log(`${chalk.gray('✓ Up to date:')} ${results.upToDate.length}`);
  console.log(`${chalk.yellow('⚠ Skipped:')} ${results.skipped.length}`);
  console.log(`${chalk.red('✗ Failed:')} ${results.failed.length}`);
  console.log('');

  if (results.updated.length > 0) {
    console.log(chalk.bold('Updated Plugins:'));
    for (const plugin of results.updated) {
      console.log(`  • ${plugin.name} (${plugin.oldVersion} → ${plugin.newVersion})`);
    }
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log(chalk.bold(chalk.red('Failed Updates:')));
    for (const plugin of results.failed) {
      console.log(chalk.red(`  • ${plugin.name}: ${plugin.error}`));
    }
    console.log('');
  }

  // Exit with error if any updates failed
  if (results.failed.length > 0) {
    process.exit(1);
  }
}
