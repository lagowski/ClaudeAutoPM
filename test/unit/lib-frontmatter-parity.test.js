/**
 * One frontmatter parser in lib/ (#867).
 *
 * The same table of inputs is run through every frontmatter reader in lib/.
 * Each must agree with the shared lib/utils/frontmatter.js, which parses with
 * the `yaml` library (same as autopm/.claude/lib/frontmatter.js).
 */

const fs = require('fs');
const path = require('path');
const shared = require('../../lib/utils/frontmatter');
const FilterEngine = require('../../lib/filter-engine');
const PRDService = require('../../lib/services/PRDService');
const EpicService = require('../../lib/services/EpicService');
const IssueService = require('../../lib/services/IssueService');
const ContextService = require('../../lib/services/ContextService');
const UtilityService = require('../../lib/services/UtilityService');

const CASES = [
  {
    name: 'no frontmatter, body has a --- rule',
    input: '# Title\n\nintro\n---\nkey: value\n---\nmore\n',
    data: null,
    body: '# Title\n\nintro\n---\nkey: value\n---\nmore\n'
  },
  {
    name: 'body with --- after the frontmatter',
    input: '---\ntitle: A\n---\nintro\n---\nmore\n',
    data: { title: 'A' },
    body: 'intro\n---\nmore\n'
  },
  {
    name: 'CRLF line endings',
    input: '---\r\ntitle: A\r\nstatus: open\r\n---\r\nbody\r\n',
    data: { title: 'A', status: 'open' },
    body: 'body\r\n'
  },
  {
    name: 'empty body, no trailing newline',
    input: '---\ntitle: A\n---',
    data: { title: 'A' },
    body: ''
  },
  {
    name: 'empty frontmatter block',
    input: '---\n---\nbody\n',
    data: {},
    body: 'body\n'
  },
  {
    name: 'YAML types, quoting and timestamps',
    input: '---\nissue: 12\ndone: false\ntags: [a, b]\ntitle: "A: B"\ncreated: 2026-11-28T10:00:00Z\n---\n',
    data: { issue: 12, done: false, tags: ['a', 'b'], title: 'A: B', created: '2026-11-28T10:00:00Z' },
    body: ''
  }
];

// Every reader in lib/, normalised to "data object, or null when there is no block".
const READERS = {
  'utils/frontmatter.readFrontmatter': (c) => shared.readFrontmatter(c),
  'filter-engine.parseFrontmatter': (c) => {
    const fm = new FilterEngine().parseFrontmatter(c).frontmatter;
    return shared.hasFrontmatter(c) ? fm : (Object.keys(fm).length ? fm : null);
  },
  'PRDService.parseFrontmatter': (c) => new PRDService().parseFrontmatter(c),
  'EpicService.parseFrontmatter': (c) => new EpicService().parseFrontmatter(c),
  'IssueService.parseIssueMetadata': (c) => new IssueService().parseIssueMetadata(c),
  'ContextService._parseFrontmatter': (c) => {
    const fm = new ContextService()._parseFrontmatter(c);
    return shared.hasFrontmatter(c) ? fm : (Object.keys(fm).length ? fm : null);
  },
  'UtilityService._extractFrontmatter': (c) => new UtilityService()._extractFrontmatter(c)
};

describe('lib/ frontmatter readers agree (#867)', () => {
  describe.each(Object.keys(READERS))('%s', (reader) => {
    test.each(CASES)('$name', ({ input, data }) => {
      expect(READERS[reader](input)).toEqual(data);
    });
  });
});

describe('lib/utils/frontmatter', () => {
  test.each(CASES)('parseFrontmatter body: $name', ({ input, data, body }) => {
    const parsed = shared.parseFrontmatter(input);
    expect(parsed.frontmatter).toEqual(data || {});
    expect(parsed.body).toBe(body);
  });

  test('parseFrontmatter throws on invalid YAML', () => {
    expect(() => shared.parseFrontmatter('---\ntitle: [WIP] Fix: x\n---\n')).toThrow(/Invalid YAML/);
  });

  test('readFrontmatter falls back to flat key: value strings on invalid YAML', () => {
    expect(shared.readFrontmatter('---\ntitle: [WIP] Fix: x\nstatus: open\n---\n'))
      .toEqual({ title: '[WIP] Fix: x', status: 'open' });
  });

  test('readFrontmatter returns null for non-strings and missing blocks', () => {
    expect(shared.readFrontmatter(undefined)).toBeNull();
    expect(shared.readFrontmatter('')).toBeNull();
    expect(shared.readFrontmatter('---\nunclosed: true\n')).toBeNull();
  });

  test('a scalar YAML block reads as an empty object', () => {
    expect(shared.readFrontmatter('---\njust text\n---\n')).toEqual({});
  });

  test('stringifyFrontmatter round-trips through parseFrontmatter', () => {
    const md = shared.stringifyFrontmatter({ title: 'A: B', issue: 3 }, 'body\n');
    expect(shared.parseFrontmatter(md)).toEqual({ frontmatter: { title: 'A: B', issue: 3 }, body: 'body\n' });
    expect(shared.stringifyFrontmatter({}, 'x')).toBe('---\n---\nx');
  });
});

describe('one YAML library in lib/ (#867)', () => {
  test('no file under lib/ requires js-yaml', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js') && /require\(\s*['"]js-yaml['"]\s*\)/.test(fs.readFileSync(full, 'utf8'))) {
          offenders.push(path.relative(path.join(__dirname, '../..'), full));
        }
      }
    };
    walk(path.join(__dirname, '../../lib'));
    expect(offenders).toEqual([]);
  });
});
