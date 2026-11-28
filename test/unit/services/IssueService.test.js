/**
 * IssueService Tests
 *
 * Test-Driven Development (TDD) tests for IssueService
 *
 * Context7 Documentation Applied:
 * - GitHub Issues API v3 best practices (2025)
 * - Azure DevOps work items REST API patterns
 * - Agile issue tracking workflow best practices
 * - mcp://context7/nodejs/testing-jest - Jest best practices and patterns
 *
 * Tests written BEFORE implementation following Red-Green-Refactor cycle
 */

const IssueService = require('../../../lib/services/IssueService');
const fs = require('fs-extra');
const path = require('path');

// Mock fs-extra for isolated testing
jest.mock('fs-extra');

describe('IssueService', () => {
  let service;

  beforeEach(() => {
    service = new IssueService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const service = new IssueService();
      expect(service).toBeDefined();
      expect(service.options).toBeDefined();
    });

    it('should accept custom options', () => {
      const service = new IssueService({
        issuesDir: '.claude/custom-issues',
        provider: 'github'
      });
      expect(service.options.issuesDir).toBe('.claude/custom-issues');
      expect(service.options.provider).toBe('github');
    });

    it('should accept provider services', () => {
      const mockProvider = { getIssue: jest.fn() };
      const service = new IssueService({ provider: mockProvider });
      expect(service.provider).toBe(mockProvider);
    });
  });

  describe('parseIssueMetadata', () => {
    it('should parse YAML frontmatter from issue content', () => {
      const content = `---
id: 123
title: Fix authentication bug
status: open
assignee: developer1
labels: bug, security
created: 2025-01-15T10:00:00Z
---

# Issue Content`;

      const result = service.parseIssueMetadata(content);

      expect(result).toEqual({
        id: 123,
        title: 'Fix authentication bug',
        status: 'open',
        assignee: 'developer1',
        labels: 'bug, security',
        created: '2025-01-15T10:00:00Z'
      });
    });

    it('should handle missing frontmatter', () => {
      const content = `# Issue without frontmatter`;
      const result = service.parseIssueMetadata(content);
      expect(result).toBeNull();
    });

    it('should handle empty frontmatter', () => {
      const content = `---\n---\n# Content`;
      const result = service.parseIssueMetadata(content);
      expect(result).toEqual({});
    });

    it('should return null for null content', () => {
      expect(service.parseIssueMetadata(null)).toBeNull();
    });

    it('should return null for non-string content', () => {
      expect(service.parseIssueMetadata(123)).toBeNull();
      expect(service.parseIssueMetadata({})).toBeNull();
    });
  });

  describe('getLocalIssue', () => {
    it('should read local issue file', async () => {
      const issueContent = `---
id: 123
title: Test Issue
status: open
---

# Issue Details`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.getLocalIssue(123);

      expect(result).toMatchObject({
        id: 123,
        title: 'Test Issue',
        status: 'open',
        content: issueContent
      });
    });

    it('should throw error if issue not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.getLocalIssue(999))
        .rejects
        .toThrow('Issue not found: 999');
    });

    it('should handle issue number as string', async () => {
      const issueContent = `---
id: 456
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.getLocalIssue('456');
      expect(result.id).toBe(456);
    });
  });

  describe('getIssueStatus', () => {
    it('should return current issue status', async () => {
      const issueContent = `---
id: 123
status: in-progress
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const status = await service.getIssueStatus(123);

      expect(status).toBe('in-progress');
    });

    it('should return default status if not set', async () => {
      const issueContent = `---
id: 123
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const status = await service.getIssueStatus(123);

      expect(status).toBe('open'); // Default status
    });

    it('should throw error if issue not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.getIssueStatus(999))
        .rejects
        .toThrow('Issue not found');
    });
  });

  describe('updateIssueStatus', () => {
    it('should update issue status in frontmatter', async () => {
      const issueContent = `---
id: 123
status: open
---

# Issue Content`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);
      fs.writeFile.mockResolvedValue(undefined);

      await service.updateIssueStatus(123, 'in-progress');

      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('status: in-progress');
    });

    it('should add started timestamp when moving to in-progress', async () => {
      const issueContent = `---
id: 123
status: open
created: 2025-01-15
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);
      fs.writeFile.mockResolvedValue(undefined);

      await service.updateIssueStatus(123, 'in-progress');

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('started:');
    });

    it('should add completed timestamp when closing', async () => {
      const issueContent = `---
id: 123
status: in-progress
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);
      fs.writeFile.mockResolvedValue(undefined);

      await service.updateIssueStatus(123, 'closed');

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('completed:');
    });

    it('should throw error if issue not found', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.updateIssueStatus(999, 'closed'))
        .rejects
        .toThrow('Issue not found');
    });
  });

  describe('validateIssue', () => {
    it('should validate correct issue structure', async () => {
      const issueContent = `---
id: 123
title: Valid Issue
status: open
created: 2025-01-15
---

# Issue Details`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.validateIssue(123);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should report missing frontmatter', async () => {
      const issueContent = `# Issue without frontmatter`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.validateIssue(123);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing frontmatter');
    });

    it('should report missing required fields', async () => {
      const issueContent = `---
status: open
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.validateIssue(123);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing id in frontmatter');
      expect(result.issues).toContain('Missing title in frontmatter');
    });

    it('should throw error if issue does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(service.validateIssue(999))
        .rejects
        .toThrow('Issue not found');
    });
  });

  describe('getIssueFiles', () => {
    it('should return list of related task files', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue([
        '123.md',
        '123-task-1.md',
        '123-task-2.md',
        '456.md'
      ]);

      const files = await service.getIssueFiles(123);

      expect(files).toHaveLength(3);
      expect(files).toContain('123.md');
      expect(files).toContain('123-task-1.md');
      expect(files).toContain('123-task-2.md');
      expect(files).not.toContain('456.md');
    });

    it('should return empty array if no files found', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue([]);

      const files = await service.getIssueFiles(123);

      expect(files).toEqual([]);
    });

    it('should return empty array if directory does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const files = await service.getIssueFiles(123);

      expect(files).toEqual([]);
    });
  });

  describe('getSubIssues', () => {
    it('should parse and return child issue numbers', async () => {
      const issueContent = `---
id: 100
title: Parent Issue
children: [101, 102, 103]
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const subIssues = await service.getSubIssues(100);

      expect(subIssues).toEqual(['101', '102', '103']);
    });

    it('should return empty array if no children', async () => {
      const issueContent = `---
id: 100
title: Issue without children
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const subIssues = await service.getSubIssues(100);

      expect(subIssues).toEqual([]);
    });

    it('should handle children as comma-separated string', async () => {
      const issueContent = `---
id: 100
children: 101, 102, 103
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const subIssues = await service.getSubIssues(100);

      expect(subIssues).toEqual(['101', '102', '103']);
    });
  });

  describe('getDependencies', () => {
    it('should parse and return blocking issue numbers', async () => {
      const issueContent = `---
id: 123
dependencies: [120, 121]
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const deps = await service.getDependencies(123);

      expect(deps).toEqual(['120', '121']);
    });

    it('should return empty array if no dependencies', async () => {
      const issueContent = `---
id: 123
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const deps = await service.getDependencies(123);

      expect(deps).toEqual([]);
    });

    it('should handle blocked_by field', async () => {
      const issueContent = `---
id: 123
blocked_by: [120, 121]
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      const deps = await service.getDependencies(123);

      expect(deps).toEqual(['120', '121']);
    });
  });

  describe('categorizeStatus', () => {
    it('should categorize open statuses', () => {
      expect(service.categorizeStatus('open')).toBe('open');
      expect(service.categorizeStatus('todo')).toBe('open');
      expect(service.categorizeStatus('new')).toBe('open');
    });

    it('should categorize in-progress statuses', () => {
      expect(service.categorizeStatus('in-progress')).toBe('in_progress');
      expect(service.categorizeStatus('in_progress')).toBe('in_progress');
      expect(service.categorizeStatus('active')).toBe('in_progress');
      expect(service.categorizeStatus('started')).toBe('in_progress');
    });

    it('should categorize closed statuses', () => {
      expect(service.categorizeStatus('closed')).toBe('closed');
      expect(service.categorizeStatus('completed')).toBe('closed');
      expect(service.categorizeStatus('done')).toBe('closed');
      expect(service.categorizeStatus('resolved')).toBe('closed');
    });

    it('should be case insensitive', () => {
      expect(service.categorizeStatus('OPEN')).toBe('open');
      expect(service.categorizeStatus('In-Progress')).toBe('in_progress');
      expect(service.categorizeStatus('CLOSED')).toBe('closed');
    });

    it('should default unknown statuses to open', () => {
      expect(service.categorizeStatus('unknown')).toBe('open');
      expect(service.categorizeStatus('')).toBe('open');
    });
  });

  describe('isIssueClosed', () => {
    it('should return true for closed statuses', () => {
      expect(service.isIssueClosed({ status: 'closed' })).toBe(true);
      expect(service.isIssueClosed({ status: 'completed' })).toBe(true);
      expect(service.isIssueClosed({ status: 'done' })).toBe(true);
      expect(service.isIssueClosed({ status: 'resolved' })).toBe(true);
    });

    it('should return false for open statuses', () => {
      expect(service.isIssueClosed({ status: 'open' })).toBe(false);
      expect(service.isIssueClosed({ status: 'in-progress' })).toBe(false);
      expect(service.isIssueClosed({ status: 'todo' })).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(service.isIssueClosed({ status: 'CLOSED' })).toBe(true);
      expect(service.isIssueClosed({ status: 'Completed' })).toBe(true);
    });

    it('should handle empty status', () => {
      expect(service.isIssueClosed({ status: '' })).toBe(false);
      expect(service.isIssueClosed({ status: null })).toBe(false);
      expect(service.isIssueClosed(null)).toBe(false);
    });
  });

  describe('getIssuePath', () => {
    it('should return correct issue file path', () => {
      const issuePath = service.getIssuePath(123);
      expect(issuePath).toBe(path.join(process.cwd(), '.claude', 'issues', '123.md'));
    });

    it('should handle custom issues directory', () => {
      const customService = new IssueService({ issuesDir: '.custom/issues' });
      const issuePath = customService.getIssuePath(123);
      expect(issuePath).toContain('.custom/issues/123.md');
    });

    it('should handle string issue numbers', () => {
      const issuePath = service.getIssuePath('456');
      expect(issuePath).toContain('456.md');
    });
  });

  describe('formatIssueDuration', () => {
    it('should format duration from start to end', () => {
      const start = '2025-01-15T10:00:00Z';
      const end = '2025-01-15T12:30:00Z';

      const duration = service.formatIssueDuration(start, end);

      expect(duration).toBe('2h 30m');
    });

    it('should calculate duration from start to now if no end', () => {
      const start = new Date(Date.now() - 1000 * 60 * 90).toISOString(); // 90 minutes ago

      const duration = service.formatIssueDuration(start);

      expect(duration).toContain('1h');
    });

    it('should format days and hours', () => {
      const start = '2025-01-15T10:00:00Z';
      const end = '2025-01-17T14:00:00Z';

      const duration = service.formatIssueDuration(start, end);

      expect(duration).toContain('day');
    });
  });

  describe('listIssues', () => {
    it('should return empty array when no issues directory exists', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await service.listIssues();

      expect(result).toEqual([]);
    });

    it('should list all issues with metadata', async () => {
      const issueContent = `---
id: 123
title: Test Issue
status: open
assignee: dev1
created: 2025-01-15
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['123.md', '456.md']);
      fs.readFile.mockResolvedValue(issueContent);

      const result = await service.listIssues();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 123,
        title: 'Test Issue',
        status: 'open',
        assignee: 'dev1'
      });
    });

    it('should filter by status', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['123.md', '456.md']);

      let callCount = 0;
      fs.readFile.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve('---\nid: 123\nstatus: open\n---');
        } else {
          return Promise.resolve('---\nid: 456\nstatus: closed\n---');
        }
      });

      const result = await service.listIssues({ status: 'open' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('open');
    });

    it('should skip invalid issue files', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['123.md', 'invalid.txt', 'README.md']);

      fs.readFile.mockResolvedValue('---\nid: 123\n---');

      const result = await service.listIssues();

      expect(result).toHaveLength(1);
    });
  });

  describe('syncIssueToProvider', () => {
    it('should push local issue to GitHub provider', async () => {
      const mockProvider = {
        updateIssue: jest.fn().mockResolvedValue({ success: true })
      };
      const service = new IssueService({ provider: mockProvider });

      const issueContent = `---
id: 123
title: Test
status: in-progress
---`;

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue(issueContent);

      await service.syncIssueToProvider(123);

      expect(mockProvider.updateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          status: 'in-progress'
        })
      );
    });

    it('should throw error if no provider configured', async () => {
      const service = new IssueService();

      await expect(service.syncIssueToProvider(123))
        .rejects
        .toThrow('No provider configured');
    });
  });

  describe('syncIssueFromProvider', () => {
    it('should pull issue from GitHub provider', async () => {
      const mockProvider = {
        getIssue: jest.fn().mockResolvedValue({
          id: '123',
          title: 'Updated Issue',
          status: 'closed',
          description: 'Issue from GitHub'
        })
      };
      const service = new IssueService({ provider: mockProvider });

      fs.writeFile.mockResolvedValue(undefined);

      await service.syncIssueFromProvider(123);

      expect(mockProvider.getIssue).toHaveBeenCalledWith('123');
      expect(fs.writeFile).toHaveBeenCalled();

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('title: Updated Issue');
      expect(writtenContent).toContain('status: closed');
    });

    it('should throw error if no provider configured', async () => {
      const service = new IssueService();

      await expect(service.syncIssueFromProvider(123))
        .rejects
        .toThrow('No provider configured');
    });
  });
});
