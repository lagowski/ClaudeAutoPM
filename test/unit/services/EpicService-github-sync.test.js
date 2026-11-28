/**
 * EpicService GitHub Sync Tests
 *
 * Test-Driven Development (TDD) tests for GitHub epic synchronization methods
 *
 * Context7 Documentation Applied:
 * - mcp://context7/github/issues-api - GitHub Issues API v3 best practices
 * - mcp://context7/nodejs/testing-jest - Jest testing patterns
 * - mcp://context7/agile/epic-management - Epic management and sync patterns
 * - mcp://context7/conflict-resolution - Conflict resolution strategies
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 *
 * Coverage Target: 95%+ for all 6 new GitHub epic sync methods
 *
 * Epic-specific considerations:
 * - Epics are directories with epic.md file and task files
 * - Epic GitHub representation: issue with "epic" label
 * - Tasks represented as checkboxes in GitHub issue body
 * - Epic frontmatter includes task progress
 */

const EpicService = require('../../../lib/services/EpicService');
const GitHubProvider = require('../../../lib/providers/GitHubProvider');
const fs = require('../../../lib/utils/fs');
const path = require('path');

// Mock dependencies
jest.mock('../../../lib/utils/fs');
jest.mock('../../../lib/providers/GitHubProvider');

describe('EpicService - GitHub Epic Synchronization', () => {
  let service;
  let mockProvider;
  const epicSyncMapPath = path.join(process.cwd(), '.claude/epic-sync-map.json');
  const testEpicPath = path.join(process.cwd(), '.claude/epics/user-auth');
  const testEpicFilePath = path.join(testEpicPath, 'epic.md');

  beforeEach(() => {
    // Create mock GitHub provider
    mockProvider = {
      getIssue: jest.fn(),
      createIssue: jest.fn(),
      updateIssue: jest.fn(),
      addLabels: jest.fn(),
      listIssues: jest.fn()
    };

    service = new EpicService({ provider: mockProvider });
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. syncEpicToGitHub(epicName, options)
  // ==========================================

  describe('syncEpicToGitHub', () => {
    it('should create new GitHub epic if not synced before', async () => {
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
        if (filePath.includes('epic-sync-map.json')) return Promise.resolve(false);
        if (filePath === testEpicFilePath) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      fs.readFile.mockResolvedValue(epicContent);

      // Mock GitHub creation with "epic" label
      mockProvider.createIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: User Authentication',
        state: 'open',
        labels: ['epic', 'priority:P1'],
        updated_at: '2025-10-14T10:05:00Z'
      });

      // Mock sync-map write
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicToGitHub('user-auth');

      expect(result.success).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.githubNumber).toBe('100');
      expect(result.action).toBe('created');
      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['epic'])
        })
      );
    });

    it('should update existing GitHub epic if already synced', async () => {
      const epicContent = `---
name: user-auth
status: in-progress
priority: P1
progress: 30%
updated: 2025-10-14T11:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      // Mock sync-map with existing mapping
      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            githubNumber: '100'
          }
        }
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.updateIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: User Authentication',
        state: 'open',
        updated_at: '2025-10-14T11:05:00Z'
      });

      const result = await service.syncEpicToGitHub('user-auth');

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockProvider.updateIssue).toHaveBeenCalledWith('100', expect.any(Object));
    });

    it('should include task checkboxes in GitHub epic body', async () => {
      const epicContent = `---
name: user-auth
status: planning
---

# Epic: User Authentication

## Tasks
- [ ] Task 1: Setup
- [x] Task 2: Completed task`;

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-sync-map.json')) return Promise.resolve(false);
        if (filePath === testEpicFilePath) return Promise.resolve(true);
        return Promise.resolve(false);
      });
      fs.readFile.mockResolvedValue(epicContent);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.createIssue.mockResolvedValue({
        number: 100,
        labels: ['epic']
      });

      await service.syncEpicToGitHub('user-auth');

      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('- [ ] Task 1: Setup')
        })
      );
      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('- [x] Task 2: Completed task')
        })
      );
    });

    it('should add priority labels to GitHub epic', async () => {
      const epicContent = `---
name: user-auth
priority: P1
---

# Epic: User Authentication`;

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });
      fs.readFile.mockResolvedValue(epicContent);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.createIssue.mockResolvedValue({ number: 100 });

      await service.syncEpicToGitHub('user-auth');

      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['epic', 'priority:P1'])
        })
      );
    });

    it('should throw error if epic not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.syncEpicToGitHub('non-existent'))
        .rejects
        .toThrow('Epic not found: non-existent');
    });

    it('should throw error if no provider configured', async () => {
      const serviceNoProvider = new EpicService({ provider: null });

      await expect(serviceNoProvider.syncEpicToGitHub('user-auth'))
        .rejects
        .toThrow('No provider configured for GitHub sync');
    });

    it('should handle conflicts when GitHub epic is newer', async () => {
      const epicContent = `---
name: user-auth
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        updated_at: '2025-10-14T11:00:00Z',
        title: 'Epic: Updated on GitHub'
      });

      const result = await service.syncEpicToGitHub('user-auth', { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict.remoteNewer).toBe(true);
    });
  });

  // ==========================================
  // 2. syncEpicFromGitHub(githubNumber, options)
  // ==========================================

  describe('syncEpicFromGitHub', () => {
    it('should create new local epic from GitHub', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: New Feature',
        body: `## Overview
Implement new feature

## Task Breakdown
- [ ] Task 1: Setup
- [ ] Task 2: Implementation`,
        state: 'open',
        labels: [{ name: 'epic' }, { name: 'priority:P1' }],
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T10:00:00Z'
      });

      // No existing sync-map
      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicFromGitHub(100);

      expect(result.success).toBe(true);
      expect(result.epicName).toBeDefined();
      expect(result.githubNumber).toBe('100');
      expect(result.action).toBe('created');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update existing local epic from GitHub', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: Updated Feature',
        body: 'Updated content',
        state: 'open',
        labels: [{ name: 'epic' }],
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T12:00:00Z'
      });

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncEpicFromGitHub(100);

      expect(result.success).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.action).toBe('updated');
    });

    it('should parse GitHub checkboxes as tasks', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: Test',
        body: `## Task Breakdown
- [ ] Task 1: Setup infrastructure
- [x] Task 2: Implement API
- [ ] Task 3: Add tests`,
        state: 'open',
        labels: [{ name: 'epic' }],
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T10:00:00Z'
      });

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('epic-sync-map.json')) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncEpicFromGitHub(100);

      // Check that epic.md was written with task content
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('- [ ] Task 1: Setup infrastructure')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('- [x] Task 2: Implement API')
      );
    });

    it('should extract priority from GitHub labels', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: Test',
        body: 'Content',
        state: 'open',
        labels: [
          { name: 'epic' },
          { name: 'priority:P0' }
        ],
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T10:00:00Z'
      });

      fs.pathExists.mockResolvedValue(false);
      fs.ensureDir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.syncEpicFromGitHub(100);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('priority: P0')
      );
    });

    it('should handle conflict when local epic is newer', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: GitHub Version',
        updated_at: '2025-10-14T10:00:00Z',
        labels: [{ name: 'epic' }]
      });

      const localEpic = `---
name: user-auth
updated: 2025-10-14T11:00:00Z
---`;

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localEpic);

      const result = await service.syncEpicFromGitHub(100, { detectConflicts: true });

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict.localNewer).toBe(true);
    });

    it('should throw error if GitHub epic not found', async () => {
      mockProvider.getIssue.mockRejectedValue(new Error('Not found'));

      await expect(service.syncEpicFromGitHub(999))
        .rejects
        .toThrow('Not found');
    });

    it('should throw error if GitHub issue is not an epic', async () => {
      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Regular Issue',
        labels: [{ name: 'bug' }] // No "epic" label
      });

      await expect(service.syncEpicFromGitHub(100))
        .rejects
        .toThrow('GitHub issue #100 is not an epic');
    });
  });

  // ==========================================
  // 3. syncEpicBidirectional(epicName, options)
  // ==========================================

  describe('syncEpicBidirectional', () => {
    it('should sync to GitHub when local is newer', async () => {
      const localEpic = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localEpic);

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        updated_at: '2025-10-14T10:00:00Z',
        labels: [{ name: 'epic' }]
      });

      mockProvider.updateIssue.mockResolvedValue({
        number: 100,
        updated_at: '2025-10-14T12:05:00Z'
      });

      const result = await service.syncEpicBidirectional('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-github');
      expect(mockProvider.updateIssue).toHaveBeenCalled();
    });

    it('should sync from GitHub when remote is newer', async () => {
      const localEpic = `---
name: user-auth
updated: 2025-10-14T10:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localEpic);

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: GitHub Newer',
        updated_at: '2025-10-14T12:00:00Z',
        labels: [{ name: 'epic' }],
        body: 'Updated content'
      });

      const result = await service.syncEpicBidirectional('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('from-github');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should detect conflict when strategy is detect', async () => {
      const localEpic = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localEpic);

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: GitHub Modified',
        updated_at: '2025-10-14T11:30:00Z',
        labels: [{ name: 'epic' }]
      });

      const result = await service.syncEpicBidirectional('user-auth', { conflictStrategy: 'detect' });

      expect(result.direction).toBe('conflict');
      expect(result.conflict).toBeDefined();
    });

    it('should push to GitHub if not synced before', async () => {
      const localEpic = `---
name: user-auth
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(localEpic);

      // No existing mapping
      fs.readJSON = jest.fn().mockImplementation((filePath) => {
        if (filePath.includes('epic-sync-map.json')) {
          return Promise.resolve({
            'epic-to-github': {},
            'github-to-epic': {},
            'metadata': {}
          });
        }
        return Promise.resolve({});
      });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      mockProvider.createIssue.mockResolvedValue({
        number: 100,
        labels: ['epic']
      });

      const result = await service.syncEpicBidirectional('user-auth');

      expect(result.success).toBe(true);
      expect(result.direction).toBe('to-github');
      expect(mockProvider.createIssue).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 4. createGitHubEpic(epicData)
  // ==========================================

  describe('createGitHubEpic', () => {
    it('should create GitHub epic with epic label', async () => {
      const epicData = {
        name: 'user-auth',
        title: 'User Authentication',
        overview: 'Implement secure auth',
        tasks: [
          { title: 'Setup', status: 'open' },
          { title: 'Implementation', status: 'open' }
        ]
      };

      mockProvider.createIssue.mockResolvedValue({
        number: 200,
        title: 'Epic: User Authentication',
        labels: ['epic']
      });

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      const result = await service.createGitHubEpic(epicData);

      expect(result.number).toBe(200);
      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['epic'])
        })
      );
    });

    it('should format tasks as checkboxes in body', async () => {
      const epicData = {
        name: 'test-epic',
        title: 'Test Epic',
        overview: 'Test',
        tasks: [
          { title: 'Task 1', status: 'open' },
          { title: 'Task 2', status: 'closed' }
        ]
      };

      mockProvider.createIssue.mockResolvedValue({ number: 200 });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createGitHubEpic(epicData);

      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringMatching(/- \[ \] Task 1/)
        })
      );
      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringMatching(/- \[x\] Task 2/)
        })
      );
    });

    it('should add priority labels', async () => {
      const epicData = {
        name: 'test-epic',
        title: 'Test',
        overview: 'Test',
        priority: 'P0',
        tasks: []
      };

      mockProvider.createIssue.mockResolvedValue({ number: 200 });
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createGitHubEpic(epicData);

      expect(mockProvider.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['epic', 'priority:P0'])
        })
      );
    });

    it('should update epic-sync-map after creation', async () => {
      const epicData = {
        name: 'user-auth',
        title: 'Test',
        overview: 'Test',
        tasks: []
      };

      mockProvider.createIssue.mockResolvedValue({ number: 300 });

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service.createGitHubEpic(epicData);

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicSyncMapPath,
        expect.objectContaining({
          'epic-to-github': { 'user-auth': '300' },
          'github-to-epic': { '300': 'user-auth' }
        }),
        { spaces: 2 }
      );
    });
  });

  // ==========================================
  // 5. updateGitHubEpic(githubNumber, epicData)
  // ==========================================

  describe('updateGitHubEpic', () => {
    it('should update GitHub epic with new data', async () => {
      const epicData = {
        title: 'Updated Epic Title',
        overview: 'Updated overview',
        tasks: [
          { title: 'New task', status: 'open' }
        ]
      };

      mockProvider.updateIssue.mockResolvedValue({
        number: 100,
        title: 'Epic: Updated Epic Title',
        updated_at: '2025-10-14T13:00:00Z'
      });

      const result = await service.updateGitHubEpic(100, epicData);

      expect(result.number).toBe(100);
      expect(mockProvider.updateIssue).toHaveBeenCalledWith(100, expect.any(Object));
    });

    it('should update task checkboxes in body', async () => {
      const epicData = {
        tasks: [
          { title: 'Task 1', status: 'closed' },
          { title: 'Task 2', status: 'open' }
        ]
      };

      mockProvider.updateIssue.mockResolvedValue({ number: 100 });

      await service.updateGitHubEpic(100, epicData);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(100,
        expect.objectContaining({
          body: expect.stringMatching(/- \[x\] Task 1/)
        })
      );
      expect(mockProvider.updateIssue).toHaveBeenCalledWith(100,
        expect.objectContaining({
          body: expect.stringMatching(/- \[ \] Task 2/)
        })
      );
    });

    it('should update labels when priority changes', async () => {
      const epicData = {
        priority: 'P1',
        tasks: []
      };

      mockProvider.updateIssue.mockResolvedValue({ number: 100 });

      await service.updateGitHubEpic(100, epicData);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(100,
        expect.objectContaining({
          labels: expect.arrayContaining(['epic', 'priority:P1'])
        })
      );
    });

    it('should handle partial updates', async () => {
      const epicData = {
        overview: 'Only overview update'
      };

      mockProvider.updateIssue.mockResolvedValue({ number: 100 });

      await service.updateGitHubEpic(100, epicData);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(100,
        expect.objectContaining({
          body: expect.stringContaining('Only overview update')
        })
      );
    });
  });

  // ==========================================
  // 6. getEpicSyncStatus(epicName)
  // ==========================================

  describe('getEpicSyncStatus', () => {
    it('should return synced status for mapped epic', async () => {
      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z',
            lastAction: 'push',
            githubNumber: '100'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service.getEpicSyncStatus('user-auth');

      expect(result.synced).toBe(true);
      expect(result.epicName).toBe('user-auth');
      expect(result.githubNumber).toBe('100');
      expect(result.lastSync).toBe('2025-10-14T10:00:00Z');
      expect(result.status).toBe('synced');
    });

    it('should return not synced for unmapped epic', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.getEpicSyncStatus('user-auth');

      expect(result.synced).toBe(false);
      expect(result.epicName).toBe('user-auth');
      expect(result.githubNumber).toBeNull();
      expect(result.status).toBe('not-synced');
    });

    it('should detect out of sync status', async () => {
      const localEpic = `---
name: user-auth
updated: 2025-10-14T12:00:00Z
---`;

      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue(localEpic);

      mockProvider.getIssue.mockResolvedValue({
        number: 100,
        updated_at: '2025-10-14T13:00:00Z',
        labels: [{ name: 'epic' }]
      });

      const result = await service.getEpicSyncStatus('user-auth');

      expect(result.synced).toBe(false);
      expect(result.status).toBe('out-of-sync');
    });

    it('should handle provider errors gracefully', async () => {
      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {
          'user-auth': {
            lastSync: '2025-10-14T10:00:00Z'
          }
        }
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);
      fs.readFile.mockResolvedValue('---\nname: user-auth\n---');

      mockProvider.getIssue.mockRejectedValue(new Error('Network error'));

      const result = await service.getEpicSyncStatus('user-auth');

      // Should return synced status since we can't verify
      expect(result.synced).toBe(true);
      expect(result.status).toBe('synced');
    });
  });

  // ==========================================
  // HELPER METHODS (Private)
  // ==========================================

  describe('_loadEpicSyncMap', () => {
    it('should load existing epic-sync-map', async () => {
      const existingSyncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readJSON = jest.fn().mockResolvedValue(existingSyncMap);

      const result = await service._loadEpicSyncMap();

      expect(result).toEqual(existingSyncMap);
      expect(fs.readJSON).toHaveBeenCalledWith(epicSyncMapPath);
    });

    it('should return default structure if epic-sync-map does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service._loadEpicSyncMap();

      expect(result).toEqual({
        'epic-to-github': {},
        'github-to-epic': {},
        'metadata': {}
      });
    });
  });

  describe('_saveEpicSyncMap', () => {
    it('should save epic-sync-map to file', async () => {
      const syncMap = {
        'epic-to-github': { 'user-auth': '100' },
        'github-to-epic': { '100': 'user-auth' },
        'metadata': {}
      };

      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._saveEpicSyncMap(syncMap);

      expect(fs.writeJSON).toHaveBeenCalledWith(epicSyncMapPath, syncMap, { spaces: 2 });
    });
  });

  describe('_updateEpicSyncMap', () => {
    it('should update epic-sync-map with new mapping', async () => {
      const existingSyncMap = {
        'epic-to-github': {},
        'github-to-epic': {},
        'metadata': {}
      };

      fs.pathExists.mockResolvedValue(false);
      fs.writeJSON = jest.fn().mockResolvedValue(undefined);

      await service._updateEpicSyncMap('user-auth', '100');

      expect(fs.writeJSON).toHaveBeenCalledWith(
        epicSyncMapPath,
        expect.objectContaining({
          'epic-to-github': { 'user-auth': '100' },
          'github-to-epic': { '100': 'user-auth' },
          'metadata': expect.objectContaining({
            'user-auth': expect.objectContaining({
              lastSync: expect.any(String),
              githubNumber: '100'
            })
          })
        }),
        { spaces: 2 }
      );
    });
  });

  describe('_formatEpicForGitHub', () => {
    it('should format epic data as GitHub issue body', () => {
      const epicData = {
        overview: 'Test overview',
        tasks: [
          { title: 'Task 1', status: 'open' },
          { title: 'Task 2', status: 'closed' }
        ]
      };

      const result = service._formatEpicForGitHub(epicData);

      expect(result).toContain('## Overview');
      expect(result).toContain('Test overview');
      expect(result).toContain('## Task Breakdown');
      expect(result).toContain('- [ ] Task 1');
      expect(result).toContain('- [x] Task 2');
    });

    it('should handle empty task list', () => {
      const epicData = {
        overview: 'Test',
        tasks: []
      };

      const result = service._formatEpicForGitHub(epicData);

      expect(result).toContain('## Overview');
      expect(result).toContain('## Task Breakdown');
      expect(result).toContain('No tasks defined');
    });
  });

  describe('_parseGitHubEpic', () => {
    it('should parse GitHub issue to epic format', () => {
      const githubIssue = {
        number: 100,
        title: 'Epic: User Authentication',
        body: `## Overview
Implement auth

## Task Breakdown
- [ ] Task 1
- [x] Task 2`,
        labels: [
          { name: 'epic' },
          { name: 'priority:P1' }
        ],
        created_at: '2025-10-14T10:00:00Z',
        updated_at: '2025-10-14T11:00:00Z'
      };

      const result = service._parseGitHubEpic(githubIssue);

      expect(result.name).toBe('user-authentication');
      expect(result.title).toBe('User Authentication');
      expect(result.overview).toContain('Implement auth');
      expect(result.priority).toBe('P1');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].status).toBe('open');
      expect(result.tasks[1].status).toBe('closed');
    });

    it('should extract tasks from checkboxes', () => {
      const githubIssue = {
        number: 100,
        title: 'Epic: Test',
        body: `## Task Breakdown
- [ ] Setup infrastructure
- [x] Implement API
- [ ] Add tests`,
        labels: [{ name: 'epic' }]
      };

      const result = service._parseGitHubEpic(githubIssue);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]).toEqual({ title: 'Setup infrastructure', status: 'open' });
      expect(result.tasks[1]).toEqual({ title: 'Implement API', status: 'closed' });
      expect(result.tasks[2]).toEqual({ title: 'Add tests', status: 'open' });
    });

    it('should handle missing sections gracefully', () => {
      const githubIssue = {
        number: 100,
        title: 'Epic: Minimal',
        body: 'Just content',
        labels: [{ name: 'epic' }]
      };

      const result = service._parseGitHubEpic(githubIssue);

      expect(result.name).toBeDefined();
      expect(result.tasks).toEqual([]);
    });
  });
});
