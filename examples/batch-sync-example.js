#!/usr/bin/env node
/**
 * Batch Sync Example
 *
 * Demonstrates how to use BatchProcessor for efficient GitHub sync operations.
 *
 * Usage:
 *   node examples/batch-sync-example.js
 *
 * Environment Variables:
 *   GITHUB_TOKEN - GitHub personal access token
 *   GITHUB_OWNER - GitHub repository owner
 *   GITHUB_REPO - GitHub repository name
 */

const { Octokit } = require('@octokit/rest');
const { batchSyncAll, batchSyncPRDs } = require('../lib/batch-processor-integration');
const BatchProcessor = require('../lib/batch-processor');

// Configuration from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-username';
const GITHUB_REPO = process.env.GITHUB_REPO || 'your-repo';
const BASE_PATH = process.env.BASE_PATH || '.claude';
const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * Example 1: Batch sync all items with progress tracking
 */
async function example1_BatchSyncAll() {
  console.log('\n=== Example 1: Batch Sync All Items ===\n');

  if (!GITHUB_TOKEN) {
    console.log('⚠️  GITHUB_TOKEN not set. Running in DRY RUN mode.');
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Progress tracking with colored output
  const onProgress = (type, current, total, item) => {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    console.log(`[${type}] [${bar}] ${percent}% - ${item.path}`);
  };

  const results = await batchSyncAll({
    basePath: BASE_PATH,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    octokit,
    dryRun: DRY_RUN || !GITHUB_TOKEN,
    maxConcurrent: 10,
    onProgress
  });

  console.log('\n📊 Results Summary:');
  console.log(`   PRDs: ${results.prds.succeeded}/${results.prds.total}`);
  console.log(`   Epics: ${results.epics.succeeded}/${results.epics.total}`);
  console.log(`   Tasks: ${results.tasks.succeeded}/${results.tasks.total}`);
  console.log(`   Total Duration: ${(results.duration / 1000).toFixed(2)}s`);
}

/**
 * Example 2: Batch sync with custom rate limiting
 */
async function example2_CustomRateLimiting() {
  console.log('\n=== Example 2: Custom Rate Limiting ===\n');

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Create processor with conservative rate limits
  new BatchProcessor({
    maxConcurrent: 5, // Lower concurrency
    rateLimit: {
      requestsPerHour: 5000,
      retryDelay: 2000, // Longer initial retry delay
      maxRetries: 5, // More retries
      threshold: 50 // Wait when < 50 requests remain
    }
  });

  console.log('Using conservative rate limiting:');
  console.log('  - Max concurrent: 5');
  console.log('  - Retry delay: 2000ms');
  console.log('  - Max retries: 5');
  console.log('  - Rate limit threshold: 50 requests\n');

  const results = await batchSyncPRDs({
    basePath: BASE_PATH,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    octokit,
    dryRun: DRY_RUN || !GITHUB_TOKEN,
    maxConcurrent: 5,
    onProgress: (current, total, item) => {
      console.log(`  [${current}/${total}] ${item.id}`);
    }
  });

  console.log(`\n✅ Completed: ${results.succeeded}/${results.total} PRDs`);
  console.log(`   Rate Limit Remaining: ${results.rateLimit.remaining}`);
}

/**
 * Example 3: Handle errors gracefully
 */
async function example3_ErrorHandling() {
  console.log('\n=== Example 3: Error Handling ===\n');

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  const results = await batchSyncPRDs({
    basePath: BASE_PATH,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    octokit,
    dryRun: DRY_RUN || !GITHUB_TOKEN,
    maxConcurrent: 10
  });

  console.log(`Total: ${results.total} items`);
  console.log(`Succeeded: ${results.succeeded} items`);
  console.log(`Failed: ${results.failed} items`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    results.errors.forEach((err, index) => {
      console.log(`\n${index + 1}. ${err.item.path}`);
      console.log(`   Error: ${err.error}`);
    });
  } else {
    console.log('\n✅ No errors!');
  }
}

/**
 * Example 4: Performance benchmarking
 */
async function example4_PerformanceBenchmark() {
  console.log('\n=== Example 4: Performance Benchmarking ===\n');

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Test different concurrency levels
  const concurrencyLevels = [1, 5, 10, 20];

  console.log('Testing different concurrency levels...\n');

  for (const level of concurrencyLevels) {
    const startTime = Date.now();

    const results = await batchSyncPRDs({
      basePath: BASE_PATH,
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      octokit,
      dryRun: true, // Always dry run for benchmarking
      maxConcurrent: level
    });

    const duration = Date.now() - startTime;
    const itemsPerSecond = (results.total / duration) * 1000;

    console.log(`Concurrency ${level}:`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Items/sec: ${itemsPerSecond.toFixed(2)}`);
    console.log(`  Total items: ${results.total}\n`);
  }
}

/**
 * Example 5: Dry run preview
 */
async function example5_DryRunPreview() {
  console.log('\n=== Example 5: Dry Run Preview ===\n');

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log('🔍 Preview mode - no actual changes will be made\n');

  const results = await batchSyncAll({
    basePath: BASE_PATH,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    octokit,
    dryRun: true, // Preview mode
    maxConcurrent: 10,
    onProgress: (type, _current, _total, item) => {
      console.log(`  [DRY RUN] ${type}: ${item.id}`);
    }
  });

  console.log('\n📋 Preview Summary:');
  console.log(`   Would sync ${results.total} items:`);
  console.log(`   - ${results.prds.total} PRDs`);
  console.log(`   - ${results.epics.total} Epics`);
  console.log(`   - ${results.tasks.total} Tasks`);
  console.log(`\n   Estimated duration: ${(results.duration / 1000).toFixed(2)}s`);
  console.log(`\nRun with DRY_RUN=false to execute actual sync.`);
}

/**
 * Main function - run examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Batch Processor Examples                     ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Run examples (comment out the ones you don't want to run)
    await example1_BatchSyncAll();
    // await example2_CustomRateLimiting();
    // await example3_ErrorHandling();
    // await example4_PerformanceBenchmark();
    // await example5_DryRunPreview();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  example1_BatchSyncAll,
  example2_CustomRateLimiting,
  example3_ErrorHandling,
  example4_PerformanceBenchmark,
  example5_DryRunPreview
};
