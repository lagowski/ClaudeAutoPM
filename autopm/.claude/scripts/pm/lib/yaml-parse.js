/**
 * YAML parse/stringify for the PM scripts and engines in an installed project
 * (#899, #867).
 *
 * The generated engine copies in .claude/lib/pm-engines/ and the shipped PM
 * scripts require this in place of the `yaml` / `js-yaml` npm packages, which
 * an installed project may not have. Resolution order:
 *   1. `yaml` (if the project installed it)
 *   2. `js-yaml`, core schema so timestamps stay strings, matching `yaml`
 *   3. a dependency-free block-YAML subset: nested maps and lists, inline
 *      `[]`/`{}`, quoted and plain scalars, comments
 */
'use strict';

function stripComment(value) {
  let quote = null;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.slice(0, i).trimEnd();
    }
  }
  return value;
}

function splitInline(body) {
  const items = [];
  let current = '';
  let quote = null;
  let depth = 0;
  for (const c of body) {
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '[' || c === '{') {
      depth++;
    } else if (c === ']' || c === '}') {
      depth--;
    } else if (c === ',' && depth === 0) {
      items.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim() !== '') items.push(current);
  return items.map((s) => s.trim());
}

function unquote(v) {
  if (v[0] === '"') {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v.slice(1, -1).replace(/''/g, "'");
}

/** `key: rest` at the start of a line; null when the text is not a map entry. */
function matchKey(text) {
  const m = text.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'#[\]{},-][^:]*?|-[^\s:][^:]*?)\s*:(?:\s+(.*)|$)/);
  if (!m) return null;
  const rawKey = m[1].trim();
  const key = rawKey[0] === '"' || rawKey[0] === "'" ? unquote(rawKey) : rawKey;
  return { key, rest: m[2] === undefined ? '' : m[2] };
}

function scalar(raw) {
  const v = stripComment(raw.trim());
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
    return unquote(v);
  }
  if (v.startsWith('[') && v.endsWith(']')) {
    return splitInline(v.slice(1, -1)).map(scalar);
  }
  if (v.startsWith('{') && v.endsWith('}')) {
    const obj = {};
    for (const item of splitInline(v.slice(1, -1))) {
      const m = matchKey(item);
      if (m) obj[m.key] = scalar(m.rest);
    }
    return obj;
  }
  return v;
}

const isSeqItem = (text) => text === '-' || text.startsWith('- ');

/** Parse the block-YAML subset PM files and decomposition templates use. */
function parseBuiltin(text) {
  const lines = [];
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed === '---') continue;
    lines.push({ indent: line.length - line.trimStart().length, text: trimmed });
  }
  let i = 0;

  function parseNode(indent) {
    return isSeqItem(lines[i].text) ? parseSeq(indent) : parseMap(indent);
  }

  /** Value after `key:` with nothing on the line: a nested block or null. */
  function parseChild(indent) {
    if (i < lines.length && lines[i].indent > indent) return parseNode(lines[i].indent);
    if (i < lines.length && lines[i].indent === indent && isSeqItem(lines[i].text)) return parseSeq(indent);
    return null;
  }

  function parseMap(indent) {
    const obj = {};
    while (i < lines.length && lines[i].indent >= indent) {
      const line = lines[i];
      if (line.indent > indent || isSeqItem(line.text)) {
        if (line.indent === indent) break;
        i++; // stray deeper line: skip, as the flat parser did
        continue;
      }
      const m = matchKey(line.text);
      i++;
      if (!m) continue;
      obj[m.key] = stripComment(m.rest) === '' ? parseChild(indent) : scalar(m.rest);
    }
    return obj;
  }

  function parseSeq(indent) {
    const arr = [];
    while (i < lines.length && lines[i].indent === indent && isSeqItem(lines[i].text)) {
      const line = lines[i];
      const rest = line.text.slice(1).trimStart();
      if (rest === '') {
        i++;
        arr.push(i < lines.length && lines[i].indent > indent ? parseNode(lines[i].indent) : null);
      } else if (matchKey(rest)) {
        // `- key: v` opens a map whose keys sit at the column after `- `.
        const childIndent = indent + (line.text.length - rest.length);
        lines[i] = { indent: childIndent, text: rest };
        arr.push(parseMap(childIndent));
      } else {
        i++;
        arr.push(scalar(rest));
      }
      while (i < lines.length && lines[i].indent > indent) i++;
    }
    return arr;
  }

  if (lines.length === 0) return {};
  const base = lines[0].indent;
  const result = parseNode(base);
  return result;
}

const RESERVED = /^(true|false|null|~|yes|no|on|off|y|n)$/i;

function formatScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const s = String(value);
  const plain =
    /^[A-Za-z_./][A-Za-z0-9_ ./()+-]*$/.test(s) && !/\s$/.test(s) && !RESERVED.test(s);
  return plain ? s : JSON.stringify(s);
}

function formatKey(key) {
  return /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(key) ? key : JSON.stringify(key);
}

const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

function dumpLines(value, indent) {
  const pad = ' '.repeat(indent);
  const out = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isMap(item) && Object.keys(item).length > 0) {
        const inner = dumpLines(item, indent + 2);
        inner[0] = `${pad}- ${inner[0].slice(indent + 2)}`;
        out.push(...inner);
      } else if (Array.isArray(item) && item.length > 0) {
        out.push(`${pad}-`, ...dumpLines(item, indent + 2));
      } else {
        out.push(`${pad}- ${inlineValue(item)}`);
      }
    }
    return out;
  }
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    const nested = (isMap(item) && Object.keys(item).length > 0) || (Array.isArray(item) && item.length > 0);
    if (nested) {
      out.push(`${pad}${formatKey(key)}:`, ...dumpLines(item, indent + 2));
    } else {
      out.push(`${pad}${formatKey(key)}: ${inlineValue(item)}`);
    }
  }
  return out;
}

function inlineValue(v) {
  if (Array.isArray(v)) return '[]';
  if (isMap(v)) return '{}';
  return formatScalar(v);
}

/** Dependency-free YAML writer; ends with a newline, like `yaml.stringify`. */
function stringifyBuiltin(value) {
  if (!isMap(value) && !Array.isArray(value)) return `${formatScalar(value)}\n`;
  const lines = dumpLines(value, 0);
  return lines.length ? `${lines.join('\n')}\n` : `${inlineValue(value)}\n`;
}

function tryRequire(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

function pick() {
  const yaml = tryRequire('yaml');
  if (yaml) return { parse: yaml.parse, stringify: yaml.stringify };
  const jsYaml = tryRequire('js-yaml');
  if (jsYaml) {
    return {
      parse: (text) => jsYaml.load(text, { schema: jsYaml.CORE_SCHEMA }),
      stringify: (value) => jsYaml.dump(value)
    };
  }
  return { parse: parseBuiltin, stringify: stringifyBuiltin };
}

module.exports = { ...pick(), parseBuiltin, stringifyBuiltin };
