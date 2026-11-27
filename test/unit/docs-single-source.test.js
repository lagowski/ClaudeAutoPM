/**
 * #865: docs single source — no stale rafeekpro repo URLs in the published
 * package metadata/docs, FRAMEWORK-GUIDE.md removed, one-command install documented.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SCOPE = [
  'package.json',
  'packages',
  'docs-site/docs',
  'install/install.js',
  'install/README.md',
  'README.md',
  'CONTRIBUTING.md'
];

describe('docs single source (#865)', () => {
  test('no github.com/rafeekpro URLs in tracked files in scope', () => {
    let out = '';
    try {
      out = execFileSync('git', ['grep', '-n', 'github.com/rafeekpro', '--', ...SCOPE], {
        cwd: root,
        encoding: 'utf8'
      });
    } catch (e) {
      if (e.status !== 1) throw e; // 1 = no match
    }
    expect(out).toBe('');
  });

  test('FRAMEWORK-GUIDE.md is gone', () => {
    expect(fs.existsSync(path.join(root, 'FRAMEWORK-GUIDE.md'))).toBe(false);
  });

  test('install/README.md Quick Start uses the npm package', () => {
    expect(read('install/README.md')).toMatch(/npm i -g claude-autopm && autopm install/);
  });

  test('docs-site installation documents AUTOPM_TEST_MODE', () => {
    expect(read('docs-site/docs/getting-started/installation.md')).toContain('AUTOPM_TEST_MODE');
  });
});

/**
 * The documented one-command install must actually run: pack this package,
 * then execute every documented `npx ... --scenario=lite` line against the
 * tarball, resolving the bin the way npx does.
 */
const DOCS_WITH_NPX = ['docs-site/docs/getting-started/installation.md', 'install/README.md'];

// Returns { env, bin, args } for a documented npx command line.
function parseNpx(line) {
  const words = line.trim().split(/\s+/);
  const env = {};
  while (/^[A-Z_]+=/.test(words[0])) {
    const [k, v] = words.shift().split('=');
    env[k] = v;
  }
  if (words.shift() !== 'npx') throw new Error(`not an npx line: ${line}`);
  let pkg;
  let bin;
  if (words[0] === '-p' || words[0] === '--package') {
    words.shift();
    pkg = words.shift();
    bin = words.shift();
  } else {
    // `npx <pkg> ...`: npx runs the bin named like the package (or its only bin).
    pkg = words.shift();
    bin = pkg;
  }
  if (pkg !== 'claude-autopm') throw new Error(`unexpected package ${pkg} in: ${line}`);
  return { env, bin, args: words };
}

function documentedNpxLines() {
  const lines = new Set();
  for (const file of DOCS_WITH_NPX) {
    for (const l of read(file).split('\n')) {
      if (/(^|\s)npx\s.*claude-autopm/.test(l)) lines.add(l.trim());
    }
  }
  return [...lines];
}

describe('documented npx commands (#865)', () => {
  test('every documented npx line names a bin the package ships and a real subcommand', () => {
    const bins = Object.keys(JSON.parse(read('package.json')).bin);
    const help = execFileSync('node', [path.join(root, 'bin/autopm.js'), '--help'], { encoding: 'utf8' });
    const commands = [...help.matchAll(/^\s+autopm\.js (\S+)/gm)].map((m) => m[1]);
    expect(commands).toContain('install');
    const lines = documentedNpxLines();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const { bin, args } = parseNpx(line);
      expect({ line, bin, shipped: bins.includes(bin) }).toEqual({ line, bin, shipped: true });
      if (bin === 'autopm') {
        expect({ line, cmd: args[0], known: commands.includes(args[0]) }).toEqual({ line, cmd: args[0], known: true });
      }
    }
  });

  test('the documented one-command install runs against the packed package', () => {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-865-'));
    try {
      execFileSync('npm', ['pack', '--silent', '--pack-destination', tmp], { cwd: root, stdio: 'pipe' });
      const tarball = path.join(tmp, fs.readdirSync(tmp).find((f) => f.endsWith('.tgz')));

      const installs = new Map();
      for (const line of documentedNpxLines().filter((l) => l.includes('install --scenario=lite'))) {
        const { bin, args } = parseNpx(line);
        installs.set([bin, ...args].join(' '), { line, bin, args });
      }
      expect(installs.size).toBeGreaterThan(0);

      for (const { line, bin, args } of installs.values()) {
        const project = fs.mkdtempSync(path.join(tmp, 'project-'));
        execFileSync('git', ['init', '-q', '.'], { cwd: project });
        let status = 0;
        let output = '';
        try {
          output = execFileSync(
            'npm',
            ['exec', '--yes', '--prefer-offline', '--package', tarball, '--', bin, ...args],
            {
              cwd: project,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
              env: { ...process.env, AUTOPM_TEST_MODE: '1' }
            }
          );
        } catch (e) {
          status = e.status;
          output = `${e.stdout}\n${e.stderr}`;
        }
        expect({ line, status, tail: status ? output.slice(-800) : '' }).toEqual({ line, status: 0, tail: '' });
        for (const f of ['.claude/agents', '.claude/rules', '.claude/commands', 'CLAUDE.md']) {
          expect({ line, f, exists: fs.existsSync(path.join(project, f)) }).toEqual({ line, f, exists: true });
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 600000);
});
