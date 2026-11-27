#!/usr/bin/env node

/**
 * PM Blocked Script
 * Outputs markdown pipe table for blocked tasks with dependencies
 */

const fs = require('fs');
const path = require('path');

function getBlockedTasks() {
  const result = {
    blockedTasks: [],
    totalBlocked: 0
  };

  if (!fs.existsSync('.claude/epics')) return result;

  try {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const epicName of epicDirs) {
      const epicPath = path.join('.claude/epics', epicName);

      try {
        const files = fs.readdirSync(epicPath)
          .filter(file => /^\d+\.md$/.test(file))
          .sort((a, b) => parseInt(a) - parseInt(b));

        for (const file of files) {
          const taskFilePath = path.join(epicPath, file);
          const taskNum = path.basename(file, '.md');

          try {
            const taskContent = fs.readFileSync(taskFilePath, 'utf8');

            const statusMatch = taskContent.match(/^status:\s*(.*)$/m);
            const status = statusMatch ? statusMatch[1].trim() : '';

            if (status !== 'open' && status !== 'blocked' && status !== '') continue;

            const depsMatch = taskContent.match(/^depends_on:\s*(.*)$/m);
            if (!depsMatch) continue;

            const depsString = depsMatch[1].trim();
            let dependencies = [];
            if (depsString.includes('[') && depsString.includes(']')) {
              const depsContent = depsString.replace(/[\[\]]/g, '').trim();
              if (depsContent && depsContent !== 'depends_on:') {
                dependencies = depsContent.split(',').map(dep => dep.trim()).filter(dep => dep);
              }
            }

            if (dependencies.length === 0) continue;

            const nameMatch = taskContent.match(/^name:\s*(.*)$/m);
            const taskName = nameMatch ? nameMatch[1].trim() : `Task #${taskNum}`;

            const updatedMatch = taskContent.match(/^updated:\s*(.*)$/m);
            const since = updatedMatch ? updatedMatch[1].trim().split('T')[0] : '\u2014';

            // Check status of dependencies
            const openDependencies = [];
            for (const dep of dependencies) {
              const depFile = path.join(epicPath, `${dep}.md`);
              if (fs.existsSync(depFile)) {
                try {
                  const depContent = fs.readFileSync(depFile, 'utf8');
                  const depStatusMatch = depContent.match(/^status:\s*(.*)$/m);
                  const depStatus = depStatusMatch ? depStatusMatch[1].trim() : '';
                  if (depStatus === 'open' || depStatus === '') openDependencies.push(dep);
                } catch (error) { openDependencies.push(dep); }
              } else {
                openDependencies.push(dep);
              }
            }

            if (openDependencies.length > 0) {
              result.blockedTasks.push({
                taskNum,
                taskName,
                epicName,
                dependencies,
                openDependencies,
                since
              });
              result.totalBlocked++;
            }
          } catch (error) { continue; }
        }
      } catch (error) { continue; }
    }
  } catch (error) { /* skip */ }

  return result;
}

function formatBlockedOutput(data) {
  const lines = [];

  lines.push('## Blocked Items');
  lines.push('');

  if (data.blockedTasks.length === 0) {
    lines.push('No blocked tasks found. All tasks with dependencies are resolved or in progress.');
  } else {
    lines.push('| # | Title | Blocker | Since | Epic |');
    lines.push('|---|-------|---------|-------|------|');
    for (const task of data.blockedTasks) {
      const blocker = `Waiting on #${task.openDependencies.join(', #')}`;
      lines.push(`| ${task.taskNum} | ${task.taskName} | ${blocker} | ${task.since} | ${task.epicName} |`);
    }
    lines.push('');
    lines.push(`Total: ${data.totalBlocked} blocked items`);
  }

  // Recent Activity section (always shown)
  try {
    const loggerPath = require('path').join(process.cwd(), '.claude', 'lib', 'event-logger');
    const { formatRecentActivity } = require(loggerPath);
    lines.push('');
    lines.push(formatRecentActivity(7));
  } catch (e) { /* event logger not available */ }

  lines.push('');
  if (data.blockedTasks.length === 0) {
    lines.push('Next: /pm:next');
  } else {
    lines.push('Next: resolve blockers or /pm:next for alternative tasks');
  }

  return lines.join('\n');
}

module.exports = getBlockedTasks;

if (require.main === module) {
  const data = getBlockedTasks();
  console.log(formatBlockedOutput(data));
  process.exit(0);
}
