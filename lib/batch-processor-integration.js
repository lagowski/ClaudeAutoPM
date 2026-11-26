/**
 * Batch Processor Integration Examples
 *
 * This file demonstrates how to integrate BatchProcessor with existing
 * GitHub sync operations from pm-sync-upload-local.js
 *
 * @example
 * const { batchSyncPRDs, batchSyncAll } = require('./lib/batch-processor-integration');
 *
 * // Batch sync all PRDs
 * const results = await batchSyncPRDs({
 *   basePath: '.claude',
 *   owner: 'user',
 *   repo: 'repository',
 *   octokit,
 *   dryRun: false
 * });
 */

const fs = require('fs').promises;
const path = require('path');
const BatchProcessor = require('./batch-processor');
const {
  syncPRDToGitHub,
  syncEpicToGitHub,
  syncTaskToGitHub,
  loadSyncMap,
  saveSyncMap
} = require('../.claude/scripts/pm-sync-upload-local');

/**
 * Batch sync PRDs to GitHub
 *
 * @param {Object} options
 * @param {string} options.basePath - Base path containing PRDs
 * @param {string} options.owner - GitHub repo owner
 * @param {string} options.repo - GitHub repo name
 * @param {Object} options.octokit - Octokit instance
 * @param {boolean} options.dryRun - Dry run mode
 * @param {number} options.maxConcurrent - Max concurrent uploads (default: 10)
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Object>} Results summary
 */
async function batchSyncPRDs({
  basePath,
  owner,
  repo,
  octokit,
  dryRun = false,
  maxConcurrent = 10,
  onProgress = null
}) {
  const syncMapPath = path.join(basePath, 'sync-map.json');
  const syncMap = await loadSyncMap(syncMapPath);

  // Load all PRD files
  const prdDir = path.join(basePath, 'prds');
  let prdFiles = [];
  try {
    const files = await fs.readdir(prdDir);
    prdFiles = files
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        path: path.join(prdDir, f),
        id: f.replace('.md', ''),
        type: 'prd'
      }));
  } catch (err) {
    console.error(`Error reading PRD directory: ${err.message}`);
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      duration: 0,
      errors: []
    };
  }

  // Create batch processor
  const processor = new BatchProcessor({ maxConcurrent });

  // Create wrapper function for syncPRDToGitHub
  const syncFn = async (item, repo, octokit, syncMap, dryRun) => {
    return await syncPRDToGitHub(item.path, repo, octokit, syncMap, dryRun);
  };

  // Batch upload
  const results = await processor.batchUpload({
    items: prdFiles,
    syncFn,
    repo: { owner, repo },
    octokit,
    syncMap,
    dryRun,
    onProgress
  });

  // Save sync map if not dry run
  if (!dryRun && results.succeeded > 0) {
    await saveSyncMap(syncMapPath, syncMap);
  }

  return results;
}

/**
 * Batch sync Epics to GitHub
 *
 * @param {Object} options - Same as batchSyncPRDs
 * @returns {Promise<Object>} Results summary
 */
async function batchSyncEpics({
  basePath,
  owner,
  repo,
  octokit,
  dryRun = false,
  maxConcurrent = 10,
  onProgress = null
}) {
  const syncMapPath = path.join(basePath, 'sync-map.json');
  const syncMap = await loadSyncMap(syncMapPath);

  // Load all Epic files
  const epicDir = path.join(basePath, 'epics');
  let epicFiles = [];
  try {
    const dirs = await fs.readdir(epicDir);
    for (const dir of dirs) {
      const epicPath = path.join(epicDir, dir, 'epic.md');
      try {
        await fs.access(epicPath);
        epicFiles.push({
          path: epicPath,
          id: dir,
          type: 'epic'
        });
      } catch (err) {
        // Skip if epic.md doesn't exist
      }
    }
  } catch (err) {
    console.error(`Error reading Epic directory: ${err.message}`);
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      duration: 0,
      errors: []
    };
  }

  // Create batch processor
  const processor = new BatchProcessor({ maxConcurrent });

  // Create wrapper function for syncEpicToGitHub
  const syncFn = async (item, repo, octokit, syncMap, dryRun) => {
    return await syncEpicToGitHub(item.path, repo, octokit, syncMap, dryRun);
  };

  // Batch upload
  const results = await processor.batchUpload({
    items: epicFiles,
    syncFn,
    repo: { owner, repo },
    octokit,
    syncMap,
    dryRun,
    onProgress
  });

  // Save sync map if not dry run
  if (!dryRun && results.succeeded > 0) {
    await saveSyncMap(syncMapPath, syncMap);
  }

  return results;
}

/**
 * Batch sync Tasks to GitHub
 *
 * @param {Object} options - Same as batchSyncPRDs
 * @returns {Promise<Object>} Results summary
 */
async function batchSyncTasks({
  basePath,
  owner,
  repo,
  octokit,
  dryRun = false,
  maxConcurrent = 10,
  onProgress = null
}) {
  const syncMapPath = path.join(basePath, 'sync-map.json');
  const syncMap = await loadSyncMap(syncMapPath);

  // Load all Task files
  const epicDir = path.join(basePath, 'epics');
  let taskFiles = [];
  try {
    const dirs = await fs.readdir(epicDir);
    for (const dir of dirs) {
      const tasksDir = path.join(epicDir, dir);
      try {
        const files = await fs.readdir(tasksDir);
        for (const file of files) {
          if (file.startsWith('task-') && file.endsWith('.md')) {
            taskFiles.push({
              path: path.join(tasksDir, file),
              id: `${dir}-${file.replace('.md', '')}`,
              type: 'task'
            });
          }
        }
      } catch (err) {
        // Skip if directory can't be read
      }
    }
  } catch (err) {
    console.error(`Error reading Task directories: ${err.message}`);
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      duration: 0,
      errors: []
    };
  }

  // Create batch processor
  const processor = new BatchProcessor({ maxConcurrent });

  // Create wrapper function for syncTaskToGitHub
  const syncFn = async (item, repo, octokit, syncMap, dryRun) => {
    return await syncTaskToGitHub(item.path, repo, octokit, syncMap, dryRun);
  };

  // Batch upload
  const results = await processor.batchUpload({
    items: taskFiles,
    syncFn,
    repo: { owner, repo },
    octokit,
    syncMap,
    dryRun,
    onProgress
  });

  // Save sync map if not dry run
  if (!dryRun && results.succeeded > 0) {
    await saveSyncMap(syncMapPath, syncMap);
  }

  return results;
}

/**
 * Batch sync all items (PRDs, Epics, Tasks) to GitHub
 *
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Combined results summary
 */
async function batchSyncAll({
  basePath,
  owner,
  repo,
  octokit,
  dryRun = false,
  maxConcurrent = 10,
  onProgress = null
}) {
  const startTime = Date.now();
  const combinedResults = {
    prds: null,
    epics: null,
    tasks: null,
    total: 0,
    succeeded: 0,
    failed: 0,
    duration: 0,
    errors: []
  };

  console.log('🚀 Starting batch sync to GitHub...\n');

  // Sync PRDs
  console.log('📋 Syncing PRDs...');
  const prdResults = await batchSyncPRDs({
    basePath,
    owner,
    repo,
    octokit,
    dryRun,
    maxConcurrent,
    onProgress: onProgress
      ? (current, total, item) => onProgress('PRD', current, total, item)
      : null
  });
  combinedResults.prds = prdResults;
  console.log(`✅ PRDs: ${prdResults.succeeded}/${prdResults.total} succeeded in ${prdResults.duration}ms\n`);

  // Sync Epics
  console.log('📦 Syncing Epics...');
  const epicResults = await batchSyncEpics({
    basePath,
    owner,
    repo,
    octokit,
    dryRun,
    maxConcurrent,
    onProgress: onProgress
      ? (current, total, item) => onProgress('Epic', current, total, item)
      : null
  });
  combinedResults.epics = epicResults;
  console.log(`✅ Epics: ${epicResults.succeeded}/${epicResults.total} succeeded in ${epicResults.duration}ms\n`);

  // Sync Tasks
  console.log('✓ Syncing Tasks...');
  const taskResults = await batchSyncTasks({
    basePath,
    owner,
    repo,
    octokit,
    dryRun,
    maxConcurrent,
    onProgress: onProgress
      ? (current, total, item) => onProgress('Task', current, total, item)
      : null
  });
  combinedResults.tasks = taskResults;
  console.log(`✅ Tasks: ${taskResults.succeeded}/${taskResults.total} succeeded in ${taskResults.duration}ms\n`);

  // Combine results
  combinedResults.total = prdResults.total + epicResults.total + taskResults.total;
  combinedResults.succeeded = prdResults.succeeded + epicResults.succeeded + taskResults.succeeded;
  combinedResults.failed = prdResults.failed + epicResults.failed + taskResults.failed;
  combinedResults.duration = Date.now() - startTime;
  combinedResults.errors = [
    ...prdResults.errors,
    ...epicResults.errors,
    ...taskResults.errors
  ];

  console.log('🎉 Batch sync complete!');
  console.log(`   Total: ${combinedResults.succeeded}/${combinedResults.total} items synced`);
  console.log(`   Duration: ${(combinedResults.duration / 1000).toFixed(2)}s`);

  if (combinedResults.failed > 0) {
    console.log(`   ⚠️  Failures: ${combinedResults.failed}`);
    console.log('\nErrors:');
    combinedResults.errors.forEach(err => {
      console.log(`   - ${err.item.path}: ${err.error}`);
    });
  }

  return combinedResults;
}

module.exports = {
  batchSyncPRDs,
  batchSyncEpics,
  batchSyncTasks,
  batchSyncAll
};
