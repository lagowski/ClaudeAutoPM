const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mcpCommand = require('../../bin/commands/mcp');

describe('MCP Command', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-cmd-test-'));

    // Save original working directory
    originalCwd = process.cwd();

    // Change to temp directory
    process.chdir(tempDir);

    // Create basic .claude structure
    fs.mkdirSync(path.join(tempDir, '.claude', 'mcp'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.claude', 'agents'), { recursive: true });

    // Create minimal config
    fs.writeFileSync(
      path.join(tempDir, '.claude', 'config.json'),
      JSON.stringify({ mcp: { activeServers: [] } }, null, 2)
    );
  });

  afterEach(() => {
    // Restore working directory
    process.chdir(originalCwd);

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('command structure', () => {
    it('should have correct command name', () => {
      assert.strictEqual(mcpCommand.command, 'mcp <action> [name]');
    });

    it('should have description', () => {
      assert.ok(mcpCommand.describe);
      assert.ok(mcpCommand.describe.includes('MCP'));
    });

    it('should have builder function', () => {
      assert.strictEqual(typeof mcpCommand.builder, 'function');
    });

    it('should have handler function', () => {
      assert.strictEqual(typeof mcpCommand.handler, 'function');
    });
  });

  describe('list action', () => {
    it('should list MCP servers without error', async () => {
      const argv = { action: 'list' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('sync action', () => {
    it('should sync MCP configuration without error', async () => {
      const argv = { action: 'sync' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('validate action', () => {
    it('should validate MCP configuration without error', async () => {
      const argv = { action: 'validate' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('check action', () => {
    it('should check MCP configuration without error', async () => {
      const argv = { action: 'check' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('status action', () => {
    it('should show MCP status without error', async () => {
      const argv = { action: 'status' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('tree action', () => {
    it('should show MCP tree without error', async () => {
      const argv = { action: 'tree' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('usage action', () => {
    it('should show MCP usage without error', async () => {
      const argv = { action: 'usage' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('agents action', () => {
    it('should list agents using MCP without error', async () => {
      const argv = { action: 'agents' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('enable action', () => {
    it('should require server name', async () => {
      const argv = { action: 'enable' };

      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('EXIT');
      };

      try {
        await mcpCommand.handler(argv);
      } catch (e) {
        // Expected to throw
      }

      process.exit = originalExit;
      assert.strictEqual(exitCode, 1);
    });
  });

  describe('disable action', () => {
    it('should require server name', async () => {
      const argv = { action: 'disable' };

      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('EXIT');
      };

      try {
        await mcpCommand.handler(argv);
      } catch (e) {
        // Expected to throw
      }

      process.exit = originalExit;
      assert.strictEqual(exitCode, 1);
    });
  });

  describe('remove action', () => {
    it('should require server name', async () => {
      const argv = { action: 'remove' };

      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('EXIT');
      };

      try {
        await mcpCommand.handler(argv);
      } catch (e) {
        // Expected to throw
      }

      process.exit = originalExit;
      assert.strictEqual(exitCode, 1);
    });
  });

  describe('info action', () => {
    it('should require server name', async () => {
      const argv = { action: 'info' };

      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('EXIT');
      };

      try {
        await mcpCommand.handler(argv);
      } catch (e) {
        // Expected to throw
      }

      process.exit = originalExit;
      assert.strictEqual(exitCode, 1);
    });
  });

  describe('diagnose action', () => {
    it('should run diagnostics', async () => {
      const argv = { action: 'diagnose' };

      // Should not throw
      await mcpCommand.handler(argv);
      assert.ok(true);
    });
  });

  describe('error handling', () => {
    it('should handle unknown action', async () => {
      const argv = { action: 'unknown-action' };

      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('EXIT');
      };

      try {
        await mcpCommand.handler(argv);
      } catch (e) {
        // Expected to throw
      }

      process.exit = originalExit;
      assert.strictEqual(exitCode, 1);
    });
  });
});
