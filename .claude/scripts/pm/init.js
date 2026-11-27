#!/usr/bin/env node

/**
 * PM Init Script - Node.js Implementation
 *
 * Migrated from init.sh to provide system initialization functionality
 * Maintains full compatibility with the original bash implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function initializeSystem(options = {}) {
  const {
    dryRun = false,
    skipDependencyCheck = false,
    verbose = false
  } = options;

  const result = {
    dryRun,
    options,
    directories: {
      required: [
        '.claude/prds',
        '.claude/epics',
        '.claude/rules',
        '.claude/agents',
        '.claude/scripts/pm'
      ],
      created: []
    },
    dependencies: {
      gh: false,
      ghAuth: false,
      ghExtensions: []
    },
    git: {
      isRepo: false,
      hasRemote: false,
      remoteUrl: null,
      warnings: []
    },
    claude: {
      exists: false,
      created: false
    },
    summary: {}
  };

  // Create directory structure
  if (!dryRun) {
    for (const dir of result.directories.required) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        result.directories.created.push(dir);
      }
    }
  } else {
    // In dry run, check which directories would be created
    for (const dir of result.directories.required) {
      if (!fs.existsSync(dir)) {
        result.directories.created.push(dir);
      }
    }
  }

  // Check git repository status
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    result.git.isRepo = true;

    try {
      const remoteOutput = execSync('git remote -v', { encoding: 'utf8', stdio: 'pipe' });
      if (remoteOutput.includes('origin')) {
        result.git.hasRemote = true;

        try {
          result.git.remoteUrl = execSync('git remote get-url origin', {
            encoding: 'utf8',
            stdio: 'pipe'
          }).trim();

          // Check if remote is the AutoPM template repository
          if (result.git.remoteUrl.includes('rlagowski/autopm')) {
            result.git.warnings.push({
              type: 'template_repo',
              message: 'Remote origin points to the AutoPM template repository. Consider updating to your own repository.'
            });
          }
        } catch (error) {
          // Could not get remote URL
        }
      }
    } catch (error) {
      // No remotes configured
    }
  } catch (error) {
    result.git.isRepo = false;
  }

  // Check dependencies
  if (!skipDependencyCheck) {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      result.dependencies.gh = true;

      try {
        execSync('gh auth status', { stdio: 'ignore' });
        result.dependencies.ghAuth = true;
      } catch (error) {
        result.dependencies.ghAuth = false;
      }

      try {
        const extensionsOutput = execSync('gh extension list', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        result.dependencies.ghExtensions = extensionsOutput
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.split('\t')[0]);
      } catch (error) {
        // No extensions or error listing them
      }
    } catch (error) {
      result.dependencies.gh = false;
    }
  }

  // Handle CLAUDE.md
  result.claude.exists = fs.existsSync('CLAUDE.md');

  if (!result.claude.exists && !dryRun) {
    const claudeContent = `# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## Project-Specific Instructions

Add your project-specific instructions here.

## Testing

Always run tests before committing:
- \`npm test\` or equivalent for your stack

## Code Style

Follow existing patterns in the codebase.
`;

    fs.writeFileSync('CLAUDE.md', claudeContent);
    result.claude.created = true;
  } else if (!result.claude.exists && dryRun) {
    result.claude.created = true; // Would be created
  }

  // Generate summary
  result.summary = {
    directoriesCreated: result.directories.created.length,
    gitConfigured: result.git.isRepo && result.git.hasRemote,
    dependenciesReady: result.dependencies.gh && result.dependencies.ghAuth,
    claudeReady: result.claude.exists || result.claude.created,
    hasWarnings: result.git.warnings.length > 0
  };

  return result;
}

function displayBanner() {
  return `
 █████╗ ██╗   ██╗████████╗ ██████╗ ██████╗ ███╗   ███╗
██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗██╔══██╗████╗ ████║
███████║██║   ██║   ██║   ██║   ██║██████╔╝██╔████╔██║
██╔══██║██║   ██║   ██║   ██║   ██║██╔═══╝ ██║╚██╔╝██║
██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║     ██║ ╚═╝ ██║
╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝     ╚═╝     ╚═╝

┌─────────────────────────────────┐
│ Claude Code Project Management  │
│ by https://x.com/aroussi        │
└─────────────────────────────────┘
https://github.com/rlagowski/autopm
`;
}

function formatInitOutput(data) {
  let output = 'Initializing...\n\n\n';
  output += displayBanner();
  output += '\n\n';

  output += '🚀 Initializing Claude Code AutoPM System\n';
  output += '======================================\n\n';

  // Dependencies check
  output += '🔍 Checking dependencies...\n';
  if (data.dependencies.gh) {
    output += '  ✅ GitHub CLI (gh) installed\n';
  } else {
    output += '  ❌ GitHub CLI (gh) not found\n';
  }

  output += '\n🔐 Checking GitHub authentication...\n';
  if (data.dependencies.ghAuth) {
    output += '  ✅ GitHub authenticated\n';
  } else {
    output += '  ⚠️ GitHub not authenticated\n';
  }

  output += '\n📦 Checking gh extensions...\n';
  const hasSubIssue = data.dependencies.ghExtensions.some(ext =>
    ext.includes('gh-sub-issue') || ext.includes('yahsan2/gh-sub-issue'));

  if (hasSubIssue) {
    output += '  ✅ gh-sub-issue extension installed\n';
  } else {
    output += '  📥 gh-sub-issue extension needed\n';
  }

  // Directory structure
  output += '\n📁 Creating directory structure...\n';
  if (data.directories.created.length > 0) {
    output += '  ✅ Directories created\n';
  } else {
    output += '  ✅ Directory structure exists\n';
  }

  // Git configuration
  output += '\n🔗 Checking Git configuration...\n';
  if (data.git.isRepo) {
    output += '  ✅ Git repository detected\n';

    if (data.git.hasRemote) {
      output += `  ✅ Remote configured: ${data.git.remoteUrl}\n`;

      // Show warnings
      for (const warning of data.git.warnings) {
        if (warning.type === 'template_repo') {
          output += '\n  ⚠️ WARNING: Your remote origin points to the AutoPM template repository!\n';
          output += '  This means any issues you create will go to the template repo, not your project.\n\n';
          output += '  To fix this:\n';
          output += '  1. Fork the repository or create your own on GitHub\n';
          output += '  2. Update your remote:\n';
          output += '     git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\n\n';
        }
      }
    } else {
      output += '  ⚠️ No remote configured\n';
      output += '  Add with: git remote add origin <url>\n';
    }
  } else {
    output += '  ⚠️ Not a git repository\n';
    output += '  Initialize with: git init\n';
  }

  // CLAUDE.md
  if (data.claude.created) {
    output += '\n📄 Creating CLAUDE.md...\n';
    output += '  ✅ CLAUDE.md created\n';
  } else if (data.claude.exists) {
    output += '\n📄 CLAUDE.md exists\n';
  }

  // Summary
  output += '\n✅ Initialization Complete!\n';
  output += '==========================\n\n';

  output += '📊 System Status:\n';
  if (data.dependencies.gh) {
    try {
      const ghVersion = execSync('gh --version', { encoding: 'utf8' }).split('\n')[0];
      output += `${ghVersion}\n`;
    } catch (error) {
      output += 'GitHub CLI: Available\n';
    }
  }

  output += `  Extensions: ${data.dependencies.ghExtensions.length} installed\n`;

  if (data.dependencies.ghAuth) {
    output += '  Auth: Authenticated\n';
  } else {
    output += '  Auth: Not authenticated\n';
  }

  output += '\n🎯 Next Steps:\n';
  output += '  1. Create your first PRD: /pm:prd-new <feature-name>\n';
  output += '  2. View help: /pm:help\n';
  output += '  3. Check status: /pm:status\n\n';
  output += '📚 Documentation: README.md\n';

  return output;
}

// CommonJS export for testing
module.exports = {
  initializeSystem,
  displayBanner,
  formatInitOutput
};

// CLI execution
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');

  module.exports.initializeSystem({ dryRun })
    .then(result => {
      console.log(module.exports.formatInitOutput(result));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    });
}