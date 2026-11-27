/**
 * FilterEngine - Apply filters and search to PRD/Epic/Task collections
 *
 * Loads markdown files with YAML frontmatter and applies powerful filtering
 * and search capabilities.
 *
 * @example Basic Usage
 * ```javascript
 * const FilterEngine = require('./lib/filter-engine');
 * const engine = new FilterEngine({ basePath: '.claude' });
 *
 * // Load and filter PRDs
 * const activePRDs = await engine.loadAndFilter('prds', { status: 'active' });
 *
 * // Search across content
 * const results = await engine.searchAll('authentication', {
 *   types: ['prds', 'epics', 'tasks']
 * });
 * ```
 *
 * @example Advanced Filtering
 * ```javascript
 * const engine = new FilterEngine();
 *
 * // Load files
 * const files = await engine.loadFiles('.claude/prds');
 *
 * // Apply multiple filters (AND logic)
 * const filtered = await engine.filter(files, {
 *   status: 'active',
 *   priority: 'high',
 *   'created-after': '2025-01-01'
 * });
 *
 * // Full-text search
 * const searchResults = await engine.search(files, 'OAuth2');
 * ```
 *
 * @module FilterEngine
 * @version 1.0.0
 * @since v1.28.0
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');

class FilterEngine {
  /**
   * Create FilterEngine instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.basePath - Base path for file operations (default: '.claude')
   */
  constructor(options = {}) {
    this.basePath = options.basePath || '.claude';
  }

  /**
   * Load markdown files with frontmatter from directory
   *
   * @param {string} directory - Directory to load files from
   * @returns {Promise<Array>} - Array of { path, frontmatter, content }
   *
   * @example
   * const files = await engine.loadFiles('.claude/prds');
   * // Returns: [
   * //   {
   * //     path: '/path/to/prd-001.md',
   * //     frontmatter: { id: 'prd-001', title: 'API', status: 'active' },
   * //     content: '# API\nContent here...'
   * //   }
   * // ]
   */
  async loadFiles(directory) {
    const files = [];

    // Check if directory exists
    try {
      await fs.access(directory);
    } catch (error) {
      return files;
    }

    // Read directory
    const entries = await fs.readdir(directory);

    // Filter for markdown files
    const mdFiles = entries.filter(entry => entry.endsWith('.md'));

    // Load each file
    for (const filename of mdFiles) {
      const filePath = path.join(directory, filename);

      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = this.parseFrontmatter(content);

        files.push({
          path: filePath,
          frontmatter: parsed.frontmatter,
          content: parsed.content
        });
      } catch (error) {
        // Skip files that can't be read
        console.error(`Error loading ${filePath}:`, error.message);
      }
    }

    return files;
  }

  /**
   * Parse frontmatter from markdown content
   *
   * @param {string} content - Markdown content with YAML frontmatter
   * @returns {Object} - { frontmatter: Object, content: string }
   * @private
   *
   * @example
   * const parsed = engine.parseFrontmatter(`---
   * id: prd-001
   * title: API
   * ---
   * # Content
   * `);
   * // Returns: {
   * //   frontmatter: { id: 'prd-001', title: 'API' },
   * //   content: '# Content\n'
   * // }
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {},
        content: content
      };
    }

    const [, frontmatterText, bodyContent] = match;

    let frontmatter = {};
    try {
      frontmatter = yaml.parse(frontmatterText) || {};
    } catch (error) {
      // Malformed YAML - return empty frontmatter
      frontmatter = {};
    }

    return {
      frontmatter,
      content: bodyContent.trimStart() // Remove leading newline
    };
  }

  /**
   * Apply filters to file collection
   *
   * Uses AND logic - all filters must match for a file to be included.
   *
   * @param {Array} files - Array of files from loadFiles()
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - Filtered array
   *
   * @example
   * const filtered = await engine.filter(files, {
   *   status: 'active',
   *   priority: 'high',
   *   'created-after': '2025-01-01'
   * });
   */
  async filter(files, filters) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    if (!filters || Object.keys(filters).length === 0) {
      return files;
    }

    // Separate search from other filters
    const { search, ...otherFilters } = filters;

    let results = files;

    // Apply field-based filters first
    results = this.applyFieldFilters(results, otherFilters);

    // Apply search if specified
    if (search) {
      results = await this.search(results, search);
    }

    return results;
  }

  /**
   * Apply field-based filters (status, priority, dates, etc.)
   *
   * @param {Array} files - Files to filter
   * @param {Object} filters - Filter criteria (without search)
   * @returns {Array} - Filtered files
   * @private
   */
  applyFieldFilters(files, filters) {
    return files.filter(file => {
      const { frontmatter } = file;

      // Check each filter
      for (const [filterName, filterValue] of Object.entries(filters)) {
        // Handle date filters
        if (filterName === 'created-after') {
          if (!this.isDateAfter(frontmatter.created, filterValue)) {
            return false;
          }
        } else if (filterName === 'created-before') {
          if (!this.isDateBefore(frontmatter.created, filterValue)) {
            return false;
          }
        } else if (filterName === 'updated-after') {
          if (!this.isDateAfter(frontmatter.updated, filterValue)) {
            return false;
          }
        } else if (filterName === 'updated-before') {
          if (!this.isDateBefore(frontmatter.updated, filterValue)) {
            return false;
          }
        } else {
          // Simple field match
          if (frontmatter[filterName] !== filterValue) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Check if date1 is after date2
   *
   * @param {string} date1 - First date (YYYY-MM-DD)
   * @param {string} date2 - Second date (YYYY-MM-DD)
   * @returns {boolean} - True if date1 is after date2
   * @private
   */
  isDateAfter(date1, date2) {
    if (!date1 || !date2) return false;
    return new Date(date1) >= new Date(date2);
  }

  /**
   * Check if date1 is before date2
   *
   * @param {string} date1 - First date (YYYY-MM-DD)
   * @param {string} date2 - Second date (YYYY-MM-DD)
   * @returns {boolean} - True if date1 is before date2
   * @private
   */
  isDateBefore(date1, date2) {
    if (!date1 || !date2) return false;
    return new Date(date1) <= new Date(date2);
  }

  /**
   * Full-text search in files (content and frontmatter)
   *
   * Case-insensitive search with match context.
   *
   * @param {Array} files - Files to search
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Matching files with match context
   *
   * @example
   * const results = await engine.search(files, 'authentication');
   * // Returns files with matches, including:
   * // {
   * //   path: '...',
   * //   frontmatter: {...},
   * //   content: '...',
   * //   matches: [
   * //     { context: 'OAuth2 authentication system', line: 5 }
   * //   ]
   * // }
   */
  async search(files, query) {
    if (!query || query.trim() === '') {
      return files;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const file of files) {
      const matches = [];
      let found = false;

      // Search in frontmatter
      const frontmatterText = JSON.stringify(file.frontmatter).toLowerCase();
      if (frontmatterText.includes(lowerQuery)) {
        found = true;
        matches.push({
          context: 'Found in metadata',
          line: 0
        });
      }

      // Search in content
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(lowerQuery)) {
          found = true;
          matches.push({
            context: line.trim(),
            line: i + 1
          });
        }
      }

      if (found) {
        results.push({
          ...file,
          matches
        });
      }
    }

    return results;
  }

  /**
   * Load and filter in one operation
   *
   * Convenience method that combines loadFiles() and filter().
   *
   * @param {string} type - Type of files (prds/epics/tasks)
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - Filtered files
   *
   * @example
   * const activePRDs = await engine.loadAndFilter('prds', { status: 'active' });
   */
  async loadAndFilter(type, filters) {
    const directory = path.join(this.basePath, type);
    const files = await this.loadFiles(directory);
    return this.filter(files, filters);
  }

  /**
   * Search across multiple file types
   *
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {string[]} options.types - Types to search (default: ['prds', 'epics', 'tasks'])
   * @returns {Promise<Array>} - Search results from all types
   *
   * @example
   * const results = await engine.searchAll('authentication', {
   *   types: ['prds', 'epics']
   * });
   */
  async searchAll(query, options = {}) {
    const types = options.types || ['prds', 'epics', 'tasks'];
    const allResults = [];

    for (const type of types) {
      const directory = path.join(this.basePath, type);
      const files = await this.loadFiles(directory);
      const results = await this.search(files, query);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Filter files by date range
   *
   * @param {string} type - Type of files (prds/epics/tasks)
   * @param {Object} options - Date range options
   * @param {string} options.field - Date field to filter on (created/updated)
   * @param {string} options.after - Start date (YYYY-MM-DD)
   * @param {string} options.before - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Filtered files
   *
   * @example
   * const recentPRDs = await engine.filterByDateRange('prds', {
   *   field: 'created',
   *   after: '2025-01-01',
   *   before: '2025-12-31'
   * });
   */
  async filterByDateRange(type, options) {
    const { field, after, before } = options;

    const filters = {};
    if (after) {
      filters[`${field}-after`] = after;
    }
    if (before) {
      filters[`${field}-before`] = before;
    }

    return this.loadAndFilter(type, filters);
  }
}

module.exports = FilterEngine;
