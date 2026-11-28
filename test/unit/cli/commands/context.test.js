/**
 * CLI Context Commands Tests (#611)
 *
 * Covers the previously untested lib/cli/commands/context.js:
 * happy path + error path for create/prime/update/show.
 * ContextService, lib/utils/fs and ora are mocked.
 */

const contextCommand = require('../../../../lib/cli/commands/context');
const ContextService = require('../../../../lib/services/ContextService');
const fs = require('../../../../lib/utils/fs');
const ora = require('ora');

jest.mock('../../../../lib/services/ContextService');
jest.mock('../../../../lib/utils/fs');
jest.mock('ora');

describe('Context Commands', () => {
  let mockService;
  let mockSpinner;
  let logSpy;
  let errorSpy;
  let exitSpy;

  beforeEach(() => {
    mockService = {
      createContext: jest.fn(),
      primeContext: jest.fn(),
      updateContext: jest.fn(),
      getContext: jest.fn(),
      listContexts: jest.fn(),
      analyzeContextUsage: jest.fn()
    };
    ContextService.mockImplementation(() => mockService);

    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      text: ''
    };
    ora.mockReturnValue(mockSpinner);

    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('command structure', () => {
    it('exports command, builder and handlers', () => {
      expect(contextCommand.command).toBe('context');
      expect(contextCommand.builder).toBeInstanceOf(Function);
      expect(Object.keys(contextCommand.handlers).sort())
        .toEqual(['create', 'prime', 'show', 'update']);
    });
  });

  describe('create', () => {
    it('creates a context and prints the result (happy path)', async () => {
      mockService.createContext.mockResolvedValue({
        type: 'project-brief',
        path: '/tmp/.claude/contexts/project-brief.md',
        created: '2026-01-01T00:00:00Z'
      });

      await contextCommand.handlers.create({ type: 'project-brief', name: 'My Project' });

      expect(mockService.createContext).toHaveBeenCalledWith('project-brief',
        expect.objectContaining({ name: 'My Project' }));
      expect(mockSpinner.succeed).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Context Created Successfully'));
    });

    it('fails with exit code 1 when the service rejects (error path)', async () => {
      mockService.createContext.mockRejectedValue(new Error('template not found'));

      await expect(contextCommand.handlers.create({ type: 'bogus' }))
        .rejects.toThrow('process.exit:1');

      expect(mockSpinner.fail).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('template not found'));
    });
  });

  describe('prime', () => {
    it('generates a project snapshot (happy path)', async () => {
      mockService.primeContext.mockResolvedValue({
        timestamp: '2026-01-01T00:00:00Z',
        contexts: { epics: [1], issues: [1, 2], prds: [] },
        git: { branch: 'main', commit: 'abcdef1234', status: 'clean' },
        summary: 'all good'
      });

      await contextCommand.handlers.prime({ includeGit: true });

      expect(mockService.primeContext).toHaveBeenCalledWith(
        expect.objectContaining({ includeGit: true }));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project Snapshot Generated'));
    });

    it('fails with exit code 1 when priming throws (error path)', async () => {
      mockService.primeContext.mockRejectedValue(new Error('git unavailable'));

      await expect(contextCommand.handlers.prime({})).rejects.toThrow('process.exit:1');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('git unavailable'));
    });
  });

  describe('update', () => {
    it('updates a context with inline content (happy path)', async () => {
      mockService.updateContext.mockResolvedValue({ timestamp: '2026-01-01T00:00:00Z' });

      await contextCommand.handlers.update({
        type: 'progress', content: '## Done', mode: 'append'
      });

      expect(mockService.updateContext).toHaveBeenCalledWith('progress',
        expect.objectContaining({ content: '## Done', mode: 'append' }));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Context Updated Successfully'));
    });

    it('reads content from a file when --file is given', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('file content');
      mockService.updateContext.mockResolvedValue({ timestamp: '2026-01-01T00:00:00Z' });

      await contextCommand.handlers.update({ type: 'progress', file: 'updates.md' });

      expect(mockService.updateContext).toHaveBeenCalledWith('progress',
        expect.objectContaining({ content: 'file content' }));
    });

    it('fails with exit code 1 when the content file is missing (error path)', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(contextCommand.handlers.update({ type: 'progress', file: 'nope.md' }))
        .rejects.toThrow('process.exit:1');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('File not found: nope.md'));
    });

    it('warns and returns when no content is provided', async () => {
      await contextCommand.handlers.update({ type: 'progress' });

      expect(mockSpinner.warn).toHaveBeenCalled();
      expect(mockService.updateContext).not.toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('shows a specific context (happy path)', async () => {
      mockService.getContext.mockResolvedValue({
        type: 'project-brief',
        updated: '2026-01-01T00:00:00Z',
        metadata: {},
        content: '---\nname: x\n---\n\n# Brief body'
      });

      await contextCommand.handlers.show({ type: 'project-brief' });

      expect(mockService.getContext).toHaveBeenCalledWith('project-brief');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('# Brief body'));
    });

    it('lists all contexts with --list', async () => {
      mockService.listContexts.mockResolvedValue({
        contexts: [{ file: 'a.md' }],
        byType: { 'project-brief': [{ file: 'a.md', size: 2048, updated: '2026-01-01T00:00:00Z' }] }
      });

      await contextCommand.handlers.show({ list: true });

      expect(mockService.listContexts).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('All Contexts'));
    });

    it('fails with exit code 1 for an unknown context (error path)', async () => {
      mockService.getContext.mockRejectedValue(new Error('Context not found'));

      await expect(contextCommand.handlers.show({ type: 'bogus' }))
        .rejects.toThrow('process.exit:1');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });
});
