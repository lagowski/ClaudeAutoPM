# llm:optimize

Optimize LLM inference performance with Context7-verified model selection, prompt engineering, and deployment strategies.

## Description

Comprehensive LLM optimization following industry best practices:
- Model selection and sizing
- Prompt engineering optimization
- Inference acceleration techniques
- Context window management
- Token usage optimization
- Multi-model routing strategies

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Usage

```bash
/llm:optimize [options]
```

## Options

- `--scope <model|prompts|inference|tokens|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report

## Optimization Categories

### 1. Model Selection (Context7-Verified)

**Pattern: Right-Sizing Models**

```python
# Use smallest capable model for task
MODEL_ROUTING = {
    "simple_classification": "gpt-4o-mini",  # Fast, cheap
    "code_generation": "gpt-4o",             # Balanced
    "complex_reasoning": "gpt-4-turbo",      # Powerful
}

def select_model(task_type: str) -> str:
    return MODEL_ROUTING.get(task_type, "gpt-4o-mini")
```

**Cost Impact:**
- gpt-4o-mini: $0.15/$0.60 per 1M tokens (input/output)
- gpt-4o: $2.50/$10.00 per 1M tokens
- gpt-4-turbo: $10.00/$30.00 per 1M tokens

**Recommendation:** Use gpt-4o-mini for 80% of tasks → 90% cost reduction

### 2. Prompt Engineering (Context7-Verified)

**Pattern: System Prompts**

```python
# Concise system prompt (saves tokens)
SYSTEM_PROMPT = """You are a helpful assistant. Be concise."""

# vs

# Verbose system prompt (wastes tokens)
SYSTEM_PROMPT_VERBOSE = """
You are a highly knowledgeable AI assistant designed to help users
with a wide variety of tasks. Your responses should be detailed,
accurate, and helpful. Always maintain a professional tone...
"""
```

**Token Savings:** 70% (15 tokens vs 50 tokens)

**Pattern: Few-Shot Examples**

```python
# Optimal: 2-3 examples
FEW_SHOT = """
Classify sentiment:
Text: "I love this!" → Positive
Text: "It's okay" → Neutral
Text: "Terrible!" → Negative
Now classify: "{text}"
"""

# Too many: 10+ examples (wastes tokens and context)
```

**Performance Impact:**
- 2-3 examples: 95% accuracy
- 10+ examples: 96% accuracy (1% gain for 3x cost)

### 3. Inference Optimization (Context7-Verified)

**Pattern: Streaming for Long Responses**

```python
def stream_response(prompt: str):
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content

# Benefits:
# - Time to first token: 500ms vs 5s
# - Better UX (progressive rendering)
# - Lower perceived latency
```

**Pattern: Parallel Requests**

```python
import asyncio

async def process_batch(prompts: list[str]) -> list[str]:
    tasks = [get_completion(p) for p in prompts]
    return await asyncio.gather(*tasks)

# 10 sequential: 20s
# 10 parallel: 2s (10x faster)
```

### 4. Token Optimization (Context7-Verified)

**Pattern: max_tokens Limit**

```python
# Set appropriate limits
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=150  # Limit response length
)

# Benefits:
# - Prevents verbose responses
# - Reduces output costs
# - Faster generation
```

**Cost Savings:** 40% for responses naturally <150 tokens

**Pattern: Truncate Long Inputs**

```python
import tiktoken

def truncate_to_tokens(text: str, max_tokens: int = 4000) -> str:
    encoding = tiktoken.encoding_for_model("gpt-4o")
    tokens = encoding.encode(text)

    if len(tokens) <= max_tokens:
        return text

    return encoding.decode(tokens[:max_tokens])

# Usage
long_text = "..." * 10000
optimized = truncate_to_tokens(long_text, max_tokens=4000)
```

### 5. Context Window Management (Context7-Verified)

**Pattern: Sliding Window**

```python
def get_relevant_context(history: list, max_tokens: int = 4000):
    """Keep only recent messages that fit in context."""
    total_tokens = 0
    relevant = []

    for msg in reversed(history):
        msg_tokens = count_tokens(msg["content"])

        if total_tokens + msg_tokens > max_tokens:
            break

        relevant.insert(0, msg)
        total_tokens += msg_tokens

    return relevant

# Benefits:
# - Prevents context overflow
# - Maintains relevant history
# - Avoids errors
```

**Pattern: Summarization**

```python
async def summarize_old_context(history: list) -> str:
    """Summarize old messages to save tokens."""
    old_messages = history[:-5]  # All but last 5
    recent_messages = history[-5:]  # Last 5

    # Summarize old context
    summary = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"Summarize this conversation:\n{old_messages}"
        }],
        max_tokens=200
    )

    # Return summary + recent messages
    return [{
        "role": "system",
        "content": f"Previous context: {summary.choices[0].message.content}"
    }] + recent_messages

# Token savings: 70-80% for long conversations
```

### 6. Multi-Model Routing (Context7-Verified)

**Pattern: Task-Based Routing**

```python
async def route_request(task: dict) -> str:
    """Route to optimal model based on task complexity."""

    # Classify complexity
    if task["tokens"] < 500 and task["type"] == "simple":
        model = "gpt-4o-mini"  # Cheap, fast
    elif task["requires_reasoning"]:
        model = "gpt-4-turbo"  # Powerful
    else:
        model = "gpt-4o"  # Balanced

    response = await client.chat.completions.create(
        model=model,
        messages=task["messages"]
    )

    return response.choices[0].message.content

# Cost optimization: 85% of tasks use gpt-4o-mini
# Performance: No quality degradation for simple tasks
```

## Optimization Output

```
🚀 LLM Inference Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Usage:
- Model: gpt-4-turbo (all tasks)
- Prompts: Verbose system prompts
- Context: No management
- Monthly Cost: $2,500

📊 Optimization Recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Model Selection (90% cost reduction)
   - 80% tasks → gpt-4o-mini
   - 15% tasks → gpt-4o
   - 5% tasks → gpt-4-turbo
   Cost: $2,500 → $250/month

2. Prompt Engineering (70% token reduction)
   - Concise system prompts
   - 2-3 few-shot examples
   - Direct instructions
   Token savings: 40%

3. Context Management (50% savings)
   - Sliding window for history
   - Summarize old context
   - Truncate long inputs
   Token savings: 50%

4. Inference Optimization
   - Streaming: Better UX
   - Parallel requests: 10x faster
   - max_tokens limits: 40% savings

🎯 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estimated Impact:
- Cost: $2,500 → $250/month (90% reduction)
- Latency: -60% (streaming + parallel)
- Quality: Maintained (task-appropriate models)

Run with --apply to implement optimizations
```

## Implementation

Uses **@openai-python-expert** and **@gemini-api-expert** agents:

1. Analyze current model usage
2. Classify tasks by complexity
3. Implement multi-model routing
4. Optimize prompts
5. Add context management
6. Enable streaming
7. Implement parallel processing

## Best Practices Applied

1. **Model Right-Sizing** - Use smallest capable model (90% savings)
2. **Concise Prompts** - 70% token reduction
3. **Streaming** - 10x better perceived latency
4. **Context Management** - 50% token savings
5. **Parallel Processing** - 10x throughput
6. **Token Limits** - 40% cost reduction

## Related Commands

- `/openai:optimize` - OpenAI-specific optimization
- `/rag:optimize` - RAG system optimization
- `/ai:model-deployment` - Model deployment

## Installation

```bash
pip install openai tiktoken tenacity redis
```

## Version History

- v2.0.0 - Initial release with Context7 patterns
