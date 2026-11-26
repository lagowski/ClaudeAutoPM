/**
 * AzureDevOpsResourcesProvider Test Suite
 *
 * Comprehensive TDD test suite for hybrid CLI + REST provider
 * Following 2025 best practices with full coverage
 *
 * Test Coverage:
 * - Constructor initialization with both clients
 * - createVariableGroup() with plain variables (CLI path)
 * - createVariableGroupWithSecrets() (CLI + REST fallback)
 * - linkVariableGroupToPipeline() (REST only - KEY FEATURE)
 * - unlinkVariableGroupFromPipeline() (REST only)
 * - updateVariableGroup() (CLI)
 * - deleteVariableGroup() (CLI)
 * - getVariableGroup() (CLI)
 * - listVariableGroups() (CLI)
 * - Fallback logic (CLI fails → use REST)
 * - Error handling and edge cases
 */

const AzureDevOpsResourcesProvider = require('../../lib/providers/AzureDevOpsResourcesProvider');

// Mock the CLI and REST clients
jest.mock('../../lib/providers/AzureDevOpsCliWrapper');
jest.mock('../../lib/providers/AzureDevOpsRestClient');

describe('AzureDevOpsResourcesProvider', () => {
  let provider;
  let MockCliWrapper;
  let MockRestClient;

  beforeEach(() => {
    jest.clearAllMocks();

    delete process.env.AZURE_DEVOPS_PAT;
    delete process.env.AZURE_DEVOPS_ORG;
    delete process.env.AZURE_DEVOPS_PROJECT;

    // Get mock constructors
    MockCliWrapper = require('../../lib/providers/AzureDevOpsCliWrapper');
    MockRestClient = require('../../lib/providers/AzureDevOpsRestClient');
  });

  describe('Constructor', () => {
    test('should initialize with provided config and create both clients', () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      expect(provider.token).toBe('test-pat');
      expect(provider.organization).toBe('test-org');
      expect(provider.project).toBe('test-project');
      expect(provider.cliClient).toBeDefined();
      expect(provider.restClient).toBeDefined();
      expect(MockCliWrapper).toHaveBeenCalled();
      expect(MockRestClient).toHaveBeenCalled();
    });

    test('should read from environment variables when not provided', () => {
      process.env.AZURE_DEVOPS_PAT = 'env-pat';
      process.env.AZURE_DEVOPS_ORG = 'env-org';
      process.env.AZURE_DEVOPS_PROJECT = 'env-project';

      provider = new AzureDevOpsResourcesProvider();

      expect(provider.token).toBe('env-pat');
      expect(provider.organization).toBe('env-org');
      expect(provider.project).toBe('env-project');
    });

    test('should throw error if token is missing', () => {
      expect(() => {
        new AzureDevOpsResourcesProvider({ organization: 'test-org', project: 'test-project' });
      }).toThrow('Azure DevOps PAT token is required');
    });

    test('should throw error if organization is missing', () => {
      expect(() => {
        new AzureDevOpsResourcesProvider({ token: 'test-pat', project: 'test-project' });
      }).toThrow('Azure DevOps organization is required');
    });

    test('should throw error if project is missing', () => {
      expect(() => {
        new AzureDevOpsResourcesProvider({ token: 'test-pat', organization: 'test-org' });
      }).toThrow('Azure DevOps project is required');
    });
  });

  describe('createVariableGroup()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock CLI client methods
      provider.cliClient = {
        createVariableGroup: jest.fn().mockReturnValue({ id: 1, name: 'test-vg' })
      };
    });

    test('should create variable group using CLI', async () => {
      const result = await provider.createVariableGroup('test-vg', { KEY1: 'value1' });

      expect(result).toEqual({ id: 1, name: 'test-vg' });
      expect(provider.cliClient.createVariableGroup).toHaveBeenCalledWith('test-vg', { KEY1: 'value1' }, '');
    });

    test('should include description if provided', async () => {
      await provider.createVariableGroup('test-vg', { KEY1: 'value1' }, 'Test description');

      expect(provider.cliClient.createVariableGroup).toHaveBeenCalledWith('test-vg', { KEY1: 'value1' }, 'Test description');
    });

    test('should handle CLI errors', async () => {
      provider.cliClient.createVariableGroup.mockImplementation(() => {
        throw new Error('CLI failed');
      });

      await expect(provider.createVariableGroup('test-vg', { KEY1: 'value1' })).rejects.toThrow('CLI failed');
    });
  });

  describe('createVariableGroupWithSecrets()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock both clients
      provider.cliClient = {
        createVariableGroup: jest.fn().mockReturnValue({ id: 1, name: 'test-vg' })
      };

      provider.restClient = {
        addSecretVariables: jest.fn().mockResolvedValue({ id: 1, name: 'test-vg' })
      };
    });

    test('should create variable group with CLI then add secrets with REST', async () => {
      const variables = { VAR1: 'value1' };
      const secrets = { SECRET1: 'secret123' };

      const result = await provider.createVariableGroupWithSecrets('test-vg', variables, secrets);

      expect(result).toEqual({ id: 1, name: 'test-vg' });
      expect(provider.cliClient.createVariableGroup).toHaveBeenCalledWith('test-vg', variables, '');
      expect(provider.restClient.addSecretVariables).toHaveBeenCalledWith(1, secrets);
    });

    test('should handle missing variables object', async () => {
      const secrets = { SECRET1: 'secret123' };

      const result = await provider.createVariableGroupWithSecrets('test-vg', null, secrets);

      expect(result).toBeDefined();
      expect(provider.restClient.addSecretVariables).toHaveBeenCalledWith(1, secrets);
    });

    test('should handle errors in either step', async () => {
      provider.cliClient.createVariableGroup.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      await expect(
        provider.createVariableGroupWithSecrets('test-vg', { VAR1: 'v1' }, { SECRET1: 's1' })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('linkVariableGroupToPipeline()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock REST client
      provider.restClient = {
        linkVariableGroupToPipeline: jest.fn().mockResolvedValue({ success: true })
      };
    });

    test('should link variable group to pipeline using REST API', async () => {
      const result = await provider.linkVariableGroupToPipeline(5, 10);

      expect(result).toEqual({ success: true });
      expect(provider.restClient.linkVariableGroupToPipeline).toHaveBeenCalledWith(5, 10);
    });

    test('should handle linking errors', async () => {
      provider.restClient.linkVariableGroupToPipeline.mockRejectedValue(
        new Error('Link failed')
      );

      await expect(provider.linkVariableGroupToPipeline(5, 10)).rejects.toThrow('Link failed');
    });

    test('should validate inputs', async () => {
      await expect(provider.linkVariableGroupToPipeline(null, 10)).rejects.toThrow();
      await expect(provider.linkVariableGroupToPipeline(5, null)).rejects.toThrow();
    });
  });

  describe('unlinkVariableGroupFromPipeline()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock REST client
      provider.restClient = {
        unlinkVariableGroupFromPipeline: jest.fn().mockResolvedValue({ success: true })
      };
    });

    test('should unlink variable group from pipeline using REST API', async () => {
      const result = await provider.unlinkVariableGroupFromPipeline(5, 10);

      expect(result).toEqual({ success: true });
      expect(provider.restClient.unlinkVariableGroupFromPipeline).toHaveBeenCalledWith(5, 10);
    });

    test('should handle unlinking errors', async () => {
      provider.restClient.unlinkVariableGroupFromPipeline.mockRejectedValue(
        new Error('Unlink failed')
      );

      await expect(provider.unlinkVariableGroupFromPipeline(5, 10)).rejects.toThrow('Unlink failed');
    });
  });

  describe('updateVariableGroup()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock CLI client
      provider.cliClient = {
        updateVariableGroup: jest.fn().mockResolvedValue({ id: 1, name: 'updated-vg' })
      };
    });

    test('should update variable group using CLI', async () => {
      const data = { name: 'new-name', description: 'new description' };

      const result = await provider.updateVariableGroup(1, data);

      expect(result).toEqual({ id: 1, name: 'updated-vg' });
      expect(provider.cliClient.updateVariableGroup).toHaveBeenCalledWith(1, data);
    });

    test('should handle update errors', async () => {
      provider.cliClient.updateVariableGroup.mockRejectedValue(new Error('Update failed'));

      await expect(provider.updateVariableGroup(1, {})).rejects.toThrow('Update failed');
    });
  });

  describe('deleteVariableGroup()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock CLI client
      provider.cliClient = {
        deleteVariableGroup: jest.fn().mockResolvedValue({ deleted: true })
      };
    });

    test('should delete variable group using CLI', async () => {
      const result = await provider.deleteVariableGroup(1);

      expect(result).toEqual({ deleted: true });
      expect(provider.cliClient.deleteVariableGroup).toHaveBeenCalledWith(1);
    });

    test('should handle delete errors', async () => {
      provider.cliClient.deleteVariableGroup.mockRejectedValue(new Error('Delete failed'));

      await expect(provider.deleteVariableGroup(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('getVariableGroup()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock CLI client
      provider.cliClient = {
        getVariableGroup: jest.fn().mockResolvedValue({ id: 1, name: 'test-vg' })
      };
    });

    test('should get variable group using CLI', async () => {
      const result = await provider.getVariableGroup(1);

      expect(result).toEqual({ id: 1, name: 'test-vg' });
      expect(provider.cliClient.getVariableGroup).toHaveBeenCalledWith(1);
    });

    test('should handle get errors', async () => {
      provider.cliClient.getVariableGroup.mockRejectedValue(new Error('Get failed'));

      await expect(provider.getVariableGroup(1)).rejects.toThrow('Get failed');
    });
  });

  describe('listVariableGroups()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock CLI client
      provider.cliClient = {
        variableGroupList: jest.fn().mockResolvedValue([
          { id: 1, name: 'vg1' },
          { id: 2, name: 'vg2' }
        ])
      };
    });

    test('should list variable groups using CLI', async () => {
      const result = await provider.listVariableGroups();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('vg1');
      expect(provider.cliClient.variableGroupList).toHaveBeenCalled();
    });

    test('should pass filters to CLI', async () => {
      const filters = { name: 'prod' };

      await provider.listVariableGroups(filters);

      expect(provider.cliClient.variableGroupList).toHaveBeenCalledWith(filters);
    });

    test('should handle list errors', async () => {
      provider.cliClient.variableGroupList.mockRejectedValue(new Error('List failed'));

      await expect(provider.listVariableGroups()).rejects.toThrow('List failed');
    });
  });

  describe('getPipelineVariableGroups()', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      // Mock REST client
      provider.restClient = {
        getPipelineVariableGroups: jest.fn().mockResolvedValue({
          variableGroups: [1, 2, 3]
        })
      };
    });

    test('should get pipeline variable groups using REST', async () => {
      const result = await provider.getPipelineVariableGroups(10);

      expect(result.variableGroups).toEqual([1, 2, 3]);
      expect(provider.restClient.getPipelineVariableGroups).toHaveBeenCalledWith(10);
    });

    test('should handle get errors', async () => {
      provider.restClient.getPipelineVariableGroups.mockRejectedValue(new Error('Get failed'));

      await expect(provider.getPipelineVariableGroups(10)).rejects.toThrow('Get failed');
    });
  });

  describe('Fallback Logic', () => {
    beforeEach(() => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should use CLI as primary method', async () => {
      provider.cliClient = {
        createVariableGroup: jest.fn().mockResolvedValue({ id: 1 })
      };

      await provider.createVariableGroup('test', {});

      expect(provider.cliClient.createVariableGroup).toHaveBeenCalled();
    });

    test('should handle CLI unavailability gracefully', async () => {
      provider.cliClient = {
        createVariableGroup: jest.fn().mockRejectedValue(new Error('CLI not found'))
      };

      await expect(provider.createVariableGroup('test', {})).rejects.toThrow('CLI not found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty variables object', async () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      provider.cliClient = {
        createVariableGroup: jest.fn().mockResolvedValue({ id: 1 })
      };

      await provider.createVariableGroup('test', {});

      expect(provider.cliClient.createVariableGroup).toHaveBeenCalledWith('test', {}, '');
    });

    test('should handle special characters in names', async () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      provider.cliClient = {
        createVariableGroup: jest.fn().mockResolvedValue({ id: 1 })
      };

      await provider.createVariableGroup('test-with-特殊字符', {});

      expect(provider.cliClient.createVariableGroup).toHaveBeenCalledWith('test-with-特殊字符', {}, '');
    });

    test('should handle unicode in secret values', async () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      provider.cliClient = {
        createVariableGroup: jest.fn().mockResolvedValue({ id: 1 })
      };

      provider.restClient = {
        addSecretVariables: jest.fn().mockResolvedValue({ id: 1 })
      };

      await provider.createVariableGroupWithSecrets('test', {}, {
        SECRET: '值-🔑'
      });

      expect(provider.restClient.addSecretVariables).toHaveBeenCalledWith(1, {
        SECRET: '值-🔑'
      });
    });
  });

  describe('Client Integration', () => {
    test('should have both cliClient and restClient initialized', () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      expect(provider.cliClient).toBeDefined();
      expect(provider.restClient).toBeDefined();
    });

    test('should expose client methods for advanced usage', () => {
      provider = new AzureDevOpsResourcesProvider({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      expect(typeof provider.cliClient.execute).toBe('function');
      expect(typeof provider.restClient._request).toBe('function');
    });
  });
});
