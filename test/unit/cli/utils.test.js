/**
 * Tests for shared CLI path/read helpers (lib/cli/utils.js) — #611
 *
 * These helpers replace the per-command duplicates that lived in
 * lib/cli/commands/task.js, issue.js and epic.js.
 */

const path = require('path');
const fs = require('../../../lib/utils/fs');
const utils = require('../../../lib/cli/utils');

jest.mock('../../../lib/utils/fs');

describe('lib/cli/utils', () => {
  describe('path helpers', () => {
    test('claudePath joins segments under <cwd>/.claude', () => {
      expect(utils.claudePath('epics', 'a.md'))
        .toBe(path.join(process.cwd(), '.claude', 'epics', 'a.md'));
    });

    test('getEpicFilePath returns .claude/epics/<name>.md (file-per-epic layout)', () => {
      expect(utils.getEpicFilePath('my-epic'))
        .toBe(path.join(process.cwd(), '.claude', 'epics', 'my-epic.md'));
    });

    test('getEpicDirPath returns .claude/epics/<name> (dir-per-epic layout)', () => {
      expect(utils.getEpicDirPath('my-epic'))
        .toBe(path.join(process.cwd(), '.claude', 'epics', 'my-epic'));
    });

    test('getIssuePath returns .claude/issues/<number>.md', () => {
      expect(utils.getIssuePath(123))
        .toBe(path.join(process.cwd(), '.claude', 'issues', '123.md'));
    });
  });

  describe('readFileOrThrow', () => {
    test('returns file content when the file exists', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('content');

      await expect(utils.readFileOrThrow('/tmp/x.md', 'Epic file')).resolves.toBe('content');
      expect(fs.readFile).toHaveBeenCalledWith('/tmp/x.md', 'utf8');
    });

    test('throws "<label> not found: <path>" when missing', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(utils.readFileOrThrow('/tmp/x.md', 'Epic file'))
        .rejects.toThrow('Epic file not found: /tmp/x.md');
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('readers', () => {
    test('readEpicFile reads .claude/epics/<name>.md', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('epic content');

      await expect(utils.readEpicFile('my-epic')).resolves.toBe('epic content');
      expect(fs.readFile).toHaveBeenCalledWith(utils.getEpicFilePath('my-epic'), 'utf8');
    });

    test('readEpicFile error message matches the historical task.js wording', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(utils.readEpicFile('nope'))
        .rejects.toThrow(`Epic file not found: ${utils.getEpicFilePath('nope')}`);
    });

    test('readEpicDirFile reads .claude/epics/<name>/epic.md', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('epic dir content');

      await expect(utils.readEpicDirFile('my-epic')).resolves.toBe('epic dir content');
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(utils.getEpicDirPath('my-epic'), 'epic.md'), 'utf8');
    });

    test('readIssueFile reads .claude/issues/<number>.md', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readFile.mockResolvedValue('issue content');

      await expect(utils.readIssueFile(42)).resolves.toBe('issue content');
      expect(fs.readFile).toHaveBeenCalledWith(utils.getIssuePath(42), 'utf8');
    });

    test('readIssueFile error message matches the historical issue.js wording', async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(utils.readIssueFile(42))
        .rejects.toThrow(`Issue file not found: ${utils.getIssuePath(42)}`);
    });
  });
});
