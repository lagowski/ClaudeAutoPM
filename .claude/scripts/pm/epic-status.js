#!/usr/bin/env node

/**
 * PM Epic Status Script
 * Outputs markdown pipe tables for epic status with task breakdown
 */

const fs = require('fs');
const path = require('path');

function parseMetadata(content) {
  const metadata = {
    name: '',
    status: '',
    progress: '',
    github: '',
    created: '',
    updated: '',
    parallel: '',
    depends_on: '',
    assignee: '',
    assigned_to: ''
  };

  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const lines = yamlMatch[1].split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(metadata, cleanKey)) {
          metadata[cleanKey] = value;
        }
      }
    }
  } else {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':') && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(metadata, cleanKey)) {
          metadata[cleanKey] = value;
        }
      } else if (trimmedLine.startsWith('#') || trimmedLine === '') {
        break;
      }
    }
  }

  return metadata;
}

function getAvailableEpics() {
  if (!fs.existsSync('.claude/epics')) return [];
  try {
    return fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

function isTaskClosed(status) {
  return ['closed', 'completed', 'done'].includes((status || '').toLowerCase());
}

function epicStatus(epicName) {
  if (!epicName || epicName.trim() === '') {
    throw new Error('Please specify an epic name\nUsage: /pm:epic-status <epic-name>');
  }

  const epicDir = `.claude/epics/${epicName}`;
  const epicFilePath = `${epicDir}/epic.md`;

  if (!fs.existsSync(epicFilePath)) {
    const availableEpics = getAvailableEpics();
    let errorMessage = `Epic not found: ${epicName}\n\nAvailable epics:`;
    if (availableEpics.length > 0) {
      for (const epic of availableEpics) errorMessage += `\n  - ${epic}`;
    } else {
      errorMessage += '\n  (none)';
    }
    throw new Error(errorMessage);
  }

  let epicMetadata;
  try {
    const epicContent = fs.readFileSync(epicFilePath, 'utf8');
    epicMetadata = parseMetadata(epicContent);
  } catch (error) {
    epicMetadata = { name: epicName, status: 'planning', progress: '0%', github: '', created: 'unknown' };
  }

  const epic = {
    name: epicMetadata.name || epicName,
    status: epicMetadata.status || 'planning',
    progress: epicMetadata.progress || '0%',
    github: epicMetadata.github || ''
  };

  // Analyze tasks
  const tasks = [];
  let totalTasks = 0;
  let closedTasks = 0;

  try {
    const files = fs.readdirSync(epicDir);
    const taskFiles = files.filter(file => /^\d+\.md$/.test(file)).sort((a, b) => parseInt(a) - parseInt(b));

    for (const file of taskFiles) {
      const taskFilePath = path.join(epicDir, file);
      const taskNum = path.basename(file, '.md');

      let taskMetadata;
      try {
        const taskContent = fs.readFileSync(taskFilePath, 'utf8');
        taskMetadata = parseMetadata(taskContent);
      } catch (error) {
        taskMetadata = { name: '', status: 'open', depends_on: '', updated: '' };
      }

      const status = taskMetadata.status || 'open';
      const taskName = taskMetadata.name || `Task #${taskNum}`;
      const updated = taskMetadata.updated ? taskMetadata.updated.split('T')[0] : '\u2014';
      const assignee = taskMetadata.assignee || taskMetadata.assigned_to || '\u2014';

      totalTasks++;
      if (isTaskClosed(status)) closedTasks++;

      tasks.push({ num: taskNum, name: taskName, status, updated, assignee });
    }
  } catch (error) { /* skip */ }

  const progressPercent = totalTasks > 0 ? Math.round((closedTasks * 100) / totalTasks) : 0;

  return {
    epic,
    tasks,
    taskBreakdown: { totalTasks, closedTasks },
    progressPercent
  };
}

function formatEpicStatus(epicName, data) {
  const lines = [];

  lines.push(`## Epic: ${data.epic.name}`);
  lines.push('');
  lines.push(`**Status:** ${data.epic.status} | **Progress:** ${data.progressPercent}% | **Tasks:** ${data.taskBreakdown.closedTasks}/${data.taskBreakdown.totalTasks} done`);
  lines.push('');

  if (data.tasks.length > 0) {
    lines.push('| # | Task | Status | Updated | Assignee |');
    lines.push('|---|------|--------|---------|----------|');
    for (const t of data.tasks) {
      lines.push(`| ${t.num} | ${t.name} | ${t.status} | ${t.updated} | ${t.assignee} |`);
    }
  } else {
    lines.push('No tasks created yet.');
  }

  // Find next open task for suggestion
  const nextOpen = data.tasks.find(t => {
    const s = (t.status || '').toLowerCase();
    return s === 'open' || s === 'todo' || s === '';
  });

  // Recent Activity section
  try {
    const loggerPath = require('path').join(process.cwd(), '.claude', 'lib', 'event-logger');
    const { formatRecentActivity } = require(loggerPath);
    lines.push('');
    lines.push(formatRecentActivity(7));
  } catch (e) { /* event logger not available */ }

  lines.push('');
  if (nextOpen) {
    lines.push(`Next: /pm:issue-start ${nextOpen.num}`);
  } else {
    lines.push('Next: /pm:next');
  }

  return lines.join('\n');
}

module.exports = epicStatus;

if (require.main === module) {
  const epicName = process.argv[2];

  try {
    const data = epicStatus(epicName);
    console.log(formatEpicStatus(epicName, data));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
