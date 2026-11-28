/**
 * Jest is the only test runner (#869).
 *
 * Two runners and ~45 test scripts meant most suites never ran: node:test
 * files were invisible to `npm test`, and test/jest-tests/ only ran under the
 * red `test:full` config. This guard keeps one runner and a short script list.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const scripts = require(path.join(root, 'package.json')).scripts;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'fixtures' ? [] : walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

const TEST_SCRIPTS = [
  'test',
  'test:quick',
  'test:coverage',
  'test:watch',
  'test:security',
  'test:regression',
  'test:cli',
  'test:install'
];

describe('jest is the only test runner (#869)', () => {
  it('no file under test/ imports node:test', () => {
    const pattern = new RegExp(`require\\(['"]node:${'test'}['"]\\)|from ['"]node:${'test'}['"]`);
    const offenders = walk(path.join(root, 'test'))
      .filter((f) => pattern.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });

  // Part 1 of #869 (#941). The last ten retired files in test/jest-tests/ are deleted by
  // part 2 (item/869-retire-jest-tests-2), which puts back the "is gone" assertion.
  it('no jest config runs test/jest-tests/', () => {
    const config = require(path.join(root, 'jest.config.js'));
    const runs = (config.testMatch || []).some((m) => m.includes('jest-tests'));
    expect(runs).toBe(false);
  });

  it('jest.config.clean.js is gone', () => {
    expect(fs.existsSync(path.join(root, 'jest.config.clean.js'))).toBe(false);
  });

  it('package.json has exactly the eight test scripts', () => {
    const testScripts = Object.keys(scripts).filter((k) => k === 'test' || k.startsWith('test:'));
    expect(testScripts.sort()).toEqual([...TEST_SCRIPTS].sort());
  });

  it('no script runs node --test or c8', () => {
    const offenders = Object.entries(scripts).filter(([, cmd]) => /node --test|\bc8\b/.test(cmd));
    expect(offenders).toEqual([]);
  });
});
