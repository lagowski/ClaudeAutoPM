#!/usr/bin/env node
/**
 * Example: CLI Integration for Filter and Search System
 *
 * This example demonstrates how to integrate the QueryParser and FilterEngine
 * into a CLI command for ClaudeAutoPM.
 *
 * Usage:
 *   node examples/filter-search-cli-integration.js prds --status active --priority high
 *   node examples/filter-search-cli-integration.js epics --search "authentication"
 *   node examples/filter-search-cli-integration.js tasks --created-after 2025-01-01
 *
 * @example Complete Integration
 */

const QueryParser = require('../lib/query-parser');
const FilterEngine = require('../lib/filter-engine');
const path = require('path');

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help if no arguments
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // Extract type (prds/epics/tasks) from first argument
  const validTypes = ['prds', 'epics', 'tasks'];
  const type = args[0].toLowerCase();

  if (!validTypes.includes(type)) {
    console.error(`Error: Invalid type '${args[0]}'`);
    console.error(`Valid types: ${validTypes.join(', ')}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Parse remaining arguments as filters
  const filterArgs = args.slice(1);

  // Initialize parser and engine
  const parser = new QueryParser();
  const engine = new FilterEngine({ basePath: '.claude' });

  // Parse filters
  const query = parser.parse(filterArgs);

  // Show what we're filtering for
  console.log(`🔍 Filtering ${type}...`);
  if (Object.keys(query).length > 0) {
    console.log('\nFilters applied:');
    for (const [key, value] of Object.entries(query)) {
      console.log(`  ${key}: ${value}`);
    }
  } else {
    console.log('No filters applied (showing all)');
  }
  console.log();

  // Validate query
  const validation = parser.validate(query);
  if (!validation.valid) {
    console.error('❌ Invalid filters:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nRun with --help for usage information');
    process.exit(1);
  }

  try {
    // Apply filters
    const startTime = Date.now();
    const results = await engine.loadAndFilter(type, query);
    const elapsed = Date.now() - startTime;

    // Display results
    if (results.length === 0) {
      console.log('❌ No items match your filters.\n');
      console.log('Try:');
      console.log('  - Removing some filters');
      console.log('  - Using broader search terms');
      console.log('  - Checking for typos');
      process.exit(0);
    }

    console.log(`✅ Found ${results.length} matching ${type} (in ${elapsed}ms)\n`);

    // Display each result
    results.forEach((item, index) => {
      const fm = item.frontmatter;

      console.log(`${index + 1}. ${fm.id || 'Unknown ID'}: ${fm.title || 'Untitled'}`);
      console.log(`   Status: ${fm.status || 'N/A'}`);
      console.log(`   Priority: ${fm.priority || 'N/A'}`);

      if (fm.epic) {
        console.log(`   Epic: ${fm.epic}`);
      }

      if (fm.author) {
        console.log(`   Author: ${fm.author}`);
      }

      if (fm.created) {
        console.log(`   Created: ${fm.created}`);
      }

      // Show matches if this was a search result
      if (item.matches && item.matches.length > 0) {
        console.log('   Matches:');
        item.matches.slice(0, 3).forEach(match => {
          if (match.line > 0) {
            console.log(`     Line ${match.line}: ${match.context.substring(0, 60)}...`);
          }
        });
        if (item.matches.length > 3) {
          console.log(`     ... and ${item.matches.length - 3} more`);
        }
      }

      console.log();
    });

    // Summary statistics
    if (results.length > 1) {
      console.log('📊 Summary:');

      // Count by status
      const statusCounts = {};
      results.forEach(r => {
        const status = r.frontmatter.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('  By Status:');
      for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`    ${status}: ${count}`);
      }

      // Count by priority
      const priorityCounts = {};
      results.forEach(r => {
        const priority = r.frontmatter.priority || 'unknown';
        priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
      });

      console.log('  By Priority:');
      for (const [priority, count] of Object.entries(priorityCounts)) {
        console.log(`    ${priority}: ${count}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  const parser = new QueryParser();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ClaudeAutoPM - Filter and Search System                  ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  node filter-search-cli-integration.js <type> [filters...]

TYPES:
  prds    - Filter Product Requirements Documents
  epics   - Filter Epics
  tasks   - Filter Tasks

${parser.getFilterHelp()}

EXAMPLES:

  # Find all active high-priority PRDs
  node filter-search-cli-integration.js prds --status active --priority high

  # Search for "authentication" in all PRDs
  node filter-search-cli-integration.js prds --search authentication

  # Find PRDs created in January 2025
  node filter-search-cli-integration.js prds \\
    --created-after 2025-01-01 \\
    --created-before 2025-01-31

  # Complex filter: active P0 PRDs with "OAuth2" in content
  node filter-search-cli-integration.js prds \\
    --status active \\
    --priority P0 \\
    --created-after 2025-01-01 \\
    --search OAuth2

  # Find epics by author
  node filter-search-cli-integration.js epics --author john

  # Find blocked tasks
  node filter-search-cli-integration.js tasks --status blocked

OUTPUT:
  Results include:
  - Item ID and title
  - Status and priority
  - Epic association (if applicable)
  - Author and creation date
  - Search match context (if searching)
  - Summary statistics (when multiple results)

PERFORMANCE:
  - 100 items: <50ms
  - 1,000 items: <500ms
  - Search: <2s for 1,000 items

For more information, see:
  docs/filter-search-system.md
  lib/README-FILTER-SEARCH.md
`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, showHelp };
