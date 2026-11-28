/**
 * CLI PRD Commands
 *
 * Provides PRD (Product Requirements Document) management commands.
 * Implements subcommands for parse, extract-epics, summarize, and validate operations.
 *
 * @module cli/commands/prd
 * @requires ../../services/PRDService
 * @requires node:fs/promises (via lib/utils/fs)
 * @requires ora
 * @requires chalk
 * @requires path
 */

const PRDService = require('../../services/PRDService');
const ClaudeProvider = require('../../ai-providers/ClaudeProvider');
const fs = require('../../utils/fs');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const logger = require('../logger');

/**
 * Get PRD file path
 * @param {string} name - PRD name
 * @returns {string} Full path to PRD file
 */
function getPrdPath(name) {
  return path.join(process.cwd(), '.claude', 'prds', `${name}.md`);
}

/**
 * Resolve a `@file` content reference and confine it to the project root.
 * Prevents path-traversal (e.g. `../../../etc/passwd`) and absolute paths
 * pointing outside the current working directory.
 * @param {string} filePath - Path supplied after the `@` prefix
 * @returns {string} Absolute, confined path
 * @throws {Error} If the resolved path escapes the project root
 */
function resolveContentFilePath(filePath) {
  const root = process.cwd();
  const absolutePath = path.resolve(root, filePath);
  const relative = path.relative(root, absolutePath);

  // Outside the root when the relative path climbs out ('..' prefix) or, on
  // Windows, when the target is on a different drive (path.relative then
  // returns an absolute path). `relative === ''` is the root directory
  // itself — not a readable content file.
  const escapesRoot = relative === '..' || relative.startsWith('..' + path.sep);
  if (relative === '' || escapesRoot || path.isAbsolute(relative)) {
    throw new Error(`File path is outside the project root and not allowed: ${filePath}`);
  }

  return absolutePath;
}

/**
 * Read PRD file
 * @param {string} name - PRD name
 * @returns {Promise<string>} PRD content
 * @throws {Error} If file doesn't exist or can't be read
 */
async function readPrdFile(name) {
  const prdPath = getPrdPath(name);

  // Check if file exists
  const exists = await fs.pathExists(prdPath);
  if (!exists) {
    throw new Error(`PRD file not found: ${prdPath}`);
  }

  // Read file content
  return await fs.readFile(prdPath, 'utf8');
}

/**
 * List all PRDs
 */
async function prdList(argv) {
  const spinner = ora('Loading PRDs...').start();

  try {
    const prdsDir = path.join(process.cwd(), '.claude', 'prds');

    // Check if directory exists
    const dirExists = await fs.pathExists(prdsDir);
    if (!dirExists) {
      spinner.info(chalk.yellow('No PRDs directory found'));
      logger.log(chalk.yellow('\nCreate your first PRD with: autopm prd new <name>'));
      return;
    }

    // Read all PRD files
    const files = await fs.readdir(prdsDir);
    const prdFiles = files.filter(f => f.endsWith('.md'));

    if (prdFiles.length === 0) {
      spinner.info(chalk.yellow('No PRDs found'));
      logger.log(chalk.yellow('\nCreate your first PRD with: autopm prd new <name>'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${prdFiles.length} PRD(s)`));

    // Read and parse each PRD
    const prds = [];
    for (const file of prdFiles) {
      const filePath = path.join(prdsDir, file);
      const content = await fs.readFile(filePath, 'utf8');

      // Extract frontmatter
      const titleMatch = content.match(/^title:\s*(.+)$/m);
      const statusMatch = content.match(/^status:\s*(\w+)$/m);
      const priorityMatch = content.match(/^priority:\s*(P\d|Critical|High|Medium|Low)$/m);
      const createdMatch = content.match(/^created:\s*(.+)$/m);

      prds.push({
        name: file.replace('.md', ''),
        title: titleMatch ? titleMatch[1] : file.replace('.md', ''),
        status: statusMatch ? statusMatch[1] : 'unknown',
        priority: priorityMatch ? priorityMatch[1] : 'P2',
        created: createdMatch ? createdMatch[1] : 'unknown'
      });
    }

    // Sort by priority (P0 > P1 > P2 > P3)
    prds.sort((a, b) => {
      const priorities = { 'P0': 0, 'Critical': 0, 'P1': 1, 'High': 1, 'P2': 2, 'Medium': 2, 'P3': 3, 'Low': 3 };
      return (priorities[a.priority] || 2) - (priorities[b.priority] || 2);
    });

    // Display PRDs
    logger.log(chalk.green('\n📋 PRDs:\n'));

    prds.forEach((prd, index) => {
      const priorityColor = prd.priority.startsWith('P0') || prd.priority === 'Critical' ? chalk.red :
                           prd.priority.startsWith('P1') || prd.priority === 'High' ? chalk.yellow :
                           chalk.blue;

      const statusColor = prd.status === 'completed' ? chalk.green :
                         prd.status === 'in-progress' ? chalk.yellow :
                         prd.status === 'draft' ? chalk.gray :
                         chalk.white;

      logger.log(`${index + 1}. ${chalk.bold(prd.name)}`);
      logger.log(`   ${priorityColor(prd.priority.padEnd(10))} ${statusColor(prd.status.padEnd(12))} ${chalk.gray(prd.created)}`);
      if (prd.title !== prd.name) {
        logger.log(`   ${chalk.dim(prd.title)}`);
      }
      logger.log('');
    });

    logger.log(chalk.dim(`\nTotal: ${prds.length} PRD(s)`));
    logger.log(chalk.dim('Use: autopm prd show <name> to view details\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list PRDs'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Show PRD content
 * @param {Object} argv - Command arguments
 */
async function prdShow(argv) {
  const spinner = ora(`Loading PRD: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);
    spinner.succeed(chalk.green('PRD loaded'));

    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');
    logger.log(content);
    logger.log('\n' + chalk.gray('─'.repeat(80)) + '\n');

    const prdPath = getPrdPath(argv.name);
    logger.log(chalk.dim(`File: ${prdPath}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to show PRD'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
      logger.error(chalk.yellow('Use: autopm prd list to see available PRDs'));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Edit PRD in editor
 * @param {Object} argv - Command arguments
 */
async function prdEdit(argv) {
  const spinner = ora(`Opening PRD: ${argv.name}`).start();

  try {
    const prdPath = getPrdPath(argv.name);

    // Check if file exists
    const exists = await fs.pathExists(prdPath);
    if (!exists) {
      spinner.fail(chalk.red('PRD not found'));
      logger.error(chalk.red(`\nError: PRD file not found: ${prdPath}`));
      logger.error(chalk.yellow('Use: autopm prd list to see available PRDs'));
      return;
    }

    spinner.succeed(chalk.green('Opening editor...'));

    // Determine editor
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';

    // Spawn editor
    const { spawn } = require('child_process');
    const child = spawn(editor, [prdPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Wait for editor to close
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          logger.log(chalk.green('\n✓ PRD saved'));
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to edit PRD'));
    logger.error(chalk.red(`\nError: ${error.message}`));
  }
}

/**
 * Show PRD status
 * @param {Object} argv - Command arguments
 */
async function prdStatus(argv) {
  const spinner = ora(`Analyzing PRD: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);

    // Extract metadata
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const statusMatch = content.match(/^status:\s*(\w+)$/m);
    const priorityMatch = content.match(/^priority:\s*(P\d|Critical|High|Medium|Low)$/m);
    const createdMatch = content.match(/^created:\s*(.+)$/m);
    const authorMatch = content.match(/^author:\s*(.+)$/m);
    const timelineMatch = content.match(/^timeline:\s*(.+)$/m);

    // Count sections
    const sections = {
      'Problem Statement': content.includes('## Problem Statement'),
      'User Stories': content.includes('## User Stories'),
      'Technical Requirements': content.includes('## Technical Requirements'),
      'Success Metrics': content.includes('## Success Metrics'),
      'Implementation Plan': content.includes('## Implementation Plan'),
      'Risks': content.includes('## Risks')
    };

    const completedSections = Object.values(sections).filter(Boolean).length;
    const totalSections = Object.keys(sections).length;
    const completeness = Math.round((completedSections / totalSections) * 100);

    spinner.succeed(chalk.green('Status analyzed'));

    // Display status
    logger.log('\n' + chalk.bold('📊 PRD Status Report') + '\n');
    logger.log(chalk.gray('─'.repeat(50)) + '\n');

    logger.log(chalk.bold('Metadata:'));
    logger.log(`  Title:     ${titleMatch ? titleMatch[1] : 'N/A'}`);
    logger.log(`  Status:    ${statusMatch ? chalk.yellow(statusMatch[1]) : 'N/A'}`);
    logger.log(`  Priority:  ${priorityMatch ? chalk.red(priorityMatch[1]) : 'N/A'}`);
    logger.log(`  Created:   ${createdMatch ? createdMatch[1] : 'N/A'}`);
    logger.log(`  Author:    ${authorMatch ? authorMatch[1] : 'N/A'}`);
    logger.log(`  Timeline:  ${timelineMatch ? timelineMatch[1] : 'N/A'}`);

    logger.log('\n' + chalk.bold('Completeness:') + ` ${completeness}%`);

    const progressBar = '█'.repeat(Math.floor(completeness / 5)) +
                       '░'.repeat(20 - Math.floor(completeness / 5));
    logger.log(`  [${completeness >= 80 ? chalk.green(progressBar) :
                      completeness >= 50 ? chalk.yellow(progressBar) :
                      chalk.red(progressBar)}]`);

    logger.log('\n' + chalk.bold('Sections:'));
    Object.entries(sections).forEach(([name, exists]) => {
      const icon = exists ? chalk.green('✓') : chalk.red('✗');
      logger.log(`  ${icon} ${name}`);
    });

    // Statistics
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;
    const chars = content.length;

    logger.log('\n' + chalk.bold('Statistics:'));
    logger.log(`  Lines:     ${lines}`);
    logger.log(`  Words:     ${words}`);
    logger.log(`  Chars:     ${chars}`);

    logger.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

    const prdPath = getPrdPath(argv.name);
    logger.log(chalk.dim(`File: ${prdPath}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to analyze status'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\nError: ${error.message}`));
    } else {
      logger.error(chalk.red(`\nError: ${error.message}`));
    }
  }
}

/**
 * Create new PRD from content (non-interactive mode)
 * @param {Object} argv - Command arguments
 */
async function prdNewFromContent(argv) {
  const spinner = ora(`Creating PRD: ${argv.name}`).start();

  try {
    let content = argv.content;

    // Check if content is a file reference (starts with @)
    if (content.startsWith('@')) {
      const filePath = content.slice(1); // Remove @ prefix

      let absolutePath;
      try {
        absolutePath = resolveContentFilePath(filePath);
      } catch (err) {
        spinner.fail(chalk.red('Invalid source file path'));
        logger.error(chalk.red(`\nError: ${err.message}`));
        process.exit(1);
      }

      const fileExists = await fs.pathExists(absolutePath);
      if (!fileExists) {
        spinner.fail(chalk.red('Source file not found'));
        logger.error(chalk.red(`\nError: File not found: ${absolutePath}`));
        process.exit(1);
      }

      const fileStat = await fs.stat(absolutePath);
      if (!fileStat.isFile()) {
        spinner.fail(chalk.red('Source path is not a file'));
        logger.error(chalk.red(`\nError: Not a regular file: ${absolutePath}`));
        process.exit(1);
      }

      content = await fs.readFile(absolutePath, 'utf8');
      spinner.text = `Reading content from: ${absolutePath}`;
    }

    // Ensure PRDs directory exists
    const prdsDir = path.join(process.cwd(), '.claude', 'prds');
    await fs.ensureDir(prdsDir);

    // Check if PRD already exists
    const prdPath = getPrdPath(argv.name);
    const exists = await fs.pathExists(prdPath);
    if (exists && !argv.force) {
      spinner.fail(chalk.red('PRD already exists'));
      logger.error(chalk.red(`\nError: PRD file already exists: ${prdPath}`));
      logger.error(chalk.yellow('Use --force to overwrite'));
      process.exit(1);
    }

    // Add frontmatter if not present
    if (!content.startsWith('---')) {
      const timestamp = new Date().toISOString();
      const frontmatter = `---
title: ${argv.name}
status: draft
priority: ${argv.priority || 'P2'}
created: ${timestamp}
author: ${process.env.USER || 'unknown'}
timeline: ${argv.timeline || 'TBD'}
---

`;
      content = frontmatter + content;
    }

    // Write PRD file
    await fs.writeFile(prdPath, content);
    spinner.succeed(chalk.green('PRD created successfully'));

    logger.log(chalk.green(`\n✅ PRD created: ${prdPath}`));
    logger.log(chalk.cyan('\n📋 Next steps:'));
    logger.log(`  1. Review: ${chalk.yellow('autopm prd show ' + argv.name)}`);
    logger.log(`  2. Edit:   ${chalk.yellow('autopm prd edit ' + argv.name)}`);
    logger.log(`  3. Parse:  ${chalk.yellow('autopm prd parse ' + argv.name)}`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to create PRD'));
    logger.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Create new PRD
 * @param {Object} argv - Command arguments
 */
async function prdNew(argv) {
  // Check if content is provided (non-interactive mode)
  if (argv.content) {
    return await prdNewFromContent(argv);
  }

  // Check if AI mode is enabled
  if (argv.ai) {
    return await prdNewWithAI(argv);
  }

  // Standard mode: spawn prd-new.js
  const spinner = ora(`Creating PRD: ${argv.name}`).start();

  try {
    // Build script path
    const scriptPath = path.join(process.cwd(), '.claude', 'scripts', 'pm', 'prd-new.js');

    // Debug: Show what we're looking for
    if (process.env.DEBUG) {
      logger.log(chalk.gray(`\nDebug: Looking for script at: ${scriptPath}`));
      logger.log(chalk.gray(`Debug: Current directory: ${process.cwd()}`));
    }

    // Check if script exists
    const scriptExists = await fs.pathExists(scriptPath);
    if (!scriptExists) {
      spinner.fail(chalk.red('PRD creation script not found'));
      logger.error(chalk.red('\nError: .claude/scripts/pm/prd-new.js not found'));
      logger.error(chalk.red(`Expected location: ${scriptPath}`));
      logger.error(chalk.yellow('\nSolution: Run "autopm install" to install the framework'));

      // Show what directories DO exist
      const claudeDir = path.join(process.cwd(), '.claude');
      const scriptsDir = path.join(claudeDir, 'scripts');
      const pmDir = path.join(scriptsDir, 'pm');

      logger.error(chalk.gray('\nDirectory status:'));
      logger.error(chalk.gray(`  .claude/ exists: ${await fs.pathExists(claudeDir)}`));
      logger.error(chalk.gray(`  .claude/scripts/ exists: ${await fs.pathExists(scriptsDir)}`));
      logger.error(chalk.gray(`  .claude/scripts/pm/ exists: ${await fs.pathExists(pmDir)}`));

      process.exit(1);
    }

    // Build arguments
    const args = [scriptPath, argv.name];
    if (argv.template) {
      args.push('--template', argv.template);
    }

    if (process.env.DEBUG) {
      logger.log(chalk.gray(`Debug: Running: node ${args.join(' ')}`));
    }

    spinner.stop();

    logger.log(chalk.cyan(`\n🚀 Starting PRD wizard for: ${argv.name}`));
    if (argv.template) {
      logger.log(chalk.cyan(`📝 Using template: ${argv.template}`));
    }
    logger.log(chalk.gray('Press Ctrl+C to cancel\n'));

    // Spawn interactive process
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env }
    });

    // Wait for completion
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          logger.log(chalk.green('\n✓ PRD created successfully'));
          resolve();
        } else if (code === null) {
          logger.error(chalk.yellow('\n⚠ Process was terminated'));
          reject(new Error('Process terminated'));
        } else {
          logger.error(chalk.red(`\n✗ PRD creation failed with exit code ${code}`));
          reject(new Error(`PRD creation failed with code ${code}`));
        }
      });

      child.on('error', (err) => {
        logger.error(chalk.red(`\n✗ Failed to start process: ${err.message}`));
        reject(err);
      });
    });

  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));

    if (error.message.includes('terminated')) {
      logger.error(chalk.yellow('Operation cancelled by user'));
    } else if (error.code === 'ENOENT') {
      logger.error(chalk.red('Node.js executable not found'));
      logger.error(chalk.yellow('Ensure Node.js is installed and in PATH'));
    }

    process.exit(1);
  }
}

/**
 * Create new PRD with AI assistance
 * @param {Object} argv - Command arguments
 */
async function prdNewWithAI(argv) {
  logger.log(chalk.cyan(`\n🤖 AI-Powered PRD Creation: ${argv.name}`));
  logger.log(chalk.cyan('══════════════════════════════════════\n'));

  const spinner = ora('Initializing...').start();

  try {
    // Check if PRD already exists
    const prdPath = getPrdPath(argv.name);
    const exists = await fs.pathExists(prdPath);
    if (exists) {
      spinner.fail(chalk.red('PRD already exists'));
      logger.error(chalk.red(`\nError: PRD file already exists: ${prdPath}`));
      logger.error(chalk.yellow('Use: autopm prd edit ' + argv.name + ' to modify it'));
      process.exit(1);
    }

    // Create PRDs directory if needed
    const prdsDir = path.join(process.cwd(), '.claude', 'prds');
    await fs.ensureDir(prdsDir);

    spinner.stop();

    // Gather information from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, resolve);
    });

    logger.log(chalk.cyan('🧠 Let\'s gather some information for AI...\n'));

    const context = {};

    // Product Vision
    logger.log(chalk.bold('📌 Product Vision'));
    logger.log(chalk.gray('What problem are you solving? What\'s the vision?'));
    context.vision = await prompt(chalk.cyan('Vision: '));

    // Target Users
    logger.log(chalk.bold('\n👥 Target Users'));
    logger.log(chalk.gray('Who will use this? What are their needs?'));
    context.users = await prompt(chalk.cyan('Target users: '));

    // Key Features (simplified - just high level)
    logger.log(chalk.bold('\n✨ Key Features'));
    logger.log(chalk.gray('What are the main capabilities? (brief description)'));
    context.features = await prompt(chalk.cyan('Features: '));

    // Success Metrics
    logger.log(chalk.bold('\n📊 Success Metrics'));
    logger.log(chalk.gray('How will you measure success?'));
    context.metrics = await prompt(chalk.cyan('Metrics: '));

    // Priority
    logger.log(chalk.bold('\n🎯 Priority'));
    const priority = await prompt(chalk.cyan('Priority (P0/P1/P2/P3) [P2]: '));
    context.priority = priority || 'P2';

    // Timeline
    logger.log(chalk.bold('\n⏰ Timeline'));
    const timeline = await prompt(chalk.cyan('Timeline [Q1 2025]: '));
    context.timeline = timeline || 'Q1 2025';

    rl.close();

    // Build AI prompt
    const aiPrompt = `Generate a comprehensive Product Requirements Document (PRD) based on the following information:

**PRD Name**: ${argv.name}
**Priority**: ${context.priority}
**Timeline**: ${context.timeline}

**Product Vision**:
${context.vision}

**Target Users**:
${context.users}

**Key Features**:
${context.features}

**Success Metrics**:
${context.metrics}

Please generate a complete, professional PRD with the following sections:
1. Executive Summary
2. Problem Statement (with Background, Current State, Desired State)
3. Target Users (with User Personas and User Stories)
4. Key Features (organized by priority: Must Have, Should Have, Nice to Have)
5. Success Metrics (with KPIs and Measurement Plan)
6. Technical Requirements (Architecture, Non-Functional Requirements, Dependencies)
7. Implementation Plan (broken into phases)
8. Risks and Mitigation
9. Open Questions
10. Appendix (References, Glossary, Changelog)

Format the output as a proper markdown document with frontmatter (status, priority, created, author, timeline).

Make it comprehensive, actionable, and professional. Expand on the provided information with industry best practices.`;

    // Initialize AI provider and PRD service
    const provider = new ClaudeProvider();
    const prdService = new PRDService({ provider });
    let prdContent = '';

    if (argv.stream) {
      // Streaming mode
      const genSpinner = ora('Generating PRD with AI...').start();
      genSpinner.stop();

      logger.log(chalk.cyan('\n\n🤖 AI is generating your PRD...\n'));
      logger.log(chalk.gray('─'.repeat(80)) + '\n');

      for await (const chunk of prdService.generatePRDStream(aiPrompt)) {
        process.stdout.write(chunk);
        prdContent += chunk;
      }

      logger.log('\n\n' + chalk.gray('─'.repeat(80)));
    } else {
      // Non-streaming mode
      const genSpinner = ora('Generating PRD with AI...').start();
      prdContent = await prdService.generatePRD(aiPrompt);
      genSpinner.succeed(chalk.green('PRD generated'));
    }

    // Save to file
    const saveSpinner = ora('Saving PRD...').start();
    await fs.writeFile(prdPath, prdContent);
    saveSpinner.succeed(chalk.green('PRD saved'));

    logger.log(chalk.green('\n✅ AI-powered PRD created successfully!'));
    logger.log(chalk.cyan(`📄 File: ${prdPath}\n`));

    // Show next steps
    logger.log(chalk.bold('📋 What You Can Do Next:\n'));
    logger.log(`  ${chalk.cyan('1.')} Review and edit: ${chalk.yellow('autopm prd edit ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('2.')} Check status:    ${chalk.yellow('autopm prd status ' + argv.name)}`);
    logger.log(`  ${chalk.cyan('3.')} Parse to epic:   ${chalk.yellow('autopm prd parse ' + argv.name + ' --ai')}`);
    logger.log(`  ${chalk.cyan('4.')} Extract epics:   ${chalk.yellow('autopm prd extract-epics ' + argv.name)}\n`);

  } catch (error) {
    logger.error(chalk.red(`\n✗ Error: ${error.message}`));

    if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('API key')) {
      logger.error(chalk.red('\n✗ Error: API key not configured'));
      logger.error(chalk.yellow('\n💡 Set your API key in .env file:'));
      logger.error(chalk.cyan('  ANTHROPIC_API_KEY=sk-ant-api03-...'));
    } else if (process.env.DEBUG) {
      logger.error(chalk.gray('\nStack trace:'));
      logger.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

/**
 * Parse PRD with AI
 * @param {Object} argv - Command arguments
 */
async function prdParse(argv) {
  const spinner = ora(`Parsing PRD: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);
    const prdService = new PRDService();

    if (argv.stream) {
      // Streaming mode
      spinner.text = 'Streaming PRD analysis...';

      for await (const chunk of prdService.parseStream(content)) {
        process.stdout.write(chunk);
      }

      spinner.succeed(chalk.green('PRD parsed successfully'));
    } else {
      // Non-streaming mode
      const result = await prdService.parse(content);

      spinner.succeed(chalk.green('PRD parsed successfully'));

      if (result.epics && result.epics.length > 0) {
        logger.log(chalk.green(`\nFound ${result.epics.length} epic(s):`));
        result.epics.forEach(epic => {
          logger.log(`  - ${epic.id}: ${epic.title}`);
        });
      }
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to parse PRD'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\n✗ Error: PRD file not found`));
      logger.error(chalk.red(`  File: ${getPrdPath(argv.name)}`));
      logger.error(chalk.yellow('\n💡 Use: autopm prd list to see available PRDs'));
    } else if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('API key')) {
      logger.error(chalk.red(`\n✗ Error: API key not configured`));
      logger.error(chalk.yellow('\n💡 Set your API key in .env file:'));
      logger.error(chalk.cyan('  ANTHROPIC_API_KEY=sk-ant-api03-...'));
    } else if (error.message.includes('Failed to read')) {
      logger.error(chalk.red(`\n✗ Error: Cannot read PRD file`));
      logger.error(chalk.red(`  ${error.message}`));
    } else {
      logger.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (process.env.DEBUG) {
        logger.error(chalk.gray('\nStack trace:'));
        logger.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

/**
 * Extract epics from PRD
 * @param {Object} argv - Command arguments
 */
async function prdExtractEpics(argv) {
  const spinner = ora(`Extracting epics from: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);
    const prdService = new PRDService();

    if (argv.stream) {
      // Streaming mode
      spinner.text = 'Streaming epic extraction...';

      for await (const chunk of prdService.extractEpicsStream(content)) {
        process.stdout.write(chunk);
      }

      spinner.succeed(chalk.green('Epics extracted successfully'));
    } else {
      // Non-streaming mode
      const epics = await prdService.extractEpics(content);

      spinner.succeed(chalk.green(`Found ${epics.length} epics`));

      logger.log(chalk.green(`\nExtracted ${epics.length} epic(s):`));
      epics.forEach((epic, index) => {
        logger.log(`\n${index + 1}. ${epic.title || epic.id}`);
        if (epic.description) {
          logger.log(`   ${epic.description}`);
        }
      });
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to extract epics'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\n✗ Error: PRD file not found`));
      logger.error(chalk.red(`  File: ${getPrdPath(argv.name)}`));
      logger.error(chalk.yellow('\n💡 Use: autopm prd list to see available PRDs'));
    } else if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('API key')) {
      logger.error(chalk.red(`\n✗ Error: API key not configured`));
      logger.error(chalk.yellow('\n💡 Set your API key in .env file:'));
      logger.error(chalk.cyan('  ANTHROPIC_API_KEY=sk-ant-api03-...'));
    } else if (error.message.includes('Failed to read')) {
      logger.error(chalk.red(`\n✗ Error: Cannot read PRD file`));
      logger.error(chalk.red(`  ${error.message}`));
    } else {
      logger.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (process.env.DEBUG) {
        logger.error(chalk.gray('\nStack trace:'));
        logger.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

/**
 * Generate PRD summary
 * @param {Object} argv - Command arguments
 */
async function prdSummarize(argv) {
  const spinner = ora(`Generating summary for: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);
    const prdService = new PRDService();

    if (argv.stream) {
      // Streaming mode
      spinner.text = 'Streaming summary generation...';

      for await (const chunk of prdService.summarizeStream(content)) {
        process.stdout.write(chunk);
      }

      spinner.succeed(chalk.green('Summary generated successfully'));
    } else {
      // Non-streaming mode
      const summary = await prdService.summarize(content);

      spinner.succeed(chalk.green('Summary generated successfully'));

      logger.log(chalk.green('\nPRD Summary:'));
      logger.log(summary);
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to generate summary'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\n✗ Error: PRD file not found`));
      logger.error(chalk.red(`  File: ${getPrdPath(argv.name)}`));
      logger.error(chalk.yellow('\n💡 Use: autopm prd list to see available PRDs'));
    } else if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('API key')) {
      logger.error(chalk.red(`\n✗ Error: API key not configured`));
      logger.error(chalk.yellow('\n💡 Set your API key in .env file:'));
      logger.error(chalk.cyan('  ANTHROPIC_API_KEY=sk-ant-api03-...'));
    } else if (error.message.includes('Failed to read')) {
      logger.error(chalk.red(`\n✗ Error: Cannot read PRD file`));
      logger.error(chalk.red(`  ${error.message}`));
    } else {
      logger.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (process.env.DEBUG) {
        logger.error(chalk.gray('\nStack trace:'));
        logger.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

/**
 * Validate PRD structure
 * @param {Object} argv - Command arguments
 */
async function prdValidate(argv) {
  const spinner = ora(`Validating PRD: ${argv.name}`).start();

  try {
    const content = await readPrdFile(argv.name);
    const prdService = new PRDService();
    const result = await prdService.validate(content);

    if (result.valid) {
      spinner.succeed(chalk.green('PRD is valid'));
      logger.log(chalk.green('\n✓ Validation passed - PRD structure is correct'));
    } else {
      spinner.fail(chalk.red(`PRD validation failed - ${result.issues.length} issues found`));
      logger.error(chalk.red(`\n✗ Validation failed - ${result.issues.length} issue(s):`));
      result.issues.forEach((issue, index) => {
        logger.error(chalk.red(`  ${index + 1}. ${issue}`));
      });
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to validate PRD'));

    if (error.message.includes('not found')) {
      logger.error(chalk.red(`\n✗ Error: PRD file not found`));
      logger.error(chalk.red(`  File: ${getPrdPath(argv.name)}`));
      logger.error(chalk.yellow('\n💡 Use: autopm prd list to see available PRDs'));
    } else if (error.message.includes('Failed to read')) {
      logger.error(chalk.red(`\n✗ Error: Cannot read PRD file`));
      logger.error(chalk.red(`  ${error.message}`));
    } else {
      logger.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (process.env.DEBUG) {
        logger.error(chalk.gray('\nStack trace:'));
        logger.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

/**
 * Command builder - registers all subcommands
 * @param {Object} yargs - Yargs instance
 * @returns {Object} Configured yargs instance
 */
function builder(yargs) {
  return yargs
    .command(
      'list',
      'List all PRDs',
      (yargs) => {
        return yargs
          .example('autopm prd list', 'Show all PRDs');
      },
      prdList  // Handler
    )
    .command(
      'new <name>',
      'Create new PRD interactively or from existing content',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (use-kebab-case)',
            type: 'string'
          })
          .option('template', {
            describe: 'Template to use (api-feature, ui-feature, bug-fix, data-migration, documentation)',
            type: 'string',
            alias: 't'
          })
          .option('content', {
            describe: 'PRD content: inline text or @filepath to read from file (non-interactive)',
            type: 'string',
            alias: 'c'
          })
          .option('force', {
            describe: 'Overwrite existing PRD file',
            type: 'boolean',
            alias: 'f',
            default: false
          })
          .option('priority', {
            describe: 'PRD priority (P0/P1/P2/P3)',
            type: 'string',
            alias: 'p',
            default: 'P2'
          })
          .option('timeline', {
            describe: 'PRD timeline (e.g., Q1 2025)',
            type: 'string'
          })
          .option('ai', {
            describe: 'Use AI to generate PRD content (requires ANTHROPIC_API_KEY)',
            type: 'boolean',
            default: false
          })
          .option('stream', {
            describe: 'Stream AI output in real-time (only with --ai)',
            type: 'boolean',
            default: false
          })
          .example('autopm prd new my-feature', 'Create PRD with wizard')
          .example('autopm prd new payment-api --template api-feature', 'Create PRD from template')
          .example('autopm prd new my-feature --content @/path/to/draft.md', 'Create from file')
          .example('autopm prd new my-feature --content "# My PRD\\n\\nDescription..."', 'Create from inline')
          .example('autopm prd new my-feature --ai', 'AI-powered PRD generation')
          .example('autopm prd new my-feature --ai --stream', 'AI generation with streaming');
      },
      prdNew  // Handler
    )
    .command(
      'show <name>',
      'Display PRD content',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .example('autopm prd show my-feature', 'Display PRD content');
      },
      prdShow  // Handler
    )
    .command(
      'edit <name>',
      'Edit PRD in your editor',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .example('autopm prd edit my-feature', 'Open PRD in editor')
          .example('EDITOR=code autopm prd edit my-feature', 'Open PRD in VS Code');
      },
      prdEdit  // Handler
    )
    .command(
      'status <name>',
      'Show PRD status and completeness',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .example('autopm prd status my-feature', 'Show PRD status report');
      },
      prdStatus  // Handler
    )
    .command(
      'parse <name>',
      'Parse PRD with AI analysis',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .option('stream', {
            describe: 'Use streaming mode',
            type: 'boolean',
            default: false
          })
          .option('ai', {
            describe: 'Use AI for parsing',
            type: 'boolean',
            default: true
          });
      },
      prdParse  // Handler
    )
    .command(
      'extract-epics <name>',
      'Extract epics from PRD',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .option('stream', {
            describe: 'Use streaming mode',
            type: 'boolean',
            default: false
          });
      },
      prdExtractEpics  // Handler
    )
    .command(
      'summarize <name>',
      'Generate PRD summary',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          })
          .option('stream', {
            describe: 'Use streaming mode',
            type: 'boolean',
            default: false
          });
      },
      prdSummarize  // Handler
    )
    .command(
      'validate <name>',
      'Validate PRD structure',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'PRD name (without .md extension)',
            type: 'string'
          });
      },
      prdValidate  // Handler
    )
    .demandCommand(1, 'You must specify a PRD action')
    .strictCommands()
    .help();
}

/**
 * Command export
 */
module.exports = {
  command: 'prd',
  describe: 'Manage PRD (Product Requirements Documents)',
  builder,
  handler: (argv) => {
    // This is just for catching the base command without subcommand
    if (!argv._.includes('prd') || argv._.length === 1) {
      logger.log(chalk.yellow('\nPlease specify a PRD command\n'));
      logger.log('Usage: autopm prd <command>\n');
      logger.log('Available commands:');
      logger.log('  list                  List all PRDs');
      logger.log('  new <name>            Create new PRD');
      logger.log('  show <name>           Display PRD');
      logger.log('  edit <name>           Edit PRD');
      logger.log('  status <name>         Show PRD status');
      logger.log('  parse <name>          Parse PRD with AI');
      logger.log('  extract-epics <name>  Extract epics');
      logger.log('  summarize <name>      Generate summary');
      logger.log('  validate <name>       Validate structure');
      logger.log('\nUse: autopm prd <command> --help for more info\n');
    }
  },
  handlers: {
    list: prdList,
    new: prdNew,
    show: prdShow,
    edit: prdEdit,
    status: prdStatus,
    parse: prdParse,
    extractEpics: prdExtractEpics,
    summarize: prdSummarize,
    validate: prdValidate
  },
  // Exposed for security regression tests
  resolveContentFilePath
};
