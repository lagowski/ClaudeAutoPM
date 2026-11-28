/**
 * CLI Task Commands Tests
 *
 * Tests for task management CLI commands using TaskService.
 * Simplified test suite for basic functionality.
 *
 * Related: Issue #314
 */

const taskCommands = require('../../../../lib/cli/commands/task');
const TaskService = require('../../../../lib/services/TaskService');
const fs = require('../../../../lib/utils/fs');
const ora = require('ora');

// Mock dependencies
jest.mock('../../../../lib/services/TaskService');
jest.mock('../../../../lib/utils/fs');
jest.mock('ora');

describe('Task Commands', () => {
  let mockTaskService;
  let mockConsoleLog;
  let mockConsoleError;
  let mockSpinner;

  beforeEach(() => {
    // Mock TaskService instance
    mockTaskService = {
      getTasks: jest.fn(),
      updateTaskStatus: jest.fn(),
      prioritize: jest.fn(),
      estimateEffort: jest.fn(),
      analyzeDependencies: jest.fn()
    };

    TaskService.mockImplementation(() => mockTaskService);

    // Mock console
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    // Mock ora spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      text: ''
    };
    ora.mockReturnValue(mockSpinner);

    // Mock fs
    fs.readFile = jest.fn();
    fs.writeFile = jest.fn();
    fs.pathExists = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Command Structure', () => {
    it('should export command object', () => {
      expect(taskCommands).toBeDefined();
      expect(taskCommands.command).toBe('task <action>');
      expect(taskCommands.describe).toBeDefined();
      expect(taskCommands.builder).toBeInstanceOf(Function);
    });
  });

  describe('task list', () => {
    it('should list all tasks', async () => {
      const argv = { action: 'list', epic: 'test-epic' };

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('Epic content with tasks');
      mockTaskService.getTasks.mockReturnValue([
        { id: 'task-1', title: 'Task 1', status: 'pending' },
        { id: 'task-2', title: 'Task 2', status: 'in-progress' }
      ]);

      await taskCommands.handler(argv);

      expect(mockTaskService.getTasks).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('2 tasks')
      );
    });
  });

  describe('task prioritize', () => {
    it('should prioritize tasks', async () => {
      const argv = { action: 'prioritize', epic: 'test-epic' };

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('Epic content');
      mockTaskService.prioritize.mockResolvedValue([
        { id: 'task-1', priority: 'P0' },
        { id: 'task-2', priority: 'P1' }
      ]);

      await taskCommands.handler(argv);

      expect(mockTaskService.prioritize).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing epic file', async () => {
      const argv = { action: 'list', epic: 'missing-epic' };

      fs.pathExists.mockResolvedValue(false);

      await taskCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Epic file not found')
      );
    });

    it('should handle invalid action', async () => {
      const argv = { action: 'invalid-action', epic: 'test-epic' };

      await taskCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown action')
      );
    });
  });
});
