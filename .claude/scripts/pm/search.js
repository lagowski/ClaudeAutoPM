#!/usr/bin/env node

/**
 * PM Search Script - Node.js Implementation
 *
 * Migrated from search.sh to provide search functionality across PM content
 * Maintains full compatibility with the original bash implementation
 */

const fs = require('fs');
const path = require('path');

function searchContent(query) {
  if (!query || query.trim() === '') {
    throw new Error('❌ Please provide a search query\nUsage: /pm:search <query>');
  }

  const results = {
    prds: [],
    epics: [],
    tasks: [],
    total: 0
  };

  // Search in PRDs
  if (fs.existsSync('.claude/prds')) {
    try {
      const prdFiles = fs.readdirSync('.claude/prds').filter(file => file.endsWith('.md'));

      for (const file of prdFiles) {
        const filePath = path.join('.claude/prds', file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const matches = (content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;

          if (matches > 0) {
            results.prds.push({
              name: path.basename(file, '.md'),
              matches: matches
            });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  // Search in Epics
  if (fs.existsSync('.claude/epics')) {
    try {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const epicDir of epicDirs) {
        const epicFilePath = path.join('.claude/epics', epicDir, 'epic.md');

        if (fs.existsSync(epicFilePath)) {
          try {
            const content = fs.readFileSync(epicFilePath, 'utf8');
            const matches = (content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;

            if (matches > 0) {
              results.epics.push({
                name: epicDir,
                matches: matches
              });
            }
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  // Search in Tasks (limit to 10 results)
  if (fs.existsSync('.claude/epics')) {
    try {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const epicDir of epicDirs) {
        const epicPath = path.join('.claude/epics', epicDir);

        try {
          const files = fs.readdirSync(epicPath)
            .filter(file => /^\d+\.md$/.test(file));

          for (const file of files) {
            if (results.tasks.length >= 10) break;

            const taskFilePath = path.join(epicPath, file);
            try {
              const content = fs.readFileSync(taskFilePath, 'utf8');

              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.tasks.push({
                  taskNum: path.basename(file, '.md'),
                  epicName: epicDir
                });
              }
            } catch (error) {
              // Skip files that can't be read
              continue;
            }
          }
        } catch (error) {
          // Epic directory can't be read
          continue;
        }

        if (results.tasks.length >= 10) break;
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  // Calculate total matches
  results.total = results.prds.length + results.epics.length + results.tasks.length;

  return results;
}

function formatSearchResults(query, results) {
  let output = `Searching for '${query}'...\n\n\n`;
  output += `🔍 Search results for: '${query}'\n`;
  output += `================================\n\n`;

  // PRDs section
  output += `📄 PRDs:\n`;
  if (results.prds.length > 0) {
    for (const prd of results.prds) {
      output += `  • ${prd.name} (${prd.matches} matches)\n`;
    }
  } else {
    output += `  No matches\n`;
  }
  output += `\n`;

  // Epics section
  output += `📚 Epics:\n`;
  if (results.epics.length > 0) {
    for (const epic of results.epics) {
      output += `  • ${epic.name} (${epic.matches} matches)\n`;
    }
  } else {
    output += `  No matches\n`;
  }
  output += `\n`;

  // Tasks section
  output += `📝 Tasks:\n`;
  if (results.tasks.length > 0) {
    for (const task of results.tasks) {
      output += `  • Task #${task.taskNum} in ${task.epicName}\n`;
    }
  } else {
    output += `  No matches\n`;
  }

  // Summary
  output += `\n📊 Total files with matches: ${results.total}\n`;

  return output;
}

// CommonJS export for testing
module.exports = { searchContent, formatSearchResults };

// CLI execution
if (require.main === module) {
  const query = process.argv[2];

  try {
    const results = searchContent(query);
    console.log(formatSearchResults(query, results));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}