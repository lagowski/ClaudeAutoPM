#!/usr/bin/env node
/**
 * Template New - Create custom template
 *
 * Usage:
 *   autopm template:new prd my-custom-template
 *   autopm template:new epic my-sprint-template
 *   autopm template:new task my-task-template
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Dynamically resolve template engine path
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
      let npmRoot;
      try {
        // Check if npm is available
        execSync('npm --version', { stdio: 'ignore' });
      } catch (npmErr) {
        throw new Error('npm is not available in your environment. Please install npm and try again.');
      }
      try {
        npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
      } catch (rootErr) {
        throw new Error('Failed to execute "npm root -g": ' + rootErr.message);
      }
      if (!npmRoot || !fs.existsSync(npmRoot)) {
        throw new Error('The npm global root directory could not be determined or does not exist: "' + npmRoot + '"');
      }
      TemplateEngine = require(path.join(npmRoot, 'claude-autopm', 'lib', 'template-engine'));
    } catch (err3) {
      throw new Error('Cannot find template-engine module. Please ensure lib/ directory is installed. Details: ' + err3.message);
    }
  }
}

class TemplateCreator {
  constructor() {
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Get base template for type
   */
  getBaseTemplate(type) {
    const templates = {
      prd: `---
id: {{id}}
title: {{title}}
type: prd
status: draft
priority: {{priority}}
created: {{timestamp}}
author: {{author}}
timeline: {{timeline}}
---

# PRD: {{title}}

## Executive Summary

{{executive_summary}}

## Problem Statement

### Background
{{problem_background}}

### Current State
{{current_state}}

### Desired State
{{desired_state}}

## Target Users

{{target_users}}

## Key Features

### Must Have (P0)
{{#if must_have_features}}
{{#each must_have_features}}
- [ ] {{this}}
{{/each}}
{{/if}}

### Should Have (P1)
{{#if should_have_features}}
{{#each should_have_features}}
- [ ] {{this}}
{{/each}}
{{/if}}

## Success Metrics

{{success_metrics}}

## Technical Requirements

{{technical_requirements}}

## Implementation Plan

### Phase 1: Design (Week 1)
- [ ] Requirements finalized
- [ ] Technical design review
- [ ] Development environment setup

### Phase 2: Development (Week 2-3)
- [ ] Implement core features
- [ ] Write tests (TDD)
- [ ] Code review

### Phase 3: Testing (Week 4)
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Performance testing

### Phase 4: Release (Week 5)
- [ ] Documentation
- [ ] Deployment
- [ ] Monitoring setup

## Risks and Mitigation

{{risks_and_mitigation}}

## Open Questions

- [ ] {{open_question_1}}
- [ ] {{open_question_2}}

## Appendix

### Changelog
- {{timestamp}}: Initial PRD created by {{author}}

---

*Custom PRD Template*
`,
      epic: `---
id: {{id}}
title: {{title}}
type: epic
status: planning
priority: {{priority}}
created: {{timestamp}}
author: {{author}}
start_date: {{start_date}}
end_date: {{end_date}}
---

# Epic: {{title}}

## Overview

{{overview}}

## Goals

{{#each goals}}
- {{this}}
{{/each}}

## User Stories

{{#each user_stories}}
- As a {{role}}, I want to {{action}}, so that {{benefit}}
{{/each}}

## Tasks

{{#each tasks}}
- [ ] {{this}}
{{/each}}

## Success Criteria

{{success_criteria}}

## Dependencies

{{dependencies}}

---

*Custom Epic Template*
`,
      task: `---
id: {{id}}
title: {{title}}
type: task
status: todo
priority: {{priority}}
created: {{timestamp}}
author: {{author}}
assigned_to: {{assigned_to}}
estimated_hours: {{estimated_hours}}
---

# Task: {{title}}

## Description

{{description}}

## Acceptance Criteria

{{#each acceptance_criteria}}
- [ ] {{this}}
{{/each}}

## Technical Details

{{technical_details}}

## Testing

{{testing_notes}}

## Notes

{{notes}}

---

*Custom Task Template*
`
    };

    return templates[type] || templates.prd;
  }

  /**
   * Create new template
   */
  create(type, name) {
    console.log(`\n📝 Creating Custom Template`);
    console.log(`${'═'.repeat(50)}\n`);

    // Validate type
    const validTypes = ['prd', 'epic', 'task'];
    if (!validTypes.includes(type)) {
      console.error(`❌ Invalid type: ${type}`);
      console.log(`Valid types: ${validTypes.join(', ')}`);
      return false;
    }

    // Ensure template directory exists
    const typeDir = type === 'prd' ? 'prds' : type === 'epic' ? 'epics' : 'tasks';
    this.templateEngine.ensureTemplateDir(typeDir);

    const templatePath = path.join('.claude', 'templates', typeDir, `${name}.md`);

    // Check if template already exists
    if (fs.existsSync(templatePath)) {
      console.error(`❌ Template already exists: ${templatePath}`);
      console.log(`💡 Edit file directly or choose a different name`);
      return false;
    }

    // Get base template
    const baseTemplate = this.getBaseTemplate(type);

    // Write template file
    fs.writeFileSync(templatePath, baseTemplate);

    console.log(`✅ Template created: ${templatePath}`);
    console.log(`\n📋 Template Structure:`);
    console.log(`   - Frontmatter: Define metadata variables`);
    console.log(`   - Variables: Use {{variable_name}} for substitution`);
    console.log(`   - Conditionals: {{#if var}}...{{/if}}`);
    console.log(`   - Loops: {{#each items}}...{{/each}}`);

    console.log(`\n🛠️  Next Steps:`);
    console.log(`   1. Edit template: nano ${templatePath}`);
    console.log(`   2. Add custom variables and sections`);
    console.log(`   3. Test template: autopm ${type}:new --template ${name} "Test"`);

    // Try to open in editor
    this.openInEditor(templatePath);

    return true;
  }

  /**
   * Open template in editor
   */
  openInEditor(templatePath) {
    const editors = ['code', 'nano', 'vim', 'vi'];

    for (const editor of editors) {
      try {
        // Check if editor exists
        execSync(`which ${editor}`, { stdio: 'ignore' });

        console.log(`\n📝 Opening in ${editor}...`);
        console.log(`   Edit the template, save, and exit`);

        // Open editor (blocking)
        execSync(`${editor} ${templatePath}`, { stdio: 'inherit' });

        // Validate template after editing
        const content = fs.readFileSync(templatePath, 'utf8');
        const validation = this.templateEngine.validate(content);

        if (!validation.valid) {
          console.log(`\n⚠️  Template validation warnings:`);
          validation.errors.forEach(err => console.log(`   - ${err}`));
          console.log(`\n💡 These are suggestions. Template will still work.`);
        } else {
          console.log(`\n✅ Template is valid!`);
        }

        return true;
      } catch (err) {
        // Editor not found, try next
        continue;
      }
    }

    // No editor found
    console.log(`\n💡 Edit manually: ${templatePath}`);
    return false;
  }

  run(args) {
    if (args.length < 2) {
      console.error('❌ Usage: autopm template:new <type> <name>');
      console.log('\nExamples:');
      console.log('  autopm template:new prd my-custom-prd');
      console.log('  autopm template:new epic my-sprint');
      console.log('  autopm template:new task my-development-task');
      console.log('\nTypes: prd, epic, task');
      process.exit(1);
    }

    const type = args[0];
    const name = args[1];

    const success = this.create(type, name);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const creator = new TemplateCreator();
  creator.run(process.argv.slice(2));
}

module.exports = TemplateCreator;
