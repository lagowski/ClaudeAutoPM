#!/usr/bin/env node
/**
 * Release - Create a new release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

class ReleaseManager {
  constructor() {
    this.packageFile = 'package.json';
    this.changelogFile = 'CHANGELOG.md';
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

  getPackageInfo() {
    if (!fs.existsSync(this.packageFile)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(fs.readFileSync(this.packageFile, 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description
    };
  }

  getCurrentVersion() {
    const packageInfo = this.getPackageInfo();
    return packageInfo.version;
  }

  parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[5] || null
    };
  }

  incrementVersion(currentVersion, type) {
    const parsed = this.parseVersion(currentVersion);

    switch (type) {
      case 'major':
        return `${parsed.major + 1}.0.0`;
      case 'minor':
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case 'patch':
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      case 'prerelease':
        if (parsed.prerelease) {
          const num = parseInt(parsed.prerelease.match(/\d+$/)?.[0] || '0');
          return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.${num + 1}`;
        }
        return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.1`;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
  }

  getGitStatus() {
    const status = this.execCommand('git status --short');
    return status ? status.split('\n') : [];
  }

  getRecentCommits(since) {
    try {
      const commits = this.execCommand(
        `git log --oneline --pretty=format:"%h %s" ${since}..HEAD`
      );
      return commits ? commits.split('\n') : [];
    } catch {
      return [];
    }
  }

  categorizeCommits(commits) {
    const categories = {
      features: [],
      fixes: [],
      docs: [],
      chore: [],
      other: []
    };

    commits.forEach(commit => {
      const match = commit.match(/^[a-f0-9]+ (.+)$/);
      if (!match) return;

      const message = match[1];

      if (message.startsWith('feat:') || message.startsWith('feat(')) {
        categories.features.push(message);
      } else if (message.startsWith('fix:') || message.startsWith('fix(')) {
        categories.fixes.push(message);
      } else if (message.startsWith('docs:') || message.startsWith('docs(')) {
        categories.docs.push(message);
      } else if (message.startsWith('chore:') || message.startsWith('chore(')) {
        categories.chore.push(message);
      } else {
        categories.other.push(message);
      }
    });

    return categories;
  }

  generateChangelog(version, commits) {
    const categories = this.categorizeCommits(commits);
    const date = new Date().toISOString().split('T')[0];

    let changelog = `## [${version}] - ${date}\n\n`;

    if (categories.features.length > 0) {
      changelog += '### ✨ Features\n';
      categories.features.forEach(feat => {
        changelog += `- ${feat}\n`;
      });
      changelog += '\n';
    }

    if (categories.fixes.length > 0) {
      changelog += '### 🐛 Bug Fixes\n';
      categories.fixes.forEach(fix => {
        changelog += `- ${fix}\n`;
      });
      changelog += '\n';
    }

    if (categories.docs.length > 0) {
      changelog += '### 📚 Documentation\n';
      categories.docs.forEach(doc => {
        changelog += `- ${doc}\n`;
      });
      changelog += '\n';
    }

    if (categories.chore.length > 0) {
      changelog += '### 🔧 Maintenance\n';
      categories.chore.forEach(chore => {
        changelog += `- ${chore}\n`;
      });
      changelog += '\n';
    }

    if (categories.other.length > 0) {
      changelog += '### Other Changes\n';
      categories.other.forEach(other => {
        changelog += `- ${other}\n`;
      });
      changelog += '\n';
    }

    return changelog;
  }

  updateChangelog(newEntry) {
    let existingContent = '';

    if (fs.existsSync(this.changelogFile)) {
      existingContent = fs.readFileSync(this.changelogFile, 'utf8');
    } else {
      existingContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    // Insert new entry after the header
    const lines = existingContent.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        insertIndex = i;
        break;
      }
      if (i === lines.length - 1) {
        insertIndex = lines.length;
      }
    }

    lines.splice(insertIndex, 0, newEntry);
    fs.writeFileSync(this.changelogFile, lines.join('\n'));
  }

  updatePackageVersion(newVersion) {
    const packageJson = JSON.parse(fs.readFileSync(this.packageFile, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(this.packageFile, JSON.stringify(packageJson, null, 2) + '\n');
  }

  async createRelease(versionType, options = {}) {
    console.log(`\n🚀 Creating Release`);
    console.log(`${'═'.repeat(50)}\n`);

    // Check for uncommitted changes
    const changes = this.getGitStatus();
    if (changes.length > 0 && !options.allowDirty) {
      console.error('❌ You have uncommitted changes:');
      changes.forEach(change => console.log(`  ${change}`));
      console.log('\n💡 Commit your changes first or use --allow-dirty');
      return false;
    }

    // Get current version
    const currentVersion = this.getCurrentVersion();
    const newVersion = options.version || this.incrementVersion(currentVersion, versionType);

    console.log(`📦 Package: ${this.getPackageInfo().name}`);
    console.log(`📌 Current version: ${currentVersion}`);
    console.log(`🎯 New version: ${newVersion}`);

    // Get commits since last tag
    const lastTag = this.execCommand('git describe --tags --abbrev=0', { ignoreError: true }) || 'HEAD~20';
    const commits = this.getRecentCommits(lastTag);

    if (commits.length > 0) {
      console.log(`\n📝 Changes since ${lastTag}:`);
      console.log(`  Found ${commits.length} commits`);
    }

    // Generate changelog
    const changelogEntry = this.generateChangelog(newVersion, commits);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No changes will be made');
      console.log('\nChangelog entry:');
      console.log(`${'─'.repeat(50)}`);
      console.log(changelogEntry);
      console.log(`${'─'.repeat(50)}`);
      return true;
    }

    // Confirmation
    if (!options.yes) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirm = await new Promise(resolve => {
        rl.question(`\n⚠️  Create release ${newVersion}? (y/N): `, answer => {
          rl.close();
          resolve(answer.toLowerCase() === 'y');
        });
      });

      if (!confirm) {
        console.log('Release cancelled.');
        return false;
      }
    }

    try {
      // Update package.json
      console.log('\n📝 Updating package.json...');
      this.updatePackageVersion(newVersion);

      // Update CHANGELOG.md
      console.log('📝 Updating CHANGELOG.md...');
      this.updateChangelog(changelogEntry);

      // Create release branch
      console.log('🌿 Creating release branch...');
      const releaseBranch = `release/v${newVersion}`;
      this.execCommand(`git checkout -b ${releaseBranch}`);

      // Commit changes
      console.log('📤 Committing changes...');
      this.execCommand('git add package.json CHANGELOG.md');
      this.execCommand(`git commit -m "chore: release v${newVersion}"`);

      // Push branch and create PR if not disabled
      if (!options.noPush) {
        console.log('📤 Pushing to remote...');
        this.execCommand(`git push -u origin ${releaseBranch}`);

        // Create PR using gh CLI
        try {
          this.execCommand('which gh', { ignoreError: false });
          console.log('📦 Creating Pull Request...');
          const prBody = `## Release v${newVersion}\n\n${changelogEntry}`;
          const prUrl = this.execCommand(
            `gh pr create --title "chore: release v${newVersion}" --body "${prBody.replace(/"/g, '\\"')}" --base main`
          );
          console.log(`✅ Pull Request created: ${prUrl}`);

          // Auto-merge the PR
          const prNumber = prUrl.split('/').pop();
          console.log('🔄 Auto-merging PR...');
          this.execCommand(`gh pr merge ${prNumber} --squash --auto`);

          // Wait for merge and create tag
          console.log('⏳ Waiting for PR to merge...');
          let merged = false;
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const status = this.execCommand(`gh pr view ${prNumber} --json state -q .state`, { ignoreError: true });
            if (status === 'MERGED') {
              merged = true;
              break;
            }
          }

          if (merged) {
            // Switch back to main and pull
            console.log('📥 Updating main branch...');
            this.execCommand('git checkout main');
            this.execCommand('git pull origin main');

            // Create tag
            console.log('🏷️  Creating tag...');
            const tagMessage = `Release v${newVersion}\n\n${changelogEntry}`;
            this.execCommand(`git tag -a v${newVersion} -m "${tagMessage.replace(/"/g, '\\"')}"`);
            this.execCommand('git push --tags');
          } else {
            console.log('⚠️  PR not merged yet. Please merge manually and create tag.');
          }
        } catch {
          console.log('⚠️  GitHub CLI not available. Please create PR manually.');
        }
      }

      // Create GitHub release if gh CLI is available
      if (!options.noGithub) {
        try {
          this.execCommand('which gh', { ignoreError: false });
          console.log('📦 Creating GitHub release...');

          const releaseNotes = changelogEntry
            .split('\n')
            .filter(line => !line.startsWith('## '))
            .join('\n');

          this.execCommand(
            `gh release create v${newVersion} --title "v${newVersion}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`
          );
          console.log('✅ GitHub release created');
        } catch {
          console.log('ℹ️  GitHub CLI not available, skipping GitHub release');
        }
      }

      // Publish to npm if requested
      if (options.publish) {
        console.log('📦 Publishing to npm...');
        this.execCommand('npm publish');
        console.log('✅ Published to npm');
      }

      // Success
      console.log('\n✅ Release v' + newVersion + ' created successfully!');

      // Next steps
      console.log('\n💡 Next steps:');
      if (options.noPush) {
        console.log('  • Push changes: git push && git push --tags');
      }
      if (!options.publish) {
        console.log('  • Publish to npm: npm publish');
      }
      console.log('  • View release: https://github.com/[org]/[repo]/releases');

      return true;
    } catch (error) {
      console.error('❌ Release failed:', error.message);

      // Rollback
      console.log('\n⚠️  Rolling back changes...');
      try {
        this.execCommand('git reset --hard HEAD~1');
        this.execCommand(`git tag -d v${newVersion}`, { ignoreError: true });
        console.log('✅ Rolled back successfully');
      } catch {}

      return false;
    }
  }

  async run(args) {
    let versionType = 'patch';
    const options = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === 'major' || arg === 'minor' || arg === 'patch' || arg === 'prerelease') {
        versionType = arg;
      } else if (arg === '--version' || arg === '-v') {
        options.version = args[++i];
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--yes' || arg === '-y') {
        options.yes = true;
      } else if (arg === '--no-push') {
        options.noPush = true;
      } else if (arg === '--no-github') {
        options.noGithub = true;
      } else if (arg === '--publish') {
        options.publish = true;
      } else if (arg === '--allow-dirty') {
        options.allowDirty = true;
      } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: pm release [type] [options]');
        console.log('\nTypes:');
        console.log('  major        Increment major version (1.0.0 -> 2.0.0)');
        console.log('  minor        Increment minor version (1.0.0 -> 1.1.0)');
        console.log('  patch        Increment patch version (1.0.0 -> 1.0.1) [default]');
        console.log('  prerelease   Create prerelease version (1.0.0 -> 1.0.0-beta.1)');
        console.log('\nOptions:');
        console.log('  -v, --version <ver>   Use specific version');
        console.log('  -y, --yes            Skip confirmation');
        console.log('  --dry-run            Preview without making changes');
        console.log('  --no-push            Don\'t push to remote');
        console.log('  --no-github          Don\'t create GitHub release');
        console.log('  --publish            Publish to npm');
        console.log('  --allow-dirty        Allow uncommitted changes');
        console.log('\nExamples:');
        console.log('  pm release                    # Patch release');
        console.log('  pm release minor              # Minor release');
        console.log('  pm release --version 2.0.0    # Specific version');
        console.log('  pm release --dry-run          # Preview release');
        process.exit(0);
      }
    }

    const success = await this.createRelease(versionType, options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const manager = new ReleaseManager();
  manager.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ReleaseManager;