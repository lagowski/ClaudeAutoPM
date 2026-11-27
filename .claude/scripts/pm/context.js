const fs = require('fs');
const path = require('path');
const { logError } = require('./lib/logger');

/**
 * PM Context Script
 * Displays current project context, configuration, and progress
 */

// Constants
const TASK_FILE_PATTERN = /^\d{3}\.md$/;

async function context() {
  console.log('');
  console.log('🎯 Project Context');
  console.log('='.repeat(60));
  console.log('');

  // Project Information
  console.log('📦 Project Information:');

  // Get project name from package.json or directory name
  let projectName = path.basename(process.cwd());
  try {
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.name) {
        projectName = pkg.name;
      }
    }
  } catch (err) {
    // Use directory name as fallback
  }
  console.log(`  Name:           ${projectName}`);
  console.log(`  Directory:      ${process.cwd()}`);
  console.log('');

  // Configuration
  console.log('⚙️  Configuration:');
  let provider = 'Not configured';
  let githubOwner = '-';
  let githubRepo = '-';
  let azureOrg = '-';
  let azureProject = '-';

  try {
    if (fs.existsSync('.claude/config.json')) {
      const config = JSON.parse(fs.readFileSync('.claude/config.json', 'utf8'));
      if (config.provider) {
        provider = config.provider.charAt(0).toUpperCase() + config.provider.slice(1);
      }
      if (config.github) {
        githubOwner = config.github.owner || '-';
        githubRepo = config.github.repo || '-';
      }
      if (config.azure) {
        azureOrg = config.azure.organization || '-';
        azureProject = config.azure.project || '-';
      }
    }
  } catch (err) {
    // Config not found
  }

  console.log(`  Provider:       ${provider}`);
  if (provider.toLowerCase() === 'github') {
    console.log(`  GitHub Owner:   ${githubOwner}`);
    console.log(`  GitHub Repo:    ${githubRepo}`);
  } else if (provider.toLowerCase() === 'azure') {
    console.log(`  Azure Org:      ${azureOrg}`);
    console.log(`  Azure Project:  ${azureProject}`);
  }
  console.log('');

  // Active Team
  console.log('👥 Active Team:');
  let activeTeam = 'Default';
  try {
    if (fs.existsSync('.claude/active_team.txt')) {
      activeTeam = fs.readFileSync('.claude/active_team.txt', 'utf8').trim();
    }
  } catch (err) {
    // No active team
  }
  console.log(`  Team:           ${activeTeam}`);
  console.log('');

  // PRDs
  console.log('📄 Product Requirements (PRDs):');
  let prdCount = 0;
  let prdNames = [];
  try {
    if (fs.existsSync('.claude/prds')) {
      const files = fs.readdirSync('.claude/prds')
        .filter(f => f.endsWith('.md') && !f.startsWith('.'));
      prdCount = files.length;
      prdNames = files.map(f => f.replace('.md', ''));
    }
  } catch (err) {
    // No PRDs
  }

  console.log(`  Total:          ${prdCount}`);
  if (prdCount > 0) {
    prdNames.slice(0, 5).forEach(name => {
      console.log(`    • ${name}`);
    });
    if (prdCount > 5) {
      console.log(`    ... and ${prdCount - 5} more`);
    }
  }
  console.log('');

  // Epics with Progress
  console.log('📚 Epics & Progress:');
  let epicCount = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let pendingTasks = 0;
  let epicDetails = [];

  try {
    if (fs.existsSync('.claude/epics')) {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      epicCount = epicDirs.length;

      // Helper to count tasks in a directory and update counters
      function countTasksInDir(dir, counters) {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              countTasksInDir(fullPath, counters);
            } else if (entry.isFile() && TASK_FILE_PATTERN.test(entry.name)) {
              counters.epicTasks++;
              totalTasks++;
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const statusMatch = content.match(/^status:\s*(.+)$/m);
                if (statusMatch) {
                  const status = statusMatch[1].trim().toLowerCase();
                  if (status === 'completed' || status === 'done' || status === 'closed') {
                    counters.epicCompleted++;
                    completedTasks++;
                  } else if (status === 'in-progress' || status === 'in_progress') {
                    counters.epicInProgress++;
                    inProgressTasks++;
                  } else {
                    counters.epicPending++;
                    pendingTasks++;
                  }
                } else {
                  counters.epicPending++;
                  pendingTasks++;
                }
              } catch (err) {
                counters.epicPending++;
                pendingTasks++;
              }
            }
          }
        } catch (err) {
          // Directory read error
        }
      }

      for (const epicDir of epicDirs) {
        const epicPath = path.join('.claude/epics', epicDir);
        // Count tasks in this epic (including subdirectories)
        let counters = {
          epicTasks: 0,
          epicCompleted: 0,
          epicInProgress: 0,
          epicPending: 0
        };
        countTasksInDir(epicPath, counters);
        if (counters.epicTasks > 0) {
          const progress = Math.round((counters.epicCompleted / counters.epicTasks) * 100);
          epicDetails.push({
            name: epicDir,
            tasks: counters.epicTasks,
            completed: counters.epicCompleted,
            inProgress: counters.epicInProgress,
            pending: counters.epicPending,
            progress: progress
          });
        }
      }
    }
  } catch (err) {
    // No epics
  }

  console.log(`  Total Epics:    ${epicCount}`);
  console.log(`  Total Tasks:    ${totalTasks}`);
  console.log(`    Completed:    ${completedTasks}`);
  console.log(`    In Progress:  ${inProgressTasks}`);
  console.log(`    Pending:      ${pendingTasks}`);
  console.log('');

  if (epicDetails.length > 0) {
    console.log('  Epic Breakdown:');
    epicDetails.slice(0, 5).forEach(epic => {
      const progressBar = createProgressBar(epic.progress, 20);
      console.log(`    ${epic.name}`);
      console.log(`      ${progressBar} ${epic.progress}% (${epic.completed}/${epic.tasks} tasks)`);
    });
    if (epicDetails.length > 5) {
      console.log(`    ... and ${epicDetails.length - 5} more epics`);
    }
    console.log('');
  }

  // Overall Progress
  if (totalTasks > 0) {
    const overallProgress = Math.round((completedTasks / totalTasks) * 100);
    console.log('📊 Overall Progress:');
    const overallBar = createProgressBar(overallProgress, 40);
    console.log(`  ${overallBar} ${overallProgress}%`);
    console.log(`  ${completedTasks} / ${totalTasks} tasks completed`);
    console.log('');
  }

  // Current/Recent Activity
  console.log('🔄 Recent Activity:');
  try {
    // Find most recently modified task file
    let recentTask = null;
    let recentTime = 0;

    if (fs.existsSync('.claude/epics')) {
      function findRecentTask(dir) {
        let bestTask = null;
        let bestTime = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            const subTask = findRecentTask(fullPath);
            if (subTask && subTask.timeMs > bestTime) {
              bestTask = subTask;
              bestTime = subTask.timeMs;
            }
          } else if (entry.isFile() && TASK_FILE_PATTERN.test(entry.name)) {
            const stats = fs.statSync(fullPath);
            if (stats.mtimeMs > bestTime) {
              const content = fs.readFileSync(fullPath, 'utf8');
              const titleMatch = content.match(/^#\s+(.+)$/m);
              const statusMatch = content.match(/^status:\s*(.+)$/m);
              bestTask = {
                path: fullPath,
                title: titleMatch ? titleMatch[1] : entry.name,
                status: statusMatch ? statusMatch[1].trim() : 'pending',
                time: stats.mtime,
                timeMs: stats.mtimeMs
              };
              bestTime = stats.mtimeMs;
            }
          }
        }
        return bestTask;
      }

      const foundTask = findRecentTask('.claude/epics');
      if (foundTask) {
        recentTask = foundTask;
        recentTime = foundTask.timeMs;
      }
    }

    if (recentTask) {
      const timeAgo = getTimeAgo(recentTask.time);
      console.log(`  Last Modified:  ${recentTask.title}`);
      console.log(`  Status:         ${recentTask.status}`);
      console.log(`  Modified:       ${timeAgo}`);
      console.log(`  File:           ${recentTask.path}`);
    } else {
      console.log('  No recent activity');
    }
  } catch (err) {
    console.log('  No recent activity');
  }

  console.log('');
  console.log('💡 Quick Commands:');
  console.log('  /pm:next                # Get next priority task');
  console.log('  /pm:status              # Detailed project status');
  console.log('  /pm:standup             # Generate standup report');
  console.log('  /pm:search <keyword>    # Search PRDs and epics');
  console.log('');
}

// Helper function to create progress bar
function createProgressBar(percentage, length) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '[' + '='.repeat(filled) + '-'.repeat(empty) + ']';
}

// Helper function to get human-readable time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// Run if called directly
if (require.main === module) {
  context().catch(err => {
    logError('Error executing context command', err);
    process.exit(1);
  });
}

module.exports = context;
