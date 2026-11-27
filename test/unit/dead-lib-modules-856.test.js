/**
 * #856: test-only lib modules are removed and nothing requires them.
 * Part 1: the deprecated `autopm guide` command with lib/guide/, and
 * lib/services/interfaces.js and lib/validators/email-validator.js.
 * Part 2: the unused Azure DevOps Resources/Cli/Rest clients (the live path is
 * AzureDevOpsProvider.js), conflict/query/visual-diff modules and their examples.
 * lib/batch-processor*.js stay: /pm:sync-batch uses them.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

const REMOVED = [
  'lib/guide/interactive-guide.js',
  'lib/guide/manager.js',
  'lib/validators/email-validator.js',
  'lib/services/interfaces.js',
  // Only consumers of lib/guide/; they resolve a path that does not exist in
  // an installed project, so they could never run there.
  'autopm/.claude/lib/commands/user/guide.js',
  '.claude/lib/commands/user/guide.js',
  // Part 2
  'lib/providers/AzureDevOpsResourcesProvider.js',
  'lib/providers/AzureDevOpsCliWrapper.js',
  'lib/providers/AzureDevOpsRestClient.js',
  'lib/conflict-history.js',
  'lib/conflict-resolver.js',
  'lib/query-parser.js',
  'lib/visual-diff.js',
  'lib/README-FILTER-SEARCH.md',
  'examples/batch-sync-example.js',
  'examples/conflict-resolution-integration.js',
  'examples/filter-search-cli-integration.js',
];

const MODULE_NAMES = [
  'guide/interactive-guide',
  'guide/manager',
  'email-validator',
  'services/interfaces',
  'AzureDevOpsResourcesProvider',
  'AzureDevOpsCliWrapper',
  'AzureDevOpsRestClient',
  'conflict-history',
  'conflict-resolver',
  'query-parser',
  'visual-diff',
];

describe('#856 dead lib modules removed', () => {
  test.each(REMOVED)('%s no longer exists', (rel) => {
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
  });

  test('`autopm guide` is no longer registered', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bin/autopm.js'), 'utf8');
    expect(src).not.toMatch(/\.command\(\s*['"]guide\b/);
  });

  test('the azure:vg-* prompts do not name the removed provider', () => {
    let out = '';
    try {
      out = execFileSync(
        'git',
        ['grep', '-n', 'AzureDevOpsResourcesProvider', '--', 'packages', 'autopm'],
        { cwd: ROOT, encoding: 'utf8' }
      );
    } catch (e) {
      if (e.status !== 1) throw e; // 1 = no match
    }
    expect(out).toBe('');
  });

  test('no require of a removed module in bin/, lib/, packages/, autopm/', () => {
    const pattern = `require\\([^)]*(${MODULE_NAMES.join('|')})`;
    let out = '';
    try {
      out = execFileSync(
        'git',
        ['grep', '-n', '-E', pattern, '--', 'bin', 'lib', 'packages', 'autopm'],
        { cwd: ROOT, encoding: 'utf8' }
      );
    } catch (e) {
      if (e.status !== 1) throw e; // 1 = no match
    }
    expect(out).toBe('');
  });
});
