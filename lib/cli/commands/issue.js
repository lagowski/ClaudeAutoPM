/**
 * CLI Issue Commands
 *
 * Provides Issue management commands for ClaudeAutoPM.
 * Implements subcommands for issue lifecycle management.
 *
 * Commands:
 * - show <number>: Display issue details
 * - start <number>: Start working on issue
 * - close <number>: Close and complete issue
 * - status <number>: Check issue status
 * - edit <number>: Edit issue in editor
 * - sync <number>: Sync issue with GitHub/Azure
 *
 * @module cli/commands/issue
 * @requires ../../services/IssueService
 * @requires node:fs/promises (via lib/utils/fs)
 * @requires ora
 * @requires chalk
 * @requires path
 */

const IssueService = require('../../services/IssueService');
const fs = require('../../utils/fs');
const ora = require('ora');
const chalk = require('chalk');
const { spawn } = require('child_process');
const { getIssuePath } = require('../utils');
const logger = require('../logger');

/**
 * Show issue details
 * @param {Object} argv - Command arguments
 */
async function issueShow(argv) {
  const spinner = ora(`Loading issue: #${argv.number}`).start();

  try {
    const issueService = new IssueService();
    const issue = await issueService.getLocalIssue(argv.number);

    spinner.succeed(chalk.green('Issue loaded'));

    // Display metadata table
    logger.log('\n' + chalk.bold('📋 Issue Details') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    logger.log(chalk.bold('ID:       ') + (issue.id || argv.number));
    logger.log(chalk.bold('Title:    ') + (issue.title || 'N/A'));
    logger.log(chalk.bold('Status:   ') + chalk.yellow(issue.status || 'open'));

    if (issue.assignee) {
      logger.log(chalk.bold('Assignee: ') + issue.assignee);
    }

    if (issue.labels) {
      logger.log(chalk.bold('Labels:   ') + issue.labels);
    }

    if (issue.created) {
      logger.log(chalk.bold('Created:  ') + new Date(issue.created).toLocaleDateString());
    }

    if (issue.started) {
      logger.log(chalk.bold('Started:  ') + new Date(issue.started).toLocaleDateString());
      const duration = issueService.formatIssueDuration(issue.started);
      logger.log(chalk.bold('Duration: ') + duration);
    }

    if (issue.completed) {
      logger.log(chalk.bold('Completed:') + new Date(issue.completed).toLocaleDateString());
      const duration = issueService.formatIssueDuration(issue.started, issue.completed);
      logger.log(chalk.bold('Duration: ') + duration);
    }

    if (issue.url) {
      logger.log(chalk.bold('URL:      ') + chalk.cyan(issue.url));
    }

    // Show issue content
    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');

    // Extract and display description (skip frontmatter)
    const contentWithoutFrontmatter = issue.content.replace(/^---[\s\S]*?---\n\n/, '');
    logger.log(contentWithoutFrontmatter);

    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');

    logger.log(chalk.dim(`File: ${issue.path}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to show issue'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
      logger.error(chalk.yellow('Use: autopm issue list to see available issues'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Start working on issue
 * @param {Object} argv - Command arguments
 */
async function issueStart(argv) {
  const spinner = ora(`Starting issue: #${argv.number}`).start();

  try {
    const issueService = new IssueService();

    // Check if issue exists
    await issueService.getLocalIssue(argv.number);

    // Update status to in-progress
    await issueService.updateIssueStatus(argv.number, 'in-progress');

    spinner.succeed(chalk.green('Issue started'));

    logger.log(chalk.green(`\n✅ Issue #${argv.number} is now in progress!`));

    const issuePath = getIssuePath(argv.number);
    logger.log(chalk.cyan(`📄 File: ${issuePath}\n`));

    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} Check status:    ${chalk.yellow('autopm issue status ' + argv.number)}`);
    logger.log(`  ${chalk.cyan('2.')} Edit issue:      ${chalk.yellow('autopm issue edit ' + argv.number)}`);
    logger.log(`  ${chalk.cyan('3.')} Close when done: ${chalk.yellow('autopm issue close ' + argv.number)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to start issue'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
      logger.error(chalk.yellow('Use: autopm issue list to see available issues'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Close issue
 * @param {Object} argv - Command arguments
 */
async function issueClose(argv) {
  const spinner = ora(`Closing issue: #${argv.number}`).start();

  try {
    const issueService = new IssueService();

    // Check if issue exists
    await issueService.getLocalIssue(argv.number);

    // Update status to closed
    await issueService.updateIssueStatus(argv.number, 'closed');

    spinner.succeed(chalk.green('Issue closed'));

    logger.log(chalk.green(`\n✅ Issue #${argv.number} completed!`));

    const issuePath = getIssuePath(argv.number);
    logger.log(chalk.cyan(`📄 File: ${issuePath}\n`));

    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} View issue:      ${chalk.yellow('autopm issue show ' + argv.number)}`);
    logger.log(`  ${chalk.cyan('2.')} Check status:    ${chalk.yellow('autopm issue status ' + argv.number)}\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to close issue'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
      logger.error(chalk.yellow('Use: autopm issue list to see available issues'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Show issue status
 * @param {Object} argv - Command arguments
 */
async function issueStatus(argv) {
  const spinner = ora(`Analyzing issue: #${argv.number}`).start();

  try {
    const issueService = new IssueService();
    const issue = await issueService.getLocalIssue(argv.number);

    spinner.succeed(chalk.green('Status analyzed'));

    // Display status
    logger.log('\n' + chalk.bold('📊 Issue Status Report') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    logger.log(chalk.bold('Metadata:'));
    logger.log(`  ID:        #${issue.id || argv.number}`);
    logger.log(`  Title:     ${issue.title || 'N/A'}`);
    logger.log(`  Status:    ${chalk.yellow(issue.status || 'open')}`);

    if (issue.assignee) {
      logger.log(`  Assignee:  ${issue.assignee}`);
    }

    if (issue.labels) {
      logger.log(`  Labels:    ${issue.labels}`);
    }

    logger.log('\n' + chalk.bold('Timeline:'));

    if (issue.created) {
      logger.log(`  Created:   ${new Date(issue.created).toLocaleString()}`);
    }

    if (issue.started) {
      logger.log(`  Started:   ${new Date(issue.started).toLocaleString()}`);

      if (issue.completed) {
        const duration = issueService.formatIssueDuration(issue.started, issue.completed);
        logger.log(`  Completed: ${new Date(issue.completed).toLocaleString()}`);
        logger.log(`  Duration:  ${duration}`);
      } else {
        const duration = issueService.formatIssueDuration(issue.started);
        logger.log(`  Duration:  ${duration} (ongoing)`);
      }
    }

    // Show related files
    const relatedFiles = await issueService.getIssueFiles(argv.number);
    if (relatedFiles.length > 0) {
      logger.log('\n' + chalk.bold('Related Files:'));
      relatedFiles.forEach(file => {
        logger.log(`  • ${file}`);
      });
    }

    // Show dependencies
    const dependencies = await issueService.getDependencies(argv.number);
    if (dependencies.length > 0) {
      logger.log('\n' + chalk.bold('Dependencies:'));
      dependencies.forEach(dep => {
        logger.log(`  • Issue #${dep}`);
      });
    }

    // Show sub-issues
    const subIssues = await issueService.getSubIssues(argv.number);
    if (subIssues.length > 0) {
      logger.log('\n' + chalk.bold('Sub-Issues:'));
      subIssues.forEach(sub => {
        logger.log(`  • Issue #${sub}`);
      });
    }

    logger.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

    const issuePath = getIssuePath(argv.number);
    logger.log(chalk.dim(`File: ${issuePath}\n`));

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
 * Edit issue in editor
 * @param {Object} argv - Command arguments
 */
async function issueEdit(argv) {
  const spinner = ora(`Opening issue: #${argv.number}`).start();

  try {
    const issuePath = getIssuePath(argv.number);

    // Check if file exists
    const exists = await fs.pathExists(issuePath);
    if (!exists) {
      spinner.fail(chalk.red('Issue not found'));
      logger.error(chalk.red(`\nError: Issue file not found: ${issuePath}`));
      logger.error(chalk.yellow('Use: autopm issue list to see available issues'));
      return;
    }

    spinner.succeed(chalk.green('Opening editor...'));

    // Determine editor
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';

    // Spawn editor
    const child = spawn(editor, [issuePath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Wait for editor to close
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          logger.log(chalk.green('\n✓ Issue saved'));
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to edit issue'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Sync issue with GitHub/Azure
 * @param {Object} argv - Command arguments
 */
async function issueSync(argv) {
  const provider = argv.provider || 'github';
  const spinner = ora(`Syncing issue: #${argv.number} (${provider})`).start();

  try {
    let providerInstance;
    let issueService;

    // Load provider based on --provider flag
    if (provider === 'azure') {
      // Load Azure DevOps provider
      const AzureDevOpsProvider = require('../../providers/AzureDevOpsProvider');
      providerInstance = new AzureDevOpsProvider({
        token: process.env.AZURE_DEVOPS_PAT,
        organization: process.env.AZURE_DEVOPS_ORG,
        project: process.env.AZURE_DEVOPS_PROJECT
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });

      let result;

      if (argv.push) {
        // Push to Azure
        spinner.text = 'Pushing to Azure DevOps...';
        result = await issueService.syncToAzure(argv.number, { detectConflicts: true });
      } else if (argv.pull && argv.azure) {
        // Pull from Azure
        spinner.text = 'Pulling from Azure DevOps...';
        result = await issueService.syncFromAzure(argv.azure, { detectConflicts: true });
      } else {
        // Default: bidirectional sync
        spinner.text = 'Bidirectional sync...';
        result = await issueService.syncBidirectionalAzure(argv.number, { conflictStrategy: 'detect' });
      }

      if (!result.success && result.conflict) {
        spinner.warn(chalk.yellow('Conflict detected'));

        logger.log(chalk.yellow(`\n⚠️  Sync Conflict Detected!\n`));
        logger.log(chalk.bold('Conflict Details:'));
        logger.log(`  Local newer:   ${result.conflict.localNewer}`);
        logger.log(`  Remote newer:  ${result.conflict.remoteNewer}\n`);

        logger.log(chalk.bold('Resolution Options:'));
        logger.log(`  ${chalk.cyan('1.')} Use local:    ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --provider azure --strategy local')}`);
        logger.log(`  ${chalk.cyan('2.')} Use remote:   ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --provider azure --strategy remote')}`);
        logger.log(`  ${chalk.cyan('3.')} Use newest:   ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --provider azure --strategy newest')}\n`);
      } else {
        spinner.succeed(chalk.green('Sync complete'));

        logger.log(chalk.green(`\n✅ Issue #${argv.number} synced successfully!\n`));
        logger.log(chalk.bold('Sync Details:'));
        logger.log(`  Provider:      Azure DevOps`);
        logger.log(`  Action:        ${result.action || 'synced'}`);
        if (result.workItemId) {
          logger.log(`  Work Item #:   ${result.workItemId}`);
        }
        if (result.direction) {
          logger.log(`  Direction:     ${result.direction}`);
        }
        logger.log();
      }

    } else {
      // Load GitHub provider (default)
      const GitHubProvider = require('../../providers/GitHubProvider');
      providerInstance = new GitHubProvider({
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || process.env.GITHUB_USER,
        repo: process.env.GITHUB_REPO
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });

      let result;

      if (argv.push) {
        // Push to GitHub
        spinner.text = 'Pushing to GitHub...';
        result = await issueService.syncToGitHub(argv.number, { detectConflicts: true });
      } else if (argv.pull && argv.github) {
        // Pull from GitHub
        spinner.text = 'Pulling from GitHub...';
        result = await issueService.syncFromGitHub(argv.github, { detectConflicts: true });
      } else {
        // Default: bidirectional sync
        spinner.text = 'Bidirectional sync...';
        result = await issueService.syncBidirectional(argv.number, { conflictStrategy: 'detect' });
      }

      if (!result.success && result.conflict) {
        spinner.warn(chalk.yellow('Conflict detected'));

        logger.log(chalk.yellow(`\n⚠️  Sync Conflict Detected!\n`));
        logger.log(chalk.bold('Conflict Details:'));
        logger.log(`  Local newer:   ${result.conflict.localNewer}`);
        logger.log(`  Remote newer:  ${result.conflict.remoteNewer}`);
        logger.log(`  Fields:        ${result.conflict.conflictFields.join(', ')}\n`);

        logger.log(chalk.bold('Resolution Options:'));
        logger.log(`  ${chalk.cyan('1.')} Use local:    ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --strategy local')}`);
        logger.log(`  ${chalk.cyan('2.')} Use remote:   ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --strategy remote')}`);
        logger.log(`  ${chalk.cyan('3.')} Use newest:   ${chalk.yellow('autopm issue sync-resolve ' + argv.number + ' --strategy newest')}\n`);
      } else {
        spinner.succeed(chalk.green('Sync complete'));

        logger.log(chalk.green(`\n✅ Issue #${argv.number} synced successfully!\n`));
        logger.log(chalk.bold('Sync Details:'));
        logger.log(`  Provider:      GitHub`);
        logger.log(`  Action:        ${result.action || 'synced'}`);
        if (result.githubNumber) {
          logger.log(`  GitHub #:      ${result.githubNumber}`);
        }
        if (result.direction) {
          logger.log(`  Direction:     ${result.direction}`);
        }
        logger.log();
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to sync issue'));

    if (error.message.includes('GITHUB_TOKEN')) {
      logger.error(chalk.red(`\n❌ GitHub token not configured`));
      logger.error(chalk.yellow('Set: export GITHUB_TOKEN=your_token'));
      logger.error(chalk.yellow('Set: export GITHUB_OWNER=username'));
      logger.error(chalk.yellow('Set: export GITHUB_REPO=repository\n'));
    } else if (error.message.includes('AZURE_DEVOPS_PAT')) {
      logger.error(chalk.red(`\n❌ Azure DevOps token not configured`));
      logger.error(chalk.yellow('Set: export AZURE_DEVOPS_PAT=your_pat_token'));
      logger.error(chalk.yellow('Set: export AZURE_DEVOPS_ORG=your_organization'));
      logger.error(chalk.yellow('Set: export AZURE_DEVOPS_PROJECT=your_project\n'));
    } else if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Check sync status of an issue
 * @param {Object} argv - Command arguments
 */
async function issueSyncStatus(argv) {
  const provider = argv.provider || 'github';
  const spinner = ora(`Checking sync status: #${argv.number} (${provider})`).start();

  try {
    let providerInstance;
    let issueService;

    if (provider === 'azure') {
      // Load Azure DevOps provider
      const AzureDevOpsProvider = require('../../providers/AzureDevOpsProvider');
      providerInstance = new AzureDevOpsProvider({
        token: process.env.AZURE_DEVOPS_PAT,
        organization: process.env.AZURE_DEVOPS_ORG,
        project: process.env.AZURE_DEVOPS_PROJECT
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });
      const status = await issueService.getAzureSyncStatus(argv.number);

      spinner.succeed(chalk.green('Status retrieved'));

      logger.log('\n' + chalk.bold('🔄 Sync Status (Azure DevOps)') + '\n');
      logger.log(chalk.gray('─'.repeat(50)) + '\n');

      logger.log(chalk.bold('Issue:'));
      logger.log(`  Local #:        ${status.localNumber}`);
      logger.log(`  Work Item #:    ${status.workItemId || 'Not synced'}`);
      logger.log(`  Status:         ${status.synced ? chalk.green('✓ Synced') : chalk.yellow('⚠ Out of sync')}`);

      if (status.lastSync) {
        logger.log(`  Last Sync:      ${new Date(status.lastSync).toLocaleString()}`);
      }

      logger.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

      if (!status.synced) {
        logger.log(chalk.yellow('💡 Tip: Run sync to update:'));
        logger.log(`   ${chalk.cyan('autopm issue sync ' + argv.number + ' --provider azure')}\n`);
      }

    } else {
      // Load GitHub provider
      const GitHubProvider = require('../../providers/GitHubProvider');
      providerInstance = new GitHubProvider({
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || process.env.GITHUB_USER,
        repo: process.env.GITHUB_REPO
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });
      const status = await issueService.getSyncStatus(argv.number);

    spinner.succeed(chalk.green('Status retrieved'));

    logger.log('\n' + chalk.bold('🔄 Sync Status') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    logger.log(chalk.bold('Issue:'));
    logger.log(`  Local #:       ${status.localNumber}`);
    logger.log(`  GitHub #:      ${status.githubNumber || 'Not synced'}`);
    logger.log(`  Status:        ${status.synced ? chalk.green('✓ Synced') : chalk.yellow('⚠ Out of sync')}`);

    if (status.lastSync) {
      logger.log(`  Last Sync:     ${new Date(status.lastSync).toLocaleString()}`);
    }

    logger.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

    if (!status.synced) {
      logger.log(chalk.yellow('💡 Tip: Run sync to update:'));
      logger.log(`   ${chalk.cyan('autopm issue sync ' + argv.number)}\n`);
    }
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to check status'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Resolve sync conflict
 * @param {Object} argv - Command arguments
 */
async function issueSyncResolve(argv) {
  const provider = argv.provider || 'github';
  const spinner = ora(`Resolving conflict: #${argv.number} (${provider})`).start();

  try {
    let providerInstance;
    let issueService;

    if (provider === 'azure') {
      // Load Azure DevOps provider
      const AzureDevOpsProvider = require('../../providers/AzureDevOpsProvider');
      providerInstance = new AzureDevOpsProvider({
        token: process.env.AZURE_DEVOPS_PAT,
        organization: process.env.AZURE_DEVOPS_ORG,
        project: process.env.AZURE_DEVOPS_PROJECT
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });
      const result = await issueService.resolveAzureConflict(argv.number, argv.strategy);

      if (result.resolved) {
        spinner.succeed(chalk.green('Conflict resolved'));

        logger.log(chalk.green(`\n✅ Conflict resolved using "${result.appliedStrategy}" strategy\n`));
        logger.log(chalk.bold('Result:'));
        logger.log(`  Provider:      Azure DevOps`);
        logger.log(`  Action:        ${result.result.action || 'resolved'}`);
        if (result.result.workItemId) {
          logger.log(`  Work Item #:   ${result.result.workItemId}`);
        }
        logger.log();
      } else {
        spinner.info(chalk.yellow('Manual resolution required'));

        logger.log(chalk.yellow(`\n⚠️  Manual resolution required\n`));
        logger.log(chalk.bold('Available strategies:'));
        logger.log(`  ${chalk.cyan('local')}   - Use local version`);
        logger.log(`  ${chalk.cyan('remote')}  - Use remote (Azure DevOps) version`);
        logger.log(`  ${chalk.cyan('newest')}  - Use most recently updated\n`);
      }

    } else {
      // Load GitHub provider (default)
      const GitHubProvider = require('../../providers/GitHubProvider');
      providerInstance = new GitHubProvider({
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || process.env.GITHUB_USER,
        repo: process.env.GITHUB_REPO
      });

      await providerInstance.authenticate();
      issueService = new IssueService({ provider: providerInstance });
      const result = await issueService.resolveConflict(argv.number, argv.strategy);

      if (result.resolved) {
        spinner.succeed(chalk.green('Conflict resolved'));

        logger.log(chalk.green(`\n✅ Conflict resolved using "${result.appliedStrategy}" strategy\n`));
        logger.log(chalk.bold('Result:'));
        logger.log(`  Provider:      GitHub`);
        logger.log(`  Action:        ${result.result.action || 'resolved'}`);
        if (result.result.githubNumber) {
          logger.log(`  GitHub #:      ${result.result.githubNumber}`);
        }
        logger.log();
      } else {
        spinner.info(chalk.yellow('Manual resolution required'));

        logger.log(chalk.yellow(`\n⚠️  Manual resolution required\n`));
        logger.log(chalk.bold('Available strategies:'));
        logger.log(`  ${chalk.cyan('local')}   - Use local version`);
        logger.log(`  ${chalk.cyan('remote')}  - Use remote (GitHub) version`);
        logger.log(`  ${chalk.cyan('newest')}  - Use most recently updated\n`);
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to resolve conflict'));
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
      'show <number>',
      'Display issue details',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .example('autopm issue show 123', 'Display issue #123');
      },
      issueShow
    )
    .command(
      'start <number>',
      'Start working on issue',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .example('autopm issue start 123', 'Mark issue #123 as in-progress');
      },
      issueStart
    )
    .command(
      'close <number>',
      'Close and complete issue',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .example('autopm issue close 123', 'Mark issue #123 as completed');
      },
      issueClose
    )
    .command(
      'status <number>',
      'Check issue status',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .example('autopm issue status 123', 'Show status of issue #123');
      },
      issueStatus
    )
    .command(
      'edit <number>',
      'Edit issue in your editor',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .example('autopm issue edit 123', 'Open issue #123 in editor')
          .example('EDITOR=code autopm issue edit 123', 'Open in VS Code');
      },
      issueEdit
    )
    .command(
      'sync <number>',
      'Sync issue with GitHub/Azure',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .option('provider', {
            describe: 'Provider to sync with',
            type: 'string',
            choices: ['github', 'azure'],
            default: 'github'
          })
          .option('push', {
            describe: 'Push local changes to provider',
            type: 'boolean',
            default: false
          })
          .option('pull', {
            describe: 'Pull updates from provider',
            type: 'boolean',
            default: false
          })
          .example('autopm issue sync 123', 'Sync issue #123 with GitHub (default)')
          .example('autopm issue sync 123 --provider azure', 'Sync with Azure DevOps')
          .example('autopm issue sync 123 --push', 'Push local changes to GitHub')
          .example('autopm issue sync 123 --provider azure --push', 'Push to Azure DevOps');
      },
      issueSync
    )
    .command(
      'sync-status <number>',
      'Check sync status for issue',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .option('provider', {
            describe: 'Provider to check status with',
            type: 'string',
            choices: ['github', 'azure'],
            default: 'github'
          })
          .example('autopm issue sync-status 123', 'Check GitHub sync status (default)')
          .example('autopm issue sync-status 123 --provider azure', 'Check Azure DevOps sync status');
      },
      issueSyncStatus
    )
    .command(
      'sync-resolve <number>',
      'Resolve sync conflict',
      (yargs) => {
        return yargs
          .positional('number', {
            describe: 'Issue number',
            type: 'number'
          })
          .option('provider', {
            describe: 'Provider to resolve conflict with',
            type: 'string',
            choices: ['github', 'azure'],
            default: 'github'
          })
          .option('strategy', {
            describe: 'Resolution strategy',
            type: 'string',
            choices: ['local', 'remote', 'newest', 'manual'],
            demandOption: true
          })
          .example('autopm issue sync-resolve 123 --strategy newest', 'Use newest version (GitHub)')
          .example('autopm issue sync-resolve 123 --provider azure --strategy local', 'Use local version (Azure)');
      },
      issueSyncResolve
    )
    .demandCommand(1, 'You must specify an issue command')
    .strictCommands()
    .help();
}

/**
 * Command export
 */
module.exports = {
  command: 'issue',
  describe: 'Manage issues and task lifecycle',
  builder,
  handler: (argv) => {
    if (!argv._.includes('issue') || argv._.length === 1) {
      logger.log(chalk.yellow('\nPlease specify an issue command\n'));
      logger.log('Usage: autopm issue <command>\n');
      logger.log('Available commands:');
      logger.log('  show <number>         Display issue details');
      logger.log('  start <number>        Start working on issue');
      logger.log('  close <number>        Close issue');
      logger.log('  status <number>       Check issue status');
      logger.log('  edit <number>         Edit issue in editor');
      logger.log('  sync <number>         Sync with GitHub/Azure');
      logger.log('  sync-status <number>  Check sync status');
      logger.log('  sync-resolve <number> Resolve sync conflict');
      logger.log('\nUse: autopm issue <command> --help for more info\n');
    }
  },
  handlers: {
    show: issueShow,
    start: issueStart,
    close: issueClose,
    status: issueStatus,
    edit: issueEdit,
    sync: issueSync,
    syncStatus: issueSyncStatus,
    syncResolve: issueSyncResolve
  }
};
