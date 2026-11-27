#!/usr/bin/env node

/**
 * Hook enforcing agent usage instead of direct operations.
 *
 * Opt-in: the installer registers it as a Claude Code PreToolUse hook in .claude/settings.json only
 * with `--enforce-agents` (saved as `features.enforce_agents` in .claude/config.json).
 * It blocks only a test suite run that prints its full output, reading a *.log / *.out file, and
 * reading a file over 1000 lines without a limit. It looks at the command word of each pipeline
 * segment, never at text the command merely mentions.
 * Claude Code passes the tool call as JSON on stdin ({tool_name, tool_input}); exit 2 blocks
 * the call and shows stderr to Claude. `node enforce-agents.js <tool> <params>` still works by hand.
 */

const fs = require('fs');

const QUIET_FLAGS = ['-q', '--quiet', '--silent'];
const LOG_READERS = ['cat', 'head', 'tail', 'less', 'more'];
const PREFIXES = ['sudo', 'env', 'time', 'command', 'exec'];

class AgentEnforcer {
  constructor() {
    if (process.argv[2]) {
      this.toolName = process.argv[2];
      this.toolParams = process.argv[3] || '';
      try {
        this.parsedParams = JSON.parse(this.toolParams);
      } catch {
        this.parsedParams = {};
      }
      return;
    }

    // Claude Code hook input on stdin
    let input = {};
    try {
      input = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}');
    } catch {
      input = {};
    }
    this.toolName = input.tool_name || '';
    this.parsedParams = input.tool_input || {};
    this.toolParams = typeof this.parsedParams.command === 'string'
      ? this.parsedParams.command
      : JSON.stringify(this.parsedParams);
  }

  blockWithMessage(reason, agent, example) {
    console.error(`❌ BLOCKED: ${reason}`);
    console.error(`✅ INSTEAD: Use the ${agent} agent via Task tool`);
    console.error('');
    console.error('Example:');
    console.error(`  Task: ${example}`);
    process.exit(2);
  }

  checkBashUsage() {
    if (this.toolName !== 'Bash') return;

    for (const [cmd, ...args] of AgentEnforcer.commandsOf(this.toolParams)) {
      // A test suite run that dumps its full output - should use test-runner.
      // Quiet runs (-q, --quiet, --silent) only print a summary, so they pass.
      if (AgentEnforcer.isTestRun(cmd, args) && !args.some(a => QUIET_FLAGS.includes(a))) {
        this.blockWithMessage(
          'Direct test execution detected (add -q/--silent for a summary-only run)',
          'test-runner',
          'Run and analyze test results'
        );
      }

      // Reading a log file - should use file-analyzer
      if (LOG_READERS.includes(cmd) && args.some(a => /\.(log|out)$/.test(a))) {
        this.blockWithMessage(
          'Direct log reading detected',
          'file-analyzer',
          'Analyze and summarize [log file]'
        );
      }
    }
  }

  /**
   * Split a shell command into simple commands ([word, ...args]) at `&&`, `||`, `;`, `|`, `&` and
   * newlines. Quoted text stays one argument and is never read as a command, so
   * `git commit -m "fix npm test"` or `echo "see build.log"` are not mistaken for what they mention.
   * Leading `VAR=value` assignments and `sudo`/`env`/`time` prefixes are skipped.
   */
  static commandsOf(command) {
    const quoted = [];
    const masked = String(command).replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, m => {
      quoted.push(m.slice(1, -1));
      return `\u0000${quoted.length - 1}\u0000`;
    });
    return masked.split(/&&|\|\||[;|&\n]/).map(segment => {
      const words = segment.trim().split(/\s+/).filter(Boolean)
        .map(w => w.replace(/\u0000(\d+)\u0000/g, (_, i) => quoted[i]));
      while (words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]) || PREFIXES.includes(words[0]))) {
        words.shift();
      }
      if (words.length) words[0] = words[0].split('/').pop();
      return words;
    }).filter(words => words.length > 0);
  }

  static isTestRun(cmd, args) {
    if (['npm', 'yarn', 'pnpm', 'bun'].includes(cmd)) {
      return args[0] === 'test' || args[0] === 't' || (args[0] === 'run' && args[1] === 'test');
    }
    if (cmd === 'npx') return AgentEnforcer.isTestRun(args[0], args.slice(1));
    if (/^python[0-9.]*$/.test(cmd)) return args[0] === '-m' && args[1] === 'pytest';
    return ['jest', 'vitest', 'pytest'].includes(cmd);
  }

  checkReadUsage() {
    if (this.toolName !== 'Read') return;

    const filePath = this.parsedParams.file_path;
    if (!filePath) return;
    // A ranged read (offset/limit) only loads part of the file
    if (this.parsedParams.limit !== undefined) return;

    // If file is larger than 1000 lines, enforce file-analyzer
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount > 1000) {
          this.blockWithMessage(
            `Reading large file directly (${lineCount} lines)`,
            'file-analyzer',
            `Summarize contents of ${filePath}`
          );
        }
      } catch (error) {
        // Can't read file, let it pass through
      }
    }
  }

  checkGrepUsage() {
    if (this.toolName !== 'Grep') return;

    const pattern = this.parsedParams.pattern;
    if (!pattern) return;

    // If pattern is complex or searches many files, use code-analyzer
    const complexPattern = /(\.\*|\+|\{|\[)/;
    if (complexPattern.test(pattern)) {
      console.log('⚠️  SUGGESTION: For complex searches, consider using code-analyzer agent');
      console.log('   It provides better context and analysis of results');
      // Don't block, just suggest
    }
  }

  run() {
    // Check various tool usages
    this.checkBashUsage();
    this.checkReadUsage();
    this.checkGrepUsage();

    // If we got here, it's allowed - pass through
    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const enforcer = new AgentEnforcer();
  enforcer.run();
}

module.exports = AgentEnforcer;