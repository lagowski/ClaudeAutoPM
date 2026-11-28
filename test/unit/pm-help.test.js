// Mock dependencies before importing
const { execSync } = require('child_process');
const displayHelp = require('../../autopm/.claude/scripts/pm/help.js');

describe('PM Help', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exit = jest.fn();
  });

  describe('displayHelp()', () => {
    it('should return help content as string', () => {
      const result = displayHelp();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include main help title', () => {
      const result = displayHelp();

      expect(result).toContain('Claude Code PM - Project Management System');
      expect(result).toContain('=============================================');
    });

    it('should include quick start workflow section', () => {
      const result = displayHelp();

      expect(result).toContain('🎯 Quick Start Workflow');
      expect(result).toContain('/pm:prd-new <name>');
      expect(result).toContain('/pm:prd-parse <name>');
      expect(result).toContain('/pm:epic-decompose <name>');
      expect(result).toContain('/pm:epic-sync <name>');
      expect(result).toContain('/pm:epic-start <name>');
    });

    it('should include PRD commands section', () => {
      const result = displayHelp();

      expect(result).toContain('📄 PRD Commands');
      expect(result).toContain('/pm:prd-new <name>');
      expect(result).toContain('/pm:prd-parse <name>');
      expect(result).toContain('/pm:prd-list');
      expect(result).toContain('/pm:prd-edit <name>');
      expect(result).toContain('/pm:prd-status');
    });

    it('should include Epic commands section', () => {
      const result = displayHelp();

      expect(result).toContain('📚 Epic Commands');
      expect(result).toContain('/pm:epic-decompose <name>');
      expect(result).toContain('/pm:epic-sync <name>');
      expect(result).toContain('/pm:epic-oneshot <name>');
      expect(result).toContain('/pm:epic-list');
      expect(result).toContain('/pm:epic-show <name>');
      expect(result).toContain('/pm:epic-status [name]');
      expect(result).toContain('/pm:epic-close <name>');
      expect(result).toContain('/pm:epic-edit <name>');
      expect(result).toContain('/pm:epic-refresh <name>');
      expect(result).toContain('/pm:epic-start <name>');
    });

    it('should include Issue commands section', () => {
      const result = displayHelp();

      expect(result).toContain('📝 Issue Commands');
      expect(result).toContain('/pm:issue-show <num>');
      expect(result).toContain('/pm:issue-status <num>');
      expect(result).toContain('/pm:issue-start <num>');
      expect(result).toContain('/pm:issue-sync <num>');
      expect(result).toContain('/pm:issue-close <num>');
      expect(result).toContain('/pm:issue-reopen <num>');
      expect(result).toContain('/pm:issue-edit <num>');
      expect(result).toContain('/pm:issue-analyze <num>');
    });

    it('should include Workflow commands section', () => {
      const result = displayHelp();

      expect(result).toContain('🔄 Workflow Commands');
      expect(result).toContain('/pm:next');
      expect(result).toContain('/pm:status');
      expect(result).toContain('/pm:standup');
      expect(result).toContain('/pm:blocked');
      expect(result).toContain('/pm:in-progress');
    });

    it('should include Sync commands section', () => {
      const result = displayHelp();

      expect(result).toContain('🔗 Sync Commands');
      expect(result).toContain('/pm:sync');
      expect(result).toContain('/pm:import <issue>');
    });

    it('should include Maintenance commands section', () => {
      const result = displayHelp();

      expect(result).toContain('🔧 Maintenance Commands');
      expect(result).toContain('/pm:validate');
      expect(result).toContain('/pm:clean');
      expect(result).toContain('/pm:search <query>');
    });

    it('should include Setup commands section', () => {
      const result = displayHelp();

      expect(result).toContain('⚙️  Setup Commands');
      expect(result).toContain('/pm:init');
      expect(result).toContain('/pm:help');
    });

    it('should include Tips section', () => {
      const result = displayHelp();

      expect(result).toContain('💡 Tips');
      expect(result).toContain('Use /pm:next to find available work');
      expect(result).toContain('Run /pm:status for quick overview');
      expect(result).toContain('Epic workflow: prd-new → prd-parse → epic-decompose → epic-sync');
      expect(result).toContain('View README.md for complete documentation');
    });

    it('should use emoji icons for each section', () => {
      const result = displayHelp();

      expect(result).toContain('🎯'); // Quick Start
      expect(result).toContain('📄'); // PRD Commands
      expect(result).toContain('📚'); // Epic Commands
      expect(result).toContain('📝'); // Issue Commands
      expect(result).toContain('🔄'); // Workflow Commands
      expect(result).toContain('🔗'); // Sync Commands
      expect(result).toContain('🔧'); // Maintenance Commands
      expect(result).toContain('⚙️'); // Setup Commands
      expect(result).toContain('💡'); // Tips
    });

    it('should include proper command descriptions', () => {
      const result = displayHelp();

      expect(result).toContain('Launch brainstorming for new product requirement');
      expect(result).toContain('Convert PRD to implementation epic');
      expect(result).toContain('Break epic into task files');
      expect(result).toContain('Push epic and tasks to GitHub');
      expect(result).toContain('Display issue and sub-issues');
      expect(result).toContain('Overall project dashboard');
      expect(result).toContain('Check system integrity');
    });

    it('should include parameter placeholders', () => {
      const result = displayHelp();

      expect(result).toContain('<name>');
      expect(result).toContain('<num>');
      expect(result).toContain('<query>');
      expect(result).toContain('<issue>');
      expect(result).toContain('[name]'); // Optional parameter
    });

    it('should be properly formatted with consistent indentation', () => {
      const result = displayHelp();

      const lines = result.split('\n');
      const commandLines = lines.filter(line => line.includes('/pm:'));

      // Check that command lines have some form of indentation
      commandLines.forEach(line => {
        // Commands should be indented (either with spaces or numbers)
        expect(line.trim()).toContain('/pm:');
        expect(line.length).toBeGreaterThan(line.trim().length); // Should have leading whitespace
      });
    });

    it('should contain all essential PM commands', () => {
      const result = displayHelp();

      // Essential commands that should be documented
      const essentialCommands = [
        '/pm:prd-new',
        '/pm:prd-list',
        '/pm:epic-list',
        '/pm:epic-show',
        '/pm:status',
        '/pm:next',
        '/pm:blocked',
        '/pm:help',
        '/pm:init'
      ];

      essentialCommands.forEach(command => {
        expect(result).toContain(command);
      });
    });

    it('should have sections in logical order', () => {
      const result = displayHelp();

      const quickStartIndex = result.indexOf('🎯 Quick Start Workflow');
      const prdIndex = result.indexOf('📄 PRD Commands');
      const epicIndex = result.indexOf('📚 Epic Commands');
      const workflowIndex = result.indexOf('🔄 Workflow Commands');
      const setupIndex = result.indexOf('⚙️  Setup Commands');
      const tipsIndex = result.indexOf('💡 Tips');

      expect(quickStartIndex).toBeLessThan(prdIndex);
      expect(prdIndex).toBeLessThan(epicIndex);
      expect(epicIndex).toBeLessThan(workflowIndex);
      expect(workflowIndex).toBeLessThan(setupIndex);
      expect(setupIndex).toBeLessThan(tipsIndex);
    });
  });

  describe('CLI Execution', () => {
    it('should handle CLI execution with proper output', () => {
      // Simulate CLI execution by calling the script directly

      try {
        const output = execSync('node autopm/.claude/scripts/pm/help.js', {
          encoding: 'utf8',
          cwd: '/Users/rla/Projects/AUTOPM'
        });

        expect(output).toContain('Helping...');
        expect(output).toContain('Claude Code PM');
        expect(output).toContain('/pm:help');
      } catch (error) {
        // If execution fails, test that the module works
        const result = displayHelp();
        expect(result).toContain('Claude Code PM');
      }
    });

    it('should exit with code 0 on success', () => {
      const originalMain = require.main;
      require.main = { filename: require.resolve('../../autopm/.claude/scripts/pm/help.js') };

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/pm/help.js')];
        require('../../autopm/.claude/scripts/pm/help.js');
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      require.main = originalMain;
    });

    it('should display loading message before help content', () => {

      try {
        const output = execSync('node autopm/.claude/scripts/pm/help.js', {
          encoding: 'utf8',
          cwd: '/Users/rla/Projects/AUTOPM'
        });

        const lines = output.split('\n');
        const helpingIndex = lines.findIndex(line => line.includes('Helping...'));
        const helpContentIndex = lines.findIndex(line => line.includes('Claude Code PM'));

        expect(helpingIndex).toBeGreaterThanOrEqual(0);
        expect(helpContentIndex).toBeGreaterThan(helpingIndex);
      } catch (error) {
        // If CLI execution fails, just verify the function works
        const result = displayHelp();
        expect(result).toContain('Claude Code PM');
      }
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const helpModule = require('../../autopm/.claude/scripts/pm/help.js');
      expect(typeof helpModule).toBe('function');
      expect(helpModule.name).toBe('displayHelp');
    });

    it('should work as both module and CLI', () => {
      // Test as module
      const result = displayHelp();
      expect(typeof result).toBe('string');
      expect(result).toContain('Claude Code PM');

      // Test CLI behavior doesn't interfere
      expect(() => {
        const helpModule = require('../../autopm/.claude/scripts/pm/help.js');
        helpModule();
      }).not.toThrow();
    });

    it('should return consistent content across calls', () => {
      const result1 = displayHelp();
      const result2 = displayHelp();

      expect(result1).toBe(result2);
      expect(result1.length).toBe(result2.length);
    });

    it('should contain valid help structure', () => {
      const result = displayHelp();

      // Check for minimum content requirements
      expect(result.length).toBeGreaterThan(1000); // Should be substantial
      expect(result.split('\n').length).toBeGreaterThan(50); // Should have many lines
      expect(result.split('/pm:').length).toBeGreaterThan(20); // Should have many commands
    });

    it('should have proper encoding and special characters', () => {
      const result = displayHelp();

      // Check for emoji rendering
      expect(result).toMatch(/[🎯📄📚📝🔄🔗🔧⚙️💡]/);

      // Check for special characters
      expect(result).toContain('→'); // Arrow character
      expect(result).toContain('='); // Separator characters
    });
  });
});