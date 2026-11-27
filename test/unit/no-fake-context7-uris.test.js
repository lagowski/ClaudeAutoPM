/**
 * Context7 exposes MCP tools (resolve-library-id, query-docs), not addressable
 * `mcp://context7/<topic>` resources. Lists of such URIs did nothing but cost
 * tokens in every command and agent, so they are replaced by one pointer to
 * the shared rule `.claude/rules/context7-required.md` (issue #862).
 */

const fs = require('fs');
const path = require('path');

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

});
