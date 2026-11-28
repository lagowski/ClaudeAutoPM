// Mock child_process before requiring the module
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const {
  AzureEpicList,
  execute,
  buildQuery,
  executeAzureCLI,
  transformResults,
  mapStatus,
  extractAssignee,
  extractTags,
  countChildren,
  countCompleted,
  buildWorkItemUrl,
  getMockData
} = require('../../autopm/.claude/providers/azure/epic-list.js');

const { execSync } = require('child_process');

describe('AzureEpicList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTOPM_USE_REAL_API;
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  describe('Constructor', () => {
    it('should create instance successfully', () => {
      const instance = new AzureEpicList();
      expect(instance).toBeInstanceOf(AzureEpicList);
    });
  });

  describe('execute()', () => {
    it('should use mock data by default', async () => {
      const options = { status: 'open' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const result = await execute(options, settings);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('status');
      expect(console.log).toHaveBeenCalledWith('📊 Using mock data (set AUTOPM_USE_REAL_API=true for real API)');
    });

    it('should throw error when organization is missing', async () => {
      const options = {};
      const settings = { project: 'test-project' };

      await expect(execute(options, settings)).rejects.toThrow(
        'Azure DevOps not configured. Set organization and project in config.json'
      );
    });

    it('should throw error when project is missing', async () => {
      const options = {};
      const settings = { organization: 'test-org' };

      await expect(execute(options, settings)).rejects.toThrow(
        'Azure DevOps not configured. Set organization and project in config.json'
      );
    });

    it('should use real API when AUTOPM_USE_REAL_API is set', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = { status: 'open' };
      const settings = { organization: 'test-org', project: 'test-project' };

      const mockAzureOutput = JSON.stringify([
        {
          id: '123',
          fields: {
            'System.Id': '123',
            'System.Title': 'Test Feature',
            'System.State': 'Active',
            'System.AssignedTo': { displayName: 'Test User' }
          }
        }
      ]);

      execSync.mockReturnValue(mockAzureOutput);

      const result = await execute(options, settings);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Test Feature');
      expect(execSync).toHaveBeenCalled();
    });

    it('should fallback to mock data when Azure CLI command fails', async () => {
      process.env.AUTOPM_USE_REAL_API = 'true';
      const options = {};
      const settings = { organization: 'test-org', project: 'test-project' };

      execSync.mockImplementation(() => {
        throw new Error('Azure CLI not found');
      });

      const result = await execute(options, settings);

      expect(result).toBeInstanceOf(Array);
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️  Azure CLI error, returning mock data:',
        'Azure CLI error: Azure CLI not found'
      );
    });
  });

  describe('buildQuery()', () => {
    it('should build basic query for features', () => {
      const organization = 'test-org';
      const project = 'test-project';
      const options = {};

      const query = buildQuery(organization, project, options);

      expect(query).toContain('az boards query');
      expect(query).toContain(`--organization ${organization}`);
      expect(query).toContain(`--project "${project}"`);
      expect(query).toContain("WHERE [System.WorkItemType] = 'Feature'");
    });

    it('should add status filter for closed features', () => {
      const query = buildQuery('org', 'project', { status: 'closed' });

      expect(query).toContain("AND [System.State] IN ('Done', 'Closed', 'Removed')");
    });

    it('should add status filter for open features', () => {
      const query = buildQuery('org', 'project', { status: 'open' });

      expect(query).toContain("AND [System.State] NOT IN ('Done', 'Closed', 'Removed')");
    });

    it('should add assignee filter', () => {
      const query = buildQuery('org', 'project', { assignee: 'test@example.com' });

      expect(query).toContain("AND [System.AssignedTo] = 'test@example.com'");
    });

    it('should add label filter (uses tags)', () => {
      const query = buildQuery('org', 'project', { label: 'priority-high' });

      expect(query).toContain("AND [System.Tags] CONTAINS 'priority-high'");
    });

    it('should combine multiple filters', () => {
      const options = {
        status: 'open',
        assignee: 'test@example.com',
        label: 'backend'
      };

      const query = buildQuery('org', 'project', options);

      expect(query).toContain("AND [System.State] NOT IN ('Done', 'Closed', 'Removed')");
      expect(query).toContain("AND [System.AssignedTo] = 'test@example.com'");
      expect(query).toContain("AND [System.Tags] CONTAINS 'backend'");
    });
  });

  describe('executeAzureCLI()', () => {
    it('should execute Azure CLI and parse JSON response', () => {
      const mockOutput = JSON.stringify([{ id: '123', fields: {} }]);
      execSync.mockReturnValue(mockOutput);

      const result = executeAzureCLI('test query');

      expect(result).toEqual([{ id: '123', fields: {} }]);
      expect(execSync).toHaveBeenCalledWith('test query', { encoding: 'utf8' });
    });

    it('should throw specific error when az command not found', () => {
      const error = new Error('Command failed');
      error.stderr = 'az: command not found';
      execSync.mockImplementation(() => { throw error; });

      expect(() => executeAzureCLI('test query')).toThrow('az: command not found');
    });

    it('should throw general error for other CLI failures', () => {
      const error = new Error('Authentication failed');
      execSync.mockImplementation(() => { throw error; });

      expect(() => executeAzureCLI('test query')).toThrow('Azure CLI error: Authentication failed');
    });
  });

  describe('transformResults()', () => {
    it('should transform Azure work items to unified format', () => {
      const azureWorkItems = [
        {
          id: '123',
          fields: {
            'System.Id': '123',
            'System.Title': 'Test Feature',
            'System.Description': 'Test description',
            'System.State': 'Active',
            'System.AssignedTo': { displayName: 'Test User', uniqueName: 'test@example.com' },
            'System.Tags': 'frontend;priority-high',
            'System.IterationPath': 'Sprint 15'
          }
        }
      ];

      const result = transformResults(azureWorkItems);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '123',
        title: 'Test Feature',
        description: 'Test description',
        status: 'in_progress',
        assignee: 'test@example.com',
        labels: ['frontend', 'priority-high'],
        childCount: expect.any(Number),
        completedCount: expect.any(Number),
        url: 'https://dev.azure.com/organization/project/_workitems/edit/123',
        milestone: 'Sprint 15'
      });
    });

    it('should handle null or undefined input', () => {
      expect(transformResults(null)).toEqual([]);
      expect(transformResults(undefined)).toEqual([]);
      expect(transformResults([])).toEqual([]);
    });

    it('should handle work items with missing fields', () => {
      const azureWorkItems = [
        {
          id: '456',
          fields: {}
        }
      ];

      const result = transformResults(azureWorkItems);

      expect(result[0]).toEqual({
        id: '456',
        title: 'Untitled',
        description: '',
        status: 'unknown',
        assignee: null,
        labels: [],
        childCount: expect.any(Number),
        completedCount: expect.any(Number),
        url: 'https://dev.azure.com/organization/project/_workitems/edit/456',
        milestone: null
      });
    });

    it('should handle work items without id in root', () => {
      const azureWorkItems = [
        {
          fields: {
            'System.Id': '789',
            'System.Title': 'Test Feature'
          }
        }
      ];

      const result = transformResults(azureWorkItems);

      expect(result[0].id).toBe('789');
    });
  });

  describe('mapStatus()', () => {
    it('should map Azure states to unified statuses', () => {
      expect(mapStatus('New')).toBe('open');
      expect(mapStatus('Active')).toBe('in_progress');
      expect(mapStatus('In Progress')).toBe('in_progress');
      expect(mapStatus('Resolved')).toBe('in_review');
      expect(mapStatus('Done')).toBe('completed');
      expect(mapStatus('Closed')).toBe('completed');
      expect(mapStatus('Removed')).toBe('cancelled');
    });

    it('should return unknown for unmapped states', () => {
      expect(mapStatus('Custom State')).toBe('unknown');
      expect(mapStatus(null)).toBe('unknown');
      expect(mapStatus(undefined)).toBe('unknown');
    });
  });

  describe('extractAssignee()', () => {
    it('should extract uniqueName from object', () => {
      const assignedTo = {
        displayName: 'Test User',
        uniqueName: 'test@example.com'
      };

      expect(extractAssignee(assignedTo)).toBe('test@example.com');
    });

    it('should fallback to displayName when uniqueName missing', () => {
      const assignedTo = {
        displayName: 'Test User'
      };

      expect(extractAssignee(assignedTo)).toBe('Test User');
    });

    it('should extract email from string format', () => {
      expect(extractAssignee('Test User <test@example.com>')).toBe('test@example.com');
    });

    it('should return string as-is when no email format', () => {
      expect(extractAssignee('test@example.com')).toBe('test@example.com');
    });

    it('should handle null/undefined assignee', () => {
      expect(extractAssignee(null)).toBe(null);
      expect(extractAssignee(undefined)).toBe(null);
    });

    it('should handle empty object', () => {
      expect(extractAssignee({})).toBe(null);
    });
  });

  describe('extractTags()', () => {
    it('should split semicolon-separated tags', () => {
      expect(extractTags('frontend;backend;priority-high')).toEqual(['frontend', 'backend', 'priority-high']);
    });

    it('should trim whitespace from tags', () => {
      expect(extractTags(' frontend ; backend ; priority-high ')).toEqual(['frontend', 'backend', 'priority-high']);
    });

    it('should filter empty tags', () => {
      expect(extractTags('frontend;;backend;')).toEqual(['frontend', 'backend']);
    });

    it('should handle single tag', () => {
      expect(extractTags('frontend')).toEqual(['frontend']);
    });

    it('should handle null/undefined tags', () => {
      expect(extractTags(null)).toEqual([]);
      expect(extractTags(undefined)).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(extractTags('')).toEqual([]);
    });
  });

  describe('countChildren()', () => {
    it('should return mock count based on item ID', () => {
      const item1 = { id: '100' };
      const item2 = { id: '205' };

      const count1 = countChildren(item1);
      const count2 = countChildren(item2);

      expect(count1).toBeGreaterThanOrEqual(3);
      expect(count1).toBeLessThanOrEqual(12);
      expect(count2).toBeGreaterThanOrEqual(3);
      expect(count2).toBeLessThanOrEqual(12);
      expect(count1).not.toBe(count2); // Should be different for different IDs
    });

    it('should handle item with fields.System.Id', () => {
      const item = { fields: { 'System.Id': '123' } };
      const count = countChildren(item);

      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(12);
    });

    it('should handle item without ID', () => {
      const item = {};
      const count = countChildren(item);

      expect(count).toBe(3); // Should use default 0 % 10 + 3
    });
  });

  describe('countCompleted()', () => {
    it('should return total count for completed items', () => {
      const item = {
        id: '123',
        fields: { 'System.State': 'Done' }
      };

      const total = countChildren(item);
      const completed = countCompleted(item);

      expect(completed).toBe(total);
    });

    it('should return total count for closed items', () => {
      const item = {
        id: '123',
        fields: { 'System.State': 'Closed' }
      };

      const total = countChildren(item);
      const completed = countCompleted(item);

      expect(completed).toBe(total);
    });

    it('should return half count for active items', () => {
      const item = {
        id: '123',
        fields: { 'System.State': 'Active' }
      };

      const total = countChildren(item);
      const completed = countCompleted(item);

      expect(completed).toBe(Math.floor(total * 0.5));
    });

    it('should return half count for in progress items', () => {
      const item = {
        id: '123',
        fields: { 'System.State': 'In Progress' }
      };

      const total = countChildren(item);
      const completed = countCompleted(item);

      expect(completed).toBe(Math.floor(total * 0.5));
    });

    it('should return 0 for new items', () => {
      const item = {
        id: '123',
        fields: { 'System.State': 'New' }
      };

      const completed = countCompleted(item);

      expect(completed).toBe(0);
    });
  });

  describe('buildWorkItemUrl()', () => {
    it('should build correct work item URL', () => {
      const url = buildWorkItemUrl('123');

      expect(url).toBe('https://dev.azure.com/organization/project/_workitems/edit/123');
    });

    it('should handle different ID formats', () => {
      expect(buildWorkItemUrl(456)).toBe('https://dev.azure.com/organization/project/_workitems/edit/456');
      expect(buildWorkItemUrl('789')).toBe('https://dev.azure.com/organization/project/_workitems/edit/789');
    });
  });

  describe('getMockData()', () => {
    it('should return default mock features', () => {
      const result = getMockData({});

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3); // Defaults to open status, which excludes completed
      expect(result[0]).toHaveProperty('id', '2001');
      expect(result[0]).toHaveProperty('title', 'User Management Module');
    });

    it('should filter by status - closed', () => {
      const result = getMockData({ status: 'closed' });

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('completed');
    });

    it('should filter by status - not closed', () => {
      const result = getMockData({ status: 'open' });

      expect(result.length).toBe(3);
      expect(result.every(f => f.status !== 'completed')).toBe(true);
    });

    it('should filter by assignee', () => {
      const result = getMockData({ assignee: 'dev.team' });

      expect(result.length).toBe(1);
      expect(result[0].assignee).toContain('dev.team');
    });

    it('should filter by label', () => {
      const result = getMockData({ label: 'security' });

      expect(result.length).toBe(1);
      expect(result[0].labels).toContain('security');
    });

    it('should apply limit', () => {
      const result = getMockData({ limit: 2 });

      expect(result.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const result = getMockData({
        status: 'open',
        label: 'frontend'
      });

      expect(result.length).toBe(1);
      expect(result[0].labels).toContain('frontend');
      expect(result[0].status).not.toBe('completed');
    });

    it('should return all when status is all', () => {
      const result = getMockData({ status: 'all' });

      expect(result.length).toBe(4);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility with direct module usage', async () => {
      // This tests the original export format still works
      const azureEpicList = require('../../autopm/.claude/providers/azure/epic-list.js');

      expect(azureEpicList).toHaveProperty('execute');
      expect(azureEpicList).toHaveProperty('AzureEpicList');
    });

    it('should handle edge cases in status filtering', () => {
      // Test with various status values - empty/null/undefined are treated as open (not 'all')
      expect(getMockData({ status: '' }).length).toBe(3); // Excludes completed
      expect(getMockData({ status: null }).length).toBe(3); // Excludes completed
      expect(getMockData({ status: undefined }).length).toBe(3); // Excludes completed
    });

    it('should handle edge cases in assignee filtering', () => {
      // Test partial matches
      const result = getMockData({ assignee: 'team' });
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});