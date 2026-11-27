#!/usr/bin/env node
/**
 * Issue Close - Close/complete an issue
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IssueCloser {
  constructor() {
    this.providersDir = path.join(__dirname, '..', '..', 'providers');
    this.issueDir = path.join('.claude', 'issues');
    this.activeWorkFile = path.join('.claude', 'active-work.json');
    this.completedFile = path.join('.claude', 'completed-work.json');
  }

  detectProvider() {
    if (fs.existsSync('.azure') || process.env.AZURE_DEVOPS_ORG) {
      return 'azure';
    }

    if (fs.existsSync('.github') || fs.existsSync('.git')) {
      try {
        const remoteUrl = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' });
        if (remoteUrl.includes('github.com')) {
          return 'github';
        }
      } catch {}
    }

    return 'local';
  }

  loadActiveWork() {
    if (!fs.existsSync(this.activeWorkFile)) {
      return { issues: [], epics: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.activeWorkFile, 'utf8'));
    } catch {
      return { issues: [], epics: [] };
    }
  }

  saveActiveWork(activeWork) {
    const dir = path.dirname(this.activeWorkFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.activeWorkFile, JSON.stringify(activeWork, null, 2));
  }

  loadCompletedWork() {
    if (!fs.existsSync(this.completedFile)) {
      return { issues: [], epics: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.completedFile, 'utf8'));
    } catch {
      return { issues: [], epics: [] };
    }
  }

  saveCompletedWork(completedWork) {
    const dir = path.dirname(this.completedFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.completedFile, JSON.stringify(completedWork, null, 2));
  }

  async closeIssue(issueId, options = {}) {
    const provider = options.provider || this.detectProvider();
    console.log(`🔒 Closing issue: ${issueId}`);
    console.log(`📦 Provider: ${provider}\n`);

    // Move from active to completed
    const activeWork = this.loadActiveWork();
    const completedWork = this.loadCompletedWork();

    const activeIssue = activeWork.issues.find(i => i.id === issueId);
    if (activeIssue) {
      // Remove from active
      activeWork.issues = activeWork.issues.filter(i => i.id !== issueId);
      this.saveActiveWork(activeWork);

      // Add to completed
      const completedEntry = {
        ...activeIssue,
        completedAt: new Date().toISOString(),
        status: 'completed',
        duration: this.calculateDuration(activeIssue.startedAt)
      };

      completedWork.issues.unshift(completedEntry);

      // Keep only last 100 completed issues
      if (completedWork.issues.length > 100) {
        completedWork.issues = completedWork.issues.slice(0, 100);
      }

      this.saveCompletedWork(completedWork);
      console.log(`✅ Issue moved to completed work`);
      console.log(`⏱️  Duration: ${completedEntry.duration}`);
    }

    // Try to use provider-specific close command
    const providerScript = path.join(this.providersDir, provider, 'issue-close.js');
    if (fs.existsSync(providerScript)) {
      console.log(`\nUsing ${provider} provider to close issue...`);
      try {
        require(providerScript);
        return;
      } catch (error) {
        console.log(`⚠️  Provider script failed, using local tracking`);
      }
    }

    // Update local issue file
    const issueFile = path.join(this.issueDir, `${issueId}.md`);
    if (fs.existsSync(issueFile)) {
      let content = fs.readFileSync(issueFile, 'utf8');

      // Update status in file
      content = content.replace(/\*\*State\*\*: .*/g, '**State**: Closed');

      // Add completion note
      const completionNote = `\n- ${new Date().toISOString()}: Issue closed`;
      if (!content.includes('## Updates')) {
        content += '\n## Updates\n' + completionNote;
      } else {
        content = content.replace(/(## Updates[\s\S]*?)$/, '$1' + completionNote + '\n');
      }

      // Mark all tasks as complete (optional)
      if (options.completeTasks) {
        content = content.replace(/- \[ \]/g, '- [x]');
      }

      fs.writeFileSync(issueFile, content);
      console.log(`✅ Updated issue file: ${issueFile}`);
    }

    // Display summary
    console.log('\n📊 Issue Closed:');
    console.log(`  • ID: ${issueId}`);
    console.log(`  • Status: Closed`);
    console.log(`  • Closed: ${new Date().toLocaleString()}`);

    if (activeIssue) {
      console.log(`  • Duration: ${this.calculateDuration(activeIssue.startedAt)}`);
    }

    // Show next steps
    console.log('\n💡 Next steps:');
    console.log(`  • View completed work: pm status`);
    console.log(`  • Start new issue: pm issue-start <issue-id>`);
    console.log(`  • View active work: pm in-progress`);

    // Show remaining active issues
    const remainingActive = this.loadActiveWork();
    if (remainingActive.issues.length > 0) {
      console.log('\n📋 Remaining active issues:');
      remainingActive.issues.slice(0, 3).forEach(issue => {
        const date = new Date(issue.startedAt).toLocaleDateString();
        console.log(`  • ${issue.id} - started ${date}`);
      });
    }
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const end = new Date();
    const diff = end - start;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  async run(args) {
    const issueId = args[0];

    if (!issueId) {
      console.error('❌ Error: Issue ID required');
      console.error('Usage: pm issue-close <issue-id> [--complete-tasks] [--provider=azure|github]');

      // Show active work
      const activeWork = this.loadActiveWork();
      if (activeWork.issues.length > 0) {
        console.log('\n📋 Active issues that can be closed:');
        activeWork.issues.slice(0, 5).forEach(issue => {
          const date = new Date(issue.startedAt).toLocaleDateString();
          console.log(`  • ${issue.id} (${issue.provider}) - started ${date}`);
        });
      }

      process.exit(1);
    }

    const options = {};
    args.slice(1).forEach(arg => {
      if (arg.startsWith('--provider=')) {
        options.provider = arg.split('=')[1];
      } else if (arg === '--complete-tasks') {
        options.completeTasks = true;
      }
    });

    await this.closeIssue(issueId, options);
  }
}

// Main execution
if (require.main === module) {
  const closer = new IssueCloser();
  closer.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = IssueCloser;