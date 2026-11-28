/**
 * Interactive Guide Tests
 * Tests for the new interactive guide functionality
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Interactive Guide', () => {
  const autopmPath = path.join(__dirname, '../../bin/autopm.js');
  // guide config/install/faq write docs/*.md into the cwd: run the CLI in a
  // scratch dir so the suite never writes into the repo (#858)
  let workDir;
  beforeAll(() => { workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-test-')); });
  afterAll(() => { fs.rmSync(workDir, { recursive: true, force: true }); });

  test('should show help for guide command', () => {
    const result = execSync(`node ${autopmPath} guide --help`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('Interactive setup guide');
    expect(result).toContain('guide');
    expect(result).toContain('quickstart');
    expect(result).toContain('install');
    expect(result).toContain('config');
  });

  test('should show deprecation notice for interactive guide', () => {
    // Interactive guide has been replaced with enhanced help
    const result = execSync(`node ${autopmPath} guide`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('The interactive guide has been replaced');
    expect(result).toContain('autopm --help');
    expect(result).toContain('guide config');
    expect(result).toContain('guide tutorial');
    expect(result).toContain('guide examples');
  });

  test('should generate legacy documentation when specific action provided', () => {
    const result = execSync(`node ${autopmPath} guide config`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('ClaudeAutoPM Documentation Generator');
    expect(result).toContain('Generating Configuration Guide');
    expect(result).toContain('Configuration guide created: docs/CONFIG.md');
  });

  test('should handle install guide generation', () => {
    const result = execSync(`node ${autopmPath} guide install --platform docker`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('ClaudeAutoPM Documentation Generator');
    expect(result).toContain('Generating Installation Guide for docker');
    expect(result).toContain('Installation guide created: docs/INSTALL.md');
    expect(result).toContain('Platform: docker');
  });

  test('should handle FAQ generation', () => {
    const result = execSync(`node ${autopmPath} guide faq`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('ClaudeAutoPM Documentation Generator');
    expect(result).toContain('Generating FAQ Document');
    expect(result).toContain('FAQ created: docs/FAQ.md');
  });

  test('should show deprecation notice even with input', () => {
    // Interactive guide has been deprecated, should show deprecation message
    const result = execSync(`printf "1\\n\\n" | node ${autopmPath} guide`, { encoding: 'utf8', cwd: workDir });

    expect(result).toContain('The interactive guide has been replaced');
    expect(result).toContain('autopm --help');
  });

  test('interactive guide class should be importable', () => {
    const InteractiveGuide = require('../../lib/guide/interactive-guide');
    expect(InteractiveGuide).toBeDefined();
    expect(typeof InteractiveGuide).toBe('function');

    const guide = new InteractiveGuide();
    expect(guide).toBeDefined();
    expect(typeof guide.createFrame).toBe('function');
    expect(typeof guide.createStepFrame).toBe('function');
    expect(typeof guide.isInstalled).toBe('function');
    expect(typeof guide.checkRequirements).toBe('function');
  });

  test('frame creation should work correctly', () => {
    const InteractiveGuide = require('../../lib/guide/interactive-guide');
    const guide = new InteractiveGuide();

    const frame = guide.createFrame('Test content', 'Test Title');

    expect(frame).toContain('┌');
    expect(frame).toContain('┐');
    expect(frame).toContain('└');
    expect(frame).toContain('┘');
    expect(frame).toContain('Test Title');
    expect(frame).toContain('Test content');
  });

  test('step frame creation should work correctly', () => {
    const InteractiveGuide = require('../../lib/guide/interactive-guide');
    const guide = new InteractiveGuide();

    const stepFrame = guide.createStepFrame(
      1,
      'Test Step',
      'Step instructions',
      ['command1', 'command2']
    );

    expect(stepFrame).toContain('STEP 1: Test Step');
    expect(stepFrame).toContain('Step instructions');
    expect(stepFrame).toContain('Commands to run:');
    expect(stepFrame).toContain('$ command1');
    expect(stepFrame).toContain('$ command2');
  });

  test('installation detection should work', () => {
    const InteractiveGuide = require('../../lib/guide/interactive-guide');
    const guide = new InteractiveGuide();

    // Skip in CI - this test assumes we're in development project (AUTOPM/)
    // In CI, we're in a checked-out repo, not an installed AutoPM project
    if (process.env.CI) {
      expect(true).toBe(true); // Placeholder for CI
      return;
    }

    // Should detect installation in AUTOPM project directory
    const isInstalled = guide.isInstalled();
    expect(isInstalled).toBe(true);
  });

  test('requirements check should work', () => {
    const InteractiveGuide = require('../../lib/guide/interactive-guide');
    const guide = new InteractiveGuide();

    const requirements = guide.checkRequirements();
    expect(Array.isArray(requirements)).toBe(true);
    expect(requirements.length).toBeGreaterThan(0);

    // Should check for Node.js, npm, and Git
    const hasNodeCheck = requirements.some(req => req.includes('Node.js'));
    const hasNpmCheck = requirements.some(req => req.includes('npm'));
    const hasGitCheck = requirements.some(req => req.includes('Git'));

    expect(hasNodeCheck).toBe(true);
    expect(hasNpmCheck).toBe(true);
    expect(hasGitCheck).toBe(true);
  });
});