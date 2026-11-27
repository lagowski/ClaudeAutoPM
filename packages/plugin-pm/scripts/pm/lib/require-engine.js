/**
 * Load a PM engine (analytics-engine, filter-engine, ...) from wherever it lives (#848).
 *
 * - Installed project: <proj>/.claude/scripts/pm/lib/ -> <proj>/.claude/lib/pm-engines/
 * - This repo (packages/plugin-pm/scripts/pm/lib/): falls back to the repo's lib/
 */
const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  path.join(__dirname, '..', '..', '..', 'lib', 'pm-engines'),
  path.join(__dirname, '..', '..', '..', '..', '..', 'lib')
];

function requireEngine(name) {
  for (const dir of CANDIDATES) {
    const file = path.join(dir, `${name}.js`);
    // Check existence first so a missing npm dep inside the engine still surfaces as itself.
    if (fs.existsSync(file)) return require(file);
  }
  throw new Error(
    `PM engine '${name}' not found. Looked in:\n  ${CANDIDATES.join('\n  ')}\n` +
      'Expected .claude/lib/pm-engines/ in the project; re-run `autopm install` (or `autopm update`).'
  );
}

module.exports = { requireEngine };
