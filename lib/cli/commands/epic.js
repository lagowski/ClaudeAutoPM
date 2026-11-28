/**
 * CLI Epic Commands
 *
 * Provides Epic management commands.
 * Implements subcommands for epic lifecycle management.
 *
 * @module cli/commands/epic
 * @requires ../../services/EpicService
 * @requires node:fs/promises (via lib/utils/fs)
 * @requires ora
 * @requires chalk
 * @requires path
 */

const EpicService = require('../../services/EpicService');
const fs = require('../../utils/fs');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const logger = require('../logger');
// Shared helpers (#611): this command uses the dir-per-epic layout
// (.claude/epics/<name>/epic.md) — canonical dir-per-epic helpers, imported
// without aliases so the layout is unambiguous at every call site
const {
  getEpicDirPath,
  readEpicDirFile
} = require('../utils');

/**
 * Epic names become directory names under .claude/epics/ and appear in
 * shell hints, so only letters, digits, dot, hyphen and underscore are
 * allowed, and a name made only of dots ('.', '..') is refused.
 * @param {string} name - Epic name
 * @returns {boolean} true when the name is safe
 */
function isValidEpicName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9._-]+$/.test(name) && !/^\.+$/.test(name);
}

/**
 * List all epics
 * @param {Object} argv - Command arguments
 */
async function epicList(argv) {
  const spinner = ora('Loading epics...').start();

  try {
    const epicService = new EpicService();
    const epics = await epicService.listEpics();

    if (epics.length === 0) {
      spinner.info(chalk.yellow('No epics found'));
      logger.log(chalk.yellow('\nCreate your first epic with: autopm epic new <name>'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${epics.length} epic(s)`));

    // Group by status
    const grouped = {
      'Planning': [],
      'In Progress': [],
      'Completed': []
    };

    epics.forEach(epic => {
      const category = epicService.categorizeStatus(epic.status);
      if (category === 'planning') {
        grouped['Planning'].push(epic);
      } else if (category === 'in_progress') {
        grouped['In Progress'].push(epic);
      } else if (category === 'done') {
        grouped['Completed'].push(epic);
      } else {
        grouped['Planning'].push(epic);
      }
    });

    // Display grouped epics
    logger.log(chalk.green('\n📋 Epics:\n'));

    Object.entries(grouped).forEach(([status, statusEpics]) => {
      if (statusEpics.length > 0) {
        const statusColor = status === 'Completed' ? chalk.green :
                           status === 'In Progress' ? chalk.yellow :
                           chalk.blue;

        logger.log(statusColor(`\n${status}:`));

        statusEpics.forEach((epic, index) => {
          logger.log(`  ${index + 1}. ${chalk.bold(epic.name)}`);
          logger.log(`     ${chalk.dim('Progress:')} ${epic.progress.padEnd(10)} ${chalk.dim('Tasks:')} ${epic.taskCount}`);

          if (epic.githubIssue) {
            logger.log(`     ${chalk.dim('GitHub:')} #${epic.githubIssue}`);
          }

          if (epic.created) {
            logger.log(`     ${chalk.dim('Created:')} ${epic.created.split('T')[0]}`);
          }
        });
      }
    });

    logger.log(chalk.dim(`\nTotal: ${epics.length} epic(s)`));
    logger.log(chalk.dim('Use: autopm epic show <name> to view details\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list epics'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Show epic content
 * @param {Object} argv - Command arguments
 */
async function epicShow(argv) {
  const spinner = ora(`Loading epic: ${argv.name}`).start();

  try {
    const content = await readEpicDirFile(argv.name);
    const epicService = new EpicService();
    const metadata = epicService.parseFrontmatter(content);

    spinner.succeed(chalk.green('Epic loaded'));

    // Display metadata table
    logger.log('\n' + chalk.bold('📊 Epic Metadata') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    if (metadata) {
      logger.log(chalk.bold('Name:     ') + (metadata.name || argv.name));
      logger.log(chalk.bold('Status:   ') + (metadata.status || 'N/A'));
      logger.log(chalk.bold('Progress: ') + (metadata.progress || 'N/A'));
      logger.log(chalk.bold('Priority: ') + (metadata.priority || 'N/A'));
      logger.log(chalk.bold('Created:  ') + (metadata.created ? metadata.created.split('T')[0] : 'N/A'));

      if (metadata.github) {
        logger.log(chalk.bold('GitHub:   ') + metadata.github);
      }
    }

    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');
    logger.log(content);
    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');

    const epicPath = path.join(getEpicDirPath(argv.name), 'epic.md');
    logger.log(chalk.dim(`File: ${epicPath}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to show epic'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
      logger.error(chalk.yellow('Use: autopm epic list to see available epics'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Create new epic
 * @param {Object} argv - Command arguments
 */
async function epicNew(argv) {
  const spinner = ora(`Creating epic: ${argv.name}`).start();

  try {
    const epicPath = getEpicDirPath(argv.name);
    const epicFilePath = path.join(epicPath, 'epic.md');

    // Check if epic already exists
    const exists = await fs.pathExists(epicFilePath);
    if (exists) {
      spinner.fail(chalk.red('Epic already exists'));
      logger.error(chalk.red(`\nError: Epic file already exists: ${epicFilePath}`));
      logger.error(chalk.yellow('Use: autopm epic edit ' + argv.name + ' to modify it'));
      return;
    }

    // Create epic directory
    await fs.ensureDir(epicPath);

    spinner.stop();

    // Handle --from-prd flag
    if (argv['from-prd']) {
      return await epicNewFromPRD(argv, epicPath, epicFilePath);
    }

    // Interactive prompts
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    logger.log(chalk.cyan('\n🚀 Creating new epic...\n'));

    const title = await prompt(chalk.cyan('Title [' + argv.name + ']: ')) || argv.name;
    const description = await prompt(chalk.cyan('Description: '));
    const priority = await prompt(chalk.cyan('Priority (P0/P1/P2/P3) [P2]: ')) || 'P2';

    rl.close();

    // Build epic content
    const now = new Date().toISOString();
    const frontmatter = `---
name: ${argv.name}
status: backlog
created: ${now}
progress: 0%
prd: .claude/prds/${argv.name}.md
github: [Will be updated when synced to GitHub]
priority: ${priority}
---`;

    const content = `${frontmatter}

# Epic: ${title}

## Overview
${description || 'Epic description goes here.'}

## Task Breakdown

Tasks will be added as epic progresses.
`;

    // Write epic file
    await fs.writeFile(epicFilePath, content);

    logger.log(chalk.green('\n✅ Epic created successfully!'));
    logger.log(chalk.cyan(`📄 File: ${epicFilePath}\n`));

    // Show next steps
    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} Edit epic:       ${chalk.yellow('autopm epic edit ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('2.')} Check status:    ${chalk.yellow('autopm epic status ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('3.')} Start working:   ${chalk.yellow('autopm epic start ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('4.')} Sync to GitHub:  ${chalk.yellow('autopm epic sync ' + argv.name)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to create epic'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Create new epic from PRD
 * @param {Object} argv - Command arguments
 * @param {string} epicPath - Path to epic directory
 * @param {string} epicFilePath - Path to epic.md file
 */
async function epicNewFromPRD(argv, epicPath, epicFilePath) {
  const spinner = ora('Creating epic from PRD...').start();

  try {
    const prdPath = path.join(process.cwd(), '.claude', 'prds', `${argv['from-prd']}.md`);
    const prdExists = await fs.pathExists(prdPath);

    if (!prdExists) {
      spinner.fail(chalk.red('PRD not found'));
      logger.error(chalk.red(`\nError: PRD file not found: ${prdPath}`));
      logger.error(chalk.yellow('Use: autopm prd list to see available PRDs'));
      return;
    }

    const prdContent = await fs.readFile(prdPath, 'utf8');
    const epicService = new EpicService();
    const prdMetadata = epicService.parseFrontmatter(prdContent);

    // Build epic from PRD
    const now = new Date().toISOString();
    const frontmatter = `---
name: ${argv.name}
status: backlog
created: ${now}
progress: 0%
prd: .claude/prds/${argv['from-prd']}.md
github: [Will be updated when synced to GitHub]
priority: ${prdMetadata?.priority || 'P2'}
---`;

    const content = `${frontmatter}

# Epic: ${argv.name}

## Overview
Created from PRD: ${argv['from-prd']}

${prdContent.split('## Problem Statement')[1]?.split('##')[0] || ''}

## Task Breakdown

Tasks will be generated from PRD analysis.
`;

    await fs.writeFile(epicFilePath, content);

    spinner.succeed(chalk.green('Epic created from PRD'));

    logger.log(chalk.green('\n✅ Epic created successfully!'));
    logger.log(chalk.cyan(`📄 File: ${epicFilePath}`));
    logger.log(chalk.cyan(`📋 Source PRD: ${prdPath}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to create epic from PRD'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Edit epic in editor
 * @param {Object} argv - Command arguments
 */
async function epicEdit(argv) {
  const spinner = ora(`Opening epic: ${argv.name}`).start();

  try {
    const epicFilePath = path.join(getEpicDirPath(argv.name), 'epic.md');

    // Check if file exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      spinner.fail(chalk.red('Epic not found'));
      logger.error(chalk.red(`\nError: Epic file not found: ${epicFilePath}`));
      logger.error(chalk.yellow('Use: autopm epic list to see available epics'));
      return;
    }

    spinner.succeed(chalk.green('Opening editor...'));

    // Determine editor
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';

    // Spawn editor
    const child = spawn(editor, [epicFilePath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Wait for editor to close
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          logger.log(chalk.green('\n✓ Epic saved'));
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to edit epic'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Show epic status
 * @param {Object} argv - Command arguments
 */
async function epicStatus(argv) {
  const spinner = ora(`Analyzing epic: ${argv.name}`).start();

  try {
    const epicService = new EpicService();
    const epic = await epicService.getEpic(argv.name);

    spinner.succeed(chalk.green('Status analyzed'));

    // Display status
    logger.log('\n' + chalk.bold('📊 Epic Status Report') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    logger.log(chalk.bold('Metadata:'));
    logger.log(`  Name:      ${epic.name}`);
    logger.log(`  Status:    ${chalk.yellow(epic.status)}`);
    logger.log(`  Priority:  ${chalk.red(epic.priority || 'P2')}`);
    logger.log(`  Created:   ${epic.created ? epic.created.split('T')[0] : 'N/A'}`);

    if (epic.github && epic.githubIssue) {
      logger.log(`  GitHub:    #${epic.githubIssue}`);
    }

    // Progress bar
    const progressPercent = parseInt(epic.progress) || 0;
    const progressBar = epicService.generateProgressBar(progressPercent, 20);

    logger.log('\n' + chalk.bold('Progress:') + ` ${progressPercent}%`);
    logger.log(`  [${progressPercent >= 80 ? chalk.green(progressBar.bar.slice(1, -1)) :
                      progressPercent >= 50 ? chalk.yellow(progressBar.bar.slice(1, -1)) :
                      chalk.red(progressBar.bar.slice(1, -1))}]`);

    // Task statistics
    logger.log('\n' + chalk.bold('Tasks:'));
    logger.log(`  Total:     ${epic.taskCount}`);

    logger.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

    const epicPath = path.join(getEpicDirPath(argv.name), 'epic.md');
    logger.log(chalk.dim(`File: ${epicPath}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to analyze status'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Validate epic structure
 * @param {Object} argv - Command arguments
 */
async function epicValidate(argv) {
  const spinner = ora(`Validating epic: ${argv.name}`).start();

  try {
    const epicService = new EpicService();
    const result = await epicService.validateEpicStructure(argv.name);

    if (result.valid) {
      spinner.succeed(chalk.green('Epic is valid'));
      logger.log(chalk.green('\n✓ Validation passed - Epic structure is correct'));
    } else {
      spinner.fail(chalk.red(`Epic validation failed - ${result.issues.length} issues found`));
      logger.error(chalk.red(`\n✗ Validation failed - ${result.issues.length} issue(s):`));
      result.issues.forEach((issue, index) => {
        logger.error(chalk.red(`  ${index + 1}. ${issue}`));
      });
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to validate epic'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\n✗ Error: Epic not found`));
      logger.error(chalk.red(`  ${error.message}`));
      logger.error(chalk.yellow('\n💡 Use: autopm epic list to see available epics'));
    } else {
      logger.error(chalk.red(`\n✗ Error: ${error.message}`));
    }
    process.exit(1);
  }
}

/**
 * Start working on epic
 * @param {Object} argv - Command arguments
 */
async function epicStart(argv) {
  const spinner = ora(`Starting epic: ${argv.name}`).start();

  try {
    const epicFilePath = path.join(getEpicDirPath(argv.name), 'epic.md');

    // Check if file exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      spinner.fail(chalk.red('Epic not found'));
      logger.error(chalk.red(`\nError: Epic file not found: ${epicFilePath}`));
      logger.error(chalk.yellow('Use: autopm epic list to see available epics'));
      return;
    }

    // Read current content
    let content = await fs.readFile(epicFilePath, 'utf8');

    // Update status to in-progress
    content = content.replace(/^status:\s*.+$/m, 'status: in-progress');

    // Add started date if not present
    if (!content.includes('started:')) {
      const now = new Date().toISOString();
      content = content.replace(/^(created:.+)$/m, `$1\nstarted: ${now}`);
    }

    // Write updated content
    await fs.writeFile(epicFilePath, content);

    spinner.succeed(chalk.green('Epic started'));

    logger.log(chalk.green('\n✅ Epic is now in progress!'));
    logger.log(chalk.cyan(`📄 File: ${epicFilePath}\n`));

    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} Check status:    ${chalk.yellow('autopm epic status ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('2.')} Edit epic:       ${chalk.yellow('autopm epic edit ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('3.')} Close when done: ${chalk.yellow('autopm epic close ' + argv.name)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to start epic'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Close epic
 * @param {Object} argv - Command arguments
 */
async function epicClose(argv) {
  const spinner = ora(`Closing epic: ${argv.name}`).start();

  try {
    const epicFilePath = path.join(getEpicDirPath(argv.name), 'epic.md');

    // Check if file exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      spinner.fail(chalk.red('Epic not found'));
      logger.error(chalk.red(`\nError: Epic file not found: ${epicFilePath}`));
      logger.error(chalk.yellow('Use: autopm epic list to see available epics'));
      return;
    }

    // Read current content
    let content = await fs.readFile(epicFilePath, 'utf8');

    // Update status to completed
    content = content.replace(/^status:\s*.+$/m, 'status: completed');

    // Update progress to 100%
    content = content.replace(/^progress:\s*.+$/m, 'progress: 100%');

    // Add completed date if not present
    if (!content.includes('completed:')) {
      const now = new Date().toISOString();
      content = content.replace(/^(created:.+)$/m, `$1\ncompleted: ${now}`);
    }

    // Write updated content
    await fs.writeFile(epicFilePath, content);

    spinner.succeed(chalk.green('Epic closed'));

    logger.log(chalk.green('\n✅ Epic completed!'));
    logger.log(chalk.cyan(`📄 File: ${epicFilePath}\n`));

    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} Check status:    ${chalk.yellow('autopm epic status ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('2.')} View epic:       ${chalk.yellow('autopm epic show ' + argv.name)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to close epic'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Sync epic with GitHub
 * @param {Object} argv - Command arguments
 */
async function epicSync(argv) {
  const spinner = ora(`Syncing epic: ${argv.name}`).start();

  try {
    const epicService = new EpicService();
    await epicService.getEpic(argv.name); // validate the epic exists

    // TODO: Implement GitHub integration
    // For now, just show a message
    spinner.info(chalk.yellow('GitHub sync not yet implemented'));

    logger.log(chalk.yellow('\n⚠️  GitHub sync feature coming soon!\n'));

    logger.log(chalk.dim('This feature will:'));
    logger.log(chalk.dim('  - Create GitHub issue if not exists'));
    logger.log(chalk.dim('  - Update existing GitHub issue'));
    logger.log(chalk.dim('  - Sync epic status and progress\n'));

    logger.log(chalk.bold('For now, you can:'));
    logger.log(`  ${chalk.cyan('1.')} View epic:       ${chalk.yellow('autopm epic show ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('2.')} Check status:    ${chalk.yellow('autopm epic status ' + argv.name)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to sync epic'));
    logger.error(chalk.red(`\nError: ${error.message}`));
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
      'list',
      'List all epics',
      (yargs) => {
        return yargs
          .option('status', {
            describe: 'Filter by status (planning/in-progress/completed)',
            type: 'string'
          })
          .example('autopm epic list', 'Show all epics')
          .example('autopm epic list --status in-progress', 'Show active epics');
      },
      epicList
    )
    .command(
      'show <name>',
      'Display epic content',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic show user-auth', 'Display epic details');
      },
      epicShow
    )
    .command(
      'new <name>',
      'Create new epic',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name (use-kebab-case)',
            type: 'string'
          })
          .option('from-prd', {
            describe: 'Create from PRD',
            type: 'string'
          })
          .option('template', {
            describe: 'Template to use',
            type: 'string'
          })
          .example('autopm epic new user-auth', 'Create new epic')
          .example('autopm epic new user-auth --from-prd my-feature', 'Create from PRD');
      },
      epicNew
    )
    .command(
      'edit <name>',
      'Edit epic in your editor',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic edit user-auth', 'Open epic in editor')
          .example('EDITOR=code autopm epic edit user-auth', 'Open in VS Code');
      },
      epicEdit
    )
    .command(
      'status <name>',
      'Show epic status and progress',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic status user-auth', 'Show epic status report');
      },
      epicStatus
    )
    .command(
      'validate <name>',
      'Validate epic structure',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic validate user-auth', 'Validate epic structure');
      },
      epicValidate
    )
    .command(
      'start <name>',
      'Start working on epic',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic start user-auth', 'Mark epic as in-progress');
      },
      epicStart
    )
    .command(
      'close <name>',
      'Close epic',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic close user-auth', 'Mark epic as completed');
      },
      epicClose
    )
    .command(
      'sync <name>',
      'Sync epic with GitHub',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Epic name',
            type: 'string'
          })
          .example('autopm epic sync user-auth', 'Sync epic to GitHub issue');
      },
      epicSync
    )
    .check((argv) => {
      if (argv.name !== undefined && !isValidEpicName(String(argv.name))) {
        throw new Error(`Invalid epic name '${argv.name}': use only letters, numbers, dots, hyphens and underscores`);
      }
      return true;
    })
    .demandCommand(1, 'You must specify an epic action')
    .strictCommands()
    .help();
}

/**
 * Command export
 */
module.exports = {
  command: 'epic',
  describe: 'Manage epics and epic lifecycle',
  builder,
  isValidEpicName,
  handler: (argv) => {
    if (!argv._.includes('epic') || argv._.length === 1) {
      logger.log(chalk.yellow('\nPlease specify an epic command\n'));
      logger.log('Usage: autopm epic <command>\n');
      logger.log('Available commands:');
      logger.log('  list                  List all epics');
      logger.log('  show <name>           Display epic');
      logger.log('  new <name>            Create new epic');
      logger.log('  edit <name>           Edit epic');
      logger.log('  status <name>         Show epic status');
      logger.log('  validate <name>       Validate epic');
      logger.log('  start <name>          Start working on epic');
      logger.log('  close <name>          Close epic');
      logger.log('  sync <name>           Sync with GitHub');
      logger.log('\nUse: autopm epic <command> --help for more info\n');
    }
  },
  handlers: {
    list: epicList,
    show: epicShow,
    new: epicNew,
    edit: epicEdit,
    status: epicStatus,
    validate: epicValidate,
    start: epicStart,
    close: epicClose,
    sync: epicSync
  }
};
