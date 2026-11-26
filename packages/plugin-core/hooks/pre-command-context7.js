#!/usr/bin/env node

/**
 * Pre-Command Context7 Hook
 *
 * MANDATORY: This hook enforces Context7 documentation queries BEFORE command execution.
 *
 * Workflow:
 * 1. Intercept command execution (e.g., /pm:epic-decompose)
 * 2. Extract command file path from .claude/commands/{category}/{command}.md
 * 3. Require the pointer to .claude/rules/context7-required.md
 * 4. Print the libraries to query (resolve-library-id, then query-docs)
 *
 * A file without the pointer is blocked.
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract command metadata from invocation
 * @param {string} commandInvocation - e.g., "/pm:epic-decompose feature-name"
 * @returns {object} { category, command, args }
 */
function parseCommandInvocation(commandInvocation) {
  // Remove leading slash and split
  const cleaned = commandInvocation.replace(/^\//, '');
  const [categoryCommand, ...args] = cleaned.split(/\s+/);
  const [category, command] = categoryCommand.split(':');

  return {
    category: category || 'pm', // Default to pm if no category
    command: command || categoryCommand,
    args: args,
    fullCommand: categoryCommand
  };
}

/**
 * Find command file in .claude/commands/
 * @param {string} category - Command category (pm, azure, cloud, etc.)
 * @param {string} command - Command name (epic-decompose, issue-start, etc.)
 * @returns {string|null} - Path to command file or null
 */
function findCommandFile(category, command) {
  const baseDir = path.join(process.cwd(), '.claude', 'commands');

  // Try exact match first
  let commandPath = path.join(baseDir, category, `${command}.md`);
  if (fs.existsSync(commandPath)) {
    return commandPath;
  }

  // Try with underscores (epic-decompose → epic_decompose)
  const underscored = command.replace(/-/g, '_');
  commandPath = path.join(baseDir, category, `${underscored}.md`);
  if (fs.existsSync(commandPath)) {
    return commandPath;
  }

  // Try without category prefix if command includes it
  if (command.includes('-')) {
    const [, actualCommand] = command.split('-', 2);
    if (actualCommand) {
      commandPath = path.join(baseDir, category, `${actualCommand}.md`);
      if (fs.existsSync(commandPath)) {
        return commandPath;
      }
    }
  }

  return null;
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
 * @param {string} commandInvocation - Full command string from user
 */
async function main(commandInvocation) {
  console.log('\n🔒 Context7 Pre-Command Hook Activated\n');

  // Parse command
  const { category, command, args, fullCommand } = parseCommandInvocation(commandInvocation || process.argv[2] || '');

  console.log(`📋 Command: /${fullCommand}`);
  console.log(`   Category: ${category}`);
  console.log(`   Command: ${command}`);
  if (args.length > 0) {
    console.log(`   Arguments: ${args.join(' ')}`);
  }

  // Find command file
  const commandFile = findCommandFile(category, command);
  if (!commandFile) {
    console.log(`\n⚠️  Warning: Command file not found for /${fullCommand}`);
    console.log(`   Searched: .claude/commands/${category}/${command}.md`);
    console.log(`   Proceeding without Context7 enforcement (file may not exist yet)\n`);
    return;
  }

  console.log(`   File: ${path.relative(process.cwd(), commandFile)}`);

  const { referenced, libraries } = extractContext7Pointer(commandFile);

  if (!referenced) {
    console.log(`\n❌ CRITICAL: No Context7 pointer found in ${path.basename(commandFile)}`);
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
  const commandInvocation = process.argv.slice(2).join(' ');
  main(commandInvocation).catch(error => {
    console.error('\n❌ Hook execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseCommandInvocation,
  findCommandFile,
  extractContext7Pointer
};
