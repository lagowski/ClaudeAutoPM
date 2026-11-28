const fs = require('fs');
const path = require('path');

/**
 * PM Standup Script
 * Outputs markdown pipe tables for daily standup report
 */

async function standup() {
  const today = new Date().toISOString().split('T')[0];

  const result = {
    date: today,
    completed: [],
    inProgress: [],
    blocked: [],
    stats: { totalTasks: 0, openTasks: 0, closedTasks: 0 },
    messages: []
  };

  function addMessage(message) {
    result.messages.push(message);
    if (require.main === module) {
      console.log(message);
    }
  }

  // Preamble
  try {
    const { loadPreamble, formatPreamble } = require(path.join(process.cwd(), '.claude', 'lib', 'preamble'));
    const preamble = loadPreamble(process.cwd());
    addMessage(formatPreamble(preamble));
    addMessage('');
  } catch (e) { /* preamble not available */ }

  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  // Scan epics for task data
  if (fs.existsSync('.claude/epics')) {
    try {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const epicName of epicDirs) {
        const epicPath = path.join('.claude/epics', epicName);

        // Check epic status
        const epicFile = path.join(epicPath, 'epic.md');
        if (fs.existsSync(epicFile)) {
          try {
            const epicContent = fs.readFileSync(epicFile, 'utf8');
            const statusMatch = epicContent.match(/^status:\s*(.*)$/m);
            const epicStatus = statusMatch ? statusMatch[1].trim().toLowerCase() : '';
            const nameMatch = epicContent.match(/^name:\s*(.*)$/m);
            const name = nameMatch ? nameMatch[1].trim() : epicName;
            const updatedMatch = epicContent.match(/^updated:\s*(.*)$/m);
            const updated = updatedMatch ? updatedMatch[1].trim() : '';

            if (epicStatus === 'in-progress' || epicStatus === 'in_progress' || epicStatus === 'active') {
              result.inProgress.push({ item: name, type: 'epic', started: updated || '-', assignee: '@me' });
            }
          } catch (err) { /* skip */ }
        }

        // Check tasks
        try {
          const taskFiles = fs.readdirSync(epicPath).filter(file => /^[0-9].*\.md$/.test(file));

          for (const taskFile of taskFiles) {
            const taskPath = path.join(epicPath, taskFile);

            try {
              const content = fs.readFileSync(taskPath, 'utf8');
              const statusMatch = content.match(/^status:\s*(.+)$/m);
              const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'open';
              const nameMatch = content.match(/^name:\s*(.+)$/m);
              const taskName = nameMatch ? nameMatch[1].trim() : taskFile;
              const updatedMatch = content.match(/^updated:\s*(.+)$/m);
              const updated = updatedMatch ? updatedMatch[1].trim() : '';
              const updatedDate = updated ? updated.split('T')[0] : '';

              const depsMatch = content.match(/^depends_on:\s*\[(.+?)\]/m);
              const hasDeps = depsMatch && depsMatch[1].trim().length > 0;

              // Stats
              result.stats.totalTasks++;
              if (status === 'closed' || status === 'completed' || status === 'done') {
                result.stats.closedTasks++;
              } else {
                result.stats.openTasks++;
              }

              // Recently completed (closed + modified in last 24h)
              if (status === 'closed' || status === 'completed' || status === 'done') {
                try {
                  const stats = fs.statSync(taskPath);
                  if (stats.mtime.getTime() > oneDayAgo) {
                    result.completed.push({ item: taskName, type: 'task', completed: updatedDate || today });
                  }
                } catch (err) { /* skip */ }
              }

              // In progress tasks
              if (status === 'in-progress' || status === 'in_progress' || status === 'active') {
                result.inProgress.push({ item: taskName, type: 'task', started: updatedDate || '-', assignee: '@me' });
              }

              // Blocked tasks
              if (hasDeps && (status === 'open' || status === 'blocked')) {
                result.blocked.push({ item: taskName, blocker: `Depends on [${depsMatch[1].trim()}]`, since: updatedDate || '-' });
              }
            } catch (err) { /* skip task */ }
          }
        } catch (err) { /* skip epic dir */ }
      }
    } catch (err) { /* no epics */ }
  }

  // Output markdown tables
  addMessage('## Standup Report');
  addMessage('');

  // Completed section
  addMessage('### Completed (since last standup)');
  if (result.completed.length > 0) {
    addMessage('| Item | Type | Completed |');
    addMessage('|------|------|-----------|');
    for (const c of result.completed) {
      addMessage(`| ${c.item} | ${c.type} | ${c.completed} |`);
    }
  } else {
    addMessage('No items completed since last standup.');
  }

  addMessage('');

  // In Progress section
  addMessage('### In Progress');
  if (result.inProgress.length > 0) {
    addMessage('| Item | Type | Started | Assignee |');
    addMessage('|------|------|---------|----------|');
    for (const ip of result.inProgress) {
      addMessage(`| ${ip.item} | ${ip.type} | ${ip.started} | ${ip.assignee} |`);
    }
  } else {
    addMessage('No items currently in progress.');
  }

  addMessage('');

  // Blocked section
  addMessage('### Blocked');
  if (result.blocked.length > 0) {
    addMessage('| Item | Blocker | Since |');
    addMessage('|------|---------|-------|');
    for (const b of result.blocked) {
      addMessage(`| ${b.item} | ${b.blocker} | ${b.since} |`);
    }
  } else {
    addMessage('No blocked items.');
  }

  // Recent Activity section
  try {
    const loggerPath = require('path').join(process.cwd(), '.claude', 'lib', 'event-logger');
    const { formatRecentActivity } = require(loggerPath);
    addMessage('');
    addMessage(formatRecentActivity(7));
  } catch (e) { /* event logger not available */ }

  addMessage('');
  addMessage('Next: /pm:next');

  return result;
}

// Helper functions kept for module compatibility
async function findRecentFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.isFile() && item.name.endsWith('.md')) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.mtime.getTime() > oneDayAgo) files.push(fullPath);
          } catch (err) { /* skip */ }
        }
      }
    } catch (err) { /* skip */ }
  }

  scanDirectory(directory);
  return files;
}

async function findInProgressTasks() {
  const inProgress = [];
  if (!fs.existsSync('.claude/epics')) return inProgress;

  try {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const epicName of epicDirs) {
      const updatesDir = path.join('.claude/epics', epicName, 'updates');
      if (!fs.existsSync(updatesDir)) continue;
      try {
        const updateDirs = fs.readdirSync(updatesDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        for (const issueNum of updateDirs) {
          const progressFile = path.join(updatesDir, issueNum, 'progress.md');
          if (!fs.existsSync(progressFile)) continue;
          try {
            const content = fs.readFileSync(progressFile, 'utf8');
            const completionMatch = content.match(/^completion:\s*(.+)$/m);
            inProgress.push({ issueNum, epicName, completion: completionMatch ? completionMatch[1].trim() : '0%' });
          } catch (err) { /* skip */ }
        }
      } catch (err) { /* skip */ }
    }
  } catch (err) { /* skip */ }

  return inProgress;
}

async function findAvailableTasks(limit = 3) {
  const availableTasks = [];
  if (!fs.existsSync('.claude/epics')) return availableTasks;

  try {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const epicName of epicDirs) {
      if (availableTasks.length >= limit) break;
      const epicPath = path.join('.claude/epics', epicName);
      try {
        const taskFiles = fs.readdirSync(epicPath).filter(file => /^[0-9].*\.md$/.test(file)).sort();
        for (const taskFile of taskFiles) {
          if (availableTasks.length >= limit) break;
          try {
            const content = fs.readFileSync(path.join(epicPath, taskFile), 'utf8');
            const statusMatch = content.match(/^status:\s*(.+)$/m);
            const status = statusMatch ? statusMatch[1].trim() : '';
            if (status !== 'open' && status !== '') continue;
            const depsMatch = content.match(/^depends_on:\s*\[(.*?)\]/m);
            if (depsMatch && depsMatch[1].trim()) continue;
            const nameMatch = content.match(/^name:\s*(.+)$/m);
            availableTasks.push({ taskNum: path.basename(taskFile, '.md'), name: nameMatch ? nameMatch[1].trim() : 'Unnamed Task', epicName });
          } catch (err) { /* skip */ }
        }
      } catch (err) { /* skip */ }
    }
  } catch (err) { /* skip */ }

  return availableTasks;
}

async function calculateTaskStats() {
  const stats = { totalTasks: 0, openTasks: 0, closedTasks: 0 };
  if (!fs.existsSync('.claude/epics')) return stats;

  try {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const epicName of epicDirs) {
      try {
        const taskFiles = fs.readdirSync(path.join('.claude/epics', epicName)).filter(file => /^[0-9].*\.md$/.test(file));
        for (const taskFile of taskFiles) {
          stats.totalTasks++;
          try {
            const content = fs.readFileSync(path.join('.claude/epics', epicName, taskFile), 'utf8');
            const statusMatch = content.match(/^status:\s*(.+)$/m);
            if (statusMatch && statusMatch[1].trim() === 'closed') stats.closedTasks++;
            else stats.openTasks++;
          } catch (err) { stats.openTasks++; }
        }
      } catch (err) { /* skip */ }
    }
  } catch (err) { /* skip */ }

  return stats;
}

module.exports = {
  standup,
  findRecentFiles,
  findInProgressTasks,
  findAvailableTasks,
  calculateTaskStats
};

if (require.main === module) {
  module.exports.standup().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Standup failed:', err.message);
    process.exit(1);
  });
}
