#!/usr/bin/env node

/**
 * Pre-Agent Context7 Hook
 *
 * MANDATORY: This hook enforces Context7 documentation queries BEFORE agent invocation.
 *
 * Workflow:
 * 1. Intercept agent invocation (e.g., @aws-cloud-architect)
 * 2. Extract agent file path from .claude/agents/{category}/{agent}.md
 * 3. Require the pointer to .claude/rules/context7-required.md
 * 4. Print the libraries to query (resolve-library-id, then query-docs)
 *
 * A file without the pointer is blocked.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse agent invocation
 * @param {string} agentInvocation - e.g., "@aws-cloud-architect design VPC"
 * @returns {object} { agentName, task }
 */
function parseAgentInvocation(agentInvocation) {
  // Remove @ symbol and split
  const cleaned = agentInvocation.replace(/^@/, '');
  const parts = cleaned.split(/\s+/);
  const agentName = parts[0];
  const task = parts.slice(1).join(' ');

  return {
    agentName,
    task,
    fullInvocation: agentInvocation
  };
}

/**
 * Find agent file in .claude/agents/
 * @param {string} agentName - Agent name (aws-cloud-architect, test-runner, etc.)
 * @returns {string|null} - Path to agent file or null
 */
function findAgentFile(agentName) {
  const baseDir = path.join(process.cwd(), '.claude', 'agents');

  // Search recursively in all subdirectories
  function searchDir(dir) {
    if (!fs.existsSync(dir)) return null;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const found = searchDir(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Check if filename matches (with or without .md extension)
        const basename = path.basename(entry.name, '.md');
        if (basename === agentName || basename.replace(/-/g, '_') === agentName) {
          return fullPath;
        }
      }
    }

    return null;
  }

  return searchDir(baseDir);
}

/**
 * Read the Context7 pointer from a command/agent file. Context7 is two MCP
 * tools (resolve-library-id, query-docs), so files point to the shared rule
 * `.claude/rules/context7-required.md` and may name libraries (#862).
 * @param {string} filePath - Path to the .md file
 * @returns {{referenced: boolean, libraries: string[]}}
 */
function extractContext7Pointer(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const referenced = /context7-required\.md/.test(content);
  const libsLine = content.match(/Libraries: ([^\n]+?)\.?\s*$/m);
  const libraries = libsLine ? libsLine[1].split(/,\s*/).filter(Boolean) : [];
  return { referenced, libraries };
}

/**
 * Main hook execution
 * @param {string} agentInvocation - Full agent invocation from user
 */
async function main(agentInvocation) {
  console.log('\n🔒 Context7 Pre-Agent Hook Activated\n');

  // Parse agent invocation
  const { agentName, task, fullInvocation } = parseAgentInvocation(agentInvocation || process.argv[2] || '');

  console.log(`🤖 Agent: @${agentName}`);
  if (task) {
    console.log(`   Task: ${task}`);
  }

  // Find agent file
  const agentFile = findAgentFile(agentName);
  if (!agentFile) {
    console.log(`\n⚠️  Warning: Agent file not found for @${agentName}`);
    console.log(`   Searched: .claude/agents/**/${agentName}.md`);
    console.log(`   Proceeding without Context7 enforcement (agent may not exist)\n`);
    return;
  }

  console.log(`   File: ${path.relative(process.cwd(), agentFile)}`);

  const { referenced, libraries } = extractContext7Pointer(agentFile);

  if (!referenced) {
    console.log(`\n❌ CRITICAL: No Context7 pointer found in ${path.basename(agentFile)}`);
    console.log(`   Add: Query Context7 first: see \`.claude/rules/context7-required.md\`. Libraries: <names>.`);
    console.log(`\n   Blocking until fixed.\n`);
    process.exit(1);
  }

  console.log(`\n📚 Context7 required (.claude/rules/context7-required.md)`);
  console.log(`⚡ ACTION REQUIRED: before proceeding, for each library run`);
  console.log(`   resolve-library-id, then query-docs with the topic you need.`);
  if (libraries.length > 0) {
    console.log(`   Libraries: ${libraries.join(', ')}`);
  }
  console.log();
}

// Execute if run directly
if (require.main === module) {
  const agentInvocation = process.argv.slice(2).join(' ');
  main(agentInvocation).catch(error => {
    console.error('\n❌ Hook execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseAgentInvocation,
  findAgentFile,
  extractContext7Pointer
};
