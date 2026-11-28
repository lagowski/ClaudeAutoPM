const fs = require('fs');
const path = require('path');

/**
 * Epic Discovery Utilities
 * Shared utilities for discovering epic directories in both flat and nested structures
 */

/**
 * Helper function to check if directory contains epic.md
 * @param {string} dirPath - Path to check
 * @returns {boolean} - True if directory contains epic.md
 */
function isEpicDir(dirPath) {
  return fs.existsSync(path.join(dirPath, 'epic.md'));
}

/**
 * Recursive function to find all epic directories
 * Supports both flat and nested multi-epic structures
 * @param {string} basePath - Base path to search from
 * @param {number} depth - Current recursion depth (max 3 levels)
 * @returns {Array<{name: string, path: string}>} - Array of epic directories
 */
function findEpicDirs(basePath, depth = 0) {
  if (depth >= 3) {
    if (process.env.DEBUG) {
      console.error(`Maximum recursion depth reached at ${basePath}`);
    }
    return [];
  }

  const epicDirs = [];

  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(basePath, entry.name);

      if (isEpicDir(fullPath)) {
        // This is an epic directory
        const relativePath = path.relative('.claude/epics', fullPath);
        epicDirs.push({ name: relativePath, path: fullPath });
      } else {
        // Check subdirectories (multi-epic structure)
        epicDirs.push(...findEpicDirs(fullPath, depth + 1));
      }
    }
  } catch (err) {
    // Log but don't fail
    if (process.env.DEBUG) {
      console.error(`Error reading directory ${basePath}:`, err.message);
    }
  }

  return epicDirs;
}

/**
 * Find all epic directories supporting both flat and nested structures
 * @returns {Array<{name: string, path: string}>} - Array of epic directories
 */
function findAllEpicDirs() {
  const epicsPath = '.claude/epics';

  if (!fs.existsSync(epicsPath)) {
    return [];
  }

  const epicDirs = [];

  try {
    // First check if top-level directories are epic dirs (flat structure)
    // or if we need to search recursively (nested structure)
    const topLevelEntries = fs.readdirSync(epicsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (const entry of topLevelEntries) {
      const fullPath = path.join(epicsPath, entry.name);

      try {
        // Check if this directory has task files (flat epic) or subdirectories (nested structure)
        const hasTaskFiles = fs.readdirSync(fullPath)
          .some(file => /^\d+.*\.md$/.test(file));

        const hasEpicMd = isEpicDir(fullPath);

        if (hasTaskFiles || hasEpicMd) {
          // This is a flat epic directory (backward compatible with epics without epic.md)
          epicDirs.push({ name: entry.name, path: fullPath });
        } else {
          // This might be a parent directory for nested epics
          epicDirs.push(...findEpicDirs(fullPath, 0));
        }
      } catch (err) {
        // Log but don't fail for unreadable directories
        if (process.env.DEBUG) {
          console.error(`Error checking directory ${fullPath}:`, err.message);
        }
      }
    }
  } catch (err) {
    // Log top-level errors in DEBUG mode
    if (process.env.DEBUG) {
      console.error(`Error in findAllEpicDirs:`, err.message);
    }
  }

  return epicDirs;
}

module.exports = {
  isEpicDir,
  findEpicDirs,
  findAllEpicDirs
};
