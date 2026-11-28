# python:optimize

Optimize Python application performance with Context7-verified profiling, async patterns, and best practices.

## Description

Comprehensive Python performance optimization following official best practices:
- Profiling with Pyinstrument (sampling profiler)
- Async/await patterns for I/O operations
- Memory optimization techniques
- Type hints for runtime performance
- Production-ready FastAPI optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: python, pyinstrument, fastapi.

## Usage

```bash
/python:optimize [options]
```

## Options

- `--scope <profile|async|memory|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--framework <fastapi|flask|django>` - Framework-specific optimization
- `--profile-requests` - Add profiling middleware for requests

## Examples

### Full Application Optimization
```bash
/python:optimize
```

### Profile Existing Application
```bash
/python:optimize --scope profile --framework fastapi
```

### Analyze Performance Without Changes
```bash
/python:optimize --analyze-only --output performance-report.md
```

### Add Request Profiling
```bash
/python:optimize --profile-requests --framework fastapi
```

## Optimization Categories

### 1. Profiling with Pyinstrument (Context7-Verified)

**Pattern from Context7 (/joerick/pyinstrument):**

#### Command-Line Profiling
```bash
# Profile a Python script
pyinstrument script.py

# Profile a module
pyinstrument -m module_name

# Output to HTML
pyinstrument -o profile.html script.py

# Output to Speedscope (interactive flamechart)
pyinstrument -r speedscope script.py
```

#### Python API - Profiler Class
```python
from pyinstrument import Profiler

profiler = Profiler()
profiler.start()

# Code you want to profile
expensive_operation()

profiler.stop()
profiler.print()
```

#### Context Manager Pattern
```python
from pyinstrument import Profiler

with Profiler() as profiler:
    # Code you want to profile
    process_data()

profiler.print()
```

#### Decorator Pattern
```python
import pyinstrument

@pyinstrument.profile()
def my_function():
    # Automatically profiled
    expensive_computation()
```

**Benefits:**
- Statistical sampling (low overhead, 0.1-1% slowdown)
- Call stack visualization
- Timeline mode for temporal analysis
- Async code support (v4.0.0+)

### 2. FastAPI Request Profiling (Production-Ready)

**Pattern from Context7 (/joerick/pyinstrument):**

```python
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from pyinstrument import Profiler

app = FastAPI()
PROFILING = True  # Set from environment/config

if PROFILING:
    @app.middleware("http")
    async def profile_request(request: Request, call_next):
        # Check for ?profile=1 query parameter
        profiling = request.query_params.get("profile", False)
        if profiling:
            profiler = Profiler(interval=0.001, async_mode="enabled")
            profiler.start()

            response = await call_next(request)

            profiler.stop()
            return HTMLResponse(profiler.output_html())
        else:
            return await call_next(request)

# Usage: http://localhost:8000/api/endpoint?profile=1
```

**Benefits:**
- Zero code changes to endpoints
- On-demand profiling via query parameter
- HTML report in browser
- Production-safe (controlled by feature flag)

### 3. Flask Request Profiling

**Pattern from Context7:**

```python
from flask import Flask, g, make_response, request
from pyinstrument import Profiler

app = Flask(__name__)

@app.before_request
def before_request():
    if "profile" in request.args:
        g.profiler = Profiler()
        g.profiler.start()

@app.after_request
def after_request(response):
    if not hasattr(g, "profiler"):
        return response
    g.profiler.stop()
    output_html = g.profiler.output_html()
    return make_response(output_html)

# Usage: http://localhost:5000/api/endpoint?profile=1
```

### 4. Django Request Profiling

**Pattern from Context7:**

#### Add Middleware (settings.py)
```python
# settings.py
MIDDLEWARE = [
    # ... other middleware
    'pyinstrument.middleware.ProfilerMiddleware',
]

# Optional: Configure profile directory
PYINSTRUMENT_PROFILE_DIR = 'profiles'
```

**Usage:**
```bash
# Profile a request
http://localhost:8000/api/endpoint/?profile

# Automatically saves HTML to profiles/ directory
```

### 5. Async Code Profiling (v4.0.0+)

**Pattern from Context7:**

```python
import asyncio
from pyinstrument import Profiler

async def main():
    profiler = Profiler(async_mode='enabled')

    with profiler:
        print('Processing...')
        await asyncio.sleep(1)
        await fetch_data()
        await process_results()

    profiler.print()

asyncio.run(main())
```

**Result:**
```
  _     ._   __/__   _ _  _  _ _/_   Recorded: 10:15:23  Samples:  100
 /_//_/// /_\ / //_// / //_'/ //     Duration: 1.234     CPU time: 0.456
/   _/                      v4.0.0

Program: main.py

1.234 main  main.py:1
└─ 1.000 asyncio.sleep
   └─ 0.234 fetch_data
      └─ 0.123 process_results
```

**Benefits:**
- Correctly attributes time spent in await
- Shows async call hierarchy
- Identifies I/O bottlenecks

### 6. Pytest Auto-Profiling

**Pattern from Context7:**

```python
# conftest.py
from pathlib import Path
import pytest
from pyinstrument import Profiler

TESTS_ROOT = Path.cwd()

@pytest.fixture(autouse=True)
def auto_profile(request):
    PROFILE_ROOT = (TESTS_ROOT / ".profiles")

    # Turn profiling on
    profiler = Profiler()
    profiler.start()

    yield  # Run test

    profiler.stop()
    PROFILE_ROOT.mkdir(exist_ok=True)
    results_file = PROFILE_ROOT / f"{request.node.name}.html"
    profiler.write_html(results_file)
```

**Result:**
```
pytest test_api.py
# Creates .profiles/test_api_endpoint.html for each test
```

### 7. Memory Optimization Patterns

#### List Comprehensions vs Generator Expressions
```python
# BEFORE: List comprehension (loads entire list into memory)
squares = [x**2 for x in range(1000000)]  # 8 MB memory
total = sum(squares)

# AFTER: Generator expression (lazy evaluation)
squares = (x**2 for x in range(1000000))  # ~200 bytes
total = sum(squares)
```

**Memory Savings:** 99.998% reduction (8 MB → 200 bytes)

#### Use __slots__ for Classes with Many Instances
```python
# BEFORE: Default __dict__ for attributes
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

# Memory: ~280 bytes per instance

# AFTER: __slots__ for fixed attributes
class Point:
    __slots__ = ['x', 'y']

    def __init__(self, x, y):
        self.x = x
        self.y = y

# Memory: ~48 bytes per instance
```

**Memory Savings:** 83% reduction (280 bytes → 48 bytes per instance)

**Impact for 1 million instances:**
- Before: 280 MB
- After: 48 MB
- Savings: 232 MB (83%)

### 8. Async I/O Optimization

#### Async Database Queries
```python
# BEFORE: Synchronous queries (blocking)
def get_users():
    user1 = db.query("SELECT * FROM users WHERE id = 1")
    user2 = db.query("SELECT * FROM users WHERE id = 2")
    user3 = db.query("SELECT * FROM users WHERE id = 3")
    return [user1, user2, user3]
# Time: 300ms (3 × 100ms sequential)

# AFTER: Async queries (parallel)
import asyncio

async def get_users():
    tasks = [
        db.async_query("SELECT * FROM users WHERE id = 1"),
        db.async_query("SELECT * FROM users WHERE id = 2"),
        db.async_query("SELECT * FROM users WHERE id = 3")
    ]
    return await asyncio.gather(*tasks)
# Time: 100ms (parallel execution)
```

**Performance Improvement:** 3x faster (300ms → 100ms)

#### Async HTTP Requests
```python
# BEFORE: Synchronous requests
import requests

def fetch_apis():
    data1 = requests.get("https://api1.com/data").json()
    data2 = requests.get("https://api2.com/data").json()
    data3 = requests.get("https://api3.com/data").json()
    return [data1, data2, data3]
# Time: 1500ms (3 × 500ms sequential)

# AFTER: Async requests
import httpx
import asyncio

async def fetch_apis():
    async with httpx.AsyncClient() as client:
        tasks = [
            client.get("https://api1.com/data"),
            client.get("https://api2.com/data"),
            client.get("https://api3.com/data")
        ]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
# Time: 500ms (parallel execution)
```

**Performance Improvement:** 3x faster (1500ms → 500ms)

### 9. Type Hints for Runtime Performance

#### Use typing.TYPE_CHECKING for Import Optimization
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Imports only used for type checking (removed at runtime)
    from expensive_module import HeavyClass

def process_data(obj: 'HeavyClass') -> None:
    # Runtime has no import overhead
    pass
```

**Benefits:**
- Faster imports (no runtime overhead)
- Reduced memory usage
- IDE still has full type information

#### Use typing.Protocol for Structural Typing
```python
from typing import Protocol

# BEFORE: Abstract base class (runtime inheritance)
from abc import ABC, abstractmethod

class Drawable(ABC):
    @abstractmethod
    def draw(self) -> None:
        pass

# AFTER: Protocol (no runtime overhead)
class Drawable(Protocol):
    def draw(self) -> None:
        ...

def render(obj: Drawable) -> None:
    obj.draw()  # Type-safe, no runtime check
```

**Benefits:**
- Zero runtime overhead
- Duck typing with type safety
- Faster isinstance checks

## Optimization Output

```
🐍 Python Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: FastAPI Application
Framework: FastAPI 0.109.0
Python: 3.11.7

📊 Profiling Analysis (Pyinstrument)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Time: 1.234s
  CPU Time: 0.456s

  Top 5 Hotspots:
  1. process_data() - 0.345s (28%) - api/handlers.py:42
  2. database.query() - 0.234s (19%) - db/queries.py:156
  3. json.dumps() - 0.156s (13%) - api/responses.py:23
  4. validate_input() - 0.123s (10%) - api/validation.py:67
  5. asyncio.sleep() - 0.100s (8%) - async operations

  💡 Recommendations:
  1. Cache process_data() results → Save ~0.3s per request
  2. Use async database queries → 3x faster (parallel execution)
  3. Use orjson instead of json → 2-3x faster serialization
  4. Move validation to Pydantic models → 30% faster

⚡ Async/Await Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Found 5 synchronous I/O operations in async context

  Files:
  - api/handlers.py:42 - requests.get() (blocking)
  - api/handlers.py:67 - db.query() (blocking)
  - api/services.py:89 - time.sleep() (blocking)

  💡 Recommendations:
  1. Replace requests with httpx.AsyncClient
  2. Use asyncpg for database (3x faster)
  3. Replace time.sleep() with asyncio.sleep()

  ⚡ Expected Impact: 3x faster request handling

💾 Memory Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Memory Usage: 145 MB

  ⚠️  Large list comprehensions detected
  Files: api/processing.py:234, api/export.py:156
  💡 Recommendation: Use generator expressions
  ⚡ Impact: 80 MB savings

  ⚠️  Classes without __slots__
  Classes: Point, Coordinate, DataPoint (12,000+ instances)
  💡 Recommendation: Add __slots__
  ⚡ Impact: 35 MB savings

  Total Potential Savings: 115 MB (79%)

🎯 Type Hints Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Type hints coverage: 87%
  ⚠️  Heavy imports at runtime detected

  Files: api/models.py, api/handlers.py
  💡 Recommendation: Use TYPE_CHECKING
  ⚡ Impact: 15% faster imports

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 12

  🔴 Critical: 2 (blocking I/O in async)
  🟡 High Impact: 5 (memory, async)
  🟢 Low Impact: 5 (type hints, caching)

  Estimated Performance Improvement:
  - Request time: -60% (1.2s → 0.5s)
  - Memory usage: -79% (145 MB → 30 MB)
  - Import time: -15%

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@python-backend-engineer** agent with profiling expertise:

1. Query Context7 for Python optimization patterns
2. Run Pyinstrument profiler on application
3. Analyze async/await usage
4. Check memory patterns (generators, __slots__)
5. Validate type hints usage
6. Generate optimization recommendations
7. Optionally apply automated fixes

## Best Practices Applied

Based on Context7 documentation from `/joerick/pyinstrument`:

1. **Pyinstrument Profiling** - Statistical sampling with low overhead
2. **Async/Await** - Parallel I/O operations
3. **Generator Expressions** - Memory-efficient iteration
4. **__slots__** - Reduce memory for many instances
5. **TYPE_CHECKING** - Zero-overhead type hints
6. **Request Profiling** - Production-safe on-demand profiling

## Related Commands

- `/python:api-scaffold` - Generate FastAPI application
- `/api:optimize` - API-specific optimization
- `/test:performance` - Performance testing

## Troubleshooting

### Pyinstrument Not Capturing Async Code
- Ensure using v4.0.0+
- Set `async_mode='enabled'`
- Verify async/await usage

### High Memory Usage
- Check for list comprehensions (use generators)
- Add __slots__ to classes with many instances
- Profile with `tracemalloc` module

### Slow Imports
- Move heavy imports inside functions
- Use TYPE_CHECKING for type-only imports
- Check for circular imports

## Installation

```bash
# Install Pyinstrument
pip install pyinstrument

# Install async HTTP client
pip install httpx

# Install async database driver (PostgreSQL)
pip install asyncpg
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Pyinstrument profiling patterns
- FastAPI async optimization
- Memory optimization techniques

