/**
 * Jest TDD Tests for /core:agent-test Command
 *
 * Tests validate agent configuration, behaviors, and integration
 * following strict TDD methodology.
 */

const fs = require('fs');
const path = require('path');

// Import implementation functions (will be created in Green phase)
const {
  validateAgentFile,
  checkDocumentation,
  validateContext7Queries,
  verifyTools,
  validateExamples,
  testAgentInteraction,
  benchmarkPerformance,
  verifyRegistryConsistency,
  parseFrontmatter,
  validateFrontmatterStructure,
  extractContext7Queries,
  checkToolAvailability,
  parseMarkdownSections,
  validateAgentMetadata
} = require('../../lib/agent-test.js');

describe('/core:agent-test Command Structure Tests', () => {
  const commandPath = path.join(__dirname, '../../commands/core:agent-test.md');
  let commandContent;

  beforeAll(() => {
    if (fs.existsSync(commandPath)) {
      commandContent = fs.readFileSync(commandPath, 'utf8');
    }
  });

  test('command file should exist', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  describe('Required Sections', () => {
    test('should have command title heading', () => {
      expect(commandContent).toContain('# core:agent-test');
    });

    test('should have Description section', () => {
      expect(commandContent).toMatch(/## Description/i);
    });

    test('should have Required Documentation Access section', () => {
      expect(commandContent).toContain('## Required Documentation Access');
    });

    test('should have Usage section', () => {
      expect(commandContent).toMatch(/## Usage/i);
    });

    test('should have Options section', () => {
      expect(commandContent).toMatch(/## Options/i);
    });

    test('should have Examples section', () => {
      expect(commandContent).toMatch(/## Examples/i);
    });

    test('should have Implementation section', () => {
      expect(commandContent).toMatch(/## Implementation/i);
    });
  });

  describe('Context7 Documentation Queries', () => {
    test('points to the shared Context7 rule', () => {
      expect(commandContent).toContain('.claude/rules/context7-required.md');
    });
  });

  describe('Command Options', () => {
    test('should support --agent option for agent selection', () => {
      expect(commandContent).toMatch(/--agent/i);
    });

    test('should support --all option for testing all agents', () => {
      expect(commandContent).toMatch(/--all/i);
    });

    test('should support --validate option for validation only', () => {
      expect(commandContent).toMatch(/--validate/i);
    });

    test('should support --benchmark option for performance testing', () => {
      expect(commandContent).toMatch(/--benchmark/i);
    });

    test('should support --integration option for integration tests', () => {
      expect(commandContent).toMatch(/--integration/i);
    });

    test('should support --registry-check option for registry consistency', () => {
      expect(commandContent).toMatch(/--registry-check/i);
    });

    test('should support --verbose option for detailed output', () => {
      expect(commandContent).toMatch(/--verbose/i);
    });
  });

  describe('Implementation Details', () => {
    test('should reference agent-manager for agent operations', () => {
      expect(commandContent).toMatch(/@agent-manager/);
    });

    test('should reference test-runner for test execution', () => {
      expect(commandContent).toMatch(/@test-runner/);
    });

    test('should include frontmatter validation', () => {
      expect(commandContent).toMatch(/frontmatter.*validation/i);
    });

    test('should include YAML syntax checking', () => {
      expect(commandContent).toMatch(/YAML.*syntax/i);
    });

    test('should include Context7 query validation', () => {
      expect(commandContent).toMatch(/Context7.*quer/i);
    });

    test('should include tool verification', () => {
      expect(commandContent).toMatch(/tool.*verif/i);
    });

    test('should include example validation', () => {
      expect(commandContent).toMatch(/example.*validation/i);
    });

    test('should include performance benchmarking', () => {
      expect(commandContent).toMatch(/performance.*benchmark/i);
    });

    test('should include registry consistency check', () => {
      expect(commandContent).toMatch(/registry.*consistency/i);
    });
  });

  describe('Examples Coverage', () => {
    test('should provide basic agent test example', () => {
      expect(commandContent).toMatch(/\/core:agent-test.*--agent/);
    });

    test('should provide validation example', () => {
      expect(commandContent).toMatch(/\/core:agent-test.*--validate/);
    });

    test('should provide benchmark example', () => {
      expect(commandContent).toMatch(/\/core:agent-test.*--benchmark/);
    });

    test('should provide integration test example', () => {
      expect(commandContent).toMatch(/\/core:agent-test.*--integration/);
    });

    test('should provide registry check example', () => {
      expect(commandContent).toMatch(/\/core:agent-test.*--registry-check/);
    });
  });

  describe('Output Format', () => {
    test('should describe validation results output', () => {
      expect(commandContent).toMatch(/validation.*result/i);
    });

    test('should describe test summary output', () => {
      expect(commandContent).toMatch(/test.*summary/i);
    });

    test('should describe performance metrics output', () => {
      expect(commandContent).toMatch(/performance.*metric/i);
    });

    test('should describe registry status output', () => {
      expect(commandContent).toMatch(/registry.*status/i);
    });
  });
});

describe('Agent File Validation', () => {
  describe('validateAgentFile', () => {
    test('should validate agent file exists', () => {
      const result = validateAgentFile('test-agent.md');
      expect(result).toHaveProperty('exists');
    });

    test('should validate frontmatter presence', () => {
      const content = `---
name: test-agent
description: Test agent
---
# Test Agent`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.hasFrontmatter).toBe(true);
    });

    test('should detect missing frontmatter', () => {
      const content = '# Agent Without Frontmatter';
      const result = validateAgentFile(content, { isContent: true });
      expect(result.hasFrontmatter).toBe(false);
      expect(result.errors).toContain('Missing frontmatter');
    });

    test('should validate YAML syntax', () => {
      const content = `---
name: test-agent
description: Test
tags:
  - test
  - validation
---`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.validYAML).toBe(true);
    });

    test('should detect invalid YAML syntax', () => {
      const content = `---
name: test-agent
description: "unclosed quote
---`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.validYAML).toBe(false);
    });

    test('should validate required frontmatter fields', () => {
      const content = `---
name: test-agent
description: Test agent
tools: [Read, Write]
model: claude-sonnet-4
color: blue
---`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.hasRequiredFields).toBe(true);
    });

    test('should detect missing required fields', () => {
      const content = `---
name: test-agent
---`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.hasRequiredFields).toBe(false);
      expect(result.missingFields).toContain('description');
    });

    test('should validate markdown structure', () => {
      const content = `---
name: test
description: Test
---
# Agent Name
## Expertise
## Usage`;
      const result = validateAgentFile(content, { isContent: true });
      expect(result.validMarkdown).toBe(true);
    });
  });

  describe('parseFrontmatter', () => {
    test('should extract frontmatter from content', () => {
      const content = `---
name: test-agent
description: Test
---
Content here`;
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.name).toBe('test-agent');
      expect(frontmatter.description).toBe('Test');
    });

    test('should return null for missing frontmatter', () => {
      const content = 'No frontmatter here';
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter).toBeNull();
    });

    test('should parse arrays in frontmatter', () => {
      const content = `---
tags:
  - tag1
  - tag2
---`;
      const frontmatter = parseFrontmatter(content);
      expect(frontmatter.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('validateFrontmatterStructure', () => {
    test('should validate complete frontmatter structure', () => {
      const frontmatter = {
        name: 'test-agent',
        description: 'Test agent',
        tools: ['Read', 'Write'],
        model: 'claude-sonnet-4',
        color: 'blue'
      };
      const result = validateFrontmatterStructure(frontmatter);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid frontmatter structure', () => {
      const frontmatter = {
        name: 'test'
      };
      const result = validateFrontmatterStructure(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Documentation Checks', () => {
  describe('checkDocumentation', () => {
    test('should verify description completeness', () => {
      const content = `
## Description
This is a complete description with multiple sentences.
It provides clear information about the agent's purpose.
`;
      const result = checkDocumentation(content);
      expect(result.hasDescription).toBe(true);
      expect(result.descriptionComplete).toBe(true);
    });

    test('should detect incomplete description', () => {
      const content = `
## Description
Short.
`;
      const result = checkDocumentation(content);
      expect(result.descriptionComplete).toBe(false);
    });

    test('should check for examples section', () => {
      const content = `
## Examples
\`\`\`
example code
\`\`\`
`;
      const result = checkDocumentation(content);
      expect(result.hasExamples).toBe(true);
    });

    test('should detect missing examples', () => {
      const content = '# Agent\nNo examples here';
      const result = checkDocumentation(content);
      expect(result.hasExamples).toBe(false);
    });

    test('should verify Context7 queries section exists', () => {
      const content = `
Query Context7 first: see \`.claude/rules/context7-required.md\`. Libraries: jest.
`;
      const result = checkDocumentation(content);
      expect(result.hasContext7Section).toBe(true);
    });

    test('should verify tool listings', () => {
      const content = `
## Tools
- Read
- Write
- Bash
`;
      const result = checkDocumentation(content);
      expect(result.hasToolsList).toBe(true);
    });
  });

  describe('parseMarkdownSections', () => {
    test('should extract all sections from markdown', () => {
      const content = `
# Title
## Section 1
Content 1
## Section 2
Content 2
`;
      const sections = parseMarkdownSections(content);
      expect(sections).toHaveProperty('Section 1');
      expect(sections).toHaveProperty('Section 2');
    });

    test('should handle nested headers', () => {
      const content = `
## Main Section
### Subsection
Content
`;
      const sections = parseMarkdownSections(content);
      expect(sections['Main Section']).toBeDefined();
    });
  });
});

describe('Context7 Validation', () => {
  describe('validateContext7Queries', () => {
    test('should verify Context7 libraries exist', () => {
      const result = validateContext7Queries(['jest', 'yaml']);
      expect(result.hasQueries).toBe(true);
      expect(result.queryCount).toBe(2);
    });

    test('should validate library name format', () => {
      const result = validateContext7Queries(['react-router']);
      expect(result.validFormat).toBe(true);
    });

    test('should detect invalid library name format', () => {
      const result = validateContext7Queries(['not a library']);
      expect(result.validFormat).toBe(false);
      expect(result.errors).toContain('Invalid query format');
    });

    test('should check library relevance to agent purpose', () => {
      const result = validateContext7Queries(['jest-testing'], { agentPurpose: 'testing and validation' });
      expect(result.relevant).toBe(true);
    });

    test('should detect empty libraries list', () => {
      const result = validateContext7Queries([]);
      expect(result.hasQueries).toBe(false);
      expect(result.errors).toContain('No Context7 queries found');
    });
  });

  describe('extractContext7Queries', () => {
    test('should extract libraries from the Context7 pointer', () => {
      const content = 'Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: jest, yaml.\n';
      expect(extractContext7Queries(content)).toEqual(['jest', 'yaml']);
    });

    test('should return empty array when no libraries found', () => {
      expect(extractContext7Queries('No queries here')).toHaveLength(0);
    });
  });
});

describe('Tool Verification', () => {
  describe('verifyTools', () => {
    test('should check tool availability', () => {
      const tools = ['Read', 'Write', 'Bash'];
      const result = verifyTools(tools);
      expect(result.allAvailable).toBe(true);
    });

    test('should validate tool references in content', () => {
      const tools = ['Read', 'Write'];
      const content = 'Use Read tool to read files and Write to create them.';
      const result = verifyTools(tools, { content });
      expect(result.referencesValid).toBe(true);
    });

    test('should verify tool permissions', () => {
      const tools = ['Read', 'Write'];
      const result = verifyTools(tools);
      expect(result.hasPermissions).toBe(true);
    });

    test('should detect unreferenced tools', () => {
      const tools = ['Read', 'Write', 'Bash'];
      const content = 'Only mentions Read tool';
      const result = verifyTools(tools, { content });
      expect(result.unreferencedTools).toContain('Write');
      expect(result.unreferencedTools).toContain('Bash');
    });
  });

  describe('checkToolAvailability', () => {
    test('should validate tool exists', () => {
      const result = checkToolAvailability('Read');
      expect(result.available).toBe(true);
    });

    test('should detect invalid tool', () => {
      const result = checkToolAvailability('NonExistentTool');
      expect(result.available).toBe(false);
    });
  });
});

describe('Example Validation', () => {
  describe('validateExamples', () => {
    test('should parse examples from documentation', () => {
      const content = `
## Examples
\`\`\`bash
/core:agent-test --agent test
\`\`\`
`;
      const result = validateExamples(content);
      expect(result.hasExamples).toBe(true);
      expect(result.exampleCount).toBeGreaterThan(0);
    });

    test('should validate example format', () => {
      const examples = [
        {
          input: '/core:agent-test --agent test',
          description: 'Test an agent'
        }
      ];
      const result = validateExamples(examples, { asList: true });
      expect(result.validFormat).toBe(true);
    });

    test('should check example completeness', () => {
      const examples = [
        {
          input: '/core:agent-test --agent test',
          description: 'Complete description'
        }
      ];
      const result = validateExamples(examples, { asList: true });
      expect(result.complete).toBe(true);
    });

    test('should detect incomplete examples', () => {
      const examples = [{ input: '/core:agent-test' }];
      const result = validateExamples(examples, { asList: true });
      expect(result.complete).toBe(false);
      expect(result.errors).toContain('Missing description');
    });
  });
});

describe('Integration Testing', () => {
  describe('testAgentInteraction', () => {
    test('should test agent invocation', () => {
      const result = testAgentInteraction('test-agent', {
        command: 'basic-task'
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('responseTime');
    });

    test('should test command integration', () => {
      const result = testAgentInteraction('test-agent', {
        command: '/test:command'
      });
      expect(result.commandExecuted).toBe(true);
    });

    test('should verify output format', () => {
      const result = testAgentInteraction('test-agent', {
        expectedFormat: 'json'
      });
      expect(result.outputValid).toBe(true);
    });

    test('should handle agent errors gracefully', () => {
      const result = testAgentInteraction('invalid-agent', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Performance Benchmarking', () => {
  describe('benchmarkPerformance', () => {
    test('should measure response time', () => {
      const result = benchmarkPerformance('test-agent', { iterations: 5 });
      expect(result).toHaveProperty('avgResponseTime');
      expect(result).toHaveProperty('minResponseTime');
      expect(result).toHaveProperty('maxResponseTime');
    });

    test('should track token usage', () => {
      const result = benchmarkPerformance('test-agent', {
        trackTokens: true
      });
      expect(result).toHaveProperty('avgTokens');
      expect(result).toHaveProperty('totalTokens');
    });

    test('should identify performance issues', () => {
      const result = benchmarkPerformance('slow-agent', {
        threshold: 1000
      });
      expect(result).toHaveProperty('issues');
      if (result.avgResponseTime > 1000) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    test('should support multiple iterations', () => {
      const result = benchmarkPerformance('test-agent', { iterations: 10 });
      expect(result.iterations).toBe(10);
    });
  });
});

describe('Registry Consistency', () => {
  describe('verifyRegistryConsistency', () => {
    test('should verify agent in registry', () => {
      const result = verifyRegistryConsistency('agent-manager');
      expect(result.inRegistry).toBe(true);
    });

    test('should check for orphaned files', () => {
      const result = verifyRegistryConsistency('test-agent', {
        checkOrphans: true
      });
      expect(result).toHaveProperty('orphanedFiles');
    });

    test('should validate registry metadata', () => {
      const result = verifyRegistryConsistency('agent-manager');
      expect(result.metadataValid).toBe(true);
      expect(result.metadata).toHaveProperty('name');
      expect(result.metadata).toHaveProperty('description');
    });

    test('should detect missing registry entry', () => {
      const result = verifyRegistryConsistency('non-existent-agent');
      expect(result.inRegistry).toBe(false);
      expect(result.errors).toContain('Agent not found in registry');
    });

    test('should validate agent file matches registry', () => {
      const result = verifyRegistryConsistency('agent-manager', {
        validateFileMatch: true
      });
      expect(result.fileMatchesRegistry).toBe(true);
    });
  });

  describe('validateAgentMetadata', () => {
    test('should validate complete metadata', () => {
      const metadata = {
        name: 'test-agent',
        description: 'Test agent',
        category: 'core',
        version: '1.0.0',
        tags: ['test']
      };
      const result = validateAgentMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    test('should detect missing metadata fields', () => {
      const metadata = { name: 'test' };
      const result = validateAgentMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });
  });
});
