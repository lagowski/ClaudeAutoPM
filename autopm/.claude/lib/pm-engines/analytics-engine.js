/**
 * AnalyticsEngine - Comprehensive analytics and insights for PRDs, Epics, and Tasks
 *
 * Provides metrics, velocity tracking, completion rates, and team performance analytics.
 *
 * @example Epic Analysis
 * ```javascript
 * const AnalyticsEngine = require('./lib/analytics-engine');
 * const engine = new AnalyticsEngine({ basePath: '.claude' });
 *
 * const analytics = await engine.analyzeEpic('epic-001');
 * console.log(analytics.status);      // Status breakdown
 * console.log(analytics.velocity);    // Velocity metrics
 * console.log(analytics.progress);    // Progress percentage
 * console.log(analytics.blockers);    // Blocked tasks
 * ```
 *
 * @example Team Metrics
 * ```javascript
 * const metrics = await engine.getTeamMetrics({ period: 30 });
 * console.log(metrics.completion);    // Completion rate
 * console.log(metrics.velocity);      // Tasks per week
 * console.log(metrics.duration);      // Average duration
 * ```
 *
 * @module AnalyticsEngine
 * @version 1.0.0
 * @since v1.29.0
 */

const FilterEngine = require('./filter-engine');
const fs = require('fs').promises;
const path = require('path');

class AnalyticsEngine {
  /**
   * Create AnalyticsEngine instance
   *
   * @param {Object} options - Configuration options
   * @param {string} options.basePath - Base path for file operations (default: '.claude')
   */
  constructor(options = {}) {
    this.basePath = options.basePath || '.claude';
    this.filterEngine = new FilterEngine({ basePath: this.basePath });
  }

  /**
   * Analyze epic with comprehensive metrics
   *
   * @param {string} epicId - Epic ID to analyze
   * @returns {Promise<Object|null>} - Analytics object or null if epic not found
   *
   * @example
   * const analytics = await engine.analyzeEpic('epic-001');
   * // Returns:
   * // {
   * //   epicId: 'epic-001',
   * //   title: 'User Authentication',
   * //   status: { total: 25, completed: 15, in_progress: 7, pending: 3 },
   * //   velocity: { current: 3.5, average: 3.2, trend: 'increasing' },
   * //   progress: { percentage: 60, remainingTasks: 10, completedTasks: 15 },
   * //   timeline: { started: '2025-01-15', lastUpdate: '2025-10-06', daysActive: 265 },
   * //   blockers: [{ taskId: 'task-003', reason: 'Waiting for API' }],
   * //   dependencies: { blocked: 2, blocking: 3 }
   * // }
   */
  async analyzeEpic(epicId) {
    // Load epic and tasks
    const epicDir = path.join(this.basePath, 'epics', epicId);

    try {
      await fs.access(epicDir);
    } catch (error) {
      return null; // Epic doesn't exist
    }

    // Load epic metadata
    const epicFile = path.join(epicDir, 'epic.md');
    let epicMetadata = {};
    try {
      const epicContent = await fs.readFile(epicFile, 'utf8');
      const parsed = this.filterEngine.parseFrontmatter(epicContent);
      epicMetadata = parsed.frontmatter;
    } catch (error) {
      epicMetadata = { id: epicId, title: epicId };
    }

    // Load all tasks for this epic
    const tasks = await this.filterEngine.loadFiles(epicDir);
    const taskFiles = tasks.filter(t => t.frontmatter.id && t.frontmatter.id !== epicId);

    if (taskFiles.length === 0) {
      return {
        epicId,
        title: epicMetadata.title || epicId,
        status: { total: 0, completed: 0, in_progress: 0, pending: 0, blocked: 0 },
        velocity: { current: 0, average: 0, trend: 'stable' },
        progress: { percentage: 0, remainingTasks: 0, completedTasks: 0 },
        timeline: {
          started: epicMetadata.created || null,
          lastUpdate: epicMetadata.updated || null,
          daysActive: 0,
          estimatedCompletion: null
        },
        blockers: [],
        dependencies: { blocked: 0, blocking: 0 }
      };
    }

    // Calculate status breakdown
    const status = this._calculateStatusBreakdown(taskFiles);

    // Calculate progress
    const progress = this._calculateProgress(taskFiles);

    // Calculate velocity
    const velocity = await this._calculateVelocityForEpic(taskFiles);

    // Calculate timeline
    const timeline = this._calculateTimeline(epicMetadata, taskFiles, velocity.average);

    // Find blockers
    const blockers = this._findBlockersInTasks(taskFiles);

    // Calculate dependencies
    const dependencies = this._calculateDependencies(taskFiles);

    return {
      epicId,
      title: epicMetadata.title || epicId,
      status,
      velocity,
      progress,
      timeline,
      blockers,
      dependencies
    };
  }

  /**
   * Get team metrics for specified period
   *
   * @param {Object} options - Options
   * @param {number} options.period - Number of days (default: 30)
   * @param {string[]} options.types - Types to include (default: ['prd', 'epic', 'task'])
   * @returns {Promise<Object>} - Team metrics
   *
   * @example
   * const metrics = await engine.getTeamMetrics({ period: 30 });
   * // Returns:
   * // {
   * //   period: { start: '2025-09-06', end: '2025-10-06', days: 30 },
   * //   completion: { total: 150, completed: 120, rate: 0.80 },
   * //   velocity: { tasksPerWeek: 28, epicsPerMonth: 6 },
   * //   duration: { averageTaskDays: 2.5, averageEpicDays: 21 },
   * //   breakdown: { prd: {...}, epic: {...}, task: {...} }
   * // }
   */
  async getTeamMetrics(options = {}) {
    const period = options.period || 30;
    const types = options.types || ['prd', 'epic', 'task'];

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - period);

    const startDateStr = this._formatDate(startDate);
    const endDateStr = this._formatDate(endDate);

    // Load all files
    const allFiles = [];

    for (const type of types) {
      let typeFiles;
      if (type === 'task') {
        // Load tasks from all epics
        typeFiles = await this._loadAllTasks();
      } else if (type === 'epic') {
        // Load epics from epic directories
        typeFiles = await this._loadAllEpics();
      } else {
        const dir = path.join(this.basePath, `${type}s`);
        typeFiles = await this.filterEngine.loadFiles(dir);
      }

      // Filter by date range
      const filteredFiles = typeFiles.filter(f => {
        const created = f.frontmatter.created;
        if (!created) return false;
        return created >= startDateStr && created <= endDateStr;
      });

      allFiles.push(...filteredFiles.map(f => ({ ...f, type })));
    }

    // Calculate completion metrics
    const completion = this._calculateCompletionMetrics(allFiles);

    // Calculate velocity
    const velocity = this._calculateVelocityMetrics(allFiles, period);

    // Calculate duration
    const duration = this._calculateDurationMetrics(allFiles);

    // Calculate breakdown by type
    const breakdown = this._calculateBreakdown(allFiles);

    return {
      period: {
        start: startDateStr,
        end: endDateStr,
        days: period
      },
      completion,
      velocity,
      duration,
      breakdown
    };
  }

  /**
   * Calculate velocity for an epic
   *
   * @param {string} epicId - Epic ID
   * @param {number} periodDays - Period in days (default: 7)
   * @returns {Promise<Object>} - Velocity metrics
   *
   * @example
   * const velocity = await engine.calculateVelocity('epic-001', 7);
   * // Returns: { tasksPerWeek: 3.5, completedInPeriod: 7, periodDays: 7 }
   */
  async calculateVelocity(epicId, periodDays = 7) {
    const epicDir = path.join(this.basePath, 'epics', epicId);
    const tasks = await this.filterEngine.loadFiles(epicDir);
    const taskFiles = tasks.filter(t => t.frontmatter.id && t.frontmatter.id !== epicId);

    return this._calculateVelocityForPeriod(taskFiles, periodDays);
  }

  /**
   * Get completion rate for a type
   *
   * @param {string} type - Type (task/epic/prd)
   * @param {number} periodDays - Period in days (default: 30)
   * @returns {Promise<Object>} - Completion rate
   *
   * @example
   * const rate = await engine.getCompletionRate('task', 30);
   * // Returns: { total: 150, completed: 120, rate: 0.80 }
   */
  async getCompletionRate(type, periodDays = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = this._formatDate(startDate);

    let files;
    if (type === 'task') {
      files = await this._loadAllTasks();
    } else if (type === 'epic') {
      files = await this._loadAllEpics();
    } else {
      const dir = path.join(this.basePath, `${type}s`);
      files = await this.filterEngine.loadFiles(dir);
    }

    // Filter by date range
    const filteredFiles = files.filter(f => {
      const created = f.frontmatter.created;
      if (!created) return false;
      return created >= startDateStr;
    });

    const total = filteredFiles.length;
    const completed = filteredFiles.filter(f => f.frontmatter.status === 'completed').length;
    const rate = total > 0 ? completed / total : 0;

    return { total, completed, rate };
  }

  /**
   * Find blockers for an epic
   *
   * @param {string} epicId - Epic ID
   * @returns {Promise<Array>} - Array of blocked tasks
   *
   * @example
   * const blockers = await engine.findBlockers('epic-001');
   * // Returns: [
   * //   { taskId: 'task-003', reason: 'Waiting for API access' },
   * //   { taskId: 'task-012', reason: 'Depends on task-003' }
   * // ]
   */
  async findBlockers(epicId) {
    const epicDir = path.join(this.basePath, 'epics', epicId);
    const tasks = await this.filterEngine.loadFiles(epicDir);
    const taskFiles = tasks.filter(t => t.frontmatter.id && t.frontmatter.id !== epicId);

    return this._findBlockersInTasks(taskFiles);
  }

  /**
   * Export analytics to JSON or CSV
   *
   * @param {Object} analytics - Analytics object
   * @param {string} format - Format (json/csv, default: json)
   * @returns {Promise<string>} - Exported data
   *
   * @example
   * const analytics = await engine.analyzeEpic('epic-001');
   * const json = await engine.export(analytics, 'json');
   * const csv = await engine.export(analytics, 'csv');
   */
  async export(analytics, format = 'json') {
    if (format === 'csv') {
      return this._exportToCSV(analytics);
    }

    return JSON.stringify(analytics, null, 2);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  _calculateStatusBreakdown(taskFiles) {
    const status = {
      total: taskFiles.length,
      completed: 0,
      in_progress: 0,
      pending: 0,
      blocked: 0
    };

    for (const task of taskFiles) {
      const taskStatus = task.frontmatter.status;
      if (taskStatus === 'completed') {
        status.completed++;
      } else if (taskStatus === 'in_progress') {
        status.in_progress++;
      } else if (taskStatus === 'blocked') {
        status.blocked++;
      } else if (taskStatus === 'pending') {
        status.pending++;
      }
    }

    return status;
  }

  _calculateProgress(taskFiles) {
    const total = taskFiles.length;
    const completed = taskFiles.filter(t => t.frontmatter.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      percentage,
      completedTasks: completed,
      remainingTasks: total - completed
    };
  }

  async _calculateVelocityForEpic(taskFiles) {
    // Calculate current velocity (last 7 days)
    const current = await this._calculateVelocityForPeriod(taskFiles, 7);

    // Calculate average velocity (all time)
    const completedTasks = taskFiles.filter(t =>
      t.frontmatter.status === 'completed' && t.frontmatter.completed
    );

    if (completedTasks.length === 0) {
      return {
        current: 0,
        average: 0,
        trend: 'stable'
      };
    }

    // Get date range
    const dates = completedTasks
      .map(t => new Date(t.frontmatter.completed))
      .sort((a, b) => a - b);

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
    const totalWeeks = totalDays / 7;

    const average = totalWeeks > 0 ? completedTasks.length / totalWeeks : 0;

    // Determine trend
    let trend = 'stable';
    if (current.tasksPerWeek > average * 1.1) {
      trend = 'increasing';
    } else if (current.tasksPerWeek < average * 0.9) {
      trend = 'decreasing';
    }

    return {
      current: Math.round(current.tasksPerWeek * 10) / 10,
      average: Math.round(average * 10) / 10,
      trend
    };
  }

  _calculateVelocityForPeriod(taskFiles, periodDays) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - periodDays);

    const completedInPeriod = taskFiles.filter(t => {
      if (t.frontmatter.status !== 'completed' || !t.frontmatter.completed) {
        return false;
      }
      const completedDate = new Date(t.frontmatter.completed);
      return completedDate >= startDate && completedDate <= endDate;
    }).length;

    const weeks = periodDays / 7;
    const tasksPerWeek = weeks > 0 ? completedInPeriod / weeks : 0;

    return {
      tasksPerWeek: Math.round(tasksPerWeek * 10) / 10,
      completedInPeriod,
      periodDays
    };
  }

  _calculateTimeline(epicMetadata, taskFiles, averageVelocity) {
    const started = epicMetadata.created || null;
    const lastUpdate = epicMetadata.updated || this._findLastUpdateDate(taskFiles);

    let daysActive = 0;
    if (started) {
      const startDate = new Date(started);
      const endDate = lastUpdate ? new Date(lastUpdate) : new Date();
      daysActive = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }

    // Estimate completion
    let estimatedCompletion = null;
    if (averageVelocity > 0) {
      const remainingTasks = taskFiles.filter(t => t.frontmatter.status !== 'completed').length;
      const weeksRemaining = remainingTasks / averageVelocity;
      const daysRemaining = Math.ceil(weeksRemaining * 7);

      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + daysRemaining);
      estimatedCompletion = this._formatDate(completionDate);
    }

    return {
      started,
      lastUpdate,
      daysActive,
      estimatedCompletion
    };
  }

  _findLastUpdateDate(taskFiles) {
    const dates = taskFiles
      .map(t => t.frontmatter.updated || t.frontmatter.completed || t.frontmatter.created)
      .filter(d => d)
      .sort()
      .reverse();

    return dates.length > 0 ? dates[0] : null;
  }

  _findBlockersInTasks(taskFiles) {
    const blockers = [];

    for (const task of taskFiles) {
      if (task.frontmatter.status === 'blocked') {
        blockers.push({
          taskId: task.frontmatter.id,
          reason: task.frontmatter.blocker_reason || 'Unknown reason'
        });
      }
    }

    return blockers;
  }

  _calculateDependencies(taskFiles) {
    let blocked = 0;
    let blocking = 0;

    for (const task of taskFiles) {
      if (task.frontmatter.depends_on && task.frontmatter.depends_on.length > 0) {
        blocked++;
      }
      if (task.frontmatter.blocks && task.frontmatter.blocks.length > 0) {
        blocking += task.frontmatter.blocks.length;
      }
    }

    return { blocked, blocking };
  }

  async _loadAllTasks() {
    const epicsDir = path.join(this.basePath, 'epics');

    try {
      await fs.access(epicsDir);
    } catch (error) {
      return [];
    }

    const epicDirs = await fs.readdir(epicsDir);
    const allTasks = [];

    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsDir, epicDir);
      const stat = await fs.stat(epicPath);

      if (stat.isDirectory()) {
        const tasks = await this.filterEngine.loadFiles(epicPath);
        const taskFiles = tasks.filter(t => t.frontmatter.id && !t.path.endsWith('epic.md'));
        allTasks.push(...taskFiles);
      }
    }

    return allTasks;
  }

  async _loadAllEpics() {
    const epicsDir = path.join(this.basePath, 'epics');

    try {
      await fs.access(epicsDir);
    } catch (error) {
      return [];
    }

    const epicDirs = await fs.readdir(epicsDir);
    const allEpics = [];

    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsDir, epicDir);
      const stat = await fs.stat(epicPath);

      if (stat.isDirectory()) {
        const files = await this.filterEngine.loadFiles(epicPath);
        const epicFile = files.find(f => f.path.endsWith('epic.md'));
        if (epicFile) {
          allEpics.push(epicFile);
        }
      }
    }

    return allEpics;
  }

  _calculateCompletionMetrics(allFiles) {
    const total = allFiles.length;
    const completed = allFiles.filter(f => f.frontmatter.status === 'completed').length;
    const rate = total > 0 ? completed / total : 0;

    return { total, completed, rate: Math.round(rate * 100) / 100 };
  }

  _calculateVelocityMetrics(allFiles, periodDays) {
    const tasks = allFiles.filter(f => f.type === 'task');
    const completedTasks = tasks.filter(t =>
      t.frontmatter.status === 'completed' && t.frontmatter.completed
    );

    const weeks = periodDays / 7;
    const tasksPerWeek = weeks > 0 ? completedTasks.length / weeks : 0;

    const epics = allFiles.filter(f => f.type === 'epic');
    const completedEpics = epics.filter(e => e.frontmatter.status === 'completed');
    const months = periodDays / 30;
    const epicsPerMonth = months > 0 ? completedEpics.length / months : 0;

    return {
      tasksPerWeek: Math.round(tasksPerWeek * 10) / 10,
      epicsPerMonth: Math.round(epicsPerMonth * 10) / 10
    };
  }

  _calculateDurationMetrics(allFiles) {
    const tasks = allFiles.filter(f =>
      f.type === 'task' &&
      f.frontmatter.status === 'completed' &&
      f.frontmatter.created &&
      f.frontmatter.completed
    );

    let totalTaskDays = 0;
    for (const task of tasks) {
      const created = new Date(task.frontmatter.created);
      const completed = new Date(task.frontmatter.completed);
      const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
      totalTaskDays += days;
    }

    const averageTaskDays = tasks.length > 0 ? totalTaskDays / tasks.length : 0;

    const epics = allFiles.filter(f =>
      f.type === 'epic' &&
      f.frontmatter.status === 'completed' &&
      f.frontmatter.created &&
      f.frontmatter.completed
    );

    let totalEpicDays = 0;
    for (const epic of epics) {
      const created = new Date(epic.frontmatter.created);
      const completed = new Date(epic.frontmatter.completed);
      const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
      totalEpicDays += days;
    }

    const averageEpicDays = epics.length > 0 ? totalEpicDays / epics.length : 0;

    return {
      averageTaskDays: Math.round(averageTaskDays * 10) / 10,
      averageEpicDays: Math.round(averageEpicDays * 10) / 10
    };
  }

  _calculateBreakdown(allFiles) {
    const breakdown = {};

    const types = ['prd', 'epic', 'task'];
    for (const type of types) {
      const typeFiles = allFiles.filter(f => f.type === type);
      const total = typeFiles.length;
      const completed = typeFiles.filter(f => f.frontmatter.status === 'completed').length;

      breakdown[type] = { total, completed };
    }

    return breakdown;
  }

  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _exportToCSV(analytics) {
    const lines = [];

    // Header
    lines.push('Metric,Value');

    // Epic info
    lines.push(`Epic ID,${analytics.epicId}`);
    lines.push(`Title,${analytics.title}`);

    // Status
    lines.push(`Total Tasks,${analytics.status.total}`);
    lines.push(`Completed,${analytics.status.completed}`);
    lines.push(`In Progress,${analytics.status.in_progress}`);
    lines.push(`Pending,${analytics.status.pending}`);
    lines.push(`Blocked,${analytics.status.blocked}`);

    // Progress
    lines.push(`Progress %,${analytics.progress.percentage}`);

    // Velocity
    lines.push(`Current Velocity,${analytics.velocity.current}`);
    lines.push(`Average Velocity,${analytics.velocity.average}`);
    lines.push(`Trend,${analytics.velocity.trend}`);

    // Timeline
    lines.push(`Started,${analytics.timeline.started || 'N/A'}`);
    lines.push(`Last Update,${analytics.timeline.lastUpdate || 'N/A'}`);
    lines.push(`Days Active,${analytics.timeline.daysActive}`);
    lines.push(`Est. Completion,${analytics.timeline.estimatedCompletion || 'N/A'}`);

    // Dependencies
    lines.push(`Blocked Tasks,${analytics.dependencies.blocked}`);
    lines.push(`Blocking Tasks,${analytics.dependencies.blocking}`);

    // Blockers
    lines.push(`Total Blockers,${analytics.blockers.length}`);

    return lines.join('\n');
  }
}

module.exports = AnalyticsEngine;
