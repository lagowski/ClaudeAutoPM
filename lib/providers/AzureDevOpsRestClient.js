/**
 * Azure DevOps REST API Client
 *
 * REST API client for Azure DevOps operations that are not supported by Azure CLI.
 * Provides direct REST API access with Basic Authentication and proper error handling.
 *
 * Features:
 * - HTTP methods (GET, POST, PATCH, DELETE)
 * - Variable groups linking to pipelines (CLI doesn't support this!)
 * - Secret variables management
 * - Basic Authentication with PAT
 * - Automatic API versioning
 * - Comprehensive error handling
 *
 * @module lib/providers/AzureDevOpsRestClient
 */

const https = require('https');
const { URL } = require('url');

/**
 * Azure DevOps REST API Client Class
 *
 * Provides REST API access for operations not supported by Azure CLI
 *
 * @class AzureDevOpsRestClient
 */
class AzureDevOpsRestClient {
  /**
   * Creates a new Azure DevOps REST API client instance
   *
   * @param {Object} options - Configuration options
   * @param {string} [options.token] - Personal Access Token (PAT)
   * @param {string} [options.organization] - Azure DevOps organization name
   * @param {string} [options.project] - Project name
   * @param {string} [options.apiVersion='7.0'] - REST API version
   */
  constructor(options = {}) {
    this.token = options.token || process.env.AZURE_DEVOPS_PAT;
    this.organization = options.organization || process.env.AZURE_DEVOPS_ORG;
    this.project = options.project || process.env.AZURE_DEVOPS_PROJECT;
    this.apiVersion = options.apiVersion || '7.0';

    if (!this.token) {
      throw new Error('Azure DevOps PAT token is required');
    }

    if (!this.organization) {
      throw new Error('Azure DevOps organization is required');
    }

    if (!this.project) {
      throw new Error('Azure DevOps project is required');
    }

    // Generate Basic Auth header: base64(":PAT")
    this.authHeader = `Basic ${Buffer.from(`:${this.token}`).toString('base64')}`;

    // Base URL for Azure DevOps REST API
    this.baseUrl = `dev.azure.com/${this.organization}`;
  }

  /**
   * Makes an HTTP request to Azure DevOps REST API
   *
   * @async
   * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
   * @param {string} endpoint - API endpoint (e.g., '/_apis/build/builds')
   * @param {Object|null} [data=null] - Request body data
   * @returns {Promise<Object>} Response data
   * @throws {Error} If request fails
   * @private
   */
  async _request(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      // Add api-version query parameter if not already present
      const url = new URL(`https://${this.baseUrl}${endpoint}`);
      if (!url.searchParams.has('api-version')) {
        url.searchParams.set('api-version', this.apiVersion);
      }

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          // Handle successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Return null for 204 No Content
            if (res.statusCode === 204) {
              resolve(null);
              return;
            }

            // Parse JSON response
            try {
              const parsedData = responseData ? JSON.parse(responseData) : null;
              resolve(parsedData);
            } catch (error) {
              reject(new Error(`Invalid JSON response: ${error.message}`));
            }
          } else {
            // Handle error responses
            this._handleErrorResponse(res.statusCode, responseData, reject);
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      // Write request body for POST, PATCH, PUT
      if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Handles error responses from Azure DevOps API
   *
   * @param {number} statusCode - HTTP status code
   * @param {string} responseData - Response body
   * @param {Function} reject - Promise reject function
   * @private
   */
  _handleErrorResponse(statusCode, responseData, reject) {
    let errorMessage = `HTTP ${statusCode}`;

    switch (statusCode) {
      case 401:
        errorMessage = 'Authentication failed - check AZURE_DEVOPS_PAT';
        break;
      case 403:
        errorMessage = 'Access denied - check PAT permissions';
        break;
      case 404:
        errorMessage = 'Resource not found';
        break;
      default:
        try {
          const errorData = JSON.parse(responseData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseData || errorMessage;
        }
    }

    reject(new Error(errorMessage));
  }

  /**
   * Links a variable group to a pipeline
   *
   * **CRITICAL**: This operation is NOT supported by Azure CLI!
   * REST API is required for this operation.
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to link
   * @param {number} pipelineId - Pipeline ID to link to
   * @returns {Promise<Object>} Link result
   * @throws {Error} If linking fails
   */
  async linkVariableGroupToPipeline(variableGroupId, pipelineId) {
    try {
      // First, get current variable groups for the pipeline
      const currentData = await this.getPipelineVariableGroups(pipelineId);
      const currentVariableGroups = currentData.variableGroups || [];

      // Add the new variable group if not already linked
      if (!currentVariableGroups.includes(variableGroupId)) {
        currentVariableGroups.push(variableGroupId);
      }

      // Update pipeline with new variable group list
      return await this._request('PUT', `/_apis/pipelines/${pipelineId}/variablegroups`, {
        variableGroups: currentVariableGroups.map(id => ({ id: id }))
      });
    } catch (error) {
      throw new Error(`Failed to link variable group ${variableGroupId} to pipeline ${pipelineId}: ${error.message}`);
    }
  }

  /**
   * Unlinks a variable group from a pipeline
   *
   * **CRITICAL**: This operation is NOT supported by Azure CLI!
   * REST API is required for this operation.
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to unlink
   * @param {number} pipelineId - Pipeline ID to unlink from
   * @returns {Promise<Object>} Unlink result
   * @throws {Error} If unlinking fails
   */
  async unlinkVariableGroupFromPipeline(variableGroupId, pipelineId) {
    try {
      // First, get current variable groups for the pipeline
      const currentData = await this.getPipelineVariableGroups(pipelineId);
      const currentVariableGroups = currentData.variableGroups || [];

      // Remove the variable group
      const updatedVariableGroups = currentVariableGroups.filter(id => id !== variableGroupId);

      // Update pipeline with new variable group list
      return await this._request('PUT', `/_apis/pipelines/${pipelineId}/variablegroups`, {
        variableGroups: updatedVariableGroups.map(id => ({ id: id }))
      });
    } catch (error) {
      throw new Error(`Failed to unlink variable group ${variableGroupId} from pipeline ${pipelineId}: ${error.message}`);
    }
  }

  /**
   * Gets variable groups linked to a pipeline
   *
   * @async
   * @param {number} pipelineId - Pipeline ID
   * @returns {Promise<Object>} Pipeline variable groups data
   * @throws {Error} If request fails
   */
  async getPipelineVariableGroups(pipelineId) {
    try {
      return await this._request('GET', `/_apis/pipelines/${pipelineId}/variablegroups`);
    } catch (error) {
      throw new Error(`Failed to get variable groups for pipeline ${pipelineId}: ${error.message}`);
    }
  }

  /**
   * Adds secret variables to a variable group
   *
   * **Note**: Secret variables require REST API - CLI cannot create them
   *
   * @async
   * @param {number} variableGroupId - Variable group ID
   * @param {Object} secrets - Secret variables object {name: value}
   * @returns {Promise<Object>} Updated variable group
   * @throws {Error} If update fails
   */
  async addSecretVariables(variableGroupId, secrets) {
    try {
      // Build variables object with isSecret flag
      const variables = {};
      for (const [key, value] of Object.entries(secrets)) {
        variables[key] = {
          value: value,
          isSecret: true,
          enabled: true
        };
      }

      return await this._request('PATCH', `/_apis/distributedtask/variablegroups/${variableGroupId}`, {
        variables: variables
      });
    } catch (error) {
      throw new Error(`Failed to add secret variables to group ${variableGroupId}: ${error.message}`);
    }
  }

  /**
   * Updates a variable group
   *
   * @async
   * @param {number} variableGroupId - Variable group ID
   * @param {Object} data - Update data
   * @param {string} [data.name] - New name
   * @param {string} [data.description] - New description
   * @param {Object} [data.variables] - Variables to update
   * @returns {Promise<Object>} Updated variable group
   * @throws {Error} If update fails
   */
  async updateVariableGroup(variableGroupId, data = {}) {
    try {
      const updateData = {};

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.variables) {
        updateData.variables = {};
        for (const [key, value] of Object.entries(data.variables)) {
          updateData.variables[key] = {
            value: value,
            isSecret: false,
            enabled: true
          };
        }
      }

      return await this._request('PUT', `/_apis/distributedtask/variablegroups/${variableGroupId}`, updateData);
    } catch (error) {
      throw new Error(`Failed to update variable group ${variableGroupId}: ${error.message}`);
    }
  }

  /**
   * Gets a variable group by ID
   *
   * @async
   * @param {number} variableGroupId - Variable group ID
   * @returns {Promise<Object>} Variable group data
   * @throws {Error} If request fails
   */
  async getVariableGroup(variableGroupId) {
    try {
      return await this._request('GET', `/_apis/distributedtask/variablegroups/${variableGroupId}`);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`Variable group not found: ${variableGroupId}`);
      }
      throw new Error(`Failed to get variable group ${variableGroupId}: ${error.message}`);
    }
  }

  /**
   * Lists all variable groups in the project
   *
   * @async
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.groupName] - Filter by group name
   * @param {string} [filters.query] - Search query
   * @returns {Promise<Array<Object>>} Array of variable groups
   * @throws {Error} If request fails
   */
  async listVariableGroups(filters = {}) {
    try {
      let endpoint = `/_apis/distributedtask/variablegroups?project=${this.project}`;

      if (filters.groupName) {
        endpoint += `&groupName=${filters.groupName}`;
      }

      if (filters.query) {
        endpoint += `&query=${filters.query}`;
      }

      const result = await this._request('GET', endpoint);
      return result.value || [];
    } catch (error) {
      throw new Error(`Failed to list variable groups: ${error.message}`);
    }
  }

  /**
   * Creates a new variable group
   *
   * @async
   * @param {string} name - Variable group name
   * @param {Object} variables - Variables object {key: value}
   * @param {string} [description] - Variable group description
   * @returns {Promise<Object>} Created variable group
   * @throws {Error} If creation fails
   */
  async createVariableGroup(name, variables, description = '') {
    try {
      const variablesData = {};
      for (const [key, value] of Object.entries(variables)) {
        variablesData[key] = {
          value: value,
          isSecret: false,
          enabled: true
        };
      }

      return await this._request('POST', `/_apis/distributedtask/variablegroups`, {
        name: name,
        description: description,
        variables: variablesData,
        variableGroupProjectReferences: [
          {
            projectReference: {
              name: this.project
            }
          }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to create variable group: ${error.message}`);
    }
  }

  /**
   * Deletes a variable group
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to delete
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails
   */
  async deleteVariableGroup(variableGroupId) {
    try {
      await this._request('DELETE', `/_apis/distributedtask/variablegroups/${variableGroupId}?project=${this.project}`);
    } catch (error) {
      throw new Error(`Failed to delete variable group ${variableGroupId}: ${error.message}`);
    }
  }
}

module.exports = AzureDevOpsRestClient;
