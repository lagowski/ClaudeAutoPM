/**
 * Batch Processor for GitHub Sync Operations
 *
 * Handles batch uploading of PRDs, Epics, and Tasks to GitHub with:
 * - Parallel processing with concurrency control
 * - Rate limiting and exponential backoff
 * - Progress tracking
 * - Error recovery
 * - Dry run mode
 *
 * @example
 * const BatchProcessor = require('./lib/batch-processor');
 *
 * const processor = new BatchProcessor({
 *   maxConcurrent: 10,
 *   rateLimit: {
 *     requestsPerHour: 5000,
 *     retryDelay: 1000,
 *     maxRetries: 3
 *   }
 * });
 *
 * const results = await processor.batchUpload({
 *   items: ['.claude/prds/*.md'],
 *   syncFn: syncPRDToGitHub,
 *   repo: { owner, repo },
 *   octokit,
 *   syncMap,
 *   dryRun: false,
 *   onProgress: (current, total, item) => {
 *     console.log(`[${current}/${total}] ${item.path}`);
 *   }
 * });
 */

class BatchProcessor {
  /**
   * Create a new BatchProcessor instance
   *
   * @param {Object} options - Configuration options
   * @param {number} options.maxConcurrent - Maximum concurrent uploads (default: 10)
   * @param {Object} options.rateLimit - Rate limiting configuration
   * @param {number} options.rateLimit.requestsPerHour - GitHub API rate limit (default: 5000)
   * @param {number} options.rateLimit.retryDelay - Initial retry delay in ms (default: 1000)
   * @param {number} options.rateLimit.maxRetries - Maximum retry attempts (default: 3)
   * @param {number} options.rateLimit.threshold - Remaining requests threshold to trigger wait (default: 10)
   */
  constructor(options = {}) {
    // Validate configuration
    if (options.maxConcurrent !== undefined) {
      if (typeof options.maxConcurrent !== 'number' || options.maxConcurrent <= 0) {
        throw new Error('maxConcurrent must be a positive number');
      }
    }

    this.maxConcurrent = options.maxConcurrent || 10;
    this.rateLimit = {
      requestsPerHour: options.rateLimit?.requestsPerHour || 5000,
      retryDelay: options.rateLimit?.retryDelay || 1000,
      maxRetries: options.rateLimit?.maxRetries || 3,
      threshold: options.rateLimit?.threshold || 10,
      remaining: options.rateLimit?.requestsPerHour || 5000,
      resetTime: Math.floor(Date.now() / 1000) + 3600
    };
  }

  /**
   * Batch upload items to GitHub
   *
   * @param {Object} params - Upload parameters
   * @param {Array} params.items - Items to upload
   * @param {Function} params.syncFn - Sync function to call for each item
   * @param {Object} params.repo - Repository info {owner, repo}
   * @param {Object} params.octokit - Octokit instance
   * @param {Object} params.syncMap - Sync mapping object
   * @param {boolean} params.dryRun - Dry run mode
   * @param {Function} params.onProgress - Progress callback (current, total, item)
   * @returns {Promise<Object>} Results summary
   */
  async batchUpload({
    items,
    syncFn,
    repo,
    octokit,
    syncMap,
    dryRun = false,
    onProgress = null
  }) {
    const startTime = Date.now();
    const results = {
      total: items.length,
      succeeded: 0,
      failed: 0,
      duration: 0,
      errors: [],
      rateLimit: {
        remaining: this.rateLimit.remaining,
        reset: this.rateLimit.resetTime
      }
    };

    // Handle empty item list
    if (items.length === 0) {
      results.duration = Date.now() - startTime;
      return results;
    }

    // Process items with concurrency control
    const processingQueue = [];
    let currentIndex = 0;
    let completedCount = 0;

    const processNextItem = async () => {
      if (currentIndex >= items.length) {
        return;
      }

      const item = items[currentIndex];
      currentIndex++;

      try {
        // Check rate limit before processing
        if (this.shouldWaitForRateLimit()) {
          await this.waitForRateLimit();
        }

        // Execute sync with retry logic
        await this.executeWithRetry(
          syncFn,
          item,
          repo,
          octokit,
          syncMap,
          dryRun
        );

        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item,
          error: error.message || String(error)
        });
      } finally {
        completedCount++;

        // Update progress
        if (onProgress) {
          onProgress(completedCount, items.length, item);
        }

        // Process next item
        await processNextItem();
      }
    };

    // Start initial batch of workers
    const workerCount = Math.min(this.maxConcurrent, items.length);
    for (let i = 0; i < workerCount; i++) {
      processingQueue.push(processNextItem());
    }

    // Wait for all workers to complete
    await Promise.all(processingQueue);

    // Calculate final duration
    results.duration = Date.now() - startTime;

    // Update final rate limit info
    results.rateLimit = {
      remaining: this.rateLimit.remaining,
      reset: this.rateLimit.resetTime
    };

    return results;
  }

  /**
   * Execute sync function with retry logic for rate limit errors
   *
   * @param {Function} syncFn - Sync function to execute
   * @param {Object} item - Item to sync
   * @param {Object} repo - Repository info
   * @param {Object} octokit - Octokit instance
   * @param {Object} syncMap - Sync mapping
   * @param {boolean} dryRun - Dry run mode
   * @returns {Promise<Object>} Sync result
   */
  async executeWithRetry(syncFn, item, repo, octokit, syncMap, dryRun) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.rateLimit.maxRetries; attempt++) {
      try {
        const result = await syncFn(item, repo, octokit, syncMap, dryRun);
        return result;
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error
        if (error.status === 429) {
          // Update rate limit from error response if available
          if (error.response?.headers) {
            this.updateRateLimit(error.response.headers);
          }

          // Calculate backoff delay for this attempt
          const backoffDelay = this.calculateBackoffDelay(attempt);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffDelay));

          // Continue to next retry attempt
          continue;
        }

        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }

    // If we exhausted all retries, throw the last error
    throw lastError;
  }

  /**
   * Calculate exponential backoff delay
   *
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  calculateBackoffDelay(attempt) {
    // Exponential backoff: delay * (2 ^ (attempt - 1))
    return this.rateLimit.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Update rate limit information from response headers
   *
   * @param {Object} headers - Response headers
   */
  updateRateLimit(headers) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimit.remaining = parseInt(headers['x-ratelimit-remaining'], 10);
    }

    if (headers['x-ratelimit-reset']) {
      this.rateLimit.resetTime = parseInt(headers['x-ratelimit-reset'], 10);
    }
  }

  /**
   * Check if we should wait for rate limit to reset
   *
   * @returns {boolean} True if should wait
   */
  shouldWaitForRateLimit() {
    return this.rateLimit.remaining <= this.rateLimit.threshold;
  }

  /**
   * Wait for rate limit to reset
   *
   * @returns {Promise<void>}
   */
  async waitForRateLimit() {
    const now = Math.floor(Date.now() / 1000);
    const waitSeconds = Math.max(0, this.rateLimit.resetTime - now);

    if (waitSeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
    }

    // Reset to full limit after waiting
    this.rateLimit.remaining = this.rateLimit.requestsPerHour;
  }
}

module.exports = BatchProcessor;
