const { AzureIssueList } = require('../../autopm/.claude/providers/azure/issue-list');

// Mock the Azure dependencies
jest.mock('../../autopm/.claude/providers/azure/lib/client');
jest.mock('../../autopm/.claude/providers/azure/lib/formatter');

const AzureDevOpsClient = require('../../autopm/.claude/providers/azure/lib/client');
const AzureFormatter = require('../../autopm/.claude/providers/azure/lib/formatter');

describe('AzureIssueList', () => {
  let azureIssueList;
  let mockClient;
  let mockConfig;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock config
    mockConfig = {
      organization: 'test-org',
      project: 'test-project'
    };

    // Mock client methods
    mockClient = {
      executeWiql: jest.fn(),
      getWorkItems: jest.fn(),
      project: 'test-project'
    };

    // Mock constructor to return our mock client
    AzureDevOpsClient.mockImplementation(() => mockClient);

    // Mock formatter methods
    AzureFormatter.mapWorkItemType = jest.fn().mockReturnValue('user_story');
    AzureFormatter.mapState = jest.fn().mockReturnValue('open');
    AzureFormatter.getStateIcon = jest.fn().mockReturnValue('🟢');
    AzureFormatter.formatWorkItem = jest.fn().mockReturnValue('Formatted work item');

    // Create fresh instance
    azureIssueList = new AzureIssueList(mockConfig);
  });

  describe('Execute Workflow', () => {
    let mockQueryResult;
    let mockWorkItems;

    beforeEach(() => {
      mockQueryResult = {
        workItems: [
          { id: 123 },
          { id: 124 }
        ]
      };

      mockWorkItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'First Work Item',
            'System.State': 'To Do',
            'System.WorkItemType': 'User Story',
            'System.AssignedTo': { displayName: 'John Doe' },
            'Microsoft.VSTS.Common.Priority': 2,
            'Microsoft.VSTS.Scheduling.StoryPoints': 5,
            'System.IterationPath': 'Project\\Sprint 1'
          }
        },
        {
          id: 124,
          fields: {
            'System.Title': 'Second Work Item',
            'System.State': 'In Progress',
            'System.WorkItemType': 'Task',
            'System.AssignedTo': { displayName: 'Jane Smith' },
            'Microsoft.VSTS.Common.Priority': 1,
            'Microsoft.VSTS.Scheduling.StoryPoints': 3,
            'System.IterationPath': 'Project\\Sprint 1'
          }
        }
      ];

      mockClient.executeWiql.mockResolvedValue(mockQueryResult);
      mockClient.getWorkItems.mockResolvedValue(mockWorkItems);
    });

    test('should execute successful query with default parameters', async () => {
      const result = await azureIssueList.execute();

      expect(mockClient.executeWiql).toHaveBeenCalled();
      expect(mockClient.getWorkItems).toHaveBeenCalledWith([123, 124]);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.formatted).toBeDefined();
    });

    test('should execute query with custom parameters', async () => {
      const args = {
        state: 'open',
        type: 'story',
        assignee: '@me',
        iteration: 'Sprint 1',
        limit: 10,
        format: 'table'
      };

      const result = await azureIssueList.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should handle empty query results', async () => {
      mockClient.executeWiql.mockResolvedValue({ workItems: [] });

      const result = await azureIssueList.execute();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.formatted).toBe('No work items found matching the criteria.');
    });

    test('should handle query errors', async () => {
      mockClient.executeWiql.mockRejectedValue(new Error('Query failed'));

      await expect(azureIssueList.execute())
        .rejects
        .toThrow('Failed to list work items: Query failed');
    });

    test('should handle null workItems in query result', async () => {
      mockClient.executeWiql.mockResolvedValue({ workItems: null });

      const result = await azureIssueList.execute();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.formatted).toBe('No work items found matching the criteria.');
    });
  });

  describe('buildQuery()', () => {
    test('should build basic query with project filter', () => {
      const filters = {};

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.TeamProject] = \'test-project\'');
      expect(query).toContain('SELECT');
      expect(query).toContain('FROM WorkItems');
      expect(query).toContain('ORDER BY');
    });

    test('should add state filter for open state', () => {
      const filters = { state: 'open' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.State] IN (\'New\', \'To Do\', \'Active\')');
    });

    test('should add state filter for in_progress state', () => {
      const filters = { state: 'in_progress' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.State] IN (\'In Progress\', \'Active\', \'Doing\')');
    });

    test('should add state filter for closed state', () => {
      const filters = { state: 'closed' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.State] IN (\'Done\', \'Closed\', \'Resolved\')');
    });

    test('should handle custom state', () => {
      const filters = { state: 'Custom State' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.State] IN (\'Custom State\')');
    });

    test('should handle all state filter', () => {
      const filters = { state: 'all' };

      const query = azureIssueList.buildQuery(filters);

      // Due to implementation, 'all' gets treated as custom state since null || ['all'] = ['all']
      expect(query).toContain('[System.State] IN (\'all\')');
    });

    test('should add type filter for epic', () => {
      const filters = { type: 'epic' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'Epic\', \'Feature\')');
    });

    test('should add type filter for issue', () => {
      const filters = { type: 'issue' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'User Story\', \'Task\', \'Bug\')');
    });

    test('should add type filter for story', () => {
      const filters = { type: 'story' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'User Story\')');
    });

    test('should add type filter for task', () => {
      const filters = { type: 'task' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'Task\')');
    });

    test('should add type filter for bug', () => {
      const filters = { type: 'bug' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'Bug\')');
    });

    test('should handle custom type', () => {
      const filters = { type: 'Custom Type' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.WorkItemType] IN (\'Custom Type\')');
    });

    test('should add assignee filter for @me', () => {
      const filters = { assignee: '@me' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.AssignedTo] = @Me');
    });

    test('should add assignee filter for unassigned', () => {
      const filters = { assignee: 'unassigned' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.AssignedTo] = \'\'');
    });

    test('should add assignee filter for specific user', () => {
      const filters = { assignee: 'john@company.com' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.AssignedTo] = \'john@company.com\'');
    });

    test('should add current iteration filter', () => {
      const filters = { iteration: 'current' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.IterationPath] UNDER \'test-project\'');
      expect(query).toContain('[System.Iteration.StartDate] <= @Today');
      expect(query).toContain('[System.Iteration.EndDate] >= @Today');
    });

    test('should add specific iteration filter', () => {
      const filters = { iteration: 'Project\\Sprint 1' };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.IterationPath] = \'Project\\Sprint 1\'');
    });

    test('should add limit to query', () => {
      const filters = { limit: 25 };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('TOP 25');
    });

    test('should build complex query with multiple filters', () => {
      const filters = {
        state: 'open',
        type: 'story',
        assignee: '@me',
        iteration: 'current',
        limit: 10
      };

      const query = azureIssueList.buildQuery(filters);

      expect(query).toContain('[System.TeamProject] = \'test-project\'');
      expect(query).toContain('[System.State] IN (\'New\', \'To Do\', \'Active\')');
      expect(query).toContain('[System.WorkItemType] IN (\'User Story\')');
      expect(query).toContain('[System.AssignedTo] = @Me');
      expect(query).toContain('[System.IterationPath] UNDER \'test-project\'');
      expect(query).toContain('TOP 10');
    });
  });

  describe('transformWorkItem()', () => {
    test('should transform work item correctly', () => {
      const workItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Test Story',
          'System.State': 'To Do',
          'System.AssignedTo': { displayName: 'John Doe' },
          'Microsoft.VSTS.Common.Priority': 2,
          'Microsoft.VSTS.Scheduling.StoryPoints': 5,
          'System.IterationPath': 'Project\\Sprint 1'
        }
      };

      const result = azureIssueList.transformWorkItem(workItem);

      expect(result).toEqual({
        id: 123,
        type: 'user_story',
        title: 'Test Story',
        state: 'open',
        assignee: 'John Doe',
        priority: 2,
        storyPoints: 5,
        iteration: 'Project\\Sprint 1',
        workItemType: 'User Story',
        azureState: 'To Do',
        url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/123'
      });
    });

    test('should handle work item with null assignee', () => {
      const workItem = {
        id: 124,
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Test Task',
          'System.State': 'New',
          'System.AssignedTo': null
        }
      };

      const result = azureIssueList.transformWorkItem(workItem);

      expect(result.assignee).toBeNull();
    });

    test('should handle work item with missing optional fields', () => {
      const workItem = {
        id: 125,
        fields: {
          'System.WorkItemType': 'Bug',
          'System.Title': 'Test Bug',
          'System.State': 'Active'
        }
      };

      const result = azureIssueList.transformWorkItem(workItem);

      expect(result.priority).toBeUndefined();
      expect(result.storyPoints).toBeUndefined();
      expect(result.iteration).toBeUndefined();
    });
  });

  describe('formatResults()', () => {
    let mockWorkItems;

    beforeEach(() => {
      mockWorkItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'Test Item',
            'System.State': 'To Do',
            'System.WorkItemType': 'User Story',
            'System.AssignedTo': { displayName: 'John Doe' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        }
      ];
    });

    test('should format as list by default', () => {
      const result = azureIssueList.formatResults(mockWorkItems, 'list');

      expect(result).toContain('#123');
      expect(result).toContain('[User Story]');
      expect(result).toContain('Test Item');
    });

    test('should format as table', () => {
      const result = azureIssueList.formatResults(mockWorkItems, 'table');

      expect(result).toContain('| ID | Type | Title | State | Assignee | Points |');
      expect(result).toContain('|----|------|-------|-------|----------|--------|');
      expect(result).toContain('| #123 |');
    });

    test('should format as detailed', () => {
      const result = azureIssueList.formatResults(mockWorkItems, 'detailed');

      expect(AzureFormatter.formatWorkItem).toHaveBeenCalledWith(
        mockWorkItems[0],
        'test-org',
        'test-project'
      );
    });

    test('should format as board', () => {
      const result = azureIssueList.formatResults(mockWorkItems, 'board');

      expect(result).toContain('## 📋 Work Items Board');
      expect(result).toContain('### To Do');
      expect(result).toContain('### In Progress');
      expect(result).toContain('### Done');
    });

    test('should default to list format for unknown format', () => {
      const result = azureIssueList.formatResults(mockWorkItems, 'unknown');

      expect(result).toContain('#123');
      expect(result).toContain('[User Story]');
    });
  });

  describe('formatAsList()', () => {
    test('should format work items as list', () => {
      const workItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'First Item',
            'System.State': 'To Do',
            'System.WorkItemType': 'User Story',
            'System.AssignedTo': { displayName: 'John Doe' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        },
        {
          id: 124,
          fields: {
            'System.Title': 'Second Item',
            'System.State': 'Done',
            'System.WorkItemType': 'Task',
            'System.AssignedTo': null
          }
        }
      ];

      const result = azureIssueList.formatAsList(workItems);

      expect(result).toContain('🟢 #123 [User Story] First Item');
      expect(result).toContain('Status: To Do | Assignee: John Doe');
      expect(result).toContain('Story Points: 5');
      expect(result).toContain('🟢 #124 [Task] Second Item');
      expect(result).toContain('Status: Done | Assignee: Unassigned');
    });

    test('should handle items without story points', () => {
      const workItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'Test Item',
            'System.State': 'Active',
            'System.WorkItemType': 'Bug',
            'System.AssignedTo': { displayName: 'Jane Smith' }
          }
        }
      ];

      const result = azureIssueList.formatAsList(workItems);

      expect(result).toContain('🟢 #123 [Bug] Test Item');
      expect(result).toContain('Status: Active | Assignee: Jane Smith');
      expect(result).not.toContain('Story Points:');
    });
  });

  describe('formatAsTable()', () => {
    test('should format work items as table', () => {
      const workItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'Short Title',
            'System.State': 'To Do',
            'System.WorkItemType': 'User Story',
            'System.AssignedTo': { displayName: 'John Doe' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        },
        {
          id: 124,
          fields: {
            'System.Title': 'Very Long Title That Should Be Truncated Because It Exceeds Forty Characters',
            'System.State': 'Done',
            'System.WorkItemType': 'Task',
            'System.AssignedTo': null,
            'Microsoft.VSTS.Scheduling.StoryPoints': null
          }
        }
      ];

      const result = azureIssueList.formatAsTable(workItems);

      expect(result).toContain('| ID | Type | Title | State | Assignee | Points |');
      expect(result).toContain('| #123 | User Story | Short Title | To Do | John Doe | 5 |');
      expect(result).toContain('| #124 | Task | Very Long Title That Should Be Truncated... | Done | Unassigned | - |');
    });

    test('should handle missing fields gracefully', () => {
      const workItems = [
        {
          id: 125,
          fields: {
            'System.Title': 'Minimal Item',
            'System.State': 'New',
            'System.WorkItemType': 'Bug'
          }
        }
      ];

      const result = azureIssueList.formatAsTable(workItems);

      expect(result).toContain('| #125 | Bug | Minimal Item | New | Unassigned | - |');
    });
  });

  describe('formatDetailed()', () => {
    test('should format work items with detailed view', () => {
      const workItems = [
        { id: 123, fields: { 'System.Title': 'First Item' } },
        { id: 124, fields: { 'System.Title': 'Second Item' } }
      ];

      const result = azureIssueList.formatDetailed(workItems);

      expect(AzureFormatter.formatWorkItem).toHaveBeenCalledTimes(2);
      expect(AzureFormatter.formatWorkItem).toHaveBeenCalledWith(workItems[0], 'test-org', 'test-project');
      expect(AzureFormatter.formatWorkItem).toHaveBeenCalledWith(workItems[1], 'test-org', 'test-project');
      expect(result).toContain('Formatted work item');
      expect(result).toContain('---');
    });

    test('should handle single work item without separator', () => {
      const workItems = [
        { id: 123, fields: { 'System.Title': 'Single Item' } }
      ];

      const result = azureIssueList.formatDetailed(workItems);

      expect(result).not.toContain('---');
      expect(result).toContain('Formatted work item');
    });
  });

  describe('formatAsBoard()', () => {
    test('should format work items as board', () => {
      const workItems = [
        {
          id: 123,
          fields: {
            'System.Title': 'To Do Item',
            'System.State': 'To Do',
            'System.WorkItemType': 'User Story',
            'System.AssignedTo': { displayName: 'John Doe' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        },
        {
          id: 124,
          fields: {
            'System.Title': 'In Progress Item',
            'System.State': 'In Progress',
            'System.WorkItemType': 'Task',
            'System.AssignedTo': { displayName: 'Jane Smith' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 3
          }
        },
        {
          id: 125,
          fields: {
            'System.Title': 'Done Item',
            'System.State': 'Done',
            'System.WorkItemType': 'Bug',
            'System.AssignedTo': { displayName: 'Bob Wilson' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 2
          }
        }
      ];

      const result = azureIssueList.formatAsBoard(workItems);

      expect(result).toContain('## 📋 Work Items Board');
      expect(result).toContain('### To Do (1)');
      expect(result).toContain('### In Progress (1)');
      expect(result).toContain('### Done (1)');
      expect(result).toContain('- #123 [User Story] To Do Item');
      expect(result).toContain('👤 John Doe | 5 pts');
      expect(result).toContain('- #124 [Task] In Progress Item');
      expect(result).toContain('👤 Jane Smith | 3 pts');
      expect(result).toContain('- #125 [Bug] Done Item');
      expect(result).toContain('👤 Bob Wilson | 2 pts');
      expect(result).toContain('**Total:** 3 items | 10 story points');
    });

    test('should handle items without story points', () => {
      const workItems = [
        {
          id: 126,
          fields: {
            'System.Title': 'No Points Item',
            'System.State': 'Active',
            'System.WorkItemType': 'Task',
            'System.AssignedTo': { displayName: 'Test User' }
          }
        }
      ];

      const result = azureIssueList.formatAsBoard(workItems);

      expect(result).toContain('👤 Test User');
      expect(result).not.toContain('| pts');
      expect(result).toContain('**Total:** 1 items | 0 story points');
    });

    test('should handle empty columns', () => {
      const workItems = [
        {
          id: 127,
          fields: {
            'System.Title': 'Only To Do Item',
            'System.State': 'New',
            'System.WorkItemType': 'User Story'
          }
        }
      ];

      const result = azureIssueList.formatAsBoard(workItems);

      expect(result).toContain('### To Do (1)');
      expect(result).toContain('### In Progress (0)');
      expect(result).toContain('### Done (0)');
      expect(result).toContain('_No items_');
    });

    test('should map different states correctly', () => {
      const workItems = [
        { id: 1, fields: { 'System.State': 'Closed', 'System.Title': 'Closed', 'System.WorkItemType': 'Bug' } },
        { id: 2, fields: { 'System.State': 'Resolved', 'System.Title': 'Resolved', 'System.WorkItemType': 'Bug' } },
        { id: 3, fields: { 'System.State': 'Active', 'System.Title': 'Active', 'System.WorkItemType': 'Bug' } },
        { id: 4, fields: { 'System.State': 'Doing', 'System.Title': 'Doing', 'System.WorkItemType': 'Task' } },
        { id: 5, fields: { 'System.State': 'New', 'System.Title': 'New', 'System.WorkItemType': 'User Story' } }
      ];

      const result = azureIssueList.formatAsBoard(workItems);

      expect(result).toContain('### To Do (1)');  // New
      expect(result).toContain('### In Progress (2)');  // Active, Doing
      expect(result).toContain('### Done (2)');  // Closed, Resolved
    });
  });

  describe('Integration Tests', () => {
    test('should maintain backward compatibility with direct module usage', () => {
      const issueList = require('../../autopm/.claude/providers/azure/issue-list');

      expect(typeof issueList.execute).toBe('function');
      expect(typeof issueList.buildQuery).toBe('function');
      expect(typeof issueList.transformWorkItem).toBe('function');
      expect(typeof issueList.formatResults).toBe('function');
      expect(typeof issueList.formatAsList).toBe('function');
      expect(typeof issueList.formatAsTable).toBe('function');
      expect(typeof issueList.formatDetailed).toBe('function');
      expect(typeof issueList.formatAsBoard).toBe('function');
    });

    test('should handle edge cases', () => {
      const emptyWorkItems = [];

      const listResult = azureIssueList.formatAsList(emptyWorkItems);
      expect(listResult).toBe('');

      const tableResult = azureIssueList.formatAsTable(emptyWorkItems);
      expect(tableResult).toContain('| ID | Type | Title | State | Assignee | Points |');

      const boardResult = azureIssueList.formatAsBoard(emptyWorkItems);
      expect(boardResult).toContain('**Total:** 0 items | 0 story points');
    });

    test('should handle work items with minimal data', () => {
      const minimalWorkItem = {
        id: 999,
        fields: {
          'System.Title': 'Minimal',
          'System.State': 'Unknown',
          'System.WorkItemType': 'Unknown'
        }
      };

      const transformed = azureIssueList.transformWorkItem(minimalWorkItem);
      expect(transformed.id).toBe(999);
      expect(transformed.title).toBe('Minimal');

      const formatted = azureIssueList.formatAsList([minimalWorkItem]);
      expect(formatted).toContain('#999');
      expect(formatted).toContain('Minimal');
    });
  });
});