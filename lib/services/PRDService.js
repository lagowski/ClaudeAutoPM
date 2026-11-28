/**
 * PRDService - Product Requirements Document Parsing Service
 *
 * Pure service layer for parsing PRD documents without any I/O operations.
 * Follows 3-layer architecture: Service (logic) -> No direct I/O
 *
 * Tier 1: Pure Parsing (No Dependencies)
 * - parseFrontmatter: Extract YAML frontmatter
 * - extractPrdContent: Parse PRD sections (basic + advanced)
 * - parseUserStories: Extract user story format
 *
 * Tier 3: Utilities (No I/O)
 * - parseEffort: Convert effort strings to hours
 * - formatEffort: Convert hours to readable format
 * - calculateTotalEffort: Sum effort across tasks
 * - calculateEffortByType: Sum effort for specific type
 * - generateEpicId: Convert PRD ID to Epic ID
 * - slugify: Create filesystem-safe names
 * - isComplexPrd: Determine if PRD needs splitting
 *
 * Documentation Queries:
 * - mcp://context7/agile/prd-analysis - PRD analysis best practices
 * - mcp://context7/agile/epic-breakdown - Epic decomposition patterns
 * - mcp://context7/project-management/estimation - Estimation techniques
 * - mcp://context7/markdown/parsing - Markdown parsing patterns
 */

const { readFrontmatter } = require('../utils/frontmatter');

class PRDService {
  /**
   * Create a new PRDService instance
   *
   * @param {Object} options - Configuration options
   * @param {ConfigManager} options.configManager - Optional ConfigManager instance
   * @param {Object} options.provider - Optional AI provider instance
   * @param {number} options.defaultEffortHours - Default effort in hours (default: 8)
   * @param {number} options.hoursPerDay - Hours per day (default: 8)
   * @param {number} options.hoursPerWeek - Hours per week (default: 40)
   */
  constructor(options = {}) {
    // Store ConfigManager if provided (for future use)
    this.configManager = options.configManager || undefined;

    // Store provider if provided (for future AI operations)
    this.provider = options.provider || undefined;

    this.options = {
      defaultEffortHours: 8,
      hoursPerDay: 8,
      hoursPerWeek: 40,
      ...options
    };
  }

  // ==========================================
  // TIER 1: PURE PARSING (NO DEPENDENCIES)
  // ==========================================

  /**
   * Parse YAML frontmatter from markdown content
   *
   * Extracts key-value pairs from YAML frontmatter block.
   * Returns null if frontmatter is missing or malformed.
   *
   * @param {string} content - Markdown content with frontmatter
   * @returns {Object|null} Parsed frontmatter object or null
   *
   * @example
   * const frontmatter = service.parseFrontmatter(`---
   * title: My PRD
   * status: draft
   * ---
   * Content...`);
   * // Returns: { title: 'My PRD', status: 'draft' }
   */
  parseFrontmatter(content) {
    return readFrontmatter(content);
  }

  /**
   * Extract PRD sections from markdown content
   *
   * Supports two parsing modes:
   * - Basic parser (default): Simple, fast, regex-based
   * - Advanced parser: markdown-it based (when options.useAdvancedParser = true)
   *
   * @param {string} content - PRD markdown content
   * @param {Object} options - Parsing options
   * @param {boolean} options.useAdvancedParser - Use markdown-it parser
   * @returns {Object} Extracted sections:
   *   - vision: Project vision/summary
   *   - problem: Problem statement
   *   - users: Target users/audience
   *   - features: Array of features
   *   - requirements: Array of requirements
   *   - metrics: Success metrics/criteria
   *   - technical: Technical approach/architecture
   *   - timeline: Timeline/schedule/milestones
   *   - userStories: Array of user story objects (advanced parser only)
   *
   * @example
   * const sections = service.extractPrdContent(prdMarkdown);
   * console.log(sections.features); // ['Feature 1', 'Feature 2']
   */
  extractPrdContent(content, options = {}) {
    if (!content) {
      content = '';
    }

    if (options.useAdvancedParser) {
      return this._extractPrdContentAdvanced(content);
    }

    return this._extractPrdContentBasic(content);
  }

  /**
   * Basic PRD content parser (regex-based)
   * @private
   */
  _extractPrdContentBasic(content) {
    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

    const sections = {
      vision: '',
      problem: '',
      users: '',
      features: [],
      requirements: [],
      metrics: '',
      technical: '',
      timeline: ''
    };

    // Split by ## headers
    const lines = contentWithoutFrontmatter.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          this._saveSectionBasic(sections, currentSection, currentContent);
        }

        // Start new section
        currentSection = line.replace('## ', '').toLowerCase();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      this._saveSectionBasic(sections, currentSection, currentContent);
    }

    return sections;
  }

  /**
   * Save section content to appropriate field
   * @private
   */
  _saveSectionBasic(sections, sectionName, content) {
    const contentStr = content.join('\n').trim();

    // Match section to appropriate field
    if (sectionName.includes('vision') || sectionName.includes('summary')) {
      sections.vision = contentStr;
    } else if (sectionName.includes('problem')) {
      sections.problem = contentStr;
    } else if (sectionName.includes('user') || sectionName.includes('target') || sectionName.includes('audience')) {
      sections.users = contentStr;
    } else if (sectionName.includes('feature')) {
      // Extract list items
      sections.features = this._extractListItems(content);
    } else if (sectionName.includes('requirement')) {
      sections.requirements = this._extractListItems(content);
    } else if (sectionName.includes('metric') || sectionName.includes('success') || sectionName.includes('criteria')) {
      sections.metrics = contentStr;
    } else if (sectionName.includes('technical') || sectionName.includes('architecture') || sectionName.includes('approach')) {
      sections.technical = contentStr;
    } else if (sectionName.includes('timeline') || sectionName.includes('schedule') || sectionName.includes('milestone')) {
      sections.timeline = contentStr;
    }
  }

  /**
   * Extract list items from content (bullets or numbered)
   * @private
   */
  _extractListItems(content) {
    const items = [];

    for (const line of content) {
      const trimmed = line.trim();

      // Match bullet lists: -, *, •
      if (/^[-*•]\s/.test(trimmed)) {
        const item = trimmed.replace(/^[-*•]\s+/, '').trim();
        if (item) {
          items.push(item);
        }
      }
      // Match numbered lists: 1., 2., etc.
      else if (/^\d+\.\s/.test(trimmed)) {
        const item = trimmed.replace(/^\d+\.\s+/, '').trim();
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Advanced PRD content parser (markdown-it based)
   * @private
   */
  _extractPrdContentAdvanced(content) {
    // For now, use basic parser with additional user stories extraction
    // In a full implementation, this would use markdown-it for better parsing
    const sections = this._extractPrdContentBasic(content);

    // Extract user stories if present
    const userStoriesMatch = content.match(/## User Stor(?:y|ies)[^\n]*\n([\s\S]*?)(?=\n## |$)/i);
    if (userStoriesMatch) {
      const userStoriesText = userStoriesMatch[1];
      sections.userStories = this.parseUserStories(userStoriesText);
    } else {
      sections.userStories = [];
    }

    return sections;
  }

  /**
   * Parse user stories from text
   *
   * Extracts user stories in the format:
   * "As a [role], I want [feature], So that [benefit]"
   *
   * Supports variations:
   * - "As a" or "As an"
   * - With or without bold formatting (**)
   *
   * @param {string} text - Text containing user stories
   * @returns {Array<Object>} Array of user story objects with raw text
   *
   * @example
   * const stories = service.parseUserStories(`
   *   As a developer
   *   I want to write tests
   *   So that I can ensure quality
   * `);
   * // Returns: [{ raw: 'As a developer\nI want...' }]
   */
  parseUserStories(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const stories = [];
    const lines = text.split('\n');
    let currentStory = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if line starts a new user story
      // Matches: "As a", "As an", "**As a**", "**As an**"
      if (/^\*\*As an?\b/i.test(trimmed) || /^As an?\b/i.test(trimmed)) {
        // Save previous story
        if (currentStory) {
          stories.push(currentStory);
        }

        // Start new story
        currentStory = { raw: trimmed };
      } else if (currentStory && trimmed) {
        // Continue current story
        currentStory.raw += '\n' + trimmed;
      }
    }

    // Save last story
    if (currentStory) {
      stories.push(currentStory);
    }

    return stories;
  }

  // ==========================================
  // TIER 3: UTILITIES (NO I/O)
  // ==========================================

  /**
   * Parse effort string to hours
   *
   * Converts effort strings like "2d", "4h", "1w" to hours.
   * Uses configurable hours per day/week from options.
   *
   * @param {string} effort - Effort string (e.g., "2d", "4h", "1w")
   * @returns {number} Effort in hours
   *
   * @example
   * service.parseEffort('2d')  // Returns 16 (2 * 8)
   * service.parseEffort('4h')  // Returns 4
   * service.parseEffort('1w')  // Returns 40 (1 * 40)
   */
  parseEffort(effort) {
    if (!effort || typeof effort !== 'string') {
      return this.options.defaultEffortHours;
    }

    // Parse numeric value
    const numericValue = parseFloat(effort);
    if (isNaN(numericValue)) {
      return this.options.defaultEffortHours;
    }

    // Determine unit
    if (effort.includes('d')) {
      return numericValue * this.options.hoursPerDay;
    } else if (effort.includes('h')) {
      return numericValue;
    } else if (effort.includes('w')) {
      return numericValue * this.options.hoursPerWeek;
    }

    return this.options.defaultEffortHours;
  }

  /**
   * Format hours to readable effort string
   *
   * Converts hours to human-readable format:
   * - < 8h: "Xh"
   * - 8-39h: "Xd" or "Xd Yh"
   * - 40+h: "Xw" or "Xw Yd"
   *
   * @param {number} hours - Hours to format
   * @returns {string} Formatted effort string
   *
   * @example
   * service.formatEffort(4)   // Returns "4h"
   * service.formatEffort(10)  // Returns "1d 2h"
   * service.formatEffort(48)  // Returns "1w 1d"
   */
  formatEffort(hours) {
    // Round to nearest hour
    hours = Math.floor(hours);

    if (hours === 0) {
      return '0h';
    }

    const { hoursPerDay, hoursPerWeek } = this.options;

    // Format weeks (40+ hours)
    if (hours >= hoursPerWeek) {
      const weeks = Math.floor(hours / hoursPerWeek);
      const remainingAfterWeeks = hours % hoursPerWeek;
      const days = Math.floor(remainingAfterWeeks / hoursPerDay);
      const remainingHours = remainingAfterWeeks % hoursPerDay;

      // Build format string
      const parts = [`${weeks}w`];
      if (days > 0) {
        parts.push(`${days}d`);
      }
      if (remainingHours > 0) {
        parts.push(`${remainingHours}h`);
      }

      return parts.join(' ');
    }

    // Format days (8-39 hours)
    if (hours >= hoursPerDay) {
      const days = Math.floor(hours / hoursPerDay);
      const remainingHours = hours % hoursPerDay;

      if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${days}d`;
    }

    // Format hours (< 8 hours)
    return `${hours}h`;
  }

  /**
   * Calculate total effort across all tasks
   *
   * Sums effort from all tasks and returns formatted string.
   * Uses parseEffort for each task, so supports all effort formats.
   *
   * @param {Array<Object>} tasks - Array of task objects with effort field
   * @returns {string} Total effort formatted as string
   *
   * @example
   * const tasks = [
   *   { effort: '2d' },
   *   { effort: '4h' },
   *   { effort: '1w' }
   * ];
   * service.calculateTotalEffort(tasks); // Returns "1w 2d 4h"
   */
  calculateTotalEffort(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return '0h';
    }

    let totalHours = 0;

    for (const task of tasks) {
      const effort = task.effort || '';
      totalHours += this.parseEffort(effort);
    }

    return this.formatEffort(totalHours);
  }

  /**
   * Calculate effort for specific task type
   *
   * Filters tasks by type and sums their effort.
   *
   * @param {Array<Object>} tasks - Array of task objects with type and effort
   * @param {string} type - Task type to filter by
   * @returns {string} Total effort for type, formatted as string
   *
   * @example
   * const tasks = [
   *   { type: 'frontend', effort: '2d' },
   *   { type: 'backend', effort: '3d' }
   * ];
   * service.calculateEffortByType(tasks, 'frontend'); // Returns "2d"
   */
  calculateEffortByType(tasks, type) {
    if (!Array.isArray(tasks)) {
      return '0h';
    }

    const typeTasks = tasks.filter(task => task.type === type);

    if (typeTasks.length === 0) {
      return '0h';
    }

    let totalHours = 0;

    for (const task of typeTasks) {
      const effort = task.effort || '';
      totalHours += this.parseEffort(effort);
    }

    return this.formatEffort(totalHours);
  }

  /**
   * Generate epic ID from PRD ID
   *
   * Converts PRD identifiers to Epic identifiers:
   * - "prd-347" -> "epic-347"
   * - "PRD-347" -> "epic-347"
   * - "prd347" -> "epic-347"
   *
   * @param {string} prdId - PRD identifier
   * @returns {string} Epic identifier
   *
   * @example
   * service.generateEpicId('prd-347'); // Returns "epic-347"
   * service.generateEpicId('PRD-347'); // Returns "epic-347"
   */
  generateEpicId(prdId) {
    if (!prdId || typeof prdId !== 'string') {
      return '';
    }

    // Already an epic ID
    if (prdId.toLowerCase().startsWith('epic')) {
      return prdId.toLowerCase();
    }

    // Extract number from prd-N or prdN
    const match = prdId.match(/prd-?(\d+)/i);
    if (match) {
      return `epic-${match[1]}`;
    }

    return prdId;
  }

  /**
   * Slugify text for filesystem-safe names
   *
   * Converts text to lowercase, removes special characters,
   * replaces spaces with hyphens, and collapses multiple hyphens.
   *
   * @param {string} text - Text to slugify
   * @returns {string} Slugified text (lowercase, alphanumeric, hyphens, underscores)
   *
   * @example
   * service.slugify('PRD: User Auth & Setup'); // Returns "prd-user-auth-setup"
   * service.slugify('Test    Multiple    Spaces'); // Returns "test-multiple-spaces"
   */
  slugify(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .toLowerCase()                    // Convert to lowercase
      .replace(/[^\w\s-]/g, '')        // Remove special characters (keep word chars, spaces, hyphens)
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/-+/g, '-')             // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '');        // Trim leading/trailing hyphens
  }

  /**
   * Determine if PRD is complex enough to split into multiple epics
   *
   * A PRD is considered complex if:
   * - It has 3 or more component types (frontend, backend, data, security)
   * - It has 10 or more tasks
   *
   * @param {Object} technicalApproach - Technical approach object with component arrays
   * @param {Array} tasks - Array of tasks
   * @returns {boolean} True if PRD is complex and should be split
   *
   * @example
   * const approach = {
   *   frontend: ['comp1', 'comp2'],
   *   backend: ['srv1'],
   *   data: ['model1'],
   *   security: []
   * };
   * service.isComplexPrd(approach, tasks); // Returns true if 3+ types or 10+ tasks
   */
  isComplexPrd(technicalApproach, tasks) {
    if (!technicalApproach || !tasks) {
      return false;
    }

    // Count non-empty component types
    let componentCount = 0;

    if (Array.isArray(technicalApproach.frontend) && technicalApproach.frontend.length > 0) {
      componentCount++;
    }
    if (Array.isArray(technicalApproach.backend) && technicalApproach.backend.length > 0) {
      componentCount++;
    }
    if (Array.isArray(technicalApproach.data) && technicalApproach.data.length > 0) {
      componentCount++;
    }
    if (Array.isArray(technicalApproach.security) && technicalApproach.security.length > 0) {
      componentCount++;
    }

    // Complex if 3+ component types OR 10+ tasks
    const hasMultipleComponents = componentCount >= 3;
    const hasManyTasks = Array.isArray(tasks) && tasks.length > 10;

    return hasMultipleComponents || hasManyTasks;
  }

  // ==========================================
  // TIER 2: AI NON-STREAMING METHODS
  // ==========================================

  /**
   * Parse PRD with AI analysis (non-streaming)
   *
   * Analyzes PRD content and extracts structured information including epics.
   * Returns a complete analysis object after processing is finished.
   * For real-time updates, use parseStream() instead.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Analysis options
   * @returns {Promise<Object>} Analysis result with epics array
   * @throws {Error} If provider is not available
   *
   * @example
   * const result = await service.parse(prdContent);
   * console.log(result.epics); // [{ id: 'epic-1', title: 'Epic Title' }]
   */
  async parse(content, options = {}) {
    if (!this.provider || !this.provider.generate) {
      // Fallback: use basic parsing if no AI provider
      const sections = this.extractPrdContent(content);
      const frontmatter = this.parseFrontmatter(content);

      // Generate basic epics from features
      const epics = sections.features.map((feature, index) => ({
        id: `epic-${index + 1}`,
        title: feature
      }));

      return { epics, sections, frontmatter };
    }

    const prompt = `Analyze this Product Requirements Document and provide a comprehensive analysis including:

1. Key features and capabilities
2. Target users and use cases
3. Technical requirements
4. Success metrics
5. Potential challenges

Return the analysis as JSON with an "epics" array containing objects with "id" and "title" fields.

PRD Content:
${content}`;

    const response = await this.provider.generate(prompt, options);

    // Try to parse JSON response, fallback to basic parsing
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch (error) {
      // Fallback to basic parsing
      const sections = this.extractPrdContent(content);
      const epics = sections.features.map((feature, index) => ({
        id: `epic-${index + 1}`,
        title: feature
      }));
      return { epics };
    }
  }

  /**
   * Extract epics from PRD (non-streaming)
   *
   * Identifies logical epic boundaries in PRD content based on features,
   * complexity, and technical approach. Returns a complete list of epics.
   * For real-time updates, use extractEpicsStream() instead.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Extraction options
   * @returns {Promise<Array<Object>>} Array of epic objects
   * @throws {Error} If provider is not available
   *
   * @example
   * const epics = await service.extractEpics(prdContent);
   * console.log(epics); // [{ id: 'epic-1', title: 'Epic 1', description: '...' }]
   */
  async extractEpics(content, options = {}) {
    if (!this.provider || !this.provider.generate) {
      // Fallback: use basic parsing if no AI provider
      const sections = this.extractPrdContent(content);

      // Generate basic epics from features
      return sections.features.map((feature, index) => ({
        id: `epic-${index + 1}`,
        title: feature,
        description: `Epic for ${feature}`
      }));
    }

    const prompt = `Analyze this Product Requirements Document and extract logical epics.

For each epic, provide:
1. Epic name and description
2. Key features included
3. User stories covered
4. Estimated effort
5. Dependencies on other epics

Break down the PRD into 2-5 cohesive epics that can be developed independently or in sequence.

Return the result as JSON array with objects containing: id, title, description fields.

PRD Content:
${content}`;

    const response = await this.provider.generate(prompt, options);

    // Try to parse JSON response, fallback to basic parsing
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : parsed.epics || [];
    } catch (error) {
      // Fallback to basic parsing
      const sections = this.extractPrdContent(content);
      return sections.features.map((feature, index) => ({
        id: `epic-${index + 1}`,
        title: feature,
        description: `Epic for ${feature}`
      }));
    }
  }

  /**
   * Generate summary of PRD (non-streaming)
   *
   * Creates a concise executive summary of PRD content, highlighting key points
   * and making it easier to understand project scope at a glance.
   * For real-time generation, use summarizeStream() instead.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Summary options
   * @returns {Promise<string>} PRD summary text
   * @throws {Error} If provider is not available
   *
   * @example
   * const summary = await service.summarize(prdContent);
   * console.log(summary); // 'This PRD outlines...'
   */
  async summarize(content, options = {}) {
    if (!this.provider || !this.provider.generate) {
      // Fallback: use basic parsing if no AI provider
      const sections = this.extractPrdContent(content);
      const frontmatter = this.parseFrontmatter(content);

      // Generate basic summary
      const parts = [];

      if (frontmatter && frontmatter.title) {
        parts.push(`PRD: ${frontmatter.title}`);
      }

      if (sections.vision) {
        parts.push(`\nVision: ${sections.vision.substring(0, 200)}...`);
      }

      if (sections.features.length > 0) {
        parts.push(`\nFeatures (${sections.features.length}):`);
        sections.features.slice(0, 3).forEach(f => {
          parts.push(`- ${f}`);
        });
      }

      return parts.join('\n');
    }

    const prompt = `Provide a concise executive summary of this Product Requirements Document.

Include:
1. Project overview (2-3 sentences)
2. Key objectives
3. Main features (bullet points)
4. Target completion timeline
5. Critical success factors

Keep the summary under 300 words.

PRD Content:
${content}`;

    return await this.provider.generate(prompt, options);
  }

  /**
   * Validate PRD structure and completeness
   *
   * Checks PRD for required sections, proper formatting, and content quality.
   * Returns validation result with list of issues found.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Validation options
   * @returns {Promise<Object>} Validation result: { valid: boolean, issues: string[] }
   *
   * @example
   * const result = await service.validate(prdContent);
   * if (!result.valid) {
   *   console.log('Issues:', result.issues);
   * }
   */
  async validate(content, options = {}) {
    const issues = [];

    // Check for frontmatter
    const frontmatter = this.parseFrontmatter(content);
    if (!frontmatter) {
      issues.push('Missing frontmatter');
    } else {
      if (!frontmatter.title) {
        issues.push('Missing title in frontmatter');
      }
      if (!frontmatter.status) {
        issues.push('Missing status in frontmatter');
      }
    }

    // Check for required sections
    const sections = this.extractPrdContent(content);

    if (!sections.vision) {
      issues.push('Missing vision/summary section');
    }

    if (!sections.problem) {
      issues.push('Missing problem statement');
    }

    if (!sections.users) {
      issues.push('Missing target users/audience section');
    }

    if (sections.features.length === 0) {
      issues.push('Missing features section or no features listed');
    }

    if (sections.requirements.length === 0) {
      issues.push('Missing requirements section or no requirements listed');
    }

    if (!sections.metrics) {
      issues.push('Missing success metrics/acceptance criteria');
    }

    // Check content quality
    if (sections.vision && sections.vision.length < 50) {
      issues.push('Vision/summary is too short (< 50 characters)');
    }

    if (sections.features.length > 0 && sections.features.length < 2) {
      issues.push('Too few features (should have at least 2)');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // ==========================================
  // TIER 4: AI STREAMING METHODS
  // ==========================================

  /**
   * Generate PRD from prompt (non-streaming)
   *
   * Uses AI to generate a complete PRD from a high-level description or prompt.
   * Returns the generated PRD as markdown text.
   *
   * @param {string} prompt - Prompt describing what PRD to generate
   * @param {Object} [options] - Generation options
   * @returns {Promise<string>} Generated PRD markdown
   * @throws {Error} If provider is not available
   *
   * @example
   * const prd = await service.generatePRD('Create a PRD for user authentication');
   * console.log(prd); // Full PRD markdown
   */
  async generatePRD(prompt, options = {}) {
    if (!this.provider || !this.provider.generate) {
      throw new Error('PRD generation requires an AI provider with generate() support');
    }

    return await this.provider.generate(prompt, options);
  }

  /**
   * Generate PRD from prompt with streaming output
   *
   * Uses AI to generate a complete PRD from a high-level description,
   * streaming the output in real-time as it's generated.
   *
   * @param {string} prompt - Prompt describing what PRD to generate
   * @param {Object} [options] - Streaming options
   * @returns {AsyncGenerator<string>} Stream of PRD markdown chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.generatePRDStream('Create a PRD for...')) {
   *   process.stdout.write(chunk); // Display PRD as it's generated
   * }
   */
  async *generatePRDStream(prompt, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming PRD generation requires an AI provider with stream() support');
    }

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }

  /**
   * Parse PRD with streaming AI analysis
   *
   * Streams AI-powered analysis of PRD content, yielding chunks of analysis
   * as they are generated. Requires an AI provider with stream() support.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Streaming options (passed to provider)
   * @returns {AsyncGenerator<string>} Stream of analysis text chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.parseStream(prdContent)) {
   *   process.stdout.write(chunk); // Display real-time analysis
   * }
   */
  async *parseStream(content, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming requires an AI provider with stream() support');
    }

    const prompt = `Analyze this Product Requirements Document and provide a comprehensive analysis including:

1. Key features and capabilities
2. Target users and use cases
3. Technical requirements
4. Success metrics
5. Potential challenges

PRD Content:
${content}`;

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }

  /**
   * Extract epics from PRD with streaming output
   *
   * Streams AI-powered extraction of epics from PRD content. The AI analyzes
   * the PRD and identifies logical epic boundaries based on features, complexity,
   * and technical approach.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Streaming options (passed to provider)
   * @returns {AsyncGenerator<string>} Stream of epic extraction text chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.extractEpicsStream(prdContent)) {
   *   process.stdout.write(chunk); // Display epic extraction progress
   * }
   */
  async *extractEpicsStream(content, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming requires an AI provider with stream() support');
    }

    const prompt = `Analyze this Product Requirements Document and extract logical epics.

For each epic, provide:
1. Epic name and description
2. Key features included
3. User stories covered
4. Estimated effort
5. Dependencies on other epics

Break down the PRD into 2-5 cohesive epics that can be developed independently or in sequence.

PRD Content:
${content}`;

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }

  /**
   * Generate summary of PRD with streaming output
   *
   * Streams AI-powered summary of PRD content. Provides a concise overview
   * of the PRD's key points, making it easier to understand the project scope
   * and requirements at a glance.
   *
   * @param {string} content - PRD markdown content
   * @param {Object} [options] - Streaming options (passed to provider)
   * @returns {AsyncGenerator<string>} Stream of summary text chunks
   * @throws {Error} If provider is not available or lacks stream() support
   *
   * @example
   * for await (const chunk of service.summarizeStream(prdContent)) {
   *   process.stdout.write(chunk); // Display summary as it's generated
   * }
   */
  async *summarizeStream(content, options = {}) {
    if (!this.provider || !this.provider.stream) {
      throw new Error('Streaming requires an AI provider with stream() support');
    }

    const prompt = `Provide a concise executive summary of this Product Requirements Document.

Include:
1. Project overview (2-3 sentences)
2. Key objectives
3. Main features (bullet points)
4. Target completion timeline
5. Critical success factors

Keep the summary under 300 words.

PRD Content:
${content}`;

    for await (const chunk of this.provider.stream(prompt, options)) {
      yield chunk;
    }
  }
}

module.exports = PRDService;
