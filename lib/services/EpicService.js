/**
 * EpicService - Epic Management Service
 *
 * Pure service layer for epic operations following ClaudeAutoPM patterns.
 * Follows 3-layer architecture: Service (logic) -> Provider (I/O) -> CLI (presentation)
 *
 * Provides comprehensive epic lifecycle management:
 *
 * 1. Status & Categorization (5 methods):
 *    - categorizeStatus: Categorize epic status
 *    - isTaskClosed: Check if task is completed
 *    - calculateProgress: Calculate completion percentage
 *    - generateProgressBar: Generate visual progress bar
 *    - hasValidDependencies: Validate dependency format
 *
 * 2. GitHub Integration (2 methods):
 *    - extractGitHubIssue: Extract issue number from URL
 *    - formatGitHubUrl: Build GitHub URL
 *
 * 3. Content Analysis (3 methods):
 *    - analyzePRD: Analyze PRD using PRDService
 *    - determineDependencies: Determine feature dependencies
 *    - generateEpicMetadata: Generate epic frontmatter
 *
 * 4. Content Generation (2 methods):
 *    - generateEpicContent: Build complete epic markdown
 *    - buildTaskSection: Format tasks as markdown list
 *
 * 5. GitHub Epic Sync Methods (6 methods):
 *    - syncEpicToGitHub: Push epic to GitHub with conflict detection
 *    - syncEpicFromGitHub: Pull GitHub epic to local
 *    - syncEpicBidirectional: Full bidirectional sync
 *    - createGitHubEpic: Create GitHub issue with "epic" label
 *    - updateGitHubEpic: Update GitHub epic
 *    - getEpicSyncStatus: Get sync status for epic
 *
 * Documentation Queries:
 * - mcp://context7/agile/epic-management - Epic management best practices
 * - mcp://context7/agile/task-breakdown - Task breakdown patterns
 * - mcp://context7/project-management/dependencies - Dependency management
 * - mcp://context7/markdown/frontmatter - YAML frontmatter patterns
 * - mcp://context7/github/issues-api - GitHub Issues API v3 best practices
 * - mcp://context7/conflict-resolution/sync - Conflict resolution strategies
 */
const fs = require('../utils/fs');

class EpicService {
  /**
   * Create a new EpicService instance
   *
   * @param {Object} options - Configuration options
   * @param {PRDService} options.prdService - PRDService instance for parsing (optional for CLI operations)
   * @param {ConfigManager} [options.configManager] - Optional ConfigManager instance
   * @param {Object} [options.provider] - Optional AI provider instance for streaming
   * @param {string} [options.epicsDir] - Path to epics directory (default: .claude/epics)
   * @param {string} [options.defaultStatus] - Default epic status (default: backlog)
   */
  constructor(options = {}) {
    // PRDService is optional now - only required for PRD parsing operations
    this.prdService = options.prdService || null;

    // Store ConfigManager if provided (for future use)
    this.configManager = options.configManager || undefined;

    // Store provider if provided (for streaming operations)
    this.provider = options.provider || undefined;

    // CLI operation options
    this.options = {
      epicsDir: options.epicsDir || '.claude/epics',
      defaultStatus: options.defaultStatus || 'backlog',
      ...options
    };
  }

  // ==========================================
  // 1. STATUS & CATEGORIZATION (5 METHODS)
  // ==========================================

  /**
   * Categorize epic status into standard buckets
   *
   * Maps various status strings to standardized categories:
   * - backlog: Not started, awaiting prioritization
   * - planning: Planning/draft phase
   * - in_progress: Active development
   * - done: Completed/closed
   *
   * @param {string} status - Raw status string
   * @returns {string} Categorized status (backlog|planning|in_progress|done)
   *
   * @example
   * categorizeStatus('in-progress')  // Returns 'in_progress'
   * categorizeStatus('completed')    // Returns 'done'
   * categorizeStatus('unknown')      // Returns 'planning' (default)
   */
  categorizeStatus(status) {
    const lowerStatus = (status || '').toLowerCase();

    // Backlog statuses
    if (lowerStatus === 'backlog') {
      return 'backlog';
    }

    // Planning statuses
    if (['planning', 'draft', ''].includes(lowerStatus)) {
      return 'planning';
    }

    // In-progress statuses
    if (['in-progress', 'in_progress', 'active', 'started'].includes(lowerStatus)) {
      return 'in_progress';
    }

    // Completed statuses
    if (['completed', 'complete', 'done', 'closed', 'finished'].includes(lowerStatus)) {
      return 'done';
    }

    // Default to planning for unknown statuses
    return 'planning';
  }

  /**
   * Check if task is in closed/completed state
   *
   * @param {Object} task - Task object with status field
   * @returns {boolean} True if task is closed/completed
   *
   * @example
   * isTaskClosed({ status: 'closed' })     // Returns true
   * isTaskClosed({ status: 'open' })       // Returns false
   */
  isTaskClosed(task) {
    const status = (task?.status || '').toLowerCase();
    return ['closed', 'completed'].includes(status);
  }

  /**
   * Calculate progress percentage from task array
   *
   * Calculates completion percentage based on closed vs total tasks.
   * Returns 0 for empty or null arrays.
   *
   * @param {Array<Object>} tasks - Array of task objects with status
   * @returns {number} Progress percentage (0-100), rounded to nearest integer
   *
   * @example
   * calculateProgress([
   *   { status: 'closed' },
   *   { status: 'open' }
   * ])  // Returns 50
   */
  calculateProgress(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return 0;
    }

    const closedCount = tasks.filter(task => this.isTaskClosed(task)).length;
    const percent = Math.round((closedCount * 100) / tasks.length);

    return percent;
  }

  /**
   * Generate visual progress bar
   *
   * Creates ASCII progress bar with filled/empty characters.
   *
   * @param {number} percent - Progress percentage (0-100)
   * @param {number} totalChars - Total bar length in characters (default: 20)
   * @returns {Object} Progress bar data:
   *   - bar: String representation of progress bar
   *   - percent: Input percentage
   *   - filled: Number of filled characters
   *   - empty: Number of empty characters
   *
   * @example
   * generateProgressBar(50, 20)
   * // Returns: {
   * //   bar: '[██████████░░░░░░░░░░]',
   * //   percent: 50,
   * //   filled: 10,
   * //   empty: 10
   * // }
   */
  generateProgressBar(percent, totalChars = 20) {
    const filled = Math.round((percent * totalChars) / 100);
    const empty = totalChars - filled;

    let bar = '[';
    bar += '█'.repeat(filled);
    bar += '░'.repeat(empty);
    bar += ']';

    return {
      bar,
      percent,
      filled,
      empty
    };
  }

  /**
   * Validate if dependency string has valid content
   *
   * Checks if dependency string contains actual dependency data
   * after cleaning up formatting (brackets, whitespace, etc).
   *
   * @param {string} dependencies - Dependency string to validate
   * @returns {boolean} True if dependencies are present and valid
   *
   * @example
   * hasValidDependencies('epic-123')        // Returns true
   * hasValidDependencies('[epic-1, epic-2]') // Returns true
   * hasValidDependencies('[]')              // Returns false
   * hasValidDependencies('depends_on:')     // Returns false
   */
  hasValidDependencies(dependencies) {
    if (!dependencies || typeof dependencies !== 'string') {
      return false;
    }

    // Handle malformed dependency strings
    if (dependencies === 'depends_on:') {
      return false;
    }

    // Clean up the dependency string
    let cleanDeps = dependencies.trim();

    // Remove array brackets if present
    cleanDeps = cleanDeps.replace(/^\[|\]$/g, '');

    // Check if there's actual content after cleaning
    cleanDeps = cleanDeps.trim();

    return cleanDeps.length > 0;
  }

  // ==========================================
  // 2. GITHUB INTEGRATION (2 METHODS)
  // ==========================================

  /**
   * Extract GitHub issue number from URL
   *
   * Extracts numeric issue/PR number from GitHub URL.
   * Supports both issues and pull requests.
   *
   * @param {string} githubUrl - GitHub issue or PR URL
   * @returns {string|null} Issue number or null if not found
   *
   * @example
   * extractGitHubIssue('https://github.com/user/repo/issues/123')
   * // Returns '123'
   *
   * extractGitHubIssue('https://github.com/user/repo/pull/456')
   * // Returns '456'
   */
  extractGitHubIssue(githubUrl) {
    if (!githubUrl) {
      return null;
    }

    // Match issue/PR number at end of URL (before optional trailing slash or query params)
    const match = githubUrl.match(/\/(\d+)(?:\/|\?|$)/);
    return match ? match[1] : null;
  }

  /**
   * Format GitHub issue URL from components
   *
   * Builds standard GitHub issue URL from owner, repo, and issue number.
   *
   * @param {string} repoOwner - GitHub repository owner
   * @param {string} repoName - GitHub repository name
   * @param {number|string} issueNumber - Issue number
   * @returns {string} Formatted GitHub URL
   * @throws {Error} If required parameters are missing
   *
   * @example
   * formatGitHubUrl('user', 'repo', 123)
   * // Returns 'https://github.com/user/repo/issues/123'
   */
  formatGitHubUrl(repoOwner, repoName, issueNumber) {
    if (!repoOwner || repoOwner.trim() === '') {
      throw new Error('Repository owner is required');
    }

    if (!repoName || repoName.trim() === '') {
      throw new Error('Repository name is required');
    }

    if (!issueNumber) {
      throw new Error('Issue number is required');
    }

    return `https://github.com/${repoOwner}/${repoName}/issues/${issueNumber}`;
  }

  // ==========================================
  // 3. CONTENT ANALYSIS (3 METHODS)
  // ==========================================

  /**
   * Analyze PRD content using PRDService
   *
   * Parses PRD markdown to extract frontmatter and sections.
   * Uses injected PRDService for parsing logic.
   *
   * @param {string} prdContent - PRD markdown content
   * @returns {Object} Analysis result:
   *   - frontmatter: Parsed YAML frontmatter
   *   - sections: Extracted PRD sections (vision, features, etc)
   *
   * @example
   * analyzePRD(prdMarkdown)
   * // Returns:
   * // {
   * //   frontmatter: { title: 'Feature', priority: 'P1' },
   * //   sections: { vision: '...', features: [...] }
   * // }
   */
  analyzePRD(prdContent) {
    if (!this.prdService) {
      throw new Error('PRDService instance is required for PRD analysis operations');
    }

    const frontmatter = this.prdService.parseFrontmatter(prdContent);
    const sections = this.prdService.extractPrdContent(prdContent);

    return {
      frontmatter,
      sections
    };
  }

  /**
   * Parse YAML frontmatter from markdown content
   *
   * Extracts key-value pairs from YAML frontmatter block.
   * Returns null if frontmatter is missing or malformed.
   *
   * @param {string} content - Markdown content with frontmatter
   * @returns {Object|null} Parsed frontmatter object or null
   */
  parseFrontmatter(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }

    // Match frontmatter block: ---\n...\n--- or ---\n---
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/) ||
                             content.match(/^---\n---/);

    if (!frontmatterMatch) {
      return null;
    }

    // Empty frontmatter (---\n---)
    if (!frontmatterMatch[1] && content.startsWith('---\n---')) {
      return {};
    }

    const frontmatter = {};
    const lines = (frontmatterMatch[1] || '').split('\n');

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Find first colon to split key and value
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue; // Skip lines without colons
      }

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key) {
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  /**
   * Determine dependencies between features
   *
   * Analyzes feature types to determine natural dependencies:
   * - Frontend depends on Backend
   * - Backend depends on Data
   * - Integration depends on all others
   *
   * @param {Array<Object>} features - Array of feature objects with type
   * @returns {Object} Dependency map: { featureName: [dependency1, dependency2] }
   *
   * @example
   * determineDependencies([
   *   { name: 'UI', type: 'frontend' },
   *   { name: 'API', type: 'backend' }
   * ])
   * // Returns: { 'UI': ['API'] }
   */
  determineDependencies(features) {
    if (!Array.isArray(features) || features.length === 0) {
      return {};
    }

    const dependencies = {};

    // Find features by type
    const backendFeatures = features.filter(f => f.type === 'backend');
    const dataFeatures = features.filter(f => f.type === 'data');
    const frontendFeatures = features.filter(f => f.type === 'frontend');

    // Frontend depends on Backend
    frontendFeatures.forEach(frontend => {
      if (backendFeatures.length > 0) {
        dependencies[frontend.name] = backendFeatures.map(b => b.name);
      }
    });

    // Backend depends on Data
    backendFeatures.forEach(backend => {
      if (dataFeatures.length > 0) {
        dependencies[backend.name] = dataFeatures.map(d => d.name);
      }
    });

    return dependencies;
  }

  /**
   * Generate epic metadata (frontmatter)
   *
   * Creates standardized epic frontmatter with required and optional fields.
   *
   * @param {string} name - Epic name
   * @param {string} prdId - PRD identifier
   * @param {Object} options - Optional metadata overrides
   * @param {string} options.status - Epic status (default: 'backlog')
   * @param {string} options.priority - Priority level (default: 'P2')
   * @returns {Object} Epic metadata object
   * @throws {Error} If required parameters are missing
   *
   * @example
   * generateEpicMetadata('user-auth', 'prd-123', { priority: 'P1' })
   * // Returns:
   * // {
   * //   name: 'user-auth',
   * //   status: 'backlog',
   * //   prd_id: 'prd-123',
   * //   priority: 'P1',
   * //   created: '2025-01-01T00:00:00.000Z',
   * //   progress: '0%',
   * //   prd: '.claude/prds/user-auth.md',
   * //   github: '[Will be updated when synced to GitHub]'
   * // }
   */
  generateEpicMetadata(name, prdId, options = {}) {
    if (!name || name.trim() === '') {
      throw new Error('Epic name is required');
    }

    if (!prdId || prdId.trim() === '') {
      throw new Error('PRD ID is required');
    }

    const now = new Date().toISOString();

    return {
      name,
      status: options.status || 'backlog',
      prd_id: prdId,
      priority: options.priority || 'P2',
      created: now,
      progress: '0%',
      prd: `.claude/prds/${name}.md`,
      github: '[Will be updated when synced to GitHub]'
    };
  }

  // ==========================================
  // 4. CONTENT GENERATION (2 METHODS)
  // ==========================================

  /**
   * Generate complete epic markdown content
   *
   * Builds full epic document with frontmatter, sections, and tasks.
   * Follows standard epic template format.
   *
   * @param {Object} metadata - Epic metadata (frontmatter)
   * @param {Object} sections - PRD sections (vision, problem, features, etc)
   * @param {Array<Object>} tasks - Array of task objects
   * @returns {string} Complete epic markdown content
   *
   * @example
   * generateEpicContent(metadata, sections, tasks)
   * // Returns multiline markdown string with:
   * // - YAML frontmatter
   * // - Epic title and overview
   * // - Vision and other sections
   * // - Task breakdown
   */
  generateEpicContent(metadata, sections, tasks) {
    // Build frontmatter
    const frontmatter = `---
name: ${metadata.name}
status: ${metadata.status}
created: ${metadata.created}
progress: ${metadata.progress}
prd: ${metadata.prd}
github: ${metadata.github}
priority: ${metadata.priority}
---`;

    // Build overview section
    let content = frontmatter + '\n\n';
    content += `# Epic: ${metadata.name}\n\n`;
    content += '## Overview\n';

    if (sections.vision) {
      content += sections.vision + '\n\n';
      content += `### Vision\n${sections.vision}\n\n`;
    }

    if (sections.problem) {
      content += `### Problem\n${sections.problem}\n\n`;
    }

    // Build task breakdown
    content += '## Task Breakdown\n\n';
    const taskSection = this.buildTaskSection(tasks);
    content += taskSection;

    return content;
  }

  /**
   * Build task section markdown
   *
   * Formats task array as markdown list with details.
   * Each task includes: ID, title, type, effort, status.
   *
   * @param {Array<Object>} tasks - Array of task objects
   * @returns {string} Markdown formatted task list
   *
   * @example
   * buildTaskSection([
   *   { id: 'TASK-1', title: 'Setup', type: 'setup', effort: '2h', status: 'open' }
   * ])
   * // Returns:
   * // ### TASK-1: Setup
   * // - **Type**: setup
   * // - **Effort**: 2h
   * // - **Status**: open
   */
  buildTaskSection(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return '';
    }

    return tasks.map(task => {
      const status = task.status || 'Not Started';
      return `### ${task.id}: ${task.title}
- **Type**: ${task.type}
- **Effort**: ${task.effort}
- **Status**: ${status}`;
    }).join('\n\n');
  }

  // ==========================================
  // 5. AI STREAMING METHODS
  // ==========================================

  /**
   * Decompose epic into tasks with streaming output
   *
   * Streams AI-powered decomposition of epic content into discrete tasks.
   * The AI analyzes the epic and generates task breakdown with estimates,
   * dependencies, and assignments.
   *
   * @param {string} epicContent - Epic markdown content
   * @param {Object} [options] - Streaming options (passed to provider)
   * @returns {AsyncGenerator<string>} Stream of task decomposition text chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.decomposeStream(epicContent)) {
   *   process.stdout.write(chunk); // Display task generation progress
   * }
   */
  async *decomposeStream(epicContent, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming requires an AI provider with stream() support');
    }

    const prompt = `Decompose this epic into specific, actionable tasks.

For each task, provide:
1. Task ID and title
2. Task type (frontend/backend/data/testing/documentation)
3. Detailed description
4. Effort estimate (in hours or days)
5. Dependencies on other tasks
6. Acceptance criteria (bullet points)

Generate 5-15 tasks that fully cover the epic scope. Tasks should be:
- Small enough to complete in 1-3 days
- Independent where possible
- Clearly defined with acceptance criteria
- Properly sequenced with dependencies

Epic Content:
${epicContent}`;

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }

  /**
   * Analyze PRD with streaming output
   *
   * Streams AI-powered analysis of PRD content to identify epics, themes,
   * and high-level task breakdown. This is typically used before epic creation
   * to understand the PRD structure and complexity.
   *
   * @param {string} prdContent - PRD markdown content
   * @param {Object} [options] - Streaming options (passed to provider)
   * @returns {AsyncGenerator<string>} Stream of PRD analysis text chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.analyzeStream(prdContent)) {
   *   process.stdout.write(chunk); // Display PRD analysis progress
   * }
   */
  async *analyzeStream(prdContent, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming requires an AI provider with stream() support');
    }

    const prompt = `Analyze this Product Requirements Document and provide a comprehensive epic-level breakdown.

Identify:
1. Major themes or feature areas (2-5 epics)
2. For each potential epic:
   - Epic name and scope
   - Key features/capabilities
   - Estimated complexity (Small/Medium/Large)
   - Dependencies on other epics
   - Rough task count estimate

Also provide:
- Overall project complexity assessment
- Recommended epic breakdown approach
- Key technical risks or challenges
- Suggested development sequence

PRD Content:
${prdContent}`;

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }

  // ==========================================
  // 6. CLI OPERATIONS (I/O Methods)
  // ==========================================

  /**
   * List all epics with metadata
   *
   * @returns {Promise<Array<Object>>} Array of epic objects
   */
  async listEpics() {
    const path = require('path');

    const epicsDir = path.join(process.cwd(), this.options.epicsDir);

    // Check if epics directory exists
    const dirExists = await fs.pathExists(epicsDir);
    if (!dirExists) {
      return [];
    }

    // Read all epic directories
    let epicDirs;
    try {
      const items = await fs.readdir(epicsDir, { withFileTypes: true });
      epicDirs = items
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      return [];
    }

    const epics = [];

    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsDir, epicDir);
      const epicFilePath = path.join(epicPath, 'epic.md');

      // Skip directories without epic.md file
      const fileExists = await fs.pathExists(epicFilePath);
      if (!fileExists) {
        continue;
      }

      let metadata;
      try {
        const content = await fs.readFile(epicFilePath, 'utf8');
        metadata = this.parseFrontmatter(content);
      } catch (error) {
        // Skip files that can't be read
        continue;
      }

      // Apply defaults
      const name = (metadata && metadata.name) || epicDir;
      const status = (metadata && metadata.status) || this.options.defaultStatus;
      const progress = (metadata && metadata.progress) || '0%';
      const github = (metadata && metadata.github) || '';
      const created = (metadata && metadata.created) || '';

      // Count tasks
      const taskCount = await this.countTasks(epicPath);

      // Extract GitHub issue number
      const githubIssue = this.extractGitHubIssue(github);

      epics.push({
        name,
        status,
        progress,
        github,
        githubIssue,
        created,
        taskCount,
        epicDir,
        epicPath: path.join(epicPath, 'epic.md')
      });
    }

    return epics;
  }

  /**
   * Get detailed epic information
   *
   * @param {string} epicName - Epic directory name
   * @returns {Promise<Object>} Epic data with metadata and task count
   * @throws {Error} If epic not found
   */
  async getEpic(epicName) {

    const epicPath = this.getEpicPath(epicName);
    const epicFilePath = this.getEpicFilePath(epicName);

    // Check if epic exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      throw new Error(`Epic not found: ${epicName}`);
    }

    // Read epic content
    const content = await fs.readFile(epicFilePath, 'utf8');
    const metadata = this.parseFrontmatter(content);

    // Apply defaults
    const name = (metadata && metadata.name) || epicName;
    const status = (metadata && metadata.status) || this.options.defaultStatus;
    const progress = (metadata && metadata.progress) || '0%';
    const github = (metadata && metadata.github) || '';
    const created = (metadata && metadata.created) || '';

    // Count tasks
    const taskCount = await this.countTasks(epicPath);

    // Extract GitHub issue
    const githubIssue = this.extractGitHubIssue(github);

    return {
      name,
      status,
      progress,
      github,
      githubIssue,
      created,
      taskCount,
      epicDir: epicName,
      epicPath: epicFilePath,
      content
    };
  }

  /**
   * Validate epic structure and completeness
   *
   * @param {string} epicName - Epic directory name
   * @returns {Promise<Object>} Validation result: { valid: boolean, issues: string[] }
   * @throws {Error} If epic not found
   */
  async validateEpicStructure(epicName) {

    const epicFilePath = this.getEpicFilePath(epicName);

    // Check if epic exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      throw new Error(`Epic not found: ${epicName}`);
    }

    const issues = [];

    // Read epic content
    const content = await fs.readFile(epicFilePath, 'utf8');

    // Check for frontmatter
    const frontmatter = this.parseFrontmatter(content);
    if (!frontmatter) {
      issues.push('Missing frontmatter');
    } else {
      // Check for required fields
      if (!frontmatter.name) {
        issues.push('Missing name in frontmatter');
      }
      if (!frontmatter.status) {
        issues.push('Missing status in frontmatter');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Count task files in epic directory
   *
   * @param {string} epicPath - Path to epic directory
   * @returns {Promise<number>} Number of task files
   */
  async countTasks(epicPath) {

    try {
      const files = await fs.readdir(epicPath);
      // Count files that match pattern [0-9]*.md
      return files.filter(file => /^\d+\.md$/.test(file)).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get full path to epic directory
   *
   * @param {string} epicName - Epic directory name
   * @returns {string} Full path to epic directory
   */
  getEpicPath(epicName) {
    const path = require('path');
    return path.join(process.cwd(), this.options.epicsDir, epicName);
  }

  /**
   * Get full path to epic.md file
   *
   * @param {string} epicName - Epic directory name
   * @returns {string} Full path to epic.md file
   */
  getEpicFilePath(epicName) {
    const path = require('path');
    return path.join(this.getEpicPath(epicName), 'epic.md');
  }

  // ==========================================
  // 7. GITHUB EPIC SYNC METHODS (6 METHODS)
  // ==========================================

  /**
   * Sync local epic to GitHub (enhanced push with conflict detection)
   *
   * @param {string} epicName - Local epic name
   * @param {Object} [options={}] - Sync options
   * @param {boolean} [options.detectConflicts=false] - Enable conflict detection
   * @returns {Promise<Object>} Result: { success, epicName, githubNumber, action, conflict? }
   * @throws {Error} If no provider configured or epic not found
   */
  async syncEpicToGitHub(epicName, options = {}) {
    if (!this.provider) {
      throw new Error('No provider configured for GitHub sync');
    }

    const epicFilePath = this.getEpicFilePath(epicName);

    // Check if epic exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      throw new Error(`Epic not found: ${epicName}`);
    }

    // Read epic content
    const content = await fs.readFile(epicFilePath, 'utf8');
    const metadata = this.parseFrontmatter(content);

    // Extract overview and tasks from content
    const overviewMatch = content.match(/## Overview\s+([\s\S]*?)(?=\n## |$)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    const tasksMatch = content.match(/## Tasks?\s+([\s\S]*?)(?=\n## |$)/);
    const tasksContent = tasksMatch ? tasksMatch[1].trim() : '';

    // Parse tasks from markdown checkboxes
    const tasks = this._parseTasksFromContent(tasksContent);

    const epicData = {
      name: epicName,
      title: metadata?.name || epicName,
      overview,
      tasks,
      priority: metadata?.priority || 'P2',
      status: metadata?.status || 'planning',
      updated: metadata?.updated
    };

    const syncMap = await this._loadEpicSyncMap();
    const githubNumber = syncMap['epic-to-github'][epicName];

    let result;
    let action;

    if (githubNumber) {
      // Check for conflicts if enabled
      if (options.detectConflicts) {
        const githubIssue = await this.provider.getIssue(githubNumber);
        const conflict = this._detectEpicConflict(epicData, githubIssue);

        if (conflict.hasConflict && conflict.remoteNewer) {
          return {
            success: false,
            epicName,
            githubNumber: String(githubNumber),
            conflict
          };
        }
      }

      // Update existing GitHub epic
      result = await this.updateGitHubEpic(githubNumber, epicData);
      action = 'updated';
    } else {
      // Create new GitHub epic
      result = await this.createGitHubEpic(epicData);
      action = 'created';
    }

    // Update sync-map
    await this._updateEpicSyncMap(epicName, String(result.number));

    return {
      success: true,
      epicName,
      githubNumber: String(result.number),
      action
    };
  }

  /**
   * Sync GitHub epic to local (enhanced pull with merge)
   *
   * @param {number|string} githubNumber - GitHub issue number
   * @param {Object} [options={}] - Sync options
   * @param {boolean} [options.detectConflicts=false] - Enable conflict detection
   * @returns {Promise<Object>} Result: { success, epicName, githubNumber, action, conflict? }
   * @throws {Error} If issue is not an epic
   */
  async syncEpicFromGitHub(githubNumber, options = {}) {

    const githubIssue = await this.provider.getIssue(githubNumber);

    // Verify it's an epic
    const labels = githubIssue.labels || [];
    const isEpic = labels.some(label => {
      const name = typeof label === 'string' ? label : label.name;
      return name === 'epic';
    });

    if (!isEpic) {
      throw new Error(`GitHub issue #${githubNumber} is not an epic`);
    }

    const syncMap = await this._loadEpicSyncMap();
    let epicName = syncMap['github-to-epic'][String(githubNumber)];

    let action;

    if (epicName) {
      // Check for conflicts if enabled
      if (options.detectConflicts) {
        const epicFilePath = this.getEpicFilePath(epicName);
        const localContent = await fs.readFile(epicFilePath, 'utf8');
        const localMetadata = this.parseFrontmatter(localContent);

        const conflict = this._detectEpicConflict(
          { updated: localMetadata?.updated },
          githubIssue
        );

        if (conflict.hasConflict && conflict.localNewer) {
          return {
            success: false,
            epicName,
            githubNumber: String(githubNumber),
            conflict
          };
        }
      }

      action = 'updated';
    } else {
      // Generate epic name from title
      epicName = this._generateEpicNameFromTitle(githubIssue.title);
      action = 'created';
    }

    // Parse GitHub epic
    const epicData = this._parseGitHubEpic(githubIssue);

    // Build epic content
    const epicContent = this._buildEpicContent(epicData, githubNumber);

    // Ensure epic directory exists
    const epicPath = this.getEpicPath(epicName);
    await fs.ensureDir(epicPath);

    // Write epic.md
    const epicFilePath = this.getEpicFilePath(epicName);
    await fs.writeFile(epicFilePath, epicContent);

    // Update sync-map
    await this._updateEpicSyncMap(epicName, String(githubNumber));

    return {
      success: true,
      epicName,
      githubNumber: String(githubNumber),
      action
    };
  }

  /**
   * Bidirectional sync - sync in the direction of newer changes
   *
   * @param {string} epicName - Local epic name
   * @param {Object} [options={}] - Sync options
   * @param {string} [options.conflictStrategy='detect'] - How to handle conflicts
   * @returns {Promise<Object>} Result: { success, direction, conflict? }
   */
  async syncEpicBidirectional(epicName, options = {}) {
    const syncMap = await this._loadEpicSyncMap();
    const githubNumber = syncMap['epic-to-github'][epicName];

    if (!githubNumber) {
      // No GitHub mapping, push to GitHub
      const result = await this.syncEpicToGitHub(epicName);
      return { ...result, direction: 'to-github' };
    }

    // Get both versions
    const epicFilePath = this.getEpicFilePath(epicName);
    const localContent = await fs.readFile(epicFilePath, 'utf8');
    const localMetadata = this.parseFrontmatter(localContent);

    const githubIssue = await this.provider.getIssue(githubNumber);

    const conflict = this._detectEpicConflict(
      { updated: localMetadata?.updated },
      githubIssue
    );

    if (conflict.hasConflict) {
      if (options.conflictStrategy === 'detect') {
        return {
          success: false,
          direction: 'conflict',
          conflict
        };
      }

      // Auto-resolve based on timestamps
      if (conflict.localNewer) {
        const result = await this.syncEpicToGitHub(epicName);
        return { ...result, direction: 'to-github' };
      } else if (conflict.remoteNewer) {
        const result = await this.syncEpicFromGitHub(githubNumber);
        return { ...result, direction: 'from-github' };
      }
    }

    // No conflict - sync local to GitHub
    const result = await this.syncEpicToGitHub(epicName);
    return { ...result, direction: 'to-github' };
  }

  /**
   * Create new GitHub epic from local data
   *
   * @param {Object} epicData - Epic data
   * @returns {Promise<Object>} Created GitHub issue
   */
  async createGitHubEpic(epicData) {
    const labels = ['epic'];

    if (epicData.priority) {
      labels.push(`priority:${epicData.priority}`);
    }

    const body = this._formatEpicForGitHub(epicData);

    const githubData = {
      title: `Epic: ${epicData.title}`,
      body,
      labels,
      state: 'open'
    };

    const result = await this.provider.createIssue(githubData);

    // Update sync-map
    if (epicData.name) {
      await this._updateEpicSyncMap(epicData.name, String(result.number));
    }

    return result;
  }

  /**
   * Update existing GitHub epic with local data
   *
   * @param {number|string} githubNumber - GitHub issue number
   * @param {Object} epicData - Epic data
   * @returns {Promise<Object>} Updated GitHub issue
   */
  async updateGitHubEpic(githubNumber, epicData) {
    const updateData = {};

    if (epicData.title) {
      updateData.title = `Epic: ${epicData.title}`;
    }

    if (epicData.overview || epicData.tasks) {
      updateData.body = this._formatEpicForGitHub(epicData);
    }

    if (epicData.priority) {
      updateData.labels = ['epic', `priority:${epicData.priority}`];
    }

    return await this.provider.updateIssue(githubNumber, updateData);
  }

  /**
   * Get sync status for an epic
   *
   * @param {string} epicName - Local epic name
   * @returns {Promise<Object>} Status: { synced, epicName, githubNumber, lastSync, status }
   */
  async getEpicSyncStatus(epicName) {
    const syncMap = await this._loadEpicSyncMap();
    const githubNumber = syncMap['epic-to-github'][epicName];

    if (!githubNumber) {
      return {
        synced: false,
        epicName,
        githubNumber: null,
        status: 'not-synced'
      };
    }

    const metadata = syncMap.metadata[epicName] || {};

    // Check if out of sync
    try {
      const epicFilePath = this.getEpicFilePath(epicName);
      const localContent = await fs.readFile(epicFilePath, 'utf8');
      const localMetadata = this.parseFrontmatter(localContent);

      const githubIssue = await this.provider.getIssue(githubNumber);

      const localTime = new Date(localMetadata?.updated || localMetadata?.created || 0);
      const githubTime = new Date(githubIssue.updated_at || githubIssue.created_at || 0);
      const lastSyncTime = new Date(metadata.lastSync || 0);

      const isOutOfSync = localTime > lastSyncTime || githubTime > lastSyncTime;

      return {
        synced: !isOutOfSync,
        epicName,
        githubNumber: String(githubNumber),
        lastSync: metadata.lastSync,
        status: isOutOfSync ? 'out-of-sync' : 'synced'
      };
    } catch (error) {
      // If error checking, assume synced
      return {
        synced: true,
        epicName,
        githubNumber: String(githubNumber),
        lastSync: metadata.lastSync,
        status: 'synced'
      };
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS FOR EPIC SYNC
  // ==========================================

  /**
   * Load epic-sync-map from file
   * @private
   */
  async _loadEpicSyncMap() {
    const path = require('path');
    const syncMapPath = path.join(process.cwd(), '.claude/epic-sync-map.json');

    if (await fs.pathExists(syncMapPath)) {
      return await fs.readJSON(syncMapPath);
    }

    return {
      'epic-to-github': {},
      'github-to-epic': {},
      'metadata': {}
    };
  }

  /**
   * Save epic-sync-map to file
   * @private
   */
  async _saveEpicSyncMap(syncMap) {
    const path = require('path');
    const syncMapPath = path.join(process.cwd(), '.claude/epic-sync-map.json');
    await fs.writeJSON(syncMapPath, syncMap, { spaces: 2 });
  }

  /**
   * Update epic-sync-map with new mapping
   * @private
   */
  async _updateEpicSyncMap(epicName, githubNumber) {
    const syncMap = await this._loadEpicSyncMap();

    syncMap['epic-to-github'][epicName] = String(githubNumber);
    syncMap['github-to-epic'][String(githubNumber)] = epicName;
    syncMap['metadata'][epicName] = {
      lastSync: new Date().toISOString(),
      githubNumber: String(githubNumber)
    };

    await this._saveEpicSyncMap(syncMap);
  }

  /**
   * Format epic data as GitHub issue body
   * @private
   */
  _formatEpicForGitHub(epicData) {
    let body = '';

    if (epicData.overview) {
      body += `## Overview\n${epicData.overview}\n\n`;
    }

    body += '## Task Breakdown\n';

    if (epicData.tasks && epicData.tasks.length > 0) {
      epicData.tasks.forEach(task => {
        const checkbox = task.status === 'closed' ? '[x]' : '[ ]';
        body += `- ${checkbox} ${task.title}\n`;
      });
    } else {
      body += 'No tasks defined yet.\n';
    }

    return body;
  }

  /**
   * Parse GitHub issue to epic format
   * @private
   */
  _parseGitHubEpic(githubIssue) {
    // Extract epic name from title
    const titleMatch = githubIssue.title.match(/Epic:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : githubIssue.title;
    const name = this._generateEpicNameFromTitle(title);

    // Extract overview
    const overviewMatch = githubIssue.body?.match(/## Overview\s+([\s\S]*?)(?=\n## |$)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    // Extract priority from labels
    const labels = githubIssue.labels || [];
    let priority = 'P2';
    labels.forEach(label => {
      const labelName = typeof label === 'string' ? label : label.name;
      const priorityMatch = labelName.match(/priority:(P\d)/i);
      if (priorityMatch) {
        priority = priorityMatch[1];
      }
    });

    // Extract tasks from checkboxes
    const tasksMatch = githubIssue.body?.match(/## Task Breakdown\s+([\s\S]*?)(?=\n## |$)/);
    const tasksContent = tasksMatch ? tasksMatch[1].trim() : '';
    const tasks = this._parseTasksFromContent(tasksContent);

    return {
      name,
      title,
      overview,
      priority,
      tasks,
      created: githubIssue.created_at,
      updated: githubIssue.updated_at
    };
  }

  /**
   * Parse tasks from markdown checkbox content
   * @private
   */
  _parseTasksFromContent(content) {
    const tasks = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/i);
      if (checkboxMatch) {
        const status = checkboxMatch[1].toLowerCase() === 'x' ? 'closed' : 'open';
        const title = checkboxMatch[2].trim();
        tasks.push({ title, status });
      }
    }

    return tasks;
  }

  /**
   * Generate epic name from title
   * @private
   */
  _generateEpicNameFromTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Build epic content from parsed data
   * @private
   */
  _buildEpicContent(epicData, githubNumber) {
    const frontmatter = `---
name: ${epicData.name}
status: planning
priority: ${epicData.priority}
created: ${epicData.created}
updated: ${epicData.updated}
progress: 0%
github: https://github.com/owner/repo/issues/${githubNumber}
---

# Epic: ${epicData.title}

## Overview
${epicData.overview || 'No overview provided.'}

## Tasks
${epicData.tasks.map(task => {
  const checkbox = task.status === 'closed' ? '[x]' : '[ ]';
  return `- ${checkbox} ${task.title}`;
}).join('\n')}
`;

    return frontmatter;
  }

  /**
   * Detect conflict between local epic and GitHub issue
   * @private
   */
  _detectEpicConflict(localEpic, githubIssue) {
    const localTime = new Date(localEpic.updated || localEpic.created || 0);
    const githubTime = new Date(githubIssue.updated_at || githubIssue.created_at || 0);

    const hasConflict = localTime.getTime() !== githubTime.getTime();
    const localNewer = localTime > githubTime;
    const remoteNewer = githubTime > localTime;

    return {
      hasConflict,
      localNewer,
      remoteNewer,
      conflictFields: []
    };
  }

  // ==========================================
  // 8. AZURE DEVOPS EPIC SYNC METHODS (6 METHODS)
  // ==========================================

  /**
   * Sync local epic to Azure DevOps (enhanced push with conflict detection)
   *
   * @param {string} epicName - Local epic name
   * @param {Object} [options={}] - Sync options
   * @param {boolean} [options.detectConflicts=false] - Enable conflict detection
   * @returns {Promise<Object>} Result: { success, epicName, workItemId, action, conflict? }
   * @throws {Error} If no provider configured or epic not found
   */
  async syncEpicToAzure(epicName, options = {}) {
    if (!this.provider) {
      throw new Error('No provider configured for Azure sync');
    }

    const epicFilePath = this.getEpicFilePath(epicName);

    // Check if epic exists
    const exists = await fs.pathExists(epicFilePath);
    if (!exists) {
      throw new Error(`Epic not found: ${epicName}`);
    }

    // Read epic content
    const content = await fs.readFile(epicFilePath, 'utf8');
    const metadata = this.parseFrontmatter(content);

    // Extract overview and tasks from content
    const overviewMatch = content.match(/## Overview\s+([\s\S]*?)(?=\n## |$)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    const tasksMatch = content.match(/## Tasks?\s+([\s\S]*?)(?=\n## |$)/);
    const tasksContent = tasksMatch ? tasksMatch[1].trim() : '';

    // Parse tasks from markdown checkboxes
    const tasks = this._parseTasksFromContent(tasksContent);

    const epicData = {
      name: epicName,
      title: metadata?.name || epicName,
      overview,
      tasks,
      priority: metadata?.priority || 'P2',
      status: metadata?.status || 'planning',
      updated: metadata?.updated
    };

    const syncMap = await this._loadAzureEpicSyncMap();
    const workItemId = syncMap['epic-to-azure'][epicName];

    let result;
    let action;

    if (workItemId) {
      // Check for conflicts if enabled
      if (options.detectConflicts) {
        const azureWorkItem = await this.provider.getWorkItem(workItemId);
        const conflict = this._detectAzureEpicConflict(epicData, azureWorkItem);

        if (conflict.hasConflict && conflict.remoteNewer) {
          return {
            success: false,
            epicName,
            workItemId: String(workItemId),
            conflict
          };
        }
      }

      // Update existing Azure epic
      result = await this.updateAzureEpic(workItemId, epicData);
      action = 'updated';
    } else {
      // Create new Azure epic
      result = await this.createAzureEpic(epicData);
      action = 'created';
    }

    // Update sync-map
    await this._updateAzureEpicSyncMap(epicName, String(result.id));

    return {
      success: true,
      epicName,
      workItemId: String(result.id),
      action
    };
  }

  /**
   * Sync Azure DevOps epic to local (enhanced pull with merge)
   *
   * @param {number|string} workItemId - Azure work item ID
   * @param {Object} [options={}] - Sync options
   * @param {boolean} [options.detectConflicts=false] - Enable conflict detection
   * @returns {Promise<Object>} Result: { success, epicName, workItemId, action, conflict? }
   * @throws {Error} If work item is not an Epic
   */
  async syncEpicFromAzure(workItemId, options = {}) {

    const azureWorkItem = await this.provider.getWorkItem(workItemId);

    // Verify it's an Epic
    const workItemType = azureWorkItem.fields['System.WorkItemType'];
    if (workItemType !== 'Epic') {
      throw new Error(`Azure work item #${workItemId} is not an Epic (type: ${workItemType})`);
    }

    const syncMap = await this._loadAzureEpicSyncMap();
    let epicName = syncMap['azure-to-epic'][String(workItemId)];

    let action;

    if (epicName) {
      // Check for conflicts if enabled
      if (options.detectConflicts) {
        const epicFilePath = this.getEpicFilePath(epicName);
        const localContent = await fs.readFile(epicFilePath, 'utf8');
        const localMetadata = this.parseFrontmatter(localContent);

        const conflict = this._detectAzureEpicConflict(
          { updated: localMetadata?.updated },
          azureWorkItem
        );

        if (conflict.hasConflict && conflict.localNewer) {
          return {
            success: false,
            epicName,
            workItemId: String(workItemId),
            conflict
          };
        }
      }

      action = 'updated';
    } else {
      // Generate epic name from title
      const title = azureWorkItem.fields['System.Title'] || 'Untitled';
      epicName = this._generateEpicNameFromTitle(title);
      action = 'created';
    }

    // Parse Azure epic
    const epicData = this._parseAzureEpic(azureWorkItem);

    // Build epic content
    const epicContent = this._buildAzureEpicContent(epicData, workItemId);

    // Ensure epic directory exists
    const epicPath = this.getEpicPath(epicName);
    await fs.ensureDir(epicPath);

    // Write epic.md
    const epicFilePath = this.getEpicFilePath(epicName);
    await fs.writeFile(epicFilePath, epicContent);

    // Update sync-map
    await this._updateAzureEpicSyncMap(epicName, String(workItemId));

    return {
      success: true,
      epicName,
      workItemId: String(workItemId),
      action
    };
  }

  /**
   * Bidirectional sync - sync in the direction of newer changes (Azure)
   *
   * @param {string} epicName - Local epic name
   * @param {Object} [options={}] - Sync options
   * @param {string} [options.conflictStrategy='detect'] - How to handle conflicts
   * @returns {Promise<Object>} Result: { success, direction, conflict? }
   */
  async syncEpicBidirectionalAzure(epicName, options = {}) {
    const syncMap = await this._loadAzureEpicSyncMap();
    const workItemId = syncMap['epic-to-azure'][epicName];

    if (!workItemId) {
      // No Azure mapping, push to Azure
      const result = await this.syncEpicToAzure(epicName);
      return { ...result, direction: 'to-azure' };
    }

    // Get both versions
    const epicFilePath = this.getEpicFilePath(epicName);
    const localContent = await fs.readFile(epicFilePath, 'utf8');
    const localMetadata = this.parseFrontmatter(localContent);

    const azureWorkItem = await this.provider.getWorkItem(workItemId);

    const conflict = this._detectAzureEpicConflict(
      { updated: localMetadata?.updated },
      azureWorkItem
    );

    if (conflict.hasConflict) {
      if (options.conflictStrategy === 'detect') {
        return {
          success: false,
          direction: 'conflict',
          conflict
        };
      }

      // Auto-resolve based on timestamps
      if (conflict.localNewer) {
        const result = await this.syncEpicToAzure(epicName);
        return { ...result, direction: 'to-azure' };
      } else if (conflict.remoteNewer) {
        const result = await this.syncEpicFromAzure(workItemId);
        return { ...result, direction: 'from-azure' };
      }
    }

    // No conflict - sync local to Azure
    const result = await this.syncEpicToAzure(epicName);
    return { ...result, direction: 'to-azure' };
  }

  /**
   * Create new Azure epic work item from local data
   *
   * @param {Object} epicData - Epic data
   * @returns {Promise<Object>} Created Azure work item
   */
  async createAzureEpic(epicData) {
    const tags = epicData.priority ? `priority:${epicData.priority}` : '';
    const description = this._formatEpicForAzure(epicData);

    const azureData = {
      title: epicData.title,
      description,
      tags,
      state: 'New'
    };

    const result = await this.provider.createWorkItem('Epic', azureData);

    // Update sync-map if epic name exists
    if (epicData.name) {
      await this._updateAzureEpicSyncMap(epicData.name, String(result.id));
    }

    return result;
  }

  /**
   * Update existing Azure epic with local data
   *
   * @param {number|string} workItemId - Azure work item ID
   * @param {Object} epicData - Epic data
   * @returns {Promise<Object>} Updated Azure work item
   */
  async updateAzureEpic(workItemId, epicData) {
    const updateData = {};

    if (epicData.title) {
      updateData.title = epicData.title;
    }

    if (epicData.status) {
      updateData.state = this._mapEpicStatusToAzure(epicData.status);
    }

    if (epicData.overview || epicData.tasks) {
      updateData.description = this._formatEpicForAzure(epicData);
    }

    if (epicData.priority) {
      updateData.tags = `priority:${epicData.priority}`;
    }

    return await this.provider.updateWorkItem(workItemId, updateData);
  }

  /**
   * Get sync status for an epic (Azure)
   *
   * @param {string} epicName - Local epic name
   * @returns {Promise<Object>} Status: { synced, epicName, workItemId, lastSync, status }
   */
  async getEpicAzureSyncStatus(epicName) {
    const syncMap = await this._loadAzureEpicSyncMap();
    const workItemId = syncMap['epic-to-azure'][epicName];

    if (!workItemId) {
      return {
        synced: false,
        epicName,
        workItemId: null,
        status: 'not-synced'
      };
    }

    const metadata = syncMap.metadata[epicName] || {};

    // Check if out of sync
    try {
      const epicFilePath = this.getEpicFilePath(epicName);
      const localContent = await fs.readFile(epicFilePath, 'utf8');
      const localMetadata = this.parseFrontmatter(localContent);

      const azureWorkItem = await this.provider.getWorkItem(workItemId);

      const localTime = new Date(localMetadata?.updated || localMetadata?.created || 0);
      const azureTime = new Date(
        azureWorkItem.fields['System.ChangedDate'] ||
        azureWorkItem.fields['System.CreatedDate'] ||
        0
      );
      const lastSyncTime = new Date(metadata.lastSync || 0);

      const isOutOfSync = localTime > lastSyncTime || azureTime > lastSyncTime;

      return {
        synced: !isOutOfSync,
        epicName,
        workItemId: String(workItemId),
        lastSync: metadata.lastSync,
        status: isOutOfSync ? 'out-of-sync' : 'synced'
      };
    } catch (error) {
      // If error checking, assume synced
      return {
        synced: true,
        epicName,
        workItemId: String(workItemId),
        lastSync: metadata.lastSync,
        status: 'synced'
      };
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS FOR AZURE EPIC SYNC
  // ==========================================

  /**
   * Load epic-azure-sync-map from file
   * @private
   */
  async _loadAzureEpicSyncMap() {
    const path = require('path');
    const syncMapPath = path.join(process.cwd(), '.claude/epic-azure-sync-map.json');

    if (await fs.pathExists(syncMapPath)) {
      return await fs.readJSON(syncMapPath);
    }

    return {
      'epic-to-azure': {},
      'azure-to-epic': {},
      'metadata': {}
    };
  }

  /**
   * Save epic-azure-sync-map to file
   * @private
   */
  async _saveAzureEpicSyncMap(syncMap) {
    const path = require('path');
    const syncMapPath = path.join(process.cwd(), '.claude/epic-azure-sync-map.json');
    await fs.writeJSON(syncMapPath, syncMap, { spaces: 2 });
  }

  /**
   * Update epic-azure-sync-map with new mapping
   * @private
   */
  async _updateAzureEpicSyncMap(epicName, workItemId) {
    const syncMap = await this._loadAzureEpicSyncMap();

    syncMap['epic-to-azure'][epicName] = String(workItemId);
    syncMap['azure-to-epic'][String(workItemId)] = epicName;
    syncMap['metadata'][epicName] = {
      lastSync: new Date().toISOString(),
      workItemId: String(workItemId),
      workItemType: 'Epic'
    };

    await this._saveAzureEpicSyncMap(syncMap);
  }

  /**
   * Format epic data as Azure work item description
   * @private
   */
  _formatEpicForAzure(epicData) {
    let description = '';

    if (epicData.overview) {
      description += `${epicData.overview}\n\n`;
    }

    description += '## Tasks\n';

    if (epicData.tasks && epicData.tasks.length > 0) {
      epicData.tasks.forEach(task => {
        const checkbox = task.status === 'closed' ? '[x]' : '[ ]';
        description += `- ${checkbox} ${task.title}\n`;
      });
    } else {
      description += 'No tasks defined yet.\n';
    }

    return description.trim();
  }

  /**
   * Parse Azure work item to epic format
   * @private
   */
  _parseAzureEpic(azureWorkItem) {
    const title = azureWorkItem.fields['System.Title'] || '';
    const name = this._generateEpicNameFromTitle(title);
    const description = azureWorkItem.fields['System.Description'] || '';

    // Extract overview (text before ## Tasks)
    const overviewMatch = description.match(/^([\s\S]*?)(?=## Tasks|$)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    // Extract priority from tags
    const tags = azureWorkItem.fields['System.Tags'] || '';
    const priorityMatch = tags.match(/priority:(P\d)/i);
    const priority = priorityMatch ? priorityMatch[1] : 'P2';

    // Extract tasks from checkboxes
    const tasksMatch = description.match(/## Tasks\s+([\s\S]*?)$/);
    const tasksContent = tasksMatch ? tasksMatch[1].trim() : '';
    const tasks = this._parseTasksFromContent(tasksContent);

    return {
      name,
      title,
      overview,
      priority,
      tasks,
      created: azureWorkItem.fields['System.CreatedDate'],
      updated: azureWorkItem.fields['System.ChangedDate']
    };
  }

  /**
   * Detect conflict between local epic and Azure work item
   * @private
   */
  _detectAzureEpicConflict(localEpic, azureWorkItem) {
    const localTime = new Date(localEpic.updated || localEpic.created || 0);
    const azureTime = new Date(
      azureWorkItem.fields['System.ChangedDate'] ||
      azureWorkItem.fields['System.CreatedDate'] ||
      0
    );

    const hasConflict = localTime.getTime() !== azureTime.getTime();
    const localNewer = localTime > azureTime;
    const remoteNewer = azureTime > localTime;

    return {
      hasConflict,
      localNewer,
      remoteNewer,
      conflictFields: []
    };
  }

  /**
   * Map epic status to Azure DevOps state
   * @private
   */
  _mapEpicStatusToAzure(status) {
    if (!status) return 'New';

    const lowerStatus = status.toLowerCase();
    const statusMap = {
      'backlog': 'New',
      'planning': 'New',
      'in-progress': 'Active',
      'in_progress': 'Active',
      'active': 'Active',
      'done': 'Resolved',
      'completed': 'Resolved',
      'closed': 'Closed'
    };

    return statusMap[lowerStatus] || 'New';
  }

  /**
   * Build Azure epic content from parsed data
   * @private
   */
  _buildAzureEpicContent(epicData, workItemId) {
    const frontmatter = `---
name: ${epicData.name}
status: planning
priority: ${epicData.priority}
created: ${epicData.created}
updated: ${epicData.updated}
progress: 0%
azure_work_item_id: ${workItemId}
work_item_type: Epic
---

# Epic: ${epicData.title}

## Overview
${epicData.overview || 'No overview provided.'}

## Tasks
${epicData.tasks.map(task => {
  const checkbox = task.status === 'closed' ? '[x]' : '[ ]';
  return `- ${checkbox} ${task.title}`;
}).join('\n')}
`;

    return frontmatter;
  }
}

module.exports = EpicService;
