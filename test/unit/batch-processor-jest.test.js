/**
 * Batch Processor Tests - TDD Approach
 *
 * Tests for GitHub sync batch operations following TDD methodology.
 * These tests define the expected behavior of the BatchProcessor class.
 *
 * Test Coverage:
 * - Batch Upload Tests
 * - Rate Limiting Tests
 * - Error Recovery Tests
 * - Progress Tracking Tests
 * - Performance Tests
 * - Dry Run Tests
 */

const BatchProcessor = require('../../lib/batch-processor');

// Mock Octokit responses
const mockOctokit = {
  issues: {
    create: jest.fn(),
    update: jest.fn()
  }
};

describe('BatchProcessor - TDD Test Suite', () => {
  let processor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Octokit mocks
    mockOctokit.issues.create.mockResolvedValue({
      data: { number: 123 },
      headers: {
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
      }
    });

    mockOctokit.issues.update.mockResolvedValue({
      data: { number: 456 },
      headers: {
        'x-ratelimit-remaining': '4998',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
      }
    });
  });

  describe('Constructor and Configuration', () => {
    test('should create instance with default configuration', () => {
      processor = new BatchProcessor();

      expect(processor).toBeDefined();
      expect(processor.maxConcurrent).toBe(10);
      expect(processor.rateLimit).toBeDefined();
      expect(processor.rateLimit.requestsPerHour).toBe(5000);
    });

    test('should create instance with custom configuration', () => {
      processor = new BatchProcessor({
        maxConcurrent: 5,
        rateLimit: {
          requestsPerHour: 3000,
          retryDelay: 2000,
          maxRetries: 5
        }
      });

      expect(processor.maxConcurrent).toBe(5);
      expect(processor.rateLimit.requestsPerHour).toBe(3000);
      expect(processor.rateLimit.retryDelay).toBe(2000);
      expect(processor.rateLimit.maxRetries).toBe(5);
    });

    test('should validate configuration parameters', () => {
      expect(() => {
        new BatchProcessor({ maxConcurrent: -1 });
      }).toThrow('maxConcurrent must be a positive number');

      expect(() => {
        new BatchProcessor({ maxConcurrent: 0 });
      }).toThrow('maxConcurrent must be a positive number');
    });
  });

  describe('Batch Upload Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({ maxConcurrent: 10 });
    });

    test('should upload 10 items in parallel', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async (item) => ({
        action: 'created',
        issueNumber: 100 + parseInt(item.id.split('-')[1]),
        title: `PRD ${item.id}`
      }));

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.total).toBe(10);
      expect(result.succeeded).toBe(10);
      expect(result.failed).toBe(0);
      expect(mockSyncFn).toHaveBeenCalledTimes(10);
    });

    test('should handle empty item list', async () => {
      const result = await processor.batchUpload({
        items: [],
        syncFn: jest.fn(),
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    test('should respect maxConcurrent limit', async () => {
      processor = new BatchProcessor({ maxConcurrent: 3 });

      const items = Array.from({ length: 10 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      let activeConcurrent = 0;
      let maxObservedConcurrent = 0;

      const mockSyncFn = jest.fn().mockImplementation(async () => {
        activeConcurrent++;
        maxObservedConcurrent = Math.max(maxObservedConcurrent, activeConcurrent);

        await new Promise(resolve => setTimeout(resolve, 10));

        activeConcurrent--;
        return { action: 'created', issueNumber: 123, title: 'Test' };
      });

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(maxObservedConcurrent).toBeLessThanOrEqual(3);
    });

    test('should process items with correct parameters', async () => {
      const items = [
        { path: '.claude/prds/prd-1.md', id: 'prd-1' }
      ];

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'created',
        issueNumber: 123,
        title: 'Test PRD'
      });

      const repo = { owner: 'testowner', repo: 'testrepo' };
      const syncMap = { 'existing-prd': 999 };

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo,
        octokit: mockOctokit,
        syncMap,
        dryRun: false
      });

      expect(mockSyncFn).toHaveBeenCalledWith(
        items[0],
        repo,
        mockOctokit,
        syncMap,
        false
      );
    });
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({
        maxConcurrent: 10,
        rateLimit: {
          requestsPerHour: 5000,
          retryDelay: 100,
          maxRetries: 3
        }
      });
    });

    test('should track rate limit from response headers', async () => {
      const items = [{ path: '.claude/prds/prd-1.md', id: 'prd-1' }];

      mockOctokit.issues.create.mockResolvedValue({
        data: { number: 123 },
        headers: {
          'x-ratelimit-remaining': '4500',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
        }
      });

      const mockSyncFn = jest.fn().mockImplementation(async () => {
        const response = await mockOctokit.issues.create({});
        processor.updateRateLimit(response.headers);
        return { action: 'created', issueNumber: 123, title: 'Test' };
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit.remaining).toBe(4500);
    });

    test('should wait when rate limit is low', async () => {
      processor.rateLimit.remaining = 5;
      processor.rateLimit.threshold = 10;
      // Set reset time to 1 second in the future for faster test
      processor.rateLimit.resetTime = Math.floor(Date.now() / 1000) + 1;

      const startTime = Date.now();
      const shouldWait = processor.shouldWaitForRateLimit();
      expect(shouldWait).toBe(true);

      // Wait for rate limit
      await processor.waitForRateLimit();

      const elapsed = Date.now() - startTime;
      // Should wait approximately 1 second
      expect(elapsed).toBeGreaterThanOrEqual(900);
    });

    test('should retry on 429 errors with exponential backoff', async () => {
      const items = [{ path: '.claude/prds/prd-1.md', id: 'prd-1' }];

      let attemptCount = 0;
      const mockSyncFn = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Rate limit exceeded');
          error.status = 429;
          error.response = {
            headers: {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60)
            }
          };
          throw error;
        }
        return { action: 'created', issueNumber: 123, title: 'Test' };
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(attemptCount).toBe(3);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    test('should fail after max retries on persistent 429 errors', async () => {
      processor = new BatchProcessor({
        maxConcurrent: 10,
        rateLimit: {
          requestsPerHour: 5000,
          retryDelay: 10,
          maxRetries: 2
        }
      });

      const items = [{ path: '.claude/prds/prd-1.md', id: 'prd-1' }];

      const mockSyncFn = jest.fn().mockImplementation(async () => {
        const error = new Error('Rate limit exceeded');
        error.status = 429;
        throw error;
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Rate limit exceeded');
    });

    test('should calculate exponential backoff correctly', () => {
      const delay1 = processor.calculateBackoffDelay(1);
      const delay2 = processor.calculateBackoffDelay(2);
      const delay3 = processor.calculateBackoffDelay(3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);

      // Should be exponential: delay2 ≈ delay1 * 2, delay3 ≈ delay1 * 4
      expect(delay2).toBeCloseTo(delay1 * 2, 0);
      expect(delay3).toBeCloseTo(delay1 * 4, 0);
    });
  });

  describe('Error Recovery Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({ maxConcurrent: 10 });
    });

    test('should continue on individual failures', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async (item) => {
        const index = parseInt(item.id.split('-')[1]);

        // Fail on items 1 and 3
        if (index === 1 || index === 3) {
          throw new Error(`Failed to sync ${item.id}`);
        }

        return { action: 'created', issueNumber: 100 + index, title: `PRD ${item.id}` };
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.total).toBe(5);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(2);
      expect(mockSyncFn).toHaveBeenCalledTimes(5);
    });

    test('should collect all errors', async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async (item) => {
        throw new Error(`Error for ${item.id}`);
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].item).toBeDefined();
      expect(result.errors[0].error).toBeDefined();
      expect(result.errors[0].error).toContain('Error for prd-0');
    });

    test('should report partial success', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async (item) => {
        const index = parseInt(item.id.split('-')[1]);

        // Fail every third item
        if (index % 3 === 0) {
          throw new Error(`Failed to sync ${item.id}`);
        }

        return { action: 'created', issueNumber: 100 + index, title: `PRD ${item.id}` };
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.succeeded).toBe(6);
      expect(result.failed).toBe(4);
      expect(result.total).toBe(10);
    });

    test('should include detailed error information', async () => {
      const items = [{ path: '.claude/prds/prd-1.md', id: 'prd-1' }];

      const mockSyncFn = jest.fn().mockImplementation(async () => {
        const error = new Error('Network timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.errors[0]).toMatchObject({
        item: items[0],
        error: expect.stringContaining('Network timeout')
      });
    });
  });

  describe('Progress Tracking Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({ maxConcurrent: 10 });
    });

    test('should call onProgress callback', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'created',
        issueNumber: 123,
        title: 'Test'
      });

      const progressCalls = [];
      const onProgress = jest.fn((current, total, item) => {
        progressCalls.push({ current, total, item });
      });

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false,
        onProgress
      });

      expect(onProgress).toHaveBeenCalledTimes(5);
      expect(progressCalls[0].current).toBe(1);
      expect(progressCalls[4].current).toBe(5);
      expect(progressCalls[0].total).toBe(5);
    });

    test('should report accurate progress', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'created',
        issueNumber: 123,
        title: 'Test'
      });

      const progressUpdates = [];
      const onProgress = jest.fn((current, total, item) => {
        progressUpdates.push({ current, total, item });
      });

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false,
        onProgress
      });

      // Verify progress sequence
      for (let i = 0; i < 10; i++) {
        expect(progressUpdates[i].current).toBe(i + 1);
        expect(progressUpdates[i].total).toBe(10);
      }
    });

    test('should include item information in progress updates', async () => {
      const items = [
        { path: '.claude/prds/prd-1.md', id: 'prd-1', title: 'Feature A' }
      ];

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'created',
        issueNumber: 123,
        title: 'Test'
      });

      const onProgress = jest.fn();

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false,
        onProgress
      });

      expect(onProgress).toHaveBeenCalledWith(1, 1, items[0]);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({ maxConcurrent: 10 });
    });

    test('should complete 1000 items in < 30s (mocked)', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      // Mock fast sync function (1ms per item)
      const mockSyncFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { action: 'created', issueNumber: 123, title: 'Test' };
      });

      const startTime = Date.now();

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      const duration = Date.now() - startTime;

      expect(result.total).toBe(1000);
      expect(result.succeeded).toBe(1000);
      expect(duration).toBeLessThan(30000);
    });

    test('should use < 100MB memory for 1000 items', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`,
        data: 'x'.repeat(100) // ~100 bytes per item
      }));

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'created',
        issueNumber: 123,
        title: 'Test'
      });

      const memBefore = process.memoryUsage().heapUsed;

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      const memAfter = process.memoryUsage().heapUsed;
      const memUsedMB = (memAfter - memBefore) / 1024 / 1024;

      // Should be well under 100MB for this simple test
      expect(memUsedMB).toBeLessThan(100);
    });

    test('should report duration in results', async () => {
      // Use sequential processing to ensure predictable timing
      const sequentialProcessor = new BatchProcessor({ maxConcurrent: 1 });

      const items = Array.from({ length: 5 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { action: 'created', issueNumber: 123, title: 'Test' };
      });

      const result = await sequentialProcessor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      // With sequential processing, should take at least 5 items * 10ms = 50ms
      expect(result.duration).toBeGreaterThanOrEqual(45);
    });
  });

  describe('Dry Run Tests', () => {
    beforeEach(() => {
      processor = new BatchProcessor({ maxConcurrent: 10 });
    });

    test('should not make API calls in dry run mode', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'dry-run',
        title: 'Test PRD'
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: true
      });

      expect(result.total).toBe(5);
      expect(mockSyncFn).toHaveBeenCalledTimes(5);

      // Verify all calls were with dryRun=true
      mockSyncFn.mock.calls.forEach(call => {
        expect(call[4]).toBe(true); // dryRun parameter
      });
    });

    test('should return preview of actions in dry run', async () => {
      const items = [
        { path: '.claude/prds/prd-1.md', id: 'prd-1', title: 'Feature A' },
        { path: '.claude/prds/prd-2.md', id: 'prd-2', title: 'Feature B' }
      ];

      const mockSyncFn = jest.fn().mockImplementation(async (item) => ({
        action: 'dry-run',
        title: `[PRD] ${item.title}`
      }));

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: true
      });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    test('should not modify syncMap in dry run mode', async () => {
      const items = [{ path: '.claude/prds/prd-1.md', id: 'prd-1' }];
      const originalSyncMap = { 'existing-prd': 123 };
      const syncMap = { ...originalSyncMap };

      const mockSyncFn = jest.fn().mockResolvedValue({
        action: 'dry-run',
        title: 'Test PRD'
      });

      await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap,
        dryRun: true
      });

      // syncMap should not be modified
      expect(syncMap).toEqual(originalSyncMap);
    });
  });

  describe('Integration Tests', () => {
    test('should handle mixed item types', async () => {
      processor = new BatchProcessor({ maxConcurrent: 10 });

      const items = [
        { path: '.claude/prds/prd-1.md', id: 'prd-1', type: 'prd' },
        { path: '.claude/epics/epic-1.md', id: 'epic-1', type: 'epic' },
        { path: '.claude/tasks/task-1.md', id: 'task-1', type: 'task' }
      ];

      const mockSyncFn = jest.fn().mockImplementation(async (item) => ({
        action: 'created',
        issueNumber: 123,
        title: `[${item.type.toUpperCase()}] ${item.id}`
      }));

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    test('should provide comprehensive results summary', async () => {
      processor = new BatchProcessor({ maxConcurrent: 10 });

      const items = Array.from({ length: 10 }, (_, i) => ({
        path: `.claude/prds/prd-${i}.md`,
        id: `prd-${i}`
      }));

      const mockSyncFn = jest.fn().mockImplementation(async (item) => {
        const index = parseInt(item.id.split('-')[1]);
        if (index === 5) {
          throw new Error('Sync failed');
        }
        return { action: 'created', issueNumber: 100 + index, title: `PRD ${item.id}` };
      });

      const result = await processor.batchUpload({
        items,
        syncFn: mockSyncFn,
        repo: { owner: 'test', repo: 'test-repo' },
        octokit: mockOctokit,
        syncMap: {},
        dryRun: false
      });

      expect(result).toMatchObject({
        total: 10,
        succeeded: 9,
        failed: 1,
        duration: expect.any(Number),
        errors: expect.arrayContaining([
          expect.objectContaining({
            item: expect.any(Object),
            error: expect.stringContaining('Sync failed')
          })
        ])
      });
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      processor = new BatchProcessor();
    });

    test('updateRateLimit should parse headers correctly', () => {
      const headers = {
        'x-ratelimit-remaining': '4800',
        'x-ratelimit-reset': '1234567890'
      };

      processor.updateRateLimit(headers);

      expect(processor.rateLimit.remaining).toBe(4800);
      expect(processor.rateLimit.resetTime).toBe(1234567890);
    });

    test('shouldWaitForRateLimit should return true when near limit', () => {
      processor.rateLimit.remaining = 5;
      processor.rateLimit.threshold = 10;

      expect(processor.shouldWaitForRateLimit()).toBe(true);
    });

    test('shouldWaitForRateLimit should return false when sufficient requests remain', () => {
      processor.rateLimit.remaining = 1000;
      processor.rateLimit.threshold = 10;

      expect(processor.shouldWaitForRateLimit()).toBe(false);
    });

    test('waitForRateLimit should wait until reset time', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 1;
      processor.rateLimit.resetTime = futureTime;

      const startTime = Date.now();
      await processor.waitForRateLimit();
      const elapsed = Date.now() - startTime;

      // Should wait approximately 1 second
      expect(elapsed).toBeGreaterThanOrEqual(900);
    });
  });
});
