/**
 * QueryParser - Parse command-line filter arguments into structured queries
 *
 * Converts CLI-style filter arguments into structured query objects for
 * filtering PRDs, Epics, and Tasks.
 *
 * @example Basic Usage
 * ```javascript
 * const QueryParser = require('./lib/query-parser');
 * const parser = new QueryParser();
 *
 * // Parse CLI arguments
 * const query = parser.parse(['--status', 'active', '--priority', 'high']);
 * // Returns: { status: 'active', priority: 'high' }
 *
 * // Validate query
 * const validation = parser.validate(query);
 * // Returns: { valid: true, errors: [] }
 * ```
 *
 * @example Supported Filters
 * ```javascript
 * // Status filter
 * parser.parse(['--status', 'active']);
 *
 * // Priority filter
 * parser.parse(['--priority', 'P0']);
 *
 * // Date range filter
 * parser.parse(['--created-after', '2025-01-01', '--created-before', '2025-12-31']);
 *
 * // Full-text search
 * parser.parse(['--search', 'authentication API']);
 *
 * // Combined filters
 * parser.parse([
 *   '--status', 'active',
 *   '--priority', 'high',
 *   '--created-after', '2025-01-01',
 *   '--search', 'OAuth2'
 * ]);
 * ```
 *
 * @module QueryParser
 * @version 1.0.0
 * @since v1.28.0
 */

class QueryParser {
  constructor() {
    /**
     * Supported filter names
     * @type {string[]}
     */
    this.supportedFilters = [
      'status',
      'priority',
      'epic',
      'author',
      'assignee',
      'created-after',
      'created-before',
      'updated-after',
      'updated-before',
      'search'
    ];

    /**
     * Valid status values
     * @type {string[]}
     */
    this.validStatuses = [
      'draft',
      'active',
      'in_progress',
      'completed',
      'blocked',
      'archived'
    ];

    /**
     * Valid priority values
     * @type {string[]}
     */
    this.validPriorities = [
      'P0', 'P1', 'P2', 'P3',
      'p0', 'p1', 'p2', 'p3',
      'high', 'medium', 'low',
      'High', 'Medium', 'Low',
      'HIGH', 'MEDIUM', 'LOW'
    ];

    /**
     * Date filter fields
     * @type {string[]}
     */
    this.dateFilters = [
      'created-after',
      'created-before',
      'updated-after',
      'updated-before'
    ];
  }

  /**
   * Parse command-line filter arguments into structured query
   *
   * @param {string[]} args - Command-line arguments (e.g., ['--status', 'active'])
   * @returns {Object} - Parsed query object
   *
   * @example
   * const query = parser.parse(['--status', 'active', '--priority', 'high']);
   * // Returns: { status: 'active', priority: 'high' }
   */
  parse(args) {
    const query = {};

    if (!Array.isArray(args) || args.length === 0) {
      return query;
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Check if this is a filter flag (starts with --)
      if (!arg.startsWith('--')) {
        continue;
      }

      // Extract filter name (remove -- prefix)
      const filterName = arg.substring(2);

      // Check if this is a supported filter
      if (!this.supportedFilters.includes(filterName)) {
        continue;
      }

      // Get the next argument as the value
      const value = args[i + 1];

      // Skip if no value or value is another flag
      if (!value || value.startsWith('--')) {
        continue;
      }

      // Trim whitespace
      const trimmedValue = value.trim();

      // Skip empty values
      if (trimmedValue === '') {
        continue;
      }

      // Add to query
      query[filterName] = trimmedValue;

      // Skip the next argument (we just consumed it as a value)
      i++;
    }

    return query;
  }

  /**
   * Validate query object
   *
   * Checks for valid date formats and other constraints.
   *
   * @param {Object} query - Query object to validate
   * @returns {Object} - { valid: boolean, errors: string[] }
   *
   * @example
   * const result = parser.validate({ status: 'active', 'created-after': '2025-01-01' });
   * // Returns: { valid: true, errors: [] }
   *
   * const result2 = parser.validate({ 'created-after': 'invalid-date' });
   * // Returns: { valid: false, errors: ['Invalid date format...'] }
   */
  validate(query) {
    const errors = [];

    if (!query || typeof query !== 'object') {
      return { valid: true, errors: [] };
    }

    // Validate date filters
    for (const dateFilter of this.dateFilters) {
      if (query[dateFilter]) {
        const value = query[dateFilter];

        // Check YYYY-MM-DD format
        if (!this.isValidDateFormat(value)) {
          errors.push(`Invalid date format for ${dateFilter}: ${value} (expected YYYY-MM-DD)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid date in YYYY-MM-DD format
   *
   * @param {string} dateString - Date string to validate
   * @returns {boolean} - True if valid
   * @private
   */
  isValidDateFormat(dateString) {
    // Check format: YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    // Parse and validate actual date
    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Check ranges
    if (month < 1 || month > 12) {
      return false;
    }

    if (day < 1 || day > 31) {
      return false;
    }

    // Create date and verify it matches input
    // (this catches invalid dates like 2025-02-31)
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Get list of supported filters
   *
   * @returns {string[]} - Array of supported filter names
   *
   * @example
   * const filters = parser.getSupportedFilters();
   * // Returns: ['status', 'priority', 'epic', ...]
   */
  getSupportedFilters() {
    return [...this.supportedFilters];
  }

  /**
   * Get help text for filters
   *
   * Returns formatted help text describing all available filters
   * with examples.
   *
   * @returns {string} - Formatted help text
   *
   * @example
   * console.log(parser.getFilterHelp());
   * // Outputs:
   * // Available Filters:
   * //   --status <value>        Filter by status (draft, active, ...)
   * //   --priority <value>      Filter by priority (P0, P1, high, ...)
   * //   ...
   */
  getFilterHelp() {
    return `
Available Filters:

  --status <value>              Filter by status
                                Values: draft, active, in_progress, completed, blocked, archived
                                Example: --status active

  --priority <value>            Filter by priority
                                Values: P0, P1, P2, P3, high, medium, low
                                Example: --priority high

  --epic <id>                   Filter by epic ID
                                Example: --epic epic-001

  --author <name>               Filter by author name
                                Example: --author john

  --assignee <name>             Filter by assignee name
                                Example: --assignee jane

  --created-after <date>        Created after date (YYYY-MM-DD)
                                Example: --created-after 2025-01-01

  --created-before <date>       Created before date (YYYY-MM-DD)
                                Example: --created-before 2025-12-31

  --updated-after <date>        Updated after date (YYYY-MM-DD)
                                Example: --updated-after 2025-06-01

  --updated-before <date>       Updated before date (YYYY-MM-DD)
                                Example: --updated-before 2025-06-30

  --search <text>               Full-text search in content and frontmatter
                                Example: --search "authentication API"

Examples:

  # Filter by status and priority
  --status active --priority high

  # Filter by date range
  --created-after 2025-01-01 --created-before 2025-12-31

  # Combine filters
  --status active --priority P0 --epic epic-001 --search "OAuth2"
`.trim();
  }
}

module.exports = QueryParser;
