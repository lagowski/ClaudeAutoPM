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
const helpCache = new Map();
const help = (...args) => {
  const key = args.join(' ');
  if (!helpCache.has(key)) {
    helpCache.set(key, execFileSync('node', [CLI, ...args, '--help'], { encoding: 'utf8', cwd: ROOT }));
  }
  return helpCache.get(key);
};

// Sub-commands a command accepts: its "Commands:" section plus the choices of
// its first positional (e.g. `config <action>`).
const actions = (...words) => {
  const text = help(...words);
  const prefix = ['autopm\\.js', ...words].join(' ');
  const listed = (text.split(/^Commands:$/m)[1] || '').split(/^\S/m)[0];
  const names = [...listed.matchAll(new RegExp(`^\\s+${prefix} ([a-z][\\w-]*)`, 'gm'))].map((m) => m[1]);
  const choices = (text.match(/\[choices: ([^\]]+)\]/) || [])[1];
  if (choices) names.push(...[...choices.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  return new Set(names);
};

const listMd = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listMd(path.join(dir, e.name))
      : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);

const GLOBAL_FLAGS = new Set(['--help', '--version', '--verbose', '--debug']);

// Every `autopm <command> [<sub-command>] [--flags]` in `text` must exist.
const cliErrors = (text, label) => {
  const commands = actions();
  const bad = [];
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\s#.*$/, '');
    for (const m of code.matchAll(/\bautopm[ \t]+([a-z][\w:-]*)([^`|]*)/g)) {
      const where = `${label}:${i + 1}`;
      const words = [m[1]];
      if (!commands.has(m[1])) { bad.push(`${where} autopm ${m[1]}`); continue; }
      const subs = actions(m[1]);
      const sub = m[2].match(/^[ \t]+([a-z][\w-]*)/);
      if (subs.size && sub) {
        if (!subs.has(sub[1])) { bad.push(`${where} autopm ${m[1]} ${sub[1]}`); continue; }
        if (help(m[1]).includes(`autopm.js ${m[1]} ${sub[1]}`)) words.push(sub[1]);
      }
      for (const [, flag] of m[2].matchAll(/(?:^|\s)(--[a-z][\w-]*)/g)) {
        const name = flag.replace(/^--no-/, '--');
        if (GLOBAL_FLAGS.has(name)) continue;
        if (!new RegExp(`${name}\\b`).test(help(...words))) bad.push(`${where} autopm ${words.join(' ')} ${flag}`);
      }
    }
  });
  return bad;
};

describe('docs match the real CLI (#847, #900)', () => {
  jest.setTimeout(120000);
  const topHelp = help();
  const commands = actions();

  test('the CLI lists its commands', () => {
    expect(commands.has('install')).toBe(true);
    expect(commands.size).toBeGreaterThan(10);
  });

  test('every autopm command, sub-command and flag in docs-site/docs exists', () => {
    const bad = listMd(DOCS).flatMap((f) => cliErrors(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f)));
    expect(bad).toEqual([]);
  });

  test('every autopm command, sub-command and flag in the help banner exists', () => {
    expect(cliErrors(topHelp, 'autopm --help')).toEqual([]);
  });

  test('the banner does not say prd parse runs without AI (it uses the configured provider)', () => {
    expect(topHelp).not.toMatch(/without AI/i);
  });

  test('cli-reference lists -h as a global option only if every command accepts it', () => {
    const noShortHelp = [...commands].filter((cmd) => {
      try {
        return !execFileSync('node', [CLI, cmd, '-h'], { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' })
          .startsWith(`autopm.js ${cmd}`);
      } catch { return true; }
    });
    const row = read('docs-site/docs/commands/cli-reference.md').split('\n').find((l) => l.startsWith('| `--help`'));
    expect(row).toBeDefined();
    if (noShortHelp.length) expect(row).not.toMatch(/`-h`/);
  });

  test('./scripts/ paths in docs-site/docs exist', () => {
    const bad = [];
    for (const f of listMd(DOCS)) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        for (const [, rel] of line.matchAll(/\.\/(scripts\/[\w./-]*\w)/g)) {
          if (!fs.existsSync(path.join(ROOT, rel))) bad.push(`${path.relative(ROOT, f)}:${i + 1} ${rel}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  test('testing guide only names npm scripts and jest options this repo has', () => {
    const page = read('docs-site/docs/developer-guide/testing.md');
    const scripts = JSON.parse(read('package.json')).scripts;
    const missing = [...page.matchAll(/npm run ([\w:.-]+)/g)].map((m) => m[1]).filter((s) => !scripts[s]);
    expect(missing).toEqual([]);
    const badKeys = [];
    for (const [, cfg, body] of page.matchAll(/\*\*(jest\.config[\w.]*\.js)\*\*[^`]*```javascript\n([\s\S]*?)```/g)) {
      const real = require(path.join(ROOT, cfg));
      for (const [, key] of body.matchAll(/^ {2}(\w+):/gm)) if (!(key in real)) badKeys.push(`${cfg}: ${key}`);
    }
    expect(badKeys).toEqual([]);
  });

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

  test('CLI output never tells users to add @include (not Claude Code syntax)', () => {
    const bad = ['bin/autopm.js', 'bin/commands/plugin.js'].flatMap((rel) =>
      read(rel).split('\n').flatMap((line, i) => (/@include/.test(line) ? [`${rel}:${i + 1}`] : [])));
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
