// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const getInProgressWork = require('../../autopm/.claude/scripts/pm/in-progress.js');

describe('PM In-Progress Work', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn();

    // Default mock: no .claude/epics directory
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('');
  });

  describe('getInProgressWork()', () => {
    it('should return empty result when .claude/epics does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = getInProgressWork();

      expect(result).toEqual({
        activeIssues: [],
        activeEpics: [],
        totalActive: 0
      });
    });

    it('should return empty result when no epic directories exist', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      const result = getInProgressWork();

      expect(result).toEqual({
        activeIssues: [],
        activeEpics: [],
        totalActive: 0
      });
    });

    it('should find active issues with progress files', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [{ name: '1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          return `completion: 50%
last_sync: 2024-01-01 12:00:00
description: Working on task`;
        }
        if (filePath.includes('1.md')) {
          return `name: Active Task
status: in-progress
description: Task description`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(1);
      expect(result.activeIssues).toHaveLength(1);
      expect(result.activeIssues[0]).toEqual({
        issueNum: '1',
        epicName: 'epic1',
        taskName: 'Active Task',
        completion: '50%',
        lastSync: '2024-01-01 12:00:00'
      });
    });

    it('should handle missing task names', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('1.md')) return false; // Task file missing
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [{ name: '1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          return `completion: 30%
description: Progress update`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(1);
      expect(result.activeIssues[0].taskName).toBe('Unknown task');
    });

    it('should handle progress files without completion', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('1.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [{ name: '1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          return `description: No completion specified`;
        }
        if (filePath.includes('1.md')) {
          return `name: Task Without Completion`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeIssues[0].completion).toBe('0%');
      expect(result.activeIssues[0].lastSync).toBeNull();
    });

    it('should find active epics with in-progress status', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `name: Active Epic
status: in-progress
progress: 75%
description: Epic in progress`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeEpics).toHaveLength(1);
      expect(result.activeEpics[0]).toEqual({
        epicName: 'epic1',
        name: 'Active Epic',
        status: 'in-progress',
        progress: '75%',
        updated: '—'
      });
    });

    it('should find epics with active status', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `name: Active Epic
status: active
description: Active epic`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeEpics).toHaveLength(1);
      expect(result.activeEpics[0]).toEqual({
        epicName: 'epic1',
        name: 'Active Epic',
        status: 'active',
        progress: '0%',
        updated: '—'
      });
    });

    it('should skip epics with completed status', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `name: Completed Epic
status: completed
progress: 100%
description: Completed epic`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeEpics).toHaveLength(0);
    });

    it('should handle epics without name field', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'my-epic', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `status: in-progress
description: Epic without name`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeEpics).toHaveLength(1);
      expect(result.activeEpics[0].name).toBe('my-epic');
    });

    it('should handle multiple active issues and epics', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('epic.md')) return true;
        if (path.includes('.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'epic1', isDirectory: () => true },
            { name: 'epic2', isDirectory: () => true }
          ];
        }
        if (path.includes('epic1/updates')) {
          return [
            { name: '1', isDirectory: () => true },
            { name: '2', isDirectory: () => true }
          ];
        }
        if (path.includes('epic2/updates')) {
          return [{ name: '3', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          return `completion: 60%
last_sync: 2024-01-01`;
        }
        if (filePath.includes('epic1/epic.md')) {
          return `name: First Epic
status: in-progress
progress: 40%`;
        }
        if (filePath.includes('epic2/epic.md')) {
          return `name: Second Epic
status: active
progress: 20%`;
        }
        if (filePath.includes('1.md')) {
          return `name: Task One`;
        }
        if (filePath.includes('2.md')) {
          return `name: Task Two`;
        }
        if (filePath.includes('3.md')) {
          return `name: Task Three`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(3);
      expect(result.activeIssues).toHaveLength(3);
      expect(result.activeEpics).toHaveLength(2);
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [{ name: '1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          throw new Error('File read error');
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(0);
      expect(result.activeIssues).toHaveLength(0);
    });

    it('should handle directory read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          throw new Error('Directory read error');
        }
        return [];
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(0);
      expect(result.activeIssues).toHaveLength(0);
    });

    it('should handle missing updates directory', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return false; // Updates directory missing
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `name: Epic Without Updates
status: in-progress`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeIssues).toHaveLength(0);
      expect(result.activeEpics).toHaveLength(1);
    });

    it('should parse issue numbers correctly', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('123.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [{ name: '123', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('progress.md')) {
          return `completion: 25%`;
        }
        if (filePath.includes('123.md')) {
          return `name: High Number Task`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.activeIssues[0].issueNum).toBe('123');
      expect(result.activeIssues[0].taskName).toBe('High Number Task');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const inProgressModule = require('../../autopm/.claude/scripts/pm/in-progress.js');
      expect(typeof inProgressModule).toBe('function');
      expect(inProgressModule.name).toBe('getInProgressWork');
    });

    it('should handle realistic workflow', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('feature-auth')) return true;
        if (path.includes('updates')) return true;
        if (path.includes('progress.md')) return true;
        if (path.includes('epic.md')) return true;
        if (path.includes('1.md')) return true;
        if (path.includes('2.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'feature-auth', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return [
            { name: '1', isDirectory: () => true },
            { name: '2', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('feature-auth/updates/1/progress.md')) {
          return `completion: 80%
last_sync: 2024-01-01 10:00:00
agent: frontend-developer
description: Login UI almost complete`;
        }
        if (filePath.includes('feature-auth/updates/2/progress.md')) {
          return `completion: 30%
last_sync: 2024-01-01 09:00:00
agent: backend-developer
description: Auth API in progress`;
        }
        if (filePath.includes('feature-auth/epic.md')) {
          return `name: Authentication Feature
status: in-progress
progress: 55%
description: Complete authentication system`;
        }
        if (filePath.includes('feature-auth/1.md')) {
          return `name: Implement login UI
status: in-progress`;
        }
        if (filePath.includes('feature-auth/2.md')) {
          return `name: Create auth API
status: in-progress`;
        }
        return '';
      });

      const result = getInProgressWork();

      expect(result.totalActive).toBe(2);
      expect(result.activeIssues).toHaveLength(2);
      expect(result.activeEpics).toHaveLength(1);

      expect(result.activeIssues[0]).toEqual({
        issueNum: '1',
        epicName: 'feature-auth',
        taskName: 'Implement login UI',
        completion: '80%',
        lastSync: '2024-01-01 10:00:00'
      });

      expect(result.activeEpics[0]).toEqual({
        epicName: 'feature-auth',
        name: 'Authentication Feature',
        status: 'in-progress',
        progress: '55%',
        updated: '—'
      });
    });

    it('should handle CLI execution', () => {
      // Mock for CLI execution test
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'test-epic', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockReturnValue(`name: Test Epic
status: active`);

      // Test that the module can be executed
      const result = getInProgressWork();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('activeIssues');
      expect(result).toHaveProperty('activeEpics');
      expect(result).toHaveProperty('totalActive');
    });

    it('should handle empty directories', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('updates')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'empty-epic', isDirectory: () => true }];
        }
        if (path.includes('updates')) {
          return []; // Empty updates directory
        }
        return [];
      });

      const result = getInProgressWork();

      expect(result).toEqual({
        activeIssues: [],
        activeEpics: [],
        totalActive: 0
      });
    });
  });
});