# @claudeautopm/plugin-ai

> Complete AI/ML plugin with OpenAI, Gemini, LangChain agents, RAG systems, model deployment, prompt engineering, and MLOps patterns

[![npm version](https://img.shields.io/npm/v/@claudeautopm/plugin-ai.svg)](https://www.npmjs.com/package/@claudeautopm/plugin-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This plugin provides comprehensive AI and Machine Learning capabilities for ClaudeAutoPM, including expert agents for OpenAI, Gemini, and LangChain, production-ready commands for RAG systems and model deployment, and Context7-verified best practices for AI development.

## Features

- **🤖 AI/ML Agents**: OpenAI, Gemini, and LangGraph workflow experts
- **📚 RAG Systems**: Complete retrieval-augmented generation scaffolding
- **🚀 Model Deployment**: Production-ready AI model deployment infrastructure
- **📝 Prompt Engineering**: Comprehensive prompt engineering standards
- **📊 MLOps**: Experiment tracking and model registry with MLflow
- **✅ Context7-Verified**: All patterns verified against official documentation

## Installation

```bash
npm install @claudeautopm/plugin-ai
```

## Agents

### openai-python-expert

Expert in OpenAI Python SDK integration:
- GPT models (GPT-4, GPT-3.5)
- Chat completions and streaming
- Function calling and tool usage
- Embeddings and vector operations
- Vision and audio processing
- Production deployment patterns

**Context7 Sources**: `/openai/openai-python` (277 snippets, trust 9.1)

### gemini-api-expert

Expert in Google Gemini API integration:
- Gemini Pro and Flash models
- Multimodal inputs (text, images, audio, video)
- Safety controls and content filtering
- Structured output generation
- Function calling
- Production deployment

**Context7 Sources**: `/google/generative-ai-python`

### langgraph-workflow-expert

Expert in LangGraph workflow orchestration:
- State machines and conditional routing
- Multi-agent collaboration
- Graph-based AI workflows
- Human-in-the-loop patterns
- Tool integration
- Workflow monitoring

**Context7 Sources**: `/langchain-ai/langgraph` (verified patterns)

## Commands

### /ai:rag-setup

Generate production-ready RAG system with:
- Document ingestion and chunking
- Vector store setup (Chroma, FAISS, Pinecone)
- Embedding configuration (OpenAI, HuggingFace)
- Retrieval strategies (MMR, similarity, compression)
- RAG chain assembly with RunnablePassthrough
- Testing and monitoring

**Usage:**
```bash
/ai:rag-setup my-rag-project --vector-store chroma --retrieval-strategy mmr
```

### /ai:model-deploy

Generate AI model deployment infrastructure with:
- FastAPI application with async endpoints
- MLflow model registry
- Prometheus monitoring
- Response caching and rate limiting
- Docker and Kubernetes configurations
- Error handling and retries

**Usage:**
```bash
/ai:model-deploy my-model --framework fastapi --monitoring prometheus
```

## Rules

### ai-model-standards

Comprehensive AI model development standards covering:
- Model selection and configuration
- Async operations and rate limiting
- Error handling with exponential backoff
- Response caching for efficiency
- Monitoring and metrics tracking
- HuggingFace and MLflow patterns

### prompt-engineering-standards

Comprehensive prompt engineering standards covering:
- System prompts and role definition
- Few-shot learning patterns
- Chain-of-thought reasoning
- Structured output generation
- Context window management
- Prompt injection prevention
- RAG prompt patterns

## Example Scripts

All example scripts demonstrate Context7-verified patterns:

### openai-chat-example.py

Demonstrates:
- AsyncOpenAI client configuration
- Streaming chat completions
- Function calling with tools
- Error handling with exponential backoff
- Response caching with TTL

**Run:**
```bash
export OPENAI_API_KEY='your-key'
python scripts/examples/openai-chat-example.py
```

### langchain-rag-example.py

Demonstrates:
- Document chunking with RecursiveCharacterTextSplitter
- Vector store creation with Chroma
- MMR retrieval for diverse results
- RAG chain with RunnablePassthrough.assign()
- Context boundary enforcement

**Run:**
```bash
export OPENAI_API_KEY='your-key'
python scripts/examples/langchain-rag-example.py
```

### huggingface-inference-example.py

Demonstrates:
- Pipeline API for quick inference
- AutoTokenizer and AutoModel patterns
- Device management (CPU/GPU)
- Batch processing
- Model caching

**Run:**
```bash
python scripts/examples/huggingface-inference-example.py
```

### mlflow-tracking-example.py

Demonstrates:
- Experiment organization
- Parameter and metric logging
- Model registry and versioning
- Run comparison
- Artifact storage

**Run:**
```bash
python scripts/examples/mlflow-tracking-example.py
mlflow ui  # View results
```

## Context7 Integration

This plugin extensively uses Context7 for retrieving up-to-date documentation and best practices:

- **OpenAI**: 277 code snippets, trust score 9.1
- **LangChain**: 150 code snippets, trust score 9.2
- **HuggingFace**: 2,790 code snippets, trust score 9.6
- **MLflow**: 3,114 code snippets, trust score 9.1

All patterns are verified against official documentation to ensure correctness and follow industry best practices.

## Quick Start

1. **Install the plugin:**
   ```bash
   npm install @claudeautopm/plugin-ai
   ```

2. **Use an agent:**
   ```bash
   # In Claude Code
   @openai-python-expert help me implement chat completions with streaming
   ```

3. **Run a command:**
   ```bash
   /ai:rag-setup my-knowledge-base
   ```

4. **Try an example:**
   ```bash
   export OPENAI_API_KEY='your-key'
   python scripts/examples/openai-chat-example.py
   ```

## Best Practices

### AsyncOpenAI Pattern
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=api_key,
    max_retries=3,
    timeout=60.0
)

response = await client.chat.completions.create(
    model="gpt-4",
    messages=messages
)
```

### RAG with RunnablePassthrough
```python
from langchain_core.runnables import RunnablePassthrough
from operator import itemgetter

rag_chain = (
    RunnablePassthrough.assign(
        context=itemgetter("question")
            | retriever
            | format_docs
    )
    | prompt
    | llm
    | StrOutputParser()
)
```

### HuggingFace Pipeline
```python
from transformers import pipeline

classifier = pipeline(
    "sentiment-analysis",
    device=0 if torch.cuda.is_available() else -1
)

results = classifier(texts)
```

### MLflow Tracking
```python
import mlflow

with mlflow.start_run():
    mlflow.log_params(params)
    mlflow.log_metrics(metrics)
    mlflow.sklearn.log_model(model, "model")
```

## Requirements

- **Node.js**: >=22.0.0
- **npm**: >=10.0.0
- **Python**: >=3.8 (for example scripts)
- **API Keys**: OpenAI, Gemini (as needed)

## Dependencies

- **Peer**: `@claudeautopm/plugin-core@^2.0.0`
- **Python** (for scripts): openai, langchain, transformers, mlflow

## Contributing

Contributions are welcome! Please ensure:
- All patterns follow Context7-verified best practices
- Documentation is comprehensive
- Examples are runnable
- Tests pass

## License

MIT © ClaudeAutoPM Team

## Support

- **Issues**: https://github.com/lagowski/ClaudeAutoPM/issues
- **Documentation**: https://github.com/lagowski/ClaudeAutoPM/tree/main/packages/plugin-ai

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [Context7 Documentation](https://context7.com)

---

**Version**: 2.0.0
**Schema Version**: 2.0
**Package Size**: ~22 KB (gzipped)
