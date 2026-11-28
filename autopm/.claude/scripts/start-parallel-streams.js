#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('./pm/lib/yaml-parse');

/**
 * Start parallel execution of decomposed issue streams
 */
function startParallelStreams(issueNumber) {
  const issuePath = path.join(
    process.cwd(),
    '.claude/epics/current',
    `issue-${issueNumber}`
  );

  const analysisPath = path.join(issuePath, `${issueNumber}-analysis.md`);

  if (!fs.existsSync(analysisPath)) {
    console.error(`❌ Issue #${issueNumber} not decomposed yet`);
    console.log('Run: autopm decompose ' + issueNumber);
    return;
  }

  // Read all stream files
  const updatesPath = path.join(issuePath, 'updates');
  const streamFiles = fs.readdirSync(updatesPath)
    .filter(f => f.startsWith('stream-') && f.endsWith('.md'));

  console.log(`\n🚀 Starting ${streamFiles.length} parallel streams for issue #${issueNumber}\n`);

  const streams = [];

  // Parse each stream file
  streamFiles.forEach((filename, index) => {
    const streamPath = path.join(updatesPath, filename);
    const content = fs.readFileSync(streamPath, 'utf8');

    // Parse YAML front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = yaml.parse(frontMatterMatch[1]);
      const streamLetter = String.fromCharCode(65 + index);

      streams.push({
        id: frontMatter.stream,
        letter: streamLetter,
        name: frontMatter.name,
        agent: frontMatter.agent,
        status: frontMatter.status,
        dependencies: frontMatter.dependencies || [],
        parameters: frontMatter.parameters || {},
        filepath: streamPath
      });
    }
  });

  // Sort by dependencies (streams with no deps first)
  streams.sort((a, b) => {
    if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
    if (a.dependencies.length > 0 && b.dependencies.length === 0) return 1;
    return 0;
  });

  // Display execution plan
  console.log('📋 Execution Plan:\n');
  console.log('Parallel Groups:');

  // Group streams by dependency level
  const noDeps = streams.filter(s => s.dependencies.length === 0);
  const withDeps = streams.filter(s => s.dependencies.length > 0);

  if (noDeps.length > 0) {
    console.log('\n  Group 1 (can start immediately):');
    noDeps.forEach(stream => {
      console.log(`    • Stream ${stream.letter}: ${stream.name}`);
      console.log(`      Agent: ${stream.agent}`);
      if (Object.keys(stream.parameters).length > 0) {
        console.log(`      Parameters: ${JSON.stringify(stream.parameters)}`);
      }
    });
  }

  if (withDeps.length > 0) {
    console.log('\n  Group 2 (waiting for dependencies):');
    withDeps.forEach(stream => {
      console.log(`    • Stream ${stream.letter}: ${stream.name}`);
      console.log(`      Agent: ${stream.agent}`);
      console.log(`      Waiting for: ${stream.dependencies.join(', ')}`);
    });
  }

  // Start execution
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎯 Starting Agents:\n');

  streams.forEach(stream => {
    if (stream.status === 'pending' || stream.status === 'blocked') {
      const canStart = stream.dependencies.length === 0 ||
        stream.dependencies.every(dep => {
          const depStream = streams.find(s => s.id === dep);
          return depStream && depStream.status === 'completed';
        });

      if (canStart) {
        console.log(`✅ Stream ${stream.letter}: ${stream.name}`);
        console.log(`   ➡️  Starting ${stream.agent}...`);

        // Update stream status to in_progress
        updateStreamStatus(stream.filepath, 'in_progress');

        // Create task prompt for agent
        const taskPrompt = generateAgentPrompt(issueNumber, stream);
        console.log(`   📄 Task file: ${stream.filepath}`);
        console.log('');
      } else {
        console.log(`⏸️  Stream ${stream.letter}: ${stream.name}`);
        console.log(`   ⚠️  Blocked - waiting for: ${stream.dependencies.join(', ')}`);
        console.log('');
      }
    } else if (stream.status === 'in_progress') {
      console.log(`🔄 Stream ${stream.letter}: ${stream.name}`);
      console.log(`   Already in progress with ${stream.agent}`);
      console.log('');
    } else if (stream.status === 'completed') {
      console.log(`✓  Stream ${stream.letter}: ${stream.name}`);
      console.log(`   Already completed`);
      console.log('');
    }
  });

  // Show next steps
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Next Steps:\n');
  console.log(`1. Monitor progress: autopm status ${issueNumber}`);
  console.log(`2. Check stream details: cat ${updatesPath}/stream-*.md`);
  console.log(`3. View coordination: cat ${issuePath}/coordination.md`);
  console.log('');
  console.log('💡 Agents will update their stream files as they progress.');
  console.log('   Dependencies will automatically unblock when prerequisites complete.');
}

/**
 * Update stream status in the file
 */
function updateStreamStatus(streamFile, status) {
  let content = fs.readFileSync(streamFile, 'utf8');

  // Update status
  content = content.replace(
    /status: \w+/,
    `status: ${status}`
  );

  // Update started timestamp if starting
  if (status === 'in_progress') {
    content = content.replace(
      /started: null/,
      `started: ${new Date().toISOString()}`
    );

    // Add progress entry
    const progressEntry = `\n### ${new Date().toISOString()}\n- Status changed to: in_progress\n- Agent started work\n`;
    content = content + progressEntry;
  }

  // Update completed timestamp if completing
  if (status === 'completed') {
    content = content.replace(
      /completed: null/,
      `completed: ${new Date().toISOString()}`
    );
  }

  fs.writeFileSync(streamFile, content);
}

/**
 * Generate prompt for agent to work on stream
 */
function generateAgentPrompt(issueNumber, stream) {
  return `
Task: Work on Issue #${issueNumber} - Stream ${stream.letter}: ${stream.name}

1. Read your assigned tasks in: ${stream.filepath}
2. Review the issue analysis for context
3. Check coordination.md for shared resources
4. Complete each task and mark it as done in the stream file
5. Update the progress log with your work
6. Commit changes with message format: "feat(issue-${issueNumber}): [Stream ${stream.letter}] description"

${stream.parameters && Object.keys(stream.parameters).length > 0 ?
    `Use these parameters:\n${JSON.stringify(stream.parameters, null, 2)}` : ''}

${stream.dependencies.length > 0 ?
    `Note: This stream depends on: ${stream.dependencies.join(', ')}` : ''}
`;
}

module.exports = startParallelStreams;

// CLI interface
if (require.main === module) {
  const issueNumber = process.argv[2];
  if (!issueNumber) {
    console.error('Usage: start-parallel-streams.js <issue-number>');
    console.log('');
    console.log('Example:');
    console.log('  start-parallel-streams.js 123');
    process.exit(1);
  }
  startParallelStreams(issueNumber);
}