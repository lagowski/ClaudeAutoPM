// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const listEpics = require('../../autopm/.claude/scripts/pm/epic-list.js');

describe('PM Epic List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Default mock: no directories exist
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('');
  });

  describe('listEpics()', () => {
    it('should return default result structure', () => {
      const result = listEpics();

      expect(result).toHaveProperty('planning');
      expect(result).toHaveProperty('inProgress');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.planning)).toBe(true);
      expect(Array.isArray(result.inProgress)).toBe(true);
      expect(Array.isArray(result.completed)).toBe(true);
      expect(result.summary).toHaveProperty('totalEpics');
      expect(result.summary).toHaveProperty('totalTasks');
    });

    it('should return empty result when epics directory missing', () => {
      fs.existsSync.mockReturnValue(false);

      const result = listEpics();

      expect(result.planning).toHaveLength(0);
      expect(result.inProgress).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
      expect(result.summary.totalEpics).toBe(0);
      expect(result.summary.totalTasks).toBe(0);
    });

    it('should return empty result when epics directory is empty', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      const result = listEpics();

      expect(result.planning).toHaveLength(0);
      expect(result.summary.totalEpics).toBe(0);
    });

    it('should handle epics directory read error', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(0);
      expect(result.summary.totalEpics).toBe(0);
    });

    it('should skip directories without epic.md file', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return false;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        return [];
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(0);
      expect(result.summary.totalEpics).toBe(1); // Directory exists but no epic
    });

    it('should parse epic with YAML frontmatter', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'test-epic', isDirectory: () => true }];
        }
        return ['1.md', '2.md'];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `---
name: Test Epic
status: in-progress
progress: 50%
github: https://github.com/user/repo/issues/123
created: 2023-01-01
---

Epic description here.`;
        }
        return '';
      });

      const result = listEpics();

      expect(result.inProgress).toHaveLength(1);
      const epic = result.inProgress[0];
      expect(epic.name).toBe('Test Epic');
      expect(epic.status).toBe('in-progress');
      expect(epic.progress).toBe('50%');
      expect(epic.github).toBe('https://github.com/user/repo/issues/123');
      expect(epic.githubIssue).toBe('123');
      expect(epic.created).toBe('2023-01-01');
      expect(epic.taskCount).toBe(2);
    });

    it('should parse epic with simple key-value format', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'simple-epic', isDirectory: () => true }];
        }
        return ['1.md'];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return `name: Simple Epic
status: completed
progress: 100%

# Epic Content

Some content here.`;
        }
        return '';
      });

      const result = listEpics();

      expect(result.completed).toHaveLength(1);
      const epic = result.completed[0];
      expect(epic.name).toBe('Simple Epic');
      expect(epic.status).toBe('completed');
      expect(epic.progress).toBe('100%');
      expect(epic.taskCount).toBe(1);
    });

    it('should use defaults for missing metadata', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'minimal-epic', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'Just content, no metadata';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      const epic = result.planning[0];
      expect(epic.name).toBe('minimal-epic'); // Uses directory name
      expect(epic.status).toBe('planning');
      expect(epic.progress).toBe('0%');
      expect(epic.taskCount).toBe(0);
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'error-epic', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        throw new Error('File read error');
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      const epic = result.planning[0];
      expect(epic.name).toBe('error-epic');
      expect(epic.status).toBe('planning');
    });

    it('should categorize statuses correctly', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'planning-epic', isDirectory: () => true },
            { name: 'active-epic', isDirectory: () => true },
            { name: 'done-epic', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('planning-epic')) {
          return 'status: draft';
        }
        if (filePath.includes('active-epic')) {
          return 'status: active';
        }
        if (filePath.includes('done-epic')) {
          return 'status: done';
        }
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.completed).toHaveLength(1);
      expect(result.planning[0].epicDir).toBe('planning-epic');
      expect(result.inProgress[0].epicDir).toBe('active-epic');
      expect(result.completed[0].epicDir).toBe('done-epic');
    });

    it('should count tasks correctly', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'task-epic', isDirectory: () => true }];
        }
        if (path.includes('task-epic')) {
          return ['1.md', '2.md', '10.md', 'epic.md', 'readme.md', 'notes.txt'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'name: Task Epic\nstatus: planning';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.planning[0].taskCount).toBe(3); // Only numbered .md files
      expect(result.summary.totalTasks).toBe(3);
    });

    it('should handle task counting errors', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'error-epic', isDirectory: () => true }];
        }
        throw new Error('Directory read error');
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'name: Error Epic';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.planning[0].taskCount).toBe(0);
    });

    it('should extract GitHub issue numbers correctly', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'epic1', isDirectory: () => true },
            { name: 'epic2', isDirectory: () => true },
            { name: 'epic3', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic1')) {
          return 'github: https://github.com/user/repo/issues/123';
        }
        if (filePath.includes('epic2')) {
          return 'github: https://github.com/user/repo/pull/456';
        }
        if (filePath.includes('epic3')) {
          return 'github: https://github.com/user/repo';
        }
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(3);
      expect(result.planning[0].githubIssue).toBe('123');
      expect(result.planning[1].githubIssue).toBe('456');
      expect(result.planning[2].githubIssue).toBe(null);
    });

    it('should handle multiple epics with different statuses', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'auth-epic', isDirectory: () => true },
            { name: 'user-epic', isDirectory: () => true },
            { name: 'api-epic', isDirectory: () => true }
          ];
        }
        if (path.includes('auth-epic')) return ['1.md', '2.md'];
        if (path.includes('user-epic')) return ['1.md'];
        if (path.includes('api-epic')) return ['1.md', '2.md', '3.md'];
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('auth-epic')) {
          return 'name: Authentication\nstatus: in-progress\nprogress: 75%';
        }
        if (filePath.includes('user-epic')) {
          return 'name: User Management\nstatus: completed\nprogress: 100%';
        }
        if (filePath.includes('api-epic')) {
          return 'name: API Development\nstatus: planning\nprogress: 10%';
        }
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.completed).toHaveLength(1);
      expect(result.summary.totalEpics).toBe(3);
      expect(result.summary.totalTasks).toBe(6);

      expect(result.planning[0].name).toBe('API Development');
      expect(result.inProgress[0].name).toBe('Authentication');
      expect(result.completed[0].name).toBe('User Management');
    });

    it('should handle status variations', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'epic1', isDirectory: () => true },
            { name: 'epic2', isDirectory: () => true },
            { name: 'epic3', isDirectory: () => true },
            { name: 'epic4', isDirectory: () => true },
            { name: 'epic5', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic1')) return 'status: in_progress';
        if (filePath.includes('epic2')) return 'status: started';
        if (filePath.includes('epic3')) return 'status: finished';
        if (filePath.includes('epic4')) return 'status: closed';
        if (filePath.includes('epic5')) return 'status: unknown';
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1); // unknown -> planning
      expect(result.inProgress).toHaveLength(2); // in_progress, started
      expect(result.completed).toHaveLength(2); // finished, closed
    });

    it('should set correct epic paths', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'test-epic', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'name: Test Epic';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.planning[0].epicDir).toBe('test-epic');
      expect(result.planning[0].epicPath).toBe('.claude/epics/test-epic/epic.md');
    });
  });

  describe('CLI Execution', () => {
    it('should exit with code 0 on success', () => {
      const originalMain = require.main;
      require.main = { filename: require.resolve('../../autopm/.claude/scripts/pm/epic-list.js') };

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/pm/epic-list.js')];
        require('../../autopm/.claude/scripts/pm/epic-list.js');
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      require.main = originalMain;
    });

    it('should handle CLI errors gracefully', () => {
      const originalMain = require.main;
      require.main = { filename: require.resolve('../../autopm/.claude/scripts/pm/epic-list.js') };

      // Mock to throw error during execution
      fs.existsSync.mockImplementation(() => {
        throw new Error('Critical filesystem error');
      });

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/pm/epic-list.js')];
        require('../../autopm/.claude/scripts/pm/epic-list.js');
      } catch (error) {
        expect(error.message).toContain('Process exit with code 1');
      }

      require.main = originalMain;
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const epicListModule = require('../../autopm/.claude/scripts/pm/epic-list.js');
      expect(typeof epicListModule).toBe('function');
      expect(epicListModule.name).toBe('listEpics');
    });

    it('should handle realistic epic structure', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'feature-auth', isDirectory: () => true },
            { name: 'feature-users', isDirectory: () => true },
            { name: 'feature-api', isDirectory: () => true }
          ];
        }
        if (path.includes('feature-auth')) return ['1.md', '2.md', '3.md'];
        if (path.includes('feature-users')) return ['1.md', '2.md'];
        if (path.includes('feature-api')) return ['1.md'];
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('feature-auth')) {
          return `---
name: Authentication System
status: in-progress
progress: 60%
github: https://github.com/company/project/issues/101
created: 2023-01-15
---`;
        }
        if (filePath.includes('feature-users')) {
          return `---
name: User Management
status: completed
progress: 100%
github: https://github.com/company/project/issues/102
created: 2023-01-10
---`;
        }
        if (filePath.includes('feature-api')) {
          return `---
name: API Infrastructure
status: planning
progress: 5%
github: https://github.com/company/project/issues/103
created: 2023-01-20
---`;
        }
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.completed).toHaveLength(1);
      expect(result.summary.totalEpics).toBe(3);
      expect(result.summary.totalTasks).toBe(6);

      // Check specific epic data
      const authEpic = result.inProgress[0];
      expect(authEpic.name).toBe('Authentication System');
      expect(authEpic.progress).toBe('60%');
      expect(authEpic.githubIssue).toBe('101');
      expect(authEpic.taskCount).toBe(3);
    });

    it('should work with edge cases', () => {
      fs.existsSync.mockImplementation(path => {
        return path === '.claude/epics' || path.includes('epic.md');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [
            { name: 'empty-epic', isDirectory: () => true },
            { name: 'malformed-epic', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('empty-epic')) {
          return '';
        }
        if (filePath.includes('malformed-epic')) {
          return 'invalid: yaml: format: here:';
        }
        return '';
      });

      const result = listEpics();

      expect(result.planning).toHaveLength(2);
      expect(result.planning[0].name).toBe('empty-epic');
      expect(result.planning[1].name).toBe('malformed-epic');
    });
  });
});