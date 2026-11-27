#!/usr/bin/env node
/**
 * Epic Oneshot - One-command workflow: Parse PRD → Decompose → Sync
 *
 * Usage: node epic-oneshot.js <feature-name> [options]
 *
 * This script combines three operations:
 * 1. Parse PRD into epic structure
 * 2. Decompose epic into implementation tasks
 * 3. Sync to GitHub/Azure DevOps
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EpicOneshot {
  constructor() {
    this.scriptsDir = __dirname;
    this.claudeDir = path.join(process.cwd(), '.claude');
    this.prdsDir = path.join(this.claudeDir, 'prds');
    this.epicsDir = path.join(this.claudeDir, 'epics');
  }

  log(message, emoji = '📋') {
    console.log(`${emoji} ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  async step1ParsePRD(featureName) {
    this.log('Step 1/3: Parsing PRD into epic...', '🔄');
    console.log(`${'═'.repeat(50)}\n`);

    const prdParseScript = path.join(this.scriptsDir, 'prd-parse.js');

    if (!fs.existsSync(prdParseScript)) {
      this.error('PRD parse script not found');
      return false;
    }

    try {
      execSync(`node "${prdParseScript}" ${featureName}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Verify epic was created
      const epicFile = path.join(this.epicsDir, featureName, 'epic.md');
      if (fs.existsSync(epicFile)) {
        this.success('Epic created successfully');
        return true;
      } else {
        this.error('Epic file not created');
        return false;
      }
    } catch (error) {
      this.error(`Failed to parse PRD: ${error.message}`);
      return false;
    }
  }

  async step2DecomposeTasks(featureName) {
    this.log('Step 2/3: Decomposing epic into tasks...', '🔨');
    console.log(`${'═'.repeat(50)}\n`);

    const epicFile = path.join(this.epicsDir, featureName, 'epic.md');

    if (!fs.existsSync(epicFile)) {
      this.error('Epic file not found');
      return false;
    }

    try {
      // Read epic file
      const epicContent = fs.readFileSync(epicFile, 'utf8');

      // Check if tasks already exist
      if (epicContent.includes('## Tasks') || epicContent.includes('## Implementation Tasks')) {
        this.log('Tasks already exist in epic', 'ℹ️');
        return true;
      }

      // Generate tasks section
      const tasksSection = this.generateTasksFromEpic(epicContent, featureName);

      // Append tasks to epic
      const updatedContent = epicContent + '\n\n' + tasksSection;
      fs.writeFileSync(epicFile, updatedContent, 'utf8');

      this.success('Tasks decomposed successfully');
      return true;
    } catch (error) {
      this.error(`Failed to decompose tasks: ${error.message}`);
      return false;
    }
  }

  generateTasksFromEpic(epicContent, featureName) {
    // Extract features and requirements from epic
    const features = this.extractListItems(epicContent, 'Features');
    const requirements = this.extractListItems(epicContent, 'Requirements');

    let tasks = [];
    let taskId = 1;

    // Setup task
    tasks.push({
      id: taskId++,
      title: 'Project setup and configuration',
      description: 'Initialize project structure, dependencies, and development environment',
      effort: '2h',
      type: 'setup'
    });

    // Feature implementation tasks
    features.forEach(feature => {
      tasks.push({
        id: taskId++,
        title: `Implement: ${feature}`,
        description: `Implementation for ${feature}`,
        effort: '1d',
        type: 'feature'
      });
    });

    // Requirements implementation tasks
    requirements.forEach(req => {
      tasks.push({
        id: taskId++,
        title: `Requirement: ${req}`,
        description: `Implementation for ${req}`,
        effort: '1d',
        type: 'requirement'
      });
    });

    // Integration tasks
    tasks.push({
      id: taskId++,
      title: 'Integration and API connections',
      description: 'Connect components and integrate APIs',
      effort: '1d',
      type: 'integration'
    });

    // Testing task
    tasks.push({
      id: taskId++,
      title: 'Testing and quality assurance',
      description: 'Write tests, perform QA, and fix bugs',
      effort: '1d',
      type: 'testing'
    });

    // Deployment task
    tasks.push({
      id: taskId++,
      title: 'Deployment and documentation',
      description: 'Deploy to production and update documentation',
      effort: '4h',
      type: 'deployment'
    });

    // Format tasks as markdown
    let tasksMarkdown = '## Implementation Tasks\n\n';
    tasksMarkdown += '### Task Breakdown\n\n';

    tasks.forEach(task => {
      tasksMarkdown += `#### TASK-${String(task.id).padStart(3, '0')}: ${task.title}\n\n`;
      tasksMarkdown += `**Type:** ${task.type}\n`;
      tasksMarkdown += `**Effort:** ${task.effort}\n`;
      tasksMarkdown += `**Description:** ${task.description}\n\n`;
    });

    return tasksMarkdown;
  }

  extractListItems(content, sectionName) {
    const items = [];
    const regex = new RegExp(`## ${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
    const match = content.match(regex);

    if (match) {
      const section = match[0];
      const lines = section.split('\n');

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
          // Remove bullet points or numbers
          let item = trimmed.replace(/^[-*•]\s+/, '').trim();
          item = item.replace(/^\d+\.\s+/, '').trim();
          if (item) items.push(item);
        }
      });
    }

    return items;
  }

  async step3SyncToProvider(featureName) {
    this.log('Step 3/3: Syncing to GitHub/Azure DevOps...', '🔄');
    console.log(`${'═'.repeat(50)}\n`);

    // Check if sync script exists
    const syncScript = path.join(this.scriptsDir, 'sync.js');
    const epicSyncScript = path.join(this.scriptsDir, 'epic-sync.sh');

    if (fs.existsSync(epicSyncScript)) {
      try {
        execSync(`bash "${epicSyncScript}" ${featureName}`, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        this.success('Epic synced to provider');
        return true;
      } catch (error) {
        this.error(`Failed to sync: ${error.message}`);
        return false;
      }
    } else if (fs.existsSync(syncScript)) {
      try {
        execSync(`node "${syncScript}" epic ${featureName}`, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        this.success('Epic synced to provider');
        return true;
      } catch (error) {
        this.error(`Failed to sync: ${error.message}`);
        return false;
      }
    } else {
      this.log('Sync script not found - skipping provider sync', '⚠️');
      this.log('Epic is ready locally. Use /pm:epic-sync to sync manually', 'ℹ️');
      return true; // Don't fail if sync not available
    }
  }

  async run(featureName, options = {}) {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║         Epic Oneshot Workflow                  ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    this.log(`Feature: ${featureName}`, '🎯');
    console.log('\n');

    // Validate PRD exists
    const prdFile = path.join(this.prdsDir, `${featureName}.md`);
    if (!fs.existsSync(prdFile)) {
      this.error(`PRD not found: ${featureName}.md`);
      this.log('Create it first with: /pm:prd-new ' + featureName, '💡');
      process.exit(1);
    }

    // Step 1: Parse PRD
    const parseSuccess = await this.step1ParsePRD(featureName);
    if (!parseSuccess) {
      this.error('Failed at step 1 (Parse PRD)');
      process.exit(1);
    }
    console.log('\n');

    // Step 2: Decompose tasks
    const decomposeSuccess = await this.step2DecomposeTasks(featureName);
    if (!decomposeSuccess) {
      this.error('Failed at step 2 (Decompose tasks)');
      process.exit(1);
    }
    console.log('\n');

    // Step 3: Sync to provider (optional)
    if (!options.noSync) {
      await this.step3SyncToProvider(featureName);
    } else {
      this.log('Skipping sync (--no-sync flag)', 'ℹ️');
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║         Epic Oneshot Complete! ✨              ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    this.log('Next steps:', '📋');
    console.log(`  • View epic: /pm:epic-show ${featureName}`);
    console.log(`  • Get next task: /pm:next`);
    console.log(`  • View status: /pm:status`);
    console.log('');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔════════════════════════════════════════════════╗
║         Epic Oneshot - Quick Start             ║
╚════════════════════════════════════════════════╝

Usage: node epic-oneshot.js <feature-name> [options]

Options:
  --no-sync    Skip syncing to GitHub/Azure DevOps
  --help       Show this help message

Example:
  node epic-oneshot.js user-authentication
  node epic-oneshot.js my-feature --no-sync

What it does:
  1. 🔄 Parses PRD into epic structure
  2. 🔨 Decomposes epic into implementation tasks
  3. 🔄 Syncs to GitHub/Azure DevOps

Prerequisites:
  • PRD must exist in .claude/prds/<feature-name>.md
  • Create with: /pm:prd-new <feature-name>
`);
    process.exit(0);
  }

  const featureName = args[0];
  const options = {
    noSync: args.includes('--no-sync')
  };

  const oneshot = new EpicOneshot();
  oneshot.run(featureName, options).catch(error => {
    console.error('❌ Fatal error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = EpicOneshot;
