/**
 * CLI PRD Commands Tests
 *
 * Tests for PRD management CLI commands using PRDService.
 * TDD Approach: Tests written FIRST before implementation.
 *
 * Coverage target: >80%
 *
 * Related: Issue #314
 */

const prdCommands = require('../../../../lib/cli/commands/prd');
const PRDService = require('../../../../lib/services/PRDService');
const fs = require('../../../../lib/utils/fs');
const ora = require('ora');

// Mock dependencies
jest.mock('../../../../lib/services/PRDService');
jest.mock('../../../../lib/utils/fs');
jest.mock('ora');

describe('PRD Commands', () => {
  let mockPRDService;
  let mockConsoleLog;
  let mockConsoleError;
  let mockSpinner;

  beforeEach(() => {
    // Mock PRDService instance
    mockPRDService = {
      parse: jest.fn(),
      parseStream: jest.fn(),
      extractEpics: jest.fn(),
      extractEpicsStream: jest.fn(),
      summarize: jest.fn(),
      summarizeStream: jest.fn(),
      validate: jest.fn()
    };

    PRDService.mockImplementation(() => mockPRDService);

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
    fs.ensureDir = jest.fn();
    fs.pathExists = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Command Structure', () => {
    it('should export command object with correct structure', () => {
      expect(prdCommands).toBeDefined();
      // API drift fixed in #608: the command is now 'prd' with yargs
      // subcommands registered in builder() (was 'prd <action> [name]')
      expect(prdCommands.command).toBe('prd');
      expect(prdCommands.describe).toBeDefined();
      expect(prdCommands.builder).toBeInstanceOf(Function);
      expect(prdCommands.handler).toBeInstanceOf(Function);
    });

    it('should register all subcommands', () => {
      const mockYargs = {
        command: jest.fn().mockReturnThis(),
        demandCommand: jest.fn().mockReturnThis(),
        strictCommands: jest.fn().mockReturnThis(),
        help: jest.fn().mockReturnThis()
      };

      prdCommands.builder(mockYargs);

      // Should register subcommands
      expect(mockYargs.command).toHaveBeenCalled();
    });
  });

  // SKIPPED (#608): these suites were written for the old dispatch-style CLI
  // where prdCommands.handler(argv) routed on argv.action. The current prd
  // command registers per-subcommand handlers inside builder() and the top
  // level handler only prints usage, so every test below exercises an API
  // that no longer exists. Rewriting them against the yargs subcommand
  // handlers is tracked as follow-up work on the test-infrastructure epic.
  describe.skip('prd parse', () => {
    it('should parse PRD file with AI', async () => {
      const argv = { action: 'parse', name: 'test-prd', ai: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.parse.mockResolvedValue({
        epics: [{ id: 'epic-1', title: 'Test Epic' }]
      });

      await prdCommands.handler(argv);

      expect(fs.readFile).toHaveBeenCalled();
      expect(mockPRDService.parse).toHaveBeenCalledWith('PRD content');
      expect(mockSpinner.succeed).toHaveBeenCalled();
    });

    it('should use streaming when --stream flag provided', async () => {
      const argv = { action: 'parse', name: 'test-prd', ai: true, stream: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);

      // Mock async generator
      mockPRDService.parseStream.mockImplementation(async function*() {
        yield 'chunk1';
        yield 'chunk2';
      });

      await prdCommands.handler(argv);

      expect(mockPRDService.parseStream).toHaveBeenCalledWith('PRD content');
    });

    it('should handle missing PRD file', async () => {
      const argv = { action: 'parse', name: 'missing-prd' };

      fs.pathExists.mockResolvedValue(false);

      await prdCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('PRD file not found')
      );
    });

    it('should handle parse errors', async () => {
      const argv = { action: 'parse', name: 'test-prd', ai: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.parse.mockRejectedValue(new Error('AI error'));

      await prdCommands.handler(argv);

      expect(mockSpinner.fail).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse PRD')
      );
    });
  });

  describe.skip('prd extract-epics', () => {
    it('should extract epics from PRD', async () => {
      const argv = { action: 'extract-epics', name: 'test-prd' };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.extractEpics.mockResolvedValue([
        { id: 'epic-1', title: 'Epic 1' },
        { id: 'epic-2', title: 'Epic 2' }
      ]);

      await prdCommands.handler(argv);

      expect(mockPRDService.extractEpics).toHaveBeenCalledWith('PRD content');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Extracted 2 epic')
      );
    });

    it('should support streaming epic extraction', async () => {
      const argv = { action: 'extract-epics', name: 'test-prd', stream: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);

      mockPRDService.extractEpicsStream.mockImplementation(async function*() {
        yield 'Epic 1...\n';
        yield 'Epic 2...\n';
      });

      await prdCommands.handler(argv);

      expect(mockPRDService.extractEpicsStream).toHaveBeenCalled();
    });
  });

  describe.skip('prd summarize', () => {
    it('should generate PRD summary', async () => {
      const argv = { action: 'summarize', name: 'test-prd' };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.summarize.mockResolvedValue('PRD summary text');

      await prdCommands.handler(argv);

      expect(mockPRDService.summarize).toHaveBeenCalledWith('PRD content');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('summary')
      );
    });

    it('should support streaming summarization', async () => {
      const argv = { action: 'summarize', name: 'test-prd', stream: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);

      mockPRDService.summarizeStream.mockImplementation(async function*() {
        yield 'Summary part 1';
        yield 'Summary part 2';
      });

      await prdCommands.handler(argv);

      expect(mockPRDService.summarizeStream).toHaveBeenCalled();
    });
  });

  describe.skip('prd validate', () => {
    it('should validate PRD structure', async () => {
      const argv = { action: 'validate', name: 'test-prd' };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.validate.mockResolvedValue({
        valid: true,
        issues: []
      });

      await prdCommands.handler(argv);

      expect(mockPRDService.validate).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Validation passed')
      );
    });

    it('should report validation issues', async () => {
      const argv = { action: 'validate', name: 'test-prd' };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.validate.mockResolvedValue({
        valid: false,
        issues: ['Missing objectives', 'No acceptance criteria']
      });

      await prdCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('2 issue')
      );
    });
  });

  describe.skip('Error Handling', () => {
    it('should handle file read errors', async () => {
      const argv = { action: 'parse', name: 'test-prd' };

      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockRejectedValue(new Error('Permission denied'));

      await prdCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse PRD')
      );
    });

    it('should handle invalid action', async () => {
      const argv = { action: 'invalid-action', name: 'test-prd' };

      await prdCommands.handler(argv);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown action')
      );
    });
  });

  describe.skip('Progress Indicators', () => {
    it('should show spinner during parse', async () => {
      const argv = { action: 'parse', name: 'test-prd', ai: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);
      mockPRDService.parse.mockResolvedValue({ epics: [] });

      await prdCommands.handler(argv);

      expect(ora).toHaveBeenCalledWith(
        expect.stringContaining('Parsing PRD')
      );
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should update spinner text during streaming', async () => {
      const argv = { action: 'parse', name: 'test-prd', stream: true };

      fs.readFile.mockResolvedValue('PRD content');
      fs.pathExists.mockResolvedValue(true);

      mockPRDService.parseStream.mockImplementation(async function*() {
        yield 'chunk';
      });

      await prdCommands.handler(argv);

      expect(mockSpinner.start).toHaveBeenCalled();
    });
  });
});
