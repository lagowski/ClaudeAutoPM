# db:schema-migrate

Generate and execute database schema migrations safely with rollback support for PostgreSQL, MongoDB, MySQL, and BigQuery.

## Description

Comprehensive schema migration management covering:
- **PostgreSQL**: ADD/DROP/RENAME columns, concurrent indexes, constraints, partitioning
- **MongoDB**: Schema validation, index management, field operations
- **MySQL**: Column operations, index creation, constraint management
- **BigQuery**: Column addition, schema evolution

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: postgresql, mongodb, flyway, liquibase.

## Usage

```bash
/db:schema-migrate <table> <operation> [options]
```

## Operations

### PostgreSQL Operations

#### 1. ADD COLUMN
```bash
/db:schema-migrate users add-column email_verified boolean --default false --not-null
/db:schema-migrate products add-column description text --nullable
/db:schema-migrate orders add-column tracking_number varchar(50)
```

**Generated Migration:**
- Forward: `ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL`
- Backward: `ALTER TABLE users DROP COLUMN email_verified`
- Safety: Validates default values for NOT NULL columns

#### 2. DROP COLUMN
```bash
/db:schema-migrate users drop-column legacy_field
/db:schema-migrate products drop-column old_price
```

**Safety Checks:**
- Warns about permanent data loss
- Suggests rename to `ZZZ_columnname_deprecated_YYYYMMDD` for rollback capability
- Checks for foreign key constraints

#### 3. RENAME COLUMN
```bash
/db:schema-migrate orders rename-column total_price total_amount
/db:schema-migrate users rename-column name full_name
```

**Zero-Downtime Pattern:**
- Forward: `ALTER TABLE orders RENAME COLUMN total_price TO total_amount`
- Backward: `ALTER TABLE orders RENAME COLUMN total_amount TO total_price`
- Warning: Breaking change for existing queries

#### 4. ADD INDEX
```bash
/db:schema-migrate orders add-index idx_orders_customer_id --columns customer_id --concurrent
/db:schema-migrate users add-index idx_users_email_created --columns "email, created_at DESC" --concurrent
/db:schema-migrate products add-index idx_products_attributes --columns attributes --type GIN --concurrent
/db:schema-migrate orders add-index idx_orders_pending --columns created_at --where "status = 'pending'" --concurrent
```

**Concurrent Index Pattern (Context7 Best Practice):**
```sql
-- Forward migration (non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Backward migration (non-blocking)
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_id;
```

**Safety Requirements:**
- ALWAYS use CONCURRENTLY for production databases
- Cannot run inside transaction block
- Handles invalid indexes on failure
- Sets 30-second lock timeout for safety

#### 5. ADD CONSTRAINT
```bash
/db:schema-migrate orders add-constraint fk_orders_user_id --type foreign-key --columns user_id --references "users(id)"
/db:schema-migrate users add-constraint unique_email --type unique --columns email
/db:schema-migrate products add-constraint check_price_positive --type check --expression "price >= 0"
```

### MongoDB Operations

#### 1. ADD VALIDATION
```bash
/db:schema-migrate users add-validation --rules '{"$jsonSchema": {"required": ["email"]}}'
```

#### 2. ADD INDEX
```bash
/db:schema-migrate products add-index idx_category_created --keys '{"category": 1, "created_at": -1}'
```

## Options

- `--database <postgres|mongodb|mysql|bigquery>` - Target database (default: postgres)
- `--dry-run` - Generate migration files without executing
- `--target <dev|staging|production>` - Environment to test against
- `--rollback <version>` - Rollback to specific migration version
- `--concurrent` - Use concurrent operations (PostgreSQL indexes only)
- `--default <value>` - Default value for column
- `--nullable` / `--not-null` - Column nullability
- `--type <datatype|index-type>` - Data type or index type (GIN, BRIN, etc.)
- `--where <condition>` - WHERE clause for partial indexes
- `--columns <column-list>` - Comma-separated column list
- `--references <table(column)>` - Foreign key reference
- `--expression <check-expression>` - CHECK constraint expression

## Safety Validation System

### Data Loss Risk Levels

**LOW** - Safe operations:
- ADD COLUMN with default value
- ADD INDEX (concurrent)
- ADD CONSTRAINT (non-restrictive)

**MEDIUM** - Review required:
- RENAME COLUMN (breaking change)
- ADD COLUMN NOT NULL without default (requires backfill)

**HIGH** - Dangerous operations:
- DROP COLUMN (permanent data loss)
- DROP CONSTRAINT (data integrity risk)

**CRITICAL** - Requires confirmation:
- DROP COLUMN with foreign key
- DROP TABLE

### Automatic Checks

1. **NOT NULL Validation**
   - Checks if column can be added to existing rows
   - Requires DEFAULT value or existing rows must be empty

2. **Foreign Key Detection**
   - Scans for FK constraints before DROP COLUMN
   - Warns about referential integrity impact

3. **Index Validation**
   - Ensures CONCURRENTLY is used for production
   - Detects invalid indexes from previous failed migrations

4. **Breaking Change Detection**
   - RENAME operations marked as breaking changes
   - Requires application code updates

## Migration File Structure

### Generated Files

```
migrations/
├── 20250121120000_add_email_verified_to_users.up.sql
├── 20250121120000_add_email_verified_to_users.down.sql
├── 20250121120001_add_index_orders_customer.up.sql
└── 20250121120001_add_index_orders_customer.down.sql
```

### Migration Tracking

**PostgreSQL:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(14) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(20) CHECK (status IN ('applied', 'rolled_back', 'failed'))
);
```

**MongoDB:**
```javascript
db.schema_migrations.insertOne({
    version: "20250121120000",
    description: "add_email_verified_to_users",
    applied_at: new Date(),
    status: "applied"
});
```

## Examples

### Example 1: Add NOT NULL Column with Default

```bash
/db:schema-migrate users add-column email_verified boolean --default false --not-null --dry-run
```

**Output:**
```
🔍 Migration Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Operation: ADD COLUMN email_verified
Table: users
Database: PostgreSQL

Safety Analysis:
  ✅ Data Loss Risk: LOW
  ✅ Breaking Change: No
  ✅ Rollback Safe: Yes

Generated Files:
  📄 20250121120000_add_email_verified_to_users.up.sql
  📄 20250121120000_add_email_verified_to_users.down.sql

Forward Migration (up.sql):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;

Backward Migration (down.sql):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

Rollback Instructions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To rollback this migration:
  /db:schema-migrate --rollback 20250121120000

Next Steps:
  1. Review migration files in migrations/ directory
  2. Test on dev: /db:schema-migrate --target dev
  3. Test on staging: /db:schema-migrate --target staging
  4. Apply to production: /db:schema-migrate --target production
```

### Example 2: Concurrent Index Creation

```bash
/db:schema-migrate orders add-index idx_orders_customer_id --columns customer_id --concurrent
```

**Output:**
```
🔍 Migration Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Operation: ADD INDEX (CONCURRENT)
Index: idx_orders_customer_id
Table: orders
Columns: customer_id

Safety Analysis:
  ✅ Data Loss Risk: LOW
  ✅ Breaking Change: No
  ⚡ Locking Behavior: NON-BLOCKING
  ⚠️  Note: Cannot run in transaction block

Generated Files:
  📄 20250121120100_add_index_orders_customer_id.up.sql
  📄 20250121120100_add_index_orders_customer_id.down.sql

Forward Migration (up.sql):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Set lock timeout for safety
SET lock_timeout = '30s';

-- Create index concurrently (non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id
ON orders(customer_id);

-- Check for invalid indexes (in case of failure)
SELECT indexrelid::regclass AS index_name
FROM pg_index
WHERE NOT indisvalid;

Backward Migration (down.sql):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Drop index concurrently (non-blocking)
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_id;

Best Practices Applied (from Context7):
  ✅ CONCURRENTLY prevents table locking
  ✅ IF NOT EXISTS prevents duplicate errors
  ✅ Lock timeout prevents indefinite waits
  ✅ Invalid index detection for failure recovery

Estimated Impact:
  📊 Table Size: 1.2 GB
  ⏱️  Index Build Time: ~30 seconds
  🔒 Table Locks: None (concurrent mode)
```

### Example 3: Dangerous Operation (DROP COLUMN)

```bash
/db:schema-migrate products drop-column old_price
```

**Output:**
```
⚠️  DANGEROUS OPERATION DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Operation: DROP COLUMN old_price
Table: products

Safety Analysis:
  🔴 Data Loss Risk: CRITICAL
  🔴 Breaking Change: Yes
  🔴 Rollback Safe: No - Data will be permanently deleted

⚠️  WARNINGS:
  - Dropping column will permanently delete all data
  - Rollback is NOT possible - data cannot be recovered
  - This will break existing queries and application code

💡 SAFER ALTERNATIVE:
Instead of dropping, consider renaming to preserve data:
  ALTER TABLE products RENAME COLUMN old_price TO ZZZ_old_price_deprecated_20250121;

This allows rollback if needed. You can drop it later after confirming no issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Type 'CONFIRM-DELETE' to proceed with this dangerous operation:
```

### Example 4: Rollback Migration

```bash
/db:schema-migrate --rollback 20250121120000
```

**Output:**
```
🔄 Rolling Back Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target Version: 20250121120000
Current Version: 20250121120100

Migrations to Rollback:
  1. 20250121120100_add_index_orders_customer_id
  2. 20250121120000_add_email_verified_to_users

Executing rollback:
  ⏳ Rolling back 20250121120100... ✅ Done (0.5s)
  ⏳ Rolling back 20250121120000... ✅ Done (0.2s)

✅ Rollback Complete
  Rolled back 2 migrations
  Current version: 20250121115900
```

## Implementation

This command uses specialized database agents:

1. **@postgresql-expert** - PostgreSQL migrations, concurrent indexes, constraints
2. **@mongodb-expert** - MongoDB schema validation, index management
3. **Context7 Documentation** - Migration best practices from Flyway, Liquibase, official docs

### Process

1. **Query Context7** for migration best practices
2. **Parse operation** and validate parameters
3. **Generate migration files** (up/down SQL)
4. **Run safety analysis**:
   - Data loss risk assessment
   - Breaking change detection
   - Foreign key validation
   - NOT NULL constraint checks
5. **Create rollback scripts** automatically
6. **Execute migration** (if not dry-run)
7. **Track in schema_migrations** table
8. **Validate execution** and check for errors

## Migration Best Practices (from Context7)

### PostgreSQL (from Flyway/Liquibase patterns)

1. **Concurrent Index Creation**
   - ALWAYS use `CREATE INDEX CONCURRENTLY` for production
   - Cannot run inside transaction - migration tool must detect
   - Set lock timeout to prevent indefinite waits
   - Check for invalid indexes after creation

2. **Column Operations**
   - ADD COLUMN with DEFAULT is safe (default added without table scan in PG 11+)
   - DROP COLUMN is irreversible - rename instead for rollback capability
   - RENAME COLUMN is instant but breaks queries

3. **Constraint Addition**
   - Foreign keys can be added with `NOT VALID` then validated separately
   - CHECK constraints should be added `NOT VALID` for large tables
   - Use deferred validation to avoid blocking

### MongoDB

1. **Schema Validation**
   - Use `$jsonSchema` for structured validation
   - Can be added to existing collections
   - Validation level: strict vs moderate

2. **Index Creation**
   - Background index creation for large collections
   - ESR rule: Equality, Sort, Range for compound indexes
   - Use partial indexes with filter expressions

## Troubleshooting

### PostgreSQL Issues

**Invalid Index After Failed Creation:**
```sql
-- Find invalid indexes
SELECT indexrelid::regclass AS index_name
FROM pg_index
WHERE NOT indisvalid;

-- Drop and recreate
DROP INDEX CONCURRENTLY idx_name;
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

**Lock Timeout:**
```
ERROR: canceling statement due to lock timeout
```
- Long-running transactions blocking index creation
- Kill blocking queries or wait for completion
- Increase lock_timeout if appropriate

**Cannot Run in Transaction:**
```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```
- Migration tool must execute outside transaction
- Check migration tool configuration

### MongoDB Issues

**Validation Failure:**
```
db.setLogLevel(3)  # Enable verbose logging
db.collection.validate({ full: true })
```

**Index Build Performance:**
```
db.currentOp({ "command.createIndexes": { $exists: true } })
```

## Related Commands

- `/db:optimize` - Database performance optimization
- `/db:backup` - Database backup before migrations
- `/db:query-analyze` - Analyze query performance after schema changes

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Context7-verified migration patterns
- Multi-database support (PostgreSQL, MongoDB, MySQL, BigQuery)
- Automatic safety validation and rollback generation
- Zero-downtime migration strategies
