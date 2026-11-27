/**
 * BurndownChart - ASCII burndown chart generator
 *
 * Generates visual burndown charts comparing ideal vs actual task completion.
 *
 * @example Basic Usage
 * ```javascript
 * const BurndownChart = require('./lib/burndown-chart');
 * const chart = new BurndownChart();
 *
 * const rendered = await chart.generate('epic-001', {
 *   basePath: '.claude'
 * });
 * console.log(rendered);
 * ```
 *
 * @example Custom Rendering
 * ```javascript
 * const chart = new BurndownChart({ width: 80, height: 20 });
 *
 * const ideal = [10, 8, 6, 4, 2, 0];
 * const actual = [10, 9, 7, 5, 2, 0];
 *
 * const rendered = chart.renderChart(ideal, actual, {
 *   epicId: 'epic-001',
 *   epicTitle: 'User Authentication',
 *   startDate: '2025-10-01',
 *   endDate: '2025-10-05'
 * });
 * ```
 *
 * @module BurndownChart
 * @version 1.0.0
 * @since v1.29.0
 */

const FilterEngine = require('./filter-engine');
const path = require('path');

class BurndownChart {
  /**
   * Create BurndownChart instance
   *
   * @param {Object} options - Configuration options
   * @param {number} options.width - Chart width in characters (default: 60)
   * @param {number} options.height - Chart height in lines (default: 15)
   */
  constructor(options = {}) {
    this.width = options.width || 60;
    this.height = options.height || 15;
  }

  /**
   * Generate burndown chart for an epic
   *
   * @param {string} epicId - Epic ID
   * @param {Object} options - Options
   * @param {string} options.basePath - Base path (default: '.claude')
   * @param {string} options.startDate - Start date (YYYY-MM-DD, default: epic created date)
   * @param {number} options.days - Number of days (default: 30)
   * @returns {Promise<string>} - Rendered ASCII chart
   *
   * @example
   * const chart = await generator.generate('epic-001');
   * console.log(chart);
   */
  async generate(epicId, options = {}) {
    const basePath = options.basePath || '.claude';
    const filterEngine = new FilterEngine({ basePath });

    // Load epic and tasks
    const epicDir = path.join(basePath, 'epics', epicId);
    const tasks = await filterEngine.loadFiles(epicDir);

    const epicFile = tasks.find(t => t.path.endsWith('epic.md'));
    const taskFiles = tasks.filter(t => t.frontmatter.id && t.frontmatter.id !== epicId);

    if (taskFiles.length === 0) {
      return this._renderEmptyChart(epicId, epicFile);
    }

    // Determine date range
    let startDate = options.startDate;
    if (!startDate && epicFile) {
      startDate = epicFile.frontmatter.created || this._findEarliestDate(taskFiles);
    }
    if (!startDate) {
      startDate = this._formatDate(new Date());
    }

    const days = options.days || 30;

    // Calculate burndown data
    const ideal = this.calculateIdealBurndown(taskFiles.length, days);
    const actual = this.calculateActualBurndown(taskFiles, startDate, days);

    // Calculate velocity
    const velocity = this._calculateVelocity(taskFiles, startDate, days);

    // Calculate estimated completion
    const estimatedCompletion = this._estimateCompletion(taskFiles, velocity, startDate);

    // Render chart
    return this.renderChart(ideal, actual, {
      epicId,
      epicTitle: epicFile ? epicFile.frontmatter.title : epicId,
      startDate,
      endDate: this._addDays(startDate, days),
      velocity,
      estimatedCompletion
    });
  }

  /**
   * Calculate ideal burndown line
   *
   * @param {number} total - Total number of tasks
   * @param {number} days - Number of days
   * @returns {Array<number>} - Ideal burndown values
   *
   * @example
   * const ideal = chart.calculateIdealBurndown(25, 30);
   * // Returns: [25, 24.17, 23.33, ..., 0]
   */
  calculateIdealBurndown(total, days) {
    const ideal = [];
    const rate = total / days;

    for (let i = 0; i <= days; i++) {
      const remaining = Math.max(0, total - (rate * i));
      ideal.push(Math.round(remaining * 100) / 100);
    }

    return ideal;
  }

  /**
   * Calculate actual burndown from task completion
   *
   * @param {Array} tasks - Task files with frontmatter
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {number} days - Number of days
   * @returns {Array<number>} - Actual burndown values
   *
   * @example
   * const actual = chart.calculateActualBurndown(tasks, '2025-10-01', 30);
   * // Returns: [25, 24, 22, ..., 3]
   */
  calculateActualBurndown(tasks, startDate, days) {
    const actual = [];
    const total = tasks.length;

    const startDateObj = new Date(startDate);

    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + i);
      const currentDateStr = this._formatDate(currentDate);

      // Count tasks completed BEFORE this date (not including current day)
      const completedCount = tasks.filter(t => {
        // Support both frontmatter and direct object formats
        const status = t.frontmatter ? t.frontmatter.status : t.status;
        const completed = t.frontmatter ? t.frontmatter.completed : t.completed;

        if (status !== 'completed' || !completed) {
          return false;
        }
        return completed < currentDateStr;
      }).length;

      const remaining = total - completedCount;
      actual.push(remaining);
    }

    return actual;
  }

  /**
   * Render ASCII chart
   *
   * @param {Array<number>} ideal - Ideal burndown values
   * @param {Array<number>} actual - Actual burndown values
   * @param {Object} metadata - Chart metadata
   * @returns {string} - Rendered ASCII chart
   *
   * @example
   * const chart = generator.renderChart(ideal, actual, {
   *   epicId: 'epic-001',
   *   epicTitle: 'Authentication',
   *   startDate: '2025-10-01',
   *   endDate: '2025-10-30'
   * });
   */
  renderChart(ideal, actual, metadata) {
    const lines = [];

    // Title
    lines.push(`Epic: ${metadata.epicTitle} (${metadata.epicId})`);
    lines.push(`Burndown Chart - ${this._formatDateForDisplay(metadata.startDate)} to ${this._formatDateForDisplay(metadata.endDate)}`);
    lines.push('');

    // Find max value for scaling
    const maxValue = Math.max(...ideal, ...actual, 1);

    // Generate chart lines
    const chartHeight = this.height;
    const chartWidth = this.width;

    for (let row = 0; row < chartHeight; row++) {
      const value = maxValue - (row * maxValue / (chartHeight - 1));
      const valueLabel = String(Math.round(value)).padStart(4, ' ');

      let line = `${valueLabel} `;

      if (row === 0) {
        line += '┤';
      } else if (row === chartHeight - 1) {
        line += '└';
      } else {
        line += '│';
      }

      // Plot points
      const pointsPerCol = Math.max(1, ideal.length / chartWidth);

      for (let col = 0; col < chartWidth; col++) {
        const dataIndex = Math.floor(col * pointsPerCol);

        if (dataIndex >= ideal.length) {
          line += ' ';
          continue;
        }

        const idealValue = ideal[dataIndex];
        const actualValue = actual[dataIndex] !== undefined ? actual[dataIndex] : idealValue;

        const idealY = Math.round((chartHeight - 1) * (1 - idealValue / maxValue));
        const actualY = Math.round((chartHeight - 1) * (1 - actualValue / maxValue));

        if (row === idealY && row === actualY) {
          line += '●'; // Both lines at same point
        } else if (row === idealY) {
          line += '━'; // Ideal line
        } else if (row === actualY) {
          line += '╲'; // Actual line
        } else if (row > idealY && row <= actualY && actualValue > idealValue) {
          line += '╲'; // Filling actual line when behind
        } else if (row <= idealY && row > actualY && actualValue < idealValue) {
          line += '╲'; // Filling actual line when ahead
        } else {
          line += ' ';
        }
      }

      lines.push(line);
    }

    // X-axis
    const xAxis = '     ' + '─'.repeat(chartWidth);
    lines.push(xAxis);

    // Date labels
    const startDateLabel = this._formatDateForDisplay(metadata.startDate);
    const endDateLabel = this._formatDateForDisplay(metadata.endDate);

    const dateLabels = `     ${startDateLabel}${' '.repeat(chartWidth - startDateLabel.length - endDateLabel.length)}${endDateLabel}`;
    lines.push(dateLabels);
    lines.push('');

    // Legend
    lines.push('Legend: ━━━ Ideal  ╲╲╲ Actual');
    lines.push('');

    // Status
    const status = this._calculateStatus(ideal, actual);
    lines.push(`Status: ${status.text}`);

    if (metadata.velocity) {
      lines.push(`Velocity: ${metadata.velocity} tasks/week`);
    }

    if (metadata.estimatedCompletion) {
      lines.push(`Estimated Completion: ${metadata.estimatedCompletion}`);
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  _renderEmptyChart(epicId, epicFile) {
    const lines = [];
    const title = epicFile ? epicFile.frontmatter.title : epicId;

    lines.push(`Epic: ${title} (${epicId})`);
    lines.push('Burndown Chart');
    lines.push('');
    lines.push('No tasks found for this epic.');
    lines.push('');

    return lines.join('\n');
  }

  _findEarliestDate(taskFiles) {
    const dates = taskFiles
      .map(t => t.frontmatter.created)
      .filter(d => d)
      .sort();

    return dates.length > 0 ? dates[0] : this._formatDate(new Date());
  }

  _calculateVelocity(taskFiles, startDate, days) {
    const completedTasks = taskFiles.filter(t => {
      const status = t.frontmatter ? t.frontmatter.status : t.status;
      const completed = t.frontmatter ? t.frontmatter.completed : t.completed;
      return status === 'completed' && completed;
    });

    const weeks = days / 7;
    return weeks > 0 ? Math.round((completedTasks.length / weeks) * 10) / 10 : 0;
  }

  _estimateCompletion(taskFiles, velocity, startDate) {
    if (velocity === 0) return null;

    const remainingTasks = taskFiles.filter(t => {
      const status = t.frontmatter ? t.frontmatter.status : t.status;
      return status !== 'completed';
    }).length;

    const weeksRemaining = remainingTasks / velocity;
    const daysRemaining = Math.ceil(weeksRemaining * 7);

    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + daysRemaining);

    return this._formatDate(completionDate);
  }

  _calculateStatus(ideal, actual) {
    if (ideal.length === 0 || actual.length === 0) {
      return { text: 'ON TRACK', ahead: false, behind: false };
    }

    // Compare at the last non-zero point, or at 75% through the period
    // This gives a better sense of whether we're ahead/behind during execution
    const compareIndex = Math.floor(Math.min(ideal.length, actual.length) * 0.75);
    const idealValue = ideal[compareIndex];
    const actualValue = actual[compareIndex];

    const difference = idealValue - actualValue;

    // If there's minimal difference, we're on track
    if (Math.abs(difference) < 0.5) {
      return { text: 'ON TRACK', ahead: false, behind: false };
    }

    // Calculate percentage difference using initial value as base
    const initialValue = ideal[0] > 0 ? ideal[0] : 10;
    const percentDiff = Math.abs(difference / initialValue) * 100;

    if (percentDiff < 5) {
      return { text: 'ON TRACK', ahead: false, behind: false };
    } else if (difference > 0) {
      // Actual is lower than ideal = ahead of schedule (burned down more tasks)
      return {
        text: `AHEAD OF SCHEDULE (${Math.round(percentDiff)}% ahead)`,
        ahead: true,
        behind: false
      };
    } else {
      // Actual is higher than ideal = behind schedule (more tasks remaining)
      return {
        text: `BEHIND SCHEDULE (${Math.round(percentDiff)}% behind)`,
        ahead: false,
        behind: true
      };
    }
  }

  _formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _formatDateForDisplay(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();

    return `${month} ${day}`;
  }

  _addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return this._formatDate(date);
  }
}

module.exports = BurndownChart;
