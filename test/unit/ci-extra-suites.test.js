/**
 * CI must run the suites outside the default Jest testMatch (#858, #869).
 * Suites that never run rot silently: before #858 test:cli, test:node and
 * test:azure were red and nobody noticed because CI never ran them.
 *
 * CI (.github/workflows/test.yml) runs `npm test`; npm runs the `posttest`
 * hook after it, so the suites run on every Node version in the CI matrix
 * without a separate workflow step. Since #869 the node-scripts and provider
 * suites are in the default testMatch, and each extra suite is a Jest glob,
 * so a new file in its directory runs without being listed anywhere.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/test.yml'), 'utf8');
const scripts = require(path.join(root, 'package.json')).scripts;
const jestConfig = require(path.join(root, 'jest.config.js'));

const SUITES = { 'test:security': 'security', 'test:regression': 'regression', 'test:cli': 'cli' };

describe('CI runs the extra test suites (#858, #869)', () => {
  it('test.yml runs `npm test`', () => {
    expect(workflow).toMatch(/run:\s*npm test\s*$/m);
  });

  it.each(Object.keys(SUITES))('posttest runs `npm run %s`', (suite) => {
    expect(scripts.posttest.split('&&').map((s) => s.trim())).toContain(`npm run ${suite}`);
  });

  it.each(Object.entries(SUITES))('%s runs every test/%s/*.test.js file', (suite, dir) => {
    expect(scripts[suite]).toContain(`<rootDir>/test/${dir}/**/*.test.js`);
  });

  it.each(['node-scripts', 'providers'])('npm test runs test/%s', (dir) => {
    expect(jestConfig.testMatch).toContain(`<rootDir>/test/${dir}/**/*.test.js`);
  });
});
