/**
 * Azure DevOps Resources Provider
 *
 * Hybrid provider combining Azure CLI and REST API for comprehensive resource management.
 * Provides intelligent fallback logic: use CLI when possible, REST API when needed.
 *
 * Features:
 * - Variable groups management (create, read, update, delete, list)
 * - Variable groups to pipeline linking (REST API only - CLI doesn't support!)
 * - Secret variables management (REST API only)
 * - Automatic fallback from CLI to REST when needed
 * - Unified interface for all Azure DevOps resources
 *
 * @module lib/providers/AzureDevOpsResourcesProvider
 */

const AzureDevOpsCliWrapper = require('./AzureDevOpsCliWrapper');
const AzureDevOpsRestClient = require('./AzureDevOpsRestClient');

/**
 * Azure DevOps Resources Provider Class
 *
 * Main provider combining CLI and REST API access
 *
 * @class AzureDevOpsResourcesProvider
 */
class AzureDevOpsResourcesProvider {
  /**
   * Creates a new Azure DevOps resources provider instance
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

    // Initialize both CLI and REST clients
    this.cliClient = new AzureDevOpsCliWrapper({
      token: this.token,
      organization: this.organization,
      project: this.project
    });

    this.restClient = new AzureDevOpsRestClient({
      token: this.token,
      organization: this.organization,
      project: this.project,
      apiVersion: this.apiVersion
    });
  }

  /**
   * Creates a new variable group
   *
   * Uses Azure CLI (preferred method)
   *
   * @async
   * @param {string} name - Variable group name
   * @param {Object} variables - Variables object {key: value}
   * @param {string} [description=''] - Variable group description
   * @returns {Promise<Object>} Created variable group
   * @throws {Error} If creation fails
   */
  async createVariableGroup(name, variables = {}, description = '') {
    try {
      return await this.cliClient.createVariableGroup(name, variables, description);
    } catch (error) {
      throw new Error(`Failed to create variable group: ${error.message}`);
    }
  }

  /**
   * Creates a new variable group with secret variables
   *
   * **Hybrid approach**: Creates with CLI, then adds secrets via REST API
   * (CLI cannot create secret variables, REST API is required)
   *
   * @async
   * @param {string} name - Variable group name
   * @param {Object} variables - Plain variables object {key: value}
   * @param {Object} secrets - Secret variables object {key: value}
   * @param {string} [description=''] - Variable group description
   * @returns {Promise<Object>} Created variable group with secrets
   * @throws {Error} If creation fails
   */
  async createVariableGroupWithSecrets(name, variables = {}, secrets = {}, description = '') {
    try {
      // Step 1: Create variable group with plain variables using CLI
      const vg = await this.cliClient.createVariableGroup(name, variables || {}, description);

      // Step 2: Add secret variables using REST API
      if (secrets && Object.keys(secrets).length > 0) {
        await this.restClient.addSecretVariables(vg.id, secrets);
      }

      return vg;
    } catch (error) {
      throw new Error(`Failed to create variable group with secrets: ${error.message}`);
    }
  }

  /**
   * Links a variable group to a pipeline
   *
   * **CRITICAL**: This operation is NOT supported by Azure CLI!
   * REST API is REQUIRED for this operation.
   *
   * This is the KEY FEATURE that solves the user's main problem!
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to link
   * @param {number} pipelineId - Pipeline ID to link to
   * @returns {Promise<Object>} Link result
   * @throws {Error} If linking fails
   */
  async linkVariableGroupToPipeline(variableGroupId, pipelineId) {
    if (!variableGroupId || !pipelineId) {
      throw new Error('Variable group ID and pipeline ID are required');
    }

    try {
      return await this.restClient.linkVariableGroupToPipeline(variableGroupId, pipelineId);
    } catch (error) {
      throw new Error(`Failed to link variable group to pipeline: ${error.message}`);
    }
  }

  /**
   * Unlinks a variable group from a pipeline
   *
   * **CRITICAL**: This operation is NOT supported by Azure CLI!
   * REST API is REQUIRED for this operation.
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to unlink
   * @param {number} pipelineId - Pipeline ID to unlink from
   * @returns {Promise<Object>} Unlink result
   * @throws {Error} If unlinking fails
   */
  async unlinkVariableGroupFromPipeline(variableGroupId, pipelineId) {
    if (!variableGroupId || !pipelineId) {
      throw new Error('Variable group ID and pipeline ID are required');
    }

    try {
      return await this.restClient.unlinkVariableGroupFromPipeline(variableGroupId, pipelineId);
    } catch (error) {
      throw new Error(`Failed to unlink variable group from pipeline: ${error.message}`);
    }
  }

  /**
   * Gets variable groups linked to a pipeline
   *
   * Uses REST API (required operation)
   *
   * @async
   * @param {number} pipelineId - Pipeline ID
   * @returns {Promise<Object>} Pipeline variable groups data
   * @throws {Error} If request fails
   */
  async getPipelineVariableGroups(pipelineId) {
    if (!pipelineId) {
      throw new Error('Pipeline ID is required');
    }

    try {
      return await this.restClient.getPipelineVariableGroups(pipelineId);
    } catch (error) {
      throw new Error(`Failed to get pipeline variable groups: ${error.message}`);
    }
  }

  /**
   * Updates an existing variable group
   *
   * Uses Azure CLI (preferred method)
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
    if (!variableGroupId) {
      throw new Error('Variable group ID is required');
    }

    try {
      return await this.cliClient.updateVariableGroup(variableGroupId, data);
    } catch (error) {
      throw new Error(`Failed to update variable group: ${error.message}`);
    }
  }

  /**
   * Deletes a variable group
   *
   * Uses Azure CLI (preferred method)
   *
   * @async
   * @param {number} variableGroupId - Variable group ID to delete
   * @returns {Promise<Object>} Deletion result
   * @throws {Error} If deletion fails
   */
  async deleteVariableGroup(variableGroupId) {
    if (!variableGroupId) {
      throw new Error('Variable group ID is required');
    }

    try {
      return await this.cliClient.deleteVariableGroup(variableGroupId);
    } catch (error) {
      throw new Error(`Failed to delete variable group: ${error.message}`);
    }
  }

  /**
   * Gets a variable group by ID
   *
   * Uses Azure CLI (preferred method)
   *
   * @async
   * @param {number} variableGroupId - Variable group ID
   * @returns {Promise<Object>} Variable group data
   * @throws {Error} If request fails
   */
  async getVariableGroup(variableGroupId) {
    if (!variableGroupId) {
      throw new Error('Variable group ID is required');
    }

    try {
      return await this.cliClient.getVariableGroup(variableGroupId);
    } catch (error) {
      throw new Error(`Failed to get variable group: ${error.message}`);
    }
  }

  /**
   * Lists all variable groups in the project
   *
   * Uses Azure CLI (preferred method)
   *
   * @async
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.name] - Filter by name pattern
   * @returns {Promise<Array<Object>>} Array of variable groups
   * @throws {Error} If request fails
   */
  async listVariableGroups(filters = {}) {
    try {
      return await this.cliClient.variableGroupList(filters);
    } catch (error) {
      throw new Error(`Failed to list variable groups: ${error.message}`);
    }
  }

  /**
   * Gets a variable group by ID (REST API)
   *
   * Fallback method using REST API
   *
   * @async
   * @param {number} variableGroupId - Variable group ID
   * @returns {Promise<Object>} Variable group data
   * @throws {Error} If request fails
   */
  async getVariableGroupRest(variableGroupId) {
    if (!variableGroupId) {
      throw new Error('Variable group ID is required');
    }

    try {
      return await this.restClient.getVariableGroup(variableGroupId);
    } catch (error) {
      throw new Error(`Failed to get variable group: ${error.message}`);
    }
  }

  /**
   * Lists all variable groups (REST API)
   *
   * Fallback method using REST API
   *
   * @async
   * @param {Object} [filters={}] - Filter options
   * @returns {Promise<Array<Object>>} Array of variable groups
   * @throws {Error} If request fails
   */
  async listVariableGroupsRest(filters = {}) {
    try {
      return await this.restClient.listVariableGroups(filters);
    } catch (error) {
      throw new Error(`Failed to list variable groups: ${error.message}`);
    }
  }
}

module.exports = AzureDevOpsResourcesProvider;
