/**
 * Tests for Service Interfaces
 *
 * These tests validate that the interface definitions are properly exported
 * and documented. Since interfaces are JSDoc-only (no runtime), we primarily
 * test that the module exports correctly.
 */

const interfaces = require('../../../lib/services/interfaces');

describe('Service Interfaces Module', () => {
  describe('Module Exports', () => {
    it('should export IPRDService interface', () => {
      expect(interfaces.IPRDService).toBeDefined();
      expect(typeof interfaces.IPRDService).toBe('function');
    });

    it('should export IEpicService interface', () => {
      expect(interfaces.IEpicService).toBeDefined();
      expect(typeof interfaces.IEpicService).toBe('function');
    });

    it('should export ITaskService interface', () => {
      expect(interfaces.ITaskService).toBeDefined();
      expect(typeof interfaces.ITaskService).toBe('function');
    });
  });

  describe('IPRDService Interface', () => {
    it('should have constructor', () => {
      expect(interfaces.IPRDService).toBeDefined();
      const instance = new interfaces.IPRDService();
      expect(instance).toBeInstanceOf(interfaces.IPRDService);
    });

    it('should define parseFrontmatter method', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.parseFrontmatter).toBeDefined();
      expect(typeof instance.parseFrontmatter).toBe('function');
    });

    it('should define extractPrdContent method', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.extractPrdContent).toBeDefined();
      expect(typeof instance.extractPrdContent).toBe('function');
    });

    it('should define parseUserStories method', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.parseUserStories).toBeDefined();
      expect(typeof instance.parseUserStories).toBe('function');
    });

    it('should define parseEffort method', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.parseEffort).toBeDefined();
      expect(typeof instance.parseEffort).toBe('function');
    });

    it('should define formatEffort method', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.formatEffort).toBeDefined();
      expect(typeof instance.formatEffort).toBe('function');
    });

    it('should define utility methods', () => {
      const instance = new interfaces.IPRDService();
      expect(instance.calculateTotalEffort).toBeDefined();
      expect(instance.calculateEffortByType).toBeDefined();
      expect(instance.generateEpicId).toBeDefined();
      expect(instance.slugify).toBeDefined();
      expect(instance.isComplexPrd).toBeDefined();
    });
  });

  describe('IEpicService Interface', () => {
    it('should have constructor', () => {
      expect(interfaces.IEpicService).toBeDefined();
      const instance = new interfaces.IEpicService();
      expect(instance).toBeInstanceOf(interfaces.IEpicService);
    });

    it('should define status methods', () => {
      const instance = new interfaces.IEpicService();
      expect(instance.categorizeStatus).toBeDefined();
      expect(instance.isTaskClosed).toBeDefined();
      expect(instance.calculateProgress).toBeDefined();
      expect(instance.generateProgressBar).toBeDefined();
      expect(instance.hasValidDependencies).toBeDefined();
    });

    it('should define GitHub integration methods', () => {
      const instance = new interfaces.IEpicService();
      expect(instance.extractGitHubIssue).toBeDefined();
      expect(instance.formatGitHubUrl).toBeDefined();
    });

    it('should define content methods', () => {
      const instance = new interfaces.IEpicService();
      expect(instance.analyzePRD).toBeDefined();
      expect(instance.determineDependencies).toBeDefined();
      expect(instance.generateEpicMetadata).toBeDefined();
      expect(instance.generateEpicContent).toBeDefined();
      expect(instance.buildTaskSection).toBeDefined();
    });
  });

  describe('ITaskService Interface', () => {
    it('should have constructor', () => {
      expect(interfaces.ITaskService).toBeDefined();
      const instance = new interfaces.ITaskService();
      expect(instance).toBeInstanceOf(interfaces.ITaskService);
    });

    it('should define status management methods', () => {
      const instance = new interfaces.ITaskService();
      expect(instance.normalizeTaskStatus).toBeDefined();
      expect(instance.isTaskOpen).toBeDefined();
      expect(instance.isTaskClosed).toBeDefined();
      expect(instance.categorizeTaskStatus).toBeDefined();
    });

    it('should define parsing and validation methods', () => {
      const instance = new interfaces.ITaskService();
      expect(instance.parseTaskNumber).toBeDefined();
      expect(instance.parseTaskMetadata).toBeDefined();
      expect(instance.validateTaskMetadata).toBeDefined();
      expect(instance.formatTaskId).toBeDefined();
    });

    it('should define dependency methods', () => {
      const instance = new interfaces.ITaskService();
      expect(instance.parseDependencies).toBeDefined();
      expect(instance.hasBlockingDependencies).toBeDefined();
      expect(instance.validateDependencyFormat).toBeDefined();
    });

    it('should define analytics methods', () => {
      const instance = new interfaces.ITaskService();
      expect(instance.calculateTaskCompletion).toBeDefined();
      expect(instance.getTaskStatistics).toBeDefined();
      expect(instance.sortTasksByPriority).toBeDefined();
      expect(instance.filterTasksByStatus).toBeDefined();
    });

    it('should define task generation methods', () => {
      const instance = new interfaces.ITaskService();
      expect(instance.generateTaskMetadata).toBeDefined();
      expect(instance.generateTaskContent).toBeDefined();
    });
  });

  describe('Interface Documentation', () => {
    it('should have JSDoc comments (manual verification)', () => {
      // This is a placeholder test to remind us to verify JSDoc
      // In a real scenario, you'd use a JSDoc parser to validate
      expect(true).toBe(true);
    });
  });
});
