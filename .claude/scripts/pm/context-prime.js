#!/usr/bin/env node
/**
 * Context Prime - Prime context for current work
 * PM command for context management
 */

const fs = require('fs').promises;
const path = require('path');

class ContextPrimer {
  constructor() {
    this.contextsDir = path.join('.claude', 'contexts');
    this.sessionFile = path.join('.claude', 'contexts', '.current-session.json');
  }

  showUsage() {
    console.log('Usage: pm context-prime [name] [options]');
    console.log('\nOptions:');
    console.log('  --list, -l         List available contexts');
    console.log('  --chunked          Use chunked loading for large contexts');
    console.log('  --verbose          Show detailed output');
    console.log('  --dry-run          Preview without actually priming');
    console.log('\nExamples:');
    console.log('  pm context-prime feature-auth');
    console.log('  pm context-prime --list');
    console.log('  pm context-prime project-overview --verbose');
    console.log('  pm context-prime large-context --chunked');
    console.log('  pm context-prime test-context --dry-run');
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async getCurrentSession() {
    try {
      const sessionData = await fs.readFile(this.sessionFile, 'utf8');
      const session = JSON.parse(sessionData);
      if (session && session.context) {
        return session;
      }
    } catch {
      // No current session or file doesn't exist
    }
    return null;
  }

  async saveSession(contextName, contextSize) {
    const session = {
      context: contextName,
      timestamp: new Date().toISOString(),
      size: contextSize
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.sessionFile), { recursive: true });
    await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2));
    return session;
  }

  async showContextDetails(name) {
    try {
      const contextPath = path.join(this.contextsDir, `${name}.md`);
      const content = await fs.readFile(contextPath, 'utf8');
      const size = Buffer.byteLength(content, 'utf8');

      console.log('\n📊 Context Details:');
      console.log(`  • Name: ${name}`);
      console.log(`  • Size: ${this.formatSize(size)}`);

      // Extract sections from content
      const sections = content.split('\n## ').length - 1;
      if (sections > 0) {
        console.log(`  • Sections: ${sections}`);
      }

      // Check for specific markers
      if (content.includes('# Context:')) {
        console.log('  • Structure: ✅ Standard format');
      } else {
        console.log('  • Structure: ⚠️  Non-standard format');
      }

      // Estimate tokens (rough approximation)
      const estimatedTokens = Math.ceil(size / 4);
      console.log(`  • Estimated tokens: ~${estimatedTokens.toLocaleString()}`);

      return { size, content };
    } catch (error) {
      console.error(`❌ Error reading context: ${error.message}`);
      return null;
    }
  }

  async listAvailableContexts() {
    try {
      const files = await fs.readdir(this.contextsDir);
      return files
        .filter(file => file.endsWith('.md') && !file.includes('backup'))
        .map(file => file.replace('.md', ''));
    } catch {
      return [];
    }
  }

  async listContextsWithDetails() {
    const contexts = await this.listAvailableContexts();

    if (contexts.length === 0) {
      console.log('\n📭 No contexts found.');
      console.log('\n💡 Create one with: pm context-create <name>');
      return;
    }

    console.log('\n📚 Available Contexts:');
    console.log(`${'═'.repeat(50)}`);

    // Get current session if any
    const currentSession = await this.getCurrentSession();
    const currentContext = currentSession ? currentSession.context : null;

    for (const contextName of contexts) {
      try {
        const contextPath = path.join(this.contextsDir, `${contextName}.md`);
        const content = await fs.readFile(contextPath, 'utf8');
        const size = Buffer.byteLength(content, 'utf8');
        const isCurrent = contextName === currentContext;

        console.log(`\n  ${isCurrent ? '▶ ' : '• '}${contextName}${isCurrent ? ' (current)' : ''}`);
        console.log(`    Size: ${this.formatSize(size)}`);

        // Show first line of description if available
        const lines = content.split('\n');
        const descLine = lines.find(line => line.trim() && !line.startsWith('#'));
        if (descLine) {
          const preview = descLine.substring(0, 50);
          console.log(`    Preview: ${preview}${descLine.length > 50 ? '...' : ''}`);
        }
      } catch {
        console.log(`\n  • ${contextName}`);
        console.log('    Status: ⚠️  Unable to read');
      }
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Total: ${contexts.length} context${contexts.length !== 1 ? 's' : ''}`);

    if (currentContext) {
      console.log(`\nCurrently primed: ${currentContext}`);
    }
  }

  async primeContext(name, options = {}) {
    // Handle list option specially
    if (options.list && !name) {
      await this.listContextsWithDetails();
      return;
    }

    if (!name) {
      console.error('❌ Error: Context name is required');
      this.showUsage();
      await this.listContextsWithDetails();
      process.exit(1);
    }

    console.log(`🎯 Priming Context: ${name}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Show current session if exists
    const currentSession = await this.getCurrentSession();
    if (currentSession && currentSession.context !== name) {
      console.log(`📌 Current context: ${currentSession.context}`);
      console.log(`   Switching to: ${name}\n`);
    }

    // Check if context exists
    const contextPath = path.join(this.contextsDir, `${name}.md`);
    let contextExists = false;
    try {
      await fs.access(contextPath);
      contextExists = true;
    } catch {
      contextExists = false;
    }

    if (!contextExists) {
      console.error(`❌ Error: Context "${name}" not found`);
      const contexts = await this.listAvailableContexts();
      if (contexts.length > 0) {
        console.log('\nAvailable contexts:');
        contexts.forEach(ctx => {
          console.log(`  • ${ctx}`);
        });
      }
      process.exit(1);
    }

    // Display context details
    const details = await this.showContextDetails(name);
    if (!details) {
      console.error(`❌ Error: Unable to read context "${name}"`);
      process.exit(1);
    }

    // Check if large and suggest chunked loading
    if (details.size > 100 * 1024 && !options.chunked) {
      console.log('\n💡 Tip: This is a large context. Consider using --chunked for better loading.');
    }

    console.log();

    try {
      // Load context content
      const contextPath = path.join(this.contextsDir, `${name}.md`);
      const content = await fs.readFile(contextPath, 'utf8');

      if (!options.dryRun) {
        // Save session
        await this.saveSession(name, details.size);

        // Update history (append to history file)
        const historyFile = path.join(this.contextsDir, '.history.json');
        let history = [];
        try {
          const historyData = await fs.readFile(historyFile, 'utf8');
          history = JSON.parse(historyData);
        } catch {
          // History file doesn't exist yet
        }

        history.unshift({
          context: name,
          timestamp: new Date().toISOString(),
          size: details.size
        });

        // Keep only last 50 entries
        if (history.length > 50) {
          history = history.slice(0, 50);
        }

        await fs.writeFile(historyFile, JSON.stringify(history, null, 2));

        console.log(`✅ Context loaded successfully: ${name}`);
        console.log(`Size: ${this.formatSize(details.size)}`);

        if (options.verbose) {
          console.log(`Session created at: ${new Date().toISOString()}`);
        }
      } else {
        console.log(`Dry run: Would load context "${name}"`);
        console.log(`Size: ${this.formatSize(details.size)}`);
      }

      // Validate structure and warn if needed
      if (!content.includes('# Context:')) {
        console.warn('⚠️  Warning: Context may not have standard structure');
      }

      // Show success banner
      if (!options.dryRun) {
        console.log(`\n${'═'.repeat(50)}`);
        console.log('✨ Context successfully primed!');
        console.log(`${'═'.repeat(50)}`);

        console.log('\n📝 The AI now has access to:');
        const contentPreview = details.content.split('\n').slice(0, 5);
        contentPreview.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
          }
        });

        console.log('\n💡 Next Steps:');
        console.log('  • Start working with the primed context');
        console.log(`  • Update context: pm context-update ${name} --file <file>`);
        console.log('  • Switch context: pm context-prime <other-context>');
        console.log('  • List all: pm context-prime --list');
      }

    } catch (error) {
      // Error is already handled by the library
      process.exit(1);
    }
  }

  async run(args) {
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
      this.showUsage();
      await this.listContextsWithDetails();
      process.exit(0);
    }

    // Parse options
    const options = {};
    let name = null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--list' || arg === '-l') {
        options.list = true;
      } else if (arg === '--chunked') {
        options.chunked = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (!arg.startsWith('-') && !name) {
        name = arg;
      } else if (arg.startsWith('--')) {
        console.error(`❌ Unknown option: ${arg}`);
        this.showUsage();
        process.exit(1);
      }
    }

    await this.primeContext(name, options);
  }
}

// Main execution
if (require.main === module) {
  const primer = new ContextPrimer();
  primer.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ContextPrimer;