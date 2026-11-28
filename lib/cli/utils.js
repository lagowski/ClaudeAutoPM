/**
 * Shared CLI path/read helpers (#611)
 *
 * Replaces the per-command duplicates that previously lived in
 * lib/cli/commands/task.js, issue.js and epic.js.
 *
 * Two epic layouts exist in the wild:
 *  - file-per-epic: .claude/epics/<name>.md            (task commands)
 *  - dir-per-epic:  .claude/epics/<name>/epic.md       (epic commands)
 *
 * @module cli/utils
 */

const fs = require('../utils/fs');
const path = require('path');

/**
 * Join segments under <cwd>/.claude
 * @param {...string} segments - Path segments
 * @returns {string} Absolute path
 */
function claudePath(...segments) {
  return path.join(process.cwd(), '.claude', ...segments);
}

/**
 * Epic file path — file-per-epic layout
 * @param {string} name - Epic name (without .md extension)
 * @returns {string} .claude/epics/<name>.md
 */
function getEpicFilePath(name) {
  return claudePath('epics', `${name}.md`);
}

/**
 * Epic directory path — dir-per-epic layout
 * @param {string} name - Epic name
 * @returns {string} .claude/epics/<name>
 */
function getEpicDirPath(name) {
  return claudePath('epics', name);
}

/**
 * Issue file path
 * @param {number|string} issueNumber - Issue number
 * @returns {string} .claude/issues/<number>.md
 */
function getIssuePath(issueNumber) {
  return claudePath('issues', `${issueNumber}.md`);
}

/**
 * Read a file, throwing "<label> not found: <path>" when it does not exist
 * @param {string} filePath - Absolute file path
 * @param {string} label - Human-readable label for the error message
 * @returns {Promise<string>} File content (utf8)
 */
async function readFileOrThrow(filePath, label) {
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return fs.readFile(filePath, 'utf8');
}

/**
 * Read an epic file (file-per-epic layout)
 * @param {string} name - Epic name
 * @returns {Promise<string>} Epic content
 */
function readEpicFile(name) {
  return readFileOrThrow(getEpicFilePath(name), 'Epic file');
}

/**
 * Read an epic file (dir-per-epic layout: <dir>/epic.md)
 * @param {string} name - Epic name
 * @returns {Promise<string>} Epic content
 */
function readEpicDirFile(name) {
  return readFileOrThrow(path.join(getEpicDirPath(name), 'epic.md'), 'Epic file');
}

/**
 * Read an issue file
 * @param {number|string} issueNumber - Issue number
 * @returns {Promise<string>} Issue content
 */
function readIssueFile(issueNumber) {
  return readFileOrThrow(getIssuePath(issueNumber), 'Issue file');
}

module.exports = {
  claudePath,
  getEpicFilePath,
  getEpicDirPath,
  getIssuePath,
  readFileOrThrow,
  readEpicFile,
  readEpicDirFile,
  readIssueFile
};
