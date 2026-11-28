const AzureCache = require('../../autopm/.claude/providers/azure/lib/cache.js');

describe('AzureCache', () => {
  let cache;
  let originalDateNow;

  beforeEach(() => {
    cache = new AzureCache();
    // Mock Date.now() for consistent testing
    originalDateNow = Date.now;
    Date.now = jest.fn(() => 1000000); // Fixed timestamp
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultCache = new AzureCache();

      expect(defaultCache.cache).toBeInstanceOf(Map);
      expect(defaultCache.defaultTTL).toBe(60000); // 1 minute
      expect(defaultCache.maxSize).toBe(100);
      expect(defaultCache.hits).toBe(0);
      expect(defaultCache.misses).toBe(0);
    });

    it('should initialize with custom options', () => {
      const customCache = new AzureCache({
        ttl: 30000, // 30 seconds
        maxSize: 50
      });

      expect(customCache.defaultTTL).toBe(30000);
      expect(customCache.maxSize).toBe(50);
      expect(customCache.hits).toBe(0);
      expect(customCache.misses).toBe(0);
    });

    it('should handle empty options object', () => {
      const emptyCache = new AzureCache({});

      expect(emptyCache.defaultTTL).toBe(60000);
      expect(emptyCache.maxSize).toBe(100);
    });
  });

  describe('get()', () => {
    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');

      expect(result).toBe(null);
      expect(cache.misses).toBe(1);
      expect(cache.hits).toBe(0);
    });

    it('should return cached value for valid key', () => {
      cache.set('test-key', 'test-value');

      const result = cache.get('test-key');

      expect(result).toBe('test-value');
      expect(cache.hits).toBe(1);
      expect(cache.misses).toBe(0);
    });

    it('should return null for expired key', () => {
      // Set value that expires immediately
      cache.set('expired-key', 'expired-value', 0);

      // Move time forward
      Date.now = jest.fn(() => 1000001);

      const result = cache.get('expired-key');

      expect(result).toBe(null);
      expect(cache.misses).toBe(1);
      expect(cache.hits).toBe(0);
      expect(cache.cache.has('expired-key')).toBe(false); // Should be deleted
    });

    it('should increment hits for valid cache access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1');
      cache.get('key2');
      cache.get('key1'); // Second access

      expect(cache.hits).toBe(3);
      expect(cache.misses).toBe(0);
    });

    it('should increment misses for cache miss', () => {
      cache.get('miss1');
      cache.get('miss2');
      cache.get('miss1'); // Second miss

      expect(cache.hits).toBe(0);
      expect(cache.misses).toBe(3);
    });
  });

  describe('set()', () => {
    it('should store value with default TTL', () => {
      cache.set('test-key', 'test-value');

      expect(cache.cache.has('test-key')).toBe(true);
      const entry = cache.cache.get('test-key');
      expect(entry.value).toBe('test-value');
      expect(entry.expiry).toBe(1000000 + 60000); // now + defaultTTL
    });

    it('should store value with custom TTL', () => {
      cache.set('test-key', 'test-value', 30000);

      const entry = cache.cache.get('test-key');
      expect(entry.value).toBe('test-value');
      expect(entry.expiry).toBe(1000000 + 30000); // now + custom TTL
    });

    it('should overwrite existing key', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');

      expect(cache.get('key')).toBe('value2');
      expect(cache.cache.size).toBe(1);
    });

    it('should implement LRU eviction when cache is full', () => {
      const smallCache = new AzureCache({ maxSize: 2 });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should evict key1

      expect(smallCache.cache.has('key1')).toBe(false); // Evicted
      expect(smallCache.cache.has('key2')).toBe(true);
      expect(smallCache.cache.has('key3')).toBe(true);
      expect(smallCache.cache.size).toBe(2);
    });

    it('should handle various data types', () => {
      cache.set('string', 'text');
      cache.set('number', 42);
      cache.set('object', { key: 'value' });
      cache.set('array', [1, 2, 3]);
      cache.set('null', null);

      expect(cache.get('string')).toBe('text');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ key: 'value' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('null')).toBe(null);
    });

    it('should handle zero TTL', () => {
      cache.set('zero-ttl', 'value', 0);

      const entry = cache.cache.get('zero-ttl');
      expect(entry.expiry).toBe(1000000); // now + 0
    });
  });

  describe('clear()', () => {
    it('should clear all cache entries and reset stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // Generate a hit
      cache.get('nonexistent'); // Generate a miss

      expect(cache.cache.size).toBe(2);
      expect(cache.hits).toBe(1);
      expect(cache.misses).toBe(1);

      cache.clear();

      expect(cache.cache.size).toBe(0);
      expect(cache.hits).toBe(0);
      expect(cache.misses).toBe(0);
    });

    it('should allow cache to be used after clearing', () => {
      cache.set('key1', 'value1');
      cache.clear();
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe(null); // No longer exists
      expect(cache.get('key2')).toBe('value2'); // New entry works
    });
  });

  describe('prune()', () => {
    it('should remove expired entries', () => {
      cache.set('valid', 'still-good', 10000); // Expires in 10 seconds
      cache.set('expired1', 'bad1', 0); // Expires immediately
      cache.set('expired2', 'bad2', 1); // Expires in 1ms

      // Move time forward to expire some entries
      Date.now = jest.fn(() => 1000002);

      cache.prune();

      expect(cache.cache.has('valid')).toBe(true);
      expect(cache.cache.has('expired1')).toBe(false);
      expect(cache.cache.has('expired2')).toBe(false);
      expect(cache.cache.size).toBe(1);
    });

    it('should not remove valid entries', () => {
      cache.set('key1', 'value1', 10000);
      cache.set('key2', 'value2', 20000);
      cache.set('key3', 'value3', 30000);

      cache.prune();

      expect(cache.cache.size).toBe(3);
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should handle empty cache', () => {
      expect(() => cache.prune()).not.toThrow();
      expect(cache.cache.size).toBe(0);
    });

    it('should handle cache with all expired entries', () => {
      cache.set('expired1', 'value1', 0);
      cache.set('expired2', 'value2', 0);

      // Move time forward
      Date.now = jest.fn(() => 1000001);

      cache.prune();

      expect(cache.cache.size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics with no activity', () => {
      const stats = cache.getStats();

      expect(stats).toEqual({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: '0%'
      });
    });

    it('should return correct statistics with cache activity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key3'); // Miss
      cache.get('key4'); // Miss

      const stats = cache.getStats();

      expect(stats).toEqual({
        size: 2,
        hits: 2,
        misses: 2,
        hitRate: '50.00%'
      });
    });

    it('should calculate hit rate correctly with more hits', () => {
      cache.set('popular', 'value');

      // Generate multiple hits
      for (let i = 0; i < 8; i++) {
        cache.get('popular');
      }

      // Generate some misses
      cache.get('miss1');
      cache.get('miss2');

      const stats = cache.getStats();

      expect(stats.hits).toBe(8);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe('80.00%');
    });

    it('should handle 100% hit rate', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');

      const stats = cache.getStats();

      expect(stats.hitRate).toBe('100.00%');
    });

    it('should handle 0% hit rate', () => {
      cache.get('miss1');
      cache.get('miss2');

      const stats = cache.getStats();

      expect(stats.hitRate).toBe('0.00%');
    });
  });

  describe('generateKey()', () => {
    it('should generate consistent keys for same parameters', () => {
      const key1 = AzureCache.generateKey('param1', 'param2');
      const key2 = AzureCache.generateKey('param1', 'param2');

      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
    });

    it('should generate different keys for different parameters', () => {
      const key1 = AzureCache.generateKey('param1', 'param2');
      const key2 = AzureCache.generateKey('param1', 'param3');
      const key3 = AzureCache.generateKey('param2', 'param1');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should handle various parameter types', () => {
      const key1 = AzureCache.generateKey('string', 123, true, { obj: 'value' });
      const key2 = AzureCache.generateKey('string', 123, true, { obj: 'value' });

      expect(key1).toBe(key2);
    });

    it('should handle no parameters', () => {
      const key1 = AzureCache.generateKey();
      const key2 = AzureCache.generateKey();

      expect(key1).toBe(key2);
      expect(key1).toBe('[]');
    });

    it('should handle single parameter', () => {
      const key = AzureCache.generateKey('single');

      expect(key).toBe('["single"]');
    });

    it('should handle null and undefined parameters', () => {
      const key1 = AzureCache.generateKey(null, undefined);
      const key2 = AzureCache.generateKey(null, undefined);

      expect(key1).toBe(key2);
      expect(key1).toBe('[null,null]');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      // Test that the module exports the class directly
      expect(typeof AzureCache).toBe('function');
      expect(AzureCache.name).toBe('AzureCache');
      expect(typeof AzureCache.generateKey).toBe('function');
    });

    it('should handle realistic cache workflow', () => {
      const workItemCache = new AzureCache({ ttl: 30000, maxSize: 10 });

      // Cache some work items
      const workItem1 = { id: 123, title: 'Test Item 1' };
      const workItem2 = { id: 456, title: 'Test Item 2' };

      const key1 = AzureCache.generateKey('workitem', 123);
      const key2 = AzureCache.generateKey('workitem', 456);

      workItemCache.set(key1, workItem1);
      workItemCache.set(key2, workItem2);

      // Retrieve cached items
      expect(workItemCache.get(key1)).toEqual(workItem1);
      expect(workItemCache.get(key2)).toEqual(workItem2);

      // Check cache miss
      const key3 = AzureCache.generateKey('workitem', 789);
      expect(workItemCache.get(key3)).toBe(null);

      // Verify statistics
      const stats = workItemCache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(2);
    });

    it('should handle cache eviction in realistic scenario', () => {
      const smallCache = new AzureCache({ maxSize: 3 });

      // Fill cache to capacity
      smallCache.set('item1', 'data1');
      smallCache.set('item2', 'data2');
      smallCache.set('item3', 'data3');

      expect(smallCache.cache.size).toBe(3);

      // Add one more item, triggering eviction
      smallCache.set('item4', 'data4');

      expect(smallCache.cache.size).toBe(3);
      expect(smallCache.get('item1')).toBe(null); // Evicted
      expect(smallCache.get('item4')).toBe('data4'); // New item
    });

    it('should handle time-based expiration correctly', () => {
      const shortTtlCache = new AzureCache({ ttl: 1000 }); // 1 second TTL

      shortTtlCache.set('temp', 'temporary-data');

      // Should be available immediately
      expect(shortTtlCache.get('temp')).toBe('temporary-data');

      // Move time forward past expiration
      Date.now = jest.fn(() => 1002000); // 2 seconds later

      // Should be expired
      expect(shortTtlCache.get('temp')).toBe(null);
    });

    it('should handle edge cases gracefully', () => {
      // Test with negative TTL (should still work)
      cache.set('negative-ttl', 'value', -1000);
      expect(cache.get('negative-ttl')).toBe(null); // Should be expired

      // Test with very large TTL
      cache.set('large-ttl', 'value', Number.MAX_SAFE_INTEGER);
      expect(cache.get('large-ttl')).toBe('value');

      // Test with zero maxSize cache (implementation allows storage but immediately evicts)
      const zeroCache = new AzureCache({ maxSize: 0 });
      zeroCache.set('key', 'value');
      expect(zeroCache.cache.size).toBe(1); // Implementation still stores but evicts on next set
    });

    it('should work with complex objects and maintain reference integrity', () => {
      const complexObject = {
        workItem: {
          id: 123,
          fields: {
            title: 'Complex Work Item',
            assignee: { name: 'John Doe', email: 'john@example.com' }
          },
          relations: [{ type: 'child', id: 456 }]
        },
        metadata: {
          cached: true,
          timestamp: Date.now()
        }
      };

      cache.set('complex', complexObject);
      const retrieved = cache.get('complex');

      expect(retrieved).toEqual(complexObject);
      expect(retrieved).toBe(complexObject); // Should maintain reference
    });
  });
});