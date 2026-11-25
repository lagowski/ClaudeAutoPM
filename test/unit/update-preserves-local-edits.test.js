/**
 * `autopm update` must never silently replace a framework file the user edited (#790).
 *
 * The update used to `rm -rf .claude/rules` (and every other framework dir) and copy the shipped
 * tree back, so a trimmed or edited rule came back on the next update. It now compares each installed
 * file with the hash recorded at install/update time (`.claude/.autopm-manifest`) and keeps a changed
 * file, writing the shipped version next to it as `<file>.autopm-new`.
 *
 * Each test copies install/update.sh into a throwaway "package root" with its own autopm/.claude
 * source tree, so the real framework is never involved.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const UPDATE_SH = path.resolve(__dirname, '..', '..', 'install', 'update.sh');
const Installer = require('../../install/install.js');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeEnv() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-update-'));
  const root = path.join(base, 'pkg');
  const project = path.join(base, 'project');
  write(path.join(root, 'install', 'update.sh'), fs.readFileSync(UPDATE_SH, 'utf8'));
  write(path.join(project, '.claude', 'config.json'), '{\n  "version": "0.0.0"\n}\n');

  const setRelease = (version, files) => {
    fs.rmSync(path.join(root, 'autopm'), { recursive: true, force: true });
    write(path.join(root, 'package.json'), JSON.stringify({ version }));
    for (const [rel, content] of Object.entries(files)) {
      write(path.join(root, 'autopm', '.claude', rel), content);
    }
  };

  const update = () => {
    const r = spawnSync('bash', [path.join(root, 'install', 'update.sh')], {
      cwd: project,
      env: { ...process.env, AUTOPM_BACKUP: '0', AUTOPM_FORCE: '0', AUTOPM_PRESERVE_CONFIG: '1' },
      encoding: 'utf8'
    });
    if (r.status !== 0) throw new Error(`update.sh failed (${r.status}):\n${r.stdout}\n${r.stderr}`);
    return r.stdout;
  };

  const claude = rel => path.join(project, '.claude', rel);
  const read = rel => fs.readFileSync(claude(rel), 'utf8');
  return { base, root, project, setRelease, update, claude, read };
}

describe('autopm update keeps local edits (#790)', () => {
  let env;
  beforeEach(() => {
    env = makeEnv();
    env.setRelease('1.0.0', {
      'rules/x.md': 'x v1\n',
      'rules/y.md': 'y v1\n',
      'rules/retired.md': 'retired v1\n',
      'agents/a.md': 'a v1\n'
    });
    env.update();
  });
  afterEach(() => fs.rmSync(env.base, { recursive: true, force: true }));

  test('a locally edited rule survives the update; the shipped version lands as .autopm-new', () => {
    write(env.claude('rules/x.md'), 'x edited locally\n');
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n', 'rules/y.md': 'y v2\n', 'agents/a.md': 'a v1\n' });

    const out = env.update();

    expect(env.read('rules/x.md')).toBe('x edited locally\n');
    expect(env.read('rules/x.md.autopm-new')).toBe('x v2\n');
    expect(out).toContain('rules/x.md');
  });

  test('an edit survives a second update too', () => {
    write(env.claude('rules/x.md'), 'x edited locally\n');
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n' });
    env.update();
    env.setRelease('1.0.2', { 'rules/x.md': 'x v3\n' });
    env.update();

    expect(env.read('rules/x.md')).toBe('x edited locally\n');
    expect(env.read('rules/x.md.autopm-new')).toBe('x v3\n');
  });

  test('an unedited rule is updated and a new shipped file is installed', () => {
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n', 'rules/new.md': 'new v1\n' });
    env.update();

    expect(env.read('rules/x.md')).toBe('x v2\n');
    expect(env.read('rules/new.md')).toBe('new v1\n');
    expect(fs.existsSync(env.claude('rules/x.md.autopm-new'))).toBe(false);
  });

  test('a file the user added is kept', () => {
    write(env.claude('rules/team-own.md'), 'ours\n');
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n' });
    env.update();

    expect(env.read('rules/team-own.md')).toBe('ours\n');
  });

  test('a retired framework file is removed unless edited', () => {
    write(env.claude('rules/y.md'), 'y edited\n');
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n' });
    env.update();

    expect(fs.existsSync(env.claude('rules/retired.md'))).toBe(false);
    expect(env.read('rules/y.md')).toBe('y edited\n');
  });

  test('a framework file the user deleted (trimmed) does not come back', () => {
    fs.rmSync(env.claude('rules/y.md'));
    env.setRelease('1.0.1', { 'rules/x.md': 'x v2\n', 'rules/y.md': 'y v2\n' });
    env.update();

    expect(fs.existsSync(env.claude('rules/y.md'))).toBe(false);
  });
});

describe('Installer.writeFrameworkManifest (#790)', () => {
  test('records the sha256 of each installed framework file, in update.sh format', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-manifest-'));
    try {
      const inst = Object.create(Installer.prototype);
      inst.autopmDir = path.join(base, 'autopm');
      inst.targetDir = path.join(base, 'project');
      write(path.join(inst.autopmDir, '.claude', 'rules', 'x.md'), 'x\n');
      write(path.join(inst.autopmDir, '.claude', 'base.md'), 'base\n');
      write(path.join(inst.targetDir, '.claude', 'rules', 'x.md'), 'x as installed\n');
      write(path.join(inst.targetDir, '.claude', 'base.md'), 'base\n');
      write(path.join(inst.targetDir, '.claude', 'rules', 'own.md'), 'not ours\n');

      inst.writeFrameworkManifest();

      const sha = s => crypto.createHash('sha256').update(s).digest('hex');
      const lines = fs.readFileSync(path.join(inst.targetDir, '.claude', '.autopm-manifest'), 'utf8')
        .trim().split('\n').sort();
      expect(lines).toEqual([`${sha('base\n')}  base.md`, `${sha('x as installed\n')}  rules/x.md`].sort());
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});
