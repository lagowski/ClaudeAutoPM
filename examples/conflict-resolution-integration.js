/**
 * Example: Integrating Conflict Resolution with GitHub Sync
 *
 * This example demonstrates how to use the Advanced Conflict Resolution
 * system with the existing BatchProcessor for GitHub sync operations.
 */

const ConflictResolver = require('../lib/conflict-resolver');
const ConflictHistory = require('../lib/conflict-history');
const VisualDiff = require('../lib/visual-diff');
const BatchProcessor = require('../lib/batch-processor');
const fs = require('fs').promises;

/**
 * Sync PRD file to GitHub with conflict resolution
 */
async function syncPRDWithConflicts(prdPath, repo, octokit, syncMap) {
  const resolver = new ConflictResolver({
    strategy: 'newest',
    normalizeLineEndings: true
  });

  const history = new ConflictHistory({
    storage: 'file',
    storagePath: '.claude/.conflict-history.json'
  });

  try {
    // Read local file
    const localContent = await fs.readFile(prdPath, 'utf8');

    // Fetch remote file from GitHub
    const remoteContent = await fetchRemoteFile(repo, octokit, prdPath);

    // Get base version from sync map
    const baseContent = await getBaseVersion(prdPath, syncMap);

    // Perform three-way merge
    const mergeResult = resolver.threeWayMerge(localContent, remoteContent, baseContent);

    if (mergeResult.hasConflicts) {
      console.log(`⚠️  Found ${mergeResult.conflicts.length} conflicts in ${prdPath}`);

      // Log conflicts for history
      for (const conflict of mergeResult.conflicts) {
        const resolution = {
          strategy: 'newest',
          chosenContent: resolver.resolveConflict(conflict, 'newest'),
          timestamp: new Date()
        };

        history.log(conflict, resolution);
      }

      // Auto-resolve using strategy
      const resolvedContent = await autoResolveConflicts(
        mergeResult,
        resolver,
        'newest'
      );

      // Update local file with resolved content
      await fs.writeFile(prdPath, resolvedContent, 'utf8');

      // Sync to GitHub
      await uploadToGitHub(repo, octokit, prdPath, resolvedContent);

      console.log(`✅ Auto-resolved and synced ${prdPath}`);

      return {
        action: 'resolved-and-synced',
        conflicts: mergeResult.conflicts.length,
        filePath: prdPath
      };
    } else {
      console.log(`✅ No conflicts - auto-merged ${prdPath}`);

      // Sync merged content to GitHub
      await uploadToGitHub(repo, octokit, prdPath, mergeResult.merged);

      return {
        action: 'auto-merged',
        filePath: prdPath
      };
    }
  } catch (error) {
    console.error(`❌ Error syncing ${prdPath}:`, error.message);
    throw error;
  }
}

/**
 * Auto-resolve all conflicts in merge result
 */
async function autoResolveConflicts(mergeResult, resolver, strategy) {
  let resolved = mergeResult.merged;

  // Replace conflict markers with resolved content
  for (const conflict of mergeResult.conflicts) {
    const resolvedContent = resolver.resolveConflict(conflict, strategy);

    // Replace the conflict section in merged content
    const conflictMarker = `<<<<<<< LOCAL\n${conflict.localContent}\n=======\n${conflict.remoteContent}\n>>>>>>> REMOTE`;

    resolved = resolved.replace(conflictMarker, resolvedContent);
  }

  return resolved;
}

/**
 * Batch sync with conflict resolution
 */
async function batchSyncWithConflicts(prdPaths, repo, octokit, syncMap) {
  const processor = new BatchProcessor({
    maxConcurrent: 10,
    rateLimit: {
      requestsPerHour: 5000,
      retryDelay: 1000,
      maxRetries: 3
    }
  });

  const resolver = new ConflictResolver({ strategy: 'newest' });
  const history = new ConflictHistory({ storage: 'memory' });

  // Wrap sync function with conflict resolution
  const syncWithConflictResolution = async (item) => {
    return await syncPRDWithConflicts(item.path, repo, octokit, syncMap);
  };

  const results = await processor.batchUpload({
    items: prdPaths.map(path => ({ path })),
    syncFn: syncWithConflictResolution,
    repo,
    octokit,
    syncMap,
    dryRun: false,
    onProgress: (current, total, item) => {
      console.log(`[${current}/${total}] Processing ${item.path}...`);
    }
  });

  // Report conflict statistics
  const conflictCount = results.errors.filter(e =>
    e.error.includes('conflicts')
  ).length;

  console.log('\n📊 Sync Results:');
  console.log(`  Total: ${results.total}`);
  console.log(`  Succeeded: ${results.succeeded}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Conflicts Resolved: ${conflictCount}`);
  console.log(`  Duration: ${results.duration}ms`);

  return results;
}

/**
 * Interactive conflict resolution with visual diff
 */
async function interactiveConflictResolution(prdPath, repo, octokit) {
  const resolver = new ConflictResolver();
  const diff = new VisualDiff({ columnWidth: 80 });

  // Read files
  const localContent = await fs.readFile(prdPath, 'utf8');
  const remoteContent = await fetchRemoteFile(repo, octokit, prdPath);
  const baseContent = await getBaseVersion(prdPath);

  // Perform merge
  const result = resolver.threeWayMerge(localContent, remoteContent, baseContent);

  if (!result.hasConflicts) {
    console.log('✅ No conflicts found!');
    return result.merged;
  }

  console.log(`\n⚠️  Found ${result.conflicts.length} conflicts in ${prdPath}\n`);

  // Show visual diff
  console.log('📊 Visual Diff:');
  console.log(diff.sideBySide(localContent, remoteContent));
  console.log('\n' + '='.repeat(80) + '\n');

  // Show each conflict with context
  for (let i = 0; i < result.conflicts.length; i++) {
    const conflict = result.conflicts[i];

    console.log(`\nConflict ${i + 1}/${result.conflicts.length} at line ${conflict.line}:`);
    console.log('\nContext:');
    console.log(diff.renderContext(baseContent, [conflict.line], 3));

    console.log('\n📝 Resolution Options:');
    console.log('  1. Keep LOCAL version');
    console.log('  2. Keep REMOTE version');
    console.log('  3. Use NEWEST (timestamp-based)');
    console.log('  4. Edit manually');

    // In real implementation, prompt user for choice
    // For example purposes, auto-select newest
    const choice = 3;

    const resolved = resolver.resolveConflict(conflict, 'newest');
    console.log(`\n✅ Resolved to: ${resolved}`);
  }

  return await autoResolveConflicts(result, resolver, 'newest');
}

/**
 * Review conflict history
 */
async function reviewConflictHistory() {
  const history = new ConflictHistory({
    storage: 'file',
    storagePath: '.claude/.conflict-history.json'
  });

  // Get all conflicts from last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentConflicts = history.getHistory({
    after: weekAgo
  });

  console.log(`\n📚 Conflict History (Last 7 Days): ${recentConflicts.length} conflicts\n`);

  // Group by file
  const byFile = {};
  for (const entry of recentConflicts) {
    const file = entry.conflict.filePath || 'unknown';
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(entry);
  }

  // Display summary
  for (const [file, conflicts] of Object.entries(byFile)) {
    console.log(`\n📄 ${file}:`);
    console.log(`   Conflicts: ${conflicts.length}`);

    // Strategy breakdown
    const strategies = {};
    for (const c of conflicts) {
      const strategy = c.resolution.strategy;
      strategies[strategy] = (strategies[strategy] || 0) + 1;
    }

    console.log('   Strategies used:');
    for (const [strategy, count] of Object.entries(strategies)) {
      console.log(`     - ${strategy}: ${count}`);
    }
  }

  return recentConflicts;
}

// Helper functions (placeholders - implement based on your GitHub integration)

async function fetchRemoteFile(repo, octokit, filePath) {
  // Implement GitHub API call to fetch file content
  // Example:
  // const response = await octokit.repos.getContent({
  //   owner: repo.owner,
  //   repo: repo.repo,
  //   path: filePath
  // });
  // return Buffer.from(response.data.content, 'base64').toString('utf8');

  return 'remote content placeholder';
}

async function getBaseVersion(filePath, syncMap) {
  // Get base version from sync map or local cache
  // This should be the last successfully synced version
  return 'base content placeholder';
}

async function uploadToGitHub(repo, octokit, filePath, content) {
  // Implement GitHub API call to upload content
  // Example:
  // await octokit.repos.createOrUpdateFileContents({
  //   owner: repo.owner,
  //   repo: repo.repo,
  //   path: filePath,
  //   message: `Sync ${filePath}`,
  //   content: Buffer.from(content).toString('base64')
  // });

  console.log(`Uploaded ${filePath} to GitHub`);
}

// Export functions for use in other modules
module.exports = {
  syncPRDWithConflicts,
  batchSyncWithConflicts,
  interactiveConflictResolution,
  reviewConflictHistory,
  autoResolveConflicts
};

// Example usage
if (require.main === module) {
  (async () => {
    console.log('🚀 Conflict Resolution Integration Examples\n');

    // Example 1: Review conflict history
    console.log('Example 1: Reviewing Conflict History');
    console.log('='.repeat(80));
    await reviewConflictHistory();

    console.log('\n\nExample 2: Visual Diff Demo');
    console.log('='.repeat(80));

    const diff = new VisualDiff();
    const left = 'line 1\nline 2 original\nline 3';
    const right = 'line 1\nline 2 modified\nline 3';

    console.log(diff.sideBySide(left, right));

    console.log('\n\n✅ Examples completed!');
  })().catch(console.error);
}
