/**
 * Agent-instruction guard: never tell an agent to kill processes by pattern.
 *
 * A rule like `pkill -f "jest|mocha|pytest"` matches every process of the
 * user on the host, so on a shared machine it also SIGTERMs other agents'
 * tests and CI jobs (exit code 143, veracrew#2296). ClaudeAutoPM is the
 * source that installs these files into other repos, so the guard lives here.
 *
 * Scanned: .md/.xml under .claude/{rules,quick-ref,agents,commands},
 * autopm/.claude/{same}, packages/<pkg>/{rules,agents,commands}.
 * Not scanned: .claude/hooks (guard-shared-refs.py BLOCKS pkill and names it).
 * Lines quoted with `>` are allowed (they can cite the old rule as a warning).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SUBDIRS = ['rules', 'quick-ref', 'agents', 'commands'];
const PATTERN = /\b(pkill|killall)\b/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'hooks') continue;
      walk(full, out);
    } else if (/\.(md|xml)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function instructionFiles() {
  const roots = [];
  for (const base of ['.claude', path.join('autopm', '.claude')]) {
    for (const sub of SUBDIRS) roots.push(path.join(ROOT, base, sub));
  }
  const pkgDir = path.join(ROOT, 'packages');
  if (fs.existsSync(pkgDir)) {
    for (const pkg of fs.readdirSync(pkgDir)) {
      for (const sub of ['rules', 'agents', 'commands']) {
        roots.push(path.join(pkgDir, pkg, sub));
      }
    }
  }
  return roots.flatMap((r) => walk(r, []));
}

describe('agent instructions never kill processes by pattern (veracrew#2296)', () => {
  const files = instructionFiles();

  test('control: the scan finds the instruction files', () => {
    const rel = files.map((f) => path.relative(ROOT, f));
    expect(rel.length).toBeGreaterThan(50);
    expect(rel).toContain(path.join('.claude', 'rules', 'tdd.enforcement.xml'));
    expect(rel).toContain(path.join('autopm', '.claude', 'agents', 'core', 'test-runner.md'));
    expect(rel).toContain(path.join('packages', 'plugin-core', 'rules', 'test-execution.md'));
  });

  test('no pkill/killall line in any agent rule, quick-ref, agent or command', () => {
    const hits = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (PATTERN.test(line) && !line.trimStart().startsWith('>')) {
          hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
