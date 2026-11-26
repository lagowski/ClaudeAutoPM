# nodejs:optimize

Optimize Node.js application performance with Context7-verified clustering, worker threads, and profiling techniques.

## Description

Comprehensive Node.js performance optimization following official best practices:
- Clustering for multi-core CPU utilization
- Worker threads for CPU-intensive tasks
- Performance monitoring and profiling
- Memory optimization techniques
- Event loop optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: nodejs.

## Usage

```bash
/nodejs:optimize [options]
```

## Options

- `--scope <cluster|workers|memory|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--framework <express|fastify|nestjs>` - Framework-specific optimization
- `--workers <count>` - Number of cluster workers (default: CPU count)

## Examples

### Full Application Optimization
```bash
/nodejs:optimize
```

### Add Clustering Support
```bash
/nodejs:optimize --scope cluster --workers 4
```

### Analyze Performance
```bash
/nodejs:optimize --analyze-only --output performance-report.md
```

### Framework-Specific Optimization
```bash
/nodejs:optimize --framework fastify
```

## Optimization Categories

### 1. Clustering for Multi-Core Utilization (Context7-Verified)

**Pattern from Context7 (/nodejs/node):**

#### Basic Cluster Setup
```javascript
import cluster from 'node:cluster';
import os from 'node:os';
import { createServer } from 'node:http';

const numCPUs = os.availableParallelism();

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers (one per CPU core)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Replace the dead worker
    cluster.fork();
  });
} else {
  // Workers share the same server port
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World\n');
  });

  server.listen(8000);
  console.log(`Worker ${process.pid} started`);
}
```

**Benefits:**
- Utilizes all CPU cores (4-8x throughput)
- Automatic load balancing across workers
- Zero-downtime restarts
- Fault tolerance (auto-restart on crash)

**Performance Impact:**
- Single process: 1,000 req/s
- 4 workers (4 cores): 3,800 req/s (3.8x)
- 8 workers (8 cores): 7,200 req/s (7.2x)

#### Advanced Cluster with Health Checks
```javascript
import cluster from 'node:cluster';
import os from 'node:os';

const numCPUs = os.availableParallelism();
const timeouts = [];

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Worker fork event (health check timeout)
  cluster.on('fork', (worker) => {
    timeouts[worker.id] = setTimeout(() => {
      console.error(`Worker ${worker.id} startup timeout - killing`);
      worker.kill();
    }, 5000); // 5 second startup timeout
  });

  // Worker listening event (clear health check)
  cluster.on('listening', (worker, address) => {
    clearTimeout(timeouts[worker.id]);
    console.log(`Worker ${worker.id} listening on ${address.port}`);
  });

  // Worker exit event (auto-restart)
  cluster.on('exit', (worker, code, signal) => {
    clearTimeout(timeouts[worker.id]);
    console.log(`Worker ${worker.id} died (${signal || code})`);

    // Restart the worker
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
      cluster.workers[id].disconnect();
    }

    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(0);
    }, 10000);
  });
} else {
  // Worker process
  const server = require('./app'); // Your Express/Fastify app

  server.listen(process.env.PORT || 3000);

  // Handle shutdown signal from primary
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      server.close(() => {
        console.log(`Worker ${process.pid} shutting down`);
        process.exit(0);
      });
    }
  });
}
```

**Benefits:**
- Health check timeouts (prevents hung workers)
- Graceful shutdown (finish existing requests)
- Auto-restart on failure
- Production-ready error handling

### 2. Worker Threads for CPU-Intensive Tasks (Context7-Verified)

**Pattern from Context7 (/nodejs/node):**

#### Basic Worker Thread Example
```javascript
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from 'node:worker_threads';

if (isMainThread) {
  // Main thread: Create worker for CPU-intensive task
  export default function parseJSAsync(script) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: script,
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
} else {
  // Worker thread: Process the data
  const { parse } = await import('some-js-parsing-library');
  const script = workerData;
  parentPort.postMessage(parse(script));
}
```

**Usage:**
```javascript
import parseJSAsync from './parser.js';

// Non-blocking CPU-intensive parsing
const result = await parseJSAsync(code);
```

**Benefits:**
- Non-blocking CPU-intensive operations
- Parallel processing (utilize multiple cores)
- Shared memory via SharedArrayBuffer
- Message-based communication

#### Worker Pool Pattern (Recommended)
```javascript
import { Worker } from 'node:worker_threads';
import os from 'node:os';

class WorkerPool {
  constructor(workerScript, poolSize = os.availableParallelism()) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.freeWorkers = [];
    this.taskQueue = [];

    this.initWorkers();
  }

  initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);
      this.freeWorkers.push(worker);

      worker.on('message', (result) => {
        this.onWorkerMessage(worker, result);
      });

      worker.on('error', (err) => {
        console.error(`Worker error:`, err);
      });
    }
  }

  async runTask(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      if (this.freeWorkers.length > 0) {
        const worker = this.freeWorkers.pop();
        worker.postMessage(data);
        worker._currentTask = task;
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  onWorkerMessage(worker, result) {
    const task = worker._currentTask;
    task.resolve(result);

    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      worker.postMessage(nextTask.data);
      worker._currentTask = nextTask;
    } else {
      this.freeWorkers.push(worker);
      worker._currentTask = null;
    }
  }

  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}

// Usage
const pool = new WorkerPool('./worker.js', 4);

// Process tasks in parallel
const results = await Promise.all([
  pool.runTask({ data: 'task1' }),
  pool.runTask({ data: 'task2' }),
  pool.runTask({ data: 'task3' }),
  pool.runTask({ data: 'task4' }),
]);
```

**Benefits:**
- Reuses workers (avoids creation overhead)
- Task queuing (handles backpressure)
- Parallel processing (4-8x faster for CPU tasks)
- Production-ready pattern

**Performance Impact:**
- Image processing: 1 image/s → 4 images/s (4-core)
- Data parsing: 100 records/s → 800 records/s (8-core)
- Computation: 10 calculations/s → 80 calculations/s (8-core)

### 3. Performance Monitoring (Context7-Verified)

**Pattern from Context7:**

#### Performance Hooks API
```javascript
import { performance, PerformanceObserver } from 'node:perf_hooks';

// Monitor HTTP server performance
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ['measure'] });

// Measure request processing time
function handleRequest(req, res) {
  performance.mark('request-start');

  // Process request
  processRequest(req, res);

  performance.mark('request-end');
  performance.measure(
    'request-processing',
    'request-start',
    'request-end'
  );
}
```

#### Worker Thread CPU Usage
```javascript
import { Worker } from 'node:worker_threads';

const worker = new Worker('./worker.js');

// Monitor worker CPU usage
const cpuUsage = await worker.cpuUsage();
console.log(`Worker CPU usage:`, cpuUsage);
// { user: 123456, system: 789012 } (microseconds)
```

#### Event Loop Monitoring
```javascript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log(`Event loop delay (ms):`);
  console.log(`  min: ${h.min / 1e6}`);
  console.log(`  max: ${h.max / 1e6}`);
  console.log(`  mean: ${h.mean / 1e6}`);
  console.log(`  p50: ${h.percentile(50) / 1e6}`);
  console.log(`  p99: ${h.percentile(99) / 1e6}`);
  h.reset();
}, 10000);
```

**Benefits:**
- Real-time performance metrics
- Event loop delay detection
- CPU usage monitoring
- Request timing analysis

### 4. Memory Optimization

#### Stream Processing (vs Loading Entire File)
```javascript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

// BEFORE: Load entire file into memory (high memory)
import { readFile } from 'node:fs/promises';

const data = await readFile('large-file.txt', 'utf8');
const lines = data.split('\n');
for (const line of lines) {
  processLine(line);
}
// Memory: 500 MB for 500 MB file

// AFTER: Stream processing (constant memory)
const fileStream = createReadStream('large-file.txt');
const rl = createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

for await (const line of rl) {
  processLine(line);
}
// Memory: ~10 MB (streaming buffer)
```

**Memory Savings:** 98% reduction (500 MB → 10 MB)

#### Backpressure Handling
```javascript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';

// Transform stream with backpressure handling
const transform = new Transform({
  transform(chunk, encoding, callback) {
    // Process chunk (automatic backpressure)
    const processed = processChunk(chunk);
    callback(null, processed);
  }
});

// Pipeline automatically handles backpressure
await pipeline(
  createReadStream('input.txt'),
  transform,
  createWriteStream('output.txt')
);
```

**Benefits:**
- Automatic backpressure (prevents memory overflow)
- Constant memory usage (regardless of file size)
- Pipeline error handling

### 5. Event Loop Optimization

#### Avoid Blocking Operations
```javascript
// BEFORE: Synchronous blocking operation
import { readFileSync } from 'node:fs';

function handleRequest(req, res) {
  const data = readFileSync('file.txt', 'utf8'); // ❌ BLOCKS EVENT LOOP
  res.send(data);
}

// AFTER: Asynchronous non-blocking
import { readFile } from 'node:fs/promises';

async function handleRequest(req, res) {
  const data = await readFile('file.txt', 'utf8'); // ✅ NON-BLOCKING
  res.send(data);
}
```

#### Break Up Long-Running Tasks
```javascript
// BEFORE: Long synchronous loop (blocks event loop)
function processLargeArray(array) {
  for (const item of array) {
    heavyComputation(item); // Blocks for 100ms each
  }
}
// 10,000 items × 100ms = 1,000 seconds of blocking

// AFTER: Process in batches with setImmediate
async function processLargeArray(array, batchSize = 100) {
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);

    for (const item of batch) {
      heavyComputation(item);
    }

    // Yield to event loop after each batch
    await new Promise(resolve => setImmediate(resolve));
  }
}
// Allows event loop to process other tasks between batches
```

**Benefits:**
- Responsive event loop (handle other requests)
- No request timeouts
- Better throughput under load

#### Use Worker Threads for CPU-Intensive Tasks
```javascript
// BETTER: Offload to worker thread
import { Worker } from 'node:worker_threads';

async function processLargeArray(array) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./process-worker.js', {
      workerData: array
    });

    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
// Main event loop remains responsive
```

## Optimization Output

```
🚀 Node.js Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: Express API
Node.js: v20.11.0
CPU Cores: 8

⚡ Clustering Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ No clustering detected
  Current: Single process (12.5% CPU utilization)

  💡 Recommendation: Add cluster module

  Expected Impact:
  - CPU Utilization: 12.5% → 95% (7.6x)
  - Throughput: 1,200 req/s → 9,000 req/s (7.5x)
  - Memory: 120 MB → 960 MB (8 workers × 120 MB)

🔧 Worker Threads Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Found 3 CPU-intensive operations in main thread

  Hotspots:
  1. imageProcessing() - 2.3s per request (blocks event loop)
  2. dataParser() - 1.8s per request (blocks event loop)
  3. encryption() - 0.9s per request (blocks event loop)

  💡 Recommendation: Move to worker thread pool

  Expected Impact:
  - Image processing: 1 req/s → 4 req/s (4 workers)
  - Event loop: Unblocked (responsive)
  - Throughput: +300% for CPU-intensive endpoints

💾 Memory Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Memory Usage: 450 MB

  ⚠️  Large file loading detected
  Files: routes/export.js:45, routes/import.js:78
  💡 Recommendation: Use stream processing
  ⚡ Impact: 380 MB savings (98% reduction)

  ⚠️  Memory leaks detected
  Potential leaks: 3 event listeners not removed
  💡 Recommendation: Clean up event listeners
  ⚡ Impact: Prevent memory growth over time

📊 Event Loop Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Event Loop Delay (p99): 234 ms (⚠️  HIGH)
  Target: < 50 ms

  Blocking Operations:
  1. Synchronous file reads: 12 occurrences
  2. JSON.parse() on large payloads: 5 occurrences
  3. Heavy computation in routes: 3 endpoints

  💡 Recommendations:
  1. Replace sync operations with async
  2. Stream JSON parsing for large payloads
  3. Move computation to worker threads

  Expected Impact: p99 delay: 234ms → 35ms (85% improvement)

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 8

  🔴 Critical: 1 (clustering)
  🟡 High Impact: 4 (worker threads, event loop)
  🟢 Medium Impact: 3 (memory, monitoring)

  Estimated Performance Improvement:
  - Throughput: +650% (1,200 → 9,000 req/s)
  - CPU Utilization: +660% (12.5% → 95%)
  - Memory: 98% reduction for file operations
  - Event loop: 85% faster (234ms → 35ms)

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@nodejs-backend-engineer** agent:

1. Query Context7 for Node.js optimization patterns
2. Analyze clustering setup (or lack thereof)
3. Detect CPU-intensive operations (worker thread candidates)
4. Check memory usage patterns (streams vs buffers)
5. Monitor event loop delay
6. Generate optimization recommendations
7. Optionally apply automated fixes

## Best Practices Applied

Based on Context7 documentation from `/nodejs/node`:

1. **Clustering** - Multi-core utilization (7-8x throughput)
2. **Worker Threads** - Parallel CPU-intensive tasks
3. **Performance Hooks** - Real-time monitoring
4. **Streaming** - Constant memory usage
5. **Event Loop** - Non-blocking operations

## Related Commands

- `/nodejs:api-scaffold` - Generate Node.js API
- `/api:optimize` - API-specific optimization
- `/docker:optimize` - Container optimization

## Troubleshooting

### Cluster Workers Not Starting
- Check port availability
- Verify worker startup timeout
- Ensure graceful error handling

### Worker Thread Errors
- Validate worker script path
- Check SharedArrayBuffer support
- Monitor worker memory usage

### High Event Loop Delay
- Profile with `--inspect`
- Check for synchronous operations
- Move CPU tasks to worker threads

## Installation

```bash
# Node.js built-in modules (no installation needed)
# - cluster
# - worker_threads
# - perf_hooks

# Optional: Advanced profiling
npm install clinic
npm install autocannon  # Load testing
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Clustering patterns for multi-core
- Worker threads for parallel processing
- Performance monitoring with perf_hooks

