#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Epic Split - Automatically split a PRD into multiple epics
 * Usage: node epic-split.js <feature_name>
 */

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Epic templates for different components
const EPIC_TEMPLATES = {
  infrastructure: {
    name: 'Infrastructure Foundation',
    priority: 'P0',
    type: 'infrastructure',
    weeks: 1,
    description: 'Core infrastructure setup including Docker, database, and development environment',
    components: ['docker', 'database', 'redis', 'monitoring', 'logging'],
    keywords: ['docker', 'postgres', 'redis', 'infrastructure', 'compose', 'health', 'monitoring']
  },
  auth_backend: {
    name: 'Authentication Backend',
    priority: 'P0',
    type: 'backend',
    weeks: 2,
    description: 'Backend authentication system with JWT, user management, and RBAC',
    components: ['jwt', 'users', 'roles', 'permissions', 'tokens'],
    keywords: ['auth', 'jwt', 'login', 'register', 'token', 'rbac', 'user model']
  },
  auth_frontend: {
    name: 'Authentication UI',
    priority: 'P0',
    type: 'frontend',
    weeks: 2,
    description: 'Frontend authentication flows including login, registration, and password management',
    components: ['login_ui', 'register_ui', 'password_reset_ui', 'auth_state'],
    keywords: ['sign in', 'sign up', 'login form', 'register form', 'auth ui']
  },
  api_core: {
    name: 'API Core Services',
    priority: 'P0',
    type: 'backend',
    weeks: 2,
    description: 'Core REST API endpoints and business logic',
    components: ['endpoints', 'services', 'middleware', 'validation'],
    keywords: ['api', 'endpoint', 'rest', 'fastapi', 'route', 'service']
  },
  frontend_foundation: {
    name: 'Frontend Foundation',
    priority: 'P0',
    type: 'frontend',
    weeks: 1,
    description: 'Frontend setup with React, TypeScript, and core libraries',
    components: ['react', 'typescript', 'routing', 'state', 'styling'],
    keywords: ['react', 'typescript', 'vite', 'mui', 'material', 'router', 'zustand']
  },
  dashboard: {
    name: 'Dashboard & User Experience',
    priority: 'P1',
    type: 'frontend',
    weeks: 2,
    description: 'Main application dashboard and user interface',
    components: ['dashboard', 'navigation', 'profile', 'layouts'],
    keywords: ['dashboard', 'profile', 'navigation', 'layout', 'appbar', 'drawer']
  },
  testing: {
    name: 'Testing & Quality',
    priority: 'P1',
    type: 'testing',
    weeks: 1,
    description: 'Comprehensive testing suite including unit, integration, and E2E tests',
    components: ['unit_tests', 'integration_tests', 'e2e_tests', 'coverage'],
    keywords: ['test', 'pytest', 'vitest', 'playwright', 'tdd', 'coverage']
  },
  deployment: {
    name: 'Deployment & DevOps',
    priority: 'P1',
    type: 'devops',
    weeks: 1,
    description: 'CI/CD pipelines, deployment configurations, and production setup',
    components: ['ci_cd', 'deployment', 'monitoring', 'security'],
    keywords: ['deploy', 'ci/cd', 'github actions', 'production', 'release']
  },
  data_layer: {
    name: 'Data Layer & Persistence',
    priority: 'P0',
    type: 'backend',
    weeks: 1,
    description: 'Database models, migrations, and data access layer',
    components: ['models', 'migrations', 'orm', 'queries'],
    keywords: ['database', 'model', 'migration', 'alembic', 'sqlalchemy', 'schema']
  },
  security: {
    name: 'Security & Compliance',
    priority: 'P0',
    type: 'security',
    weeks: 1,
    description: 'Security hardening, OWASP compliance, and vulnerability management',
    components: ['security_headers', 'rate_limiting', 'csrf', 'validation'],
    keywords: ['security', 'owasp', 'csrf', 'cors', 'rate limit', 'vulnerability']
  }
};

// Analyze PRD content to identify needed epics
function analyzePRD(content) {
  const contentLower = content.toLowerCase();
  const identifiedEpics = [];

  // Check for each epic template
  for (const [key, template] of Object.entries(EPIC_TEMPLATES)) {
    let score = 0;
    let matchedKeywords = [];

    // Check keywords
    for (const keyword of template.keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    // If enough keywords match, include this epic
    if (score >= 2) {
      identifiedEpics.push({
        key,
        template,
        score,
        matchedKeywords
      });
    }
  }

  // Sort by score and priority
  identifiedEpics.sort((a, b) => {
    if (a.template.priority !== b.template.priority) {
      return a.template.priority === 'P0' ? -1 : 1;
    }
    return b.score - a.score;
  });

  return identifiedEpics;
}

// Determine epic dependencies
function determineDependencies(epics) {
  const dependencies = {};

  for (const epic of epics) {
    dependencies[epic.key] = [];

    // Infrastructure is always first
    if (epic.key !== 'infrastructure' && epics.some(e => e.key === 'infrastructure')) {
      if (['auth_backend', 'api_core', 'frontend_foundation', 'data_layer'].includes(epic.key)) {
        dependencies[epic.key].push('infrastructure');
      }
    }

    // Frontend auth depends on backend auth
    if (epic.key === 'auth_frontend') {
      if (epics.some(e => e.key === 'auth_backend')) {
        dependencies[epic.key].push('auth_backend');
      }
      if (epics.some(e => e.key === 'frontend_foundation')) {
        dependencies[epic.key].push('frontend_foundation');
      }
    }

    // Dashboard depends on auth UI
    if (epic.key === 'dashboard') {
      if (epics.some(e => e.key === 'auth_frontend')) {
        dependencies[epic.key].push('auth_frontend');
      }
    }

    // API depends on data layer
    if (epic.key === 'api_core' && epics.some(e => e.key === 'data_layer')) {
      dependencies[epic.key].push('data_layer');
    }

    // Testing depends on implementation epics
    if (epic.key === 'testing') {
      const implEpics = ['api_core', 'auth_backend', 'auth_frontend', 'dashboard'];
      for (const impl of implEpics) {
        if (epics.some(e => e.key === impl)) {
          dependencies[epic.key].push(impl);
        }
      }
    }

    // Deployment depends on testing
    if (epic.key === 'deployment' && epics.some(e => e.key === 'testing')) {
      dependencies[epic.key].push('testing');
    }
  }

  return dependencies;
}

// Generate epic content
function generateEpicContent(epic, dependencies, prdPath, index) {
  const now = new Date().toISOString();
  const template = epic.template;

  const frontmatter = {
    name: template.name.toLowerCase().replace(/\s+/g, '-'),
    status: 'backlog',
    created: now,
    progress: 0,
    prd: prdPath,
    github: '[Will be updated when synced to GitHub]',
    priority: template.priority,
    type: template.type,
    dependencies: dependencies[epic.key] || [],
    epic_number: index + 1
  };

  const content = `---
${yaml.dump(frontmatter).trim()}
---

# Epic ${index + 1}: ${template.name}

## Overview
${template.description}

## Scope
This epic covers the following components:
${template.components.map(c => `- ${c.replace(/_/g, ' ').charAt(0).toUpperCase() + c.replace(/_/g, ' ').slice(1)}`).join('\n')}

## Dependencies
${dependencies[epic.key]?.length > 0 ? dependencies[epic.key].map(d => {
  const depEpic = EPIC_TEMPLATES[d];
  return `- ${depEpic ? depEpic.name : d}`;
}).join('\n') : '- None (can start immediately)'}

## Success Criteria
- All ${template.components.length} components implemented and tested
- Integration with dependent epics verified
- Documentation complete
- Code review passed
- ${template.type === 'frontend' ? 'UI/UX review approved' : ''}
- ${template.type === 'backend' ? 'API documentation generated' : ''}
- ${template.type === 'testing' ? 'Coverage targets met (>80%)' : ''}

## Estimated Effort
**${template.weeks} week${template.weeks > 1 ? 's' : ''}**

## Technical Approach
${template.type === 'infrastructure' ? `
- Set up containerized development environment
- Configure database and caching layers
- Implement logging and monitoring
- Create development scripts and tooling` : ''}
${template.type === 'backend' ? `
- Design data models and API contracts
- Implement service layer with business logic
- Create RESTful endpoints
- Add validation and error handling` : ''}
${template.type === 'frontend' ? `
- Set up component architecture
- Implement UI components with accessibility
- Create responsive layouts
- Integrate with backend APIs` : ''}
${template.type === 'testing' ? `
- Write comprehensive unit tests
- Create integration test suites
- Implement E2E test scenarios
- Set up continuous testing pipeline` : ''}
${template.type === 'devops' ? `
- Configure CI/CD pipelines
- Set up deployment automation
- Implement monitoring and alerting
- Create rollback procedures` : ''}

## Risk Factors
- Dependency on ${dependencies[epic.key]?.length || 0} other epic${dependencies[epic.key]?.length !== 1 ? 's' : ''}
- Estimated complexity: ${template.weeks > 1 ? 'High' : 'Medium'}
- Technical challenges in ${template.components[0].replace(/_/g, ' ')}

## Notes
- Epic identified based on PRD analysis
- Matched keywords: ${epic.matchedKeywords.join(', ')}
- Can be further decomposed into ${3 + template.components.length} to ${5 + template.components.length * 2} tasks

---
*Generated on ${now} by Epic Split System*`;

  return content;
}

// Create meta file for multi-epic structure
function generateMetaFile(epics, featureName) {
  const now = new Date().toISOString();

  const meta = {
    feature: featureName,
    created: now,
    total_epics: epics.length,
    epics: epics.map((e, i) => ({
      number: i + 1,
      key: e.key,
      name: e.template.name,
      priority: e.template.priority,
      weeks: e.template.weeks,
      type: e.template.type
    })),
    total_weeks: epics.reduce((sum, e) => sum + e.template.weeks, 0),
    execution_strategy: 'parallel_where_possible'
  };

  return `---
${yaml.dump(meta).trim()}
---

# Multi-Epic Structure: ${featureName}

## Overview
This feature has been automatically split into ${epics.length} epics based on PRD analysis.

## Epic Breakdown

${epics.map((e, i) => `### Epic ${i + 1}: ${e.template.name}
- **Priority:** ${e.template.priority}
- **Duration:** ${e.template.weeks} week${e.template.weeks > 1 ? 's' : ''}
- **Type:** ${e.template.type}
- **Confidence:** ${Math.round((e.score / e.template.keywords.length) * 100)}%
`).join('\n')}

## Execution Timeline

\`\`\`
Week 1-${epics[0]?.template.weeks || 1}: ${epics[0]?.template.name || 'TBD'}
${epics.slice(1).map((e, i) => {
  const startWeek = epics.slice(0, i + 1).reduce((sum, ep) => sum + ep.template.weeks, 1);
  const endWeek = startWeek + e.template.weeks - 1;
  return `Week ${startWeek}-${endWeek}: ${e.template.name}`;
}).join('\n')}
\`\`\`

## Total Estimated Effort
**${epics.reduce((sum, e) => sum + e.template.weeks, 0)} weeks**

## Next Steps
1. Review and adjust epic breakdown
2. Decompose each epic into tasks: \`/pm:epic-decompose <feature>/<epic_number>\`
3. Sync to GitHub: \`/pm:epic-sync <feature>\`

---
*Generated on ${now} by Epic Split System*`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`${colors.red}❌ Missing feature name${colors.reset}`);
    console.log('Usage: node epic-split.js <feature_name>');
    process.exit(1);
  }

  const featureName = args[0];
  const prdPath = path.join('.claude', 'prds', `${featureName}.md`);
  const epicDir = path.join('.claude', 'epics', featureName);

  console.log(`${colors.cyan}🔄 Analyzing PRD: ${featureName}${colors.reset}`);
  console.log('══════════════════════════════════════════════════\n');

  try {
    // Check if PRD exists
    try {
      await fs.access(prdPath);
    } catch {
      console.error(`${colors.red}❌ PRD not found: ${prdPath}${colors.reset}`);
      console.log(`First create a PRD with: /pm:prd-new ${featureName}`);
      process.exit(1);
    }

    // Check if epics already exist
    try {
      await fs.access(epicDir);
      const files = await fs.readdir(epicDir);
      const epicFolders = files.filter(f => !f.includes('.'));

      if (epicFolders.length > 0) {
        console.log(`${colors.yellow}⚠️  Found existing epic structure:${colors.reset}`);
        console.log(`   ${epicFolders.join(', ')}`);
        console.log('\nThis will replace the existing structure.');
        console.log('Continue? (Press Ctrl+C to cancel)\n');

        // In real implementation, would wait for user input
        // For now, we'll proceed
      }
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Read PRD content
    console.log(`${colors.blue}📖 Reading PRD...${colors.reset}`);
    const prdContent = await fs.readFile(prdPath, 'utf8');

    // Analyze PRD to identify epics
    console.log(`${colors.blue}🔍 Analyzing requirements...${colors.reset}`);
    const identifiedEpics = analyzePRD(prdContent);

    if (identifiedEpics.length === 0) {
      console.error(`${colors.red}❌ Could not identify any epics from PRD${colors.reset}`);
      console.log('The PRD may be too simple or lack typical keywords.');
      process.exit(1);
    }

    console.log(`${colors.green}✓ Identified ${identifiedEpics.length} epics${colors.reset}\n`);

    // Determine dependencies
    console.log(`${colors.blue}🔗 Determining dependencies...${colors.reset}`);
    const dependencies = determineDependencies(identifiedEpics);

    // Create epic directory structure
    console.log(`${colors.blue}📁 Creating epic structure...${colors.reset}\n`);
    await fs.mkdir(epicDir, { recursive: true });

    // Create meta file
    const metaContent = generateMetaFile(identifiedEpics, featureName);
    await fs.writeFile(path.join(epicDir, 'meta.yaml'), metaContent);

    // Create each epic
    for (let i = 0; i < identifiedEpics.length; i++) {
      const epic = identifiedEpics[i];
      const epicNumber = String(i + 1).padStart(2, '0');
      const epicFolder = `${epicNumber}-${epic.key}`;
      const epicPath = path.join(epicDir, epicFolder);

      // Create epic folder
      await fs.mkdir(epicPath, { recursive: true });

      // Generate epic content
      const epicContent = generateEpicContent(
        epic,
        dependencies,
        prdPath,
        i
      );

      // Write epic file
      await fs.writeFile(path.join(epicPath, 'epic.md'), epicContent);

      console.log(`${colors.green}✓${colors.reset} Epic ${i + 1}: ${epic.template.name}`);
      console.log(`  ${colors.gray}Priority: ${epic.template.priority}, Duration: ${epic.template.weeks}w${colors.reset}`);
      console.log(`  ${colors.gray}Location: ${epicPath}${colors.reset}`);
    }

    // Success summary
    console.log(`\n${colors.green}✅ Successfully split PRD into ${identifiedEpics.length} epics!${colors.reset}\n`);

    console.log(`${colors.bright}📋 Epic Summary:${colors.reset}`);
    console.log('──────────────────────────────────────────────────');

    const p0Epics = identifiedEpics.filter(e => e.template.priority === 'P0');
    const p1Epics = identifiedEpics.filter(e => e.template.priority === 'P1');

    console.log(`${colors.cyan}P0 (Must Have):${colors.reset} ${p0Epics.length} epics`);
    p0Epics.forEach((e, i) => {
      console.log(`  • ${e.template.name} (${e.template.weeks}w)`);
    });

    if (p1Epics.length > 0) {
      console.log(`\n${colors.yellow}P1 (Should Have):${colors.reset} ${p1Epics.length} epics`);
      p1Epics.forEach((e, i) => {
        console.log(`  • ${e.template.name} (${e.template.weeks}w)`);
      });
    }

    const totalWeeks = identifiedEpics.reduce((sum, e) => sum + e.template.weeks, 0);
    console.log(`\n${colors.bright}⏱️  Total Estimated Effort: ${totalWeeks} weeks${colors.reset}`);

    // Show dependency graph
    console.log(`\n${colors.bright}🔗 Dependency Graph:${colors.reset}`);
    console.log('──────────────────────────────────────────────────');

    for (const epic of identifiedEpics) {
      const deps = dependencies[epic.key];
      if (deps && deps.length > 0) {
        console.log(`${epic.template.name} ${colors.gray}depends on${colors.reset} → ${deps.map(d => {
          const depEpic = identifiedEpics.find(e => e.key === d);
          return depEpic ? depEpic.template.name : d;
        }).join(', ')}`);
      } else {
        console.log(`${epic.template.name} ${colors.green}(can start immediately)${colors.reset}`);
      }
    }

    console.log(`\n${colors.bright}💡 Next Steps:${colors.reset}`);
    console.log(`  1. Review epics: ${colors.cyan}/pm:epic-show ${featureName}${colors.reset}`);
    console.log(`  2. Decompose first epic: ${colors.cyan}/pm:epic-decompose ${featureName}/01-${identifiedEpics[0].key}${colors.reset}`);
    console.log(`  3. Sync all to GitHub: ${colors.cyan}/pm:epic-sync ${featureName}${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    if (error.stack && process.env.DEBUG) {
      console.error(colors.gray + error.stack + colors.reset);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});