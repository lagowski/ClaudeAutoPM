/**
 * Jest TDD Tests for PM Context Create Script (context-create.js)
 *
 * Comprehensive test suite covering all functionality of the context-create.js script
 * Target: Achieve 80%+ coverage from current 14.35%
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ContextCreator = require('../../autopm/.claude/scripts/pm/context-create.js');

describe('PM Context Create Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;
  let creator;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let processExitSpy;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = require('fs').mkdtempSync(path.join(os.tmpdir(), 'pm-context-create-jest-'));
    process.chdir(tempDir);

    // Create instance
    creator = new ContextCreator();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (require('fs').existsSync(tempDir)) {
      require('fs').rmSync(tempDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should create instance with correct properties', () => {
      expect(creator).toBeInstanceOf(ContextCreator);
      expect(creator.contextsDir).toBe(path.join('.claude', 'contexts'));
      expect(creator.templatesDir).toBe(path.join(__dirname, '..', '..', 'autopm', '.claude', 'templates', 'context-templates'));
    });

    test('should export a constructor function', () => {
      expect(typeof ContextCreator).toBe('function');
      expect(new ContextCreator()).toBeInstanceOf(ContextCreator);
    });
  });

  describe('showUsage method', () => {
    test('should display usage information', () => {
      creator.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('Usage: pm context-create <name> [options]');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--template'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--type'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--description'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
    });

    test('should show examples in usage', () => {
      creator.showUsage();

      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-create feature-auth --type feature');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-create bug-fix --template bug --description "Fixing login issues"');
      expect(consoleLogSpy).toHaveBeenCalledWith('  pm context-create project-overview');
    });
  });

  describe('validateContextName method', () => {
    test('should validate correct context names', () => {
      expect(creator.validateContextName('feature-auth')).toBe(true);
      expect(creator.validateContextName('bug_fix')).toBe(true);
      expect(creator.validateContextName('project123')).toBe(true);
      expect(creator.validateContextName('simple')).toBe(true);
      expect(creator.validateContextName('test-context-name')).toBe(true);
      expect(creator.validateContextName('under_score_name')).toBe(true);
      expect(creator.validateContextName('MixedCase123')).toBe(true);
    });

    test('should reject invalid context names', () => {
      expect(creator.validateContextName('feature auth')).toBe(false); // spaces
      expect(creator.validateContextName('feature@auth')).toBe(false); // special chars
      expect(creator.validateContextName('feature.auth')).toBe(false); // dots
      expect(creator.validateContextName('feature/auth')).toBe(false); // slashes
      expect(creator.validateContextName('feature#auth')).toBe(false); // hash
      expect(creator.validateContextName('')).toBe(false); // empty
      expect(creator.validateContextName('feature$auth')).toBe(false); // dollar sign
    });

    test('should handle edge cases', () => {
      expect(creator.validateContextName('a')).toBe(true); // single char
      expect(creator.validateContextName('1')).toBe(true); // single number
      expect(creator.validateContextName('_')).toBe(true); // single underscore
      expect(creator.validateContextName('-')).toBe(true); // single hyphen
      expect(creator.validateContextName('a-b_c123')).toBe(true); // mixed valid chars
    });
  });

  describe('getDefaultTemplate method', () => {
    test('should return default template string', () => {
      const template = creator.getDefaultTemplate();

      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);
      expect(template).toContain('# Context: {{name}}');
      expect(template).toContain('## Type: {{type}}');
      expect(template).toContain('## Description');
      expect(template).toContain('{{description}}');
      expect(template).toContain('## Created');
      expect(template).toContain('{{date}}');
    });

    test('should include all expected sections', () => {
      const template = creator.getDefaultTemplate();

      expect(template).toContain('## Overview');
      expect(template).toContain('## Key Components');
      expect(template).toContain('## Technical Details');
      expect(template).toContain('## Related Files');
      expect(template).toContain('## Current State');
      expect(template).toContain('## Next Steps');
      expect(template).toContain('## Notes');
    });

    test('should contain placeholder values', () => {
      const template = creator.getDefaultTemplate();

      expect(template).toContain('- Component 1');
      expect(template).toContain('- file1.js');
      expect(template).toContain('1. Step 1');
    });
  });

  describe('processTemplate method', () => {
    test('should replace single variable', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'World' };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Hello World!');
    });

    test('should replace multiple variables', () => {
      const template = '{{greeting}} {{name}}, today is {{date}}';
      const variables = {
        greeting: 'Hello',
        name: 'Alice',
        date: '2024-01-01'
      };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Hello Alice, today is 2024-01-01');
    });

    test('should replace same variable multiple times', () => {
      const template = '{{name}} said {{name}} likes {{name}}';
      const variables = { name: 'Bob' };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Bob said Bob likes Bob');
    });

    test('should handle variables with special characters', () => {
      const template = 'Project: {{name}}, Type: {{type}}';
      const variables = {
        name: 'feature-auth_test',
        type: 'bug-fix'
      };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Project: feature-auth_test, Type: bug-fix');
    });

    test('should leave unreplaced variables unchanged', () => {
      const template = 'Hello {{name}}, {{missing}} variable';
      const variables = { name: 'World' };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Hello World, {{missing}} variable');
    });

    test('should handle empty template', () => {
      const template = '';
      const variables = { name: 'test' };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('');
    });

    test('should handle empty variables', () => {
      const template = 'Hello {{name}}!';
      const variables = {};
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('loadTemplate method', () => {
    test('should return null for non-existent template', async () => {
      const result = await creator.loadTemplate('non-existent');

      expect(result).toBeNull();
    });

    test('should handle template directory not existing', async () => {
      const result = await creator.loadTemplate('any-template');

      expect(result).toBeNull();
    });

    test('should load existing template file', async () => {
      // Create template directory and file
      const templateDir = path.join('.claude', 'templates', 'context-templates');
      await fs.mkdir(templateDir, { recursive: true });
      const templateContent = '# Template: {{name}}\nContent here';
      await fs.writeFile(path.join(templateDir, 'test.md'), templateContent);

      // Update creator to use local template dir
      creator.templatesDir = templateDir;
      const result = await creator.loadTemplate('test');

      expect(result).toBe(templateContent);
    });

    test('should handle file read errors gracefully', async () => {
      // Create template directory
      const templateDir = path.join('.claude', 'templates', 'context-templates');
      await fs.mkdir(templateDir, { recursive: true });

      // Create directory with same name as template (will cause read error)
      await fs.mkdir(path.join(templateDir, 'invalid.md'));

      creator.templatesDir = templateDir;
      const result = await creator.loadTemplate('invalid');

      expect(result).toBeNull();
    });
  });

  describe('createContext method', () => {
    test('should create context with default options', async () => {
      await creator.createContext('test-context');

      const contextPath = path.join('.claude', 'contexts', 'test-context.md');
      const exists = await fs.access(contextPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(contextPath, 'utf8');
      expect(content).toContain('# Context: test-context');
      expect(content).toContain('## Type: general');
      expect(content).toContain('Context description');
    });

    test('should create context with custom options', async () => {
      const options = {
        type: 'feature',
        description: 'Custom description'
      };

      await creator.createContext('custom-context', options);

      const contextPath = path.join('.claude', 'contexts', 'custom-context.md');
      const content = await fs.readFile(contextPath, 'utf8');
      expect(content).toContain('# Context: custom-context');
      expect(content).toContain('## Type: feature');
      expect(content).toContain('Custom description');
    });

    test('should create contexts directory if missing', async () => {
      await creator.createContext('new-context');

      const dirExists = await fs.access('.claude/contexts').then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('should reject invalid context names', async () => {
      await creator.createContext('invalid name');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error: Invalid context name. Use only alphanumeric characters, hyphens, and underscores.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should prevent overwriting existing context', async () => {
      // Create context first
      await creator.createContext('existing-context');

      // Try to create same context again
      await creator.createContext('existing-context');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error: Context "existing-context" already exists')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should use custom template when specified', async () => {
      // Create custom template
      const templateDir = path.join('.claude', 'templates', 'context-templates');
      await fs.mkdir(templateDir, { recursive: true });
      const customTemplate = '# Custom Template: {{name}}\nCustom content for {{type}}';
      await fs.writeFile(path.join(templateDir, 'custom.md'), customTemplate);

      creator.templatesDir = templateDir;
      await creator.createContext('template-test', { template: 'custom', type: 'special' });

      const contextPath = path.join('.claude', 'contexts', 'template-test.md');
      const content = await fs.readFile(contextPath, 'utf8');
      expect(content).toContain('# Custom Template: template-test');
      expect(content).toContain('Custom content for special');
    });

    test('should fall back to default template when custom template missing', async () => {
      await creator.createContext('fallback-test', { template: 'non-existent' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️  Template "non-existent" not found, using default template'
      );

      const contextPath = path.join('.claude', 'contexts', 'fallback-test.md');
      const content = await fs.readFile(contextPath, 'utf8');
      expect(content).toContain('# Context: fallback-test');
    });

    test('should handle file write permission errors', async () => {
      // Mock fs.writeFile to simulate permission error
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

      await creator.createContext('permission-test');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: Permission denied. Failed to create context file.');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original function
      fs.writeFile = originalWriteFile;
    });

    test('should handle other file write errors', async () => {
      // Mock fs.writeFile to simulate other error
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Disk full'));

      await creator.createContext('error-test');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: Failed to create context: Disk full');
      expect(processExitSpy).toHaveBeenCalledWith(1);

      // Restore original function
      fs.writeFile = originalWriteFile;
    });

    test('should include current timestamp in context', async () => {
      const beforeTime = new Date().toISOString();
      await creator.createContext('timestamp-test');
      const afterTime = new Date().toISOString();

      const contextPath = path.join('.claude', 'contexts', 'timestamp-test.md');
      const content = await fs.readFile(contextPath, 'utf8');

      // Extract timestamp from content
      const timestampMatch = content.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      expect(timestampMatch).toBeTruthy();

      const timestamp = timestampMatch[1];
      expect(timestamp >= beforeTime && timestamp <= afterTime).toBe(true);
    });

    test('should display configuration information', async () => {
      const options = {
        template: 'custom',
        type: 'feature',
        description: 'Test description'
      };

      await creator.createContext('config-test', options);

      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Creating Context: config-test');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Name: config-test');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Template: custom');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Type: feature');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Description: Test description');
    });

    test('should show success message and next steps', async () => {
      await creator.createContext('success-test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Context created successfully at:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('\n💡 Next Steps:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Update context: pm context-update success-test --file <file>');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Prime context: pm context-prime success-test');
    });

    test('should set correct file permissions', async () => {
      await creator.createContext('permission-test');

      const contextPath = path.join('.claude', 'contexts', 'permission-test.md');
      const stats = await fs.stat(contextPath);

      // Check that file is readable and writable by owner
      expect(stats.mode & 0o644).toBe(0o644);
    });
  });

  describe('run method', () => {
    test('should show usage when no arguments provided', async () => {
      await creator.run([]);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Error: Context name is required');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should show help when --help provided', async () => {
      await creator.run(['--help']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should show help when -h provided', async () => {
      await creator.run(['-h']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should create context with name only', async () => {
      await creator.run(['simple-context']);

      const contextPath = path.join('.claude', 'contexts', 'simple-context.md');
      const exists = await fs.access(contextPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('should parse template option', async () => {
      await creator.run(['test-context', '--template', 'custom']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Template: custom');
    });

    test('should parse type option', async () => {
      await creator.run(['test-context', '--type', 'feature']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Type: feature');
    });

    test('should parse description option', async () => {
      await creator.run(['test-context', '--description', 'Test description']);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Description: Test description');
    });

    test('should parse multiple options', async () => {
      await creator.run([
        'multi-option-context',
        '--template', 'custom',
        '--type', 'bug',
        '--description', 'Multi-option test'
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Template: custom');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Type: bug');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Description: Multi-option test');
    });

    test('should handle unknown options', async () => {
      await creator.run(['test-context', '--unknown']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Unknown option: --unknown');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('should handle missing option values', async () => {
      await creator.run(['test-context', '--template']);

      // Should proceed with undefined template (uses default)
      const contextPath = path.join('.claude', 'contexts', 'test-context.md');
      const exists = await fs.access(contextPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('should handle complex argument parsing', async () => {
      await creator.run([
        'complex-context',
        '--type', 'integration',
        '--description', 'Complex description with spaces',
        '--template', 'advanced'
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith('  • Type: integration');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Description: Complex description with spaces');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Template: advanced');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle template with malformed variables', async () => {
      const template = 'Test {{invalid format}} and {{valid}}';
      const variables = { valid: 'working' };
      const result = creator.processTemplate(template, variables);

      expect(result).toBe('Test {{invalid format}} and working');
    });

    test('should handle empty context name after validation', async () => {
      // This tests the validation logic
      expect(creator.validateContextName('')).toBe(false);
    });

    test('should handle very long context names', async () => {
      const longName = 'a'.repeat(100); // Use a more reasonable length
      const isValid = creator.validateContextName(longName);

      expect(isValid).toBe(true); // Our regex allows this

      if (isValid) {
        await creator.createContext(longName);
        const contextPath = path.join('.claude', 'contexts', longName + '.md');
        const exists = await fs.access(contextPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    test('should handle special characters in descriptions', async () => {
      const options = {
        description: 'Description with "quotes" and \'apostrophes\' and $pecial ch@rs!'
      };

      await creator.createContext('special-chars', options);

      const contextPath = path.join('.claude', 'contexts', 'special-chars.md');
      const content = await fs.readFile(contextPath, 'utf8');
      expect(content).toContain('Description with "quotes" and \'apostrophes\' and $pecial ch@rs!');
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with all options', async () => {
      // Create template directory and custom template
      const templateDir = path.join('.claude', 'templates', 'context-templates');
      await fs.mkdir(templateDir, { recursive: true });
      const customTemplate = `# {{name}} Integration Test
## Type: {{type}}
{{description}}
Created: {{date}}`;
      await fs.writeFile(path.join(templateDir, 'integration.md'), customTemplate);

      // Update creator to use local template
      creator.templatesDir = templateDir;

      // Run complete flow
      await creator.run([
        'integration-test',
        '--template', 'integration',
        '--type', 'end-to-end',
        '--description', 'Full integration test'
      ]);

      // Verify result
      const contextPath = path.join('.claude', 'contexts', 'integration-test.md');
      const content = await fs.readFile(contextPath, 'utf8');

      expect(content).toContain('# integration-test Integration Test');
      expect(content).toContain('## Type: end-to-end');
      expect(content).toContain('Full integration test');
      expect(content).toContain('Created: ');
    });

    test('should maintain data integrity across multiple context creations', async () => {
      const contexts = ['context1', 'context2', 'context3'];

      for (const name of contexts) {
        await creator.createContext(name, { type: `type-${name}` });
      }

      // Verify all contexts exist and are correct
      for (const name of contexts) {
        const contextPath = path.join('.claude', 'contexts', `${name}.md`);
        const content = await fs.readFile(contextPath, 'utf8');
        expect(content).toContain(`# Context: ${name}`);
        expect(content).toContain(`## Type: type-${name}`);
      }
    });

    test('should handle rapid successive context creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(creator.createContext(`rapid-${i}`));
      }

      await Promise.all(promises);

      // Verify all contexts were created
      for (let i = 0; i < 5; i++) {
        const contextPath = path.join('.claude', 'contexts', `rapid-${i}.md`);
        const exists = await fs.access(contextPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should create context quickly', async () => {
      const startTime = Date.now();
      await creator.createContext('performance-test');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should handle large template efficiently', async () => {
      // Create large template
      const largeTemplate = '# Large Template: {{name}}\n' + 'Content line\n'.repeat(1000);
      const templateDir = path.join('.claude', 'templates', 'context-templates');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'large.md'), largeTemplate);

      creator.templatesDir = templateDir;

      const startTime = Date.now();
      await creator.createContext('large-template-test', { template: 'large' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete in reasonable time
    });
  });
});