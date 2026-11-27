# @claudeautopm/plugin-databases

Database and data storage specialists for PostgreSQL, MongoDB, Redis, and more.

## 📦 Installation

```bash
# Install the plugin package
npm install -g @claudeautopm/plugin-databases

# Install plugin agents to your project
autopm plugin install databases
```

## 🤖 Agents Included

### Relational Databases
- **postgresql-expert** - PostgreSQL database specialist
  - Query optimization and indexing
  - Table design and normalization
  - Transactions and ACID compliance
  - Replication and high availability
  - Performance tuning

### NoSQL Databases
- **mongodb-expert** - MongoDB database specialist
  - Document schema design
  - Aggregation pipelines
  - Sharding and replication
  - Query optimization
  - Atlas cloud management

- **cosmosdb-expert** - Azure Cosmos DB specialist
  - Multi-model database design
  - Consistency levels
  - Partitioning strategies
  - Global distribution
  - Change feed patterns

### Caching & In-Memory
- **redis-expert** - Redis caching and data structures
  - Cache strategies (LRU, TTL)
  - Data structures (strings, sets, sorted sets, hashes)
  - Pub/Sub messaging
  - Redis Cluster and Sentinel
  - Performance optimization

### Analytics & Big Data
- **bigquery-expert** - Google BigQuery analytics
  - SQL query optimization
  - Partitioning and clustering
  - Streaming inserts
  - Cost optimization
  - Data warehouse design

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load database agents -->
- @include .claude/agents/databases/postgresql-expert.md
- @include .claude/agents/databases/redis-expert.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load database-focused team
autopm team load databases

# Or include databases in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke postgresql-expert "Optimize slow query performance"
```

## 📋 Agent Capabilities

### Database Design
- Schema design and normalization
- Indexing strategies
- Partitioning and sharding
- Data modeling best practices

### Performance Optimization
- Query optimization
- Index tuning
- Connection pooling
- Caching strategies

### High Availability
- Replication setup
- Failover strategies
- Backup and recovery
- Disaster recovery planning

### Data Migration
- Schema migration
- Data transformation
- Zero-downtime migrations
- Cross-database migration

## 🔌 MCP Servers

This plugin works with the following MCP servers for enhanced capabilities:

- **postgresql** - PostgreSQL documentation and query patterns
- **mongodb** - MongoDB documentation and best practices

Enable MCP servers:

```bash
autopm mcp enable postgresql
autopm mcp enable mongodb
```

## 🚀 Examples

### PostgreSQL Query Optimization

```
@postgresql-expert

Optimize slow-running query:

Query:
SELECT o.*, u.name, p.title
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 100

Issues:
- Takes 5+ seconds on 10M rows
- High CPU usage
- Blocking other queries

Provide:
1. Query analysis with EXPLAIN
2. Index recommendations
3. Optimized query
4. Performance benchmarks
```

### MongoDB Schema Design

```
@mongodb-expert

Design schema for e-commerce platform:

Requirements:
- Products with variants (color, size)
- Inventory tracking per variant
- Customer reviews and ratings
- Order history
- Fast product search

Optimize for:
- Read-heavy workload (90% reads)
- Complex product filtering
- Real-time inventory updates
- Aggregated review statistics

Include:
1. Collection schemas
2. Indexing strategy
3. Aggregation pipelines
4. Sharding recommendations
```

### Redis Caching Strategy

```
@redis-expert

Implement caching layer for API:

Requirements:
- Cache frequently accessed data
- Invalidate on updates
- Handle cache stampede
- Session storage
- Rate limiting

Patterns needed:
- Cache-aside pattern
- Write-through cache
- Distributed locking
- Pub/Sub for invalidation

Include:
1. Redis data structure choices
2. TTL strategies
3. Invalidation patterns
4. Performance metrics
```

### BigQuery Analytics

```
@bigquery-expert

Design data warehouse for analytics:

Data sources:
- Application logs (1TB/day)
- User events (100M events/day)
- Sales transactions (10M/day)

Requirements:
- Real-time dashboard queries
- Historical trend analysis
- Customer segmentation
- Cost optimization

Include:
1. Table design with partitioning
2. Clustering strategy
3. Materialized views
4. Cost-optimized queries
5. Streaming insert patterns
```

### Cosmos DB Multi-Region Setup

```
@cosmosdb-expert

Setup globally distributed database:

Requirements:
- 3 regions (US, EU, Asia)
- Strong consistency for writes
- Eventual consistency for reads
- Automatic failover
- Conflict resolution

Collections:
- Users (partition by country)
- Orders (partition by date)
- Products (small, replicated globally)

Include:
1. Consistency level configuration
2. Partition key strategy
3. Conflict resolution policies
4. Failover configuration
5. Cost estimation
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# PostgreSQL
export PGHOST=localhost
export PGDATABASE=myapp
export PGUSER=postgres

# MongoDB
export MONGODB_URI=mongodb://localhost:27017/myapp

# Redis
export REDIS_URL=redis://localhost:6379

# BigQuery
export GOOGLE_CLOUD_PROJECT=my-project
export BIGQUERY_DATASET=analytics
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  databases:
    postgresql:
      default_pool_size: 20
      statement_timeout: 30s
    mongodb:
      read_preference: secondaryPreferred
      write_concern: majority
    redis:
      default_ttl: 3600
      eviction_policy: allkeys-lru
    bigquery:
      default_location: US
      max_query_cost: 10
```

## 📖 Documentation

- [PostgreSQL Expert Guide](./agents/postgresql-expert.md)
- [MongoDB Expert Guide](./agents/mongodb-expert.md)
- [Redis Expert Guide](./agents/redis-expert.md)
- [BigQuery Expert Guide](./agents/bigquery-expert.md)
- [Cosmos DB Expert Guide](./agents/cosmosdb-expert.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-databases)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
