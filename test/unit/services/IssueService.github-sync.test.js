/**
 * IssueService GitHub Sync Tests
 *
 * Test-Driven Development (TDD) tests for GitHub synchronization methods
 *
 * Context7 Documentation Applied:
 * - mcp://context7/github/issues-api - GitHub Issues API v3 best practices
 * - mcp://context7/nodejs/testing-jest - Jest testing patterns
 * - mcp://context7/agile/issue-sync - Issue synchronization patterns
 * - mcp://context7/conflict-resolution - Conflict resolution strategies
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 *
 * Coverage Target: 95%+ for all 8 new GitHub sync methods
 */

const IssueService = require('../../../lib/services/IssueService');
const GitHubProvider = require('../../../lib/providers/GitHubProvider');
const fs = require('../../../lib/utils/fs');
const path = require('path');

// Mock dependencies
jest.mock('../../../lib/utils/fs');
jest.mock('../../../lib/providers/GitHubProvider');

describe('IssueService - GitHub Synchronization', () => {
  let service;
  let mockProvider;
  const syncMapPath = path.join(process.cwd(), '.claude/sync-map.json');

  beforeEach(() => {
    // Create mock GitHub provider
    mockProvider = {
      getIssue: jest.fn(),
      createIssue: jest.fn(),
      updateIssue: jest.fn(),
      listIssues: jest.fn()
    };

    service = new IssueService({ provider: mockProvider });
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. syncToGitHub(issueNumber, options)
  // ==========================================

  describe('syncToGitHub', () => {
    it('should create new GitHub issue if not synced before', async () => {
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

      // Mock sync-map (no existing mapping)
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      // Mock GitHub creation
      mockProvider.createIssue.mockResolvedValue({
        number: 123,
        title: 'New Feature',
        state: 'open',
        updated_at: '2025-10-14T10:05:00Z'
      });

      // Mock sync-map write
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncToGitHub(1);

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe('1');
      expect(result.githubNumber).toBe('123'); // Stringified
      expect(result.action).toBe('created');
      expect(mockProvider.createIssue).toHaveBeenCalled();
    });

    it('should update existing GitHub issue if already synced', async () => {
      const localIssue = `---
id: 1
title: Updated Feature
status: in-progress
updated: 2025-10-14T11:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      // Mock sync-map with existing mapping
      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z',
            githubNumber: '123'
          }
        }
      };

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('sync-map.json')) return Promise.resolve(true);
        return Promise.resolve(true);
      });
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateIssue.mockResolvedValue({
        number: 123,
        title: 'Updated Feature',
        state: 'open',
        updated_at: '2025-10-14T11:05:00Z'
      });

      const result = await service.syncToGitHub(1);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockProvider.updateIssue).toHaveBeenCalledWith('123', expect.any(Object)); // Stringified
    });

    it('should handle conflicts when GitHub issue is newer', async () => {
      const localIssue = `---
id: 1
title: Feature
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T09:00:00Z',
            githubUpdatedAt: '2025-10-14T11:00:00Z',
            localUpdatedAt: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      // Mock GitHub issue that's newer
      mockProvider.getIssue = jest.fn().mockResolvedValue({
        number: 123,
        updated_at: '2025-10-14T11:00:00Z',
        title: 'Feature (updated on GitHub)'
      });

      const result = await service.syncToGitHub(1, { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.remoteNewer).toBe(true);
    });

    it('should throw error if local issue not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.syncToGitHub(999))
        .rejects
        .toThrow('Issue not found: 999');
    });
  });

  // ==========================================
  // 2. syncFromGitHub(githubNumber, options)
  // ==========================================

  describe('syncFromGitHub', () => {
    it('should create new local issue from GitHub', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Issue',
        body: 'Issue from GitHub',
        state: 'open',
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T10:00:00Z',
        labels: [{ name: 'bug' }],
        assignees: [{ login: 'developer' }]
      });

      // No existing sync-map
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('sync-map.json')) return Promise.resolve(false);
        if (filePath.includes('issues/123.md')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncFromGitHub(123);

      expect(result.success).toBe(true);
      expect(result.localNumber).toBeDefined();
      expect(result.githubNumber).toBe('123');
      expect(result.action).toBe('created');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update existing local issue from GitHub', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'Updated from GitHub',
        body: 'Updated content',
        state: 'closed',
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T12:00:00Z'
      });

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncFromGitHub(123);

      expect(result.success).toBe(true);
      expect(result.localNumber).toBe('1');
      expect(result.action).toBe('updated');
    });

    it('should handle conflict when local issue is newer', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Issue',
        updated_at: '2025-10-14T10:00:00Z'
      });

      const localIssue = `---
id: 1
title: Local Issue
updated: 2025-10-14T11:00:00Z
---`;

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            localUpdatedAt: '2025-10-14T11:00:00Z',
            githubUpdatedAt: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localIssue);

      const result = await service.syncFromGitHub(123, { detectConflicts: true });

      expect(result.conflict).toBeDefined();
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should throw error if GitHub issue not found', async () => {
      mockProvider.getIssue.mockRejectedValue(new Error('Not found'));

      await expect(service.syncFromGitHub(999))
        .rejects
        .toThrow('Not found');
    });
  });

  // ==========================================
  // 3. syncBidirectional(issueNumber, options)
  // ==========================================

  describe('syncBidirectional', () => {
    it('should sync to GitHub when local is newer', async () => {
      const localIssue = `---
id: 1
title: Local Newer
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            githubUpdatedAt: '2025-10-14T10:00:00Z',
            localUpdatedAt: '2025-10-14T12:00:00Z'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        updated_at: '2025-10-14T10:00:00Z'
      });

      mockProvider.updateIssue.mockResolvedValue({
        number: 123,
        updated_at: '2025-10-14T12:05:00Z'
      });

      const result = await service.syncBidirectional(1);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-github');
      expect(mockProvider.updateIssue).toHaveBeenCalled();
    });

    it('should sync from GitHub when remote is newer', async () => {
      const localIssue = `---
id: 1
title: Remote Newer
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            githubUpdatedAt: '2025-10-14T12:00:00Z',
            localUpdatedAt: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Newer',
        updated_at: '2025-10-14T12:00:00Z'
      });

      const result = await service.syncBidirectional(1);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('from-github');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should detect conflict when both modified', async () => {
      const localIssue = `---
id: 1
title: Both Modified
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T09:00:00Z',
            githubUpdatedAt: '2025-10-14T11:30:00Z',
            localUpdatedAt: '2025-10-14T12:00:00Z'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Modified',
        updated_at: '2025-10-14T11:30:00Z'
      });

      const result = await service.syncBidirectional(1, { conflictStrategy: 'detect' });

      expect(result.direction).toBe('conflict');
      expect(result.conflict).toBeDefined();
    });
  });

  // ==========================================
  // 4. createGitHubIssue(issueData)
  // ==========================================

  describe('createGitHubIssue', () => {
    it('should create GitHub issue from local data', async () => {
      const issueData = {
        id: '1',
        title: 'New GitHub Issue',
        content: 'Issue description',
        status: 'open',
        labels: 'bug, feature'
      };

      mockProvider.createIssue.mockResolvedValue({
        number: 456,
        title: 'New GitHub Issue',
        state: 'open',
        html_url: 'https://github.com/owner/repo/issues/456'
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.createGitHubIssue(issueData);

      expect(result.number).toBe(456);
      expect(mockProvider.createIssue).toHaveBeenCalledWith({
        title: 'New GitHub Issue',
        body: 'Issue description',
        labels: ['bug', 'feature'],
        state: 'open'
      });
    });

    it('should map local fields to GitHub format', async () => {
      const issueData = {
        title: 'Test',
        content: 'Body text',
        status: 'closed',
        labels: 'label1, label2',
        assignee: 'developer1'
      };

      mockProvider.createIssue.mockResolvedValue({ number: 789 });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createGitHubIssue(issueData);

      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test',
          body: 'Body text',
          state: 'closed',
          labels: ['label1', 'label2'],
          assignees: ['developer1']
        })
      );
    });

    it('should update sync-map after creation', async () => {
      const issueData = { id: '5', title: 'Test', content: 'Content' };

      mockProvider.createIssue.mockResolvedValue({ number: 999 });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createGitHubIssue(issueData);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-github': { '5': '999' },
          'github-to-local': { '999': '5' }
        }),
        { spaces: 2 }
      );
    });
  });

  // ==========================================
  // 5. updateGitHubIssue(githubNumber, issueData)
  // ==========================================

  describe('updateGitHubIssue', () => {
    it('should update GitHub issue with local data', async () => {
      const issueData = {
        title: 'Updated Title',
        content: 'Updated content',
        status: 'in-progress'
      };

      mockProvider.updateIssue.mockResolvedValue({
        number: 123,
        title: 'Updated Title',
        state: 'open',
        updated_at: '2025-10-14T13:00:00Z'
      });

      const result = await service.updateGitHubIssue(123, issueData);

      expect(result.number).toBe(123);
      expect(mockProvider.updateIssue).toHaveBeenCalledWith(123, {
        title: 'Updated Title',
        body: 'Updated content',
        state: 'open' // in-progress maps to open
      });
    });

    it('should map closed statuses correctly', async () => {
      const issueData = {
        title: 'Closed Issue',
        status: 'completed'
      };

      mockProvider.updateIssue.mockResolvedValue({ number: 123 });

      await service.updateGitHubIssue(123, issueData);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(123,
        expect.objectContaining({
          state: 'closed'
        })
      );
    });

    it('should handle partial updates', async () => {
      const issueData = {
        title: 'Only Title Update'
      };

      mockProvider.updateIssue.mockResolvedValue({ number: 123 });

      await service.updateGitHubIssue(123, issueData);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(123, {
        title: 'Only Title Update'
      });
    });
  });

  // ==========================================
  // 6. detectConflict(localIssue, githubIssue)
  // ==========================================

  describe('detectConflict', () => {
    it('should detect no conflict when timestamps match', () => {
      const localIssue = {
        title: 'Issue',
        status: 'open',
        updated: '2025-10-14T10:00:00Z'
      };

      const githubIssue = {
        title: 'Issue',
        state: 'open',
        updated_at: '2025-10-14T10:00:00Z'
      };

      const result = service.detectConflict(localIssue, githubIssue);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should detect local is newer', () => {
      const localIssue = {
        title: 'Local Version',
        updated: '2025-10-14T12:00:00Z'
      };

      const githubIssue = {
        title: 'GitHub Version',
        updated_at: '2025-10-14T10:00:00Z'
      };

      const result = service.detectConflict(localIssue, githubIssue);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(true);
      expect(result.remoteNewer).toBe(false);
    });

    it('should detect remote is newer', () => {
      const localIssue = {
        title: 'Local',
        updated: '2025-10-14T10:00:00Z'
      };

      const githubIssue = {
        title: 'GitHub',
        updated_at: '2025-10-14T12:00:00Z'
      };

      const result = service.detectConflict(localIssue, githubIssue);

      expect(result.hasConflict).toBe(true);
      expect(result.localNewer).toBe(false);
      expect(result.remoteNewer).toBe(true);
    });

    it('should detect conflicting fields', () => {
      const localIssue = {
        title: 'Local Title',
        status: 'in-progress',
        updated: '2025-10-14T11:00:00Z'
      };

      const githubIssue = {
        title: 'GitHub Title',
        state: 'closed',
        updated_at: '2025-10-14T11:00:00Z'
      };

      const result = service.detectConflict(localIssue, githubIssue);

      expect(result.conflictFields).toContain('title');
      expect(result.conflictFields).toContain('status');
    });
  });

  // ==========================================
  // 7. resolveConflict(issueNumber, strategy)
  // ==========================================

  describe('resolveConflict', () => {
    it('should resolve conflict using "local" strategy', async () => {
      const localIssue = `---
id: 1
title: Local Version
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateIssue.mockResolvedValue({
        number: 123,
        title: 'Local Version'
      });

      const result = await service.resolveConflict(1, 'local');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('local');
      expect(mockProvider.updateIssue).toHaveBeenCalled();
    });

    it('should resolve conflict using "remote" strategy', async () => {
      fs.pathExists.mockResolvedValue(true);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Version',
        body: 'GitHub content',
        state: 'open',
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T12:00:00Z'
      });

      const result = await service.resolveConflict(1, 'remote');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('remote');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should resolve conflict using "newest" strategy', async () => {
      const localIssue = `---
id: 1
title: Local Version
updated: 2025-10-14T13:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localIssue);

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        title: 'GitHub Version',
        updated_at: '2025-10-14T12:00:00Z'
      });

      mockProvider.updateIssue.mockResolvedValue({
        number: 123,
        title: 'Local Version'
      });

      const result = await service.resolveConflict(1, 'newest');

      expect(result.resolved).toBe(true);
      expect(result.appliedStrategy).toBe('newest');
      // Should use local since it's newer
      expect(mockProvider.updateIssue).toHaveBeenCalled();
    });

    it('should return manual resolution needed for "manual" strategy', async () => {
      const result = await service.resolveConflict(1, 'manual');

      expect(result.resolved).toBe(false);
      expect(result.appliedStrategy).toBe('manual');
      expect(result.requiresManualResolution).toBe(true);
    });

    it('should throw error for invalid strategy', async () => {
      await expect(service.resolveConflict(1, 'invalid'))
        .rejects
        .toThrow('Invalid conflict resolution strategy');
    });
  });

  // ==========================================
  // 8. getSyncStatus(issueNumber)
  // ==========================================

  describe('getSyncStatus', () => {
    it('should return synced status for mapped issue', async () => {
      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            githubNumber: '123'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service.getSyncStatus(1);

      expect(result.synced).toBe(true);
      expect(result.localNumber).toBe('1');
      expect(result.githubNumber).toBe('123');
      expect(result.lastSync).toBe('2025-10-14T10:00:00Z');
      expect(result.status).toBe('synced');
    });

    it('should return not synced for unmapped issue', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.getSyncStatus(1);

      expect(result.synced).toBe(false);
      expect(result.localNumber).toBe('1');
      expect(result.githubNumber).toBeNull();
      expect(result.status).toBe('not-synced');
    });

    it('should detect out of sync status', async () => {
      const localIssue = `---
id: 1
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {
          '1': {
            lastSync: '2025-10-14T10:00:00Z',
            localUpdatedAt: '2025-10-14T12:00:00Z',
            githubUpdatedAt: '2025-10-14T11:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localIssue);

      mockProvider.getIssue.mockResolvedValue({
        number: 123,
        updated_at: '2025-10-14T13:00:00Z'
      });

      const result = await service.getSyncStatus(1);

      expect(result.synced).toBe(false);
      expect(result.status).toBe('out-of-sync');
    });
  });

  // ==========================================
  // HELPER METHODS (Private)
  // ==========================================

  describe('_loadSyncMap', () => {
    it('should load existing sync-map', async () => {
      const existingSyncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service._loadSyncMap();

      expect(result).toEqual(existingSyncMap);
      expect(fs.readJSON).toHaveBeenCalledWith(syncMapPath);
    });

    it('should return default structure if sync-map does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service._loadSyncMap();

      expect(result).toEqual({
        'local-to-github': {},
        'github-to-local': {},
        'metadata': {}
      });
    });
  });

  describe('_saveSyncMap', () => {
    it('should save sync-map to file', async () => {
      const syncMap = {
        'local-to-github': { '1': '123' },
        'github-to-local': { '123': '1' },
        'metadata': {}
      };

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._saveSyncMap(syncMap);

      expect(fs.writeJSON).toHaveBeenCalledWith(syncMapPath, syncMap, { spaces: 2 });
    });
  });

  describe('_updateSyncMap', () => {
    it('should update sync-map with new mapping', async () => {
      const existingSyncMap = {
        'local-to-github': {},
        'github-to-local': {},
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._updateSyncMap('5', '500');

      expect(fs.writeJSON).toHaveBeenCalledWith(
        syncMapPath,
        expect.objectContaining({
          'local-to-github': { '5': '500' },
          'github-to-local': { '500': '5' },
          'metadata': expect.objectContaining({
            '5': expect.objectContaining({
              lastSync: expect.any(String),
              githubNumber: '500'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });
});
