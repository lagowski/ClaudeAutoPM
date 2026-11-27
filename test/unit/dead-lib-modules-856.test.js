/**
 * #856 (part 1): the deprecated `autopm guide` command with lib/guide/, and the
 * test-only lib/services/interfaces.js and lib/validators/email-validator.js are
 * removed, and nothing requires them. The other dead modules are a later part.
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
];

const MODULE_NAMES = [
  'guide/interactive-guide',
  'guide/manager',
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
