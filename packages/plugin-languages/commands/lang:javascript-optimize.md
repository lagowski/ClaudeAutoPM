# javascript:optimize

Optimize JavaScript/TypeScript frontend performance with Context7-verified bundling, tree-shaking, and runtime optimization.

## Description

Comprehensive JavaScript performance optimization following web.dev best practices:
- Bundle optimization (code splitting, tree-shaking)
- Runtime performance (event loop, debouncing)
- Resource loading (lazy loading, preloading)
- Critical rendering path optimization
- Web Workers for background processing

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: javascript.

## Usage

```bash
/javascript:optimize [options]
```

## Options

- `--scope <bundle|runtime|resources|all>` - Optimization scope (default: all)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--bundler <webpack|vite|rollup>` - Bundler-specific optimization
- `--target <modern|legacy>` - Browser target (default: modern)

## Examples

### Full Application Optimization
```bash
/javascript:optimize
```

### Bundle Optimization Only
```bash
/javascript:optimize --scope bundle --bundler vite
```

### Analyze Performance
```bash
/javascript:optimize --analyze-only --output performance-report.md
```

### Modern Browsers Only
```bash
/javascript:optimize --target modern
```

## Optimization Categories

### 1. Bundle Optimization (Context7-Verified)

**Patterns from Context7 (/websites/web_dev_learn):**

#### Code Splitting
```javascript
// BEFORE: Single large bundle
import { heavyLibrary } from 'heavy-lib';
import { rareFeature } from './rare-feature';

function init() {
  heavyLibrary.setup();
  if (needsRareFeature) {
    rareFeature.run();
  }
}
// Bundle size: 850 KB

// AFTER: Dynamic imports (code splitting)
function init() {
  import('heavy-lib').then(({ heavyLibrary }) => {
    heavyLibrary.setup();
  });

  if (needsRareFeature) {
    import('./rare-feature').then(({ rareFeature }) => {
      rareFeature.run();
    });
  }
}
// Initial bundle: 150 KB (82% reduction)
// Lazy chunks: Loaded on demand
```

**Performance Impact:**
- Initial load: 850 KB → 150 KB (82% reduction)
- Time to Interactive: 3.2s → 0.9s (72% faster)
- First Contentful Paint: 1.8s → 0.5s (72% faster)

#### Tree Shaking (Webpack/Rollup)
```javascript
// library.js - Export multiple functions
export function usedFunction() {
  return 'used';
}

export function unusedFunction() {
  return 'never imported';
}

// app.js - Import only what you need
import { usedFunction } from './library';

console.log(usedFunction());

// Result: unusedFunction() is removed from bundle (dead code elimination)
```

**Configuration (package.json):**
```json
{
  "sideEffects": false
}
```

**Benefits:**
- Removes unused exports (20-40% smaller bundles)
- Works with ES6 modules
- Automatic dead code elimination

#### Minification and Uglification
```javascript
// BEFORE: Unminified JavaScript
export function injectScript() {
  const scriptElement = document.createElement('script');
  scriptElement.src = '/js/scripts.js';
  scriptElement.type = 'module';
  document.body.appendChild(scriptElement);
}
// Size: 180 bytes

// AFTER: Minified (Terser/UglifyJS)
export function injectScript(){const t=document.createElement("script");t.src="/js/scripts.js",t.type="module",document.body.appendChild(t)}
// Size: 126 bytes (30% reduction)
```

**Benefits:**
- 20-40% size reduction
- Faster parsing
- Automatic in production builds

### 2. Critical Rendering Path Optimization (Context7-Verified)

**Patterns from Context7 (/websites/web_dev_learn):**

#### Inline Critical CSS
```html
<head>
  <title>Page Title</title>
  <!-- Inline critical CSS (above-the-fold styles) -->
  <style>
    h1,h2{color:#000}h1{font-size:2em}h2{font-size:1.5em}
  </style>
</head>
<body>
  <!-- Page content -->

  <!-- Load non-critical CSS asynchronously -->
  <link rel="stylesheet" href="non-critical.css">
</body>
```

**Benefits:**
- Eliminates render-blocking CSS request
- Faster First Contentful Paint (FCP)
- Improved Largest Contentful Paint (LCP)

**Performance Impact:**
- FCP: 1.8s → 0.6s (67% faster)
- LCP: 2.4s → 1.1s (54% faster)

#### Defer Non-Critical JavaScript
```html
<!-- BEFORE: Render-blocking script -->
<script src="/script.js"></script>

<!-- AFTER: Deferred script -->
<script defer src="/script.js"></script>
```

**Benefits:**
- HTML parsing continues while script downloads
- Script executes after DOM is parsed
- Maintains execution order

**Script Loading Strategies:**
```html
<!-- Critical: Block parsing (use sparingly) -->
<script src="/critical.js"></script>

<!-- Non-critical: Defer execution -->
<script src="/non-critical.js" defer></script>

<!-- Analytics: Async (order doesn't matter) -->
<script src="/analytics.js" async></script>
```

#### Resource Hints
```html
<!-- Preconnect: Establish early connection -->
<link rel="preconnect" href="https://api.example.com">

<!-- DNS Prefetch: Resolve DNS early -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com">

<!-- Preload: High-priority resource -->
<link rel="preload" href="/styles/critical.css" as="style">

<!-- Prefetch: Low-priority future navigation -->
<link rel="prefetch" href="/page2.html" as="document">
```

**Benefits:**
- Faster resource loading (100-500ms savings)
- Reduced latency for API calls
- Improved navigation performance

### 3. Runtime Performance Optimization (Context7-Verified)

**Patterns from Context7:**

#### Debouncing Expensive Operations
```javascript
// Context7 Pattern: Debounce scroll/resize handlers
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage: Debounce scroll handler
const handleScroll = debounce(() => {
  console.log('Scroll handled');
  updateScrollPosition();
}, 200);

window.addEventListener('scroll', handleScroll);
```

**Benefits:**
- Reduces function calls by 90-95%
- Prevents event loop congestion
- Smoother scrolling/resizing

**Performance Impact:**
- Without debounce: 500 calls/second (event loop blocked)
- With debounce (200ms): 5 calls/second (smooth performance)

#### Lazy Loading with Intersection Observer
```javascript
// Context7 Pattern: Lazy load images
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.add('loaded');
      observer.unobserve(img);
    }
  });
});

// Apply to all images with data-src
document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

**HTML:**
```html
<img
  src="/images/placeholder.jpg"
  data-src="/images/actual-image.jpg"
  loading="lazy"
  alt="Description"
/>
```

**Benefits:**
- Images load only when visible
- Faster initial page load
- Reduced bandwidth usage

**Performance Impact:**
- Initial load: 2.5 MB → 0.3 MB (88% reduction)
- Page load time: 4.2s → 1.1s (74% faster)

#### Web Workers for Background Processing
```javascript
// Context7 Pattern: Offload heavy computation
// main.js
const worker = new Worker('/worker.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (event) => {
  console.log('Result:', event.data);
  updateUI(event.data);
};

// worker.js
self.onmessage = (event) => {
  const result = processData(event.data);
  self.postMessage(result);
};

function processData(data) {
  // Heavy computation (doesn't block main thread)
  return data.map(item => expensiveOperation(item));
}
```

**Benefits:**
- Main thread remains responsive
- Parallel processing
- No UI freezing during computation

**Performance Impact:**
- Without worker: UI frozen for 3 seconds
- With worker: UI responsive (computation in background)

#### Performance API for Measurement
```javascript
// Context7 Pattern: Measure custom timing
performance.mark('process-start');

// ... expensive operation
await processLargeDataset();

performance.mark('process-end');
performance.measure('process', 'process-start', 'process-end');

const measure = performance.getEntriesByName('process')[0];
console.log('Process took:', measure.duration, 'ms');
```

**Navigation Timing:**
```javascript
// Measure page load performance
const perfData = performance.getEntriesByType('navigation')[0];
console.log('DOM Load:', perfData.domContentLoadedEventEnd);
console.log('Full Load:', perfData.loadEventEnd);
```

### 4. Responsive Images Optimization

**Pattern from Context7:**

```html
<!-- Picture element with WebP -->
<picture>
  <source
    media="(min-width: 1200px)"
    srcset="/images/hero-large.webp"
    type="image/webp"
  />
  <source
    media="(min-width: 768px)"
    srcset="/images/hero-medium.webp"
    type="image/webp"
  />
  <img
    src="/images/hero-small.jpg"
    alt="Hero image"
    loading="lazy"
    width="800"
    height="600"
  />
</picture>
```

**Benefits:**
- Modern format (WebP): 30-50% smaller than JPEG
- Responsive sizing: Correct image for device
- Lazy loading: Deferred loading for below-fold images

**Performance Impact:**
- Image size: 1.2 MB → 0.4 MB (67% reduction)
- Mobile bandwidth savings: 80%

#### Prioritize LCP Image
```html
<!-- LCP image should NOT be lazy loaded -->
<img
  src="hero.jpg"
  alt="Main promotional image"
  fetchpriority="high"
>
```

**Benefits:**
- Prioritizes critical image loading
- Improves Largest Contentful Paint (LCP)
- Better Core Web Vitals score

### 5. Render-Blocking Resource Management

**Pattern from Context7:**

#### Mark Render-Blocking Resources
```html
<!-- Explicitly mark render-blocking (Chrome 105+) -->
<link rel="stylesheet" href="critical.css" blocking="render">
<script src="important.js" blocking="render"></script>
<style blocking="render">
  body { background-color: lightblue; }
</style>
```

#### Mark Non-Render-Blocking
```html
<!-- Make CSS non-render-blocking with media query -->
<link rel="stylesheet" href="print.css" media="print">
<link rel="stylesheet" href="large-screens.css" media="(min-width: 1200px)">
```

**Benefits:**
- Explicit control over rendering
- Parser continues processing
- Faster initial rendering

## Optimization Output

```
🎨 JavaScript/Frontend Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: React SPA
Bundler: Webpack 5.89.0
Target: Modern Browsers (ES2020)

📦 Bundle Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Bundle Size: 850 KB (uncompressed)
  Gzipped: 280 KB
  Target: < 200 KB (gzipped)

  ⚠️  Large bundle detected

  Top Contributors:
  1. moment.js - 72 KB (use date-fns: 92% smaller)
  2. lodash - 68 KB (use lodash-es: tree-shakeable)
  3. unused exports - 54 KB (enable tree-shaking)
  4. duplicate code - 38 KB (deduplicate dependencies)

  💡 Recommendations:
  1. Replace moment with date-fns → Save 66 KB
  2. Replace lodash with lodash-es → Save 50 KB
  3. Enable tree-shaking (sideEffects: false) → Save 54 KB
  4. Code splitting for routes → Initial: 150 KB (82% reduction)

  Expected Impact: 850 KB → 150 KB initial (82% reduction)

🚀 Critical Rendering Path
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ Render-blocking resources detected

  CSS:
  - /styles/main.css (42 KB, 320ms)
  - /styles/fonts.css (18 KB, 180ms)

  JavaScript:
  - /js/vendor.js (180 KB, 890ms)
  - /js/app.js (120 KB, 640ms)

  💡 Recommendations:
  1. Inline critical CSS → Save 500ms (FCP improvement)
  2. Defer non-critical JS → Save 1,530ms
  3. Preload critical resources → Save 200ms

  Expected Impact:
  - FCP: 1.8s → 0.6s (67% faster)
  - LCP: 2.4s → 1.1s (54% faster)

⚡ Runtime Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Performance issues detected

  1. Scroll handler without debounce
     File: components/Navbar.js:42
     Impact: 500 calls/second (blocks event loop)
     💡 Add debouncing (200ms)

  2. Heavy computation in main thread
     File: utils/dataProcessor.js:156
     Time: 2.3 seconds (UI frozen)
     💡 Move to Web Worker

  3. Large images not lazy loaded
     Count: 15 images (8 MB total)
     💡 Add lazy loading attribute

  Expected Impact:
  - Smooth scrolling (95% fewer calls)
  - Responsive UI (no freezing)
  - 88% faster initial load (lazy loading)

📊 Resource Loading
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Suboptimal resource loading

  Issues:
  1. Missing preconnect for API (api.example.com)
  2. Missing preload for LCP image
  3. No resource hints for external fonts

  💡 Recommendations:
  1. Add preconnect for API → Save 300ms
  2. Add preload for hero image → Save 200ms (LCP)
  3. Add dns-prefetch for fonts → Save 100ms

  Expected Impact: 600ms faster resource loading

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 14

  🔴 Critical: 2 (bundle size, render-blocking)
  🟡 High Impact: 6 (lazy loading, debouncing, workers)
  🟢 Medium Impact: 6 (resource hints, code splitting)

  Estimated Performance Improvement:
  - Bundle size: -82% (850 KB → 150 KB initial)
  - FCP: -67% (1.8s → 0.6s)
  - LCP: -54% (2.4s → 1.1s)
  - TTI: -72% (3.2s → 0.9s)

  Core Web Vitals:
  - LCP: 2.4s → 1.1s (✅ Good: < 2.5s)
  - FID: 80ms → 20ms (✅ Good: < 100ms)
  - CLS: 0.15 → 0.05 (✅ Good: < 0.1)

  Run with --apply to implement optimizations
```

## Implementation

This command uses the **@javascript-frontend-engineer** agent:

1. Query Context7 for JavaScript optimization patterns
2. Analyze bundle composition (Webpack Bundle Analyzer)
3. Check critical rendering path (render-blocking resources)
4. Detect performance anti-patterns (missing debouncing, lazy loading)
5. Validate resource loading (preload, preconnect, prefetch)
6. Generate optimization recommendations
7. Optionally apply automated fixes

## Best Practices Applied

Based on Context7 documentation from `/websites/web_dev_learn`:

1. **Code Splitting** - Reduce initial bundle size (82%)
2. **Tree Shaking** - Remove unused exports (20-40%)
3. **Debouncing** - Optimize event handlers (95% fewer calls)
4. **Lazy Loading** - Load resources on demand (88% savings)
5. **Web Workers** - Background processing (non-blocking)
6. **Resource Hints** - Faster resource loading (600ms savings)
7. **Critical CSS** - Eliminate render-blocking (67% faster FCP)

## Related Commands

- `/react:optimize` - React-specific optimization
- `/nextjs:optimize` - Next.js optimization
- `/bundle:analyze` - Bundle analysis

## Troubleshooting

### Large Bundle Size
- Enable tree-shaking (package.json: sideEffects: false)
- Use dynamic imports for code splitting
- Replace heavy libraries with lighter alternatives

### Slow First Paint
- Inline critical CSS
- Defer non-critical JavaScript
- Preload critical resources

### Blocked Event Loop
- Add debouncing to scroll/resize handlers
- Move heavy computation to Web Workers
- Use requestAnimationFrame for animations

## Installation

```bash
# Bundle analyzers
npm install --save-dev webpack-bundle-analyzer
npm install --save-dev rollup-plugin-visualizer

# Performance utilities
npm install --save-dev lighthouse
npm install --save-dev @bundle/cli

# Modern date library (replace moment)
npm install date-fns

# Tree-shakeable utilities (replace lodash)
npm install lodash-es
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Bundle optimization patterns
- Critical rendering path optimization
- Runtime performance best practices

