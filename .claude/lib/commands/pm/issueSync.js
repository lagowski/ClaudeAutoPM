#!/usr/bin/env node
/**
 * Issue Sync - Complete GitHub issue synchronization
 *
 * Replaces 5 Bash scripts with clean, testable JavaScript:
 * - gather-updates.sh → gatherUpdates()
 * - format-comment.sh → formatComment()
 * - post-comment.sh → postComment()
 * - update-frontmatter.sh → updateFrontmatter()
 * - preflight-validation.sh → preflightValidation()
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let inFrontmatter = false;
  let frontmatterCount = 0;
  const frontmatter = {};

  for (const line of lines) {
    if (line === '---') {
      frontmatterCount++;
      if (frontmatterCount === 1) {
        inFrontmatter = true;
      } else if (frontmatterCount === 2) {
        break;
      }
      continue;
    }

    if (inFrontmatter) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        frontmatter[key] = value;
      }
    }
  }

  return frontmatter;
}

/**
 * Update frontmatter field
 */
function updateFrontmatterField(filePath, field, value) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];

  let inFrontmatter = false;
  let frontmatterCount = 0;
  let fieldUpdated = false;

  for (const line of lines) {
    if (line === '---') {
      frontmatterCount++;
      result.push(line);
      if (frontmatterCount === 1) {
        inFrontmatter = true;
      } else if (frontmatterCount === 2) {
        inFrontmatter = false;
        // Add field if not found
        if (!fieldUpdated && inFrontmatter === false) {
          result.splice(result.length - 1, 0, `${field}: ${value}`);
        }
      }
      continue;
    }

    if (inFrontmatter) {
      const match = line.match(/^(\w+):/);
      if (match && match[1] === field) {
        result.push(`${field}: ${value}`);
        fieldUpdated = true;
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  fs.writeFileSync(filePath, result.join('\n'), 'utf8');
  return true;
}

/**
 * Get current ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Strip frontmatter and return body only
 */
function stripFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Frontmatter opens only on line 1; a file without it is all body, and a
  // '---' after the closing marker is a horizontal rule, not frontmatter (#858)
  if (lines[0] !== '---') {
    return content.trim();
  }

  const close = lines.indexOf('---', 1);
  if (close === -1) {
    return '';
  }

  return lines.slice(close + 1).join('\n').trim();
}

/**
 * Gather updates from various sources
 */
function gatherUpdates(issueNumber, updatesDir, lastSync = null) {
  console.log(`\n📋 Gathering updates for issue #${issueNumber}`);

  if (!fs.existsSync(updatesDir)) {
    throw new Error(`Updates directory not found: ${updatesDir}`);
  }

  const updates = {
    progress: '',
    notes: '',
    commits: '',
    acceptanceCriteria: '',
    nextSteps: '',
    blockers: ''
  };

  // Gather progress
  const progressFile = path.join(updatesDir, 'progress.md');
  if (fs.existsSync(progressFile)) {
    updates.progress = stripFrontmatter(progressFile);
    const frontmatter = parseFrontmatter(progressFile);
    if (frontmatter && frontmatter.completion) {
      updates.progress += `\n\n**Current Progress:** ${frontmatter.completion}`;
    }
  }

  // Gather notes
  const notesFile = path.join(updatesDir, 'notes.md');
  if (fs.existsSync(notesFile)) {
    updates.notes = stripFrontmatter(notesFile);
  }

  // Gather commits
  const commitsFile = path.join(updatesDir, 'commits.md');
  if (fs.existsSync(commitsFile)) {
    updates.commits = stripFrontmatter(commitsFile);
  } else {
    // Auto-gather recent commits
    updates.commits = gatherRecentCommits(lastSync);
  }

  // Gather acceptance criteria
  const criteriaFile = path.join(updatesDir, 'acceptance-criteria.md');
  if (fs.existsSync(criteriaFile)) {
    updates.acceptanceCriteria = stripFrontmatter(criteriaFile);
  }

  // Gather next steps
  const nextStepsFile = path.join(updatesDir, 'next-steps.md');
  if (fs.existsSync(nextStepsFile)) {
    updates.nextSteps = stripFrontmatter(nextStepsFile);
  }

  // Gather blockers
  const blockersFile = path.join(updatesDir, 'blockers.md');
  if (fs.existsSync(blockersFile)) {
    updates.blockers = stripFrontmatter(blockersFile);
  }

  console.log('✅ Updates gathered');
  return updates;
}

/**
 * Auto-gather recent commits
 */
function gatherRecentCommits(since = null) {
  try {
    const sinceArg = since || '24 hours ago';
    const result = execSync(
      `git log --since="${sinceArg}" --oneline --no-merges`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    if (result.trim()) {
      const commits = result.trim().split('\n').map(line => `- ${line}`);
      return `**Recent Commits:**\n${commits.join('\n')}`;
    }
  } catch (error) {
    // Git not available or no commits
  }

  return 'No recent commits found';
}

/**
 * Format comment from gathered updates
 */
function formatComment(issueNumber, updates, isCompletion = false) {
  console.log(`\n📝 Formatting comment for issue #${issueNumber}`);

  const sections = [];

  if (isCompletion) {
    sections.push('# ✅ Task Completed\n');
    sections.push(`*Completed at: ${getTimestamp()}*\n`);
  } else {
    sections.push('# 📊 Progress Update\n');
    sections.push(`*Updated at: ${getTimestamp()}*\n`);
  }

  // Add sections with content
  if (updates.progress && !updates.progress.includes('No progress')) {
    sections.push('## Progress Updates\n');
    sections.push(updates.progress + '\n');
  }

  if (updates.notes && !updates.notes.includes('No technical notes')) {
    sections.push('## Technical Notes\n');
    sections.push(updates.notes + '\n');
  }

  if (updates.commits && !updates.commits.includes('No recent commits')) {
    sections.push('## Recent Commits\n');
    sections.push(updates.commits + '\n');
  }

  if (updates.acceptanceCriteria && !updates.acceptanceCriteria.includes('No acceptance')) {
    sections.push('## Acceptance Criteria\n');
    sections.push(updates.acceptanceCriteria + '\n');
  }

  if (updates.nextSteps && !updates.nextSteps.includes('No specific next steps')) {
    sections.push('## Next Steps\n');
    sections.push(updates.nextSteps + '\n');
  }

  if (updates.blockers && !updates.blockers.includes('No current blockers')) {
    sections.push('## Blockers\n');
    sections.push(updates.blockers + '\n');
  }

  const comment = sections.join('\n');
  console.log('✅ Comment formatted');

  return comment;
}

/**
 * Post comment to GitHub issue
 */
function postComment(issueNumber, comment, isDryRun = false) {
  console.log(`\n💬 Posting comment to issue #${issueNumber}`);

  if (isDryRun) {
    console.log('🔸 DRY RUN - Comment preview:');
    console.log(comment.split('\n').slice(0, 20).join('\n'));
    console.log('...');
    return 'https://github.com/DRYRUN/issues/' + issueNumber + '#issuecomment-DRYRUN';
  }

  // Write comment to temp file
  const tempFile = `/tmp/issue-comment-${issueNumber}-${Date.now()}.md`;
  fs.writeFileSync(tempFile, comment, 'utf8');

  try {
    // Post via gh CLI
    const result = execSync(
      `gh issue comment ${issueNumber} --body-file "${tempFile}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // Extract URL from result
    const match = result.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+#issuecomment-\d+/);
    if (match) {
      const url = match[0];
      console.log(`✅ Comment posted: ${url}`);

      // Cleanup temp file
      fs.unlinkSync(tempFile);

      return url;
    }

    console.log('⚠️  Comment posted but URL not found in response');
    return null;
  } catch (error) {
    console.error(`❌ Failed to post comment: ${error.message}`);
    console.log(`Temp comment file preserved: ${tempFile}`);
    throw error;
  }
}

/**
 * Update frontmatter after successful sync
 */
function updateFrontmatterAfterSync(progressFile, commentUrl, isCompletion = false) {
  console.log(`\n📄 Updating frontmatter: ${progressFile}`);

  if (!fs.existsSync(progressFile)) {
    throw new Error(`Progress file not found: ${progressFile}`);
  }

  // Create backup
  const backupFile = `${progressFile}.backup.${Date.now()}`;
  fs.copyFileSync(progressFile, backupFile);

  try {
    // Update last_sync
    updateFrontmatterField(progressFile, 'last_sync', getTimestamp());

    // Update comment URL if provided
    if (commentUrl) {
      updateFrontmatterField(progressFile, 'last_comment_url', commentUrl);
    }

    // Update completion if needed
    if (isCompletion) {
      updateFrontmatterField(progressFile, 'completion', '100');
      updateFrontmatterField(progressFile, 'status', 'completed');
      updateFrontmatterField(progressFile, 'completed_at', getTimestamp());
    }

    // Update issue state from GitHub
    try {
      const issueState = execSync('gh issue view --json state -q .state', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();

      if (issueState) {
        updateFrontmatterField(progressFile, 'issue_state', issueState);
      }
    } catch (error) {
      // GitHub CLI not available or issue not found
    }

    console.log('✅ Frontmatter updated');

    // Cleanup old backups (keep last 5)
    cleanupOldBackups(progressFile, 5);

  } catch (error) {
    console.error('❌ Frontmatter update failed, restoring backup');
    fs.copyFileSync(backupFile, progressFile);
    throw error;
  }
}

/**
 * Cleanup old backup files
 */
function cleanupOldBackups(originalFile, keepCount = 5) {
  const dir = path.dirname(originalFile);
  const basename = path.basename(originalFile);

  try {
    const backups = fs.readdirSync(dir)
      .filter(f => f.startsWith(basename + '.backup.'))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        time: fs.statSync(path.join(dir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove old backups
    for (let i = keepCount; i < backups.length; i++) {
      fs.unlinkSync(backups[i].path);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Preflight validation
 */
function preflightValidation(issueNumber, updatesDir) {
  console.log(`\n🔍 Preflight validation for issue #${issueNumber}`);

  const errors = [];

  // Check GitHub auth
  try {
    execSync('gh auth status', { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    errors.push('GitHub CLI not authenticated. Run: gh auth login');
  }

  // Check if issue exists
  try {
    const state = execSync(`gh issue view ${issueNumber} --json state -q .state`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (state === 'CLOSED') {
      console.log(`⚠️  Issue #${issueNumber} is closed`);
    }
  } catch (error) {
    errors.push(`Issue #${issueNumber} not found`);
  }

  // Check updates directory
  if (!fs.existsSync(updatesDir)) {
    errors.push(`Updates directory not found: ${updatesDir}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ Preflight validation failed:');
    errors.forEach(err => console.error(`   - ${err}`));
    return false;
  }

  console.log('✅ Preflight validation passed');
  return true;
}

/**
 * Full sync workflow
 */
function syncIssue(issueNumber, updatesDir, isCompletion = false, isDryRun = false) {
  console.log(`\n🚀 Starting issue sync: #${issueNumber}`);

  // Preflight validation
  if (!preflightValidation(issueNumber, updatesDir)) {
    throw new Error('Preflight validation failed');
  }

  // Gather updates
  const progressFile = path.join(updatesDir, 'progress.md');
  const frontmatter = parseFrontmatter(progressFile);
  const lastSync = frontmatter ? frontmatter.last_sync : null;

  const updates = gatherUpdates(issueNumber, updatesDir, lastSync);

  // Format comment
  const comment = formatComment(issueNumber, updates, isCompletion);

  // Post comment
  const commentUrl = postComment(issueNumber, comment, isDryRun);

  // Update frontmatter
  if (!isDryRun && fs.existsSync(progressFile)) {
    updateFrontmatterAfterSync(progressFile, commentUrl, isCompletion);
  }

  console.log(`\n✅ Issue sync complete!`);
  console.log(`   Issue: #${issueNumber}`);
  if (commentUrl) {
    console.log(`   Comment: ${commentUrl}`);
  }

  return { commentUrl, updates };
}

/**
 * CLI interface
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage:');
    console.log('  issueSync.js sync <issue-number> <updates-dir> [--complete] [--dry-run]');
    console.log('  issueSync.js gather <issue-number> <updates-dir>');
    console.log('  issueSync.js format <issue-number> <updates-dir> [--complete]');
    console.log('  issueSync.js post <issue-number> <comment-file> [--dry-run]');
    console.log('  issueSync.js update <progress-file> <comment-url> [--complete]');
    console.log('');
    console.log('Examples:');
    console.log('  issueSync.js sync 123 .claude/epics/auth/updates/123');
    console.log('  issueSync.js sync 456 ./updates --complete');
    console.log('  issueSync.js sync 789 ./updates --dry-run');
    process.exit(1);
  }

  const issueNumber = args[1];
  const isComplete = args.includes('--complete');
  const isDryRun = args.includes('--dry-run');

  try {
    switch (command) {
      case 'sync': {
        const updatesDir = args[2];
        if (!issueNumber || !updatesDir) {
          console.error('Error: issue-number and updates-dir required');
          process.exit(1);
        }
        syncIssue(issueNumber, updatesDir, isComplete, isDryRun);
        break;
      }

      case 'gather': {
        const updatesDir = args[2];
        if (!issueNumber || !updatesDir) {
          console.error('Error: issue-number and updates-dir required');
          process.exit(1);
        }
        const updates = gatherUpdates(issueNumber, updatesDir);
        console.log(JSON.stringify(updates, null, 2));
        break;
      }

      case 'format': {
        const updatesDir = args[2];
        if (!issueNumber || !updatesDir) {
          console.error('Error: issue-number and updates-dir required');
          process.exit(1);
        }
        const updates = gatherUpdates(issueNumber, updatesDir);
        const comment = formatComment(issueNumber, updates, isComplete);
        console.log(comment);
        break;
      }

      case 'post': {
        const commentFile = args[2];
        if (!issueNumber || !commentFile) {
          console.error('Error: issue-number and comment-file required');
          process.exit(1);
        }
        const comment = fs.readFileSync(commentFile, 'utf8');
        const url = postComment(issueNumber, comment, isDryRun);
        console.log(url);
        break;
      }

      case 'update': {
        const progressFile = args[2];
        const commentUrl = args[3];
        if (!progressFile) {
          console.error('Error: progress-file required');
          process.exit(1);
        }
        updateFrontmatterAfterSync(progressFile, commentUrl, isComplete);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontmatter,
  updateFrontmatterField,
  stripFrontmatter,
  gatherUpdates,
  formatComment,
  postComment,
  updateFrontmatterAfterSync,
  preflightValidation,
  syncIssue
};
