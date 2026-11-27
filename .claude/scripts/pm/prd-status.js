#!/usr/bin/env node

/**
 * PRD Status Script - Node.js Implementation
 * Displays status report for all PRDs in the project
 */

const fs = require('fs');
const path = require('path');

class PRDStatus {
  constructor() {
    this.prdsDir = path.join(process.cwd(), '.claude', 'prds');
  }

  getPRDFiles() {
    if (!fs.existsSync(this.prdsDir)) {
      return [];
    }

    return fs.readdirSync(this.prdsDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(this.prdsDir, file));
  }

  extractStatus(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const statusMatch = content.match(/^status:\s*(.+)$/m);
      return statusMatch ? statusMatch[1].trim() : 'backlog';
    } catch {
      return 'backlog';
    }
  }

  extractName(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      return nameMatch ? nameMatch[1].trim() : path.basename(filePath, '.md');
    } catch {
      return path.basename(filePath, '.md');
    }
  }

  categorizeStatus(status) {
    const statusLower = status.toLowerCase();
    if (['backlog', 'draft', ''].includes(statusLower)) {
      return 'backlog';
    } else if (['in-progress', 'active'].includes(statusLower)) {
      return 'in_progress';
    } else if (['implemented', 'completed', 'done'].includes(statusLower)) {
      return 'implemented';
    }
    return 'backlog';
  }

  drawBar(count, total, maxWidth = 20) {
    if (total === 0) return '';
    const barLength = Math.round((count / total) * maxWidth);
    return '█'.repeat(barLength);
  }

  run() {
    console.log('📄 PRD Status Report');
    console.log('====================');
    console.log('');

    const prdFiles = this.getPRDFiles();

    if (prdFiles.length === 0) {
      if (!fs.existsSync(this.prdsDir)) {
        console.log('No PRD directory found.');
      } else {
        console.log('No PRDs found.');
      }
      process.exit(0);
    }

    // Count by status
    const counts = {
      backlog: 0,
      in_progress: 0,
      implemented: 0
    };

    const prds = prdFiles.map(file => {
      const status = this.extractStatus(file);
      const category = this.categorizeStatus(status);
      counts[category]++;

      return {
        path: file,
        name: this.extractName(file),
        status: status,
        category: category,
        mtime: fs.statSync(file).mtime
      };
    });

    const total = prdFiles.length;

    console.log('Getting status...');
    console.log('');
    console.log('');

    // Display chart
    console.log('📊 Distribution:');
    console.log('================');
    console.log('');

    console.log(`  Backlog:     ${counts.backlog.toString().padEnd(3)} [${this.drawBar(counts.backlog, total)}]`);
    console.log(`  In Progress: ${counts.in_progress.toString().padEnd(3)} [${this.drawBar(counts.in_progress, total)}]`);
    console.log(`  Implemented: ${counts.implemented.toString().padEnd(3)} [${this.drawBar(counts.implemented, total)}]`);
    console.log('');
    console.log(`  Total PRDs: ${total}`);

    // Recent activity
    console.log('');
    console.log('📅 Recent PRDs (last 5 modified):');

    prds.sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5)
      .forEach(prd => {
        console.log(`  • ${prd.name}`);
      });

    // Suggestions
    console.log('');
    console.log('💡 Next Actions:');

    if (counts.backlog > 0) {
      console.log('  • Parse backlog PRDs to epics: /pm:prd-parse <name>');
    }
    if (counts.in_progress > 0) {
      console.log('  • Check progress on active PRDs: /pm:epic-status <name>');
    }
    if (total === 0) {
      console.log('  • Create your first PRD: /pm:prd-new <name>');
    }

    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const status = new PRDStatus();
  status.run();
}

module.exports = PRDStatus;