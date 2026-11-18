/**
 * Interactive Guide for ClaudeAutoPM
 * Provides step-by-step guidance with framed instructions
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class InteractiveGuide {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.shouldExit = false;
  }

  /**
   * Create a framed box around text
   */
  createFrame(content, title = '', width = 80) {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length), title.length + 4);
    const frameWidth = Math.max(width, maxLength + 4);

    let frame = '';

    // Top border
    frame += '┌' + '─'.repeat(frameWidth - 2) + '┐\n';

    // Title if provided
    if (title) {
      const titlePadding = Math.floor((frameWidth - title.length - 4) / 2);
      frame += '│' + ' '.repeat(titlePadding) + `[ ${title} ]` + ' '.repeat(frameWidth - titlePadding - title.length - 6) + '│\n';
      frame += '├' + '─'.repeat(frameWidth - 2) + '┤\n';
    }

    // Content lines
    lines.forEach(line => {
      const padding = frameWidth - line.length - 3;
      frame += '│ ' + line + ' '.repeat(padding) + '│\n';
    });

    // Bottom border
    frame += '└' + '─'.repeat(frameWidth - 2) + '┘\n';

    return frame;
  }

  /**
   * Create a step frame
   */
  createStepFrame(stepNumber, title, instructions, commands = []) {
    let content = `STEP ${stepNumber}: ${title}\n\n`;
    content += instructions;

    if (commands.length > 0) {
      content += '\n\nCommands to run:\n';
      commands.forEach(cmd => {
        content += `  $ ${cmd}\n`;
      });
    }

    return this.createFrame(content, `Step ${stepNumber}`, 80);
  }

  /**
   * Ask user for input with options
   */
  async askChoice(question, options) {
    return new Promise((resolve) => {
      console.log(question);
      options.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option}`);
      });
      console.log();

      this.rl.question('Enter your choice (number): ', (answer) => {
        const choice = parseInt(answer) - 1;
        if (choice >= 0 && choice < options.length) {
          resolve(choice);
        } else {
          console.log('Invalid choice. Please try again.\n');
          this.askChoice(question, options).then(resolve);
        }
      });
    });
  }

  /**
   * Wait for user confirmation
   */
  async waitForConfirmation(message = 'Press Enter to continue...') {
    return new Promise((resolve) => {
      this.rl.question(`\n${message}`, () => {
        resolve();
      });
    });
  }

  /**
   * Check if ClaudeAutoPM is already installed
   */
  isInstalled() {
    return fs.existsSync('.claude') && fs.existsSync('.claude/config.json');
  }

  /**
   * Check system requirements
   */
  checkRequirements() {
    const checks = [];

    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      checks.push(`✅ Node.js: ${nodeVersion}`);
    } catch {
      checks.push('❌ Node.js: Not found');
    }

    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      checks.push(`✅ npm: v${npmVersion}`);
    } catch {
      checks.push('❌ npm: Not found');
    }

    try {
      execSync('git --version', { encoding: 'utf8' });
      checks.push('✅ Git: Available');
    } catch {
      checks.push('❌ Git: Not found');
    }

    return checks;
  }

  /**
   * Main guide entry point
   */
  async start() {
    console.clear();
    console.log(this.createFrame(
      '🎯 ClaudeAutoPM - AI-Powered Project Management System\n\n' +
      'Welcome! This interactive guide will help you get started with\n' +
      'ClaudeAutoPM and show you all available options.\n\n' +
      'ClaudeAutoPM transforms PRDs into epics, epics into issues,\n' +
      'and issues into production code with full traceability.',
      'Welcome to ClaudeAutoPM'
    ));

    const mainOptions = [
      '📦 Install ClaudeAutoPM in this project',
      '🔧 Configure existing installation',
      '🤖 Learn about agent teams',
      '📋 Start your first PM workflow',
      '🆘 Troubleshoot installation issues',
      '📚 View complete documentation',
      '🚪 Exit guide'
    ];

    while (!this.shouldExit) {
      const choice = await this.askChoice(
        '\n🚀 What would you like to do?',
        mainOptions
      );

      switch (choice) {
        case 0: await this.installationFlow(); break;
        case 1: await this.configurationFlow(); break;
        case 2: await this.agentTeamsFlow(); break;
        case 3: await this.firstProjectFlow(); break;
        case 4: await this.troubleshootingFlow(); break;
        case 5: await this.documentationFlow(); break;
        case 6:
          console.log('\n👋 Thank you for using ClaudeAutoPM!');
          this.rl.close();
          return;
      }
    }
  }

  /**
   * Installation workflow
   */
  async installationFlow() {
    console.clear();

    if (this.isInstalled()) {
      console.log(this.createFrame(
        '✅ ClaudeAutoPM is already installed in this project!\n\n' +
        'Found existing .claude directory with configuration.\n' +
        'You can proceed to configure or use the system.',
        'Already Installed'
      ));
      await this.waitForConfirmation();
      return;
    }

    // Step 1: System requirements
    console.log(this.createStepFrame(
      1,
      'Check System Requirements',
      'Let\'s verify your system has everything needed for ClaudeAutoPM:'
    ));

    const requirements = this.checkRequirements();
    requirements.forEach(req => console.log(`  ${req}`));

    const hasErrors = requirements.some(req => req.includes('❌'));
    if (hasErrors) {
      console.log(this.createFrame(
        '⚠️  Some requirements are missing!\n\n' +
        'Please install the missing components and run the guide again.\n\n' +
        'Required:\n' +
        '• Node.js 16+ (https://nodejs.org)\n' +
        '• npm (comes with Node.js)\n' +
        '• Git (https://git-scm.com)',
        'Missing Requirements'
      ));
      await this.waitForConfirmation();
      return;
    }

    await this.waitForConfirmation('✅ All requirements met! Press Enter to continue...');

    // Step 2: Choose installation preset
    console.log(this.createStepFrame(
      2,
      'Choose Installation Preset',
      'ClaudeAutoPM offers different presets based on your project needs:\n\n' +
      '• Minimal: Traditional development, no containers\n' +
      '• Docker-only: Container-first with adaptive execution\n' +
      '• Full DevOps: Docker + Kubernetes with CI/CD (RECOMMENDED)\n' +
      '• Performance: Maximum parallelization for large projects\n' +
      '• Custom: Configure each option manually'
    ));

    const presetChoice = await this.askChoice(
      'Which preset fits your project?',
      ['Minimal', 'Docker-only', 'Full DevOps (Recommended)', 'Performance', 'Custom']
    );

    const presets = ['minimal', 'docker-only', 'full', 'performance', 'custom'];
    const selectedPreset = presets[presetChoice];

    // Map preset names to numeric choices that install script expects
    const presetToChoice = {
      'minimal': '1',
      'docker-only': '2',
      'full': '3',
      'performance': '4',
      'custom': '5'
    };
    const choiceNumber = presetToChoice[selectedPreset];

    // Step 3: Run installation
    console.log(this.createStepFrame(
      3,
      'Run Installation',
      `Installing ClaudeAutoPM with "${selectedPreset}" preset...\n\n` +
      'This will:\n' +
      '• Create .claude directory with agents and commands\n' +
      '• Set up configuration files\n' +
      '• Install Git hooks (if applicable)\n' +
      '• Configure team management',
      [`autopm install ${choiceNumber}`]
    ));

    await this.waitForConfirmation('Ready to install? Press Enter to continue...');

    try {
      console.log('\n🔄 Installing...\n');

      // Pass the choice via stdin to the install script
      const child = require('child_process').spawn('node', [
        path.join(__dirname, '../../bin/autopm.js'),
        'install'
      ], {
        stdio: ['pipe', 'inherit', 'inherit'],
        cwd: process.cwd()
      });

      // Send the choice to stdin and close it
      child.stdin.write(choiceNumber + '\n');
      child.stdin.end();

      // Wait for the process to complete
      await new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Installation failed with exit code ${code}`));
          }
        });
        child.on('error', reject);
      });

      // Installation script already shows success message, so just show next steps
      console.log('\n' + this.createFrame(
        '🎯 Installation Complete - How to Use ClaudeAutoPM\n\n' +
        'ClaudeAutoPM is now installed! To start using it:\n\n' +
        '1. 📂 Open Claude Code in this directory\n' +
        '2. 🔓 If needed: claude --dangerously-skip-permissions\n' +
        '3. ✅ Test with: /pm:validate\n\n' +
        'Then you can:\n' +
        '• 🔧 Configure your provider (GitHub/Azure DevOps)\n' +
        '• 🤖 Learn about agent teams\n' +
        '• 📋 Start your first PM workflow\n\n' +
        '💡 All PM commands (/pm:xxx) work only in Claude Code!',
        'Ready to Use'
      ));

      // Ask user what they want to do next instead of just continuing
      const nextChoice = await this.askChoice(
        '\n🚀 What would you like to do next?',
        [
          '🔧 Configure provider integration',
          '🤖 Learn about agent teams',
          '📋 Start first PM workflow',
          '📚 View documentation',
          '🚪 Exit guide'
        ]
      );

      switch (nextChoice) {
        case 0: await this.configurationFlow(); break;
        case 1: await this.agentTeamsFlow(); break;
        case 2: await this.firstProjectFlow(); break;
        case 3: await this.documentationFlow(); break;
        case 4:
          console.log('\n👋 Thank you for using ClaudeAutoPM!');
          console.log('🎯 Run "autopm guide" anytime to access this guide again.');
          this.shouldExit = true;
          this.rl.close();
          return;
      }

    } catch (error) {
      console.log(this.createFrame(
        '❌ Installation failed!\n\n' +
        `Error: ${error.message}\n\n` +
        'Please check the error above and try again.\n' +
        'For help, choose "Troubleshoot installation issues" from main menu.',
        'Installation Error'
      ));
      await this.waitForConfirmation();
    }
  }

  /**
   * Configuration workflow
   */
  async configurationFlow() {
    console.clear();

    if (!this.isInstalled()) {
      console.log(this.createFrame(
        '⚠️  ClaudeAutoPM is not installed in this project!\n\n' +
        'Please install ClaudeAutoPM first by selecting the installation option\n' +
        'from the main menu.',
        'Not Installed'
      ));
      await this.waitForConfirmation();
      return;
    }

    console.log(this.createStepFrame(
      1,
      'Configure Project Management Provider',
      'ClaudeAutoPM can integrate with different project management systems:\n\n' +
      '• GitHub Issues: Full GitHub integration with Issues and Projects\n' +
      '• Azure DevOps: Azure Boards and Pipelines integration\n' +
      '• Local Only: Store everything locally (no external sync)'
    ));

    const providerChoice = await this.askChoice(
      'Which provider would you like to use?',
      ['GitHub Issues', 'Azure DevOps', 'Local Only (no external sync)']
    );

    switch (providerChoice) {
      case 0:
        console.log(this.createStepFrame(
          2,
          'Configure GitHub Integration',
          'To use GitHub integration, you need:\n\n' +
          '1. A GitHub Personal Access Token with "repo" scope\n' +
          '2. Set environment variable: GITHUB_TOKEN=your_token\n\n' +
          'You can create a token at:\n' +
          'https://github.com/settings/tokens\n\n' +
          'After setting the token, ClaudeAutoPM will automatically\n' +
          'sync epics and issues with GitHub.',
          ['export GITHUB_TOKEN=your_github_token_here']
        ));
        break;

      case 1:
        console.log(this.createStepFrame(
          2,
          'Configure Azure DevOps Integration',
          'To use Azure DevOps integration, you need:\n\n' +
          '1. Azure DevOps Personal Access Token\n' +
          '2. Organization and Project names\n\n' +
          'Set these environment variables:\n' +
          '• AZURE_DEVOPS_PAT=your_pat\n' +
          '• AZURE_DEVOPS_ORG=your_org\n' +
          '• AZURE_DEVOPS_PROJECT=your_project',
          [
            'export AZURE_DEVOPS_PAT=your_pat_here',
            'export AZURE_DEVOPS_ORG=your_org_name',
            'export AZURE_DEVOPS_PROJECT=your_project_name'
          ]
        ));
        break;

      case 2:
        console.log(this.createStepFrame(
          2,
          'Local Configuration Complete',
          'ClaudeAutoPM is configured for local-only operation.\n\n' +
          'All PRDs, epics, and issues will be stored in:\n' +
          '• .claude/work/ directory\n\n' +
          'You can switch to external providers later by\n' +
          'running this configuration flow again.'
        ));
        break;
    }

    await this.waitForConfirmation();
  }

  /**
   * Agent teams workflow
   */
  async agentTeamsFlow() {
    console.clear();

    console.log(this.createStepFrame(
      1,
      'Understanding Agent Teams',
      'ClaudeAutoPM uses specialized AI agent teams for different contexts:\n\n' +
      '• base: Core agents (code-analyzer, test-runner, file-analyzer)\n' +
      '• devops: Docker, Kubernetes, CI/CD, infrastructure\n' +
      '• frontend: React, JavaScript, UI/UX, testing\n' +
      '• python_backend: Python, FastAPI, Flask, databases\n' +
      '• fullstack: Combined frontend + backend capabilities\n\n' +
      'Teams automatically load relevant agents for your current task.',
      ['autopm team list']
    ));

    await this.waitForConfirmation();

    console.log(this.createStepFrame(
      2,
      'Manual Team Switching',
      'You can manually switch teams based on your current work:\n\n' +
      'Example workflows:\n' +
      '• Working on React UI → Load frontend team\n' +
      '• Setting up Docker → Load devops team\n' +
      '• Building APIs → Load python_backend team\n' +
      '• Full feature → Load fullstack team',
      [
        'autopm team load frontend',
        'autopm team load devops',
        'autopm team load python_backend',
        'autopm team current'
      ]
    ));

    await this.waitForConfirmation();

    console.log(this.createStepFrame(
      3,
      'Automatic Team Switching',
      'Enable automatic team switching based on Git branch names!\n\n' +
      'Setup (one-time):\n' +
      '1. Run the setup script\n' +
      '2. Use branch naming convention\n\n' +
      'Branch patterns:\n' +
      '• feature/devops/add-ci → loads devops team\n' +
      '• fix/frontend/button-bug → loads frontend team\n' +
      '• feat/backend/new-api → loads python_backend team',
      [
        'bash scripts/setup-githooks.sh',
        'git checkout -b feature/devops/kubernetes-setup',
        'git checkout -b fix/frontend/navbar-responsive'
      ]
    ));

    await this.waitForConfirmation();
  }

  /**
   * First project workflow
   */
  async firstProjectFlow() {
    console.clear();

    if (!this.isInstalled()) {
      console.log(this.createFrame(
        '⚠️  ClaudeAutoPM is not installed in this project!\n\n' +
        'Please install ClaudeAutoPM first.',
        'Not Installed'
      ));
      await this.waitForConfirmation();
      return;
    }

    console.log(this.createStepFrame(
      1,
      'Create Your First PRD',
      'Let\'s start with a Product Requirements Document (PRD).\n\n' +
      'You can create a PRD in two ways:\n' +
      '• Template-based: Fast, structured approach\n' +
      '• AI-powered: Brainstorming with Claude Code\n\n' +
      'For this example, we\'ll show the template approach.'
    ));

    let featureName = await new Promise((resolve) => {
      this.rl.question('Enter a feature name (e.g., user-authentication): ', resolve);
    });

    // Handle empty input
    if (!featureName.trim()) {
      featureName = 'user-authentication';
      console.log(`\n💡 Using example: "${featureName}"\n`);
    }

    console.log(this.createStepFrame(
      2,
      'Generate PRD and Epic',
      `Creating PRD for "${featureName}" and breaking it into tasks:\n\n` +
      '1. Create PRD from template\n' +
      '2. Parse PRD into epic structure\n' +
      '3. Decompose epic into actionable tasks\n' +
      '4. Sync with your configured provider\n\n' +
      '🚀 Next Steps - Open Claude Code:\n\n' +
      '1. Open Claude Code in this directory\n' +
      '2. If needed, run: claude --dangerously-skip-permissions\n' +
      '3. Then use these PM commands:',
      [
        `/pm:prd-new ${featureName} --template`,
        `/pm:prd-parse ${featureName}`,
        `/pm:epic-decompose ${featureName}`,
        `/pm:epic-sync ${featureName}`
      ]
    ));

    await this.waitForConfirmation();

    console.log(this.createStepFrame(
      3,
      'Start Working on Tasks',
      'Now you can start working on individual tasks:\n\n' +
      '• Get next priority task\n' +
      '• Start working on specific issue\n' +
      '• Check project status\n' +
      '• View daily standup summary\n\n' +
      '🚀 Open Claude Code and use these commands:',
      [
        '/pm:next',
        '/pm:issue-start ISSUE-ID',
        '/pm:status',
        '/pm:standup'
      ]
    ));

    await this.waitForConfirmation();
  }

  /**
   * Troubleshooting workflow
   */
  async troubleshootingFlow() {
    console.clear();

    console.log(this.createFrame(
      '🔧 ClaudeAutoPM Troubleshooting\n\n' +
      'Common issues and solutions:',
      'Troubleshooting Guide'
    ));

    const issues = [
      'Installation fails',
      'Commands not found after installation',
      'Git hooks not working',
      'Team switching not working',
      'Provider integration issues',
      'Permission errors',
      'View system diagnostics'
    ];

    const issueChoice = await this.askChoice(
      'What issue are you experiencing?',
      issues
    );

    switch (issueChoice) {
      case 0:
        console.log(this.createStepFrame(
          1,
          'Fix Installation Issues',
          'Common installation problems and solutions:\n\n' +
          '1. Check Node.js version (requires 16+)\n' +
          '2. Clear npm cache\n' +
          '3. Check write permissions\n' +
          '4. Try with verbose logging',
          [
            'node --version',
            'npm cache clean --force',
            'ls -la .',
            'autopm install --verbose'
          ]
        ));
        break;

      case 1:
        console.log(this.createStepFrame(
          1,
          'Fix Command Not Found',
          'If autopm commands are not found:\n\n' +
          '1. Check if globally installed\n' +
          '2. Check PATH environment\n' +
          '3. Try local execution\n' +
          '4. Reinstall globally',
          [
            'which autopm',
            'echo $PATH',
            'node bin/autopm.js --help',
            'npm install -g claude-autopm'
          ]
        ));
        break;

      case 2:
        console.log(this.createStepFrame(
          1,
          'Fix Git Hooks Issues',
          'If automatic team switching isn\'t working:\n\n' +
          '1. Check Git hooks configuration\n' +
          '2. Verify hook file permissions\n' +
          '3. Re-run setup script\n' +
          '4. Test manually',
          [
            'git config --get core.hooksPath',
            'ls -la .githooks/',
            'bash scripts/setup-githooks.sh',
            'git checkout -b test/devops/test-branch'
          ]
        ));
        break;

      case 6: {
        console.log(this.createStepFrame(
          1,
          'System Diagnostics',
          'System information and status:\n\n' +
          'Checking ClaudeAutoPM installation and configuration...'
        ));

        console.log('\n📊 System Diagnostics:');
        console.log('─'.repeat(50));

        // Check installation
        console.log(`✅ Installation: ${this.isInstalled() ? 'Found' : 'Not found'}`);

        // Check requirements
        const requirements = this.checkRequirements();
        requirements.forEach(req => console.log(`  ${req}`));

        // Check team configuration
        if (fs.existsSync('.claude/teams.json')) {
          console.log('✅ Teams: Configured');
        } else {
          console.log('❌ Teams: Not configured');
        }

        // Check active team
        if (fs.existsSync('.claude/active_team.txt')) {
          const activeTeam = fs.readFileSync('.claude/active_team.txt', 'utf8').trim();
          console.log(`✅ Active team: ${activeTeam}`);
        } else {
          console.log('ℹ️  Active team: None set');
        }

        break;
      }
    }

    await this.waitForConfirmation();
  }

  /**
   * Documentation flow
   */
  async documentationFlow() {
    console.clear();

    console.log(this.createFrame(
      '📚 ClaudeAutoPM Documentation\n\n' +
      'Complete documentation and resources:',
      'Documentation'
    ));

    const docs = [
      '🌐 Online Documentation (GitHub Pages)',
      '📖 Complete Guide',
      '📝 Command Reference',
      '🤖 Agent Registry',
      '🔧 Development Guide',
      '⚙️ Configuration Reference',
      '📋 Wiki Pages',
      '💡 Examples and Tutorials'
    ];

    const docChoice = await this.askChoice(
      'What documentation would you like to access?',
      docs
    );

    const urls = [
      'https://lagowski.github.io/ClaudeAutoPM/',
      'https://lagowski.github.io/ClaudeAutoPM/guide/getting-started',
      'https://lagowski.github.io/ClaudeAutoPM/commands/overview',
      'https://lagowski.github.io/ClaudeAutoPM/agents/registry',
      'https://lagowski.github.io/ClaudeAutoPM/development/docker-first',
      'https://lagowski.github.io/ClaudeAutoPM/reference/configuration',
      'https://github.com/rafeekpro/ClaudeAutoPM/wiki',
      'https://github.com/rafeekpro/ClaudeAutoPM/tree/main/examples'
    ];

    console.log(this.createFrame(
      `📖 ${docs[docChoice]}\n\n` +
      `URL: ${urls[docChoice]}\n\n` +
      'This link has been displayed above. You can:\n' +
      '• Copy the URL to open in your browser\n' +
      '• Bookmark it for future reference\n' +
      '• Share it with your team',
      'Documentation Link'
    ));

    await this.waitForConfirmation();
  }

  /**
   * Close the interface
   */
  close() {
    this.rl.close();
  }
}

module.exports = InteractiveGuide;