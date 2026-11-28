// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const { searchContent, formatSearchResults } = require('../../autopm/.claude/scripts/pm/search.js');

describe('PM Search', () => {
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

  describe('searchContent()', () => {
    it('should throw error when no query provided', () => {
      expect(() => searchContent()).toThrow('❌ Please provide a search query');
      expect(() => searchContent('')).toThrow('❌ Please provide a search query');
      expect(() => searchContent('   ')).toThrow('❌ Please provide a search query');
    });

    it('should return empty results when no directories exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = searchContent('test');

      expect(result).toEqual({
        prds: [],
        epics: [],
        tasks: [],
        total: 0
      });
    });

    it('should search in PRDs directory', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/prds') return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/prds') {
          return ['auth-system.md', 'user-management.md', 'readme.txt'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('auth-system.md')) {
          return 'Authentication system with login and logout features. User authentication required.';
        }
        if (filePath.includes('user-management.md')) {
          return 'User management dashboard for admin users. No authentication mentioned here.';
        }
        return '';
      });

      const result = searchContent('authentication');

      expect(result.prds).toHaveLength(2);
      expect(result.prds[0]).toEqual({
        name: 'auth-system',
        matches: 2
      });
      expect(result.prds[1]).toEqual({
        name: 'user-management',
        matches: 1
      });
      expect(result.total).toBe(2);
    });

    it('should search in epics directory', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('epic.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'feature-auth', isDirectory: () => true }];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('epic.md')) {
          return 'Epic for authentication feature development. Includes login functionality.';
        }
        return '';
      });

      const result = searchContent('login');

      expect(result.epics).toHaveLength(1);
      expect(result.epics[0]).toEqual({
        name: 'feature-auth',
        matches: 1
      });
      expect(result.total).toBe(1);
    });

    it('should search in task files', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', '2.md', 'epic.md', 'readme.txt'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('1.md')) {
          return 'Task 1: Implement login form with validation';
        }
        if (filePath.includes('2.md')) {
          return 'Task 2: Create user dashboard';
        }
        return '';
      });

      const result = searchContent('login');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual({
        taskNum: '1',
        epicName: 'epic1'
      });
      expect(result.total).toBe(1);
    });

    it('should limit task results to 10', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/epics') return true;
        if (path.includes('.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return Array.from({ length: 15 }, (_, i) => `${i + 1}.md`);
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'Task content with search term';
      });

      const result = searchContent('search');

      expect(result.tasks).toHaveLength(10);
    });

    it('should handle case insensitive search', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/prds') return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/prds') {
          return ['test.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        return 'Authentication AUTH auth AuTh authentication';
      });

      const result = searchContent('AUTH');

      expect(result.prds[0].matches).toBe(5);
    });

    it('should search across all categories', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/prds') return true;
        if (path === '.claude/epics') return true;
        if (path.includes('.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/prds') {
          return ['prd1.md'];
        }
        if (path === '.claude/epics') {
          return [{ name: 'epic1', isDirectory: () => true }];
        }
        if (path.includes('epic1')) {
          return ['1.md', 'epic.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('prd1.md')) {
          return 'PRD with API integration';
        }
        if (filePath.includes('epic.md')) {
          return 'Epic for API development';
        }
        if (filePath.includes('1.md')) {
          return 'Task: Build API endpoints';
        }
        return '';
      });

      const result = searchContent('API');

      expect(result.prds).toHaveLength(1);
      expect(result.epics).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it('should handle file read errors gracefully', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/prds') return true;
        return false;
      });

      fs.readdirSync.mockImplementation(path => {
        if (path === '.claude/prds') {
          return ['error.md', 'valid.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('error.md')) {
          throw new Error('File read error');
        }
        if (filePath.includes('valid.md')) {
          return 'Valid content with search term';
        }
        return '';
      });

      const result = searchContent('search');

      expect(result.prds).toHaveLength(1);
      expect(result.prds[0].name).toBe('valid');
    });
  });

  describe('formatSearchResults()', () => {
    it('should format results with no matches', () => {
      const results = {
        prds: [],
        epics: [],
        tasks: [],
        total: 0
      };

      const output = formatSearchResults('test', results);

      expect(output).toContain("Search results for: 'test'");
      expect(output).toContain('📄 PRDs:');
      expect(output).toContain('No matches');
      expect(output).toContain('📚 Epics:');
      expect(output).toContain('📝 Tasks:');
      expect(output).toContain('Total files with matches: 0');
    });

    it('should format results with matches', () => {
      const results = {
        prds: [{ name: 'auth-system', matches: 3 }],
        epics: [{ name: 'feature-auth', matches: 2 }],
        tasks: [{ taskNum: '1', epicName: 'feature-auth' }],
        total: 3
      };

      const output = formatSearchResults('auth', results);

      expect(output).toContain('• auth-system (3 matches)');
      expect(output).toContain('• feature-auth (2 matches)');
      expect(output).toContain('• Task #1 in feature-auth');
      expect(output).toContain('Total files with matches: 3');
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const searchModule = require('../../autopm/.claude/scripts/pm/search.js');
      expect(typeof searchModule.searchContent).toBe('function');
      expect(typeof searchModule.formatSearchResults).toBe('function');
    });

    it('should handle realistic search workflow', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude/prds') return true;
        if (path === '.claude/epics') return true;
        if (path.includes('.md')) return true;
        return false;
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path === '.claude/prds') {
          return ['authentication-system.md'];
        }
        if (path === '.claude/epics') {
          return [{ name: 'feature-auth', isDirectory: () => true }];
        }
        if (path.includes('feature-auth')) {
          return ['1.md', 'epic.md'];
        }
        return [];
      });

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('authentication-system.md')) {
          return 'Complete authentication system with user login';
        }
        if (filePath.includes('feature-auth/epic.md')) {
          return 'Authentication feature epic with user login capabilities';
        }
        if (filePath.includes('feature-auth/1.md')) {
          return 'Task: Implement user login form';
        }
        return '';
      });

      const result = searchContent('user');

      expect(result.prds).toHaveLength(1);
      expect(result.epics).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });
});