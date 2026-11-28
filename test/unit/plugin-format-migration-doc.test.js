// #860: the plugin-format migration spike must leave a doc that covers every
// packages/plugin-* workspace, a compatibility section, a sized child-issue
// list, and cites the Claude Code plugin docs it relies on.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const docPath = path.join(root, 'docs', 'plugin-format-migration.md');
const plugins = fs
  .readdirSync(path.join(root, 'packages'))
  .filter((d) => d.startsWith('plugin-'));

describe('docs/plugin-format-migration.md (#860)', () => {
  const doc = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';

  test('exists', () => {
    expect(doc).not.toBe('');
  });

  test('there are 14 plugin workspaces', () => {
    expect(plugins).toHaveLength(14);
  });

  test.each(plugins)('mapping table has a row for %s', (p) => {
    expect(doc).toMatch(new RegExp(`^\\|\\s*\`?${p}\`?\\s*\\|`, 'm'));
  });

  test('has a compatibility section', () => {
    expect(doc).toMatch(/^##+ .*compatib/im);
  });

  test('child-issue list is numbered and every item carries a size label', () => {
    const start = doc.search(/^## .*child issues/im);
    expect(start).toBeGreaterThan(-1);
    const rest = doc.slice(start + 1);
    const end = rest.search(/^## /m);
    const section = end === -1 ? rest : rest.slice(0, end);
    // An item runs from its "N. " line to the next item, blank line or end.
    const items = section.split(/\n(?=\d+\. )|\n\s*\n/).filter((b) => /^\d+\. /.test(b));
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const item of items) expect(item).toMatch(/`size:[SM]`/);
  });

  test('cites the Claude Code plugin docs', () => {
    expect(doc).toMatch(/https:\/\/code\.claude\.com\/docs\/en\/plugins-reference/);
    expect(doc).toMatch(/https:\/\/code\.claude\.com\/docs\/en\/plugin-marketplaces/);
  });
});
