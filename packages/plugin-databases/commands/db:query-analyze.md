---
name: db:query-analyze
description: Analyze SQL queries for performance bottlenecks, suggest optimizations, and recommend indexes using Context7-verified best practices.
allowed-tools: Bash, Read, Write, Task, Agent
version: 2.0.0
---

# db:query-analyze

Comprehensive SQL query analysis with performance optimization recommendations for PostgreSQL, MySQL, and BigQuery.

## Description

Advanced query analysis covering:
- **Query Parsing**: Extract tables, joins, WHERE clauses, aggregations
- **EXPLAIN Analysis**: Parse and interpret execution plans
- **Index Recommendations**: Suggest missing indexes on foreign keys, WHERE/JOIN columns
- **Query Rewrites**: Optimize subqueries, eliminate N+1 patterns, improve joins
- **Performance Estimation**: Calculate expected improvement from optimizations

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: postgresql, mysql, bigquery.

## Usage

```bash
/db:query-analyze [options] "<SQL query>"
```

## Options

- `<SQL query>` - SQL query to analyze (required if --file not provided)
- `--file <path>` - Analyze queries from SQL file
- `--database <postgres|mysql|bigquery>` - Database type (default: postgres)
- `--threshold <time>` - Only show queries slower than threshold (e.g., 100ms)
- `--explain-analyze` - Use EXPLAIN ANALYZE for real execution stats
- `--output <path>` - Generate analysis report file
- `--auto-optimize` - Generate optimized query versions

## Examples

### Basic Query Analysis

```bash
/db:query-analyze "SELECT u.*, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id"
```

### Analyze from File with Threshold

```bash
/db:query-analyze --file slow-queries.sql --threshold 100ms
```

### PostgreSQL with EXPLAIN ANALYZE

```bash
/db:query-analyze --database postgresql --explain-analyze "
SELECT o.*, u.name, p.title
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 100
"
```

### BigQuery Analysis with Auto-Optimize

```bash
/db:query-analyze --database bigquery --auto-optimize "
SELECT customer_id, SUM(amount) as total
FROM orders
WHERE _PARTITIONTIME >= TIMESTAMP('2024-01-01')
GROUP BY customer_id
HAVING total > 1000
"
```

## Instructions

### Step 1: Query Context7 for Best Practices

**MANDATORY FIRST STEP**: Before analyzing any query, query Context7 for the specific database type:

```markdown
Query Context7 with:
- Database-specific query optimization patterns
- Index strategy recommendations
- EXPLAIN plan interpretation guidelines
```

### Step 2: Parse Query AST

Extract query components:

1. **Tables Referenced**: Identify all tables in FROM and JOIN clauses
2. **Join Conditions**: Extract JOIN types (INNER, LEFT, RIGHT) and ON conditions
3. **WHERE Filters**: Parse all filter conditions and their columns
4. **Aggregations**: Identify GROUP BY, HAVING, aggregate functions
5. **Ordering**: Extract ORDER BY columns and directions
6. **Subqueries**: Detect nested SELECT statements and CTEs
7. **Window Functions**: Identify OVER clauses and partitioning

### Step 3: Analyze EXPLAIN Plan (if available)

Parse execution plan to identify:

**PostgreSQL EXPLAIN ANALYZE:**
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT ...
```

Look for:
- **Seq Scan** → Missing index opportunity
- **Index Scan** vs **Index Only Scan** → Covering index opportunity
- **Nested Loop** with high cost → Consider hash join or rewrite
- **Filter** in index scan → Partial index or composite index opportunity
- **Rows Removed by Filter** → Selectivity issues
- **Buffers** → I/O bottlenecks

**MySQL EXPLAIN FORMAT=JSON:**
```sql
EXPLAIN FORMAT=JSON
SELECT ...
```

Look for:
- **"type": "ALL"** → Full table scan, needs index
- **"Extra": "Using filesort"** → Missing index for ORDER BY
- **"Extra": "Using temporary"** → Inefficient GROUP BY
- **"filtered": low percentage** → Poor selectivity

**BigQuery Query Plan:**
Look for:
- **Partition pruning** → Use _PARTITIONTIME on left side
- **Slot milliseconds** → High values indicate expensive operations
- **Shuffle operations** → Consider clustering or denormalization
- **Full table scans** → Missing partitioning/clustering

### Step 4: Generate Index Recommendations

Analyze and recommend indexes based on:

1. **Foreign Key Indexes** (Highest Priority)
   ```sql
   -- Detect JOINs on unindexed columns
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   ```

2. **WHERE Clause Indexes**
   ```sql
   -- Single column for simple filters
   CREATE INDEX idx_orders_status ON orders(status);

   -- Composite for multi-column WHERE
   CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
   ```

3. **Partial Indexes** (PostgreSQL)
   ```sql
   -- For filtered queries
   CREATE INDEX idx_orders_pending ON orders(order_date)
   WHERE status = 'pending';
   ```

4. **Covering Indexes** (PostgreSQL 11+)
   ```sql
   -- Include columns to enable index-only scans
   CREATE INDEX idx_orders_customer_covering ON orders(customer_id)
   INCLUDE (order_date, amount, status);
   ```

5. **GIN Indexes** (PostgreSQL)
   ```sql
   -- For JSONB and array queries
   CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

   -- For full-text search
   CREATE INDEX idx_articles_search ON articles
   USING GIN(to_tsvector('english', title || ' ' || content));
   ```

### Step 5: Suggest Query Rewrites

Identify optimization opportunities:

1. **Subquery to JOIN**
   ```sql
   -- BEFORE (Subquery)
   SELECT * FROM orders
   WHERE user_id IN (SELECT id FROM users WHERE status = 'active');

   -- AFTER (JOIN) - Better performance
   SELECT o.* FROM orders o
   JOIN users u ON o.user_id = u.id
   WHERE u.status = 'active';
   ```

2. **N+1 Query Pattern**
   ```sql
   -- BEFORE (N+1)
   SELECT * FROM users;
   -- Then for each user: SELECT * FROM orders WHERE user_id = ?

   -- AFTER (Single Query with JOIN)
   SELECT u.*, o.*
   FROM users u
   LEFT JOIN orders o ON u.id = o.user_id;
   ```

3. **COUNT(*) to EXISTS**
   ```sql
   -- BEFORE (Count all)
   SELECT COUNT(*) > 0 FROM orders WHERE customer_id = 123;

   -- AFTER (Stop at first match)
   SELECT EXISTS(SELECT 1 FROM orders WHERE customer_id = 123 LIMIT 1);
   ```

4. **CTE Optimization**
   ```sql
   -- BEFORE (CTE materialized)
   WITH user_orders AS (
     SELECT user_id, COUNT(*) FROM orders GROUP BY user_id
   )
   SELECT * FROM user_orders WHERE user_id = 123;

   -- AFTER (Inline or use NOT MATERIALIZED in PostgreSQL 12+)
   SELECT user_id, COUNT(*) FROM orders
   WHERE user_id = 123
   GROUP BY user_id;
   ```

5. **Window Function Optimization**
   ```sql
   -- BEFORE (Multiple queries)
   SELECT *, (SELECT MAX(amount) FROM orders o2 WHERE o2.user_id = o1.user_id) as max_amount
   FROM orders o1;

   -- AFTER (Window function)
   SELECT *, MAX(amount) OVER (PARTITION BY user_id) as max_amount
   FROM orders;
   ```

### Step 6: Estimate Performance Impact

Calculate expected improvements:

1. **Index Impact Estimation**
   - **Foreign key index**: 50-90% improvement on JOIN queries
   - **WHERE clause index**: 80-95% improvement for selective filters
   - **Composite index**: 60-85% improvement for multi-column filters
   - **Covering index**: 10-30% additional improvement over regular index

2. **Query Rewrite Impact**
   - **Subquery → JOIN**: 40-70% improvement
   - **N+1 → Batch**: 90-99% improvement (scales with N)
   - **COUNT → EXISTS**: 50-80% improvement for large tables
   - **Unnecessary DISTINCT removal**: 20-40% improvement

3. **EXPLAIN-Based Estimation**
   - Compare **cost** values in EXPLAIN output
   - Track **execution time** reduction with EXPLAIN ANALYZE
   - Measure **rows scanned** reduction

### Step 7: Generate Output

Format recommendations using structured output:

```markdown
## Query Analysis Report

### Performance Issues
❌ Sequential scan on large table (10M rows)
❌ Missing index on foreign key orders.user_id
⚠️  Subquery in WHERE clause causing poor performance

### Index Recommendations
💡 **CREATE INDEX idx_orders_user_id ON orders(user_id);**
   - Reason: Foreign key without index, used in JOIN
   - Impact: 70% faster JOIN queries (~3s → ~900ms)
   - Tables affected: orders (10M rows)

💡 **CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC);**
   - Reason: Composite index for multi-column WHERE + ORDER BY
   - Impact: 85% faster filtered queries (~2.5s → ~375ms)
   - Enables: Index-only scan for common queries

### Query Rewrite Suggestions
✨ **Optimize subquery to JOIN**
   ```sql
   -- Original
   SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE active = true);

   -- Optimized
   SELECT o.* FROM orders o
   JOIN users u ON o.user_id = u.id AND u.active = true;
   ```
   - Rationale: JOIN allows optimizer to use indexes more efficiently
   - Impact: 60% improvement (~1.8s → ~720ms)

### Performance Summary
📊 **Total Estimated Improvement**: 3.2x faster (avg 2.1s → 650ms)
📊 **Index Storage Cost**: ~120 MB for recommended indexes
📊 **Maintenance Impact**: Low (high selectivity indexes)
```

## Implementation

This command uses specialized database agents to analyze and optimize queries:

1. **@postgresql-expert** - PostgreSQL query specialist for EXPLAIN analysis and index optimization
2. **@mongodb-expert** - MongoDB aggregation pipeline specialist
3. **@bigquery-expert** - BigQuery query and partitioning analyst

**Process:**
1. Query Context7 for database-specific optimization patterns
2. Agent analyzes query: Parse SQL query into AST (tables, joins, filters)
3. If available, agent performs EXPLAIN plan output analysis
4. Generate index recommendations with priority ranking
5. Suggest query rewrites with before/after examples
6. Estimate performance impact for each recommendation
7. Format structured output with actionable steps

## PostgreSQL-Specific Features

### Advanced Index Types

**GIN Indexes for JSONB:**
```sql
-- JSONB containment queries
CREATE INDEX idx_products_attrs ON products USING GIN(attributes);

-- Query optimization
SELECT * FROM products
WHERE attributes @> '{"category": "electronics", "brand": "Samsung"}';
```

**BRIN Indexes for Large Sequential Tables:**
```sql
-- Time-series data with natural ordering
CREATE INDEX idx_logs_timestamp ON logs USING BRIN(timestamp);

-- Minimal storage overhead for 100M+ rows
```

**GiST Indexes for Geometric/Text Search:**
```sql
-- Full-text search
CREATE INDEX idx_articles_search ON articles
USING GiST(to_tsvector('english', content));
```

### EXPLAIN ANALYZE Deep Dive

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT o.*, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
AND o.created_at >= NOW() - INTERVAL '7 days';
```

**Analysis Focus:**
- **Seq Scan** → Add index
- **Buffers: shared hit/read** → I/O analysis
- **Rows Removed by Filter** → Better index selectivity needed
- **Planning time** vs **Execution time** → Identify bottleneck

## MySQL-Specific Features

### EXPLAIN FORMAT=JSON

```sql
EXPLAIN FORMAT=JSON
SELECT o.*, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';
```

**Key Metrics:**
- **"type": "ALL"** → Full table scan (bad)
- **"type": "index"** → Index scan
- **"type": "ref"** → Index lookup (good)
- **"Extra": "Using index"** → Covering index (best)
- **"filtered"** → Selectivity percentage

### Index Hints

```sql
-- Force index usage
SELECT * FROM orders FORCE INDEX (idx_status_date)
WHERE status = 'pending'
ORDER BY created_at DESC;
```

## BigQuery-Specific Features

### Partition Pruning

```sql
-- CORRECT: _PARTITIONTIME on left side
SELECT * FROM orders
WHERE _PARTITIONTIME >= TIMESTAMP('2024-01-01')
AND _PARTITIONTIME < TIMESTAMP('2024-02-01');

-- INCORRECT: Function on _PARTITIONTIME prevents pruning
SELECT * FROM orders
WHERE DATE(_PARTITIONTIME) = '2024-01-01';
```

### Clustering

```sql
-- Cluster by frequently filtered columns
CREATE TABLE orders
PARTITION BY DATE(created_at)
CLUSTER BY customer_id, status;
```

### Slot Analysis

Check **Slot milliseconds** in query plan:
- High slots → Expensive operation
- Optimize with partitioning, clustering, or denormalization

## Edge Cases Handling

### Complex Queries with Multiple JOINs

```sql
SELECT u.name, o.total, p.title, c.name as category
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE o.created_at >= '2024-01-01'
AND u.status = 'active';
```

**Recommendations:**
- Index all foreign keys: user_id, product_id, category_id
- Composite index on (created_at, user_id) for WHERE optimization
- Consider denormalization if JOINs are performance bottleneck

### Subqueries and CTEs

```sql
WITH recent_orders AS (
  SELECT user_id, SUM(total) as total_spent
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT u.*, ro.total_spent
FROM users u
LEFT JOIN recent_orders ro ON u.id = ro.user_id
WHERE ro.total_spent > 1000;
```

**Optimizations:**
- Use NOT MATERIALIZED hint in PostgreSQL 12+ for small CTEs
- Ensure indexes on CTE JOIN conditions
- Consider materialized view for frequently used CTEs

### Window Functions

```sql
SELECT
  user_id,
  order_date,
  amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date) as running_total,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date DESC) as recency_rank
FROM orders;
```

**Optimizations:**
- Index on (user_id, order_date) to support PARTITION BY + ORDER BY
- Avoid window functions in WHERE clause (use subquery instead)

## Output Format Examples

### Complete Analysis Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 SQL Query Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Query Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database: PostgreSQL 15.3
Tables: orders (10M rows), users (500K rows)
JOINs: 1 (LEFT JOIN on user_id)
Filters: status = 'pending', created_at >= '7 days ago'
Current Execution Time: 2.3 seconds

⚠️  Performance Issues Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Sequential Scan on orders table (10M rows)
   → EXPLAIN shows: Seq Scan on orders (cost=0.00..180000.00)
   → Reason: No index on status column

❌ Missing Index on Foreign Key
   → orders.user_id has no index
   → JOIN performance degraded: Nested Loop (cost=50000.00)

⚠️  Filter Removing 90% of Rows
   → Rows Removed by Filter: 9,000,000
   → Better index selectivity needed

💡 Index Recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **High Priority: Foreign Key Index**
   ```sql
   CREATE INDEX CONCURRENTLY idx_orders_user_id
   ON orders(user_id);
   ```
   - Impact: 70% faster JOINs (~1.6s saved)
   - Size: ~80 MB
   - Rationale: Every JOIN scans orders table without index

2. **High Priority: Composite Index for Filters**
   ```sql
   CREATE INDEX CONCURRENTLY idx_orders_status_date
   ON orders(status, created_at DESC);
   ```
   - Impact: 85% faster filtered queries (~2.0s saved)
   - Size: ~120 MB
   - Rationale: Covers both WHERE and ORDER BY clauses

3. **Medium Priority: Partial Index**
   ```sql
   CREATE INDEX CONCURRENTLY idx_orders_pending_recent
   ON orders(created_at DESC)
   WHERE status = 'pending';
   ```
   - Impact: 90% faster for pending order queries (~2.1s saved)
   - Size: ~15 MB (only indexes 10% of rows)
   - Rationale: Optimized for common query pattern

✨ Query Rewrite Suggestions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No major rewrites needed - query structure is efficient.

Consider:
- Use prepared statements for parameterized queries
- Add LIMIT clause if not all results needed

📊 Performance Impact Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Performance:    2.3 seconds
After Index #1:         ~900ms     (61% improvement)
After Index #2:         ~345ms     (85% improvement)
After Index #3:         ~230ms     (90% improvement)

Total Improvement: 10x faster (2300ms → 230ms)
Index Storage Cost: ~215 MB
Maintenance Overhead: Low (high selectivity)

🎯 Recommended Action Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Create idx_orders_user_id (mandatory for JOINs)
2. Create idx_orders_status_date (high impact)
3. Monitor query performance for 1 week
4. Consider idx_orders_pending_recent if pattern confirmed
5. Run ANALYZE orders after index creation
```

## Related Commands

- `/db:optimize` - Comprehensive database optimization (includes query analysis)
- `/db:migrate` - Database schema migrations with performance validation
- `/db:monitor` - Real-time query performance monitoring
- `/db:schema-design` - Design optimal database schemas
- `/cloud:cost-optimize` - Optimize cloud database costs

## Troubleshooting

### PostgreSQL Issues

**pg_stat_statements not available:**
```sql
CREATE EXTENSION pg_stat_statements;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- Restart PostgreSQL
```

**EXPLAIN ANALYZE modifies data:**
```sql
-- Use EXPLAIN only (no ANALYZE) for INSERT/UPDATE/DELETE
EXPLAIN SELECT ...
-- Or wrap in transaction and rollback
BEGIN;
EXPLAIN ANALYZE UPDATE ...;
ROLLBACK;
```

### MySQL Issues

**EXPLAIN FORMAT=JSON not available:**
- Requires MySQL 5.6+
- Fall back to standard EXPLAIN

**Index hints ignored:**
- Check index statistics: `ANALYZE TABLE orders;`
- Verify index exists: `SHOW INDEX FROM orders;`

### BigQuery Issues

**Partition pruning not working:**
- Ensure _PARTITIONTIME on left side of comparison
- Don't use functions on _PARTITIONTIME
- Use TIMESTAMP literals, not DATE

**High slot milliseconds:**
- Check for cross-join patterns
- Verify clustering on filtered columns
- Consider materialized views for complex aggregations

## Best Practices

### Context7-Verified Patterns

From PostgreSQL documentation (/websites/postgresql):
- **B-tree indexes**: Default for equality and range queries
- **Partial indexes**: Use WHERE clause to index subset of rows
- **Covering indexes**: INCLUDE clause to avoid heap lookups (PostgreSQL 11+)
- **CREATE INDEX CONCURRENTLY**: Avoid table locks in production
- **Index-only scans**: Leverage visibility map for performance

From MySQL documentation:
- **Composite index order**: Most selective columns first
- **Covering indexes**: Include all SELECT columns
- **Index merge**: MySQL can use multiple indexes, but better to create composite

From BigQuery documentation:
- **Partition pruning**: Always use _PARTITIONTIME on left side
- **Clustering**: Up to 4 columns, order by filter frequency
- **Slot optimization**: Minimize data scanned with partitioning

## Version History

- v2.0.0 - Initial Schema v2.0 release
  - Context7-verified optimization patterns
  - Multi-database support (PostgreSQL, MySQL, BigQuery)
  - EXPLAIN plan analysis
  - Index recommendation engine
  - Query rewrite suggestions
  - Performance impact estimation
