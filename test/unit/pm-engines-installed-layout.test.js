/**
 * #848: analytics.js and sync-batch.js must load in an installed project,
 * which has `.claude/` only and no repo `lib/`.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const ENGINES = [
  'analytics-engine',
  'burndown-chart',
  'dependency-analyzer',
  'filter-engine',
  'batch-processor',
  'batch-processor-integration'
];
const SCRIPTS = ['analytics.js', 'sync-batch.js'];

function copyDir(src, dst) {
  fs.cpSync(src, dst, { recursive: true });
}

/** Lay out a project the way `autopm install` does: <proj>/.claude/{scripts,lib}. */
function makeInstalledProject(pmScriptsSource) {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-848-'));
  copyDir(path.join(ROOT, 'autopm/.claude/scripts'), path.join(proj, '.claude/scripts'));
  copyDir(path.join(ROOT, 'autopm/.claude/lib'), path.join(proj, '.claude/lib'));
  if (pmScriptsSource) {
    copyDir(pmScriptsSource, path.join(proj, '.claude/scripts/pm'));
  }
  return proj;
}

function loadIn(proj, script) {
  const target = path.join(proj, '.claude/scripts/pm', script);
  return spawnSync(process.execPath, ['-e', `require(${JSON.stringify(target)})`], {
    cwd: proj,
    encoding: 'utf8',
    // npm deps (yaml, @octokit/rest) are the project's to install; lib/ is not.
    env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') }
  });
}

describe('pm engines in an installed project (#848)', () => {
  const projects = [];
  afterAll(() => projects.forEach((p) => fs.rmSync(p, { recursive: true, force: true })));

  describe.each([
    ['autopm payload', null],
    ['plugin-pm source', path.join(ROOT, 'packages/plugin-pm/scripts/pm')]
  ])('%s', (_label, source) => {
    const proj = makeInstalledProject(source);
    projects.push(proj);

    test('has no repo lib/ above the project', () => {
      expect(fs.existsSync(path.join(proj, 'lib/analytics-engine.js'))).toBe(false);
    });

    test.each(SCRIPTS)('%s loads without MODULE_NOT_FOUND', (script) => {
      const res = loadIn(proj, script);
      expect(res.stderr).not.toMatch(/MODULE_NOT_FOUND|Cannot find module/);
      expect(res.status).toBe(0);
    });
  });

  test('engine copies under autopm/.claude/lib/pm-engines match lib/', () => {
    for (const name of ENGINES) {
      const normalise = (s) =>
        s.replace("require('../../scripts/pm-sync-upload-local')", "require('../.claude/scripts/pm-sync-upload-local')");
      const copy = fs.readFileSync(path.join(ROOT, 'autopm/.claude/lib/pm-engines', `${name}.js`), 'utf8');
      const orig = fs.readFileSync(path.join(ROOT, 'lib', `${name}.js`), 'utf8');
      expect({ name, same: normalise(copy) === orig }).toEqual({ name, same: true });
    }
  });

  test('resolver names the missing engine and where it looked', () => {
    const { requireEngine } = require('../../packages/plugin-pm/scripts/pm/lib/require-engine');
    expect(() => requireEngine('no-such-engine')).toThrow(/no-such-engine.*\.claude\/lib\/pm-engines/s);
  });

  test('autopm copies of the pm scripts match packages/plugin-pm', () => {
    for (const rel of [...SCRIPTS, 'lib/require-engine.js']) {
      const a = fs.readFileSync(path.join(ROOT, 'packages/plugin-pm/scripts/pm', rel), 'utf8');
      const b = fs.readFileSync(path.join(ROOT, 'autopm/.claude/scripts/pm', rel), 'utf8');
      expect({ rel, same: a === b }).toEqual({ rel, same: true });
    }
  });
});
