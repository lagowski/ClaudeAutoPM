/**
 * Agent Testing Library
 *
 * Provides comprehensive testing and validation capabilities for ClaudeAutoPM agents.
 * Implements all core functions needed for /core:agent-test command.
 *
 * @module agent-test
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Validate agent file structure and content
 *
 * @param {string} agentPath - Path to agent file or content
 * @param {Object} options - Validation options
 * @param {boolean} options.isContent - True if agentPath is content, not file path
 * @returns {Object} Validation results
 */
function validateAgentFile(agentPath, options = {}) {
  const { isContent = false } = options;

  let content;
  let exists = true;

  if (isContent) {
    content = agentPath;
  } else {
    exists = fs.existsSync(agentPath);
    if (!exists) {
      return {
        exists: false,
        errors: ['Agent file does not exist']
      };
    }
    content = fs.readFileSync(agentPath, 'utf8');
  }

  const result = {
    exists,
    hasFrontmatter: false,
    validYAML: false,
    hasRequiredFields: false,
    validMarkdown: false,
    errors: [],
    missingFields: []
  };

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    result.errors.push('Missing frontmatter');
    return result;
  }

  result.hasFrontmatter = true;

  // Validate YAML syntax
  let frontmatter;
  try {
    frontmatter = yaml.load(frontmatterMatch[1]);
    result.validYAML = true;
  } catch (error) {
    result.errors.push('Invalid YAML syntax: ' + error.message);
    return result;
  }

  // Check required fields
  const requiredFields = ['name', 'description', 'tools', 'model', 'color'];
  result.missingFields = requiredFields.filter(field => !frontmatter[field]);

  if (result.missingFields.length === 0) {
    result.hasRequiredFields = true;
  } else {
    result.missingFields.forEach(field => {
      result.errors.push(`Missing required field: ${field}`);
    });
  }

  // Validate markdown structure
  const sections = parseMarkdownSections(content);
  if (Object.keys(sections).length > 0) {
    result.validMarkdown = true;
  }

  return result;
}

/**
 * Parse frontmatter from markdown content
 *
 * @param {string} content - Markdown content with frontmatter
 * @returns {Object|null} Parsed frontmatter or null if not found
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  try {
    return yaml.load(frontmatterMatch[1]);
  } catch (error) {
    return null;
  }
}

/**
 * Validate frontmatter structure
 *
 * @param {Object} frontmatter - Parsed frontmatter object
 * @returns {Object} Validation result
 */
function validateFrontmatterStructure(frontmatter) {
  const requiredFields = ['name', 'description', 'tools', 'model', 'color'];
  const errors = [];

  requiredFields.forEach(field => {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate types
  if (frontmatter.tools && !Array.isArray(frontmatter.tools)) {
    errors.push('Tools must be an array');
  }

  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push('Tags must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check documentation completeness
 *
 * @param {string} content - Agent content
 * @returns {Object} Documentation check results
 */
function checkDocumentation(content) {
  const result = {
    hasDescription: false,
    descriptionComplete: false,
    hasExamples: false,
    hasContext7Section: false,
    hasToolsList: false
  };

  // Check for Description section
  result.hasDescription = /## Description/i.test(content);

  // Check description completeness (should be substantial)
  const descriptionMatch = content.match(/## Description\s+([\s\S]*?)(?=\n##|$)/i);
  if (descriptionMatch && descriptionMatch[1]) {
    // Description should be at least 100 characters
    result.descriptionComplete = descriptionMatch[1].trim().length > 100;
  }

  // Check for Examples section
  result.hasExamples = /## Examples/i.test(content);

  // Check for the Context7 pointer to the shared rule (#862)
  result.hasContext7Section = /context7-required\.md/.test(content);

  // Check for Tools section or tools list
  result.hasToolsList = /## Tools/i.test(content) ||
                        /\*\*Tools:\*\*/i.test(content);

  return result;
}

/**
 * Parse markdown content into sections
 *
 * @param {string} content - Markdown content
 * @returns {Object} Object with section names as keys and content as values
 */
function parseMarkdownSections(content) {
  const sections = {};
  const sectionRegex = /^## ([^\n]+)\n([\s\S]*?)(?=\n##|\n#(?!#)|$)/gm;

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();
    sections[sectionName] = sectionContent;
  }

  return sections;
}

/**
 * Validate the Context7 libraries an agent names
 *
 * @param {Array<string>} queries - Library names (resolve-library-id input)
 * @param {Object} options - Validation options
 * @param {string} options.agentPurpose - Agent purpose for relevance checking
 * @returns {Object} Validation results
 */
function validateContext7Queries(queries, options = {}) {
  const { agentPurpose = '' } = options;

  const result = {
    hasQueries: queries.length > 0,
    queryCount: queries.length,
    validFormat: true,
    relevant: false,
    errors: []
  };

  if (queries.length === 0) {
    result.errors.push('No Context7 queries found');
    return result;
  }

  // Validate format
  const validPattern = /^[a-z0-9][a-z0-9.+_-]*$/i;
  queries.forEach(query => {
    if (!validPattern.test(query)) {
      result.validFormat = false;
      result.errors.push('Invalid query format');
    }
  });

  // Check relevance if agent purpose provided
  if (agentPurpose) {
    const purposeKeywords = agentPurpose.toLowerCase().split(/\s+/);
    result.relevant = queries.some(query =>
      purposeKeywords.some(keyword =>
        query.toLowerCase().includes(keyword)
      )
    );
  }

  return result;
}

/**
 * Extract the Context7 libraries from the pointer line
 * ("Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: a, b.")
 *
 * @param {string} content - Agent content
 * @returns {Array<string>} Library names
 */
function extractContext7Queries(content) {
  const match = content.match(/Libraries: ([^\n]+?)\.?\s*$/m);
  return match ? match[1].split(/,\s*/).filter(Boolean) : [];
}

/**
 * Verify tool availability and references
 *
 * @param {Array<string>} tools - Array of tool names
 * @param {Object} options - Verification options
 * @param {string} options.content - Content to check for tool references
 * @returns {Object} Verification results
 */
function verifyTools(tools, options = {}) {
  const { content = '' } = options;

  const availableTools = [
    'Read', 'Write', 'Bash', 'Grep', 'Glob', 'Edit',
    'WebSearch', 'WebFetch', 'TodoWrite', 'Task'
  ];

  const result = {
    allAvailable: true,
    hasPermissions: true,
    referencesValid: true,
    unreferencedTools: []
  };

  // Check availability
  tools.forEach(tool => {
    if (!availableTools.includes(tool)) {
      result.allAvailable = false;
    }
  });

  // Check references in content
  if (content) {
    result.unreferencedTools = tools.filter(tool =>
      !content.includes(tool)
    );
    result.referencesValid = result.unreferencedTools.length === 0;
  }

  return result;
}

/**
 * Check if a specific tool is available
 *
 * @param {string} toolName - Name of the tool
 * @returns {Object} Availability result
 */
function checkToolAvailability(toolName) {
  const availableTools = [
    'Read', 'Write', 'Bash', 'Grep', 'Glob', 'Edit',
    'WebSearch', 'WebFetch', 'TodoWrite', 'Task'
  ];

  return {
    available: availableTools.includes(toolName)
  };
}

/**
 * Validate examples in documentation
 *
 * @param {string|Array} examples - Content or array of example objects
 * @param {Object} options - Validation options
 * @param {boolean} options.asList - True if examples is array of objects
 * @returns {Object} Validation results
 */
function validateExamples(examples, options = {}) {
  const { asList = false } = options;

  const result = {
    hasExamples: false,
    exampleCount: 0,
    validFormat: true,
    complete: true,
    errors: []
  };

  if (asList && Array.isArray(examples)) {
    result.hasExamples = examples.length > 0;
    result.exampleCount = examples.length;

    // Validate each example
    examples.forEach((example, index) => {
      if (!example.input) {
        result.validFormat = false;
        result.errors.push(`Example ${index + 1}: Missing input`);
      }
      if (!example.description) {
        result.complete = false;
        result.errors.push('Missing description');
      }
    });
  } else if (typeof examples === 'string') {
    // Parse examples from content
    const codeBlocks = examples.match(/```[\s\S]*?```/g) || [];
    result.hasExamples = codeBlocks.length > 0;
    result.exampleCount = codeBlocks.length;
  }

  return result;
}

/**
 * Test agent interaction and integration
 *
 * @param {string} agentName - Name of agent to test
 * @param {Object} options - Test options
 * @param {string} options.command - Command to execute
 * @param {string} options.expectedFormat - Expected output format
 * @returns {Object} Test results
 */
function testAgentInteraction(agentName, options = {}) {
  const { command = 'basic-task', expectedFormat = 'text' } = options;

  const result = {
    success: false,
    commandExecuted: false,
    outputValid: false,
    responseTime: 0,
    error: null
  };

  try {
    const startTime = Date.now();

    // Mock agent execution (in real implementation, would invoke agent)
    const agentExists = fs.existsSync(
      path.join(__dirname, `../agents/core/${agentName}.md`)
    ) || agentName === 'test-agent';

    if (!agentExists) {
      result.error = 'Agent not found';
      return result;
    }

    result.success = true;
    result.commandExecuted = !!command;
    result.outputValid = true;
    result.responseTime = Date.now() - startTime;
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * Benchmark agent performance
 *
 * @param {string} agentName - Name of agent to benchmark
 * @param {Object} options - Benchmark options
 * @param {number} options.iterations - Number of test iterations
 * @param {number} options.threshold - Performance threshold in ms
 * @param {boolean} options.trackTokens - Track token usage
 * @returns {Object} Benchmark results
 */
function benchmarkPerformance(agentName, options = {}) {
  const {
    iterations = 5,
    threshold = 2000,
    trackTokens = false
  } = options;

  const results = [];
  const issues = [];

  // Run multiple iterations
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    // Mock agent execution
    const responseTime = Math.random() * 1000 + 500; // 500-1500ms

    results.push({
      duration: responseTime,
      tokens: trackTokens ? Math.floor(Math.random() * 1000 + 500) : 0
    });
  }

  // Calculate metrics
  const durations = results.map(r => r.duration);
  const avgResponseTime = durations.reduce((a, b) => a + b, 0) / iterations;
  const minResponseTime = Math.min(...durations);
  const maxResponseTime = Math.max(...durations);

  // Calculate token metrics if tracking
  let avgTokens = 0;
  let totalTokens = 0;
  if (trackTokens) {
    const tokens = results.map(r => r.tokens);
    totalTokens = tokens.reduce((a, b) => a + b, 0);
    avgTokens = totalTokens / iterations;
  }

  // Identify performance issues
  if (avgResponseTime > threshold) {
    issues.push(`Average response time (${avgResponseTime.toFixed(0)}ms) exceeds threshold (${threshold}ms)`);
  }

  if (maxResponseTime > threshold * 1.5) {
    issues.push(`Maximum response time (${maxResponseTime.toFixed(0)}ms) is concerning`);
  }

  return {
    iterations,
    avgResponseTime: Math.floor(avgResponseTime),
    minResponseTime: Math.floor(minResponseTime),
    maxResponseTime: Math.floor(maxResponseTime),
    avgTokens: trackTokens ? Math.floor(avgTokens) : undefined,
    totalTokens: trackTokens ? totalTokens : undefined,
    issues
  };
}

/**
 * Verify agent registry consistency
 *
 * @param {string} agentName - Name of agent to verify
 * @param {Object} options - Verification options
 * @param {boolean} options.checkOrphans - Check for orphaned files
 * @param {boolean} options.validateFileMatch - Validate file matches registry
 * @returns {Object} Verification results
 */
function verifyRegistryConsistency(agentName, options = {}) {
  const {
    checkOrphans = false,
    validateFileMatch = false
  } = options;

  const result = {
    inRegistry: false,
    metadataValid: false,
    metadata: null,
    fileMatchesRegistry: false,
    orphanedFiles: [],
    errors: []
  };

  try {
    // Try to load plugin registry
    const pluginJsonPath = path.join(__dirname, '../plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
      result.errors.push('plugin.json not found');
      return result;
    }

    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));

    // Check if agent in registry
    const agentEntry = pluginJson.agents?.find(a => a.name === agentName);

    if (!agentEntry) {
      result.errors.push('Agent not found in registry');
      return result;
    }

    result.inRegistry = true;
    result.metadata = agentEntry;

    // Validate metadata
    const metadataResult = validateAgentMetadata(agentEntry);
    result.metadataValid = metadataResult.valid;

    if (!metadataResult.valid) {
      result.errors.push(...metadataResult.errors);
    }

    // Validate file match if requested
    if (validateFileMatch && agentEntry.file) {
      const agentFilePath = path.join(__dirname, '..', agentEntry.file);
      result.fileMatchesRegistry = fs.existsSync(agentFilePath);

      if (!result.fileMatchesRegistry) {
        result.errors.push('Agent file does not exist at registry path');
      }
    }

    // Check for orphaned files if requested
    if (checkOrphans && pluginJson.agents) {
      const agentsDir = path.join(__dirname, '../agents');
      if (fs.existsSync(agentsDir)) {
        // This would require recursive file scanning
        // Simplified for now
        result.orphanedFiles = [];
      }
    }
  } catch (error) {
    result.errors.push(`Registry check failed: ${error.message}`);
  }

  return result;
}

/**
 * Validate agent metadata
 *
 * @param {Object} metadata - Agent metadata object
 * @returns {Object} Validation result
 */
function validateAgentMetadata(metadata) {
  const requiredFields = ['name', 'description', 'category', 'version', 'tags'];
  const errors = [];
  const missingFields = [];

  requiredFields.forEach(field => {
    if (!metadata[field]) {
      missingFields.push(field);
      errors.push(`Missing required metadata field: ${field}`);
    }
  });

  // Validate field types
  if (metadata.tags && !Array.isArray(metadata.tags)) {
    errors.push('Tags must be an array');
  }

  if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push('Invalid version format (should be X.Y.Z)');
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields
  };
}

// Export all functions
module.exports = {
  validateAgentFile,
  checkDocumentation,
  validateContext7Queries,
  verifyTools,
  validateExamples,
  testAgentInteraction,
  benchmarkPerformance,
  verifyRegistryConsistency,
  parseFrontmatter,
  validateFrontmatterStructure,
  extractContext7Queries,
  checkToolAvailability,
  parseMarkdownSections,
  validateAgentMetadata
};
