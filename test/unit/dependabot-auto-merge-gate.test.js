/**
 * Dependabot auto-merge gate guard.
 *
 * `.github/workflows/dependabot-auto-merge.yml` decides whether a Dependabot PR
 * gets an approving review (develop requires exactly one, and that approval is
 * the ONLY thing holding routine dependency bumps — `copilot-review` is not a
 * required status check). The decision runs as an inline github-script body, so
 * nothing type-checks the one string it hinges on: the ecosystem name.
 *
 * dependabot/fetch-metadata reports the ecosystem verbatim from the PR's
 * `@dependabot` metadata block — `npm_and_yarn`, never `npm`, and
 * `github_actions`, never `github-actions`. The gate originally compared
 * against `'npm'`, so `allNpm` was false for every npm PR and NOTHING was ever
 * auto-approved. It looked like the #689/#690 grouped-PR fix had landed (the
 * job is green either way — a false gate just skips the approve step), while
 * PRs #773 and #774 sat blocked on a review that was never coming.
 *
 * The rule this locks in: approve iff EVERY updated dependency is npm AND NONE
 * is a semver-major. `github_actions` bumps edit CODEOWNERS-locked workflow
 * files and majors carry breaking-change risk, so both stay with a human.
 *
 * To fix a failure: correct the ecosystem/update-type comparisons in the
 * workflow's `Decide auto-merge (grouped-aware)` step. Do NOT relax this test —
 * the strings come from fetch-metadata and are not ours to choose.
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
const vm = require('node:vm');
const yaml = require('js-yaml');

const WORKFLOW = path.resolve(
  __dirname, '..', '..', '.github', 'workflows', 'dependabot-auto-merge.yml'
);

/** The inline github-script body of the `gate` step, as deployed. */
function gateScript() {
  const doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
  const step = doc.jobs['auto-merge'].steps.find(s => s.id === 'gate');
  assert.ok(step, 'no step with `id: gate` in dependabot-auto-merge.yml');
  return step.with.script;
}

/**
 * Run the gate body against a fixture metadata payload; return the `approve` output.
 *
 * The body executes in a fresh vm context whose ONLY reachable outer values are the
 * two frozen stubs below — no `require`, no real `process`, no module scope. The
 * realm supplies its own `JSON` et al; injecting ours would hand the body cross-realm
 * references and defeat the point. Wrapped in a function expression because the step
 * uses a top-level `return`, which is legal in a function body but not in a vm.Script.
 */
function runGate(updates) {
  const outputs = {};
  const sandbox = {
    core: Object.freeze({
      setOutput: (k, v) => { outputs[k] = v; },
      info: () => {}
    }),
    process: Object.freeze({ env: Object.freeze({ UPDATES: JSON.stringify(updates) }) })
  };
  vm.runInNewContext(`(function () {\n${gateScript()}\n})()`, sandbox, {
    filename: 'dependabot-auto-merge.yml#gate',
    timeout: 5000
  });
  return outputs.approve;
}

const npmMinor = {
  dependencyName: '@anthropic-ai/sdk',
  packageEcosystem: 'npm_and_yarn',
  updateType: 'version-update:semver-minor'
};
const npmPatch = {
  dependencyName: 'marked',
  packageEcosystem: 'npm_and_yarn',
  updateType: 'version-update:semver-patch'
};
const npmMajor = {
  dependencyName: 'chalk',
  packageEcosystem: 'npm_and_yarn',
  updateType: 'version-update:semver-major'
};
const actionMajor = {
  dependencyName: 'actions/github-script',
  packageEcosystem: 'github_actions',
  updateType: 'version-update:semver-major'
};
const actionPatch = {
  dependencyName: 'actions/checkout',
  packageEcosystem: 'github_actions',
  updateType: 'version-update:semver-patch'
};

describe('dependabot auto-merge gate', () => {
  test('approves a grouped npm minor/patch PR (the #774 payload)', () => {
    assert.strictEqual(runGate([npmMinor, npmPatch, npmPatch, npmPatch]), 'true');
  });

  test('approves a single npm patch PR', () => {
    assert.strictEqual(runGate([npmPatch]), 'true');
  });

  test('holds a github_actions major PR (the #772 payload)', () => {
    assert.strictEqual(runGate([actionMajor]), 'false');
  });

  test('holds a github_actions patch PR — workflow files stay with a human', () => {
    assert.strictEqual(runGate([actionPatch]), 'false');
  });

  test('holds any npm semver-major', () => {
    assert.strictEqual(runGate([npmMajor]), 'false');
  });

  test('holds a group that mixes npm with another ecosystem', () => {
    assert.strictEqual(runGate([npmPatch, actionPatch]), 'false');
  });

  test('holds when fetch-metadata reported no dependencies', () => {
    assert.strictEqual(runGate([]), 'false');
  });
});
