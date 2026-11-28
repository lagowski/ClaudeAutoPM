const { AzureIssueEdit } = require('../../autopm/.claude/providers/azure/issue-edit');

// Mock the Azure dependencies
jest.mock('../../autopm/.claude/providers/azure/lib/client');
jest.mock('../../autopm/.claude/providers/azure/lib/formatter');

const AzureDevOpsClient = require('../../autopm/.claude/providers/azure/lib/client');
const AzureFormatter = require('../../autopm/.claude/providers/azure/lib/formatter');

describe('AzureIssueEdit', () => {
  let azureIssueEdit;
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
      getWorkItem: jest.fn(),
      updateWorkItem: jest.fn(),
      addComment: jest.fn()
    };

    // Mock constructor to return our mock client
    AzureDevOpsClient.mockImplementation(() => mockClient);

    // Mock formatter methods
    AzureFormatter.mapWorkItemType = jest.fn().mockReturnValue('user_story');
    AzureFormatter.mapState = jest.fn().mockReturnValue('open');

    // Create fresh instance
    azureIssueEdit = new AzureIssueEdit(mockConfig);
  });

  describe('Input Validation', () => {
    test('should throw error when work item ID is missing', async () => {
      const args = { updates: { title: 'New Title' } };

      await expect(azureIssueEdit.execute(args))
        .rejects
        .toThrow('Work Item ID is required');
    });

    test('should throw error when no updates provided', async () => {
      const args = { id: '123' };

      await expect(azureIssueEdit.execute(args))
        .rejects
        .toThrow('No updates provided');
    });

    test('should throw error when updates object is empty', async () => {
      const args = { id: '123', updates: {} };

      await expect(azureIssueEdit.execute(args))
        .rejects
        .toThrow('No updates provided');
    });
  });

  describe('Execute Workflow', () => {
    let mockWorkItem;

    beforeEach(() => {
      mockWorkItem = {
        id: 123,
        fields: {
          'System.Title': 'Original Title',
          'System.State': 'To Do',
          'System.WorkItemType': 'User Story',
          'System.AssignedTo': { displayName: 'John Doe', uniqueName: 'john@company.com' },
          'Microsoft.VSTS.Common.Priority': 2,
          'Microsoft.VSTS.Scheduling.StoryPoints': 5,
          'System.IterationPath': 'Project\\Sprint 1',
          'System.AreaPath': 'Project\\Area 1',
          'System.Tags': 'tag1; tag2'
        }
      };

      mockClient.getWorkItem.mockResolvedValue(mockWorkItem);
      mockClient.updateWorkItem.mockResolvedValue({
        ...mockWorkItem,
        fields: {
          ...mockWorkItem.fields,
          'System.Title': 'Updated Title'
        }
      });
    });

    test('should execute successful update', async () => {
      const args = {
        id: '123',
        updates: { title: 'Updated Title' }
      };

      const result = await azureIssueEdit.execute(args);

      expect(mockClient.getWorkItem).toHaveBeenCalledWith('123');
      expect(mockClient.updateWorkItem).toHaveBeenCalledWith('123', {
        'System.Title': 'Updated Title'
      });
      expect(result.success).toBe(true);
      expect(result.data.before).toBeDefined();
      expect(result.data.after).toBeDefined();
      expect(result.data.changes).toBeDefined();
      expect(result.formatted).toBeDefined();
    });

    test('should add comment when provided', async () => {
      const args = {
        id: '123',
        updates: { title: 'Updated Title', comment: 'Added a comment' }
      };

      await azureIssueEdit.execute(args);

      expect(mockClient.addComment).toHaveBeenCalledWith('123', 'Added a comment');
    });

    test('should handle API errors', async () => {
      const args = {
        id: '123',
        updates: { title: 'Updated Title' }
      };

      mockClient.getWorkItem.mockRejectedValue(new Error('API Error'));

      await expect(azureIssueEdit.execute(args))
        .rejects
        .toThrow('Failed to update work item: API Error');
    });
  });

  describe('mapUpdates()', () => {
    let currentItem;

    beforeEach(() => {
      currentItem = {
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Tags': 'existing-tag'
        }
      };
    });

    test('should map title update', () => {
      const updates = { title: 'New Title' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.Title']).toBe('New Title');
    });

    test('should map description update with markdown conversion', () => {
      const updates = { description: '**Bold text** and *italic*' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.Description']).toContain('<strong>Bold text</strong>');
      expect(result['System.Description']).toContain('<em>italic</em>');
    });

    test('should map state update', () => {
      const updates = { state: 'in_progress' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.State']).toBe('In Progress');
    });

    test('should map assignee to unassigned', () => {
      const updates = { assignee: 'unassigned' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.AssignedTo']).toBe('');
    });

    test('should map assignee to null', () => {
      const updates = { assignee: null };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.AssignedTo']).toBe('');
    });

    test('should map assignee to @me', () => {
      const updates = { assignee: '@me' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.AssignedTo']).toBe('@Me');
    });

    test('should map specific assignee', () => {
      const updates = { assignee: 'john@company.com' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.AssignedTo']).toBe('john@company.com');
    });

    test('should map priority', () => {
      const updates = { priority: 1 };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Common.Priority']).toBe(1);
    });

    test('should map story points', () => {
      const updates = { storyPoints: 8 };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Scheduling.StoryPoints']).toBe(8);
    });

    test('should map effort', () => {
      const updates = { effort: 10 };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Scheduling.Effort']).toBe(10);
    });

    test('should map remaining work', () => {
      const updates = { remainingWork: 5 };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Scheduling.RemainingWork']).toBe(5);
    });

    test('should map completed work', () => {
      const updates = { completedWork: 3 };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Scheduling.CompletedWork']).toBe(3);
    });

    test('should map acceptance criteria', () => {
      const updates = { acceptanceCriteria: '**Given** user is logged in' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.Common.AcceptanceCriteria']).toContain('<strong>Given</strong>');
    });

    test('should map repro steps', () => {
      const updates = { reproSteps: '1. Click button\n2. Observe error' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['Microsoft.VSTS.TCM.ReproSteps']).toContain('<br/>');
    });

    test('should map tags as array', () => {
      const updates = { tags: ['tag1', 'tag2', 'tag3'] };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.Tags']).toBe('tag1; tag2; tag3');
    });

    test('should map tags as string', () => {
      const updates = { tags: 'tag1; tag2; tag3' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.Tags']).toBe('tag1; tag2; tag3');
    });

    test('should map iteration', () => {
      const updates = { iteration: 'Project\\Sprint 2' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.IterationPath']).toBe('Project\\Sprint 2');
    });

    test('should map area', () => {
      const updates = { area: 'Project\\Area 2' };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.AreaPath']).toBe('Project\\Area 2');
    });

    test('should handle multiple updates', () => {
      const updates = {
        title: 'New Title',
        state: 'closed',
        priority: 1,
        tags: ['urgent', 'bug']
      };

      const result = azureIssueEdit.mapUpdates(updates, currentItem);

      expect(result['System.Title']).toBe('New Title');
      expect(result['System.State']).toBe('Done');
      expect(result['Microsoft.VSTS.Common.Priority']).toBe(1);
      expect(result['System.Tags']).toBe('urgent; bug');
    });
  });

  describe('mapStateToAzure()', () => {
    test('should map User Story states', () => {
      const workItemType = 'User Story';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('To Do');
      expect(azureIssueEdit.mapStateToAzure('in_progress', workItemType)).toBe('In Progress');
      expect(azureIssueEdit.mapStateToAzure('in_review', workItemType)).toBe('In Progress');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Done');
      expect(azureIssueEdit.mapStateToAzure('cancelled', workItemType)).toBe('Removed');
    });

    test('should map Task states', () => {
      const workItemType = 'Task';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('To Do');
      expect(azureIssueEdit.mapStateToAzure('in_progress', workItemType)).toBe('In Progress');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Done');
    });

    test('should map Bug states', () => {
      const workItemType = 'Bug';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('Active');
      expect(azureIssueEdit.mapStateToAzure('in_progress', workItemType)).toBe('Active');
      expect(azureIssueEdit.mapStateToAzure('in_review', workItemType)).toBe('Resolved');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Closed');
    });

    test('should map Epic states', () => {
      const workItemType = 'Epic';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('In Planning');
      expect(azureIssueEdit.mapStateToAzure('in_progress', workItemType)).toBe('In Development');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Done');
    });

    test('should map Feature states', () => {
      const workItemType = 'Feature';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('In Planning');
      expect(azureIssueEdit.mapStateToAzure('in_progress', workItemType)).toBe('In Development');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Done');
    });

    test('should default to User Story mapping for unknown work item types', () => {
      const workItemType = 'Unknown Type';

      expect(azureIssueEdit.mapStateToAzure('open', workItemType)).toBe('To Do');
      expect(azureIssueEdit.mapStateToAzure('closed', workItemType)).toBe('Done');
    });

    test('should return original state if not found in mapping', () => {
      const result = azureIssueEdit.mapStateToAzure('custom_state', 'User Story');

      expect(result).toBe('custom_state');
    });
  });

  describe('convertMarkdownToHtml()', () => {
    test('should handle empty markdown', () => {
      expect(azureIssueEdit.convertMarkdownToHtml('')).toBe('');
      expect(azureIssueEdit.convertMarkdownToHtml(null)).toBe('');
      expect(azureIssueEdit.convertMarkdownToHtml(undefined)).toBe('');
    });

    test('should convert headers', () => {
      const markdown = '# Header 1\n## Header 2\n### Header 3';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toContain('<h1>Header 1</h1>');
      expect(result).toContain('<h2>Header 2</h2>');
      expect(result).toContain('<h3>Header 3</h3>');
    });

    test('should convert bold text', () => {
      const markdown = '**Bold text**';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toBe('<strong>Bold text</strong>');
    });

    test('should convert italic text', () => {
      const markdown = '*Italic text*';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toBe('<em>Italic text</em>');
    });

    test('should convert line breaks', () => {
      const markdown = 'Line 1\nLine 2';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toBe('Line 1<br/>Line 2');
    });

    test('should convert bullet lists', () => {
      const markdown = '* Item 1\n* Item 2\n- Item 3';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toContain('<li>');
      expect(result).toContain('</li>');
      expect(result).toContain('<ul>');
      expect(result).toContain('</ul>');
    });

    test('should handle complex markdown', () => {
      const markdown = '# Title\n\n**Bold** and *italic*\n\n* List item 1\n* List item 2';

      const result = azureIssueEdit.convertMarkdownToHtml(markdown);

      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<br/>');
    });
  });

  describe('transformWorkItem()', () => {
    test('should transform work item correctly', () => {
      const workItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Test Title',
          'System.State': 'To Do',
          'System.AssignedTo': { displayName: 'John Doe' },
          'Microsoft.VSTS.Common.Priority': 2,
          'Microsoft.VSTS.Scheduling.StoryPoints': 5,
          'System.IterationPath': 'Project\\Sprint 1',
          'System.AreaPath': 'Project\\Area 1',
          'System.Tags': 'tag1; tag2; tag3'
        }
      };

      const result = azureIssueEdit.transformWorkItem(workItem);

      expect(result).toEqual({
        id: 123,
        type: 'user_story',
        title: 'Test Title',
        state: 'open',
        assignee: 'John Doe',
        priority: 2,
        storyPoints: 5,
        iteration: 'Project\\Sprint 1',
        area: 'Project\\Area 1',
        tags: ['tag1', 'tag2', 'tag3'],
        workItemType: 'User Story',
        azureState: 'To Do'
      });
    });

    test('should handle work item with null assignee', () => {
      const workItem = {
        id: 124,
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Test Task',
          'System.State': 'Done',
          'System.AssignedTo': null,
          'System.Tags': ''
        }
      };

      const result = azureIssueEdit.transformWorkItem(workItem);

      expect(result.assignee).toBeNull();
      expect(result.tags).toEqual([]);
    });

    test('should handle work item with missing tags', () => {
      const workItem = {
        id: 125,
        fields: {
          'System.WorkItemType': 'Bug',
          'System.Title': 'Test Bug',
          'System.State': 'Active'
        }
      };

      const result = azureIssueEdit.transformWorkItem(workItem);

      expect(result.tags).toEqual([]);
    });
  });

  describe('getChanges()', () => {
    test('should detect title change', () => {
      const beforeItem = {
        fields: { 'System.Title': 'Old Title' }
      };
      const afterItem = {
        fields: { 'System.Title': 'New Title' }
      };

      const changes = azureIssueEdit.getChanges(beforeItem, afterItem);

      expect(changes).toContainEqual({
        field: 'Title',
        before: 'Old Title',
        after: 'New Title'
      });
    });

    test('should detect assignee change', () => {
      const beforeItem = {
        fields: { 'System.AssignedTo': { displayName: 'John Doe' } }
      };
      const afterItem = {
        fields: { 'System.AssignedTo': { displayName: 'Jane Smith' } }
      };

      const changes = azureIssueEdit.getChanges(beforeItem, afterItem);

      expect(changes).toContainEqual({
        field: 'Assignee',
        before: 'John Doe',
        after: 'Jane Smith'
      });
    });

    test('should handle assignee unassignment', () => {
      const beforeItem = {
        fields: { 'System.AssignedTo': { displayName: 'John Doe' } }
      };
      const afterItem = {
        fields: { 'System.AssignedTo': null }
      };

      const changes = azureIssueEdit.getChanges(beforeItem, afterItem);

      expect(changes).toContainEqual({
        field: 'Assignee',
        before: 'John Doe',
        after: 'Unassigned'
      });
    });

    test('should detect multiple changes', () => {
      const beforeItem = {
        fields: {
          'System.Title': 'Old Title',
          'System.State': 'To Do',
          'Microsoft.VSTS.Common.Priority': 3
        }
      };
      const afterItem = {
        fields: {
          'System.Title': 'New Title',
          'System.State': 'Done',
          'Microsoft.VSTS.Common.Priority': 1
        }
      };

      const changes = azureIssueEdit.getChanges(beforeItem, afterItem);

      expect(changes).toHaveLength(3);
      expect(changes.map(c => c.field)).toContain('Title');
      expect(changes.map(c => c.field)).toContain('State');
      expect(changes.map(c => c.field)).toContain('Priority');
    });

    test('should return empty array when no changes', () => {
      const item = {
        fields: {
          'System.Title': 'Same Title',
          'System.State': 'To Do'
        }
      };

      const changes = azureIssueEdit.getChanges(item, item);

      expect(changes).toEqual([]);
    });
  });

  describe('formatResult()', () => {
    test('should format result with changes', () => {
      const beforeItem = {
        fields: { 'System.Title': 'Old Title' }
      };
      const afterItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'New Title',
          'System.State': 'To Do',
          'System.AssignedTo': null
        }
      };
      const requestedUpdates = {};

      const result = azureIssueEdit.formatResult(beforeItem, afterItem, requestedUpdates);

      expect(result).toContain('# Work Item Updated: #123');
      expect(result).toContain('**Type:** User Story');
      expect(result).toContain('**Title:** New Title');
      expect(result).toContain('## Changes Applied:');
      expect(result).toContain('- **Title:** Old Title → New Title');
      expect(result).toContain('## Current State:');
      expect(result).toContain('- **Status:** To Do');
      expect(result).toContain('- **Assignee:** Unassigned');
    });

    test('should include comment section when comment provided', () => {
      const beforeItem = { fields: {} };
      const afterItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Test Task',
          'System.State': 'Done',
          'System.AssignedTo': { displayName: 'John Doe' }
        }
      };
      const requestedUpdates = { comment: 'Work completed' };

      const result = azureIssueEdit.formatResult(beforeItem, afterItem, requestedUpdates);

      expect(result).toContain('## Comment Added:');
      expect(result).toContain('"Work completed"');
    });

    test('should include priority when present', () => {
      const beforeItem = { fields: {} };
      const afterItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Bug',
          'System.Title': 'Test Bug',
          'System.State': 'Active',
          'Microsoft.VSTS.Common.Priority': 1
        }
      };

      const result = azureIssueEdit.formatResult(beforeItem, afterItem, {});

      expect(result).toContain('- **Priority:** 1');
    });

    test('should include story points when present', () => {
      const beforeItem = { fields: {} };
      const afterItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Test Story',
          'System.State': 'To Do',
          'Microsoft.VSTS.Scheduling.StoryPoints': 8
        }
      };

      const result = azureIssueEdit.formatResult(beforeItem, afterItem, {});

      expect(result).toContain('- **Story Points:** 8');
    });

    test('should include Azure DevOps link', () => {
      const mockEditInstance = new AzureIssueEdit(mockConfig);
      const beforeItem = { fields: {} };
      const afterItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Test Task',
          'System.State': 'To Do'
        }
      };

      const result = mockEditInstance.formatResult(beforeItem, afterItem, {});

      expect(result).toContain('🔗 [View in Azure DevOps](https://dev.azure.com/test-org/test-project/_workitems/edit/123)');
    });
  });

  describe('Integration Tests', () => {
    test('should maintain backward compatibility with direct module usage', () => {
      const issueEdit = require('../../autopm/.claude/providers/azure/issue-edit');

      expect(typeof issueEdit.execute).toBe('function');
      expect(typeof issueEdit.mapUpdates).toBe('function');
      expect(typeof issueEdit.mapStateToAzure).toBe('function');
      expect(typeof issueEdit.convertMarkdownToHtml).toBe('function');
      expect(typeof issueEdit.transformWorkItem).toBe('function');
      expect(typeof issueEdit.getChanges).toBe('function');
      expect(typeof issueEdit.formatResult).toBe('function');
    });

    test('should handle edge cases', () => {
      const currentItem = { fields: { 'System.WorkItemType': 'User Story' } };

      // Empty title won't be mapped due to if (updates.title) check
      const emptyTitle = azureIssueEdit.mapUpdates({ title: '' }, currentItem);
      expect(emptyTitle['System.Title']).toBeUndefined();

      // Zero priority should be mapped since it uses !== undefined check
      const zeroPriority = azureIssueEdit.mapUpdates({ priority: 0 }, currentItem);
      expect(zeroPriority['Microsoft.VSTS.Common.Priority']).toBe(0);

      // Null story points should be mapped since it uses !== undefined check
      const nullStoryPoints = azureIssueEdit.mapUpdates({ storyPoints: null }, currentItem);
      expect(nullStoryPoints['Microsoft.VSTS.Scheduling.StoryPoints']).toBeNull();
    });
  });
});