#!/usr/bin/env node

/**
 * PM In-Progress Script
 * Outputs markdown pipe table for active work items
 */

const fs = require('fs');
const path = require('path');

function getInProgressWork() {
  const result = {
    activeIssues: [],
    activeEpics: [],
    totalActive: 0
  };

  if (!fs.existsSync('.claude/epics')) return result;

  try {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Check for active work in updates directories
    for (const epicName of epicDirs) {
      const epicPath = path.join('.claude/epics', epicName);
      const updatesPath = path.join(epicPath, 'updates');

      if (fs.existsSync(updatesPath)) {
        try {
          const updateDirs = fs.readdirSync(updatesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const issueNum of updateDirs) {
            const progressFile = path.join(updatesPath, issueNum, 'progress.md');
            if (!fs.existsSync(progressFile)) continue;

            try {
              const progressContent = fs.readFileSync(progressFile, 'utf8');
              const completionMatch = progressContent.match(/^completion:\s*(.*)$/m);
              const completion = completionMatch ? completionMatch[1].trim() : '0%';
              const lastSyncMatch = progressContent.match(/^last_sync:\s*(.*)$/m);
              const lastSync = lastSyncMatch ? lastSyncMatch[1].trim() : null;

              const taskFile = path.join(epicPath, `${issueNum}.md`);
              let taskName = 'Unknown task';
              if (fs.existsSync(taskFile)) {
                try {
                  const taskContent = fs.readFileSync(taskFile, 'utf8');
                  const nameMatch = taskContent.match(/^name:\s*(.*)$/m);
                  if (nameMatch) taskName = nameMatch[1].trim();
                } catch (error) { /* keep default */ }
              }

              result.activeIssues.push({ issueNum, epicName, taskName, completion, lastSync });
              result.totalActive++;
            } catch (error) { continue; }
          }
        } catch (error) { continue; }
      }
    }

    // Check for active epics
    for (const epicName of epicDirs) {
      const epicFile = path.join('.claude/epics', epicName, 'epic.md');
      if (!fs.existsSync(epicFile)) continue;

      try {
        const epicContent = fs.readFileSync(epicFile, 'utf8');
        const statusMatch = epicContent.match(/^status:\s*(.*)$/m);
        const status = statusMatch ? statusMatch[1].trim() : '';

        if (status === 'in-progress' || status === 'active') {
          const nameMatch = epicContent.match(/^name:\s*(.*)$/m);
          const name = nameMatch ? nameMatch[1].trim() : epicName;
          const progressMatch = epicContent.match(/^progress:\s*(.*)$/m);
          const progress = progressMatch ? progressMatch[1].trim() : '0%';
          const updatedMatch = epicContent.match(/^updated:\s*(.*)$/m);
          const updated = updatedMatch ? updatedMatch[1].trim().split('T')[0] : '\u2014';

          result.activeEpics.push({ name, status, progress, epicName, updated });
        }
      } catch (error) { continue; }
    }
  } catch (error) { /* skip */ }

  return result;
}

function formatInProgressOutput(data) {
  const lines = [];

  lines.push('## In Progress');
  lines.push('');

  const rows = [];

  for (const issue of data.activeIssues) {
    rows.push({ num: issue.issueNum, title: issue.taskName, type: 'task', epic: issue.epicName, started: issue.lastSync ? issue.lastSync.split('T')[0] : '\u2014' });
  }

  for (const epic of data.activeEpics) {
    rows.push({ num: '\u2014', title: epic.name, type: 'epic', epic: '\u2014', started: epic.updated });
  }

  if (rows.length > 0) {
    lines.push('| # | Title | Type | Epic | Started |');
    lines.push('|---|-------|------|------|---------|');
    for (const r of rows) {
      lines.push(`| ${r.num} | ${r.title} | ${r.type} | ${r.epic} | ${r.started} |`);
    }
    lines.push('');
    lines.push(`Total: ${rows.length} items in progress`);
  } else {
    lines.push('No active work items found.');
    lines.push('');
    lines.push('Next: /pm:next');
  }

  // Recent Activity section
  try {
    const loggerPath = require('path').join(process.cwd(), '.claude', 'lib', 'event-logger');
    const { formatRecentActivity } = require(loggerPath);
    lines.push('');
    lines.push(formatRecentActivity(7));
  } catch (e) { /* event logger not available */ }

  return lines.join('\n');
}

module.exports = getInProgressWork;

if (require.main === module) {
  const data = getInProgressWork();
  console.log(formatInProgressOutput(data));
  process.exit(0);
}
