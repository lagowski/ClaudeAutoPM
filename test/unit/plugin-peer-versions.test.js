/**
 * Workspace peer-dependency consistency guard.
 *
 * Every plugin under packages/ that peers on @claudeautopm/plugin-core must
 * declare a range the workspace copy of plugin-core actually satisfies. When
 * it doesn't, `npm ci` fails with ERESOLVE and npm resolves the peer against
 * a stale registry tarball instead of the workspace link.
 *
 * This broke in 2da146a ("chore(release): 4.0.0"), which bumped every plugin's
 * `version` and `engines` but left the peer ranges at ^3.0.0. It stayed
 * invisible for two months (2026-06-22 -> 2026-08-30) because every CI workflow
 * installed with --legacy-peer-deps, which skips peer resolution entirely. That
 * flag is gone as of PR #758 and test/unit/ci-install-flags.test.js now forbids
 * it, so `npm ci` exercises peer resolution for real.
 *
 * Also guarded here: no workspace package may peer on the ROOT package
 * (`claude-autopm`). `workspaces` is `packages/*`, so the root is not a workspace
 * member, and a peer on it can never resolve locally whatever the range says —
 * npm quietly fetches the published tarball instead, installing a frozen copy of
 * this project's own CLI inside its own node_modules, with 21 transitive deps and
 * 15 duplicated packages beneath it. plugin-testing did exactly that via
 * `"claude-autopm": "*"`. PR #693 widened the range trying to fix it, which could
 * not work: the range was never the problem, workspace membership is. Resolved in
 * #787 by peering on plugin-core like every other plugin.
 *
 * NOT covered here on purpose: plugin.json's `compatibleWith`. That is a
 * different axis — PluginManager compares it against the ROOT package version,
 * not plugin-core's — and it is a `>=` range that 4.0.0 already satisfies.
 * Tightening it to a caret range would make every plugin fail to load the
 * moment the root package hits 5.0.0 (PluginManager.isCompatible pins majors).
 *
 * To fix a failure: update the peer range in the named package.json to match
 * plugin-core's current major, then regenerate package-lock.json.
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
const PACKAGES_DIR = path.join(ROOT, 'packages');
const CORE = '@claudeautopm/plugin-core';

const ROOT_MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
/** The root package name — deliberately NOT a legal peer target. See file header. */
const ROOT_PKG = ROOT_MANIFEST.name;

function readManifest(dir) {
  const manifestPath = path.join(PACKAGES_DIR, dir, 'package.json');
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function workspacePackages() {
  return fs.readdirSync(PACKAGES_DIR)
    .filter(dir => fs.statSync(path.join(PACKAGES_DIR, dir)).isDirectory())
    .filter(dir => readManifest(dir) !== null)
    .sort();
}

/** Major from a plain version ("4.0.0") or a caret/tilde range ("^4.0.0"). */
function majorOf(spec) {
  const match = /^[\^~]?(\d+)\./.exec(String(spec).trim());
  return match ? Number(match[1]) : null;
}

describe('workspace plugin peer dependencies', () => {
  const packages = workspacePackages();
  const coreVersion = readManifest('plugin-core')?.version;

  // A filter bug that matched nothing would make every assertion below pass.
  test('discovers the workspace packages', () => {
    assert.ok(packages.length >= 10, `expected the plugin packages, found ${packages.length}`);
    assert.ok(packages.includes('plugin-core'), 'plugin-core should be a workspace package');
    assert.ok(coreVersion, 'plugin-core must declare a version');
  });

  test('every declared plugin-core peer range matches plugin-core\'s major', () => {
    const coreMajor = majorOf(coreVersion);
    const mismatches = [];

    for (const dir of packages) {
      const range = readManifest(dir).peerDependencies?.[CORE];
      if (!range) continue;

      if (majorOf(range) !== coreMajor) {
        mismatches.push(`${dir}: peers on ${CORE}@"${range}" but workspace plugin-core is ${coreVersion}`);
      }
    }

    assert.strictEqual(mismatches.join('\n'), '', `\n${mismatches.join('\n')}\n`);
  });

  test('every plugin peers on plugin-core', () => {
    const missing = packages.filter(dir =>
      dir !== 'plugin-core' &&
      !readManifest(dir).peerDependencies?.[CORE]
    );

    // Catches a NEW plugin added without a peer range. There are no exemptions:
    // plugin-testing's was removed in #787 when it stopped peering on the root
    // package, and anything that needs one needs a reason in the file header first.
    assert.strictEqual(missing.join(', '), '', `packages missing a ${CORE} peer: ${missing.join(', ')}`);
  });

  // The premise of the next two tests: if the root package were ever added to
  // `workspaces`, a peer on it would resolve locally and these would be wrong.
  test('the root package is not a workspace member', () => {
    const patterns = ROOT_MANIFEST.workspaces || [];
    assert.ok(patterns.length > 0, 'root package must declare workspaces');
    assert.ok(
      !patterns.some(pattern => ['.', './', '*'].includes(String(pattern).trim())),
      `workspaces ${JSON.stringify(patterns)} now matches the root; revisit the root-peer rule`
    );
  });

  test('no plugin peers on the root package — it can never resolve locally', () => {
    const offenders = packages
      .filter(dir => readManifest(dir).peerDependencies?.[ROOT_PKG])
      .map(dir => `${dir}: peers on ${ROOT_PKG}@"${readManifest(dir).peerDependencies[ROOT_PKG]}"`);

    assert.strictEqual(
      offenders.join('\n'), '',
      `\n${offenders.join('\n')}\n` +
      `${ROOT_PKG} is not a workspace member, so npm satisfies such a peer from the ` +
      'registry — installing a published copy of this project inside itself. Peer on ' +
      `${CORE} instead. See #787.`
    );
  });

  test('the lockfile holds no registry copy of the root package', () => {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf-8'));
    const fetched = Object.entries(lock.packages || {})
      .filter(([key, entry]) =>
        key.split('node_modules/').pop() === ROOT_PKG &&
        String(entry.resolved || '').includes('registry.npmjs.org'))
      .map(([key, entry]) => `${key} -> ${entry.version}`);

    assert.deepStrictEqual(
      fetched, [],
      `the lockfile pulls ${ROOT_PKG} from the registry: ${fetched.join(', ')}. ` +
      'Some workspace package peers on the root package; see the test above.'
    );
  });

  test('plugin-core declares no peer on itself', () => {
    assert.ok(!readManifest('plugin-core').peerDependencies?.[CORE]);
  });
});
