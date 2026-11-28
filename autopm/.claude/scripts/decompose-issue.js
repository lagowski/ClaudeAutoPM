#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('./pm/lib/yaml-parse');

class IssueDecomposer {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.templatesPath = path.join(projectPath, '.claude/templates/issue-decomposition');
    this.epicsPath = path.join(projectPath, '.claude/epics');
  }

  /**
   * Analyze issue title and description to find matching template
   */
  async analyzeIssue(issueTitle, issueDescription) {
    const templates = this.loadTemplates();

    // If no templates found, return default
    if (templates.length === 0) {
      return this.loadTemplate('default.yaml');
    }

    // Score each template based on pattern matching
    const scores = templates.map(template => ({
      template,
      score: this.calculateScore(issueTitle, issueDescription, template)
    }));

    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score > 0.3) {
      return scores[0].template;
    }

    // Return default template if no good match
    return this.loadTemplate('default.yaml');
  }

  /**
   * Calculate match score between issue and template
   */
  calculateScore(title, description, template) {
    if (!template.patterns || template.patterns.length === 0) {
      return 0; // Default template has no patterns
    }

    let score = 0;
    const text = `${title} ${description}`.toLowerCase();

    template.patterns.forEach(pattern => {
      if (text.includes(pattern.toLowerCase())) {
        score += 1;
      }
    });

    return score / template.patterns.length;
  }

  /**
   * Decompose issue into parallel work streams
   */
  async decomposeIssue(issueNumber, issueTitle, issueDescription = '') {
    console.log(`\n🔍 Analyzing issue #${issueNumber}: ${issueTitle}`);

    // Find matching template
    const template = await this.analyzeIssue(issueTitle, issueDescription);
    console.log(`📋 Using template: ${template.name}`);

    // Create issue directory structure
    const issuePath = path.join(this.epicsPath, 'current', `issue-${issueNumber}`);
    const updatesPath = path.join(issuePath, 'updates');

    this.ensureDirectory(issuePath);
    this.ensureDirectory(updatesPath);

    // Generate analysis file
    const analysis = this.generateAnalysis(
      issueNumber,
      issueTitle,
      issueDescription,
      template
    );

    fs.writeFileSync(
      path.join(issuePath, `${issueNumber}-analysis.md`),
      analysis
    );

    // Generate stream files
    let streamIndex = 0;
    Object.entries(template.streams).forEach(([streamId, stream]) => {
      const streamFile = this.generateStreamFile(streamId, stream, issueNumber, streamIndex);
      fs.writeFileSync(
        path.join(updatesPath, `stream-${streamId}.md`),
        streamFile
      );
      streamIndex++;
    });

    // Generate coordination file
    const coordination = this.generateCoordinationFile(template);
    fs.writeFileSync(
      path.join(issuePath, 'coordination.md'),
      coordination
    );

    console.log(`✅ Decomposed into ${Object.keys(template.streams).length} parallel streams`);

    // Show stream summary
    Object.entries(template.streams).forEach(([id, stream], index) => {
      console.log(`   Stream ${String.fromCharCode(65 + index)}: ${stream.name} (${stream.agent})`);
    });

    return {
      issuePath,
      streams: template.streams,
      template: template.name
    };
  }

  /**
   * Generate analysis markdown file
   */
  generateAnalysis(issueNumber, title, description, template) {
    const streams = Object.entries(template.streams);

    return `# Issue #${issueNumber}: ${title}

## Description
${description || 'No description provided.'}

## Template Used
**${template.name}**: ${template.description}

## Work Decomposition

This issue has been decomposed into ${streams.length} parallel work streams:

${streams.map(([id, stream], index) => `
### Stream ${String.fromCharCode(65 + index)}: ${stream.name}
- **Agent**: \`${stream.agent}\`
- **Priority**: ${stream.priority}
${stream.parameters ? `- **Parameters**: ${JSON.stringify(stream.parameters)}` : ''}
${stream.dependencies ? `- **Dependencies**: ${stream.dependencies.join(', ')}` : '- **Dependencies**: None'}
- **Files**:
${stream.files.map(f => `  - ${f}`).join('\n')}

**Tasks**:
${stream.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}
`).join('')}

## Execution Strategy

\`\`\`mermaid
graph LR
    start[Start]
${streams.map(([id, stream]) => {
  if (stream.dependencies && stream.dependencies.length > 0) {
    return stream.dependencies.map(dep => `    ${dep} --> ${id}`).join('\n');
  }
  return `    start --> ${id}`;
}).join('\n')}
${streams.map(([id]) => `    ${id} --> complete[Complete]`).join('\n')}
\`\`\`

## Coordination Points

${template.coordination?.sync_points?.map(point =>
  `- After **${point.after}**: ${point.message}`
).join('\n') || 'No explicit sync points defined.'}

## Shared Resources

${template.coordination?.shared_files?.map(file =>
  `- **${file.path}**: ${file.description} (Owner: ${file.owner}, Consumers: ${file.consumers.join(', ')})`
).join('\n') || 'No shared files defined.'}

## How to Start

\`\`\`bash
# Start all streams in parallel
autopm start-streams ${issueNumber}

# Or start individual streams
${Object.keys(template.streams).map(id => `autopm start-stream ${issueNumber} ${id}`).join('\n')}

# Check status
autopm status ${issueNumber}
\`\`\`
`;
  }

  /**
   * Generate individual stream tracking file
   */
  generateStreamFile(streamId, stream, issueNumber, streamIndex) {
    const streamLetter = String.fromCharCode(65 + streamIndex);
    return `---
stream: ${streamId}
name: ${stream.name}
agent: ${stream.agent}
issue: ${issueNumber}
status: pending
started: null
completed: null
${stream.parameters ? `parameters:\n${Object.entries(stream.parameters).map(([k, v]) => `  ${k}: ${v}`).join('\n')}` : ''}
---

# Stream ${streamLetter}: ${stream.name}

## Agent Assignment
- **Agent**: \`${stream.agent}\`
- **Priority**: ${stream.priority}
${stream.dependencies ? `- **Waiting for**: ${stream.dependencies.join(', ')}` : '- **Dependencies**: None'}

## Tasks

${stream.tasks.map((task, i) => `- [ ] ${task}`).join('\n')}

## Files to Modify

${stream.files.map(f => `- \`${f}\``).join('\n')}

## Progress Log

### ${new Date().toISOString().split('T')[0]}
- Status: Ready to start
- Waiting for dependencies: ${stream.dependencies && stream.dependencies.length > 0 ? 'Yes' : 'No'}

---

<!-- Agent updates below this line -->
`;
  }

  /**
   * Generate coordination file
   */
  generateCoordinationFile(template) {
    return `# Coordination Protocol

## Sync Points
${template.coordination?.sync_points?.map(point => `
### After ${point.after}
- **Message**: ${point.message}
- **Action**: Update dependent streams that work can proceed
`).join('') || 'No sync points defined.'}

## Shared Files
${template.coordination?.shared_files?.map(file => `
### ${file.path}
- **Owner**: ${file.owner}
- **Consumers**: ${file.consumers.join(', ')}
- **Description**: ${file.description}
- **Protocol**: Owner must notify consumers after updates
`).join('') || 'No shared files defined.'}

## Communication Channels

All agents communicate through:
1. Stream status files in \`updates/\`
2. Git commits with stream identifier
3. This coordination file for critical updates

## Conflict Resolution

If multiple streams need to modify the same file:
1. Check coordination file for ownership
2. If no owner defined, first stream to claim gets priority
3. Other streams must wait or negotiate through human operator

## Status Tracking

Stream statuses:
- **pending**: Not started, waiting for dependencies or assignment
- **in_progress**: Agent actively working
- **blocked**: Waiting for external dependency
- **completed**: All tasks done and tested
- **failed**: Encountered unrecoverable error

Update stream status in the stream file header when state changes.
`;
  }

  /**
   * Load all templates
   */
  loadTemplates() {
    const templates = [];

    if (!fs.existsSync(this.templatesPath)) {
      console.error(`Templates directory not found: ${this.templatesPath}`);
      return templates;
    }

    const files = fs.readdirSync(this.templatesPath);

    files.forEach(file => {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          templates.push(this.loadTemplate(file));
        } catch (error) {
          console.warn(`Failed to load template ${file}: ${error.message}`);
        }
      }
    });

    return templates;
  }

  /**
   * Load single template
   */
  loadTemplate(filename) {
    const filepath = path.join(this.templatesPath, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    return yaml.parse(content);
  }

  /**
   * Ensure directory exists
   */
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Export for testing and CLI usage
module.exports = IssueDecomposer;

// If this module is executed directly, handle CLI args
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node decompose-issue.js <issue_number> <issue_title> [issue_description]');
    process.exit(1);
  }

  const [issueNumber, issueTitle, ...descriptionParts] = args;
  const issueDescription = descriptionParts.join(' ') || '';

  const decomposer = new IssueDecomposer();
  decomposer.decomposeIssue(parseInt(issueNumber), issueTitle, issueDescription)
    .then(result => {
      console.log(`\n📁 Issue files created in: ${result.issuePath}`);
      console.log(`🚀 Ready to start work streams`);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}