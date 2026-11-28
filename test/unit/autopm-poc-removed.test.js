/**
 * #854: the autopm-poc bin and the code only it used are gone.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const pkg = require(path.join(root, 'package.json'));

describe('autopm-poc removal (#854)', () => {
  test('package.json has no autopm-poc bin and no test:poc script', () => {
    expect(pkg.bin).not.toHaveProperty('autopm-poc');
    expect(pkg.scripts).not.toHaveProperty('test:poc');
  });

  test.each([
    'bin/autopm-poc.js',
    'jest.config.poc.js',
    'lib/utils/ServiceFactory.js',
    'lib/config/ConfigManager.js',
    'lib/utils/Encryption.js',
    'scripts/config',
    'test/poc'
  ])('%s is absent', (rel) => {
    expect(fs.existsSync(path.join(root, rel))).toBe(false);
  });
});
