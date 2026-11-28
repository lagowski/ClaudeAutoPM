const fs = require('../../../lib/utils/fs');
const path = require('path');
const UtilityService = require('../../../lib/services/UtilityService');
const glob = require('glob');

// Mock dependencies
jest.mock('../../../lib/utils/fs');
jest.mock('glob');

describe('UtilityService', () => {
  let utilityService;
  let mockRootPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootPath = '/mock/project';
    utilityService = new UtilityService({ rootPath: mockRootPath });
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const service = new UtilityService();
      expect(service.rootPath).toBe(process.cwd());
      expect(service.claudePath).toBe(path.join(process.cwd(), '.claude'));
    });

    it('should create instance with custom paths', () => {
      const customPath = '/custom/path';
      const service = new UtilityService({ rootPath: customPath });
      expect(service.rootPath).toBe(customPath);
      expect(service.claudePath).toBe(path.join(customPath, '.claude'));
    });
  });

  describe('initializeProject()', () => {
    it('should create all required directories', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.ensureDir.mockResolvedValue();
      fs.writeJson.mockResolvedValue();

      const result = await utilityService.initializeProject();

      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(mockRootPath, '.claude', 'epics'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(mockRootPath, '.claude', 'prds'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(mockRootPath, '.claude', 'context'));
      expect(result.created).toContain('.claude/epics');
      expect(result.created).toContain('.claude/prds');
      expect(result.created).toContain('.claude/context');
    });

    it('should initialize config.json', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.ensureDir.mockResolvedValue();
      fs.writeJson.mockResolvedValue();

      const result = await utilityService.initializeProject();

      expect(fs.writeJson).toHaveBeenCalledWith(
        path.join(mockRootPath, '.claude', 'config.json'),
        expect.objectContaining({
          version: expect.any(String),
          provider: null,
          initialized: expect.any(String)
        }),
        { spaces: 2 }
      );
      expect(result.config).toBeDefined();
    });

    it('should skip existing files without force', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.initializeProject({ force: false });

      expect(result.created).toHaveLength(0);
      expect(fs.writeJson).not.toHaveBeenCalled();
    });

    it('should overwrite with force option', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.ensureDir.mockResolvedValue();
      fs.writeJson.mockResolvedValue();

      const result = await utilityService.initializeProject({ force: true });

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeJson).toHaveBeenCalled();
      expect(result.created.length).toBeGreaterThan(0);
    });

    it('should use template when provided', async () => {
      fs.pathExists.mockResolvedValue(false);
      fs.ensureDir.mockResolvedValue();
      fs.writeJson.mockResolvedValue();
      fs.readJson.mockResolvedValue({
        provider: 'github',
        settings: { apiUrl: 'https://api.github.com' }
      });

      const result = await utilityService.initializeProject({
        template: '/path/to/template.json'
      });

      expect(fs.readJson).toHaveBeenCalledWith('/path/to/template.json');
      expect(result.config.provider).toBe('github');
    });
  });

  describe('validateProject()', () => {
    it('should validate correct project structure', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        version: '1.0.0',
        provider: 'github'
      });
      glob.sync = jest.fn().mockReturnValue([]);

      const result = await utilityService.validateProject();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing directories', async () => {
      fs.pathExists.mockImplementation(async (dirPath) => {
        return !dirPath.includes('epics');
      });

      const result = await utilityService.validateProject();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing required directory')
      );
    });

    it('should detect invalid config', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ invalid: 'config' });

      const result = await utilityService.validateProject();

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid config.json')
      );
    });

    it('should detect broken references', async () => {
      fs.pathExists.mockImplementation(async (p) => {
        // Directories exist, but issue-missing.md doesn't
        return !p.includes('issue-missing.md');
      });
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      fs.readFile.mockResolvedValue(`---
title: Test Epic
status: active
issues:
  - issue-missing.md
---`);
      glob.sync = jest.fn().mockReturnValue([path.join(mockRootPath, '.claude', 'epics', 'epic-1.md')]);

      const result = await utilityService.validateProject();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Broken reference')
      );
    });

    it('should auto-fix when fix=true', async () => {
      fs.pathExists.mockImplementation(async (dirPath) => {
        return !dirPath.includes('prds');
      });
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.validateProject({ fix: true });

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Auto-fixed')
      );
    });

    it('should perform strict validation when strict=true', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({
        version: '1.0.0',
        // Missing provider field
      });
      glob.sync = jest.fn().mockReturnValue([]);

      const result = await utilityService.validateProject({ strict: true });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('syncAll()', () => {
    it('should sync all entities when type=all', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'issue-1.md', 'prd-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Test\n---\nContent');

      const result = await utilityService.syncAll({ type: 'all' });

      expect(result.synced).toBeDefined();
      expect(result.synced.epics).toBeDefined();
      expect(result.synced.issues).toBeDefined();
      expect(result.synced.prds).toBeDefined();
    });

    it('should sync only epics when type=epic', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\n---');

      const result = await utilityService.syncAll({ type: 'epic' });

      expect(result.synced.epics).toBeDefined();
      expect(result.synced.issues).toBeUndefined();
      expect(result.synced.prds).toBeUndefined();
    });

    it('should handle dry-run mode', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\n---');
      fs.writeFile.mockResolvedValue();

      const result = await utilityService.syncAll({
        type: 'all',
        dryRun: true
      });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result.synced).toBeDefined();
    });

    it('should handle sync errors gracefully', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'epic-2.md']);
      fs.readFile.mockRejectedValueOnce(new Error('Read failed'));

      const result = await utilityService.syncAll({ type: 'all' });

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cleanArtifacts()', () => {
    it('should remove stale files', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

      glob.sync = jest.fn().mockReturnValue(['old-file.md']);
      fs.stat.mockResolvedValue({ mtime: oldDate });
      fs.readFile.mockResolvedValue('---\nstatus: completed\n---');
      fs.remove.mockResolvedValue();

      const result = await utilityService.cleanArtifacts({ archive: false });

      expect(result.removed).toContain('old-file.md');
      expect(fs.remove).toHaveBeenCalled();
    });

    it('should archive before removing', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const archivePath = path.join(mockRootPath, '.claude', 'archive');

      glob.sync = jest.fn().mockReturnValue(['old-file.md']);
      fs.stat.mockResolvedValue({ mtime: oldDate });
      fs.readFile.mockResolvedValue('---\nstatus: completed\n---');
      fs.ensureDir.mockResolvedValue();
      fs.copy.mockResolvedValue();
      fs.remove.mockResolvedValue();

      const result = await utilityService.cleanArtifacts({ archive: true });

      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('archive'));
      expect(fs.copy).toHaveBeenCalled();
      expect(result.archived).toContain('old-file.md');
    });

    it('should respect dry-run mode', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

      glob.sync = jest.fn().mockReturnValue(['old-file.md']);
      fs.stat.mockResolvedValue({ mtime: oldDate });
      fs.readFile.mockResolvedValue('---\nstatus: completed\n---');

      const result = await utilityService.cleanArtifacts({
        archive: false,
        dryRun: true
      });

      expect(fs.remove).not.toHaveBeenCalled();
      expect(result.removed.length).toBeGreaterThan(0);
    });
  });

  describe('searchEntities()', () => {
    it('should search across all entity types', async () => {
      glob.sync = jest.fn().mockReturnValue([
        'epics/epic-1.md',
        'issues/issue-1.md',
        'prds/prd-1.md'
      ]);
      fs.readFile.mockResolvedValue('---\ntitle: Test Query\n---\nContent with query');

      const result = await utilityService.searchEntities('query', { type: 'all' });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.matches).toBeGreaterThan(0);
    });

    it('should support regex patterns', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Test-123\n---');

      const result = await utilityService.searchEntities('Test-\\d+', {
        regex: true
      });

      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'epic-2.md']);
      fs.readFile
        .mockResolvedValueOnce('---\ntitle: Epic 1\nstatus: active\n---')
        .mockResolvedValueOnce('---\ntitle: Epic 2\nstatus: completed\n---');

      const result = await utilityService.searchEntities('Epic', {
        status: 'active'
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Epic 1');
    });

    it('should filter by priority', async () => {
      glob.sync = jest.fn().mockReturnValue(['issue-1.md', 'issue-2.md']);
      fs.readFile
        .mockResolvedValueOnce('---\ntitle: Issue 1\npriority: high\n---')
        .mockResolvedValueOnce('---\ntitle: Issue 2\npriority: low\n---');

      const result = await utilityService.searchEntities('Issue', {
        priority: 'high'
      });

      expect(result.results).toHaveLength(1);
    });

    it('should return grouped results', async () => {
      glob.sync = jest.fn().mockReturnValue([
        'epics/epic-1.md',
        'issues/issue-1.md'
      ]);
      fs.readFile.mockResolvedValue('---\ntitle: Test\n---');

      const result = await utilityService.searchEntities('Test');

      const types = result.results.map(r => r.type);
      expect(types).toContain('epic');
      expect(types).toContain('issue');
    });
  });

  describe('importFromProvider()', () => {
    it('should import from CSV', async () => {
      const csvContent = 'title,description,status\nEpic 1,Description,active';
      fs.readFile.mockResolvedValue(csvContent);
      fs.writeFile.mockResolvedValue();
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.importFromProvider('/path/to/file.csv', {
        provider: 'csv'
      });

      expect(result.imported.length).toBeGreaterThan(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should import from JSON', async () => {
      const jsonData = [
        { title: 'Epic 1', description: 'Desc', status: 'active' }
      ];
      fs.readJson.mockResolvedValue(jsonData);
      fs.writeFile.mockResolvedValue();
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.importFromProvider('/path/to/file.json', {
        provider: 'json'
      });

      expect(result.imported.length).toBeGreaterThan(0);
    });

    it('should apply field mapping', async () => {
      const jsonData = [
        { name: 'Epic 1', desc: 'Description', state: 'active' }
      ];
      const mapping = {
        name: 'title',
        desc: 'description',
        state: 'status'
      };

      fs.readJson.mockResolvedValue(jsonData);
      fs.writeFile.mockResolvedValue();
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.importFromProvider('/path/to/file.json', {
        provider: 'json',
        mapping
      });

      expect(result.imported[0]).toHaveProperty('title');
      expect(result.imported[0]).toHaveProperty('description');
      expect(result.imported[0]).toHaveProperty('status');
    });

    it('should handle import errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await utilityService.importFromProvider('/invalid/path.csv', {
        provider: 'csv'
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.imported).toHaveLength(0);
    });
  });

  describe('exportToFormat()', () => {
    it('should export to JSON', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\n---');
      fs.writeJson.mockResolvedValue();

      const result = await utilityService.exportToFormat('json', {
        output: '/export/data.json'
      });

      expect(result.format).toBe('json');
      expect(fs.writeJson).toHaveBeenCalled();
    });

    it('should export to CSV', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\ndescription: Desc\n---');
      fs.writeFile.mockResolvedValue();

      const result = await utilityService.exportToFormat('csv', {
        output: '/export/data.csv'
      });

      expect(result.format).toBe('csv');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should export to Markdown', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\n---\nContent');
      fs.writeFile.mockResolvedValue();

      const result = await utilityService.exportToFormat('markdown', {
        output: '/export/report.md'
      });

      expect(result.format).toBe('markdown');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should filter by type during export', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\n---');
      fs.writeJson.mockResolvedValue();

      const result = await utilityService.exportToFormat('json', {
        type: 'epic',
        output: '/export/epics.json'
      });

      expect(glob.sync).toHaveBeenCalledWith(
        expect.stringContaining('epics')
      );
    });
  });

  describe('archiveCompleted()', () => {
    it('should archive completed items', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'epic-2.md']);
      fs.readFile
        .mockResolvedValueOnce('---\nstatus: completed\n---')
        .mockResolvedValueOnce('---\nstatus: active\n---');
      fs.ensureDir.mockResolvedValue();
      fs.copy.mockResolvedValue();
      fs.remove.mockResolvedValue();

      const result = await utilityService.archiveCompleted();

      expect(result.archived).toHaveLength(1);
      expect(fs.copy).toHaveBeenCalledTimes(1);
    });

    it('should maintain metadata', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\nstatus: completed\ntitle: Test\n---');
      fs.ensureDir.mockResolvedValue();
      fs.copy.mockResolvedValue();
      fs.remove.mockResolvedValue();

      const result = await utilityService.archiveCompleted();

      expect(result.location).toContain('archive');
      expect(result.archived[0]).toContain('epic-1.md');
    });

    it('should respect age option', async () => {
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days

      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'epic-2.md']);
      fs.readFile.mockResolvedValue('---\nstatus: completed\n---');
      fs.stat
        .mockResolvedValueOnce({ mtime: recentDate })
        .mockResolvedValueOnce({ mtime: oldDate });
      fs.ensureDir.mockResolvedValue();
      fs.copy.mockResolvedValue();
      fs.remove.mockResolvedValue();

      const result = await utilityService.archiveCompleted({ age: 30 });

      expect(result.archived).toHaveLength(1);
    });
  });

  describe('checkHealth()', () => {
    it('should report healthy project', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Test\n---');

      const result = await utilityService.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect issues', async () => {
      fs.pathExists.mockImplementation(async (p) => {
        return !p.includes('epics');
      });
      fs.readJson.mockResolvedValue({ invalid: 'config' });

      const result = await utilityService.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should check file integrity', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: '1.0.0', provider: 'github' });
      glob.sync = jest.fn().mockReturnValue(['corrupted.md']);
      fs.readFile.mockResolvedValue('Invalid frontmatter content');

      const result = await utilityService.checkHealth();

      expect(result.issues).toContainEqual(
        expect.stringContaining('corrupted')
      );
    });
  });

  describe('repairStructure()', () => {
    it('should repair broken references', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('Invalid frontmatter without delimiters');
      fs.writeFile.mockResolvedValue();
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);

      const result = await utilityService.repairStructure();

      expect(result.repaired.length).toBeGreaterThan(0);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should regenerate missing directories', async () => {
      fs.pathExists.mockImplementation(async (p) => !p.includes('context'));
      fs.ensureDir.mockResolvedValue();

      const result = await utilityService.repairStructure();

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(result.repaired).toContainEqual(
        expect.stringContaining('directory')
      );
    });

    it('should repair malformed frontmatter', async () => {
      glob.sync = jest.fn().mockReturnValue(['bad-file.md']);
      fs.readFile.mockResolvedValue('---\ninvalid yaml: [broken\n---');
      fs.writeFile.mockResolvedValue();

      const result = await utilityService.repairStructure();

      expect(result.repaired).toContainEqual(
        expect.stringContaining('frontmatter')
      );
    });

    it('should respect dry-run mode', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('No frontmatter delimiters');
      glob.sync = jest.fn().mockReturnValue(['file.md']);

      const result = await utilityService.repairStructure({ dryRun: true });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result.repaired.length).toBeGreaterThan(0);
    });
  });

  describe('generateReport()', () => {
    it('should generate summary report', async () => {
      glob.sync = jest.fn()
        .mockReturnValueOnce(['epic-1.md', 'epic-2.md'])
        .mockReturnValueOnce(['issue-1.md', 'issue-2.md', 'issue-3.md'])
        .mockReturnValueOnce(['prd-1.md']);
      fs.readFile.mockResolvedValue('---\nstatus: active\n---');

      const result = await utilityService.generateReport('summary');

      expect(result.report).toContain('Summary Report');
      expect(result.report).toContain('Epics: 2');
      expect(result.report).toContain('Issues: 3');
      expect(result.timestamp).toBeDefined();
    });

    it('should generate progress report', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md', 'epic-2.md']);
      fs.readFile
        .mockResolvedValueOnce('---\nstatus: completed\n---')
        .mockResolvedValueOnce('---\nstatus: active\n---');

      const result = await utilityService.generateReport('progress');

      expect(result.report).toContain('Progress Report');
      expect(result.report).toContain('50%');
    });

    it('should generate quality report', async () => {
      glob.sync = jest.fn().mockReturnValue(['epic-1.md']);
      fs.readFile.mockResolvedValue('---\ntitle: Epic\ndescription: Good description\n---');

      const result = await utilityService.generateReport('quality');

      expect(result.report).toContain('Quality Report');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('optimizeStorage()', () => {
    it('should optimize storage', async () => {
      glob.sync = jest.fn().mockReturnValue(['file1.md', 'file2.md']);
      fs.readFile
        .mockResolvedValueOnce('Duplicate content')
        .mockResolvedValueOnce('Duplicate content');
      fs.stat.mockResolvedValue({ size: 1024 });
      fs.remove.mockResolvedValue();

      const result = await utilityService.optimizeStorage();

      expect(result.optimized).toBeGreaterThan(0);
      expect(result.savedSpace).toBeGreaterThan(0);
    });

    it('should compress old files', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      glob.sync = jest.fn().mockReturnValue(['old-file.md']);
      fs.stat.mockResolvedValue({ mtime: oldDate, size: 2048 });
      fs.readFile.mockResolvedValue('Large content that can be compressed');

      const result = await utilityService.optimizeStorage();

      expect(result.optimized).toBeGreaterThan(0);
    });

    it('should remove duplicates', async () => {
      glob.sync = jest.fn()
        .mockReturnValueOnce(['dup1.md', 'dup2.md', 'unique.md'])
        .mockReturnValueOnce([]); // No temp files
      fs.readFile
        .mockResolvedValueOnce('Same content')
        .mockResolvedValueOnce('Same content')
        .mockResolvedValueOnce('Different content');
      fs.stat.mockResolvedValue({ size: 100 });
      fs.remove.mockResolvedValue();

      const result = await utilityService.optimizeStorage();

      expect(result.savedSpace).toBeGreaterThan(0);
      expect(fs.remove).toHaveBeenCalledTimes(1);
    });

    it('should clean temporary files', async () => {
      glob.sync = jest.fn().mockReturnValue(['.tmp-file', '.cache-data']);
      fs.stat.mockResolvedValue({ size: 512 });
      fs.remove.mockResolvedValue();

      const result = await utilityService.optimizeStorage();

      expect(fs.remove).toHaveBeenCalled();
      expect(result.savedSpace).toBeGreaterThan(0);
    });
  });
});
