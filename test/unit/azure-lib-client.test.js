// Mock azure-devops-node-api before importing
jest.mock('azure-devops-node-api', () => ({
  getPersonalAccessTokenHandler: jest.fn(),
  WebApi: jest.fn()
}));

const AzureDevOpsClient = require('../../autopm/.claude/providers/azure/lib/client.js');
const azdev = require('azure-devops-node-api');

describe('AzureDevOpsClient', () => {
  let mockConnection;
  let mockWitApi;
  let mockCoreApi;
  let mockWorkApi;
  let config;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env.AZURE_DEVOPS_TOKEN = 'test-token';

    config = {
      organization: 'test-org',
      project: 'test-project',
      team: 'test-team'
    };

    // Mock APIs
    mockWitApi = {
      queryByWiql: jest.fn(),
      getWorkItem: jest.fn(),
      getWorkItems: jest.fn(),
      updateWorkItem: jest.fn(),
      createWorkItem: jest.fn(),
      addComment: jest.fn()
    };

    mockCoreApi = {
      getProjects: jest.fn(),
      getTeams: jest.fn()
    };

    mockWorkApi = {
      getTeamIterations: jest.fn(),
      getCapacitiesWithIdentityRefAndTotals: jest.fn()
    };

    // Mock connection
    mockConnection = {
      getWorkItemTrackingApi: jest.fn().mockResolvedValue(mockWitApi),
      getCoreApi: jest.fn().mockResolvedValue(mockCoreApi),
      getWorkApi: jest.fn().mockResolvedValue(mockWorkApi)
    };

    // Mock azdev methods
    azdev.getPersonalAccessTokenHandler.mockReturnValue('mock-auth-handler');
    azdev.WebApi.mockImplementation(() => mockConnection);
  });

  afterEach(() => {
    delete process.env.AZURE_DEVOPS_TOKEN;
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      const client = new AzureDevOpsClient(config);

      expect(client.organization).toBe('test-org');
      expect(client.project).toBe('test-project');
      expect(client.team).toBe('test-team');
      expect(client.token).toBe('test-token');
      expect(azdev.getPersonalAccessTokenHandler).toHaveBeenCalledWith('test-token');
      expect(azdev.WebApi).toHaveBeenCalledWith(
        'https://dev.azure.com/test-org',
        'mock-auth-handler'
      );
    });

    it('should use default team name when not provided', () => {
      const configWithoutTeam = {
        organization: 'test-org',
        project: 'test-project'
      };

      const client = new AzureDevOpsClient(configWithoutTeam);

      expect(client.team).toBe('test-project Team');
    });

    it('should throw error when AZURE_DEVOPS_TOKEN is missing', () => {
      delete process.env.AZURE_DEVOPS_TOKEN;

      expect(() => new AzureDevOpsClient(config)).toThrow(
        'AZURE_DEVOPS_TOKEN environment variable is required'
      );
    });

    it('should throw error when organization is missing', () => {
      const invalidConfig = { project: 'test-project' };

      expect(() => new AzureDevOpsClient(invalidConfig)).toThrow(
        'Azure DevOps organization and project are required in config'
      );
    });

    it('should throw error when project is missing', () => {
      const invalidConfig = { organization: 'test-org' };

      expect(() => new AzureDevOpsClient(invalidConfig)).toThrow(
        'Azure DevOps organization and project are required in config'
      );
    });
  });

  describe('API Methods', () => {
    let client;

    beforeEach(() => {
      client = new AzureDevOpsClient(config);
    });

    it('should get WorkItemTrackingApi', async () => {
      const api = await client.getWorkItemTrackingApi();

      expect(api).toBe(mockWitApi);
      expect(mockConnection.getWorkItemTrackingApi).toHaveBeenCalled();
    });

    it('should get CoreApi', async () => {
      const api = await client.getCoreApi();

      expect(api).toBe(mockCoreApi);
      expect(mockConnection.getCoreApi).toHaveBeenCalled();
    });

    it('should get WorkApi', async () => {
      const api = await client.getWorkApi();

      expect(api).toBe(mockWorkApi);
      expect(mockConnection.getWorkApi).toHaveBeenCalled();
    });
  });

  describe('WIQL Operations', () => {
    let client;

    beforeEach(() => {
      client = new AzureDevOpsClient(config);
    });

    it('should execute WIQL query', async () => {
      const mockResult = { workItems: [{ id: 123 }] };
      mockWitApi.queryByWiql.mockResolvedValue(mockResult);

      const query = "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'";
      const result = await client.executeWiql(query);

      expect(result).toBe(mockResult);
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        { query },
        { project: 'test-project' }
      );
    });

    it('should get iteration work items', async () => {
      const mockResult = { workItems: [{ id: 456 }] };
      mockWitApi.queryByWiql.mockResolvedValue(mockResult);

      const result = await client.getIterationWorkItems('Sprint 1');

      expect(result).toBe(mockResult);
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("AND [System.IterationPath] = 'Sprint 1'")
        }),
        { project: 'test-project' }
      );
    });

    it('should get work items by type', async () => {
      const mockResult = { workItems: [{ id: 789 }] };
      mockWitApi.queryByWiql.mockResolvedValue(mockResult);

      const result = await client.getWorkItemsByType('User Story');

      expect(result).toBe(mockResult);
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("AND [System.WorkItemType] = 'User Story'")
        }),
        { project: 'test-project' }
      );
    });

    it('should get work items by type and state', async () => {
      const mockResult = { workItems: [{ id: 101 }] };
      mockWitApi.queryByWiql.mockResolvedValue(mockResult);

      const result = await client.getWorkItemsByType('Bug', 'Active');

      expect(result).toBe(mockResult);
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("AND [System.WorkItemType] = 'Bug'")
        }),
        { project: 'test-project' }
      );
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("AND [System.State] = 'Active'")
        }),
        { project: 'test-project' }
      );
    });

    it('should get child work items', async () => {
      const mockResult = { workItemRelations: [{ target: { id: 202 } }] };
      mockWitApi.queryByWiql.mockResolvedValue(mockResult);

      const result = await client.getChildWorkItems(123);

      expect(result).toBe(mockResult);
      expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('[Source].[System.Id] = 123')
        }),
        { project: 'test-project' }
      );
    });
  });

  describe('Work Item Operations', () => {
    let client;

    beforeEach(() => {
      client = new AzureDevOpsClient(config);
    });

    it('should get single work item', async () => {
      const mockWorkItem = { id: 123, fields: { 'System.Title': 'Test Item' } };
      mockWitApi.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await client.getWorkItem('123');

      expect(result).toBe(mockWorkItem);
      expect(mockWitApi.getWorkItem).toHaveBeenCalledWith(
        123,
        null,
        null,
        'All'
      );
    });

    it('should get single work item with custom expand', async () => {
      const mockWorkItem = { id: 456, fields: {} };
      mockWitApi.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await client.getWorkItem('456', 'Relations');

      expect(result).toBe(mockWorkItem);
      expect(mockWitApi.getWorkItem).toHaveBeenCalledWith(
        456,
        null,
        null,
        'Relations'
      );
    });

    it('should get multiple work items', async () => {
      const mockWorkItems = [
        { id: 123, fields: {} },
        { id: 456, fields: {} }
      ];
      mockWitApi.getWorkItems.mockResolvedValue(mockWorkItems);

      const result = await client.getWorkItems(['123', '456']);

      expect(result).toBe(mockWorkItems);
      expect(mockWitApi.getWorkItems).toHaveBeenCalledWith(
        [123, 456],
        null,
        null,
        'All'
      );
    });

    it('should get multiple work items with custom expand', async () => {
      const mockWorkItems = [{ id: 789, fields: {} }];
      mockWitApi.getWorkItems.mockResolvedValue(mockWorkItems);

      const result = await client.getWorkItems([789], 'None');

      expect(result).toBe(mockWorkItems);
      expect(mockWitApi.getWorkItems).toHaveBeenCalledWith(
        [789],
        null,
        null,
        'None'
      );
    });

    it('should update work item', async () => {
      const mockUpdatedItem = { id: 123, fields: { 'System.State': 'Done' } };
      mockWitApi.updateWorkItem.mockResolvedValue(mockUpdatedItem);

      const updates = {
        'System.State': 'Done',
        'System.AssignedTo': 'user@example.com'
      };

      const result = await client.updateWorkItem('123', updates);

      expect(result).toBe(mockUpdatedItem);
      expect(mockWitApi.updateWorkItem).toHaveBeenCalledWith(
        null,
        [
          { op: 'add', path: '/fields/System.State', value: 'Done' },
          { op: 'add', path: '/fields/System.AssignedTo', value: 'user@example.com' }
        ],
        123,
        'test-project'
      );
    });

    it('should create work item', async () => {
      const mockNewItem = { id: 999, fields: { 'System.Title': 'New Item' } };
      mockWitApi.createWorkItem.mockResolvedValue(mockNewItem);

      const fields = {
        'System.Title': 'New Item',
        'System.Description': 'New item description'
      };

      const result = await client.createWorkItem('User Story', fields);

      expect(result).toBe(mockNewItem);
      expect(mockWitApi.createWorkItem).toHaveBeenCalledWith(
        null,
        [
          { op: 'add', path: '/fields/System.Title', value: 'New Item' },
          { op: 'add', path: '/fields/System.Description', value: 'New item description' }
        ],
        'test-project',
        'User Story'
      );
    });

    it('should add comment to work item', async () => {
      const mockComment = { id: 1, text: 'Test comment' };
      mockWitApi.addComment.mockResolvedValue(mockComment);

      const result = await client.addComment('123', 'Test comment');

      expect(result).toBe(mockComment);
      expect(mockWitApi.addComment).toHaveBeenCalledWith(
        { text: 'Test comment' },
        'test-project',
        123
      );
    });
  });

  describe('Team Operations', () => {
    let client;

    beforeEach(() => {
      client = new AzureDevOpsClient(config);
    });

    it('should get current iteration', async () => {
      const mockIteration = { id: 'iter1', name: 'Sprint 1' };
      mockWorkApi.getTeamIterations.mockResolvedValue([mockIteration]);

      const result = await client.getCurrentIteration();

      expect(result).toBe(mockIteration);
      expect(mockWorkApi.getTeamIterations).toHaveBeenCalledWith(
        { project: 'test-project', team: 'test-team' },
        'current'
      );
    });

    it('should return null when no current iteration', async () => {
      mockWorkApi.getTeamIterations.mockResolvedValue([]);

      const result = await client.getCurrentIteration();

      expect(result).toBe(null);
    });

    it('should get team capacity', async () => {
      const mockIteration = { id: 'iter1', name: 'Sprint 1' };
      const mockCapacity = [{ teamMember: { displayName: 'User 1' }, activities: [] }];

      mockWorkApi.getTeamIterations.mockResolvedValue([mockIteration]);
      mockWorkApi.getCapacitiesWithIdentityRefAndTotals.mockResolvedValue(mockCapacity);

      const result = await client.getTeamCapacity();

      expect(result).toBe(mockCapacity);
      expect(mockWorkApi.getCapacitiesWithIdentityRefAndTotals).toHaveBeenCalledWith(
        { project: 'test-project', team: 'test-team' },
        'iter1'
      );
    });

    it('should return null capacity when no current iteration', async () => {
      mockWorkApi.getTeamIterations.mockResolvedValue([]);

      const result = await client.getTeamCapacity();

      expect(result).toBe(null);
    });
  });

  describe('Error Handling', () => {
    let client;

    beforeEach(() => {
      client = new AzureDevOpsClient(config);
    });

    it('should handle API connection errors', async () => {
      mockConnection.getWorkItemTrackingApi.mockRejectedValue(new Error('Connection failed'));

      await expect(client.getWorkItem('123')).rejects.toThrow('Connection failed');
    });

    it('should handle work item not found errors', async () => {
      mockWitApi.getWorkItem.mockRejectedValue(new Error('Work item does not exist'));

      await expect(client.getWorkItem('999')).rejects.toThrow('Work item does not exist');
    });

    it('should handle update operation errors', async () => {
      mockWitApi.updateWorkItem.mockRejectedValue(new Error('Update failed'));

      await expect(client.updateWorkItem('123', { 'System.State': 'Done' }))
        .rejects.toThrow('Update failed');
    });

    it('should handle WIQL query errors', async () => {
      mockWitApi.queryByWiql.mockRejectedValue(new Error('Invalid query'));

      await expect(client.executeWiql('INVALID QUERY'))
        .rejects.toThrow('Invalid query');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      // Test that the module exports the class directly
      expect(typeof AzureDevOpsClient).toBe('function');
      expect(AzureDevOpsClient.name).toBe('AzureDevOpsClient');
    });

    it('should handle string and number IDs consistently', async () => {
      const client = new AzureDevOpsClient(config);
      const mockWorkItem = { id: 123, fields: {} };
      mockWitApi.getWorkItem.mockResolvedValue(mockWorkItem);

      // Test both string and number IDs
      await client.getWorkItem('123');
      await client.getWorkItem(123);

      expect(mockWitApi.getWorkItem).toHaveBeenCalledTimes(2);
      expect(mockWitApi.getWorkItem).toHaveBeenNthCalledWith(1, 123, null, null, 'All');
      expect(mockWitApi.getWorkItem).toHaveBeenNthCalledWith(2, 123, null, null, 'All');
    });

    it('should handle edge cases in work item operations', async () => {
      const client = new AzureDevOpsClient(config);

      // Test empty updates
      const mockResult = { id: 123 };
      mockWitApi.updateWorkItem.mockResolvedValue(mockResult);

      const result = await client.updateWorkItem('123', {});

      expect(result).toBe(mockResult);
      expect(mockWitApi.updateWorkItem).toHaveBeenCalledWith(
        null,
        [],
        123,
        'test-project'
      );
    });
  });
});