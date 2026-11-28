/**
 * #868: the published CLI (bin/, lib/) uses node:fs built-ins, not fs-extra.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : jsFiles(p);
    return /\.(c|m)?js$/.test(e.name) ? [p] : [];
  });
}

describe('no fs-extra in bin/ and lib/ (#868)', () => {
  test('no file under bin/ or lib/ requires fs-extra', () => {
    const offenders = ['bin', 'lib']
      .flatMap((d) => jsFiles(path.join(ROOT, d)))
      .filter((f) => /require\(\s*['"]fs-extra['"]\s*\)/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  test('fs-extra is not a runtime dependency', () => {
    const pkg = require(path.join(ROOT, 'package.json'));
    expect(pkg.dependencies).not.toHaveProperty('fs-extra');
  });

  test.each(['axios', 'nock', 'jest-watch-typeahead'])('unused devDependency %s is removed', (dep) => {
    const pkg = require(path.join(ROOT, 'package.json'));
    expect(pkg.devDependencies || {}).not.toHaveProperty(dep);
  });
});

describe('lib/utils/fs helpers', () => {
  const fsx = require('../../lib/utils/fs');
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fsx-'));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('ensureDir creates nested dirs and is idempotent', async () => {
    const d = path.join(tmp, 'a', 'b');
    await fsx.ensureDir(d);
    await fsx.ensureDir(d);
    expect(fs.statSync(d).isDirectory()).toBe(true);
  });

  test('pathExists is true for existing and false for missing paths', async () => {
    expect(await fsx.pathExists(tmp)).toBe(true);
    expect(await fsx.pathExists(path.join(tmp, 'missing'))).toBe(false);
  });

  test('writeJson/readJson round-trip with spaces and trailing newline', async () => {
    const f = path.join(tmp, 'x.json');
    await fsx.writeJson(f, { a: 1 }, { spaces: 2 });
    expect(fs.readFileSync(f, 'utf8')).toBe('{\n  "a": 1\n}\n');
    expect(await fsx.readJson(f)).toEqual({ a: 1 });
    expect(fsx.readJSON).toBe(fsx.readJson);
    expect(fsx.writeJSON).toBe(fsx.writeJson);
  });

  test('copy copies files and directories; remove deletes and tolerates missing', async () => {
    const src = path.join(tmp, 'src');
    fs.mkdirSync(path.join(src, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(src, 'sub', 'f.txt'), 'hi');
    await fsx.copy(src, path.join(tmp, 'dst'));
    expect(fs.readFileSync(path.join(tmp, 'dst', 'sub', 'f.txt'), 'utf8')).toBe('hi');
    await fsx.copy(path.join(src, 'sub', 'f.txt'), path.join(tmp, 'g.txt'));
    expect(fs.readFileSync(path.join(tmp, 'g.txt'), 'utf8')).toBe('hi');
    await fsx.remove(src);
    await fsx.remove(src);
    expect(fs.existsSync(src)).toBe(false);
  });
});
