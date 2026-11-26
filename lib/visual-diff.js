/**
 * Visual Diff Renderer
 *
 * Renders ASCII side-by-side comparisons of text differences.
 * Highlights conflicting sections and provides context lines.
 *
 * @example
 * const VisualDiff = require('./lib/visual-diff');
 *
 * const diff = new VisualDiff({
 *   columnWidth: 80
 * });
 *
 * // Render side-by-side comparison
 * const rendered = diff.sideBySide(localContent, remoteContent);
 * console.log(rendered);
 *
 * // Highlight conflicts
 * const highlighted = diff.highlightConflicts(text, conflicts);
 *
 * // Render with context
 * const context = diff.renderContext(text, [5, 10], 3);
 */

class VisualDiff {
  /**
   * Create a new VisualDiff instance
   *
   * @param {Object} options - Configuration options
   * @param {number} options.columnWidth - Width of each column in side-by-side view (default: 60)
   * @param {boolean} options.showLineNumbers - Show line numbers (default: true)
   * @param {string} options.separator - Column separator (default: ' | ')
   */
  constructor(options = {}) {
    // Validate configuration
    if (options.columnWidth !== undefined) {
      if (typeof options.columnWidth !== 'number' || options.columnWidth <= 0) {
        throw new Error('columnWidth must be a positive number');
      }
    }

    this.options = {
      columnWidth: options.columnWidth || 60,
      showLineNumbers: options.showLineNumbers !== false,
      separator: options.separator || ' | '
    };
  }

  /**
   * Render side-by-side comparison of two text versions
   *
   * @param {string} left - Left side content (local)
   * @param {string} right - Right side content (remote)
   * @param {Object} options - Rendering options
   * @returns {string} ASCII side-by-side comparison
   */
  sideBySide(left, right, options = {}) {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');

    const maxLines = Math.max(leftLines.length, rightLines.length);

    const output = [];

    // Header
    const colWidth = this.options.columnWidth;
    const header = this._padRight('LOCAL', colWidth) +
                   this.options.separator +
                   this._padRight('REMOTE', colWidth);
    output.push(header);
    output.push('='.repeat(header.length));

    // Content lines
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';

      const lineNum = this.options.showLineNumbers ? `${(i + 1).toString().padStart(4)} ` : '';

      const leftContent = this._truncate(leftLine, colWidth - lineNum.length);
      const rightContent = this._truncate(rightLine, colWidth - lineNum.length);

      // Mark differences
      const marker = leftLine !== rightLine ? '*' : ' ';

      const line = marker + lineNum + this._padRight(leftContent, colWidth - lineNum.length - 1) +
                   this.options.separator +
                   marker + lineNum + this._padRight(rightContent, colWidth - lineNum.length - 1);

      output.push(line);
    }

    return output.join('\n');
  }

  /**
   * Highlight conflicts in text with conflict markers
   *
   * @param {string} text - Original text
   * @param {Array<Object>} conflicts - Array of conflict objects
   * @returns {string} Text with conflict markers inserted
   */
  highlightConflicts(text, conflicts) {
    const lines = text.split('\n');

    // Sort conflicts by line number (ascending)
    const sortedConflicts = [...conflicts].sort((a, b) => a.line - b.line);

    // Build result in a single pass
    const result = [];
    let conflictIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      // Check if current line matches the next conflict
      if (
        conflictIdx < sortedConflicts.length &&
        sortedConflicts[conflictIdx].line - 1 === i
      ) {
        const conflict = sortedConflicts[conflictIdx];
        result.push('<<<<<<< LOCAL');
        result.push(conflict.localContent);
        result.push('=======');
        result.push(conflict.remoteContent);
        result.push('>>>>>>> REMOTE');
        conflictIdx++;
      } else {
        result.push(lines[i]);
      }
    }

    return result.join('\n');
  }

  /**
   * Render context lines around specified line numbers
   *
   * @param {string} text - Full text content
   * @param {Array<number>} lineNumbers - Line numbers to show context for
   * @param {number} contextLines - Number of context lines before and after (default: 3)
   * @returns {string} Text with only context lines
   */
  renderContext(text, lineNumbers, contextLines = 3) {
    const lines = text.split('\n');
    const lineSet = new Set();

    // Add context lines for each specified line number
    for (const lineNum of lineNumbers) {
      const lineIndex = lineNum - 1; // Convert to 0-based

      // Add lines in context range
      const start = Math.max(0, lineIndex - contextLines);
      const end = Math.min(lines.length - 1, lineIndex + contextLines);

      for (let i = start; i <= end; i++) {
        lineSet.add(i);
      }
    }

    // Convert to sorted array
    const includedLines = Array.from(lineSet).sort((a, b) => a - b);

    // Build output with ellipsis for gaps
    const output = [];
    let lastLine = -2;

    for (const lineIndex of includedLines) {
      // Add ellipsis if there's a gap
      if (lineIndex > lastLine + 1) {
        output.push('...');
      }

      // Add the line with line number
      const lineNum = (lineIndex + 1).toString().padStart(4);
      output.push(`${lineNum} | ${lines[lineIndex]}`);

      lastLine = lineIndex;
    }

    return output.join('\n');
  }

  /**
   * Calculate diff statistics
   *
   * @param {string} left - Left side content
   * @param {string} right - Right side content
   * @returns {Object} Diff statistics
   */
  getStats(left, right) {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');

    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;

    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i];
      const rightLine = rightLines[i];

      if (leftLine === undefined && rightLine !== undefined) {
        added++;
      } else if (leftLine !== undefined && rightLine === undefined) {
        removed++;
      } else if (leftLine !== rightLine) {
        modified++;
      } else {
        unchanged++;
      }
    }

    return {
      added,
      removed,
      modified,
      unchanged,
      total: maxLines
    };
  }

  /**
   * Truncate text to fit within column width
   *
   * @private
   * @param {string} text - Text to truncate
   * @param {number} maxWidth - Maximum width
   * @returns {string} Truncated text
   */
  _truncate(text, maxWidth) {
    if (text.length <= maxWidth) {
      return text;
    }
    // If maxWidth is less than 3, we can't fit the ellipsis, so just truncate to maxWidth
    if (maxWidth < 3) {
      return text.substring(0, maxWidth);
    }
    return text.substring(0, maxWidth - 3) + '...';
  }

  /**
   * Pad text to the right with spaces
   *
   * @private
   * @param {string} text - Text to pad
   * @param {number} width - Target width
   * @returns {string} Padded text
   */
  _padRight(text, width) {
    if (text.length >= width) {
      return text.substring(0, width);
    }

    return text + ' '.repeat(width - text.length);
  }

  /**
   * Render unified diff format (similar to git diff)
   *
   * @param {string} left - Left side content
   * @param {string} right - Right side content
   * @param {Object} options - Rendering options
   * @returns {string} Unified diff output
   */
  unified(left, right, options = {}) {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');

    const output = [];
    output.push('--- LOCAL');
    output.push('+++ REMOTE');
    output.push(`@@ -1,${leftLines.length} +1,${rightLines.length} @@`);

    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i];
      const rightLine = rightLines[i];

      if (leftLine === rightLine) {
        output.push(` ${leftLine || ''}`);
      } else if (leftLine === undefined) {
        output.push(`+${rightLine}`);
      } else if (rightLine === undefined) {
        output.push(`-${leftLine}`);
      } else {
        output.push(`-${leftLine}`);
        output.push(`+${rightLine}`);
      }
    }

    return output.join('\n');
  }
}

module.exports = VisualDiff;
