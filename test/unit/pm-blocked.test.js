// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const getBlockedTasks = require('../../autopm/.claude/scripts/pm/blocked.js');

describe('PM Blocked Tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn();

    // Default mock: no .claude/epics directory
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('');
  });

  describe('getBlockedTasks()', () => {
    it('should return empty result when .claude/epics does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = getBlockedTasks();

      expect(result).toEqual({
        blockedTasks: [],
        totalBlocked: 0
      });
    });

    it('should return empty result when no epic directories exist', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      const result = getBlockedTasks();

      expect(result).toEqual({
        blockedTasks: [],
        totalBlocked: 0
      });
    });

    it('should find blocked tasks with open dependencies', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true; // Task file exists
        if (path.includes('2.md')) return true; // Dependency file exists
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', '2.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Blocked Task
status: open
depends_on: [2]
description: Task waiting for dependency`;
        }
        if (filePath.includes('2.md')) {
          return `name: Dependency Task
status: open
description: Dependency task`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks).toHaveLength(1);
      expect(result.blockedTasks[0]).toEqual({
        taskNum: '1',
        taskName: 'Blocked Task',
        epicName: 'epic1',
        dependencies: ['2'],
        openDependencies: ['2'],
        since: '—'
      });
    });

    it('should not include tasks with completed dependencies', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', '2.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Unblocked Task
status: open
depends_on: [2]
description: Task with completed dependency`;
        }
        if (filePath.includes('2.md')) {
          return `name: Completed Task
status: completed
description: Completed dependency`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should handle multiple dependencies', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        if (path.includes('3.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', '2.md', '3.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Multi-Blocked Task
status: open
depends_on: [2, 3]
description: Task with multiple dependencies`;
        }
        if (filePath.includes('2.md')) {
          return `name: Open Dependency
status: open
description: Open dependency`;
        }
        if (filePath.includes('3.md')) {
          return `name: Completed Dependency
status: completed
description: Completed dependency`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0]).toEqual({
        taskNum: '1',
        taskName: 'Multi-Blocked Task',
        epicName: 'epic1',
        dependencies: ['2', '3'],
        openDependencies: ['2'],
        since: '—'
      });
    });

    it('should skip tasks without dependencies', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Independent Task
status: open
description: Task without dependencies`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should skip non-open tasks', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', '2.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Completed Task
status: completed
depends_on: [2]
description: Completed task with dependency`;
        }
        if (filePath.includes('2.md')) {
          return `name: Open Task
status: open
description: Open task`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should handle missing dependency files', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return false; // Missing dependency file
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Task with Missing Dependency
status: open
depends_on: [2]
description: Task with non-existent dependency`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0].openDependencies).toEqual(['2']);
    });

    it('should handle empty dependencies array', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Task with Empty Dependencies
status: open
depends_on: []
description: Task with empty dependencies`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should handle malformed dependencies', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Task with Malformed Dependencies
status: open
depends_on: invalid format
description: Task with invalid dependency format`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should handle multiple epics', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [
            { name: 'epic1', isDirectory: () => true },
            { name: 'epic2', isDirectory: () => true }
          ];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        if (path.includes('epic2')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic1/1.md')) {
          return `name: Epic1 Blocked Task
status: open
depends_on: [2]
description: Blocked task in epic1`;
        }
        if (filePath.includes('epic2/1.md')) {
          return `name: Epic2 Blocked Task
status: open
depends_on: [2]
description: Blocked task in epic2`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(2);
      expect(result.blockedTasks).toHaveLength(2);
      expect(result.blockedTasks[0].epicName).toBe('epic1');
      expect(result.blockedTasks[1].epicName).toBe('epic2');
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          throw new Error('File read error');
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should handle directory read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          throw new Error('Directory read error');
        }
        return [];
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(0);
      expect(result.blockedTasks).toHaveLength(0);
    });

    it('should parse task numbers correctly', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('123.md')) return true;
        if (path.includes('456.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['123.md', '456.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('123.md')) {
          return `name: High Number Task
status: open
depends_on: [456]
description: Task with high number`;
        }
        if (filePath.includes('456.md')) {
          return `name: Higher Number Task
status: open
description: Higher numbered task`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0].taskNum).toBe('123');
      expect(result.blockedTasks[0].dependencies).toEqual(['456']);
    });

    it('should handle tasks without name field', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `status: open
depends_on: [2]
description: Task without name field`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0].taskName).toBe('Task #1');
    });

    it('should handle complex dependency parsing with spaces', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        if (path.includes('3.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Complex Dependencies Task
status: open
depends_on: [ 2 , 3 ]
description: Task with spaced dependencies`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0].dependencies).toEqual(['2', '3']);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const blockedModule = require('../../autopm/.claude/scripts/pm/blocked.js');
      expect(typeof blockedModule).toBe('function');
      expect(blockedModule.name).toBe('getBlockedTasks');
    });

    it('should handle realistic workflow', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('feature-auth')) return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        if (path.includes('3.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'feature-auth', isDirectory: () => true }];
        }
        if (path.includes('feature-auth')) {
          return ['1.md', '2.md', '3.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return `name: Implement login UI
status: open
depends_on: [2, 3]
description: Create login form UI components`;
        }
        if (filePath.includes('2.md')) {
          return `name: Setup authentication backend
status: completed
description: Backend auth service`;
        }
        if (filePath.includes('3.md')) {
          return `name: Design user database schema
status: open
description: Database schema for users`;
        }
        return '';
      });

      const result = getBlockedTasks();

      expect(result.totalBlocked).toBe(1);
      expect(result.blockedTasks[0]).toEqual({
        taskNum: '1',
        taskName: 'Implement login UI',
        epicName: 'feature-auth',
        dependencies: ['2', '3'],
        openDependencies: ['3'],
        since: '—'
      });
    });

    it('should handle CLI execution', () => {
      // Mock for CLI execution test
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/epics') {
          return [{ name: 'test-epic', isDirectory: () => true }];
        }
        return ['1.md'];
      });

      fs.readFileSync.mockReturnValue(`name: Test Task
status: open
depends_on: [2]
description: Test task`);

      // Test that the module can be executed
      const result = getBlockedTasks();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('blockedTasks');
      expect(result).toHaveProperty('totalBlocked');
    });
  });
});