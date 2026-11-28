/**
 * ContextService - Context Management Service
 *
 * Pure service layer for context operations following ClaudeAutoPM patterns.
 * Manages project context files for AI-assisted development.
 *
 * Provides comprehensive context lifecycle management:
 *
 * 1. Context Creation (1 method):
 *    - createContext: Create new context from template
 *
 * 2. Context Priming (1 method):
 *    - primeContext: Generate comprehensive project snapshot
 *
 * 3. Context Updates (1 method):
 *    - updateContext: Update existing context (append/replace)
 *
 * 4. Context Reading (2 methods):
 *    - getContext: Read context file with metadata
 *    - listContexts: List all contexts grouped by type
 *
 * 5. Context Validation (1 method):
 *    - validateContext: Validate structure and required fields
 *
 * 6. Context Operations (2 methods):
 *    - mergeContexts: Merge multiple contexts
 *    - analyzeContextUsage: Analyze size, age, and generate recommendations
 *
 * Documentation Queries:
 * - mcp://context7/project-management/context-management - Context management patterns
 * - mcp://context7/documentation/context-files - Context file best practices
 * - mcp://context7/ai/context-optimization - Context optimization strategies
 * - mcp://context7/project-management/project-brief - Project brief formats
 */

const fs = require('fs-extra');
const path = require('path');
const { readFrontmatter } = require('../utils/frontmatter');

class ContextService {
  /**
   * Create a new ContextService instance
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.templatesPath] - Path to templates directory
   * @param {string} [options.contextPath] - Path to contexts directory
   * @param {string} [options.epicsPath] - Path to epics directory
   * @param {string} [options.issuesPath] - Path to issues directory
   */
  constructor(options = {}) {
    this.templatesPath = options.templatesPath ||
      path.join(process.cwd(), '.claude/templates/context-templates');
    this.contextPath = options.contextPath ||
      path.join(process.cwd(), '.claude/context');
    this.epicsPath = options.epicsPath ||
      path.join(process.cwd(), '.claude/epics');
    this.issuesPath = options.issuesPath ||
      path.join(process.cwd(), '.claude/issues');
  }

  // ==========================================
  // 1. CONTEXT CREATION (1 METHOD)
  // ==========================================

  /**
   * Create new context file from template
   *
   * @param {string} type - Context type: project-brief, progress, tech-context, project-structure
   * @param {object} options - Creation options (name, template, data)
   * @returns {Promise<{path, content, created, type}>}
   * @throws {Error} If template not found
   *
   * @example
   * await createContext('project-brief', {
   *   name: 'My Project',
   *   description: 'Project description'
   * })
   */
  async createContext(type, options = {}) {
    // Load template
    const templatePath = path.join(this.templatesPath, `${type}.md`);
    const templateExists = await fs.pathExists(templatePath);

    if (!templateExists) {
      throw new Error(`Template not found for type: ${type}`);
    }

    let template = await fs.readFile(templatePath, 'utf8');

    // Prepare variables
    const variables = {
      type,
      name: options.name || type,
      created: new Date().toISOString(),
      ...options
    };

    // Replace template variables
    let content = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }

    // Ensure context directory exists
    await fs.ensureDir(this.contextPath);

    // Determine output path
    const contextFile = options.name
      ? `${options.name.toLowerCase().replace(/\s+/g, '-')}.md`
      : `${type}.md`;
    const contextFilePath = path.join(this.contextPath, contextFile);

    // Write context file
    await fs.writeFile(contextFilePath, content);

    return {
      path: contextFilePath,
      content,
      created: variables.created,
      type
    };
  }

  // ==========================================
  // 2. CONTEXT PRIMING (1 METHOD)
  // ==========================================

  /**
   * Generate comprehensive project snapshot
   *
   * @param {object} options - Prime options
   * @param {boolean} [options.includeGit] - Include git information
   * @param {string} [options.output] - Output file path
   * @returns {Promise<{contexts, summary, timestamp, git?}>}
   *
   * @example
   * await primeContext({ includeGit: true, output: './snapshot.md' })
   */
  async primeContext(options = {}) {
    const timestamp = new Date().toISOString();
    const contexts = {
      epics: [],
      issues: [],
      prds: []
    };

    // Gather epics
    const epicsExists = await fs.pathExists(this.epicsPath);
    if (epicsExists) {
      const epicFiles = await fs.readdir(this.epicsPath);
      for (const file of epicFiles) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(
            path.join(this.epicsPath, file),
            'utf8'
          );
          contexts.epics.push({
            file,
            content,
            metadata: this._parseFrontmatter(content)
          });
        }
      }
    }

    // Gather issues
    const issuesExists = await fs.pathExists(this.issuesPath);
    if (issuesExists) {
      const issueFiles = await fs.readdir(this.issuesPath);
      for (const file of issueFiles) {
        if (/^\d+\.md$/.test(file)) {
          const content = await fs.readFile(
            path.join(this.issuesPath, file),
            'utf8'
          );
          contexts.issues.push({
            file,
            content,
            metadata: this._parseFrontmatter(content)
          });
        }
      }
    }

    // Generate summary
    let summary = 'Project Snapshot\n';
    summary += `Generated: ${timestamp}\n\n`;
    summary += `Epics: ${contexts.epics.length}\n`;
    summary += `Issues: ${contexts.issues.length}\n`;

    if (contexts.epics.length === 0 && contexts.issues.length === 0) {
      summary += '\nProject appears to be empty or newly initialized.';
    }

    // Include git info if requested
    let git;
    if (options.includeGit) {
      git = await this._getGitInfo();
    }

    // Write to output if specified
    if (options.output) {
      const outputContent = this._generateSnapshotContent(contexts, summary, git);
      await fs.writeFile(options.output, outputContent);
    }

    return {
      contexts,
      summary,
      timestamp,
      ...(git && { git })
    };
  }

  // ==========================================
  // 3. CONTEXT UPDATES (1 METHOD)
  // ==========================================

  /**
   * Update existing context
   *
   * @param {string} type - Context type to update
   * @param {object} updates - Update data
   * @param {string} [updates.mode] - Update mode: 'append' or 'replace'
   * @param {string} updates.content - New content
   * @returns {Promise<{updated, changes, timestamp}>}
   * @throws {Error} If context not found
   *
   * @example
   * await updateContext('project-brief', {
   *   mode: 'append',
   *   content: '## New Section'
   * })
   */
  async updateContext(type, updates = {}) {
    const contextFile = `${type}.md`;
    const contextPath = path.join(this.contextPath, contextFile);

    // Check if context exists
    const exists = await fs.pathExists(contextPath);
    if (!exists) {
      throw new Error(`Context not found: ${type}`);
    }

    const mode = updates.mode || 'append';
    let newContent;

    if (mode === 'replace') {
      newContent = updates.content;
    } else {
      // Append mode
      const existingContent = await fs.readFile(contextPath, 'utf8');
      newContent = existingContent + updates.content;
    }

    // Write updated content
    await fs.writeFile(contextPath, newContent);

    const timestamp = new Date().toISOString();

    return {
      updated: true,
      changes: {
        mode,
        timestamp
      },
      timestamp
    };
  }

  // ==========================================
  // 4. CONTEXT READING (2 METHODS)
  // ==========================================

  /**
   * Read context file
   *
   * @param {string} type - Context type
   * @returns {Promise<{type, content, metadata, updated}>}
   * @throws {Error} If context not found
   *
   * @example
   * const context = await getContext('project-brief')
   */
  async getContext(type) {
    const contextFile = `${type}.md`;
    const contextPath = path.join(this.contextPath, contextFile);

    // Check if context exists
    const exists = await fs.pathExists(contextPath);
    if (!exists) {
      throw new Error(`Context not found: ${type}`);
    }

    const content = await fs.readFile(contextPath, 'utf8');
    const metadata = this._parseFrontmatter(content);
    const stats = await fs.stat(contextPath);

    return {
      type,
      content,
      metadata,
      updated: stats.mtime.toISOString()
    };
  }

  /**
   * List all contexts
   *
   * @returns {Promise<{contexts, byType}>}
   *
   * @example
   * const { contexts, byType } = await listContexts()
   */
  async listContexts() {
    const exists = await fs.pathExists(this.contextPath);
    if (!exists) {
      return {
        contexts: [],
        byType: {}
      };
    }

    const files = await fs.readdir(this.contextPath);
    const contexts = [];
    const byType = {};

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(this.contextPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const metadata = this._parseFrontmatter(content);
        const stats = await fs.stat(filePath);

        const contextType = metadata.type || 'unknown';

        const contextInfo = {
          file,
          type: contextType,
          metadata,
          updated: stats.mtime.toISOString(),
          size: stats.size
        };

        contexts.push(contextInfo);

        if (!byType[contextType]) {
          byType[contextType] = [];
        }
        byType[contextType].push(contextInfo);
      }
    }

    return {
      contexts,
      byType
    };
  }

  // ==========================================
  // 5. CONTEXT VALIDATION (1 METHOD)
  // ==========================================

  /**
   * Validate context structure
   *
   * @param {string} type - Context type
   * @param {string} content - Context content
   * @returns {Promise<{valid, errors}>}
   *
   * @example
   * const { valid, errors } = await validateContext('project-brief', content)
   */
  async validateContext(type, content) {
    const errors = [];

    // Check for frontmatter
    if (!content.startsWith('---')) {
      errors.push('Missing frontmatter');
      return { valid: false, errors };
    }

    // Parse frontmatter
    const metadata = this._parseFrontmatter(content);

    // Validate required fields based on type
    const requiredFields = {
      'project-brief': ['type', 'name', 'created'],
      'progress': ['type', 'name'],
      'tech-context': ['type', 'name'],
      'default': ['type']
    };

    const required = requiredFields[type] || requiredFields.default;

    for (const field of required) {
      if (!metadata[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==========================================
  // 6. CONTEXT OPERATIONS (2 METHODS)
  // ==========================================

  /**
   * Merge multiple contexts
   *
   * @param {Array} contexts - Array of context objects
   * @returns {Promise<{merged, sources}>}
   *
   * @example
   * const result = await mergeContexts([context1, context2])
   */
  async mergeContexts(contexts) {
    const sources = contexts.map(c => c.type);
    let merged = '';
    const seenSections = new Set();

    for (const context of contexts) {
      const lines = context.content.split('\n');

      for (const line of lines) {
        // Track sections to avoid duplicates
        if (line.startsWith('##')) {
          const sectionKey = line.trim();
          if (seenSections.has(sectionKey)) {
            continue; // Skip duplicate section
          }
          seenSections.add(sectionKey);
        }

        merged += line + '\n';
      }

      merged += '\n---\n\n';
    }

    return {
      merged: merged.trim(),
      sources
    };
  }

  /**
   * Analyze context usage
   *
   * @returns {Promise<{stats, recommendations}>}
   *
   * @example
   * const { stats, recommendations } = await analyzeContextUsage()
   */
  async analyzeContextUsage() {
    const { contexts } = await this.listContexts();

    let totalSize = 0;
    const recommendations = [];

    for (const context of contexts) {
      totalSize += context.size;

      // Check for old contexts (> 90 days)
      const updated = new Date(context.updated);
      const daysSinceUpdate = Math.floor(
        (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate > 90) {
        recommendations.push(
          `Context "${context.file}" is ${daysSinceUpdate} days old - consider archiving or updating`
        );
      }

      // Check for large contexts (> 50KB)
      if (context.size > 50000) {
        recommendations.push(
          `Context "${context.file}" is ${Math.round(context.size / 1024)}KB - consider splitting into smaller contexts`
        );
      }
    }

    const stats = {
      totalContexts: contexts.length,
      totalSize,
      averageSize: contexts.length > 0 ? Math.round(totalSize / contexts.length) : 0
    };

    return {
      stats,
      recommendations
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  /**
   * Parse YAML frontmatter from content
   * @private
   */
  _parseFrontmatter(content) {
    return readFrontmatter(content) || {};
  }

  /**
   * Get git information
   * @private
   */
  async _getGitInfo() {
    const { execSync } = require('child_process');

    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const status = execSync('git status --short', { encoding: 'utf8' }).trim();

      return {
        branch,
        commit,
        status: status || 'clean'
      };
    } catch (error) {
      return {
        error: 'Not a git repository or git not available'
      };
    }
  }

  /**
   * Generate snapshot content for output
   * @private
   */
  _generateSnapshotContent(contexts, summary, git) {
    let content = `# Project Snapshot\n\n`;
    content += `${summary}\n\n`;

    if (git) {
      content += `## Git Information\n`;
      content += `- Branch: ${git.branch}\n`;
      content += `- Commit: ${git.commit}\n`;
      content += `- Status: ${git.status}\n\n`;
    }

    if (contexts.epics.length > 0) {
      content += `## Epics (${contexts.epics.length})\n\n`;
      for (const epic of contexts.epics) {
        content += `### ${epic.file}\n`;
        content += `${epic.content}\n\n---\n\n`;
      }
    }

    if (contexts.issues.length > 0) {
      content += `## Issues (${contexts.issues.length})\n\n`;
      for (const issue of contexts.issues) {
        content += `### ${issue.file}\n`;
        content += `${issue.content}\n\n---\n\n`;
      }
    }

    return content;
  }
}

module.exports = ContextService;
