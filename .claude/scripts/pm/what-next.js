const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { logError, logWarning, logDebug } = require('./lib/logger');

/**
 * PM What-Next Script
 * Shows top 3 task candidates in structured TODO format with full context.
 */

// Task file naming pattern (e.g., 001.md, 002.md)
const TASK_FILE_PATTERN = /^\d{3}\.md$/;

// Epic complexity detection thresholds
const COMPLEXITY_THRESHOLDS = {
  LARGE_EPIC_SIZE: parseInt(process.env.PM_LARGE_EPIC_SIZE) || 5000,
  MANY_TASKS: parseInt(process.env.PM_MANY_TASKS) || 20,
  ARCHITECTURE_KEYWORDS: {
    frontend: ['frontend', 'ui', 'client', 'react', 'vue', 'angular'],
    backend: ['backend', 'api', 'server', 'service'],
    database: ['database', 'db', 'postgres', 'mysql', 'mongodb'],
    infrastructure: ['infrastructure', 'deploy', 'k8s', 'kubernetes', 'docker', 'ci/cd'],
    integration: ['integration', 'third-party', 'external api', 'webhook']
  }
};

async function whatNext() {
  const state = await analyzeProjectState();
  const suggestions = generateSuggestions(state);

  // If we have open tasks, show structured top-3 format
  if (state.openTasks.length > 0) {
    displayStructuredTasks(state.openTasks, state);
    return;
  }

  // Otherwise fall back to suggestion-based output
  displayProjectStatus(state);
  console.log('');
  displaySuggestions(suggestions);
  console.log('');
}

/**
 * Display top 3 open tasks in structured TODO format.
 */
function displayStructuredTasks(openTasks, state) {
  // Sort by priority
  const sorted = [...openTasks].sort((a, b) => {
    const pa = parsePriority(a.priority);
    const pb = parsePriority(b.priority);
    return pa - pb;
  });

  const top3 = sorted.slice(0, 3);

  console.log(`## What's Next? (Top ${top3.length} by priority)`);
  console.log('');

  top3.forEach((task, i) => {
    const rank = i + 1;
    const suffix = rank === 1 ? ' ⭐ Recommended' : '';
    console.log(`### ${rank}. ${task.name}${suffix}`);
    console.log(`**What:** ${task.description || 'See task details'}`);
    console.log(`**Why:** ${task.why || 'See task details'}`);
    console.log(`**Effort:** ${task.effort || 'Unknown'} | **Priority:** ${task.priority || 'P2'}`);
    console.log(`**Epic:** ${task.epicName || '—'}`);
    console.log(`**Depends on:** ${task.dependencies || '—'}`);
    if (task.affectedFiles) {
      console.log(`**Files:** ${task.affectedFiles}`);
    }
    console.log('');
  });

  if (top3.length > 0) {
    console.log(`To start: /pm:issue-start ${top3[0].taskNum}`);
  }
}

// ============================================================================
// State Analysis
// ============================================================================

async function analyzeProjectState() {
  const state = {
    hasPRDs: false,
    prdCount: 0,
    prds: [],
    hasEpics: false,
    epicCount: 0,
    epics: [],
    hasConfig: false,
    provider: null,
    hasActiveTasks: false,
    activeTaskCount: 0,
    completedTaskCount: 0,
    totalTaskCount: 0,
    inProgressTasks: [],
    openTasks: []
  };

  // Check for PRDs
  if (fs.existsSync('.claude/prds')) {
    const prdFiles = fs.readdirSync('.claude/prds')
      .filter(f => f.endsWith('.md') && !f.startsWith('.'));
    state.hasPRDs = prdFiles.length > 0;
    state.prdCount = prdFiles.length;
    state.prds = prdFiles.map(f => f.replace('.md', ''));
  }

  // Check for epics
  if (fs.existsSync('.claude/epics')) {
    const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    state.hasEpics = epicDirs.length > 0;
    state.epicCount = epicDirs.length;

    const epicAnalysisPromises = epicDirs.map(epicName => {
      const epicPath = path.join('.claude/epics', epicName);
      return analyzeEpicAsync(epicPath, epicName)
        .catch(err => {
          logWarning(`Failed to analyze epic "${epicName}": ${err.message}`);
          logDebug(err.stack);
          return {
            name: epicName,
            path: epicPath,
            hasTasks: false,
            taskCount: 0,
            completedCount: 0,
            inProgressCount: 0,
            openCount: 0,
            inProgressTasks: [],
            openTasks: [],
            isComplex: false,
            hasArchitecture: false,
            analysisFailed: true
          };
        });
    });

    const epicInfos = await Promise.all(epicAnalysisPromises);

    for (const epicInfo of epicInfos) {
      state.epics.push(epicInfo);
      state.totalTaskCount += epicInfo.taskCount;
      state.completedTaskCount += epicInfo.completedCount;
      state.activeTaskCount += epicInfo.inProgressCount;
      state.inProgressTasks.push(...epicInfo.inProgressTasks);
      state.openTasks.push(...epicInfo.openTasks);
    }

    state.hasActiveTasks = state.activeTaskCount > 0;
  }

  // Check configuration
  if (fs.existsSync('.claude/config.json')) {
    try {
      const config = JSON.parse(fs.readFileSync('.claude/config.json', 'utf8'));
      state.hasConfig = true;
      state.provider = config.provider || null;
    } catch (err) {
      // Ignore config errors
    }
  }

  return state;
}

// Analyze single epic (async for parallel processing)
async function analyzeEpicAsync(epicPath, epicName) {
  const info = {
    name: epicName,
    hasEpicFile: false,
    hasTasks: false,
    taskCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    openCount: 0,
    syncedToGitHub: false,
    inProgressTasks: [],
    openTasks: []
  };

  // Check for epic.md
  const epicFile = path.join(epicPath, 'epic.md');
  try {
    await fsPromises.access(epicFile);
    info.hasEpicFile = true;
    const content = await fsPromises.readFile(epicFile, 'utf8');
    info.syncedToGitHub = /^github:/m.test(content);
  } catch (err) {
    // File doesn't exist or can't be read
  }

  // Check for task files
  try {
    const files = await fsPromises.readdir(epicPath);
    const taskFiles = files.filter(f => TASK_FILE_PATTERN.test(f));

    info.hasTasks = taskFiles.length > 0;
    info.taskCount = taskFiles.length;

    const taskAnalysisPromises = taskFiles.map(async (taskFile) => {
      const taskPath = path.join(epicPath, taskFile);
      try {
        const content = await fsPromises.readFile(taskPath, 'utf8');
        const statusMatch = content.match(/^status:\s*(.+)$/m);
        const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'open';

        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const taskName = nameMatch ? nameMatch[1].trim() : taskFile;

        const priorityMatch = content.match(/^priority:\s*(.+)$/m);
        const priority = priorityMatch ? priorityMatch[1].trim() : null;

        const hoursMatch = content.match(/^estimated_hours:\s*(.+)$/m);
        const estimatedHours = hoursMatch ? hoursMatch[1].trim() : null;

        const taskNum = taskFile.replace('.md', '');

        // Extract rich metadata for structured output
        const description = extractDescription(content);
        const why = extractGoalOrObjective(content);
        const affectedFiles = extractAffectedFiles(content);
        const dependencies = extractDependencies(content);
        const effort = formatEffort(estimatedHours);

        return {
          status, taskName, taskNum,
          priority, estimatedHours, effort,
          description, why, affectedFiles, dependencies
        };
      } catch (err) {
        return null;
      }
    });

    const taskResults = await Promise.all(taskAnalysisPromises);

    for (const result of taskResults) {
      if (!result) continue;

      const { status, taskName, taskNum } = result;

      if (status === 'completed' || status === 'done' || status === 'closed') {
        info.completedCount++;
      } else if (status === 'in-progress' || status === 'in_progress') {
        info.inProgressCount++;
        info.inProgressTasks.push({
          epicName, taskNum, name: taskName,
          priority: result.priority,
          description: result.description,
          why: result.why,
          effort: result.effort,
          affectedFiles: result.affectedFiles,
          dependencies: result.dependencies
        });
      } else {
        info.openCount++;
        info.openTasks.push({
          epicName, taskNum, name: taskName,
          priority: result.priority,
          description: result.description,
          why: result.why,
          effort: result.effort,
          affectedFiles: result.affectedFiles,
          dependencies: result.dependencies
        });
      }
    }
  } catch (err) {
    // Ignore directory read errors
  }

  return info;
}

// Analyze single epic (synchronous - kept for backward compatibility)
function analyzeEpic(epicPath, epicName) {
  const info = {
    name: epicName,
    hasEpicFile: false,
    hasTasks: false,
    taskCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    openCount: 0,
    syncedToGitHub: false,
    inProgressTasks: [],
    openTasks: []
  };

  const epicFile = path.join(epicPath, 'epic.md');
  info.hasEpicFile = fs.existsSync(epicFile);

  if (info.hasEpicFile) {
    try {
      const content = fs.readFileSync(epicFile, 'utf8');
      info.syncedToGitHub = /^github:/m.test(content);
    } catch (err) {
      // Ignore read errors
    }
  }

  try {
    const taskFiles = fs.readdirSync(epicPath)
      .filter(f => TASK_FILE_PATTERN.test(f));

    info.hasTasks = taskFiles.length > 0;
    info.taskCount = taskFiles.length;

    for (const taskFile of taskFiles) {
      const taskPath = path.join(epicPath, taskFile);
      try {
        const content = fs.readFileSync(taskPath, 'utf8');
        const statusMatch = content.match(/^status:\s*(.+)$/m);
        const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'open';

        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const taskName = nameMatch ? nameMatch[1].trim() : taskFile;

        const taskNum = taskFile.replace('.md', '');

        if (status === 'completed' || status === 'done' || status === 'closed') {
          info.completedCount++;
        } else if (status === 'in-progress' || status === 'in_progress') {
          info.inProgressCount++;
          info.inProgressTasks.push({ epicName, taskNum, name: taskName });
        } else {
          info.openCount++;
          info.openTasks.push({ epicName, taskNum, name: taskName });
        }
      } catch (err) {
        // Ignore task read errors
      }
    }
  } catch (err) {
    // Ignore directory read errors
  }

  return info;
}

// ============================================================================
// Content Extraction Helpers
// ============================================================================

function parsePriority(p) {
  if (!p) return 99;
  const match = p.match(/P(\d)/i);
  return match ? parseInt(match[1], 10) : 99;
}

function formatEffort(hours) {
  if (!hours) return null;
  const h = parseFloat(hours);
  if (isNaN(h)) return hours;
  if (h <= 2) return 'S';
  if (h <= 8) return 'M';
  return 'L';
}

function extractDescription(content) {
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

// ============================================================================
// Epic Complexity Detection
// ============================================================================

function detectEpicComplexity(epicContent, epicInfo = {}) {
  const reasons = [];

  if (!epicContent) {
    return { isComplex: false, reasons: [] };
  }

  const contentLower = epicContent.toLowerCase();

  const hasMultipleLayers = detectMultipleArchitectureLayers(contentLower);
  if (hasMultipleLayers.detected) {
    reasons.push(`Multiple architecture layers: ${hasMultipleLayers.layers.join(', ')}`);
  }

  if (epicContent.length > COMPLEXITY_THRESHOLDS.LARGE_EPIC_SIZE) {
    reasons.push(`Large epic size: ${epicContent.length} characters (threshold: ${COMPLEXITY_THRESHOLDS.LARGE_EPIC_SIZE})`);
  }

  if (epicInfo.taskCount && epicInfo.taskCount > COMPLEXITY_THRESHOLDS.MANY_TASKS) {
    reasons.push(`Many tasks: ${epicInfo.taskCount} (threshold: ${COMPLEXITY_THRESHOLDS.MANY_TASKS})`);
  }

  const hasInfrastructure = COMPLEXITY_THRESHOLDS.ARCHITECTURE_KEYWORDS.infrastructure
    .some(keyword => contentLower.includes(keyword));
  if (hasInfrastructure) {
    reasons.push('Contains infrastructure/deployment components');
  }

  const hasIntegrations = COMPLEXITY_THRESHOLDS.ARCHITECTURE_KEYWORDS.integration
    .some(keyword => contentLower.includes(keyword));
  if (hasIntegrations) {
    reasons.push('Contains external service integrations');
  }

  return {
    isComplex: reasons.length >= 2,
    reasons
  };
}

function detectMultipleArchitectureLayers(contentLower) {
  const layers = [];
  const keywords = COMPLEXITY_THRESHOLDS.ARCHITECTURE_KEYWORDS;

  for (const [layerName, layerKeywords] of Object.entries(keywords)) {
    if (layerName === 'integration') continue;
    const hasLayer = layerKeywords.some(keyword => contentLower.includes(keyword));
    if (hasLayer) {
      layers.push(layerName);
    }
  }

  return {
    detected: layers.length >= 2,
    layers
  };
}

// ============================================================================
// Suggestion Generation (fallback when no open tasks)
// ============================================================================

function generateSuggestions(state) {
  const suggestions = [];

  if (!state.hasPRDs) {
    suggestions.push({
      priority: 'high',
      recommended: true,
      title: 'Create Your First PRD',
      description: 'Start by defining what you want to build',
      commands: [
        { cmd: '/pm:prd-new my-feature', note: 'Replace "my-feature" with your feature name' }
      ],
      why: 'PRDs define requirements and guide the entire development process'
    });
    return suggestions;
  }

  if (state.hasPRDs && !state.hasEpics) {
    for (const prd of state.prds) {
      suggestions.push({
        priority: 'high',
        recommended: true,
        title: `Parse PRD: "${prd}"`,
        description: 'Convert your requirements into an executable epic',
        commands: [
          { cmd: `/pm:prd-parse ${prd}`, note: 'Analyzes PRD and creates epic structure' }
        ],
        why: 'This creates the epic structure needed for task breakdown'
      });
    }
    return suggestions;
  }

  const epicsNeedingDecomposition = state.epics.filter(e => e.hasEpicFile && !e.hasTasks);
  if (epicsNeedingDecomposition.length > 0) {
    for (const epic of epicsNeedingDecomposition) {
      const epicContent = tryReadFile(path.join('.claude/epics', epic.name, 'epic.md'));
      const complexityResult = detectEpicComplexity(epicContent, epic);

      if (complexityResult.isComplex) {
        suggestions.push({
          priority: 'high',
          recommended: true,
          title: `Split Epic: "${epic.name}" (Complex Project)`,
          description: 'Break into multiple sub-epics for parallel work',
          commands: [
            { cmd: `/pm:epic-split ${epic.name}`, note: 'Creates multiple sub-epics (frontend, backend, etc.)' },
            { cmd: `# Then decompose each sub-epic:`, note: '' },
            { cmd: `/pm:epic-decompose ${epic.name}/01-*`, note: 'Repeat for each sub-epic' }
          ],
          why: 'Large projects work better when split into focused components'
        });
      } else {
        suggestions.push({
          priority: 'high',
          recommended: true,
          title: `Decompose Epic: "${epic.name}"`,
          description: 'Break epic into actionable tasks',
          commands: [
            { cmd: `/pm:epic-decompose ${epic.name}`, note: 'Creates numbered task files' }
          ],
          why: 'Tasks are the actual work items that get implemented'
        });
      }
    }
    return suggestions;
  }

  const epicsNeedingSync = state.epics.filter(e => e.hasTasks && !e.syncedToGitHub);
  if (epicsNeedingSync.length > 0) {
    for (const epic of epicsNeedingSync) {
      suggestions.push({
        priority: 'high',
        recommended: true,
        title: `Sync Epic: "${epic.name}" to GitHub`,
        description: 'Create GitHub issues for tracking',
        commands: [
          { cmd: `/pm:epic-sync ${epic.name}`, note: 'Creates epic + task issues on GitHub' }
        ],
        why: 'GitHub issues enable team collaboration and progress tracking'
      });
    }
    return suggestions;
  }

  if (state.inProgressTasks.length > 0) {
    suggestions.push({
      priority: 'medium',
      recommended: true,
      title: 'Continue In-Progress Work',
      description: `You have ${state.inProgressTasks.length} tasks currently in progress`,
      commands: state.inProgressTasks.slice(0, 3).map(t => ({
        cmd: `/pm:issue-show ${t.taskNum}`,
        note: `"${t.name}"`
      })),
      why: 'Finish what you started before starting new work'
    });
  }

  if (state.completedTaskCount === state.totalTaskCount && state.totalTaskCount > 0) {
    suggestions.push({
      priority: 'medium',
      recommended: true,
      title: 'All Tasks Complete!',
      description: 'Time to plan your next feature',
      commands: [
        { cmd: '/pm:prd-new next-feature', note: 'Start a new PRD for your next feature' },
        { cmd: '/pm:standup', note: 'Generate summary of completed work' }
      ],
      why: 'Document achievements and plan ahead'
    });
  }

  suggestions.push({
    priority: 'low',
    recommended: false,
    title: 'Check Project Status',
    description: 'View detailed project information',
    commands: [
      { cmd: '/pm:context', note: 'Full project context and progress' },
      { cmd: '/pm:status', note: 'Project health and configuration' },
      { cmd: '/pm:standup', note: 'Daily standup summary' }
    ],
    why: 'Stay informed about project state'
  });

  return suggestions;
}

// ============================================================================
// Display Helpers (fallback mode)
// ============================================================================

function displayProjectStatus(state) {
  console.log('## Project Status');
  console.log('');

  if (!state.hasPRDs && !state.hasEpics) {
    console.log('New project - Ready to start!');
    return;
  }

  if (state.hasPRDs) {
    console.log(`- **PRDs:** ${state.prdCount} (${state.prds.join(', ')})`);
  }

  if (state.hasEpics) {
    console.log(`- **Epics:** ${state.epicCount}`);
    console.log(`- **Tasks:** ${state.completedTaskCount} / ${state.totalTaskCount} completed`);

    if (state.activeTaskCount > 0) {
      console.log(`- **In Progress:** ${state.activeTaskCount} tasks`);
    }

    if (state.openTasks.length > 0) {
      console.log(`- **Ready:** ${state.openTasks.length} tasks waiting`);
    }
  }

  if (state.hasConfig && state.provider) {
    console.log(`- **Provider:** ${state.provider.charAt(0).toUpperCase() + state.provider.slice(1)}`);
  }
}

function displaySuggestions(suggestions) {
  console.log('## Suggested Next Steps');
  console.log('');

  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');

  let stepNum = 1;

  for (const s of highPriority) {
    displaySuggestion(s, stepNum++);
  }

  if (mediumPriority.length > 0) {
    console.log('### Also Available');
    console.log('');
    for (const s of mediumPriority) {
      displaySuggestion(s, stepNum++);
    }
  }

  if (lowPriority.length > 0 && highPriority.length === 0) {
    console.log('### Information Commands');
    console.log('');
    for (const s of lowPriority) {
      displaySuggestion(s, stepNum++);
    }
  }
}

function displaySuggestion(suggestion, stepNum) {
  const marker = suggestion.recommended ? '⭐' : '';
  console.log(`${stepNum}. ${suggestion.title} ${marker}`.trim());
  console.log(`   ${suggestion.description}`);

  for (const cmd of suggestion.commands) {
    if (cmd.cmd.startsWith('#')) {
      console.log(`   ${cmd.cmd}`);
    } else {
      console.log(`   ${cmd.cmd}`);
      if (cmd.note) {
        console.log(`   > ${cmd.note}`);
      }
    }
  }

  if (suggestion.why) {
    console.log(`   Why: ${suggestion.why}`);
  }
  console.log('');
}

function tryReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error reading file "${filePath}":`, err.message);
    }
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  whatNext().catch(err => {
    logError('Error executing what-next command', err);
    process.exit(1);
  });
}

module.exports = whatNext;
