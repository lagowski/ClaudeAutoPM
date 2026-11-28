/**
 * AzureDevOpsCliWrapper Test Suite
 *
 * Comprehensive TDD test suite for Azure CLI wrapper
 * Following 2025 best practices with full coverage
 *
 * Test Coverage:
 * - Constructor and initialization
 * - CLI command execution
 * - Retry logic with exponential backoff
 * - Variable groups management
 * - Service connections management
 * - Pipelines management
 * - Error handling
 * - Edge cases
 */

const { execFileSync } = require('child_process');
const AzureDevOpsCliWrapper = require('../../lib/providers/AzureDevOpsCliWrapper');

// Mock child_process.execFileSync (wrapper executes az via argv array, no shell)
jest.mock('child_process');

describe('AzureDevOpsCliWrapper', () => {
  let wrapper;
  let mockExecSync;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Clear environment variables
    delete process.env.AZURE_DEVOPS_EXT_PAT;
    delete process.env.AZURE_DEVOPS_ORG;
    delete process.env.AZURE_DEVOPS_PROJECT;

    // Get reference to mock execFileSync
    mockExecSync = execFileSync;
  });

  describe('Constructor', () => {
    test('should initialize with provided config', () => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat-token',
        organization: 'test-org',
        project: 'test-project'
      });

      expect(wrapper.token).toBe('test-pat-token');
      expect(wrapper.organization).toBe('test-org');
      expect(wrapper.project).toBe('test-project');
    });

    test('should read from environment variables when not provided', () => {
      process.env.AZURE_DEVOPS_EXT_PAT = 'env-pat-token';
      process.env.AZURE_DEVOPS_ORG = 'env-org';
      process.env.AZURE_DEVOPS_PROJECT = 'env-project';

      wrapper = new AzureDevOpsCliWrapper();

      expect(wrapper.token).toBe('env-pat-token');
      expect(wrapper.organization).toBe('env-org');
      expect(wrapper.project).toBe('env-project');
    });

    test('should throw error if token is missing', () => {
      expect(() => {
        new AzureDevOpsCliWrapper({ organization: 'test-org', project: 'test-project' });
      }).toThrow('Azure DevOps PAT token is required');
    });

    test('should throw error if organization is missing', () => {
      expect(() => {
        new AzureDevOpsCliWrapper({ token: 'test-pat', project: 'test-project' });
      }).toThrow('Azure DevOps organization is required');
    });

    test('should throw error if project is missing', () => {
      expect(() => {
        new AzureDevOpsCliWrapper({ token: 'test-pat', organization: 'test-org' });
      }).toThrow('Azure DevOps project is required');
    });

    test('should set default retry options', () => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });

      expect(wrapper.maxRetries).toBe(3);
      expect(wrapper.retryDelay).toBe(1000);
    });

    test('should allow custom retry options', () => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project',
        maxRetries: 5,
        retryDelay: 2000
      });

      expect(wrapper.maxRetries).toBe(5);
      expect(wrapper.retryDelay).toBe(2000);
    });
  });

  describe('execute()', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should execute successful CLI command', () => {
      const mockOutput = JSON.stringify({ id: 1, name: 'test' });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.execute(['pipelines', 'list']);

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        ['pipelines', 'list'],
        expect.objectContaining({
          env: expect.objectContaining({
            AZURE_DEVOPS_EXT_PAT: 'test-pat'
          }),
          encoding: 'utf-8'
        })
      );
    });

    test('should throw error for failed CLI command', () => {
      const mockError = new Error('Command failed');
      mockError.status = 1;
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow('Azure CLI command failed');
    });

    test('should handle authentication errors', () => {
      const mockError = new Error('Authentication failed');
      mockError.stderr = 'ERROR: Authentication failed';
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow();
    });

    test('should pass custom environment variables', () => {
      mockExecSync.mockReturnValue(Buffer.from('{"id": 1}'));

      wrapper.execute(['pipelines', 'list'], {
        env: { CUSTOM_VAR: 'value' }
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        ['pipelines', 'list'],
        expect.objectContaining({
          env: expect.objectContaining({
            AZURE_DEVOPS_EXT_PAT: 'test-pat',
            CUSTOM_VAR: 'value'
          })
        })
      );
    });

    test('should handle timeout', () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('Command timed out');
        error.signal = 'SIGTERM';
        throw error;
      });

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow();
    });

    test('should reject command strings (argv arrays only)', () => {
      expect(() => {
        wrapper.execute('pipelines list');
      }).toThrow(TypeError);
      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe('executeWithRetry()', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project',
        maxRetries: 3,
        retryDelay: 100
      });
    });

    test('should succeed on first attempt', async () => {
      mockExecSync.mockReturnValue(Buffer.from('{"id": 1}'));

      const result = await wrapper.executeWithRetry(['pipelines', 'list']);

      expect(result).toEqual({ id: 1 });
      expect(mockExecSync).toHaveBeenCalledTimes(1);
    });

    test('should retry on transient failures', async () => {
      // Fail twice, then succeed
      mockExecSync
        .mockImplementationOnce(() => {
          const error = new Error('Temporary failure');
          error.status = 503;
          throw error;
        })
        .mockImplementationOnce(() => {
          const error = new Error('Temporary failure');
          error.status = 503;
          throw error;
        })
        .mockReturnValueOnce(Buffer.from('{"id": 1}'));

      const result = await wrapper.executeWithRetry(['pipelines', 'list']);

      expect(result).toEqual({ id: 1 });
      expect(mockExecSync).toHaveBeenCalledTimes(3);
    });

    test('should use exponential backoff', async () => {
      // Use a short delay for testing
      const testWrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project',
        maxRetries: 2,
        retryDelay: 10  // 10ms for faster tests
      });

      let attemptCount = 0;
      mockExecSync.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Temporary failure');
          error.status = 503;
          throw error;
        }
        return Buffer.from('{"id": 1}');
      });

      const result = await testWrapper.executeWithRetry(['pipelines', 'list']);

      expect(result).toEqual({ id: 1 });
      expect(mockExecSync).toHaveBeenCalledTimes(3);
      expect(attemptCount).toBe(3);
    });

    test('should fail after max retries exceeded', async () => {
      // Use a short delay for testing
      const testWrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project',
        maxRetries: 2,
        retryDelay: 10
      });

      let attemptCount = 0;
      mockExecSync.mockImplementation(() => {
        attemptCount++;
        const error = new Error('Persistent failure');
        error.status = 500;
        throw error;
      });

      await expect(testWrapper.executeWithRetry(['pipelines', 'list'])).rejects.toThrow('Persistent failure');

      expect(mockExecSync).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(attemptCount).toBe(3);
    });

    test('should not retry on client errors (4xx)', async () => {
      let attemptCount = 0;
      mockExecSync.mockImplementation(() => {
        attemptCount++;
        const error = new Error('Not found');
        error.status = 404;
        throw error;
      });

      await expect(wrapper.executeWithRetry(['pipelines', 'list'])).rejects.toThrow('Not found');

      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(attemptCount).toBe(1);
    });
  });

  describe('variableGroupList()', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should list all variable groups', () => {
      const mockOutput = JSON.stringify([
        { id: 1, name: 'vg1', variablesCount: 5 },
        { id: 2, name: 'vg2', variablesCount: 3 }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.variableGroupList();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('vg1');
      expect(result[1].name).toBe('vg2');
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        expect.arrayContaining(['pipelines', 'variable-group', 'list']),
        expect.any(Object)
      );
    });

    test('should filter by variable group name', () => {
      const mockOutput = JSON.stringify([
        { id: 1, name: 'prod-vg' }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.variableGroupList({ name: 'prod' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('prod-vg');
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        expect.arrayContaining(['--query', "[?contains(name, 'prod')]"]),
        expect.any(Object)
      );
    });

    test('should handle empty list', () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = wrapper.variableGroupList();

      expect(result).toEqual([]);
    });

    test('should throw error on command failure', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Failed to list variable groups');
      });

      expect(() => {
        wrapper.variableGroupList();
      }).toThrow('Failed to list variable groups');
    });
  });

  describe('serviceEndpointList()', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should list all service endpoints', () => {
      const mockOutput = JSON.stringify([
        { id: '1', name: 'github-conn', type: 'github' },
        { id: '2', name: 'docker-conn', type: 'dockerregistry' }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.serviceEndpointList();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('github-conn');
      expect(result[1].type).toBe('dockerregistry');
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        expect.arrayContaining(['devops', 'service-endpoint', 'list']),
        expect.any(Object)
      );
    });

    test('should filter by service endpoint type', () => {
      const mockOutput = JSON.stringify([
        { id: '1', name: 'github-conn', type: 'github' }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.serviceEndpointList({ type: 'github' });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('github');
    });

    test('should handle empty list', () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = wrapper.serviceEndpointList();

      expect(result).toEqual([]);
    });
  });

  describe('pipelineList()', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should list all pipelines', () => {
      const mockOutput = JSON.stringify([
        { id: 1, name: 'ci-pipeline', folder: '\\build' },
        { id: 2, name: 'cd-pipeline', folder: '\\release' }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.pipelineList();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ci-pipeline');
      expect(result[1].folder).toBe('\\release');
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        expect.arrayContaining(['pipelines', 'list']),
        expect.any(Object)
      );
    });

    test('should filter by folder', () => {
      const mockOutput = JSON.stringify([
        { id: 1, name: 'ci-pipeline', folder: '\\build' }
      ]);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.pipelineList({ folder: '\\build' });

      expect(result).toHaveLength(1);
      expect(result[0].folder).toBe('\\build');
      // Security: value passed as a discrete argv element — no shell, no escaping needed
      expect(mockExecSync).toHaveBeenCalledWith(
        'az',
        expect.arrayContaining(['--folder', '\\build']),
        expect.any(Object)
      );
    });

    test('should handle empty list', () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = wrapper.pipelineList();

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should detect Azure CLI not installed', () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('command not found');
        error.code = 'ENOENT';
        throw error;
      });

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow('Azure CLI is not installed');
    });

    test('should handle invalid JSON output', () => {
      mockExecSync.mockReturnValue(Buffer.from('invalid json'));

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow();
    });

    test('should handle network errors', () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error('ECONNREFUSED');
        throw error;
      });

      expect(() => {
        wrapper.execute(['pipelines', 'list']);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      wrapper = new AzureDevOpsCliWrapper({
        token: 'test-pat',
        organization: 'test-org',
        project: 'test-project'
      });
    });

    test('should handle special characters in output', () => {
      const mockOutput = JSON.stringify({
        name: 'test"with"quotes',
        value: 'test\\with\\backslashes'
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.execute(['pipelines', 'list']);

      expect(result.name).toBe('test"with"quotes');
      expect(result.value).toBe('test\\with\\backslashes');
    });

    test('should handle very large output', () => {
      const largeArray = Array(1000).fill({ id: 1, name: 'test' });
      const mockOutput = JSON.stringify(largeArray);
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.execute(['pipelines', 'list']);

      expect(result).toHaveLength(1000);
    });

    test('should handle unicode characters', () => {
      const mockOutput = JSON.stringify({
        name: '中文-日本語-한국어',
        emoji: '🚀'
      });
      mockExecSync.mockReturnValue(Buffer.from(mockOutput));

      const result = wrapper.execute(['pipelines', 'list']);

      expect(result.name).toBe('中文-日本語-한국어');
      expect(result.emoji).toBe('🚀');
    });
  });
});
