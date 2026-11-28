/**
 * The one YAML frontmatter parser for lib/ (#867).
 *
 * Parses with the `yaml` library, like the framework copy in .claude/lib/frontmatter.js.
 * The block must open on the first line of the file; the first `---` line after
 * it closes the block, so a `---` rule in the body is body. LF and CRLF both work.
 */

const { parse, stringify } = require('yaml');

const BLOCK = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

/** @returns {{yaml: string, body: string}|null} raw block, or null when there is none */
function splitFrontmatter(content) {
  if (typeof content !== 'string') return null;
  const match = content.match(BLOCK);
  if (!match) return null;
  return { yaml: match[1] || '', body: content.slice(match[0].length) };
}

function hasFrontmatter(content) {
  return splitFrontmatter(content) !== null;
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * Parse frontmatter and body. Throws on invalid YAML.
 * @returns {{frontmatter: Object, body: string}}
 */
function parseFrontmatter(content) {
  const block = splitFrontmatter(content);
  if (!block) return { frontmatter: {}, body: typeof content === 'string' ? content : '' };
  if (!block.yaml.trim()) return { frontmatter: {}, body: block.body };
  try {
    return { frontmatter: toObject(parse(block.yaml)), body: block.body };
  } catch (error) {
    throw new Error(`Invalid YAML syntax in frontmatter: ${error.message}`);
  }
}

/** Flat `key: value` lines as strings: the reading of a block that is not valid YAML. */
function parseFlat(yamlText) {
  const result = {};
  for (const line of yamlText.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    if (key) result[key] = line.slice(colon + 1).trim();
  }
  return result;
}

/**
 * Frontmatter data only, never throws.
 * @returns {Object|null} null when there is no block; flat strings when the YAML is invalid
 */
function readFrontmatter(content) {
  const block = splitFrontmatter(content);
  if (!block) return null;
  if (!block.yaml.trim()) return {};
  try {
    return toObject(parse(block.yaml));
  } catch {
    return parseFlat(block.yaml);
  }
}

/** Build `---\n<yaml>---\n<body>`. */
function stringifyFrontmatter(data, body = '') {
  if (!data || Object.keys(data).length === 0) return `---\n---\n${body}`;
  return `---\n${stringify(data)}---\n${body}`;
}

module.exports = {
  splitFrontmatter,
  hasFrontmatter,
  parseFrontmatter,
  readFrontmatter,
  stringifyFrontmatter
};
