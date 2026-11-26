/**
 * Conflict Resolver for GitHub Sync Operations
 *
 * Handles three-way merge conflicts when syncing markdown files between
 * local filesystem and GitHub. Supports multiple resolution strategies:
 * - newest: Keep version with newest timestamp
 * - local: Always prefer local version
 * - remote: Always prefer remote version
 * - rules-based: Apply custom resolution rules
 * - interactive: Prompt user for resolution
 *
 * @example
 * const ConflictResolver = require('./lib/conflict-resolver');
 *
 * const resolver = new ConflictResolver({
 *   strategy: 'newest',
 *   contextLines: 3
 * });
 *
 * const result = resolver.threeWayMerge(localContent, remoteContent, baseContent);
 *
 * if (result.hasConflicts) {
 *   for (const conflict of result.conflicts) {
 *     const resolved = resolver.resolveConflict(conflict, 'newest');
 *   }
 * }
 */

class ConflictResolver {
  /**
   * Create a new ConflictResolver instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.strategy - Default resolution strategy (default: 'manual')
   * @param {number} options.contextLines - Number of context lines around conflicts (default: 3)
   * @param {string} options.markerPrefix - Prefix for conflict markers (default: 'LOCAL/REMOTE')
   * @param {boolean} options.normalizeLineEndings - Normalize line endings during merge (default: true)
   */
  constructor(options = {}) {
    // Validate configuration
    if (options.contextLines !== undefined) {
      if (typeof options.contextLines !== 'number' || options.contextLines < 0) {
        throw new Error('contextLines must be a non-negative number');
      }
    }

    this.options = {
      strategy: options.strategy || 'manual',
      contextLines: options.contextLines !== undefined ? options.contextLines : 3,
      markerPrefix: options.markerPrefix || 'LOCAL',
      normalizeLineEndings: options.normalizeLineEndings !== false
    };
  }

  /**
   * Perform three-way merge on text content
   *
   * Compares local, remote, and base versions to detect and merge changes.
   * Uses a line-by-line diff algorithm to identify conflicts.
   *
   * IMPORTANT LIMITATIONS:
   * - This is a simplified line-based merge that does NOT detect:
   *   • Moved code blocks (treats as delete + add = conflict)
   *   • Reordered functions (multiple conflicts)
   *   • Semantic equivalence (different formatting, same logic)
   * - For complex refactoring, use manual conflict resolution strategy
   * - Does not use Longest Common Subsequence (LCS) algorithm
   * - No semantic/AST-based merging for code
   *
   * PERFORMANCE NOTES:
   * - Files >1MB may cause memory pressure (splits into line arrays)
   * - For very large files, consider splitting into sections
   * - Tested up to 1MB files (~1000 lines)
   *
   * @param {string} local - Local version content
   * @param {string} remote - Remote version content
   * @param {string} base - Base version content (last synced)
   * @returns {Object} Merge result with conflicts and merged content
   * @returns {string} result.merged - Merged content with conflict markers
   * @returns {Array} result.conflicts - Array of detected conflicts
   * @returns {boolean} result.hasConflicts - True if conflicts were detected
   */
  threeWayMerge(local, remote, base) {
    // Validate inputs
    if (local === null || local === undefined ||
        remote === null || remote === undefined ||
        base === null || base === undefined) {
      throw new Error('All parameters (local, remote, base) are required and cannot be null or undefined');
    }

    // Normalize line endings if enabled
    if (this.options.normalizeLineEndings) {
      local = this._normalizeLineEndings(local);
      remote = this._normalizeLineEndings(remote);
      base = this._normalizeLineEndings(base);
    }

    // Split into lines for comparison
    const localLines = local.split('\n');
    const remoteLines = remote.split('\n');
    const baseLines = base.split('\n');

    // Perform three-way merge
    const mergeResult = this._performMerge(localLines, remoteLines, baseLines);

    return {
      merged: mergeResult.merged.join('\n'),
      conflicts: mergeResult.conflicts,
      hasConflicts: mergeResult.conflicts.length > 0
    };
  }

  /**
   * Perform the actual merge algorithm
   *
   * Uses a simplified three-way merge that handles most common cases:
   * - Non-overlapping changes are merged
   * - Identical changes are merged
   * - Conflicting changes are marked
   *
   * @private
   * @param {Array<string>} localLines - Local lines
   * @param {Array<string>} remoteLines - Remote lines
   * @param {Array<string>} baseLines - Base lines
   * @returns {Object} Merge result
   */
  _performMerge(localLines, remoteLines, baseLines) {
    const merged = [];
    const conflicts = [];

    const maxLen = Math.max(localLines.length, remoteLines.length, baseLines.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i];
      const localLine = localLines[i];
      const remoteLine = remoteLines[i];

      // Case 1: All three are identical (or all undefined)
      if (baseLine === localLine && baseLine === remoteLine) {
        if (baseLine !== undefined) {
          merged.push(baseLine);
        }
        continue;
      }

      // Case 2: Base and local match, remote different - accept remote change
      if (baseLine === localLine && remoteLine !== baseLine) {
        if (remoteLine !== undefined) {
          merged.push(remoteLine);
        }
        continue;
      }

      // Case 3: Base and remote match, local different - accept local change
      if (baseLine === remoteLine && localLine !== baseLine) {
        if (localLine !== undefined) {
          merged.push(localLine);
        }
        continue;
      }

      // Case 4: Local and remote match (but differ from base) - accept the change
      if (localLine === remoteLine) {
        if (localLine !== undefined) {
          merged.push(localLine);
        }
        continue;
      }

      // Case 5: All three differ - CONFLICT
      conflicts.push({
        line: merged.length + 1,
        localContent: localLine || '',
        remoteContent: remoteLine || '',
        baseContent: baseLine || '',
        section: this._detectSection(i, localLines)
      });

      merged.push('<<<<<<< LOCAL');
      merged.push(localLine || '');
      merged.push('=======');
      merged.push(remoteLine || '');
      merged.push('>>>>>>> REMOTE');
    }

    return { merged, conflicts };
  }

  /**
   * Detect which section of the file a line belongs to
   *
   * @private
   * @param {number} lineIndex - Line index
   * @param {Array<string>} lines - File lines
   * @returns {string} Section name ('frontmatter', 'body', etc.)
   */
  _detectSection(lineIndex, lines) {
    // Detect frontmatter (YAML between --- markers)
    if (lineIndex < 10) {
      const firstLines = lines.slice(0, Math.min(10, lines.length));
      if (firstLines[0] === '---') {
        const endIndex = firstLines.findIndex((line, idx) => idx > 0 && line === '---');
        if (endIndex > 0 && lineIndex <= endIndex) {
          return 'frontmatter';
        }
      }
    }

    return 'body';
  }

  /**
   * Normalize line endings to LF
   *
   * @private
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  _normalizeLineEndings(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Resolve a conflict using the specified strategy
   *
   * @param {Object} conflict - Conflict object from threeWayMerge
   * @param {string} strategy - Resolution strategy ('newest', 'local', 'remote', 'rules-based')
   * @param {Object} rules - Optional rules for rules-based strategy
   * @returns {string} Resolved content
   */
  resolveConflict(conflict, strategy, rules = {}) {
    switch (strategy) {
      case 'newest':
        return this._resolveNewest(conflict);

      case 'local':
        return conflict.localContent;

      case 'remote':
        return conflict.remoteContent;

      case 'rules-based':
        return this._resolveRulesBased(conflict, rules);

      case 'manual':
        // Return conflict markers for manual resolution
        return `<<<<<<< LOCAL\n${conflict.localContent}\n=======\n${conflict.remoteContent}\n>>>>>>> REMOTE`;

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  /**
   * Resolve conflict using newest timestamp
   *
   * @private
   * @param {Object} conflict - Conflict with timestamp metadata
   * @returns {string} Content from newest version
   */
  _resolveNewest(conflict) {
    if (!conflict.localTimestamp || !conflict.remoteTimestamp) {
      // If no timestamps, prefer local by default
      return conflict.localContent;
    }

    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();

    // Validate timestamps (Invalid Date returns NaN)
    if (isNaN(localTime) || isNaN(remoteTime)) {
      throw new Error(
        `Invalid timestamps detected in conflict resolution. ` +
        `localTimestamp: "${conflict.localTimestamp}", remoteTimestamp: "${conflict.remoteTimestamp}". ` +
        `Expected format: a valid date string (e.g., ISO 8601).`
      );
    }
    return remoteTime > localTime ? conflict.remoteContent : conflict.localContent;
  }

  /**
   * Resolve conflict using custom rules
   *
   * @private
   * @param {Object} conflict - Conflict object
   * @param {Object} rules - Resolution rules
   * @returns {string} Resolved content
   */
  _resolveRulesBased(conflict, rules) {
    const section = conflict.section || 'body';

    // Check for section-specific rules
    if (rules[section]) {
      const sectionRules = rules[section];

      // Extract field name from content (e.g., "priority: high")
      const localMatch = conflict.localContent.match(/^(\w+):\s*(.+)$/);
      const remoteMatch = conflict.remoteContent.match(/^(\w+):\s*(.+)$/);

      if (localMatch && remoteMatch && localMatch[1] === remoteMatch[1]) {
        const field = localMatch[1];
        const localValue = localMatch[2];
        const remoteValue = remoteMatch[2];

        // Apply field-specific rule
        if (sectionRules[field] === 'prefer-highest') {
          // For priority fields, prefer higher priority
          const priorities = ['low', 'medium', 'high', 'critical'];
          const localPriority = priorities.indexOf(localValue);
          const remotePriority = priorities.indexOf(remoteValue);

          return localPriority > remotePriority ? conflict.localContent : conflict.remoteContent;
        }

        if (sectionRules[field] === 'prefer-local') {
          return conflict.localContent;
        }

        if (sectionRules[field] === 'prefer-remote') {
          return conflict.remoteContent;
        }
      }
    }

    // Default: prefer local if no matching rule
    return conflict.localContent;
  }
}

module.exports = ConflictResolver;
