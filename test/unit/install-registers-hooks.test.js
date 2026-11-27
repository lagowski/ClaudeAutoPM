/**
 * Framework hooks must actually run (#859).
 *
 * Claude Code only runs hooks declared in `.claude/settings.json` (`hooks.PreToolUse[]` entries with a
 * `matcher` and `{type: "command", command}` handlers). The installer copied hook scripts into
 * `.claude/hooks/` but never registered them, and the only declaration was a `"tool-use"` key in
 * `autopm/.claude-code/config.json` that Claude Code does not read. So none of them ever ran.
 *
 * Each test runs the real installer into a throwaway project directory.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const INSTALL_JS = path.join(ROOT, 'install', 'install.js');
const Installer = require(INSTALL_JS);

function install(project, scenario, ...flags) {
  const r = spawnSync('node', [INSTALL_JS, `--scenario=${scenario}`, ...flags, project], {
    cwd: project,
    env: { ...process.env, AUTOPM_TEST_MODE: '1' },
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error(`install failed (${r.status}):\n${r.stdout}\n${r.stderr}`);
}

const settingsOf = project =>
  JSON.parse(fs.readFileSync(path.join(project, '.claude', 'settings.json'), 'utf8'));

// "$CLAUDE_PROJECT_DIR/.claude/hooks/x.sh" -> <project>/.claude/hooks/x.sh
function scriptsOf(project, entries) {
  return (entries || []).flatMap(e => e.hooks || []).map(h => {
    const m = /\$CLAUDE_PROJECT_DIR\/(\.claude\/hooks\/[^"\s]+)/.exec(h.command || '');
    return m ? path.join(project, m[1]) : null;
  }).filter(Boolean);
}

describe('install registers framework hooks in .claude/settings.json (#859)', () => {
  let project;

  beforeEach(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-hooks-'));
  });

  afterEach(() => {
    fs.rmSync(project, { recursive: true, force: true });
  });

  test('docker scenario gets PreToolUse hooks pointing at existing scripts', () => {
    install(project, 'docker');

    const pre = settingsOf(project).hooks.PreToolUse;
    expect(Array.isArray(pre)).toBe(true);
    for (const entry of pre) expect(typeof entry.matcher).toBe('string');

    const scripts = scriptsOf(project, pre);
    expect(scripts.map(s => path.basename(s))).toEqual(['docker-first-enforcement.sh']);
    for (const s of scripts) expect(fs.existsSync(s)).toBe(true);
  }, 60000);

  test('a default install registers enforce-agents.cjs nowhere', () => {
    install(project, 'lite');
    expect(settingsOf(project).hooks).toBeUndefined();
    const config = JSON.parse(fs.readFileSync(path.join(project, '.claude', 'config.json'), 'utf8'));
    expect(config.features?.enforce_agents).toBeUndefined();
  }, 60000);

  test('--enforce-agents opts in: the hook is registered and the choice is saved for update', () => {
    install(project, 'docker', '--enforce-agents');
    const pre = settingsOf(project).hooks.PreToolUse;
    expect(scriptsOf(project, pre).map(s => path.basename(s)).sort())
      .toEqual(['docker-first-enforcement.sh', 'enforce-agents.cjs']);
    expect(pre.find(e => /enforce-agents\.cjs/.test(e.hooks[0].command)).matcher).toBe('Bash|Read');
    const config = JSON.parse(fs.readFileSync(path.join(project, '.claude', 'config.json'), 'utf8'));
    expect(config.features.enforce_agents).toBe(true);

    // update.sh re-registers from .claude/config.json: opted in stays in, opted out drops it
    expect(Installer.registerClaudeHooks(project, config).sort())
      .toEqual(['docker-first-enforcement.sh', 'enforce-agents.cjs']);
    expect(Installer.registerClaudeHooks(project, { tools: config.tools }))
      .toEqual(['docker-first-enforcement.sh']);
    expect(scriptsOf(project, settingsOf(project).hooks.PreToolUse).map(s => path.basename(s)))
      .toEqual(['docker-first-enforcement.sh']);
  }, 60000);

  test('re-install keeps user hook entries and other settings, without duplicating ours', () => {
    const userEntry = { matcher: 'Write', hooks: [{ type: 'command', command: 'echo mine' }] };
    fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(project, '.claude', 'settings.json'), JSON.stringify({
      permissions: { allow: ['Bash(ls:*)'] },
      hooks: {
        PreToolUse: [userEntry],
        Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }]
      }
    }));

    install(project, 'docker');
    install(project, 'docker');

    const settings = settingsOf(project);
    expect(settings.permissions).toEqual({ allow: ['Bash(ls:*)'] });
    expect(settings.hooks.Stop).toEqual([{ hooks: [{ type: 'command', command: 'echo stop' }] }]);
    expect(settings.hooks.PreToolUse).toContainEqual(userEntry);
    expect(scriptsOf(project, settings.hooks.PreToolUse)).toHaveLength(1);
  }, 60000);

  test('reminder-only and duplicate hooks are no longer shipped', () => {
    install(project, 'full');
    const hooks = fs.readdirSync(path.join(project, '.claude', 'hooks'));
    for (const gone of [
      'pre-action-agent-reminder.js', 'context7-enforcement.js', 'pre-agent-context7.js',
      'pre-command-context7.js', 'context7-reminder.md', 'pre-commit-clear-reminder.sh',
      'test-hook.sh', 'unified-context7-enforcement.sh', 'strict-enforce-agents.sh', 'enforce-agents.sh', 'enforce-agents.js'
    ]) {
      expect(hooks).not.toContain(gone);
    }
    const cc = JSON.parse(fs.readFileSync(path.join(ROOT, 'autopm', '.claude-code', 'config.json'), 'utf8'));
    expect(cc.hooks).toBeUndefined();
  }, 60000);
});

describe('registered hooks speak the Claude Code hook protocol (#859)', () => {
  const run = (script, input, cwd) => spawnSync(/\.c?js$/.test(script) ? 'node' : 'bash', [script], {
    cwd, input: JSON.stringify(input), encoding: 'utf8'
  });

  test('enforce-agents.cjs reads the tool call from stdin and blocks with exit 2', () => {
    const script = path.join(ROOT, 'packages', 'plugin-core', 'hooks', 'enforce-agents.cjs');
    const blocked = run(script, { tool_name: 'Bash', tool_input: { command: 'npm test' } }, ROOT);
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toMatch(/BLOCKED/);

    const allowed = run(script, { tool_name: 'Bash', tool_input: { command: 'ls -la' } }, ROOT);
    expect(allowed.status).toBe(0);
  });

  test('docker-first-enforcement.sh blocks a local run with exit 2 when docker-first is on', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-dockerfirst-'));
    try {
      fs.mkdirSync(path.join(project, '.claude'));
      fs.writeFileSync(path.join(project, '.claude', 'config.json'),
        JSON.stringify({ tools: { docker: { enabled: true, first: true } } }));
      const script = path.join(ROOT, 'autopm', '.claude', 'hooks', 'docker-first-enforcement.sh');

      const blocked = run(script, { tool_name: 'Bash', tool_input: { command: 'npm install' } }, project);
      expect(blocked.status).toBe(2);
      expect(blocked.stderr).toMatch(/docker/i);

      const allowed = run(script, { tool_name: 'Bash', tool_input: { command: 'docker compose up' } }, project);
      expect(allowed.status).toBe(0);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
