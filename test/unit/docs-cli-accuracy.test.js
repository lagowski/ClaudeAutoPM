/**
 * #847: the docs must only show commands and flags the real CLI has,
 * and must not claim rules are auto-loaded via `@include`.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'autopm.js');
const DOCS = path.join(ROOT, 'docs-site', 'docs');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const help = (...args) =>
  execFileSync('node', [CLI, ...args, '--help'], { encoding: 'utf8', cwd: ROOT });

const listMd = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listMd(path.join(dir, e.name))
      : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);

const COMMAND_DOCS = [
  'docs-site/docs/commands/cli-reference.md',
  'docs-site/docs/getting-started/installation.md',
];

describe('docs match the real CLI (#847)', () => {
  const topHelp = help();
  const commands = new Set(
    [...topHelp.matchAll(/^\s+autopm\.js ([a-z][\w-]*)/gm)].map((m) => m[1]));
  const globalFlags = new Set(['--help', '--version', '--verbose', '--debug', '-h', '-v']);

  test('the CLI lists its commands', () => {
    expect(commands.has('install')).toBe(true);
    expect(commands.size).toBeGreaterThan(10);
  });

  for (const rel of COMMAND_DOCS) {
    test(`every autopm command and flag in ${rel} exists`, () => {
      const bad = [];
      for (const line of read(rel).split('\n')) {
        const code = line.replace(/\s#.*$/, '');
        for (const m of code.matchAll(/\bautopm[ \t]+([a-z][\w-]*)([^`|]*)/g)) {
          const cmd = m[1];
          if (!commands.has(cmd)) { bad.push(`autopm ${cmd}`); continue; }
          const flags = [...m[2].matchAll(/(?:^|\s)(--[a-z][\w-]*)/g)].map((f) => f[1]);
          if (!flags.length) continue;
          const cmdHelp = help(cmd);
          for (const flag of flags) {
            const name = flag.replace(/^--no-/, '--').replace(/=.*$/, '');
            if (globalFlags.has(name)) continue;
            if (!new RegExp(`${name}\\b`).test(cmdHelp)) bad.push(`autopm ${cmd} ${flag}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });
  }

  test('no doc claims rules or agents are auto-loaded via @include', () => {
    const files = [path.join(ROOT, 'README.md'), ...listMd(DOCS)];
    const bad = [];
    for (const file of files) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        const claim = /@include/.test(line) && /auto-?load|includes this file/i.test(line);
        const directive = /@include\s+\.claude\//.test(line);
        if (claim || directive) bad.push(`${path.relative(ROOT, file)}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  test('help banner has no stale "NEW in v2.1.0" heading', () => {
    expect(topHelp).not.toMatch(/NEW in v2\.1\.0/);
  });

  test('architecture page states the real plugin count and version', () => {
    const plugins = fs.readdirSync(path.join(ROOT, 'packages'))
      .filter((d) => d.startsWith('plugin-')).length;
    const { version } = JSON.parse(read('package.json'));
    const arch = read('docs-site/docs/developer-guide/architecture.md');
    const counts = [...arch.matchAll(/(\d+) (?:npm packages|Plugin Packages)/gi)].map((m) => +m[1]);
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every((n) => n === plugins)).toBe(true);
    const conf = read('docs-site/docs/getting-started/configuration.md');
    const versions = [...conf.matchAll(/"version": "(\d+\.\d+\.\d+)"/g)].map((m) => m[1]);
    expect(versions.every((v) => v === version)).toBe(true);
  });
});
