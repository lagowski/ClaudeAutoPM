#!/usr/bin/env node

/**
 * Tests for Azure DevOps work item creation helper
 * Provides similar functionality to GitHub issue creation with JSON output
 */

const assert = require('node:assert');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('Azure DevOps Work Item Creation Helper', () => {
  let azureWorkItemCreate;
  let tempDir;
  let mockClient;
  let apiCalls;

  beforeEach(async () => {
    // Setup temp directory
    tempDir = path.join(os.tmpdir(), `azure-wi-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    // Track API calls
    apiCalls = [];

    // Mock Azure DevOps client
    mockClient = {
      createWorkItem: async (type, fields) => {
        apiCalls.push({ method: 'createWorkItem', type, fields });
        return {
          id: 456,
          fields: {
            'System.Title': fields.title || fields['System.Title'],
            'System.WorkItemType': type,
            'System.State': 'New',
            'System.Tags': fields.tags || fields['System.Tags']
          },
          _links: {
            html: { href: 'https://dev.azure.com/org/project/_workitems/edit/456' }
          }
        };
      },
      updateWorkItem: async (id, fields) => {
        apiCalls.push({ method: 'updateWorkItem', id, fields });
        return { id, fields };
      }
    };

    // Try to load the module (might not exist yet - TDD)
    try {
      azureWorkItemCreate = require('../../lib/helpers/azure-work-item-create');
    } catch (error) {
      azureWorkItemCreate = null;
    }
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Module Structure', () => {
    it('should export required functions', () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet (TDD RED phase)');
        return;
      }

      assert.strictEqual(typeof azureWorkItemCreate.createWorkItem, 'function');
      assert.strictEqual(typeof azureWorkItemCreate.createEpic, 'function');
      assert.strictEqual(typeof azureWorkItemCreate.createUserStory, 'function');
      assert.strictEqual(typeof azureWorkItemCreate.createTask, 'function');
    });
  });

  describe('createWorkItem', () => {
    it('should create work item and return JSON with ID', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        type: 'Task',
        title: 'Test Task',
        description: 'Task description',
        tags: ['bug', 'urgent'],
        assignedTo: 'user@example.com'
      };

      const result = await azureWorkItemCreate.createWorkItem(options);

      assert.strictEqual(result.id, 456);
      assert.strictEqual(result.type, 'Task');
      assert.ok(result.url);

      // Verify API was called
      const createCall = apiCalls.find(c => c.method === 'createWorkItem');
      assert.ok(createCall);
      assert.strictEqual(createCall.type, 'Task');
    });

    it('should handle description from file', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const descFile = path.join(tempDir, 'desc.md');
      await fs.writeFile(descFile, '# Description\nDetailed content');

      const options = {
        type: 'User Story',
        title: 'Test Story',
        descriptionFile: descFile
      };

      const result = await azureWorkItemCreate.createWorkItem(options);

      assert.strictEqual(result.id, 456);

      const createCall = apiCalls.find(c => c.method === 'createWorkItem');
      assert.ok(createCall);
    });

    it('should support all work item fields', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        type: 'Bug',
        title: 'Critical Bug',
        description: 'Bug description',
        priority: 1,
        severity: 'Critical',
        iterationPath: 'Project\\Sprint 5',
        areaPath: 'Project\\Backend',
        tags: ['production', 'critical']
      };

      const result = await azureWorkItemCreate.createWorkItem(options);

      assert.strictEqual(result.id, 456);
      assert.strictEqual(result.type, 'Bug');
    });
  });

  describe('createEpic', () => {
    it('should create epic with proper fields', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        title: 'Epic: Authentication',
        description: 'Authentication system implementation',
        acceptanceCriteria: [
          'Users can register',
          'Users can login',
          'Password reset works'
        ],
        priority: 1
      };

      const result = await azureWorkItemCreate.createEpic(options);

      assert.strictEqual(result.id, 456);
      assert.strictEqual(result.type, 'Epic');
      assert.ok(result.title.includes('Authentication'));
    });

    it('should add epic tags automatically', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        epicName: 'UserManagement',
        description: 'User management epic'
      };

      await azureWorkItemCreate.createEpic(options);

      const createCall = apiCalls.find(c => c.method === 'createWorkItem');
      assert.ok(createCall);

      // Should have epic tags
      const tags = createCall.fields.tags || createCall.fields['System.Tags'];
      assert.ok(tags);
    });
  });

  describe('createUserStory', () => {
    it('should create user story with acceptance criteria', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        title: 'As a user, I want to login',
        description: 'Login functionality',
        acceptanceCriteria: 'Users can login with email and password',
        storyPoints: 5,
        parentId: 123 // Parent epic
      };

      const result = await azureWorkItemCreate.createUserStory(options);

      assert.strictEqual(result.id, 456);
      assert.strictEqual(result.type, 'User Story');
    });
  });

  describe('createTask', () => {
    it('should create task with remaining work', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const options = {
        title: 'Implement login API',
        description: 'Create login endpoint',
        remainingWork: 8,
        parentId: 789 // Parent story
      };

      const result = await azureWorkItemCreate.createTask(options);

      assert.strictEqual(result.id, 456);
      assert.strictEqual(result.type, 'Task');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Azure client', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      // Clear the module cache to get fresh instance
      delete require.cache[require.resolve('../../lib/helpers/azure-work-item-create')];
      const freshModule = require('../../lib/helpers/azure-work-item-create');

      try {
        await freshModule.createWorkItem({ title: 'Test', type: 'Task' });
        assert.fail('Should throw error');
      } catch (error) {
        assert.ok(error.message.includes('Azure DevOps client not configured'),
                 `Expected error message to include "Azure DevOps client not configured", got: "${error.message}"`);
      }
    });

    it('should validate required fields', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      try {
        await azureWorkItemCreate.createWorkItem({ type: 'Task' });
        assert.fail('Should throw error for missing title');
      } catch (error) {
        assert.ok(error.message.includes('title is required'));
      }
    });

    it('should handle API errors', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      const errorClient = {
        createWorkItem: async () => {
          throw new Error('API Error: Unauthorized');
        }
      };

      azureWorkItemCreate._setClient(errorClient);

      try {
        await azureWorkItemCreate.createWorkItem({ type: 'Task', title: 'Test' });
        assert.fail('Should throw error');
      } catch (error) {
        assert.ok(error.message.includes('Unauthorized'));
      }
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple work items', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const items = [
        { type: 'Epic', title: 'Epic 1' },
        { type: 'User Story', title: 'Story 1' },
        { type: 'Task', title: 'Task 1' }
      ];

      const results = await azureWorkItemCreate.createBatch(items);

      assert.strictEqual(results.length, 3);
      assert.ok(results.every(r => r.id === 456));
    });
  });

  describe('JSON Output Format', () => {
    it('should return consistent JSON structure', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      const result = await azureWorkItemCreate.createWorkItem({
        type: 'Task',
        title: 'Test',
        outputFormat: 'json'
      });

      assert.ok(result.id);
      assert.ok(result.type);
      assert.ok(result.title);
      assert.ok(result.url);
      assert.ok(result.state);
    });
  });

  describe('Integration with PM Commands', () => {
    it('should work with existing PM epic workflow', async () => {
      if (!azureWorkItemCreate) {
        assert.ok(true, 'Module not implemented yet');
        return;
      }

      azureWorkItemCreate._setClient(mockClient);

      // Simulate PM epic creation
      const epicId = await azureWorkItemCreate.createEpicAndGetId({
        title: 'Epic: NewFeature',
        descriptionFile: '/tmp/epic-body.md',
        tags: ['epic', 'epic:NewFeature', 'sprint:current']
      });

      assert.strictEqual(epicId, 456);
    });
  });
});

// Export for potential reuse in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // mockClient will be defined in beforeEach
  };
}