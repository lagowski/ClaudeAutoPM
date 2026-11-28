/**
 * The few fs-extra helpers bin/ and lib/ used, on node:fs/promises (#868).
 * One module so tests can jest.mock() a single path.
 */
const fsp = require('node:fs/promises');
const { existsSync } = require('node:fs');

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function readJson(file) {
  return JSON.parse(await fsp.readFile(file, 'utf8'));
}

async function writeJson(file, data, { spaces } = {}) {
  await fsp.writeFile(file, JSON.stringify(data, null, spaces) + '\n');
}

async function copy(src, dest) {
  await fsp.cp(src, dest, { recursive: true });
}

async function remove(p) {
  await fsp.rm(p, { recursive: true, force: true });
}

module.exports = {
  readFile: fsp.readFile,
  writeFile: fsp.writeFile,
  readdir: fsp.readdir,
  stat: fsp.stat,
  existsSync,
  pathExists,
  ensureDir,
  readJson,
  readJSON: readJson,
  writeJson,
  writeJSON: writeJson,
  copy,
  remove
};
