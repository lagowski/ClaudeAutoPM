/**
 * Claude Code registers a subagent only when its frontmatter has a description
 * (issue #845). The frontmatter must also be valid YAML (#898): an unquoted
 * description holding "Context: ..." fails to parse, which is the same as no
 * description, so this test parses it with the `yaml` package, not a regex.
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = path.join(__dirname, '..', '..');
// Index and reference docs that live beside the agents but are not agents.
const NOT_AGENTS = new Set(['README.md', 'AGENT-REGISTRY.md']);
const NOT_AGENT_DIRS = new Set(['decision-matrices']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
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

function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${file}: no frontmatter`);
  return YAML.parse(m[1]);
}

const packageAgentDirs = fs
  .readdirSync(path.join(ROOT, 'packages'))
  .map((p) => path.join('packages', p, 'agents'));

const agents = [...packageAgentDirs, 'autopm/.claude/agents', '.claude/agents']
  .flatMap((d) => walk(path.join(ROOT, d)))
  .map((f) => [path.relative(ROOT, f), f]);

describe('agents carry valid-YAML name + description frontmatter', () => {
  it('finds agent definitions', () => {
    expect(agents.length).toBeGreaterThanOrEqual(14);
  });

  it.each(agents)('%s', (_rel, file) => {
    const fm = frontmatter(file);
    expect(typeof fm.name).toBe('string');
    expect(fm.name.trim()).not.toBe('');
    expect(typeof fm.description).toBe('string');
    expect(fm.description.trim()).not.toBe('');
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
      expect(frontmatter(copy).description).toBe(frontmatter(source).description);
    });
  });
});
