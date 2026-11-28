const { execFileSync } = require('child_process');
const { AzureIssueStart } = require('../../autopm/.claude/providers/azure/issue-start');

// Mock child_process
jest.mock('child_process');

describe('AzureIssueStart', () => {
  let azureIssueStart;
  let mockSettings;
  let consoleSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh instance
    azureIssueStart = new AzureIssueStart();

    // Default mock settings
    mockSettings = {
      organization: 'test-org',
      project: 'test-project'
    };

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear environment variables
    delete process.env.AUTOPM_USE_REAL_API;

    // Mock Date for consistent timestamps
    jest.spyOn(global, 'Date').mockImplementation(() => ({
      toISOString: () => '2023-01-01T12:00:00.000Z'
    }));

    // Mock execFileSync to return empty string by default
    execFileSync.mockReturnValue('');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    test('should throw error when work item ID is missing', async () => {
      const options = {};

      await expect(azureIssueStart.execute(options, mockSettings))
        .rejects
        .toThrow('Work item ID is required. Usage: issue:start <work-item-id>');
    });

    test('should throw error when organization is missing', async () => {
      const options = { id: '123' };
      const invalidSettings = { project: 'test-project' };

      await expect(azureIssueStart.execute(options, invalidSettings))
        .rejects
        .toThrow('Azure DevOps not configured. Set organization and project in config.json');
    });

    test('should throw error when project is missing', async () => {
      const options = { id: '123' };
      const invalidSettings = { organization: 'test-org' };

      await expect(azureIssueStart.execute(options, invalidSettings))
        .rejects
        .toThrow('Azure DevOps not configured. Set organization and project in config.json');
    });

    test('should throw error when both organization and project are missing', async () => {
      const options = { id: '123' };
      const invalidSettings = {};

      await expect(azureIssueStart.execute(options, invalidSettings))
        .rejects
        .toThrow('Azure DevOps not configured. Set organization and project in config.json');
    });
  });

  describe('Mock Implementation', () => {
    beforeEach(() => {
      // Ensure mock mode is enabled
      delete process.env.AUTOPM_USE_REAL_API;
    });

    test('should use mock implementation by default', async () => {
      const options = { id: '123' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('📊 Using mock implementation (set AUTOPM_USE_REAL_API=true for real API)');
      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('123');
    });

    test('should handle basic work item start', async () => {
      const options = { id: '456' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('📝 Would update state to Active');
      expect(consoleSpy).toHaveBeenCalledWith('🌿 Would create branch: feature/task-456');
      expect(result).toEqual({
        success: true,
        issue: {
          id: '456',
          title: 'Mock Work Item #456',
          status: 'in_progress',
          assignee: 'existing-user@company.com',
          branch: 'feature/task-456',
          url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/456'
        },
        actions: [
          'Updated state to Active',
          'Created and linked branch feature/task-456',
          'Added in-progress tag',
          'Added start notification'
        ],
        timestamp: '2023-01-01T12:00:00.000Z'
      });
    });

    test('should handle work item start with custom branch', async () => {
      const options = { id: '789', branch: 'custom-branch-name' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('🌿 Would create branch: custom-branch-name');
      expect(result.issue.branch).toBe('custom-branch-name');
      expect(result.actions).toContain('Created and linked branch custom-branch-name');
    });

    test('should handle work item start with assignment', async () => {
      const options = { id: '101', assign: true };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('👤 Would assign to current user');
      expect(result.actions).toContain('Assigned to current-user@company.com');
      expect(result.issue.assignee).toBe('current-user@company.com');
    });

    test('should handle work item start without branch creation', async () => {
      const options = { id: '102', no_branch: true };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.issue.branch).toBeNull();
      expect(result.actions).not.toContain(expect.stringContaining('Created and linked branch'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Would create branch'));
    });

    test('should handle work item start with comment', async () => {
      const options = { id: '103', comment: 'Starting work on this task' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('💬 Would add comment: Starting work on this task');
      expect(result.actions).toContain('Added comment');
    });

    test('should handle work item start with sprint assignment', async () => {
      const options = { id: '104', sprint: 'Sprint 2023.1' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(consoleSpy).toHaveBeenCalledWith('📋 Would move to sprint: Sprint 2023.1');
      expect(result.actions).toContain('Moved to Sprint 2023.1');
    });

    test('should handle work item start with all options', async () => {
      const options = {
        id: '105',
        branch: 'feature/task-105-custom',
        assign: true,
        comment: 'Custom start comment',
        sprint: 'Sprint 2023.2'
      };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.actions).toEqual([
        'Updated state to Active',
        'Created and linked branch feature/task-105-custom',
        'Assigned to current-user@company.com',
        'Added in-progress tag',
        'Added comment',
        'Moved to Sprint 2023.2'
      ]);
    });

    test('should throw error for non-existent work item (mock)', async () => {
      const options = { id: '9999' };

      await expect(azureIssueStart.execute(options, mockSettings))
        .rejects
        .toThrow('Work item #9999 not found');
    });

    test('should throw error for completed work item (mock)', async () => {
      const options = { id: '9998' };

      await expect(azureIssueStart.execute(options, mockSettings))
        .rejects
        .toThrow('Work item #9998 is Done and cannot be started');
    });
  });

  describe('Real API Implementation', () => {
    beforeEach(() => {
      // Enable real API mode
      process.env.AUTOPM_USE_REAL_API = 'true';

      // Mock work item data
      const mockWorkItem = {
        fields: {
          'System.State': 'New',
          'System.Title': 'Test Work Item',
          'System.AssignedTo': null,
          'System.Tags': ''
        }
      };
      execFileSync.mockReturnValue(JSON.stringify(mockWorkItem));
    });

    test('should get work item details', async () => {
      const result = await azureIssueStart.getWorkItem('test-org', 'test-project', '200');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'show', '--id', '200', '--organization', 'test-org', '--project', 'test-project'],
        { encoding: 'utf8' }
      );
      expect(result.fields['System.State']).toBe('New');
    });

    test('should handle work item not found', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Work item not found');
      });

      const result = await azureIssueStart.getWorkItem('test-org', 'test-project', '999');

      expect(result).toBeNull();
    });

    test('should update work item state', async () => {
      await azureIssueStart.updateWorkItemState('test-org', 'test-project', '201', 'Active');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'update', '--id', '201', '--state', 'Active', '--organization', 'test-org', '--project', 'test-project'],
        { stdio: 'inherit' }
      );
    });

    test('should handle state update errors gracefully', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('State update failed');
      });

      await azureIssueStart.updateWorkItemState('test-org', 'test-project', '202', 'Active');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not update work item state:', 'State update failed');
    });

    test('should check if branch exists', () => {
      // Mock successful branch check
      execFileSync.mockReturnValue('');

      const exists = azureIssueStart.branchExists('existing-branch');

      expect(execFileSync).toHaveBeenCalledWith('git', ['show-ref', '--verify', '--quiet', 'refs/heads/existing-branch']);
      expect(exists).toBe(true);
    });

    test('should return false when branch does not exist', () => {
      // Mock failed branch check
      execFileSync.mockImplementation(() => {
        throw new Error('Branch not found');
      });

      const exists = azureIssueStart.branchExists('non-existing-branch');

      expect(exists).toBe(false);
    });

    test('should create new branch', () => {
      azureIssueStart.createBranch('feature/new-branch');

      expect(execFileSync).toHaveBeenCalledWith('git', ['checkout', '-b', 'feature/new-branch'], { stdio: 'inherit' });
    });

    test('should get current user from Azure CLI', async () => {
      execFileSync.mockReturnValue('user@company.com\n');

      const user = await azureIssueStart.getCurrentUser('test-org');

      expect(execFileSync).toHaveBeenCalledWith('az', ['ad', 'signed-in-user', 'show', '--query', 'userPrincipalName', '-o', 'tsv'], { encoding: 'utf8' });
      expect(user).toBe('user@company.com');
    });

    test('should fallback to git config for current user', async () => {
      execFileSync
        .mockImplementationOnce(() => { throw new Error('Azure CLI failed'); })
        .mockReturnValueOnce('git-user@company.com\n');

      const user = await azureIssueStart.getCurrentUser('test-org');

      expect(execFileSync).toHaveBeenCalledWith('git', ['config', 'user.email'], { encoding: 'utf8' });
      expect(user).toBe('git-user@company.com');
    });

    test('should use default user when all methods fail', async () => {
      execFileSync.mockImplementation(() => { throw new Error('All methods failed'); });

      const user = await azureIssueStart.getCurrentUser('test-org');

      expect(user).toBe('current-user@company.com');
    });

    test('should assign work item to user', async () => {
      await azureIssueStart.assignWorkItem('test-org', 'test-project', '203', 'user@company.com');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'update', '--id', '203', '--assigned-to', 'user@company.com', '--organization', 'test-org', '--project', 'test-project'],
        { stdio: 'inherit' }
      );
    });

    test('should handle assignment errors gracefully', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Assignment failed');
      });

      await azureIssueStart.assignWorkItem('test-org', 'test-project', '204', 'user@company.com');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not assign work item:', 'Assignment failed');
    });

    test('should add tag to work item', async () => {
      // First call returns work item with no tags
      const mockWorkItem = {
        fields: { 'System.Tags': '' }
      };
      execFileSync
        .mockReturnValueOnce(JSON.stringify(mockWorkItem))
        .mockReturnValueOnce('');

      await azureIssueStart.addTag('test-org', 'test-project', '205', 'new-tag');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'update', '--id', '205', '--fields', 'System.Tags=new-tag', '--organization', 'test-org', '--project', 'test-project'],
        { stdio: 'inherit' }
      );
    });

    test('should append tag to existing tags', async () => {
      // First call returns work item with existing tags
      const mockWorkItem = {
        fields: { 'System.Tags': 'existing-tag' }
      };
      execFileSync
        .mockReturnValueOnce(JSON.stringify(mockWorkItem))
        .mockReturnValueOnce('');

      await azureIssueStart.addTag('test-org', 'test-project', '206', 'new-tag');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'update', '--id', '206', '--fields', 'System.Tags=existing-tag; new-tag', '--organization', 'test-org', '--project', 'test-project'],
        { stdio: 'inherit' }
      );
    });

    test('should handle tag addition errors gracefully', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Tag addition failed');
      });

      await azureIssueStart.addTag('test-org', 'test-project', '207', 'tag');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not add tag:', expect.any(String));
    });

    test('should add comment to work item', async () => {
      await azureIssueStart.addComment('test-org', 'test-project', '208', 'Test comment');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Intended comment: Test comment'));
    });

    test('should move work item to sprint', async () => {
      await azureIssueStart.moveToSprint('test-org', 'test-project', '209', 'Sprint 1');

      expect(execFileSync).toHaveBeenCalledWith(
        'az',
        ['boards', 'work-item', 'update', '--id', '209', '--iteration', 'test-project\\Sprint 1', '--organization', 'test-org', '--project', 'test-project'],
        { stdio: 'inherit' }
      );
    });

    test('should handle sprint move errors gracefully', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Sprint move failed');
      });

      await azureIssueStart.moveToSprint('test-org', 'test-project', '210', 'Sprint 1');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not move to sprint:', 'Sprint move failed');
    });

    test('should build correct work item URL', () => {
      const url = azureIssueStart.getWorkItemUrl('test-org', 'test-project', '211');

      expect(url).toBe('https://dev.azure.com/test-org/test-project/_workitems/edit/211');
    });

    test('should validate work item state before starting', async () => {
      const mockWorkItem = {
        fields: {
          'System.State': 'Done',
          'System.Title': 'Completed Item'
        }
      };
      execFileSync.mockReturnValue(JSON.stringify(mockWorkItem));

      const options = { id: '212' };

      await expect(azureIssueStart.execute(options, mockSettings))
        .rejects
        .toThrow('Work item #212 is Done and cannot be started');
    });

    test('should handle work item not found during start', async () => {
      execFileSync.mockReturnValue(null);

      const options = { id: '213' };

      await expect(azureIssueStart.execute(options, mockSettings))
        .rejects
        .toThrow('Work item #213 not found');
    });

    test('should execute full workflow with real API', async () => {
      const mockWorkItem = {
        fields: {
          'System.State': 'New',
          'System.Title': 'Test Work Item for Full Workflow',
          'System.AssignedTo': null,
          'System.Tags': 'existing-tag'
        }
      };

      // Setup exec mocks for different calls
      let callCount = 0;
      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        callCount++;

        if (cmd.includes('work-item show')) {
          return JSON.stringify(mockWorkItem);
        }
        if (cmd.includes('show-ref --verify')) {
          throw new Error('Branch does not exist');
        }
        if (cmd.includes('signed-in-user show')) {
          return 'test-user@company.com\n';
        }
        return '';
      });

      const options = {
        id: '300',
        branch: 'feature/test-300',
        assign: true,
        comment: 'Starting real API test',
        sprint: 'Sprint 1'
      };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('300');
      expect(result.issue.title).toBe('Test Work Item for Full Workflow');
      expect(result.issue.status).toBe('in_progress');
      expect(result.issue.branch).toBe('feature/test-300');
      expect(result.actions).toEqual([
        'Updated state to Active',
        'Created and linked branch feature/test-300',
        'Assigned to test-user@company.com',
        'Added in-progress tag',
        'Added comment',
        'Moved to Sprint 1'
      ]);
    });

    test('should handle existing branch during real API workflow', async () => {
      const mockWorkItem = {
        fields: {
          'System.State': 'New',
          'System.Title': 'Test Work Item',
          'System.AssignedTo': { uniqueName: 'existing@company.com' },
          'System.Tags': ''
        }
      };

      let callCount = 0;
      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        callCount++;

        if (cmd.includes('work-item show')) {
          return JSON.stringify(mockWorkItem);
        }
        if (cmd.includes('show-ref --verify')) {
          return ''; // Branch exists
        }
        return '';
      });

      const options = { id: '301' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.success).toBe(true);
      expect(result.actions).not.toContain(expect.stringContaining('Created and linked branch'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Branch feature/task-301 already exists'));
    });

    test('should handle work item with existing assignee', async () => {
      const mockWorkItem = {
        fields: {
          'System.State': 'New',
          'System.Title': 'Test Work Item',
          'System.AssignedTo': { uniqueName: 'existing@company.com' },
          'System.Tags': ''
        }
      };

      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        if (cmd.includes('work-item show')) {
          return JSON.stringify(mockWorkItem);
        }
        if (cmd.includes('show-ref --verify')) {
          throw new Error('Branch does not exist');
        }
        return '';
      });

      const options = { id: '302' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.success).toBe(true);
      expect(result.issue.assignee).toBe('existing@company.com');
      expect(result.actions).not.toContain(expect.stringContaining('Assigned to'));
    });

    test('should add default comment when no custom comment provided', async () => {
      const mockWorkItem = {
        fields: {
          'System.State': 'New',
          'System.Title': 'Test Work Item',
          'System.AssignedTo': null,
          'System.Tags': ''
        }
      };

      execFileSync.mockImplementation((file, args) => {
        const cmd = [file, ...(args || [])].join(' ');
        if (cmd.includes('work-item show')) {
          return JSON.stringify(mockWorkItem);
        }
        if (cmd.includes('show-ref --verify')) {
          throw new Error('Branch does not exist');
        }
        return '';
      });

      const options = { id: '303' };

      const result = await azureIssueStart.execute(options, mockSettings);

      expect(result.success).toBe(true);
      expect(result.actions).toContain('Added start notification');
    });
  });

  describe('mockStartWorkItem()', () => {
    test('should return expected mock structure', () => {
      const options = { id: '300' };

      const result = azureIssueStart.mockStartWorkItem(options, 'mock-org', 'mock-project');

      expect(result).toEqual({
        success: true,
        issue: {
          id: '300',
          title: 'Mock Work Item #300',
          status: 'in_progress',
          assignee: 'existing-user@company.com',
          branch: 'feature/task-300',
          url: 'https://dev.azure.com/mock-org/mock-project/_workitems/edit/300'
        },
        actions: [
          'Updated state to Active',
          'Created and linked branch feature/task-300',
          'Added in-progress tag',
          'Added start notification'
        ],
        timestamp: '2023-01-01T12:00:00.000Z'
      });
    });

    test('should handle mock with all options', () => {
      const options = {
        id: '301',
        branch: 'custom-branch',
        assign: true,
        comment: 'Custom comment',
        sprint: 'Test Sprint',
        no_branch: false
      };

      const result = azureIssueStart.mockStartWorkItem(options, 'mock-org', 'mock-project');

      expect(result.actions).toEqual([
        'Updated state to Active',
        'Created and linked branch custom-branch',
        'Assigned to current-user@company.com',
        'Added in-progress tag',
        'Added comment',
        'Moved to Test Sprint'
      ]);
    });
  });

  describe('Integration Tests', () => {
    test('should maintain backward compatibility with direct module usage', () => {
      const issueStart = require('../../autopm/.claude/providers/azure/issue-start');

      expect(typeof issueStart.execute).toBe('function');
      expect(typeof issueStart.getWorkItem).toBe('function');
      expect(typeof issueStart.branchExists).toBe('function');
      expect(typeof issueStart.createBranch).toBe('function');
      expect(typeof issueStart.getCurrentUser).toBe('function');
      expect(typeof issueStart.getWorkItemUrl).toBe('function');
      expect(typeof issueStart.mockStartWorkItem).toBe('function');
    });

    test('should work with various ID formats', async () => {
      const testCases = [
        '123',
        'TASK-456',
        '789ABC',
        '0001'
      ];

      for (const id of testCases) {
        const options = { id };
        const result = await azureIssueStart.execute(options, mockSettings);

        expect(result.success).toBe(true);
        expect(result.issue.id).toBe(id);
      }
    });

    test('should handle edge cases for options', async () => {
      const edgeCases = [
        { id: '123', branch: '' }, // Empty branch
        { id: '124', comment: '' }, // Empty comment
        { id: '125', sprint: '' }, // Empty sprint
        { id: '126', assign: false }, // Explicit false
        { id: '127', no_branch: undefined } // Undefined
      ];

      for (const options of edgeCases) {
        const result = await azureIssueStart.execute(options, mockSettings);
        expect(result.success).toBe(true);
      }
    });

    test('should generate consistent timestamps', async () => {
      const options1 = { id: '128' };
      const options2 = { id: '129' };

      const result1 = await azureIssueStart.execute(options1, mockSettings);
      const result2 = await azureIssueStart.execute(options2, mockSettings);

      expect(result1.timestamp).toBe('2023-01-01T12:00:00.000Z');
      expect(result2.timestamp).toBe('2023-01-01T12:00:00.000Z');
    });
  });
});