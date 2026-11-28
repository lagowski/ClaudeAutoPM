const assert = require('assert');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      responseTime: 1000,
      memoryUsage: 100 * 1024 * 1024,
      cpuUsage: 80,
      concurrentRequests: 100,
      tokenThroughput: 10000
    };
  }

  startMeasurement(id) {
    this.metrics.set(id, {
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      measurements: []
    });
  }

  endMeasurement(id) {
    const metric = this.metrics.get(id);
    if (!metric) return null;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    return {
      duration: endTime - metric.startTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - metric.startMemory.heapUsed,
        external: endMemory.external - metric.startMemory.external,
        rss: endMemory.rss - metric.startMemory.rss
      }
    };
  }

  async measureAsync(id, fn) {
    this.startMeasurement(id);
    try {
      const result = await fn();
      return { result, metrics: this.endMeasurement(id) };
    } catch (error) {
      this.endMeasurement(id);
      throw error;
    }
  }
}

class LoadTester {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.results = [];
  }

  async runConcurrentLoad(taskFn, concurrency, iterations) {
    const batches = Math.ceil(iterations / concurrency);
    const results = [];

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = [];
      const batchSize = Math.min(concurrency, iterations - batch * concurrency);

      for (let i = 0; i < batchSize; i++) {
        const taskId = `task-${batch}-${i}`;
        batchPromises.push(
          this.monitor.measureAsync(taskId, () => taskFn(taskId))
        );
      }

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    return this.analyzeResults(results);
  }

  analyzeResults(results) {
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    const durations = successful.map(r => r.value.metrics.duration);
    const memoryDeltas = successful.map(r => r.value.metrics.memoryDelta.heapUsed);

    return {
      totalRequests: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      performance: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99)
      },
      memory: {
        avgDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
        maxDelta: Math.max(...memoryDeltas)
      }
    };
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

class ResourceLimiter {
  constructor() {
    this.limits = {
      maxMemory: 512 * 1024 * 1024,
      maxCPU: 80,
      maxFileHandles: 1000,
      maxNetworkConnections: 100,
      maxTokensPerSecond: 5000
    };
    this.usage = {
      memory: 0,
      cpu: 0,
      fileHandles: 0,
      networkConnections: 0,
      tokensProcessed: 0
    };
    this.resetInterval = 1000;
    this.resetTimer = null;
    this.startResetTimer();
  }

  startResetTimer() {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
    }
    this.resetTimer = setInterval(() => {
      this.usage.tokensProcessed = 0;
    }, this.resetInterval);
  }

  cleanup() {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
      this.resetTimer = null;
    }
  }

  checkLimit(resource, amount = 1) {
    const newUsage = this.usage[resource] + amount;
    const limit = this.limits[this.getLimitKey(resource)];

    if (newUsage > limit) {
      return {
        allowed: false,
        current: this.usage[resource],
        requested: amount,
        limit: limit,
        available: Math.max(0, limit - this.usage[resource])
      };
    }

    return { allowed: true };
  }

  consume(resource, amount = 1) {
    const check = this.checkLimit(resource, amount);
    if (!check.allowed) {
      throw new Error(`Resource limit exceeded: ${resource}`);
    }

    this.usage[resource] += amount;
    return true;
  }

  release(resource, amount = 1) {
    this.usage[resource] = Math.max(0, this.usage[resource] - amount);
  }

  getLimitKey(resource) {
    const mapping = {
      memory: 'maxMemory',
      cpu: 'maxCPU',
      fileHandles: 'maxFileHandles',
      networkConnections: 'maxNetworkConnections',
      tokensProcessed: 'maxTokensPerSecond'
    };
    return mapping[resource] || resource;
  }

  getCurrentUsage() {
    const usage = {};
    for (const [resource, value] of Object.entries(this.usage)) {
      const limit = this.limits[this.getLimitKey(resource)];
      usage[resource] = {
        current: value,
        limit: limit,
        percentage: (value / limit) * 100
      };
    }
    return usage;
  }
}

class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens() {
    this.refill();
    return Math.floor(this.tokens);
  }
}

describe('Performance and Resource Limit Tests', () => {
  let monitor;
  let loadTester;
  let limiter;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    loadTester = new LoadTester();
    limiter = new ResourceLimiter();
  });

  afterEach(() => {
    // Clean up any timers to prevent hanging tests
    if (limiter && limiter.cleanup) {
      limiter.cleanup();
    }
  });

  describe('Performance Monitoring', () => {
    it('should measure execution time accurately', async () => {
      const { metrics } = await monitor.measureAsync('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      // Be more tolerant with timing - setTimeout is not perfectly accurate
      assert.ok(metrics.duration >= 90, `Expected duration >= 90ms, got ${metrics.duration}ms`);
      assert.ok(metrics.duration < 200, `Expected duration < 200ms, got ${metrics.duration}ms`);
    });

    it('should track memory usage', async () => {
      const { metrics } = await monitor.measureAsync('memory-test', async () => {
        const largeArray = Array(1000000).fill('x');
        return largeArray.length;
      });

      assert.ok(metrics.memoryDelta.heapUsed > 0);
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const task = async (id) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return `completed-${id}`;
      };

      const results = await loadTester.runConcurrentLoad(task, 10, 50);

      assert.strictEqual(results.totalRequests, 50);
      assert.ok(results.successRate >= 95);
      assert.ok(results.performance.avg < 100);
    });

    it('should calculate performance percentiles', async () => {
      const task = async (id) => {
        const delay = Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        return delay;
      };

      const results = await loadTester.runConcurrentLoad(task, 5, 100);

      assert.ok(results.performance.p50 <= results.performance.p95);
      assert.ok(results.performance.p95 <= results.performance.p99);
      assert.ok(results.performance.min <= results.performance.avg);
      assert.ok(results.performance.avg <= results.performance.max);
    });
  });

  describe('Resource Limiting', () => {
    it('should enforce memory limits', () => {
      const memoryLimit = limiter.limits.maxMemory;

      assert.doesNotThrow(() => {
        limiter.consume('memory', memoryLimit / 2);
      });

      assert.throws(() => {
        limiter.consume('memory', memoryLimit);
      }, /Resource limit exceeded/);
    });

    it('should track multiple resources', () => {
      limiter.consume('fileHandles', 10);
      limiter.consume('networkConnections', 5);
      limiter.consume('memory', 1024 * 1024);

      const usage = limiter.getCurrentUsage();

      assert.strictEqual(usage.fileHandles.current, 10);
      assert.strictEqual(usage.networkConnections.current, 5);
      assert.ok(usage.memory.current > 0);
    });

    it('should release resources', () => {
      limiter.consume('fileHandles', 10);
      limiter.release('fileHandles', 5);

      const usage = limiter.getCurrentUsage();
      assert.strictEqual(usage.fileHandles.current, 5);
    });

    it('should check limits without consuming', () => {
      const check = limiter.checkLimit('cpu', 50);
      assert.strictEqual(check.allowed, true);

      const exceedCheck = limiter.checkLimit('cpu', 100);
      assert.strictEqual(exceedCheck.allowed, false);
    });
  });

  describe('Rate Limiting', () => {
    it('should implement token bucket algorithm', async () => {
      const bucket = new TokenBucket(10, 5);

      assert.strictEqual(bucket.tryConsume(5), true);
      assert.strictEqual(bucket.tryConsume(5), true);
      assert.strictEqual(bucket.tryConsume(5), false);

      // 5 tokens/s: wait a little over 1 s, a timer that fires a millisecond early leaves 4.99 tokens
      await new Promise(resolve => setTimeout(resolve, 1100));

      assert.strictEqual(bucket.tryConsume(5), true);
    });

    it('should refill tokens over time', async () => {
      const bucket = new TokenBucket(100, 10);

      bucket.tryConsume(100);
      assert.strictEqual(bucket.getAvailableTokens(), 0);

      await new Promise(resolve => setTimeout(resolve, 500));

      const available = bucket.getAvailableTokens();
      assert.ok(available >= 4 && available <= 6);
    });
  });

  describe('Stress Testing', () => {
    it('should handle burst traffic', async () => {
      const bucket = new TokenBucket(1000, 100);
      let accepted = 0;
      let rejected = 0;

      for (let i = 0; i < 2000; i++) {
        if (bucket.tryConsume(1)) {
          accepted++;
        } else {
          rejected++;
        }
      }

      assert.strictEqual(accepted, 1000);
      assert.strictEqual(rejected, 1000);
    });

    it('should detect memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const temp = Array(1000).fill('x');
      }

      global.gc && global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const leak = finalMemory - initialMemory;

      assert.ok(leak < 10 * 1024 * 1024, 'Potential memory leak detected');
    });

    it('should handle timeout scenarios', async () => {
      const timeoutTask = async () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Operation timed out'));
          }, 100);

          setTimeout(() => {
            clearTimeout(timeout);
            resolve('completed');
          }, 200);
        });
      };

      await assert.rejects(timeoutTask, /timed out/);
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    it('should prevent infinite loops', () => {
      let iterations = 0;
      const maxIterations = 10000;

      const protectedLoop = () => {
        while (iterations < maxIterations) {
          iterations++;
          if (iterations >= maxIterations) {
            throw new Error('Max iterations reached');
          }
        }
      };

      assert.throws(protectedLoop, /Max iterations reached/);
    });

    it('should limit recursive depth', () => {
      let depth = 0;
      const maxDepth = 100;

      const recursiveFunction = (currentDepth) => {
        if (currentDepth >= maxDepth) {
          throw new Error('Max recursion depth reached');
        }
        return recursiveFunction(currentDepth + 1);
      };

      assert.throws(() => recursiveFunction(0), /Max recursion depth reached/);
    });

    it('should enforce payload size limits', () => {
      const maxPayloadSize = 1024 * 1024;

      const validatePayload = (payload) => {
        const size = Buffer.byteLength(JSON.stringify(payload));
        if (size > maxPayloadSize) {
          throw new Error(`Payload too large: ${size} bytes`);
        }
        return true;
      };

      const smallPayload = { data: 'test' };
      assert.strictEqual(validatePayload(smallPayload), true);

      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) };
      assert.throws(() => validatePayload(largePayload), /Payload too large/);
    });
  });
});

module.exports = {
  PerformanceMonitor,
  LoadTester,
  ResourceLimiter,
  TokenBucket
};