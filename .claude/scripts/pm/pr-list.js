#!/usr/bin/env node
/**
 * PR List - List pull requests
 */

const { execSync } = require('child_process');

class PrLister {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      red: '\x1b[31m'
    };
  }

  execCommand(command, options = {}) {
    try {
      return execSync(command, { encoding: 'utf8', ...options }).trim();
    } catch (error) {
      if (!options.ignoreError) {
        throw error;
      }
      return null;
    }
  }

  checkGitHub() {
    try {
      this.execCommand('which gh', { ignoreError: false });
      return true;
    } catch {
      console.error('❌ GitHub CLI (gh) is not installed');
      console.log('💡 Install it with: brew install gh');
      console.log('💡 Or visit: https://cli.github.com/');
      return false;
    }
  }

  formatState(state) {
    const states = {
      'OPEN': `${this.colors.green}● OPEN${this.colors.reset}`,
      'CLOSED': `${this.colors.red}● CLOSED${this.colors.reset}`,
      'MERGED': `${this.colors.magenta}✓ MERGED${this.colors.reset}`
    };
    return states[state] || state;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 30) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
  }

  async listPrs(options = {}) {
    console.log(`\n📋 Pull Requests`);
    console.log(`${'═'.repeat(50)}\n`);

    // Check prerequisites
    if (!this.checkGitHub()) return false;

    // Build gh pr list command
    let command = 'gh pr list --json number,title,state,author,createdAt,headRefName,isDraft,url';

    if (options.state) {
      command += ` --state ${options.state}`;
    } else {
      command += ' --state all';
    }

    if (options.limit) {
      command += ` --limit ${options.limit}`;
    } else {
      command += ' --limit 20';
    }

    if (options.author) {
      command += ` --author ${options.author}`;
    }

    if (options.label) {
      command += ` --label "${options.label}"`;
    }

    if (options.assignee) {
      command += ` --assignee ${options.assignee}`;
    }

    try {
      const output = this.execCommand(command);
      const prs = JSON.parse(output);

      if (prs.length === 0) {
        console.log('No pull requests found');
        if (options.state) {
          console.log(`💡 Try removing --state ${options.state} filter`);
        }
        return true;
      }

      // Group by state if showing all
      if (!options.state || options.state === 'all') {
        const grouped = {
          open: [],
          merged: [],
          closed: []
        };

        prs.forEach(pr => {
          if (pr.state === 'OPEN') {
            grouped.open.push(pr);
          } else if (pr.state === 'MERGED') {
            grouped.merged.push(pr);
          } else {
            grouped.closed.push(pr);
          }
        });

        // Display open PRs
        if (grouped.open.length > 0) {
          console.log(`${this.colors.green}Open Pull Requests (${grouped.open.length})${this.colors.reset}`);
          console.log(`${'─'.repeat(50)}`);
          this.displayPrs(grouped.open);
          console.log('');
        }

        // Display merged PRs
        if (grouped.merged.length > 0) {
          console.log(`${this.colors.magenta}Merged Pull Requests (${grouped.merged.length})${this.colors.reset}`);
          console.log(`${'─'.repeat(50)}`);
          this.displayPrs(grouped.merged);
          console.log('');
        }

        // Display closed PRs
        if (grouped.closed.length > 0) {
          console.log(`${this.colors.red}Closed Pull Requests (${grouped.closed.length})${this.colors.reset}`);
          console.log(`${'─'.repeat(50)}`);
          this.displayPrs(grouped.closed);
        }
      } else {
        // Display all in one list
        this.displayPrs(prs);
      }

      // Show summary
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`Total: ${prs.length} pull request${prs.length > 1 ? 's' : ''}`);

      // Show commands
      console.log('\n💡 Commands:');
      console.log('  • View PR: gh pr view <number>');
      console.log('  • Checkout PR: gh pr checkout <number>');
      console.log('  • Review PR: gh pr review <number>');
      console.log('  • Merge PR: gh pr merge <number>');

      return true;
    } catch (error) {
      console.error('❌ Failed to list pull requests');
      console.error(error.message);

      if (error.message.includes('auth')) {
        console.log('\n💡 Authenticate with: gh auth login');
      }

      return false;
    }
  }

  displayPrs(prs) {
    prs.forEach((pr, index) => {
      const isDraft = pr.isDraft ? '[DRAFT] ' : '';
      const number = `#${pr.number}`.padEnd(6);
      const author = `@${pr.author.login}`.padEnd(15);
      const branch = pr.headRefName.substring(0, 25).padEnd(25);
      const age = this.formatDate(pr.createdAt);

      console.log(`${this.colors.bright}${number}${this.colors.reset} ${isDraft}${pr.title}`);
      console.log(`       ${this.colors.dim}${author} | ${branch} | ${age}${this.colors.reset}`);

      if (index < prs.length - 1) {
        console.log('');
      }
    });
  }

  async run(args) {
    const options = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--state' || arg === '-s') {
        options.state = args[++i];
      } else if (arg === '--author' || arg === '-a') {
        options.author = args[++i];
      } else if (arg === '--assignee') {
        options.assignee = args[++i];
      } else if (arg === '--label' || arg === '-l') {
        options.label = args[++i];
      } else if (arg === '--limit' || arg === '-n') {
        options.limit = parseInt(args[++i]);
      } else if (arg === '--mine' || arg === '-m') {
        options.author = '@me';
      } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: pm pr-list [options]');
        console.log('\nOptions:');
        console.log('  -s, --state <state>    Filter by state (open|closed|merged|all)');
        console.log('  -a, --author <user>    Filter by author');
        console.log('  -m, --mine             Show only your PRs');
        console.log('  --assignee <user>      Filter by assignee');
        console.log('  -l, --label <label>    Filter by label');
        console.log('  -n, --limit <number>   Limit number of results (default: 20)');
        console.log('\nExamples:');
        console.log('  pm pr-list                    # List all PRs');
        console.log('  pm pr-list --state open       # List open PRs');
        console.log('  pm pr-list --mine             # List your PRs');
        console.log('  pm pr-list --label bug        # List PRs with bug label');
        process.exit(0);
      }
    }

    const success = await this.listPrs(options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const lister = new PrLister();
  lister.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = PrLister;