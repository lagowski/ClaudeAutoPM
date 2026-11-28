#!/usr/bin/env node
/**
 * Sync shared scripts from their single source of truth into their consumers.
 * Default jobs:
 *
 *   - packages/plugin-core/scripts   -> autopm/.claude/scripts, .claude/scripts
 *   - packages/plugin-pm/scripts/pm  -> autopm/.claude/scripts/pm
 *   - lib/<pm engine>.js             -> autopm/.claude/lib/pm-engines/ (generated:
 *     require paths rewritten for the installed layout, `yaml` swapped for the
 *     dependency-free scripts/pm/lib/yaml-parse.js; #899)
 *
 * The autopm payload is what `autopm install` ships to user projects; .claude/
 * is this repo's own installed copy.
 *
 * Usage:
 *   node scripts/sync-plugin-scripts.js            # copy (repair) targets
 *   node scripts/sync-plugin-scripts.js --check    # report divergence, exit 1
 *
 * Options (mainly for tests):
 *   --source <dir>    override source directory
 *   --target <dir>    override target directory (repeatable)
 *
 * Only files present in the source tree (or a job's file list) are managed;
 * consumer-specific files are left untouched. No dependencies.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Recursively list relative file paths under dir (POSIX separators). */
function collectFiles(dir, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files.sort();
}

/** PM engines generated from lib/ into autopm/.claude/lib/pm-engines (#848, #899). */
const PM_ENGINES = [
  'analytics-engine.js',
  'batch-processor-integration.js',
  'batch-processor.js',
  'burndown-chart.js',
  'dependency-analyzer.js',
  'filter-engine.js'
];

/** Rewrite a lib/ engine for <proj>/.claude/lib/pm-engines/. */
function engineTransform(content, rel) {
  const rewritten = content
    .replace("require('../.claude/scripts/pm-sync-upload-local')", "require('../../scripts/pm-sync-upload-local')")
    .replace("require('yaml')", "require('../../scripts/pm/lib/yaml-parse')");
  return Buffer.from(
    `// GENERATED from lib/${rel} by scripts/sync-plugin-scripts.js (npm run sync:scripts). Do not edit.\n` +
      rewritten
  );
}

/** Expected bytes of a target file. */
function render(sourceDir, rel, transform) {
  const buf = fs.readFileSync(path.join(sourceDir, rel));
  return transform ? transform(buf.toString('utf8'), rel) : buf;
}

/** Copy every source file into each target, preserving permission bits. */
function syncScripts({ sourceDir, targetDirs, files: only, transform }) {
  const copied = [];
  const files = only || collectFiles(sourceDir);
  for (const target of targetDirs) {
    for (const rel of files) {
      const src = path.join(sourceDir, rel);
      const dst = path.join(target, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, render(sourceDir, rel, transform));
      fs.chmodSync(dst, fs.statSync(src).mode & 0o777);
      copied.push({ target, file: rel });
    }
  }
  return { files, copied };
}

/** Compare targets against source. Reasons: missing | content | mode. */
function checkSync({ sourceDir, targetDirs, files: only, transform }) {
  const diverged = [];
  const files = only || collectFiles(sourceDir);
  for (const target of targetDirs) {
    for (const rel of files) {
      const src = path.join(sourceDir, rel);
      const dst = path.join(target, rel);
      if (!fs.existsSync(dst)) {
        diverged.push({ target, file: rel, reason: 'missing' });
      } else if (!render(sourceDir, rel, transform).equals(fs.readFileSync(dst))) {
        diverged.push({ target, file: rel, reason: 'content' });
      } else if ((fs.statSync(src).mode & 0o777) !== (fs.statSync(dst).mode & 0o777)) {
        diverged.push({ target, file: rel, reason: 'mode' });
      }
    }
  }
  return { files, diverged };
}

function parseArgs(argv) {
  const repoRoot = path.resolve(__dirname, '..');
  const opts = { check: false, sourceDir: null, targetDirs: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
    else if (arg === '--source') opts.sourceDir = path.resolve(argv[++i]);
    else if (arg === '--target') opts.targetDirs.push(path.resolve(argv[++i]));
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (opts.sourceDir || opts.targetDirs.length > 0) {
    opts.sourceDir = opts.sourceDir || path.join(repoRoot, 'packages', 'plugin-core', 'scripts');
    if (opts.targetDirs.length === 0) {
      opts.targetDirs = [path.join(repoRoot, 'autopm', '.claude', 'scripts'), path.join(repoRoot, '.claude', 'scripts')];
    }
    opts.jobs = [{ sourceDir: opts.sourceDir, targetDirs: opts.targetDirs }];
    return opts;
  }
  opts.jobs = [
    {
      sourceDir: path.join(repoRoot, 'packages', 'plugin-core', 'scripts'),
      targetDirs: [path.join(repoRoot, 'autopm', '.claude', 'scripts'), path.join(repoRoot, '.claude', 'scripts')]
    },
    {
      sourceDir: path.join(repoRoot, 'packages', 'plugin-pm', 'scripts', 'pm'),
      // Only the shipped payload: this repo's own .claude/ has never carried pm/ (#899).
      targetDirs: [path.join(repoRoot, 'autopm', '.claude', 'scripts', 'pm')]
    },
    {
      sourceDir: path.join(repoRoot, 'lib'),
      targetDirs: [path.join(repoRoot, 'autopm', '.claude', 'lib', 'pm-engines')],
      files: PM_ENGINES,
      transform: engineTransform
    }
  ];
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.check) {
    let failed = false;
    for (const job of opts.jobs) {
      const { files, diverged } = checkSync(job);
      if (diverged.length > 0) {
        failed = true;
        console.error(`❌ Copies diverged from ${job.sourceDir}:`);
        for (const d of diverged) {
          console.error(`  - ${path.join(d.target, d.file)} (${d.reason})`);
        }
      } else {
        console.log(`✅ In sync: ${files.length} files x ${job.targetDirs.length} targets from ${job.sourceDir}`);
      }
    }
    if (failed) {
      console.error('Fix with: npm run sync:scripts');
      process.exit(1);
    }
    return;
  }

  for (const job of opts.jobs) {
    const { files } = syncScripts(job);
    console.log(`✅ Synced ${files.length} files to ${job.targetDirs.length} targets from ${job.sourceDir}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectFiles, syncScripts, checkSync, parseArgs, engineTransform, PM_ENGINES };
