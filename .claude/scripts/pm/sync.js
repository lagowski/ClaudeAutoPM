#!/usr/bin/env node
/**
 * PM Sync - Synchronize project data with remote sources
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class ProjectSync {
  constructor() {
    this.claudeDir = '.claude';
    this.providersDir = path.join(__dirname, '..', '..', 'providers');
    this.syncLog = path.join(this.claudeDir, 'sync.log');
  }

  detectProvider() {
    // Check for Azure DevOps
    if (fs.existsSync('.azure') || process.env.AZURE_DEVOPS_ORG) {
      return 'azure';
    }

    // Check for GitHub
    if (fs.existsSync('.github') || fs.existsSync('.git')) {
      try {
        const remoteUrl = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' });
        if (remoteUrl.includes('github.com')) {
          return 'github';
        }
      } catch {}
    }

    return 'local';
  }

  async syncGit() {
    console.log('\n📦 Git Synchronization');
    console.log(`${'─'.repeat(40)}`);

    try {
      // Fetch latest changes
      console.log('📥 Fetching latest changes...');
      execSync('git fetch --all --tags', { stdio: 'inherit' });

      // Show current branch
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      console.log(`\n🌿 Current branch: ${branch}`);

      // Show status
      const status = execSync('git status --short', { encoding: 'utf8' });
      if (status) {
        console.log('\n📝 Local changes:');
        console.log(status);
      } else {
        console.log('✅ Working directory clean');
      }

      // Check if behind/ahead
      try {
        const behind = execSync(`git rev-list --count HEAD..origin/${branch}`, { encoding: 'utf8' }).trim();
        const ahead = execSync(`git rev-list --count origin/${branch}..HEAD`, { encoding: 'utf8' }).trim();

        if (behind !== '0') {
          console.log(`\n⬇️  Behind by ${behind} commit(s)`);
          console.log('   Run: git pull');
        }
        if (ahead !== '0') {
          console.log(`\n⬆️  Ahead by ${ahead} commit(s)`);
          console.log('   Run: git push');
        }
        if (behind === '0' && ahead === '0') {
          console.log('\n✅ Up to date with origin');
        }
      } catch {}

      return true;
    } catch (error) {
      console.error('⚠️  Git sync failed:', error.message);
      return false;
    }
  }

  async syncIssues(provider) {
    console.log('\n🎫 Issue Synchronization');
    console.log(`${'─'.repeat(40)}`);

    const issueSyncScript = path.join(__dirname, 'issue-sync', 'sync.js');
    if (fs.existsSync(issueSyncScript)) {
      console.log(`Syncing issues with ${provider}...`);

      try {
        const sync = require(issueSyncScript);
        if (typeof sync === 'function') {
          await sync(provider);
        } else if (sync.sync) {
          await sync.sync(provider);
        }
        console.log('✅ Issues synchronized');
        return true;
      } catch (error) {
        console.error('⚠️  Issue sync failed:', error.message);
      }
    }

    // Fallback: Try provider-specific sync
    const providerSyncScript = path.join(this.providersDir, provider, 'sync.js');
    if (fs.existsSync(providerSyncScript)) {
      try {
        require(providerSyncScript);
        return true;
      } catch (error) {
        console.error('⚠️  Provider sync failed:', error.message);
      }
    }

    console.log('ℹ️  No issue sync available for', provider);
    return false;
  }

  async syncEpics() {
    console.log('\n📚 Epic Synchronization');
    console.log(`${'─'.repeat(40)}`);

    const epicSyncScript = path.join(__dirname, 'epic-sync', 'sync.js');
    if (fs.existsSync(epicSyncScript)) {
      console.log('Syncing epics...');

      try {
        require(epicSyncScript);
        console.log('✅ Epics synchronized');
        return true;
      } catch (error) {
        console.error('⚠️  Epic sync failed:', error.message);
        return false;
      }
    }

    // Fallback: Count local epics
    const epicsDir = path.join(this.claudeDir, 'epics');
    const prdsDir = path.join(this.claudeDir, 'prds');
    let epicCount = 0;

    if (fs.existsSync(epicsDir)) {
      epicCount += fs.readdirSync(epicsDir).filter(f => f.endsWith('.md')).length;
    }
    if (fs.existsSync(prdsDir)) {
      epicCount += fs.readdirSync(prdsDir).filter(f => f.endsWith('.md')).length;
    }

    console.log(`📊 Local epics: ${epicCount}`);
    return true;
  }

  async syncDependencies() {
    console.log('\n📦 Dependencies Check');
    console.log(`${'─'.repeat(40)}`);

    if (fs.existsSync('package.json')) {
      try {
        // Check for outdated packages
        console.log('Checking for updates...');
        const outdated = execSync('npm outdated --json', { encoding: 'utf8' });

        if (outdated) {
          const packages = JSON.parse(outdated);
          const count = Object.keys(packages).length;

          if (count > 0) {
            console.log(`\n⚠️  ${count} package(s) outdated:`);
            Object.entries(packages).slice(0, 5).forEach(([name, info]) => {
              console.log(`  • ${name}: ${info.current} → ${info.wanted}`);
            });
            if (count > 5) {
              console.log(`  ... and ${count - 5} more`);
            }
            console.log('\n  Run: npm update');
          }
        } else {
          console.log('✅ All dependencies up to date');
        }
      } catch {
        console.log('✅ Dependencies checked');
      }
    }

    return true;
  }

  logSync(type, success, details = '') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      success,
      details
    };

    // Ensure directory exists
    const dir = path.dirname(this.syncLog);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append to log
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.syncLog, logLine);
  }

  async syncAll(options = {}) {
    const provider = options.provider || this.detectProvider();
    const startTime = Date.now();

    console.log(`\n🔄 Project Synchronization`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log(`📦 Provider: ${provider}`);

    const results = {
      git: false,
      issues: false,
      epics: false,
      dependencies: false
    };

    // Git sync
    if (!options.skipGit) {
      results.git = await this.syncGit();
      this.logSync('git', results.git);
    }

    // Issues sync
    if (!options.skipIssues) {
      results.issues = await this.syncIssues(provider);
      this.logSync('issues', results.issues, provider);
    }

    // Epics sync
    if (!options.skipEpics) {
      results.epics = await this.syncEpics();
      this.logSync('epics', results.epics);
    }

    // Dependencies check
    if (!options.skipDeps) {
      results.dependencies = await this.syncDependencies();
      this.logSync('dependencies', results.dependencies);
    }

    // Summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n${'═'.repeat(50)}`);
    console.log('📊 Sync Summary:');
    console.log(`  • Git: ${results.git ? '✅' : '❌'}`);
    console.log(`  • Issues: ${results.issues ? '✅' : '❌'}`);
    console.log(`  • Epics: ${results.epics ? '✅' : '❌'}`);
    console.log(`  • Dependencies: ${results.dependencies ? '✅' : '❌'}`);
    console.log(`  • Time: ${elapsed}s`);

    const successCount = Object.values(results).filter(r => r).length;
    const totalCount = Object.keys(results).length;

    if (successCount === totalCount) {
      console.log('\n✅ All systems synchronized!');
    } else if (successCount > 0) {
      console.log(`\n⚠️  Partial sync: ${successCount}/${totalCount} successful`);
    } else {
      console.log('\n❌ Sync failed');
    }

    // Show last sync time
    const lastSyncFile = path.join(this.claudeDir, '.last-sync');
    fs.writeFileSync(lastSyncFile, new Date().toISOString());

    console.log('\n💡 Next sync: pm sync');
    console.log('📝 View log: cat .claude/sync.log');

    return successCount === totalCount;
  }

  async run(args) {
    const options = {};

    // Parse arguments
    args.forEach(arg => {
      if (arg === '--skip-git') {
        options.skipGit = true;
      } else if (arg === '--skip-issues') {
        options.skipIssues = true;
      } else if (arg === '--skip-epics') {
        options.skipEpics = true;
      } else if (arg === '--skip-deps') {
        options.skipDeps = true;
      } else if (arg === 'git') {
        // Sync only git
        options.skipIssues = true;
        options.skipEpics = true;
        options.skipDeps = true;
      } else if (arg === 'issues') {
        // Sync only issues
        options.skipGit = true;
        options.skipEpics = true;
        options.skipDeps = true;
      } else if (arg === 'epics') {
        // Sync only epics
        options.skipGit = true;
        options.skipIssues = true;
        options.skipDeps = true;
      } else if (arg.startsWith('--provider=')) {
        options.provider = arg.split('=')[1];
      } else if (arg === '--help') {
        console.log('Usage: pm sync [options] [component]');
        console.log('\nComponents:');
        console.log('  git      Sync only git repository');
        console.log('  issues   Sync only issues');
        console.log('  epics    Sync only epics');
        console.log('\nOptions:');
        console.log('  --skip-git      Skip git synchronization');
        console.log('  --skip-issues   Skip issues synchronization');
        console.log('  --skip-epics    Skip epics synchronization');
        console.log('  --skip-deps     Skip dependencies check');
        console.log('  --provider=NAME Use specific provider (azure|github)');
        console.log('\nExamples:');
        console.log('  pm sync              # Sync everything');
        console.log('  pm sync git          # Sync only git');
        console.log('  pm sync --skip-deps  # Sync all except dependencies');
        process.exit(0);
      }
    });

    const success = await this.syncAll(options);
    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (require.main === module) {
  const sync = new ProjectSync();
  sync.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ProjectSync;