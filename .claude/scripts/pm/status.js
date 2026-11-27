const fs = require('fs');
const path = require('path');

/**
 * PM Status Script
 * Outputs markdown pipe tables for project status overview
 */

async function status() {
  const result = {
    prds: { total: 0, open: 0, inProgress: 0, done: 0, blocked: 0, found: false },
    epics: { total: 0, open: 0, inProgress: 0, done: 0, blocked: 0, found: false },
    tasks: { total: 0, open: 0, inProgress: 0, done: 0, blocked: 0, found: false },
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

  // Count PRDs by status
  try {
    if (fs.existsSync('.claude/prds') && fs.statSync('.claude/prds').isDirectory()) {
      const prdFiles = fs.readdirSync('.claude/prds').filter(file => file.endsWith('.md'));
      result.prds.found = true;

      for (const file of prdFiles) {
        result.prds.total++;
        try {
          const content = fs.readFileSync(path.join('.claude/prds', file), 'utf8');
          const statusMatch = content.match(/^status:\s*(.+)$/m);
          const s = statusMatch ? statusMatch[1].trim().toLowerCase() : 'backlog';

          if (s === 'complete' || s === 'completed' || s === 'done') result.prds.done++;
          else if (s === 'in-progress' || s === 'in_progress' || s === 'active') result.prds.inProgress++;
          else if (s === 'blocked') result.prds.blocked++;
          else result.prds.open++;
        } catch (err) {
          result.prds.open++;
        }
      }
    }
  } catch (err) { /* no PRDs */ }

  // Count Epics by status
  try {
    if (fs.existsSync('.claude/epics') && fs.statSync('.claude/epics').isDirectory()) {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      result.epics.found = true;

      for (const epicName of epicDirs) {
        result.epics.total++;
        const epicFile = path.join('.claude/epics', epicName, 'epic.md');
        try {
          if (fs.existsSync(epicFile)) {
            const content = fs.readFileSync(epicFile, 'utf8');
            const statusMatch = content.match(/^status:\s*(.+)$/m);
            const s = statusMatch ? statusMatch[1].trim().toLowerCase() : 'backlog';

            if (s === 'completed' || s === 'complete' || s === 'done') result.epics.done++;
            else if (s === 'in-progress' || s === 'in_progress' || s === 'active') result.epics.inProgress++;
            else if (s === 'blocked') result.epics.blocked++;
            else result.epics.open++;
          } else {
            result.epics.open++;
          }
        } catch (err) {
          result.epics.open++;
        }

        // Count tasks within this epic
        const epicPath = path.join('.claude/epics', epicName);
        try {
          const taskFiles = fs.readdirSync(epicPath).filter(file => /^[0-9].*\.md$/.test(file));

          for (const taskFile of taskFiles) {
            result.tasks.total++;
            result.tasks.found = true;
            try {
              const content = fs.readFileSync(path.join(epicPath, taskFile), 'utf8');
              const statusMatch = content.match(/^status:\s*(.+)$/m);
              const s = statusMatch ? statusMatch[1].trim().toLowerCase() : 'open';

              const depsMatch = content.match(/^depends_on:\s*\[(.+?)\]/m);
              const hasDeps = depsMatch && depsMatch[1].trim().length > 0;

              if (s === 'closed' || s === 'completed' || s === 'done') result.tasks.done++;
              else if (s === 'in-progress' || s === 'in_progress' || s === 'active') result.tasks.inProgress++;
              else if (s === 'blocked' || (s === 'open' && hasDeps)) result.tasks.blocked++;
              else result.tasks.open++;
            } catch (err) {
              result.tasks.open++;
            }
          }
        } catch (err) { /* skip */ }
      }
    }
  } catch (err) { /* no epics */ }

  // Output markdown table
  addMessage('## Project Status');
  addMessage('');
  addMessage('| Type | Total | Open | In Progress | Done | Blocked |');
  addMessage('|------|-------|------|-------------|------|---------|');
  addMessage(`| PRDs | ${result.prds.total} | ${result.prds.open} | ${result.prds.inProgress} | ${result.prds.done} | ${result.prds.blocked} |`);
  addMessage(`| Epics | ${result.epics.total} | ${result.epics.open} | ${result.epics.inProgress} | ${result.epics.done} | ${result.epics.blocked} |`);
  addMessage(`| Tasks | ${result.tasks.total} | ${result.tasks.open} | ${result.tasks.inProgress} | ${result.tasks.done} | ${result.tasks.blocked} |`);

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

module.exports = status;

if (require.main === module) {
  status().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Status failed:', err.message);
    process.exit(1);
  });
}
