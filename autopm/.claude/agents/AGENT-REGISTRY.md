# Agent Registry

> **Note**: Only core agents (7) are bundled with autopm. All other agents are available via plugins.
> Install plugins for your stack: `autopm install --scenario=full` or pick specific plugins.
> The active `agent-registry.xml` is dynamically generated based on installed plugins.

This document is a full reference of all available agents across all plugins.

## 🎯 Agent Selection Rules

### Quick Decision Guide
1. **Architecture vs Implementation**
   - Planning/designing? → Use "expert" or "architect" agents
   - Building/coding? → Use "engineer" agents

2. **Scope Rules**
   - New project setup → "expert" agents
   - Day-to-day development → "engineer" agents
   - Platform-specific → cloud "architect" agents
   - Multi-platform/IaC → "terraform-infrastructure-expert"

3. **Component vs Application**
   - UI components only → "react-ui-expert"
   - Full application → "react-frontend-engineer"

4. **Local vs Production**
   - Development environment → "docker-containerization-expert"
   - Production deployment → "kubernetes-orchestrator"

## 🚀 Optimization Update (v1.1.0)

### Summary of Changes

- **Reduced agent count from 50+ to 39** (Consolidation complete)
- **Consolidated similar agents** into parameterized versions
- **Unified coordination rules** for better efficiency
- **Maintained all functionality** through parameters
- **Removed deprecated agent files** to avoid confusion

### Key Consolidations (Completed)
1. **UI Frameworks**: mui-react-expert, chakra-ui-expert, antd-react-expert, bootstrap-ui-expert → `react-ui-expert`
2. **Python Backend**: fastapi-backend-engineer, flask-backend-engineer → `python-backend-expert`
3. **Docker**: docker-expert, docker-compose-expert, docker-development-orchestrator → `docker-containerization-expert`
4. **E2E Testing**: playwright-test-engineer, playwright-mcp-frontend-tester → `e2e-test-engineer`

### Migration Note
Deprecated agents have been removed. Use the consolidated versions with appropriate parameters.

## Default Tools

Unless otherwise specified, all agents use: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, MultiEdit, Bash, Task, Agent

## Core Agents

### agent-manager
**Location**: `.claude/agents/core/agent-manager.md`
**Description**: Use this agent for creating, analyzing, improving, and managing other Claude Code agents. Expert in agent lifecycle management, documentation standards, and registry maintenance.

### file-analyzer
**Location**: `.claude/agents/core/file-analyzer.md`
**Description**: Use this agent when you need to analyze and summarize file contents, particularly log files or verbose outputs, to extract key information and reduce context usage.
**Tools**: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Search, Task, Agent

### code-analyzer
**Location**: `.claude/agents/core/code-analyzer.md`
**Description**: Use this agent when you need to analyze code changes for potential bugs, trace logic flow across multiple files, or investigate suspicious behavior in the codebase.
**Tools**: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Search, Task, Agent

### test-runner
**Location**: `.claude/agents/core/test-runner.md`
**Description**: Use this agent when you need to run tests and analyze their results with comprehensive log analysis and actionable insights.
**Tools**: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, Search, Task, Agent

### parallel-worker
**Location**: `.claude/agents/core/parallel-worker.md`
**Description**: Executes parallel work streams in a git branch for coordinated multi-agent execution.
**Tools**: Glob, Grep, LS, Read, WebFetch, TodoWrite, WebSearch, BashOutput, KillBash, Search, Task, Agent

### mcp-manager
**Location**: `.claude/agents/core/mcp-manager.md`
**Description**: Use this agent for MCP server infrastructure: installing servers, editing configuration files, starting/stopping server processes, and troubleshooting connection issues.
**Scope**: Server installation, config files, process management, health checks
**NOT for**: Context optimization, agent coordination, content curation (use mcp-context-manager)

### context-optimizer
**Location**: `.claude/agents/core/context-optimizer.md`
**Description**: Use this agent for managing context window efficiency, implementing compaction strategies, summarizing long conversations, and optimizing memory usage for long-running workflows.
**Scope**: Context analysis, compaction strategies, checkpoint creation, session continuity, memory patterns
**NOT for**: MCP server management (use mcp-manager), agent coordination (use mcp-context-manager)

## Framework Agents

### react-ui-expert
**Location**: `.claude/agents/frameworks/react-ui-expert.md`
**Description**: Use this agent for UI component architecture, design systems, component library selection (MUI, Chakra, Ant Design), styling strategies, and accessibility patterns.
**Scope**: Component libraries, design systems, styling, accessibility, component documentation
**NOT for**: Full app architecture, routing, state management (use react-frontend-engineer)
**Parameters**: `framework: [mui|chakra|antd|bootstrap|headless]`, `style_system: [css-in-js|tailwind|css-modules]`
**Replaces**: mui-react-expert, chakra-ui-expert, antd-react-expert, bootstrap-ui-expert

### react-frontend-engineer
**Location**: `.claude/agents/frameworks/react-frontend-engineer.md`
**Description**: Use this agent for complete React application development including routing, state management, API integration, and application architecture.
**Scope**: Full app architecture, Redux/Context/Zustand, routing, API integration, build config
**NOT for**: Pure UI component work, design systems (use react-ui-expert)

### ux-design-expert
**Location**: `.claude/agents/frameworks/ux-design-expert.md`
**Description**: Use this agent for UX/UI design analysis, user experience optimization, accessibility audits, and design system creation.

### tailwindcss-expert
**Location**: `.claude/agents/frameworks/tailwindcss-expert.md`
**Description**: Use this agent for TailwindCSS utility-first styling including responsive design, custom components, and design systems.

### e2e-test-engineer
**Location**: `.claude/agents/frameworks/e2e-test-engineer.md`
**Description**: Unified E2E test engineering specialist covering Playwright automation, MCP browser control, visual testing, and comprehensive test strategies.
**Parameters**: `test_framework: [playwright|cypress]`, `browser_control: [standard|mcp-enhanced]`, `test_types: [functional|visual|accessibility]`
**Replaces**: playwright-test-engineer, playwright-mcp-frontend-tester

### frontend-testing-engineer
**Location**: `.claude/agents/testing/frontend-testing-engineer.md`
**Description**: Use this agent for frontend unit and integration testing across React, Vue, Angular, and vanilla JavaScript applications.
**Scope**: Unit tests, integration tests, component tests, snapshot tests, coverage reporting
**NOT for**: E2E testing (use e2e-test-engineer), backend testing (use test-runner)

### nats-messaging-expert
**Location**: `.claude/agents/frameworks/nats-messaging-expert.md`
**Description**: Use this agent for NATS messaging system including pub/sub, request/reply, and queue groups.

## Language Agents

### python-backend-expert
**Location**: `.claude/agents/languages/python-backend-expert.md`
**Description**: Use this agent for Python backend architecture, new project setup, framework selection, database design, and strategic decisions.
**Scope**: Architecture, framework selection, database schema design, API patterns, performance architecture
**NOT for**: Day-to-day coding, bug fixes, minor features (use python-backend-engineer)
**Parameters**: `framework: [fastapi|flask|django|none]`, `async_support: boolean`, `database: [postgresql|mongodb|redis]`
**Replaces**: fastapi-backend-engineer, flask-backend-engineer

### javascript-frontend-engineer
**Location**: `.claude/agents/languages/javascript-frontend-engineer.md`
**Description**: Use this agent for modern JavaScript/TypeScript frontend development with vanilla JS and browser APIs.

### nodejs-backend-engineer
**Location**: `.claude/agents/languages/nodejs-backend-engineer.md`
**Description**: Use this agent for Node.js backend development including Express, Fastify, NestJS, and other Node.js frameworks.

### bash-scripting-expert
**Location**: `.claude/agents/languages/bash-scripting-expert.md`
**Description**: Use this agent for Bash scripting including shell automation, system administration, CI/CD scripts, and complex pipelines.

### python-backend-engineer
**Location**: `.claude/agents/languages/python-backend-engineer.md`
**Description**: Use this agent for day-to-day Python feature implementation, bug fixes, refactoring existing code, and writing tests.
**Scope**: Feature development, debugging, code optimization, test writing
**NOT for**: Architecture decisions, framework selection, major redesigns (use python-backend-expert)

## Cloud Agents

### gcp-cloud-architect
**Location**: `.claude/agents/cloud/gcp-cloud-architect.md`
**Description**: Use this agent when you need to design, deploy, or manage Google Cloud Platform infrastructure.

### azure-cloud-architect
**Location**: `.claude/agents/cloud/azure-cloud-architect.md`
**Description**: Use this agent when you need to design, deploy, or manage Microsoft Azure cloud infrastructure.

### aws-cloud-architect
**Location**: `.claude/agents/cloud/aws-cloud-architect.md`
**Description**: Use this agent when you need to design, deploy, or manage Amazon Web Services cloud infrastructure.

### kubernetes-orchestrator
**Location**: `.claude/agents/cloud/kubernetes-orchestrator.md`
**Description**: Use this agent when you need to design, deploy, or manage Kubernetes clusters and workloads.

### terraform-infrastructure-expert
**Location**: `.claude/agents/cloud/terraform-infrastructure-expert.md`
**Description**: Use this agent for Infrastructure as Code architecture, complex Terraform modules, multi-cloud strategies, state management, and GitOps workflows.
**Scope**: IaC architecture, Terraform modules, multi-cloud, state management, GitOps
**NOT for**: Platform-specific services, console operations (use specific cloud architects)

### gcp-cloud-functions-engineer
**Location**: `.claude/agents/cloud/gcp-cloud-functions-engineer.md`
**Description**: Use this agent for Google Cloud Functions development including HTTP functions, event-driven functions, and serverless architectures.

## DevOps Agents

### github-operations-specialist
**Location**: `.claude/agents/devops/github-operations-specialist.md`
**Description**: Use this agent when you need to manage GitHub repositories, workflows, issues, pull requests, or implement DevOps practices with GitHub Actions.

### azure-devops-specialist
**Location**: `.claude/agents/devops/azure-devops-specialist.md`
**Description**: Use this agent when you need to integrate with Azure DevOps services including work items, pipelines, boards, and repositories.

### mcp-context-manager
**Location**: `.claude/agents/devops/mcp-context-manager.md`
**Description**: Use this agent for MCP context optimization: deciding what content to share, curating context pools, coordinating agents, and optimizing context usage strategies.
**Scope**: Content strategy, context optimization, agent coordination, performance tuning
**NOT for**: Server installation, config file editing, process management (use mcp-manager)

### docker-containerization-expert
**Location**: `.claude/agents/devops/docker-containerization-expert.md`
**Description**: Comprehensive Docker specialist covering Dockerfile optimization, Compose orchestration, and development environments.
**Parameters**: `use_case: [development|production]`, `orchestration: [compose|swarm|kubernetes]`
**Replaces**: docker-expert, docker-compose-expert, docker-development-orchestrator

### traefik-proxy-expert
**Location**: `.claude/agents/devops/traefik-proxy-expert.md`
**Description**: Use this agent for Traefik reverse proxy configuration including load balancing, SSL termination, service discovery, and routing.

### ssh-operations-expert
**Location**: `.claude/agents/devops/ssh-operations-expert.md`
**Description**: Use this agent for SSH operations including remote server management, secure connections, key management, and automation.

### observability-engineer
**Location**: `.claude/agents/devops/observability-engineer.md`
**Description**: Use this agent for implementing monitoring, logging, tracing, and APM solutions. Specializes in Prometheus, Grafana, ELK Stack, Jaeger, Datadog, New Relic, and cloud-native observability tools.
**Scope**: Metrics collection, log aggregation, distributed tracing, dashboards, alerting, SLI/SLO monitoring
**NOT for**: Application development (use language-specific engineers), infrastructure setup (use cloud architects)

## Database Agents

### postgresql-expert
**Location**: `.claude/agents/databases/postgresql-expert.md`
**Description**: Use this agent for PostgreSQL database design, optimization, and management including advanced features and performance tuning.

### mongodb-expert
**Location**: `.claude/agents/databases/mongodb-expert.md`
**Description**: Use this agent for MongoDB database design, aggregation pipelines, and performance optimization.

### bigquery-expert
**Location**: `.claude/agents/databases/bigquery-expert.md`
**Description**: Use this agent for BigQuery data warehouse design, SQL optimization, and analytics engineering.

### cosmosdb-expert
**Location**: `.claude/agents/databases/cosmosdb-expert.md`
**Description**: Use this agent for Azure Cosmos DB design and optimization across all APIs.

### redis-expert
**Location**: `.claude/agents/databases/redis-expert.md`
**Description**: Use this agent for Redis caching, pub/sub messaging, and data structure operations.

## Data Engineering Agents

### airflow-orchestration-expert
**Location**: `.claude/agents/data/airflow-orchestration-expert.md`
**Description**: Use this agent for Apache Airflow workflow orchestration including DAG development, task dependencies, and scheduling.

### kedro-pipeline-expert
**Location**: `.claude/agents/data/kedro-pipeline-expert.md`
**Description**: Use this agent for Kedro data pipeline development including project structure, data catalog, and pipeline orchestration.

## AI Agents (plugin-ai)

### anthropic-claude-expert
**Location**: `.claude/agents/ai/anthropic-claude-expert.md`
**Description**: Anthropic Claude API integration with Messages API, tool use, prompt caching, vision, and streaming. Expert in cost optimization, async patterns, and production deployment.

### openai-python-expert
**Location**: `.claude/agents/ai/openai-python-expert.md`
**Description**: OpenAI Python SDK integration with GPT models, embeddings, fine-tuning, and assistants API. Expert in chat completions, function calling, vision, audio processing, and production deployment.

### azure-openai-expert
**Location**: `.claude/agents/ai/azure-openai-expert.md`
**Description**: Azure OpenAI Service integration with enterprise features, managed identities, private endpoints, and compliance. Expert in multi-tenant architecture, cost allocation, and hybrid deployments.

### gemini-api-expert
**Location**: `.claude/agents/ai/gemini-api-expert.md`
**Description**: Google Gemini API integration with text generation, multimodal inputs, function calling, and safety controls. Expert in Gemini Pro/Flash models, structured outputs, streaming responses, and production deployment.

### langchain-expert
**Location**: `.claude/agents/ai/langchain-expert.md`
**Description**: LangChain framework expert with LCEL, chains, agents, memory, RAG, and tools. Expert in async patterns, structured outputs, and production optimization.

### langgraph-workflow-expert
**Location**: `.claude/agents/ai/langgraph-workflow-expert.md`
**Description**: LangGraph workflow orchestration with state machines, conditional routing, multi-agent collaboration, and graph-based AI workflows. Expert in stateful applications and complex decision trees.

### google-a2a-expert
**Location**: `.claude/agents/ai/google-a2a-expert.md`
**Description**: Google Agent-to-Agent (A2A) protocol expert with Vertex AI Agent Builder, multi-agent orchestration, and agent collaboration. Expert in A2A SDK, ADK workflows, and distributed agent systems.

### huggingface-expert
**Location**: `.claude/agents/ai/huggingface-expert.md`
**Description**: HuggingFace ecosystem expert with Transformers, Datasets, Model Hub, quantization, and inference optimization. Expert in model deployment, fine-tuning, and production serving.

## Machine Learning Agents (plugin-ml)

### tensorflow-keras-expert
**Location**: `.claude/agents/machine-learning/tensorflow-keras-expert.md`
**Description**: TensorFlow and Keras deep learning expert for model building, training, optimization, and deployment. Expert in Sequential/Functional/Subclassing APIs, callbacks, XLA compilation, distributed training (MirroredStrategy/TPUStrategy), and TensorFlow Lite conversion.

### pytorch-expert
**Location**: `.claude/agents/machine-learning/pytorch-expert.md`
**Description**: PyTorch deep learning expert for model building, training optimization, and distributed training. Expert in torch.nn.Module, DataLoaders, Autograd, torch.compile, DDP (DistributedDataParallel), mixed precision (AMP), and CUDA optimization.

### reinforcement-learning-expert
**Location**: `.claude/agents/machine-learning/reinforcement-learning-expert.md`
**Description**: Reinforcement Learning expert for training agents with Gymnasium environments and Stable-Baselines3 algorithms (PPO, SAC, TD3, DQN). Expert in custom environments, policy training, reward engineering, Q-Learning, policy gradients, and multi-agent systems.

### scikit-learn-expert
**Location**: `.claude/agents/machine-learning/scikit-learn-expert.md`
**Description**: Classical machine learning expert with scikit-learn for pipelines, model selection, preprocessing, cross-validation, and hyperparameter tuning. Expert in classification, regression, clustering, dimensionality reduction, and feature engineering.

### neural-network-architect
**Location**: `.claude/agents/machine-learning/neural-network-architect.md`
**Description**: Neural network architecture design specialist for CNNs, ResNets, Transformers, RNNs, attention mechanisms, and hybrid models. Expert in architecture patterns, layer selection, skip connections, normalization strategies, and model scaling for optimal performance.

### gradient-boosting-expert
**Location**: `.claude/agents/machine-learning/gradient-boosting-expert.md`
**Description**: Gradient boosting specialist for XGBoost, LightGBM, and CatBoost. Expert in hyperparameter tuning, feature importance, early stopping, categorical feature handling, and model interpretation. Specializes in tabular data and competition-winning models.

### computer-vision-expert
**Location**: `.claude/agents/machine-learning/computer-vision-expert.md`
**Description**: Computer vision specialist using OpenCV, PIL/Pillow, and deep learning integration. Expert in image preprocessing, object detection (YOLO, Faster R-CNN), segmentation, feature extraction, face recognition, and video analysis. Production CV pipelines and real-time processing.

### nlp-transformer-expert
**Location**: `.claude/agents/machine-learning/nlp-transformer-expert.md`
**Description**: NLP transformer specialist for BERT, GPT, T5, RoBERTa. Expert in fine-tuning, tokenization, pipeline API, text classification, question answering, NER, text generation, and inference optimization. Production NLP pipelines and model deployment.

### time-series-expert
**Location**: `.claude/agents/machine-learning/time-series-expert.md`
**Description**: Time series forecasting specialist with Prophet, ARIMA, LSTM, Temporal Fusion Transformer. Expert in trend analysis, seasonality decomposition, anomaly detection, and multi-step ahead prediction. Production forecasting pipelines.

### automl-expert
**Location**: `.claude/agents/machine-learning/automl-expert.md`
**Description**: Automated machine learning specialist with AutoGluon, FLAML, AutoKeras, H2O AutoML. Expert in automated model selection, hyperparameter tuning, ensemble methods, and rapid prototyping. Get best models with minimal code.

## Decision Matrices (Not Agents)

### ui-framework-selection
**Location**: `.claude/agents/decision-matrices/ui-framework-selection.md`
**Description**: Decision matrix for selecting UI frameworks based on project requirements. Not a callable agent.

### python-backend-selection
**Location**: `.claude/agents/decision-matrices/python-backend-selection.md`
**Description**: Decision matrix for selecting Python backend frameworks. Not a callable agent.

### playwright-testing-selection
**Location**: `.claude/agents/decision-matrices/playwright-testing-selection.md`
**Description**: Decision matrix for selecting testing strategies with Playwright. Not a callable agent.

## Registry Format for System Prompt

When adding agents to the main system prompt, use this format:

```
- agent-name: Use this agent for [primary purpose]. Expert in [key technologies]. Specializes in [specializations]. (Tools: [tool-list])
```

## Agent Count Summary

### Active Agents by Category
- **Core**: 7 agents (agent-manager, file-analyzer, code-analyzer, test-runner, parallel-worker, mcp-manager, context-optimizer)
- **Frameworks/Testing**: 7 agents (react-ui-expert, react-frontend-engineer, ux-design-expert, tailwindcss-expert, e2e-test-engineer, frontend-testing-engineer, nats-messaging-expert)
- **Languages**: 5 agents (python-backend-expert, python-backend-engineer, javascript-frontend-engineer, nodejs-backend-engineer, bash-scripting-expert)
- **Cloud**: 6 agents (AWS, Azure, GCP, Kubernetes, Terraform, Cloud Functions)
- **DevOps**: 7 agents (github-operations-specialist, azure-devops-specialist, mcp-context-manager, docker-containerization-expert, traefik-proxy-expert, ssh-operations-expert, observability-engineer)
- **Databases**: 5 agents (PostgreSQL, MongoDB, BigQuery, CosmosDB, Redis)
- **Data Engineering**: 2 agents (Airflow, Kedro)
- **AI**: 8 agents (Anthropic Claude, OpenAI, Azure OpenAI, Gemini, LangChain, LangGraph, Google A2A, HuggingFace)
- **Machine Learning**: 10 agents (TensorFlow/Keras, PyTorch, RL, scikit-learn, neural network architecture, gradient boosting, computer vision, NLP transformers, time series, AutoML)

**Total Active**: 57 agents (kept in sync with the agent files by `test/unit/plugin-manifest-consistency.test.js`)
**Decision Matrices**: 3 tools (not agents)

## Adding New Agents

To add a new agent, follow the agent-manager's comprehensive checklist:

1. Create agent documentation in appropriate category
2. Add rules if needed
3. Create command patterns
4. Update this registry
5. Update CLAUDE.md
6. Add to system prompt
7. Test agent invocation

## Deprecation Notice

Agents marked as deprecated will be removed in future versions. Please migrate to recommended alternatives.
