#!/usr/bin/env node

/**
 * PM PRD List Script - Node.js Implementation
 *
 * Migrated from prd-list.sh to provide PRD listing functionality
 * Maintains full compatibility with the original bash implementation
 *
 * Features:
 * - Lists PRDs categorized by status (backlog, in-progress, implemented)
 * - Extracts metadata from frontmatter (name, status, description)
 * - Provides summary statistics
 * - Handles various status formats
 * - Uses filename as fallback for missing name
 * - Processes only .md files
 */

const fs = require('fs');
const path = require('path');

function parseMetadata(content) {
  const metadata = {
    name: '',
    status: '',
    description: '',
    priority: ''
  };

  // Handle YAML frontmatter (between --- lines)
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const yamlContent = yamlMatch[1];
    const lines = yamlContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase();

        if (Object.prototype.hasOwnProperty.call(metadata, cleanKey)) {
          metadata[cleanKey] = value;
        }
      }
    }
  } else {
    // Handle simple key-value format (key: value lines at start of file)
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':') && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase();

        if (Object.prototype.hasOwnProperty.call(metadata, cleanKey)) {
          metadata[cleanKey] = value;
        }
      } else if (trimmedLine.startsWith('#') || trimmedLine === '') {
        // Stop parsing when we hit content
        break;
      }
    }
  }

  return metadata;
}

function categorizeStatus(status) {
  const lowerStatus = (status || '').toLowerCase();

  // Backlog statuses
  if (['backlog', 'draft', ''].includes(lowerStatus)) {
    return 'backlog';
  }

  // In-progress statuses
  if (['in-progress', 'active'].includes(lowerStatus)) {
    return 'inProgress';
  }

  // Implemented statuses
  if (['implemented', 'completed', 'done'].includes(lowerStatus)) {
    return 'implemented';
  }

  // Default to backlog for unknown statuses
  return 'backlog';
}

function listPRDs() {
  const result = {
    backlog: [],
    inProgress: [],
    implemented: [],
    summary: {
      totalPRDs: 0,
      backlogCount: 0,
      inProgressCount: 0,
      implementedCount: 0
    }
  };

  // Check if PRDs directory exists
  if (!fs.existsSync('.claude/prds')) {
    return result;
  }

  let prdFiles;
  try {
    const allFiles = fs.readdirSync('.claude/prds');
    // Only process .md files (matching bash: for file in .claude/prds/*.md)
    prdFiles = allFiles.filter(file => file.endsWith('.md'));
  } catch (error) {
    return result;
  }

  for (const file of prdFiles) {
    const filePath = path.join('.claude/prds', file);

    let metadata;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      metadata = parseMetadata(content);
    } catch (error) {
      // Skip files that can't be read, or use defaults
      metadata = {
        name: '',
        status: '',
        description: '',
        priority: ''
      };
    }

    // Apply defaults
    const name = metadata.name || path.basename(file, '.md');
    const status = metadata.status || 'backlog';
    const description = metadata.description || 'No description';

    const prdData = {
      name,
      status,
      description,
      filePath: filePath,
      fileName: file
    };

    // Categorize by status
    const category = categorizeStatus(status);
    result[category].push(prdData);
    result.summary.totalPRDs++;
  }

  // Calculate summary counts
  result.summary.backlogCount = result.backlog.length;
  result.summary.inProgressCount = result.inProgress.length;
  result.summary.implementedCount = result.implemented.length;

  return result;
}

function formatPRDList(data) {
  let output = 'Getting PRDs...\n\n\n';

  // Check if no PRDs directory or empty
  if (data.summary.totalPRDs === 0) {
    if (!fs.existsSync('.claude/prds')) {
      output += '📁 No PRD directory found. Create your first PRD with: /pm:prd-new <feature-name>\n';
      return output;
    } else {
      output += '📁 No PRDs found. Create your first PRD with: /pm:prd-new <feature-name>\n';
      return output;
    }
  }

  output += '📋 PRD List\n';
  output += '===========\n\n';

  // Backlog section
  output += '🔍 Backlog PRDs:\n';
  if (data.backlog.length > 0) {
    for (const prd of data.backlog) {
      output += `   📋 ${prd.filePath} - ${prd.description}\n`;
    }
  } else {
    output += '   (none)\n';
  }

  output += '\n';

  // In-Progress section
  output += '🔄 In-Progress PRDs:\n';
  if (data.inProgress.length > 0) {
    for (const prd of data.inProgress) {
      output += `   📋 ${prd.filePath} - ${prd.description}\n`;
    }
  } else {
    output += '   (none)\n';
  }

  output += '\n';

  // Implemented section
  output += '✅ Implemented PRDs:\n';
  if (data.implemented.length > 0) {
    for (const prd of data.implemented) {
      output += `   📋 ${prd.filePath} - ${prd.description}\n`;
    }
  } else {
    output += '   (none)\n';
  }

  // Summary
  output += '\n📊 PRD Summary\n';
  output += `   Total PRDs: ${data.summary.totalPRDs}\n`;
  output += `   Backlog: ${data.summary.backlogCount}\n`;
  output += `   In-Progress: ${data.summary.inProgressCount}\n`;
  output += `   Implemented: ${data.summary.implementedCount}\n`;

  return output;
}

// CommonJS export for testing
module.exports = {
  listPRDs,
  parseMetadata,
  categorizeStatus,
  formatPRDList
};

// CLI execution
if (require.main === module) {
  try {
    const data = module.exports.listPRDs();
    console.log(module.exports.formatPRDList(data));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing PRDs:', error.message);
    process.exit(1);
  }
}