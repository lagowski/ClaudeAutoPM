const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

describe('docs links (#829/#830)', () => {
  test.each([
    'docs-site/docs/.vitepress/config.ts'
  ])('%s has no rafeekpro.github.io links', (f) => {
    expect(read(f)).not.toContain('rafeekpro.github.io');
  });

  test('CHANGELOG [Unreleased] mentions #792 and #809', () => {
    const cl = read('CHANGELOG.md');
    const start = cl.indexOf('## [Unreleased]');
    const end = cl.indexOf('\n## [', start + 1);
    const section = cl.slice(start, end);
    expect(section).toMatch(/#792\b/);
    expect(section).toMatch(/#809\b/);
  });
});
