# openai:optimize

Optimize OpenAI API usage with Context7-verified async operations, batching, caching, and rate limiting strategies.

## Description

Comprehensive OpenAI API optimization following official best practices:
- Async/await for concurrent requests
- Batch processing for bulk operations
- Response caching strategies
- Rate limiting and retry logic
- Token usage optimization
- Streaming responses
- Function calling optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: openai.

## Usage

```bash
/openai:optimize [options]
```

## Options

- `--scope <async|batching|caching|rate-limiting|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--model <gpt-4|gpt-3.5-turbo>` - Target model for optimization

## Examples

### Full OpenAI Optimization
```bash
/openai:optimize
```

### Async Operations Only
```bash
/openai:optimize --scope async
```

### Batch Processing Optimization
```bash
/openai:optimize --scope batching
```

### Analyze Current Usage
```bash
/openai:optimize --analyze-only --output openai-report.md
```

## Optimization Categories

### 1. Async Operations (Context7-Verified)

**Pattern from Context7 (/openai/openai-python):**

#### AsyncOpenAI Client
```python
import asyncio
from openai import AsyncOpenAI

async def main():
    client = AsyncOpenAI()

    # Async streaming
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Explain quantum computing"}],
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)

    # Non-streaming async
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "What is Python?"}],
    )
    print(response.choices[0].message.content)

asyncio.run(main())
```

**Benefits:**
- Non-blocking I/O operations
- Concurrent request processing
- Better resource utilization

**Performance Impact:**
- Sequential requests: 10 × 2s = 20s
- Async concurrent: max(10 × 2s) = 2s (10x faster)

#### Concurrent Requests Pattern
```python
import asyncio
from openai import AsyncOpenAI

async def process_batch(prompts: list[str]) -> list[str]:
    client = AsyncOpenAI()

    async def get_completion(prompt: str) -> str:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    # Process all prompts concurrently
    tasks = [get_completion(prompt) for prompt in prompts]
    results = await asyncio.gather(*tasks)

    return results

# Usage
prompts = [
    "Summarize machine learning",
    "Explain neural networks",
    "What is deep learning?"
]

results = asyncio.run(process_batch(prompts))
```

**Performance Impact:**
- 3 sequential requests: 6 seconds
- 3 concurrent requests: 2 seconds (3x faster)

### 2. Batch Processing (Context7-Verified)

**Pattern from Context7 (/openai/openai-python):**

#### Create Batch Job
```python
from openai import OpenAI

client = OpenAI()

# Create JSONL file with batch requests
batch_requests = [
    {
        "custom_id": "request-1",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Explain Python"}],
            "max_tokens": 1000
        }
    },
    {
        "custom_id": "request-2",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "What is JavaScript?"}],
            "max_tokens": 1000
        }
    }
]

# Save to JSONL file
import json
with open("batch_requests.jsonl", "w") as f:
    for req in batch_requests:
        f.write(json.dumps(req) + "\n")

# Upload file
with open("batch_requests.jsonl", "rb") as f:
    batch_input_file = client.files.create(
        file=f,
        purpose="batch"
    )

# Create batch
batch = client.batches.create(
    input_file_id=batch_input_file.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
    metadata={"description": "Daily processing job"},
)

print(f"Batch ID: {batch.id}")
print(f"Status: {batch.status}")
```

**Benefits:**
- 50% cost reduction compared to synchronous API
- Automatic retries and error handling
- No rate limit concerns
- 24-hour processing window

**Performance Impact:**
- Synchronous: 1,000 requests × 2s = 2,000s (~33 minutes)
- Batch API: 1,000 requests processed within 24h, 50% cheaper

#### Monitor Batch Status
```python
# Retrieve batch status
batch = client.batches.retrieve("batch-abc123")

print(f"Total requests: {batch.request_counts.total}")
print(f"Completed: {batch.request_counts.completed}")
print(f"Failed: {batch.request_counts.failed}")
print(f"Status: {batch.status}")

# List all batches
batches = client.batches.list(limit=10)
for b in batches.data:
    print(f"{b.id}: {b.status}")

# Cancel batch if needed
if batch.status == "in_progress":
    cancelled = client.batches.cancel("batch-abc123")
    print(f"Cancelled: {cancelled.status}")
```

#### Retrieve Batch Results
```python
# Download results file
if batch.status == "completed":
    result_file_id = batch.output_file_id

    # Download file content
    file_response = client.files.content(result_file_id)

    # Parse JSONL results
    results = []
    for line in file_response.text.strip().split("\n"):
        result = json.loads(line)
        results.append(result)

    # Process results
    for result in results:
        custom_id = result["custom_id"]
        response = result["response"]
        content = response["body"]["choices"][0]["message"]["content"]
        print(f"{custom_id}: {content[:100]}...")
```

### 3. Response Caching (Context7-Verified)

**Pattern from Context7:**

#### In-Memory Cache
```python
from functools import lru_cache
from openai import OpenAI
import hashlib

client = OpenAI()

@lru_cache(maxsize=1000)
def get_cached_completion(prompt: str, model: str = "gpt-4o-mini") -> str:
    """
    Cache OpenAI completions using LRU cache.
    Identical prompts return cached results instantly.
    """
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

# Usage
result1 = get_cached_completion("Explain Python")  # API call
result2 = get_cached_completion("Explain Python")  # Cached (instant)
```

**Performance Impact:**
- First call: 2 seconds (API request)
- Cached calls: <1ms (1000x faster)

#### Redis Cache for Production
```python
import redis
import json
import hashlib
from openai import OpenAI

client = OpenAI()
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_cache_key(prompt: str, model: str) -> str:
    """Generate consistent cache key."""
    content = f"{prompt}:{model}"
    return f"openai:{hashlib.sha256(content.encode()).hexdigest()}"

def get_cached_completion_redis(
    prompt: str,
    model: str = "gpt-4o-mini",
    ttl: int = 3600  # 1 hour
) -> str:
    """
    Cache completions in Redis with TTL.
    """
    cache_key = get_cache_key(prompt, model)

    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return cached.decode('utf-8')

    # API call
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    result = response.choices[0].message.content

    # Store in cache
    redis_client.setex(cache_key, ttl, result)

    return result

# Usage
result = get_cached_completion_redis("What is AI?")  # API call or cached
```

**Benefits:**
- Persistent cache across application restarts
- TTL for automatic expiration
- Shared cache across multiple servers
- 99.9% latency reduction for cached queries

### 4. Rate Limiting and Retry Logic (Context7-Verified)

**Pattern from Context7:**

#### Exponential Backoff with Tenacity
```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
from openai import OpenAI, RateLimitError, APIError

client = OpenAI()

@retry(
    retry=retry_if_exception_type((RateLimitError, APIError)),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(5)
)
def get_completion_with_retry(prompt: str) -> str:
    """
    Automatically retry on rate limit errors with exponential backoff.

    Backoff schedule:
    - Attempt 1: Immediate
    - Attempt 2: 4s wait
    - Attempt 3: 8s wait
    - Attempt 4: 16s wait
    - Attempt 5: 32s wait
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

# Usage
try:
    result = get_completion_with_retry("Explain machine learning")
    print(result)
except Exception as e:
    print(f"Failed after 5 attempts: {e}")
```

**Benefits:**
- Automatic retry on transient errors
- Exponential backoff prevents API hammering
- Configurable retry attempts
- 95% success rate even under rate limits

#### Rate Limiter with Token Bucket
```python
import time
from threading import Lock
from openai import OpenAI

class RateLimiter:
    """
    Token bucket rate limiter for OpenAI API.
    """
    def __init__(self, requests_per_minute: int = 60):
        self.capacity = requests_per_minute
        self.tokens = requests_per_minute
        self.fill_rate = requests_per_minute / 60.0  # tokens per second
        self.last_update = time.time()
        self.lock = Lock()

    def acquire(self) -> None:
        """Wait if necessary to acquire a token."""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update

            # Refill tokens
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.fill_rate
            )
            self.last_update = now

            # Wait if no tokens available
            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.fill_rate
                time.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

# Usage
client = OpenAI()
limiter = RateLimiter(requests_per_minute=60)

def get_rate_limited_completion(prompt: str) -> str:
    limiter.acquire()  # Wait if rate limit reached

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

# Process many requests without hitting rate limits
prompts = ["Question " + str(i) for i in range(100)]
for prompt in prompts:
    result = get_rate_limited_completion(prompt)
    print(f"Processed: {prompt}")
```

**Performance Impact:**
- Without limiter: 429 errors, retries, delays
- With limiter: Smooth processing, 0 errors

### 5. Streaming Optimization (Context7-Verified)

**Pattern from Context7 (/openai/openai-python):**

#### Streaming Responses
```python
from openai import OpenAI

client = OpenAI()

def stream_completion(prompt: str) -> None:
    """
    Stream response chunks for better UX.
    Users see partial results immediately.
    """
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    print("Response: ", end="", flush=True)
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print()  # New line

# Usage
stream_completion("Write a long essay about AI")
```

**Benefits:**
- Time to first token: ~500ms vs 5s for full response
- Better perceived performance
- Progressive rendering
- Lower latency for user experience

#### Async Streaming
```python
import asyncio
from openai import AsyncOpenAI

async def async_stream_completion(prompt: str) -> None:
    client = AsyncOpenAI()

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    print("Response: ", end="", flush=True)
    async for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print()

# Usage
asyncio.run(async_stream_completion("Explain quantum computing"))
```

### 6. Token Optimization (Context7-Verified)

**Pattern from Context7:**

#### Token Counting
```python
import tiktoken
from openai import OpenAI

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Count tokens for a given text and model."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def optimize_prompt(prompt: str, max_tokens: int = 4000) -> str:
    """Truncate prompt to fit within token limit."""
    tokens = count_tokens(prompt)

    if tokens <= max_tokens:
        return prompt

    # Truncate to fit
    encoding = tiktoken.encoding_for_model("gpt-4o")
    encoded = encoding.encode(prompt)
    truncated = encoding.decode(encoded[:max_tokens])

    return truncated

# Usage
long_prompt = "..." * 10000
optimized = optimize_prompt(long_prompt, max_tokens=4000)
print(f"Original tokens: {count_tokens(long_prompt)}")
print(f"Optimized tokens: {count_tokens(optimized)}")
```

**Cost Impact:**
- GPT-4o: $5.00 per 1M input tokens
- Optimizing 10,000 requests from 8K → 4K tokens
- Savings: $200 per day

#### Response Format Optimization
```python
from openai import OpenAI
import json

client = OpenAI()

def get_structured_output(prompt: str) -> dict:
    """
    Use structured outputs to reduce token usage.
    JSON mode is more token-efficient than prose.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Respond in JSON format."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)

# Usage
result = get_structured_output("List 3 programming languages with their use cases")
# Returns: {"languages": [{"name": "Python", "use_case": "..."}, ...]}
```

**Token Savings:** 30-50% compared to prose format

### 7. Function Calling Optimization (Context7-Verified)

**Pattern from Context7:**

#### Efficient Function Definitions
```python
from openai import OpenAI
import json

client = OpenAI()

# Define functions concisely
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                },
                "required": ["location"]
            }
        }
    }
]

def call_function_optimized(prompt: str) -> str:
    """Use function calling with minimal token overhead."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        tools=tools,
        tool_choice="auto",  # Let model decide when to call
    )

    message = response.choices[0].message

    if message.tool_calls:
        # Function was called
        tool_call = message.tool_calls[0]
        function_args = json.loads(tool_call.function.arguments)
        return f"Function called: {tool_call.function.name} with {function_args}"
    else:
        # Direct response
        return message.content

# Usage
result = call_function_optimized("What's the weather in London?")
```

**Benefits:**
- Structured outputs without parsing
- Reduced prompt engineering
- Type-safe function calls
- 20-40% token savings vs prompt-based extraction

## Optimization Output

```
🤖 OpenAI API Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: AI Application
Current Usage: 1M tokens/day
Monthly Cost: $150

📊 Current Performance Baseline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Request Pattern:
  - Sequential requests: 500/day
  - Average latency: 2s per request
  - Total time: 1,000s (~16.7 minutes/day)

  Rate Limiting:
  - 429 errors: 15% of requests
  - Retry overhead: +30% latency

  Caching:
  - Cache hit rate: 0% (no caching)
  - Duplicate requests: 40%

⚡ Async Operations Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Sequential execution
  Recommended: AsyncOpenAI with concurrent requests

  💡 Impact:
  - 500 sequential: 1,000s (~16.7 min)
  - 500 concurrent (10 at a time): 100s (~1.7 min)
  - Speedup: 10x faster (15 minutes saved/day)

  AsyncOpenAI pattern configured ✓

📦 Batch Processing Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Using synchronous API for bulk operations
  Current: 100 bulk requests/day at standard pricing

  💡 Recommendations:
  1. Use Batch API for bulk operations → 50% cost reduction
  2. 24-hour processing window → No rate limit concerns
  3. Automatic retries → Improved reliability

  Batch API integration configured ✓

  ⚡ Impact:
  - Cost: $75/day → $37.50/day (50% savings)
  - Monthly savings: $1,125
  - Reliability: 95% → 99.9%

💾 Response Caching Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  No caching implemented
  Duplicate requests: 40% (200/day)

  💡 Recommendations:
  1. Redis cache with 1-hour TTL → 99.9% latency reduction
  2. LRU cache for in-memory → Instant responses
  3. Cache invalidation strategy → Fresh data when needed

  Redis caching configured ✓

  ⚡ Impact:
  - Cached requests: 200/day
  - Latency: 2s → <1ms (2000x faster)
  - Cost reduction: 40% fewer API calls
  - Monthly savings: $600

⏱️ Rate Limiting Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  No rate limiting, frequent 429 errors
  Current: 15% error rate, 30% retry overhead

  💡 Recommendations:
  1. Token bucket rate limiter → Smooth request flow
  2. Exponential backoff → Smart retry logic
  3. 60 requests/minute limit → Zero 429 errors

  Rate limiter + retry logic configured ✓

  ⚡ Impact:
  - 429 errors: 15% → 0%
  - Retry overhead: 30% → 0%
  - Reliability: 85% → 100%

🌊 Streaming Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Using non-streaming responses
  Time to first token: 5s (full response wait)

  💡 Recommendation: Enable streaming for long responses

  ⚡ Impact:
  - Time to first token: 5s → 500ms (10x faster perceived)
  - Better UX: Progressive rendering
  - Reduced user wait time: 90%

🎯 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 18

  🔴 Critical: 5 (async, batching, caching, rate limiting, streaming)
  🟡 High Impact: 8 (token optimization, function calling)
  🟢 Low Impact: 5 (monitoring, logging)

  Performance Improvements:

  Latency:
  - Sequential processing: 16.7 min/day → 1.7 min/day (10x faster)
  - Cached requests: 2s → <1ms (2000x faster)
  - Time to first token: 5s → 500ms (10x faster perceived)

  Cost Savings:
  - Batch API: 50% reduction ($1,125/month)
  - Caching: 40% fewer API calls ($600/month)
  - Token optimization: 30% reduction ($450/month)
  - Total monthly savings: $2,175 (48% reduction)

  Reliability:
  - 429 errors: 15% → 0%
  - Success rate: 85% → 99.9%
  - Retry overhead: 30% → 0%

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@openai-python-expert** agent with optimization expertise:

1. Query Context7 for OpenAI optimization patterns
2. Analyze current API usage patterns
3. Identify async opportunities
4. Configure batch processing
5. Implement caching strategy
6. Setup rate limiting
7. Generate optimized code

## Best Practices Applied

Based on Context7 documentation from `/openai/openai-python`:

1. **AsyncOpenAI** - Concurrent request processing (10x faster)
2. **Batch API** - 50% cost reduction for bulk operations
3. **Redis Caching** - 99.9% latency reduction for duplicates
4. **Rate Limiting** - Zero 429 errors with token bucket
5. **Exponential Backoff** - Smart retry logic
6. **Streaming** - 10x faster time to first token
7. **Token Optimization** - 30% cost reduction

## Related Commands

- `/ai:model-deployment` - AI model deployment
- `/rag:setup-scaffold` - RAG system setup
- `/llm:optimize` - General LLM optimization

## Troubleshooting

### 429 Rate Limit Errors
- Implement token bucket rate limiter
- Use exponential backoff with tenacity
- Consider Batch API for bulk operations

### High Latency
- Enable async operations with AsyncOpenAI
- Implement Redis caching for duplicates
- Use streaming for long responses

### High Costs
- Use Batch API (50% discount)
- Implement caching (40% reduction)
- Optimize token usage (30% reduction)
- Use gpt-4o-mini for simpler tasks

### Timeout Errors
- Increase timeout in AsyncOpenAI client
- Break large requests into smaller chunks
- Use streaming to avoid timeouts

## Installation

```bash
# Install OpenAI Python SDK
pip install openai

# Install optimization dependencies
pip install tenacity tiktoken redis

# Install async support
pip install aiohttp asyncio
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- AsyncOpenAI patterns for concurrent processing
- Batch API integration for 50% cost reduction
- Redis caching for duplicate request optimization
- Rate limiting with token bucket algorithm
- Streaming response optimization
- Token counting and optimization utilities
