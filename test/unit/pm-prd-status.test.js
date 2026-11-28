// Mock dependencies before importing
jest.mock('fs');

const fs = require('fs');
const PRDStatus = require('../../autopm/.claude/scripts/pm/prd-status.js');

describe('PM PRD Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Default mock: no directories exist
    fs.existsSync.mockReturnValue(false);
    fs.readdirSync.mockReturnValue([]);
    fs.readFileSync.mockReturnValue('');
    fs.statSync.mockReturnValue({ mtime: new Date() });
  });

  describe('PRDStatus Class', () => {
    it('should initialize with correct PRDs directory path', () => {
      const status = new PRDStatus();
      expect(status.prdsDir).toContain('.claude/prds');
    });

    describe('getPRDFiles()', () => {
      it('should return empty array when PRDs directory does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const status = new PRDStatus();
        const files = status.getPRDFiles();

        expect(files).toEqual([]);
      });

      it('should return only .md files from PRDs directory', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue([
          'auth-system.md',
          'user-management.md',
          'readme.txt',
          'notes.doc',
          'api-design.md'
        ]);

        const status = new PRDStatus();
        const files = status.getPRDFiles();

        expect(files).toHaveLength(3);
        expect(files.every(file => file.endsWith('.md'))).toBe(true);
        expect(files.some(file => file.includes('auth-system.md'))).toBe(true);
        expect(files.some(file => file.includes('user-management.md'))).toBe(true);
        expect(files.some(file => file.includes('api-design.md'))).toBe(true);
      });

      it('should return full file paths', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['test.md']);

        const status = new PRDStatus();
        const files = status.getPRDFiles();

        expect(files[0]).toContain('.claude/prds/test.md');
      });
    });

    describe('extractStatus()', () => {
      it('should extract status from file content', () => {
        fs.readFileSync.mockReturnValue('name: Test PRD\nstatus: in-progress\nContent here');

        const status = new PRDStatus();
        const result = status.extractStatus('/fake/path');

        expect(result).toBe('in-progress');
      });

      it('should return backlog as default when no status found', () => {
        fs.readFileSync.mockReturnValue('name: Test PRD\nContent without status');

        const status = new PRDStatus();
        const result = status.extractStatus('/fake/path');

        expect(result).toBe('backlog');
      });

      it('should handle file read errors gracefully', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('File read error');
        });

        const status = new PRDStatus();
        const result = status.extractStatus('/fake/path');

        expect(result).toBe('backlog');
      });

      it('should handle various status formats', () => {
        const status = new PRDStatus();

        fs.readFileSync.mockReturnValue('status: completed');
        expect(status.extractStatus('/fake/path')).toBe('completed');

        fs.readFileSync.mockReturnValue('status:active');
        expect(status.extractStatus('/fake/path')).toBe('active');

        fs.readFileSync.mockReturnValue('status:   done   ');
        expect(status.extractStatus('/fake/path')).toBe('done');
      });
    });

    describe('extractName()', () => {
      it('should extract name from file content', () => {
        fs.readFileSync.mockReturnValue('name: Authentication System\nstatus: draft\nContent here');

        const status = new PRDStatus();
        const result = status.extractName('/fake/path/auth-system.md');

        expect(result).toBe('Authentication System');
      });

      it('should use filename as fallback when no name found', () => {
        fs.readFileSync.mockReturnValue('Content without name field');

        const status = new PRDStatus();
        const result = status.extractName('/fake/path/user-management.md');

        expect(result).toBe('user-management');
      });

      it('should handle file read errors gracefully', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('File read error');
        });

        const status = new PRDStatus();
        const result = status.extractName('/fake/path/fallback.md');

        expect(result).toBe('fallback');
      });

      it('should handle various name formats', () => {
        const status = new PRDStatus();

        fs.readFileSync.mockReturnValue('name: API Design Document');
        expect(status.extractName('/fake/path/api.md')).toBe('API Design Document');

        fs.readFileSync.mockReturnValue('name:User Stories');
        expect(status.extractName('/fake/path/user.md')).toBe('User Stories');

        fs.readFileSync.mockReturnValue('name:   System Architecture   ');
        expect(status.extractName('/fake/path/system.md')).toBe('System Architecture');
      });
    });

    describe('categorizeStatus()', () => {
      it('should categorize backlog statuses correctly', () => {
        const status = new PRDStatus();

        expect(status.categorizeStatus('backlog')).toBe('backlog');
        expect(status.categorizeStatus('draft')).toBe('backlog');
        expect(status.categorizeStatus('')).toBe('backlog');
        expect(status.categorizeStatus('BACKLOG')).toBe('backlog');
      });

      it('should categorize in-progress statuses correctly', () => {
        const status = new PRDStatus();

        expect(status.categorizeStatus('in-progress')).toBe('in_progress');
        expect(status.categorizeStatus('active')).toBe('in_progress');
        expect(status.categorizeStatus('IN-PROGRESS')).toBe('in_progress');
        expect(status.categorizeStatus('ACTIVE')).toBe('in_progress');
      });

      it('should categorize implemented statuses correctly', () => {
        const status = new PRDStatus();

        expect(status.categorizeStatus('implemented')).toBe('implemented');
        expect(status.categorizeStatus('completed')).toBe('implemented');
        expect(status.categorizeStatus('done')).toBe('implemented');
        expect(status.categorizeStatus('IMPLEMENTED')).toBe('implemented');
      });

      it('should default unknown statuses to backlog', () => {
        const status = new PRDStatus();

        expect(status.categorizeStatus('unknown')).toBe('backlog');
        expect(status.categorizeStatus('pending')).toBe('backlog');
        expect(status.categorizeStatus('review')).toBe('backlog');
      });
    });

    describe('drawBar()', () => {
      it('should draw progress bar correctly', () => {
        const status = new PRDStatus();

        const bar = status.drawBar(5, 10, 10);
        expect(bar).toBe('█████');
      });

      it('should handle zero total', () => {
        const status = new PRDStatus();

        const bar = status.drawBar(5, 0, 10);
        expect(bar).toBe('');
      });

      it('should handle full bar', () => {
        const status = new PRDStatus();

        const bar = status.drawBar(10, 10, 5);
        expect(bar).toBe('█████');
      });

      it('should handle partial bars', () => {
        const status = new PRDStatus();

        const bar = status.drawBar(1, 4, 8);
        expect(bar).toBe('██');
      });

      it('should use default max width', () => {
        const status = new PRDStatus();

        const bar = status.drawBar(10, 10);
        expect(bar).toBe('████████████████████'); // 20 chars
      });
    });
  });

  describe('run() method', () => {
    it('should handle no PRD directory', () => {
      fs.existsSync.mockReturnValue(false);

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('No PRD directory found.');
    });

    it('should handle empty PRD directory', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('No PRDs found.');
    });

    it('should display status report with PRDs', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['auth.md', 'users.md', 'api.md']);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('auth.md')) {
          return 'name: Authentication\nstatus: in-progress';
        }
        if (filePath.includes('users.md')) {
          return 'name: User Management\nstatus: completed';
        }
        if (filePath.includes('api.md')) {
          return 'name: API Design\nstatus: backlog';
        }
        return '';
      });

      fs.statSync.mockImplementation((filePath) => ({
        mtime: new Date(2023, 0, 1)
      }));

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📄 PRD Status Report');
      expect(console.log).toHaveBeenCalledWith('📊 Distribution:');
      expect(console.log).toHaveBeenCalledWith('  Total PRDs: 3');
    });

    it('should count PRDs by status correctly', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['prd1.md', 'prd2.md', 'prd3.md', 'prd4.md']);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('prd1.md')) return 'status: backlog';
        if (filePath.includes('prd2.md')) return 'status: in-progress';
        if (filePath.includes('prd3.md')) return 'status: completed';
        if (filePath.includes('prd4.md')) return 'status: draft';
        return '';
      });

      fs.statSync.mockImplementation(() => ({ mtime: new Date() }));

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      // Check that counts are displayed (2 backlog, 1 in-progress, 1 implemented)
      const backlogCall = console.log.mock.calls.find(call =>
        call[0] && call[0].includes('Backlog:') && call[0].includes('2')
      );
      const progressCall = console.log.mock.calls.find(call =>
        call[0] && call[0].includes('In Progress:') && call[0].includes('1')
      );
      const implementedCall = console.log.mock.calls.find(call =>
        call[0] && call[0].includes('Implemented:') && call[0].includes('1')
      );

      expect(backlogCall).toBeTruthy();
      expect(progressCall).toBeTruthy();
      expect(implementedCall).toBeTruthy();
    });

    it('should display recent PRDs sorted by modification time', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['old.md', 'new.md', 'middle.md']);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('old.md')) return 'name: Old PRD';
        if (filePath.includes('new.md')) return 'name: New PRD';
        if (filePath.includes('middle.md')) return 'name: Middle PRD';
        return '';
      });

      fs.statSync.mockImplementation(filePath => {
        if (filePath.includes('old.md')) return { mtime: new Date(2023, 0, 1) };
        if (filePath.includes('new.md')) return { mtime: new Date(2023, 2, 1) };
        if (filePath.includes('middle.md')) return { mtime: new Date(2023, 1, 1) };
        return { mtime: new Date() };
      });

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📅 Recent PRDs (last 5 modified):');
      expect(console.log).toHaveBeenCalledWith('  • New PRD');
      expect(console.log).toHaveBeenCalledWith('  • Middle PRD');
      expect(console.log).toHaveBeenCalledWith('  • Old PRD');
    });

    it('should show appropriate suggestions based on PRD counts', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['backlog.md', 'active.md']);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('backlog.md')) return 'status: backlog';
        if (filePath.includes('active.md')) return 'status: in-progress';
        return '';
      });

      fs.statSync.mockImplementation(() => ({ mtime: new Date() }));

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('💡 Next Actions:');
      expect(console.log).toHaveBeenCalledWith('  • Parse backlog PRDs to epics: /pm:prd-parse <name>');
      expect(console.log).toHaveBeenCalledWith('  • Check progress on active PRDs: /pm:epic-status <name>');
    });

    it('should limit recent PRDs to 5', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'prd1.md', 'prd2.md', 'prd3.md', 'prd4.md', 'prd5.md', 'prd6.md', 'prd7.md'
      ]);

      fs.readFileSync.mockImplementation(filePath => {
        const num = filePath.match(/prd(\d+)/)[1];
        return `name: PRD ${num}`;
      });

      fs.statSync.mockImplementation(filePath => {
        const num = parseInt(filePath.match(/prd(\d+)/)[1]);
        return { mtime: new Date(2023, 0, num) };
      });

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      // Should only show 5 most recent PRDs
      const prdCalls = console.log.mock.calls.filter(call =>
        call[0] && call[0].includes('  • PRD')
      );
      expect(prdCalls).toHaveLength(5);
    });

    it('should include header sections', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['test.md']);
      fs.readFileSync.mockReturnValue('name: Test\nstatus: backlog');
      fs.statSync.mockImplementation(() => ({ mtime: new Date() }));

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📄 PRD Status Report');
      expect(console.log).toHaveBeenCalledWith('====================');
      expect(console.log).toHaveBeenCalledWith('Getting status...');
      expect(console.log).toHaveBeenCalledWith('📊 Distribution:');
      expect(console.log).toHaveBeenCalledWith('================');
    });
  });

  describe('CLI Execution', () => {
    it('should execute run method when called as main module', () => {
      const originalMain = require.main;
      require.main = { filename: require.resolve('../../autopm/.claude/scripts/pm/prd-status.js') };

      fs.existsSync.mockReturnValue(false);

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/pm/prd-status.js')];
        require('../../autopm/.claude/scripts/pm/prd-status.js');
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      require.main = originalMain;
    });

    it('should handle CLI errors gracefully', () => {
      const originalMain = require.main;
      require.main = { filename: require.resolve('../../autopm/.claude/scripts/pm/prd-status.js') };

      // Mock to throw error during execution
      fs.existsSync.mockImplementation(() => {
        throw new Error('Critical filesystem error');
      });

      try {
        delete require.cache[require.resolve('../../autopm/.claude/scripts/pm/prd-status.js')];
        require('../../autopm/.claude/scripts/pm/prd-status.js');
      } catch (error) {
        // Should propagate the error since there's no try-catch in the script
        expect(error.message).toBe('Critical filesystem error');
      }

      require.main = originalMain;
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const PRDStatusClass = require('../../autopm/.claude/scripts/pm/prd-status.js');
      expect(typeof PRDStatusClass).toBe('function');
      expect(PRDStatusClass.name).toBe('PRDStatus');

      const instance = new PRDStatusClass();
      expect(typeof instance.run).toBe('function');
      expect(typeof instance.getPRDFiles).toBe('function');
      expect(typeof instance.extractStatus).toBe('function');
      expect(typeof instance.extractName).toBe('function');
      expect(typeof instance.categorizeStatus).toBe('function');
      expect(typeof instance.drawBar).toBe('function');
    });

    it('should handle realistic PRD project structure', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'authentication-system.md',
        'user-management.md',
        'api-documentation.md',
        'mobile-app.md'
      ]);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('authentication-system.md')) {
          return 'name: Authentication System\nstatus: completed\ndescription: OAuth2 implementation';
        }
        if (filePath.includes('user-management.md')) {
          return 'name: User Management\nstatus: in-progress\ndescription: User CRUD operations';
        }
        if (filePath.includes('api-documentation.md')) {
          return 'name: API Documentation\nstatus: draft\ndescription: REST API docs';
        }
        if (filePath.includes('mobile-app.md')) {
          return 'name: Mobile Application\nstatus: backlog\ndescription: React Native app';
        }
        return '';
      });

      fs.statSync.mockImplementation(filePath => {
        if (filePath.includes('authentication-system.md')) return { mtime: new Date(2023, 3, 1) };
        if (filePath.includes('user-management.md')) return { mtime: new Date(2023, 2, 1) };
        if (filePath.includes('api-documentation.md')) return { mtime: new Date(2023, 1, 1) };
        if (filePath.includes('mobile-app.md')) return { mtime: new Date(2023, 0, 1) };
        return { mtime: new Date() };
      });

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('  Total PRDs: 4');

      // Check that all PRDs are listed in recent section
      expect(console.log).toHaveBeenCalledWith('  • Authentication System');
      expect(console.log).toHaveBeenCalledWith('  • User Management');
      expect(console.log).toHaveBeenCalledWith('  • API Documentation');
      expect(console.log).toHaveBeenCalledWith('  • Mobile Application');
    });

    it('should work with edge cases and malformed files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['empty.md', 'malformed.md', 'partial.md']);

      fs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('empty.md')) return '';
        if (filePath.includes('malformed.md')) return 'invalid:::content:::here';
        if (filePath.includes('partial.md')) return 'name: Partial PRD';
        return '';
      });

      fs.statSync.mockImplementation(() => ({ mtime: new Date() }));

      const status = new PRDStatus();

      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        status.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('  Total PRDs: 3');

      // Should use filename fallbacks for name
      expect(console.log).toHaveBeenCalledWith('  • empty');
      expect(console.log).toHaveBeenCalledWith('  • malformed');
      expect(console.log).toHaveBeenCalledWith('  • Partial PRD');
    });
  });
});