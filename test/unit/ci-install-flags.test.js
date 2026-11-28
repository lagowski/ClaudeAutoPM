/**
 * CI dependency-install guard.
 *
 * Workflows must install with a plain `npm ci`. `--legacy-peer-deps` disables
 * peer-dependency resolution outright, so a genuinely broken dependency tree
 * still installs green.
 *
 * That is not theoretical. Every plugin declared `peerDependencies` on
 * @claudeautopm/plugin-core at "^3.0.0" while plugin-core was 4.0.0, which
 * made `npm ci` fail with ERESOLVE for two months (2026-06-22 → 2026-08-30,
 * PR #758). CI never noticed, because every workflow passed the flag.
 *
 * If this test fails, fix the dependency conflict — do not re-add the flag to
 * silence it. The whole point is that the conflict becomes visible.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '..', '.github', 'workflows');

function workflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();
}

/** Lines that are actual run steps, not comments. */
function runLines(source) {
  return source.split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => !/^\s*#/.test(text));
}

describe('CI dependency install', () => {
  const files = workflowFiles();

  // A bad path or filter would make the assertions below vacuous.
  test('discovers the workflow files', () => {
    assert.ok(files.length > 0, `no workflows found in ${WORKFLOWS_DIR}`);
    assert.ok(files.includes('test.yml'), 'test.yml should exist');
  });

  test('no workflow installs with --legacy-peer-deps', () => {
    const offenders = [];

    for (const file of files) {
      const source = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
      for (const { line, text } of runLines(source)) {
        if (text.includes('--legacy-peer-deps')) {
          offenders.push(`${file}:${line}: ${text.trim()}`);
        }
      }
    }

    assert.strictEqual(offenders.join('\n'), '', `\n${offenders.join('\n')}\n`);
  });

  test('no workflow installs with --force', () => {
    const offenders = [];

    for (const file of files) {
      const source = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
      for (const { line, text } of runLines(source)) {
        // --force on an install suppresses the same class of conflict.
        if (/npm\s+(ci|install|i)\b[^\n]*--force/.test(text)) {
          offenders.push(`${file}:${line}: ${text.trim()}`);
        }
      }
    }

    assert.strictEqual(offenders.join('\n'), '', `\n${offenders.join('\n')}\n`);
  });
});
