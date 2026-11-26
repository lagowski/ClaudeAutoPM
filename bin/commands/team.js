#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const MCPHandler = require('../../scripts/mcp-handler.js');

// Paths
const projectRoot = process.cwd();
const teamsConfigPath = path.join(projectRoot, '.claude', 'teams.json');
const activeTeamPath = path.join(projectRoot, '.claude', 'active_team.txt');
const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
const claudeTemplatePath = path.join(projectRoot, '.claude', 'templates', 'claude-templates', 'base.md');

// Helper function to resolve all agents for a team (including inherited)
function resolveAgents(teamName, teamsConfig, resolved = new Set()) {
  const team = teamsConfig[teamName];
  if (!team) {
    throw new Error(`Team '${teamName}' not found in configuration`);
  }

  const agents = new Set();

  // Add inherited agents first (so they can be overridden)
  if (team.inherits && Array.isArray(team.inherits)) {
    team.inherits.forEach(parent => {
      if (!resolved.has(parent)) {
        resolved.add(parent);
        // Check if parent team exists
        if (!teamsConfig[parent]) {
          throw new Error(`Team '${teamName}' inherits from non-existent team '${parent}'`);
        }
        resolveAgents(parent, teamsConfig, resolved).forEach(a => agents.add(a));
      }
    });
  }

  // Add direct agents
  if (team.agents && Array.isArray(team.agents)) {
    team.agents.forEach(a => agents.add(a));
  }

  return Array.from(agents);
}

// Helper function to validate that agent files exist
function validateAgentFiles(agents, projectRoot) {
  const missingAgents = [];
  const agentsDir = path.join(projectRoot, '.claude', 'agents');

  // Check if agents directory exists
  if (!fs.existsSync(agentsDir)) {
    // If in framework development, check autopm directory
    const autopmAgentsDir = path.join(projectRoot, 'autopm', '.claude', 'agents');
    if (!fs.existsSync(autopmAgentsDir)) {
      console.warn('⚠️  Warning: Agents directory not found');
      return missingAgents; // Return empty array to continue
    }
  }

  agents.forEach(agent => {
    const agentPath = path.join(agentsDir, agent);
    const autopmAgentPath = path.join(projectRoot, 'autopm', '.claude', 'agents', agent);

    if (!fs.existsSync(agentPath) && !fs.existsSync(autopmAgentPath)) {
      missingAgents.push(agent);
    }
  });

  return missingAgents;
}

// Helper function to validate MCP dependencies for agents
function validateAgentMCPDependencies(agents, projectRoot) {
  const warnings = [];

  try {
    const mcpHandler = new MCPHandler();
    const config = mcpHandler.loadConfig();
    const activeServers = config.mcp?.activeServers || [];

    // Track all required MCP servers across all agents
    const requiredServers = new Map(); // server -> [agents that need it]

    agents.forEach(agentPath => {
      // Extract agent name from path
      // Handle both "core/test-runner.md" and "test-runner.md" formats
      let agentName = agentPath;
      if (agentName.endsWith('.md')) {
        agentName = agentName.slice(0, -3); // Remove .md extension
      }
      // Get just the filename without directory
      agentName = path.basename(agentName);

      // Get MCP dependencies for this agent
      const agentMCP = mcpHandler.getAgentMCP(agentName);

      if (agentMCP.found && agentMCP.mcpServers.length > 0) {
        agentMCP.mcpServers.forEach(serverName => {
          if (!requiredServers.has(serverName)) {
            requiredServers.set(serverName, []);
          }
          requiredServers.get(serverName).push(agentName);
        });
      }
    });

    // Check which required servers are missing or inactive
    requiredServers.forEach((agentNames, serverName) => {
      const isActive = activeServers.includes(serverName);
      const serverExists = mcpHandler.getServer(serverName);

      if (!serverExists) {
        warnings.push({
          type: 'not_installed',
          server: serverName,
          agents: agentNames
        });
      } else if (!isActive) {
        warnings.push({
          type: 'not_active',
          server: serverName,
          agents: agentNames
        });
      }
    });

  } catch (error) {
    // If MCP validation fails, just warn but don't block
    console.warn('⚠️  Warning: Could not validate MCP dependencies');
  }

  return warnings;
}

// Helper function to generate agent include list in Markdown format
function generateAgentIncludes(agents) {
  return agents
    .sort()
    .map(agent => `- @.claude/agents/${agent}`)
    .join('\n');
}

// Helper function to update CLAUDE.md with new agent list
function updateClaudeMd(agents) {
  let template = '';

  // Try to read existing CLAUDE.md first, then template
  if (fs.existsSync(claudeMdPath)) {
    template = fs.readFileSync(claudeMdPath, 'utf8');
  } else if (fs.existsSync(claudeTemplatePath)) {
    template = fs.readFileSync(claudeTemplatePath, 'utf8');
  } else {
    // Create a basic template if neither exists
    template = `# ClaudeAutoPM Configuration

This project is configured with ClaudeAutoPM for autonomous project management.

## Active Team Agents

<!-- AGENTS_START -->
<!-- AGENTS_END -->

## Configuration
- Execution Strategy: adaptive
- Docker Support: Enabled

## Available Commands
- \`pm validate\` - Validate project configuration
- \`pm optimize\` - Analyze optimization opportunities
- \`pm release\` - Prepare and execute releases

## Documentation
See: https://github.com/rafeekpro/ClaudeAutoPM
`;
  }

  // Replace agent section between markers
  const agentIncludes = generateAgentIncludes(agents);
  const agentSection = `<!-- AGENTS_START -->\n${agentIncludes}\n<!-- AGENTS_END -->`;

  let updatedContent;
  if (template.includes('<!-- AGENTS_START -->') && template.includes('<!-- AGENTS_END -->')) {
    // Replace existing section
    updatedContent = template.replace(
      /<!-- AGENTS_START -->[\s\S]*?<!-- AGENTS_END -->/,
      agentSection
    );
  } else {
    // Insert section after first heading or at the beginning
    const lines = template.split('\n');
    const firstHeadingIndex = lines.findIndex(line => line.startsWith('#'));
    if (firstHeadingIndex !== -1) {
      lines.splice(firstHeadingIndex + 2, 0, '\n## Active Team Agents\n\n' + agentSection + '\n');
      updatedContent = lines.join('\n');
    } else {
      updatedContent = agentSection + '\n\n' + template;
    }
  }

  fs.writeFileSync(claudeMdPath, updatedContent);
}

// Command handlers
const commands = {
  list: async (argv) => {
    try {
      if (!fs.existsSync(teamsConfigPath)) {
        console.error('❌ Error: teams.json not found');
        process.exit(1);
      }

      const teamsConfig = JSON.parse(fs.readFileSync(teamsConfigPath, 'utf8'));

      console.log('\n📋 Available Teams:\n');

      // Initialize PluginManager if verbose mode
      let pluginManager = null;
      if (argv.verbose) {
        const PluginManager = require('../../lib/plugins/PluginManager');
        pluginManager = new PluginManager();
      }

      for (const [name, config] of Object.entries(teamsConfig)) {
        // Resolve total agents (including inherited)
        let totalAgents = 0;
        let installedAgents = 0;
        let missingAgents = [];

        try {
          const agents = resolveAgents(name, teamsConfig);
          totalAgents = agents.length;

          // Check installation status
          const missing = validateAgentFiles(agents, projectRoot);
          installedAgents = totalAgents - missing.length;
          missingAgents = missing;
        } catch (error) {
          // Ignore errors in agent resolution for listing
        }

        // Status indicator
        const statusIcon = missingAgents.length === 0 ? '✅' : '⚠️';

        console.log(`  ${statusIcon} ${name}:`);
        console.log(`    ${config.description || 'No description'}`);

        if (config.inherits && config.inherits.length > 0) {
          console.log(`    ↳ Inherits from: ${config.inherits.join(', ')}`);
        }

        console.log(`    Agents: ${totalAgents} total (${installedAgents} installed, ${missingAgents.length} missing)`);

        // Verbose mode: show which agents are missing
        if (argv.verbose && missingAgents.length > 0) {
          console.log(`    Missing agents:`);

          if (pluginManager) {
            const pluginMapping = await pluginManager.findPluginsForAgents(missingAgents);

            // Group by plugin
            const byPlugin = new Map();
            for (const [agentName, pluginInfo] of pluginMapping.found.entries()) {
              if (!pluginInfo.installed) {
                if (!byPlugin.has(pluginInfo.pluginName)) {
                  byPlugin.set(pluginInfo.pluginName, []);
                }
                byPlugin.get(pluginInfo.pluginName).push(agentName);
              }
            }

            // Show plugins needed
            if (byPlugin.size > 0) {
              console.log(`    Install plugins:`);
              for (const [pluginName, agents] of byPlugin.entries()) {
                console.log(`      • ${pluginName} (${agents.length} agents)`);
              }
            }

            // Show truly missing
            if (pluginMapping.missing.length > 0) {
              console.log(`    Custom/core agents: ${pluginMapping.missing.length}`);
            }
          } else {
            // Non-verbose: just count
            missingAgents.slice(0, 3).forEach(agent => {
              console.log(`      • ${agent}`);
            });
            if (missingAgents.length > 3) {
              console.log(`      ... and ${missingAgents.length - 3} more`);
            }
          }
        }

        console.log();
      }

      // Show usage tip at the end
      console.log('💡 Tip: Use "autopm team load <name>" to activate a team');
      console.log('💡 Tip: Add --verbose to see missing agent details');
      console.log();

    } catch (error) {
      console.error(`❌ Error listing teams: ${error.message}`);
      if (argv.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  },

  current: (argv) => {
    try {
      if (!fs.existsSync(activeTeamPath)) {
        console.log('⚠️  No team currently active');
        return;
      }

      const activeTeam = fs.readFileSync(activeTeamPath, 'utf8').trim();
      console.log(`✅ Current active team: ${activeTeam}`);
    } catch (error) {
      console.error(`❌ Error getting current team: ${error.message}`);
      process.exit(1);
    }
  },

  load: async (argv) => {
    try {
      const teamName = argv.name;

      if (!fs.existsSync(teamsConfigPath)) {
        console.error('❌ Error: teams.json not found');
        process.exit(1);
      }

      const teamsConfig = JSON.parse(fs.readFileSync(teamsConfigPath, 'utf8'));

      if (!teamsConfig[teamName]) {
        console.error(`❌ Error: Team '${teamName}' not found`);
        process.exit(1);
      }

      // Resolve all agents including inherited ones
      let agents;
      try {
        agents = resolveAgents(teamName, teamsConfig);
      } catch (error) {
        console.error(`❌ Error resolving team: ${error.message}`);
        process.exit(1);
      }

      console.log(`🔄 Loading team '${teamName}'...`);
      console.log(`   Resolved ${agents.length} agents (including inherited)`);

      // Validate that agent files exist
      const missingAgents = validateAgentFiles(agents, projectRoot);

      if (missingAgents.length > 0) {
        console.log(`\n🔍 Checking for missing agents in plugins...`);

        // Use PluginManager to find which plugins contain the missing agents
        const PluginManager = require('../../lib/plugins/PluginManager');
        const pluginManager = new PluginManager();

        const pluginMapping = await pluginManager.findPluginsForAgents(missingAgents);

        // Separate agents into: can install from plugins vs truly missing
        const installablePlugins = [];
        const trulyMissing = [];

        for (const [, pluginInfo] of pluginMapping.found.entries()) {
          if (!pluginInfo.installed) {
            installablePlugins.push(pluginInfo);
          }
        }

        trulyMissing.push(...pluginMapping.missing);

        if (installablePlugins.length > 0) {
          console.log('\n📦 Missing agents can be installed from plugins:\n');

          // Group by plugin
          const byPlugin = new Map();
          for (const pluginInfo of installablePlugins) {
            if (!byPlugin.has(pluginInfo.pluginName)) {
              byPlugin.set(pluginInfo.pluginName, {
                displayName: pluginInfo.displayName,
                agents: []
              });
            }
            byPlugin.get(pluginInfo.pluginName).agents.push(pluginInfo.agent.name);
          }

          for (const [pluginName, info] of byPlugin.entries()) {
            console.log(`  ${info.displayName} (@claudeautopm/${pluginName}):`);
            info.agents.forEach(agent => console.log(`    • ${agent}`));
          }

          // Offer to install
          if (argv.autoInstall || argv.yes) {
            console.log('\n🚀 Auto-installing required plugins...\n');

            for (const [pluginName] of byPlugin.entries()) {
              try {
                console.log(`Installing ${pluginName}...`);
                await pluginManager.installPlugin(`${pluginManager.options.scopePrefix}/${pluginName}`);
                console.log(`✓ Installed ${pluginName}\n`);
              } catch (error) {
                console.error(`❌ Failed to install ${pluginName}: ${error.message}`);
              }
            }
          } else {
            console.log('\n💡 To install these plugins, run:');
            for (const [pluginName] of byPlugin.entries()) {
              console.log(`   autopm plugin install ${pluginName}`);
            }
            console.log('\n💡 Or run with --auto-install flag:');
            console.log(`   autopm team load ${teamName} --auto-install\n`);
          }
        }

        if (trulyMissing.length > 0) {
          console.warn(`\n⚠️  Warning: The following agents were not found in any plugin:`);
          trulyMissing.forEach(agent => {
            console.warn(`   - ${agent}`);
          });
          console.warn('\n💡 These agents may be custom or from core. Check .claude/agents/ directory.\n');
        }
      }

      // Validate MCP dependencies
      const mcpWarnings = validateAgentMCPDependencies(agents, projectRoot);
      if (mcpWarnings.length > 0) {
        console.warn('\n⚠️  MCP Dependency Warnings:\n');

        mcpWarnings.forEach(warning => {
          if (warning.type === 'not_installed') {
            console.warn(`❌ MCP server '${warning.server}' is NOT INSTALLED`);
            console.warn(`   Required by: ${warning.agents.join(', ')}`);
            console.warn(`   Fix: autopm mcp install ${warning.server}`);
          } else if (warning.type === 'not_active') {
            console.warn(`⚪ MCP server '${warning.server}' is NOT ACTIVE`);
            console.warn(`   Required by: ${warning.agents.join(', ')}`);
            console.warn(`   Fix: autopm mcp enable ${warning.server}`);
          }
          console.warn('');
        });

        console.warn('💡 Tip: Run "autopm mcp list" to see all MCP servers');
        console.warn('💡 Tip: Run "autopm mcp setup" for interactive configuration\n');
      }

      // Update CLAUDE.md with the new agent list
      updateClaudeMd(agents);
      console.log('✓ Updated CLAUDE.md with team agents');

      // Save active team
      fs.writeFileSync(activeTeamPath, teamName);
      console.log(`✓ Team '${teamName}' activated successfully`);

      // Show loaded agents
      console.log('\n📦 Loaded agents:');
      agents.slice(0, 5).forEach(agent => {
        console.log(`  - ${agent}`);
      });
      if (agents.length > 5) {
        console.log(`  ... and ${agents.length - 5} more`);
      }
    } catch (error) {
      console.error(`❌ Error loading team: ${error.message}`);
      if (argv.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
};

// Export for use with yargs and testing
module.exports = {
  command: 'team <action> [name]',
  describe: 'Manage agent teams',
  builder: (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        type: 'string',
        choices: ['list', 'load', 'current']
      })
      .positional('name', {
        describe: 'Team name (for load action)',
        type: 'string'
      })
      .option('auto-install', {
        describe: 'Automatically install missing plugins when loading team',
        type: 'boolean',
        default: false,
        alias: 'y'
      })
      .option('debug', {
        describe: 'Show debug information',
        type: 'boolean',
        default: false
      })
      .option('verbose', {
        describe: 'Show detailed information (for list command)',
        type: 'boolean',
        default: false
      })
      .example('autopm team list', 'List all available teams')
      .example('autopm team list --verbose', 'List teams with missing agent details')
      .example('autopm team load frontend', 'Load frontend team')
      .example('autopm team load frontend --auto-install', 'Load and auto-install missing plugins')
      .example('autopm team load fullstack -y', 'Load fullstack with auto-install (shorthand)')
      .check((argv) => {
        if (argv.action === 'load' && !argv.name) {
          throw new Error('Team name is required for load action');
        }
        return true;
      });
  },
  handler: (argv) => {
    const action = argv.action;

    if (commands[action]) {
      commands[action](argv);
    } else {
      console.error(`❌ Unknown action: ${action}`);
      process.exit(1);
    }
  },
  // Export utility functions for testing
  resolveAgents,
  validateAgentFiles,
  generateAgentIncludes
};

// If run directly (not imported)
if (require.main === module) {
  const argv = process.argv.slice(2);
  const action = argv[0];
  const name = argv[1];

  if (!action || !commands[action]) {
    console.log('Usage: team <list|current|load> [team-name]');
    process.exit(1);
  }

  commands[action]({ name });
}