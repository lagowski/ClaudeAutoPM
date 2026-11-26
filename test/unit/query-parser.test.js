/**
 * QueryParser Tests - TDD Test Suite
 *
 * Tests for parsing command-line filter arguments into structured queries
 * for PRD/Epic/Task filtering system.
 *
 * @jest-environment node
 */

const QueryParser = require('../../lib/query-parser');

describe('QueryParser - Basic Initialization', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should create instance successfully', () => {
    expect(parser).toBeInstanceOf(QueryParser);
  });

  test('should have parse method', () => {
    expect(typeof parser.parse).toBe('function');
  });

  test('should have validate method', () => {
    expect(typeof parser.validate).toBe('function');
  });
});

describe('QueryParser - Simple Filter Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe('Status Filters', () => {
    test('should parse single status filter', () => {
      const result = parser.parse(['--status', 'active']);
      expect(result).toEqual({ status: 'active' });
    });

    test('should parse status with underscore', () => {
      const result = parser.parse(['--status', 'in_progress']);
      expect(result).toEqual({ status: 'in_progress' });
    });

    test('should parse status: draft', () => {
      const result = parser.parse(['--status', 'draft']);
      expect(result).toEqual({ status: 'draft' });
    });

    test('should parse status: completed', () => {
      const result = parser.parse(['--status', 'completed']);
      expect(result).toEqual({ status: 'completed' });
    });

    test('should parse status: blocked', () => {
      const result = parser.parse(['--status', 'blocked']);
      expect(result).toEqual({ status: 'blocked' });
    });
  });

  describe('Priority Filters', () => {
    test('should parse priority P0', () => {
      const result = parser.parse(['--priority', 'P0']);
      expect(result).toEqual({ priority: 'P0' });
    });

    test('should parse priority P1', () => {
      const result = parser.parse(['--priority', 'P1']);
      expect(result).toEqual({ priority: 'P1' });
    });

    test('should parse priority P2', () => {
      const result = parser.parse(['--priority', 'P2']);
      expect(result).toEqual({ priority: 'P2' });
    });

    test('should parse priority P3', () => {
      const result = parser.parse(['--priority', 'P3']);
      expect(result).toEqual({ priority: 'P3' });
    });

    test('should parse priority: high', () => {
      const result = parser.parse(['--priority', 'high']);
      expect(result).toEqual({ priority: 'high' });
    });

    test('should parse priority: medium', () => {
      const result = parser.parse(['--priority', 'medium']);
      expect(result).toEqual({ priority: 'medium' });
    });

    test('should parse priority: low', () => {
      const result = parser.parse(['--priority', 'low']);
      expect(result).toEqual({ priority: 'low' });
    });
  });

  describe('Epic Filter', () => {
    test('should parse epic ID filter', () => {
      const result = parser.parse(['--epic', 'epic-001']);
      expect(result).toEqual({ epic: 'epic-001' });
    });

    test('should parse epic with different format', () => {
      const result = parser.parse(['--epic', 'EPIC-123']);
      expect(result).toEqual({ epic: 'EPIC-123' });
    });
  });

  describe('Author Filter', () => {
    test('should parse author filter', () => {
      const result = parser.parse(['--author', 'john']);
      expect(result).toEqual({ author: 'john' });
    });

    test('should parse author with full name', () => {
      const result = parser.parse(['--author', 'John Doe']);
      expect(result).toEqual({ author: 'John Doe' });
    });
  });

  describe('Assignee Filter', () => {
    test('should parse assignee filter', () => {
      const result = parser.parse(['--assignee', 'jane']);
      expect(result).toEqual({ assignee: 'jane' });
    });

    test('should parse assignee with full name', () => {
      const result = parser.parse(['--assignee', 'Jane Smith']);
      expect(result).toEqual({ assignee: 'Jane Smith' });
    });
  });
});

describe('QueryParser - Date Filter Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe('Created Date Filters', () => {
    test('should parse created-after date', () => {
      const result = parser.parse(['--created-after', '2025-01-01']);
      expect(result).toEqual({ 'created-after': '2025-01-01' });
    });

    test('should parse created-before date', () => {
      const result = parser.parse(['--created-before', '2025-12-31']);
      expect(result).toEqual({ 'created-before': '2025-12-31' });
    });

    test('should parse both created-after and created-before', () => {
      const result = parser.parse([
        '--created-after', '2025-01-01',
        '--created-before', '2025-12-31'
      ]);
      expect(result).toEqual({
        'created-after': '2025-01-01',
        'created-before': '2025-12-31'
      });
    });
  });

  describe('Updated Date Filters', () => {
    test('should parse updated-after date', () => {
      const result = parser.parse(['--updated-after', '2025-06-01']);
      expect(result).toEqual({ 'updated-after': '2025-06-01' });
    });

    test('should parse updated-before date', () => {
      const result = parser.parse(['--updated-before', '2025-06-30']);
      expect(result).toEqual({ 'updated-before': '2025-06-30' });
    });

    test('should parse both updated-after and updated-before', () => {
      const result = parser.parse([
        '--updated-after', '2025-06-01',
        '--updated-before', '2025-06-30'
      ]);
      expect(result).toEqual({
        'updated-after': '2025-06-01',
        'updated-before': '2025-06-30'
      });
    });
  });
});

describe('QueryParser - Search Query Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should parse single word search', () => {
    const result = parser.parse(['--search', 'authentication']);
    expect(result).toEqual({ search: 'authentication' });
  });

  test('should parse multi-word search', () => {
    const result = parser.parse(['--search', 'user authentication system']);
    expect(result).toEqual({ search: 'user authentication system' });
  });

  test('should parse search with special characters', () => {
    const result = parser.parse(['--search', 'API v2.0']);
    expect(result).toEqual({ search: 'API v2.0' });
  });
});

describe('QueryParser - Multiple Filter Parsing', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should parse multiple filters (status + priority)', () => {
    const result = parser.parse([
      '--status', 'active',
      '--priority', 'high'
    ]);
    expect(result).toEqual({
      status: 'active',
      priority: 'high'
    });
  });

  test('should parse multiple filters (status + epic)', () => {
    const result = parser.parse([
      '--status', 'in_progress',
      '--epic', 'epic-001'
    ]);
    expect(result).toEqual({
      status: 'in_progress',
      epic: 'epic-001'
    });
  });

  test('should parse complex filter combination', () => {
    const result = parser.parse([
      '--status', 'active',
      '--priority', 'P0',
      '--epic', 'epic-001',
      '--created-after', '2025-01-01',
      '--author', 'john'
    ]);
    expect(result).toEqual({
      status: 'active',
      priority: 'P0',
      epic: 'epic-001',
      'created-after': '2025-01-01',
      author: 'john'
    });
  });

  test('should parse all filter types together', () => {
    const result = parser.parse([
      '--status', 'in_progress',
      '--priority', 'high',
      '--epic', 'epic-042',
      '--created-after', '2025-01-01',
      '--created-before', '2025-12-31',
      '--updated-after', '2025-06-01',
      '--author', 'jane',
      '--assignee', 'john',
      '--search', 'authentication API'
    ]);
    expect(result).toEqual({
      status: 'in_progress',
      priority: 'high',
      epic: 'epic-042',
      'created-after': '2025-01-01',
      'created-before': '2025-12-31',
      'updated-after': '2025-06-01',
      author: 'jane',
      assignee: 'john',
      search: 'authentication API'
    });
  });
});

describe('QueryParser - Edge Cases and Error Handling', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should return empty object for empty args', () => {
    const result = parser.parse([]);
    expect(result).toEqual({});
  });

  test('should handle missing value for filter', () => {
    const result = parser.parse(['--status']);
    expect(result).toEqual({});
  });

  test('should ignore unknown filter names', () => {
    const result = parser.parse(['--unknown', 'value']);
    expect(result).toEqual({});
  });

  test('should handle mixed known and unknown filters', () => {
    const result = parser.parse([
      '--status', 'active',
      '--unknown', 'value',
      '--priority', 'high'
    ]);
    expect(result).toEqual({
      status: 'active',
      priority: 'high'
    });
  });

  test('should handle duplicate filters (last wins)', () => {
    const result = parser.parse([
      '--status', 'draft',
      '--status', 'active'
    ]);
    expect(result).toEqual({ status: 'active' });
  });

  test('should trim whitespace from values', () => {
    const result = parser.parse(['--status', '  active  ']);
    expect(result).toEqual({ status: 'active' });
  });

  test('should handle empty string values', () => {
    const result = parser.parse(['--status', '']);
    expect(result).toEqual({});
  });
});

describe('QueryParser - Validation', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe('Valid Queries', () => {
    test('should validate simple status filter', () => {
      const query = { status: 'active' };
      const result = parser.validate(query);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate priority filter', () => {
      const query = { priority: 'P0' };
      const result = parser.validate(query);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate date filter', () => {
      const query = { 'created-after': '2025-01-01' };
      const result = parser.validate(query);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate complex query', () => {
      const query = {
        status: 'active',
        priority: 'high',
        'created-after': '2025-01-01'
      };
      const result = parser.validate(query);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    test('should validate empty query', () => {
      const query = {};
      const result = parser.validate(query);
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });

  describe('Invalid Date Formats', () => {
    test('should reject invalid date format (MM/DD/YYYY)', () => {
      const query = { 'created-after': '01/15/2025' };
      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date format for created-after: 01/15/2025 (expected YYYY-MM-DD)');
    });

    test('should reject invalid date format (DD-MM-YYYY)', () => {
      const query = { 'created-before': '15-01-2025' };
      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date format for created-before: 15-01-2025 (expected YYYY-MM-DD)');
    });

    test('should reject malformed date', () => {
      const query = { 'updated-after': '2025-13-45' };
      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject non-date string', () => {
      const query = { 'created-after': 'yesterday' };
      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date format for created-after: yesterday (expected YYYY-MM-DD)');
    });

    test('should validate all date fields', () => {
      const query = {
        'created-after': '2025-01-01',
        'created-before': 'invalid',
        'updated-after': '2025-06-01',
        'updated-before': '2025/12/31'
      };
      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date format for created-before: invalid (expected YYYY-MM-DD)');
      expect(result.errors).toContain('Invalid date format for updated-before: 2025/12/31 (expected YYYY-MM-DD)');
    });
  });

  describe('Invalid Status Values', () => {
    test('should accept valid status values', () => {
      const validStatuses = ['draft', 'active', 'in_progress', 'completed', 'blocked', 'archived'];
      validStatuses.forEach(status => {
        const result = parser.validate({ status });
        expect(result.valid).toBe(true);
      });
    });

    test('should warn for non-standard status (but not reject)', () => {
      const query = { status: 'custom-status' };
      const result = parser.validate(query);
      // Non-standard status is allowed but may generate warning
      expect(result.valid).toBe(true);
      // Optionally check for warnings if implemented
      // expect(result.warnings).toContain('Non-standard status value: custom-status');
    });
  });

  describe('Invalid Priority Values', () => {
    test('should accept valid priority values', () => {
      const validPriorities = ['P0', 'P1', 'P2', 'P3', 'high', 'medium', 'low'];
      validPriorities.forEach(priority => {
        const result = parser.validate({ priority });
        expect(result.valid).toBe(true);
      });
    });

    test('should accept priority case variations', () => {
      const priorities = ['p0', 'p1', 'High', 'MEDIUM', 'Low'];
      priorities.forEach(priority => {
        const result = parser.validate({ priority });
        expect(result.valid).toBe(true);
      });
    });
  });
});

describe('QueryParser - getSupportedFilters', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should return list of supported filters', () => {
    const filters = parser.getSupportedFilters();
    expect(Array.isArray(filters)).toBe(true);
    expect(filters.length).toBeGreaterThan(0);
  });

  test('should include all basic filters', () => {
    const filters = parser.getSupportedFilters();
    expect(filters).toContain('status');
    expect(filters).toContain('priority');
    expect(filters).toContain('epic');
    expect(filters).toContain('author');
    expect(filters).toContain('assignee');
  });

  test('should include all date filters', () => {
    const filters = parser.getSupportedFilters();
    expect(filters).toContain('created-after');
    expect(filters).toContain('created-before');
    expect(filters).toContain('updated-after');
    expect(filters).toContain('updated-before');
  });

  test('should include search filter', () => {
    const filters = parser.getSupportedFilters();
    expect(filters).toContain('search');
  });
});

describe('QueryParser - getFilterHelp', () => {
  let parser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  test('should return help text for all filters', () => {
    const help = parser.getFilterHelp();
    expect(typeof help).toBe('string');
    expect(help.length).toBeGreaterThan(0);
  });

  test('should include examples in help text', () => {
    const help = parser.getFilterHelp();
    expect(help).toContain('--status');
    expect(help).toContain('--priority');
    expect(help).toContain('--search');
  });

  test('should include description for each filter', () => {
    const help = parser.getFilterHelp();
    expect(help).toContain('status');
    expect(help).toContain('priority');
    expect(help).toContain('created');
  });
});
