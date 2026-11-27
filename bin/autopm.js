#!/usr/bin/env node

/**
 * ClaudeAutoPM CLI - Refactored with yargs
 * This is the main CLI entry point using yargs for command management
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');

// Get package info for version
const packageJson = require('../package.json');
const VERSION = packageJson.version;

// Main CLI function
function main() {
  const cli = yargs(hideBin(process.argv));

  cli
    // Main commands
    .command('install [preset]', 'Install ClaudeAutoPM framework in current project directory',
      (yargs) => {
        return yargs
          .positional('preset', {
            describe: 'Installation preset (1-5)',
            type: 'number'
          })
          .option('force', {
            describe: 'Force overwrite existing files',
            type: 'boolean',
            default: false
          })
          .option('scenario', {
            describe: 'Installation scenario (lite, github, azure, docker, full, performance)',
            type: 'string'
          });
      },
      (argv) => {
        // Delegate to install.js directly (not install.sh) to pass flags
        const { execFileSync } = require('child_process');
        const installJsPath = path.join(__dirname, '..', 'install', 'install.js');
        const args = [];
        if (argv.force) args.push('--force');
        if (argv.scenario) args.push(`--scenario=${argv.scenario}`);
        try {
          // Pass arguments as an array (no shell) to prevent command injection
          execFileSync('node', [installJsPath, ...args], {
            stdio: 'inherit',
            env: { ...process.env, AUTOPM_PRESET: argv.preset || '' }
          });
        } catch (error) {
          console.error('Installation failed:', error.message);
          process.exit(1);
        }
      }
    )
    .command('update', 'Update ClaudeAutoPM framework to latest version in current project',
      (yargs) => {
        return yargs
          .option('force', {
            describe: 'Force update even if project structure differs',
            type: 'boolean',
            default: false
          })
          .option('backup', {
            describe: 'Create backup before updating',
            type: 'boolean',
            default: true
          })
          .option('preserve-config', {
            describe: 'Preserve existing configuration files',
            type: 'boolean',
            default: true
          })
          .example('autopm update', 'Update to latest version')
          .example('autopm update --force', 'Force update ignoring conflicts')
          .example('autopm update --no-backup', 'Update without creating backup');
      },
      (argv) => {
        // Delegate to the update script
        const { execSync } = require('child_process');
        const updatePath = path.join(__dirname, '..', 'install', 'update.sh');
        try {
          const env = {
            ...process.env,
            AUTOPM_FORCE: argv.force ? '1' : '0',
            AUTOPM_BACKUP: argv.backup ? '1' : '0',
            AUTOPM_PRESERVE_CONFIG: argv.preserveConfig ? '1' : '0'
          };
          execSync(`bash ${updatePath}`, {
            stdio: 'inherit',
            env
          });
        } catch (error) {
          console.error('Update failed:', error.message);
          process.exit(1);
        }
      }
    )
    // Team management command
    .command(require('./commands/team'))
    // Config management command
    .command(require('./commands/config'))
    // MCP management command
    .command(require('./commands/mcp'))
    // Plugin management command
    .command(require('./commands/plugin'))
    // Epic management command (STANDALONE)
    .command(require('../lib/cli/commands/epic'))
    // Issue management command (STANDALONE)
    .command(require('../lib/cli/commands/issue'))
    // PM workflow commands (STANDALONE)
    .command(require('../lib/cli/commands/pm'))
    // PRD management command (STANDALONE)
    .command(require('../lib/cli/commands/prd'))
    // Task management command (STANDALONE)
    .command(require('../lib/cli/commands/task'))
    // Agent management command (STANDALONE)
    .command(require('../lib/cli/commands/agent'))
    // Context management command (STANDALONE)
    .command(require('../lib/cli/commands/context'))
    // Obsidian vault integration (STANDALONE)
    .command(require('../lib/cli/commands/obsidian'))
    // Validation command
    .command('validate', 'Validate ClaudeAutoPM configuration and setup',
      (yargs) => {
        return yargs
          .example('autopm validate', 'Check all configuration requirements')
          .example('autopm validate --verbose', 'Show detailed validation info');
      },
      async (argv) => {
        const PostInstallChecker = require('../install/post-install-check.js');
        const checker = new PostInstallChecker();

        try {
          await checker.runAllChecks();
          process.exit(0);
        } catch (error) {
          console.error(`❌ Validation error: ${error.message}`);
          if (argv.debug) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      }
    )
    // Global options
    .option('verbose', {
      type: 'boolean',
      description: 'Run with verbose logging'
    })
    .option('debug', {
      type: 'boolean',
      description: 'Run with debug output'
    })
    // Help and version
    .version(VERSION)
    .alias('version', 'v')
    .help()
    .alias('help', 'h')
    // Error handling and requirements
    .demandCommand(1, 'You must provide a command. Use --help to see available options.')
    .recommendCommands()
    .strictCommands()
    .wrap(cli.terminalWidth())
    // Enhanced help epilogue
    .epilogue(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    ClaudeAutoPM v${VERSION} - Quick Reference                    ║
║         AI-Powered Project Management for Claude Code                      ║
╚════════════════════════════════════════════════════════════════════════════╝

🚀 Quick Start (3 Steps):
   1. autopm install                    # Install framework in project
   2. autopm config set provider github # Configure your provider
   3. claude --dangerously-skip-permissions .  # Open Claude Code

🆕 NEW in v2.1.0 - STANDALONE Commands:
   autopm prd parse <name>              # Parse PRD without AI overhead
   autopm prd extract-epics <name>      # Extract epics from PRD
   autopm prd summarize <name>          # Generate PRD summary
   autopm prd validate <name>           # Validate PRD structure

   autopm task list <epic>              # List tasks from epic
   autopm task prioritize <epic>        # AI-powered prioritization

   autopm agent list                    # List available agents
   autopm agent search <keyword>        # Search agents
   autopm agent invoke <name> <task>    # Invoke agent directly

📋 Common Commands:
   autopm validate                      # Check configuration status
   autopm update                        # Update to latest version
   autopm team load fullstack           # Load development agents
   autopm mcp enable context7           # Enable documentation access
   autopm config show                   # View current configuration

🔧 Configuration Setup:
   # View current configuration
   autopm config show

   # Configure GitHub provider
   autopm config set provider github
   autopm config set github.owner <username>
   autopm config set github.repo <repository>

   # Add token to .claude/.env (recommended)
   echo "GITHUB_TOKEN=ghp_your_token_here" >> .claude/.env

   # Or export as environment variable
   export GITHUB_TOKEN=ghp_your_token_here

   # Configure Azure DevOps provider
   autopm config set provider azure
   autopm config set azure.organization <org>
   autopm config set azure.project <project>

   # Add token to .claude/.env (recommended)
   echo "AZURE_DEVOPS_PAT=your_azure_pat" >> .claude/.env

   # Or export as environment variable
   export AZURE_DEVOPS_PAT=your_azure_pat

   # Quick switch between providers
   autopm config switch github
   autopm config switch azure

   # Validate configuration
   autopm config validate

🔌 MCP (Model Context Protocol) Management:
   # List and manage MCP servers
   autopm mcp list                  # List all available MCP servers
   autopm mcp enable context7  # Enable documentation server
   autopm mcp sync                  # Sync configuration to .claude/mcp-servers.json

   # Agent Analysis
   autopm mcp agents                # List agents using MCP
   autopm mcp agent react-frontend-engineer  # Show MCP config for agent
   autopm mcp usage                 # Show MCP usage statistics
   autopm mcp tree                  # Show agent-MCP dependency tree

   # Configuration & Diagnostics
   autopm mcp setup                 # Interactive API key setup
   autopm mcp diagnose              # Run comprehensive diagnostics
   autopm mcp test context7    # Test MCP server connection
   autopm mcp status                # Show all MCP servers status

🔑 Token Setup:
   # RECOMMENDED: Store tokens in .claude/.env file
   echo "GITHUB_TOKEN=ghp_your_token" >> .claude/.env
   echo "AZURE_DEVOPS_PAT=your_pat" >> .claude/.env

   # The .env file is automatically loaded during validation
   autopm config validate

   # GitHub PAT (Settings → Developer settings → Personal access tokens)
   Scopes: repo, workflow, admin:repo_hook

   # Azure DevOps PAT (User settings → Personal access tokens)
   Scopes: Work Items (read/write), Code (read/write)

🤖 Team Management:
   autopm team list                 # See all available agent teams
   autopm team load <name>          # Load specific team (frontend/backend/fullstack/devops)
   autopm team current              # Check currently active team

📊 Epic Status (Read-Only Utilities):
   autopm epic list                 # List all available epics
   autopm epic status <name>        # Show epic progress and metrics
   autopm epic breakdown <name>     # Show detailed task breakdown

   💡 Note: To CREATE or MODIFY epics, use Claude Code /pm:* commands

💡 Claude Code PM Commands (AI-Powered):
   /pm:what-next                    # ⭐ Smart suggestions for what to do next
   /pm:status                       # Project overview and health
   /pm:prd-new <name>               # Create new PRD
   /pm:epic-decompose <name>        # Break PRD into tasks
   /pm:epic-sync <name>             # Sync to GitHub/Azure
   /pm:next                         # Get next priority task
   /pm:issue-start <id>             # Start working on task
   /pm:issue-close <id>             # Complete task
   /pm:standup                      # Generate daily summary

📋 Quick Workflow Examples:

   SIMPLE FEATURE (Use this for most tasks):
   1. /pm:prd-new user-login        # Create PRD
   2. /pm:epic-decompose user-login # Break into tasks
   3. /pm:epic-sync user-login      # Push to GitHub/Azure
   4. /pm:next                      # Start working

   COMPLEX PROJECT (Multiple epics):
   1. /pm:prd-new ecommerce         # Create PRD
   2. /pm:epic-split ecommerce      # Split into multiple epics
   3. /pm:epic-decompose ecommerce/01-backend  # Decompose each epic
   4. /pm:epic-sync ecommerce       # Sync all epics

🔍 Using STANDALONE Commands:

   # Parse PRD without AI (fast, deterministic)
   autopm prd parse my-feature

   # AI-powered parsing with streaming output
   autopm prd parse my-feature --ai --stream

   # Extract and validate
   autopm prd extract-epics my-feature
   autopm prd validate my-feature --fix

   # Task management
   autopm task list epic-001
   autopm task prioritize epic-001

   # Agent invocation
   autopm agent search kubernetes
   autopm agent invoke aws-architect "Design VPC" --stream

🛠️  Troubleshooting:
   autopm validate                  # Check installation & config
   autopm validate --fix            # Auto-fix common issues
   autopm mcp diagnose              # Check MCP server health
   autopm install --force           # Reinstall framework

📚 Resources & Help:
   📖 Documentation:  https://github.com/rafeekpro/ClaudeAutoPM
   🐛 Report Issues:  https://github.com/rafeekpro/ClaudeAutoPM/issues
   💬 Discussions:    https://github.com/rafeekpro/ClaudeAutoPM/discussions
   📦 npm Package:    https://www.npmjs.com/package/claude-autopm

💡 Pro Tips:
   • Use \`autopm --help\` to see this guide anytime
   • Run \`autopm validate\` after configuration changes
   • Use \`--stream\` flag for real-time AI responses
   • Check \`autopm mcp status\` to verify documentation access
   • Load appropriate team before starting work (frontend/backend/fullstack)

╔════════════════════════════════════════════════════════════════════════════╗
║  Need more help? Run: autopm <command> --help for detailed command docs   ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
    .fail((msg, err, yargs) => {
      if (err) {
        console.error('Error:', err.message);
        if (process.env.DEBUG) {
          console.error(err.stack);
        }
      } else {
        console.error(msg);
      }
      console.error('\nRun "autopm --help" for usage information');
      process.exit(1);
    })
    .argv;
}

// Run the CLI
try {
  main();
} catch (error) {
  console.error('Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}