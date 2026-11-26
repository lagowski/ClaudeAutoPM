---
command: data:quality-check
plugin: data
category: data-operations
description: Data quality validation with Great Expectations
tags:
  - data
  - data-quality
  - great-expectations
  - validation
  - testing
tools:
  - Read
  - Write
  - Bash
usage: |
  /data:quality-check --source <data-source> --suite <suite-names> [options]
examples:
  - input: /data:quality-check --source data.csv --suite completeness,schema
    description: Validate schema and completeness for CSV file
  - input: /data:quality-check --source postgres://db/table --suite all --profile
    description: Run all validation suites with data profiling
  - input: /data:quality-check --source data.parquet --custom expectations.json --fix-issues
    description: Custom expectations with automated remediation
  - input: /data:quality-check --source bigquery://project/dataset/table --drift-baseline baseline.json
    description: Detect drift against baseline in BigQuery
---

# Data Quality Validation with Great Expectations

Comprehensive data quality validation using Great Expectations, with automated profiling, drift detection, and remediation suggestions.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: great-expectations, pandas, dbt.

## Command Usage

```bash
/data:quality-check --source <data-source> --suite <suite-names> [options]
```

### Arguments

**Required:**
- `--source`: Data source path or connection string
  - CSV: `data.csv`
  - Parquet: `data.parquet`
  - PostgreSQL: `postgresql://user:pass@localhost:5432/db?table=tablename`
  - BigQuery: `bigquery://project-id/dataset-id/table-id`

**Optional:**
- `--suite`: Expectation suite(s) to apply (comma-separated)
  - `schema` - Schema validation (column existence, types)
  - `completeness` - Null/missing value checks
  - `accuracy` - Data format validation (email, phone, etc.)
  - `consistency` - Cross-column consistency checks
  - `uniqueness` - Duplicate detection
  - `all` - All built-in suites
  - Default: `schema,completeness`

- `--custom <file>`: Path to custom expectations JSON file
- `--profile`: Run data profiling and generate statistics
- `--drift-baseline <file>`: Baseline JSON file for drift detection
- `--fix-issues`: Generate automated remediation suggestions
- `--output <format>`: Report format (`html`, `json`, `dashboard`)
- `--output-dir <dir>`: Output directory for reports (default: current directory)
- `--alert`: Enable quality score alerts
- `--threshold <percent>`: Alert threshold percentage (default: 80)

## Implementation Steps

### 1. Query Context7 for Latest Patterns

Before validating data, query Context7:

```javascript
// Query Context7 for Great Expectations patterns
// Topics: Expectation suites, checkpoints, data sources, profiling
```

**Key patterns to verify:**
- Great Expectations 1.0+ API changes
- Expectation suite configuration
- Data source connection patterns
- Checkpoint execution workflow
- Data profiling best practices

### 2. Connect to Data Source

Use the quality-check library to connect:

```javascript
const { connectDataSource } = require('../lib/quality-check');

const dataSource = await connectDataSource(sourcePath, {
  format: 'csv', // or 'parquet', 'postgresql', 'bigquery'
  createContext: true // Create GE context
});
```

**Supported Sources:**
- **CSV Files**: Local CSV files with header row
- **Parquet Files**: Apache Parquet format
- **PostgreSQL**: Relational database tables
- **BigQuery**: Google BigQuery tables

### 3. Profile Data (Optional)

Generate comprehensive data profile:

```javascript
const { profileData } = require('../lib/quality-check');

const profile = await profileData(dataSource);
```

**Profile includes:**
- Column data types (automatic detection)
- Summary statistics (mean, median, std dev, min, max)
- Missing value analysis
- Outlier detection (IQR method)
- Value distributions
- Cardinality metrics

### 4. Apply Expectation Suites

Run validation against expectation suites:

```javascript
const { applyExpectationSuite } = require('../lib/quality-check');

const validation = await applyExpectationSuite(dataSource, [
  'schema',
  'completeness',
  'uniqueness'
], {
  runCheckpoint: true,
  thresholds: {
    nullRate: 0.1 // Allow up to 10% nulls
  }
});
```

**Built-in Suites:**

#### Schema Suite
- `expect_column_to_exist` - Validate column presence
- `expect_column_values_to_be_of_type` - Type validation

#### Completeness Suite
- `expect_column_values_to_not_be_null` - Null detection
- Handles: `null`, `''`, `"null"`, `"NULL"`, `"None"`

#### Accuracy Suite
- `expect_column_values_to_match_regex` - Pattern validation
- Email, phone, URL validation

#### Consistency Suite
- `expect_column_pair_values_to_be_in_set` - Cross-column validation
- Referential integrity checks

#### Uniqueness Suite
- `expect_column_values_to_be_unique` - Duplicate detection
- Primary key validation

### 5. Calculate Quality Score

Generate overall quality score:

```javascript
const { calculateQualityScore } = require('../lib/quality-check');

const score = await calculateQualityScore(validation, {
  weights: {
    completeness: 0.4,
    accuracy: 0.3,
    consistency: 0.3
  },
  history: previousScores // Optional: for trend analysis
});
```

**Score Components:**
- Overall score (0-100)
- Quality grade (A-F)
- Dimension scores
- Weighted score
- Trend analysis (improving/degrading/stable)
- Critical failure detection

### 6. Detect Drift (Optional)

Compare against baseline:

```javascript
const { detectDrift } = require('../lib/quality-check');

const drift = await detectDrift(profile, baselinePath);
```

**Drift Detection:**
- Schema drift (added/removed columns, type changes)
- Distribution drift (mean, std dev changes > 10%)
- Drift severity calculation
- Row count changes

### 7. Generate Remediation Suggestions

Get automated fix suggestions:

```javascript
const { suggestRemediation } = require('../lib/quality-check');

const suggestions = await suggestRemediation(validation.failures, {
  generateScripts: true,
  autoFix: true
});
```

**Remediation Types:**
- Null value filling (SQL + Python)
- Duplicate removal (SQL + Python)
- Type casting (SQL + Python)
- Prioritized by severity (critical > warning)

### 8. Generate Reports

Create quality reports:

```javascript
const { generateReport } = require('../lib/quality-check');

const report = await generateReport({
  profile,
  validation,
  score,
  drift
}, 'html', {
  outputDir: './reports',
  includeDataDocs: true,
  alerts: {
    enabled: true,
    threshold: 80,
    channel: 'email',
    recipients: ['team@example.com']
  }
});
```

**Report Formats:**
- **HTML**: Interactive reports with visualizations
- **JSON**: Machine-readable results
- **Dashboard**: Quality metrics dashboard with trends

### 9. Output Results

Display summary to user:

```
✅ Data Quality Check Complete

Source: data.csv (1,000 rows, 10 columns)

Quality Score: 85% (Grade: B)
  - Completeness: 90%
  - Accuracy: 80%
  - Uniqueness: 85%

Validations:
  - Passed: 17
  - Failed: 3
  - Total: 20

Critical Issues: 1
  ⚠️ Duplicate values in column: email

Remediation Suggestions:
  1. [CRITICAL] Remove duplicates from 'email' column
     SQL: SELECT DISTINCT * FROM table_name;

Reports Generated:
  - HTML: ./reports/quality-report-2025-10-21T12-00-00.html
  - JSON: ./reports/quality-report-2025-10-21T12-00-00.json

Next: Review critical issues and apply remediation
```

## Context7-Verified Patterns

This command implements the following Context7-verified patterns:

### Great Expectations (v1.0+)
- Expectation suite composition
- Checkpoint-based validation
- Data source abstraction
- Validation result analysis

### Pandas Data Quality
- Vectorized null detection
- Statistical profiling
- Outlier detection (IQR method)
- Distribution analysis

### dbt Testing Methodology
- Test categorization (schema, data, custom)
- Severity levels (error, warn)
- Test documentation
- Incremental testing

## Error Handling

**Common Issues:**

- **"Data source path is required"**:
  ```
  → Provide valid --source argument
  ```

- **"Unsupported data source format"**:
  ```
  → Use: csv, parquet, postgresql, or bigquery
  ```

- **"Unknown expectation suite"**:
  ```
  → Valid suites: schema, completeness, accuracy, consistency, uniqueness, all
  ```

- **"Baseline is required for drift detection"**:
  ```
  → Provide --drift-baseline <file> when using drift detection
  ```

## Best Practices

1. **Start with built-in suites** before creating custom expectations
2. **Profile data first** to understand baseline quality
3. **Set appropriate thresholds** based on business requirements
4. **Track quality scores over time** for trend analysis
5. **Prioritize critical failures** in remediation
6. **Automate quality checks** in CI/CD pipelines
7. **Use drift detection** for production data monitoring

## Integration Examples

### With Airflow DAG

```python
from airflow.decorators import task

@task
def validate_data_quality():
    from quality_check import applyExpectationSuite

    result = await applyExpectationSuite(data, ['schema', 'completeness'])

    if not result.success:
        raise AirflowException(f"Data quality check failed: {result.failures}")
```

### With dbt Test

```sql
-- tests/quality/completeness_test.sql
{{ config(severity='error') }}

select *
from {{ ref('source_table') }}
where important_column is null
```

### With CI/CD Pipeline

```yaml
# .github/workflows/quality.yml
- name: Data Quality Check
  run: |
    /data:quality-check --source data.csv --suite all --threshold 80
```

## Performance Considerations

- **Large datasets**: Use sampling for profiling
- **Multiple sources**: Parallelize validation
- **Frequent checks**: Cache profiling results
- **Heavy computations**: Use distributed processing (Dask/Spark)

## See Also

- `/data:lineage-track` - Track data lineage
- `/data:kafka-pipeline-scaffold` - Streaming data pipelines
- `/data:airflow-dag-scaffold` - Orchestrate quality checks
- `@python-backend-expert` - Python validation scripts
- `@postgresql-expert` - Database-level constraints
