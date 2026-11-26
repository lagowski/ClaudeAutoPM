// #857: one-off migration scripts that already ran are deleted, and so is audits/.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const removed = [
  'add-wrapper-scripts.js', 'fix-invalid-command-refs.sh', 'fix-invalid-refs-simple.sh',
  'fix-migrated-commands.js', 'fix-template-variables.js', 'simplify-all-commands.js',
  'simplify-root-commands.js', 'standardize-commands.js', 'update-wiki.sh',
  'add-context7-to-commands.js', 'migrate-all-commands.js', 'migrate-commands.js',
  'migrate-from-worktrees.js', 'migrate-from-worktrees.sh', 'clean-ai-contributors.js',
  'clean-ai-contributors.sh', 'local-test-runner.js', 'local-test-runner.sh',
  'setup-azure-aliases.js', 'setup-azure-aliases.sh', 'simplify-pm-commands.js',
  'standardize-framework-agents.js',
];

describe('one-off scripts removed (#857)', () => {
  test.each(removed)('scripts/%s is deleted', (f) => {
    expect(fs.existsSync(path.join(root, 'scripts', f))).toBe(false);
  });

  test('audits/ is deleted', () => {
    expect(fs.existsSync(path.join(root, 'audits'))).toBe(false);
  });

  test('validate-framework-paths.sh no longer excludes deleted scripts', () => {
    const src = fs.readFileSync(path.join(root, 'scripts', 'validate-framework-paths.sh'), 'utf8');
    for (const f of removed) expect(src).not.toContain(`--exclude="${f}"`);
  });
});
