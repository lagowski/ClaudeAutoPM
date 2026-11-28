// Mock dependencies before importing
jest.mock('fs');
jest.mock('path');
jest.mock('js-yaml');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const IssueDecomposer = require('../../autopm/.claude/scripts/decompose-issue.js');

describe('IssueDecomposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/mock/project');

    // Mock path.join
    path.join.mockImplementation((...args) => args.join('/'));

    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('mock content');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});

    // Mock yaml.load
    yaml.load.mockReturnValue({});
  });

  describe('Constructor', () => {
    it('should initialize with default project path', () => {
      const decomposer = new IssueDecomposer();

      expect(decomposer.projectPath).toBe('/mock/project');
      expect(decomposer.templatesPath).toBe('/mock/project/.claude/templates/issue-decomposition');
      expect(decomposer.epicsPath).toBe('/mock/project/.claude/epics');
    });

    it('should initialize with custom project path', () => {
      const customPath = '/custom/project';
      const decomposer = new IssueDecomposer(customPath);

      expect(decomposer.projectPath).toBe(customPath);
      expect(decomposer.templatesPath).toBe('/custom/project/.claude/templates/issue-decomposition');
      expect(decomposer.epicsPath).toBe('/custom/project/.claude/epics');
    });
  });

  describe('loadTemplates()', () => {
    it('should load templates from directory', () => {
      fs.readdirSync.mockReturnValue(['template1.yaml', 'template2.yaml', 'not-a-template.txt']);

      const mockTemplate1 = { name: 'Template 1', patterns: ['test'] };
      const mockTemplate2 = { name: 'Template 2', patterns: ['feature'] };

      yaml.load
        .mockReturnValueOnce(mockTemplate1)
        .mockReturnValueOnce(mockTemplate2);

      const decomposer = new IssueDecomposer();
      const templates = decomposer.loadTemplates();

      expect(templates).toHaveLength(2);
      expect(templates[0]).toEqual(mockTemplate1);
      expect(templates[1]).toEqual(mockTemplate2);
      expect(fs.readdirSync).toHaveBeenCalledWith('/mock/project/.claude/templates/issue-decomposition');
    });

    it('should handle missing templates directory', () => {
      fs.existsSync.mockReturnValue(false);

      const decomposer = new IssueDecomposer();
      const templates = decomposer.loadTemplates();

      expect(templates).toEqual([]);
    });

    it('should handle template loading errors', () => {
      fs.readdirSync.mockReturnValue(['bad-template.yaml']);
      yaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const decomposer = new IssueDecomposer();
      const templates = decomposer.loadTemplates();

      expect(templates).toEqual([]);
    });
  });

  describe('loadTemplate()', () => {
    it('should load specific template file', () => {
      const mockTemplate = { name: 'Default Template', streams: {} };
      yaml.load.mockReturnValue(mockTemplate);

      const decomposer = new IssueDecomposer();
      const template = decomposer.loadTemplate('default.yaml');

      expect(template).toEqual(mockTemplate);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/mock/project/.claude/templates/issue-decomposition/default.yaml',
        'utf8'
      );
    });

    it('should handle missing template file', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const decomposer = new IssueDecomposer();
      expect(() => decomposer.loadTemplate('missing.yaml')).toThrow('File not found');
    });
  });

  describe('calculateScore()', () => {
    const decomposer = new IssueDecomposer();

    it('should calculate score based on pattern matching', () => {
      const template = {
        patterns: ['authentication', 'user', 'login']
      };

      const score = decomposer.calculateScore(
        'Add user authentication',
        'Implement login system for users',
        template
      );

      // Should match patterns found in text
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0 for template without patterns', () => {
      const template = { patterns: [] };

      const score = decomposer.calculateScore(
        'Any title',
        'Any description',
        template
      );

      expect(score).toBe(0);
    });

    it('should handle case insensitive matching', () => {
      const template = {
        patterns: ['AUTHENTICATION', 'User']
      };

      const score = decomposer.calculateScore(
        'authentication module',
        'user login system',
        template
      );

      expect(score).toBe(1); // Both patterns should match
    });

    it('should handle missing patterns array', () => {
      const template = {};

      const score = decomposer.calculateScore(
        'Any title',
        'Any description',
        template
      );

      expect(score).toBe(0);
    });
  });

  describe('analyzeIssue()', () => {
    it('should return best matching template', async () => {
      const mockTemplates = [
        { name: 'Auth Template', patterns: ['auth', 'login'] },
        { name: 'CRUD Template', patterns: ['crud', 'database'] },
        { name: 'UI Template', patterns: ['ui', 'frontend'] }
      ];

      const decomposer = new IssueDecomposer();
      decomposer.loadTemplates = jest.fn().mockReturnValue(mockTemplates);

      const result = await decomposer.analyzeIssue(
        'Add user authentication',
        'Need to implement login and auth system'
      );

      expect(result).toEqual(mockTemplates[0]); // Auth template should score highest
    });

    it('should return default template when no good match found', async () => {
      const mockTemplates = [
        { name: 'Specific Template', patterns: ['very', 'specific', 'patterns'] }
      ];

      const defaultTemplate = { name: 'Default Template', streams: {} };

      const decomposer = new IssueDecomposer();
      decomposer.loadTemplates = jest.fn().mockReturnValue(mockTemplates);
      decomposer.loadTemplate = jest.fn().mockReturnValue(defaultTemplate);
      decomposer.calculateScore = jest.fn().mockReturnValue(0.1); // Below threshold

      const result = await decomposer.analyzeIssue(
        'Generic issue',
        'Nothing specific here'
      );

      expect(result).toEqual(defaultTemplate);
      expect(decomposer.loadTemplate).toHaveBeenCalledWith('default.yaml');
    });

    it('should handle empty templates list', async () => {
      const defaultTemplate = { name: 'Default Template', streams: {} };

      const decomposer = new IssueDecomposer();
      decomposer.loadTemplates = jest.fn().mockReturnValue([]);
      decomposer.loadTemplate = jest.fn().mockReturnValue(defaultTemplate);

      const result = await decomposer.analyzeIssue('Any title', 'Any description');

      expect(result).toEqual(defaultTemplate);
      expect(decomposer.loadTemplate).toHaveBeenCalledWith('default.yaml');
    });
  });

  describe('decomposeIssue()', () => {
    it('should decompose issue into streams and create files', async () => {
      const mockTemplate = {
        name: 'Test Template',
        description: 'A test template',
        streams: {
          backend: {
            name: 'Backend Development',
            agent: 'python-backend-engineer',
            priority: 'high',
            files: ['api.py', 'models.py'],
            tasks: ['Create API endpoints', 'Set up database models']
          },
          frontend: {
            name: 'Frontend Development',
            agent: 'react-developer',
            priority: 'medium',
            files: ['components.jsx', 'pages.jsx'],
            tasks: ['Create UI components', 'Set up routing']
          }
        }
      };

      const decomposer = new IssueDecomposer();
      decomposer.analyzeIssue = jest.fn().mockResolvedValue(mockTemplate);
      decomposer.ensureDirectory = jest.fn();
      decomposer.generateAnalysis = jest.fn().mockReturnValue('# Analysis content');
      decomposer.generateStreamFile = jest.fn().mockReturnValue('# Stream content');
      decomposer.generateCoordinationFile = jest.fn().mockReturnValue('# Coordination content');

      const result = await decomposer.decomposeIssue(123, 'Test Issue', 'Test description');

      expect(result).toEqual({
        issuePath: '/mock/project/.claude/epics/current/issue-123',
        streams: mockTemplate.streams,
        template: 'Test Template'
      });

      expect(decomposer.ensureDirectory).toHaveBeenCalledWith('/mock/project/.claude/epics/current/issue-123');
      expect(decomposer.ensureDirectory).toHaveBeenCalledWith('/mock/project/.claude/epics/current/issue-123/updates');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/project/.claude/epics/current/issue-123/123-analysis.md',
        '# Analysis content'
      );

      expect(console.log).toHaveBeenCalledWith('\n🔍 Analyzing issue #123: Test Issue');
      expect(console.log).toHaveBeenCalledWith('📋 Using template: Test Template');
      expect(console.log).toHaveBeenCalledWith('✅ Decomposed into 2 parallel streams');
    });

    it('should handle issues with no description', async () => {
      const mockTemplate = {
        name: 'Simple Template',
        streams: {
          main: {
            name: 'Main Task',
            agent: 'general-purpose',
            priority: 'high',
            files: ['main.js'],
            tasks: ['Complete task']
          }
        }
      };

      const decomposer = new IssueDecomposer();
      decomposer.analyzeIssue = jest.fn().mockResolvedValue(mockTemplate);
      decomposer.ensureDirectory = jest.fn();
      decomposer.generateAnalysis = jest.fn().mockReturnValue('# Analysis');
      decomposer.generateStreamFile = jest.fn().mockReturnValue('# Stream');
      decomposer.generateCoordinationFile = jest.fn().mockReturnValue('# Coordination');

      await decomposer.decomposeIssue(456, 'Simple Issue');

      expect(decomposer.analyzeIssue).toHaveBeenCalledWith('Simple Issue', '');
      expect(decomposer.generateAnalysis).toHaveBeenCalledWith(456, 'Simple Issue', '', mockTemplate);
    });
  });

  describe('generateAnalysis()', () => {
    it('should generate comprehensive analysis markdown', () => {
      const template = {
        name: 'Auth Template',
        description: 'Authentication system template',
        streams: {
          backend: {
            name: 'Backend Auth',
            agent: 'python-backend-engineer',
            priority: 'high',
            parameters: { framework: 'FastAPI' },
            dependencies: ['database-setup'],
            files: ['auth.py', 'models.py'],
            tasks: ['Create auth endpoints', 'Set up JWT']
          },
          frontend: {
            name: 'Frontend Auth',
            agent: 'react-developer',
            priority: 'medium',
            files: ['Login.jsx', 'AuthContext.js'],
            tasks: ['Create login form', 'Set up auth context']
          }
        }
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateAnalysis(123, 'Add Authentication', 'User login system', template);

      expect(result).toContain('# Issue #123: Add Authentication');
      expect(result).toContain('## Description\nUser login system');
      expect(result).toContain('**Auth Template**: Authentication system template');
      expect(result).toContain('## Work Decomposition');
      expect(result).toContain('### Stream A: Backend Auth');
      expect(result).toContain('- **Agent**: `python-backend-engineer`');
      expect(result).toContain('- **Priority**: high');
      expect(result).toContain('- **Parameters**: {"framework":"FastAPI"}');
      expect(result).toContain('- **Dependencies**: database-setup');
      expect(result).toContain('  - auth.py');
      expect(result).toContain('1. Create auth endpoints');
      expect(result).toContain('### Stream B: Frontend Auth');
      expect(result).toContain('- **Dependencies**: None');
    });

    it('should handle template with no description in issue', () => {
      const template = {
        name: 'Simple Template',
        description: 'A simple template',
        streams: {}
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateAnalysis(456, 'Simple Issue', '', template);

      expect(result).toContain('## Description\nNo description provided.');
    });
  });

  describe('generateStreamFile()', () => {
    it('should generate stream-specific markdown file', () => {
      const stream = {
        name: 'Backend Development',
        agent: 'python-backend-engineer',
        priority: 'high',
        files: ['api.py', 'models.py'],
        tasks: ['Create endpoints', 'Set up models'],
        parameters: { framework: 'FastAPI' },
        dependencies: ['database']
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateStreamFile('backend', stream, 123, 0);

      expect(result).toContain('# Stream A: Backend Development');
      expect(result).toContain('agent: python-backend-engineer');
      expect(result).toContain('issue: 123');
      expect(result).toContain('**Agent**: `python-backend-engineer`');
      expect(result).toContain('**Priority**: high');
      expect(result).toContain('## Files to Modify');
      expect(result).toContain('- `api.py`');
      expect(result).toContain('- `models.py`');
      expect(result).toContain('## Tasks');
      expect(result).toContain('- [ ] Create endpoints');
      expect(result).toContain('- [ ] Set up models');
      expect(result).toContain('parameters:');
      expect(result).toContain('framework: FastAPI');
      expect(result).toContain('**Waiting for**: database');
    });

    it('should handle stream with minimal information', () => {
      const stream = {
        name: 'Simple Task',
        agent: 'general-purpose',
        files: [],
        tasks: []
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateStreamFile('simple', stream, 456, 1);

      expect(result).toContain('# Stream B: Simple Task');
      expect(result).toContain('**Agent**: `general-purpose`');
      expect(result).toContain('**Dependencies**: None');
      expect(result).toContain('## Files to Modify');
      expect(result).toContain('## Tasks');
    });
  });

  describe('generateCoordinationFile()', () => {
    it('should generate coordination markdown', () => {
      const template = {
        name: 'Multi-Stream Template',
        coordination: {
          checkpoints: ['Design review', 'Integration testing'],
          communication: ['Daily standups', 'Weekly reviews'],
          merge_strategy: 'feature-branch-per-stream'
        },
        streams: {
          backend: { name: 'Backend', agent: 'python-backend-engineer' },
          frontend: { name: 'Frontend', agent: 'react-developer' }
        }
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateCoordinationFile(template);

      expect(result).toContain('# Coordination Protocol');
      expect(result).toContain('## Sync Points');
      expect(result).toContain('## Shared Files');
      expect(result).toContain('## Communication Channels');
    });

    it('should handle template with minimal coordination info', () => {
      const template = {
        name: 'Simple Template',
        streams: {
          main: { name: 'Main Task', agent: 'general-purpose' }
        }
      };

      const decomposer = new IssueDecomposer();
      const result = decomposer.generateCoordinationFile(template);

      expect(result).toContain('# Coordination Protocol');
      expect(result).toContain('No sync points defined');
      expect(result).toContain('No shared files defined');
      expect(result).toContain('## Communication Channels');
    });
  });

  describe('ensureDirectory()', () => {
    it('should create directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const decomposer = new IssueDecomposer();
      decomposer.ensureDirectory('/test/path');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);

      const decomposer = new IssueDecomposer();
      decomposer.ensureDirectory('/existing/path');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const IssueDecomposerClass = require('../../autopm/.claude/scripts/decompose-issue.js');
      expect(typeof IssueDecomposerClass).toBe('function');
      expect(IssueDecomposerClass.prototype).toHaveProperty('analyzeIssue');
      expect(IssueDecomposerClass.prototype).toHaveProperty('decomposeIssue');
      expect(IssueDecomposerClass.prototype).toHaveProperty('calculateScore');
      expect(IssueDecomposerClass.prototype).toHaveProperty('loadTemplates');
      expect(IssueDecomposerClass.prototype).toHaveProperty('ensureDirectory');
    });

    it('should handle realistic issue decomposition workflow', async () => {
      const realisticTemplate = {
        name: 'Full-Stack Feature Template',
        description: 'Complete feature development with backend and frontend',
        patterns: ['feature', 'crud', 'user'],
        coordination: {
          checkpoints: ['API design review', 'UI/UX review', 'Integration testing'],
          communication: ['Daily sync', 'End-of-sprint demo'],
          merge_strategy: 'trunk-based-development'
        },
        streams: {
          backend: {
            name: 'Backend API Development',
            agent: 'python-backend-engineer',
            priority: 'high',
            parameters: { framework: 'FastAPI', database: 'PostgreSQL' },
            dependencies: ['database-migration'],
            files: ['api/endpoints.py', 'models/user.py', 'tests/test_api.py'],
            tasks: [
              'Design API endpoints',
              'Implement CRUD operations',
              'Add authentication middleware',
              'Write comprehensive tests',
              'Set up API documentation'
            ]
          },
          frontend: {
            name: 'Frontend UI Development',
            agent: 'react-developer',
            priority: 'high',
            dependencies: ['backend'],
            files: ['components/UserForm.jsx', 'pages/UserDashboard.jsx', 'tests/User.test.js'],
            tasks: [
              'Create user interface mockups',
              'Implement responsive UI components',
              'Integrate with backend API',
              'Add form validation',
              'Write unit tests'
            ]
          },
          devops: {
            name: 'DevOps & Deployment',
            agent: 'devops-engineer',
            priority: 'medium',
            dependencies: ['backend', 'frontend'],
            files: ['docker/Dockerfile', 'k8s/deployment.yaml', 'ci/pipeline.yml'],
            tasks: [
              'Set up containerization',
              'Configure CI/CD pipeline',
              'Deploy to staging environment',
              'Set up monitoring and logging'
            ]
          }
        }
      };

      const decomposer = new IssueDecomposer('/project');
      decomposer.loadTemplates = jest.fn().mockReturnValue([realisticTemplate]);

      const result = await decomposer.decomposeIssue(
        456,
        'Add User Management Feature',
        'Implement complete CRUD functionality for user management with secure authentication and responsive UI'
      );

      expect(result.issuePath).toBe('/project/.claude/epics/current/issue-456');
      expect(result.streams).toEqual(realisticTemplate.streams);
      expect(result.template).toBe('Full-Stack Feature Template');

      expect(console.log).toHaveBeenCalledWith('\n🔍 Analyzing issue #456: Add User Management Feature');
      expect(console.log).toHaveBeenCalledWith('📋 Using template: Full-Stack Feature Template');
      expect(console.log).toHaveBeenCalledWith('✅ Decomposed into 3 parallel streams');
      expect(console.log).toHaveBeenCalledWith('   Stream A: Backend API Development (python-backend-engineer)');
      expect(console.log).toHaveBeenCalledWith('   Stream B: Frontend UI Development (react-developer)');
      expect(console.log).toHaveBeenCalledWith('   Stream C: DevOps & Deployment (devops-engineer)');

      // Verify files were created (5 total: 1 analysis + 3 streams + 1 coordination)
      expect(fs.writeFileSync).toHaveBeenCalledTimes(5);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/.claude/epics/current/issue-456/456-analysis.md',
        expect.stringContaining('# Issue #456: Add User Management Feature')
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/.claude/epics/current/issue-456/updates/stream-backend.md',
        expect.stringContaining('# Stream A: Backend API Development')
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/project/.claude/epics/current/issue-456/coordination.md',
        expect.stringContaining('# Coordination Protocol')
      );
    });
  });
});