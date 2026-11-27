#!/usr/bin/env node
/**
 * Issue Start - Start work on an issue
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IssueStarter {
  constructor() {
    this.providersDir = path.join(__dirname, '..', '..', 'providers');
    this.issueDir = path.join('.claude', 'issues');
    this.activeWorkFile = path.join('.claude', 'active-work.json');
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

  loadActiveWork() {
    if (!fs.existsSync(this.activeWorkFile)) {
      return { issues: [], epics: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.activeWorkFile, 'utf8'));
    } catch {
      return { issues: [], epics: [] };
    }
  }

  saveActiveWork(activeWork) {
    const dir = path.dirname(this.activeWorkFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.activeWorkFile, JSON.stringify(activeWork, null, 2));
  }

  async startIssue(issueId, options = {}) {
    const provider = options.provider || this.detectProvider();
    console.log(`🚀 Starting work on issue: ${issueId}`);
    console.log(`📦 Provider: ${provider}\n`);

    // Update active work tracking
    const activeWork = this.loadActiveWork();
    const issueEntry = {
      id: issueId,
      provider: provider,
      startedAt: new Date().toISOString(),
      status: 'in-progress'
    };

    // Remove if already exists and add to beginning
    activeWork.issues = activeWork.issues.filter(i => i.id !== issueId);
    activeWork.issues.unshift(issueEntry);

    // Keep only last 10 active issues
    if (activeWork.issues.length > 10) {
      activeWork.issues = activeWork.issues.slice(0, 10);
    }

    this.saveActiveWork(activeWork);

    // Try to use provider-specific start command
    const providerScript = path.join(this.providersDir, provider, 'issue-start.js');
    if (fs.existsSync(providerScript)) {
      console.log(`Using ${provider} provider to start issue...`);
      try {
        require(providerScript);
        return;
      } catch (error) {
        console.log(`⚠️  Provider script failed, using local tracking`);
      }
    }

    // Local tracking fallback
    console.log('📝 Creating local issue tracking...');

    // Create issue file if it doesn't exist
    if (!fs.existsSync(this.issueDir)) {
      fs.mkdirSync(this.issueDir, { recursive: true });
    }

    const issueFile = path.join(this.issueDir, `${issueId}.md`);
    if (!fs.existsSync(issueFile)) {
      const template = `# Issue ${issueId}

## Status
- **State**: In Progress
- **Started**: ${new Date().toISOString()}
- **Assigned**: ${process.env.USER || 'current-user'}

## Description
[Add issue description here]

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes
- Started work on ${new Date().toLocaleDateString()}

## Updates
- ${new Date().toISOString()}: Issue started
`;
      fs.writeFileSync(issueFile, template);
      console.log(`✅ Created issue file: ${issueFile}`);
    }

    // Display status
    console.log('\n📊 Issue Status:');
    console.log(`  • ID: ${issueId}`);
    console.log(`  • Status: In Progress`);
    console.log(`  • Started: ${new Date().toLocaleString()}`);

    // Show next steps
    console.log('\n💡 Next steps:');
    console.log(`  • View issue: pm issue-show ${issueId}`);
    console.log(`  • Update status: pm issue-edit ${issueId}`);
    console.log(`  • Close issue: pm issue-close ${issueId}`);
    console.log(`  • View all active: pm in-progress`);
  }

  /**
   * Find task file for an issue by ID
   * Supports both new naming (123.md) and old naming (feature-name.md with github URL in frontmatter)
   */
  findTaskFile(issueId) {
    const epicsDir = path.join('.claude', 'epics');

    if (!fs.existsSync(epicsDir)) {
      return null;
    }

    // Search all epic directories
    const epicDirs = fs.readdirSync(epicsDir).filter(name => {
      const epicPath = path.join(epicsDir, name);
      return fs.statSync(epicPath).isDirectory();
    });

    for (const epicDir of epicDirs) {
      const epicPath = path.join(epicsDir, epicDir);

      // Try new naming convention first: {issueId}.md
      const newStylePath = path.join(epicPath, `${issueId}.md`);
      if (fs.existsSync(newStylePath)) {
        return newStylePath;
      }

      // Try old naming convention: search files for github URL
      const files = fs.readdirSync(epicPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(epicPath, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check frontmatter for github URL with this issue number
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const githubMatch = frontmatter.match(/github:\s*.*\/issues\/(\d+)/);
          if (githubMatch && githubMatch[1] === issueId) {
            return filePath;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract epic name from task file path
   */
  getEpicFromTaskFile(taskFilePath) {
    const parts = taskFilePath.split(path.sep);
    const epicsIndex = parts.indexOf('epics');
    if (epicsIndex >= 0 && epicsIndex < parts.length - 1) {
      return parts[epicsIndex + 1];
    }
    return null;
  }

  /**
   * Analyze issue to identify parallel work streams
   */
  async analyzeIssue(issueId, options = {}) {
    console.log(`🔍 Analyzing issue #${issueId} for parallel work streams...`);

    // Find task file
    const taskFile = this.findTaskFile(issueId);
    if (!taskFile) {
      throw new Error(`No task file found for issue #${issueId}`);
    }

    const epicName = this.getEpicFromTaskFile(taskFile);
    if (!epicName) {
      throw new Error('Could not determine epic name from task file');
    }

    // Check if analysis already exists
    const analysisFile = path.join('.claude', 'epics', epicName, `${issueId}-analysis.md`);
    if (fs.existsSync(analysisFile) && !options.force) {
      console.log('⚠️  Analysis already exists. Use --force to overwrite.');
      return;
    }

    // Read task file
    const taskContent = fs.readFileSync(taskFile, 'utf8');

    // Get issue from GitHub if available
    let issueData = null;
    try {
      const result = execSync(`gh issue view ${issueId} --json title,body,labels`, { encoding: 'utf8' });
      issueData = JSON.parse(result);
    } catch (error) {
      console.log('⚠️  Could not fetch issue from GitHub, using local task file only');
    }

    // Create analysis content
    const timestamp = new Date().toISOString();
    const analysisContent = this.generateAnalysisContent(issueId, taskContent, issueData, timestamp);

    // Write analysis file
    fs.writeFileSync(analysisFile, analysisContent);

    console.log(`✅ Analysis complete: ${analysisFile}`);
    console.log(`   Next: Run /pm:issue-start ${issueId} to begin parallel work`);
  }

  /**
   * Generate analysis file content (simplified version - full analysis done by Claude)
   */
  generateAnalysisContent(issueId, taskContent, issueData, timestamp) {
    const title = issueData?.title || 'Issue #' + issueId;

    // This is a placeholder - in real workflow, Claude would create full analysis
    return `---
issue: ${issueId}
title: ${title}
analyzed: ${timestamp}
estimated_hours: 8
parallelization_factor: 2.0
---

# Parallel Work Analysis: Issue #${issueId}

## Overview
${issueData?.body || 'Analysis pending - Claude will provide detailed breakdown'}

## Parallel Streams

### Stream A: Primary Implementation
**Scope**: Main implementation work
**Files**:
- TBD (Claude will analyze)
**Agent Type**: general-purpose
**Can Start**: immediately
**Estimated Hours**: 4
**Dependencies**: none

### Stream B: Tests
**Scope**: Test implementation
**Files**:
- test/**/*.test.js
**Agent Type**: test-runner
**Can Start**: immediately
**Estimated Hours**: 4
**Dependencies**: none

## Coordination Points

### Shared Files
To be determined by Claude during analysis.

### Sequential Requirements
1. Analysis complete
2. Implementation and tests can run in parallel

## Conflict Risk Assessment
- **Low Risk**: Expected - tests and implementation typically work in separate files

## Parallelization Strategy

**Recommended Approach**: parallel

Launch Streams A and B simultaneously for maximum efficiency.

## Expected Timeline

With parallel execution:
- Wall time: 4 hours
- Total work: 8 hours
- Efficiency gain: 50%

## Notes
This is an automated placeholder. Claude will provide detailed analysis when running this command.
`;
  }

  /**
   * Parse analysis file to extract parallel streams
   */
  parseAnalysisStreams(analysisFilePath) {
    const content = fs.readFileSync(analysisFilePath, 'utf8');
    const streams = [];

    // Extract stream sections using regex
    const streamRegex = /### Stream ([A-Z]):\s*(.+?)\n\*\*Scope\*\*:\s*(.+?)\n\*\*Files\*\*:\n((?:- .+\n)+)\*\*Agent Type\*\*:\s*(.+?)\n\*\*Can Start\*\*:\s*(.+?)\n\*\*Estimated Hours\*\*:\s*(\d+)/g;

    let match;
    while ((match = streamRegex.exec(content)) !== null) {
      const [, letter, name, scope, filesText, agentType, canStart, hours] = match;

      // Parse files list
      const files = filesText.trim().split('\n').map(line =>
        line.replace(/^- /, '').trim()
      );

      streams.push({
        letter,
        name: name.trim(),
        scope: scope.trim(),
        files,
        agentType: agentType.trim(),
        canStart: canStart.trim(),
        estimatedHours: parseInt(hours, 10)
      });
    }

    return streams;
  }

  /**
   * Create workspace structure for issue tracking
   */
  async createWorkspace(issueId, epicName) {
    const workspaceDir = path.join('.claude', 'epics', epicName, 'updates', issueId);

    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    return workspaceDir;
  }

  /**
   * Create stream tracking file
   */
  async createStreamFile(issueId, epicName, stream, streamNumber) {
    const workspaceDir = await this.createWorkspace(issueId, epicName);
    const streamFile = path.join(workspaceDir, `stream-${streamNumber}.md`);
    const timestamp = new Date().toISOString();

    const content = `---
issue: ${issueId}
stream: ${stream.name}
agent: ${stream.agentType}
started: ${timestamp}
status: in_progress
---

# Stream ${streamNumber}: ${stream.name}

## Scope
${stream.scope}

## Files
${stream.files.map(f => `- ${f}`).join('\n')}

## Progress
- Starting implementation
`;

    fs.writeFileSync(streamFile, content);
    return streamFile;
  }

  /**
   * Start issue with parallel work streams based on analysis
   */
  async startIssueWithAnalysis(issueId, options = {}) {
    console.log(`🚀 Starting parallel work on issue #${issueId}...\n`);

    // Find task file and epic
    const taskFile = this.findTaskFile(issueId);
    if (!taskFile) {
      throw new Error(`No task file found for issue #${issueId}`);
    }

    const epicName = this.getEpicFromTaskFile(taskFile);
    const analysisFile = path.join('.claude', 'epics', epicName, `${issueId}-analysis.md`);

    if (!fs.existsSync(analysisFile)) {
      throw new Error(`No analysis found for issue #${issueId}. Run with --analyze first.`);
    }

    // Parse streams from analysis
    const streams = this.parseAnalysisStreams(analysisFile);

    if (streams.length === 0) {
      console.log('⚠️  No parallel streams found in analysis. Starting regular workflow.');
      return this.startIssue(issueId, options);
    }

    // Create workspace
    await this.createWorkspace(issueId, epicName);

    // Update active work
    const activeWork = this.loadActiveWork();
    const issueEntry = {
      id: issueId,
      provider: options.provider || this.detectProvider(),
      startedAt: new Date().toISOString(),
      status: 'in-progress',
      parallelStreams: streams.length
    };

    activeWork.issues = activeWork.issues.filter(i => i.id !== issueId);
    activeWork.issues.unshift(issueEntry);

    if (activeWork.issues.length > 10) {
      activeWork.issues = activeWork.issues.slice(0, 10);
    }

    this.saveActiveWork(activeWork);

    // Create stream files for immediate streams
    const immediateStreams = streams.filter(s => s.canStart === 'immediately');
    let streamNumber = 1;

    console.log(`📋 Epic: ${epicName}`);
    console.log(`🔀 Launching ${immediateStreams.length} parallel streams:\n`);

    for (const stream of immediateStreams) {
      await this.createStreamFile(issueId, epicName, stream, streamNumber);
      console.log(`  ✓ Stream ${streamNumber}: ${stream.name} (${stream.agentType})`);
      streamNumber++;
    }

    // List dependent streams
    const dependentStreams = streams.filter(s => s.canStart !== 'immediately');
    if (dependentStreams.length > 0) {
      console.log(`\n⏳ Waiting streams (will start after dependencies):`);
      dependentStreams.forEach(stream => {
        console.log(`  ○ ${stream.name} (${stream.canStart})`);
      });
    }

    console.log(`\n📁 Progress tracking:`);
    console.log(`   .claude/epics/${epicName}/updates/${issueId}/\n`);

    console.log(`⚠️  TDD REMINDER - All agents MUST follow:`);
    console.log(`   1. ❌ RED: Write failing test`);
    console.log(`   2. ✅ GREEN: Make test pass (minimal code)`);
    console.log(`   3. 🔄 REFACTOR: Clean up code\n`);

    // Assign issue on GitHub
    try {
      execSync(`gh issue edit ${issueId} --add-assignee @me --add-label "in-progress"`, { stdio: 'ignore' });
      console.log(`✓ Issue assigned on GitHub`);
    } catch (error) {
      console.log(`⚠️  Could not assign issue on GitHub (not critical)`);
    }

    console.log(`\n💡 Next steps:`);
    console.log(`   • Monitor: /pm:epic-status ${epicName}`);
    console.log(`   • Sync updates: /pm:issue-sync ${issueId}`);
  }

  async run(args) {
    const issueId = args[0];

    if (!issueId) {
      console.error('❌ Error: Issue ID required');
      console.error('Usage: pm issue-start <issue-id> [--provider=azure|github] [--analyze]');

      // Show active work if any
      const activeWork = this.loadActiveWork();
      if (activeWork.issues.length > 0) {
        console.log('\n📋 Currently active issues:');
        activeWork.issues.slice(0, 5).forEach(issue => {
          const date = new Date(issue.startedAt).toLocaleDateString();
          console.log(`  • ${issue.id} (${issue.provider}) - started ${date}`);
        });
      }

      process.exit(1);
    }

    const options = {};
    let shouldAnalyze = false;

    args.slice(1).forEach(arg => {
      if (arg.startsWith('--provider=')) {
        options.provider = arg.split('=')[1];
      } else if (arg === '--analyze') {
        shouldAnalyze = true;
      }
    });

    if (shouldAnalyze) {
      // Analyze first, then start with analysis
      await this.analyzeIssue(issueId, options);
      await this.startIssueWithAnalysis(issueId, options);
    } else {
      // Regular start without analysis
      await this.startIssue(issueId, options);
    }
  }
}

// Main execution
if (require.main === module) {
  const starter = new IssueStarter();
  starter.run(process.argv.slice(2)).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = IssueStarter;