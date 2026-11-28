// Mock the Azure client and formatter before importing
jest.mock('../../autopm/.claude/providers/azure/lib/client');
jest.mock('../../autopm/.claude/providers/azure/lib/formatter');

const {
  AzureEpicShow,
  execute,
  formatEpicDetails
} = require('../../autopm/.claude/providers/azure/epic-show.js');

const AzureDevOpsClient = require('../../autopm/.claude/providers/azure/lib/client');
const AzureFormatter = require('../../autopm/.claude/providers/azure/lib/formatter');

describe('AzureEpicShow', () => {
  let mockClient;
  let mockFormatter;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock client methods
    mockClient = {
      getWorkItem: jest.fn(),
      getWorkItems: jest.fn(),
      organization: 'test-org',
      project: 'test-project'
    };
    AzureDevOpsClient.mockImplementation(() => mockClient);

    // Mock formatter methods
    mockFormatter = {
      convertHtmlToMarkdown: jest.fn(),
      getStateIcon: jest.fn()
    };
    AzureFormatter.convertHtmlToMarkdown = mockFormatter.convertHtmlToMarkdown;
    AzureFormatter.getStateIcon = mockFormatter.getStateIcon;

    // Default mock implementations
    mockFormatter.convertHtmlToMarkdown.mockImplementation(html => html.replace(/<[^>]*>/g, ''));
    mockFormatter.getStateIcon.mockImplementation(state => {
      const icons = {
        'Done': '✅',
        'Active': '🔄',
        'New': '📝',
        'Closed': '✅'
      };
      return icons[state] || '❓';
    });
  });

  describe('Constructor', () => {
    it('should initialize with settings', () => {
      const settings = { organization: 'test-org', project: 'test-project' };
      const instance = new AzureEpicShow(settings);

      expect(instance).toBeInstanceOf(AzureEpicShow);
      expect(AzureDevOpsClient).toHaveBeenCalledWith(settings);
      expect(instance.formatter).toBe(AzureFormatter);
    });

    it('should initialize without settings', () => {
      const instance = new AzureEpicShow();

      expect(instance).toBeInstanceOf(AzureEpicShow);
      expect(AzureDevOpsClient).toHaveBeenCalledWith(undefined);
    });
  });

  describe('execute()', () => {
    it('should execute successfully for Epic work item', async () => {
      const options = { id: '123' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '123',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/123',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Test Epic',
          'System.State': 'Active',
          'System.AssignedTo': { displayName: 'Test User' },
          'System.Description': 'Test description',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        },
        relations: []
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic).toEqual({
        id: '123',
        title: 'Test Epic',
        type: 'Epic',
        state: 'Active',
        url: mockWorkItem.url
      });
      expect(mockClient.getWorkItem).toHaveBeenCalledWith('123');
      expect(console.log).toHaveBeenCalled();
    });

    it('should execute successfully for Feature work item', async () => {
      const options = { id: '456' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '456',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/456',
        fields: {
          'System.WorkItemType': 'Feature',
          'System.Title': 'Test Feature',
          'System.State': 'New',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        }
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(result.epic.type).toBe('Feature');
    });

    it('should warn when work item is not Epic or Feature', async () => {
      const options = { id: '789' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '789',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/789',
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Test Story',
          'System.State': 'New',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        }
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Work item #789 is a User Story, not an Epic or Feature'
      );
    });

    it('should throw error when ID is missing', async () => {
      const options = {};
      const settings = { organization: 'test-org', project: 'test-project' };

      const result = await execute(options, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Epic/Feature ID is required');
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to show epic: Epic/Feature ID is required'
      );
    });

    it('should handle client errors gracefully', async () => {
      const options = { id: '999' };
      const settings = { organization: 'test-org', project: 'test-project' };

      mockClient.getWorkItem.mockRejectedValue(new Error('Work item not found'));

      const result = await execute(options, settings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Work item not found');
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to show epic: Work item not found'
      );
    });

    it('should load and display child work items', async () => {
      const options = { id: '100' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '100',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/100',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Parent Epic',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        },
        relations: [
          {
            rel: 'System.LinkTypes.Hierarchy-Forward',
            url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/101'
          },
          {
            rel: 'System.LinkTypes.Hierarchy-Forward',
            url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/102'
          }
        ]
      };

      const mockChildren = [
        {
          id: '101',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Child Story 1',
            'System.State': 'Done',
            'System.AssignedTo': { displayName: 'Dev 1' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        },
        {
          id: '102',
          fields: {
            'System.WorkItemType': 'Task',
            'System.Title': 'Child Task 1',
            'System.State': 'Active',
            'System.AssignedTo': { displayName: 'Dev 2' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 3
          }
        }
      ];

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);
      mockClient.getWorkItems.mockResolvedValue(mockChildren);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(mockClient.getWorkItems).toHaveBeenCalledWith([101, 102]);
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle work item with no relations', async () => {
      const options = { id: '200' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '200',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/200',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Standalone Epic',
          'System.State': 'New',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        },
        relations: null
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(mockClient.getWorkItems).not.toHaveBeenCalled();
    });

    it('should handle work item with empty relations array', async () => {
      const options = { id: '300' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '300',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/300',
        fields: {
          'System.WorkItemType': 'Feature',
          'System.Title': 'Feature with no children',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        },
        relations: []
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(mockClient.getWorkItems).not.toHaveBeenCalled();
    });

    it('should filter out non-hierarchy relations', async () => {
      const options = { id: '400' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockWorkItem = {
        id: '400',
        url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/400',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic with mixed relations',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-02T00:00:00Z'
        },
        relations: [
          {
            rel: 'System.LinkTypes.Hierarchy-Forward',
            url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/401'
          },
          {
            rel: 'System.LinkTypes.Related',
            url: 'https://dev.azure.com/test-org/test-project/_apis/wit/workItems/402'
          },
          {
            rel: 'AttachedFile',
            url: 'https://dev.azure.com/test-org/test-project/_apis/wit/attachments/123'
          }
        ]
      };

      const mockChildren = [
        {
          id: '401',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Only Child',
            'System.State': 'New'
          }
        }
      ];

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);
      mockClient.getWorkItems.mockResolvedValue(mockChildren);

      const result = await execute(options, settings);

      expect(result.success).toBe(true);
      expect(mockClient.getWorkItems).toHaveBeenCalledWith([401]); // Only hierarchy relation
    });
  });

  describe('formatEpicDetails()', () => {
    it('should format epic with all fields', () => {
      const workItem = {
        id: '123',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Complete Epic',
          'System.State': 'Active',
          'System.AssignedTo': { displayName: 'Test User' },
          'System.IterationPath': 'Sprint 10',
          'System.AreaPath': 'Product\\Feature',
          'Microsoft.VSTS.Common.Priority': 1,
          'Microsoft.VSTS.Common.BusinessValue': 100,
          'Microsoft.VSTS.Scheduling.StoryPoints': 20,
          'Microsoft.VSTS.Scheduling.Effort': 40,
          'System.Tags': 'urgent; high-value; customer-facing',
          'System.Description': '<p>Epic description with <b>HTML</b></p>',
          'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Criteria 1</li><li>Criteria 2</li></ul>',
          'Microsoft.VSTS.Scheduling.StartDate': '2023-01-01T00:00:00Z',
          'Microsoft.VSTS.Scheduling.TargetDate': '2023-12-31T00:00:00Z',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-15T00:00:00Z'
        }
      };

      const children = [
        {
          id: '124',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Story 1',
            'System.State': 'Done',
            'System.AssignedTo': { displayName: 'Dev 1' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 8
          }
        },
        {
          id: '125',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Story 2',
            'System.State': 'Active',
            'System.AssignedTo': { displayName: 'Dev 2' },
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        }
      ];

      // Create instance with mock client
      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, children);

      expect(result).toContain('# Epic #123: Complete Epic');
      expect(result).toContain('**Status:** Active');
      expect(result).toContain('**Assignee:** Test User');
      expect(result).toContain('**Iteration:** Sprint 10');
      expect(result).toContain('**Area:** Product\\Feature');
      expect(result).toContain('**Priority:** 1');
      expect(result).toContain('**Business Value:** 100');
      expect(result).toContain('**Story Points:** 20');
      expect(result).toContain('**Effort:** 40');
      expect(result).toContain('**Tags:** urgent, high-value, customer-facing');
      expect(result).toContain('## Description');
      expect(result).toContain('## Acceptance Criteria');
      expect(result).toContain('## Child Work Items (2)');
      expect(result).toContain('### Done (1)');
      expect(result).toContain('### Active (1)');
      expect(result).toContain('**Progress:** 1/2 items completed (50%)');
      expect(result).toContain('**Story Points:** 8/13 points completed (62%)');
      expect(result).toContain('## Timeline');
      expect(result).toContain('**Start Date:**');
      expect(result).toContain('**Target Date:**');
      expect(result).toContain('🔗 [View in Azure DevOps]');

      expect(mockFormatter.convertHtmlToMarkdown).toHaveBeenCalledWith('<p>Epic description with <b>HTML</b></p>');
      expect(mockFormatter.convertHtmlToMarkdown).toHaveBeenCalledWith('<ul><li>Criteria 1</li><li>Criteria 2</li></ul>');
      expect(mockFormatter.getStateIcon).toHaveBeenCalledWith('Done');
      expect(mockFormatter.getStateIcon).toHaveBeenCalledWith('Active');
    });

    it('should format epic with minimal fields', () => {
      const workItem = {
        id: '456',
        fields: {
          'System.WorkItemType': 'Feature',
          'System.Title': 'Minimal Feature',
          'System.State': 'New',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const children = [];

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, children);

      expect(result).toContain('# Feature #456: Minimal Feature');
      expect(result).toContain('**Status:** New');
      expect(result).toContain('**Assignee:** Unassigned');
      expect(result).not.toContain('**Iteration:**');
      expect(result).not.toContain('**Priority:**');
      expect(result).not.toContain('## Description');
      expect(result).not.toContain('## Child Work Items');
      expect(result).toContain('## Timeline');
      expect(result).toContain('**Created:**');
      expect(result).toContain('**Last Updated:**');
    });

    it('should handle children without story points', () => {
      const workItem = {
        id: '789',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic without points',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const children = [
        {
          id: '790',
          fields: {
            'System.WorkItemType': 'Task',
            'System.Title': 'Task without points',
            'System.State': 'Done'
          }
        }
      ];

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, children);

      expect(result).toContain('**Progress:** 1/1 items completed (100%)');
      expect(result).not.toContain('**Story Points:**'); // Should not show points section
    });

    it('should handle unassigned children', () => {
      const workItem = {
        id: '800',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic with unassigned children',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const children = [
        {
          id: '801',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Unassigned Story',
            'System.State': 'New'
          }
        }
      ];

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, children);

      expect(result).toContain('📝 #801 [User Story] Unassigned Story (Unassigned)');
    });

    it('should group children by state correctly', () => {
      const workItem = {
        id: '900',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic with various states',
          'System.State': 'Active',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const children = [
        {
          id: '901',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'New Story',
            'System.State': 'New'
          }
        },
        {
          id: '902',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Active Story',
            'System.State': 'Active'
          }
        },
        {
          id: '903',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Another Active Story',
            'System.State': 'Active'
          }
        },
        {
          id: '904',
          fields: {
            'System.WorkItemType': 'User Story',
            'System.Title': 'Done Story',
            'System.State': 'Done'
          }
        }
      ];

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, children);

      expect(result).toContain('### New (1)');
      expect(result).toContain('### Active (2)');
      expect(result).toContain('### Done (1)');
      expect(result).toContain('**Progress:** 1/4 items completed (25%)');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', () => {
      const azureEpicShow = require('../../autopm/.claude/providers/azure/epic-show.js');

      expect(azureEpicShow).toHaveProperty('execute');
      expect(azureEpicShow).toHaveProperty('AzureEpicShow');
      expect(azureEpicShow).toHaveProperty('formatEpicDetails');
    });

    it('should handle date formatting edge cases', () => {
      const workItem = {
        id: '1000',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Date test epic',
          'System.State': 'Active',
          'Microsoft.VSTS.Scheduling.StartDate': 'invalid-date',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      // Should not throw error even with invalid date
      expect(() => formatEpicDetails(workItem, [])).not.toThrow();
    });

    it('should handle empty tags gracefully', () => {
      const workItem = {
        id: '1100',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic with empty tags',
          'System.State': 'Active',
          'System.Tags': '',
          'System.CreatedDate': '2023-01-01T00:00:00Z',
          'System.ChangedDate': '2023-01-01T00:00:00Z'
        }
      };

      const instance = new AzureEpicShow();
      instance.client = { organization: 'test-org', project: 'test-project' };

      const result = formatEpicDetails(workItem, []);

      expect(result).not.toContain('**Tags:**');
    });
  });
});