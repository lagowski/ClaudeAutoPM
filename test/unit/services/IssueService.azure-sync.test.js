/**
 * IssueService Azure DevOps Sync Tests
 *
 * Test-Driven Development (TDD) tests for Azure DevOps synchronization methods
 *
 * Context7 Documentation Applied:
 * - mcp://context7/azure-devops/work-items-api - Azure DevOps Work Items REST API
 * - mcp://context7/nodejs/testing-jest - Jest testing patterns
 * - mcp://context7/agile/issue-sync - Issue synchronization patterns
 * - mcp://context7/conflict-resolution - Conflict resolution strategies
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 *
 * Coverage Target: 95%+ for all 8 new Azure sync methods
 *
 * Azure-Specific Patterns:
 * - Work Items instead of Issues
 * - Work Item IDs (integers) instead of issue numbers
 * - Azure States: New, Active, Resolved, Closed (not open/closed)
 * - azure-sync-map.json structure with work item type tracking
 */

const IssueService = require('../../../lib/services/IssueService');
const AzureDevOpsProvider = require('../../../lib/providers/AzureDevOpsProvider');
const fs = require('../../../lib/utils/fs');
const path = require('path');

// Mock dependencies
jest.mock('../../../lib/utils/fs');
jest.mock('../../../lib/providers/AzureDevOpsProvider');

describe('IssueService - Azure DevOps Synchronization', () => {
  let service;
  let mockProvider;
  const syncMapPath = path.join(process.cwd(), '.claude/azure-sync-map.json');

  beforeEach(() => {
    // Create mock Azure DevOps provider
    mockProvider = {
      getWorkItem: jest.fn(),
      createWorkItem: jest.fn(),
      updateWorkItem: jest.fn(),
      listWorkItems: jest.fn()
    };

    service = new IssueService({ provider: mockProvider });
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. syncToAzure(issueNumber, options)
  // ==========================================

  describe('syncToAzure', () => {
    it('should create new work item when not mapped', async () => {
      const localIssue = `---
id: 1
title: New Feature
status: open
created: 2025-10-14T10:00:00Z
---

# New Feature
Implementation details`;

      // Mock local issue read
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      // Mock azure-sync-map (no existing mapping)
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      // Mock Azure work item creation
      mockProvider.createWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'New Feature',
          'System.State': 'New',
          'System.WorkItemType': 'User Story',
          'System.ChangedDate': '2025-10-14T10:05:00Z'
        }
      });

      // Mock azure-sync-map write
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncToAzure(1);

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe('1');
      expect(result.workItemId).toBe('123');
      expect(result.action).toBe('created');
      expect(mockProvider.createWorkItem).toHaveBeenCalled();
    });

    it('should update existing work item when mapped', async () => {
      const localIssue = `---
id: 1
title: Updated Feature
status: in-progress
updated: 2025-10-14T11:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      // Mock azure-sync-map with existing mapping
      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z',
            workItemId: '123',
            workItemType: 'User Story'
          }
        }
      };

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(true);
        return Promise.resolve(true);
      });
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Updated Feature',
          'System.State': 'Active',
          'System.ChangedDate': '2025-10-14T11:05:00Z'
        }
      });

      const result = await service.syncToAzure(1);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith('123', expect.any(Object));
    });

    it('should detect conflicts when enabled', async () => {
      const localIssue = `---
id: 1
title: Feature
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T09:00:00Z',
            workItemId: '123'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      // Mock Azure work item that's newer
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Feature (updated on Azure)',
          'System.ChangedDate': '2025-10-14T11:00:00Z'
        }
      });

      const result = await service.syncToAzure(1, { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.remoteNewer).toBe(true);
    });

    it('should return conflict when remote newer', async () => {
      const localIssue = `---
id: 1
title: Feature
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      const result = await service.syncToAzure(1, { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict.hasConflict).toBe(true);
      expect(result.conflict.remoteNewer).toBe(true);
    });

    it('should update azure-sync-map after sync', async () => {
      const localIssue = `---
id: 5
title: Test
status: open
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      mockProvider.createWorkItem.mockResolvedValue({
        id: 456,
        fields: {
          'System.Title': 'Test',
          'System.WorkItemType': 'User Story'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncToAzure(5);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-azure': { '5': '456' },
          'azure-to-local': { '456': '5' }
        }),
        { spaces: 2 }
      );
    });

    it('should handle missing local issue', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.syncToAzure(999))
        .rejects
        .toThrow('Issue not found: 999');
    });

    it('should handle provider errors', async () => {
      const localIssue = `---
id: 1
title: Test
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      mockProvider.createWorkItem.mockRejectedValue(new Error('API Error'));

      await expect(service.syncToAzure(1))
        .rejects
        .toThrow('API Error');
    });
  });

  // ==========================================
  // 2. syncFromAzure(workItemId, options)
  // ==========================================

  describe('syncFromAzure', () => {
    it('should create new local issue when not mapped', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Work Item',
          'System.Description': 'Work item from Azure',
          'System.State': 'New',
          'System.WorkItemType': 'User Story',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z',
          'System.Tags': 'bug; feature',
          'System.AssignedTo': { displayName: 'Developer' }
        }
      });

      // No existing azure-sync-map
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        if (filePath.includes('issues/123.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      // Mock listIssues to return empty array (for determining next issue number)
      service.listIssues = jest.fn().mockResolvedValue([]);

      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncFromAzure(123);

      expect(result.success).toBe(true);
      expect(result.localNumber).toBe('1'); // First issue
      expect(result.workItemId).toBe('123');
      expect(result.action).toBe('created');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update existing local issue when mapped', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Updated from Azure',
          'System.Description': 'Updated content',
          'System.State': 'Resolved',
          'System.WorkItemType': 'User Story',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncFromAzure(123);

      expect(result.success).toBe(true);
      expect(result.localNumber).toBe('1');
      expect(result.action).toBe('updated');
    });

    it('should detect conflicts when enabled', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Work Item',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      const localIssue = `---
id: 1
title: Local Issue
updated: 2025-10-14T11:00:00Z
---`;

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localIssue);

      const result = await service.syncFromAzure(123, { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should return conflict when local newer', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      const localIssue = `---
id: 1
title: Local Version
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localIssue);

      const result = await service.syncFromAzure(123, { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict.hasConflict).toBe(true);
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should update azure-sync-map after sync', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 789,
        fields: {
          'System.Title': 'New Work Item',
          'System.WorkItemType': 'Task',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      service.listIssues = jest.fn().mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '5' }
      ]);

      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncFromAzure(789);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-azure': { '6': '789' },
          'azure-to-local': { '789': '6' }
        }),
        { spaces: 2 }
      );
    });

    it('should assign next available number for new issues', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 555,
        fields: {
          'System.Title': 'New',
          'System.WorkItemType': 'Bug',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      // Mock existing issues: 1, 2, 3, 10
      service.listIssues = jest.fn().mockResolvedValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '10' }
      ]);

      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncFromAzure(555);

      expect(result.localNumber).toBe('11'); // Next after 10
    });

    it('should handle provider errors', async () => {
      mockProvider.getWorkItem.mockRejectedValue(new Error('Not found'));

      await expect(service.syncFromAzure(999))
        .rejects
        .toThrow('Not found');
    });
  });

  // ==========================================
  // 3. syncBidirectionalAzure(issueNumber, options)
  // ==========================================

  describe('syncBidirectionalAzure', () => {
    it('should push to Azure when no mapping exists', async () => {
      const localIssue = `---
id: 1
title: New Issue
status: open
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      // No mapping exists
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      mockProvider.createWorkItem.mockResolvedValue({
        id: 999,
        fields: {
          'System.Title': 'New Issue',
          'System.WorkItemType': 'User Story'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncBidirectionalAzure(1);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-azure');
      expect(mockProvider.createWorkItem).toHaveBeenCalled();
    });

    it('should auto-resolve using newest timestamp', async () => {
      const localIssue = `---
id: 1
title: Local Newer
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.ChangedDate': '2025-10-14T12:05:00Z'
        }
      });

      const result = await service.syncBidirectionalAzure(1);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-azure');
      expect(mockProvider.updateWorkItem).toHaveBeenCalled();
    });

    it('should return conflict when strategy is detect', async () => {
      const localIssue = `---
id: 1
title: Both Modified
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Modified',
          'System.ChangedDate': '2025-10-14T11:30:00Z'
        }
      });

      const result = await service.syncBidirectionalAzure(1, { conflictStrategy: 'detect' });

      expect(result.direction).toBe('conflict');
      expect(result.conflict).toBeDefined();
    });

    it('should sync in correct direction based on timestamps', async () => {
      const localIssue = `---
id: 1
title: Remote Newer
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Newer',
          'System.WorkItemType': 'Task',
          'System.CreatedDate': '2025-10-14T09:00:00Z',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      const result = await service.syncBidirectionalAzure(1);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('from-azure');
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 4. createAzureWorkItem(issueData)
  // ==========================================

  describe('createAzureWorkItem', () => {
    it('should create work item with correct data', async () => {
      const issueData = {
        id: '1',
        title: 'New Azure Work Item',
        content: 'Work item description',
        status: 'open',
        labels: 'bug, feature'
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 456,
        fields: {
          'System.Title': 'New Azure Work Item',
          'System.State': 'New',
          'System.WorkItemType': 'User Story'
        }
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.createAzureWorkItem(issueData);

      expect(result.id).toBe(456);
      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'User Story',
        expect.objectContaining({
          title: 'New Azure Work Item',
          description: 'Work item description',
          state: 'New',
          tags: 'bug, feature'
        })
      );
    });

    it('should default to User Story type', async () => {
      const issueData = {
        title: 'Test Work Item',
        content: 'Content'
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 789,
        fields: {
          'System.WorkItemType': 'User Story'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createAzureWorkItem(issueData);

      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'User Story',
        expect.any(Object)
      );
    });

    it('should map local status to Azure state', async () => {
      const testCases = [
        { status: 'open', expectedState: 'New' },
        { status: 'in-progress', expectedState: 'Active' },
        { status: 'done', expectedState: 'Resolved' },
        { status: 'closed', expectedState: 'Closed' }
      ];

      mockProvider.createWorkItem.mockResolvedValue({ id: 1 });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const issueData = {
          title: 'Test',
          status: testCase.status
        };

        await service.createAzureWorkItem(issueData);

        expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
          'User Story',
          expect.objectContaining({
            state: testCase.expectedState
          })
        );
      }
    });

    it('should update azure-sync-map with work item ID', async () => {
      const issueData = {
        id: '5',
        title: 'Test',
        content: 'Content'
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 999,
        fields: {
          'System.WorkItemType': 'User Story'
        }
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createAzureWorkItem(issueData);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-azure': { '5': '999' },
          'azure-to-local': { '999': '5' },
          'metadata': expect.objectContaining({
            '5': expect.objectContaining({
              workItemId: '999',
              workItemType: 'User Story'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });

  // ==========================================
  // 5. updateAzureWorkItem(workItemId, issueData)
  // ==========================================

  describe('updateAzureWorkItem', () => {
    it('should update work item with changed fields', async () => {
      const issueData = {
        title: 'Updated Title',
        content: 'Updated content',
        status: 'in-progress'
      };

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Updated Title',
          'System.State': 'Active',
          'System.ChangedDate': '2025-10-14T13:00:00Z'
        }
      });

      const result = await service.updateAzureWorkItem(123, issueData);

      expect(result.id).toBe(123);
      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123, {
        title: 'Updated Title',
        description: 'Updated content',
        state: 'Active' // in-progress maps to Active
      });
    });

    it('should map status correctly', async () => {
      const statusMappings = [
        { localStatus: 'open', azureState: 'New' },
        { localStatus: 'in-progress', azureState: 'Active' },
        { localStatus: 'done', azureState: 'Resolved' },
        { localStatus: 'completed', azureState: 'Resolved' },
        { localStatus: 'closed', azureState: 'Closed' }
      ];

      mockProvider.updateWorkItem.mockResolvedValue({ id: 123 });

      for (const mapping of statusMappings) {
        jest.clearAllMocks();

        const issueData = {
          title: 'Test',
          status: mapping.localStatus
        };

        await service.updateAzureWorkItem(123, issueData);

        expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123,
          expect.objectContaining({
            state: mapping.azureState
          })
        );
      }
    });

    it('should handle partial updates', async () => {
      const issueData = {
        title: 'Only Title Update'
      };

      mockProvider.updateWorkItem.mockResolvedValue({ id: 123 });

      await service.updateAzureWorkItem(123, issueData);

      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123, {
        title: 'Only Title Update'
      });
    });
  });

  // ==========================================
  // 6. detectAzureConflict(localIssue, azureWorkItem)
  // ==========================================

  describe('detectAzureConflict', () => {
    it('should detect no conflict when timestamps match', () => {
      const localIssue = {
        title: 'Issue',
        status: 'open',
        updated: '2025-10-14T10:00:00Z'
      };

      const azureWorkItem = {
        id: 123,
        fields: {
          'System.Title': 'Issue',
          'System.State': 'New',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      };

      const result = service.detectAzureConflict(localIssue, azureWorkItem);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should detect conflict when local is newer', () => {
      const localIssue = {
        title: 'Local Version',
        updated: '2025-10-14T12:00:00Z'
      };

      const azureWorkItem = {
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      };

      const result = service.detectAzureConflict(localIssue, azureWorkItem);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(true);
      expect(result.remoteNewer).toBe(false);
    });

    it('should detect conflict when remote is newer', () => {
      const localIssue = {
        title: 'Local',
        updated: '2025-10-14T10:00:00Z'
      };

      const azureWorkItem = {
        id: 123,
        fields: {
          'System.Title': 'Azure',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      };

      const result = service.detectAzureConflict(localIssue, azureWorkItem);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(false);
      expect(result.remoteNewer).toBe(true);
    });

    it('should identify conflicting fields', () => {
      const localIssue = {
        title: 'Local Title',
        status: 'in-progress',
        updated: '2025-10-14T11:00:00Z'
      };

      const azureWorkItem = {
        id: 123,
        fields: {
          'System.Title': 'Azure Title',
          'System.State': 'Resolved',
          'System.ChangedDate': '2025-10-14T11:00:00Z'
        }
      };

      const result = service.detectAzureConflict(localIssue, azureWorkItem);

      expect(result.conflictFields).toContain('title');
      expect(result.conflictFields).toContain('status');
    });
  });

  // ==========================================
  // 7. resolveAzureConflict(issueNumber, strategy)
  // ==========================================

  describe('resolveAzureConflict', () => {
    it('should resolve with local strategy', async () => {
      const localIssue = `---
id: 1
title: Local Version
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Local Version'
        }
      });

      const result = await service.resolveAzureConflict(1, 'local');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('local');
      expect(mockProvider.updateWorkItem).toHaveBeenCalled();
    });

    it('should resolve with remote strategy', async () => {
      fs.pathExists.mockResolvedValue(true);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.Description': 'Azure content',
          'System.State': 'Active',
          'System.WorkItemType': 'Task',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      const result = await service.resolveAzureConflict(1, 'remote');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('remote');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should resolve with newest strategy', async () => {
      const localIssue = `---
id: 1
title: Local Version
updated: 2025-10-14T13:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.Title': 'Local Version'
        }
      });

      const result = await service.resolveAzureConflict(1, 'newest');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('newest');
      // Should use local since it's newer
      expect(mockProvider.updateWorkItem).toHaveBeenCalled();
    });

    it('should return requiresManualResolution for manual strategy', async () => {
      const result = await service.resolveAzureConflict(1, 'manual');

      expect(result.resolved).toBe(false);
      expect(result.appliedStrategy).toBe('manual');
      expect(result.requiresManualResolution).toBe(true);
    });
  });

  // ==========================================
  // 8. getAzureSyncStatus(issueNumber)
  // ==========================================

  describe('getAzureSyncStatus', () => {
    it('should return not-synced when no mapping', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.getAzureSyncStatus(1);

      expect(result.synced).toBe(false);
      expect(result.localNumber).toBe('1');
      expect(result.workItemId).toBeNull();
      expect(result.status).toBe('not-synced');
    });

    it('should return synced when timestamps match', async () => {
      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            workItemId: '123',
            workItemType: 'User Story'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service.getAzureSyncStatus(1);

      expect(result.synced).toBe(true);
      expect(result.localNumber).toBe('1');
      expect(result.workItemId).toBe('123');
      expect(result.lastSync).toBe('2025-10-14T10:00:00Z');
      expect(result.status).toBe('synced');
    });

    it('should return out-of-sync when timestamps differ', async () => {
      const localIssue = `---
id: 1
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localIssue);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.ChangedDate': '2025-10-14T13:00:00Z'
        }
      });

      const result = await service.getAzureSyncStatus(1);

      expect(result.synced).toBe(false);
      expect(result.status).toBe('out-of-sync');
    });
  });

  // ==========================================
  // HELPER METHODS (Private)
  // ==========================================

  describe('_loadAzureSyncMap', () => {
    it('should load existing azure-sync-map', async () => {
      const existingSyncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service._loadAzureSyncMap();

      expect(result).toEqual(existingSyncMap);
      expect(fs.readJSON).toHaveBeenCalledWith(syncMapPath);
    });

    it('should return default structure if azure-sync-map does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service._loadAzureSyncMap();

      expect(result).toEqual({
        'local-to-azure': {},
        'azure-to-local': {},
        'metadata': {}
      });
    });
  });

  describe('_saveAzureSyncMap', () => {
    it('should save azure-sync-map to file', async () => {
      const syncMap = {
        'local-to-azure': { '1': '123' },
        'azure-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._saveAzureSyncMap(syncMap);

      expect(fs.writeJSON).toHaveBeenCalledWith(syncMapPath, syncMap, { spaces: 2 });
    });
  });

  describe('_updateAzureSyncMap', () => {
    it('should update azure-sync-map with new mapping', async () => {
      const existingSyncMap = {
        'local-to-azure': {},
        'azure-to-local': {},
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._updateAzureSyncMap('5', '500', 'Task');

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-azure': { '5': '500' },
          'azure-to-local': { '500': '5' },
          'metadata': expect.objectContaining({
            '5': expect.objectContaining({
              lastSync: expect.any(String),
              workItemId: '500',
              workItemType: 'Task'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });

  describe('_mapStatusToAzure', () => {
    it('should map open to New', () => {
      expect(service._mapStatusToAzure('open')).toBe('New');
    });

    it('should map in-progress to Active', () => {
      expect(service._mapStatusToAzure('in-progress')).toBe('Active');
    });

    it('should map done to Resolved', () => {
      expect(service._mapStatusToAzure('done')).toBe('Resolved');
    });

    it('should map closed to Closed', () => {
      expect(service._mapStatusToAzure('closed')).toBe('Closed');
    });

    it('should return New for unknown status', () => {
      expect(service._mapStatusToAzure('custom')).toBe('New');
    });
  });

  describe('_mapAzureStateToLocal', () => {
    it('should map New to open', () => {
      expect(service._mapAzureStateToLocal('New')).toBe('open');
    });

    it('should map Active to in-progress', () => {
      expect(service._mapAzureStateToLocal('Active')).toBe('in-progress');
    });

    it('should map Resolved to done', () => {
      expect(service._mapAzureStateToLocal('Resolved')).toBe('done');
    });

    it('should map Closed to closed', () => {
      expect(service._mapAzureStateToLocal('Closed')).toBe('closed');
    });

    it('should return open for unknown state', () => {
      expect(service._mapAzureStateToLocal('CustomState')).toBe('open');
    });
  });
});
