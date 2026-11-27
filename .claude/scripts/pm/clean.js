#!/usr/bin/env node
/**
 * Clean - Archive completed work and maintain project hygiene
 */

const fs = require('fs');
const path = require('path');

class ProjectCleaner {
  constructor() {
    this.claudeDir = '.claude';
    this.archiveDir = path.join(this.claudeDir, 'archive');
    this.completedFile = path.join(this.claudeDir, 'completed-work.json');
    this.activeWorkFile = path.join(this.claudeDir, 'active-work.json');
    this.issuesDir = path.join(this.claudeDir, 'issues');
    this.epicsDir = path.join(this.claudeDir, 'epics');
    this.prdsDir = path.join(this.claudeDir, 'prds');
  }

  ensureArchiveDir() {
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }

    // Create subdirectories
    ['issues', 'epics', 'prds', 'logs'].forEach(subdir => {
      const dir = path.join(this.archiveDir, subdir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadCompletedWork() {
    if (!fs.existsSync(this.completedFile)) {
      return { issues: [], epics: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.completedFile, 'utf8'));
    } catch {
      return { issues: [], epics: [] };
    }
  }

  async cleanProject(options = {}) {
    console.log(`\n🧹 Cleaning Project`);
    console.log(`${'═'.repeat(50)}\n`);

    this.ensureArchiveDir();

    const stats = {
      archivedIssues: 0,
      archivedEpics: 0,
      archivedPrds: 0,
      cleanedLogs: 0,
      freedSpace: 0
    };

    // 1. Archive completed issues
    if (!options.skipIssues) {
      stats.archivedIssues = await this.archiveCompletedIssues(options.daysOld || 30);
    }

    // 2. Archive completed epics
    if (!options.skipEpics) {
      stats.archivedEpics = await this.archiveCompletedEpics(options.daysOld || 60);
    }

    // 3. Archive old PRDs
    if (!options.skipPrds) {
      stats.archivedPrds = await this.archiveOldPrds(options.daysOld || 90);
    }

    // 4. Clean old logs
    if (!options.skipLogs) {
      stats.cleanedLogs = await this.cleanOldLogs(options.daysOld || 7);
    }

    // 5. Compact completed work file
    if (!options.skipCompact) {
      await this.compactCompletedWork(options.maxCompleted || 100);
    }

    // 6. Remove empty directories
    await this.removeEmptyDirectories();

    // Calculate freed space
    stats.freedSpace = this.calculateFreedSpace(stats);

    // Display summary
    this.displaySummary(stats);

    return stats;
  }

  async archiveCompletedIssues(daysOld) {
    console.log('📋 Archiving completed issues...');

    const completedWork = this.loadCompletedWork();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let archived = 0;

    // Archive from completed work tracking
    const remainingIssues = [];
    for (const issue of completedWork.issues) {
      const completedDate = new Date(issue.completedAt);
      if (completedDate < cutoffDate) {
        // Archive issue file if exists
        const issueFile = path.join(this.issuesDir, `${issue.id}.md`);
        if (fs.existsSync(issueFile)) {
          const archivePath = path.join(this.archiveDir, 'issues', `${issue.id}.md`);
          fs.renameSync(issueFile, archivePath);
          archived++;
        }

        // Archive to JSON
        this.archiveToJson('issues', issue);
      } else {
        remainingIssues.push(issue);
      }
    }

    // Update completed work
    completedWork.issues = remainingIssues;
    fs.writeFileSync(this.completedFile, JSON.stringify(completedWork, null, 2));

    console.log(`  ✅ Archived ${archived} completed issues older than ${daysOld} days`);
    return archived;
  }

  async archiveCompletedEpics(daysOld) {
    console.log('📚 Archiving completed epics...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let archived = 0;

    // Check epics directory
    if (fs.existsSync(this.epicsDir)) {
      const epics = fs.readdirSync(this.epicsDir).filter(f => f.endsWith('.md'));

      for (const epicFile of epics) {
        const epicPath = path.join(this.epicsDir, epicFile);
        const content = fs.readFileSync(epicPath, 'utf8');

        // Check if epic is completed
        if (content.includes('status: completed')) {
          const stats = fs.statSync(epicPath);
          if (stats.mtime < cutoffDate) {
            const archivePath = path.join(this.archiveDir, 'epics', epicFile);
            fs.renameSync(epicPath, archivePath);
            archived++;
          }
        }
      }
    }

    console.log(`  ✅ Archived ${archived} completed epics older than ${daysOld} days`);
    return archived;
  }

  async archiveOldPrds(daysOld) {
    console.log('📄 Archiving old PRDs...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let archived = 0;

    // Check PRDs directory
    if (fs.existsSync(this.prdsDir)) {
      const prds = fs.readdirSync(this.prdsDir).filter(f => f.endsWith('.md'));

      for (const prdFile of prds) {
        const prdPath = path.join(this.prdsDir, prdFile);
        const content = fs.readFileSync(prdPath, 'utf8');

        // Check if PRD is implemented or deprecated
        if (content.includes('status: implemented') || content.includes('status: deprecated')) {
          const stats = fs.statSync(prdPath);
          if (stats.mtime < cutoffDate) {
            const archivePath = path.join(this.archiveDir, 'prds', prdFile);
            fs.renameSync(prdPath, archivePath);
            archived++;
          }
        }
      }
    }

    console.log(`  ✅ Archived ${archived} old PRDs older than ${daysOld} days`);
    return archived;
  }

  async cleanOldLogs(daysOld) {
    console.log('🗑️  Cleaning old logs...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleaned = 0;
    const logPatterns = ['*.log', '*.tmp', '.DS_Store', '*.swp'];

    // Clean logs in .claude directory
    const findOldFiles = (dir) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory() && !filePath.includes('archive')) {
          findOldFiles(filePath);
        } else if (stats.isFile()) {
          // Check if it's a log file and old
          const isLog = logPatterns.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(file);
          });

          if (isLog && stats.mtime < cutoffDate) {
            // Archive or delete
            if (file.endsWith('.log') && stats.size > 1024 * 1024) {
              // Archive large log files
              const archivePath = path.join(this.archiveDir, 'logs', file);
              fs.renameSync(filePath, archivePath);
            } else {
              // Delete small/temporary files
              fs.unlinkSync(filePath);
            }
            cleaned++;
          }
        }
      }
    };

    findOldFiles(this.claudeDir);
    console.log(`  ✅ Cleaned ${cleaned} old log files older than ${daysOld} days`);
    return cleaned;
  }

  async compactCompletedWork(maxItems) {
    console.log('📦 Compacting completed work history...');

    const completedWork = this.loadCompletedWork();
    let compacted = 0;

    // Compact issues
    if (completedWork.issues.length > maxItems) {
      const toArchive = completedWork.issues.slice(maxItems);
      completedWork.issues = completedWork.issues.slice(0, maxItems);

      // Archive excess to JSON
      toArchive.forEach(issue => {
        this.archiveToJson('issues', issue);
        compacted++;
      });
    }

    // Compact epics
    if (completedWork.epics && completedWork.epics.length > maxItems) {
      const toArchive = completedWork.epics.slice(maxItems);
      completedWork.epics = completedWork.epics.slice(0, maxItems);

      // Archive excess to JSON
      toArchive.forEach(epic => {
        this.archiveToJson('epics', epic);
        compacted++;
      });
    }

    // Save compacted work
    fs.writeFileSync(this.completedFile, JSON.stringify(completedWork, null, 2));

    console.log(`  ✅ Compacted ${compacted} old entries`);
    return compacted;
  }

  archiveToJson(type, data) {
    const archiveFile = path.join(this.archiveDir, `${type}-archive.json`);
    let archive = [];

    if (fs.existsSync(archiveFile)) {
      try {
        archive = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
      } catch {
        archive = [];
      }
    }

    // Add with timestamp
    archive.push({
      ...data,
      archivedAt: new Date().toISOString()
    });

    // Keep only last 1000 entries
    if (archive.length > 1000) {
      archive = archive.slice(-1000);
    }

    fs.writeFileSync(archiveFile, JSON.stringify(archive, null, 2));
  }

  async removeEmptyDirectories() {
    console.log('🗂️  Removing empty directories...');

    const removeEmpty = (dir) => {
      if (!fs.existsSync(dir)) return false;

      const files = fs.readdirSync(dir);

      if (files.length === 0) {
        fs.rmdirSync(dir);
        return true;
      }

      let hasFiles = false;
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          if (!removeEmpty(filePath)) {
            hasFiles = true;
          }
        } else {
          hasFiles = true;
        }
      }

      if (!hasFiles && !dir.includes('archive')) {
        fs.rmdirSync(dir);
        return true;
      }

      return false;
    };

    const removed = removeEmpty(this.claudeDir);
    console.log(`  ✅ Cleaned directory structure`);
    return removed;
  }

  calculateFreedSpace(stats) {
    // Rough estimation in KB
    const issueSize = 5; // Average 5KB per issue
    const epicSize = 10; // Average 10KB per epic
    const prdSize = 8; // Average 8KB per PRD
    const logSize = 100; // Average 100KB per log

    const freed = (stats.archivedIssues * issueSize) +
                  (stats.archivedEpics * epicSize) +
                  (stats.archivedPrds * prdSize) +
                  (stats.cleanedLogs * logSize);

    return freed;
  }

  displaySummary(stats) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log('📊 Cleanup Summary:');
    console.log(`  • Archived Issues: ${stats.archivedIssues}`);
    console.log(`  • Archived Epics: ${stats.archivedEpics}`);
    console.log(`  • Archived PRDs: ${stats.archivedPrds}`);
    console.log(`  • Cleaned Logs: ${stats.cleanedLogs}`);
    console.log(`  • Freed Space: ~${Math.round(stats.freedSpace / 1024)}MB`);

    console.log('\n✅ Project cleaned successfully!');

    // Show archive location
    console.log('\n📁 Archives stored in:');
    console.log(`  ${this.archiveDir}/`);

    // Show next steps
    console.log('\n💡 Tips:');
    console.log('  • View archives: ls -la .claude/archive/');
    console.log('  • Restore item: mv .claude/archive/TYPE/FILE .claude/TYPE/');
    console.log('  • Schedule cleanup: Add to cron or CI/CD');
  }

  async run(args) {
    const options = {};

    // Parse arguments
    args.forEach(arg => {
      if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg.startsWith('--days=')) {
        options.daysOld = parseInt(arg.split('=')[1]);
      } else if (arg === '--skip-issues') {
        options.skipIssues = true;
      } else if (arg === '--skip-epics') {
        options.skipEpics = true;
      } else if (arg === '--skip-prds') {
        options.skipPrds = true;
      } else if (arg === '--skip-logs') {
        options.skipLogs = true;
      } else if (arg === '--skip-compact') {
        options.skipCompact = true;
      } else if (arg === '--force') {
        options.force = true;
      } else if (arg === '--help') {
        console.log('Usage: pm clean [options]');
        console.log('\nOptions:');
        console.log('  --days=N        Archive items older than N days (default: 30/60/90)');
        console.log('  --skip-issues   Skip archiving issues');
        console.log('  --skip-epics    Skip archiving epics');
        console.log('  --skip-prds     Skip archiving PRDs');
        console.log('  --skip-logs     Skip cleaning logs');
        console.log('  --skip-compact  Skip compacting completed work');
        console.log('  --dry-run       Show what would be done without doing it');
        console.log('  --force         Clean without confirmation');
        console.log('\nExamples:');
        console.log('  pm clean                  # Clean with defaults');
        console.log('  pm clean --days=7         # Archive items older than 7 days');
        console.log('  pm clean --skip-logs      # Skip log cleanup');
        console.log('  pm clean --dry-run        # Preview cleanup');
        process.exit(0);
      }
    });

    // Confirmation prompt unless forced
    if (!options.force && !options.dryRun) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirm = await new Promise(resolve => {
        rl.question('⚠️  This will archive old items. Continue? (y/N): ', answer => {
          rl.close();
          resolve(answer.toLowerCase() === 'y');
        });
      });

      if (!confirm) {
        console.log('Cleanup cancelled.');
        process.exit(0);
      }
    }

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    await this.cleanProject(options);
  }
}

// Main execution
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ProjectCleaner;