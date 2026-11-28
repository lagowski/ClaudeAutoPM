---
command: db:connection-pool
plugin: databases
category: database-operations
description: Connection pool optimization for databases
tags:
  - database
  - connection-pool
  - performance
  - optimization
  - pgbouncer
tools:
  - @postgresql-expert
  - @mongodb-expert
  - @redis-expert
  - Read
  - Write
  - Bash
usage: |
  /db:connection-pool --database postgres://db --analyze --recommend
examples:
  - input: /db:connection-pool --database prod-db --max-connections 100 --idle-timeout 30s
    description: Configure pool with specific limits
  - input: /db:connection-pool --framework sequelize --workload high-concurrency
    description: Generate Sequelize pool config for high concurrency
  - input: /db:connection-pool --analyze --detect-leaks
    description: Analyze current pool and detect connection leaks
  - input: /db:connection-pool --pgbouncer --mode transaction --max-clients 1000
    description: Generate PgBouncer configuration for transaction pooling
---

# /db:connection-pool

Optimize database connection pool configurations for maximum performance and resource efficiency across PostgreSQL, MySQL, MongoDB, and Redis.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: postgresql, mysql, mongodb, redis, nodejs, sequelize, typeorm, prisma.

## Overview

Connection pooling is critical for database performance in production environments. This command provides:

### Core Capabilities

1. **Multi-Database Support**
   - PostgreSQL (native + PgBouncer)
   - MySQL
   - MongoDB (with replica set support)
   - Redis (standalone + cluster)

2. **Pool Size Optimization**
   - CPU-based calculations
   - Workload-specific sizing
   - Concurrency analysis
   - Load testing and validation

3. **Framework Integration**
   - Sequelize configuration
   - TypeORM setup
   - Prisma connection strings
   - Native driver configs

4. **Monitoring & Diagnostics**
   - Connection leak detection
   - Pool utilization metrics
   - Bottleneck identification
   - Performance recommendations

## Command Structure

### Basic Usage

```bash
# Analyze current pool configuration
/db:connection-pool --database postgresql://localhost:5432/mydb --analyze

# Generate optimal configuration
/db:connection-pool --database postgres://db --workload high-concurrency --recommend

# Test pool under load
/db:connection-pool --database mysql://db --load-test --concurrent-clients 200
```

### Framework-Specific Configuration

```bash
# Sequelize
/db:connection-pool --framework sequelize --dialect postgres --max 50 --min 10

# TypeORM
/db:connection-pool --framework typeorm --type mysql --pool-size 30

# Prisma
/db:connection-pool --framework prisma --connection-limit 25 --pool-timeout 10
```

### PgBouncer Configuration

```bash
# Transaction pooling (recommended)
/db:connection-pool --pgbouncer --mode transaction --max-clients 1000 --default-pool 25

# Session pooling
/db:connection-pool --pgbouncer --mode session --max-clients 500 --default-pool 50
```

## Parameters

### Database Configuration

- `--database <url>` - Database connection URL
- `--type <type>` - Database type: postgresql, mysql, mongodb, redis
- `--workload <type>` - Workload type: oltp, analytics, standard, high-concurrency, low-concurrency

### Pool Settings

- `--max-connections <n>` - Maximum pool connections
- `--min-connections <n>` - Minimum pool connections
- `--idle-timeout <ms>` - Idle connection timeout
- `--connection-timeout <ms>` - Connection acquisition timeout
- `--statement-timeout <ms>` - Query/statement timeout

### Operations

- `--analyze` - Analyze current pool configuration
- `--recommend` - Generate tuning recommendations
- `--detect-leaks` - Check for connection leaks
- `--monitor` - Display real-time pool metrics
- `--load-test` - Simulate load testing
- `--validate` - Validate configuration

### Framework Options

- `--framework <name>` - Framework: sequelize, typeorm, prisma
- `--dialect <type>` - SQL dialect (for Sequelize)
- `--config-file <path>` - Output configuration file path

### PgBouncer Options

- `--pgbouncer` - Generate PgBouncer configuration
- `--mode <mode>` - Pooling mode: transaction, session, statement
- `--max-clients <n>` - Maximum client connections
- `--default-pool <n>` - Default pool size per database
- `--prepared-statements <n>` - Max prepared statements (transaction mode)

## Implementation Workflow

### 1. Initial Analysis Phase

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: postgresql, nodejs.

**Analysis Steps:**
1. Detect database type and version
2. Analyze current pool configuration
3. Measure connection metrics:
   - Active connections
   - Idle connections
   - Waiting clients
   - Average wait time
4. Calculate utilization percentage
5. Identify bottlenecks

**Output:**
```
🔍 CONNECTION POOL ANALYSIS
===========================
Database: PostgreSQL 15.3
Current Pool Size: max=20, min=5
Active Connections: 18/20 (90%)
Idle Connections: 2/20 (10%)
Waiting Clients: 15
Average Wait Time: 2,345ms

⚠️  Status: CRITICAL
Pool utilization at 90% with waiting clients
Connection acquisition bottleneck detected
```

### 2. Workload Analysis

**CPU & Concurrency Assessment:**
```javascript
CPU Cores: 8
Workload Type: High-Concurrency OLTP
Peak Concurrent Requests: 500
Average Query Time: 45ms

Calculated Optimal Pool Size:
- Minimum: 8 (1x CPU cores)
- Recommended: 32 (4x CPU cores)
- Maximum: 40 (5x CPU cores)
```

**Workload Patterns:**
- **OLTP**: Short queries, high concurrency → 3-4x CPU cores
- **Analytics**: Long queries, lower concurrency → 2x CPU cores
- **Mixed**: Variable patterns → 3x CPU cores
- **High-Latency**: Network delays → +50% buffer

### 3. Configuration Generation

#### PostgreSQL Native Pool

```javascript
// Generated configuration
{
  max: 32,
  min: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  application_name: 'nodejs_app'
}
```

#### PgBouncer Configuration

```ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
max_prepared_statements = 100
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 120
```

**PgBouncer Best Practices (2025):**
1. **Transaction Pooling** - Recommended for most web applications
2. **Pool Sizing Formula**: `(database, user)` pairs × `default_pool_size`
3. **Prepared Statements**: Enable in transaction mode with max_prepared_statements
4. **Multi-Instance Setup**: Run multiple PgBouncer processes for CPU cores > 1
5. **Application Server Deployment**: Co-locate PgBouncer with app servers

#### Sequelize Configuration

```javascript
// config/database.js
const sequelize = new Sequelize('database', 'username', 'password', {
  dialect: 'postgres',
  pool: {
    max: 32,
    min: 8,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3,
    timeout: 3000
  }
});
```

#### TypeORM Configuration

```typescript
// ormconfig.ts
export default {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'pass',
  database: 'mydb',
  poolSize: 32,
  extra: {
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
  }
}
```

#### Prisma Configuration

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://user:pass@localhost:5432/mydb?connection_limit=32&pool_timeout=10"
}
```

### 4. Timeout Optimization

**Workload-Specific Timeouts:**

```javascript
OLTP Workload:
  connectionTimeout: 3000ms
  idleTimeout: 30000ms
  statementTimeout: 5000ms
  queryTimeout: 10000ms

Analytics Workload:
  connectionTimeout: 10000ms
  idleTimeout: 120000ms
  statementTimeout: 300000ms (5 min)
  queryTimeout: 300000ms

High-Latency Network:
  connectionTimeout: 10000ms
  idleTimeout: 90000ms
  statementTimeout: 60000ms
```

### 5. Leak Detection

**Detection Criteria:**
```
🔍 CONNECTION LEAK DETECTION
============================
✓ Utilization: 95% (threshold: 90%)
✓ Waiting Clients: 45 (threshold: 0)
✓ Average Wait Time: 5,234ms (threshold: 3000ms)
✓ Idle Connections: 2% (threshold: 10%)

⚠️  LEAK DETECTED: HIGH SEVERITY

Indicators:
1. High utilization with waiting clients
2. Long average wait time: 5,234ms
3. Very low idle connection count

Recommendations:
1. Review application code for unclosed connections
2. Enable connection logging to track acquisition/release
3. Implement connection timeout middleware
4. Add monitoring for connection lifecycle
```

### 6. Load Testing

**Test Configuration:**
```bash
/db:connection-pool --database postgres://db \
  --load-test \
  --max-connections 50 \
  --concurrent-clients 100 \
  --duration 60
```

**Test Results:**
```
📊 LOAD TEST RESULTS
===================
Duration: 60 seconds
Concurrent Clients: 100
Pool Size: max=50, min=10

Metrics:
  Total Requests: 60,000
  Avg Response Time: 87ms
  Max Response Time: 234ms
  Avg Acquisition Time: 45ms
  Max Acquisition Time: 892ms

Pool Performance:
  Average Utilization: 78%
  Peak Utilization: 96%
  Waiting Clients (peak): 50
  Connection Timeouts: 0

⚠️  Pool Exhaustion Detected

Recommendations:
1. Increase pool size to 75-100 connections
2. Review query performance (87ms average)
3. Consider connection multiplexing
4. Implement request queuing strategy
```

### 7. Monitoring Configuration

**PostgreSQL Monitoring Queries:**

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Idle connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';

-- Waiting connections
SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL;

-- Connection age
SELECT pid, usename, application_name,
       now() - backend_start AS connection_age
FROM pg_stat_activity
ORDER BY connection_age DESC;

-- Pool utilization over time
SELECT datname,
       count(*) as connections,
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
GROUP BY datname;
```

**MySQL Monitoring:**

```sql
-- Thread status
SHOW STATUS LIKE 'Threads_%';

-- Max connections
SHOW VARIABLES LIKE 'max_connections';

-- Connection errors
SHOW STATUS LIKE 'Connection_errors%';

-- Aborted connections
SHOW STATUS LIKE 'Aborted_connects';
```

**MongoDB Monitoring:**

```javascript
// Connection stats
db.serverStatus().connections

// Current operations
db.currentOp()

// Connection pool stats (driver level)
client.topology.s.pool.totalConnectionCount
client.topology.s.pool.availableConnectionCount
```

### 8. Multi-Database Configuration

#### PostgreSQL with Replica Set

```javascript
const pool = {
  master: {
    max: 40,
    min: 10,
    idleTimeoutMillis: 30000
  },
  replicas: {
    max: 60,  // Higher for read-heavy workloads
    min: 15,
    idleTimeoutMillis: 60000
  }
}
```

#### MongoDB Replica Set

```javascript
const uri = 'mongodb://host1,host2,host3/?replicaSet=rs0';
const options = {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  maxConnecting: 2,
  readPreference: 'secondaryPreferred'
};
```

**Total Connection Calculation:**
```
Application Servers: 5
Connections per Server: 20
Replica Set Members: 3

Total Connections = 5 × 20 × 3 = 300
Per Database = 300 ÷ 3 = 100
```

#### Redis Cluster

```javascript
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 6379 },
  { host: '127.0.0.1', port: 6380 },
  { host: '127.0.0.1', port: 6381 }
], {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000)
});
```

## Best Practices

### Pool Sizing (2025 Guidelines)

1. **PostgreSQL**:
   - OLTP: `max_connections = (2-4) × CPU cores`
   - Analytics: `max_connections = (1-2) × CPU cores`
   - PgBouncer: `max_client_conn = 1000`, `default_pool_size = 25`
   - With PgBouncer: Total = `num_pools × default_pool_size`

2. **MySQL**:
   - Standard: `connectionLimit = 20-40` per app server
   - High Traffic: `connectionLimit = 40-50` per app server
   - Always set `waitForConnections: true`
   - Set `queueLimit: 0` for high traffic (unlimited queue)

3. **MongoDB**:
   - Default: `maxPoolSize = 100`, `minPoolSize = 10`
   - High Concurrency: Increase `maxConnecting` to 4-6
   - Low Activity: Set `minPoolSize = 0` and `maxIdleTimeMS`
   - Replica Sets: Multiply by number of members for total

4. **Redis**:
   - Generally doesn't require traditional pooling
   - ioredis manages connections automatically
   - For clusters: Connection per node
   - Set reasonable retry strategies

### Timeout Configuration

1. **Connection Timeouts**: 3-10 seconds (fail fast)
2. **Idle Timeouts**: 30-120 seconds (conserve resources)
3. **Statement Timeouts**: 5-300 seconds (workload-dependent)
4. **Acquisition Timeouts**: Match or exceed connection timeout

### Monitoring & Alerting

1. **Critical Alerts**:
   - Pool utilization > 90%
   - Waiting clients > 0 for > 1 minute
   - Connection acquisition time > 3 seconds
   - Connection timeouts > 0

2. **Warning Alerts**:
   - Pool utilization > 70%
   - Idle connections < 10%
   - Average acquisition time > 500ms

3. **Metrics to Track**:
   - Active/idle/total connections
   - Pool utilization percentage
   - Connection acquisition time (avg, p95, p99)
   - Query execution time
   - Waiting client count

### Connection Leak Prevention

1. **Always use try-finally** or connection release in error handlers
2. **Set reasonable timeouts** to force connection return
3. **Implement connection middleware** for automatic lifecycle management
4. **Enable connection logging** in development
5. **Use ORM/framework connection management** when possible
6. **Regular leak detection audits** in production

### Performance Optimization

1. **Use PgBouncer** for PostgreSQL in production (30-50% connection overhead reduction)
2. **Enable prepared statements** when supported
3. **Connection reuse** - avoid creating new pools per request
4. **Proper indexing** to reduce query time and connection hold duration
5. **Read replicas** for read-heavy workloads
6. **Connection multiplexing** for serverless/lambda deployments

## Validation & Testing

### Pre-Production Checklist

- [ ] Pool size calculated based on actual CPU cores
- [ ] Workload type identified and configured
- [ ] Timeouts set appropriately for workload
- [ ] Monitoring queries installed
- [ ] Alerting configured for critical thresholds
- [ ] Load testing completed with peak traffic simulation
- [ ] Connection leak detection verified
- [ ] Framework integration tested
- [ ] Replica set/cluster configuration validated
- [ ] Documentation updated with final configuration

### Load Testing Protocol

```bash
# 1. Baseline test with current config
/db:connection-pool --load-test --duration 60 --concurrent-clients 50

# 2. Stress test with 2x expected load
/db:connection-pool --load-test --duration 120 --concurrent-clients 200

# 3. Spike test
/db:connection-pool --load-test --duration 300 --spike-at 120 --spike-clients 500

# 4. Sustained load test
/db:connection-pool --load-test --duration 3600 --concurrent-clients 100
```

## Output Examples

### Analysis Report

```markdown
# CONNECTION POOL ANALYSIS REPORT

## Database Information
Database: PostgreSQL 15.3
Server: production-db-01
Application: nodejs-api

## Current Configuration
Max Connections: 20
Min Connections: 5
Idle Timeout: 10s
Connection Timeout: 5s

## Metrics (Last Hour)
Active Connections: avg=18, peak=20
Idle Connections: avg=2, peak=5
Pool Utilization: avg=90%, peak=100%
Waiting Clients: avg=12, peak=45
Avg Wait Time: 3,456ms
Connection Timeouts: 234

## Analysis
⚠️  CRITICAL ISSUES DETECTED

1. Pool Exhaustion
   - Utilization at 100% during peak
   - 45 clients waiting at peak
   - 234 connection timeouts in last hour

2. Connection Acquisition Bottleneck
   - Average wait time: 3.5 seconds
   - Max wait time: 8.9 seconds
   - Significant impact on API latency

3. Potential Connection Leaks
   - Very low idle connection count
   - Sustained high utilization
   - Recommend leak detection audit

## Recommendations

### Immediate Actions (High Priority)
1. Increase max_connections to 80 (4x current)
2. Increase min_connections to 20 (4x current)
3. Deploy PgBouncer with transaction pooling
4. Review application code for connection leaks

### Short-term Improvements
1. Enable connection lifecycle logging
2. Implement connection timeout middleware
3. Add pool utilization monitoring
4. Set up alerting for pool exhaustion

### Long-term Optimization
1. Migrate to PgBouncer for all environments
2. Implement read replica for read-heavy queries
3. Optimize slow queries to reduce connection hold time
4. Consider connection multiplexing for serverless deployments

## Proposed Configuration

### Application Pool (with PgBouncer)
max: 25 connections per app server
min: 5 connections per app server
idleTimeout: 30s
connectionTimeout: 5s

### PgBouncer Configuration
pool_mode: transaction
max_client_conn: 1000
default_pool_size: 50
max_prepared_statements: 100

### Expected Impact
- 60% reduction in connection overhead
- 80% reduction in connection acquisition time
- Support for 1000 concurrent clients
- Improved resource utilization
- Better handling of traffic spikes

## Next Steps
1. Review and approve configuration changes
2. Test in staging environment
3. Deploy PgBouncer to production
4. Update application configuration
5. Monitor metrics for 7 days
6. Fine-tune based on observed behavior
```

## Common Issues & Solutions

### Issue: Pool Exhaustion

**Symptoms:**
- Waiting clients > 0
- Connection timeouts
- High average wait time

**Solutions:**
1. Increase max pool size
2. Optimize query performance
3. Implement PgBouncer (PostgreSQL)
4. Add read replicas for read-heavy workloads

### Issue: Connection Leaks

**Symptoms:**
- Sustained high utilization
- Very few idle connections
- Growing connection count over time

**Solutions:**
1. Review code for unclosed connections
2. Implement connection middleware
3. Enable connection lifecycle logging
4. Set aggressive timeouts as safety net

### Issue: Slow Connection Acquisition

**Symptoms:**
- High acquisition time
- Waiting clients
- Poor API response times

**Solutions:**
1. Increase pool size
2. Reduce idle timeout to free connections faster
3. Optimize queries to reduce hold time
4. Use connection multiplexing

### Issue: Over-Provisioned Pool

**Symptoms:**
- Low average utilization (<30%)
- Many idle connections
- Wasted database resources

**Solutions:**
1. Decrease max pool size
2. Adjust min pool size
3. Consider serverless database options
4. Implement auto-scaling pool sizes

## Integration with Monitoring Tools

### Prometheus Metrics

```javascript
// Custom metrics for pool monitoring
const poolMetrics = {
  active_connections: new prometheus.Gauge({
    name: 'db_pool_active_connections',
    help: 'Number of active database connections'
  }),
  idle_connections: new prometheus.Gauge({
    name: 'db_pool_idle_connections',
    help: 'Number of idle database connections'
  }),
  utilization: new prometheus.Gauge({
    name: 'db_pool_utilization',
    help: 'Database pool utilization percentage'
  }),
  acquisition_time: new prometheus.Histogram({
    name: 'db_connection_acquisition_seconds',
    help: 'Time to acquire database connection',
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
  })
};
```

### Grafana Dashboard

Recommended dashboard panels:
1. Pool Utilization (gauge + time series)
2. Active vs Idle Connections (stacked area chart)
3. Connection Acquisition Time (histogram)
4. Waiting Clients (time series)
5. Connection Errors (counter)

## Related Commands

- `/db:query-analyze` - Analyze query performance to optimize connection hold time
- `/db:db-optimize` - General database optimization including connection tuning
- `/infra:monitor-setup` - Configure monitoring for pool metrics

## References

- [PostgreSQL Connection Pooling Best Practices (2025)](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](http://www.pgbouncer.org/)
- [MySQL Connection Pool Tuning](https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-usagenotes-j2ee-concepts-connection-pooling.html)
- [MongoDB Connection Pool Settings](https://www.mongodb.com/docs/manual/administration/connection-pool-overview/)
- [Redis Connection Management (ioredis)](https://github.com/redis/ioredis)
- [Sequelize Pool Configuration](https://sequelize.org/docs/v6/other-topics/connection-pool/)
- [TypeORM Connection Options](https://typeorm.io/data-source-options)
- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
