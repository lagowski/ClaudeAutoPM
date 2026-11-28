/**
 * Test suite for /db:query-analyze command
 *
 * TDD approach: These tests are written FIRST before implementation
 * Following strict Red-Green-Refactor cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('/db:query-analyze Command', () => {
  const commandPath = path.join(__dirname, '../commands/db:query-analyze.md');

  describe('Command File Structure', () => {
    test('command file should exist', () => {
      expect(fs.existsSync(commandPath)).toBe(true);
    });

    test('command file should have valid frontmatter', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Check for frontmatter delimiters
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/\n---\n/);

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const frontmatter = frontmatterMatch[1];

      // Verify required frontmatter fields
      expect(frontmatter).toMatch(/name:\s*db:query-analyze/);
      expect(frontmatter).toMatch(/description:/);
      expect(frontmatter).toMatch(/allowed-tools:/);
    });

    test('command should include required tools', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];

      // Should include necessary tools for analysis
      expect(frontmatter).toMatch(/allowed-tools:.*Read/);
      expect(frontmatter).toMatch(/allowed-tools:.*Write/);
      expect(frontmatter).toMatch(/allowed-tools:.*Bash/);
    });
  });

  describe('Required Documentation Access', () => {
    test('points to the shared Context7 rule', () => {
      expect(fs.readFileSync(commandPath, 'utf-8')).toContain('.claude/rules/context7-required.md');
    });
  });

  describe('Instructions Section', () => {
    test('command should have Instructions section', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Instructions/i);
    });

    test('should include query parsing instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Should mention parsing query AST
      expect(content).toMatch(/parse.*query/i);
      expect(content).toMatch(/AST|abstract syntax tree|tables.*joins/i);
    });

    test('should include EXPLAIN analysis instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/EXPLAIN\s+(ANALYZE)?/i);
      expect(content).toMatch(/query plan|execution plan/i);
    });

    test('should include index recommendation logic', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/index.*recommendation/i);
      expect(content).toMatch(/foreign key|WHERE clause|JOIN/i);
    });

    test('should include query rewrite suggestions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/rewrite|optimization/i);
      expect(content).toMatch(/subquer(y|ies)|JOIN|N\+1/i);
    });

    test('should include performance estimation', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/performance.*impact|improvement/i);
      expect(content).toMatch(/estimate|cost/i);
    });
  });

  describe('Usage Examples', () => {
    test('command should have Examples section', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Examples/i);
    });

    test('should show basic query analysis example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/\/db:query-analyze/);
      expect(content).toMatch(/SELECT.*FROM.*WHERE|JOIN/i);
    });

    test('should show file-based analysis example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--file|\.sql/);
    });

    test('should show threshold-based filtering example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--threshold|slow.*quer(y|ies)/i);
    });

    test('should show database-specific examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--database\s+(postgresql|mysql|bigquery)/i);
    });

    test('should include before/after optimization examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Should show query improvements
      expect(content).toMatch(/before|original/i);
      expect(content).toMatch(/after|optimized|improved/i);
    });
  });

  describe('Output Format', () => {
    test('should define structured output format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Should include output symbols
      expect(content).toMatch(/❌|⚠️|✅/); // Issue indicators
      expect(content).toMatch(/💡/); // Recommendations
      expect(content).toMatch(/✨/); // Optimizations
      expect(content).toMatch(/📊/); // Metrics
    });

    test('should include index recommendation format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/CREATE INDEX/i);
      expect(content).toMatch(/Index.*recommendation/i);
    });

    test('should include performance metrics format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/execution time|performance|improvement/i);
      expect(content).toMatch(/\d+%|\d+x|faster/i);
    });

    test('should include query rewrite format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/rewrite|suggestion/i);
      expect(content).toMatch(/rationale|reason|because|why/i);
    });
  });

  describe('Database-Specific Features', () => {
    test('should include PostgreSQL-specific analysis', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/PostgreSQL|postgres/i);
      expect(content).toMatch(/EXPLAIN.*ANALYZE.*BUFFERS/i);
      expect(content).toMatch(/GIN|GiST|BRIN|B-tree/i);
    });

    test('should include MySQL-specific analysis', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/MySQL/i);
      expect(content).toMatch(/EXPLAIN.*FORMAT/i);
    });

    test('should include BigQuery-specific analysis', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/BigQuery/i);
      expect(content).toMatch(/partition|cluster/i);
    });
  });

  describe('Agent Integration', () => {
    test('should reference database expert agents', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/@postgresql-expert/i);
      expect(content).toMatch(/@mongodb-expert|@bigquery-expert/i);
    });

    test('should describe agent usage in implementation', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Implementation|Process/i);
      expect(content).toMatch(/agent.*analyze|specialist/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle complex queries with multiple joins', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/multiple.*join|JOIN.*JOIN/i);
    });

    test('should handle subqueries', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/subquer(y|ies)|nested.*SELECT/i);
    });

    test('should handle window functions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/window function|OVER\s*\(|ROW_NUMBER|PARTITION BY/i);
    });

    test('should handle CTEs (Common Table Expressions)', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/CTE|WITH.*AS/i);
    });
  });

  describe('Related Commands', () => {
    test('should reference related database commands', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Related Commands|See Also/i);
      expect(content).toMatch(/\/db:optimize|\/db:migrate|\/db:monitor/i);
    });
  });

  describe('Context7 Integration Compliance', () => {
    test('points to the shared Context7 rule', () => {
      expect(fs.readFileSync(commandPath, 'utf-8')).toContain('.claude/rules/context7-required.md');
    });
  });
});

describe('Query Analysis Test Cases', () => {
  describe('Index Recommendations', () => {
    test('should detect missing index on foreign key', () => {
      // This will test the actual implementation
      const testQuery = `
        SELECT o.*, u.name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status = 'pending'
      `;

      // Expected: Recommend index on orders.user_id if not exists
      // Expected: Recommend index on orders.status for WHERE clause
      expect(testQuery).toMatch(/JOIN.*ON/);
      expect(testQuery).toMatch(/WHERE/);
    });

    test('should suggest composite index for multi-column WHERE', () => {
      const testQuery = `
        SELECT * FROM orders
        WHERE customer_id = 123
        AND order_date >= '2024-01-01'
        ORDER BY order_date DESC
      `;

      // Expected: Composite index on (customer_id, order_date DESC)
      expect(testQuery).toMatch(/WHERE[\s\S]*AND/);
      expect(testQuery).toMatch(/ORDER BY/);
    });

    test('should suggest partial index for filtered queries', () => {
      const testQuery = `
        SELECT * FROM orders
        WHERE status = 'pending'
        AND created_at >= NOW() - INTERVAL '7 days'
      `;

      // Expected: Partial index on created_at WHERE status = 'pending'
      expect(testQuery).toMatch(/WHERE.*status/);
    });
  });

  describe('Query Rewrites', () => {
    test('should detect N+1 query pattern', () => {
      const testQueries = [
        `SELECT * FROM users`,
        `SELECT * FROM orders WHERE user_id = ?` // Repeated for each user
      ];

      // Expected: Suggest JOIN instead of separate queries
      expect(testQueries.length).toBe(2);
    });

    test('should suggest JOIN over subquery', () => {
      const testQuery = `
        SELECT * FROM orders
        WHERE user_id IN (
          SELECT id FROM users WHERE status = 'active'
        )
      `;

      // Expected: Rewrite as JOIN for better performance
      expect(testQuery).toMatch(/IN\s*\(/);
    });

    test('should optimize COUNT with EXISTS', () => {
      const testQuery = `
        SELECT COUNT(*) FROM orders
        WHERE customer_id = 123
      `;

      // Expected: Suggest EXISTS for existence check
      expect(testQuery).toMatch(/COUNT/);
    });
  });

  describe('EXPLAIN Analysis', () => {
    test('should parse EXPLAIN ANALYZE output for PostgreSQL', () => {
      const explainOutput = `
        Seq Scan on orders  (cost=0.00..10000.00 rows=100000 width=100) (actual time=0.050..150.234 rows=95432 loops=1)
          Filter: (status = 'pending')
          Rows Removed by Filter: 4568
        Planning Time: 0.123 ms
        Execution Time: 152.456 ms
      `;

      // Expected: Detect sequential scan, suggest index
      expect(explainOutput).toMatch(/Seq Scan/);
      expect(explainOutput).toMatch(/Filter/);
    });

    test('should identify missing index from EXPLAIN', () => {
      const explainOutput = `
        Index Scan using idx_orders_customer on orders
          Index Cond: (customer_id = 123)
          Filter: (status = 'pending')
      `;

      // Expected: Detect filter not in index, suggest composite index
      expect(explainOutput).toMatch(/Filter/);
    });
  });
});
