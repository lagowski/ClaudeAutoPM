/**
 * Jest TDD Tests for PM Release Script (release.js)
 *
 * Comprehensive test suite covering all functionality of the release.js script
 * Target: Improve coverage from 20.43% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');
const ReleaseManager = require('../../autopm/.claude/scripts/pm/release.js');

// Mock child_process for controlled testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock readline for controlled testing
jest.mock('readline', () => ({
  createInterface: jest.fn()
}));

describe('PM Release Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let releaseManager;
  let mockExecSync;
  let mockRl;
  let originalExit;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-release-jest-'));
    process.chdir(tempDir);

    // Create ReleaseManager instance
    releaseManager = new ReleaseManager();

    // Setup mocks
    mockExecSync = require('child_process').execSync;
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockRl);

    // Mock process.exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Create default package.json
    const defaultPackage = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package for release'
    };
    fs.writeFileSync('package.json', JSON.stringify(defaultPackage, null, 2));
  });

  afterEach(() => {
    // Restore environment
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  describe('ReleaseManager Class Initialization', () => {
    test('should initialize with correct file paths', () => {
      expect(releaseManager.packageFile).toBe('package.json');
      expect(releaseManager.changelogFile).toBe('CHANGELOG.md');
    });

    test('should be instantiatable', () => {
      expect(releaseManager).toBeInstanceOf(ReleaseManager);
      expect(typeof releaseManager.execCommand).toBe('function');
      expect(typeof releaseManager.getPackageInfo).toBe('function');
      expect(typeof releaseManager.getCurrentVersion).toBe('function');
      expect(typeof releaseManager.parseVersion).toBe('function');
      expect(typeof releaseManager.incrementVersion).toBe('function');
      expect(typeof releaseManager.createRelease).toBe('function');
      expect(typeof releaseManager.run).toBe('function');
    });
  });

  describe('Command Execution - execCommand Method', () => {
    test('should execute command and return output', () => {
      mockExecSync.mockReturnValue('command output\n');

      const result = releaseManager.execCommand('test command');

      expect(mockExecSync).toHaveBeenCalledWith('test command', { encoding: 'utf8' });
      expect(result).toBe('command output');
    });

    test('should handle command with options', () => {
      mockExecSync.mockReturnValue('output with options\n');

      const result = releaseManager.execCommand('test command', { cwd: '/tmp' });

      expect(mockExecSync).toHaveBeenCalledWith('test command', { encoding: 'utf8', cwd: '/tmp' });
      expect(result).toBe('output with options');
    });

    test('should throw error by default when command fails', () => {
      const testError = new Error('Command failed');
      mockExecSync.mockImplementation(() => {
        throw testError;
      });

      expect(() => {
        releaseManager.execCommand('failing command');
      }).toThrow('Command failed');
    });

    test('should return null when ignoreError is true', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = releaseManager.execCommand('failing command', { ignoreError: true });

      expect(result).toBeNull();
    });

    test('should trim whitespace from output', () => {
      mockExecSync.mockReturnValue('  output with spaces  \n\t  ');

      const result = releaseManager.execCommand('test command');

      expect(result).toBe('output with spaces');
    });
  });

  describe('Package Information - getPackageInfo Method', () => {
    test('should read package information from package.json', () => {
      const packageInfo = releaseManager.getPackageInfo();

      expect(packageInfo).toEqual({
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package for release'
      });
    });

    test('should throw error when package.json does not exist', () => {
      fs.unlinkSync('package.json');

      expect(() => {
        releaseManager.getPackageInfo();
      }).toThrow('package.json not found');
    });

    test('should handle package.json without description', () => {
      const packageData = {
        name: 'minimal-package',
        version: '2.0.0'
      };
      fs.writeFileSync('package.json', JSON.stringify(packageData));

      const packageInfo = releaseManager.getPackageInfo();

      expect(packageInfo).toEqual({
        name: 'minimal-package',
        version: '2.0.0',
        description: undefined
      });
    });

    test('should throw error for invalid JSON in package.json', () => {
      fs.writeFileSync('package.json', 'invalid json {');

      expect(() => {
        releaseManager.getPackageInfo();
      }).toThrow();
    });
  });

  describe('Version Management - getCurrentVersion Method', () => {
    test('should return current version from package.json', () => {
      const version = releaseManager.getCurrentVersion();

      expect(version).toBe('1.0.0');
    });

    test('should handle different version formats', () => {
      const packageData = {
        name: 'test',
        version: '2.5.3'
      };
      fs.writeFileSync('package.json', JSON.stringify(packageData));

      const version = releaseManager.getCurrentVersion();

      expect(version).toBe('2.5.3');
    });
  });

  describe('Version Parsing - parseVersion Method', () => {
    test('should parse standard semantic version', () => {
      const parsed = releaseManager.parseVersion('1.2.3');

      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null
      });
    });

    test('should parse version with prerelease', () => {
      const parsed = releaseManager.parseVersion('1.2.3-beta.1');

      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1'
      });
    });

    test('should parse version with alpha prerelease', () => {
      const parsed = releaseManager.parseVersion('2.0.0-alpha.5');

      expect(parsed).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.5'
      });
    });

    test('should throw error for invalid version format', () => {
      expect(() => {
        releaseManager.parseVersion('invalid.version');
      }).toThrow('Invalid version format: invalid.version');

      expect(() => {
        releaseManager.parseVersion('1.2');
      }).toThrow('Invalid version format: 1.2');

      expect(() => {
        releaseManager.parseVersion('1.2.3.4');
      }).toThrow('Invalid version format: 1.2.3.4');
    });

    test('should handle edge case versions', () => {
      const parsed1 = releaseManager.parseVersion('0.0.1');
      expect(parsed1).toEqual({ major: 0, minor: 0, patch: 1, prerelease: null });

      const parsed2 = releaseManager.parseVersion('10.20.30');
      expect(parsed2).toEqual({ major: 10, minor: 20, patch: 30, prerelease: null });
    });
  });

  describe('Version Increment - incrementVersion Method', () => {
    test('should increment major version', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3', 'major');
      expect(newVersion).toBe('2.0.0');
    });

    test('should increment minor version', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3', 'minor');
      expect(newVersion).toBe('1.3.0');
    });

    test('should increment patch version', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3', 'patch');
      expect(newVersion).toBe('1.2.4');
    });

    test('should create prerelease version from stable', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3', 'prerelease');
      expect(newVersion).toBe('1.2.3-beta.1');
    });

    test('should increment existing prerelease version', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3-beta.1', 'prerelease');
      expect(newVersion).toBe('1.2.3-beta.2');
    });

    test('should handle prerelease without number', () => {
      const newVersion = releaseManager.incrementVersion('1.2.3-beta', 'prerelease');
      expect(newVersion).toBe('1.2.3-beta.1');
    });

    test('should handle large version numbers', () => {
      const newVersion = releaseManager.incrementVersion('99.99.99', 'major');
      expect(newVersion).toBe('100.0.0');
    });

    test('should throw error for invalid version type', () => {
      expect(() => {
        releaseManager.incrementVersion('1.2.3', 'invalid');
      }).toThrow('Invalid version type: invalid');
    });
  });

  describe('Git Status - getGitStatus Method', () => {
    test('should return empty array when no changes', () => {
      mockExecSync.mockReturnValue('');

      const status = releaseManager.getGitStatus();

      expect(status).toEqual([]);
      expect(mockExecSync).toHaveBeenCalledWith('git status --short');
    });

    test('should return array of changes', () => {
      mockExecSync.mockReturnValue('M  file1.js\nA  file2.js\n?? file3.js');

      const status = releaseManager.getGitStatus();

      expect(status).toEqual(['M  file1.js', 'A  file2.js', '?? file3.js']);
    });

    test('should handle single change', () => {
      mockExecSync.mockReturnValue('M  single-file.js');

      const status = releaseManager.getGitStatus();

      expect(status).toEqual(['M  single-file.js']);
    });
  });

  describe('Git Commits - getRecentCommits Method', () => {
    test('should return empty array when no commits', () => {
      mockExecSync.mockReturnValue('');

      const commits = releaseManager.getRecentCommits('v1.0.0');

      expect(commits).toEqual([]);
      expect(mockExecSync).toHaveBeenCalledWith('git log --oneline --pretty=format:"%h %s" v1.0.0..HEAD');
    });

    test('should return array of commits', () => {
      mockExecSync.mockReturnValue('abc123 feat: add new feature\ndef456 fix: bug fix\n789ghi docs: update readme');

      const commits = releaseManager.getRecentCommits('v1.0.0');

      expect(commits).toEqual([
        'abc123 feat: add new feature',
        'def456 fix: bug fix',
        '789ghi docs: update readme'
      ]);
    });

    test('should handle git command failure gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      const commits = releaseManager.getRecentCommits('v1.0.0');

      expect(commits).toEqual([]);
    });

    test('should handle single commit', () => {
      mockExecSync.mockReturnValue('abc123 feat: single commit');

      const commits = releaseManager.getRecentCommits('v1.0.0');

      expect(commits).toEqual(['abc123 feat: single commit']);
    });
  });

  describe('Commit Categorization - categorizeCommits Method', () => {
    test('should categorize conventional commits correctly', () => {
      const commits = [
        'abc123 feat: add new feature',
        'def456 feat(api): add endpoint',
        'ghi789 fix: resolve bug',
        'jkl012 fix(ui): button styling',
        'mno345 docs: update readme',
        'pqr678 docs(api): add documentation',
        'stu901 chore: update dependencies',
        'vwx234 chore(build): update webpack',
        'yz567 regular commit message'
      ];

      const categorized = releaseManager.categorizeCommits(commits);

      expect(categorized.features).toEqual([
        'feat: add new feature',
        'feat(api): add endpoint'
      ]);
      expect(categorized.fixes).toEqual([
        'fix: resolve bug',
        'fix(ui): button styling'
      ]);
      expect(categorized.docs).toEqual([
        'docs: update readme',
        'docs(api): add documentation'
      ]);
      expect(categorized.chore).toEqual([
        'chore: update dependencies',
        'chore(build): update webpack'
      ]);
      expect(categorized.other).toEqual([
        'regular commit message'
      ]);
    });

    test('should handle empty commits array', () => {
      const categorized = releaseManager.categorizeCommits([]);

      expect(categorized.features).toEqual([]);
      expect(categorized.fixes).toEqual([]);
      expect(categorized.docs).toEqual([]);
      expect(categorized.chore).toEqual([]);
      expect(categorized.other).toEqual([]);
    });

    test('should handle malformed commit messages', () => {
      const commits = [
        'invalid commit format',
        '',
        'abc123',
        'def456 normal message'
      ];

      const categorized = releaseManager.categorizeCommits(commits);

      expect(categorized.other).toEqual(['normal message']);
      expect(categorized.features).toEqual([]);
    });

    test('should handle commits without conventional prefix', () => {
      const commits = [
        'abc123 Add new feature',
        'def456 Bug fix for login',
        'ghi789 Update documentation'
      ];

      const categorized = releaseManager.categorizeCommits(commits);

      expect(categorized.other).toEqual([
        'Add new feature',
        'Bug fix for login',
        'Update documentation'
      ]);
    });
  });

  describe('Changelog Generation - generateChangelog Method', () => {
    test('should generate changelog with all categories', () => {
      const commits = [
        'abc123 feat: add feature A',
        'def456 fix: fix bug B',
        'ghi789 docs: update docs C',
        'jkl012 chore: update deps D',
        'mno345 other change E'
      ];

      const changelog = releaseManager.generateChangelog('1.1.0', commits);

      expect(changelog).toContain('## [1.1.0] - ');
      expect(changelog).toContain('### ✨ Features');
      expect(changelog).toContain('- feat: add feature A');
      expect(changelog).toContain('### 🐛 Bug Fixes');
      expect(changelog).toContain('- fix: fix bug B');
      expect(changelog).toContain('### 📚 Documentation');
      expect(changelog).toContain('- docs: update docs C');
      expect(changelog).toContain('### 🔧 Maintenance');
      expect(changelog).toContain('- chore: update deps D');
      expect(changelog).toContain('### Other Changes');
      expect(changelog).toContain('- other change E');
    });

    test('should include current date in changelog', () => {
      const changelog = releaseManager.generateChangelog('1.1.0', []);
      const today = new Date().toISOString().split('T')[0];

      expect(changelog).toContain(`## [1.1.0] - ${today}`);
    });

    test('should handle empty commits gracefully', () => {
      const changelog = releaseManager.generateChangelog('1.1.0', []);

      expect(changelog).toContain('## [1.1.0] - ');
      expect(changelog).not.toContain('### ✨ Features');
      expect(changelog).not.toContain('### 🐛 Bug Fixes');
    });

    test('should only include sections with content', () => {
      const commits = [
        'abc123 feat: only feature'
      ];

      const changelog = releaseManager.generateChangelog('1.1.0', commits);

      expect(changelog).toContain('### ✨ Features');
      expect(changelog).not.toContain('### 🐛 Bug Fixes');
      expect(changelog).not.toContain('### 📚 Documentation');
    });
  });

  describe('Changelog Update - updateChangelog Method', () => {
    test('should create new changelog file', () => {
      const newEntry = '## [1.1.0] - 2023-01-01\n\n### Features\n- New feature\n\n';

      releaseManager.updateChangelog(newEntry);

      expect(fs.existsSync('CHANGELOG.md')).toBe(true);
      const content = fs.readFileSync('CHANGELOG.md', 'utf8');
      expect(content).toContain('# Changelog');
      expect(content).toContain('## [1.1.0] - 2023-01-01');
      expect(content).toContain('- New feature');
    });

    test('should insert entry into existing changelog', () => {
      const existingChangelog = `# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2023-01-01

### Features
- Initial release
`;

      fs.writeFileSync('CHANGELOG.md', existingChangelog);

      const newEntry = '## [1.1.0] - 2023-01-02\n\n### Features\n- New feature\n\n';
      releaseManager.updateChangelog(newEntry);

      const content = fs.readFileSync('CHANGELOG.md', 'utf8');
      expect(content).toContain('## [1.1.0] - 2023-01-02');
      expect(content).toContain('## [1.0.0] - 2023-01-01');
      expect(content.indexOf('## [1.1.0]')).toBeLessThan(content.indexOf('## [1.0.0]'));
    });

    test('should handle changelog without existing entries', () => {
      const existingChangelog = `# Changelog

All notable changes to this project will be documented in this file.

`;

      fs.writeFileSync('CHANGELOG.md', existingChangelog);

      const newEntry = '## [1.0.0] - 2023-01-01\n\n### Features\n- Initial feature\n\n';
      releaseManager.updateChangelog(newEntry);

      const content = fs.readFileSync('CHANGELOG.md', 'utf8');
      expect(content).toContain('## [1.0.0] - 2023-01-01');
    });
  });

  describe('Package Version Update - updatePackageVersion Method', () => {
    test('should update version in package.json', () => {
      releaseManager.updatePackageVersion('1.1.0');

      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(packageData.version).toBe('1.1.0');
      expect(packageData.name).toBe('test-package'); // Should preserve other fields
    });

    test('should maintain package.json formatting', () => {
      releaseManager.updatePackageVersion('2.0.0');

      const content = fs.readFileSync('package.json', 'utf8');
      expect(content).toMatch(/\n$/); // Should end with newline
      expect(content).toContain('  '); // Should maintain indentation
    });

    test('should handle complex package.json', () => {
      const complexPackage = {
        name: 'complex-package',
        version: '1.0.0',
        description: 'Complex package',
        scripts: {
          test: 'jest',
          build: 'webpack'
        },
        dependencies: {
          'some-dep': '^1.0.0'
        }
      };

      fs.writeFileSync('package.json', JSON.stringify(complexPackage, null, 2));

      releaseManager.updatePackageVersion('1.5.0');

      const updatedPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(updatedPackage.version).toBe('1.5.0');
      expect(updatedPackage.scripts).toEqual(complexPackage.scripts);
      expect(updatedPackage.dependencies).toEqual(complexPackage.dependencies);
    });
  });

  describe('Release Creation - createRelease Method', () => {
    beforeEach(() => {
      // Setup default git mocks
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature\ndef456 fix: bug fix';
        }
        return '';
      });
    });

    test('should create release with clean git status', async () => {
      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git status --short');
    });

    test('should fail with uncommitted changes', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return 'M  modified-file.js\n?? untracked-file.js';
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ You have uncommitted changes:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  M  modified-file.js');
      expect(consoleLogSpy).toHaveBeenCalledWith('  ?? untracked-file.js');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    test('should allow dirty working directory with allowDirty option', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return 'M  modified-file.js';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch', { allowDirty: true, yes: true });

      expect(result).toBe(true);
    });

    test('should handle dry run mode', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await releaseManager.createRelease('patch', { dryRun: true });

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🔍 DRY RUN - No changes will be made');
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('git add'));

      consoleLogSpy.mockRestore();
    });

    test('should prompt for confirmation when yes option not provided', async () => {
      mockRl.question.mockImplementation((question, callback) => {
        callback('y');
      });

      const result = await releaseManager.createRelease('patch');

      expect(result).toBe(true);
      expect(mockRl.question).toHaveBeenCalled();
      expect(mockRl.close).toHaveBeenCalled();
    });

    test('should cancel release when user declines', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRl.question.mockImplementation((question, callback) => {
        callback('n');
      });

      const result = await releaseManager.createRelease('patch');

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith('Release cancelled.');

      consoleLogSpy.mockRestore();
    });

    test('should use custom version when provided', async () => {
      const result = await releaseManager.createRelease('patch', { version: '2.5.7', yes: true });

      expect(result).toBe(true);
      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(packageData.version).toBe('2.5.7');
    });

    test('should create git commit and tag', async () => {
      await releaseManager.createRelease('patch', { yes: true });

      expect(mockExecSync).toHaveBeenCalledWith('git add package.json CHANGELOG.md');
      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "chore: release v1.0.1"');
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('git tag -a v1.0.1'));
    });

    test('should push to remote by default', async () => {
      await releaseManager.createRelease('patch', { yes: true });

      expect(mockExecSync).toHaveBeenCalledWith('git push');
      expect(mockExecSync).toHaveBeenCalledWith('git push --tags');
    });

    test('should skip push when noPush option is true', async () => {
      await releaseManager.createRelease('patch', { yes: true, noPush: true });

      expect(mockExecSync).not.toHaveBeenCalledWith('git push');
      expect(mockExecSync).not.toHaveBeenCalledWith('git push --tags');
    });

    test('should create GitHub release when gh CLI available', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        if (command.includes('which gh')) {
          return '/usr/bin/gh';
        }
        if (command.includes('gh release create')) {
          return 'Release created';
        }
        return '';
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await releaseManager.createRelease('patch', { yes: true });

      expect(mockExecSync).toHaveBeenCalledWith('which gh', { ignoreError: false });
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('gh release create v1.0.1'));
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ GitHub release created');

      consoleLogSpy.mockRestore();
    });

    test('should skip GitHub release when gh CLI not available', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        if (command.includes('which gh')) {
          throw new Error('gh not found');
        }
        return '';
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await releaseManager.createRelease('patch', { yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  GitHub CLI not available, skipping GitHub release');

      consoleLogSpy.mockRestore();
    });

    test('should skip GitHub release when noGithub option is true', async () => {
      await releaseManager.createRelease('patch', { yes: true, noGithub: true });

      expect(mockExecSync).not.toHaveBeenCalledWith('which gh', { ignoreError: false });
    });

    test('should publish to npm when publish option is true', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await releaseManager.createRelease('patch', { yes: true, publish: true });

      expect(mockExecSync).toHaveBeenCalledWith('npm publish');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Published to npm');

      consoleLogSpy.mockRestore();
    });

    test('should rollback on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        if (command.includes('git add') || command.includes('git commit')) {
          throw new Error('Git operation failed');
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Release failed:', 'Git operation failed');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n⚠️  Rolling back changes...');
      expect(mockExecSync).toHaveBeenCalledWith('git reset --hard HEAD~1');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('CLI Argument Parsing - run Method', () => {
    test('should handle help argument', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await releaseManager.run(['--help']);

      expect(consoleLogSpy).toHaveBeenCalledWith('Usage: pm release [type] [options]');
      expect(process.exit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    test('should handle version types', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        return '';
      });

      await releaseManager.run(['major', '--yes']);

      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(packageData.version).toBe('2.0.0');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle custom version argument', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        return '';
      });

      await releaseManager.run(['--version', '3.5.7', '--yes']);

      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(packageData.version).toBe('3.5.7');
    });

    test('should handle multiple options', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return 'M  file.js';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: new feature';
        }
        return '';
      });

      await releaseManager.run(['minor', '--allow-dirty', '--yes', '--no-push', '--dry-run']);

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should exit with error code on failure', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return 'M  file.js'; // Uncommitted changes
        }
        return '';
      });

      await releaseManager.run(['patch']);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock createRelease to throw error
      const originalCreateRelease = releaseManager.createRelease;
      releaseManager.createRelease = jest.fn().mockRejectedValue(new Error('Test error'));

      await releaseManager.run(['patch']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Test error');
      expect(process.exit).toHaveBeenCalledWith(1);

      // Restore
      releaseManager.createRelease = originalCreateRelease;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Module Export and CLI Integration', () => {
    test('should export ReleaseManager class', () => {
      expect(ReleaseManager).toBeDefined();
      expect(typeof ReleaseManager).toBe('function');
      expect(ReleaseManager.prototype.createRelease).toBeDefined();
      expect(ReleaseManager.prototype.run).toBeDefined();
    });

    test('should be executable as CLI script', () => {
      // Test that the module can be required without throwing
      expect(() => {
        require('../../autopm/.claude/scripts/pm/release.js');
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing last tag gracefully', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          throw new Error('No tags found');
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: recent commit';
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git log --oneline --pretty=format:"%h %s" HEAD~20..HEAD');
    });

    test('should handle changelog with special characters', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: add "quotes" and \'apostrophes\'';
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining('git tag -a v1.0.1'));
    });

    test('should handle very long commit messages', async () => {
      const longMessage = 'feat: ' + 'a'.repeat(500);

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return `abc123 ${longMessage}`;
        }
        return '';
      });

      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(true);
      const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
      expect(changelog).toContain(longMessage);
    });

    test('should handle prerelease version increments correctly', async () => {
      const packageData = {
        name: 'test-package',
        version: '1.0.0-beta.5'
      };
      fs.writeFileSync('package.json', JSON.stringify(packageData, null, 2));

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0-beta.4';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: beta feature';
        }
        return '';
      });

      const result = await releaseManager.createRelease('prerelease', { yes: true });

      expect(result).toBe(true);
      const updatedPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(updatedPackage.version).toBe('1.0.0-beta.6');
    });

    test('should handle filesystem permission errors during file operations', async () => {
      const originalWriteFileSync = fs.writeFileSync;

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git status --short')) {
          return '';
        }
        if (command.includes('git describe --tags --abbrev=0')) {
          return 'v1.0.0';
        }
        if (command.includes('git log --oneline')) {
          return 'abc123 feat: test feature';
        }
        return '';
      });

      // Mock writeFileSync to throw on package.json update
      fs.writeFileSync = jest.fn().mockImplementation((filename, data) => {
        if (filename === 'package.json') {
          throw new Error('Permission denied');
        }
        return originalWriteFileSync(filename, data);
      });

      const result = await releaseManager.createRelease('patch', { yes: true });

      expect(result).toBe(false);

      // Restore
      fs.writeFileSync = originalWriteFileSync;
    });
  });
});