# db:optimize

Optimize database performance with Context7-verified best practices for PostgreSQL, MongoDB, and Redis.

## Description

Comprehensive database optimization covering:
- **PostgreSQL**: Index optimization, query tuning, VACUUM operations, partitioning
- **MongoDB**: Aggregation pipeline optimization, index strategies, sharding analysis
- **Redis**: Cache hit ratio, memory optimization, pipeline usage, eviction policies

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: postgresql, mongodb, redis.

## Usage

```bash
/db:optimize [options]
```

## Options

- `--database <postgres|mongodb|redis|all>` - Database to optimize (default: all)
- `--scope <indexes|queries|cache|storage|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <path>` - Generate optimization report
- `--auto-apply` - Automatically apply safe optimizations

## Examples

### Optimize All Databases
```bash
/db:optimize
```

### PostgreSQL Index Optimization
```bash
/db:optimize --database postgres --scope indexes
```

### MongoDB Aggregation Analysis
```bash
/db:optimize --database mongodb --analyze-only --output mongodb-report.md
```

### Redis Cache Optimization with Auto-Apply
```bash
/db:optimize --database redis --scope cache --auto-apply
```

## PostgreSQL Optimization

### Pattern from Context7 (/websites/postgresql)

#### 1. Index Analysis and Optimization

**Unused Index Detection:**
```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Index Hit Ratio:**
```sql
-- Check index hit ratio (should be > 95%)
SELECT
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100
    AS index_hit_ratio
FROM pg_statio_user_indexes;
```

**Missing Foreign Key Indexes:**
```sql
-- Find foreign keys without indexes
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = tc.table_name
    AND indexdef LIKE '%' || kcu.column_name || '%'
);
```

#### 2. Query Optimization

**Slow Query Analysis:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second
SELECT pg_reload_conf();

-- Most time-consuming queries
SELECT
    userid::regrole,
    dbid,
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

**EXPLAIN ANALYZE Pattern:**
```sql
-- Always use EXPLAIN ANALYZE for query optimization
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date >= NOW() - INTERVAL '30 days';
```

#### 3. Index Strategies

**Composite Indexes (Context7 Pattern):**
```sql
-- Multi-column index for multi-condition queries
CREATE INDEX idx_orders_customer_date
ON orders(customer_id, order_date DESC);

-- Partial index for subset of rows
CREATE INDEX idx_orders_pending
ON orders(order_date)
WHERE status = 'pending';

-- Expression index for computed values
CREATE INDEX idx_users_lower_email
ON users(lower(email));

-- Covering index with INCLUDE clause (PostgreSQL 11+)
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (order_date, amount, status);
```

**GIN Indexes for Full-Text Search:**
```sql
-- Full-text search index
CREATE INDEX idx_articles_search
ON articles
USING GIN(to_tsvector('english', title || ' ' || content));

-- JSONB path operators index
CREATE INDEX idx_api_logs_response
ON api_logs
USING GIN(response jsonb_path_ops);
```

**BRIN Indexes for Large Tables:**
```sql
-- BRIN for naturally ordered large tables
CREATE INDEX idx_logs_timestamp
ON logs
USING BRIN(timestamp);
```

#### 4. VACUUM and Maintenance

```sql
-- Analyze table statistics
ANALYZE your_table;

-- Vacuum with options
VACUUM (VERBOSE, ANALYZE) your_table;

-- Auto-vacuum tuning
ALTER TABLE large_table
SET (autovacuum_vacuum_scale_factor = 0.05);
```

## MongoDB Optimization

### Pattern from Context7 (/mongodb/mongo)

#### 1. Aggregation Pipeline Optimization

**DISTINCT_SCAN Optimization:**
```javascript
// Optimized aggregation using index
db.collection.aggregate([
  {
    $group: {
      _id: "$a",
      firstField: { $first: "$b" }
    }
  }
])

// Execution plan shows DISTINCT_SCAN on index a_1_b_1
```

**Index Selection Strategy:**
```javascript
// Create compound index for aggregation
db.collection.createIndex({ a: 1, b: 1 })

// Aggregation with sort before group (uses index efficiently)
db.collection.aggregate([
  { $sort: { a: 1, b: 1 } },
  {
    $group: {
      _id: "$a",
      firstField: { $first: "$b" }
    }
  }
])
```

#### 2. Index Optimization

**Covered Query Pattern:**
```javascript
// Index covers all query fields
db.collection.createIndex({ field1: 1, field2: 1, field3: 1 })

// Query uses index-only scan (PROJECTION_COVERED)
db.collection.find(
  { field1: value },
  { _id: 0, field1: 1, field2: 1, field3: 1 }
)
```

**Compound Index Best Practices:**
```javascript
// ESR Rule: Equality, Sort, Range
db.orders.createIndex({
  customer_id: 1,    // Equality
  order_date: -1,    // Sort
  amount: 1          // Range
})

// Optimal query
db.orders.find({
  customer_id: 123,
  amount: { $gt: 100 }
}).sort({ order_date: -1 })
```

#### 3. Aggregation Analysis

**Using explain() for Aggregation:**
```javascript
// Analyze aggregation pipeline
db.collection.explain("executionStats").aggregate([
  { $match: { b: 3 } },
  { $group: { _id: "$a" } }
])

// Look for:
// - IXSCAN (index scan) vs COLLSCAN (collection scan)
// - Index usage in $match stage
// - DISTINCT_SCAN for efficient grouping
```

#### 4. Sharding Optimization

**Shard Key Selection:**
```javascript
// Enable sharding on database
sh.enableSharding("mydb")

// Choose shard key based on access patterns
sh.shardCollection("mydb.collection", {
  user_id: 1,
  created_at: 1
})

// Check shard distribution
db.collection.getShardDistribution()
```

## Redis Optimization

### Pattern from Context7 (/redis/redis-py)

#### 1. Pipeline Usage for Performance

**Batch Operations Pattern:**
```python
import redis
from datetime import datetime

r = redis.Redis(host='localhost', port=6379)

# WITHOUT Pipeline - SLOW
start = datetime.now()
for i in range(10000):
    r.incr("counter")
time_without_pipeline = (datetime.now() - start).total_seconds()
# Time: ~5 seconds

# WITH Pipeline - FAST
start = datetime.now()
pipe = r.pipeline()
for i in range(10000):
    pipe.incr("counter")
pipe.execute()
time_with_pipeline = (datetime.now() - start).total_seconds()
# Time: ~0.1 seconds (50x faster!)
```

**Advanced Builder Pattern:**
```python
from dataclasses import dataclass

@dataclass
class User:
    email: str
    username: str = None

class RedisRepository:
    def __init__(self):
        self.pipeline = r.pipeline()

    def add_user(self, user: User):
        if not user.username:
            user.username = user.email.split("@")[0]
        self.pipeline.hset(
            f"user:{user.username}",
            mapping={
                "username": user.username,
                "email": user.email
            }
        )
        return self

    def execute(self):
        return self.pipeline.execute()

# Usage
pipe = RedisRepository()
results = (pipe
    .add_user(User(email="alice@example.com"))
    .add_user(User(email="bob@example.com"))
    .execute()
)
```

#### 2. Client-Side Caching (RESP3)

**Enable Caching Pattern:**
```python
import redis
from redis.cache import CacheConfig

# Enable client-side caching
r = redis.Redis(
    host='localhost',
    port=6379,
    protocol=3,
    cache_config=CacheConfig()
)

# Cached reads (significantly faster)
value = r.get("frequently_accessed_key")
```

#### 3. Pub/Sub Optimization

**Efficient Pattern Subscription:**
```python
import asyncio
import redis.asyncio as redis

async def reader(channel):
    while True:
        message = await channel.get_message(
            ignore_subscribe_messages=True,
            timeout=None
        )
        if message:
            # Process message
            pass

r = redis.from_url("redis://localhost")
async with r.pubsub() as pubsub:
    # Subscribe to pattern
    await pubsub.psubscribe("channel:*")

    # Create reader task
    await reader(pubsub)
```

#### 4. Memory Optimization

**Eviction Policies:**
```bash
# Set eviction policy
CONFIG SET maxmemory-policy allkeys-lru

# Eviction policies:
# - allkeys-lru: Evict least recently used keys
# - allkeys-lfu: Evict least frequently used keys
# - volatile-lru: Evict LRU from keys with TTL
# - volatile-ttl: Evict keys with shortest TTL
```

**Memory Analysis:**
```bash
# Check memory usage
INFO memory

# Analyze key memory usage
MEMORY USAGE key_name

# Find big keys
redis-cli --bigkeys
```

## Optimization Output

### Console Output

```
🔍 Database Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PostgreSQL Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📊 Index Analysis:
     ✅ Index hit ratio: 98.5% (excellent)
     ⚠️  Found 3 unused indexes (120 MB total)
     ❌ Missing index on orders.customer_id (FK without index)

  🔍 Query Performance:
     ⚠️  5 slow queries detected (> 1 second)
     💡 Top query: SELECT from orders JOIN customers (avg 2.3s)

  💰 Storage Optimization:
     ⚠️  Table bloat detected: users table (45% bloat)
     💡 Recommendation: VACUUM FULL users

  Optimization Opportunities:
     1. Drop 3 unused indexes → Save 120 MB
     2. Create index on orders.customer_id → 80% faster queries
     3. VACUUM users table → Reclaim 200 MB
     4. Optimize top 5 slow queries → 50% performance improvement

MongoDB Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📊 Index Analysis:
     ✅ Using IXSCAN for 95% of queries
     ⚠️  3 queries using COLLSCAN (full collection scan)
     💡 Create compound index: { user_id: 1, created_at: -1 }

  🔄 Aggregation Pipelines:
     ✅ Using DISTINCT_SCAN for group operations
     ⚠️  Pipeline #3 not using index (stages in wrong order)
     💡 Move $match before $group

  💾 Sharding:
     ✅ Shard distribution: 33% / 34% / 33% (balanced)
     ✅ Shard key selectivity: High

  Optimization Opportunities:
     1. Create 2 compound indexes → Eliminate COLLSCAN
     2. Reorder aggregation pipeline → 3x faster
     3. Add partial index for active users → 50 MB savings

Redis Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📊 Cache Performance:
     ⚠️  Hit ratio: 75% (target: > 95%)
     💡 Increase TTL for frequently accessed keys

  💾 Memory Usage:
     Current: 2.1 GB / 4 GB (52% used)
     ⚠️  50 keys > 1 MB each
     💡 Use compression or split large values

  ⚡ Performance:
     ❌ Not using pipelining for batch operations
     💡 Use pipelines → 50x performance improvement

  🔄 Eviction Policy:
     Current: allkeys-lru
     ✅ Appropriate for cache use case

  Optimization Opportunities:
     1. Enable pipelining for batch ops → 50x faster
     2. Increase TTL for hot keys → 95%+ hit ratio
     3. Compress large values → 30% memory savings
     4. Enable client-side caching (RESP3) → 10x reads

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimization Opportunities: 10

  🟢 Auto-Apply Safe: 4 optimizations
  🟡 Review Recommended: 4 optimizations
  🔴 Manual Required: 2 optimizations

  Estimated Performance Improvement: 3-5x
  Estimated Storage Savings: 450 MB

  Run with --auto-apply to apply safe optimizations
```

## Implementation

This command uses specialized database agents:

1. **@postgresql-expert** - PostgreSQL optimization
2. **@mongodb-expert** - MongoDB optimization
3. **@redis-expert** - Redis optimization

Process:
1. Query Context7 for database-specific best practices
2. Analyze database performance metrics
3. Identify optimization opportunities
4. Generate recommendations with risk levels
5. Optionally apply safe optimizations
6. Generate detailed optimization report

## Best Practices Applied

**PostgreSQL (from Context7):**
- Index-only scans with covering indexes
- Partial indexes for filtered queries
- BRIN indexes for large sequential tables
- VACUUM and ANALYZE scheduling
- Query plan analysis with EXPLAIN

**MongoDB (from Context7):**
- DISTINCT_SCAN for efficient grouping
- ESR rule for compound indexes
- Aggregation pipeline stage ordering
- Shard key selection strategies
- Index-covered queries

**Redis (from Context7):**
- Pipeline usage for batch operations
- Client-side caching (RESP3)
- Eviction policy selection
- Memory optimization techniques
- Pub/Sub pattern subscription

## Related Commands

- `/db:migrate` - Database migration management
- `/db:backup` - Database backup operations
- `/db:monitor` - Real-time performance monitoring
- `/cloud:cost-optimize` - Cloud database cost optimization

## Troubleshooting

### PostgreSQL Issues
- Check pg_stat_statements extension is installed
- Verify slow query logging is enabled
- Ensure proper permissions for analysis queries

### MongoDB Issues
- Enable profiler: `db.setProfilingLevel(1, { slowms: 100 })`
- Check shard status: `sh.status()`
- Verify index usage: `db.collection.getIndexes()`

### Redis Issues
- Check INFO stats for hit/miss ratio
- Monitor slow log: `SLOWLOG GET 10`
- Verify memory usage: `INFO memory`

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Context7-verified optimization patterns
- Multi-database support (PostgreSQL, MongoDB, Redis)
- Auto-apply safe optimizations
