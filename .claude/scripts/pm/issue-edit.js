#!/usr/bin/env node
/**
 * Issue Edit - Edit issue details
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class IssueEditor {
  constructor() {
    this.issueDir = path.join('.claude', 'issues');
    this.activeWorkFile = path.join('.claude', 'active-work.json');
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

  async editIssue(issueId) {
    console.log(`\n📝 Editing Issue: ${issueId}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Find issue file
    const issueFile = path.join(this.issueDir, `${issueId}.md`);
    if (!fs.existsSync(issueFile)) {
      console.error(`❌ Issue file not found: ${issueId}`);
      console.log('\n💡 Available issues:');
      this.listAvailableIssues();
      return false;
    }

    // Read current content
    const currentContent = fs.readFileSync(issueFile, 'utf8');
    console.log('Current issue content:');
    console.log(`${'─'.repeat(50)}`);
    console.log(currentContent.substring(0, 500));
    if (currentContent.length > 500) {
      console.log('... (truncated)');
    }
    console.log(`${'─'.repeat(50)}\n`);

    // Create interface for editing
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    try {
      // Edit menu
      console.log('What would you like to edit?');
      console.log('  1. Title');
      console.log('  2. Description');
      console.log('  3. Add task');
      console.log('  4. Mark task complete');
      console.log('  5. Add note');
      console.log('  6. Change status');
      console.log('  7. Open in editor');
      console.log('  0. Cancel');

      const choice = await prompt('\nEnter choice (0-7): ');

      switch (choice) {
        case '1':
          await this.editTitle(issueFile, currentContent, rl, prompt);
          break;
        case '2':
          await this.editDescription(issueFile, currentContent, rl, prompt);
          break;
        case '3':
          await this.addTask(issueFile, currentContent, rl, prompt);
          break;
        case '4':
          await this.markTaskComplete(issueFile, currentContent, rl, prompt);
          break;
        case '5':
          await this.addNote(issueFile, currentContent, rl, prompt);
          break;
        case '6':
          await this.changeStatus(issueFile, currentContent, rl, prompt);
          break;
        case '7':
          await this.openInEditor(issueFile);
          break;
        case '0':
          console.log('Edit cancelled.');
          break;
        default:
          console.log('Invalid choice.');
      }
    } finally {
      rl.close();
    }

    // Show updated content
    if (choice !== '0' && choice !== '7') {
      const updatedContent = fs.readFileSync(issueFile, 'utf8');
      console.log('\n✅ Issue updated successfully!');
      console.log('\nUpdated content preview:');
      console.log(`${'─'.repeat(50)}`);
      console.log(updatedContent.substring(0, 300));
      if (updatedContent.length > 300) {
        console.log('... (truncated)');
      }
    }

    return true;
  }

  async editTitle(issueFile, content, rl, prompt) {
    const newTitle = await prompt('Enter new title: ');
    if (newTitle) {
      const updated = content.replace(/^# .+$/m, `# Issue: ${newTitle}`);
      fs.writeFileSync(issueFile, updated);
      console.log('✅ Title updated');
    }
  }

  async editDescription(issueFile, content, rl, prompt) {
    console.log('Enter new description (end with empty line):');
    let description = '';
    let line;
    while ((line = await prompt('')) !== '') {
      description += line + '\n';
    }

    if (description) {
      const updated = content.replace(
        /(## Description\n)([\s\S]*?)(\n##|$)/,
        `$1${description}$3`
      );
      fs.writeFileSync(issueFile, updated);
      console.log('✅ Description updated');
    }
  }

  async addTask(issueFile, content, rl, prompt) {
    const task = await prompt('Enter new task: ');
    if (task) {
      const updated = content.replace(
        /(## Tasks\n([\s\S]*?))\n(\n##|$)/,
        `$1\n- [ ] ${task}\n$3`
      );
      fs.writeFileSync(issueFile, updated);
      console.log('✅ Task added');
    }
  }

  async markTaskComplete(issueFile, content, rl, prompt) {
    // Extract tasks
    const taskMatches = content.match(/- \[ \] .+/g) || [];

    if (taskMatches.length === 0) {
      console.log('No incomplete tasks found.');
      return;
    }

    console.log('\nIncomplete tasks:');
    taskMatches.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.replace('- [ ] ', '')}`);
    });

    const taskNum = await prompt(`\nSelect task to complete (1-${taskMatches.length}): `);
    const index = parseInt(taskNum) - 1;

    if (index >= 0 && index < taskMatches.length) {
      const taskToComplete = taskMatches[index];
      const updated = content.replace(
        taskToComplete,
        taskToComplete.replace('- [ ]', '- [x]')
      );
      fs.writeFileSync(issueFile, updated);
      console.log('✅ Task marked as complete');
    }
  }

  async addNote(issueFile, content, rl, prompt) {
    const note = await prompt('Enter note: ');
    if (note) {
      const timestamp = new Date().toISOString();
      const noteEntry = `- ${timestamp}: ${note}\n`;

      if (!content.includes('## Notes')) {
        // Add notes section
        const updated = content + `\n## Notes\n${noteEntry}`;
        fs.writeFileSync(issueFile, updated);
      } else {
        // Add to existing notes
        const updated = content.replace(
          /(## Notes\n([\s\S]*?))\n(\n##|$)/,
          `$1\n${noteEntry}$3`
        );
        fs.writeFileSync(issueFile, updated);
      }
      console.log('✅ Note added');
    }
  }

  async changeStatus(issueFile, content, rl, prompt) {
    console.log('\nSelect new status:');
    console.log('  1. Not Started');
    console.log('  2. In Progress');
    console.log('  3. Blocked');
    console.log('  4. Review');
    console.log('  5. Completed');

    const choice = await prompt('Enter choice (1-5): ');
    const statuses = ['Not Started', 'In Progress', 'Blocked', 'Review', 'Completed'];

    if (choice >= '1' && choice <= '5') {
      const newStatus = statuses[parseInt(choice) - 1];
      const updated = content.replace(
        /\*\*State\*\*: .+/,
        `**State**: ${newStatus}`
      );
      fs.writeFileSync(issueFile, updated);
      console.log(`✅ Status changed to: ${newStatus}`);

      // Update active work if needed
      if (newStatus === 'In Progress') {
        this.updateActiveWork(path.basename(issueFile, '.md'), newStatus);
      }
    }
  }

  updateActiveWork(issueId, status) {
    const activeWork = this.loadActiveWork();
    const issue = activeWork.issues.find(i => i.id === issueId);
    if (issue) {
      issue.status = status.toLowerCase().replace(' ', '-');
      fs.writeFileSync(this.activeWorkFile, JSON.stringify(activeWork, null, 2));
    }
  }

  async openInEditor(issueFile) {
    const { exec } = require('child_process');
    const editor = process.env.EDITOR || 'vi';

    console.log(`Opening in ${editor}...`);
    exec(`${editor} "${issueFile}"`, (error) => {
      if (error) {
        console.error(`Failed to open editor: ${error.message}`);
      } else {
        console.log('✅ Editor closed');
      }
    });
  }

  listAvailableIssues() {
    if (fs.existsSync(this.issueDir)) {
      const issues = fs.readdirSync(this.issueDir)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));

      if (issues.length > 0) {
        issues.forEach(issue => {
          console.log(`  • ${issue}`);
        });
      } else {
        console.log('  No issues found');
      }
    }

    // Also show from active work
    const activeWork = this.loadActiveWork();
    if (activeWork.issues.length > 0) {
      console.log('\nActive issues:');
      activeWork.issues.forEach(issue => {
        console.log(`  • ${issue.id}`);
      });
    }
  }

  async run(args) {
    const issueId = args[0];

    if (!issueId) {
      console.error('❌ Error: Issue ID required');
      console.error('Usage: pm issue-edit <issue-id>');
      console.log('\nAvailable issues:');
      this.listAvailableIssues();
      process.exit(1);
    }

    const success = await this.editIssue(issueId);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const editor = new IssueEditor();
  editor.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = IssueEditor;