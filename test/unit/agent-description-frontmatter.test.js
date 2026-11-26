/**
 * Claude Code registers a subagent only when its frontmatter has a description
 * (issue #845): the four core agents shipped without one, so test-runner,
 * code-analyzer, file-analyzer and agent-manager were never offered.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// Index and reference docs that live beside the agents but are not agents.
const NOT_AGENTS = new Set(['README.md', 'AGENT-REGISTRY.md']);
const NOT_AGENT_DIRS = new Set(['decision-matrices']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!NOT_AGENT_DIRS.has(e.name)) walk(p, out);
    } else if (e.name.endsWith('.md') && !NOT_AGENTS.has(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function field(file, key) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return undefined;
  const v = m[1].match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  return v ? v[1].trim() : undefined;
}

const agents = ['autopm/.claude/agents', '.claude/agents']
  .flatMap((d) => walk(path.join(ROOT, d)))
  .map((f) => [path.relative(ROOT, f), f]);

describe('shipped agents carry name + description frontmatter', () => {
  it('finds agent definitions', () => {
    expect(agents.length).toBeGreaterThanOrEqual(14);
  });

  it.each(agents)('%s', (_rel, file) => {
    expect(field(file, 'name')).toBeTruthy();
    expect(field(file, 'description')).toBeTruthy();
  });

  describe('core copies carry the packages/plugin-core description', () => {
    const src = path.join(ROOT, 'packages/plugin-core/agents/core');
    const cases = ['autopm/.claude/agents/core', '.claude/agents/core'].flatMap((d) =>
      fs
        .readdirSync(path.join(ROOT, d))
        .filter((f) => f.endsWith('.md') && !NOT_AGENTS.has(f) && fs.existsSync(path.join(src, f)))
        .map((f) => [`${d}/${f}`, path.join(ROOT, d, f), path.join(src, f)])
    );
    it.each(cases)('%s', (_rel, copy, source) => {
      expect(field(copy, 'description')).toBe(field(source, 'description'));
    });
  });
});
