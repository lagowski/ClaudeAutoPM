#!/usr/bin/env node

/**
 * Framework Agent Standardization Script
 *
 * Automatically adds missing sections to framework agents:
 * - Frontmatter (name, description, tools, model, color)
 * - TDD Methodology section
 * - Self-Verification Protocol
 *
 * Based on DEVELOPMENT-STANDARDS.md template
 */

const fs = require('fs');
const path = require('path');

// Template sections from DEVELOPMENT-STANDARDS.md
const TEMPLATES = {
  tdd: `## Test-Driven Development (TDD) Methodology

**MANDATORY**: Follow strict TDD principles for all development:
1. **Write failing tests FIRST** - Before implementing any functionality
2. **Red-Green-Refactor cycle** - Test fails → Make it pass → Improve code
3. **One test at a time** - Focus on small, incremental development
4. **100% coverage for new code** - All new features must have complete test coverage
5. **Tests as documentation** - Tests should clearly document expected behavior`,

  selfVerification: `## Self-Verification Protocol

Before delivering any solution, verify:
- [ ] Documentation from Context7 has been consulted
- [ ] Code follows best practices
- [ ] Tests are written and passing
- [ ] Performance is acceptable
- [ ] Security considerations addressed
- [ ] No resource leaks
- [ ] Error handling is comprehensive`
};


/**
 * Extract first paragraph as description
 */
function extractDescription(content) {
  // Remove frontmatter if exists
  let cleaned = content.replace(/^---[\s\S]*?---\n\n?/, '');

  // Remove first header
  cleaned = cleaned.replace(/^#\s+.+\n\n?/, '');

  // Get first paragraph
  const match = cleaned.match(/^(.+?)(?:\n\n|\n#)/s);
  if (match) {
    return match[1].trim().replace(/\n/g, ' ');
  }

  return 'Agent for specialized tasks';
}

/**
 * Generate frontmatter for agent
 */
function generateFrontmatter(filePath, content) {
  const agentName = path.basename(filePath, '.md');
  const description = extractDescription(content);

  // Determine color based on category
  const category = path.dirname(filePath).split('/').pop();
  const colorMap = {
    'core': 'blue',
    'languages': 'green',
    'frameworks': 'purple',
    'cloud': 'cyan',
    'devops': 'yellow',
    'databases': 'magenta',
    'data': 'orange',
    'integration': 'red',
    'testing': 'pink'
  };
  const color = colorMap[category] || 'green';

  return `---
name: ${agentName}
description: ${description}
tools: Glob, Grep, Read, WebFetch, TodoWrite, WebSearch, Edit, Write, Bash, Task, Agent
model: inherit
color: ${color}
---`;
}

/**
 * Check if file has frontmatter
 */
function hasFrontmatter(content) {
  return content.trim().startsWith('---');
}

/**
 * Check if file has TDD section
 */
function hasTDD(content) {
  return /## Test-Driven Development/.test(content);
}

/**
 * Check if file has Self-Verification section
 */
function hasSelfVerification(content) {
  return /## Self-Verification Protocol/.test(content);
}

/**
 * Add frontmatter to file
 */
function addFrontmatter(filePath, content) {
  const frontmatter = generateFrontmatter(filePath, content);
  return frontmatter + '\n\n' + content;
}

/**
 * Add TDD section after main header
 */
function addTDD(content) {
  // Find first # header and add TDD after the introduction paragraph
  const lines = content.split('\n');
  let insertIndex = -1;
  let foundHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip frontmatter
    if (i === 0 && line === '---') {
      while (i < lines.length && lines[i] !== '---') i++;
      continue;
    }

    // Find first # header
    if (!foundHeader && /^#\s+/.test(line)) {
      foundHeader = true;
      continue;
    }

    // Find first ## section after header or empty line after intro paragraph
    if (foundHeader && (/^##\s+/.test(line) || (line === '' && i > 0 && lines[i-1] !== ''))) {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex === -1) {
    // If no ## section found, add after first paragraph
    insertIndex = lines.findIndex((line, i) => i > 5 && line === '');
    if (insertIndex === -1) insertIndex = 10; // Fallback
  }

  lines.splice(insertIndex, 0, '', TEMPLATES.tdd, '');
  return lines.join('\n');
}

/**
 * Add Self-Verification section at end of file
 */
function addSelfVerification(content) {
  // Add before last section if it's "Deprecation Notice" or similar
  if (/## Deprecation Notice/.test(content)) {
    return content.replace(
      /## Deprecation Notice/,
      `${TEMPLATES.selfVerification}\n\n## Deprecation Notice`
    );
  }

  // Otherwise add at end
  return content.trim() + '\n\n' + TEMPLATES.selfVerification + '\n';
}

/**
 * Process single agent file
 */
function processAgent(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);

  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found, skipping`);
    return { updated: false };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = [];

  // Check and add frontmatter
  if (!hasFrontmatter(content)) {
    content = addFrontmatter(filePath, content);
    changes.push('frontmatter');
    console.log('   ✅ Added frontmatter');
  }

  // Check and add TDD
  if (!hasTDD(content)) {
    content = addTDD(content);
    changes.push('TDD');
    console.log('   ✅ Added TDD Methodology');
  }

  // Check and add Self-Verification
  if (!hasSelfVerification(content)) {
    content = addSelfVerification(content);
    changes.push('self-verification');
    console.log('   ✅ Added Self-Verification Protocol');
  }

  if (changes.length > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`   💾 Saved with ${changes.length} changes: ${changes.join(', ')}`);
    return { updated: true, changes };
  } else {
    console.log('   ℹ️  Already compliant, no changes needed');
    return { updated: false };
  }
}

/**
 * Find all agent files
 */
function findAllAgents() {
  const agentsDir = path.join(__dirname, '..', 'autopm', '.claude', 'agents');
  const agents = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Exclude README, AGENT-REGISTRY, and decision matrix files
        if (!entry.name.includes('README') &&
            !entry.name.includes('REGISTRY') &&
            !entry.name.includes('-selection')) {
          const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
          agents.push(relativePath);
        }
      }
    }
  }

  scanDir(agentsDir);
  return agents;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Framework Agent Standardization Script\n');
  console.log('Based on DEVELOPMENT-STANDARDS.md template\n');
  console.log('='.repeat(60));

  const allAgents = findAllAgents();
  console.log(`\n📊 Found ${allAgents.length} framework agents\n`);

  let stats = {
    total: allAgents.length,
    updated: 0,
    frontmatterAdded: 0,
    tddAdded: 0,
    selfVerificationAdded: 0
  };

  // Process all agents
  for (const agentPath of allAgents) {
    const result = processAgent(agentPath);
    if (result.updated) {
      stats.updated++;
      if (result.changes.includes('frontmatter')) stats.frontmatterAdded++;
      if (result.changes.includes('TDD')) stats.tddAdded++;
      if (result.changes.includes('self-verification')) stats.selfVerificationAdded++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Standardization Summary:\n');
  console.log(`Total agents processed:     ${stats.total}`);
  console.log(`Agents updated:             ${stats.updated}`);
  console.log(`Frontmatter added:          ${stats.frontmatterAdded}`);
  console.log(`TDD sections added:         ${stats.tddAdded}`);
  console.log(`Self-Verification added:    ${stats.selfVerificationAdded}`);
  console.log(`Already compliant:          ${stats.total - stats.updated}`);

  const complianceRate = ((stats.total - stats.updated) / stats.total * 100).toFixed(1);
  console.log(`\n✅ Compliance rate: ${complianceRate}%`);

  if (stats.updated > 0) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review changes: git diff autopm/.claude/agents/`);
    console.log(`   2. Run code analyzer: @code-analyzer review agent changes`);
    console.log(`   3. Commit: git add . && git commit -m "feat: standardize framework agents"`);
  }

  console.log('\n✨ Done!\n');
}

// Execute
if (require.main === module) {
  main();
}

module.exports = { processAgent, findAllAgents };
