/**
 * Security tests for autopm guide command
 * Ensures guide command doesn't execute installation without user consent
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert');

test('autopm guide should NOT execute installation', () => {
  // Create temporary directory for testing
  const tempDir = `/tmp/autopm-guide-test-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const autopmPath = path.join(__dirname, '../../bin/autopm.js');

    // Run guide command
    const output = execSync(`node ${autopmPath} guide`, {
      encoding: 'utf8',
      cwd: tempDir
    });

    // Bare `guide` is deprecated: it points to --help, it does not install
    assert(output.includes('replaced with enhanced help'));
    assert(output.includes('autopm --help'));

    // Should NOT contain installation messages
    assert(!output.includes('Installing ClaudeAutoPM'));
    assert(!output.includes('Choose a configuration preset'));
    assert(!output.includes('Select your project management provider'));

    // Should NOT create .claude directory (installation artifacts)
    assert.strictEqual(fs.existsSync('.claude'), false);
    assert.strictEqual(fs.existsSync('scripts'), false);

    // Bare `guide` generates nothing
    assert.strictEqual(fs.existsSync('docs'), false);
  } finally {
    // Cleanup
    process.chdir(originalCwd);
    execSync(`rm -rf ${tempDir}`);
  }
});

test('autopm guide should suggest installation but not execute it', () => {
  const tempDir = `/tmp/autopm-guide-test-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const autopmPath = path.join(__dirname, '../../bin/autopm.js');

    const output = execSync(`node ${autopmPath} guide`, {
      encoding: 'utf8',
      cwd: tempDir
    });

    // Should suggest next commands (help, doc generation) as next step
    assert(output.includes('autopm --help'));
    assert(output.includes('autopm guide config'));

    // But should NOT actually run installation
    assert.strictEqual(fs.existsSync('.claude'), false);
  } finally {
    process.chdir(originalCwd);
    execSync(`rm -rf ${tempDir}`);
  }
});

test('autopm guide install should create installation guide, not install', () => {
  const tempDir = `/tmp/autopm-guide-test-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const autopmPath = path.join(__dirname, '../../bin/autopm.js');

    const output = execSync(`node ${autopmPath} guide install`, {
      encoding: 'utf8',
      cwd: tempDir
    });

    // Should create installation documentation
    assert(output.includes('Installation guide created'));
    assert(output.includes('docs/INSTALL.md'));

    // Should NOT execute actual installation
    assert.strictEqual(fs.existsSync('.claude'), false);
    assert.strictEqual(fs.existsSync('docs/INSTALL.md'), true);
  } finally {
    process.chdir(originalCwd);
    execSync(`rm -rf ${tempDir}`);
  }
});

test('autopm guide should not modify project files', () => {
  const tempDir = `/tmp/autopm-guide-test-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const autopmPath = path.join(__dirname, '../../bin/autopm.js');

    // Create a test file
    fs.writeFileSync('test-file.txt', 'original content');
    const originalContent = fs.readFileSync('test-file.txt', 'utf8');

    // Run guide command
    execSync(`node ${autopmPath} guide`, {
      encoding: 'utf8',
      cwd: tempDir
    });

    // Test file should remain unchanged
    assert.strictEqual(fs.readFileSync('test-file.txt', 'utf8'), originalContent);

    // Should create nothing (bare `guide` only prints help pointers)
    const files = fs.readdirSync('.');
    assert(!files.includes('docs'));
    assert(files.includes('test-file.txt'));
    assert(!files.includes('.claude'));
    assert(!files.includes('scripts'));
  } finally {
    process.chdir(originalCwd);
    execSync(`rm -rf ${tempDir}`);
  }
});

test('guide command should have proper help text', () => {
  const tempDir = `/tmp/autopm-guide-test-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const originalCwd = process.cwd();

  try {
    process.chdir(tempDir);
    const autopmPath = path.join(__dirname, '../../bin/autopm.js');

    const helpOutput = execSync(`node ${autopmPath} guide --help`, {
      encoding: 'utf8',
      cwd: tempDir
    });

    // Should indicate it's for documentation, not installation
    assert(helpOutput.includes('documentation generator'));
    assert(helpOutput.includes('quickstart'));
    assert(helpOutput.includes('install'));
    assert(helpOutput.includes('config'));

    // Should NOT suggest it installs anything
    assert(!helpOutput.includes('Install ClaudeAutoPM'));
    assert(!helpOutput.includes('will install'));
  } finally {
    process.chdir(originalCwd);
    execSync(`rm -rf ${tempDir}`);
  }
});