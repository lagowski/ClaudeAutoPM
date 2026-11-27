#!/usr/bin/env node
/**
 * Context Update - Update existing context file
 * PM command for context management
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ContextUpdater {
  constructor() {
    this.contextsDir = path.join('.claude', 'contexts');
  }

  showUsage() {
    console.log('Usage: pm context-update <name> [options]');
    console.log('\nContent Sources (one required):');
    console.log('  --file <path>      Read content from file');
    console.log('  --stdin            Read content from stdin');
    console.log('  --content <text>   Provide content inline');
    console.log('\nUpdate Modes:');
    console.log('  --replace          Replace entire content (default: append)');
    console.log('  --merge            Merge by sections (smart merge)');
    console.log('\nOther Options:');
    console.log('  --verbose          Show detailed output');
    console.log('\nExamples:');
    console.log('  pm context-update feature-auth --file notes.md');
    console.log('  pm context-update bug-fix --stdin < error-log.txt');
    console.log('  pm context-update project --content "New requirement added"');
    console.log('  pm context-update api-docs --file new-api.md --replace');
    console.log('  pm context-update specs --file update.md --merge');
  }

  async listAvailableContexts() {
    try {
      const files = await fs.readdir(this.contextsDir);
      const contexts = files
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));

      if (contexts.length > 0) {
        console.log('\nAvailable contexts:');
        contexts.forEach(ctx => {
          console.log(`  • ${ctx}`);
        });
      }
      return contexts;
    } catch {
      // Directory doesn't exist or other error
      return [];
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async readFromStdin() {
    return new Promise((resolve) => {
      let content = '';
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      rl.on('line', (line) => {
        content += line + '\n';
      });

      rl.on('close', () => {
        resolve(content.trim());
      });
    });
  }

  appendContent(existing, newContent) {
    return `${existing}\n\n${newContent}`;
  }

  replaceContent(existing, newContent) {
    // Replace entirely with new content (existing is intentionally unused)
    return newContent;
  }

  mergeContent(existing, newContent) {
    // Simple merge by sections
    const parseSections = (content) => {
      const sections = {};
      const lines = content.split('\n');
      let currentSection = '_header';
      let sectionContent = [];

      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (sectionContent.length > 0) {
            sections[currentSection] = sectionContent.join('\n').trim();
          }
          currentSection = line;
          sectionContent = [];
        } else {
          sectionContent.push(line);
        }
      }

      if (sectionContent.length > 0) {
        sections[currentSection] = sectionContent.join('\n').trim();
      }

      return sections;
    };

    const existingSections = parseSections(existing);
    const newSections = parseSections(newContent);

    const merged = { ...existingSections };

    for (const [section, content] of Object.entries(newSections)) {
      if (merged[section] && section !== '_header') {
        if (content !== merged[section] && merged[section].length > 0) {
          console.warn(`⚠️  Merge conflict detected in section: ${section}`);
        }
      }
      merged[section] = content;
    }

    // Reconstruct content
    let result = [];

    if (merged._header) {
      result.push(merged._header);
      delete merged._header;
    }

    for (const [section, content] of Object.entries(merged)) {
      if (section.startsWith('## ')) {
        result.push('');
        result.push(section);
        result.push(content);
      }
    }

    return result.join('\n');
  }

  async createBackup(contextPath) {
    const content = await fs.readFile(contextPath, 'utf8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = contextPath.replace('.md', `-backup-${timestamp}.md`);
    await fs.writeFile(backupPath, content);
    return backupPath;
  }

  async updateContext(name, options = {}) {
    console.log(`🔄 Updating Context: ${name}`);
    console.log(`${'═'.repeat(50)}\n`);

    const contextPath = path.join(this.contextsDir, `${name}.md`);

    // Check if context exists
    let contextExists = false;
    try {
      await fs.access(contextPath);
      contextExists = true;
    } catch {
      contextExists = false;
    }

    if (!contextExists) {
      console.error(`❌ Error: Context "${name}" not found at ${contextPath}`);
      await this.listAvailableContexts();
      process.exit(1);
    }

    // Display update configuration
    console.log('📋 Update Configuration:');
    console.log(`  • Context: ${name}`);

    let sourceDesc = 'Unknown';
    if (options.file) {
      sourceDesc = `File (${path.basename(options.file)})`;
    } else if (options.stdin) {
      sourceDesc = 'Standard Input';
    } else if (options.content) {
      sourceDesc = `Inline (${options.content.substring(0, 30)}...)`;
    }
    console.log(`  • Source: ${sourceDesc}`);

    let modeDesc = 'Append';
    if (options.replace) modeDesc = 'Replace';
    else if (options.merge) modeDesc = 'Smart Merge';
    console.log(`  • Mode: ${modeDesc}`);
    console.log();

    // Get size information if from file
    if (options.file) {
      try {
        const stats = await fs.stat(path.resolve(options.file));
        console.log(`📁 Input file size: ${this.formatFileSize(stats.size)}`);
      } catch {
        // Ignore stat errors
      }
    }

    try {
      // Read existing content
      const existingContent = await fs.readFile(contextPath, 'utf8');

      // Get new content from appropriate source
      let newContent = '';

      if (options.stdin) {
        console.log('📥 Reading from stdin (press Ctrl+D when done)...');
        newContent = await this.readFromStdin();
      } else if (options.file) {
        const filePath = path.resolve(options.file);
        newContent = await fs.readFile(filePath, 'utf8');
      } else if (options.content) {
        newContent = options.content;
      }

      if (!newContent) {
        console.error('❌ Error: No content provided');
        process.exit(1);
      }

      // Create backup
      const backupPath = await this.createBackup(contextPath);
      console.log(`💾 Backup created: ${path.basename(backupPath)}`);

      // Apply update based on mode
      let updatedContent;
      let updateMode = 'append';

      if (options.replace) {
        updatedContent = this.replaceContent(existingContent, newContent);
        updateMode = 'replace';
      } else if (options.merge) {
        updatedContent = this.mergeContent(existingContent, newContent);
        updateMode = 'merge';
      } else {
        updatedContent = this.appendContent(existingContent, newContent);
        updateMode = 'append';
      }

      // Write updated content
      await fs.writeFile(contextPath, updatedContent);

      // Show success
      console.log(`\n✅ Context updated successfully: ${name}`);
      console.log(`  • Mode: ${updateMode}`);
      console.log(`  • Content added: ${newContent.length} characters`);
      console.log(`  • Total size: ${updatedContent.length} characters`);

      if (options.verbose) {
        console.log(`\n📊 Details:`);
        console.log(`  • Original size: ${existingContent.length} characters`);
        console.log(`  • New content size: ${newContent.length} characters`);
        console.log(`  • Final size: ${updatedContent.length} characters`);
      }

      // Show next steps
      console.log('\n💡 Next Steps:');
      console.log(`  • Prime context: pm context-prime ${name}`);
      console.log(`  • View context: cat ${path.join(this.contextsDir, name + '.md')}`);
      console.log(`  • Update again: pm context-update ${name} --file <file>`);
      console.log(`  • Create new: pm context-create <new-name>`);

    } catch (error) {
      // Error is already handled by the library
      process.exit(1);
    }
  }

  async run(args) {
    const name = args[0];

    if (!name || name === '--help' || name === '-h') {
      this.showUsage();

      if (name === '--help' || name === '-h') {
        await this.listAvailableContexts();
        process.exit(0);
      }

      console.error('\n❌ Error: Context name is required');
      await this.listAvailableContexts();
      process.exit(1);
    }

    // Parse options
    const options = {};
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if ((arg === '--file' || arg === '-f') && args[i + 1]) {
        options.file = args[++i];
      } else if (arg === '--stdin') {
        options.stdin = true;
      } else if ((arg === '--content' || arg === '-c') && args[i + 1]) {
        options.content = args[++i];
      } else if (arg === '--replace' || arg === '-r') {
        options.replace = true;
      } else if (arg === '--merge' || arg === '-m') {
        options.merge = true;
      } else if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg.startsWith('--')) {
        console.error(`❌ Unknown option: ${arg}`);
        this.showUsage();
        process.exit(1);
      }
    }

    // Validate options
    if (!options.file && !options.stdin && !options.content) {
      console.error('❌ Error: Content source required (--file, --stdin, or --content)');
      this.showUsage();
      process.exit(1);
    }

    if (options.replace && options.merge) {
      console.error('❌ Error: Cannot use both --replace and --merge');
      this.showUsage();
      process.exit(1);
    }

    await this.updateContext(name, options);
  }
}

// Main execution
if (require.main === module) {
  const updater = new ContextUpdater();
  updater.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ContextUpdater;