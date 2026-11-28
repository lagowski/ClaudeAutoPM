/**
 * CI must run the node:test suites outside the Jest allowlist (#858).
 * Suites that never run rot silently: before #858 test:cli, test:node and
 * test:azure were red and nobody noticed because CI never ran them.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/test.yml'), 'utf8');
const scripts = require(path.join(root, 'package.json')).scripts;

const SUITES = ['test:security', 'test:regression', 'test:cli', 'test:node', 'test:azure'];

describe('CI runs the extra test suites (#858)', () => {
  it.each(SUITES)('test.yml runs `npm run %s`', (suite) => {
    expect(workflow).toMatch(new RegExp(`run:\\s*npm run ${suite}\\s*$`, 'm'));
  });

  it.each(SUITES)('package.json defines %s', (suite) => {
    expect(scripts[suite]).toBeDefined();
  });

  // test:cli lists its files explicitly (node:test files and Jest files need
  // different runners), so a new test/cli file must be added there or it
  // never runs.
  it('test:cli names every test/cli/*.test.js file', () => {
    const files = fs.readdirSync(path.join(root, 'test/cli')).filter((f) => f.endsWith('.test.js'));
    const unlisted = files.filter((f) => !scripts['test:cli'].includes(f.replace('.test.js', '')));
    expect(unlisted).toEqual([]);
  });
});
