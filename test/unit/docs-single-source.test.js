/**
 * #865: docs single source — no stale rafeekpro repo URLs in the published
 * package metadata/docs, FRAMEWORK-GUIDE.md removed, one-command install documented.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SCOPE = [
  'package.json',
  'packages',
  'docs-site/docs',
  'install/install.js',
  'install/README.md',
  'README.md',
  'CONTRIBUTING.md'
];

describe('docs single source (#865)', () => {
  test('no github.com/rafeekpro URLs in tracked files in scope', () => {
    let out = '';
    try {
      out = execFileSync('git', ['grep', '-n', 'github.com/rafeekpro', '--', ...SCOPE], {
        cwd: root,
        encoding: 'utf8'
      });
    } catch (e) {
      if (e.status !== 1) throw e; // 1 = no match
    }
    expect(out).toBe('');
  });

  test('FRAMEWORK-GUIDE.md is gone', () => {
    expect(fs.existsSync(path.join(root, 'FRAMEWORK-GUIDE.md'))).toBe(false);
  });

  test('install/README.md Quick Start uses the npm package', () => {
    expect(read('install/README.md')).toMatch(/npm i -g claude-autopm && autopm install/);
  });

  test('docs-site installation documents the one-command path and AUTOPM_TEST_MODE', () => {
    const doc = read('docs-site/docs/getting-started/installation.md');
    expect(doc).toContain('npx claude-autopm install --scenario=lite');
    expect(doc).toContain('AUTOPM_TEST_MODE');
  });
});
