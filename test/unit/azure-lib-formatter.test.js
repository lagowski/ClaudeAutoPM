const AzureFormatter = require('../../autopm/.claude/providers/azure/lib/formatter.js');

describe('AzureFormatter', () => {
  describe('mapWorkItemType()', () => {
    it('should map Epic to epic', () => {
      expect(AzureFormatter.mapWorkItemType('Epic')).toBe('epic');
    });

    it('should map Feature to epic', () => {
      expect(AzureFormatter.mapWorkItemType('Feature')).toBe('epic');
    });

    it('should map User Story to issue', () => {
      expect(AzureFormatter.mapWorkItemType('User Story')).toBe('issue');
    });

    it('should map Task to issue', () => {
      expect(AzureFormatter.mapWorkItemType('Task')).toBe('issue');
    });

    it('should map Bug to issue', () => {
      expect(AzureFormatter.mapWorkItemType('Bug')).toBe('issue');
    });

    it('should map Issue to issue', () => {
      expect(AzureFormatter.mapWorkItemType('Issue')).toBe('issue');
    });

    it('should map Requirement to issue', () => {
      expect(AzureFormatter.mapWorkItemType('Requirement')).toBe('issue');
    });

    it('should map Test Case to test', () => {
      expect(AzureFormatter.mapWorkItemType('Test Case')).toBe('test');
    });

    it('should map Test Plan to test', () => {
      expect(AzureFormatter.mapWorkItemType('Test Plan')).toBe('test');
    });

    it('should map Test Suite to test', () => {
      expect(AzureFormatter.mapWorkItemType('Test Suite')).toBe('test');
    });

    it('should default to issue for unknown types', () => {
      expect(AzureFormatter.mapWorkItemType('Custom Type')).toBe('issue');
      expect(AzureFormatter.mapWorkItemType(null)).toBe('issue');
      expect(AzureFormatter.mapWorkItemType(undefined)).toBe('issue');
    });
  });

  describe('mapState()', () => {
    it('should map common states', () => {
      expect(AzureFormatter.mapState('New')).toBe('open');
      expect(AzureFormatter.mapState('Active')).toBe('in_progress');
      expect(AzureFormatter.mapState('Resolved')).toBe('in_review');
      expect(AzureFormatter.mapState('Closed')).toBe('closed');
      expect(AzureFormatter.mapState('Removed')).toBe('cancelled');
    });

    it('should map User Story states', () => {
      expect(AzureFormatter.mapState('To Do')).toBe('open');
      expect(AzureFormatter.mapState('In Progress')).toBe('in_progress');
      expect(AzureFormatter.mapState('Done')).toBe('closed');
    });

    it('should map Task states', () => {
      expect(AzureFormatter.mapState('Doing')).toBe('in_progress');
    });

    it('should map Bug states', () => {
      expect(AzureFormatter.mapState('Proposed')).toBe('open');
      expect(AzureFormatter.mapState('Committed')).toBe('open');
    });

    it('should map Epic/Feature states', () => {
      expect(AzureFormatter.mapState('In Planning')).toBe('open');
      expect(AzureFormatter.mapState('Ready')).toBe('open');
      expect(AzureFormatter.mapState('In Development')).toBe('in_progress');
    });

    it('should default to open for unknown states', () => {
      expect(AzureFormatter.mapState('Custom State')).toBe('open');
      expect(AzureFormatter.mapState(null)).toBe('open');
      expect(AzureFormatter.mapState(undefined)).toBe('open');
    });
  });

  describe('formatWorkItem()', () => {
    it('should format work item with all fields', () => {
      const workItem = {
        id: '123',
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Test Story',
          'System.State': 'Active',
          'System.AssignedTo': { displayName: 'Test User' },
          'System.IterationPath': 'Sprint 10',
          'System.AreaPath': 'Product\\Feature',
          'Microsoft.VSTS.Common.Priority': 1,
          'Microsoft.VSTS.Scheduling.StoryPoints': 8,
          'Microsoft.VSTS.Scheduling.Effort': 16,
          'System.Tags': 'frontend; high-priority',
          'System.Description': '<p>Story description with <b>HTML</b></p>',
          'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Criteria 1</li><li>Criteria 2</li></ul>',
          'Microsoft.VSTS.Scheduling.RemainingWork': 4,
          'Microsoft.VSTS.Scheduling.CompletedWork': 2
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'test-org', 'test-project');

      expect(result).toContain('# User Story #123: Test Story');
      expect(result).toContain('**Status:** Active');
      expect(result).toContain('**Assignee:** Test User');
      expect(result).toContain('**Iteration:** Sprint 10');
      expect(result).toContain('**Area:** Product\\Feature');
      expect(result).toContain('**Priority:** 1');
      expect(result).toContain('**Story Points:** 8');
      expect(result).toContain('**Effort:** 16');
      expect(result).toContain('**Tags:** frontend, high-priority');
      expect(result).toContain('## Description');
      expect(result).toContain('Story description with HTML');
      expect(result).toContain('## Acceptance Criteria');
      expect(result).toContain('- Criteria 1');
      expect(result).toContain('- Criteria 2');
      expect(result).toContain('## Work Tracking');
      expect(result).toContain('- Remaining: 4h');
      expect(result).toContain('- Completed: 2h');
      expect(result).toContain('🔗 [View in Azure DevOps](https://dev.azure.com/test-org/test-project/_workitems/edit/123)');
    });

    it('should format work item with minimal fields', () => {
      const workItem = {
        id: '456',
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Simple Task',
          'System.State': 'New'
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).toContain('# Task #456: Simple Task');
      expect(result).toContain('**Status:** New');
      expect(result).toContain('**Assignee:** Unassigned');
      expect(result).not.toContain('**Iteration:**');
      expect(result).not.toContain('**Priority:**');
      expect(result).not.toContain('## Description');
      expect(result).not.toContain('## Work Tracking');
      expect(result).toContain('🔗 [View in Azure DevOps]');
    });

    it('should format Bug with Repro Steps', () => {
      const workItem = {
        id: '789',
        fields: {
          'System.WorkItemType': 'Bug',
          'System.Title': 'Test Bug',
          'System.State': 'Active',
          'Microsoft.VSTS.TCM.ReproSteps': '<ol><li>Step 1</li><li>Step 2</li></ol>'
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).toContain('## Repro Steps');
      expect(result).toContain('- Step 1');
      expect(result).toContain('- Step 2');
    });

    it('should handle empty assignee gracefully', () => {
      const workItem = {
        id: '100',
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Unassigned Task',
          'System.State': 'New',
          'System.AssignedTo': null
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).toContain('**Assignee:** Unassigned');
    });

    it('should handle empty tags', () => {
      const workItem = {
        id: '200',
        fields: {
          'System.WorkItemType': 'Story',
          'System.Title': 'Story with empty tags',
          'System.State': 'New',
          'System.Tags': ''
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).not.toContain('**Tags:**');
    });

    it('should handle work tracking with only remaining work', () => {
      const workItem = {
        id: '300',
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Task with remaining work',
          'System.State': 'Active',
          'Microsoft.VSTS.Scheduling.RemainingWork': 8
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).toContain('## Work Tracking');
      expect(result).toContain('- Remaining: 8h');
      expect(result).not.toContain('- Completed:');
    });

    it('should handle work tracking with only completed work', () => {
      const workItem = {
        id: '400',
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Task with completed work',
          'System.State': 'Done',
          'Microsoft.VSTS.Scheduling.CompletedWork': 5
        }
      };

      const result = AzureFormatter.formatWorkItem(workItem, 'org', 'project');

      expect(result).toContain('## Work Tracking');
      expect(result).toContain('- Completed: 5h');
      expect(result).not.toContain('- Remaining:');
    });
  });

  describe('formatWorkItemList()', () => {
    const mockWorkItems = [
      {
        id: '101',
        fields: {
          'System.WorkItemType': 'User Story',
          'System.Title': 'Story 1',
          'System.State': 'Active',
          'System.AssignedTo': { displayName: 'User 1' },
          'Microsoft.VSTS.Scheduling.StoryPoints': 5
        }
      },
      {
        id: '102',
        fields: {
          'System.WorkItemType': 'Task',
          'System.Title': 'Task 1',
          'System.State': 'Done',
          'System.AssignedTo': { displayName: 'User 2' }
        }
      },
      {
        id: '103',
        fields: {
          'System.WorkItemType': 'Bug',
          'System.Title': 'Bug 1',
          'System.State': 'New'
        }
      }
    ];

    it('should format work item list in summary mode', () => {
      const result = AzureFormatter.formatWorkItemList(mockWorkItems, false);

      expect(result).toContain('◐ #101 [User Story] Story 1 (User 1)');
      expect(result).toContain('● #102 [Task] Task 1 (User 2)');
      expect(result).toContain('○ #103 [Bug] Bug 1 (Unassigned)');
    });

    it('should format work item list in detailed mode', () => {
      const result = AzureFormatter.formatWorkItemList(mockWorkItems, true);

      expect(result).toContain('## User Story #101: Story 1');
      expect(result).toContain('   Status: Active | Assignee: User 1');
      expect(result).toContain('   Story Points: 5');
      expect(result).toContain('## Task #102: Task 1');
      expect(result).toContain('   Status: Done | Assignee: User 2');
      expect(result).toContain('## Bug #103: Bug 1');
      expect(result).toContain('   Status: New | Assignee: Unassigned');
    });

    it('should handle empty work item list', () => {
      const result = AzureFormatter.formatWorkItemList([]);

      expect(result).toBe('');
    });

    it('should not show story points when not available in detailed mode', () => {
      const workItemsWithoutPoints = [
        {
          id: '201',
          fields: {
            'System.WorkItemType': 'Task',
            'System.Title': 'Task without points',
            'System.State': 'New',
            'System.AssignedTo': { displayName: 'User 3' }
          }
        }
      ];

      const result = AzureFormatter.formatWorkItemList(workItemsWithoutPoints, true);

      expect(result).toContain('## Task #201: Task without points');
      expect(result).not.toContain('Story Points:');
    });
  });

  describe('getStateIcon()', () => {
    it('should return correct icons for different states', () => {
      expect(AzureFormatter.getStateIcon('New')).toBe('○');
      expect(AzureFormatter.getStateIcon('To Do')).toBe('○');
      expect(AzureFormatter.getStateIcon('Active')).toBe('◐');
      expect(AzureFormatter.getStateIcon('In Progress')).toBe('◐');
      expect(AzureFormatter.getStateIcon('Doing')).toBe('◐');
      expect(AzureFormatter.getStateIcon('Resolved')).toBe('◑');
      expect(AzureFormatter.getStateIcon('Done')).toBe('●');
      expect(AzureFormatter.getStateIcon('Closed')).toBe('●');
      expect(AzureFormatter.getStateIcon('Removed')).toBe('✗');
    });

    it('should return default icon for unknown states', () => {
      expect(AzureFormatter.getStateIcon('Custom State')).toBe('○');
      expect(AzureFormatter.getStateIcon(null)).toBe('○');
      expect(AzureFormatter.getStateIcon(undefined)).toBe('○');
    });
  });

  describe('convertHtmlToMarkdown()', () => {
    it('should convert basic HTML tags', () => {
      const html = '<p>Paragraph</p><br><div>Division</div>';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('Paragraph\n\nDivision');
    });

    it('should convert lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('- Item 1\n- Item 2');
    });

    it('should decode HTML entities', () => {
      const html = 'Test &nbsp; &lt;script&gt; &amp; &quot;quotes&quot; &#39;apostrophe&#39;';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('Test   <script> & "quotes" \'apostrophe\'');
    });

    it('should remove HTML tags', () => {
      const html = '<strong>Bold</strong> and <em>italic</em> text with <a href="link">link</a>';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('Bold and italic text with link');
    });

    it('should handle empty or null input', () => {
      expect(AzureFormatter.convertHtmlToMarkdown('')).toBe('');
      expect(AzureFormatter.convertHtmlToMarkdown(null)).toBe('');
      expect(AzureFormatter.convertHtmlToMarkdown(undefined)).toBe('');
    });

    it('should clean up excessive whitespace', () => {
      const html = '<p>Paragraph 1</p>\n\n\n<p>Paragraph 2</p>';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should handle complex nested HTML', () => {
      const html = '<div><p>Main paragraph with <strong>bold</strong> text.</p><ul><li>First item</li><li>Second item with <em>emphasis</em></li></ul></div>';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toContain('Main paragraph with bold text.');
      expect(result).toContain('- First item');
      expect(result).toContain('- Second item with emphasis');
    });
  });

  describe('formatSprintSummary()', () => {
    const mockIteration = {
      name: 'Sprint 10',
      attributes: {
        startDate: '2023-01-01T00:00:00Z',
        finishDate: '2023-01-14T00:00:00Z'
      }
    };

    const mockWorkItems = [
      {
        fields: {
          'System.State': 'Done',
          'Microsoft.VSTS.Scheduling.StoryPoints': 8
        }
      },
      {
        fields: {
          'System.State': 'Active',
          'Microsoft.VSTS.Scheduling.StoryPoints': 5
        }
      },
      {
        fields: {
          'System.State': 'Active',
          'Microsoft.VSTS.Scheduling.StoryPoints': 3
        }
      },
      {
        fields: {
          'System.State': 'New'
        }
      }
    ];

    it('should format sprint summary with all data', () => {
      const result = AzureFormatter.formatSprintSummary(mockIteration, mockWorkItems);

      expect(result).toContain('# Sprint: Sprint 10');
      expect(result).toContain('**Dates:**');
      expect(result).toContain('## Summary');
      expect(result).toContain('- Done: 1 items');
      expect(result).toContain('- Active: 2 items');
      expect(result).toContain('- New: 1 items');
      expect(result).toContain('**Story Points:** 8 / 16 completed');
      expect(result).toContain('**Progress:** 50%');
    });

    it('should handle sprint with no work items', () => {
      const result = AzureFormatter.formatSprintSummary(mockIteration, []);

      expect(result).toContain('# Sprint: Sprint 10');
      expect(result).toContain('## Summary');
      expect(result).not.toContain('**Story Points:**');
    });

    it('should handle work items without story points', () => {
      const workItemsNoPoints = [
        {
          fields: {
            'System.State': 'Done'
          }
        },
        {
          fields: {
            'System.State': 'Active'
          }
        }
      ];

      const result = AzureFormatter.formatSprintSummary(mockIteration, workItemsNoPoints);

      expect(result).toContain('- Done: 1 items');
      expect(result).toContain('- Active: 1 items');
      expect(result).not.toContain('**Story Points:**');
    });

    it('should calculate correct completion percentage', () => {
      const workItemsForPercentage = [
        {
          fields: {
            'System.State': 'Closed',
            'Microsoft.VSTS.Scheduling.StoryPoints': 10
          }
        },
        {
          fields: {
            'System.State': 'Active',
            'Microsoft.VSTS.Scheduling.StoryPoints': 20
          }
        }
      ];

      const result = AzureFormatter.formatSprintSummary(mockIteration, workItemsForPercentage);

      expect(result).toContain('**Story Points:** 10 / 30 completed');
      expect(result).toContain('**Progress:** 33%');
    });

    it('should handle mixed completion states', () => {
      const mixedWorkItems = [
        {
          fields: {
            'System.State': 'Done',
            'Microsoft.VSTS.Scheduling.StoryPoints': 5
          }
        },
        {
          fields: {
            'System.State': 'Closed',
            'Microsoft.VSTS.Scheduling.StoryPoints': 3
          }
        },
        {
          fields: {
            'System.State': 'Active',
            'Microsoft.VSTS.Scheduling.StoryPoints': 8
          }
        }
      ];

      const result = AzureFormatter.formatSprintSummary(mockIteration, mixedWorkItems);

      // Both Done and Closed should count as completed
      expect(result).toContain('**Story Points:** 8 / 16 completed');
      expect(result).toContain('**Progress:** 50%');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      // Test static methods are accessible
      expect(typeof AzureFormatter.mapWorkItemType).toBe('function');
      expect(typeof AzureFormatter.mapState).toBe('function');
      expect(typeof AzureFormatter.formatWorkItem).toBe('function');
      expect(typeof AzureFormatter.formatWorkItemList).toBe('function');
      expect(typeof AzureFormatter.getStateIcon).toBe('function');
      expect(typeof AzureFormatter.convertHtmlToMarkdown).toBe('function');
      expect(typeof AzureFormatter.formatSprintSummary).toBe('function');
    });

    it('should handle edge cases in HTML conversion', () => {
      // Test self-closing tags
      const html = '<img src="test.jpg" /><input type="text" />Content<hr />';
      const result = AzureFormatter.convertHtmlToMarkdown(html);

      expect(result).toBe('Content');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<p>Unclosed paragraph<div>Nested without closing</p>';
      const result = AzureFormatter.convertHtmlToMarkdown(malformedHtml);

      expect(result).toContain('Unclosed paragraph');
      expect(result).toContain('Nested without closing');
    });

    it('should handle complex work item formatting scenarios', () => {
      const complexWorkItem = {
        id: '999',
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Complex Epic with "quotes" & symbols',
          'System.State': 'In Development',
          'System.Tags': 'tag1; tag2; tag3; '
        }
      };

      const result = AzureFormatter.formatWorkItem(complexWorkItem, 'org-name', 'project-name');

      expect(result).toContain('Complex Epic with "quotes" & symbols');
      expect(result).toContain('**Tags:** tag1, tag2, tag3');
      expect(result).toContain('https://dev.azure.com/org-name/project-name/_workitems/edit/999');
    });
  });
});