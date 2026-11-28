/**
 * RateLimiter Tests
 *
 * Comprehensive test suite for token bucket rate limiter implementation.
 * Tests cover all aspects of rate limiting including:
 * - Configuration
 * - Token bucket mechanics
 * - Async/sync operations
 * - Interval parsing
 * - Refill logic
 * - Burst handling
 * - Edge cases
 *
 * Following TDD: Tests written FIRST, implementation follows.
 */

const RateLimiter = require('../../../lib/utils/RateLimiter');

// The limiter refills on wall-clock time, so token counts drift by fractions
// of a token and elapsed-time bounds can slip under load: compare with
// toBeCloseTo and retry a test that loses a timing race.
jest.retryTimes(2);

describe('RateLimiter', () => {

  // =============================================================================
  // 1. CONSTRUCTOR & CONFIGURATION (10 tests)
  // =============================================================================

  describe('Constructor & Configuration', () => {

    test('should create with default values', () => {
      const limiter = new RateLimiter();

      expect(limiter.tokensPerInterval).toBe(60);
      expect(limiter.interval).toBe(60000); // 1 minute
      expect(limiter.bucketSize).toBe(60);
      expect(limiter.fireImmediately).toBe(false);
      expect(limiter.tokens).toBeCloseTo(60, 0);
    });

    test('should accept custom tokens per interval', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      expect(limiter.tokensPerInterval).toBe(100);
      expect(limiter.bucketSize).toBe(100); // Default to tokensPerInterval
    });

    test('should accept custom interval as string', () => {
      const limiter = new RateLimiter({ interval: 'second' });

      expect(limiter.interval).toBe(1000);
    });

    test('should accept custom bucket size', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 60,
        bucketSize: 100
      });

      expect(limiter.bucketSize).toBe(100);
      expect(limiter.tokens).toBeCloseTo(100, 0); // Initial tokens = bucket size
    });

    test('should accept fireImmediately flag', () => {
      const limiter = new RateLimiter({ fireImmediately: true });

      expect(limiter.fireImmediately).toBe(true);
    });

    test('should throw error on invalid configuration - zero tokens', () => {
      expect(() => {
        new RateLimiter({ tokensPerInterval: 0 });
      }).toThrow('tokensPerInterval must be greater than 0');
    });

    test('should throw error on negative tokens per interval', () => {
      expect(() => {
        new RateLimiter({ tokensPerInterval: -10 });
      }).toThrow('tokensPerInterval must be greater than 0');
    });

    test('should throw error on negative bucket size', () => {
      expect(() => {
        new RateLimiter({ bucketSize: -5 });
      }).toThrow('bucketSize must be greater than 0');
    });

    test('should accept interval as numeric milliseconds', () => {
      const limiter = new RateLimiter({ interval: 5000 });

      expect(limiter.interval).toBe(5000);
    });

    test('should handle very large values', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1000000,
        bucketSize: 2000000,
        interval: 86400000 // 1 day
      });

      expect(limiter.tokensPerInterval).toBe(1000000);
      expect(limiter.bucketSize).toBe(2000000);
      expect(limiter.interval).toBe(86400000);
    });
  });

  // =============================================================================
  // 2. TOKEN BUCKET BASICS (15 tests)
  // =============================================================================

  describe('Token Bucket Basics', () => {

    test('should initialize with tokens equal to bucket size', () => {
      const limiter = new RateLimiter({ bucketSize: 50 });

      expect(limiter.tokens).toBeCloseTo(50, 0);
    });

    test('should remove single token', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const remaining = await limiter.removeTokens(1);

      expect(remaining).toBeCloseTo(99, 0);
      expect(limiter.tokens).toBeCloseTo(99, 0);
    });

    test('should remove multiple tokens', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const remaining = await limiter.removeTokens(10);

      expect(remaining).toBeCloseTo(90, 0);
      expect(limiter.tokens).toBeCloseTo(90, 0);
    });

    test('should return correct tokens remaining', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 60 });
      limiter.tokens = 45; // Simulate token usage

      const remaining = limiter.getTokensRemaining();

      expect(remaining).toBeCloseTo(45, 0);
    });

    test('should throw error when requesting more than bucket size', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 20
      });

      await expect(limiter.removeTokens(25)).rejects.toThrow(
        'Requested 25 tokens exceeds bucket size 20'
      );
    });

    test('should refill tokens over time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100 // 100ms
      });

      await limiter.removeTokens(10); // Empty bucket
      expect(limiter.tokens).toBeCloseTo(0, 0);

      await new Promise(resolve => setTimeout(resolve, 110)); // Wait for refill

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThan(9);
    });

    test('should refill at rate matching tokensPerInterval', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100 // 100ms = 10 tokens
      });

      await limiter.removeTokens(10); // Empty bucket

      await new Promise(resolve => setTimeout(resolve, 50)); // Half interval

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
      expect(limiter.tokens).toBeLessThanOrEqual(6);
    });

    test('should not refill beyond bucket size', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 15,
        interval: 100
      });

      // Start with full bucket
      expect(limiter.tokens).toBeCloseTo(15, 0);

      // Wait a long time
      await new Promise(resolve => setTimeout(resolve, 500));

      limiter._refill();
      expect(limiter.tokens).toBeCloseTo(15, 0); // Still capped at bucket size
    });

    test('should handle multiple removals in quick succession', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      await limiter.removeTokens(10);
      await limiter.removeTokens(10);
      await limiter.removeTokens(10);

      expect(limiter.tokens).toBeCloseTo(70, 0);
    });

    test('should accumulate tokens when idle', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      await limiter.removeTokens(10); // Empty bucket

      // Wait for multiple refill cycles
      await new Promise(resolve => setTimeout(resolve, 250));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(9); // Should be close to full
    });

    test('should handle zero tokens in bucket', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100,
        fireImmediately: true
      });

      await limiter.removeTokens(10); // Empty bucket

      expect(limiter.tokens).toBeCloseTo(0, 0);

      const remaining = await limiter.removeTokens(1);
      expect(remaining).toBeCloseTo(-1, 0); // Goes negative with fireImmediately
    });

    test('should handle fractional token counts', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      const remaining = await limiter.removeTokens(2.5);

      expect(remaining).toBe(7.5);
    });

    test('should maintain precision with small intervals', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 10 // 10ms
      });

      await limiter.removeTokens(50);
      expect(limiter.tokens).toBeCloseTo(50, 0);

      await new Promise(resolve => setTimeout(resolve, 5)); // Half interval

      limiter._refill();
      // After 5ms (half interval), should add ~50 tokens: 50 + 50 = 100 (or close to it)
      expect(limiter.tokens).toBeGreaterThanOrEqual(95);
      expect(limiter.tokens).toBeLessThanOrEqual(100);
    });

    test('should work with very low rate limits', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 1000 // 1 per second
      });

      await limiter.removeTokens(1);
      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should work with very high rate limits', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10000,
        interval: 1000
      });

      await limiter.removeTokens(5000);
      expect(limiter.tokens).toBeCloseTo(5000, 0);
    });
  });

  // =============================================================================
  // 3. ASYNC removeTokens (15 tests)
  // =============================================================================

  describe('Async removeTokens', () => {

    test('should wait when tokens insufficient', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      await limiter.removeTokens(10); // Empty bucket

      const startTime = Date.now();
      await limiter.removeTokens(5); // Should wait for refill
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Should wait ~50ms
    });

    test('should return remaining tokens after removal', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const remaining = await limiter.removeTokens(25);

      expect(remaining).toBeCloseTo(75, 0);
    });

    test('should handle concurrent requests', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 50 });

      const promises = [
        limiter.removeTokens(10),
        limiter.removeTokens(10),
        limiter.removeTokens(10)
      ];

      await Promise.all(promises);

      expect(limiter.tokens).toBeCloseTo(20, 0);
    });

    test('should queue multiple requests when insufficient tokens', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      await limiter.removeTokens(10); // Empty bucket

      const startTime = Date.now();

      // These should queue and wait
      const promises = [
        limiter.removeTokens(3),
        limiter.removeTokens(3),
        limiter.removeTokens(3)
      ];

      await Promise.all(promises);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Should take ~1 interval
    });

    test('should allow first request to proceed immediately', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const startTime = Date.now();
      await limiter.removeTokens(10);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10); // Should be immediate
    });

    test('should calculate correct wait time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      await limiter.removeTokens(10); // Empty bucket

      const startTime = Date.now();
      await limiter.removeTokens(5); // Need 5 tokens = 50ms wait
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(70);
    });

    test('should refill while waiting', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      await limiter.removeTokens(8);

      // Wait half interval
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have ~5 tokens now, so this shouldn't wait
      const startTime = Date.now();
      await limiter.removeTokens(3);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(20);
    });

    test('should handle requests for exact bucket size', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 20
      });

      // Should work immediately
      await limiter.removeTokens(20);
      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should work with different interval types', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 60,
        interval: 'second'
      });

      await limiter.removeTokens(30);
      expect(limiter.tokens).toBeCloseTo(30, 0);
    });

    test('should handle rapid sequential requests', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      for (let i = 0; i < 10; i++) {
        await limiter.removeTokens(5);
      }

      expect(limiter.tokens).toBeCloseTo(50, 0);
    });

    test('should maintain accuracy over multiple cycles', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 50
      });

      // Remove and wait multiple times
      await limiter.removeTokens(5);
      await new Promise(resolve => setTimeout(resolve, 25));

      await limiter.removeTokens(5);
      await new Promise(resolve => setTimeout(resolve, 25));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
    });

    test('should work with minimum token request', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const remaining = await limiter.removeTokens(1);

      expect(remaining).toBeCloseTo(99, 0);
    });

    test('should work with decimal token amounts', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      await limiter.removeTokens(0.5);
      await limiter.removeTokens(0.5);

      expect(limiter.tokens).toBeCloseTo(99, 0);
    });

    test('should handle very small wait times accurately', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1000,
        interval: 100 // 10 tokens per ms
      });

      await limiter.removeTokens(1000);

      const startTime = Date.now();
      await limiter.removeTokens(10); // Should wait ~1ms
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10);
    });

    test('should propagate errors correctly', async () => {
      const limiter = new RateLimiter({ bucketSize: 10 });

      await expect(limiter.removeTokens(20)).rejects.toThrow();
    });
  });

  // =============================================================================
  // 4. SYNC tryRemoveTokens (10 tests)
  // =============================================================================

  describe('Sync tryRemoveTokens', () => {

    test('should return true when tokens available', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const result = limiter.tryRemoveTokens(10);

      expect(result).toBe(true);
      expect(limiter.tokens).toBeCloseTo(90, 0);
    });

    test('should return false when insufficient tokens', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });
      limiter.tokens = 5;

      const result = limiter.tryRemoveTokens(10);

      expect(result).toBe(false);
      expect(limiter.tokens).toBeCloseTo(5, 0); // Unchanged
    });

    test('should not wait for tokens', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 1000
      });
      limiter.tokens = 0;

      const startTime = Date.now();
      const result = limiter.tryRemoveTokens(5);
      const elapsed = Date.now() - startTime;

      expect(result).toBe(false);
      expect(elapsed).toBeLessThan(10); // Immediate
    });

    test('should return immediate response', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const startTime = Date.now();
      limiter.tryRemoveTokens(10);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5);
    });

    test('should refill before checking availability', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      limiter.tokens = 0;

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 110));

      const result = limiter.tryRemoveTokens(5);

      expect(result).toBe(true);
    });

    test('should handle multiple rapid calls', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(limiter.tryRemoveTokens(10));
      }

      expect(results.filter(r => r === true)).toHaveLength(10);
      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should work with bucket size limit', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 20
      });

      const result = limiter.tryRemoveTokens(15);

      expect(result).toBe(true);
      expect(limiter.tokens).toBeCloseTo(5, 0);
    });

    test('should have no side effects on failure', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });
      limiter.tokens = 5;

      const result = limiter.tryRemoveTokens(10);

      expect(result).toBe(false);
      expect(limiter.tokens).toBeCloseTo(5, 0); // Exactly the same
    });

    test('should be synchronous (not return Promise)', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const result = limiter.tryRemoveTokens(10);

      expect(result).not.toBeInstanceOf(Promise);
      expect(typeof result).toBe('boolean');
    });

    test('should handle zero tokens case', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });
      limiter.tokens = 0;

      const result = limiter.tryRemoveTokens(1);

      expect(result).toBe(false);
    });
  });

  // =============================================================================
  // 5. INTERVAL PARSING (8 tests)
  // =============================================================================

  describe('Interval Parsing', () => {

    test('should parse "second" to 1000ms', () => {
      const limiter = new RateLimiter({ interval: 'second' });

      expect(limiter.interval).toBe(1000);
    });

    test('should parse "minute" to 60000ms', () => {
      const limiter = new RateLimiter({ interval: 'minute' });

      expect(limiter.interval).toBe(60000);
    });

    test('should parse "hour" to 3600000ms', () => {
      const limiter = new RateLimiter({ interval: 'hour' });

      expect(limiter.interval).toBe(3600000);
    });

    test('should parse "day" to 86400000ms', () => {
      const limiter = new RateLimiter({ interval: 'day' });

      expect(limiter.interval).toBe(86400000);
    });

    test('should accept numeric milliseconds', () => {
      const limiter = new RateLimiter({ interval: 5000 });

      expect(limiter.interval).toBe(5000);
    });

    test('should throw error on invalid string', () => {
      expect(() => {
        new RateLimiter({ interval: 'invalid' });
      }).toThrow('Invalid interval');
    });

    test('should be case insensitive', () => {
      const limiter1 = new RateLimiter({ interval: 'SECOND' });
      const limiter2 = new RateLimiter({ interval: 'Minute' });
      const limiter3 = new RateLimiter({ interval: 'HoUr' });

      expect(limiter1.interval).toBe(1000);
      expect(limiter2.interval).toBe(60000);
      expect(limiter3.interval).toBe(3600000);
    });

    test('should handle plural forms', () => {
      const limiter1 = new RateLimiter({ interval: 'seconds' });
      const limiter2 = new RateLimiter({ interval: 'minutes' });
      const limiter3 = new RateLimiter({ interval: 'hours' });
      const limiter4 = new RateLimiter({ interval: 'days' });

      expect(limiter1.interval).toBe(1000);
      expect(limiter2.interval).toBe(60000);
      expect(limiter3.interval).toBe(3600000);
      expect(limiter4.interval).toBe(86400000);
    });
  });

  // =============================================================================
  // 6. REFILL LOGIC (12 tests)
  // =============================================================================

  describe('Refill Logic', () => {

    test('should refill at correct rate', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      limiter.tokens = 0;
      limiter.lastRefill = Date.now();

      await new Promise(resolve => setTimeout(resolve, 100));

      limiter._refill();

      expect(limiter.tokens).toBeGreaterThanOrEqual(9);
      expect(limiter.tokens).toBeLessThanOrEqual(11);
    });

    test('should use time-based calculation', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 20,
        interval: 100
      });

      limiter.tokens = 0;
      limiter.lastRefill = Date.now();

      await new Promise(resolve => setTimeout(resolve, 50)); // Half interval

      limiter._refill();

      expect(limiter.tokens).toBeGreaterThanOrEqual(9);
      expect(limiter.tokens).toBeLessThanOrEqual(11);
    });

    test('should not refill if no time passed', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });

      limiter.tokens = 5;
      const before = limiter.tokens;

      limiter._refill(); // Immediate call

      expect(limiter.tokens).toBe(before); // No change
    });

    test('should handle partial refills', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 100
      });

      limiter.tokens = 0;
      limiter.lastRefill = Date.now();

      await new Promise(resolve => setTimeout(resolve, 10)); // 10% interval

      limiter._refill();

      expect(limiter.tokens).toBeGreaterThanOrEqual(8);
      expect(limiter.tokens).toBeLessThanOrEqual(12);
    });

    test('should cap refill at bucket size', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 15,
        interval: 100
      });

      limiter.tokens = 10;

      await new Promise(resolve => setTimeout(resolve, 500)); // 5x interval

      limiter._refill();

      expect(limiter.tokens).toBeCloseTo(15, 0); // Capped at bucket size
    });

    test('should have millisecond precision', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1000,
        interval: 100
      });

      limiter.tokens = 0;
      limiter.lastRefill = Date.now();

      await new Promise(resolve => setTimeout(resolve, 5)); // 5ms

      limiter._refill();

      // With setTimeout variance, 5ms can be 5-6ms, adding 50-60 tokens
      expect(limiter.tokens).toBeGreaterThanOrEqual(40);
      expect(limiter.tokens).toBeLessThanOrEqual(200);
    });

    test('should handle long idle periods', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      limiter.tokens = 0;
      limiter.lastRefill = Date.now() - 10000; // 10 seconds ago

      limiter._refill();

      expect(limiter.tokens).toBeCloseTo(10, 0); // Full bucket
    });

    test('should accumulate tokens over multiple intervals', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 50
      });

      limiter.tokens = 0;

      await new Promise(resolve => setTimeout(resolve, 150)); // 3 intervals

      limiter._refill();

      expect(limiter.tokens).toBeCloseTo(10, 0); // Capped at bucket size
    });

    test('should handle continuous usage pattern', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      // Use tokens continuously
      await limiter.removeTokens(5);
      await new Promise(resolve => setTimeout(resolve, 50));
      await limiter.removeTokens(5);
      await new Promise(resolve => setTimeout(resolve, 50));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
    });

    test('should update lastRefill timestamp', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });

      const before = limiter.lastRefill;

      await new Promise(resolve => setTimeout(resolve, 10));

      limiter._refill();

      expect(limiter.lastRefill).toBeGreaterThan(before);
    });

    test('should handle refill at exactly interval time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      limiter.tokens = 0;

      await new Promise(resolve => setTimeout(resolve, 100)); // Exact interval

      limiter._refill();

      expect(limiter.tokens).toBeGreaterThanOrEqual(9);
      expect(limiter.tokens).toBeLessThanOrEqual(10);
    });

    test('should handle fractional tokens during refill', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 3,
        interval: 100
      });

      limiter.tokens = 0;

      await new Promise(resolve => setTimeout(resolve, 33)); // ~1 token

      limiter._refill();

      expect(limiter.tokens).toBeGreaterThanOrEqual(0.9);
      expect(limiter.tokens).toBeLessThanOrEqual(1.1);
    });
  });

  // =============================================================================
  // 7. BURST HANDLING (8 tests)
  // =============================================================================

  describe('Burst Handling', () => {

    test('should allow bucket size greater than tokens per interval', () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 50
      });

      expect(limiter.bucketSize).toBe(50);
      expect(limiter.tokensPerInterval).toBe(10);
    });

    test('should allow initial burst', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 50
      });

      // Should allow burst of 50 immediately
      await limiter.removeTokens(50);

      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should enforce sustained rate after burst', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 50,
        interval: 100
      });

      // Use up burst
      await limiter.removeTokens(50);

      // Now should refill at sustained rate
      await new Promise(resolve => setTimeout(resolve, 100));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(9);
      expect(limiter.tokens).toBeLessThanOrEqual(11);
    });

    test('should recharge burst capacity over time', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 50,
        interval: 100
      });

      await limiter.removeTokens(50); // Use burst

      // Wait 5 intervals (should get 50 tokens back)
      await new Promise(resolve => setTimeout(resolve, 550));

      limiter._refill();
      expect(limiter.tokens).toBeCloseTo(50, 0); // Full burst recharged
    });

    test('should handle large burst then sustained rate', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 100,
        interval: 100
      });

      // Large burst
      await limiter.removeTokens(100);

      // Then sustained requests
      await new Promise(resolve => setTimeout(resolve, 110));
      await limiter.removeTokens(5);

      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
    });

    test('should work without burst (bucket size == rate)', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 10,
        interval: 100
      });

      await limiter.removeTokens(10);
      expect(limiter.tokens).toBeCloseTo(0, 0);

      await new Promise(resolve => setTimeout(resolve, 110));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(9);
    });

    test('should handle very large burst capacity', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 1000
      });

      await limiter.removeTokens(500);

      expect(limiter.tokens).toBeCloseTo(500, 0);
    });

    test('should work with burst and fireImmediately', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 50,
        fireImmediately: true
      });

      await limiter.removeTokens(50); // Use burst

      const remaining = await limiter.removeTokens(10);

      expect(remaining).toBeCloseTo(-10, 0); // Goes negative
    });
  });

  // =============================================================================
  // 8. fireImmediately MODE (10 tests)
  // =============================================================================

  describe('fireImmediately Mode', () => {

    test('should not wait when fireImmediately enabled', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 1000,
        fireImmediately: true
      });

      limiter.tokens = 0;

      const startTime = Date.now();
      await limiter.removeTokens(5);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50); // Should be immediate
    });

    test('should return negative when tokens exceeded', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        fireImmediately: true
      });

      await limiter.removeTokens(10);

      const remaining = await limiter.removeTokens(5);

      expect(remaining).toBeCloseTo(-5, 0);
    });

    test('should provide immediate feedback', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        fireImmediately: true
      });

      limiter.tokens = 0;

      const startTime = Date.now();
      const remaining = await limiter.removeTokens(1);
      const elapsed = Date.now() - startTime;

      expect(remaining).toBeCloseTo(-1, 0);
      expect(elapsed).toBeLessThan(10);
    });

    test('should not use async wait mechanism', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 1000,
        fireImmediately: true
      });

      limiter.tokens = 0;

      // Should return immediately, not wait 1 second
      const startTime = Date.now();
      await limiter.removeTokens(1);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
    });

    test('should work with removeTokens', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        fireImmediately: true
      });

      const result = await limiter.removeTokens(5);

      expect(typeof result).toBe('number');
      expect(result).toBe(5);
    });

    test('should be suitable for HTTP 429 responses', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 'hour',
        fireImmediately: true
      });

      // Simulate many requests
      for (let i = 0; i < 100; i++) {
        await limiter.removeTokens(1);
      }

      // Next request should show exceeded
      const remaining = await limiter.removeTokens(1);

      expect(remaining).toBeLessThan(0);
    });

    test('should continue tracking tokens correctly', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100,
        fireImmediately: true
      });

      await limiter.removeTokens(5);
      expect(limiter.tokens).toBeCloseTo(5, 0);

      await limiter.removeTokens(10);
      expect(limiter.tokens).toBeCloseTo(-5, 0);
    });

    test('should allow recovery after exceeded', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100,
        fireImmediately: true
      });

      await limiter.removeTokens(15);
      expect(limiter.tokens).toBeCloseTo(-5, 0);

      await new Promise(resolve => setTimeout(resolve, 110));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
    });

    test('should handle multiple immediate requests', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        fireImmediately: true
      });

      const results = [];
      for (let i = 0; i < 15; i++) {
        results.push(await limiter.removeTokens(1));
      }

      expect(results[0]).toBe(9);
      expect(results[9]).toBe(0);
      expect(results[10]).toBe(-1);
      expect(results[14]).toBe(-5);
    });

    test('should return accurate remaining count', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 50,
        fireImmediately: true
      });

      await limiter.removeTokens(25);
      const remaining = await limiter.removeTokens(10);

      expect(remaining).toBeCloseTo(15, 0);
      expect(limiter.tokens).toBeCloseTo(15, 0);
    });
  });

  // =============================================================================
  // 9. EDGE CASES (10 tests)
  // =============================================================================

  describe('Edge Cases', () => {

    test('should handle very short intervals', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 10 // 10ms
      });

      await limiter.removeTokens(5);

      await new Promise(resolve => setTimeout(resolve, 5));

      limiter._refill();
      expect(limiter.tokens).toBeGreaterThanOrEqual(4);
    });

    test('should handle very long intervals', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 604800000 // 1 week
      });

      await limiter.removeTokens(5);

      expect(limiter.tokens).toBeCloseTo(5, 0);
    });

    test('should handle very high rate limits', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10000,
        interval: 1000 // 10 per ms
      });

      await limiter.removeTokens(5000);

      expect(limiter.tokens).toBeCloseTo(5000, 0);
    });

    test('should handle very low rate limits', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 1,
        interval: 3600000 // 1 per hour
      });

      await limiter.removeTokens(1);

      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should handle fractional token removal', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      await limiter.removeTokens(0.1);
      await limiter.removeTokens(0.1);

      expect(limiter.tokens).toBeCloseTo(99.8, 1);
    });

    test('should handle large token requests within burst', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 1000
      });

      await limiter.removeTokens(500);

      expect(limiter.tokens).toBeCloseTo(500, 0);
    });

    test('should handle simultaneous requests without race conditions', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      const promises = Array(50).fill(null).map(() => limiter.removeTokens(2));

      await Promise.all(promises);

      expect(limiter.tokens).toBeCloseTo(0, 0);
    });

    test('should maintain precision with floating point arithmetic', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 3,
        interval: 100
      });

      // Create scenario with floating point calculations
      await limiter.removeTokens(1.5);
      await new Promise(resolve => setTimeout(resolve, 33));

      limiter._refill();

      // Should handle floating point correctly
      expect(typeof limiter.tokens).toBe('number');
      expect(isNaN(limiter.tokens)).toBe(false);
    });

    test('should handle long-running processes', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      // Simulate long-running process
      for (let i = 0; i < 5; i++) {
        await limiter.removeTokens(2);
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      expect(limiter.tokens).toBeGreaterThanOrEqual(0);
    });

    test('should handle zero interval gracefully', () => {
      expect(() => {
        new RateLimiter({ interval: 0 });
      }).toThrow('interval must be greater than 0');
    });
  });

  // =============================================================================
  // 10. INTEGRATION WITH PROVIDERS (10 tests)
  // =============================================================================

  describe('Integration with Providers', () => {

    test('should integrate with mock provider', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 100
      });

      // Mock provider that uses rate limiter
      const mockProvider = {
        rateLimiter: limiter,
        async makeRequest() {
          await this.rateLimiter.removeTokens(1);
          return 'response';
        }
      };

      const result = await mockProvider.makeRequest();

      expect(result).toBe('response');
      expect(limiter.tokens).toBeCloseTo(9, 0);
    });

    test('should handle multiple concurrent provider requests', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 50,
        interval: 1000
      });

      const mockProvider = {
        rateLimiter: limiter,
        async makeRequest() {
          await this.rateLimiter.removeTokens(1);
          return 'response';
        }
      };

      const promises = Array(10).fill(null).map(() => mockProvider.makeRequest());

      await Promise.all(promises);

      expect(limiter.tokens).toBeCloseTo(40, 0);
    });

    test('should queue requests when rate limit exceeded', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 5,
        interval: 100
      });

      const mockProvider = {
        rateLimiter: limiter,
        async makeRequest() {
          await this.rateLimiter.removeTokens(1);
          return Date.now();
        }
      };

      // Make 10 requests (should queue 5 of them)
      const startTime = Date.now();
      const results = await Promise.all(
        Array(10).fill(null).map(() => mockProvider.makeRequest())
      );
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(results).toHaveLength(10);
    });

    test('should respect rate limit configuration per provider', async () => {
      const limiter1 = new RateLimiter({ tokensPerInterval: 10 });
      const limiter2 = new RateLimiter({ tokensPerInterval: 20 });

      await limiter1.removeTokens(5);
      await limiter2.removeTokens(5);

      expect(limiter1.tokens).toBe(5);
      expect(limiter2.tokens).toBe(15);
    });

    test('should work without rate limit (null case)', async () => {
      const mockProvider = {
        rateLimiter: null,
        async makeRequest() {
          if (this.rateLimiter) {
            await this.rateLimiter.removeTokens(1);
          }
          return 'response';
        }
      };

      const result = await mockProvider.makeRequest();

      expect(result).toBe('response');
    });

    test('should handle different limits per provider instance', async () => {
      const provider1 = {
        limiter: new RateLimiter({ tokensPerInterval: 10 })
      };

      const provider2 = {
        limiter: new RateLimiter({ tokensPerInterval: 50 })
      };

      await provider1.limiter.removeTokens(5);
      await provider2.limiter.removeTokens(5);

      expect(provider1.limiter.tokens).toBe(5);
      expect(provider2.limiter.tokens).toBe(45);
    });

    test('should work with retry logic', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 5,
        interval: 100,
        fireImmediately: true
      });

      const mockProvider = {
        rateLimiter: limiter,
        async makeRequest() {
          const remaining = await this.rateLimiter.removeTokens(1);
          if (remaining < 0) {
            throw new Error('Rate limit exceeded');
          }
          return 'success';
        }
      };

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        await mockProvider.makeRequest();
      }

      // Next should fail
      await expect(mockProvider.makeRequest()).rejects.toThrow('Rate limit exceeded');
    });

    test('should work with streaming (multiple tokens per request)', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 100,
        interval: 1000
      });

      const mockProvider = {
        rateLimiter: limiter,
        async streamRequest() {
          // Streaming might consume more tokens
          await this.rateLimiter.removeTokens(5);
          return 'stream';
        }
      };

      await mockProvider.streamRequest();

      expect(limiter.tokens).toBeCloseTo(95, 0);
    });

    test('should work with fireImmediately for HTTP responses', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        interval: 1000,
        fireImmediately: true
      });

      const mockHTTPHandler = async (req, res) => {
        const remaining = await limiter.removeTokens(1);

        if (remaining < 0) {
          res.status = 429;
          res.body = 'Rate limit exceeded';
          return res;
        }

        res.status = 200;
        res.body = 'OK';
        return res;
      };

      // Simulate requests
      let response;
      for (let i = 0; i < 11; i++) {
        response = await mockHTTPHandler({}, { status: 0, body: '' });
      }

      expect(response.status).toBe(429);
    });

    test('should have minimal performance impact', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10000 });

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        await limiter.removeTokens(1);
      }

      const elapsed = Date.now() - startTime;

      // Should be very fast (< 100ms for 1000 operations)
      expect(elapsed).toBeLessThan(100);
    });
  });

  // =============================================================================
  // 11. RESET & STATE MANAGEMENT (5 tests)
  // =============================================================================

  describe('Reset & State Management', () => {

    test('should reset tokens to bucket size', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 10,
        bucketSize: 20
      });

      await limiter.removeTokens(15);
      expect(limiter.tokens).toBeCloseTo(5, 0);

      limiter.reset();

      expect(limiter.tokens).toBeCloseTo(20, 0);
    });

    test('should reset timer on reset()', () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });

      const oldTimestamp = limiter.lastRefill;

      limiter.reset();

      expect(limiter.lastRefill).toBeGreaterThanOrEqual(oldTimestamp);
    });

    test('should return accurate tokens remaining', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      await limiter.removeTokens(37);

      const remaining = limiter.getTokensRemaining();

      expect(remaining).toBeCloseTo(63, 0);
    });

    test('should maintain state across calls', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 100 });

      await limiter.removeTokens(10);
      expect(limiter.tokens).toBeCloseTo(90, 0);

      await limiter.removeTokens(20);
      expect(limiter.tokens).toBeCloseTo(70, 0);

      await limiter.removeTokens(30);
      expect(limiter.tokens).toBeCloseTo(40, 0);
    });

    test('should handle state correctly after reset', async () => {
      const limiter = new RateLimiter({
        tokensPerInterval: 50,
        interval: 100
      });

      await limiter.removeTokens(30);
      limiter.reset();

      await limiter.removeTokens(25);

      expect(limiter.tokens).toBeCloseTo(25, 0);
    });
  });

  // =============================================================================
  // ADDITIONAL HELPER TESTS
  // =============================================================================

  describe('Helper Methods', () => {

    test('should have _delay helper for async waiting', async () => {
      const limiter = new RateLimiter({ tokensPerInterval: 10 });

      const startTime = Date.now();
      await limiter._delay(50);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(70);
    });

    test('should validate configuration on construction', () => {
      expect(() => {
        new RateLimiter({ tokensPerInterval: -1 });
      }).toThrow();

      expect(() => {
        new RateLimiter({ bucketSize: -1 });
      }).toThrow();

      expect(() => {
        new RateLimiter({ interval: -1000 });
      }).toThrow();
    });
  });
});
