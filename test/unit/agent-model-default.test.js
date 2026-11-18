/**
 * Shipped agent definitions must pin a model (issue #792): `model: inherit`
 * makes every subagent run on the parent session's (Opus) model.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.git']);
const READ_ONLY = new Set(['code-analyzer', 'file-analyzer']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md') && p.split(path.sep).includes('agents')) out.push(p);
  }
  return out;
}

function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

const modelOf = (fm) => (fm.match(/^model:\s*(\S+)/m) || [])[1];

const agents = ['packages', 'autopm/.claude', '.claude']
  .flatMap((d) => walk(path.join(ROOT, d)))
  .map((f) => ({ file: f, rel: path.relative(ROOT, f), fm: frontmatter(f) }))
  .filter((a) => a.fm !== null && /^name:/m.test(a.fm));

describe('agent definitions pin a model', () => {
  it('finds agent definitions', () => {
    expect(agents.length).toBeGreaterThan(50);
  });

  it.each(agents.map((a) => [a.rel, a]))('%s has a non-inherit model', (_rel, a) => {
    const model = modelOf(a.fm);
    expect(model).toBeDefined();
    expect(model).not.toBe('inherit');
  });

  it.each(agents.filter((a) => READ_ONLY.has(path.basename(a.file, '.md'))).map((a) => [a.rel, a]))(
    '%s (read-only) uses haiku',
    (_rel, a) => {
      expect(modelOf(a.fm)).toBe('haiku');
    }
  );

  describe('autopm copies match packages source', () => {
    const dir = path.join(ROOT, 'autopm/.claude/agents/core');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    it.each(files)('%s', (f) => {
      const src = path.join(ROOT, 'packages/plugin-core/agents/core', f);
      expect(fs.existsSync(src)).toBe(true);
      expect(modelOf(frontmatter(path.join(dir, f)))).toBe(modelOf(frontmatter(src)));
    });
  });
});
