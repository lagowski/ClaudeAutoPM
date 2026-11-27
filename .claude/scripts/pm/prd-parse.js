#!/usr/bin/env node
/**
 * PRD Parse - Convert PRD to technical implementation epic
 */

const fs = require('fs');
const path = require('path');

class PrdParser {
  constructor() {
    this.prdsDir = path.join('.claude', 'prds');
    this.epicsDir = path.join('.claude', 'epics');
  }

  parseFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = {};
    const lines = frontmatterMatch[1].split('\n');

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
    });

    return frontmatter;
  }

  extractPrdContent(content) {
    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    const sections = {
      vision: '',
      problem: '',
      users: '',
      features: [],
      requirements: [],
      metrics: '',
      technical: '',
      timeline: ''
    };

    // Extract sections
    const lines = contentWithoutFrontmatter.split('\n');
    let currentSection = '';
    let sectionContent = [];

    lines.forEach(line => {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          this.saveSection(sections, currentSection, sectionContent);
        }

        currentSection = line.replace('## ', '').toLowerCase();
        sectionContent = [];
      } else {
        sectionContent.push(line);
      }
    });

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      this.saveSection(sections, currentSection, sectionContent);
    }

    return sections;
  }

  saveSection(sections, sectionName, content) {
    const contentStr = content.join('\n').trim();

    if (sectionName.includes('vision') || sectionName.includes('summary')) {
      sections.vision = contentStr;
    } else if (sectionName.includes('problem')) {
      sections.problem = contentStr;
    } else if (sectionName.includes('user') || sectionName.includes('target')) {
      sections.users = contentStr;
    } else if (sectionName.includes('feature')) {
      // Extract feature list
      sections.features = content
        .filter(line => line.match(/^[\-\*•]\s/) || line.match(/^\d+\./))
        .map(line => line.replace(/^[\-\*•\d\.]\s+/, '').trim());
    } else if (sectionName.includes('requirement')) {
      sections.requirements = content
        .filter(line => line.match(/^[\-\*•]\s/) || line.match(/^\d+\./))
        .map(line => line.replace(/^[\-\*•\d\.]\s+/, '').trim());
    } else if (sectionName.includes('metric') || sectionName.includes('success')) {
      sections.metrics = contentStr;
    } else if (sectionName.includes('technical') || sectionName.includes('architecture')) {
      sections.technical = contentStr;
    } else if (sectionName.includes('timeline') || sectionName.includes('schedule')) {
      sections.timeline = contentStr;
    }
  }

  generateTechnicalApproach(prdSections) {
    const approach = {
      frontend: [],
      backend: [],
      infrastructure: [],
      data: [],
      security: []
    };

    // Analyze features to determine technical needs
    prdSections.features.forEach(feature => {
      const featureLower = feature.toLowerCase();

      // Frontend detection
      if (featureLower.includes('ui') || featureLower.includes('interface') ||
          featureLower.includes('display') || featureLower.includes('view')) {
        approach.frontend.push(`Component for: ${feature}`);
      }

      // Backend detection
      if (featureLower.includes('api') || featureLower.includes('process') ||
          featureLower.includes('calculate') || featureLower.includes('service')) {
        approach.backend.push(`Service for: ${feature}`);
      }

      // Data detection
      if (featureLower.includes('data') || featureLower.includes('store') ||
          featureLower.includes('database') || featureLower.includes('persist')) {
        approach.data.push(`Storage for: ${feature}`);
      }

      // Security detection
      if (featureLower.includes('auth') || featureLower.includes('secure') ||
          featureLower.includes('permission') || featureLower.includes('access')) {
        approach.security.push(`Security for: ${feature}`);
      }
    });

    // Add defaults if empty
    if (approach.frontend.length === 0) approach.frontend.push('User interface components');
    if (approach.backend.length === 0) approach.backend.push('API endpoints and business logic');
    if (approach.data.length === 0) approach.data.push('Data persistence layer');

    return approach;
  }

  generateTasks(prdSections, technicalApproach) {
    const tasks = [];
    let taskId = 1;

    // Setup tasks
    tasks.push({
      id: `TASK-${taskId++}`,
      title: 'Project setup and configuration',
      type: 'setup',
      effort: '2h'
    });

    // Frontend tasks
    if (technicalApproach.frontend.length > 0) {
      tasks.push({
        id: `TASK-${taskId++}`,
        title: 'Implement UI components',
        type: 'frontend',
        effort: '1d'
      });
    }

    // Backend tasks
    if (technicalApproach.backend.length > 0) {
      tasks.push({
        id: `TASK-${taskId++}`,
        title: 'Implement backend services',
        type: 'backend',
        effort: '2d'
      });
    }

    // Data tasks
    if (technicalApproach.data.length > 0) {
      tasks.push({
        id: `TASK-${taskId++}`,
        title: 'Set up data models and persistence',
        type: 'backend',
        effort: '1d'
      });
    }

    // Integration
    tasks.push({
      id: `TASK-${taskId++}`,
      title: 'Integration and API connections',
      type: 'integration',
      effort: '1d'
    });

    // Testing
    tasks.push({
      id: `TASK-${taskId++}`,
      title: 'Write tests and documentation',
      type: 'testing',
      effort: '1d'
    });

    // Deployment
    tasks.push({
      id: `TASK-${taskId++}`,
      title: 'Deployment and release preparation',
      type: 'deployment',
      effort: '4h'
    });

    return tasks;
  }

  async parsePrd(featureName, options = {}) {
    console.log(`\n🔄 Parsing PRD: ${featureName}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Check if PRD exists
    const prdFile = path.join(this.prdsDir, `${featureName}.md`);
    if (!fs.existsSync(prdFile)) {
      console.error(`❌ PRD not found: ${featureName}`);
      console.log(`💡 First create it with: /pm:prd-new ${featureName}`);
      return false;
    }

    // Check for existing epic
    const epicDir = path.join(this.epicsDir, featureName);
    const epicFile = path.join(epicDir, 'epic.md');

    if (fs.existsSync(epicFile) && !options.overwrite) {
      console.error(`⚠️  Epic '${featureName}' already exists.`);
      console.log(`💡 Use --overwrite to replace it`);
      console.log(`💡 Or view it with: /pm:epic-show ${featureName}`);
      return false;
    }

    // Read and parse PRD
    console.log('📖 Reading PRD...');
    const prdContent = fs.readFileSync(prdFile, 'utf8');
    const frontmatter = this.parseFrontmatter(prdContent);
    const prdSections = this.extractPrdContent(prdContent);

    if (!frontmatter) {
      console.error('❌ Invalid PRD frontmatter');
      return false;
    }

    // Analyze and generate technical approach
    console.log('🔍 Analyzing requirements...');
    const technicalApproach = this.generateTechnicalApproach(prdSections);

    // Generate tasks
    console.log('📝 Generating implementation tasks...');
    const tasks = this.generateTasks(prdSections, technicalApproach);

    // Create epic
    console.log('🚀 Creating implementation epic...');
    const epicContent = this.generateEpicContent(
      featureName,
      frontmatter,
      prdSections,
      technicalApproach,
      tasks
    );

    // Ensure epic directory exists
    if (!fs.existsSync(epicDir)) {
      fs.mkdirSync(epicDir, { recursive: true });
    }

    // Write epic file
    fs.writeFileSync(epicFile, epicContent);

    // Display summary
    console.log('\n✅ Epic created successfully!');
    console.log(`\n📋 Implementation Summary:`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`📄 Epic: ${epicFile}`);
    console.log(`📊 Tasks: ${tasks.length}`);
    console.log(`⏱️  Estimated effort: ${this.calculateTotalEffort(tasks)}`);

    console.log(`\n🔧 Technical Components:`);
    if (technicalApproach.frontend.length > 0) {
      console.log(`  • Frontend: ${technicalApproach.frontend.length} components`);
    }
    if (technicalApproach.backend.length > 0) {
      console.log(`  • Backend: ${technicalApproach.backend.length} services`);
    }
    if (technicalApproach.data.length > 0) {
      console.log(`  • Data: ${technicalApproach.data.length} models`);
    }
    if (technicalApproach.security.length > 0) {
      console.log(`  • Security: ${technicalApproach.security.length} controls`);
    }

    // Determine if PRD is complex enough to suggest splitting
    const componentCount =
      (technicalApproach.frontend.length > 0 ? 1 : 0) +
      (technicalApproach.backend.length > 0 ? 1 : 0) +
      (technicalApproach.data.length > 0 ? 1 : 0) +
      (technicalApproach.security.length > 0 ? 1 : 0);

    const isComplexPrd = componentCount >= 3 || tasks.length > 10;

    console.log(`\n💡 Next Steps:`);
    console.log(`  1. Review epic: /pm:epic-show ${featureName}`);

    if (isComplexPrd) {
      console.log(`  2. Consider splitting into epics: /pm:epic-split ${featureName}`);
      console.log(`     (Complex PRD detected - ${componentCount} components, ${tasks.length} tasks)`);
      console.log(`     OR decompose as single epic: /pm:epic-decompose ${featureName}`);
    } else {
      console.log(`  2. Decompose into tasks: /pm:epic-decompose ${featureName}`);
      console.log(`     (For complex PRDs, consider: /pm:epic-split ${featureName})`);
    }

    console.log(`  3. Sync to GitHub: /pm:epic-sync ${featureName}`);
    console.log(`  4. Start implementation: /pm:issue-start TASK-1`);

    return true;
  }

  generateEpicContent(featureName, frontmatter, prdSections, technicalApproach, tasks) {
    const now = new Date().toISOString();
    const description = frontmatter.description || prdSections.vision.substring(0, 200);

    return `---
name: ${featureName}
status: backlog
created: ${now}
progress: 0%
prd: .claude/prds/${featureName}.md
github: [Will be updated when synced to GitHub]
priority: ${frontmatter.priority || 'P2'}
---

# Epic: ${featureName}

## Overview
${description}

${prdSections.vision ? `### Vision\n${prdSections.vision}\n` : ''}

## Architecture Decisions

### Technology Stack
- **Frontend**: Modern component-based UI
- **Backend**: RESTful API services
- **Data**: Persistent storage with appropriate database
- **Infrastructure**: Cloud-native deployment

### Design Patterns
- Separation of concerns
- API-first development
- Test-driven development
- Progressive enhancement

## Technical Approach

### Frontend Components
${technicalApproach.frontend.map(c => `- ${c}`).join('\n')}

### Backend Services
${technicalApproach.backend.map(s => `- ${s}`).join('\n')}

### Data Models
${technicalApproach.data.map(d => `- ${d}`).join('\n')}

${technicalApproach.security.length > 0 ? `### Security Controls\n${technicalApproach.security.map(s => `- ${s}`).join('\n')}\n` : ''}

### Infrastructure
- Development environment setup
- Testing infrastructure
- Deployment pipeline
- Monitoring and logging

## Implementation Strategy

### Phase 1: Foundation
- Set up project structure
- Configure development environment
- Establish CI/CD pipeline

### Phase 2: Core Implementation
- Build core functionality
- Implement data models
- Create API endpoints

### Phase 3: Integration
- Connect frontend and backend
- Implement authentication
- Add error handling

### Phase 4: Polish
- Performance optimization
- Security hardening
- Documentation

## Task Breakdown

${tasks.map(task => `### ${task.id}: ${task.title}
- **Type**: ${task.type}
- **Effort**: ${task.effort}
- **Status**: Not Started`).join('\n\n')}

## Dependencies

### External Dependencies
- Framework libraries
- Database system
- Authentication service

### Internal Dependencies
- Shared components
- Common utilities
- API contracts

## Success Criteria

${prdSections.metrics || '- All functional requirements met\n- Performance targets achieved\n- Security requirements satisfied\n- Documentation complete'}

## Estimated Effort

**Total**: ${this.calculateTotalEffort(tasks)}

### Breakdown by Type:
- Setup: ${this.calculateEffortByType(tasks, 'setup')}
- Frontend: ${this.calculateEffortByType(tasks, 'frontend')}
- Backend: ${this.calculateEffortByType(tasks, 'backend')}
- Integration: ${this.calculateEffortByType(tasks, 'integration')}
- Testing: ${this.calculateEffortByType(tasks, 'testing')}
- Deployment: ${this.calculateEffortByType(tasks, 'deployment')}

## Notes

- This epic was automatically generated from the PRD
- Review and adjust estimates based on team capacity
- Consider breaking down large tasks further
- Update progress as tasks are completed

---

*Generated on ${now} by PM System*`;
  }

  calculateTotalEffort(tasks) {
    let totalHours = 0;

    tasks.forEach(task => {
      totalHours += this.parseEffort(task.effort);
    });

    return this.formatEffort(totalHours);
  }

  calculateEffortByType(tasks, type) {
    const typeTasks = tasks.filter(t => t.type === type);
    let totalHours = 0;

    typeTasks.forEach(task => {
      totalHours += this.parseEffort(task.effort);
    });

    return this.formatEffort(totalHours);
  }

  parseEffort(effort) {
    if (!effort || typeof effort !== 'string') {
      return 8; // Default to 1 day
    }

    const numericValue = parseInt(effort);
    if (isNaN(numericValue)) {
      return 8; // Default to 1 day for invalid input
    }

    if (effort.includes('d')) {
      return numericValue * 8;
    } else if (effort.includes('h')) {
      return numericValue;
    } else if (effort.includes('w')) {
      return numericValue * 40;
    }
    return 8; // Default to 1 day
  }

  formatEffort(hours) {
    if (hours >= 40) {
      const weeks = Math.floor(hours / 40);
      const days = Math.floor((hours % 40) / 8);
      return `${weeks}w ${days}d`;
    } else if (hours >= 8) {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    return `${hours}h`;
  }

  async run(args) {
    const featureName = args[0];

    if (!featureName) {
      console.error('❌ Error: Feature name required');
      console.error('Usage: /pm:prd-parse <feature-name> [--overwrite]');

      // List available PRDs
      if (fs.existsSync(this.prdsDir)) {
        const prds = fs.readdirSync(this.prdsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''));

        if (prds.length > 0) {
          console.log('\n📋 Available PRDs:');
          prds.forEach(prd => {
            console.log(`  • ${prd}`);
          });
        }
      }

      process.exit(1);
    }

    const options = {};
    args.slice(1).forEach(arg => {
      if (arg === '--overwrite') {
        options.overwrite = true;
      }
    });

    const success = await this.parsePrd(featureName, options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const parser = new PrdParser();
  parser.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = PrdParser;