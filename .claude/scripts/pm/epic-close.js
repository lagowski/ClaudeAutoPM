#!/usr/bin/env node
/**
 * Epic Close - Close/complete an epic
 */

const fs = require('fs');
const path = require('path');

class EpicCloser {
  constructor() {
    this.epicsDir = path.join('.claude', 'epics');
    this.prdsDir = path.join('.claude', 'prds');
    this.activeWorkFile = path.join('.claude', 'active-work.json');
    this.completedFile = path.join('.claude', 'completed-work.json');
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

  extractTasksFromEpic(epicContent) {
    const lines = epicContent.split('\n');
    const tasks = {
      total: 0,
      completed: 0,
      incomplete: 0,
      completedTasks: [],
      incompleteTasks: []
    };

    lines.forEach(line => {
      if (line.match(/^- \[x\]/)) {
        tasks.completed++;
        tasks.completedTasks.push(line.replace(/^- \[x\] /, ''));
      } else if (line.match(/^- \[ \]/)) {
        tasks.incomplete++;
        tasks.incompleteTasks.push(line.replace(/^- \[ \] /, ''));
      }
    });

    tasks.total = tasks.completed + tasks.incomplete;
    return tasks;
  }

  async closeEpic(epicName, options = {}) {
    console.log(`\n🔒 Closing Epic: ${epicName}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Find epic file
    const epicFile = this.findEpicFile(epicName);
    if (!epicFile) {
      console.error(`❌ Epic not found: ${epicName}`);
      this.listAvailableEpics();
      return false;
    }

    // Read and analyze epic
    let epicContent = fs.readFileSync(epicFile, 'utf8');
    const tasks = this.extractTasksFromEpic(epicContent);

    // Show current status
    console.log('📊 Epic Status:');
    console.log(`  • Total Tasks: ${tasks.total}`);
    console.log(`  • Completed: ${tasks.completed} (${tasks.total > 0 ? Math.round(tasks.completed / tasks.total * 100) : 0}%)`);
    console.log(`  • Remaining: ${tasks.incomplete}`);

    // Check if all tasks are complete
    if (tasks.incomplete > 0 && !options.force) {
      console.log('\n⚠️  Warning: Epic has incomplete tasks!');
      console.log('\nIncomplete tasks:');
      tasks.incompleteTasks.slice(0, 5).forEach(task => {
        console.log(`  ⬜ ${task}`);
      });
      if (tasks.incompleteTasks.length > 5) {
        console.log(`  ... and ${tasks.incompleteTasks.length - 5} more`);
      }

      console.log('\n💡 Options:');
      console.log('  • Complete remaining tasks first');
      console.log('  • Use --force to close anyway');
      console.log('  • Use --complete-all to mark all tasks as done');

      if (!options.completeAll) {
        return false;
      }
    }

    // Mark all tasks as complete if requested
    if (options.completeAll) {
      console.log('\n✅ Marking all tasks as complete...');
      epicContent = epicContent.replace(/- \[ \]/g, '- [x]');
      fs.writeFileSync(epicFile, epicContent);
    }

    // Update epic metadata
    const closedDate = new Date().toISOString();
    const updatedContent = this.updateEpicMetadata(epicContent, {
      status: 'completed',
      closedDate: closedDate
    });
    fs.writeFileSync(epicFile, updatedContent);

    // Update tracking
    const activeWork = this.loadActiveWork();
    const completedWork = this.loadCompletedWork();

    // Find and move epic from active to completed
    const activeEpic = activeWork.epics.find(e => e.name === epicName);
    if (activeEpic) {
      // Remove from active
      activeWork.epics = activeWork.epics.filter(e => e.name !== epicName);
      this.saveActiveWork(activeWork);

      // Add to completed
      const completedEntry = {
        ...activeEpic,
        completedAt: closedDate,
        status: 'completed',
        finalStats: {
          totalTasks: tasks.total,
          completedTasks: options.completeAll ? tasks.total : tasks.completed
        }
      };

      completedWork.epics.unshift(completedEntry);

      // Keep only last 50 completed epics
      if (completedWork.epics.length > 50) {
        completedWork.epics = completedWork.epics.slice(0, 50);
      }

      this.saveCompletedWork(completedWork);
    } else {
      // Add to completed even if not in active
      const completedEntry = {
        name: epicName,
        completedAt: closedDate,
        status: 'completed',
        finalStats: {
          totalTasks: tasks.total,
          completedTasks: options.completeAll ? tasks.total : tasks.completed
        }
      };

      completedWork.epics.unshift(completedEntry);
      this.saveCompletedWork(completedWork);
    }

    // Success message
    console.log(`\n✅ Epic "${epicName}" has been closed!`);
    console.log('\n📋 Final Statistics:');
    console.log(`  • Total Tasks: ${tasks.total}`);
    console.log(`  • Completed: ${options.completeAll ? tasks.total : tasks.completed} (100%)`);
    console.log(`  • Closed Date: ${new Date(closedDate).toLocaleString()}`);

    // Archive epic if requested
    if (options.archive) {
      const archiveDir = path.join(path.dirname(epicFile), 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const archivePath = path.join(archiveDir, path.basename(epicFile));
      fs.renameSync(epicFile, archivePath);
      console.log(`\n📦 Epic archived to: ${archivePath}`);
    }

    // Show next steps
    console.log('\n💡 Next Steps:');
    console.log('  • View completed epics: /pm:status');
    console.log('  • Start new epic: /pm:init <epic-name>');
    console.log('  • List all epics: /pm:epic-list');

    return true;
  }

  updateEpicMetadata(content, metadata) {
    const lines = content.split('\n');
    const updatedLines = [];
    let inMetadata = false;
    let metadataUpdated = false;

    for (const line of lines) {
      if (line.startsWith('---') && !inMetadata) {
        inMetadata = true;
        updatedLines.push(line);
      } else if (line.startsWith('---') && inMetadata) {
        // Add missing metadata before closing
        if (!metadataUpdated) {
          updatedLines.push(`status: ${metadata.status}`);
          updatedLines.push(`closedDate: ${metadata.closedDate}`);
        }
        updatedLines.push(line);
        inMetadata = false;
        metadataUpdated = true;
      } else if (inMetadata) {
        // Update existing metadata
        if (line.startsWith('status:')) {
          updatedLines.push(`status: ${metadata.status}`);
          metadataUpdated = true;
        } else if (line.startsWith('closedDate:')) {
          updatedLines.push(`closedDate: ${metadata.closedDate}`);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }

    // If no metadata section exists, add it
    if (!metadataUpdated) {
      const titleIndex = updatedLines.findIndex(line => line.startsWith('# '));
      if (titleIndex !== -1) {
        updatedLines.splice(titleIndex + 1, 0,
          '',
          '---',
          `status: ${metadata.status}`,
          `closedDate: ${metadata.closedDate}`,
          '---',
          ''
        );
      }
    }

    return updatedLines.join('\n');
  }

  listAvailableEpics() {
    console.log('\nAvailable epics:');

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
      console.error('Usage: /pm:epic-close <epic-name> [--force] [--complete-all] [--archive]');
      console.error('\nOptions:');
      console.error('  --force        Close even with incomplete tasks');
      console.error('  --complete-all Mark all tasks as complete');
      console.error('  --archive      Move epic to archive folder');

      this.listAvailableEpics();
      process.exit(1);
    }

    const options = {};
    args.slice(1).forEach(arg => {
      if (arg === '--force') {
        options.force = true;
      } else if (arg === '--complete-all') {
        options.completeAll = true;
      } else if (arg === '--archive') {
        options.archive = true;
      }
    });

    const success = await this.closeEpic(epicName, options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const closer = new EpicCloser();
  closer.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = EpicCloser;