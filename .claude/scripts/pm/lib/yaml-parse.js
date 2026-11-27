/**
 * YAML frontmatter parser for the PM engines in an installed project (#899).
 *
 * The generated engine copies in .claude/lib/pm-engines/ require this in place
 * of the `yaml` npm package, which an installed project does not have.
 * Resolution order:
 *   1. `yaml` (if the project installed it)
 *   2. `js-yaml` (in the installed package.json template), core schema so
 *      timestamps stay strings, matching `yaml`
 *   3. a dependency-free parser for the flat frontmatter PM files use
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
  for (const c of body) {
    if (quote) {
      if (c === quote) quote = null;
      current += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      current += c;
    } else if (c === ',') {
      items.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim() !== '') items.push(current);
  return items.map((s) => s.trim());
}

function scalar(raw) {
  const v = stripComment(raw.trim());
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  if (v.startsWith('[') && v.endsWith(']')) {
    return splitInline(v.slice(1, -1)).map(scalar);
  }
  return v;
}

/** Parse flat frontmatter: scalars, inline lists, block lists, one-level maps. */
function parseBuiltin(text) {
  const result = {};
  let parentKey = null;
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (/^\s/.test(line) && parentKey) {
      if (trimmed === '-' || trimmed.startsWith('- ')) {
        if (result[parentKey] === null) result[parentKey] = [];
        if (Array.isArray(result[parentKey])) result[parentKey].push(scalar(trimmed.slice(1)));
        continue;
      }
      const m = trimmed.match(/^([^:]+):(.*)$/);
      if (m) {
        if (result[parentKey] === null) result[parentKey] = {};
        if (!Array.isArray(result[parentKey])) result[parentKey][m[1].trim()] = scalar(m[2]);
      }
      continue;
    }

    const m = trimmed.match(/^([^:]+):(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = scalar(m[2]);
    result[key] = value;
    parentKey = value === null ? key : null;
  }
  return result;
}

function pickParser() {
  try {
    return require('yaml').parse;
  } catch {
    /* not installed */
  }
  try {
    const jsYaml = require('js-yaml');
    return (text) => jsYaml.load(text, { schema: jsYaml.CORE_SCHEMA });
  } catch {
    /* not installed */
  }
  return parseBuiltin;
}

module.exports = { parse: pickParser(), parseBuiltin };
