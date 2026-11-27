# @claudeautopm/plugin-data

Data engineering, machine learning pipelines, and workflow orchestration specialists.

## 📦 Installation

```bash
# Install the plugin package
npm install -g @claudeautopm/plugin-data

# Install plugin agents to your project
autopm plugin install data
```

## 🤖 Agents Included

### Workflow Orchestration
- **airflow-orchestration-expert** - Apache Airflow DAG development
  - DAG design and best practices
  - Task dependencies and scheduling
  - Sensor and operator development
  - XCom for inter-task communication
  - Connection and variable management
  - Monitoring and alerting

### ML Pipeline Development
- **kedro-pipeline-expert** - Kedro ML pipeline framework
  - Pipeline architecture
  - Data catalog management
  - Node and pipeline creation
  - Parameters and configuration
  - Testing and debugging
  - Production deployment

### AI Workflow Automation
- **langgraph-workflow-expert** - LangGraph AI workflow orchestration
  - Graph-based workflow design
  - State management
  - Agent coordination patterns
  - LLM integration
  - Error handling and retries
  - Streaming and async workflows

## 💡 Usage

### In Claude Code

After installation, agents are available in your project:

```markdown
<!-- CLAUDE.md -->
## Active Team Agents

<!-- Load data engineering agents -->
- @include .claude/agents/data/airflow-orchestration-expert.md
- @include .claude/agents/data/kedro-pipeline-expert.md
```

Or use `autopm team load` to automatically include agents:

```bash
# Load data engineering team
autopm team load data

# Or include in fullstack team
autopm team load fullstack
```

### Direct Invocation

```bash
# Invoke agent directly from CLI
autopm agent invoke airflow-orchestration-expert "Design ETL DAG for data warehouse"
```

## 📋 Agent Capabilities

### Data Pipeline Orchestration
- Complex DAG design and scheduling
- Task dependency management
- Dynamic pipeline generation
- Resource allocation and optimization

### ML Workflow Management
- End-to-end ML pipeline design
- Data versioning and lineage
- Experiment tracking
- Model deployment automation

### AI Agent Orchestration
- Multi-agent coordination
- LLM workflow automation
- State machine design
- Tool integration patterns

### Data Engineering
- ETL/ELT pipeline development
- Data quality validation
- Incremental processing
- Error handling and recovery

## 🚀 Examples

### Airflow ETL Pipeline

```
@airflow-orchestration-expert

Create Airflow DAG for daily ETL:

Requirements:
- Extract from PostgreSQL source
- Transform data with pandas
- Load to BigQuery warehouse
- Data quality checks
- Email alerts on failure
- Retry logic with backoff

Schedule:
- Run daily at 2 AM UTC
- Handle time zones
- SLA monitoring

Include:
1. DAG definition
2. Custom operators
3. Data quality sensors
4. Alert configuration
5. Testing strategy
```

### Kedro ML Pipeline

```
@kedro-pipeline-expert

Build ML pipeline for churn prediction:

Pipeline stages:
1. Data ingestion (multiple sources)
2. Feature engineering
3. Model training (XGBoost, LightGBM)
4. Model evaluation
5. Model deployment

Requirements:
- Modular pipeline design
- Data catalog for versioning
- Parameter management
- Cross-validation
- Model registry integration

Include:
1. Pipeline structure
2. Node implementations
3. Data catalog YAML
4. Parameters YAML
5. Testing suite
```

### LangGraph AI Workflow

```
@langgraph-workflow-expert

Design multi-agent research workflow:

Agents:
- Research Agent (web search)
- Analysis Agent (data processing)
- Writer Agent (report generation)
- Reviewer Agent (quality check)

Workflow:
1. Research gathers information
2. Analysis processes findings
3. Writer creates draft
4. Reviewer validates quality
5. Loop back if quality < threshold

Requirements:
- State persistence
- Error recovery
- Streaming output
- Token usage tracking

Include:
1. Graph definition
2. Agent nodes
3. State management
4. Edge conditions
5. Testing examples
```

### Complex Airflow Architecture

```
@airflow-orchestration-expert

Design multi-tenant data platform:

Requirements:
- 10+ data sources (APIs, databases, files)
- Dynamic DAG generation per tenant
- Parallel processing with pools
- Resource quotas per tenant
- Cost tracking and optimization
- Disaster recovery

Features:
- DAG factory pattern
- Custom operators for common tasks
- Centralized logging
- Metric collection
- Auto-scaling workers

Include:
1. Architecture diagram
2. DAG factory implementation
3. Custom operator library
4. Configuration management
5. Monitoring setup
```

### Kedro Production Deployment

```
@kedro-pipeline-expert

Productionize Kedro pipeline:

Requirements:
- Docker containerization
- Kubernetes deployment
- CI/CD with GitHub Actions
- Model registry (MLflow)
- Monitoring and logging
- A/B testing support

Pipeline:
- Training pipeline (weekly)
- Inference pipeline (real-time)
- Evaluation pipeline (daily)

Include:
1. Dockerfile and docker-compose
2. Kubernetes manifests
3. CI/CD workflows
4. Deployment scripts
5. Monitoring dashboards
```

## 🔧 Configuration

### Environment Variables

Some agents benefit from environment variables:

```bash
# Airflow
export AIRFLOW_HOME=/opt/airflow
export AIRFLOW__CORE__EXECUTOR=CeleryExecutor
export AIRFLOW__CORE__SQL_ALCHEMY_CONN=postgresql://...

# Kedro
export KEDRO_ENV=production
export KEDRO_LOGGING_CONFIG=conf/base/logging.yml

# LangGraph
export OPENAI_API_KEY=your-key
export LANGSMITH_API_KEY=your-key
export LANGSMITH_PROJECT=my-project
```

### Agent Customization

You can customize agent behavior in `.claude/config.yaml`:

```yaml
plugins:
  data:
    airflow:
      default_executor: CeleryExecutor
      default_retries: 3
      schedule_interval: '@daily'
    kedro:
      default_runner: SequentialRunner
      log_level: INFO
      data_catalog_type: local
    langgraph:
      llm_provider: openai
      model: gpt-4
      enable_tracing: true
```

## 📖 Documentation

- [Airflow Orchestration Expert Guide](./agents/airflow-orchestration-expert.md)
- [Kedro Pipeline Expert Guide](./agents/kedro-pipeline-expert.md)
- [LangGraph Workflow Expert Guide](./agents/langgraph-workflow-expert.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-data)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
