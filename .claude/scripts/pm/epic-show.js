#!/usr/bin/env node

/**
 * PM Epic Show Script - Node.js Implementation
 *
 * Migrated from epic-show.sh to provide detailed epic information
 * Maintains full compatibility with the original bash implementation
 *
 * Features:
 * - Shows detailed epic information including metadata
 * - Lists all tasks with their status and properties
 * - Provides statistics (total, open, closed, completion percentage)
 * - Suggests next actions based on epic state
 * - Handles various task status formats
 * - Extracts metadata from frontmatter
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
    parallel: '',
    depends_on: ''
  };

  // Handle YAML frontmatter (between --- lines)
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const yamlContent = yamlMatch[1];
    const lines = yamlContent.split('\n');

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
    // Handle simple key-value format (key: value lines at start of file)
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
        // Stop parsing when we hit content
        break;
      }
    }
  }

  return metadata;
}

function getAvailableEpics() {
  if (!fs.existsSync('.claude/epics')) {
    return [];
  }

  try {
    return fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

function isTaskClosed(status) {
  const lowerStatus = (status || '').toLowerCase();
  return ['closed', 'completed'].includes(lowerStatus);
}

function showEpic(epicName) {
  if (!epicName || epicName.trim() === '') {
    throw new Error('❌ Please provide an epic name\nUsage: /pm:epic-show <epic-name>');
  }

  const epicDir = `.claude/epics/${epicName}`;
  const epicFilePath = `${epicDir}/epic.md`;

  // Check if epic exists
  if (!fs.existsSync(epicFilePath)) {
    const availableEpics = getAvailableEpics();
    let errorMessage = `❌ Epic not found: ${epicName}\n\nAvailable epics:`;

    if (availableEpics.length > 0) {
      for (const epic of availableEpics) {
        errorMessage += `\n  • ${epic}`;
      }
    } else {
      errorMessage += '\n  (none)';
    }

    throw new Error(errorMessage);
  }

  // Parse epic metadata
  let epicMetadata;
  try {
    const epicContent = fs.readFileSync(epicFilePath, 'utf8');
    epicMetadata = parseMetadata(epicContent);
  } catch (error) {
    // Use defaults if file can't be read
    epicMetadata = {
      name: epicName,
      status: 'planning',
      progress: '0%',
      github: '',
      created: 'unknown'
    };
  }

  // Apply defaults
  const epic = {
    name: epicMetadata.name || epicName,
    status: epicMetadata.status || 'planning',
    progress: epicMetadata.progress || '0%',
    github: epicMetadata.github || '',
    created: epicMetadata.created || 'unknown'
  };

  // Parse tasks
  const tasks = [];
  let taskCount = 0;
  let openCount = 0;
  let closedCount = 0;

  try {
    const files = fs.readdirSync(epicDir);
    const taskFiles = files.filter(file => /^\d+\.md$/.test(file));

    for (const file of taskFiles) {
      const taskFilePath = path.join(epicDir, file);
      const taskNum = path.basename(file, '.md');

      let taskMetadata;
      try {
        const taskContent = fs.readFileSync(taskFilePath, 'utf8');
        taskMetadata = parseMetadata(taskContent);
      } catch (error) {
        // Use defaults if file can't be read
        taskMetadata = {
          name: taskNum,
          status: 'open',
          parallel: 'false',
          depends_on: ''
        };
      }

      const task = {
        taskNum,
        name: taskMetadata.name || taskNum,
        status: taskMetadata.status || 'open',
        parallel: taskMetadata.parallel || 'false',
        depends_on: taskMetadata.depends_on || ''
      };

      tasks.push(task);
      taskCount++;

      if (isTaskClosed(task.status)) {
        closedCount++;
      } else {
        openCount++;
      }
    }
  } catch (error) {
    // Directory can't be read, continue with empty tasks
  }

  // Calculate completion percentage
  const completion = taskCount > 0 ? Math.round((closedCount * 100) / taskCount) : 0;

  // Generate action suggestions
  const actions = [];

  if (taskCount === 0) {
    actions.push('• Decompose into tasks: /pm:epic-decompose ' + epicName);
  }

  if (!epic.github && taskCount > 0) {
    actions.push('• Sync to GitHub: /pm:epic-sync ' + epicName);
  }

  if (epic.github && epic.status !== 'completed') {
    actions.push('• Start work: /pm:epic-start ' + epicName);
  }

  return {
    epic,
    tasks,
    statistics: {
      totalTasks: taskCount,
      openTasks: openCount,
      closedTasks: closedCount,
      completion
    },
    actions
  };
}

function formatEpicShow(epicName, data) {
  let output = 'Getting epic...\n\n\n';

  output += `📚 Epic: ${epicName}\n`;
  output += '================================\n\n';

  // Metadata section
  output += '📊 Metadata:\n';
  output += `  Status: ${data.epic.status}\n`;
  output += `  Progress: ${data.epic.progress}\n`;
  if (data.epic.github) {
    output += `  GitHub: ${data.epic.github}\n`;
  }
  output += `  Created: ${data.epic.created}\n\n`;

  // Tasks section
  output += '📝 Tasks:\n';
  if (data.tasks.length > 0) {
    for (const task of data.tasks) {
      const icon = isTaskClosed(task.status) ? '✅' : '⬜';
      let taskLine = `  ${icon} #${task.taskNum} - ${task.name}`;

      if (!isTaskClosed(task.status) && task.parallel === 'true') {
        taskLine += ' (parallel)';
      }

      output += taskLine + '\n';
    }
  } else {
    output += '  No tasks created yet\n';
    output += `  Run: /pm:epic-decompose ${epicName}\n`;
  }

  // Statistics section
  output += '\n📈 Statistics:\n';
  output += `  Total tasks: ${data.statistics.totalTasks}\n`;
  output += `  Open: ${data.statistics.openTasks}\n`;
  output += `  Closed: ${data.statistics.closedTasks}\n`;
  if (data.statistics.totalTasks > 0) {
    output += `  Completion: ${data.statistics.completion}%\n`;
  }

  // Actions section
  output += '\n💡 Actions:\n';
  if (data.actions.length > 0) {
    for (const action of data.actions) {
      output += `  ${action}\n`;
    }
  } else {
    output += '  No specific actions suggested\n';
  }

  return output;
}

// CommonJS export for testing
module.exports = showEpic;

// CLI execution
if (require.main === module) {
  const epicName = process.argv[2];

  try {
    const data = showEpic(epicName);
    console.log(formatEpicShow(epicName, data));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}