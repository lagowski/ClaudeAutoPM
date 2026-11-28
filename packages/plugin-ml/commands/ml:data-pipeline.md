---
command: ml:data-pipeline
plugin: ml
category: ml-operations
description: Set up end-to-end ML data pipelines with ETL, feature store, and validation
tags:
  - ml
  - data-pipeline
  - etl
  - feature-store
  - kedro
  - airflow
  - data-quality
tools:
  - @kedro-pipeline-expert
  - @airflow-orchestration-expert
  - Read
  - Write
  - Bash
usage: |
  /ml:data-pipeline [options]
examples:
  - input: /ml:data-pipeline --framework kedro --source postgres --target s3
    description: Create Kedro pipeline from PostgreSQL to S3
  - input: /ml:data-pipeline --framework airflow --feature-store feast --schedule daily
    description: Create Airflow DAG with Feast feature store and daily scheduling
  - input: /ml:data-pipeline --framework kedro --validation great-expectations --profile
    description: Create Kedro pipeline with data validation and profiling
---

# ml:data-pipeline

Set up end-to-end ML data pipelines with ETL, feature store integration, and comprehensive data validation using Context7-verified patterns.

## Description

Comprehensive ML data pipeline setup covering:
- **Multi-framework support**: Kedro, Airflow, Prefect
- **ETL pipeline generation**: Ingestion, transformation, feature engineering
- **Feature store integration**: Feast, Tecton
- **Data quality validation**: Great Expectations, schema validation, drift detection
- **Pipeline orchestration**: Scheduling, retries, backfilling, monitoring
- **Data versioning**: Track data and config changes
- **Performance optimization**: Parallel processing, caching, memory optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: kedro, airflow, prefect, feast, great-expectations, dbt.

## Usage

```bash
/ml:data-pipeline [options]
```

## Options

### Framework Selection
- `--framework <kedro|airflow|prefect>` - Orchestration framework (default: kedro)

### Data Source Configuration
- `--source <type>` - Data source type (postgres, s3, bigquery, csv, api)
- `--source-config <json>` - Source connection configuration
- `--sources <types>` - Multiple data sources (comma-separated)

### Data Target Configuration
- `--target <type>` - Data target type (s3, gcs, azure-blob, local)
- `--target-config <json>` - Target storage configuration

### Feature Store
- `--feature-store <feast|tecton>` - Feature store provider
- `--online-store <type>` - Online store (redis, dynamodb)
- `--offline-store <type>` - Offline store (parquet, bigquery)

### Data Validation
- `--validation <great-expectations|custom>` - Validation framework
- `--validate-schema` - Enable schema validation
- `--detect-drift` - Enable data drift detection
- `--validate-types` - Validate data types
- `--validate-nulls` - Validate null values
- `--validate-ranges` - Validate value ranges

### Pipeline Configuration
- `--schedule <expression>` - Schedule (daily, hourly, cron expression)
- `--retries <n>` - Number of retries (default: 3)
- `--retry-delay <seconds>` - Retry delay in seconds (default: 300)
- `--backfill` - Enable backfilling
- `--parallel` - Enable parallel processing

### Data Quality
- `--profile` - Include data profiling step
- `--detect-anomalies` - Enable anomaly detection
- `--quality-report` - Generate data quality report

### Optimization
- `--cache` - Enable caching for intermediate results
- `--optimize-memory` - Optimize for large datasets
- `--partition <strategy>` - Data partitioning (daily, hourly, monthly)

### Output
- `--output <dir>` - Output directory for generated files
- `--generate-docs` - Generate pipeline documentation
- `--lineage` - Include data lineage diagram
- `--generate-tests` - Generate unit and integration tests

## Examples

### Example 1: Kedro Pipeline from PostgreSQL to S3

```bash
/ml:data-pipeline \
  --framework kedro \
  --source postgres \
  --source-config '{"host":"db.example.com","database":"production","table":"events"}' \
  --target s3 \
  --target-config '{"bucket":"ml-data-pipeline","prefix":"processed/"}' \
  --validation great-expectations \
  --validate-schema \
  --generate-docs
```

**Generated Structure:**
```
kedro-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml          # Data catalog with postgres → s3
│   │   ├── parameters.yml       # Pipeline parameters
│   │   └── great_expectations/  # Validation configuration
│   └── local/
├── data/
│   ├── 01_raw/
│   ├── 02_intermediate/
│   ├── 03_primary/
│   ├── 04_feature/
│   └── 05_model_input/
├── src/
│   └── pipeline_name/
│       ├── pipelines/
│       │   ├── data_ingestion/
│       │   │   ├── nodes.py     # Postgres ingestion
│       │   │   └── pipeline.py
│       │   ├── data_validation/
│       │   │   ├── nodes.py     # Great Expectations validation
│       │   │   └── pipeline.py
│       │   └── data_transformation/
│       │       ├── nodes.py     # Transformations
│       │       └── pipeline.py
│       ├── pipeline_registry.py
│       └── settings.py
└── tests/
    ├── test_ingestion.py
    └── test_validation.py
```

### Example 2: Airflow DAG with Feast Feature Store

```bash
/ml:data-pipeline \
  --framework airflow \
  --source s3 \
  --source-config '{"bucket":"raw-data","prefix":"events/"}' \
  --feature-store feast \
  --online-store redis \
  --offline-store parquet \
  --schedule daily \
  --retries 3 \
  --monitoring
```

**Generated Airflow DAG:**
```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.amazon.aws.hooks.s3 import S3Hook
from feast import FeatureStore

default_args = {
    'owner': 'ml-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'start_date': datetime(2025, 1, 1),
}

dag = DAG(
    'ml_data_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    catchup=False,
    tags=['ml', 'data-pipeline', 'feast'],
)

def ingest_from_s3(**context):
    """Ingest data from S3"""
    s3_hook = S3Hook(aws_conn_id='aws_default')
    # Ingestion logic
    pass

def transform_data(**context):
    """Transform ingested data"""
    # Transformation logic
    pass

def materialize_features(**context):
    """Materialize features to Feast"""
    fs = FeatureStore(repo_path=".")
    # Feature materialization logic
    pass

ingest_task = PythonOperator(
    task_id='ingest_from_s3',
    python_callable=ingest_from_s3,
    dag=dag,
)

transform_task = PythonOperator(
    task_id='transform_data',
    python_callable=transform_data,
    dag=dag,
)

feast_task = PythonOperator(
    task_id='materialize_features',
    python_callable=materialize_features,
    dag=dag,
)

ingest_task >> transform_task >> feast_task
```

### Example 3: Multi-source Pipeline with Data Quality Checks

```bash
/ml:data-pipeline \
  --framework kedro \
  --sources postgres,s3,api \
  --target gcs \
  --validation great-expectations \
  --validate-schema \
  --validate-types \
  --validate-nulls \
  --detect-drift \
  --profile \
  --quality-report \
  --generate-tests
```

### Example 4: Prefect Flow with Partitioning

```bash
/ml:data-pipeline \
  --framework prefect \
  --source bigquery \
  --target s3 \
  --partition daily \
  --parallel \
  --cache \
  --schedule "0 2 * * *" \
  --retries 5
```

## Pipeline Patterns

### 1. Kedro Project Structure

**Pattern from Context7 (/kedro-org/kedro):**

#### Data Catalog Configuration

```yaml
# conf/base/catalog.yml

# Raw data from PostgreSQL
raw_events:
  type: pandas.SQLTableDataSet
  credentials: db_credentials
  table_name: events
  load_args:
    schema: public

# Intermediate processed data
processed_events:
  type: pandas.ParquetDataSet
  filepath: data/02_intermediate/processed_events.parquet

# Feature engineering output
feature_set:
  type: pandas.ParquetDataSet
  filepath: data/04_feature/feature_set.parquet
  versioned: true  # Enable data versioning

# Model input data
model_input:
  type: pandas.CSVDataSet
  filepath: data/05_model_input/model_input.csv
  save_args:
    index: false

# S3 output
s3_output:
  type: pandas.ParquetDataSet
  filepath: s3://ml-data-pipeline/processed/events.parquet
  credentials: s3_credentials
  fs_args:
    client_kwargs:
      endpoint_url: https://s3.amazonaws.com
```

#### Pipeline with Nodes

```python
# src/pipeline_name/pipelines/data_processing/nodes.py

import pandas as pd
from typing import Dict, List

def ingest_data(raw_events: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
    """
    Ingest data from source and apply initial filtering.

    Args:
        raw_events: Raw event data from database
        parameters: Pipeline parameters

    Returns:
        Filtered DataFrame
    """
    # Filter by date range
    start_date = parameters['start_date']
    end_date = parameters['end_date']

    filtered = raw_events[
        (raw_events['timestamp'] >= start_date) &
        (raw_events['timestamp'] <= end_date)
    ]

    return filtered

def validate_data(data: pd.DataFrame) -> pd.DataFrame:
    """
    Validate data quality and schema.

    Args:
        data: Input DataFrame

    Returns:
        Validated DataFrame

    Raises:
        ValueError: If validation fails
    """
    # Check required columns
    required_cols = ['timestamp', 'user_id', 'event_type', 'value']
    missing = set(required_cols) - set(data.columns)

    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Check for nulls in critical columns
    null_counts = data[required_cols].isnull().sum()
    if null_counts.any():
        raise ValueError(f"Null values found: {null_counts[null_counts > 0].to_dict()}")

    return data

def engineer_features(validated_data: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
    """
    Engineer features for ML models.

    Args:
        validated_data: Validated DataFrame
        parameters: Feature engineering parameters

    Returns:
        DataFrame with engineered features
    """
    df = validated_data.copy()

    # Time-based features
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek

    # Aggregate features
    user_stats = df.groupby('user_id').agg({
        'value': ['mean', 'sum', 'count'],
        'event_type': 'nunique'
    })
    user_stats.columns = ['_'.join(col) for col in user_stats.columns]

    df = df.merge(user_stats, on='user_id', how='left')

    return df

def prepare_model_input(features: pd.DataFrame, parameters: Dict) -> pd.DataFrame:
    """
    Prepare final model input dataset.

    Args:
        features: Engineered features
        parameters: Model preparation parameters

    Returns:
        Model-ready DataFrame
    """
    # Select features for modeling
    feature_cols = parameters.get('feature_columns', [])

    if feature_cols:
        output = features[feature_cols]
    else:
        output = features

    # Handle missing values
    output = output.fillna(parameters.get('fill_value', 0))

    return output
```

```python
# src/pipeline_name/pipelines/data_processing/pipeline.py

from kedro.pipeline import Pipeline, node, pipeline
from .nodes import (
    ingest_data,
    validate_data,
    engineer_features,
    prepare_model_input
)

def create_pipeline(**kwargs) -> Pipeline:
    return pipeline([
        node(
            func=ingest_data,
            inputs=["raw_events", "params:data_processing"],
            outputs="ingested_data",
            name="ingest_data_node",
        ),
        node(
            func=validate_data,
            inputs="ingested_data",
            outputs="validated_data",
            name="validate_data_node",
        ),
        node(
            func=engineer_features,
            inputs=["validated_data", "params:feature_engineering"],
            outputs="feature_set",
            name="engineer_features_node",
        ),
        node(
            func=prepare_model_input,
            inputs=["feature_set", "params:model_preparation"],
            outputs="model_input",
            name="prepare_model_input_node",
        ),
    ])
```

### 2. Great Expectations Integration

**Pattern from Context7 (/great-expectations/great_expectations):**

#### Expectation Suite Configuration

```python
# src/pipeline_name/pipelines/data_validation/nodes.py

from great_expectations.data_context import DataContext
from great_expectations.dataset import PandasDataset
import pandas as pd

def create_expectation_suite(data: pd.DataFrame) -> dict:
    """
    Create Great Expectations expectation suite.

    Args:
        data: Input DataFrame

    Returns:
        Validation results
    """
    # Initialize Great Expectations
    context = DataContext()

    # Create expectation suite
    suite_name = "data_pipeline_suite"
    suite = context.create_expectation_suite(
        expectation_suite_name=suite_name,
        overwrite_existing=True
    )

    # Wrap DataFrame with Great Expectations
    ge_df = PandasDataset(data)

    # Define expectations

    # 1. Schema validation
    ge_df.expect_table_columns_to_match_ordered_list([
        'timestamp', 'user_id', 'event_type', 'value'
    ])

    # 2. Column type validation
    ge_df.expect_column_values_to_be_of_type('user_id', 'int64')
    ge_df.expect_column_values_to_be_of_type('value', 'float64')

    # 3. Null validation
    ge_df.expect_column_values_to_not_be_null('user_id')
    ge_df.expect_column_values_to_not_be_null('timestamp')

    # 4. Range validation
    ge_df.expect_column_values_to_be_between(
        'value',
        min_value=0,
        max_value=10000
    )

    # 5. Categorical validation
    ge_df.expect_column_values_to_be_in_set(
        'event_type',
        ['click', 'view', 'purchase', 'signup']
    )

    # 6. Uniqueness validation
    ge_df.expect_column_values_to_be_unique('transaction_id')

    # Save suite
    context.save_expectation_suite(ge_df.get_expectation_suite(), suite_name)

    # Run validation
    results = context.run_validation_operator(
        "action_list_operator",
        assets_to_validate=[ge_df],
        run_id="pipeline_validation"
    )

    return results

def validate_with_great_expectations(
    data: pd.DataFrame,
    parameters: dict
) -> pd.DataFrame:
    """
    Validate data using Great Expectations.

    Args:
        data: Input DataFrame
        parameters: Validation parameters

    Returns:
        Validated DataFrame

    Raises:
        ValueError: If validation fails
    """
    results = create_expectation_suite(data)

    if not results['success']:
        failed_expectations = [
            exp for exp in results['results']
            if not exp['success']
        ]
        raise ValueError(f"Validation failed: {failed_expectations}")

    return data
```

### 3. Feast Feature Store Integration

**Pattern from Context7 (/feast-dev/feast):**

#### Feature Repository Structure

```yaml
# feature_repo/feature_store.yaml

project: ml_pipeline
registry: data/registry.db
provider: local
online_store:
  type: redis
  connection_string: "localhost:6379"
offline_store:
  type: file
```

```python
# feature_repo/features.py

from datetime import timedelta
from feast import Entity, Feature, FeatureView, FileSource, ValueType

# Define entity
user = Entity(
    name="user_id",
    value_type=ValueType.INT64,
    description="User identifier",
)

# Define data source
user_features_source = FileSource(
    path="data/user_features.parquet",
    event_timestamp_column="timestamp",
)

# Define feature view
user_features = FeatureView(
    name="user_features",
    entities=["user_id"],
    ttl=timedelta(days=7),
    features=[
        Feature(name="total_events", dtype=ValueType.INT64),
        Feature(name="avg_value", dtype=ValueType.DOUBLE),
        Feature(name="event_type_count", dtype=ValueType.INT64),
    ],
    online=True,
    batch_source=user_features_source,
    tags={"team": "ml"},
)
```

```python
# src/pipeline_name/pipelines/feature_store/nodes.py

from feast import FeatureStore
import pandas as pd

def materialize_features_to_feast(
    features: pd.DataFrame,
    parameters: dict
) -> None:
    """
    Materialize features to Feast feature store.

    Args:
        features: Feature DataFrame
        parameters: Feast configuration
    """
    # Save features to parquet (offline store)
    features.to_parquet('data/user_features.parquet')

    # Initialize Feast
    fs = FeatureStore(repo_path="feature_repo")

    # Apply feature definitions
    fs.apply([user_features])

    # Materialize to online store
    fs.materialize_incremental(end_date=datetime.now())

    print("Features materialized to Feast")

def retrieve_features_from_feast(
    entity_df: pd.DataFrame,
    parameters: dict
) -> pd.DataFrame:
    """
    Retrieve features from Feast for model training.

    Args:
        entity_df: DataFrame with entities and timestamps
        parameters: Feature retrieval configuration

    Returns:
        DataFrame with features
    """
    fs = FeatureStore(repo_path="feature_repo")

    # Get features
    training_df = fs.get_historical_features(
        entity_df=entity_df,
        features=[
            "user_features:total_events",
            "user_features:avg_value",
            "user_features:event_type_count",
        ],
    ).to_df()

    return training_df
```

### 4. Airflow DAG Patterns

**Pattern from Context7 (/apache/airflow):**

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.amazon.aws.hooks.s3 import S3Hook

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email': ['ml-team@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'ml_data_pipeline',
    default_args=default_args,
    description='ML data pipeline with validation',
    schedule_interval='@daily',
    catchup=False,
    tags=['ml', 'etl'],
)

def extract_from_postgres(**context):
    """Extract data from PostgreSQL"""
    pg_hook = PostgresHook(postgres_conn_id='postgres_default')

    sql = """
        SELECT *
        FROM events
        WHERE timestamp >= {{ ds }}
        AND timestamp < {{ next_ds }}
    """

    df = pg_hook.get_pandas_df(sql)

    # Push to XCom
    context['ti'].xcom_push(key='raw_data', value=df.to_dict())

def transform_data(**context):
    """Transform extracted data"""
    # Pull from XCom
    raw_data = context['ti'].xcom_pull(key='raw_data', task_ids='extract')
    df = pd.DataFrame(raw_data)

    # Transformations
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour

    # Push transformed data
    context['ti'].xcom_push(key='transformed_data', value=df.to_dict())

def validate_data(**context):
    """Validate data with Great Expectations"""
    from great_expectations.dataset import PandasDataset

    transformed_data = context['ti'].xcom_pull(
        key='transformed_data',
        task_ids='transform'
    )
    df = pd.DataFrame(transformed_data)

    ge_df = PandasDataset(df)

    # Validate
    results = ge_df.expect_column_values_to_not_be_null('user_id')

    if not results['success']:
        raise ValueError("Validation failed")

def load_to_s3(**context):
    """Load data to S3"""
    s3_hook = S3Hook(aws_conn_id='aws_default')

    transformed_data = context['ti'].xcom_pull(
        key='transformed_data',
        task_ids='transform'
    )
    df = pd.DataFrame(transformed_data)

    # Upload to S3
    s3_hook.load_file_obj(
        df.to_parquet(),
        key=f"processed/events_{context['ds']}.parquet",
        bucket_name='ml-data-pipeline'
    )

extract = PythonOperator(
    task_id='extract',
    python_callable=extract_from_postgres,
    dag=dag,
)

transform = PythonOperator(
    task_id='transform',
    python_callable=transform_data,
    dag=dag,
)

validate = PythonOperator(
    task_id='validate',
    python_callable=validate_data,
    dag=dag,
)

load = PythonOperator(
    task_id='load',
    python_callable=load_to_s3,
    dag=dag,
)

extract >> transform >> validate >> load
```

## Implementation

This command uses specialized data engineering agents:
- **@kedro-pipeline-expert** - Kedro project generation and pipeline development
- **@airflow-orchestration-expert** - Airflow DAG generation and orchestration

Process:
1. Query Context7 for framework-specific patterns
2. Generate project structure based on framework choice
3. Create data catalog/connection configurations
4. Generate ETL pipeline nodes (ingestion, transformation, feature engineering)
5. Set up data validation with Great Expectations
6. Configure feature store integration (Feast/Tecton)
7. Set up orchestration and scheduling
8. Generate documentation and tests

## Best Practices Applied

Based on Context7 documentation:

**Kedro:**
1. **Standard project structure** - conf/, data/, src/, tests/
2. **Data catalog abstraction** - Separate data from code
3. **Modular pipelines** - Reusable pipeline components
4. **Parameter management** - Externalized configuration
5. **Data versioning** - Track data lineage
6. **Testing** - Unit and integration tests for nodes

**Airflow:**
1. **TaskFlow API** - Modern @task decorator pattern
2. **Idempotent tasks** - Safe retries and backfilling
3. **XCom for data passing** - Inter-task communication
4. **Proper error handling** - Retries, alerts, monitoring
5. **Task dependencies** - Clear DAG structure

**Great Expectations:**
1. **Expectation suites** - Reusable validation rules
2. **Schema validation** - Column names and types
3. **Data quality checks** - Nulls, ranges, uniqueness
4. **Automated reporting** - Validation results documentation

**Feast:**
1. **Feature definitions** - Centralized feature registry
2. **Online/offline stores** - Different serving patterns
3. **Point-in-time correctness** - Avoid data leakage
4. **Feature materialization** - Scheduled feature computation

## Output Structure

```
Generated Pipeline:

📁 ml-data-pipeline/
├── 📄 README.md                    # Setup and usage instructions
├── 📄 requirements.txt             # Python dependencies
├── 📁 conf/
│   ├── 📁 base/
│   │   ├── catalog.yml            # Data sources and targets
│   │   ├── parameters.yml         # Pipeline parameters
│   │   └── great_expectations/    # Validation configuration
│   └── 📁 local/
├── 📁 data/                        # Data directories
│   ├── 01_raw/
│   ├── 02_intermediate/
│   ├── 03_primary/
│   ├── 04_feature/
│   └── 05_model_input/
├── 📁 src/
│   └── 📁 pipeline_name/
│       ├── pipelines/
│       │   ├── data_ingestion/    # Ingestion nodes
│       │   ├── data_validation/   # Validation nodes
│       │   ├── data_transformation/# Transform nodes
│       │   └── feature_store/     # Feature store integration
│       ├── pipeline_registry.py   # Pipeline registration
│       └── settings.py
├── 📁 tests/                       # Unit and integration tests
└── 📁 docs/                        # Generated documentation

Commands:
  kedro run                         # Run full pipeline
  kedro run --pipeline=ingestion    # Run specific pipeline
  kedro test                        # Run tests
  kedro viz                         # Visualize pipeline
```

## Related Commands

- `/ml:train-optimize` - Optimize ML training pipelines
- `/ml:automl` - Automated ML pipeline
- `/data:etl` - Generic ETL pipeline setup
- `/infra:airflow` - Airflow infrastructure setup

## Troubleshooting

### Kedro Pipeline Issues

**Problem:** ModuleNotFoundError for pipeline
**Solution:**
```bash
pip install -e src/
```

**Problem:** Data catalog connection failure
**Solution:** Check credentials in `conf/local/credentials.yml`

### Airflow DAG Issues

**Problem:** DAG not appearing in Airflow UI
**Solution:**
- Check DAG syntax with `python dags/pipeline.py`
- Ensure DAG is in `$AIRFLOW_HOME/dags/`
- Refresh DAGs in UI

**Problem:** Task failures
**Solution:** Check logs in Airflow UI, verify connections

### Great Expectations Issues

**Problem:** Validation suite not found
**Solution:**
```bash
great_expectations suite new
```

**Problem:** Expectation failures
**Solution:** Review expectations, adjust based on actual data distribution

### Feast Issues

**Problem:** Features not materialized
**Solution:**
```bash
feast apply
feast materialize-incremental $(date +%Y-%m-%d)
```

**Problem:** Feature retrieval errors
**Solution:** Verify entity DataFrame has required columns and timestamps

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Kedro project generation with data catalog
- Airflow DAG generation with TaskFlow API
- Great Expectations validation integration
- Feast feature store integration
- Multi-framework support (Kedro, Airflow, Prefect)
