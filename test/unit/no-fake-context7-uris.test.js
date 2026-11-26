/**
 * Context7 exposes MCP tools (resolve-library-id, query-docs), not addressable
 * `mcp://context7/<topic>` resources. Lists of such URIs did nothing but cost
 * tokens in every command and agent, so they are replaced by one pointer to
 * the shared rule `.claude/rules/context7-required.md` (issue #862).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FAKE_URI = 'mcp://' + 'context7/';
const TEXT_EXT = new Set(['.md', '.js', '.json', '.sh', '.xml', '.yaml', '.yml', '.txt', '.py']);

function collect(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, result);
    else if (TEXT_EXT.has(path.extname(entry.name))) result.push(full);
  }
  return result;
}

describe('no fake mcp://context7/ URIs (issue #862)', () => {
  test('packages/ and autopm/.claude carry zero mcp://context7/ references', () => {
    const offenders = [];
    let total = 0;
    for (const dir of ['packages', path.join('autopm', '.claude')]) {
      for (const file of collect(path.join(ROOT, dir))) {
        const count = fs.readFileSync(file, 'utf8').split(FAKE_URI).length - 1;
        if (count > 0) {
          total += count;
          offenders.push(`${path.relative(ROOT, file)} (${count})`);
        }
      }
    }
    expect({ total, offenders: offenders.slice(0, 20) }).toEqual({ total: 0, offenders: [] });
  });

  test('the shared rule names the real Context7 tools', () => {
    for (const rel of [
      'packages/plugin-core/rules/context7-required.md',
      'autopm/.claude/rules/context7-required.md'
    ]) {
      const rule = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(rule).toMatch(/resolve-library-id/);
      expect(rule).toMatch(/query-docs/);
    }
  });

  test.each(['pre-command-context7.js', 'pre-agent-context7.js'])(
    '%s accepts a file that points to the shared rule',
    (hook) => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'c7-'));
      const isCommand = hook.startsWith('pre-command');
      const dir = isCommand
        ? path.join(tmp, '.claude', 'commands', 'pm')
        : path.join(tmp, '.claude', 'agents', 'core');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, isCommand ? 'demo.md' : 'demo-agent.md'),
        '# Demo\n\n## Required Documentation Access\n\n' +
          'Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react.\n'
      );
      // Installed projects run hooks from .claude/hooks/ (CommonJS there;
      // plugin-core's own package.json marks the source dir as ESM).
      const hookPath = path.join(tmp, '.claude', 'hooks', hook);
      fs.mkdirSync(path.dirname(hookPath), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'packages', 'plugin-core', 'hooks', hook), hookPath);
      const arg = isCommand ? '/pm:demo' : '@demo-agent';
      const out = execFileSync(process.execPath, [hookPath, arg], { cwd: tmp, encoding: 'utf8' });
      expect(out).toMatch(/context7-required\.md/);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  );
});
