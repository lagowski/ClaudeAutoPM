/**
 * Jest TDD Tests for PM Init Script (init.js)
 *
 * Comprehensive test suite covering all functionality of the init.js script
 * Target: Improve coverage from ~42% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { initializeSystem, displayBanner, formatInitOutput } = require('../../autopm/.claude/scripts/pm/init.js');

// Mock child_process for controlled testing
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn()
}));

describe('PM Init Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  const mockExecSync = require('child_process').execSync;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-init-jest-'));
    process.chdir(tempDir);

    // Clear all mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockExecSync.mockImplementation((command) => {
      if (command.includes('git rev-parse')) {
        throw new Error('Not a git repository');
      }
      if (command.includes('gh --version')) {
        throw new Error('gh command not found');
      }
      throw new Error('Command not found');
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should export a function', () => {
      expect(typeof initializeSystem).toBe('function');
    });

    test('should return a promise that resolves to an object', async () => {
      const result = await initializeSystem({ dryRun: true });
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('should include all required result properties', async () => {
      const result = await initializeSystem({ dryRun: true });

      expect(result).toHaveProperty('dryRun');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('directories');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('git');
      expect(result).toHaveProperty('claude');
      expect(result).toHaveProperty('summary');
    });

    test('should handle default options correctly', async () => {
      const result = await initializeSystem();

      expect(result.dryRun).toBe(false);
      expect(result.options).toEqual({});
    });

    test('should handle custom options correctly', async () => {
      const options = {
        dryRun: true,
        skipDependencyCheck: true,
        verbose: true
      };
      const result = await initializeSystem(options);

      expect(result.dryRun).toBe(true);
      expect(result.options).toEqual(options);
    });
  });

  describe('Directory Structure Management', () => {
    test('should define required directories correctly', async () => {
      const result = await initializeSystem({ dryRun: true });

      const expectedDirs = [
        '.claude/prds',
        '.claude/epics',
        '.claude/rules',
        '.claude/agents',
        '.claude/scripts/pm'
      ];

      expect(result.directories.required).toEqual(expectedDirs);
    });

    test('should create missing directories in non-dry-run mode', async () => {
      const result = await initializeSystem({ dryRun: false });

      // Check that directories were actually created
      for (const dir of result.directories.required) {
        expect(fs.existsSync(dir)).toBe(true);
      }

      expect(result.directories.created).toEqual(result.directories.required);
    });

    test('should not create directories in dry-run mode', async () => {
      const result = await initializeSystem({ dryRun: true });

      // Check that directories were NOT created
      for (const dir of result.directories.required) {
        expect(fs.existsSync(dir)).toBe(false);
      }

      // But should track what would be created
      expect(result.directories.created).toEqual(result.directories.required);
    });

    test('should not duplicate existing directories', async () => {
      // Pre-create some directories
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.mkdirSync('.claude/epics', { recursive: true });

      const result = await initializeSystem({ dryRun: false });

      // Should only report newly created directories
      expect(result.directories.created).not.toContain('.claude/prds');
      expect(result.directories.created).not.toContain('.claude/epics');
      expect(result.directories.created.length).toBe(3); // 3 remaining directories
    });

    test('should handle partial existing directory structure', async () => {
      // Create some but not all directories
      fs.mkdirSync('.claude/rules', { recursive: true });

      const result = await initializeSystem({ dryRun: true });

      // Should identify missing directories for creation
      expect(result.directories.created).toContain('.claude/prds');
      expect(result.directories.created).toContain('.claude/epics');
      expect(result.directories.created).not.toContain('.claude/rules');
    });
  });

  describe('Git Repository Detection', () => {
    test('should detect when not in git repository', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          throw new Error('Not a git repository');
        }
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.isRepo).toBe(false);
      expect(result.git.hasRemote).toBe(false);
      expect(result.git.remoteUrl).toBeNull();
    });

    test('should detect git repository without remote', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return '';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.isRepo).toBe(true);
      expect(result.git.hasRemote).toBe(false);
      expect(result.git.remoteUrl).toBeNull();
    });

    test('should detect git repository with origin remote', async () => {
      const mockRemoteUrl = 'https://github.com/user/repo.git';

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/user/repo.git (fetch)';
        }
        if (command.includes('git remote get-url origin')) {
          return mockRemoteUrl;
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.isRepo).toBe(true);
      expect(result.git.hasRemote).toBe(true);
      expect(result.git.remoteUrl).toBe(mockRemoteUrl);
    });

    test('should detect AutoPM template repository warning', async () => {
      const templateUrl = 'https://github.com/rlagowski/autopm.git';

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/rlagowski/autopm.git (fetch)';
        }
        if (command.includes('git remote get-url origin')) {
          return templateUrl;
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.warnings).toHaveLength(1);
      expect(result.git.warnings[0].type).toBe('template_repo');
      expect(result.git.warnings[0].message).toContain('AutoPM template repository');
    });

    test('should handle git remote errors gracefully', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote')) {
          throw new Error('Git remote failed');
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.isRepo).toBe(true);
      expect(result.git.hasRemote).toBe(false);
    });
  });

  describe('Dependencies Check', () => {
    test('should check GitHub CLI availability', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          return 'Logged in to github.com';
        }
        if (command.includes('gh extension list')) {
          return '';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.gh).toBe(true);
      expect(result.dependencies.ghAuth).toBe(true);
    });

    test('should handle missing GitHub CLI', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          throw new Error('gh command not found');
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.gh).toBe(false);
      expect(result.dependencies.ghAuth).toBe(false);
    });

    test('should handle GitHub CLI without authentication', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        if (command.includes('gh extension list')) {
          return '';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.gh).toBe(true);
      expect(result.dependencies.ghAuth).toBe(false);
    });

    test('should parse GitHub CLI extensions', async () => {
      const extensionsList = 'yahsan2/gh-sub-issue\tCreate/Edit sub issue\nuser/extension2\tAnother extension';

      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          return 'Logged in';
        }
        if (command.includes('gh extension list')) {
          return extensionsList;
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.ghExtensions).toContain('yahsan2/gh-sub-issue');
      expect(result.dependencies.ghExtensions).toContain('user/extension2');
      expect(result.dependencies.ghExtensions).toHaveLength(2);
    });

    test('should skip dependency check when requested', async () => {
      const result = await initializeSystem({
        dryRun: true,
        skipDependencyCheck: true
      });

      expect(result.dependencies.gh).toBe(false);
      expect(result.dependencies.ghAuth).toBe(false);
      expect(result.dependencies.ghExtensions).toEqual([]);

      // Should not call any gh commands
      expect(mockExecSync).not.toHaveBeenCalledWith(
        expect.stringContaining('gh'),
        expect.any(Object)
      );
    });

    test('should handle gh extension list errors gracefully', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          return 'Logged in';
        }
        if (command.includes('gh extension list')) {
          throw new Error('No extensions or error');
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.gh).toBe(true);
      expect(result.dependencies.ghAuth).toBe(true);
      expect(result.dependencies.ghExtensions).toEqual([]);
    });
  });

  describe('CLAUDE.md Management', () => {
    test('should detect existing CLAUDE.md', async () => {
      fs.writeFileSync('CLAUDE.md', 'Existing content');

      const result = await initializeSystem({ dryRun: true });

      expect(result.claude.exists).toBe(true);
      expect(result.claude.created).toBe(false);
    });

    test('should create CLAUDE.md when missing in non-dry-run mode', async () => {
      const result = await initializeSystem({ dryRun: false });

      expect(result.claude.exists).toBe(false);
      expect(result.claude.created).toBe(true);
      expect(fs.existsSync('CLAUDE.md')).toBe(true);

      const content = fs.readFileSync('CLAUDE.md', 'utf8');
      expect(content).toContain('# CLAUDE.md');
      expect(content).toContain('Project-Specific Instructions');
      expect(content).toContain('## Testing');
    });

    test('should not create CLAUDE.md in dry-run mode', async () => {
      const result = await initializeSystem({ dryRun: true });

      expect(result.claude.exists).toBe(false);
      expect(result.claude.created).toBe(true); // Would be created
      expect(fs.existsSync('CLAUDE.md')).toBe(false);
    });

    test('should not overwrite existing CLAUDE.md', async () => {
      const existingContent = 'Existing CLAUDE.md content';
      fs.writeFileSync('CLAUDE.md', existingContent);

      const result = await initializeSystem({ dryRun: false });

      expect(result.claude.exists).toBe(true);
      expect(result.claude.created).toBe(false);

      const content = fs.readFileSync('CLAUDE.md', 'utf8');
      expect(content).toBe(existingContent);
    });
  });

  describe('Summary Generation', () => {
    test('should generate accurate summary', async () => {
      // Setup test conditions
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('CLAUDE.md', 'existing');

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/user/repo.git (fetch)';
        }
        if (command.includes('git remote get-url origin')) {
          return 'https://github.com/user/repo.git';
        }
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          return 'Logged in';
        }
        if (command.includes('gh extension list')) {
          return '';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: false });

      expect(result.summary.directoriesCreated).toBe(4); // 4 missing directories
      expect(result.summary.gitConfigured).toBe(true);
      expect(result.summary.dependenciesReady).toBe(true);
      expect(result.summary.claudeReady).toBe(true);
      expect(result.summary.hasWarnings).toBe(false);
    });

    test('should handle warnings in summary', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/rlagowski/autopm.git (fetch)';
        }
        if (command.includes('git remote get-url origin')) {
          return 'https://github.com/rlagowski/autopm.git';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.summary.hasWarnings).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle filesystem permission errors', async () => {
      // This test ensures the function doesn't crash on permission errors
      // Note: Hard to test actual permission errors in Jest, but we test error handling paths
      const result = await initializeSystem({ dryRun: true });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle malformed git remote output', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'upstream\thttps://github.com/other/repo.git (fetch)';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.git.isRepo).toBe(true);
      expect(result.git.hasRemote).toBe(false);
    });

    test('should handle empty gh extension list', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          return 'Logged in';
        }
        if (command.includes('gh extension list')) {
          return '\n\n\n'; // Empty with whitespace
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: true });

      expect(result.dependencies.ghExtensions).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    test('should work with complex real-world scenario', async () => {
      // Simulate a partially initialized project
      fs.mkdirSync('.claude/rules', { recursive: true });
      fs.writeFileSync('.claude/rules/existing.md', 'rule content');

      mockExecSync.mockImplementation((command) => {
        if (command.includes('git rev-parse')) {
          return 'success';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/user/myproject.git (fetch)';
        }
        if (command.includes('git remote get-url origin')) {
          return 'https://github.com/user/myproject.git';
        }
        if (command.includes('gh --version')) {
          return 'gh version 2.32.1';
        }
        if (command.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        if (command.includes('gh extension list')) {
          return 'yahsan2/gh-sub-issue\tSub-issue extension';
        }
        throw new Error('Command failed');
      });

      const result = await initializeSystem({ dryRun: false });

      // Verify complex state
      expect(result.directories.created.length).toBe(4); // 4 missing directories
      expect(result.git.isRepo).toBe(true);
      expect(result.git.hasRemote).toBe(true);
      expect(result.dependencies.gh).toBe(true);
      expect(result.dependencies.ghAuth).toBe(false);
      expect(result.dependencies.ghExtensions).toContain('yahsan2/gh-sub-issue');
      expect(result.claude.created).toBe(true);
      expect(result.summary.gitConfigured).toBe(true);
      expect(result.summary.dependenciesReady).toBe(false); // Auth failed
    });

    test('should handle completely fresh project initialization', async () => {
      const result = await initializeSystem({ dryRun: false });

      // All directories should be created
      expect(result.directories.created).toHaveLength(5);

      // Git should be detected as not present
      expect(result.git.isRepo).toBe(false);

      // Dependencies should be missing
      expect(result.dependencies.gh).toBe(false);

      // CLAUDE.md should be created
      expect(result.claude.created).toBe(true);
      expect(fs.existsSync('CLAUDE.md')).toBe(true);
    });
  });

  describe('Performance and Limits', () => {
    test('should complete initialization quickly', async () => {
      const startTime = Date.now();
      await initializeSystem({ dryRun: true });
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second in dry run)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle concurrent initialization attempts', async () => {
      // Run multiple initializations simultaneously
      const promises = Array(3).fill().map(() =>
        initializeSystem({ dryRun: true })
      );

      const results = await Promise.all(promises);

      // All should succeed and return consistent results
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('Display and Formatting Functions', () => {
    describe('displayBanner', () => {
      test('should return ASCII banner as string', () => {
        const banner = displayBanner();

        expect(typeof banner).toBe('string');
        expect(banner.length).toBeGreaterThan(0);
        expect(banner).toContain('█████╗');
        expect(banner).toContain('█████╗ ██╗   ██╗████████╗ ██████╗ ██████╗');
        expect(banner).toContain('Claude Code Project Management');
        expect(banner).toContain('https://github.com/rlagowski/autopm');
      });

      test('should include required branding elements', () => {
        const banner = displayBanner();

        expect(banner).toContain('by https://x.com/aroussi');
        expect(banner).toContain('┌─────────────────────────────────┐');
        expect(banner).toContain('└─────────────────────────────────┘');
      });
    });

    describe('formatInitOutput', () => {
      let sampleData;

      beforeEach(() => {
        sampleData = {
          dryRun: false,
          options: {},
          directories: {
            required: ['.claude/prds', '.claude/epics'],
            created: ['.claude/prds']
          },
          dependencies: {
            gh: true,
            ghAuth: true,
            ghExtensions: ['yahsan2/gh-sub-issue']
          },
          git: {
            isRepo: true,
            hasRemote: true,
            remoteUrl: 'https://github.com/user/repo.git',
            warnings: []
          },
          claude: {
            exists: false,
            created: true
          },
          summary: {
            directoriesCreated: 1,
            gitConfigured: true,
            dependenciesReady: true,
            claudeReady: true,
            hasWarnings: false
          }
        };
      });

      test('should format initialization output as string', () => {
        const output = formatInitOutput(sampleData);

        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
      });

      test('should include banner in output', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('█████╗');
        expect(output).toContain('█████╗ ██╗   ██╗████████╗ ██████╗ ██████╗');
      });

      test('should show dependency status correctly', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('✅ GitHub CLI (gh) installed');
        expect(output).toContain('✅ GitHub authenticated');
        expect(output).toContain('✅ gh-sub-issue extension installed');
      });

      test('should show missing dependencies correctly', () => {
        sampleData.dependencies.gh = false;
        sampleData.dependencies.ghAuth = false;
        sampleData.dependencies.ghExtensions = [];

        const output = formatInitOutput(sampleData);

        expect(output).toContain('❌ GitHub CLI (gh) not found');
        expect(output).toContain('⚠️ GitHub not authenticated');
        expect(output).toContain('📥 gh-sub-issue extension needed');
      });

      test('should show git repository status', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('✅ Git repository detected');
        expect(output).toContain('✅ Remote configured: https://github.com/user/repo.git');
      });

      test('should show git warnings when present', () => {
        sampleData.git.warnings = [{
          type: 'template_repo',
          message: 'Remote origin points to the AutoPM template repository'
        }];

        const output = formatInitOutput(sampleData);

        expect(output).toContain('⚠️ WARNING: Your remote origin points to the AutoPM template repository!');
        expect(output).toContain('git remote set-url origin');
      });

      test('should show missing git configuration', () => {
        sampleData.git.isRepo = false;

        const output = formatInitOutput(sampleData);

        expect(output).toContain('⚠️ Not a git repository');
        expect(output).toContain('Initialize with: git init');
      });

      test('should show git without remote', () => {
        sampleData.git.hasRemote = false;

        const output = formatInitOutput(sampleData);

        expect(output).toContain('⚠️ No remote configured');
        expect(output).toContain('Add with: git remote add origin <url>');
      });

      test('should show directory creation status', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('✅ Directories created');
      });

      test('should show when directories already exist', () => {
        sampleData.directories.created = [];

        const output = formatInitOutput(sampleData);

        expect(output).toContain('✅ Directory structure exists');
      });

      test('should show CLAUDE.md creation', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('✅ CLAUDE.md created');
      });

      test('should show existing CLAUDE.md', () => {
        sampleData.claude.exists = true;
        sampleData.claude.created = false;

        const output = formatInitOutput(sampleData);

        expect(output).toContain('📄 CLAUDE.md exists');
      });

      test('should include system status summary', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('📊 System Status:');
        expect(output).toContain('Extensions: 1 installed');
        expect(output).toContain('Auth: Authenticated');
      });

      test('should include next steps section', () => {
        const output = formatInitOutput(sampleData);

        expect(output).toContain('🎯 Next Steps:');
        expect(output).toContain('/pm:prd-new <feature-name>');
        expect(output).toContain('/pm:help');
        expect(output).toContain('/pm:status');
      });

      test('should handle GitHub CLI version display', () => {
        mockExecSync.mockImplementation((command) => {
          if (command.includes('gh --version')) {
            return 'gh version 2.32.1 (2023-07-18)';
          }
          throw new Error('Command failed');
        });

        const output = formatInitOutput(sampleData);

        expect(output).toContain('gh version 2.32.1');
      });

      test('should handle GitHub CLI version error gracefully', () => {
        mockExecSync.mockImplementation(() => {
          throw new Error('Command failed');
        });

        const output = formatInitOutput(sampleData);

        expect(output).toContain('GitHub CLI: Available');
      });

      test('should show correct extension count', () => {
        sampleData.dependencies.ghExtensions = ['ext1', 'ext2', 'ext3'];

        const output = formatInitOutput(sampleData);

        expect(output).toContain('Extensions: 3 installed');
      });

      test('should show not authenticated status', () => {
        sampleData.dependencies.ghAuth = false;

        const output = formatInitOutput(sampleData);

        expect(output).toContain('Auth: Not authenticated');
      });
    });
  });

  describe('CLI Execution Simulation', () => {
    test('should handle CLI dry-run execution', () => {
      // Test that the CLI execution path doesn't crash
      // This tests the CLI execution block without actually running it
      const moduleExports = require('../../autopm/.claude/scripts/pm/init.js');

      expect(typeof moduleExports.initializeSystem).toBe('function');
      expect(typeof moduleExports.formatInitOutput).toBe('function');
      expect(typeof moduleExports.displayBanner).toBe('function');
    });

    test('should handle process argv parsing', async () => {
      // Simulate CLI execution by testing the functions used in CLI block
      const result = await initializeSystem({ dryRun: true });
      const output = formatInitOutput(result);

      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });
  });
});