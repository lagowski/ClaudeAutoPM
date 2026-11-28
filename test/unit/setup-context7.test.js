// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');

const fs = require('fs');
const { execSync, execFileSync, spawn } = require('child_process');
const SetupContext7 = require('../../autopm/.claude/scripts/setup-context7.js');

describe('SetupContext7', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // Mock fs methods
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.copyFileSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    // Mock execSync / execFileSync
    execSync.mockReturnValue('');
    execFileSync.mockReturnValue('');
  });

  describe('Constructor', () => {
    it('should initialize with correct color codes', () => {
      const setup = new SetupContext7();

      expect(setup.colors).toHaveProperty('red');
      expect(setup.colors).toHaveProperty('green');
      expect(setup.colors).toHaveProperty('yellow');
      expect(setup.colors).toHaveProperty('blue');
      expect(setup.colors).toHaveProperty('reset');
    });
  });

  describe('print()', () => {
    it('should print message with color', () => {
      const setup = new SetupContext7();
      setup.print('Test message', 'green');

      expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
    });

    it('should print message without color', () => {
      const setup = new SetupContext7();
      setup.print('Test message');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });

    it('should handle invalid color', () => {
      const setup = new SetupContext7();
      setup.print('Test message', 'invalidcolor');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('commandExists()', () => {
    it('should return true when command exists', () => {
      execFileSync.mockReturnValue('/usr/bin/node');

      const setup = new SetupContext7();
      const result = setup.commandExists('node');

      expect(result).toBe(true);
      // Security: command passed as argv array, no shell interpolation
      expect(execFileSync).toHaveBeenCalledWith('which', ['node'], { stdio: 'ignore' });
    });

    it('should return false when command does not exist', () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const setup = new SetupContext7();
      const result = setup.commandExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('setupEnvFile()', () => {
    it('should create .claude directory if it does not exist', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return false;
        if (path === '.claude/.env') return false;
        return false;
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith('.claude', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith('.claude/.env', expect.stringContaining('CONTEXT7_API_KEY'));
      expect(setup.print).toHaveBeenCalledWith('✅ Created .claude/.env file with defaults', 'green');
    });

    it('should copy from example file when it exists', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return true;
        if (path === '.claude/.env') return false;
        if (path === '.claude/.env.example') return true;
        return false;
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(true);
      expect(fs.copyFileSync).toHaveBeenCalledWith('.claude/.env.example', '.claude/.env');
      expect(setup.print).toHaveBeenCalledWith('✅ Created .claude/.env file', 'green');
    });

    it('should return true when .env file already exists', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return true;
        if (path === '.claude/.env') return true;
        return false;
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(true);
      expect(setup.print).toHaveBeenCalledWith('✅ .env file already exists', 'green');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', () => {
      fs.existsSync.mockImplementation(path => path !== '.claude');
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('❌ Failed to create .claude directory: Permission denied', 'red');
    });

    it('should handle file copy errors', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return true;
        if (path === '.claude/.env') return false;
        if (path === '.claude/.env.example') return true;
        return false;
      });
      fs.copyFileSync.mockImplementation(() => {
        throw new Error('Copy failed');
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('❌ Failed to create .env file: Copy failed', 'red');
    });

    it('should handle file write errors', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return true;
        if (path === '.claude/.env') return false;
        if (path === '.claude/.env.example') return false;
        return false;
      });
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      const result = setup.setupEnvFile();

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('❌ Failed to create .env file: Write failed', 'red');
    });

    it('should show credential configuration instructions', () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return true;
        if (path === '.claude/.env') return false;
        return false;
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');
      setup.setupEnvFile();

      expect(setup.print).toHaveBeenCalledWith('❗ IMPORTANT: Edit .claude/.env and add your actual Context7 credentials:', 'yellow');
      expect(console.log).toHaveBeenCalledWith('   - CONTEXT7_API_KEY=your-actual-api-key');
      expect(console.log).toHaveBeenCalledWith('   - CONTEXT7_WORKSPACE=your-actual-workspace');
    });
  });

  describe('installMCPServers()', () => {
    it('should return false when npx is not available', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'commandExists').mockReturnValue(false);
      jest.spyOn(setup, 'print');

      const result = await setup.installMCPServers();

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('❌ npm/npx not found. Please install Node.js first.', 'red');
    });

    it('should install MCP servers successfully', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'commandExists').mockReturnValue(true);
      jest.spyOn(setup, 'print');
      execSync.mockReturnValue('');

      const result = await setup.installMCPServers();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Installing MCP servers...');
      expect(setup.print).toHaveBeenCalledWith('✅ Installed @modelcontextprotocol/server-filesystem', 'green');
      expect(setup.print).toHaveBeenCalledWith('✅ Installed @modelcontextprotocol/server-github', 'green');
      expect(setup.print).toHaveBeenCalledWith('Note: Context7 specific server not available, using filesystem as alternative', 'yellow');
    });

    it('should handle installation errors gracefully', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'commandExists').mockReturnValue(true);
      jest.spyOn(setup, 'print');
      execFileSync.mockImplementation(() => {
        throw new Error('Installation failed');
      });

      const result = await setup.installMCPServers();

      expect(result).toBe(true); // Method still returns true, continues with other packages
      expect(setup.print).toHaveBeenCalledWith('❌ Failed to install @modelcontextprotocol/server-filesystem', 'red');
      expect(setup.print).toHaveBeenCalledWith('❌ Failed to install @modelcontextprotocol/server-github', 'red');
    });

    it('should install multiple packages', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'commandExists').mockReturnValue(true);
      jest.spyOn(setup, 'print');

      await setup.installMCPServers();

      // Security: npm install invoked via argv array, no shell interpolation
      expect(execFileSync).toHaveBeenCalledWith(
        'npm',
        ['install', '-g', '@modelcontextprotocol/server-filesystem'],
        expect.any(Object)
      );
    });
  });

  describe('testConnection()', () => {
    beforeEach(() => {
      // Mock fs.readFileSync for loadEnvVariables
      fs.existsSync.mockReturnValue(true); // .env file exists
      fs.readFileSync.mockReturnValue('CONTEXT7_API_KEY=your-context7-api-key-here\nCONTEXT7_WORKSPACE=your-context7-workspace-here');
    });

    it('should warn when credentials not configured', () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');

      setup.testConnection();

      expect(setup.print).toHaveBeenCalledWith('⚠️  Context7 credentials not yet configured', 'yellow');
      expect(console.log).toHaveBeenCalledWith('   Please edit .claude/.env with your actual API key and workspace');
    });

    it('should test connection when credentials are configured', () => {
      fs.existsSync.mockReturnValue(true); // .env file exists
      fs.readFileSync.mockReturnValue('CONTEXT7_API_KEY=real-api-key\nCONTEXT7_WORKSPACE=real-workspace');

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');

      setup.testConnection();

      expect(console.log).toHaveBeenCalledWith('Testing Context7 connection...');
      expect(setup.print).toHaveBeenCalledWith('✅ Context7 credentials configured', 'green');
    });
  });

  describe('showUsageInstructions()', () => {
    it('should display usage instructions', () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');

      setup.showUsageInstructions();

      expect(setup.print).toHaveBeenCalledWith('🚀 Setup complete! You can now use:', 'blue');
      expect(console.log).toHaveBeenCalledWith('   /python:docs-query --topic=fastapi');
      expect(console.log).toHaveBeenCalledWith('   /mcp:context-setup --server=context7');
    });

    it('should show all available command examples', () => {
      const setup = new SetupContext7();

      setup.showUsageInstructions();

      expect(console.log).toHaveBeenCalledWith('   /python:docs-query --topic=fastapi');
      expect(console.log).toHaveBeenCalledWith('   /azure:docs-query --topic=rest-api');
      expect(console.log).toHaveBeenCalledWith('   /mcp:context-setup --server=context7');
    });
  });

  describe('run()', () => {
    beforeEach(() => {
      // Setup successful defaults
      fs.existsSync.mockReturnValue(true);
    });

    it('should complete full setup successfully', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'setupEnvFile').mockReturnValue(true);
      jest.spyOn(setup, 'installMCPServers').mockResolvedValue(true);
      jest.spyOn(setup, 'testConnection').mockImplementation(() => {});
      jest.spyOn(setup, 'showUsageInstructions').mockImplementation(() => {});
      jest.spyOn(setup, 'print');

      await setup.run();

      expect(setup.print).toHaveBeenCalledWith('🔮 Setting up Context7 MCP integration...', 'blue');
      expect(setup.setupEnvFile).toHaveBeenCalled();
      expect(setup.installMCPServers).toHaveBeenCalled();
      expect(setup.testConnection).toHaveBeenCalled();
      expect(setup.showUsageInstructions).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should exit when setupEnvFile fails', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'setupEnvFile').mockReturnValue(false);
      const installSpy = jest.spyOn(setup, 'installMCPServers');
      jest.spyOn(setup, 'testConnection').mockImplementation(() => {});

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await setup.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(installSpy).not.toHaveBeenCalled();
    });

    it('should exit when installMCPServers fails', async () => {
      const setup = new SetupContext7();
      jest.spyOn(setup, 'setupEnvFile').mockReturnValue(true);
      jest.spyOn(setup, 'installMCPServers').mockResolvedValue(false);
      const testSpy = jest.spyOn(setup, 'testConnection');
      jest.spyOn(setup, 'showUsageInstructions').mockImplementation(() => {});

      // Mock process.exit to throw error to stop execution
      process.exit.mockImplementation((code) => {
        throw new Error(`Process exit with code ${code}`);
      });

      try {
        await setup.run();
      } catch (error) {
        expect(error.message).toBe('Process exit with code 1');
      }

      expect(testSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const SetupContext7Class = require('../../autopm/.claude/scripts/setup-context7.js');
      expect(typeof SetupContext7Class).toBe('function');
      expect(SetupContext7Class.prototype).toHaveProperty('setupEnvFile');
      expect(SetupContext7Class.prototype).toHaveProperty('installMCPServers');
      expect(SetupContext7Class.prototype).toHaveProperty('testConnection');
      expect(SetupContext7Class.prototype).toHaveProperty('showUsageInstructions');
      expect(SetupContext7Class.prototype).toHaveProperty('run');
    });

    it('should handle realistic setup workflow', async () => {
      fs.existsSync.mockImplementation(path => {
        if (path === '.claude') return false;
        if (path === '.claude/.env') return false;
        if (path === '.claude/.env.example') return false;
        return false;
      });
      fs.readFileSync.mockReturnValue('CONTEXT7_API_KEY=your-context7-api-key-here\nCONTEXT7_WORKSPACE=your-context7-workspace-here');
      execSync.mockReturnValue('');

      const setup = new SetupContext7();
      jest.spyOn(setup, 'commandExists').mockReturnValue(true);
      jest.spyOn(setup, 'print');

      await setup.run();

      expect(setup.print).toHaveBeenCalledWith('🔮 Setting up Context7 MCP integration...', 'blue');
      expect(setup.print).toHaveBeenCalledWith('✅ Created .claude/.env file with defaults', 'green');
      expect(setup.print).toHaveBeenCalledWith('✅ Installed @modelcontextprotocol/server-filesystem', 'green');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle complete failure scenario', async () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const setup = new SetupContext7();
      jest.spyOn(setup, 'print');

      await setup.run();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle Node.js not installed scenario', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('CONTEXT7_API_KEY=your-context7-api-key-here\nCONTEXT7_WORKSPACE=your-context7-workspace-here');

      const setup = new SetupContext7();
      jest.spyOn(setup, 'setupEnvFile').mockReturnValue(true);
      jest.spyOn(setup, 'commandExists').mockReturnValue(false);
      jest.spyOn(setup, 'print');

      await setup.run();

      expect(setup.print).toHaveBeenCalledWith('❌ npm/npx not found. Please install Node.js first.', 'red');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});