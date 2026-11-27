#!/usr/bin/env node
/**
 * Context Create - Create new context file from template
 * PM command for context management
 */

const fs = require('fs').promises;
const path = require('path');

class ContextCreator {
  constructor() {
    this.contextsDir = path.join('.claude', 'contexts');
    this.templatesDir = path.join(__dirname, '..', '..', 'templates', 'context-templates');
  }

  showUsage() {
    console.log('Usage: pm context-create <name> [options]');
    console.log('\nOptions:');
    console.log('  --template <name>    Template to use (default: default)');
    console.log('  --type <type>        Type of context (default: general)');
    console.log('  --description <desc> Description for the context');
    console.log('\nExamples:');
    console.log('  pm context-create feature-auth --type feature');
    console.log('  pm context-create bug-fix --template bug --description "Fixing login issues"');
    console.log('  pm context-create project-overview');
  }

  validateContextName(name) {
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  getDefaultTemplate() {
    return `# Context: {{name}}

## Type: {{type}}

## Description
{{description}}

## Created
{{date}}

## Overview
[Provide a high-level overview of this context]

## Key Components
- Component 1
- Component 2
- Component 3

## Technical Details
[Add specific technical details relevant to this context]

## Related Files
- file1.js
- file2.py
- file3.md

## Current State
[Describe the current state of the work]

## Next Steps
1. Step 1
2. Step 2
3. Step 3

## Notes
[Any additional notes or considerations]
`;
  }

  processTemplate(template, variables) {
    let content = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    return content;
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.md`);
      return await fs.readFile(templatePath, 'utf8');
    } catch {
      // Return null if template not found
      return null;
    }
  }

  async createContext(name, options = {}) {
    console.log(`📝 Creating Context: ${name}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Validate name
    if (!this.validateContextName(name)) {
      console.error('❌ Error: Invalid context name. Use only alphanumeric characters, hyphens, and underscores.');
      process.exit(1);
    }

    // Display configuration
    console.log('📋 Configuration:');
    console.log(`  • Name: ${name}`);
    console.log(`  • Template: ${options.template || 'default'}`);
    console.log(`  • Type: ${options.type || 'general'}`);
    if (options.description) {
      console.log(`  • Description: ${options.description}`);
    }
    console.log();

    // Ensure contexts directory exists
    await fs.mkdir(this.contextsDir, { recursive: true });

    const contextPath = path.join(this.contextsDir, `${name}.md`);

    // Check if context already exists
    try {
      await fs.access(contextPath);
      console.error(`❌ Error: Context "${name}" already exists at ${contextPath}`);
      process.exit(1);
    } catch {
      // File doesn't exist, which is what we want
    }

    // Load template
    let template = null;
    if (options.template && options.template !== 'default') {
      template = await this.loadTemplate(options.template);
      if (!template) {
        console.warn(`⚠️  Template "${options.template}" not found, using default template`);
      }
    }

    if (!template) {
      template = this.getDefaultTemplate();
    }

    // Prepare variables
    const variables = {
      name: name,
      date: new Date().toISOString(),
      type: options.type || 'general',
      description: options.description || 'Context description'
    };

    // Process template
    const content = this.processTemplate(template, variables);

    // Write file
    try {
      await fs.writeFile(contextPath, content, { mode: 0o644 });
      console.log(`✅ Context created successfully at: ${contextPath}`);

      // Show success and next steps
      console.log('\n💡 Next Steps:');
      console.log(`  • Update context: pm context-update ${name} --file <file>`);
      console.log(`  • Prime context: pm context-prime ${name}`);
      console.log('  • List contexts: pm context-prime --list');
      console.log(`  • View context: cat ${contextPath}`);

    } catch (error) {
      if (error.code === 'EACCES') {
        console.error('❌ Error: Permission denied. Failed to create context file.');
      } else {
        console.error(`❌ Error: Failed to create context: ${error.message}`);
      }
      process.exit(1);
    }
  }

  async run(args) {
    const name = args[0];

    if (!name || name === '--help' || name === '-h') {
      this.showUsage();

      if (name === '--help' || name === '-h') {
        process.exit(0);
      }

      console.error('\n❌ Error: Context name is required');
      process.exit(1);
    }

    // Parse options
    const options = {};
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--template' && args[i + 1]) {
        options.template = args[++i];
      } else if (arg === '--type' && args[i + 1]) {
        options.type = args[++i];
      } else if (arg === '--description' && args[i + 1]) {
        options.description = args[++i];
      } else if (arg.startsWith('--')) {
        console.error(`❌ Unknown option: ${arg}`);
        this.showUsage();
        process.exit(1);
      }
    }

    await this.createContext(name, options);
  }
}

// Main execution
if (require.main === module) {
  const creator = new ContextCreator();
  creator.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ContextCreator;