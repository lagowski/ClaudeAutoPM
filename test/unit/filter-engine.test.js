/**
 * FilterEngine Tests - TDD Test Suite
 *
 * Tests for applying filters and search to PRD/Epic/Task collections
 * with frontmatter metadata.
 *
 * @jest-environment node
 */

const FilterEngine = require('../../lib/filter-engine');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('FilterEngine - Basic Initialization', () => {
  let engine;

  beforeEach(() => {
    engine = new FilterEngine();
  });

  test('should create instance successfully', () => {
    expect(engine).toBeInstanceOf(FilterEngine);
  });

  test('should accept basePath in constructor', () => {
    const customEngine = new FilterEngine({ basePath: '/custom/path' });
    expect(customEngine).toBeInstanceOf(FilterEngine);
  });

  test('should have loadFiles method', () => {
    expect(typeof engine.loadFiles).toBe('function');
  });

  test('should have filter method', () => {
    expect(typeof engine.filter).toBe('function');
  });

  test('should have search method', () => {
    expect(typeof engine.search).toBe('function');
  });

  test('should have loadAndFilter method', () => {
    expect(typeof engine.loadAndFilter).toBe('function');
  });
});

describe('FilterEngine - File Loading', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should load files from directory', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: Test PRD
status: active
priority: high
created: 2025-01-01
---

# Test Content
`);

    const files = await engine.loadFiles(prdsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toHaveProperty('path');
    expect(files[0]).toHaveProperty('frontmatter');
    expect(files[0]).toHaveProperty('content');
  });

  test('should parse frontmatter correctly', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: Authentication API
status: active
priority: P0
created: 2025-01-15
author: john
---

# Authentication API
This is the content.
`);

    const files = await engine.loadFiles(prdsDir);
    expect(files[0].frontmatter).toEqual({
      id: 'prd-001',
      title: 'Authentication API',
      status: 'active',
      priority: 'P0',
      created: '2025-01-15',
      author: 'john'
    });
  });

  test('should extract content without frontmatter', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: Test
---

# Heading
Content here.
`);

    const files = await engine.loadFiles(prdsDir);
    expect(files[0].content).toBe('# Heading\nContent here.\n');
  });

  test('should handle multiple files', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: PRD 1
---
Content 1
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
title: PRD 2
---
Content 2
`);

    const files = await engine.loadFiles(prdsDir);
    expect(files).toHaveLength(2);
  });

  test('should return empty array for non-existent directory', async () => {
    const files = await engine.loadFiles(path.join(testDir, 'nonexistent'));
    expect(files).toEqual([]);
  });

  test('should skip non-markdown files', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
---
`);
    fs.writeFileSync(path.join(prdsDir, 'README.txt'), 'Not a markdown file');

    const files = await engine.loadFiles(prdsDir);
    expect(files).toHaveLength(1);
    expect(files[0].frontmatter.id).toBe('prd-001');
  });

  test('should handle malformed frontmatter gracefully', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
invalid yaml content: [unclosed
---
Content
`);

    const files = await engine.loadFiles(prdsDir);
    expect(files).toHaveLength(1);
    // Invalid YAML reads as flat key: value strings, like every lib/ reader (#867)
    expect(files[0].frontmatter).toEqual({ 'invalid yaml content': '[unclosed' });
  });
});

describe('FilterEngine - Status Filtering', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    // Create test files
    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: Active PRD
status: active
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
title: Draft PRD
status: draft
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
title: Completed PRD
status: completed
---
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter by status: active', async () => {
    const filtered = await engine.filter(files, { status: 'active' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should filter by status: draft', async () => {
    const filtered = await engine.filter(files, { status: 'draft' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-002');
  });

  test('should filter by status: completed', async () => {
    const filtered = await engine.filter(files, { status: 'completed' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-003');
  });

  test('should return empty array for non-matching status', async () => {
    const filtered = await engine.filter(files, { status: 'archived' });
    expect(filtered).toHaveLength(0);
  });
});

describe('FilterEngine - Priority Filtering', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
priority: P0
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
priority: high
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
priority: low
---
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter by priority: P0', async () => {
    const filtered = await engine.filter(files, { priority: 'P0' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should filter by priority: high', async () => {
    const filtered = await engine.filter(files, { priority: 'high' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-002');
  });

  test('should filter by priority: low', async () => {
    const filtered = await engine.filter(files, { priority: 'low' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-003');
  });
});

describe('FilterEngine - Multiple Criteria (AND Logic)', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
status: active
priority: high
epic: epic-001
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
status: active
priority: low
epic: epic-001
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
status: draft
priority: high
epic: epic-002
---
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter by multiple criteria (status AND priority)', async () => {
    const filtered = await engine.filter(files, {
      status: 'active',
      priority: 'high'
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should filter by three criteria (status AND priority AND epic)', async () => {
    const filtered = await engine.filter(files, {
      status: 'active',
      priority: 'high',
      epic: 'epic-001'
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should return empty for non-matching combination', async () => {
    const filtered = await engine.filter(files, {
      status: 'draft',
      priority: 'low'
    });
    expect(filtered).toHaveLength(0);
  });
});

describe('FilterEngine - Date Range Filtering', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
created: 2025-01-15
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
created: 2025-06-20
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
created: 2025-12-10
---
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter by created-after', async () => {
    const filtered = await engine.filter(files, {
      'created-after': '2025-06-01'
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map(f => f.frontmatter.id)).toContain('prd-002');
    expect(filtered.map(f => f.frontmatter.id)).toContain('prd-003');
  });

  test('should filter by created-before', async () => {
    const filtered = await engine.filter(files, {
      'created-before': '2025-06-01'
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should filter by date range (created-after AND created-before)', async () => {
    const filtered = await engine.filter(files, {
      'created-after': '2025-01-01',
      'created-before': '2025-07-01'
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map(f => f.frontmatter.id)).toContain('prd-001');
    expect(filtered.map(f => f.frontmatter.id)).toContain('prd-002');
  });

  test('should handle updated-after filter', async () => {
    const prdsDir = path.join(testDir, 'prds');

    fs.writeFileSync(path.join(prdsDir, 'prd-004.md'), `---
id: prd-004
updated: 2025-08-15
---
`);

    files = await engine.loadFiles(prdsDir);
    const filtered = await engine.filter(files, {
      'updated-after': '2025-08-01'
    });
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe('FilterEngine - Full-Text Search', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
title: User Authentication
---

# User Authentication API

Implement OAuth2 authentication system.
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
title: Data Validation
---

# Data Validation

Add input validation for user forms.
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
title: API Gateway
---

# API Gateway

Create centralized API gateway with authentication.
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should search in content', async () => {
    const results = await engine.search(files, 'authentication');
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map(r => r.frontmatter.id);
    expect(ids).toContain('prd-001');
    expect(ids).toContain('prd-003');
  });

  test('should search in frontmatter', async () => {
    const results = await engine.search(files, 'Data Validation');
    expect(results).toHaveLength(1);
    expect(results[0].frontmatter.id).toBe('prd-002');
  });

  test('should be case-insensitive', async () => {
    const results = await engine.search(files, 'AUTHENTICATION');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle multi-word search', async () => {
    const results = await engine.search(files, 'OAuth2 authentication');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].frontmatter.id).toBe('prd-001');
  });

  test('should return empty array for no matches', async () => {
    const results = await engine.search(files, 'nonexistent term');
    expect(results).toHaveLength(0);
  });

  test('should include match context in results', async () => {
    const results = await engine.search(files, 'OAuth2');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('matches');
    expect(Array.isArray(results[0].matches)).toBe(true);
  });
});

describe('FilterEngine - Combined Filter and Search', () => {
  let testDir;
  let engine;
  let files;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });

    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
status: active
priority: high
---
Authentication API with OAuth2
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
status: active
priority: low
---
User profile management
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-003.md'), `---
id: prd-003
status: draft
priority: high
---
Gateway with authentication
`);

    files = await engine.loadFiles(prdsDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should combine filters and search', async () => {
    const filtered = await engine.filter(files, {
      status: 'active',
      search: 'authentication'
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });

  test('should apply filter before search', async () => {
    const filtered = await engine.filter(files, {
      priority: 'high',
      search: 'API'
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].frontmatter.id).toBe('prd-001');
  });
});

describe('FilterEngine - loadAndFilter Integration', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should load and filter in one call', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
status: active
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
status: draft
---
`);

    const results = await engine.loadAndFilter('prds', { status: 'active' });
    expect(results).toHaveLength(1);
    expect(results[0].frontmatter.id).toBe('prd-001');
  });
});

describe('FilterEngine - Performance', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should handle 100 files efficiently', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    // Create 100 test files
    for (let i = 1; i <= 100; i++) {
      const status = i % 3 === 0 ? 'active' : 'draft';
      fs.writeFileSync(path.join(prdsDir, `prd-${String(i).padStart(3, '0')}.md`), `---
id: prd-${String(i).padStart(3, '0')}
status: ${status}
priority: P${i % 4}
---
Content for PRD ${i}
`);
    }

    const start = Date.now();
    const files = await engine.loadFiles(prdsDir);
    const filtered = await engine.filter(files, { status: 'active' });
    const elapsed = Date.now() - start;

    expect(files).toHaveLength(100);
    expect(filtered.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500); // Should complete in < 500ms
  }, 10000);

  test('should search 100 files efficiently', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    // Create 100 test files
    for (let i = 1; i <= 100; i++) {
      const hasAuth = i % 10 === 0;
      fs.writeFileSync(path.join(prdsDir, `prd-${String(i).padStart(3, '0')}.md`), `---
id: prd-${String(i).padStart(3, '0')}
title: PRD ${i}
---
${hasAuth ? 'Authentication feature' : 'Other feature'}
`);
    }

    const start = Date.now();
    const files = await engine.loadFiles(prdsDir);
    const results = await engine.search(files, 'authentication');
    const elapsed = Date.now() - start;

    expect(files).toHaveLength(100);
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000); // Should complete in < 2s
  }, 10000);
});

describe('FilterEngine - Edge Cases', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should handle empty files array', async () => {
    const filtered = await engine.filter([], { status: 'active' });
    expect(filtered).toEqual([]);
  });

  test('should handle empty filters object', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
---
`);

    const files = await engine.loadFiles(prdsDir);
    const filtered = await engine.filter(files, {});
    expect(filtered).toEqual(files); // No filters = return all
  });

  test('should handle files with missing frontmatter fields', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
---
`);

    const files = await engine.loadFiles(prdsDir);
    const filtered = await engine.filter(files, { status: 'active' });
    expect(filtered).toHaveLength(0); // No status field = no match
  });

  test('should handle empty search query', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
---
`);

    const files = await engine.loadFiles(prdsDir);
    const results = await engine.search(files, '');
    expect(results).toEqual(files); // Empty search = return all
  });
});

describe('FilterEngine - searchAll Multiple Types', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should search across multiple types', async () => {
    // Create PRDs
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });
    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
---
Authentication feature
`);

    // Create Epics
    const epicsDir = path.join(testDir, 'epics');
    fs.mkdirSync(epicsDir, { recursive: true });
    fs.writeFileSync(path.join(epicsDir, 'epic-001.md'), `---
id: epic-001
---
User authentication epic
`);

    const results = await engine.searchAll('authentication', {
      types: ['prds', 'epics']
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FilterEngine - filterByDateRange', () => {
  let testDir;
  let engine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filter-test-'));
    engine = new FilterEngine({ basePath: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should filter by date range', async () => {
    const prdsDir = path.join(testDir, 'prds');
    fs.mkdirSync(prdsDir, { recursive: true });

    fs.writeFileSync(path.join(prdsDir, 'prd-001.md'), `---
id: prd-001
created: 2025-03-15
---
`);

    fs.writeFileSync(path.join(prdsDir, 'prd-002.md'), `---
id: prd-002
created: 2025-08-20
---
`);

    const results = await engine.filterByDateRange('prds', {
      field: 'created',
      after: '2025-01-01',
      before: '2025-12-31'
    });

    expect(results.length).toBeGreaterThan(0);
  });
});
