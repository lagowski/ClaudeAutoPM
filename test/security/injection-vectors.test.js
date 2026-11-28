/**
 * Security regression tests for injection vectors (issue #606)
 *
 * Demonstrates and guards against:
 *  - Shell injection via epic name, npm package name, az CLI filter values
 *  - Path traversal via PRD @file content references
 *  - Use of `sh -c` with user-controlled commands in pr-validation
 *  - Credential (auth token) logging in dashboard-serve
 *
 * Each test corresponds to a concrete attack vector found in the epic #605 audit.
 */

const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// 1. pr-validation: no shell, no string tokenization — commands are argv arrays
// ---------------------------------------------------------------------------
test('pr-validation: commands are argv arrays, no tokenizer, no sh -c', () => {
  const PRValidation = require(path.join(ROOT, 'autopm/.claude/scripts/pr-validation.js'));
  const validator = new PRValidation();

  // The hand-rolled string tokenizer was removed — commands must be defined
  // as argv arrays at the call site, never parsed from strings.
  assert.strictEqual(validator.parseCommand, undefined,
    'parseCommand string tokenizer must not exist; define commands as argv arrays');

  const src = fs.readFileSync(path.join(ROOT, 'autopm/.claude/scripts/pr-validation.js'), 'utf8');
  assert.ok(!/spawn\(\s*['"]sh['"]\s*,\s*\[\s*['"]-c['"]/.test(src),
    "pr-validation must not use spawn('sh', ['-c', ...])");
  assert.match(src, /command:\s*\['docker-compose',\s*'build'\]/,
    'test commands must be argv arrays');
});

// ---------------------------------------------------------------------------
// 2. epic name validation rejects shell metacharacters
// ---------------------------------------------------------------------------
test('epic: epic name with command substitution is rejected', () => {
  // The registered command (bin/autopm.js) is lib/cli/commands/epic.js (#855)
  const epicCmd = require(path.join(ROOT, 'lib/cli/commands/epic.js'));
  assert.strictEqual(typeof epicCmd.isValidEpicName, 'function',
    'epic command must export isValidEpicName');

  assert.strictEqual(epicCmd.isValidEpicName('$(touch /tmp/pwned)'), false);
  assert.strictEqual(epicCmd.isValidEpicName('foo; rm -rf /'), false);
  assert.strictEqual(epicCmd.isValidEpicName('foo`whoami`'), false);
  assert.strictEqual(epicCmd.isValidEpicName('../escape'), false);
  // Legitimate names still allowed
  assert.strictEqual(epicCmd.isValidEpicName('fullstack-app_v2.1'), true);
});

test('epic: CLI refuses a path-traversal epic name before any handler runs', () => {
  const os = require('os');
  const { spawnSync } = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epic-inject-'));
  const cwd = path.join(tmp, 'a', 'b');
  fs.mkdirSync(cwd, { recursive: true });
  try {
    const res = spawnSync(process.execPath,
      [path.join(ROOT, 'bin/autopm.js'), 'epic', 'new', '../../escape'],
      { cwd, input: '', encoding: 'utf8', timeout: 30000 });

    assert.notStrictEqual(res.status, 0, 'an invalid epic name must fail the command');
    assert.match(res.stderr + res.stdout, /invalid epic name/i);
    // Without validation the name resolves to <tmp>/escape, outside .claude/epics
    assert.strictEqual(fs.existsSync(path.join(tmp, 'escape')), false,
      'no epic directory may be created outside .claude/epics');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 3. prd @file path traversal confined to project root
// ---------------------------------------------------------------------------
test('prd: @file path traversal outside project root is rejected', () => {
  const prdCmd = require(path.join(ROOT, 'lib/cli/commands/prd.js'));
  assert.strictEqual(typeof prdCmd.resolveContentFilePath, 'function',
    'prd command must export resolveContentFilePath');

  assert.throws(() => prdCmd.resolveContentFilePath('../../../etc/passwd'),
    /outside the project|traversal|not allowed/i);
  assert.throws(() => prdCmd.resolveContentFilePath('/etc/passwd'),
    /outside the project|traversal|not allowed/i);

  // A path inside the project resolves fine
  const ok = prdCmd.resolveContentFilePath('docs/spec.md');
  assert.strictEqual(ok, path.join(process.cwd(), 'docs/spec.md'));
});

// ---------------------------------------------------------------------------
// 5. PluginManager validates npm package names before exec
// ---------------------------------------------------------------------------
test('PluginManager: invalid npm package names are rejected', () => {
  const PluginManager = require(path.join(ROOT, 'lib/plugins/PluginManager.js'));
  assert.strictEqual(typeof PluginManager.isValidNpmPackageName, 'function',
    'PluginManager must expose isValidNpmPackageName');

  assert.strictEqual(PluginManager.isValidNpmPackageName('foo; rm -rf /'), false);
  assert.strictEqual(PluginManager.isValidNpmPackageName('$(touch x)'), false);
  assert.strictEqual(PluginManager.isValidNpmPackageName('pkg && evil'), false);
  // Valid npm names (scoped and unscoped) accepted
  assert.strictEqual(PluginManager.isValidNpmPackageName('@autopm/plugin-core'), true);
  assert.strictEqual(PluginManager.isValidNpmPackageName('lodash'), true);
});

// ---------------------------------------------------------------------------
// 5b. AzureIssueStart provider: argv exec + id/branch validation (#608 restore)
// ---------------------------------------------------------------------------
test('AzureIssueStart: no shell exec, id and branch names validated', () => {
  const providerPath = path.join(ROOT, 'autopm/.claude/providers/azure/issue-start.js');
  const src = fs.readFileSync(providerPath, 'utf8');
  assert.ok(!/\bexecSync\(/.test(src),
    'provider must not use execSync with command strings');
  assert.match(src, /execFileSync\(\s*['"](az|git)['"]\s*,/,
    'provider must execute az/git via execFileSync argv arrays');

  // Validators reject shell metacharacters and option smuggling
  const provider = require(providerPath);
  assert.throws(() => provider.branchExists('feat; rm -rf /'), /Invalid branch name/);
  assert.throws(() => provider.branchExists('$(whoami)'), /Invalid branch name/);
  assert.throws(() => provider.createBranch('-oProxyCommand=evil'), /Invalid branch name/);
});

// ---------------------------------------------------------------------------
// 6. setup-context7 validates package names before global install
// ---------------------------------------------------------------------------
test('setup-context7: package name validation rejects injection', () => {
  const SetupContext7 = require(path.join(ROOT, 'autopm/.claude/scripts/setup-context7.js'));
  const setup = new SetupContext7();
  assert.strictEqual(typeof setup.isValidPackageName, 'function',
    'setup-context7 must expose isValidPackageName');

  assert.strictEqual(setup.isValidPackageName('@modelcontextprotocol/server-github'), true);
  assert.strictEqual(setup.isValidPackageName('pkg; rm -rf /'), false);
  assert.strictEqual(setup.isValidPackageName('$(whoami)'), false);
});

// ---------------------------------------------------------------------------
// 7. dashboard-serve does not print the auth token value
// ---------------------------------------------------------------------------
test('dashboard-serve: auth token value is not printed to stdout', () => {
  const src = fs.readFileSync(path.join(ROOT, 'autopm/.claude/scripts/pm/dashboard-serve.js'), 'utf8');
  assert.ok(!/console\.log\([^)]*Token:\s*\$\{token\}/.test(src),
    'dashboard-serve must not console.log the raw token value');
});
