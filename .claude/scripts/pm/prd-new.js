#!/usr/bin/env node
/**
 * PRD New - Launch brainstorming for new product requirement
 *
 * Supports:
 * - Template-based creation (--template flag)
 * - Interactive template selection
 * - Traditional brainstorming mode (backwards compatible)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Dynamically resolve template engine path
// This works both in installed projects and during testing
let TemplateEngine;
try {
  // Try from project root (where lib/ is installed)
  TemplateEngine = require(path.join(process.cwd(), 'lib', 'template-engine'));
} catch (err) {
  try {
    // Try relative path from .claude/scripts/pm/ (during development)
    TemplateEngine = require(path.join(__dirname, '..', '..', '..', '..', 'lib', 'template-engine'));
  } catch (err2) {
    // Fallback: try from AutoPM global installation
    try {
      const { execSync } = require('child_process');
      const os = require('os');
      // Check if npm is available
      let npmExists = false;
      try {
        if (os.platform() === 'win32') {
          execSync('where npm', { stdio: 'ignore' });
        } else {
          execSync('which npm', { stdio: 'ignore' });
        }
        npmExists = true;
      } catch (checkErr) {
        npmExists = false;
      }
      if (!npmExists) {
        throw new Error('npm is not installed or not found in PATH. Please install npm to use global template-engine.');
      }
      let npmRoot;
      try {
        npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      } catch (npmErr) {
        throw new Error('Failed to execute "npm root -g". Please check your npm installation.');
      }
      TemplateEngine = require(path.join(npmRoot, 'claude-autopm', 'lib', 'template-engine'));
    } catch (err3) {
      throw new Error('Cannot find template-engine module. Please ensure lib/ directory is installed. Details: ' + err3.message);
    }
  }
}

class PrdCreator {
  constructor() {
    this.prdsDir = path.join('.claude', 'prds');
    this.templatesDir = path.join(__dirname, '..', '..', 'templates');
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Create PRD from template
   */
  async createPrdFromTemplate(prdName, templateName) {
    console.log(`\n🚀 Creating PRD from Template: ${templateName}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Ensure PRDs directory exists
    if (!fs.existsSync(this.prdsDir)) {
      fs.mkdirSync(this.prdsDir, { recursive: true });
    }

    // Check if PRD already exists
    const prdFile = path.join(this.prdsDir, `${prdName}.md`);
    if (fs.existsSync(prdFile)) {
      console.error(`❌ PRD already exists: ${prdName}`);
      console.log(`💡 Edit file: .claude/prds/${prdName}.md`);
      return false;
    }

    // Find template
    const templatePath = this.templateEngine.findTemplate('prds', templateName);
    if (!templatePath) {
      console.error(`❌ Template not found: ${templateName}`);
      console.log(`💡 List available templates: autopm template:list`);
      return false;
    }

    // Read template to find required variables
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const requiredVars = this.extractTemplateVariables(templateContent);

    // Prompt for variables
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    try {
      console.log(`📋 Template: ${templateName}`);
      console.log(`Fill in the following details:\n`);

      const variables = {
        title: prdName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: 'prd'
      };

      // Prompt for common variables
      const title = await prompt(`Title [${variables.title}]: `);
      if (title) variables.title = title;

      const priority = await prompt('Priority (P0/P1/P2/P3) [P2]: ');
      variables.priority = priority || 'P2';

      const timeline = await prompt('Timeline [TBD]: ');
      variables.timeline = timeline || 'TBD';

      // Prompt for template-specific variables
      const templateSpecific = this.getTemplateSpecificPrompts(templateName);
      for (const varName of templateSpecific) {
        if (!variables[varName]) {
          const value = await prompt(`${varName.replace(/_/g, ' ')}: `);
          variables[varName] = value || '';
        }
      }

      // Render template
      const rendered = this.templateEngine.renderFile(templatePath, variables);

      // Write PRD file
      fs.writeFileSync(prdFile, rendered);

      console.log('\n✅ PRD created successfully!');
      console.log(`📄 File: ${prdFile}`);

      // Show next steps
      this.showNextSteps(prdName);

      return true;
    } finally {
      rl.close();
    }
  }

  /**
   * Extract variables from template
   */
  extractTemplateVariables(template) {
    const varRegex = /\{\{(\w+)\}\}/g;
    const vars = new Set();
    let match;

    while ((match = varRegex.exec(template)) !== null) {
      vars.add(match[1]);
    }

    // Remove auto-generated variables
    vars.delete('id');
    vars.delete('timestamp');
    vars.delete('date');
    vars.delete('author');

    return Array.from(vars);
  }

  /**
   * Get template-specific prompts
   */
  getTemplateSpecificPrompts(templateName) {
    const prompts = {
      'api-feature': [
        'api_purpose',
        'problem',
        'business_value',
        'http_method',
        'api_endpoint',
        'auth_method',
        'rate_limit',
        'user_role',
        'api_action',
        'user_benefit'
      ],
      'ui-feature': [
        'component_type',
        'feature_purpose',
        'problem',
        'user_need',
        'user_goal',
        'user_role',
        'user_action',
        'user_benefit'
      ],
      'bug-fix': [
        'bug_summary',
        'severity',
        'user_impact',
        'step_1',
        'step_2',
        'step_3',
        'expected_behavior',
        'actual_behavior',
        'root_cause',
        'solution_approach'
      ],
      'data-migration': [
        'migration_purpose',
        'current_state',
        'desired_state',
        'affected_tables',
        'data_volume',
        'migration_strategy'
      ],
      'documentation': [
        'doc_type',
        'target_audience',
        'documentation_scope',
        'current_gaps'
      ]
    };

    return prompts[templateName] || [];
  }

  /**
   * Show interactive template selection
   */
  async selectTemplate() {
    const templates = this.templateEngine.listTemplates('prds');

    if (templates.length === 0) {
      console.log('No templates available');
      return null;
    }

    console.log('\n📋 Available Templates:');

    const builtIn = templates.filter(t => !t.custom);
    const custom = templates.filter(t => t.custom);

    let index = 1;
    const options = [];

    builtIn.forEach(t => {
      const description = this.getTemplateDescription(t.name);
      console.log(`${index}. ${t.name.padEnd(20)} - ${description}`);
      options.push(t.name);
      index++;
    });

    if (custom.length > 0) {
      console.log('\nCustom Templates:');
      custom.forEach(t => {
        console.log(`${index}. ${t.name.padEnd(20)} - [Custom]`);
        options.push(t.name);
        index++;
      });
    }

    console.log(`${index}. none${' '.repeat(20)} - Create empty PRD\n`);
    options.push('none');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    try {
      const selection = await prompt(`Select template (1-${options.length}): `);
      const selectionNum = parseInt(selection, 10);

      if (selectionNum < 1 || selectionNum > options.length) {
        console.error('Invalid selection');
        return null;
      }

      return options[selectionNum - 1];
    } finally {
      rl.close();
    }
  }

  /**
   * Get template description
   */
  getTemplateDescription(templateName) {
    const descriptions = {
      'api-feature': 'REST/GraphQL API development',
      'ui-feature': 'Frontend component/page',
      'bug-fix': 'Bug resolution workflow',
      'data-migration': 'Database schema changes',
      'documentation': 'Documentation updates'
    };

    return descriptions[templateName] || 'Template';
  }

  async createPrd(prdName) {
    console.log(`\n🚀 Creating New PRD: ${prdName}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Ensure PRDs directory exists
    if (!fs.existsSync(this.prdsDir)) {
      fs.mkdirSync(this.prdsDir, { recursive: true });
    }

    // Check if PRD already exists
    const prdFile = path.join(this.prdsDir, `${prdName}.md`);
    if (fs.existsSync(prdFile)) {
      console.error(`❌ PRD already exists: ${prdName}`);
      console.log(`💡 Edit file: .claude/prds/${prdName}.md`);
      return false;
    }

    // Create interface for brainstorming
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    try {
      console.log('🧠 Let\'s brainstorm your product requirement!\n');

      // Gather information
      const prdData = {};

      // Product Vision
      console.log('📌 Product Vision');
      console.log('What problem are you trying to solve? What\'s the vision?');
      prdData.vision = await prompt('Vision: ');

      // Target Users
      console.log('\n👥 Target Users');
      console.log('Who will use this feature? What are their needs?');
      prdData.users = await prompt('Target users: ');

      // Key Features
      console.log('\n✨ Key Features');
      console.log('What are the main features? (enter one per line, empty line to finish)');
      prdData.features = [];
      let feature;
      while ((feature = await prompt('Feature: ')) !== '') {
        prdData.features.push(feature);
      }

      // Success Metrics
      console.log('\n📊 Success Metrics');
      console.log('How will you measure success?');
      prdData.metrics = await prompt('Success metrics: ');

      // Technical Considerations
      console.log('\n🔧 Technical Considerations');
      console.log('Any technical constraints or requirements?');
      prdData.technical = await prompt('Technical notes: ');

      // Priority
      console.log('\n🎯 Priority');
      console.log('What\'s the priority? (P0=Critical, P1=High, P2=Medium, P3=Low)');
      prdData.priority = await prompt('Priority (P0/P1/P2/P3): ') || 'P2';

      // Timeline
      console.log('\n⏰ Timeline');
      console.log('When should this be delivered?');
      prdData.timeline = await prompt('Timeline: ');

      // Generate PRD
      const prdContent = this.generatePrdContent(prdName, prdData);

      // Write PRD file
      fs.writeFileSync(prdFile, prdContent);

      console.log('\n✅ PRD created successfully!');
      console.log(`📄 File: ${prdFile}`);

      // Show comprehensive next steps
      this.showNextSteps(prdName);

    } finally {
      rl.close();
    }

    return true;
  }

  showNextSteps(prdName) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 What You Can Do Next:');
    console.log('═'.repeat(60) + '\n');

    console.log('🎯 Option 1: Quick Start (Recommended for Simple Features)');
    console.log('   One command to parse, decompose, and sync to GitHub:');
    console.log(`   /pm:epic-oneshot ${prdName}`);
    console.log('   ✨ This creates epic + tasks + GitHub issues automatically\n');

    console.log('🔀 Option 2: Split into Multiple Epics (For Complex Features)');
    console.log('   Break down large PRD into focused sub-epics:');
    console.log(`   /pm:prd-split ${prdName}`);
    console.log('   Example: payment-system → backend, frontend, security');
    console.log('   📚 See README section "Splitting Large PRDs into Multiple Epics"\n');

    console.log('🛠️  Option 3: Step-by-Step Workflow (Full Control)');
    console.log('   a) Convert PRD to epic:');
    console.log(`      /pm:prd-parse ${prdName}`);
    console.log('   b) Break epic into tasks:');
    console.log(`      /pm:epic-decompose ${prdName}`);
    console.log('   c) Push to GitHub/Azure:');
    console.log(`      /pm:epic-sync ${prdName}\n`);

    console.log('📝 Option 4: Review & Edit First');
    console.log('   Review and refine the PRD before processing:');
    console.log(`   nano .claude/prds/${prdName}.md`);
    console.log('   Then use any option above\n');

    console.log('📊 Option 5: Check Status');
    console.log('   View PRD and track progress:');
    console.log(`   /pm:prd-status ${prdName}\n`);

    console.log(`💡 Don't know which to choose?`);
    console.log('   • Small feature (< 10 tasks)? → Use Option 1 (/pm:epic-oneshot)');
    console.log('   • Large feature (15+ tasks)? → Use Option 2 (/pm:prd-split)');
    console.log('   • Need full control? → Use Option 3 (step-by-step)');
    console.log('');
  }

  generatePrdContent(name, data) {
    const timestamp = new Date().toISOString();
    const author = process.env.USER || 'unknown';

    return `# PRD: ${name}

---
status: draft
priority: ${data.priority}
created: ${timestamp}
author: ${author}
timeline: ${data.timeline || 'TBD'}
---

## Executive Summary

${data.vision || 'Product vision to be defined...'}

## Problem Statement

### Background
${data.vision ? `The need for this feature arises from: ${data.vision}` : 'Context and background to be added...'}

### Current State
- Current limitations and pain points
- Existing workarounds users employ
- Impact on user experience

### Desired State
- How the solution will address the problem
- Expected improvements and benefits
- Success criteria

## Target Users

${data.users || 'Target user segments to be defined...'}

### User Personas
- **Primary Users**: Core user segment
- **Secondary Users**: Additional beneficiaries
- **Stakeholders**: Indirect beneficiaries

### User Stories
${data.features.length > 0 ? data.features.map(f => `- As a user, I want to ${f}`).join('\n') : '- User stories to be defined...'}

## Key Features

### Must Have (P0)
${data.features.length > 0 ? data.features.slice(0, 3).map(f => `- [ ] ${f}`).join('\n') : '- [ ] Core feature 1\n- [ ] Core feature 2'}

### Should Have (P1)
${data.features.length > 3 ? data.features.slice(3, 6).map(f => `- [ ] ${f}`).join('\n') : '- [ ] Additional feature 1\n- [ ] Additional feature 2'}

### Nice to Have (P2)
${data.features.length > 6 ? data.features.slice(6).map(f => `- [ ] ${f}`).join('\n') : '- [ ] Enhancement 1\n- [ ] Enhancement 2'}

## Success Metrics

${data.metrics || 'Success metrics to be defined...'}

### Key Performance Indicators (KPIs)
- **Adoption Rate**: Target percentage of users adopting the feature
- **User Satisfaction**: Target NPS or satisfaction score
- **Performance**: Response time, throughput targets
- **Quality**: Bug rate, error rate targets

### Measurement Plan
- How metrics will be collected
- Reporting frequency
- Success thresholds

## Technical Requirements

${data.technical || 'Technical requirements to be specified...'}

### Architecture Considerations
- System components affected
- Integration points
- Data flow and storage

### Non-Functional Requirements
- **Performance**: Response time < 200ms
- **Scalability**: Support for X concurrent users
- **Security**: Authentication, authorization requirements
- **Reliability**: 99.9% uptime target

### Dependencies
- External services or APIs
- Internal systems or components
- Third-party libraries or tools

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Technical design review
- [ ] Set up development environment
- [ ] Create initial architecture

### Phase 2: Core Features (Week 3-4)
- [ ] Implement must-have features
- [ ] Initial testing
- [ ] Code review

### Phase 3: Enhancement (Week 5-6)
- [ ] Implement should-have features
- [ ] Integration testing
- [ ] Performance optimization

### Phase 4: Release (Week 7-8)
- [ ] Final testing
- [ ] Documentation
- [ ] Deployment

## Risks and Mitigation

### Technical Risks
- **Risk 1**: Description and mitigation strategy
- **Risk 2**: Description and mitigation strategy

### Business Risks
- **Risk 1**: Impact and contingency plan
- **Risk 2**: Impact and contingency plan

## Open Questions

- [ ] Question 1 requiring clarification
- [ ] Question 2 needing stakeholder input
- [ ] Question 3 for technical investigation

## Appendix

### References
- Related documentation
- Previous PRDs
- Market research

### Glossary
- Term definitions
- Acronym explanations

### Changelog
- ${timestamp}: Initial PRD created by ${author}

---

*This PRD is a living document. Updates should be tracked in the changelog section.*
`;
  }

  listExistingPrds() {
    if (fs.existsSync(this.prdsDir)) {
      const prds = fs.readdirSync(this.prdsDir)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));

      if (prds.length > 0) {
        console.log('\n📋 Existing PRDs:');
        prds.forEach(prd => {
          const prdFile = path.join(this.prdsDir, `${prd}.md`);
          const content = fs.readFileSync(prdFile, 'utf8');
          const priorityMatch = content.match(/priority: (P\d)/);
          const statusMatch = content.match(/status: (\w+)/);

          const priority = priorityMatch ? priorityMatch[1] : 'P2';
          const status = statusMatch ? statusMatch[1] : 'draft';

          console.log(`  • ${prd} [${priority}] (${status})`);
        });
      } else {
        console.log('  No PRDs found');
      }
    }
  }

  async run(args) {
    // Check if running in non-interactive environment (e.g., Claude Code)
    if (!process.stdin.isTTY) {
      console.error('❌ Error: This script requires an interactive terminal');
      console.error('\n💡 Solutions:');
      console.error('   1. Use LLM-assisted generation (default):');
      console.error('      /pm:prd-new <feature-name>');
      console.error('   2. Use --content flag with existing content:');
      console.error('      /pm:prd-new <feature-name> --content @path/to/file.md');
      console.error('   3. Run in a regular terminal (not Claude Code):');
      console.error('      node .claude/scripts/pm/prd-new.js <feature-name>');
      console.error('\n📚 See: /pm:help prd-new');
      process.exit(1);
    }

    // Parse arguments
    let prdName = null;
    let templateName = null;

    // Check for --template or -t flag
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--template' || args[i] === '-t') {
        templateName = args[i + 1];
        i++; // Skip next arg
      } else if (!prdName) {
        prdName = args[i];
      }
    }

    if (!prdName) {
      // Interactive mode
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const prompt = (question) => new Promise((resolve) => {
        rl.question(question, resolve);
      });

      console.log('\n🚀 PRD Creation Wizard');
      console.log(`${'═'.repeat(50)}`);

      this.listExistingPrds();

      console.log('\n');
      prdName = await prompt('Enter PRD name (use-kebab-case): ');
      rl.close();

      if (!prdName) {
        console.error('❌ Error: PRD name required');
        process.exit(1);
      }

      // Ask for template if not provided
      if (!templateName) {
        templateName = await this.selectTemplate();
      }
    }

    // Sanitize PRD name
    prdName = prdName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Create PRD from template or traditional mode
    let success;
    if (templateName && templateName !== 'none') {
      success = await this.createPrdFromTemplate(prdName, templateName);
    } else {
      success = await this.createPrd(prdName);
    }

    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const creator = new PrdCreator();
  creator.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = PrdCreator;