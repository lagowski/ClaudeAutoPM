/**
 * enforce-agents.cjs must not block routine commands (#859 fix round, HOLD on #885).
 *
 * The first version matched substrings anywhere in a command, so `pytest -q`, `cat jest.config.js`,
 * `git commit -m "fix npm test"` or `grep x src/a.js` were blocked. The hook now only looks at the
 * command word of each pipeline segment, and blocks what it exists for: a test suite run that dumps
 * its full output, reading a log file, and reading a file over 1000 lines.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'packages', 'plugin-core', 'hooks', 'enforce-agents.cjs');

const runHook = (toolName, toolInput) => spawnSync('node', [SCRIPT], {
  input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }), encoding: 'utf8'
});
const bash = command => runHook('Bash', { command });

describe('enforce-agents.cjs allows routine commands (#859)', () => {
  test.each([
    'git status',
    'git diff',
    'cat package.json',
    'ls',
    'ls -la',
    'npm install',
    'node -v',
    'grep -r x src',
    'grep -n foo src/app.js',
    'rg x',
    'rg handler src/**/*.ts',
    'find . -name "*.py"',
    'pytest -q',
    'pytest -q tests/test_api.py',
    'npm run build',
    'npm test --silent',
    'npx jest --silent test/unit/a.test.js',
    'cat jest.config.js',
    'cat requirements.txt',
    'git log --oneline | head -5',
    'git commit -m "fix npm test and pytest"',
    'echo "see build.log"',
    'ls logs/',
    'tail -n 20 CHANGELOG.md'
  ])('allows: %s', command => {
    const r = bash(command);
    expect({ command, status: r.status, stderr: r.stderr }).toEqual({ command, status: 0, stderr: '' });
  });
});

describe('enforce-agents.cjs still blocks what it exists for (#859)', () => {
  test.each([
    'npm test',
    'npm run test',
    'yarn test',
    'pnpm test',
    'npx jest',
    'jest',
    'vitest run',
    'pytest',
    'pytest tests/',
    'cd api && pytest',
    'cat build.log',
    'tail -f logs/app.log',
    'head -100 server.log | grep ERROR',
    'less nohup.out'
  ])('blocks: %s', command => {
    const r = bash(command);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/BLOCKED/);
  });

  test('blocks a Read of a file over 1000 lines, allows a small one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autopm-enforce-'));
    try {
      const big = path.join(dir, 'big.txt');
      const small = path.join(dir, 'small.txt');
      fs.writeFileSync(big, 'x\n'.repeat(1500));
      fs.writeFileSync(small, 'x\n'.repeat(10));
      expect(runHook('Read', { file_path: big }).status).toBe(2);
      expect(runHook('Read', { file_path: small }).status).toBe(0);
      expect(runHook('Read', { file_path: big, offset: 1, limit: 100 }).status).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
