/**
 * #848 / #899: analytics.js and sync-batch.js must work in a project made by a real
 * `autopm install`, which has `.claude/` only: no repo `lib/` and no repo node_modules.
 * NODE_PATH is deliberately emptied so nothing from this repo leaks in (#899).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

/** Environment with no route back to this repo's node_modules. */
function isolatedEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.NODE_PATH;
  return env;
}

function run(proj, args, extra = {}) {
  return spawnSync(process.execPath, args, {
    cwd: proj,
    encoding: 'utf8',
    timeout: 60000,
    env: isolatedEnv(extra)
  });
}

describe('pm engines in a real `autopm install --scenario=minimal` (#899)', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-899-install-'));
  afterAll(() => fs.rmSync(proj, { recursive: true, force: true }));

  spawnSync('git', ['init', '-q'], { cwd: proj });
  const install = spawnSync(
    process.execPath,
    [path.join(ROOT, 'install/install.js'), proj, '--scenario=minimal'],
    { encoding: 'utf8', input: '', timeout: 120000, env: isolatedEnv({ AUTOPM_TEST_MODE: '1' }) }
  );

  test('installer succeeds, ships pm-engines, and the project has no yaml/@octokit/rest', () => {
    expect(install.status).toBe(0);
    expect(fs.existsSync(path.join(proj, '.claude/lib/pm-engines/analytics-engine.js'))).toBe(true);
    expect(fs.existsSync(path.join(proj, 'lib/analytics-engine.js'))).toBe(false);
    expect(fs.existsSync(path.join(proj, 'node_modules/yaml'))).toBe(false);
    expect(fs.existsSync(path.join(proj, 'node_modules/@octokit/rest'))).toBe(false);
  });

  test('analytics.js exports real epic analytics (parses frontmatter without npm deps)', () => {
    const epicDir = path.join(proj, '.claude/epics/epic-899');
    fs.mkdirSync(epicDir, { recursive: true });
    fs.writeFileSync(
      path.join(epicDir, 'epic.md'),
      '---\nid: epic-899\ntitle: "Real install"\nstatus: in-progress\ncreated: 2026-11-20T10:00:00Z\n---\n# Epic\n'
    );
    fs.writeFileSync(
      path.join(epicDir, 'task-001.md'),
      '---\nid: task-001\ntitle: Done task\nstatus: completed\ncreated: 2026-11-21T10:00:00Z\ncompleted: 2026-11-22T10:00:00Z\n---\n# T1\n'
    );
    fs.writeFileSync(
      path.join(epicDir, 'task-002.md'),
      '---\nid: task-002\ntitle: Open task\nstatus: open\ndependencies: [task-001]\n---\n# T2\n'
    );
    const out = path.join(proj, 'analytics.json');
    const res = run(proj, ['.claude/scripts/pm/analytics.js', 'export', 'epic-899', '--format', 'json', '--output', out]);
    expect(res.stderr).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/);
    expect(res.status).toBe(0);
    const data = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(data.title).toBe('Real install');
    expect(data.status.total).toBe(2);
    expect(data.status.completed).toBe(1);
  });

  test('sync-batch.js exits naming the npm packages to install, not MODULE_NOT_FOUND', () => {
    const res = run(proj, ['.claude/scripts/pm/sync-batch.js', '--dry-run'], { GITHUB_TOKEN: 'dummy' });
    expect(res.stderr).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/);
    expect(res.stderr).toMatch(/@octokit\/rest/);
    expect(res.stderr).toMatch(/npm install @octokit\/rest yaml/);
    expect(res.status).toBe(1);
  });
});

describe('pm-engines yaml fallback (#899)', () => {
  const parseBuiltin = (text) => require('../../packages/plugin-pm/scripts/pm/lib/yaml-parse').parseBuiltin(text);

  test('parses the frontmatter shapes PM files use', () => {
    expect(
      parseBuiltin(
        [
          'id: task-001',
          'title: "Quoted: with colon"',
          "owner: 'single'",
          'estimate: 3',
          'ratio: 0.5',
          'done: true',
          'blocked: false',
          'parent: null',
          'empty:',
          'created: 2026-11-20T10:00:00Z',
          'tags: [a, "b c", 3]',
          'dependencies:',
          '  - task-002',
          '  - "task-003"',
          '# a comment',
          'note: value # trailing comment'
        ].join('\n')
      )
    ).toEqual({
      id: 'task-001',
      title: 'Quoted: with colon',
      owner: 'single',
      estimate: 3,
      ratio: 0.5,
      done: true,
      blocked: false,
      parent: null,
      empty: null,
      created: '2026-11-20T10:00:00Z',
      tags: ['a', 'b c', 3],
      dependencies: ['task-002', 'task-003'],
      note: 'value'
    });
  });

  test('parses a one-level nested map', () => {
    expect(parseBuiltin('meta:\n  owner: me\n  points: 5')).toEqual({ meta: { owner: 'me', points: 5 } });
  });
});

describe('sync coverage of the vendored copies (#899)', () => {
  test('npm run sync:scripts:check covers pm-engines and plugin-pm/scripts/pm', () => {
    const { parseArgs } = require('../../scripts/sync-plugin-scripts');
    const jobs = parseArgs([]).jobs;
    const sources = jobs.map((j) => path.relative(ROOT, j.sourceDir));
    const targets = jobs.flatMap((j) => j.targetDirs.map((t) => path.relative(ROOT, t)));
    expect(sources).toEqual(expect.arrayContaining(['packages/plugin-core/scripts', 'packages/plugin-pm/scripts/pm', 'lib']));
    expect(targets).toEqual(
      expect.arrayContaining(['autopm/.claude/scripts/pm', 'autopm/.claude/lib/pm-engines'])
    );
    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts/sync-plugin-scripts.js'), '--check'], {
      encoding: 'utf8'
    });
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  test('--check flags a hand-edited engine copy', () => {
    const { parseArgs, checkSync } = require('../../scripts/sync-plugin-scripts');
    const job = parseArgs([]).jobs.find((j) => path.relative(ROOT, j.sourceDir) === 'lib');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-899-engines-'));
    try {
      fs.cpSync(job.targetDirs[0], tmp, { recursive: true });
      fs.appendFileSync(path.join(tmp, 'filter-engine.js'), '\n// drift\n');
      const { diverged } = checkSync({ ...job, targetDirs: [tmp] });
      expect(diverged).toEqual([{ target: tmp, file: 'filter-engine.js', reason: 'content' }]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('resolver names the missing engine and where it looked', () => {
    const { requireEngine } = require('../../packages/plugin-pm/scripts/pm/lib/require-engine');
    expect(() => requireEngine('no-such-engine')).toThrow(/no-such-engine.*\.claude\/lib\/pm-engines/s);
  });
});
