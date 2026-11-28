/**
 * Shipped scripts load `yaml`, else `js-yaml`, else the built-in parser in
 * plugin-pm/scripts/pm/lib/yaml-parse.js; none requires `js-yaml` outright
 * (#867, #945). Each case runs in a child node with both modules stubbed to
 * throw MODULE_NOT_FOUND, as in a project that installed neither. The
 * plugin-pm sources are ESM-scoped (package "type": "module"), so the
 * synced CommonJS copies under autopm/.claude/scripts/pm (what ships) run.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const YAML_PARSE = path.join(ROOT, 'autopm/.claude/scripts/pm/lib/yaml-parse.js');
const EPIC_SPLIT = path.join(ROOT, 'autopm/.claude/scripts/pm/epic-split.js');
const STREAMS = path.join(ROOT, 'autopm/.claude/scripts/start-parallel-streams.js');
const DECOMPOSE = path.join(ROOT, 'autopm/.claude/scripts/decompose-issue.js');
const TEMPLATES = path.join(ROOT, 'autopm/.claude/templates/issue-decomposition');

let tmp;
let stub;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'js-yaml-optional-'));
  stub = path.join(tmp, 'no-yaml.js');
  fs.writeFileSync(
    stub,
    [
      "const Module = require('module');",
      'const orig = Module._resolveFilename;',
      'Module._resolveFilename = function (request, ...rest) {',
      "  if (request === 'yaml' || request === 'js-yaml') {",
      "    const e = new Error(`Cannot find module '${request}'`);",
      "    e.code = 'MODULE_NOT_FOUND';",
      '    throw e;',
      '  }',
      '  return orig.call(this, request, ...rest);',
      '};'
    ].join('\n')
  );
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** Run node with yaml/js-yaml unavailable; returns {status, stdout, stderr}. */
function runNoYaml(args, cwd) {
  const r = spawnSync(process.execPath, ['-r', stub, ...args], { cwd, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

function evalNoYaml(code, cwd = tmp) {
  const r = runNoYaml(['-e', code], cwd);
  if (r.status !== 0) throw new Error(r.out);
  return JSON.parse(r.out.trim().split('\n').filter(Boolean).pop());
}

describe('js-yaml optional (#867)', () => {
  test('the stub really hides yaml and js-yaml', () => {
    const r = runNoYaml(['-e', "require('js-yaml')"], tmp);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/Cannot find module 'js-yaml'/);
  });

  test('yaml-parse.js parses nested YAML and round-trips stringify without either module', () => {
    const sample = [
      'name: "Default Template"',
      'patterns: []',
      'streams:',
      '  analysis:',
      '    agent: code-analyzer',
      '    priority: 1',
      '    dependencies: ["setup"]',
      '    tasks:',
      '      - "Analyze requirements"',
      '      - Document approach',
      'epics:',
      '  - key: infra',
      '    weeks: 2',
      '  - key: api',
      '    weeks: 3'
    ].join('\n');
    const value = {
      name: 'x: y',
      n: 3,
      s: '3',
      flag: true,
      empty: [],
      obj: {},
      date: '2026-11-28T00:00:00Z',
      list: ['a', 'b c'],
      nested: { deps: ['one'], meta: { owner: 'me' } },
      items: [{ key: 'k', weeks: 2, tags: ['t'] }],
      multi: 'line1\nline2',
      none: null
    };
    const result = evalNoYaml(
      `const y = require(${JSON.stringify(YAML_PARSE)});` +
        `console.log(JSON.stringify({ parsed: y.parse(${JSON.stringify(sample)}),` +
        ` round: y.parse(y.stringify(${JSON.stringify(value)})) }));`
    );
    expect(result.parsed).toEqual({
      name: 'Default Template',
      patterns: [],
      streams: {
        analysis: {
          agent: 'code-analyzer',
          priority: 1,
          dependencies: ['setup'],
          tasks: ['Analyze requirements', 'Document approach']
        }
      },
      epics: [
        { key: 'infra', weeks: 2 },
        { key: 'api', weeks: 3 }
      ]
    });
    expect(result.round).toEqual(value);
  });

  test('epic-split.js writes epics with parseable frontmatter', () => {
    const cwd = fs.mkdtempSync(path.join(tmp, 'split-'));
    fs.mkdirSync(path.join(cwd, '.claude/prds'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '.claude/prds/feat.md'),
      '# Feat\nDocker and postgres infrastructure.\nJWT auth with login and token.\nREST api endpoint service.\n'
    );
    const r = runNoYaml([EPIC_SPLIT, 'feat'], cwd);
    expect(r.out).not.toMatch(/Cannot find module/);
    expect(r.status).toBe(0);

    const epicDir = path.join(cwd, '.claude/epics/feat');
    const epicFile = fs
      .readdirSync(epicDir)
      .filter((d) => !d.includes('.'))
      .map((d) => path.join(epicDir, d, 'epic.md'))[0];
    const fm = fs.readFileSync(epicFile, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
    const meta = fs.readFileSync(path.join(epicDir, 'meta.yaml'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
    const parsed = evalNoYaml(
      `const y = require(${JSON.stringify(YAML_PARSE)});` +
        `console.log(JSON.stringify([y.parse(${JSON.stringify(fm)}), y.parse(${JSON.stringify(meta)})]));`
    );
    expect(parsed[0]).toMatchObject({ status: 'backlog', epic_number: 1, prd: '.claude/prds/feat.md' });
    expect(Array.isArray(parsed[0].dependencies)).toBe(true);
    expect(parsed[1].feature).toBe('feat');
    expect(parsed[1].epics.length).toBeGreaterThan(1);
  });

  test('start-parallel-streams.js reads stream frontmatter', () => {
    const cwd = fs.mkdtempSync(path.join(tmp, 'streams-'));
    const issue = path.join(cwd, '.claude/epics/current/issue-7');
    fs.mkdirSync(path.join(issue, 'updates'), { recursive: true });
    fs.writeFileSync(path.join(issue, '7-analysis.md'), '# analysis\n');
    fs.writeFileSync(
      path.join(issue, 'updates/stream-a.md'),
      '---\nstream: a\nname: "Backend: core"\nagent: node-backend\nstatus: pending\ndependencies: []\nparameters:\n  framework: express\n---\nbody\n'
    );
    const r = runNoYaml(['-e', `require(${JSON.stringify(STREAMS)})(7)`], cwd);
    expect(r.out).not.toMatch(/Cannot find module/);
    expect(r.status).toBe(0);
    expect(r.out).toContain('Stream A: Backend: core');
    expect(r.out).toContain('{"framework":"express"}');
  });

  test('decompose-issue.js loads the shipped nested decomposition template', () => {
    const cwd = fs.mkdtempSync(path.join(tmp, 'decompose-'));
    const dest = path.join(cwd, '.claude/templates/issue-decomposition');
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(TEMPLATES, 'default.yaml'), path.join(dest, 'default.yaml'));
    const t = evalNoYaml(
      `const D = require(${JSON.stringify(DECOMPOSE)});` +
        `console.log(JSON.stringify(new D(${JSON.stringify(cwd)}).loadTemplate('default.yaml')));`
    );
    expect(t.name).toBe('Default Template');
    expect(t.streams.analysis.agent).toBe('code-analyzer');
    expect(t.streams.backend.dependencies).toEqual(['analysis']);
    expect(t.streams.analysis.tasks.length).toBe(5);
  });
});
