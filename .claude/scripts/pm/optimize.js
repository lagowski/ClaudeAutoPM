#!/usr/bin/env node
/**
 * Optimize - Analyze and optimize project for better performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectOptimizer {
  constructor() {
    this.claudeDir = '.claude';
    this.stats = {
      contextFiles: 0,
      agentFiles: 0,
      issueFiles: 0,
      epicFiles: 0,
      totalSize: 0,
      duplicates: [],
      largeFiles: [],
      oldFiles: [],
      suggestions: []
    };
  }

  execCommand(command, options = {}) {
    try {
      return execSync(command, { encoding: 'utf8', ...options }).trim();
    } catch (error) {
      if (!options.ignoreError) {
        throw error;
      }
      return null;
    }
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  analyzeDirectory(dir, type) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    let count = 0;
    let totalSize = 0;

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        count++;
        totalSize += stats.size;

        // Check for large files (>100KB)
        if (stats.size > 100 * 1024) {
          this.stats.largeFiles.push({
            path: filePath,
            size: stats.size
          });
        }

        // Check for old files (>30 days)
        const ageInDays = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
        if (ageInDays > 30) {
          this.stats.oldFiles.push({
            path: filePath,
            age: Math.floor(ageInDays)
          });
        }
      }
    });

    return { count, totalSize };
  }

  findDuplicates() {
    const fileHashes = new Map();
    const duplicates = [];

    const processDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory() && !filePath.includes('node_modules')) {
          processDir(filePath);
        } else if (stats.isFile()) {
          // Simple duplicate detection based on size and name
          const key = `${file}-${stats.size}`;
          if (fileHashes.has(key)) {
            duplicates.push({
              original: fileHashes.get(key),
              duplicate: filePath,
              size: stats.size
            });
          } else {
            fileHashes.set(key, filePath);
          }
        }
      });
    };

    processDir(this.claudeDir);
    return duplicates;
  }

  analyzeContextOptimization() {
    const suggestions = [];
    const contextDir = path.join(this.claudeDir, 'contexts');

    if (fs.existsSync(contextDir)) {
      const files = fs.readdirSync(contextDir);

      // Check for redundant contexts
      const contextTypes = new Map();
      files.forEach(file => {
        const match = file.match(/^(.+?)-/);
        if (match) {
          const type = match[1];
          if (!contextTypes.has(type)) {
            contextTypes.set(type, []);
          }
          contextTypes.get(type).push(file);
        }
      });

      contextTypes.forEach((files, type) => {
        if (files.length > 3) {
          suggestions.push({
            type: 'consolidation',
            message: `Consider consolidating ${files.length} ${type} contexts`,
            impact: 'high',
            files: files
          });
        }
      });
    }

    return suggestions;
  }

  analyzeAgentUsage() {
    const suggestions = [];
    const agentsDir = path.join(this.claudeDir, 'agents');

    if (fs.existsSync(agentsDir)) {
      // Check for unused agents (no recent modifications)
      const analyzeAgentDir = (dir) => {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile() && file.endsWith('.md')) {
            const ageInDays = (Date.now() - stats.atime) / (1000 * 60 * 60 * 24);
            if (ageInDays > 60) {
              suggestions.push({
                type: 'unused',
                message: `Agent not used in ${Math.floor(ageInDays)} days: ${file}`,
                impact: 'low',
                path: filePath
              });
            }
          } else if (stats.isDirectory()) {
            analyzeAgentDir(filePath);
          }
        });
      };

      analyzeAgentDir(agentsDir);
    }

    return suggestions;
  }

  analyzeGitOptimization() {
    const suggestions = [];

    // Check git repo size
    try {
      const repoSize = this.execCommand('du -sh .git', { ignoreError: true });
      if (repoSize) {
        const sizeMatch = repoSize.match(/(\d+)([MG])/);
        if (sizeMatch) {
          const size = parseInt(sizeMatch[1]);
          const unit = sizeMatch[2];

          if ((unit === 'G') || (unit === 'M' && size > 100)) {
            suggestions.push({
              type: 'git',
              message: `Large git repository (${repoSize}). Consider running 'git gc --aggressive'`,
              impact: 'high',
              command: 'git gc --aggressive'
            });
          }
        }
      }
    } catch {}

    // Check for large files in git history
    try {
      const largeFiles = this.execCommand(
        'git rev-list --all --objects | git cat-file --batch-check="%(objecttype) %(objectname) %(objectsize) %(rest)" | awk \'$1=="blob" && $3>1000000 {print $4, $3}\' | head -5',
        { ignoreError: true }
      );

      if (largeFiles) {
        suggestions.push({
          type: 'git',
          message: 'Large files found in git history',
          impact: 'medium',
          details: largeFiles
        });
      }
    } catch {}

    return suggestions;
  }

  async optimize(options = {}) {
    console.log(`\n🔧 Project Optimization Analysis`);
    console.log(`${'═'.repeat(50)}\n`);

    // 1. Analyze directories
    console.log('📊 Analyzing project structure...');

    const contexts = this.analyzeDirectory(path.join(this.claudeDir, 'contexts'), 'context');
    const issues = this.analyzeDirectory(path.join(this.claudeDir, 'issues'), 'issue');
    const epics = this.analyzeDirectory(path.join(this.claudeDir, 'epics'), 'epic');
    const prds = this.analyzeDirectory(path.join(this.claudeDir, 'prds'), 'prd');

    // 2. Find duplicates
    if (!options.skipDuplicates) {
      console.log('🔍 Checking for duplicates...');
      this.stats.duplicates = this.findDuplicates();
    }

    // 3. Analyze optimizations
    console.log('💡 Generating optimization suggestions...');
    const contextSuggestions = this.analyzeContextOptimization();
    const agentSuggestions = this.analyzeAgentUsage();
    const gitSuggestions = this.analyzeGitOptimization();

    this.stats.suggestions = [
      ...contextSuggestions,
      ...agentSuggestions,
      ...gitSuggestions
    ];

    // 4. Display results
    console.log(`\n${'─'.repeat(50)}`);
    console.log('📈 Analysis Results:');
    console.log(`${'─'.repeat(50)}\n`);

    // File counts
    console.log('📁 File Statistics:');
    if (contexts) console.log(`  • Contexts: ${contexts.count} files (${this.formatBytes(contexts.totalSize)})`);
    if (issues) console.log(`  • Issues: ${issues.count} files (${this.formatBytes(issues.totalSize)})`);
    if (epics) console.log(`  • Epics: ${epics.count} files (${this.formatBytes(epics.totalSize)})`);
    if (prds) console.log(`  • PRDs: ${prds.count} files (${this.formatBytes(prds.totalSize)})`);

    // Large files
    if (this.stats.largeFiles.length > 0) {
      console.log('\n📦 Large Files (>100KB):');
      this.stats.largeFiles.slice(0, 5).forEach(file => {
        console.log(`  • ${path.relative('.', file.path)}: ${this.formatBytes(file.size)}`);
      });
    }

    // Old files
    if (this.stats.oldFiles.length > 0) {
      console.log('\n📅 Old Files (>30 days):');
      this.stats.oldFiles.slice(0, 5).forEach(file => {
        console.log(`  • ${path.relative('.', file.path)}: ${file.age} days old`);
      });
      if (this.stats.oldFiles.length > 5) {
        console.log(`  ... and ${this.stats.oldFiles.length - 5} more`);
      }
    }

    // Duplicates
    if (this.stats.duplicates.length > 0) {
      console.log('\n🔁 Duplicate Files:');
      this.stats.duplicates.slice(0, 5).forEach(dup => {
        console.log(`  • ${path.basename(dup.duplicate)}`);
        console.log(`    Original: ${path.relative('.', dup.original)}`);
        console.log(`    Duplicate: ${path.relative('.', dup.duplicate)}`);
      });
    }

    // Optimization suggestions
    if (this.stats.suggestions.length > 0) {
      console.log('\n💡 Optimization Suggestions:');
      console.log(`${'─'.repeat(50)}`);

      // Group by impact
      const highImpact = this.stats.suggestions.filter(s => s.impact === 'high');
      const mediumImpact = this.stats.suggestions.filter(s => s.impact === 'medium');
      const lowImpact = this.stats.suggestions.filter(s => s.impact === 'low');

      if (highImpact.length > 0) {
        console.log('\n🔴 High Impact:');
        highImpact.forEach(s => {
          console.log(`  • ${s.message}`);
          if (s.command) console.log(`    Run: ${s.command}`);
        });
      }

      if (mediumImpact.length > 0) {
        console.log('\n🟡 Medium Impact:');
        mediumImpact.forEach(s => {
          console.log(`  • ${s.message}`);
        });
      }

      if (lowImpact.length > 0) {
        console.log('\n🟢 Low Impact:');
        lowImpact.slice(0, 3).forEach(s => {
          console.log(`  • ${s.message}`);
        });
      }
    } else {
      console.log('\n✅ No optimization issues found!');
    }

    // Actions
    if (this.stats.oldFiles.length > 0 || this.stats.duplicates.length > 0) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log('🎯 Recommended Actions:');
      console.log('  1. Run: pm clean           # Archive old files');
      console.log('  2. Run: pm validate         # Check system integrity');
      console.log('  3. Run: git gc --aggressive # Optimize git repository');
    }

    // Apply optimizations if requested
    if (options.apply) {
      console.log('\n🔧 Applying optimizations...');
      await this.applyOptimizations();
    }

    return true;
  }

  async applyOptimizations() {
    let applied = 0;

    // Clean old files
    if (this.stats.oldFiles.length > 10) {
      console.log('  • Archiving old files...');
      this.execCommand('pm clean --days=30', { ignoreError: true });
      applied++;
    }

    // Run git gc if needed
    const gitOptimization = this.stats.suggestions.find(s => s.command === 'git gc --aggressive');
    if (gitOptimization) {
      console.log('  • Optimizing git repository...');
      this.execCommand('git gc', { ignoreError: true });
      applied++;
    }

    console.log(`\n✅ Applied ${applied} optimization${applied !== 1 ? 's' : ''}`);
  }

  async run(args) {
    const options = {};

    // Parse arguments
    args.forEach(arg => {
      if (arg === '--apply' || arg === '-a') {
        options.apply = true;
      } else if (arg === '--skip-duplicates') {
        options.skipDuplicates = true;
      } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: pm optimize [options]');
        console.log('\nOptions:');
        console.log('  -a, --apply           Apply recommended optimizations');
        console.log('  --skip-duplicates     Skip duplicate file detection');
        console.log('\nExamples:');
        console.log('  pm optimize           # Analyze project');
        console.log('  pm optimize --apply   # Analyze and apply optimizations');
        process.exit(0);
      }
    });

    await this.optimize(options);
  }
}

// Main execution
if (require.main === module) {
  const optimizer = new ProjectOptimizer();
  optimizer.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ProjectOptimizer;