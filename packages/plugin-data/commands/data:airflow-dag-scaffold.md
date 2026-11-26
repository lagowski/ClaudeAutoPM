# Airflow DAG Scaffold Command

Generate a production-ready Apache Airflow DAG with Context7-verified best practices for data pipeline orchestration.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: airflow.

## Command Usage

```bash
/airflow-dag-scaffold <dag_name> [options]
```

### Arguments
- `dag_name` (required): Name of the DAG to create (e.g., `data_processing_pipeline`)

### Options
- `--schedule`: Schedule interval (default: `@daily`)
- `--owner`: DAG owner (default: `airflow`)
- `--retries`: Number of retries (default: `3`)
- `--email`: Email for notifications
- `--use-taskflow`: Use TaskFlow API (@task decorators) (default: true)

## Implementation Steps

### 1. Query Context7 for Latest Patterns

Before generating any code, query Context7:

```python
# Query Context7 for Airflow best practices
# Topics: DAG structure, TaskFlow API, dependencies, error handling
```

### 2. Generate DAG Structure

Create a production-ready DAG file with Context7-verified patterns:

```python
"""
{{dag_name}} - Data Processing Pipeline

This DAG demonstrates Context7-verified Airflow patterns:
- TaskFlow API with @task decorators
- Bitshift operators for dependencies (>>, <<)
- Proper error handling and retries
- Sensor patterns for external dependencies
"""

from datetime import datetime, timedelta
from typing import Dict, List

from airflow.decorators import dag, task
from airflow.operators.python import PythonOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.task_group import TaskGroup

# ✅ CORRECT: Default arguments with proper error handling
default_args = {
    "owner": "{{owner}}",
    "depends_on_past": False,
    "email": ["{{email}}"],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": {{retries}},
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(hours=1),
}


@dag(
    dag_id="{{dag_name}}",
    default_args=default_args,
    description="Production-ready data pipeline with Context7 patterns",
    schedule_interval="{{schedule}}",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["data-processing", "etl", "production"],
)
def {{dag_name}}_dag():
    """
    Main DAG definition using TaskFlow API.

    Context7 Pattern: TaskFlow API with @task decorators
    Source: /apache/airflow (5,854 snippets, trust 9.1)
    """

    # ===================================================================
    # EXTRACTION PHASE
    # ===================================================================

    @task
    def extract_from_source_a() -> Dict:
        """
        Extract data from source A.

        Context7 Pattern: @task decorator for Python functions
        Returns data as dict for XCom passing
        """
        import pandas as pd

        # Extract logic here
        data = {"records": [1, 2, 3, 4, 5], "count": 5}

        print(f"Extracted {data['count']} records from source A")
        return data

    @task
    def extract_from_source_b() -> Dict:
        """
        Extract data from source B.

        Context7 Pattern: Parallel extraction using independent tasks
        """
        import pandas as pd

        # Extract logic here
        data = {"records": [6, 7, 8, 9, 10], "count": 5}

        print(f"Extracted {data['count']} records from source B")
        return data

    # ===================================================================
    # TRANSFORMATION PHASE
    # ===================================================================

    @task
    def transform_data(source_a: Dict, source_b: Dict) -> Dict:
        """
        Transform and combine data from multiple sources.

        Context7 Pattern: TaskFlow automatically handles XCom passing
        Parameters match task outputs
        """
        combined_records = source_a["records"] + source_b["records"]
        total_count = source_a["count"] + source_b["count"]

        # Transformation logic
        transformed = {
            "records": [x * 2 for x in combined_records],
            "count": total_count,
            "transformation": "doubled"
        }

        print(f"Transformed {transformed['count']} records")
        return transformed

    @task
    def validate_data(data: Dict) -> Dict:
        """
        Validate transformed data.

        Context7 Pattern: Data quality checks in pipeline
        """
        assert data["count"] > 0, "No records to validate"
        assert len(data["records"]) == data["count"], "Record count mismatch"

        print(f"Validation passed for {data['count']} records")
        return data

    # ===================================================================
    # LOADING PHASE
    # ===================================================================

    @task
    def load_to_warehouse(data: Dict) -> None:
        """
        Load validated data to data warehouse.

        Context7 Pattern: Final task in ETL pipeline
        """
        print(f"Loading {data['count']} records to warehouse")
        # Load logic here
        print("Load completed successfully")

    @task
    def send_notification(data: Dict) -> None:
        """
        Send notification on pipeline completion.

        Context7 Pattern: Notification task for monitoring
        """
        message = f"Pipeline completed: {data['count']} records processed"
        print(f"Notification: {message}")
        # Send notification logic here

    # ===================================================================
    # DAG STRUCTURE WITH CONTEXT7 DEPENDENCY PATTERNS
    # ===================================================================

    # Context7 Pattern: TaskFlow automatically resolves dependencies
    source_a_data = extract_from_source_a()
    source_b_data = extract_from_source_b()

    # Context7 Pattern: Pass multiple inputs to transformation
    transformed = transform_data(source_a_data, source_b_data)

    # Context7 Pattern: Sequential validation and loading
    validated = validate_data(transformed)
    load_task = load_to_warehouse(validated)
    notify_task = send_notification(validated)

    # Context7 Pattern: Bitshift operator for explicit dependencies
    load_task >> notify_task


# Instantiate the DAG
dag_instance = {{dag_name}}_dag()
```

### 3. Generate TaskGroup Example (Optional)

For complex DAGs, create TaskGroups for organization:

```python
@dag(...)
def complex_pipeline():
    """DAG with TaskGroups for organization."""

    # ✅ CORRECT: TaskGroup for hierarchical organization
    with TaskGroup("extraction_group") as extract_group:
        @task
        def extract_db():
            return {"source": "database", "count": 100}

        @task
        def extract_api():
            return {"source": "api", "count": 50}

        db_data = extract_db()
        api_data = extract_api()

    with TaskGroup("transformation_group") as transform_group:
        @task
        def transform_db(data: Dict):
            return {"transformed": data["count"] * 2}

        @task
        def transform_api(data: Dict):
            return {"transformed": data["count"] * 3}

        transform_db(db_data)
        transform_api(api_data)

    # Context7 Pattern: TaskGroup dependencies
    extract_group >> transform_group
```

### 4. Generate Sensor Example (For External Dependencies)

For DAGs waiting on external tasks or files:

```python
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.providers.google.cloud.sensors.bigquery import BigQueryTableExistenceSensor

@dag(...)
def pipeline_with_sensors():
    """DAG with sensor patterns for external dependencies."""

    # ✅ CORRECT: ExternalTaskSensor for DAG dependencies
    wait_for_upstream = ExternalTaskSensor(
        task_id="wait_for_upstream_dag",
        external_dag_id="upstream_data_pipeline",
        external_task_id="final_load_task",
        allowed_states=["success"],
        failed_states=["failed", "skipped"],
        timeout=3600,  # 1 hour timeout
        poke_interval=300,  # Check every 5 minutes
    )

    # ✅ CORRECT: BigQuery sensor for table existence
    check_table_exists = BigQueryTableExistenceSensor(
        task_id="check_source_table",
        project_id="my-project",
        dataset_id="raw_data",
        table_id="daily_events",
    )

    @task
    def process_data():
        print("Processing data after sensors complete")

    # Context7 Pattern: Sensors before processing
    [wait_for_upstream, check_table_exists] >> process_data()
```

### 5. Generate Testing Template

Create test file for the DAG:

```python
"""
Tests for {{dag_name}} DAG

Context7 Pattern: Test DAG structure, dependencies, and node logic
"""

import pytest
from datetime import datetime
from airflow.models import DagBag


def test_dag_loaded():
    """Test that DAG is properly loaded."""
    dagbag = DagBag()
    assert "{{dag_name}}" in dagbag.dags
    assert len(dagbag.import_errors) == 0


def test_dag_structure():
    """Test DAG has correct structure."""
    dagbag = DagBag()
    dag = dagbag.get_dag("{{dag_name}}")

    # Check tasks exist
    assert len(dag.tasks) > 0

    # Check dependencies are correct
    # Add specific assertions based on your DAG structure


def test_task_execution():
    """Test individual task logic."""
    from dags.{{dag_name}} import extract_from_source_a

    result = extract_from_source_a.function()
    assert result is not None
    assert "records" in result
    assert "count" in result
```

## Context7-Verified Patterns Applied

### Task Dependencies
- ✅ Bitshift operators (`>>`, `<<`) for clear dependencies
- ✅ TaskFlow API automatic dependency resolution
- ✅ `chain()` function for sequential tasks
- ✅ `cross_downstream()` for fan-out patterns

### Error Handling
- ✅ Retry configuration with exponential backoff
- ✅ Email notifications on failure
- ✅ Proper timeout settings
- ✅ Task-level error callbacks

### TaskFlow API
- ✅ `@task` decorators for Python functions
- ✅ Automatic XCom passing between tasks
- ✅ Type hints for better code quality
- ✅ Return values for data passing

### Sensors
- ✅ ExternalTaskSensor for DAG dependencies
- ✅ Provider-specific sensors (BigQuery, S3, etc.)
- ✅ Proper timeout and poke interval settings
- ✅ Allowed and failed states configuration

### Organization
- ✅ TaskGroups for hierarchical structure
- ✅ Clear task naming conventions
- ✅ Documentation strings
- ✅ Logical phase separation (extract, transform, load)

## Output Files

The command generates:

1. `dags/{{dag_name}}.py` - Main DAG file
2. `tests/test_{{dag_name}}.py` - Test file
3. `README_{{dag_name}}.md` - Documentation

## Validation Checklist

After generation, verify:

- [ ] Context7 documentation queried
- [ ] TaskFlow API patterns applied correctly
- [ ] Dependencies are clear and correct
- [ ] Error handling configured
- [ ] Retries with exponential backoff
- [ ] Email notifications set up
- [ ] Tests cover DAG structure and logic
- [ ] Documentation is complete

## Related Resources

- Agent: `@airflow-orchestration-expert` for advanced patterns
- Rule: `data-quality-standards.md` for data validation
- Rule: `etl-pipeline-standards.md` for ETL best practices
- Script: `airflow-dag-example.py` for complete example

## Notes

- Always query Context7 before generating DAG code
- Use TaskFlow API for cleaner code and better maintainability
- Configure proper retries and error handling
- Test DAG structure before deployment
- Monitor DAG performance in Airflow UI
