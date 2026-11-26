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

const test = require('node:test');
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
  const epicCmd = require(path.join(ROOT, 'bin/commands/epic.js'));
  assert.strictEqual(typeof epicCmd.isValidEpicName, 'function',
    'epic command must export isValidEpicName');

  assert.strictEqual(epicCmd.isValidEpicName('$(touch /tmp/pwned)'), false);
  assert.strictEqual(epicCmd.isValidEpicName('foo; rm -rf /'), false);
  assert.strictEqual(epicCmd.isValidEpicName('foo`whoami`'), false);
  assert.strictEqual(epicCmd.isValidEpicName('../escape'), false);
  // Legitimate names still allowed
  assert.strictEqual(epicCmd.isValidEpicName('fullstack-app_v2.1'), true);
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
// 4. AzureDevOpsCliWrapper executes az via argv array — no shell at all
// ---------------------------------------------------------------------------
test('AzureDevOpsCliWrapper: az runs via execFileSync argv array, no shell', () => {
  const Wrapper = require(path.join(ROOT, 'lib/providers/AzureDevOpsCliWrapper.js'));
  const wrapper = new Wrapper({ token: 't', organization: 'o', project: 'p' });

  const src = fs.readFileSync(path.join(ROOT, 'lib/providers/AzureDevOpsCliWrapper.js'), 'utf8');
  // The shell (execSync on a command string) was eliminated entirely;
  // every az invocation goes through execFileSync with an argv array, so
  // newlines, quotes, $(), backticks etc. in values are inert.
  assert.ok(!/require\(['"]child_process['"]\)[^\n]*execSync/.test(src) && !/\bexecSync\(/.test(src),
    'wrapper must not use execSync with a command string');
  assert.match(src, /execFileSync\(\s*['"]az['"]\s*,/,
    'wrapper must execute az via execFileSync argv array');

  // JMESPath values are still escaped so a quote cannot alter the query az parses
  assert.strictEqual(typeof wrapper._escapeJmesValue, 'function',
    'wrapper must escape values embedded in JMESPath string literals');
  const jmes = wrapper._escapeJmesValue("x') || [?name!='");
  assert.ok(!/(^|[^\\])'/.test(jmes),
    `JMESPath-escaped value must not contain an unescaped single quote: ${jmes}`);
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
