// Guards the npm script / test-config cleanup (#844): no script may point at
// a missing path or a glob that matches nothing, CI runs the suite once, and
// the regression run must not rewrite tracked files.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { scripts } = JSON.parse(read('package.json'));

// Local path-like tokens in a script: scripts/x.js, test/a/*.test.js, jest.config.x.js
const PATH_TOKEN = /^(?:\.\/)?(?:scripts|test|bin|lib|jest\.config)[\w.\-/*]*$/;

function globHasMatch(pattern) {
  const star = pattern.indexOf('*');
  if (star === -1) return fs.existsSync(path.join(root, pattern));
  const base = path.join(root, pattern.slice(0, pattern.lastIndexOf('/', star)));
  if (!fs.existsSync(base)) return false;
  const suffix = pattern.slice(pattern.lastIndexOf('*') + 1);
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).some((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(suffix));
  return walk(base);
}

describe('npm scripts integrity (#844)', () => {
  it.each(Object.entries(scripts))('%s targets only existing paths', (name, cmd) => {
    const missing = cmd.split(/\s+/)
      .map((t) => t.replace(/^['"]|['"]$/g, ''))
      .filter((t) => PATH_TOKEN.test(t))
      .filter((t) => !globHasMatch(t));
    expect(missing).toEqual([]);
  });

  it('drops the broken and no-op scripts', () => {
    for (const s of ['test:old', 'setup:hooks', 'test:migration', 'test:commands',
      'test:azure:integration', 'test:e2e', 'test:e2e:legacy']) {
      expect(scripts).not.toHaveProperty([s]);
    }
  });

  it('no script uses --forceExit', () => {
    expect(Object.values(scripts).filter((c) => c.includes('--forceExit'))).toEqual([]);
  });

  it('dead jest configs are gone', () => {
    expect(fs.existsSync(path.join(root, 'jest.config.integration.js'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'jest.config.scripts.js'))).toBe(false);
  });

  it('CI test.yml runs the suite once (test:coverage only)', () => {
    const wf = read('.github/workflows/test.yml');
    expect(wf).toMatch(/run: npm run test:coverage/);
    expect(wf).not.toMatch(/run: npm test\b/);
  });

  it('regression health report is not written into the repo', () => {
    const src = read('test/regression/critical-paths.test.js');
    expect(src).not.toMatch(/'test\/regression\/__snapshots__'/);
  });

  it('.gitignore anchors src/ to the repo root', () => {
    const lines = read('.gitignore').split('\n').map((l) => l.trim());
    expect(lines).toContain('/src/');
    expect(lines).not.toContain('src/');
  });
});
