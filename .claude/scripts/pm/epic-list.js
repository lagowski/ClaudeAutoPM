#!/usr/bin/env node

/**
 * PM Epic List Script - Node.js Implementation
 *
 * Migrated from epic-list.sh to provide epic listing functionality
 * Maintains full compatibility with the original bash implementation
 *
 * Features:
 * - Lists epics categorized by status (planning, in-progress, completed)
 * - Extracts metadata from frontmatter (name, status, progress, github)
 * - Counts tasks per epic
 * - Provides summary statistics
 * - Handles various status formats
 * - Extracts GitHub issue numbers
 */

const fs = require('fs');
const path = require('path');

function parseMetadata(content) {
  const metadata = {
    name: '',
    status: '',
    progress: '',
    github: '',
    created: ''
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

function categorizeStatus(status) {
  const lowerStatus = (status || '').toLowerCase();

  // Planning statuses
  if (['planning', 'draft', ''].includes(lowerStatus)) {
    return 'planning';
  }

  // In-progress statuses
  if (['in-progress', 'in_progress', 'active', 'started'].includes(lowerStatus)) {
    return 'inProgress';
  }

  // Completed statuses
  if (['completed', 'complete', 'done', 'closed', 'finished'].includes(lowerStatus)) {
    return 'completed';
  }

  // Default to planning for unknown statuses
  return 'planning';
}

function extractGitHubIssue(githubUrl) {
  if (!githubUrl) return null;

  const match = githubUrl.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

function countTasks(epicDir) {
  try {
    const files = fs.readdirSync(epicDir);
    // Count files that match pattern [0-9]*.md (same as bash: ls "$dir"[0-9]*.md)
    return files.filter(file => /^\d+\.md$/.test(file)).length;
  } catch (error) {
    return 0;
  }
}

function listEpics() {
  const result = {
    planning: [],
    inProgress: [],
    completed: [],
    summary: {
      totalEpics: 0,
      totalTasks: 0
    }
  };

  // Check if epics directory exists
  if (!fs.existsSync('.claude/epics')) {
    return result;
  }

  let epicDirs;
  try {
    epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    return result;
  }

  let totalTasks = 0;

  for (const epicDir of epicDirs) {
    const epicPath = path.join('.claude/epics', epicDir);
    const epicFilePath = path.join(epicPath, 'epic.md');

    // Skip directories without epic.md file
    if (!fs.existsSync(epicFilePath)) {
      continue;
    }

    let metadata;
    try {
      const content = fs.readFileSync(epicFilePath, 'utf8');
      metadata = parseMetadata(content);
    } catch (error) {
      // Skip files that can't be read, or use defaults
      metadata = {
        name: '',
        status: '',
        progress: '',
        github: '',
        created: ''
      };
    }

    // Apply defaults
    const name = metadata.name || epicDir;
    const progress = metadata.progress || '0%';
    const status = metadata.status || 'planning';
    const github = metadata.github || '';
    const created = metadata.created || '';

    // Count tasks
    const taskCount = countTasks(epicPath);
    totalTasks += taskCount;

    // Extract GitHub issue number
    const githubIssue = extractGitHubIssue(github);

    const epicData = {
      name,
      status,
      progress,
      github,
      githubIssue,
      created,
      taskCount,
      epicDir,
      epicPath: `${epicPath}/epic.md`
    };

    // Categorize by status
    const category = categorizeStatus(status);
    result[category].push(epicData);
  }

  result.summary.totalEpics = epicDirs.length;
  result.summary.totalTasks = totalTasks;

  return result;
}

function formatEpicList(data) {
  let output = 'Getting epics...\n\n\n';

  // Check if no epics directory or empty
  if (data.summary.totalEpics === 0) {
    if (!fs.existsSync('.claude/epics')) {
      output += '📁 No epics directory found. Create your first epic with: /pm:prd-parse <feature-name>\n';
      return output;
    } else {
      output += '📁 No epics found. Create your first epic with: /pm:prd-parse <feature-name>\n';
      return output;
    }
  }

  output += '📚 Project Epics\n';
  output += '================\n\n';

  // Planning section
  output += '📝 Planning:\n';
  if (data.planning.length > 0) {
    for (const epic of data.planning) {
      const issueText = epic.githubIssue ? ` (#${epic.githubIssue})` : '';
      output += `   📋 ${epic.epicPath}${issueText} - ${epic.progress} complete (${epic.taskCount} tasks)\n`;
    }
  } else {
    output += '   (none)\n';
  }

  output += '\n';

  // In Progress section
  output += '🚀 In Progress:\n';
  if (data.inProgress.length > 0) {
    for (const epic of data.inProgress) {
      const issueText = epic.githubIssue ? ` (#${epic.githubIssue})` : '';
      output += `   📋 ${epic.epicPath}${issueText} - ${epic.progress} complete (${epic.taskCount} tasks)\n`;
    }
  } else {
    output += '   (none)\n';
  }

  output += '\n';

  // Completed section
  output += '✅ Completed:\n';
  if (data.completed.length > 0) {
    for (const epic of data.completed) {
      const issueText = epic.githubIssue ? ` (#${epic.githubIssue})` : '';
      output += `   📋 ${epic.epicPath}${issueText} - ${epic.progress} complete (${epic.taskCount} tasks)\n`;
    }
  } else {
    output += '   (none)\n';
  }

  // Summary
  output += '\n📊 Summary\n';
  output += `   Total epics: ${data.summary.totalEpics}\n`;
  output += `   Total tasks: ${data.summary.totalTasks}\n`;

  return output;
}

// CommonJS export for testing
module.exports = listEpics;

// CLI execution
if (require.main === module) {
  try {
    const data = listEpics();
    console.log(formatEpicList(data));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing epics:', error.message);
    process.exit(1);
  }
}