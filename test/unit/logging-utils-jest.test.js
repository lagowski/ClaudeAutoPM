/**
 * Tests for autopm/.claude/scripts/lib/logging-utils.sh (#608)
 *
 * Follows the frontmatter-utils.test.js pattern: source the library in bash
 * and assert on exit codes/output. Jest suite; the -jest suffix is historical.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const scriptsDir = path.join(__dirname, '../../autopm/.claude/scripts/lib');
const loggingScript = path.join(scriptsDir, 'logging-utils.sh');

// Helper to escape shell arguments properly
const shellEscape = (str) => "'" + String(str).replace(/'/g, "'\\''") + "'";

// Source the library and run a snippet; returns { status, stdout, stderr }
const runBash = (snippet, env = {}) => {
  const script = `source ${shellEscape(loggingScript)} && ${snippet}`;
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
};

// [2025-01-01T00:00:00Z] PREFIX message  (stderr is not a TTY → no colors)
const LOG_LINE = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\]\s+(\w+)\s+(.*)$/;

describe('logging-utils.sh', () => {
  describe('get_timestamp', () => {
    test('returns ISO 8601 UTC timestamp', () => {
      const result = runBash('get_timestamp');
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe('log levels', () => {
    test('log_info writes INFO line to stderr', () => {
      const result = runBash("log_info 'hello world'");
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      const line = result.stderr.trim();
      expect(line).toMatch(LOG_LINE);
      expect(line).toContain('INFO');
      expect(line).toContain('hello world');
    });

    test('log_error writes ERROR line to stderr', () => {
      const result = runBash("log_error 'boom'");
      expect(result.status).toBe(0);
      expect(result.stderr).toContain('ERROR');
      expect(result.stderr).toContain('boom');
    });

    test('log_warning writes WARN line to stderr', () => {
      const result = runBash("log_warning 'careful'");
      expect(result.stderr).toContain('WARN');
      expect(result.stderr).toContain('careful');
    });

    test('log_debug is suppressed at default log level', () => {
      const result = runBash("log_debug 'hidden'");
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('hidden');
    });

    test('log_debug is shown when AUTOPM_LOG_LEVEL=0', () => {
      const result = runBash("log_debug 'visible'", { AUTOPM_LOG_LEVEL: '0' });
      expect(result.stderr).toContain('DEBUG');
      expect(result.stderr).toContain('visible');
    });

    test('log_info is suppressed when AUTOPM_LOG_LEVEL is ERROR (3)', () => {
      const result = runBash("log_info 'quiet'", { AUTOPM_LOG_LEVEL: '3' });
      expect(result.stderr).not.toContain('quiet');
    });
  });

  describe('function entry/exit tracing', () => {
    test('log_function_entry logs at debug level', () => {
      const result = runBash(
        "log_function_entry my_func arg1 arg2",
        { AUTOPM_LOG_LEVEL: '0' }
      );
      expect(result.stderr).toContain('ENTER: my_func(arg1 arg2)');
    });

    test('log_function_exit logs exit code at debug level', () => {
      const result = runBash(
        "log_function_exit my_func 2",
        { AUTOPM_LOG_LEVEL: '0' }
      );
      expect(result.stderr).toContain('EXIT:  my_func (code: 2)');
    });
  });

  describe('print helpers', () => {
    test('print_separator prints 50 dashes by default', () => {
      const result = runBash('print_separator');
      expect(result.stdout.trim()).toBe('-'.repeat(50));
    });

    test('print_separator supports custom char and length', () => {
      const result = runBash("print_separator '=' 10");
      expect(result.stdout.trim()).toBe('='.repeat(10));
    });

    test('print_section prints title between separators', () => {
      const result = runBash("print_section 'My Section'");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('My Section');
      expect(result.stdout).toContain('='.repeat(50));
    });
  });

  describe('with_error_handling', () => {
    test('returns 0 and logs success for a passing command', () => {
      const result = runBash("with_error_handling 'list files' true");
      expect(result.status).toBe(0);
      expect(result.stderr).toContain('Starting: list files');
      expect(result.stderr).toContain('Completed: list files');
    });

    test('returns the failing exit code and logs the failure', () => {
      const result = runBash("with_error_handling 'broken op' false");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Failed: broken op');
    });
  });
});
