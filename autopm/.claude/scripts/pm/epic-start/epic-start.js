#!/usr/bin/env node
/**
 * Epic Start - Launch parallel agent execution for an epic
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class EpicStarter {
  constructor(epicName) {
    this.epicName = epicName;
    this.epicFile = null;
  }

  findEpicFile() {
    // Check in epics directory
    let epicPath = path.join('.claude', 'epics', `${this.epicName}.md`);
    if (fs.existsSync(epicPath)) {
      this.epicFile = epicPath;
      return true;
    }

    // Check in PRDs directory
    epicPath = path.join('.claude', 'prds', `${this.epicName}.md`);
    if (fs.existsSync(epicPath)) {
      this.epicFile = epicPath;
      return true;
    }

    return false;
  }

  listAvailableEpics() {
    const epics = [];

    // List from epics directory
    const epicsDir = path.join('.claude', 'epics');
    if (fs.existsSync(epicsDir)) {
      fs.readdirSync(epicsDir)
        .filter(file => file.endsWith('.md'))
        .forEach(file => epics.push(file.replace('.md', '')));
    }

    // List from PRDs directory
    const prdsDir = path.join('.claude', 'prds');
    if (fs.existsSync(prdsDir)) {
      fs.readdirSync(prdsDir)
        .filter(file => file.endsWith('.md'))
        .forEach(file => epics.push(file.replace('.md', '')));
    }

    return [...new Set(epics)]; // Remove duplicates
  }

  extractTasks() {
    const content = fs.readFileSync(this.epicFile, 'utf8');
    const lines = content.split('\n');

    const tasks = {
      complete: [],
      incomplete: [],
      total: 0
    };

    lines.forEach(line => {
      if (line.match(/^- \[x\]/)) {
        tasks.complete.push(line.replace(/^- \[x\] /, ''));
      } else if (line.match(/^- \[ \]/)) {
        tasks.incomplete.push(line.replace(/^- \[ \] /, ''));
      }
    });

    tasks.total = tasks.complete.length + tasks.incomplete.length;
    return tasks;
  }

  async startParallelExecution(tasks) {
    console.log('\n🔄 Starting parallel execution for', tasks.incomplete.length, 'tasks...\n');

    // Check if parallel streams script exists
    const parallelScript = path.join(__dirname, '..', 'start-parallel-streams.js');

    if (fs.existsSync(parallelScript)) {
      console.log('Using Node.js parallel executor...');

      // Spawn the parallel execution script
      const child = spawn('node', [parallelScript, '--epic', this.epicName], {
        stdio: 'inherit'
      });

      return new Promise((resolve) => {
        child.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ Parallel execution completed successfully');
          } else {
            console.log('\n⚠️  Parallel execution finished with code:', code);
          }
          resolve(code);
        });
      });
    } else {
      // Fallback to basic parallel execution
      console.log('Starting tasks in parallel...\n');

      tasks.incomplete.forEach((task, index) => {
        console.log(`  ▶ [${index + 1}/${tasks.incomplete.length}] Starting: ${task}`);

        // Here you can add actual task execution logic
        // For example, launching specific agents or scripts
      });

      console.log('\n✅ Parallel execution initiated');
    }
  }

  async run() {
    // Check if epic name provided
    if (!this.epicName) {
      console.error('❌ Error: Epic name required');
      console.error('Usage: /pm:epic-start epic-name');
      process.exit(1);
    }

    // Find epic file
    if (!this.findEpicFile()) {
      console.error(`❌ Error: Epic not found: ${this.epicName}`);
      console.error('\nAvailable epics:');

      const availableEpics = this.listAvailableEpics();
      if (availableEpics.length > 0) {
        availableEpics.forEach(epic => console.log(`  - ${epic}`));
      } else {
        console.log('  No epics found');
      }
      process.exit(1);
    }

    console.log(`🚀 Starting parallel execution for epic: ${this.epicName}`);
    console.log(`📄 Epic file: ${this.epicFile}\n`);

    // Extract tasks
    console.log('📋 Extracting tasks from epic...');
    const tasks = this.extractTasks();

    if (tasks.total === 0) {
      console.log('⚠️  No tasks found in epic file');
      console.log('Tip: Add tasks in format: - [ ] Task description');
      process.exit(1);
    }

    // Display task status
    console.log('\n📊 Task Status:');
    console.log(`  • Total: ${tasks.total}`);
    console.log(`  • Complete: ${tasks.complete.length}`);
    console.log(`  • Remaining: ${tasks.incomplete.length}`);

    if (tasks.incomplete.length === 0) {
      console.log('\n✅ All tasks are already complete!');
      process.exit(0);
    }

    // Start parallel execution
    await this.startParallelExecution(tasks);

    // Show next steps
    console.log(`\n💡 Monitor progress with: /pm:epic-status ${this.epicName}`);
    console.log(`📝 View details with: /pm:epic-show ${this.epicName}`);
  }
}

// Main execution
if (require.main === module) {
  const epicName = process.argv[2];
  const starter = new EpicStarter(epicName);

  starter.run().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = EpicStarter;