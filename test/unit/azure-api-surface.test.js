/**
 * Azure DevOps API surface guard.
 *
 * Every method we call on an azure-devops-node-api client must actually exist
 * on that client's prototype. The existing Azure suites all mock the library
 * wholesale (`jest.mock('azure-devops-node-api')`), so a call to a method the
 * library has never exported passes every test and fails only at runtime.
 *
 * That is not hypothetical — it is how two live TypeErrors survived:
 *   - AzureDevOpsProvider.authenticate() called witApi.getProject(), which is
 *     on CoreApi, not WorkItemTrackingApi. Azure auth threw on every call.
 *   - client.getTeamCapacity() called work.getCapacities(), which no version
 *     of the library has ever exported.
 *
 * This test reads the real source, extracts the methods invoked on each API
 * handle, and checks them against the installed library's prototypes. It
 * discovers calls rather than restating a hand-written list, so a new bad call
 * is caught without anyone remembering to update this file.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const PROTOTYPES = {
  WorkItemTracking: require('azure-devops-node-api/WorkItemTrackingApi').WorkItemTrackingApi.prototype,
  Work: require('azure-devops-node-api/WorkApi').WorkApi.prototype,
  Core: require('azure-devops-node-api/CoreApi').CoreApi.prototype
};

/**
 * Source files and the local variable each API handle is bound to.
 * `wit`/`witApi` -> WorkItemTracking, `work` -> Work, `core`/`coreApi` -> Core.
 */
const SOURCES = [
  {
    file: 'autopm/.claude/providers/azure/lib/client.js',
    handles: { wit: 'WorkItemTracking', work: 'Work', core: 'Core', coreApi: 'Core' }
  },
  {
    file: '.claude/providers/azure/lib/client.js',
    handles: { wit: 'WorkItemTracking', work: 'Work', core: 'Core', coreApi: 'Core' }
  },
  {
    file: 'lib/providers/AzureDevOpsProvider.js',
    handles: { witApi: 'WorkItemTracking', workApi: 'Work', coreApi: 'Core' }
  }
];

/** Methods invoked on the given handles, as [handle, method] pairs. */
function callsIn(source, handles) {
  const names = Object.keys(handles).sort((a, b) => b.length - a.length).join('|');
  const pattern = new RegExp(`\\b(${names})\\.(\\w+)\\s*\\(`, 'g');

  const calls = new Set();
  for (const match of source.matchAll(pattern)) {
    calls.add(`${match[1]}.${match[2]}`);
  }
  return [...calls].sort();
}

describe('azure-devops-node-api call sites', () => {
  for (const { file, handles } of SOURCES) {
    const abs = path.join(ROOT, file);

    describe(file, () => {
      const exists = fs.existsSync(abs);
      const calls = exists ? callsIn(fs.readFileSync(abs, 'utf-8'), handles) : [];

      // A regex that matched nothing would make the assertion below vacuous.
      test('source exists and API calls were discovered', () => {
        assert.ok(exists, `${file} not found`);
        assert.ok(calls.length > 0, `no API calls discovered in ${file}`);
      });

      test('every called method exists on the real client', () => {
        const missing = calls.filter(call => {
          const [handle, method] = call.split('.');
          return typeof PROTOTYPES[handles[handle]][method] !== 'function';
        }).map(call => {
          const [handle, method] = call.split('.');
          return `${call}() — ${handles[handle]}Api has no ${method}()`;
        });

        assert.strictEqual(missing.join('\n'), '', `\n${missing.join('\n')}\n`);
      });
    });
  }
});
