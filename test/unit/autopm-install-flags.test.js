/**
 * `autopm install` must forward every flag install.js accepts (#866).
 *
 * A --require preload stands in for install.js: it records the argv install.js
 * receives and exits, so no real installation runs.
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const AUTOPM = path.join(ROOT, 'bin', 'autopm.js');
const SCENARIOS = ['lite', 'github', 'azure', 'docker', 'full', 'full-azure', 'performance', 'obsidian'];

describe('autopm install flag forwarding (#866)', () => {
  let tmp;
  let preload;
  let record;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-install-flags-'));
    record = path.join(tmp, 'argv.json');
    preload = path.join(tmp, 'capture.js');
    fs.writeFileSync(preload, `
if (process.argv[1] && process.argv[1].endsWith('install.js')) {
  require('fs').writeFileSync(${JSON.stringify(record)}, JSON.stringify(process.argv.slice(2)));
  process.exit(0);
}
`);
  });

  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function runInstall(args) {
    execFileSync('node', [AUTOPM, 'install', ...args], {
      cwd: tmp,
      env: { ...process.env, AUTOPM_TEST_MODE: '1', NODE_OPTIONS: `--require ${preload}` },
      stdio: 'pipe'
    });
    return JSON.parse(fs.readFileSync(record, 'utf8'));
  }

  test('forwards --setup-hooks with --scenario=lite', () => {
    const argv = runInstall(['--setup-hooks', '--scenario=lite']);
    expect(argv).toContain('--setup-hooks');
    expect(argv).toContain('--scenario=lite');
  });

  test('forwards --merge, --check-env and --force', () => {
    const argv = runInstall(['--merge', '--check-env', '--force']);
    expect(argv).toEqual(expect.arrayContaining(['--merge', '--check-env', '--force']));
  });

  test('forwards no optional flags when none are given', () => {
    expect(runInstall([])).toEqual([]);
  });

  test('autopm install --help lists every scenario install.js accepts', () => {
    const help = execFileSync('node', [AUTOPM, 'install', '--help'], { encoding: 'utf8' });
    for (const s of SCENARIOS) expect(help).toContain(s);
    expect(help).not.toMatch(/preset/i);
  });

  test('install.js --help lists every scenario and no install.sh examples', () => {
    const help = execFileSync('node', [path.join(ROOT, 'install', 'install.js'), '--help'], { encoding: 'utf8' });
    for (const s of SCENARIOS) expect(help).toMatch(new RegExp(`^\\s+${s}\\s`, 'm'));
    expect(help).not.toContain('install.sh');
  });

  test('team.js does not hardcode autopm/.claude', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bin', 'commands', 'team.js'), 'utf8');
    expect(src).not.toMatch(/'autopm',\s*'\.claude'/);
  });
});
