/**
 * #861: shipped agents/commands must not carry retired Claude model ids,
 * agent `tools:` lists must name only tools Claude Code has, and every
 * plugin agent needs name/description frontmatter.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCAN_DIRS = ['packages', 'autopm'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'test', '__tests__']);
const EXTS = new Set(['.md', '.js', '.json', '.yaml', '.yml', '.sh', '.py', '.ts']);

const RETIRED_ID = /claude-3[-.\w]*|claude-(?:opus|sonnet|haiku)-4(?:-\d+)?-2025\d{4}/g;
const NONEXISTENT_TOOLS = ['LS', 'MultiEdit', 'Search', 'BashOutput', 'KillBash'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function agentFiles() {
  const files = [];
  for (const pkg of fs.readdirSync(path.join(ROOT, 'packages'))) {
    const dir = path.join(ROOT, 'packages', pkg, 'agents');
    if (fs.existsSync(dir)) files.push(...walk(dir));
  }
  files.push(...walk(path.join(ROOT, 'autopm', '.claude', 'agents')));
  return files.filter((f) => f.endsWith('.md') && path.basename(f) !== 'README.md');
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  return m ? m[1] : null;
}

const rel = (f) => path.relative(ROOT, f);

describe('#861 agent model ids and tools', () => {
  test('no retired claude-3 or dated claude-*-4-2025 ids in packages/ and autopm/', () => {
    const hits = [];
    for (const d of SCAN_DIRS) {
      for (const f of walk(path.join(ROOT, d))) {
        const ids = fs.readFileSync(f, 'utf8').match(RETIRED_ID);
        if (ids) hits.push(`${rel(f)}: ${[...new Set(ids)].join(', ')}`);
      }
    }
    expect(hits).toEqual([]);
  });

  test('every plugin agent has name and description frontmatter', () => {
    const missing = [];
    for (const f of agentFiles()) {
      if (!rel(f).startsWith('packages')) continue;
      const fm = frontmatter(fs.readFileSync(f, 'utf8'));
      if (!fm || !/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) missing.push(rel(f));
    }
    expect(missing).toEqual([]);
  });

  test('agent tools: lists name no tool Claude Code lacks', () => {
    const bad = [];
    for (const f of agentFiles()) {
      const fm = frontmatter(fs.readFileSync(f, 'utf8'));
      const line = fm && fm.match(/^tools:(.*)$/m);
      if (!line) continue;
      const tools = line[1].replace(/[[\]]/g, '').split(',').map((t) => t.trim());
      const found = tools.filter((t) => NONEXISTENT_TOOLS.includes(t));
      if (found.length) bad.push(`${rel(f)}: ${found.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('#861 ClaudeProvider default model', () => {
  const ClaudeProvider = require('../../lib/ai-providers/ClaudeProvider');
  const saved = process.env.ANTHROPIC_MODEL;
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = saved;
  });

  test('defaults to a current alias, not a dated snapshot', () => {
    delete process.env.ANTHROPIC_MODEL;
    const p = new ClaudeProvider({ apiKey: 'k' });
    expect(p.model).toBe('claude-sonnet-5-5');
    expect(p.model).not.toMatch(new RegExp(RETIRED_ID.source));
  });

  test('ANTHROPIC_MODEL overrides the default; config.model overrides both', () => {
    process.env.ANTHROPIC_MODEL = 'claude-opus-5-5';
    expect(new ClaudeProvider({ apiKey: 'k' }).model).toBe('claude-opus-5-5');
    expect(new ClaudeProvider({ apiKey: 'k', model: 'x' }).model).toBe('x');
  });
});
