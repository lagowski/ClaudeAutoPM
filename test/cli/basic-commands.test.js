#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Basic AutoPM CLI Test Suite
 *
 * Quick tests for essential CLI functionality
 */

const AUTOPM_BIN = path.join(__dirname, '../../bin/autopm.js');

const execAutopm = (args) => {
  try {
    return {
      success: true,
      output: execSync(`node ${AUTOPM_BIN} ${args}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      })
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.status,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || ''
    };
  }
};

describe('AutoPM CLI Basic Commands', () => {

  it('should show help with --help', () => {
    const result = execAutopm('--help');

    assert(result.success, `Help command failed: ${result.error}`);
    assert(result.output.includes('Commands:'), 'Help should show commands section');
    assert(result.output.includes('install'), 'Help should list install command');
    // pm:init and azure:* left the CLI in the yargs migration (#858)
    for (const cmd of ['update', 'team', 'config', 'epic', 'issue']) {
      assert(result.output.includes(cmd), `Help should list ${cmd} command`);
    }
    console.log('✓ Help command working');
  });

  it('should show version with --version', () => {
    const result = execAutopm('--version');

    assert(result.success, `Version command failed: ${result.error}`);
    assert(/\d+\.\d+\.\d+/.test(result.output), 'Should show version number');
    console.log(`✓ Version: ${result.output.trim()}`);
  });

  it('should show error with no arguments', () => {
    const result = execAutopm('');

    // With yargs, no arguments shows an error message
    assert(!result.success, 'Should fail with no arguments');
    assert(result.code !== 0, 'Should exit with non-zero code for no arguments');
    // Optionally, still check for help hint in output
    const allOutput = (result.stderr || '') + (result.stdout || '');
    assert(allOutput.includes('provide a command') || allOutput.includes('--help'), 'Should show error message with help hint');
    console.log('✓ No arguments handling working');
  });

  it('should handle invalid commands gracefully', () => {
    const result = execAutopm('invalid-command-xyz');

    // Should either show help or give meaningful error
    const hasHelp = (result.output || '').includes('Commands:') || (result.output || '').includes('help');
    const hasError = (result.stderr || '').includes('command') || (result.stderr || '').includes('Unknown') || !result.success;

    assert(hasHelp || hasError, 'Should show help or meaningful error for invalid commands');
    console.log('✓ Invalid command handling working');
  });

});

console.log('🧪 Running Basic CLI Tests...');