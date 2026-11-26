/**
 * Azure DevOps CLI Wrapper
 *
 * Wrapper around Azure DevOps CLI (az) for managing Azure DevOps resources.
 * Provides retry logic, error handling, and simplified interface for CLI operations.
 *
 * Features:
 * - Execute Azure CLI commands with automatic authentication
 * - Retry logic with exponential backoff for transient failures
 * - Variable groups management
 * - Service connections management
 * - Pipelines management
 * - Comprehensive error handling
 *
 * @module lib/providers/AzureDevOpsCliWrapper
 */

const { execFileSync } = require('child_process');

/**
 * Azure DevOps CLI Wrapper Class
 *
 * Wraps Azure DevOps CLI commands for consistent error handling and retry logic
 *
 * @class AzureDevOpsCliWrapper
 */
class AzureDevOpsCliWrapper {
  /**
   * Creates a new Azure CLI wrapper instance
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.token] - Personal Access Token (PAT)
   * @param {string} [options.organization] - Azure DevOps organization name
   * @param {string} [options.project] - Project name
   * @param {number} [options.maxRetries=3] - Maximum number of retries
   * @param {number} [options.retryDelay=1000] - Initial retry delay in ms
   */
  constructor(options = {}) {
    this.token = options.token || process.env.AZURE_DEVOPS_EXT_PAT;
    this.organization = options.organization || process.env.AZURE_DEVOPS_ORG;
    this.project = options.project || process.env.AZURE_DEVOPS_PROJECT;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;

    if (!this.token) {
      throw new Error('Azure DevOps PAT token is required');
    }

    if (!this.organization) {
      throw new Error('Azure DevOps organization is required');
    }

    if (!this.project) {
      throw new Error('Azure DevOps project is required');
    }
  }

  /**
   * Escapes a value for use inside a single-quoted JMESPath string literal.
   * Prevents the value from terminating the JMESPath quote and altering the
   * query structure.
   *
   * @param {*} value - Value to escape
   * @returns {string} Escaped value
   * @private
   */
  _escapeJmesValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Validates a variable name for `--variables name=value` assignments.
   * az parses the element at the first '=', so a name containing '=' or
   * whitespace would silently change the meaning of the assignment.
   *
   * @param {string} key - Variable name to validate
   * @throws {Error} If the name is not a safe identifier
   * @private
   */
  _validateVariableKey(key) {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) {
      throw new Error(`Invalid variable name: ${key}`);
    }
  }

  /**
   * Executes an Azure CLI command without a shell (argv array), so argument
   * values can never be interpreted as shell syntax.
   *
   * @param {string[]} command - argv array (without 'az' prefix),
   *   e.g. ['pipelines', 'list', '--name', name]
   * @param {Object} [options={}] - Execution options
   * @param {Object} [options.env] - Additional environment variables
   * @returns {Object} Parsed JSON response
   * @throws {TypeError} If command is not an argv array
   * @throws {Error} If command fails
   */
  execute(command, options = {}) {
    // Command strings are rejected outright: splitting a string would scatter
    // user-controlled values across argv elements and reintroduce the
    // injection-prone interface this class moved away from.
    if (!Array.isArray(command)) {
      throw new TypeError("execute() requires an argv array, e.g. ['pipelines', 'list'] — command strings are not accepted");
    }
    const args = command.map(String);

    // Don't spread options directly as it would override env
    const execOptions = {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      ...options,
      env: {
        ...process.env,
        AZURE_DEVOPS_EXT_PAT: this.token,
        ...(options.env || {})
      }
    };

    try {
      const output = execFileSync('az', args, execOptions);
      return JSON.parse(output);
    } catch (error) {
      return this._handleCommandError(error, ['az', ...args].join(' '));
    }
  }

  /**
   * Executes an Azure CLI command with retry logic
   *
   * Retries on transient failures (5xx) with exponential backoff.
   * Does not retry on client errors (4xx) as these are not recoverable.
   *
   * @async
   * @param {string} command - CLI command to execute
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<Object>} Parsed JSON response
   * @throws {Error} If all retries fail
   */
  async executeWithRetry(command, options = {}) {
    let lastError;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return this.execute(command, options);
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx) - throw immediately
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        await this._sleep(delay);
        delay *= 2;
      }
    }

    // Re-throw the original error if all retries exhausted
    throw lastError;
  }

  /**
   * Lists variable groups in the project
   *
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.name] - Filter by name pattern
   * @returns {Array<Object>} Array of variable groups
   * @throws {Error} If command fails
   */
  variableGroupList(filters = {}) {
    const args = ['pipelines', 'variable-group', 'list',
      '--organization', this.organization, '--project', this.project];

    // Add JMESPath query for filtering if needed
    if (filters.name) {
      args.push('--query', `[?contains(name, '${this._escapeJmesValue(filters.name)}')]`);
    }

    try {
      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to list variable groups: ${error.message}`);
    }
  }

  /**
   * Lists service endpoints in the project
   *
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.type] - Filter by service endpoint type
   * @param {string} [filters.name] - Filter by name pattern
   * @returns {Array<Object>} Array of service endpoints
   * @throws {Error} If command fails
   */
  serviceEndpointList(filters = {}) {
    const args = ['devops', 'service-endpoint', 'list',
      '--organization', this.organization, '--project', this.project];

    // Add JMESPath query for filtering if needed
    const queries = [];
    if (filters.type) {
      queries.push(`type == '${this._escapeJmesValue(filters.type)}'`);
    }
    if (filters.name) {
      queries.push(`contains(name, '${this._escapeJmesValue(filters.name)}')`);
    }

    if (queries.length > 0) {
      args.push('--query', `[?${queries.join(' && ')}]`);
    }

    try {
      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to list service endpoints: ${error.message}`);
    }
  }

  /**
   * Lists pipelines in the project
   *
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.name] - Filter by name pattern
   * @param {string} [filters.folder] - Filter by folder path
   * @param {string} [filters.tag] - Filter by tag
   * @returns {Array<Object>} Array of pipelines
   * @throws {Error} If command fails
   */
  pipelineList(filters = {}) {
    const args = ['pipelines', 'list',
      '--organization', this.organization, '--project', this.project];

    if (filters.name) {
      args.push('--name', filters.name);
    }

    if (filters.folder) {
      args.push('--folder', filters.folder);
    }

    if (filters.tag) {
      args.push('--tag', filters.tag);
    }

    try {
      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to list pipelines: ${error.message}`);
    }
  }

  /**
   * Gets a variable group by ID
   *
   * @param {number} id - Variable group ID
   * @returns {Object} Variable group details
   * @throws {Error} If variable group not found
   */
  getVariableGroup(id) {
    try {
      return this.execute(['pipelines', 'variable-group', 'show', '--id', String(id),
        '--organization', this.organization, '--project', this.project]);
    } catch (error) {
      if (error.message.includes('not found') || error.statusCode === 404) {
        throw new Error(`Variable group not found: ${id}`);
      }
      throw new Error(`Failed to get variable group: ${error.message}`);
    }
  }

  /**
   * Creates a new variable group
   *
   * @param {string} name - Variable group name
   * @param {Object} variables - Variables object {key: value}
   * @param {string} [description] - Variable group description
   * @returns {Object} Created variable group
   * @throws {Error} If creation fails
   */
  createVariableGroup(name, variables, description = '') {
    try {
      const args = ['pipelines', 'variable-group', 'create', '--name', name];

      for (const [key, value] of Object.entries(variables)) {
        this._validateVariableKey(key);
        args.push('--variables', `${key}=${value}`);
      }

      args.push('--organization', this.organization, '--project', this.project);

      if (description) {
        args.push('--description', description);
      }

      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to create variable group: ${error.message}`);
    }
  }

  /**
   * Updates an existing variable group
   *
   * @param {number} id - Variable group ID
   * @param {Object} data - Update data
   * @param {string} [data.name] - New name
   * @param {string} [data.description] - New description
   * @param {Object} [data.variables] - Variables to update
   * @returns {Object} Updated variable group
   * @throws {Error} If update fails
   */
  updateVariableGroup(id, data = {}) {
    try {
      const args = ['pipelines', 'variable-group', 'update', '--id', String(id),
        '--organization', this.organization, '--project', this.project];

      if (data.name) {
        args.push('--name', data.name);
      }

      if (data.description !== undefined) {
        args.push('--description', data.description);
      }

      if (data.variables) {
        for (const [key, value] of Object.entries(data.variables)) {
          this._validateVariableKey(key);
          args.push('--variables', `${key}=${value}`);
        }
      }

      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to update variable group: ${error.message}`);
    }
  }

  /**
   * Deletes a variable group
   *
   * @param {boolean} [yes=false] - Skip confirmation
   * @returns {Object} Deletion result
   * @throws {Error} If deletion fails
   */
  deleteVariableGroup(id, yes = false) {
    try {
      const args = ['pipelines', 'variable-group', 'delete', '--id', String(id),
        '--organization', this.organization, '--project', this.project];

      if (yes) {
        args.push('--yes');
      }

      return this.execute(args);
    } catch (error) {
      throw new Error(`Failed to delete variable group: ${error.message}`);
    }
  }

  /**
   * Handles command errors with meaningful messages
   *
   * @param {Error} error - Original error
   * @param {string} command - Command that failed
   * @returns {never} Throws formatted error
   * @private
   */
  _handleCommandError(error, command) {
    // Check if Azure CLI is not installed
    if (error.code === 'ENOENT') {
      throw new Error('Azure CLI is not installed. Install from https://aka.ms/installazurecliwindows');
    }

    // Parse error from stderr
    const stderr = error.stderr ? error.stderr.toString() : '';
    const stdout = error.stdout ? error.stdout.toString() : '';

    // Extract status code if available from stderr or from error.status
    let statusCode = error.status || error.statusCode;
    if (!statusCode) {
      const statusMatch = stderr.match(/STATUS\s*:\s*(\d+)/);
      statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
    }

    // Create enhanced error
    const enhancedError = new Error(`Azure CLI command failed: ${stderr || error.message}`);
    enhancedError.statusCode = statusCode;
    enhancedError.originalError = error;
    enhancedError.command = command;
    enhancedError.stdout = stdout;
    enhancedError.stderr = stderr;

    throw enhancedError;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AzureDevOpsCliWrapper;
