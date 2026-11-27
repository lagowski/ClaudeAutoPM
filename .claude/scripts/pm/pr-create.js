#!/usr/bin/env node
/**
 * PR Create - Create a pull request from current branch
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PrCreator {
  constructor() {
    this.activeWorkFile = path.join('.claude', 'active-work.json');
    this.completedWorkFile = path.join('.claude', 'completed-work.json');
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
    // Check if gh CLI is installed
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

  checkAuth() {
    try {
      this.execCommand('gh auth status');
      return true;
    } catch {
      console.error('❌ Not authenticated with GitHub');
      console.log('💡 Run: gh auth login');
      return false;
    }
  }

  getCurrentBranch() {
    return this.execCommand('git branch --show-current');
  }

  getDefaultBranch() {
    try {
      // Try to get default branch from GitHub
      const defaultBranch = this.execCommand('gh repo view --json defaultBranchRef -q .defaultBranchRef.name');
      return defaultBranch || 'main';
    } catch {
      // Fallback to common defaults
      const branches = this.execCommand('git branch -r').split('\n');
      if (branches.some(b => b.includes('main'))) return 'main';
      if (branches.some(b => b.includes('master'))) return 'master';
      return 'main';
    }
  }

  getRecentCommits(limit = 10) {
    return this.execCommand(`git log --oneline -${limit}`).split('\n');
  }

  getDiffSummary(baseBranch) {
    try {
      return this.execCommand(`git diff ${baseBranch}...HEAD --stat`);
    } catch {
      return 'Unable to generate diff summary';
    }
  }

  loadWorkItems() {
    const items = {
      issues: [],
      epics: []
    };

    // Load active work
    if (fs.existsSync(this.activeWorkFile)) {
      try {
        const activeWork = JSON.parse(fs.readFileSync(this.activeWorkFile, 'utf8'));
        items.issues = items.issues.concat(activeWork.issues || []);
        items.epics = items.epics.concat(activeWork.epics || []);
      } catch {}
    }

    // Load recent completed work
    if (fs.existsSync(this.completedWorkFile)) {
      try {
        const completedWork = JSON.parse(fs.readFileSync(this.completedWorkFile, 'utf8'));
        const recentCompleted = (completedWork.issues || [])
          .filter(i => {
            const completedDate = new Date(i.completedAt);
            const daysSince = (Date.now() - completedDate) / (1000 * 60 * 60 * 24);
            return daysSince < 7; // Last 7 days
          });
        items.issues = items.issues.concat(recentCompleted);
      } catch {}
    }

    return items;
  }

  generatePrBody(options = {}) {
    const workItems = this.loadWorkItems();
    const currentBranch = this.getCurrentBranch();
    const baseBranch = options.base || this.getDefaultBranch();
    const diffSummary = this.getDiffSummary(baseBranch);

    let body = '';

    // Description
    if (options.description) {
      body += `## Description\n${options.description}\n\n`;
    } else {
      body += `## Description\n[Please provide a brief description of the changes]\n\n`;
    }

    // Related Issues
    if (workItems.issues.length > 0) {
      body += `## Related Issues\n`;
      workItems.issues.forEach(issue => {
        body += `- ${issue.id}: ${issue.status}\n`;
      });
      body += '\n';
    }

    // Related Epics
    if (workItems.epics.length > 0) {
      body += `## Related Epics\n`;
      workItems.epics.forEach(epic => {
        body += `- ${epic.name}\n`;
      });
      body += '\n';
    }

    // Changes Summary
    body += `## Changes Summary\n\`\`\`\n${diffSummary}\n\`\`\`\n\n`;

    // Testing
    body += `## Testing\n`;
    body += `- [ ] Tests pass locally\n`;
    body += `- [ ] New tests added for new features\n`;
    body += `- [ ] Existing tests updated as needed\n\n`;

    // Checklist
    body += `## Checklist\n`;
    body += `- [ ] Code follows project style guidelines\n`;
    body += `- [ ] Self-review completed\n`;
    body += `- [ ] Documentation updated\n`;
    body += `- [ ] No console.log or debug statements\n`;
    body += `- [ ] No sensitive information exposed\n\n`;

    // Footer
    body += `---\n`;
    body += `*Created with PM System*\n`;
    body += `*Branch: ${currentBranch} → ${baseBranch}*`;

    return body;
  }

  async createPr(title, options = {}) {
    console.log(`\n🚀 Creating Pull Request`);
    console.log(`${'═'.repeat(50)}\n`);

    // Check prerequisites
    if (!this.checkGitHub()) return false;
    if (!this.checkAuth()) return false;

    const currentBranch = this.getCurrentBranch();
    const baseBranch = options.base || this.getDefaultBranch();

    // Check if on default branch
    if (currentBranch === baseBranch) {
      console.error(`❌ Cannot create PR from ${baseBranch} to itself`);
      console.log(`💡 Create a feature branch first`);
      return false;
    }

    // Check for uncommitted changes
    const status = this.execCommand('git status --short');
    if (status) {
      console.log('⚠️  You have uncommitted changes:');
      console.log(status);
      console.log('\n💡 Commit your changes first');
      return false;
    }

    // Push branch to remote
    console.log(`📤 Pushing branch '${currentBranch}' to remote...`);
    try {
      this.execCommand(`git push -u origin ${currentBranch}`);
    } catch (error) {
      console.error('❌ Failed to push branch');
      console.log('💡 Check your remote configuration');
      return false;
    }

    // Generate PR body
    const body = options.body || this.generatePrBody(options);

    // Create PR using gh CLI
    console.log('\n📝 Creating pull request...');

    let command = `gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --base ${baseBranch}`;

    if (options.draft) {
      command += ' --draft';
    }

    if (options.assignee) {
      command += ` --assignee ${options.assignee}`;
    }

    if (options.reviewer) {
      command += ` --reviewer ${options.reviewer}`;
    }

    if (options.label) {
      command += ` --label "${options.label}"`;
    }

    try {
      const prUrl = this.execCommand(command);
      console.log('\n✅ Pull request created successfully!');
      console.log(`\n🔗 PR URL: ${prUrl}`);

      // Show next steps
      console.log('\n💡 Next Steps:');
      console.log('  • Review the PR in browser');
      console.log('  • Request reviews from team members');
      console.log('  • Monitor CI/CD checks');
      console.log('  • Address any feedback');

      return true;
    } catch (error) {
      console.error('❌ Failed to create pull request');
      console.error(error.message);

      // Check if PR already exists
      if (error.message.includes('already exists')) {
        console.log('\n💡 A PR already exists for this branch');
        console.log('   View it with: gh pr view');
        console.log('   Or create with a different branch');
      }

      return false;
    }
  }

  async run(args) {
    let title = '';
    const options = {};

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === '--base' || arg === '-b') {
        options.base = args[++i];
      } else if (arg === '--draft' || arg === '-d') {
        options.draft = true;
      } else if (arg === '--assignee' || arg === '-a') {
        options.assignee = args[++i];
      } else if (arg === '--reviewer' || arg === '-r') {
        options.reviewer = args[++i];
      } else if (arg === '--label' || arg === '-l') {
        options.label = args[++i];
      } else if (arg === '--description' || arg === '-m') {
        options.description = args[++i];
      } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: pm pr-create "<title>" [options]');
        console.log('\nOptions:');
        console.log('  -b, --base <branch>      Base branch (default: main)');
        console.log('  -d, --draft              Create as draft PR');
        console.log('  -a, --assignee <user>    Assign to user');
        console.log('  -r, --reviewer <user>    Request review from user');
        console.log('  -l, --label <label>      Add label to PR');
        console.log('  -m, --description <text> PR description');
        console.log('\nExamples:');
        console.log('  pm pr-create "Add new feature"');
        console.log('  pm pr-create "Fix bug" --draft');
        console.log('  pm pr-create "Update docs" --base develop --reviewer teammate');
        process.exit(0);
      } else if (!title) {
        title = arg;
      }

      i++;
    }

    if (!title) {
      // Interactive mode
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      title = await new Promise(resolve => {
        rl.question('Enter PR title: ', answer => {
          rl.close();
          resolve(answer);
        });
      });

      if (!title) {
        console.error('❌ PR title is required');
        process.exit(1);
      }
    }

    const success = await this.createPr(title, options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const creator = new PrCreator();
  creator.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = PrCreator;