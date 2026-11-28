/**
 * Tests for autopm/.claude/scripts/lib/validation-utils.sh (#608)
 *
 * Follows the frontmatter-utils.test.js pattern: source the library in bash
 * and assert on exit codes/output. Jest suite; the -jest suffix is historical.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const scriptsDir = path.join(__dirname, '../../autopm/.claude/scripts/lib');
const validationScript = path.join(scriptsDir, 'validation-utils.sh');

// Helper to escape shell arguments properly
const shellEscape = (str) => "'" + String(str).replace(/'/g, "'\\''") + "'";

// Source the library and run a snippet; returns { status, stdout, stderr }
const runBash = (snippet, options = {}) => {
  const script = `source ${shellEscape(validationScript)} && ${snippet}`;
  const result = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    cwd: options.cwd
  });
  return result;
};

describe('validation-utils.sh', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-utils-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validate_issue_number', () => {
    test('accepts a positive integer', () => {
      expect(runBash('validate_issue_number 123').status).toBe(0);
    });

    test('rejects empty input', () => {
      expect(runBash("validate_issue_number ''").status).toBe(1);
    });

    test('rejects non-numeric input', () => {
      expect(runBash('validate_issue_number abc').status).toBe(1);
      expect(runBash('validate_issue_number 12a').status).toBe(1);
    });

    test('rejects zero', () => {
      expect(runBash('validate_issue_number 0').status).toBe(1);
    });

    test('rejects negative numbers', () => {
      expect(runBash("validate_issue_number ' -5'").status).toBe(1);
    });
  });

  describe('validate_epic_name', () => {
    test('accepts alphanumeric names with hyphens and underscores', () => {
      expect(runBash('validate_epic_name my-epic_2').status).toBe(0);
      expect(runBash('validate_epic_name epic42').status).toBe(0);
    });

    test('rejects empty name', () => {
      expect(runBash("validate_epic_name ''").status).toBe(1);
    });

    test('rejects names with spaces or slashes', () => {
      expect(runBash("validate_epic_name 'bad name'").status).toBe(1);
      expect(runBash("validate_epic_name 'bad/name'").status).toBe(1);
    });

    test('rejects names with path traversal characters', () => {
      expect(runBash("validate_epic_name '../escape'").status).toBe(1);
      expect(runBash("validate_epic_name '.'").status).toBe(1);
    });

    test('rejects leading or trailing hyphen/underscore', () => {
      expect(runBash("validate_epic_name '-leading'").status).toBe(1);
      expect(runBash("validate_epic_name 'trailing-'").status).toBe(1);
      expect(runBash("validate_epic_name '_leading'").status).toBe(1);
    });
  });

  describe('validate_file_exists', () => {
    test('accepts an existing readable file', () => {
      const file = path.join(testDir, 'exists.md');
      fs.writeFileSync(file, 'content');
      expect(runBash(`validate_file_exists ${shellEscape(file)}`).status).toBe(0);
    });

    test('rejects a missing file', () => {
      const file = path.join(testDir, 'missing.md');
      const result = runBash(`validate_file_exists ${shellEscape(file)} 'Task file'`);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Task file not found');
    });
  });

  describe('validate_directory_exists', () => {
    test('accepts an existing directory', () => {
      expect(runBash(`validate_directory_exists ${shellEscape(testDir)}`).status).toBe(0);
    });

    test('rejects a missing directory', () => {
      const dir = path.join(testDir, 'nope');
      expect(runBash(`validate_directory_exists ${shellEscape(dir)}`).status).toBe(1);
    });
  });

  describe('validate_git_repository', () => {
    test('rejects a directory that is not a git repository', () => {
      const result = runBash(`validate_git_repository ${shellEscape(testDir)}`);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('not a Git repository');
    });

    test('accepts an initialized git repository', () => {
      spawnSync('git', ['init', '--quiet'], { cwd: testDir });
      expect(runBash(`validate_git_repository ${shellEscape(testDir)}`).status).toBe(0);
    });
  });

  describe('validate_required_commands', () => {
    test('accepts commands that exist', () => {
      expect(runBash('validate_required_commands bash ls').status).toBe(0);
    });

    test('rejects missing commands and lists them', () => {
      const result = runBash('validate_required_commands definitely-not-a-command-xyz');
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('definitely-not-a-command-xyz');
    });
  });

  describe('validate_environment_variables', () => {
    test('accepts when variables are set', () => {
      const result = runBash('validate_environment_variables MY_TEST_VAR', {
        env: { MY_TEST_VAR: 'value' }
      });
      expect(result.status).toBe(0);
    });

    test('rejects when variables are missing', () => {
      const result = runBash('validate_environment_variables MY_UNSET_TEST_VAR_608');
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('MY_UNSET_TEST_VAR_608');
    });
  });

  describe('validate_labels', () => {
    test('accepts comma-separated labels', () => {
      expect(runBash("validate_labels 'bug, enhancement, good first issue'").status).toBe(0);
    });

    test('accepts empty labels with a warning', () => {
      expect(runBash("validate_labels ''").status).toBe(0);
    });

    test('rejects labels with invalid characters', () => {
      expect(runBash("validate_labels 'bad;label'").status).toBe(1);
    });
  });

  describe('validate_epic_structure', () => {
    test('validates a complete epic directory', () => {
      const epicDir = path.join(testDir, '.claude', 'epics', 'my-epic');
      fs.mkdirSync(epicDir, { recursive: true });
      fs.writeFileSync(path.join(epicDir, 'epic.md'), '# Epic');
      fs.writeFileSync(path.join(epicDir, '001.md'), '# Task');

      const baseDir = path.join(testDir, '.claude', 'epics');
      expect(
        runBash(`validate_epic_structure my-epic ${shellEscape(baseDir)}`).status
      ).toBe(0);
    });

    test('rejects an epic without epic.md', () => {
      const epicDir = path.join(testDir, '.claude', 'epics', 'empty-epic');
      fs.mkdirSync(epicDir, { recursive: true });

      const baseDir = path.join(testDir, '.claude', 'epics');
      expect(
        runBash(`validate_epic_structure empty-epic ${shellEscape(baseDir)}`).status
      ).toBe(1);
    });
  });
});
