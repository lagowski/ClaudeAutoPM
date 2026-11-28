/**
 * Real-install gate (#954).
 *
 * #890, #873 and #886 reached develop green because CI never ran the shipped
 * package the way a user gets it. This suite does:
 *
 *   1. `npm pack` the repo once (the tarball is what `npm i -g claude-autopm` ships);
 *   2. extracts the TARBALL and, for every scenario of install/install.js, runs its
 *      installer into an empty temp dir (AUTOPM_TEST_MODE=1, no NODE_PATH, no repo paths);
 *   3. checks each install:
 *      (a) every .claude/scripts/**\/*.js starts with `--help`: exit 0/1 (or still running at
 *          the timeout), never MODULE_NOT_FOUND / SyntaxError;
 *      (b) every agent .md and skills/**\/SKILL.md has YAML frontmatter that the `yaml`
 *          package parses, with `name` and `description`;
 *      (c) every .claude/**\/*.json is valid JSON and every `.claude/...` path a hook command
 *          in settings.json runs exists in the install;
 *   4. (d) the packed file list holds nothing outside package.json `files`.
 *
 * The mutation fixtures in test/fixtures/real-install-gate/ prove the checks bite.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(ROOT, 'test', 'fixtures', 'real-install-gate');
const SCRIPT_TIMEOUT_MS = 4000;
const CONCURRENCY = Math.max(2, os.cpus().length);

// Output that means the script never got going: a missing module or a parse error.
const CRASH = /Cannot find (module|package)|MODULE_NOT_FOUND|SyntaxError|Cannot find [\w-]+ module/;

// Not runnable scripts: example configs and example test files shipped for reference.
const NOT_SCRIPTS = [/(^|\/)examples\//, /\.test\.js$/];

// Docs that live beside the agent definitions; they are not agents.
const NOT_AGENTS = [/(^|\/)README\.md$/, /^AGENT-REGISTRY\.md$/, /(^|\/)decision-matrices\//];

// Real failures this gate found on develop (#954). Each value names the defect; the #954 PR
// body carries the issue text to file for each. The ratchet in (a) fails when a listed script
// starts passing, so the PR that fixes it removes the entry. Never add an entry to make the
// gate green: fix the script under packages/ instead.
const KNOWN_BROKEN_SCRIPTS = {};

const rel = (base, abs) => path.relative(base, abs).split(path.sep).join('/');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(abs);
    return [abs];
  });
}

/** Scenario names: the keys of the `configs` object in Installer#generateConfig. */
function installerScenarios(installJs) {
  const src = fs.readFileSync(installJs, 'utf-8');
  const body = src.slice(src.indexOf('generateConfig(scenario)'), src.indexOf('installConfig(scenario)'));
  return [...body.matchAll(/^ {6}'?([a-z][a-z-]*)'?: \{$/gm)].map(m => m[1]);
}

function run(cmd, args, opts) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let timedOut = false;
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = opts.timeout ? setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, opts.timeout) : null;
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      resolve({ code, signal, timedOut, out });
    });
  });
}

async function pool(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * What a script's `--help` run can depend on: the scripts and lib trees, the installed
 * node_modules and the project's dependencies. Installs with the same fingerprint give the
 * same (a) result, so each is run once.
 */
function scriptFingerprint(installDir) {
  const h = crypto.createHash('sha1');
  for (const sub of ['.claude/scripts', '.claude/lib']) {
    for (const f of walk(path.join(installDir, sub)).sort()) {
      h.update(rel(installDir, f)).update(fs.readFileSync(f));
    }
  }
  const nm = path.join(installDir, 'node_modules');
  h.update(JSON.stringify(fs.existsSync(nm) ? fs.readdirSync(nm).sort() : []));
  const pj = path.join(installDir, 'package.json');
  h.update(JSON.stringify(fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, 'utf-8')).dependencies || {} : {}));
  return h.digest('hex');
}

/** (a) Returns [{dir, script, reason}] for every script, across installs, that does not start. */
async function checkScripts(installDirs, env) {
  const jobs = [];
  const counts = {};
  for (const installDir of [].concat(installDirs)) {
    const scriptsDir = path.join(installDir, '.claude', 'scripts');
    const scripts = walk(scriptsDir)
      .filter(f => f.endsWith('.js'))
      .map(f => rel(scriptsDir, f))
      .filter(s => !NOT_SCRIPTS.some(re => re.test(s)));
    counts[installDir] = scripts.length;
    for (const script of scripts) jobs.push({ installDir, scriptsDir, script });
  }
  const results = await pool(jobs, async ({ installDir, scriptsDir, script }) => {
    const r = await run(process.execPath, [path.join(scriptsDir, script), '--help'], {
      cwd: installDir, env, timeout: SCRIPT_TIMEOUT_MS
    });
    const crash = r.out.split('\n').find(line => CRASH.test(line));
    if (crash) return { dir: installDir, script, reason: crash.trim().slice(0, 200) };
    if (r.timedOut) return null; // still running (a server): it started
    if (r.code !== 0 && r.code !== 1) return { dir: installDir, script, reason: `exit ${r.code} ${r.signal || ''}`.trim() };
    return null;
  });
  return { counts, failures: results.filter(Boolean) };
}

/** (b) Returns [{file, reason}] for every agent / skill definition with bad frontmatter. */
function checkFrontmatter(installDir) {
  const claude = path.join(installDir, '.claude');
  const agentsDir = path.join(claude, 'agents');
  const files = [
    ...walk(agentsDir).filter(f => f.endsWith('.md') && !NOT_AGENTS.some(re => re.test(rel(agentsDir, f)))),
    ...walk(claude).filter(f => path.basename(f) === 'SKILL.md' && rel(claude, f).split('/').includes('skills'))
  ];
  const failures = [];
  for (const f of files) {
    const file = rel(claude, f);
    const m = fs.readFileSync(f, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!m) { failures.push({ file, reason: 'no frontmatter' }); continue; }
    let fm;
    try {
      fm = YAML.parse(m[1]);
    } catch (e) {
      failures.push({ file, reason: `yaml: ${e.message.split('\n')[0]}` });
      continue;
    }
    const missing = ['name', 'description'].filter(k => !fm || typeof fm !== 'object' || !fm[k]);
    if (missing.length) failures.push({ file, reason: `missing ${missing.join(', ')}` });
  }
  return { count: files.length, failures };
}

/** (c) Returns [{file, reason}] for invalid JSON and hook commands whose script is missing. */
function checkConfig(installDir) {
  const claude = path.join(installDir, '.claude');
  const failures = [];
  for (const f of walk(claude).filter(p => p.endsWith('.json'))) {
    try {
      JSON.parse(fs.readFileSync(f, 'utf-8'));
    } catch (e) {
      failures.push({ file: rel(installDir, f), reason: `invalid JSON: ${e.message}` });
    }
  }
  const settingsPath = path.join(claude, 'settings.json');
  if (!fs.existsSync(settingsPath)) return { failures };
  let settings;
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch { return { failures }; }
  for (const entries of Object.values(settings.hooks || {})) {
    for (const entry of entries || []) {
      for (const hook of entry.hooks || []) {
        if (hook.type !== 'command') continue;
        for (const [p] of String(hook.command).matchAll(/\.claude\/[^\s"'`;|&]+/g)) {
          if (!fs.existsSync(path.join(installDir, p))) {
            failures.push({ file: '.claude/settings.json', reason: `hook runs missing ${p}` });
          }
        }
      }
    }
  }
  return { failures };
}

/** (d) Packed paths outside package.json `files` (npm always adds package.json). */
function filesOutsidePackageFiles(packedPaths, filesField) {
  return packedPaths.filter(p => p !== 'package.json' &&
    !filesField.some(e => (e.endsWith('/') ? p.startsWith(e) : p === e || p.startsWith(`${e}/`))));
}

// ---------------------------------------------------------------------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-real-install-'));
const stubBin = path.join(tmp, 'bin');
const scriptHome = path.join(tmp, 'home');
let pack;
const installs = {};

// Scripts that ignore --help must not reach the network, GitHub, npm (setup-context7.js runs
// `npm install -g`), a container runtime, a git repo above the temp dir, or the user's HOME.
// No NODE_PATH, so nothing resolves from the repo.
const STUBBED_TOOLS = ['gh', 'npm', 'npx', 'docker', 'kubectl'];
function scriptEnv() {
  const env = { ...process.env, PATH: `${stubBin}${path.delimiter}${process.env.PATH}`, HOME: scriptHome,
    GIT_CEILING_DIRECTORIES: tmp };
  delete env.NODE_PATH;
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  return env;
}

beforeAll(async () => {
  fs.mkdirSync(stubBin, { recursive: true });
  fs.mkdirSync(scriptHome, { recursive: true });
  for (const tool of STUBBED_TOOLS) {
    fs.writeFileSync(path.join(stubBin, tool), `#!/bin/sh\necho "${tool} disabled in real-install gate" >&2\nexit 1\n`, { mode: 0o755 });
  }

  const packed = spawnSync('npm', ['pack', '--json', '--pack-destination', tmp], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024
  });
  if (packed.status !== 0) throw new Error(`npm pack failed:\n${packed.stderr}`);
  pack = JSON.parse(packed.stdout)[0];
  const pkgDir = path.join(tmp, 'pkg');
  fs.mkdirSync(pkgDir);
  const untar = spawnSync('tar', ['-xzf', path.join(tmp, pack.filename), '-C', pkgDir], { encoding: 'utf-8' });
  if (untar.status !== 0) throw new Error(`tar failed:\n${untar.stderr}`);
  const installJs = path.join(pkgDir, 'package', 'install', 'install.js');

  const scenarios = installerScenarios(installJs);
  const env = { ...process.env, AUTOPM_TEST_MODE: '1', npm_config_prefer_offline: 'true',
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' };
  delete env.NODE_PATH;
  await Promise.all(scenarios.map(async scenario => {
    const dir = path.join(tmp, `install-${scenario}`);
    fs.mkdirSync(dir);
    const r = await run(process.execPath, [installJs, '--force', `--scenario=${scenario}`, dir], {
      cwd: dir, env, timeout: 90000
    });
    installs[scenario] = { dir, ...r };
  }));
}, 180000);

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('real-install gate (#954)', () => {
  test('finds every installer scenario', () => {
    expect(Object.keys(installs).sort()).toEqual(
      expect.arrayContaining(['azure', 'docker', 'full', 'github', 'lite', 'obsidian', 'performance'])
    );
  });

  test('(d) the tarball holds nothing outside package.json `files`', () => {
    const { files } = require(path.join(ROOT, 'package.json'));
    expect(filesOutsidePackageFiles(pack.files.map(f => f.path), files)).toEqual([]);
  });

  test('every scenario installs from the tarball', () => {
    for (const [scenario, r] of Object.entries(installs)) {
      expect({ scenario, code: r.code, timedOut: r.timedOut, tail: r.code === 0 ? '' : r.out.slice(-2000) })
        .toEqual({ scenario, code: 0, timedOut: false, tail: '' });
    }
  });

  test('(a) every installed script starts with --help', async () => {
    const scenarioOf = {};
    const seen = new Set();
    for (const [scenario, { dir }] of Object.entries(installs)) {
      const fp = scriptFingerprint(dir);
      if (!seen.has(fp)) { seen.add(fp); scenarioOf[dir] = scenario; }
    }
    const { counts, failures } = await checkScripts(Object.keys(scenarioOf), scriptEnv());
    for (const [dir, count] of Object.entries(counts)) expect({ scenario: scenarioOf[dir], count: count > 0 })
      .toEqual({ scenario: scenarioOf[dir], count: true });
    const unexpected = failures.filter(f => !KNOWN_BROKEN_SCRIPTS[f.script])
      .map(f => `${scenarioOf[f.dir]}: .claude/scripts/${f.script} -> ${f.reason}`);
    expect(unexpected).toEqual([]);
    // Ratchet: a fixed script must leave KNOWN_BROKEN_SCRIPTS.
    const seenBroken = new Set(failures.map(f => f.script));
    expect(Object.keys(KNOWN_BROKEN_SCRIPTS).filter(s => !seenBroken.has(s))).toEqual([]);
  }, 180000);

  test('(b) every agent and skill frontmatter parses with name + description', () => {
    for (const [scenario, { dir }] of Object.entries(installs)) {
      const { count, failures } = checkFrontmatter(dir);
      expect({ scenario, count: count > 0, failures }).toEqual({ scenario, count: true, failures: [] });
    }
  });

  test('(c) settings and every .claude JSON is valid; hook commands exist', () => {
    for (const [scenario, { dir }] of Object.entries(installs)) {
      expect({ scenario, ...checkConfig(dir) }).toEqual({ scenario, failures: [] });
    }
  });
});

describe('real-install gate mutation fixtures (#954)', () => {
  test('a script requiring a missing module fails (a)', async () => {
    const { failures } = await checkScripts(path.join(FIXTURES, 'missing-module'), scriptEnv());
    expect(failures.map(({ script, reason }) => ({ script, reason }))).toEqual([
      { script: 'needs-missing-module.js', reason: expect.stringMatching(/Cannot find module/) }
    ]);
  });

  test('an agent with invalid frontmatter fails (b)', () => {
    const { failures } = checkFrontmatter(path.join(FIXTURES, 'invalid-frontmatter'));
    expect(failures).toEqual([
      { file: 'agents/broken-yaml.md', reason: expect.stringMatching(/^yaml: /) },
      { file: 'agents/no-description.md', reason: 'missing description' }
    ]);
  });

  test('a hook command pointing at a missing script fails (c)', () => {
    const { failures } = checkConfig(path.join(FIXTURES, 'missing-hook'));
    expect(failures).toEqual([
      { file: '.claude/settings.json', reason: 'hook runs missing .claude/hooks/not-installed.sh' }
    ]);
  });

  test('a packed file outside `files` fails (d)', () => {
    expect(filesOutsidePackageFiles(['package.json', 'bin/autopm.js', 'test/secret.js'], ['bin/'])).toEqual(['test/secret.js']);
  });
});
