#!/usr/bin/env node

/**
 * Pre-Action Agent Reminder Hook
 *
 * Reminds Claude to use specialized agents BEFORE performing tasks.
 * This hook analyzes the user's request and suggests appropriate agents.
 *
 * IMPORTANT: This is a REMINDER, not a blocker. Claude can proceed,
 * but should consider using agents for non-trivial tasks.
 */

const patterns = {
  // Code writing patterns
  code: {
    patterns: [
      /writ(e|ing) code/i,
      /creat(e|ing) (a |an )?(function|class|component|module|api|endpoint)/i,
      /implement(ing)?/i,
      /add (a |an )?(feature|functionality)/i,
      /build (a |an )?/i,
      /develop(ing)?/i
    ],
    agents: [
      'python-backend-engineer (Python)',
      'nodejs-backend-engineer (Node.js/JavaScript)',
      'react-frontend-engineer (React/Frontend)',
      'bash-scripting-expert (Bash scripts)'
    ],
    context7: [
      'Query Context7 for framework-specific best practices',
      'Check API patterns and conventions',
      'Verify current library versions and syntax'
    ]
  },

  // Testing patterns
  testing: {
    patterns: [
      /test(s|ing)?/i,
      /unit test/i,
      /integration test/i,
      /e2e test/i,
      /run.*(test|spec)/i,
      /write.*test/i
    ],
    agents: [
      'test-runner (Run and analyze tests)',
      'frontend-testing-engineer (Frontend tests)',
      'e2e-test-engineer (E2E tests)'
    ],
    context7: [
      'jest: best-practices',
      'testing: tdd-patterns',
      '<framework>: testing'
    ]
  },

  // Database patterns
  database: {
    patterns: [
      /database/i,
      /schema/i,
      /migration/i,
      /query/i,
      /sql/i,
      /(postgres|mysql|mongodb|redis)/i
    ],
    agents: [
      'postgresql-expert (PostgreSQL)',
      'mongodb-expert (MongoDB)',
      'redis-expert (Redis)'
    ],
    context7: [
      '<database>: schema-design',
      '<database>: query-optimization',
      '<database>: best-practices'
    ]
  },

  // DevOps patterns
  devops: {
    patterns: [
      /deploy(ing|ment)?/i,
      /docker/i,
      /kubernetes/i,
      /k8s/i,
      /container/i,
      /ci\/cd/i,
      /pipeline/i
    ],
    agents: [
      'kubernetes-orchestrator (Kubernetes)',
      'docker-containerization-expert (Docker)',
      'terraform-infrastructure-expert (Terraform)',
      'github-operations-specialist (GitHub Actions)'
    ],
    context7: [
      'kubernetes: deployment-patterns',
      'docker: best-practices',
      'terraform: infrastructure-patterns'
    ]
  },

  // Code analysis patterns
  analysis: {
    patterns: [
      /review/i,
      /analyze/i,
      /check.*bug/i,
      /find.*issue/i,
      /security/i,
      /optimize/i
    ],
    agents: [
      'code-analyzer (Bug detection, logic tracing)',
      'security-scanning-expert (Security analysis)'
    ],
    context7: [
      '<language>: code-quality',
      'security: best-practices'
    ]
  },

  // Large file patterns
  files: {
    patterns: [
      /log file/i,
      /analyze.*file/i,
      /summarize.*file/i,
      /parse.*(log|output)/i
    ],
    agents: [
      'file-analyzer (File and log analysis)'
    ],
    context7: [
      'logging: analysis-patterns'
    ]
  }
};

function analyzeRequest(userMessage) {
  const matches = [];

  for (const [category, config] of Object.entries(patterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(userMessage)) {
        matches.push({
          category,
          agents: config.agents,
          context7: config.context7
        });
        break;
      }
    }
  }

  return matches;
}

function generateReminder(matches) {
  if (matches.length === 0) {
    return null;
  }

  let reminder = '\n🤖 AGENT USAGE REMINDER\n';
  reminder += '━'.repeat(80) + '\n\n';

  reminder += '⚠️  This task may benefit from using specialized agents:\n\n';

  for (const match of matches) {
    reminder += `📋 ${match.category.toUpperCase()} TASK DETECTED\n\n`;

    reminder += '**Recommended Agents:**\n';
    for (const agent of match.agents) {
      reminder += `   • ${agent}\n`;
    }

    reminder += '\n**Context7 (resolve-library-id, then query-docs):**\n';
    for (const query of match.context7) {
      reminder += `   • ${query}\n`;
    }

    reminder += '\n';
  }

  reminder += '📖 See: .claude/rules/agent-mandatory.md for complete guidance\n';
  reminder += '━'.repeat(80) + '\n\n';

  reminder += '💡 You can proceed directly if this is simple, but consider:\n';
  reminder += '   1. Using agents for better quality and consistency\n';
  reminder += '   2. Querying Context7 for up-to-date best practices\n';
  reminder += '   3. Following TDD cycle (RED-GREEN-REFACTOR)\n\n';

  return reminder;
}

function main() {
  // Get user message from command line args or stdin
  const args = process.argv.slice(2);
  const userMessage = args.join(' ') || '';

  if (!userMessage) {
    // No message to analyze
    process.exit(0);
  }

  const matches = analyzeRequest(userMessage);
  const reminder = generateReminder(matches);

  if (reminder) {
    console.log(reminder);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeRequest, generateReminder };
