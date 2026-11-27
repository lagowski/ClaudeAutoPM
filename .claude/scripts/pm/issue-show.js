#!/usr/bin/env node
/**
 * Issue Show - Display issue details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IssueShower {
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

  formatDuration(startTime, endTime = null) {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end - start;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  async showIssue(issueId, options = {}) {
    const provider = options.provider || this.detectProvider();

    console.log(`\n📋 Issue Details: ${issueId}`);
    console.log(`${'─'.repeat(50)}\n`);

    // Try provider-specific show command first
    const providerScript = path.join(this.providersDir, provider, 'issue-show.js');
    if (fs.existsSync(providerScript) && !options.local) {
      try {
        console.log(`📦 Provider: ${provider}\n`);
        require(providerScript);
        return;
      } catch (error) {
        console.log(`⚠️  Provider script failed, showing local data\n`);
      }
    }

    // Check if issue is in active work
    const activeWork = this.loadActiveWork();
    const activeIssue = activeWork.issues.find(i => i.id === issueId);

    // Check if issue is in completed work
    const completedWork = this.loadCompletedWork();
    const completedIssue = completedWork.issues.find(i => i.id === issueId);

    // Show status from tracking
    if (activeIssue || completedIssue) {
      const issue = activeIssue || completedIssue;
      console.log('📊 Status Information:');
      console.log(`  • State: ${issue.status === 'completed' ? '✅ Completed' : '🔄 In Progress'}`);
      console.log(`  • Provider: ${issue.provider}`);
      console.log(`  • Started: ${new Date(issue.startedAt).toLocaleString()}`);

      if (completedIssue) {
        console.log(`  • Completed: ${new Date(completedIssue.completedAt).toLocaleString()}`);
        console.log(`  • Duration: ${completedIssue.duration || this.formatDuration(completedIssue.startedAt, completedIssue.completedAt)}`);
      } else {
        console.log(`  • Duration: ${this.formatDuration(activeIssue.startedAt)} (ongoing)`);
      }
      console.log('');
    }

    // Show local issue file if exists
    const issueFile = path.join(this.issueDir, `${issueId}.md`);
    if (fs.existsSync(issueFile)) {
      console.log('📄 Issue Content:');
      console.log(`${'─'.repeat(50)}`);

      const content = fs.readFileSync(issueFile, 'utf8');
      const lines = content.split('\n');

      let inSection = false;
      let sectionContent = [];

      lines.forEach(line => {
        // Skip the main title
        if (line.startsWith('# Issue')) return;

        // Handle sections
        if (line.startsWith('## ')) {
          if (sectionContent.length > 0) {
            console.log(sectionContent.join('\n'));
            sectionContent = [];
          }
          console.log(`\n${line.replace('## ', '🔹 ').toUpperCase()}`);
          console.log(`${'─'.repeat(30)}`);
          inSection = true;
        } else if (inSection && line.trim()) {
          // Format different types of content
          if (line.startsWith('- [x]')) {
            console.log('  ✅' + line.substring(5));
          } else if (line.startsWith('- [ ]')) {
            console.log('  ⬜' + line.substring(5));
          } else if (line.startsWith('- ')) {
            console.log('  •' + line.substring(1));
          } else if (line.startsWith('**')) {
            console.log('  ' + line);
          } else {
            console.log('  ' + line);
          }
        }
      });

      console.log('');
    } else if (!activeIssue && !completedIssue) {
      console.log('❌ Issue not found locally\n');

      // Suggest checking with provider
      if (!options.local) {
        console.log(`💡 Try fetching from ${provider}:`);
        console.log(`   pm issue-show ${issueId} --fetch`);
      }
    }

    // Show related issues if any
    if (activeWork.issues.length > 1 || completedWork.issues.length > 0) {
      console.log(`${'─'.repeat(50)}`);
      console.log('\n📚 Related Issues:');

      if (activeWork.issues.length > 0) {
        console.log('\n🔄 Active:');
        activeWork.issues
          .filter(i => i.id !== issueId)
          .slice(0, 3)
          .forEach(issue => {
            const duration = this.formatDuration(issue.startedAt);
            console.log(`  • ${issue.id} - ${duration} elapsed`);
          });
      }

      if (completedWork.issues.length > 0) {
        console.log('\n✅ Recently Completed:');
        completedWork.issues
          .filter(i => i.id !== issueId)
          .slice(0, 3)
          .forEach(issue => {
            const date = new Date(issue.completedAt).toLocaleDateString();
            console.log(`  • ${issue.id} - completed ${date}`);
          });
      }
    }

    // Show available actions
    console.log(`\n${'─'.repeat(50)}`);
    console.log('\n💡 Available Actions:');

    if (activeIssue) {
      console.log('  • Close issue: pm issue-close', issueId);
      console.log('  • Edit issue: pm issue-edit', issueId);
    } else if (completedIssue) {
      console.log('  • Reopen issue: pm issue-reopen', issueId);
    } else {
      console.log('  • Start work: pm issue-start', issueId);
    }

    console.log('  • List all issues: pm in-progress');
    console.log('  • View status: pm status');
  }

  async run(args) {
    const issueId = args[0];

    if (!issueId) {
      console.error('❌ Error: Issue ID required');
      console.error('Usage: pm issue-show <issue-id> [--local] [--fetch]');

      // Show recent issues
      const activeWork = this.loadActiveWork();
      const completedWork = this.loadCompletedWork();

      if (activeWork.issues.length > 0 || completedWork.issues.length > 0) {
        console.log('\n📋 Recent issues:');

        if (activeWork.issues.length > 0) {
          console.log('\nActive:');
          activeWork.issues.slice(0, 3).forEach(issue => {
            console.log(`  • ${issue.id} - ${issue.status}`);
          });
        }

        if (completedWork.issues.length > 0) {
          console.log('\nCompleted:');
          completedWork.issues.slice(0, 3).forEach(issue => {
            const date = new Date(issue.completedAt).toLocaleDateString();
            console.log(`  • ${issue.id} - ${date}`);
          });
        }
      }

      process.exit(1);
    }

    const options = {};
    args.slice(1).forEach(arg => {
      if (arg === '--local') {
        options.local = true;
      } else if (arg === '--fetch') {
        options.fetch = true;
      } else if (arg.startsWith('--provider=')) {
        options.provider = arg.split('=')[1];
      }
    });

    await this.showIssue(issueId, options);
  }
}

// Main execution
if (require.main === module) {
  const shower = new IssueShower();
  shower.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = IssueShower;