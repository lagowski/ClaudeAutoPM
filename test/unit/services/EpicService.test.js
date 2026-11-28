/**
 * EpicService Tests
 *
 * Test-Driven Development (TDD) tests for EpicService
 *
 * Context7 Documentation Applied:
 * - mcp://context7/agile/epic-management - Epic structure and lifecycle
 * - mcp://context7/project-management/issue-tracking - Metadata and status tracking
 * - mcp://context7/nodejs/testing-jest - Jest best practices and patterns
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 */

const EpicService = require('../../../lib/services/EpicService');
const fs = require('../../../lib/utils/fs');
const path = require('path');

// Mock lib/utils/fs for isolated testing
jest.mock('../../../lib/utils/fs');

describe('EpicService', () => {
  let service;

  beforeEach(() => {
    service = new EpicService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const service = new EpicService();
      expect(service).toBeDefined();
      expect(service.options).toBeDefined();
    });

    it('should accept custom options', () => {
      const service = new EpicService({
        defaultStatus: 'draft',
        epicsDir: '.claude/custom-epics'
      });
      expect(service.options.defaultStatus).toBe('draft');
      expect(service.options.epicsDir).toBe('.claude/custom-epics');
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse YAML frontmatter with all metadata fields', () => {
      const content = `---
name: User Authentication
status: in-progress
progress: 45%
github: https://github.com/user/repo/issues/123
created: 2025-01-15
---

# Epic Content`;

      const result = service.parseFrontmatter(content);

      expect(result).toEqual({
        name: 'User Authentication',
        status: 'in-progress',
        progress: '45%',
        github: 'https://github.com/user/repo/issues/123',
        created: '2025-01-15'
      });
    });

    it('should handle missing frontmatter', () => {
      const content = `# Epic Content\n\nSome content without frontmatter`;
      const result = service.parseFrontmatter(content);
      expect(result).toBeNull();
    });

    it('should handle empty frontmatter', () => {
      const content = `---\n---\n# Content`;
      const result = service.parseFrontmatter(content);
      expect(result).toEqual({});
    });

    it('should handle partial frontmatter', () => {
      const content = `---
name: Partial Epic
status: planning
---

# Content`;

      const result = service.parseFrontmatter(content);
      expect(result.name).toBe('Partial Epic');
      expect(result.status).toBe('planning');
      expect(result.progress).toBeUndefined();
    });

    it('should handle malformed frontmatter gracefully', () => {
      const content = `---
name: Test
invalid line without colon
status: draft
---`;

      const result = service.parseFrontmatter(content);
      expect(result.name).toBe('Test');
      expect(result.status).toBe('draft');
    });

    it('should return null for null content', () => {
      expect(service.parseFrontmatter(null)).toBeNull();
    });

    it('should return null for non-string content', () => {
      expect(service.parseFrontmatter(123)).toBeNull();
      expect(service.parseFrontmatter({})).toBeNull();
    });
  });

  describe('listEpics', () => {
    it('should return empty array when no epics directory exists', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.listEpics();

      expect(result).toEqual([]);
      expect(fs.pathExists).toHaveBeenCalledWith(
        path.join(process.cwd(), '.claude', 'epics')
      );
    });

    it('should return empty array when epics directory is empty', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue([]);

      const result = await service.listEpics();

      expect(result).toEqual([]);
    });

    it('should list all epics with metadata', async () => {
      const epicContent = `---
name: Test Epic
status: in-progress
progress: 50%
github: https://github.com/test/repo/issues/1
created: 2025-01-15
---

# Epic Content`;

      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue([
        { name: 'epic-001', isDirectory: () => true }
      ]);
      fs.pathExists
        .mockResolvedValueOnce(true) // epics dir exists
        .mockResolvedValueOnce(true); // epic.md exists
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir
        .mockResolvedValueOnce([{ name: 'epic-001', isDirectory: () => true }])
        .mockResolvedValueOnce(['001.md', '002.md']); // task files

      const result = await service.listEpics();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Test Epic',
        status: 'in-progress',
        progress: '50%',
        epicDir: 'epic-001',
        taskCount: 2
      });
    });

    it('should categorize epics by status', async () => {
      const mockEpics = [
        { name: 'epic-1', content: '---\nstatus: planning\n---' },
        { name: 'epic-2', content: '---\nstatus: in-progress\n---' },
        { name: 'epic-3', content: '---\nstatus: completed\n---' }
      ];

      // Setup initial pathExists for epics directory
      fs.pathExists
        .mockResolvedValueOnce(true)  // epics dir exists
        .mockResolvedValueOnce(true)  // epic-1/epic.md exists
        .mockResolvedValueOnce(true)  // epic-2/epic.md exists
        .mockResolvedValueOnce(true); // epic-3/epic.md exists

      // Setup readdir calls
      fs.readdir
        .mockResolvedValueOnce(mockEpics.map(e => ({ name: e.name, isDirectory: () => true })))  // list epics
        .mockResolvedValueOnce([])  // epic-1 tasks
        .mockResolvedValueOnce([])  // epic-2 tasks
        .mockResolvedValueOnce([]);  // epic-3 tasks

      // Setup readFile calls for each epic
      let readFileCallCount = 0;
      fs.readFile.mockImplementation(() => {
        return Promise.resolve(mockEpics[readFileCallCount++].content);
      });

      const result = await service.listEpics();

      expect(result).toHaveLength(3);
      const statuses = result.map(e => service.categorizeStatus(e.status));
      expect(statuses).toContain('planning');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('done');
    });

    it('should handle epics without epic.md file', async () => {
      fs.pathExists
        .mockResolvedValueOnce(true)  // epics dir exists
        .mockResolvedValueOnce(false); // epic.md does not exist
      fs.readdir.mockResolvedValue([
        { name: 'epic-001', isDirectory: () => true }
      ]);

      const result = await service.listEpics();

      expect(result).toEqual([]);
    });

    it('should count tasks correctly', async () => {
      const epicContent = '---\nname: Test\nstatus: planning\n---';

      fs.pathExists.mockResolvedValue(true);
      fs.readdir
        .mockResolvedValueOnce([{ name: 'epic-001', isDirectory: () => true }])
        .mockResolvedValueOnce(['001.md', '002.md', '003.md', 'epic.md', 'notes.txt']);
      fs.readFile.mockResolvedValue(epicContent);

      const result = await service.listEpics();

      expect(result[0].taskCount).toBe(3);
    });
  });

  describe('getEpic', () => {
    it('should return epic data by name', async () => {
      const epicContent = `---
name: Test Epic
status: in-progress
progress: 60%
---

# Epic Content`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue(['001.md', '002.md']);

      const result = await service.getEpic('test-epic');

      expect(result).toMatchObject({
        name: 'Test Epic',
        status: 'in-progress',
        progress: '60%',
        taskCount: 2
      });
    });

    it('should throw error if epic not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.getEpic('non-existent'))
        .rejects
        .toThrow('Epic not found');
    });

    it('should use epic directory name as fallback', async () => {
      const epicContent = '---\nstatus: planning\n---';

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue([]);

      const result = await service.getEpic('my-epic');

      expect(result.name).toBe('my-epic');
    });

    it('should extract GitHub issue number', async () => {
      const epicContent = `---
github: https://github.com/user/repo/issues/456
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue([]);

      const result = await service.getEpic('test');

      expect(result.githubIssue).toBe('456');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress from task statuses', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'open' },
        { status: 'open' }
      ];

      const progress = service.calculateProgress(tasks);

      expect(progress).toBe(50);
    });

    it('should return 0 for epics with no tasks', () => {
      const progress = service.calculateProgress([]);
      expect(progress).toBe(0);
    });

    it('should return 100 for all completed tasks', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' }
      ];

      const progress = service.calculateProgress(tasks);
      expect(progress).toBe(100);
    });

    it('should handle different closed status formats', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'closed' },
        { status: 'open' },
        { status: 'open' }
      ];

      const progress = service.calculateProgress(tasks);
      expect(progress).toBe(50); // 2 out of 4 are closed
    });

    it('should round progress to nearest integer', () => {
      const tasks = [
        { status: 'completed' },
        { status: 'open' },
        { status: 'open' }
      ];

      const progress = service.calculateProgress(tasks);
      expect(progress).toBe(33); // 33.33 rounded
    });
  });

  describe('categorizeStatus', () => {
    it('should categorize planning statuses', () => {
      expect(service.categorizeStatus('planning')).toBe('planning');
      expect(service.categorizeStatus('draft')).toBe('planning');
      expect(service.categorizeStatus('')).toBe('planning');
    });

    it('should categorize in-progress statuses', () => {
      expect(service.categorizeStatus('in-progress')).toBe('in_progress');
      expect(service.categorizeStatus('in_progress')).toBe('in_progress');
      expect(service.categorizeStatus('active')).toBe('in_progress');
      expect(service.categorizeStatus('started')).toBe('in_progress');
    });

    it('should categorize completed statuses', () => {
      expect(service.categorizeStatus('completed')).toBe('done');
      expect(service.categorizeStatus('complete')).toBe('done');
      expect(service.categorizeStatus('done')).toBe('done');
      expect(service.categorizeStatus('closed')).toBe('done');
    });

    it('should be case insensitive', () => {
      expect(service.categorizeStatus('PLANNING')).toBe('planning');
      expect(service.categorizeStatus('In-Progress')).toBe('in_progress');
      expect(service.categorizeStatus('COMPLETED')).toBe('done');
    });

    it('should default unknown statuses to planning', () => {
      expect(service.categorizeStatus('unknown')).toBe('planning');
      expect(service.categorizeStatus('custom-status')).toBe('planning');
    });
  });

  describe('extractGitHubIssue', () => {
    it('should extract issue number from GitHub URL', () => {
      const url = 'https://github.com/user/repo/issues/123';
      expect(service.extractGitHubIssue(url)).toBe('123');
    });

    it('should return null for empty URL', () => {
      expect(service.extractGitHubIssue('')).toBeNull();
      expect(service.extractGitHubIssue(null)).toBeNull();
    });

    it('should return null for invalid URL', () => {
      expect(service.extractGitHubIssue('not-a-url')).toBeNull();
    });

    it('should handle pull request URLs', () => {
      const url = 'https://github.com/user/repo/pull/456';
      expect(service.extractGitHubIssue(url)).toBe('456');
    });
  });

  describe('isTaskClosed', () => {
    it('should return true for closed statuses', () => {
      expect(service.isTaskClosed({ status: 'closed' })).toBe(true);
      expect(service.isTaskClosed({ status: 'completed' })).toBe(true);
      expect(service.isTaskClosed({ status: 'done' })).toBe(false); // Not in the closed list
    });

    it('should return false for open statuses', () => {
      expect(service.isTaskClosed({ status: 'open' })).toBe(false);
      expect(service.isTaskClosed({ status: 'in-progress' })).toBe(false);
      expect(service.isTaskClosed({ status: 'pending' })).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(service.isTaskClosed({ status: 'CLOSED' })).toBe(true);
      expect(service.isTaskClosed({ status: 'Completed' })).toBe(true);
    });

    it('should handle empty status', () => {
      expect(service.isTaskClosed({ status: '' })).toBe(false);
      expect(service.isTaskClosed({ status: null })).toBe(false);
      expect(service.isTaskClosed(null)).toBe(false);
    });
  });

  describe('validateEpicStructure', () => {
    it('should validate correct epic structure', async () => {
      const epicContent = `---
name: Valid Epic
status: planning
progress: 0%
created: 2025-01-15
---

# Valid Epic

## Description
A valid epic with proper structure.`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue([]);

      const result = await service.validateEpicStructure('valid-epic');

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should report missing frontmatter', async () => {
      const epicContent = `# Epic without frontmatter`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue([]);

      const result = await service.validateEpicStructure('invalid-epic');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing frontmatter');
    });

    it('should report missing required fields', async () => {
      const epicContent = `---
progress: 50%
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(epicContent);
      fs.readdir.mockResolvedValue([]);

      const result = await service.validateEpicStructure('incomplete-epic');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing name in frontmatter');
      expect(result.issues).toContain('Missing status in frontmatter');
    });

    it('should throw error if epic does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.validateEpicStructure('non-existent'))
        .rejects
        .toThrow('Epic not found');
    });
  });

  describe('countTasks', () => {
    it('should count task files correctly', async () => {
      fs.readdir.mockResolvedValue([
        '001.md',
        '002.md',
        '003.md',
        'epic.md',
        'notes.txt',
        '.hidden'
      ]);

      const count = await service.countTasks('.claude/epics/test-epic');

      expect(count).toBe(3);
    });

    it('should return 0 if directory does not exist', async () => {
      fs.readdir.mockRejectedValue(new Error('ENOENT'));

      const count = await service.countTasks('.claude/epics/missing');

      expect(count).toBe(0);
    });

    it('should handle empty directory', async () => {
      fs.readdir.mockResolvedValue([]);

      const count = await service.countTasks('.claude/epics/empty');

      expect(count).toBe(0);
    });
  });

  describe('getEpicPath', () => {
    it('should return correct epic path', () => {
      const epicPath = service.getEpicPath('my-epic');
      expect(epicPath).toBe(path.join(process.cwd(), '.claude', 'epics', 'my-epic'));
    });

    it('should handle custom epics directory', () => {
      const customService = new EpicService({ epicsDir: '.custom/epics' });
      const epicPath = customService.getEpicPath('my-epic');
      expect(epicPath).toContain('.custom/epics/my-epic');
    });
  });

  describe('getEpicFilePath', () => {
    it('should return path to epic.md file', () => {
      const filePath = service.getEpicFilePath('my-epic');
      expect(filePath).toBe(
        path.join(process.cwd(), '.claude', 'epics', 'my-epic', 'epic.md')
      );
    });
  });
});
