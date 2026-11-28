/**
 * CLI Context Commands
 *
 * Provides context management commands for ClaudeAutoPM.
 * Implements subcommands for context lifecycle management.
 *
 * Commands:
 * - create <type>: Create new context from template
 * - prime: Generate comprehensive project snapshot
 * - update <type>: Update existing context
 * - show [type]: Show context or list all contexts
 *
 * @module cli/commands/context
 * @requires ../../services/ContextService
 * @requires node:fs/promises (via lib/utils/fs)
 * @requires ora
 * @requires chalk
 * @requires path
 */

const ContextService = require('../../services/ContextService');
const fs = require('../../utils/fs');
const ora = require('ora');
const chalk = require('chalk');
const logger = require('../logger');

/**
 * Context Create - Create new context file from template
 * @param {Object} argv - Command arguments
 */
async function contextCreate(argv) {
  const spinner = ora(`Creating ${argv.type} context...`).start();

  try {
    const contextService = new ContextService();

    // Prepare options
    const options = {
      name: argv.name || argv.type,
      description: argv.description || `${argv.type} context`,
      ...(argv.data && { data: argv.data })
    };

    const result = await contextService.createContext(argv.type, options);

    spinner.succeed(chalk.green('Context created'));

    logger.log(chalk.cyan('\n📄 Context Created Successfully\n'));
    logger.log(chalk.gray('='.repeat(60)) + '\n');

    logger.log(chalk.bold('Type:       ') + result.type);
    logger.log(chalk.bold('Path:       ') + result.path);
    logger.log(chalk.bold('Created:    ') + new Date(result.created).toLocaleString());

    logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

    logger.log(chalk.bold('💡 Next Steps:\n'));
    logger.log(`  ${chalk.cyan('1.')} View context:     ${chalk.yellow(`autopm context show ${argv.type}`)}`);
    logger.log(`  ${chalk.cyan('2.')} Update context:   ${chalk.yellow(`autopm context update ${argv.type}`)}`);
    logger.log(`  ${chalk.cyan('3.')} List all:         ${chalk.yellow('autopm context show --list')}\n`);

    logger.log(chalk.gray('='.repeat(60)) + '\n');

  } catch (error) {
    spinner.fail(chalk.red('Failed to create context'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}\n`));
      logger.error(chalk.yellow('Available context types:'));
      logger.error(chalk.gray('  • project-brief    - Project overview and goals'));
      logger.error(chalk.gray('  • progress         - Progress tracking'));
      logger.error(chalk.gray('  • tech-context     - Technical stack and architecture'));
      logger.error(chalk.gray('  • project-structure - Project organization\n'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Context Prime - Generate comprehensive project snapshot
 * @param {Object} argv - Command arguments
 */
async function contextPrime(argv) {
  const spinner = ora('Generating project snapshot...').start();

  try {
    const contextService = new ContextService();

    const options = {
      includeGit: argv.includeGit !== false,
      ...(argv.output && { output: argv.output })
    };

    const result = await contextService.primeContext(options);

    spinner.succeed(chalk.green('Project snapshot generated'));

    logger.log(chalk.cyan('\n📸 Project Snapshot Generated\n'));
    logger.log(chalk.gray('='.repeat(60)) + '\n');

    logger.log(chalk.bold('Timestamp:  ') + result.timestamp);
    logger.log(chalk.bold('Epics:      ') + result.contexts.epics.length);
    logger.log(chalk.bold('Issues:     ') + result.contexts.issues.length);
    logger.log(chalk.bold('PRDs:       ') + result.contexts.prds.length);

    if (result.git && !result.git.error) {
      logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
      logger.log(chalk.bold('Git Information:\n'));
      logger.log(`  Branch:  ${result.git.branch}`);
      logger.log(`  Commit:  ${result.git.commit.substring(0, 8)}`);
      logger.log(`  Status:  ${result.git.status || 'clean'}`);
    }

    logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

    logger.log(chalk.bold('📋 Summary:\n'));
    logger.log(result.summary.split('\n').map(line => `  ${line}`).join('\n'));

    if (argv.output) {
      logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
      logger.log(chalk.green(`✓ Snapshot saved to: ${argv.output}`));
    }

    logger.log('\n' + chalk.bold('💡 Next Steps:\n'));
    logger.log(`  ${chalk.cyan('1.')} Use snapshot in Claude conversations`);
    logger.log(`  ${chalk.cyan('2.')} Update specific contexts: ${chalk.yellow('autopm context update <type>')}`);
    logger.log(`  ${chalk.cyan('3.')} View all contexts:        ${chalk.yellow('autopm context show --list')}\n`);

    logger.log(chalk.gray('='.repeat(60)) + '\n');

  } catch (error) {
    spinner.fail(chalk.red('Failed to generate snapshot'));
    logger.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Context Update - Update existing context
 * @param {Object} argv - Command arguments
 */
async function contextUpdate(argv) {
  const spinner = ora(`Updating ${argv.type} context...`).start();

  try {
    const contextService = new ContextService();

    // Get update content
    let content = argv.content;

    if (argv.file) {
      // Read content from file
      const exists = await fs.pathExists(argv.file);
      if (!exists) {
        throw new Error(`File not found: ${argv.file}`);
      }
      content = await fs.readFile(argv.file, 'utf8');
    }

    if (!content) {
      spinner.warn(chalk.yellow('No content provided'));
      logger.log(chalk.yellow('\n⚠️  No content to update\n'));
      logger.log(chalk.bold('Usage:'));
      logger.log(`  ${chalk.yellow(`autopm context update ${argv.type} --content "New content"`)}`);
      logger.log(`  ${chalk.yellow(`autopm context update ${argv.type} --file updates.md`)}\n`);
      return;
    }

    const options = {
      mode: argv.mode || 'append',
      content
    };

    const result = await contextService.updateContext(argv.type, options);

    spinner.succeed(chalk.green('Context updated'));

    logger.log(chalk.cyan('\n✏️  Context Updated Successfully\n'));
    logger.log(chalk.gray('='.repeat(60)) + '\n');

    logger.log(chalk.bold('Type:       ') + argv.type);
    logger.log(chalk.bold('Mode:       ') + options.mode);
    logger.log(chalk.bold('Updated:    ') + new Date(result.timestamp).toLocaleString());

    logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

    logger.log(chalk.bold('💡 Next Steps:\n'));
    logger.log(`  ${chalk.cyan('1.')} View updated context: ${chalk.yellow(`autopm context show ${argv.type}`)}`);
    logger.log(`  ${chalk.cyan('2.')} Generate snapshot:    ${chalk.yellow('autopm context prime')}\n`);

    logger.log(chalk.gray('='.repeat(60)) + '\n');

  } catch (error) {
    spinner.fail(chalk.red('Failed to update context'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}\n`));
      logger.error(chalk.yellow('Available contexts:'));
      logger.error(chalk.gray(`  Use: ${chalk.yellow('autopm context show --list')}\n`));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Context Show - Show context or list all contexts
 * @param {Object} argv - Command arguments
 */
async function contextShow(argv) {
  const contextService = new ContextService();

  // List all contexts
  if (argv.list) {
    const spinner = ora('Loading contexts...').start();

    try {
      const { contexts, byType } = await contextService.listContexts();

      spinner.succeed(chalk.green('Contexts loaded'));

      logger.log(chalk.cyan('\n📚 All Contexts\n'));
      logger.log(chalk.gray('='.repeat(60)) + '\n');

      if (contexts.length === 0) {
        logger.log(chalk.yellow('No contexts found\n'));
        logger.log(chalk.bold('💡 Create your first context:'));
        logger.log(`   ${chalk.yellow('autopm context create project-brief --name "My Project"')}\n`);
        return;
      }

      // Group by type
      Object.keys(byType).forEach(type => {
        logger.log(chalk.bold(`\n${type}:`));
        byType[type].forEach(ctx => {
          const sizeMB = (ctx.size / 1024).toFixed(2);
          logger.log(`  • ${ctx.file} ${chalk.gray(`(${sizeMB}KB, updated ${new Date(ctx.updated).toLocaleDateString()}`)}`);
        });
      });

      logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

      logger.log(chalk.bold('📊 Summary:\n'));
      logger.log(`  Total contexts: ${contexts.length}`);
      logger.log(`  Types:          ${Object.keys(byType).length}\n`);

      // Show stats if requested
      if (argv.stats) {
        const spinner2 = ora('Analyzing context usage...').start();
        const { stats, recommendations } = await contextService.analyzeContextUsage();
        spinner2.succeed(chalk.green('Analysis complete'));

        logger.log(chalk.gray('─'.repeat(60)) + '\n');
        logger.log(chalk.bold('📈 Statistics:\n'));
        logger.log(`  Total size:     ${(stats.totalSize / 1024).toFixed(2)}KB`);
        logger.log(`  Average size:   ${(stats.averageSize / 1024).toFixed(2)}KB`);

        if (recommendations.length > 0) {
          logger.log('\n' + chalk.bold('💡 Recommendations:\n'));
          recommendations.forEach((rec, index) => {
            logger.log(`  ${index + 1}. ${rec}`);
          });
        }
        logger.log('');
      }

      logger.log(chalk.gray('='.repeat(60)) + '\n');

    } catch (error) {
      spinner.fail(chalk.red('Failed to load contexts'));
      logger.error(chalk.red(`\nError: ${error.message}\n`));
      process.exit(1);
    }
    return;
  }

  // Show specific context
  if (!argv.type) {
    logger.log(chalk.yellow('\n⚠️  No context type specified\n'));
    logger.log(chalk.bold('Usage:'));
    logger.log(`  ${chalk.yellow('autopm context show <type>')}`);
    logger.log(`  ${chalk.yellow('autopm context show --list')}\n`);
    logger.log(chalk.bold('Examples:'));
    logger.log(`  ${chalk.gray('autopm context show project-brief')}`);
    logger.log(`  ${chalk.gray('autopm context show --list')}`);
    logger.log(`  ${chalk.gray('autopm context show --list --stats')}\n`);
    return;
  }

  const spinner = ora(`Loading ${argv.type} context...`).start();

  try {
    const result = await contextService.getContext(argv.type);

    spinner.succeed(chalk.green('Context loaded'));

    logger.log(chalk.cyan(`\n📄 Context: ${argv.type}\n`));
    logger.log(chalk.gray('='.repeat(60)) + '\n');

    logger.log(chalk.bold('Type:       ') + result.type);
    logger.log(chalk.bold('Updated:    ') + new Date(result.updated).toLocaleString());

    if (result.metadata) {
      const metaKeys = Object.keys(result.metadata);
      if (metaKeys.length > 0) {
        logger.log('\n' + chalk.bold('Metadata:\n'));
        metaKeys.forEach(key => {
          logger.log(`  ${key}: ${result.metadata[key]}`);
        });
      }
    }

    logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

    // Show content (skip frontmatter)
    const contentWithoutFrontmatter = result.content.replace(/^---[\s\S]*?---\n\n/, '');
    logger.log(contentWithoutFrontmatter);

    logger.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

    logger.log(chalk.bold('💡 Actions:\n'));
    logger.log(`  ${chalk.cyan('1.')} Update context:  ${chalk.yellow(`autopm context update ${argv.type}`)}`);
    logger.log(`  ${chalk.cyan('2.')} List all:        ${chalk.yellow('autopm context show --list')}\n`);

    logger.log(chalk.gray('='.repeat(60)) + '\n');

  } catch (error) {
    spinner.fail(chalk.red('Failed to load context'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: Context "${argv.type}" not found\n`));
      logger.error(chalk.yellow('Available contexts:'));
      logger.error(chalk.gray(`  Use: ${chalk.yellow('autopm context show --list')}\n`));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Command builder - registers all subcommands
 * @param {Object} yargs - Yargs instance
 * @returns {Object} Configured yargs instance
 */
function builder(yargs) {
  return yargs
    .command(
      'create <type>',
      'Create new context from template',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Context type (project-brief, progress, tech-context, project-structure)',
            type: 'string'
          })
          .option('name', {
            describe: 'Context name',
            type: 'string'
          })
          .option('description', {
            describe: 'Context description',
            type: 'string'
          })
          .example('autopm context create project-brief --name "My Project"', 'Create project brief')
          .example('autopm context create progress --name "Sprint 1"', 'Create progress tracker');
      },
      contextCreate
    )
    .command(
      'prime',
      'Generate comprehensive project snapshot',
      (yargs) => {
        return yargs
          .option('include-git', {
            describe: 'Include git information',
            type: 'boolean',
            default: true
          })
          .option('output', {
            describe: 'Output file path',
            type: 'string'
          })
          .example('autopm context prime', 'Generate project snapshot')
          .example('autopm context prime --output snapshot.md', 'Save snapshot to file')
          .example('autopm context prime --no-include-git', 'Skip git information');
      },
      contextPrime
    )
    .command(
      'update <type>',
      'Update existing context',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Context type to update',
            type: 'string'
          })
          .option('mode', {
            describe: 'Update mode',
            type: 'string',
            choices: ['append', 'replace'],
            default: 'append'
          })
          .option('content', {
            describe: 'New content',
            type: 'string'
          })
          .option('file', {
            describe: 'Read content from file',
            type: 'string'
          })
          .example('autopm context update project-brief --content "## New Section"', 'Append content')
          .example('autopm context update progress --file updates.md', 'Update from file')
          .example('autopm context update tech-context --mode replace --content "..."', 'Replace content');
      },
      contextUpdate
    )
    .command(
      'show [type]',
      'Show context or list all contexts',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Context type to show',
            type: 'string'
          })
          .option('list', {
            describe: 'List all contexts',
            type: 'boolean',
            default: false
          })
          .option('stats', {
            describe: 'Show statistics with list',
            type: 'boolean',
            default: false
          })
          .example('autopm context show project-brief', 'Show specific context')
          .example('autopm context show --list', 'List all contexts')
          .example('autopm context show --list --stats', 'List with statistics');
      },
      contextShow
    )
    .demandCommand(1, 'You must specify a context command')
    .strictCommands()
    .help();
}

/**
 * Command export
 */
module.exports = {
  command: 'context',
  describe: 'Manage project context files for AI-assisted development',
  builder,
  handler: (argv) => {
    if (!argv._.includes('context') || argv._.length === 1) {
      logger.log(chalk.yellow('\nPlease specify a context command\n'));
      logger.log('Usage: autopm context <command>\n');
      logger.log('Available commands:');
      logger.log('  create <type>         Create new context from template');
      logger.log('  prime                 Generate comprehensive project snapshot');
      logger.log('  update <type>         Update existing context');
      logger.log('  show [type]           Show context or list all contexts');
      logger.log('\nUse: autopm context <command> --help for more info\n');
    }
  },
  handlers: {
    create: contextCreate,
    prime: contextPrime,
    update: contextUpdate,
    show: contextShow
  }
};
