#!/usr/bin/env node
/**
 * Epic Edit - Edit epic details
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class EpicEditor {
  constructor() {
    this.epicsDir = path.join('.claude', 'epics');
    this.prdsDir = path.join('.claude', 'prds');
    this.activeWorkFile = path.join('.claude', 'active-work.json');
  }

  findEpicFile(epicName) {
    // Check epics directory
    let epicPath = path.join(this.epicsDir, `${epicName}.md`);
    if (fs.existsSync(epicPath)) {
      return epicPath;
    }

    // Check PRDs directory
    epicPath = path.join(this.prdsDir, `${epicName}.md`);
    if (fs.existsSync(epicPath)) {
      return epicPath;
    }

    return null;
  }

  async editEpic(epicName) {
    console.log(`\n📝 Editing Epic: ${epicName}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Find epic file
    const epicFile = this.findEpicFile(epicName);
    if (!epicFile) {
      console.error(`❌ Epic not found: ${epicName}`);
      console.log('\n💡 Available epics:');
      this.listAvailableEpics();
      return false;
    }

    // Read current content
    const currentContent = fs.readFileSync(epicFile, 'utf8');
    console.log('Current epic content:');
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
      console.log('  3. Add milestone');
      console.log('  4. Mark milestone complete');
      console.log('  5. Add technical requirement');
      console.log('  6. Update metadata');
      console.log('  7. Open in editor');
      console.log('  0. Cancel');

      const choice = await prompt('\nEnter choice (0-7): ');

      switch (choice) {
        case '1':
          await this.editTitle(epicFile, currentContent, rl, prompt);
          break;
        case '2':
          await this.editDescription(epicFile, currentContent, rl, prompt);
          break;
        case '3':
          await this.addMilestone(epicFile, currentContent, rl, prompt);
          break;
        case '4':
          await this.markMilestoneComplete(epicFile, currentContent, rl, prompt);
          break;
        case '5':
          await this.addTechnicalRequirement(epicFile, currentContent, rl, prompt);
          break;
        case '6':
          await this.updateMetadata(epicFile, currentContent, rl, prompt);
          break;
        case '7':
          await this.openInEditor(epicFile);
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
      const updatedContent = fs.readFileSync(epicFile, 'utf8');
      console.log('\n✅ Epic updated successfully!');
      console.log('\nUpdated content preview:');
      console.log(`${'─'.repeat(50)}`);
      console.log(updatedContent.substring(0, 300));
      if (updatedContent.length > 300) {
        console.log('... (truncated)');
      }
    }

    return true;
  }

  async editTitle(epicFile, content, rl, prompt) {
    const newTitle = await prompt('Enter new title: ');
    if (newTitle) {
      const updated = content.replace(/^# .+$/m, `# ${newTitle}`);
      fs.writeFileSync(epicFile, updated);
      console.log('✅ Title updated');
    }
  }

  async editDescription(epicFile, content, rl, prompt) {
    console.log('Enter new description (end with empty line):');
    let description = '';
    let line;
    while ((line = await prompt('')) !== '') {
      description += line + '\n';
    }

    if (description) {
      const updated = content.replace(
        /(## Overview\n)([\s\S]*?)(\n##|$)/,
        `$1${description}$3`
      );
      fs.writeFileSync(epicFile, updated);
      console.log('✅ Description updated');
    }
  }

  async addMilestone(epicFile, content, rl, prompt) {
    const milestone = await prompt('Enter new milestone: ');
    if (milestone) {
      let updated = content;

      if (!content.includes('## Milestones')) {
        // Add milestones section
        updated = content.replace(
          /(## Implementation Plan|## Tasks)/,
          `## Milestones\n- [ ] ${milestone}\n\n$1`
        );
      } else {
        // Add to existing milestones
        updated = content.replace(
          /(## Milestones\n([\s\S]*?))\n(\n##|$)/,
          `$1\n- [ ] ${milestone}\n$3`
        );
      }

      fs.writeFileSync(epicFile, updated);
      console.log('✅ Milestone added');
    }
  }

  async markMilestoneComplete(epicFile, content, rl, prompt) {
    // Extract milestones
    const milestoneMatches = content.match(/- \[ \] .+/g) || [];

    if (milestoneMatches.length === 0) {
      console.log('No incomplete milestones found.');
      return;
    }

    console.log('\nIncomplete milestones:');
    milestoneMatches.forEach((milestone, index) => {
      console.log(`  ${index + 1}. ${milestone.replace('- [ ] ', '')}`);
    });

    const milestoneNum = await prompt(`\nSelect milestone to complete (1-${milestoneMatches.length}): `);
    const index = parseInt(milestoneNum) - 1;

    if (index >= 0 && index < milestoneMatches.length) {
      const milestoneToComplete = milestoneMatches[index];
      const updated = content.replace(
        milestoneToComplete,
        milestoneToComplete.replace('- [ ]', '- [x]')
      );
      fs.writeFileSync(epicFile, updated);
      console.log('✅ Milestone marked as complete');
    }
  }

  async addTechnicalRequirement(epicFile, content, rl, prompt) {
    const requirement = await prompt('Enter technical requirement: ');
    if (requirement) {
      let updated = content;

      if (!content.includes('## Technical Requirements')) {
        // Add technical requirements section
        updated = content.replace(
          /(## Implementation Plan|## Tasks)/,
          `## Technical Requirements\n- ${requirement}\n\n$1`
        );
      } else {
        // Add to existing requirements
        updated = content.replace(
          /(## Technical Requirements\n([\s\S]*?))\n(\n##|$)/,
          `$1\n- ${requirement}\n$3`
        );
      }

      fs.writeFileSync(epicFile, updated);
      console.log('✅ Technical requirement added');
    }
  }

  async updateMetadata(epicFile, content, rl, prompt) {
    console.log('\nSelect metadata to update:');
    console.log('  1. Status');
    console.log('  2. Priority');
    console.log('  3. Estimated effort');
    console.log('  4. Tags');

    const choice = await prompt('Enter choice (1-4): ');

    switch (choice) {
      case '1':
        const status = await prompt('Enter new status (planning/in-progress/review/completed): ');
        if (status) {
          const updated = this.updateMetadataField(content, 'status', status);
          fs.writeFileSync(epicFile, updated);
          console.log('✅ Status updated');
        }
        break;
      case '2':
        const priority = await prompt('Enter new priority (P0/P1/P2/P3): ');
        if (priority) {
          const updated = this.updateMetadataField(content, 'priority', priority);
          fs.writeFileSync(epicFile, updated);
          console.log('✅ Priority updated');
        }
        break;
      case '3':
        const effort = await prompt('Enter estimated effort (e.g., 2d, 1w, 3w): ');
        if (effort) {
          const updated = this.updateMetadataField(content, 'effort', effort);
          fs.writeFileSync(epicFile, updated);
          console.log('✅ Effort estimate updated');
        }
        break;
      case '4':
        const tags = await prompt('Enter tags (comma-separated): ');
        if (tags) {
          const updated = this.updateMetadataField(content, 'tags', tags);
          fs.writeFileSync(epicFile, updated);
          console.log('✅ Tags updated');
        }
        break;
    }
  }

  updateMetadataField(content, field, value) {
    const lines = content.split('\n');
    const updatedLines = [];
    let inMetadata = false;
    let fieldFound = false;

    for (const line of lines) {
      if (line.startsWith('---') && !inMetadata) {
        inMetadata = true;
        updatedLines.push(line);
      } else if (line.startsWith('---') && inMetadata) {
        if (!fieldFound) {
          // Add field before closing metadata
          updatedLines.push(`${field}: ${value}`);
        }
        updatedLines.push(line);
        inMetadata = false;
      } else if (inMetadata && line.startsWith(`${field}:`)) {
        updatedLines.push(`${field}: ${value}`);
        fieldFound = true;
      } else {
        updatedLines.push(line);
      }
    }

    // If no metadata section exists, add one
    if (!fieldFound && !content.includes('---')) {
      const titleIndex = updatedLines.findIndex(line => line.startsWith('# '));
      if (titleIndex !== -1) {
        updatedLines.splice(titleIndex + 1, 0,
          '',
          '---',
          `${field}: ${value}`,
          '---',
          ''
        );
      }
    }

    return updatedLines.join('\n');
  }

  async openInEditor(epicFile) {
    const { exec } = require('child_process');
    const editor = process.env.EDITOR || 'vi';

    console.log(`Opening in ${editor}...`);
    exec(`${editor} "${epicFile}"`, (error) => {
      if (error) {
        console.error(`Failed to open editor: ${error.message}`);
      } else {
        console.log('✅ Editor closed');
      }
    });
  }

  listAvailableEpics() {
    const epics = new Set();

    // List from epics directory
    if (fs.existsSync(this.epicsDir)) {
      fs.readdirSync(this.epicsDir)
        .filter(file => file.endsWith('.md'))
        .forEach(file => epics.add(file.replace('.md', '')));
    }

    // List from PRDs directory
    if (fs.existsSync(this.prdsDir)) {
      fs.readdirSync(this.prdsDir)
        .filter(file => file.endsWith('.md'))
        .forEach(file => epics.add(file.replace('.md', '')));
    }

    if (epics.size > 0) {
      Array.from(epics).forEach(epic => {
        console.log(`  • ${epic}`);
      });
    } else {
      console.log('  No epics found');
    }
  }

  async run(args) {
    const epicName = args[0];

    if (!epicName) {
      console.error('❌ Error: Epic name required');
      console.error('Usage: /pm:epic-edit <epic-name>');
      console.log('\nAvailable epics:');
      this.listAvailableEpics();
      process.exit(1);
    }

    const success = await this.editEpic(epicName);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const editor = new EpicEditor();
  editor.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = EpicEditor;