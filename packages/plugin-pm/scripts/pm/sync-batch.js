#!/usr/bin/env node
/**
 * Batch Sync Command
 *
 * Synchronize multiple PRDs/Epics/Tasks to GitHub in batch operations
 * with parallel processing, rate limiting, and progress tracking.
 *
 * Usage:
 *   autopm sync:batch                    # Sync all items
 *   autopm sync:batch --type prd         # Sync only PRDs
 *   autopm sync:batch --type epic        # Sync only Epics
 *   autopm sync:batch --type task        # Sync only Tasks
 *   autopm sync:batch --dry-run          # Preview without syncing
 *   autopm sync:batch --concurrent 5     # Limit concurrency
 *
 * Features:
 *   - Parallel processing (default: 10 concurrent)
 *   - GitHub API rate limiting with backoff
 *   - Real-time progress tracking
 *   - Error recovery (continues on failures)
 *   - Dry run mode
 *
 * Performance:
 *   - 1000 items: < 30 seconds
 *   - Respects GitHub API limits (5000 req/hour)
 *   - Memory efficient: < 100MB for 1000 items
 */

const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { batchSyncAll, batchSyncPRDs, batchSyncEpics, batchSyncTasks } = require('../../../../lib/batch-processor-integration');

class SyncBatchCommand {
  constructor() {
    this.basePath = '.claude';
  }

  /**
   * Get GitHub repository info from git remote
   */
  async getRepoInfo() {
    const { execSync } = require('child_process');

    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

      // Parse GitHub URL: https://github.com/owner/repo.git or git@github.com:owner/repo.git
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);

      if (!match) {
        throw new Error('Could not parse GitHub repository URL');
      }

      return {
        owner: match[1],
        repo: match[2]
      };
    } catch (error) {
      throw new Error('Failed to get repository info. Are you in a Git repository with GitHub remote?');
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
📦 Batch Sync Command

Synchronize multiple PRDs/Epics/Tasks to GitHub in parallel.

Usage:
  autopm sync:batch [options]

Options:
  --type <type>       Type to sync: prd|epic|task|all (default: all)
  --dry-run           Preview without syncing
  --concurrent <n>    Max concurrent uploads (default: 10)
  --help              Show this help

Examples:
  autopm sync:batch                    # Sync all items
  autopm sync:batch --type prd         # Sync only PRDs
  autopm sync:batch --dry-run          # Preview changes
  autopm sync:batch --concurrent 5     # Limit to 5 parallel

Performance:
  - 1000 items: ~30 seconds
  - Rate limiting: Automatic backoff
  - Memory: < 100MB for 1000 items

Environment:
  GITHUB_TOKEN        GitHub personal access token (required)
`);
  }

  /**
   * Parse command line arguments
   */
  parseArgs(args) {
    const options = {
      type: 'all',
      dryRun: false,
      maxConcurrent: 10
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      } else if (arg === '--type' || arg === '-t') {
        options.type = args[++i];
        if (!['prd', 'epic', 'task', 'all'].includes(options.type)) {
          throw new Error(`Invalid type: ${options.type}. Must be: prd|epic|task|all`);
        }
      } else if (arg === '--dry-run' || arg === '-d') {
        options.dryRun = true;
      } else if (arg === '--concurrent' || arg === '-c') {
        options.maxConcurrent = parseInt(args[++i], 10);
        if (isNaN(options.maxConcurrent) || options.maxConcurrent < 1) {
          throw new Error('--concurrent must be a positive number');
        }
      } else {
        throw new Error(`Unknown option: ${arg}. Use --help for usage.`);
      }
    }

    return options;
  }

  /**
   * Format duration in human-readable form
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Print progress bar
   */
  printProgress(type, current, total) {
    const percentage = Math.floor((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.floor((current / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(`\r  [${type.toUpperCase().padEnd(5)}] ${bar} ${percentage}% (${current}/${total})`);

    if (current === total) {
      console.log(); // New line when complete
    }
  }

  /**
   * Run batch sync
   */
  async run(args) {
    try {
      // Parse arguments
      const options = this.parseArgs(args);

      // Check for GitHub token
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        console.error('❌ Error: GITHUB_TOKEN environment variable not set');
        console.error('\nSet your GitHub token:');
        console.error('  export GITHUB_TOKEN=your_token_here');
        console.error('\nOr create a .env file with:');
        console.error('  GITHUB_TOKEN=your_token_here');
        process.exit(1);
      }

      // Get repository info
      console.log('🔍 Detecting repository...');
      const repo = await this.getRepoInfo();
      console.log(`   Repository: ${repo.owner}/${repo.repo}`);

      // Initialize Octokit
      const octokit = new Octokit({ auth: githubToken });

      // Verify API access
      try {
        await octokit.rest.users.getAuthenticated();
      } catch (error) {
        console.error('❌ GitHub authentication failed. Check your GITHUB_TOKEN.');
        process.exit(1);
      }

      // Show configuration
      console.log('\n⚙️  Configuration:');
      console.log(`   Type: ${options.type}`);
      console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
      console.log(`   Max concurrent: ${options.maxConcurrent}`);

      // Start sync
      const startTime = Date.now();
      console.log(`\n🚀 Starting batch sync...${options.dryRun ? ' (DRY RUN)' : ''}\n`);

      let results;

      // Sync based on type
      if (options.type === 'all') {
        results = await batchSyncAll({
          basePath: this.basePath,
          owner: repo.owner,
          repo: repo.repo,
          octokit,
          dryRun: options.dryRun,
          maxConcurrent: options.maxConcurrent,
          onProgress: (type, current, total) => {
            this.printProgress(type, current, total);
          }
        });
      } else if (options.type === 'prd') {
        results = await batchSyncPRDs({
          basePath: this.basePath,
          owner: repo.owner,
          repo: repo.repo,
          octokit,
          dryRun: options.dryRun,
          maxConcurrent: options.maxConcurrent,
          onProgress: (current, total) => {
            this.printProgress('prd', current, total);
          }
        });
      } else if (options.type === 'epic') {
        results = await batchSyncEpics({
          basePath: this.basePath,
          owner: repo.owner,
          repo: repo.repo,
          octokit,
          dryRun: options.dryRun,
          maxConcurrent: options.maxConcurrent,
          onProgress: (current, total) => {
            this.printProgress('epic', current, total);
          }
        });
      } else if (options.type === 'task') {
        results = await batchSyncTasks({
          basePath: this.basePath,
          owner: repo.owner,
          repo: repo.repo,
          octokit,
          dryRun: options.dryRun,
          maxConcurrent: options.maxConcurrent,
          onProgress: (current, total) => {
            this.printProgress('task', current, total);
          }
        });
      }

      const duration = Date.now() - startTime;

      // Print summary
      console.log('\n' + '═'.repeat(50));
      console.log('📊 Batch Sync Summary');
      console.log('═'.repeat(50));

      if (options.type === 'all') {
        console.log(`\n📋 PRDs:     ${results.prds.succeeded}/${results.prds.total} synced`);
        console.log(`📚 Epics:    ${results.epics.succeeded}/${results.epics.total} synced`);
        console.log(`✅ Tasks:    ${results.tasks.succeeded}/${results.tasks.total} synced`);
        console.log(`\n📦 Total:    ${results.succeeded}/${results.total} items`);

        if (results.failed > 0) {
          console.log(`❌ Failed:   ${results.failed}`);
        }
      } else {
        console.log(`\n✅ Succeeded: ${results.succeeded}`);
        console.log(`❌ Failed:    ${results.failed}`);
        console.log(`📦 Total:     ${results.total}`);
      }

      console.log(`\n⏱️  Duration:  ${this.formatDuration(duration)}`);

      if (results.rateLimit) {
        console.log(`🔄 Rate limit: ${results.rateLimit.remaining} requests remaining`);
      }

      // Show errors if any
      if (results.errors && results.errors.length > 0) {
        console.log(`\n⚠️  Errors (${results.errors.length}):`);
        results.errors.slice(0, 5).forEach(err => {
          console.log(`   • ${err.item}: ${err.error}`);
        });

        if (results.errors.length > 5) {
          console.log(`   ... and ${results.errors.length - 5} more`);
        }
      }

      console.log('\n' + '═'.repeat(50));

      // Exit code based on results
      if (results.failed === 0) {
        console.log('✅ All items synced successfully!');
        process.exit(0);
      } else if (results.succeeded > 0) {
        console.log('⚠️  Partial sync completed (some errors)');
        process.exit(0);
      } else {
        console.log('❌ Sync failed');
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Error:', error.message);

      if (error.stack && process.env.DEBUG) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }

      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const command = new SyncBatchCommand();
  command.run(process.argv.slice(2));
}

module.exports = SyncBatchCommand;
