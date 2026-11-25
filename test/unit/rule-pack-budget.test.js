// Always-loaded context budget for installed scenarios (#791, child 1).
//
// Claude Code loads CLAUDE.md and every `.claude/rules/**/*.md` without a
// `paths:` frontmatter key into every session. The issue proposes a budget of
// <= 3k tokens for that set. This suite installs each scenario into a temp
// dir and measures it. The real scenarios are REPORT-ONLY for now (they are
// far over budget); children 2-4 of #791 turn them green one by one, after
// which the report-only test becomes an assertion.

const fs = require('fs');
const os = require('os');
const path = require('path');

const ALWAYS_LOADED_BUDGET = 3000; // tokens, proposed in #791

const SCENARIOS = ['lite', 'github', 'azure', 'docker', 'full', 'performance', 'obsidian'];

const originalArgv = process.argv;
let Installer;

beforeAll(() => {
  process.argv = ['node', 'install.js', '--force'];
  Installer = require('../../install/install');
});

afterAll(() => {
  process.argv = originalArgv;
});

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `autopm-budget-${prefix}-`));
}

async function installScenario(scenario) {
  const dir = tmpDir(scenario);
  const installer = new Installer();
  installer.targetDir = dir;
  installer.options.force = true;
  // The installer narrates every step; keep the report readable.
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    installer.installFramework();
    installer.installConfig(scenario);
    installer.currentConfig = installer.generateConfig(scenario);
    await installer.installPlugins();
    installer.installClaudeMd();
  } finally {
    log.mockRestore();
  }
  return dir;
}

describe('Installer.measureAlwaysLoaded - control fixture (mutation proof)', () => {
  let dir;

  beforeEach(() => {
    dir = tmpDir('fixture');
    fs.mkdirSync(path.join(dir, '.claude', 'rules', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Project\n\nSmall instructions.\n');
    fs.writeFileSync(path.join(dir, '.claude', 'rules', 'small.md'), '# Small rule\n');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('counts CLAUDE.md and unscoped rules, within budget', () => {
    const m = Installer.measureAlwaysLoaded(dir);
    expect(m.files.map(f => f.file).sort()).toEqual(['.claude/rules/small.md', 'CLAUDE.md']);
    expect(m.tokens).toBeGreaterThan(0);
    expect(m.tokens).toBeLessThanOrEqual(ALWAYS_LOADED_BUDGET);
  });

  it('goes over budget when an unscoped over-budget rule file is added', () => {
    const big = 'x'.repeat(ALWAYS_LOADED_BUDGET * 4 + 400);
    fs.writeFileSync(path.join(dir, '.claude', 'rules', 'nested', 'big.md'), `# Big\n${big}\n`);
    const m = Installer.measureAlwaysLoaded(dir);
    expect(m.files.map(f => f.file)).toContain('.claude/rules/nested/big.md');
    expect(m.tokens).toBeGreaterThan(ALWAYS_LOADED_BUDGET);
  });

  it('excludes rules scoped with paths: frontmatter and non-markdown files', () => {
    const big = 'x'.repeat(ALWAYS_LOADED_BUDGET * 8);
    fs.writeFileSync(
      path.join(dir, '.claude', 'rules', 'scoped.md'),
      `---\npaths:\n  - "src/**/*.py"\n---\n# Scoped\n${big}\n`
    );
    fs.writeFileSync(path.join(dir, '.claude', 'rules', 'legacy.xml'), `<rule>${big}</rule>`);
    const m = Installer.measureAlwaysLoaded(dir);
    expect(m.files.map(f => f.file).sort()).toEqual(['.claude/rules/small.md', 'CLAUDE.md']);
    expect(m.tokens).toBeLessThanOrEqual(ALWAYS_LOADED_BUDGET);
  });

  it('still counts a rule whose frontmatter has no paths: key', () => {
    fs.writeFileSync(
      path.join(dir, '.claude', 'rules', 'unscoped-fm.md'),
      '---\nname: x\ndescription: "mentions paths: in a value"\n---\n# Rule\n'
    );
    const m = Installer.measureAlwaysLoaded(dir);
    expect(m.files.map(f => f.file)).toContain('.claude/rules/unscoped-fm.md');
  });
});

describe('Always-loaded budget per installed scenario (report-only baseline)', () => {
  const report = [];
  const dirs = [];

  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    const lines = report.map(r =>
      `  ${r.scenario.padEnd(12)} ${String(r.tokens).padStart(7)} tokens  ` +
      `${String(r.files).padStart(3)} files  ${r.tokens > ALWAYS_LOADED_BUDGET ? 'OVER' : 'ok'}`
    );
    // test/setup.js mutes console; the baseline must show up in CI logs.
    process.stderr.write(
      `Always-loaded context (budget ${ALWAYS_LOADED_BUDGET} tokens, report-only, #791):\n${lines.join('\n')}\n`
    );
  });

  it.each(SCENARIOS)('%s: measures CLAUDE.md + unscoped rules', async scenario => {
    const dir = await installScenario(scenario);
    dirs.push(dir);
    const m = Installer.measureAlwaysLoaded(dir);
    expect(m.files.map(f => f.file)).toContain('CLAUDE.md');
    report.push({ scenario, tokens: m.tokens, files: m.files.length });
    // Report-only until #791 children 2-4 land; then assert:
    // expect(m.tokens).toBeLessThanOrEqual(ALWAYS_LOADED_BUDGET);
  });
});
