/**
 * Runtime dependency usage guard.
 *
 * Every entry in `dependencies` ships to anyone who installs `claude-autopm`.
 * A declared package with no import site anywhere in the tree costs install
 * time, disk and attack surface for nothing — and it keeps generating
 * Dependabot PRs that cost a review each.
 *
 * `simple-git` was exactly that: declared since the early days, imported
 * nowhere, and still bumped by Dependabot. The repo does git by shelling out
 * (`execSync('git …')` in lib/services/ContextService.js and
 * lib/guide/interactive-guide.js), never through a library. PR #785 (v3 → v4,
 * a major with breaking export changes) drew a review warning that call sites
 * needed migrating; there were no call sites to migrate. This guard is what
 * would have said so.
 *
 * Note that `.github/review-context.md` — the AI reviewer's project brief —
 * still lists `simple-git` and `execa` as "key deps" and calls shell-out
 * through them "the top CLI risk". Both are unused. The brief is deployed from
 * lagowski/pr-review-gate (`contexts/`), so it cannot be corrected here.
 *
 * KNOWN_UNUSED is now EMPTY, and that is the intended end state. It began as a
 * baseline of six packages that were already unused when this guard was written
 * (execa, fast-glob, marked, moment, table, which) and were out of scope for
 * #785; all six were removed in #789. The list is checked in both directions —
 * an entry that becomes used, or one no longer declared, fails the test — so it
 * cannot quietly rot. Keep it empty. A new dependency belongs in `dependencies`
 * only once something imports it.
 *
 * Three names that look used but are not, so nobody re-adds them:
 *   - `which`  — `execFileSync('which', [cmd])` invokes the SYSTEM binary
 *                (.claude/scripts/setup-context7.js:49), not the npm package.
 *   - `table`  — `'table'` appears only as an output-format string in the azure
 *                command tests.
 *   - `marked` — appears only as fixture data naming a dependency, in
 *                test/unit/dependabot-auto-merge-gate.test.js.
 *
 * To fix a failure:
 *   - "declared but never imported" → delete it from package.json and
 *     regenerate package-lock.json. If it genuinely has no import site but must
 *     ship anyway, say why in a comment and add it to KNOWN_UNUSED.
 *   - "listed in KNOWN_UNUSED but now imported" → drop it from the list.
 *   - "listed in KNOWN_UNUSED but no longer declared" → drop it from the list.
 *
 * Runs under both jest (npm test) and node --test (npm run test:unit).
 */

'use strict';

if (typeof describe === 'undefined') {
  // Running under node --test: provide jest-like globals.
  const nodeTest = require('node:test');
  globalThis.describe = nodeTest.describe;
  globalThis.test = nodeTest.test;
}

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Runtime dependencies that ship despite having no import site. Empty by design —
 * see the header. An addition here needs a stated reason, not just a passing test.
 */
const KNOWN_UNUSED = [];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'coverage', '.nyc_output', 'test-temp', 'worktrees'
]);
const CODE_EXT = new Set(['.js', '.cjs', '.mjs', '.ts']);

/** Every first-party code file, excluding vendored and generated trees. */
function codeFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (CODE_EXT.has(path.extname(entry.name))) out.push(full);
    }
  })(ROOT);
  return out;
}

/**
 * Files importing `dep`, by any form this codebase uses: CJS require of the
 * package or a subpath, ESM static import, and dynamic import().
 */
function importSites(dep, sources) {
  const forms = [
    `require('${dep}')`, `require("${dep}")`,
    `require('${dep}/`, `require("${dep}/`,
    `from '${dep}'`, `from "${dep}"`,
    `from '${dep}/`, `from "${dep}/`,
    `import('${dep}')`, `import("${dep}")`
  ];
  return sources
    .filter(([, text]) => forms.some(f => text.includes(f)))
    .map(([file]) => path.relative(ROOT, file));
}

const declared = Object.keys(require(path.join(ROOT, 'package.json')).dependencies);
const sources = codeFiles().map(f => [f, fs.readFileSync(f, 'utf8')]);
const usage = new Map(declared.map(d => [d, importSites(d, sources)]));

describe('runtime dependency usage', () => {
  test('every declared dependency is imported somewhere', () => {
    const orphans = declared
      .filter(d => !KNOWN_UNUSED.includes(d))
      .filter(d => usage.get(d).length === 0);
    assert.deepStrictEqual(
      orphans, [],
      `declared in package.json "dependencies" but never imported: ${orphans.join(', ')}. ` +
      'Remove it and regenerate package-lock.json, or justify it in KNOWN_UNUSED.'
    );
  });

  test('simple-git stays gone — the repo shells out to git, it has no git library', () => {
    assert.ok(
      !declared.includes('simple-git'),
      'simple-git is back in dependencies. Nothing imports it; git access goes through ' +
      "execSync('git …'). See PR #785."
    );
  });

  test('KNOWN_UNUSED holds nothing that is now imported', () => {
    const revived = KNOWN_UNUSED
      .filter(d => usage.has(d))
      .filter(d => usage.get(d).length > 0);
    assert.deepStrictEqual(
      revived, [],
      `now imported, so drop from KNOWN_UNUSED: ${
        revived.map(d => `${d} (${usage.get(d)[0]})`).join(', ')}`
    );
  });

  test('KNOWN_UNUSED holds nothing that is no longer declared', () => {
    const stale = KNOWN_UNUSED.filter(d => !declared.includes(d));
    assert.deepStrictEqual(
      stale, [],
      `no longer in dependencies, so drop from KNOWN_UNUSED: ${stale.join(', ')}`
    );
  });
});
