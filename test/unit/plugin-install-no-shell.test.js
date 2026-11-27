/**
 * #846: `autopm plugin install <name>` must never hand the name to a shell.
 */
const fs = require('fs');
const path = require('path');

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn()
}));

jest.mock('../../lib/plugins/PluginManager', () => jest.fn().mockImplementation(() => ({
  isInstalled: jest.fn(() => false),
  initialize: jest.fn(async () => {}),
  installPlugin: jest.fn(async () => ({ displayName: 'X', category: 'c', agentsInstalled: 0, agents: [] }))
})));

const childProcess = require('child_process');
const pluginCommand = require('../../bin/commands/plugin');

describe('plugin install name validation (#846)', () => {
  let exitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['x;touch /tmp/pwned', 'x y', 'x$(id)', 'X', '../x', 'x`id`'])(
    'rejects %p before spawning any child process',
    async (name) => {
      await expect(pluginCommand.handler({ action: 'install', name })).rejects.toThrow('exit 1');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(childProcess.execSync).not.toHaveBeenCalled();
      expect(childProcess.execFileSync).not.toHaveBeenCalled();
    }
  );

  it('installs a valid name via execFileSync with an argument array', async () => {
    childProcess.execFileSync.mockImplementationOnce(() => { throw new Error('not installed'); });
    await pluginCommand.handler({ action: 'install', name: 'cloud' });
    expect(childProcess.execSync).not.toHaveBeenCalled();
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      'npm', ['list', '-g', '@claudeautopm/plugin-cloud'], expect.any(Object)
    );
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      'npm', ['install', '-g', '@claudeautopm/plugin-cloud'], expect.any(Object)
    );
  });

  it('leaves no execSync call in bin/commands/plugin.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../bin/commands/plugin.js'), 'utf8');
    expect(src).not.toMatch(/execSync\s*\(/);
  });

  it('bin/autopm.js runs update.sh via execFileSync, not a shell string', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../bin/autopm.js'), 'utf8');
    expect(src).not.toMatch(/execSync\(`bash /);
    expect(src).toMatch(/execFileSync\('bash', \[updatePath\]/);
  });
});
