/**
 * EpicService Azure DevOps Epic Sync Tests
 *
 * Test-Driven Development (TDD) tests for Azure DevOps epic synchronization methods
 *
 * Context7 Documentation Applied:
 * - mcp://context7/azure-devops/work-items-api - Azure DevOps Work Items REST API
 * - mcp://context7/nodejs/testing-jest - Jest testing patterns
 * - mcp://context7/agile/epic-management - Epic management and sync patterns
 * - mcp://context7/conflict-resolution - Conflict resolution strategies
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 *
 * Coverage Target: 95%+ for all 6 new Azure epic sync methods + helpers
 *
 * Azure Epic Specifics:
 * - Work Item Type: "Epic" (not just label)
 * - Child Work Items: Tasks as relations (not checkboxes)
 * - Azure Fields: System.WorkItemType, System.State, System.Title, etc.
 * - epic-azure-sync-map.json structure with work item type tracking
 */

const EpicService = require('../../../lib/services/EpicService');
const AzureDevOpsProvider = require('../../../lib/providers/AzureDevOpsProvider');
const fs = require('../../../lib/utils/fs');
const path = require('path');

// Mock dependencies
jest.mock('../../../lib/utils/fs');
jest.mock('../../../lib/providers/AzureDevOpsProvider');

describe('EpicService - Azure DevOps Epic Synchronization', () => {
  let service;
  let mockProvider;
  const epicAzureSyncMapPath = path.join(process.cwd(), '.claude/epic-azure-sync-map.json');
  const testEpicPath = path.join(process.cwd(), '.claude/epics/user-auth');
  const testEpicFilePath = path.join(testEpicPath, 'epic.md');

  beforeEach(() => {
    // Create mock Azure DevOps provider
    mockProvider = {
      getWorkItem: jest.fn(),
      createWorkItem: jest.fn(),
      updateWorkItem: jest.fn(),
      addRelation: jest.fn(),
      getRelations: jest.fn()
    };

    service = new EpicService({ provider: mockProvider });
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. syncEpicToAzure(epicName, options)
  // ==========================================

  describe('syncEpicToAzure', () => {
    it('should create new epic work item when not mapped', async () => {
      const epicContent = `---
name: user-auth
status: planning
priority: P1
created: 2025-10-14T10:00:00Z
progress: 0%
---

# Epic: User Authentication

## Overview
Implement secure user authentication system

## Tasks
- [ ] Setup auth infrastructure
- [ ] Implement JWT tokens`;

      // Mock epic.md read
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) return Promise.resolve(false);
        if (filePath === testEpicFilePath) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      fs.readFile.mockResolvedValue(epicContent);

      // Mock Azure epic work item creation
      mockProvider.createWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication',
          'System.State': 'New',
          'System.Description': 'Implement secure user authentication system',
          'System.Tags': 'priority:P1',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:05:00Z'
        },
        relations: []
      });

      // Mock sync-map write
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicToAzure('user-auth');

      expect(result.success).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.workItemId).toBe('123');
      expect(result.action).toBe('created');
      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'Epic',
        expect.objectContaining({
          title: expect.any(String),
          description: expect.stringContaining('Implement secure user authentication system')
        })
      );
    });

    it('should update existing epic work item when mapped', async () => {
      const epicContent = `---
name: user-auth
status: in-progress
priority: P1
progress: 30%
updated: 2025-10-14T11:00:00Z
---

# Epic: User Authentication

## Overview
Updated content`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      // Mock sync-map with existing mapping
      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            workItemId: '123',
            workItemType: 'Epic'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication',
          'System.State': 'Active',
          'System.ChangedDate': '2025-10-14T11:05:00Z'
        }
      });

      const result = await service.syncEpicToAzure('user-auth');

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith('123', expect.any(Object));
    });

    it('should detect conflicts when enabled', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T10:00:00Z
---

# Epic: User Authentication`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {
          'user-auth': {
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
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication (updated on Azure)',
          'System.ChangedDate': '2025-10-14T11:00:00Z'
        }
      });

      const result = await service.syncEpicToAzure('user-auth', { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.remoteNewer).toBe(true);
    });

    it('should return conflict when remote newer', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
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

      const result = await service.syncEpicToAzure('user-auth', { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict.hasConflict).toBe(true);
      expect(result.conflict.remoteNewer).toBe(true);
    });

    it('should update epic-azure-sync-map after sync', async () => {
      const epicContent = `---
name: user-auth
status: planning
---

# Epic: User Authentication`;

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.readFile.mockResolvedValue(epicContent);

      mockProvider.createWorkItem.mockResolvedValue({
        id: 456,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncEpicToAzure('user-auth');

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicAzureSyncMapPath,
        expect.objectContaining({
          'epic-to-azure': { 'user-auth': '456' },
          'azure-to-epic': { '456': 'user-auth' }
        }),
        { spaces: 2 }
      );
    });

    it('should handle missing local epic', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.syncEpicToAzure('non-existent'))
        .rejects
        .toThrow('Epic not found: non-existent');
    });

    it('should handle provider errors', async () => {
      const epicContent = `---
name: user-auth
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      mockProvider.createWorkItem.mockRejectedValue(new Error('Azure API Error'));

      await expect(service.syncEpicToAzure('user-auth'))
        .rejects
        .toThrow('Azure API Error');
    });
  });

  // ==========================================
  // 2. syncEpicFromAzure(workItemId, options)
  // ==========================================

  describe('syncEpicFromAzure', () => {
    it('should create new local epic when not mapped', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'New Feature Epic',
          'System.Description': 'Implement new feature\n\n## Tasks\n- [ ] Task 1: Setup\n- [ ] Task 2: Implementation',
          'System.State': 'New',
          'System.Tags': 'priority:P1',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        },
        relations: []
      });

      // No existing sync-map
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicFromAzure(123);

      expect(result.success).toBe(true);
      expect(result.epicName).toBeDefined();
      expect(result.workItemId).toBe('123');
      expect(result.action).toBe('created');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update existing local epic when mapped', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Updated Feature Epic',
          'System.Description': 'Updated content',
          'System.State': 'Active',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        },
        relations: []
      });

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicFromAzure(123);

      expect(result.success).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.action).toBe('updated');
    });

    it('should detect conflicts when enabled', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Azure Epic',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      const localEpic = `---
name: user-auth
updated: 2025-10-14T11:00:00Z
---`;

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localEpic);

      const result = await service.syncEpicFromAzure(123, { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should return conflict when local newer', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Azure Version',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      const localEpic = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localEpic);

      const result = await service.syncEpicFromAzure(123, { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict.hasConflict).toBe(true);
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should update epic-azure-sync-map after sync', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 789,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'New Epic',
          'System.Description': 'New epic from Azure',
          'System.State': 'New',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncEpicFromAzure(789);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicAzureSyncMapPath,
        expect.objectContaining({
          'epic-to-azure': expect.any(Object),
          'azure-to-epic': { '789': expect.any(String) }
        }),
        { spaces: 2 }
      );
    });

    it('should generate epic name from title', async () => {
      mockProvider.getWorkItem.mockResolvedValue({
        id: 999,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Payment Integration Feature',
          'System.Description': 'Epic content',
          'System.State': 'New',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      });

      fs.pathExists.mockResolvedValue(false);
      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicFromAzure(999);

      expect(result.epicName).toBe('payment-integration-feature');
    });

    it('should handle provider errors', async () => {
      mockProvider.getWorkItem.mockRejectedValue(new Error('Work item not found'));

      await expect(service.syncEpicFromAzure(999))
        .rejects
        .toThrow('Work item not found');
    });
  });

  // ==========================================
  // 3. syncEpicBidirectionalAzure(epicName, options)
  // ==========================================

  describe('syncEpicBidirectionalAzure', () => {
    it('should push to Azure when no mapping exists', async () => {
      const epicContent = `---
name: user-auth
status: planning
---

# Epic: User Authentication`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      // No mapping exists
      fs.readJSON = jest.fn().mockImplementation((filePath) => {
        if (filePath.includes('epic-azure-sync-map.json')) {
          return Promise.resolve({
            'epic-to-azure': {},
            'azure-to-epic': {},
            'metadata': {}
          });
        }
        return Promise.resolve({});
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.createWorkItem.mockResolvedValue({
        id: 100,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication'
        }
      });

      const result = await service.syncEpicBidirectionalAzure('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-azure');
      expect(mockProvider.createWorkItem).toHaveBeenCalled();
    });

    it('should auto-resolve using newest timestamp', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
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

      const result = await service.syncEpicBidirectionalAzure('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-azure');
      expect(mockProvider.updateWorkItem).toHaveBeenCalled();
    });

    it('should return conflict when strategy is detect', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Azure Modified',
          'System.ChangedDate': '2025-10-14T11:30:00Z'
        }
      });

      const result = await service.syncEpicBidirectionalAzure('user-auth', { conflictStrategy: 'detect' });

      expect(result.direction).toBe('conflict');
      expect(result.conflict).toBeDefined();
    });

    it('should sync in correct direction based on timestamps', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);
      fs.ensureDir = jest.fn().mockResolvedValue(undefined);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Azure Newer',
          'System.Description': 'Updated on Azure',
          'System.State': 'Active',
          'System.CreatedDate': '2025-10-14T09:00:00Z',
          'System.ChangedDate': '2025-10-14T12:00:00Z'
        }
      });

      const result = await service.syncEpicBidirectionalAzure('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('from-azure');
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 4. createAzureEpic(epicData)
  // ==========================================

  describe('createAzureEpic', () => {
    it('should create Epic work item with correct data', async () => {
      const epicData = {
        name: 'user-auth',
        title: 'User Authentication',
        overview: 'Implement secure auth',
        tasks: [
          { title: 'Setup OAuth', status: 'open' },
          { title: 'Add JWT', status: 'open' }
        ],
        priority: 'P1'
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 200,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication',
          'System.Tags': 'priority:P1'
        }
      });

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.createAzureEpic(epicData);

      expect(result.id).toBe(200);
      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'Epic',
        expect.objectContaining({
          title: 'User Authentication',
          tags: 'priority:P1'
        })
      );
    });

    it('should set Work Item Type to Epic', async () => {
      const epicData = {
        name: 'test-epic',
        title: 'Test Epic',
        overview: 'Test',
        tasks: []
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 200,
        fields: {
          'System.WorkItemType': 'Epic'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createAzureEpic(epicData);

      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'Epic',
        expect.any(Object)
      );
    });

    it('should map priority to tags', async () => {
      const epicData = {
        name: 'test-epic',
        title: 'Test',
        overview: 'Test',
        priority: 'P0',
        tasks: []
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 200,
        fields: {
          'System.WorkItemType': 'Epic'
        }
      });

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createAzureEpic(epicData);

      expect(mockProvider.createWorkItem).toHaveBeenCalledWith(
        'Epic',
        expect.objectContaining({
          tags: 'priority:P0'
        })
      );
    });

    it('should update epic-azure-sync-map with work item ID', async () => {
      const epicData = {
        name: 'user-auth',
        title: 'Test',
        overview: 'Test',
        tasks: []
      };

      mockProvider.createWorkItem.mockResolvedValue({
        id: 300,
        fields: {
          'System.WorkItemType': 'Epic'
        }
      });

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createAzureEpic(epicData);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicAzureSyncMapPath,
        expect.objectContaining({
          'epic-to-azure': { 'user-auth': '300' },
          'azure-to-epic': { '300': 'user-auth' },
          'metadata': expect.objectContaining({
            'user-auth': expect.objectContaining({
              workItemId: '300',
              workItemType: 'Epic'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });

  // ==========================================
  // 5. updateAzureEpic(workItemId, epicData)
  // ==========================================

  describe('updateAzureEpic', () => {
    it('should update epic work item with changed fields', async () => {
      const epicData = {
        title: 'Updated Epic Title',
        overview: 'Updated overview',
        tasks: [
          { title: 'New task', status: 'open' }
        ]
      };

      mockProvider.updateWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Updated Epic Title',
          'System.ChangedDate': '2025-10-14T13:00:00Z'
        }
      });

      const result = await service.updateAzureEpic(123, epicData);

      expect(result.id).toBe(123);
      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123, expect.any(Object));
    });

    it('should map status correctly', async () => {
      const statusMappings = [
        { localStatus: 'planning', azureState: 'New' },
        { localStatus: 'in-progress', azureState: 'Active' },
        { localStatus: 'done', azureState: 'Resolved' },
        { localStatus: 'closed', azureState: 'Closed' }
      ];

      mockProvider.updateWorkItem.mockResolvedValue({ id: 123 });

      for (const mapping of statusMappings) {
        jest.clearAllMocks();

        const epicData = {
          title: 'Test',
          status: mapping.localStatus,
          tasks: []
        };

        await service.updateAzureEpic(123, epicData);

        expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123,
          expect.objectContaining({
            state: mapping.azureState
          })
        );
      }
    });

    it('should handle partial updates', async () => {
      const epicData = {
        overview: 'Only overview update'
      };

      mockProvider.updateWorkItem.mockResolvedValue({ id: 123 });

      await service.updateAzureEpic(123, epicData);

      expect(mockProvider.updateWorkItem).toHaveBeenCalledWith(123,
        expect.objectContaining({
          description: expect.stringContaining('Only overview update')
        })
      );
    });
  });

  // ==========================================
  // 6. getEpicAzureSyncStatus(epicName)
  // ==========================================

  describe('getEpicAzureSyncStatus', () => {
    it('should return not-synced when no mapping', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.getEpicAzureSyncStatus('user-auth');

      expect(result.synced).toBe(false);
      expect(result.epicName).toBe('user-auth');
      expect(result.workItemId).toBeNull();
      expect(result.status).toBe('not-synced');
    });

    it('should return synced when timestamps match', async () => {
      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            workItemId: '123',
            workItemType: 'Epic'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service.getEpicAzureSyncStatus('user-auth');

      expect(result.synced).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.workItemId).toBe('123');
      expect(result.lastSync).toBe('2025-10-14T10:00:00Z');
      expect(result.status).toBe('synced');
    });

    it('should return out-of-sync when timestamps differ', async () => {
      const localEpic = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localEpic);

      mockProvider.getWorkItem.mockResolvedValue({
        id: 123,
        fields: {
          'System.ChangedDate': '2025-10-14T13:00:00Z'
        }
      });

      const result = await service.getEpicAzureSyncStatus('user-auth');

      expect(result.synced).toBe(false);
      expect(result.status).toBe('out-of-sync');
    });
  });

  // ==========================================
  // HELPER METHODS (Private)
  // ==========================================

  describe('_loadAzureEpicSyncMap', () => {
    it('should load existing epic-azure-sync-map', async () => {
      const existingSyncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service._loadAzureEpicSyncMap();

      expect(result).toEqual(existingSyncMap);
      expect(fs.readJSON).toHaveBeenCalledWith(epicAzureSyncMapPath);
    });

    it('should return default structure if epic-azure-sync-map does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service._loadAzureEpicSyncMap();

      expect(result).toEqual({
        'epic-to-azure': {},
        'azure-to-epic': {},
        'metadata': {}
      });
    });
  });

  describe('_saveAzureEpicSyncMap', () => {
    it('should save epic-azure-sync-map to file', async () => {
      const syncMap = {
        'epic-to-azure': { 'user-auth': '123' },
        'azure-to-epic': { '123': 'user-auth' },
        'metadata': {}
      };

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._saveAzureEpicSyncMap(syncMap);

      expect(fs.writeJSON).toHaveBeenCalledWith(epicAzureSyncMapPath, syncMap, { spaces: 2 });
    });
  });

  describe('_updateAzureEpicSyncMap', () => {
    it('should update epic-azure-sync-map with new mapping', async () => {
      const existingSyncMap = {
        'epic-to-azure': {},
        'azure-to-epic': {},
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._updateAzureEpicSyncMap('user-auth', '123');

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicAzureSyncMapPath,
        expect.objectContaining({
          'epic-to-azure': { 'user-auth': '123' },
          'azure-to-epic': { '123': 'user-auth' },
          'metadata': expect.objectContaining({
            'user-auth': expect.objectContaining({
              lastSync: expect.any(String),
              workItemId: '123',
              workItemType: 'Epic'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });

  describe('_formatEpicForAzure', () => {
    it('should format epic data as Azure work item description', () => {
      const epicData = {
        overview: 'Test overview',
        tasks: [
          { title: 'Task 1', status: 'open' },
          { title: 'Task 2', status: 'closed' }
        ]
      };

      const result = service._formatEpicForAzure(epicData);

      expect(result).toContain('Test overview');
      expect(result).toContain('## Tasks');
      expect(result).toContain('- [ ] Task 1');
      expect(result).toContain('- [x] Task 2');
    });

    it('should handle empty task list', () => {
      const epicData = {
        overview: 'Test',
        tasks: []
      };

      const result = service._formatEpicForAzure(epicData);

      expect(result).toContain('Test');
      expect(result).toContain('## Tasks');
      expect(result).toContain('No tasks defined');
    });

    it('should include overview section', () => {
      const epicData = {
        overview: 'Epic overview content',
        tasks: [{ title: 'Task', status: 'open' }]
      };

      const result = service._formatEpicForAzure(epicData);

      expect(result).toContain('Epic overview content');
    });
  });

  describe('_parseAzureEpic', () => {
    it('should parse Azure work item to epic format', () => {
      const azureWorkItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'User Authentication',
          'System.Description': `Implement auth

## Tasks
- [ ] Task 1
- [x] Task 2`,
          'System.Tags': 'priority:P1',
          'System.State': 'New',
          'System.CreatedDate': '2025-10-14T10:00:00Z',
          'System.ChangedDate': '2025-10-14T11:00:00Z'
        }
      };

      const result = service._parseAzureEpic(azureWorkItem);

      expect(result.name).toBe('user-authentication');
      expect(result.title).toBe('User Authentication');
      expect(result.overview).toContain('Implement auth');
      expect(result.priority).toBe('P1');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].status).toBe('open');
      expect(result.tasks[1].status).toBe('closed');
    });

    it('should extract tasks from description checkboxes', () => {
      const azureWorkItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Test',
          'System.Description': `## Tasks
- [ ] Setup infrastructure
- [x] Implement API
- [ ] Add tests`,
          'System.State': 'New'
        }
      };

      const result = service._parseAzureEpic(azureWorkItem);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]).toEqual({ title: 'Setup infrastructure', status: 'open' });
      expect(result.tasks[1]).toEqual({ title: 'Implement API', status: 'closed' });
      expect(result.tasks[2]).toEqual({ title: 'Add tests', status: 'open' });
    });

    it('should handle missing sections gracefully', () => {
      const azureWorkItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Minimal Epic',
          'System.Description': 'Just content',
          'System.State': 'New'
        }
      };

      const result = service._parseAzureEpic(azureWorkItem);

      expect(result.name).toBeDefined();
      expect(result.tasks).toEqual([]);
    });
  });

  describe('_detectAzureEpicConflict', () => {
    it('should detect no conflict when timestamps match', () => {
      const localEpic = {
        title: 'Epic',
        status: 'planning',
        updated: '2025-10-14T10:00:00Z'
      };

      const azureWorkItem = {
        id: 123,
        fields: {
          'System.WorkItemType': 'Epic',
          'System.Title': 'Epic',
          'System.State': 'New',
          'System.ChangedDate': '2025-10-14T10:00:00Z'
        }
      };

      const result = service._detectAzureEpicConflict(localEpic, azureWorkItem);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should detect conflict when local is newer', () => {
      const localEpic = {
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

      const result = service._detectAzureEpicConflict(localEpic, azureWorkItem);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(true);
      expect(result.remoteNewer).toBe(false);
    });

    it('should detect conflict when remote is newer', () => {
      const localEpic = {
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

      const result = service._detectAzureEpicConflict(localEpic, azureWorkItem);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(false);
      expect(result.remoteNewer).toBe(true);
    });
  });
});
