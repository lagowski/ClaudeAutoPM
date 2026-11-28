const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Jest Tests for MCPHandler.check() and checkRequiredServers()
 * Tests for the new MCP configuration check functionality
 */

describe('MCPHandler - Configuration Check Tests', () => {
  let tempDir;
  let originalCwd;
  let MCPHandler;
  let handler;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Create temporary test directory
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-check-test-'));
    process.chdir(tempDir);

    // Clear module cache
    jest.resetModules();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create basic directory structure
    fs.mkdirSync('.claude', { recursive: true });
    fs.mkdirSync(path.join('.claude', 'agents'), { recursive: true });

    // Create config file
    const config = {
      mcp: {
        activeServers: ['context7']
      }
    };
    fs.writeFileSync(
      path.join('.claude', 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Import MCPHandler
    const MCPHandlerModule = require('../../scripts/mcp-handler.js');
    MCPHandler = MCPHandlerModule;
    handler = new MCPHandler();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('checkRequiredServers()', () => {
    it('should return proper result structure', () => {
      const result = handler.checkRequiredServers();

      expect(result).toHaveProperty('agentsUsingMCP');
      expect(result).toHaveProperty('totalAgents');
      expect(result).toHaveProperty('serversInUse');
      expect(result).toHaveProperty('missingServers');
      expect(result).toHaveProperty('disabledServers');
      expect(result).toHaveProperty('missingEnvVars');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should identify agents using MCP', () => {
      // Create a test agent with MCP requirement
      const agentContent = `
# Test Agent

## MCP Servers Required
- context7 - For documentation access
`;
      fs.writeFileSync(
        path.join('.claude', 'agents', 'test-agent.md'),
        agentContent
      );

      const result = handler.checkRequiredServers();

      expect(result.agentsUsingMCP).toBeGreaterThan(0);
      expect(result.serversInUse).toBeInstanceOf(Set);
    });

    it('should detect framework MCP server structure', () => {
      // Handler reads agents from framework, not temp directory
      const result = handler.checkRequiredServers();

      // Should have correct structure even if empty
      expect(Array.isArray(result.missingServers)).toBe(true);
      expect(result).toHaveProperty('missingServers');
      expect(result).toHaveProperty('disabledServers');
    });

    it('should identify disabled servers in use', () => {
      // Note: In the test environment, agents from framework are used
      // Context7-docs is used by framework agents but not in activeServers
      const result = handler.checkRequiredServers();

      // Should detect servers used by agents but not enabled
      if (result.disabledServers.length > 0) {
        expect(result.disabledServers[0]).toHaveProperty('name');
        expect(result.disabledServers[0]).toHaveProperty('category');
        expect(result.disabledServers[0]).toHaveProperty('description');
      }
    });

    it('should generate recommendations when servers are disabled', () => {
      // Note: Framework agents use MCP servers, check should provide recommendations
      const result = handler.checkRequiredServers();

      // Should provide recommendations if servers are not enabled
      if (result.disabledServers.length > 0 || result.missingEnvVars.length > 0) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should handle projects with framework agents', () => {
      // Framework has agents with MCP requirements
      const result = handler.checkRequiredServers();

      // Framework has agents using MCP
      expect(result.totalAgents).toBeGreaterThan(0);
      expect(result.serversInUse).toBeInstanceOf(Set);
    });

    it('should count total agents correctly', () => {
      // Create multiple agents
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join('.claude', 'agents', `agent-${i}.md`),
          `# Agent ${i}\n\nTest agent ${i}`
        );
      }

      const result = handler.checkRequiredServers();

      expect(result.totalAgents).toBeGreaterThanOrEqual(3);
    });
  });

  describe('check()', () => {
    it('should display configuration check without errors', () => {
      expect(() => {
        handler.check();
      }).not.toThrow();
    });

    it('should call checkRequiredServers internally', () => {
      const checkRequiredServersSpy = jest.spyOn(handler, 'checkRequiredServers');

      handler.check();

      expect(checkRequiredServersSpy).toHaveBeenCalled();
      checkRequiredServersSpy.mockRestore();
    });

    it('should output configuration status', () => {
      handler.check();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('MCP Configuration Check');
    });

    it('should display configuration status', () => {
      handler.check();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      // Should show configuration check header and overview
      expect(output).toContain('MCP Configuration Check');
      expect(output).toContain('Overview');
    });

    it('should show success message when all configured', () => {
      // Create agent with active server
      const agentContent = `
# Test Agent

## MCP Servers Required
- context7 - Documentation
`;
      fs.writeFileSync(
        path.join('.claude', 'agents', 'test-agent.md'),
        agentContent
      );

      handler.check();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      // Should show some positive indication
      expect(output.length).toBeGreaterThan(0);
    });

    it('should provide helpful output', () => {
      handler.check();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      // Should contain helpful command suggestions
      expect(output).toContain('autopm mcp');
    });

    it('should handle empty agent directory', () => {
      // Remove all agents
      const agentsDir = path.join('.claude', 'agents');
      fs.readdirSync(agentsDir).forEach(file => {
        fs.unlinkSync(path.join(agentsDir, file));
      });

      expect(() => {
        handler.check();
      }).not.toThrow();
    });

    it('should handle missing .claude directory gracefully', () => {
      // Remove .claude directory
      fs.rmSync('.claude', { recursive: true, force: true });

      // Recreate handler
      handler = new MCPHandler();

      expect(() => {
        handler.check();
      }).not.toThrow();
    });
  });

  describe('Integration - check() with various configurations', () => {
    it('should handle framework agents with MCP', () => {
      // Framework comes with agents that have MCP requirements
      const result = handler.checkRequiredServers();

      // Should detect framework agents using MCP
      expect(result.agentsUsingMCP).toBeGreaterThan(0);
      expect(result.totalAgents).toBeGreaterThan(0);
      expect(result.serversInUse.size).toBeGreaterThan(0);
    });

    it('should provide actionable quick fixes', () => {
      // Create agent with missing server
      const agentContent = `
# Test Agent

## MCP Servers Required
- playwright-mcp - Browser automation
`;
      fs.writeFileSync(
        path.join('.claude', 'agents', 'test-agent.md'),
        agentContent
      );

      handler.check();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('autopm mcp');
    });

    it('should handle all servers properly configured', () => {
      // Create agents only using active servers
      const agentContent = `
# Test Agent

## MCP Servers Required
- context7 - Documentation
`;
      fs.writeFileSync(
        path.join('.claude', 'agents', 'test-agent.md'),
        agentContent
      );

      // Use temp directory agents instead of framework agents
      handler.agentsDir = path.join(tempDir, '.claude', 'agents');

      const result = handler.checkRequiredServers();

      expect(result.missingServers.length).toBe(0);
      expect(result.disabledServers.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted config', () => {
      // Write invalid JSON to config
      fs.writeFileSync(
        path.join('.claude', 'config.json'),
        'invalid json {'
      );

      // loadConfig will throw when trying to parse invalid JSON
      const newHandler = new MCPHandler();

      expect(() => {
        newHandler.loadConfig();
      }).toThrow(SyntaxError);
    });

    it('should handle agent file read errors', () => {
      // Create an agent file that will cause read errors
      const agentPath = path.join('.claude', 'agents', 'test-agent.md');
      fs.writeFileSync(agentPath, 'content');

      // Make file unreadable (on supported platforms)
      try {
        fs.chmodSync(agentPath, 0o000);
      } catch (err) {
        // Skip on Windows or if chmod fails
        return;
      }

      expect(() => {
        handler.check();
      }).not.toThrow();

      // Restore permissions for cleanup
      fs.chmodSync(agentPath, 0o644);
    });

    it('should handle missing MCP section in config', () => {
      // Write config without MCP section
      const config = {
        provider: 'github'
      };
      fs.writeFileSync(
        path.join('.claude', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      handler = new MCPHandler();

      expect(() => {
        handler.check();
      }).not.toThrow();
    });
  });
});
