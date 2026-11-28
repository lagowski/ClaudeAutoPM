const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Jest TDD Tests for Extended MCP Features
 * Testing new MCP functionality: agents analysis, setup wizard, diagnostics, visualization
 *
 * TDD Approach:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implement minimal code to pass
 * 3. REFACTOR: Improve code quality
 */

describe('MCP Handler - Extended Features (TDD)', () => {
  let tempDir;
  let originalCwd;
  let MCPHandler;
  let handler;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Create temporary test directory
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-extended-test-'));
    process.chdir(tempDir);

    // Clear module cache
    jest.resetModules();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create directory structure
    fs.mkdirSync('.claude', { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'autopm', '.claude', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'autopm', '.claude', 'mcp'), { recursive: true });

    // Import MCPHandler
    const MCPHandlerModule = require('../../scripts/mcp-handler.js');
    MCPHandler = MCPHandlerModule;

    // Create handler instance
    handler = new MCPHandler();

    // Override paths for testing
    handler.projectRoot = tempDir;
    handler.frameworkRoot = tempDir;
    handler.mcpDir = path.join(tempDir, 'autopm', '.claude', 'mcp');
    handler.agentsDir = path.join(tempDir, 'autopm', '.claude', 'agents');
    handler.configPath = path.join(tempDir, '.claude', 'config.json');
    handler.mcpServersPath = path.join(tempDir, '.claude', 'mcp-servers.json');
    handler.envPath = path.join(tempDir, '.claude', '.env');
  });

  afterEach(() => {
    // Restore console
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (consoleWarnSpy) consoleWarnSpy.mockRestore();

    // Cleanup
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================
  // PHASE 2: Agent Analysis Tests
  // ==========================================

  describe('analyzeAgents() - Agent MCP Usage Analysis', () => {
    beforeEach(() => {
      // Create mock agent files with MCP references
      const agentsDir = handler.agentsDir;

      // Agent using context7
      fs.writeFileSync(
        path.join(agentsDir, 'react-frontend.md'),
        `---
name: react-frontend-engineer
---
Use mcp://context7/react/latest for documentation.
Access via mcp://context7/typescript/react for types.
`
      );

      // Agent using multiple MCP servers
      fs.writeFileSync(
        path.join(agentsDir, 'python-backend.md'),
        `---
name: python-backend-engineer
---
Documentation: mcp://context7/python/fastapi
Codebase: mcp://context7/project/analyze
Database: mcp://sqlite-mcp/query
`
      );

      // Agent without MCP
      fs.writeFileSync(
        path.join(agentsDir, 'simple-agent.md'),
        `---
name: simple-agent
---
This agent does not use MCP.
`
      );

      // Create MCP server definitions
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
category: documentation
status: active
---
`
      );

      fs.writeFileSync(
        path.join(handler.mcpDir, 'sqlite-mcp.md'),
        `---
name: sqlite-mcp
category: database
status: active
---
`
      );
    });

    test('should analyze all agents and find MCP usage', () => {
      expect(handler.analyzeAgents).toBeDefined();

      const result = handler.analyzeAgents();

      expect(result).toHaveProperty('totalAgents');
      expect(result).toHaveProperty('agentsWithMCP');
      expect(result).toHaveProperty('agentsWithoutMCP');
      expect(result).toHaveProperty('mcpUsage');

      expect(result.totalAgents).toBe(3);
      expect(result.agentsWithMCP).toBe(2);
      expect(result.agentsWithoutMCP).toBe(1);
    });

    test('should map agents to their MCP servers', () => {
      const result = handler.analyzeAgents();

      expect(result.mcpUsage).toHaveProperty('react-frontend-engineer');
      expect(result.mcpUsage['react-frontend-engineer']).toContain('context7');

      expect(result.mcpUsage).toHaveProperty('python-backend-engineer');
      expect(result.mcpUsage['python-backend-engineer']).toContain('context7');
      expect(result.mcpUsage['python-backend-engineer']).toContain('context7');
      expect(result.mcpUsage['python-backend-engineer']).toContain('sqlite-mcp');
    });

    test('should identify agents without MCP usage', () => {
      const result = handler.analyzeAgents();

      expect(result.mcpUsage).not.toHaveProperty('simple-agent');
    });

    test('should handle nested agent directories', () => {
      // Create subdirectory with agent
      const subDir = path.join(handler.agentsDir, 'frameworks');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(
        path.join(subDir, 'nestjs-expert.md'),
        `---
name: nestjs-expert
---
Use mcp://context7/nestjs for documentation.
`
      );

      const result = handler.analyzeAgents();

      expect(result.totalAgents).toBe(4);
      expect(result.mcpUsage).toHaveProperty('nestjs-expert');
    });

    test('should handle agents with invalid MCP URIs', () => {
      fs.writeFileSync(
        path.join(handler.agentsDir, 'invalid-agent.md'),
        `---
name: invalid-agent
---
Use mcp:// for documentation (invalid URI).
Use mcp://unknown-server/path (unknown server).
`
      );

      const result = handler.analyzeAgents();

      // Should still count as agent using MCP
      expect(result.agentsWithMCP).toBeGreaterThan(0);
    });

    test('should extract MCP URIs correctly', () => {
      const result = handler.analyzeAgents();

      expect(result.mcpUsage['python-backend-engineer']).toEqual(
        expect.arrayContaining(['context7', 'context7', 'sqlite-mcp'])
      );
    });

    test('should handle empty agents directory', () => {
      // Remove all agent files
      const files = fs.readdirSync(handler.agentsDir);
      files.forEach(file => {
        const filePath = path.join(handler.agentsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });

      const result = handler.analyzeAgents();

      expect(result.totalAgents).toBe(0);
      expect(result.agentsWithMCP).toBe(0);
      expect(Object.keys(result.mcpUsage)).toHaveLength(0);
    });
  });

  describe('getAgentMCP() - Get MCP Usage for Specific Agent', () => {
    beforeEach(() => {
      // Create agent files
      fs.writeFileSync(
        path.join(handler.agentsDir, 'react-frontend.md'),
        `---
name: react-frontend-engineer
---
Use mcp://context7/react/latest
Access mcp://context7/typescript/react
`
      );
    });

    test('should return MCP servers for specific agent', () => {
      expect(handler.getAgentMCP).toBeDefined();

      const result = handler.getAgentMCP('react-frontend-engineer');

      expect(result).toHaveProperty('agentName');
      expect(result).toHaveProperty('mcpServers');
      expect(result).toHaveProperty('found');

      expect(result.found).toBe(true);
      expect(result.agentName).toBe('react-frontend-engineer');
      expect(result.mcpServers).toContain('context7');
    });

    test('should return empty result for non-existent agent', () => {
      const result = handler.getAgentMCP('non-existent-agent');

      expect(result.found).toBe(false);
      expect(result.mcpServers).toEqual([]);
    });

    test('should return empty result for agent without MCP', () => {
      fs.writeFileSync(
        path.join(handler.agentsDir, 'no-mcp-agent.md'),
        `---
name: no-mcp-agent
---
This agent has no MCP references.
`
      );

      const result = handler.getAgentMCP('no-mcp-agent');

      expect(result.found).toBe(true);
      expect(result.mcpServers).toEqual([]);
    });

    test('should include MCP server details when available', () => {
      // Create MCP server definition
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
category: documentation
description: Context7 documentation server
status: active
command: npx
args: ["@context7/mcp-server"]
---
`
      );

      const result = handler.getAgentMCP('react-frontend-engineer');

      expect(result).toHaveProperty('serverDetails');
      expect(result.serverDetails[0]).toHaveProperty('name');
      expect(result.serverDetails[0]).toHaveProperty('category');
      expect(result.serverDetails[0].name).toBe('context7');
    });
  });

  describe('mcpAgents() - Display Agents Using MCP', () => {
    beforeEach(() => {
      // Create test agents
      fs.writeFileSync(
        path.join(handler.agentsDir, 'react-frontend.md'),
        `---
name: react-frontend-engineer
---
Use mcp://context7/react
`
      );

      fs.writeFileSync(
        path.join(handler.agentsDir, 'python-backend.md'),
        `---
name: python-backend-engineer
---
Use mcp://context7/python
Use mcp://sqlite-mcp/query
`
      );
    });

    test('should display agents using MCP', () => {
      expect(handler.mcpAgents).toBeDefined();

      handler.mcpAgents();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('react-frontend-engineer');
      expect(output).toContain('python-backend-engineer');
      expect(output).toContain('context7');
    });

    test('should show message when no agents use MCP', () => {
      // Remove all agents
      const files = fs.readdirSync(handler.agentsDir);
      files.forEach(file => {
        const filePath = path.join(handler.agentsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });

      handler.mcpAgents();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toMatch(/no agents.*using MCP/i);
    });

    test('should group agents by MCP server when --by-server flag is used', () => {
      expect(handler.mcpAgents).toBeDefined();

      handler.mcpAgents({ groupBy: 'server' });

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Should show MCP servers as headers
      expect(output).toContain('context7');
      expect(output).toContain('sqlite-mcp');
    });
  });

  describe('mcpAgent() - Display MCP Configuration for Specific Agent', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(handler.agentsDir, 'react-frontend.md'),
        `---
name: react-frontend-engineer
description: React development expert
---
Use mcp://context7/react/latest for documentation.
`
      );

      // Create MCP server def
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
category: documentation
command: npx
args: ["@context7/mcp-server"]
env:
  CONTEXT7_API_KEY: "\${CONTEXT7_API_KEY:-}"
---
`
      );

      // Create config with active servers
      fs.writeFileSync(
        handler.configPath,
        JSON.stringify({
          mcp: {
            activeServers: ['context7']
          }
        }, null, 2)
      );
    });

    test('should display MCP configuration for specific agent', () => {
      expect(handler.mcpAgent).toBeDefined();

      handler.mcpAgent('react-frontend-engineer');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('react-frontend-engineer');
      expect(output).toContain('context7');
    });

    test('should show if MCP servers are active or inactive', () => {
      handler.mcpAgent('react-frontend-engineer');

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');

      // context7 is active
      expect(output).toMatch(/context7|active/i);
    });

    test('should show error for non-existent agent', () => {
      handler.mcpAgent('non-existent-agent');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toMatch(/not found/i);
    });

    test('should show message when agent does not use MCP', () => {
      fs.writeFileSync(
        path.join(handler.agentsDir, 'no-mcp.md'),
        `---
name: no-mcp-agent
---
No MCP usage here.
`
      );

      handler.mcpAgent('no-mcp-agent');

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toMatch(/does not use.*MCP/i);
    });

    test('should include environment variable requirements', () => {
      handler.mcpAgent('react-frontend-engineer');

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('CONTEXT7_API_KEY');
    });
  });

  describe('mcpUsage() - Display MCP Usage Map', () => {
    beforeEach(() => {
      // Create multiple agents
      fs.writeFileSync(
        path.join(handler.agentsDir, 'react-frontend.md'),
        'Use mcp://context7/react\n'
      );

      fs.writeFileSync(
        path.join(handler.agentsDir, 'python-backend.md'),
        'Use mcp://context7/python\nUse mcp://sqlite-mcp/query\n'
      );

      fs.writeFileSync(
        path.join(handler.agentsDir, 'nodejs-backend.md'),
        'Use mcp://context7/nodejs\n'
      );
    });

    test('should display MCP usage map', () => {
      expect(handler.mcpUsage).toBeDefined();

      handler.mcpUsage();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('context7');
      expect(output).toContain('sqlite-mcp');
    });

    test('should show agents grouped by MCP server', () => {
      handler.mcpUsage();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // context7 is used by 3 agents
      expect(output).toMatch(/context7.*3/);
      // sqlite-mcp is used by 1 agent
      expect(output).toMatch(/sqlite-mcp.*1/);
    });

    test('should show statistics summary', () => {
      handler.mcpUsage();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toMatch(/total agents.*3/i);
      expect(output).toMatch(/mcp servers.*2/i);
    });
  });

  // ==========================================
  // PHASE 3: Interactive Setup Wizard Tests
  // ==========================================

  describe('setupWizard() - Interactive API Key Setup', () => {
    beforeEach(() => {
      // Create config with active servers
      fs.writeFileSync(
        handler.configPath,
        JSON.stringify({
          mcp: {
            activeServers: ['context7', 'github-mcp']
          }
        }, null, 2)
      );

      // Create MCP server definitions
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
env:
  CONTEXT7_API_KEY: "\${CONTEXT7_API_KEY:-}"
  CONTEXT7_WORKSPACE: "\${CONTEXT7_WORKSPACE:-}"
---
`
      );

      fs.writeFileSync(
        path.join(handler.mcpDir, 'github-mcp.md'),
        `---
name: github-mcp
env:
  GITHUB_TOKEN: "\${GITHUB_TOKEN:-}"
---
`
      );
    });

    test('should detect required environment variables', async () => {
      expect(handler.setupWizard).toBeDefined();

      const requiredVars = handler.detectRequiredEnvVars();

      expect(requiredVars).toContain('CONTEXT7_API_KEY');
      expect(requiredVars).toContain('CONTEXT7_WORKSPACE');
      expect(requiredVars).toContain('GITHUB_TOKEN');
    });

    test('should check which env vars are already configured', () => {
      // Create .env file with some vars
      fs.writeFileSync(
        handler.envPath,
        'GITHUB_TOKEN=ghp_test123\n'
      );

      const status = handler.checkEnvVarsStatus();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('missing');

      expect(status.configured).toContain('GITHUB_TOKEN');
      expect(status.missing).toContain('CONTEXT7_API_KEY');
      expect(status.missing).toContain('CONTEXT7_WORKSPACE');
    });

    test('should display setup wizard interface', async () => {
      // Mock readline for non-interactive test
      const mockReadline = {
        question: jest.fn((prompt, callback) => callback('test-value')),
        close: jest.fn()
      };

      handler.setupWizard({ readline: mockReadline });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toMatch(/setup/i);
      expect(output).toContain('CONTEXT7_API_KEY');
    });

    test('should save env vars to .claude/.env file', () => {
      handler.saveEnvVars({
        CONTEXT7_API_KEY: 'test-key-123',
        GITHUB_TOKEN: 'ghp_test456'
      });

      expect(fs.existsSync(handler.envPath)).toBe(true);
      const content = fs.readFileSync(handler.envPath, 'utf8');

      expect(content).toContain('CONTEXT7_API_KEY=test-key-123');
      expect(content).toContain('GITHUB_TOKEN=ghp_test456');
    });

    test('should preserve existing env vars when adding new ones', () => {
      // Create existing .env
      fs.writeFileSync(
        handler.envPath,
        'EXISTING_VAR=existing-value\n'
      );

      handler.saveEnvVars({
        NEW_VAR: 'new-value'
      });

      const content = fs.readFileSync(handler.envPath, 'utf8');

      expect(content).toContain('EXISTING_VAR=existing-value');
      expect(content).toContain('NEW_VAR=new-value');
    });

    test('should validate env var format', () => {
      expect(handler.validateEnvVar).toBeDefined();

      expect(handler.validateEnvVar('VALID_VAR', 'valid-value')).toBe(true);
      expect(handler.validateEnvVar('INVALID VAR', 'value')).toBe(false);
      expect(handler.validateEnvVar('VALID_VAR', '')).toBe(false);
    });
  });

  // ==========================================
  // PHASE 4: Diagnostics Tests
  // ==========================================

  describe('diagnose() - MCP Configuration Diagnostics', () => {
    beforeEach(() => {
      // Create config
      fs.writeFileSync(
        handler.configPath,
        JSON.stringify({
          mcp: {
            activeServers: ['context7', 'broken-server']
          }
        }, null, 2)
      );

      // Create MCP server that exists
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
command: npx
args: ["@context7/mcp-server"]
env:
  CONTEXT7_API_KEY: "\${CONTEXT7_API_KEY:-}"
---
`
      );

      // broken-server is enabled but doesn't exist
    });

    test('should run comprehensive diagnostics', () => {
      expect(handler.diagnose).toBeDefined();

      const result = handler.diagnose();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should check if .claude directory exists', () => {
      const result = handler.diagnose();

      const claudeDirCheck = result.checks.find(c => c.name.includes('.claude'));
      expect(claudeDirCheck).toBeDefined();
      expect(claudeDirCheck.passed).toBe(true);
    });

    test('should check if config.json exists and is valid', () => {
      const result = handler.diagnose();

      const configCheck = result.checks.find(c => c.name.includes('config'));
      expect(configCheck).toBeDefined();
      expect(configCheck.passed).toBe(true);
    });

    test('should detect missing MCP server definitions', () => {
      const result = handler.diagnose();

      const hasError = result.errors.some(err => err.includes('broken-server'));
      expect(hasError).toBe(true);
    });

    test('should check for missing environment variables', () => {
      const result = handler.diagnose();

      const envCheck = result.checks.find(c => c.name.includes('environment'));
      expect(envCheck).toBeDefined();

      // CONTEXT7_API_KEY is required but not set
      const hasWarning = result.warnings.some(warn => warn.includes('CONTEXT7_API_KEY'));
      expect(hasWarning).toBe(true);
    });

    test('should validate mcp-servers.json if exists', () => {
      fs.writeFileSync(
        handler.mcpServersPath,
        '{ invalid json }'
      );

      const result = handler.diagnose();

      const hasError = result.errors.some(err => err.includes('mcp-servers.json'));
      expect(hasError).toBe(true);
    });

    test('should check agent directory existence', () => {
      const result = handler.diagnose();

      const agentDirCheck = result.checks.find(c => c.name.includes('agents'));
      expect(agentDirCheck).toBeDefined();
    });

    test('should provide overall health status', () => {
      const result = handler.diagnose();

      expect(['healthy', 'warning', 'error']).toContain(result.status);
    });

    test('should display diagnostics output', () => {
      handler.diagnose();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toMatch(/diagnostic/i);
    });
  });

  describe('testServer() - Test MCP Server Connection', () => {
    beforeEach(() => {
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
command: npx
args: ["@context7/mcp-server"]
env:
  CONTEXT7_API_KEY: "\${CONTEXT7_API_KEY:-}"
---
`
      );
    });

    test('should test specific MCP server', async () => {
      expect(handler.testServer).toBeDefined();

      const result = await handler.testServer('context7');

      expect(result).toHaveProperty('serverName');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    test('should check if server definition exists', async () => {
      const result = await handler.testServer('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });

    test('should check required environment variables', async () => {
      // context7 requires CONTEXT7_API_KEY which is not set in test env
      const result = await handler.testServer('context7');

      // In test environment, CONTEXT7_API_KEY should be missing
      expect(result.message).toMatch(/missing.*environment|server configuration/i);
    });

    test('should validate server command accessibility', async () => {
      const result = await handler.testServer('context7');

      expect(result).toHaveProperty('commandCheck');
    });
  });

  // ==========================================
  // PHASE 5: Visualization Tests
  // ==========================================

  describe('generateTree() - Generate Agent-MCP Dependency Tree', () => {
    beforeEach(() => {
      // Create agents in different categories
      fs.mkdirSync(path.join(handler.agentsDir, 'frontend'), { recursive: true });
      fs.mkdirSync(path.join(handler.agentsDir, 'backend'), { recursive: true });

      fs.writeFileSync(
        path.join(handler.agentsDir, 'frontend', 'react-engineer.md'),
        'Use mcp://context7/react\n'
      );

      fs.writeFileSync(
        path.join(handler.agentsDir, 'backend', 'python-engineer.md'),
        'Use mcp://context7/python\nUse mcp://sqlite-mcp/query\n'
      );
    });

    test('should generate tree structure', () => {
      expect(handler.generateTree).toBeDefined();

      const tree = handler.generateTree();

      expect(tree).toHaveProperty('nodes');
      expect(tree).toHaveProperty('edges');
    });

    test('should group agents by directory', () => {
      const tree = handler.generateTree();

      const hasFrontend = tree.nodes.some(n => n.type === 'category' && n.name === 'frontend');
      const hasBackend = tree.nodes.some(n => n.type === 'category' && n.name === 'backend');

      expect(hasFrontend).toBe(true);
      expect(hasBackend).toBe(true);
    });

    test('should create edges from agents to MCP servers', () => {
      const tree = handler.generateTree();

      const reactEdge = tree.edges.find(
        e => e.from === 'react-engineer' && e.to === 'context7'
      );
      expect(reactEdge).toBeDefined();
    });

    test('should display tree visualization', () => {
      handler.showTree();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('├─');
      expect(output).toContain('└─');
      expect(output).toContain('react-engineer');
    });

    test('should use colors for different node types', () => {
      handler.showTree();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Check for ANSI color codes (if colors are enabled)
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('showStatus() - Show MCP Servers Status', () => {
    beforeEach(() => {
      // Create config with active servers
      fs.writeFileSync(
        handler.configPath,
        JSON.stringify({
          mcp: {
            activeServers: ['context7']
          }
        }, null, 2)
      );

      // Create MCP servers
      fs.writeFileSync(
        path.join(handler.mcpDir, 'context7.md'),
        `---
name: context7
status: active
---
`
      );

      fs.writeFileSync(
        path.join(handler.mcpDir, 'github-mcp.md'),
        `---
name: github-mcp
status: active
---
`
      );

      // Create .env with some vars
      fs.writeFileSync(
        handler.envPath,
        'CONTEXT7_API_KEY=test123\n'
      );
    });

    test('should show status of all MCP servers', () => {
      expect(handler.showStatus).toBeDefined();

      handler.showStatus();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('context7');
      expect(output).toContain('github-mcp');
    });

    test('should indicate which servers are enabled', () => {
      handler.showStatus();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // context7 is enabled (✅)
      expect(output).toMatch(/context7.*✅|enabled/i);
      // github-mcp is not enabled (⚪)
      expect(output).toMatch(/github-mcp.*⚪|disabled/i);
    });

    test('should show environment variable status', () => {
      // Create MCP server with env vars
      fs.writeFileSync(
        path.join(handler.mcpDir, 'test-server-with-env.md'),
        `---
name: test-server-with-env
env:
  TEST_API_KEY: "\${TEST_API_KEY:-}"
---
`
      );

      // Enable it
      const config = handler.loadConfig();
      config.mcp = config.mcp || {};
      config.mcp.activeServers = [...(config.mcp.activeServers || []), 'test-server-with-env'];
      handler.saveConfig(config);

      handler.showStatus();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');

      expect(output).toMatch(/TEST_API_KEY|Environment/i);
    });

    test('should show total statistics', () => {
      handler.showStatus();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toMatch(/total.*2/i);
      expect(output).toMatch(/enabled.*1/i);
    });

    test('should show agent usage count per server', () => {
      // Create agent using context7
      fs.writeFileSync(
        path.join(handler.agentsDir, 'test-agent.md'),
        'Use mcp://context7/test\n'
      );

      handler.showStatus();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');

      expect(output).toMatch(/context7|agent/i);
    });
  });

  describe('Environment Status Caching', () => {
    beforeEach(() => {
      // Create .env file with some vars
      fs.writeFileSync(
        path.join(handler.projectRoot, '.claude', '.env'),
        'CONTEXT7_API_KEY=test123\nGITHUB_TOKEN=ghp_test\n'
      );

      // Create MCP server requiring env vars
      fs.writeFileSync(
        path.join(handler.mcpDir, 'test-server.md'),
        `---
name: test-server
env:
  TEST_VAR: "\${TEST_VAR:-}"
  ANOTHER_VAR: "\${ANOTHER_VAR:-}"
---
`
      );

      // Enable the server
      const config = handler.loadConfig();
      config.mcp = config.mcp || {};
      config.mcp.activeServers = ['test-server'];
      handler.saveConfig(config);
    });

    test('should cache environment status after first check', () => {
      // First call - should read file and cache
      const result1 = handler.checkEnvVarsStatus();
      expect(result1).toHaveProperty('configured');
      expect(result1).toHaveProperty('missing');

      // Second call with useCache=true - should use cache
      const result2 = handler.checkEnvVarsStatus(true);
      expect(result2).toEqual(result1);

      // Verify cache is stored
      expect(handler._envStatusCache).toBeDefined();
      expect(handler._envStatusCache).toEqual(result1);
    });

    test('should read file when useCache=false even if cache exists', () => {
      // First call - caches result
      handler.checkEnvVarsStatus(true);

      // Modify .env file
      fs.writeFileSync(
        path.join(handler.projectRoot, '.claude', '.env'),
        'CONTEXT7_API_KEY=test123\nGITHUB_TOKEN=ghp_test\nTEST_VAR=test\n'
      );

      // Call with useCache=false - should read file again
      const result = handler.checkEnvVarsStatus(false);
      expect(result.configured).toContain('TEST_VAR');
    });

    test('should invalidate cache when saving new env vars', () => {
      // Create server requiring NEW_VAR
      fs.writeFileSync(
        path.join(handler.mcpDir, 'new-var-server.md'),
        `---
name: new-var-server
env:
  NEW_VAR: "\${NEW_VAR:-}"
---
`
      );

      const config = handler.loadConfig();
      config.mcp.activeServers.push('new-var-server');
      handler.saveConfig(config);

      // First check - caches result
      const result1 = handler.checkEnvVarsStatus(true);
      expect(handler._envStatusCache).toBeDefined();
      expect(result1.missing).toContain('NEW_VAR');

      // Save new env vars
      handler.saveEnvVars({ NEW_VAR: 'value123' });

      // Cache should be invalidated
      expect(handler._envStatusCache).toBeNull();

      // Next check should read file again
      const result2 = handler.checkEnvVarsStatus(true);
      expect(result2.configured).toContain('NEW_VAR');
    });

    test('should reduce file I/O when checking multiple servers', () => {
      // Create multiple servers
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join(handler.mcpDir, `server-${i}.md`),
          `---
name: server-${i}
env:
  VAR_${i}: "\${VAR_${i}:-}"
---
`
        );
      }

      // Enable all servers
      const config = handler.loadConfig();
      config.mcp.activeServers = ['server-1', 'server-2', 'server-3'];
      handler.saveConfig(config);

      // Spy on fs.readFileSync to count file reads
      const readSpy = jest.spyOn(fs, 'readFileSync');
      const originalRead = fs.readFileSync.bind(fs);

      // Let initial config/server loads happen
      readSpy.mockClear();

      // First call - will read .env file
      handler.checkEnvVarsStatus(true);
      const firstCallReads = readSpy.mock.calls.filter(
        call => call[0] && call[0].includes('.env')
      ).length;

      readSpy.mockClear();

      // Multiple subsequent calls with cache - should not read .env again
      handler.checkEnvVarsStatus(true);
      handler.checkEnvVarsStatus(true);
      handler.checkEnvVarsStatus(true);

      const cachedCallReads = readSpy.mock.calls.filter(
        call => call[0] && call[0].includes('.env')
      ).length;

      // Cached calls should not read .env file
      expect(firstCallReads).toBeGreaterThan(0);
      expect(cachedCallReads).toBe(0);

      readSpy.mockRestore();
    });

    test('testServer should benefit from env status caching', async () => {
      // Create server with env requirements
      fs.writeFileSync(
        path.join(handler.mcpDir, 'cacheable-server.md'),
        `---
name: cacheable-server
command: node
args: ["server.js"]
env:
  REQUIRED_VAR: "\${REQUIRED_VAR:-}"
---
`
      );

      const config = handler.loadConfig();
      config.mcp.activeServers = ['cacheable-server'];
      handler.saveConfig(config);

      // Prime the cache
      handler.checkEnvVarsStatus(true);

      // Test server - should use cached env status
      const result = await handler.testServer('cacheable-server');

      expect(result).toHaveProperty('serverName', 'cacheable-server');
      expect(result).toHaveProperty('success');
    });
  });
});
