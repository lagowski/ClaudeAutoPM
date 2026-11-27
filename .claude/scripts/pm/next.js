const fs = require('fs');
const path = require('path');
const { logError } = require('./lib/logger');
const { findAllEpicDirs } = require('./lib/epic-discovery');

/**
 * PM Next Script
 * Shows the single highest-priority open task in structured TODO format.
 */

async function next() {
  const result = {
    availableTasks: [],
    found: 0,
    recommended: null,
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

  try {
    const availableTasks = await findAvailableTasks();
    result.availableTasks = availableTasks;
    result.found = availableTasks.length;

    if (availableTasks.length > 0) {
      const task = availableTasks[0];
      result.recommended = task;

      addMessage('## Next Task');
      addMessage('');
      addMessage(`### ${task.name}`);
      addMessage(`**What:** ${task.description || 'See task details'}`);
      addMessage(`**Why:** ${task.why || 'See task details'}`);
      addMessage(`**Effort:** ${formatEffort(task.estimatedHours) || 'Unknown'}`);
      addMessage(`**Priority:** ${task.priority || 'P2'}`);
      addMessage(`**Epic:** ${task.epicName || '\u2014'}`);
      addMessage(`**Depends on:** ${task.dependencies || '\u2014'}`);
      addMessage(`**Files:** ${task.affectedFiles || '\u2014'}`);
      addMessage('');
      addMessage(`To start: /pm:issue-start ${task.taskNum}`);
    } else {
      addMessage('## Next Task');
      addMessage('');
      addMessage('No open tasks found.');
      addMessage('');
      addMessage('Create new work:');
      addMessage('- /pm:prd-new "Feature Name" — create new PRD');
      addMessage('- /pm:epic-decompose {epic} — decompose existing epic');
    }
  } catch (err) {
    addMessage('## Next Task');
    addMessage('');
    addMessage('No open tasks found.');
    addMessage('');
    addMessage('Create new work:');
    addMessage('- /pm:prd-new "Feature Name" — create new PRD');
    addMessage('- /pm:epic-decompose {epic} — decompose existing epic');
  }

  return result;
}

/**
 * Find available tasks sorted by priority, extracting structured metadata.
 */
async function findAvailableTasks() {
  const availableTasks = [];
  const epicDirs = findAllEpicDirs();

  for (const epicDir of epicDirs) {
    const { name: epicName, path: epicPath } = epicDir;

    try {
      const taskFiles = fs.readdirSync(epicPath)
        .filter(file => /^\d+.*\.md$/.test(file))
        .sort();

      for (const taskFile of taskFiles) {
        const taskPath = path.join(epicPath, taskFile);

        try {
          const content = fs.readFileSync(taskPath, 'utf8');

          const statusMatch = content.match(/^status:\s*(.+)$/m);
          const status = statusMatch ? statusMatch[1].trim().toLowerCase() : '';

          if (status !== 'open' && status !== '') {
            continue;
          }

          const depsMatch = content.match(/^depends_on:\s*\[(.*?)\]/m);
          const depsStr = depsMatch ? depsMatch[1].trim() : '';

          if (depsStr && depsStr !== '') {
            continue;
          }

          const nameMatch = content.match(/^name:\s*(.+)$/m);
          const name = nameMatch ? nameMatch[1].trim() : 'Unnamed Task';

          const priorityMatch = content.match(/^priority:\s*(.+)$/m);
          const priority = priorityMatch ? priorityMatch[1].trim() : null;

          const hoursMatch = content.match(/^estimated_hours:\s*(.+)$/m);
          const estimatedHours = hoursMatch ? hoursMatch[1].trim() : null;

          const parallelMatch = content.match(/^parallel:\s*(.+)$/m);
          const parallel = parallelMatch ? parallelMatch[1].trim() === 'true' : false;

          // Extract description: first non-empty line after frontmatter
          const description = extractDescription(content);

          // Extract why/goal from content
          const why = extractGoalOrObjective(content);

          // Extract affected files section
          const affectedFiles = extractAffectedFiles(content);

          // Extract dependencies display string
          const dependsDisplay = extractDependencies(content);

          const taskNum = path.basename(taskFile, '.md');

          availableTasks.push({
            taskNum,
            name,
            epicName,
            parallel,
            priority,
            estimatedHours,
            description,
            why,
            affectedFiles,
            dependencies: dependsDisplay
          });
        } catch (err) {
          if (process.env.DEBUG) {
            console.error(`Error reading task file ${taskPath}:`, err.message);
          }
        }
      }
    } catch (err) {
      if (process.env.DEBUG) {
        console.error(`Error reading epic directory ${epicPath}:`, err.message);
      }
    }
  }

  // Sort by priority (P0 > P1 > P2 > P3 > unset)
  availableTasks.sort((a, b) => {
    const pa = parsePriority(a.priority);
    const pb = parsePriority(b.priority);
    return pa - pb;
  });

  return availableTasks;
}

function formatEffort(hours) {
  if (!hours) return null;
  const h = parseFloat(hours);
  if (isNaN(h)) return hours;
  if (h <= 2) return 'S';
  if (h <= 8) return 'M';
  return 'L';
}

function parsePriority(p) {
  if (!p) return 99;
  const match = p.match(/P(\d)/i);
  return match ? parseInt(match[1], 10) : 99;
}

function extractDescription(content) {
  // Get first non-empty line after closing frontmatter ---
  const parts = content.split(/^---$/m);
  if (parts.length >= 3) {
    const body = parts.slice(2).join('---').trim();
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed;
      }
    }
  }
  return null;
}

function extractGoalOrObjective(content) {
  // Look for Goal or Objective section
  const goalMatch = content.match(/^#+\s*(?:Goal|Objective|Why)\s*\n+([\s\S]*?)(?=\n#|\n---|\Z)/mi);
  if (goalMatch) {
    const firstLine = goalMatch[1].trim().split('\n')[0].trim();
    if (firstLine) return firstLine;
  }
  return null;
}

function extractAffectedFiles(content) {
  const match = content.match(/^#+\s*(?:Affected Files|Files|File Changes)\s*\n+([\s\S]*?)(?=\n#|\n---|\Z)/mi);
  if (match) {
    const lines = match[1].trim().split('\n')
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l);
    if (lines.length > 0) return lines.slice(0, 5).join(', ');
  }
  return null;
}

function extractDependencies(content) {
  const match = content.match(/^#+\s*(?:Dependencies|Depends on)\s*\n+([\s\S]*?)(?=\n#|\n---|\Z)/mi);
  if (match) {
    const firstLine = match[1].trim().split('\n')[0].trim();
    if (firstLine) return firstLine;
  }
  return null;
}

module.exports = {
  next,
  findAvailableTasks
};

if (require.main === module) {
  module.exports.next().then(() => {
    process.exit(0);
  }).catch(err => {
    logError('Next tasks command failed', err);
    process.exit(1);
  });
}
