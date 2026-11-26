/**
 * Conflict History Manager
 *
 * Logs conflict resolutions with timestamps and provides undo/replay functionality.
 * Supports both in-memory and file-based storage.
 *
 * @example
 * const ConflictHistory = require('./lib/conflict-history');
 *
 * const history = new ConflictHistory({
 *   storage: 'memory'
 * });
 *
 * // Log a conflict resolution
 * const logId = history.log(conflict, resolution);
 *
 * // Retrieve history with filters
 * const recentConflicts = history.getHistory({ strategy: 'newest' });
 *
 * // Undo a resolution
 * const undone = history.undo(logId);
 *
 * // Replay with different strategy
 * const replayed = history.replay(logId, 'local');
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ConflictHistory {
  /**
   * Create a new ConflictHistory instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.storage - Storage type ('memory' or 'file') (default: 'memory')
   * @param {string} options.storagePath - Path to storage file (default: '.claude/.conflict-history.json')
   */
  constructor(options = {}) {
    // Validate and sanitize storagePath to prevent path traversal
    let storagePath = options.storagePath || '.claude/.conflict-history.json';

    // Resolve path and check for path traversal attempts using a trusted base directory
    const baseDir = process.cwd();
    const resolvedPath = path.resolve(baseDir, storagePath);
    if (!resolvedPath.startsWith(baseDir + path.sep)) {
      throw new Error('storagePath must be within the current working directory (security: path traversal prevention)');
    }

    this.options = {
      storage: options.storage || 'memory',
      storagePath: resolvedPath
    };

    // In-memory storage
    this.conflicts = new Map();

    // Load from file if using file storage
    if (this.options.storage === 'file') {
      this._loadFromFile();
    }
  }

  /**
   * Log a conflict resolution
   *
   * @param {Object} conflict - Conflict object
   * @param {Object} resolution - Resolution object
   * @param {string} resolution.strategy - Strategy used
   * @param {string} resolution.chosenContent - Resolved content
   * @param {Date} resolution.timestamp - Resolution timestamp (optional)
   * @returns {string} Unique log ID
   */
  log(conflict, resolution) {
    // Generate unique ID
    const logId = this._generateId();

    // Add timestamp if not provided
    const timestamp = resolution.timestamp || new Date();

    // Store conflict and resolution
    const entry = {
      id: logId,
      conflict: { ...conflict },
      resolution: {
        ...resolution,
        timestamp
      },
      createdAt: new Date()
    };

    this.conflicts.set(logId, entry);

    // Persist to file if using file storage
    if (this.options.storage === 'file') {
      this._saveToFile();
    }

    return logId;
  }

  /**
   * Retrieve conflict history with optional filters
   *
   * @param {Object} filters - Filter criteria
   * @param {string} filters.strategy - Filter by resolution strategy
   * @param {string} filters.filePath - Filter by file path
   * @param {Date} filters.after - Filter by date (after)
   * @param {Date} filters.before - Filter by date (before)
   * @returns {Array<Object>} Filtered conflict history entries
   */
  getHistory(filters = {}) {
    let results = Array.from(this.conflicts.values());

    // Apply filters
    if (filters.strategy) {
      results = results.filter(entry =>
        entry.resolution.strategy === filters.strategy
      );
    }

    if (filters.filePath) {
      results = results.filter(entry =>
        entry.conflict.filePath === filters.filePath
      );
    }

    if (filters.after) {
      results = results.filter(entry =>
        entry.createdAt >= filters.after
      );
    }

    if (filters.before) {
      results = results.filter(entry =>
        entry.createdAt <= filters.before
      );
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt - a.createdAt);

    return results;
  }

  /**
   * Undo a conflict resolution
   *
   * Retrieves the original conflict state before resolution.
   *
   * @param {string} logId - Log ID to undo
   * @returns {Object} Original conflict and resolution
   */
  undo(logId) {
    const entry = this.conflicts.get(logId);

    if (!entry) {
      throw new Error(`Conflict log not found: ${logId}`);
    }

    return {
      conflict: entry.conflict,
      resolution: entry.resolution
    };
  }

  /**
   * Replay a conflict resolution with a different strategy
   *
   * @param {string} logId - Log ID to replay
   * @param {string} newStrategy - New resolution strategy
   * @returns {Object} Replayed resolution result
   */
  replay(logId, newStrategy) {
    const entry = this.conflicts.get(logId);

    if (!entry) {
      throw new Error(`Conflict log not found: ${logId}`);
    }

    // Determine new content based on strategy
    let newContent;
    switch (newStrategy) {
      case 'local':
        newContent = entry.conflict.localContent;
        break;

      case 'remote':
        newContent = entry.conflict.remoteContent;
        break;

      case 'newest':
        // Use timestamp comparison
        if (entry.conflict.localTimestamp && entry.conflict.remoteTimestamp) {
          const localTime = new Date(entry.conflict.localTimestamp).getTime();
          const remoteTime = new Date(entry.conflict.remoteTimestamp).getTime();
          newContent = remoteTime > localTime ?
            entry.conflict.remoteContent :
            entry.conflict.localContent;
        } else {
          newContent = entry.conflict.localContent;
        }
        break;

      default:
        throw new Error(`Unknown strategy: ${newStrategy}`);
    }

    return {
      originalResolution: entry.resolution,
      newResolution: {
        strategy: newStrategy,
        chosenContent: newContent,
        timestamp: new Date()
      }
    };
  }

  /**
   * Clear all conflict history
   */
  clear() {
    this.conflicts.clear();

    if (this.options.storage === 'file') {
      this._saveToFile();
    }
  }

  /**
   * Get total number of logged conflicts
   *
   * @returns {number} Total conflicts
   */
  count() {
    return this.conflicts.size;
  }

  /**
   * Generate unique ID for conflict log
   *
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Load conflict history from file
   *
   * @private
   */
  _loadFromFile() {
    try {
      if (fs.existsSync(this.options.storagePath)) {
        const data = fs.readFileSync(this.options.storagePath, 'utf8');

        // Validate non-empty file
        if (!data.trim()) {
          this.conflicts.clear();
          return;
        }

        const parsed = JSON.parse(data);

        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid conflict history format: expected array');
        }

        this.conflicts.clear();
        for (const entry of parsed) {
          // Validate entry structure
          if (!entry.id || !entry.conflict || !entry.resolution) {
            console.warn(`Skipping invalid entry: ${JSON.stringify(entry).substring(0, 100)}`);
            continue;
          }

          // Restore Date objects
          entry.createdAt = new Date(entry.createdAt);
          entry.resolution.timestamp = new Date(entry.resolution.timestamp);

          this.conflicts.set(entry.id, entry);
        }
      }
    } catch (error) {
      // Re-throw with context for better debugging
      throw new Error(`Failed to load conflict history from ${this.options.storagePath}: ${error.message}`);
    }
  }

  /**
   * Save conflict history to file
   *
   * @private
   */
  _saveToFile() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.options.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert Map to Array for JSON serialization
      const data = Array.from(this.conflicts.values());

      fs.writeFileSync(this.options.storagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save conflict history:', error.message);
    }
  }
}

module.exports = ConflictHistory;
