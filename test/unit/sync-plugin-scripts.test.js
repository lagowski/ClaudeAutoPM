/**
 * Tests for scripts/sync-plugin-scripts.js
 *
 * packages/plugin-core/scripts is the single source of truth for shared
 * scripts. The sync tool copies it into the autopm payload and the repo's
 * own .claude installation, preserving file modes. --check reports
 * divergence without writing.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/sync-plugin-scripts.js');

function write(file, content, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mode !== undefined) fs.chmodSync(file, mode);
}

function permBits(file) {
  return fs.statSync(file).mode & 0o777;
}

describe('sync-plugin-scripts', () => {
  let tmp;
  let sourceDir;
  let targetA;
  let targetB;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-scripts-'));
    sourceDir = path.join(tmp, 'plugin-core', 'scripts');
    targetA = path.join(tmp, 'autopm', '.claude', 'scripts');
    targetB = path.join(tmp, '.claude', 'scripts');

    write(path.join(sourceDir, 'root.sh'), '#!/bin/bash\necho root\n', 0o755);
    write(path.join(sourceDir, 'lib', 'utils.sh'), '#!/bin/bash\necho lib\n', 0o755);
    write(path.join(sourceDir, 'config', 'tool.js'), 'console.log("tool");\n', 0o644);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function loadModule() {
    delete require.cache[require.resolve(SCRIPT_PATH)];
    return require(SCRIPT_PATH);
  }

  test('module exists and exports syncScripts and checkSync', () => {
    const mod = loadModule();
    assert.strictEqual(typeof mod.syncScripts, 'function');
    assert.strictEqual(typeof mod.checkSync, 'function');
  });

  test('syncScripts copies all files into targets, creating missing directories', () => {
    const { syncScripts } = loadModule();
    // Neither target directory exists yet.
    assert.strictEqual(fs.existsSync(targetA), false);
    assert.strictEqual(fs.existsSync(targetB), false);

    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });

    for (const target of [targetA, targetB]) {
      for (const rel of ['root.sh', 'lib/utils.sh', 'config/tool.js']) {
        const src = path.join(sourceDir, rel);
        const dst = path.join(target, rel);
        assert.strictEqual(fs.existsSync(dst), true, `${dst} should exist`);
        assert.deepStrictEqual(fs.readFileSync(dst), fs.readFileSync(src));
      }
    }
  });

  test('syncScripts preserves file modes', () => {
    const { syncScripts } = loadModule();
    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });

    for (const target of [targetA, targetB]) {
      assert.strictEqual(permBits(path.join(target, 'root.sh')), 0o755);
      assert.strictEqual(permBits(path.join(target, 'lib', 'utils.sh')), 0o755);
      assert.strictEqual(permBits(path.join(target, 'config', 'tool.js')), 0o644);
    }
  });

  test('syncScripts overwrites stale target content and modes', () => {
    const { syncScripts } = loadModule();
    write(path.join(targetA, 'root.sh'), 'stale content\n', 0o644);

    syncScripts({ sourceDir, targetDirs: [targetA] });

    assert.strictEqual(
      fs.readFileSync(path.join(targetA, 'root.sh'), 'utf8'),
      '#!/bin/bash\necho root\n'
    );
    assert.strictEqual(permBits(path.join(targetA, 'root.sh')), 0o755);
  });

  test('checkSync reports no divergence when targets are in sync', () => {
    const { syncScripts, checkSync } = loadModule();
    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });

    const result = checkSync({ sourceDir, targetDirs: [targetA, targetB] });
    assert.deepStrictEqual(result.diverged, []);
  });

  test('checkSync detects modified, missing, and mode-diverged files without writing', () => {
    const { syncScripts, checkSync } = loadModule();
    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });

    // Diverge: content change in A, deletion in B, mode change in B.
    fs.writeFileSync(path.join(targetA, 'root.sh'), 'tampered\n');
    fs.rmSync(path.join(targetB, 'lib', 'utils.sh'));
    fs.chmodSync(path.join(targetB, 'config', 'tool.js'), 0o755);

    const result = checkSync({ sourceDir, targetDirs: [targetA, targetB] });
    const keys = result.diverged.map((d) => `${d.target}:${d.file}:${d.reason}`).sort();
    assert.deepStrictEqual(keys, [
      `${targetA}:root.sh:content`,
      `${targetB}:config/tool.js:mode`,
      `${targetB}:lib/utils.sh:missing`
    ].sort());

    // --check must not repair anything.
    assert.strictEqual(fs.readFileSync(path.join(targetA, 'root.sh'), 'utf8'), 'tampered\n');
    assert.strictEqual(fs.existsSync(path.join(targetB, 'lib', 'utils.sh')), false);
  });

  test('syncScripts repairs divergence so a subsequent checkSync passes', () => {
    const { syncScripts, checkSync } = loadModule();
    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });
    fs.writeFileSync(path.join(targetA, 'root.sh'), 'tampered\n');
    fs.rmSync(path.join(targetB, 'config', 'tool.js'));

    syncScripts({ sourceDir, targetDirs: [targetA, targetB] });
    const result = checkSync({ sourceDir, targetDirs: [targetA, targetB] });
    assert.deepStrictEqual(result.diverged, []);
  });

  describe('CLI', () => {
    function runCli(args) {
      try {
        const stdout = execFileSync(process.execPath, [SCRIPT_PATH, ...args], {
          encoding: 'utf8'
        });
        return { status: 0, output: stdout };
      } catch (err) {
        return { status: err.status, output: `${err.stdout || ''}${err.stderr || ''}` };
      }
    }

    function cliArgs(extra = []) {
      return [
        '--source', sourceDir,
        '--target', targetA,
        '--target', targetB,
        ...extra
      ];
    }

    test('CLI sync copies files and exits 0', () => {
      const result = runCli(cliArgs());
      assert.strictEqual(result.status, 0);
      assert.strictEqual(fs.existsSync(path.join(targetB, 'lib', 'utils.sh')), true);
    });

    test('CLI --check exits non-zero and lists diverged files without writing', () => {
      runCli(cliArgs());
      fs.writeFileSync(path.join(targetA, 'root.sh'), 'tampered\n');

      const result = runCli(cliArgs(['--check']));
      assert.notStrictEqual(result.status, 0);
      assert.match(result.output, /root\.sh/);
      // Unchanged: --check must not write.
      assert.strictEqual(fs.readFileSync(path.join(targetA, 'root.sh'), 'utf8'), 'tampered\n');
    });

    test('CLI --check exits 0 when everything is in sync', () => {
      runCli(cliArgs());
      const result = runCli(cliArgs(['--check']));
      assert.strictEqual(result.status, 0);
    });
  });
});
