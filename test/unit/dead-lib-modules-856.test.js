/**
 * #856: test-only lib modules, the deprecated `autopm guide` command and the
 * orphaned examples that demo them are removed, and nothing requires them.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

const REMOVED = [
  'lib/providers/AzureDevOpsResourcesProvider.js',
  'lib/providers/AzureDevOpsCliWrapper.js',
  'lib/providers/AzureDevOpsRestClient.js',
  'lib/guide/interactive-guide.js',
  'lib/guide/manager.js',
  'lib/batch-processor.js',
  'lib/batch-processor-integration.js',
  'lib/conflict-history.js',
  'lib/conflict-resolver.js',
  'lib/query-parser.js',
  'lib/visual-diff.js',
  'lib/validators/email-validator.js',
  'lib/services/interfaces.js',
  'lib/README-FILTER-SEARCH.md',
  'examples/batch-sync-example.js',
  'examples/conflict-resolution-integration.js',
  'examples/filter-search-cli-integration.js',
  // Only consumers of the modules above; both resolve a path that does not
  // exist in an installed project, so they could never run there.
  'packages/plugin-pm/scripts/pm/sync-batch.js',
  'autopm/.claude/scripts/pm/sync-batch.js',
  'autopm/.claude/lib/commands/user/guide.js',
  '.claude/lib/commands/user/guide.js',
];

const MODULE_NAMES = [
  'AzureDevOpsResourcesProvider',
  'AzureDevOpsCliWrapper',
  'AzureDevOpsRestClient',
  'guide/interactive-guide',
  'guide/manager',
  'batch-processor',
  'conflict-history',
  'conflict-resolver',
  'query-parser',
  'visual-diff',
  'email-validator',
  'services/interfaces',
];

describe('#856 dead lib modules removed', () => {
  test.each(REMOVED)('%s no longer exists', (rel) => {
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
  });

  test('`autopm guide` is no longer registered', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bin/autopm.js'), 'utf8');
    expect(src).not.toMatch(/\.command\(\s*['"]guide\b/);
  });

  test('plugin-pm no longer registers the sync-batch script', () => {
    const plugin = require(path.join(ROOT, 'packages/plugin-pm/plugin.json'));
    const names = (plugin.scripts || []).map((s) => s.name);
    expect(names).not.toContain('sync-batch');
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
