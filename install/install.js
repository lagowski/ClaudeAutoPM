#!/usr/bin/env node

/**
 * ClaudeAutoPM Installation Script - Node.js Implementation
 *
 * This script installs or updates the ClaudeAutoPM framework
 * including .claude, .claude-code, scripts folders
 * and handles CLAUDE.md migration/merging
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

class Installer {
  constructor() {
    // ANSI color codes
    this.colors = {
      RED: '\x1b[0;31m',
      GREEN: '\x1b[0;32m',
      YELLOW: '\x1b[1;33m',
      BLUE: '\x1b[0;34m',
      CYAN: '\x1b[0;36m',
      NC: '\x1b[0m',
      BOLD: '\x1b[1m',
      DIM: '\x1b[2m'
    };

    // Configuration
    this.scriptDir = __dirname;
    this.baseDir = path.dirname(this.scriptDir);
    this.autopmDir = path.join(this.baseDir, 'autopm');
    this.targetDir = process.cwd();

    // Files and directories to install
    this.installItems = [
      '.claude/agents',
      '.claude/commands',
      '.claude/rules',
      '.claude/hooks',
      '.claude/scripts',
      '.claude/checklists',
      '.claude/strategies',
      '.claude/mcp',
      '.claude/templates',
      '.claude/quick-ref',
      '.claude/includes',
      '.claude/mcp-servers.json',
      '.claude/.env.example',
      '.claude/teams.json',
      '.claude-code',
      'lib'  // Template engine and other utilities
    ];

    // Parse command line arguments
    this.parseArgs();
  }

  parseArgs() {
    const args = process.argv.slice(2);
    this.options = {
      help: false,
      version: false,
      force: false,
      merge: false,
      checkEnv: false,
      setupHooks: false,
      scenario: null,
      targetDir: null
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        this.options.help = true;
      } else if (arg === '--version' || arg === '-v') {
        this.options.version = true;
      } else if (arg === '--force') {
        this.options.force = true;
      } else if (arg === '--merge') {
        this.options.merge = true;
      } else if (arg === '--check-env') {
        this.options.checkEnv = true;
      } else if (arg === '--setup-hooks') {
        this.options.setupHooks = true;
      } else if (arg.startsWith('--scenario=')) {
        this.options.scenario = arg.split('=')[1];
      } else if (!arg.startsWith('-')) {
        this.options.targetDir = arg;
      }
    }

    if (this.options.targetDir) {
      this.targetDir = path.resolve(this.options.targetDir);
    }
  }

  // Color output methods
  printBanner() {
    console.log(`${this.colors.CYAN}${this.colors.BOLD}`);
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       ClaudeAutoPM Installation Script       ║');
    console.log('║      Autonomous Project Management           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(this.colors.NC);
  }

  printMsg(color, msg) {
    console.log(`${this.colors[color]}${msg}${this.colors.NC}`);
  }

  printStep(msg) {
    console.log(`${this.colors.BLUE}▶${this.colors.NC} ${msg}`);
  }

  printSuccess(msg) {
    console.log(`${this.colors.GREEN}✓${this.colors.NC} ${msg}`);
  }

  printWarning(msg) {
    console.log(`${this.colors.YELLOW}⚠${this.colors.NC} ${msg}`);
  }

  printError(msg) {
    console.log(`${this.colors.RED}✗${this.colors.NC} ${msg}`);
  }

  /**
   * Print scenario-specific next steps after installation
   */
  printScenarioNextSteps() {
    const scenario = this.currentScenario;
    if (!scenario) return;

    console.log(`${this.colors.CYAN}📋 Next Steps for "${scenario}" scenario:${this.colors.NC}`);
    console.log('');

    if (scenario === 'obsidian') {
      console.log('   1. Configure your Obsidian vault:');
      console.log(`      ${this.colors.BOLD}autopm obsidian setup --vault-path "<your-vault-path>"${this.colors.NC}`);
      console.log('');
      console.log(`      ${this.colors.DIM}Use quotes around the path. Examples per platform:${this.colors.NC}`);
      console.log(`      ${this.colors.DIM}  WSL:   --vault-path "/mnt/c/Users/You/Documents/My Vault"${this.colors.NC}`);
      console.log(`      ${this.colors.DIM}  macOS: --vault-path "/Users/you/Documents/My Vault"${this.colors.NC}`);
      console.log(`      ${this.colors.DIM}  Linux: --vault-path "/home/you/Obsidian/My Vault"${this.colors.NC}`);
      console.log('');
      console.log('   2. Open the vault folder in Obsidian and install recommended plugins');
      console.log(`      ${this.colors.DIM}(Dataview, Templater, Excalidraw, Mermaid Tools)${this.colors.NC}`);
      console.log('');
      console.log('   3. For continuous sync:');
      console.log(`      ${this.colors.BOLD}autopm obsidian sync --watch${this.colors.NC}`);
      console.log('');
      console.log(`   ${this.colors.DIM}Verify setup:     autopm validate${this.colors.NC}`);
      console.log(`   ${this.colors.DIM}Troubleshooting:  autopm obsidian doctor${this.colors.NC}`);
      console.log('');
    } else {
      console.log('   1. Open your project in Claude Code:');
      console.log(`      ${this.colors.BOLD}cd your-project && claude${this.colors.NC}`);
      console.log('');
      console.log('   2. Start working! Slash commands are available inside Claude Code.');
      console.log(`      ${this.colors.DIM}Example: /pm:status, /pm:next, /pm:help${this.colors.NC}`);
      console.log('');
    }
  }

  async confirm(prompt) {
    // In test mode or auto-accept mode, auto-answer yes
    if (process.env.AUTOPM_TEST_MODE === '1' || process.env.AUTOPM_AUTO_ACCEPT === '1') {
      const mode = process.env.AUTOPM_TEST_MODE === '1' ? 'test mode' : 'auto-accepted';
      this.printMsg('CYAN', `❓ ${prompt} [y/n]: y (${mode})`);
      return true;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${this.colors.CYAN}❓ ${prompt} [y/n]: ${this.colors.NC}`, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  showHelp() {
    console.log(`
${this.colors.BOLD}ClaudeAutoPM Installation Script${this.colors.NC}

${this.colors.BOLD}Usage:${this.colors.NC}
  install.sh [TARGET_DIR] [OPTIONS]

${this.colors.BOLD}Options:${this.colors.NC}
  --help, -h         Show this help message
  --version, -v      Show version information
  --force            Force overwrite existing files
  --merge            Merge with existing CLAUDE.md
  --check-env        Check environment dependencies
  --setup-hooks      Setup git hooks after installation
  --scenario=NAME    Use predefined installation scenario

${this.colors.BOLD}Scenarios:${this.colors.NC}
  lite               Local PM only, minimal tokens (2 plugins)
  github             GitHub integration (4 plugins)
  azure              Azure DevOps integration (4 plugins)
  docker             Containerized dev with GitHub (7 plugins)
  full               Full DevOps with GitHub (recommended, 10 plugins)
  full-azure         Full DevOps with GitHub + Azure (11 plugins)
  performance        Maximum parallelization (12 plugins)

${this.colors.BOLD}Examples:${this.colors.NC}
  install.sh                    Install in current directory
  install.sh /path/to/project   Install in specific directory
  install.sh --scenario=full    Install with full DevOps features
  install.sh --force --merge    Force install and merge CLAUDE.md
`);
  }

  showVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.baseDir, 'package.json'), 'utf-8'));
      console.log(`ClaudeAutoPM v${packageJson.version}`);
    } catch {
      console.log('ClaudeAutoPM v1.0.0');
    }
  }

  checkEnvironment() {
    this.printStep('Checking environment...');

    const checks = [
      { cmd: 'node --version', name: 'Node.js' },
      { cmd: 'npm --version', name: 'npm' },
      { cmd: 'git --version', name: 'Git' }
    ];

    let allGood = true;
    console.log('\nEnvironment check:');

    for (const check of checks) {
      try {
        const result = execSync(check.cmd, { encoding: 'utf-8' }).trim();
        this.printSuccess(`${check.name}: ${result}`);
      } catch {
        this.printError(`${check.name}: not found`);
        allGood = false;
      }
    }

    // Check for optional tools
    console.log('\nOptional tools:');
    const optionalChecks = [
      { cmd: 'docker --version', name: 'Docker' },
      { cmd: 'kubectl version --client', name: 'kubectl' }
    ];

    for (const check of optionalChecks) {
      try {
        const result = execSync(check.cmd, { encoding: 'utf-8', stdio: 'pipe' }).split('\n')[0].trim();
        this.printSuccess(`${check.name}: ${result}`);
      } catch {
        this.printWarning(`${check.name}: not found (optional)`);
      }
    }

    return allGood;
  }

  validateTargetDir() {
    if (!fs.existsSync(this.targetDir)) {
      this.printError(`Target directory does not exist: ${this.targetDir}`);
      process.stderr.write(`Target directory does not exist: ${this.targetDir}\n`);
      return false;
    }

    if (!fs.statSync(this.targetDir).isDirectory()) {
      this.printError(`Target is not a directory: ${this.targetDir}`);
      process.stderr.write(`Target is not a directory: ${this.targetDir}\n`);
      return false;
    }

    return true;
  }

  backupExisting(filePath) {
    if (fs.existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      fs.copyFileSync(filePath, backupPath);
      this.printWarning(`Backed up existing file to: ${path.basename(backupPath)}`);
      return backupPath;
    }
    return null;
  }

  copyDirectory(source, target) {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        // Handle directory collision: target is a directory but source is a file
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
          this.printWarning(`Skipping ${entry.name}: target is a directory`);
          continue;
        }

        // Skip if file exists and not forcing
        if (fs.existsSync(targetPath) && !this.options.force) {
          this.printWarning(`Skipping existing file: ${entry.name}`);
          continue;
        }

        // Backup existing file before force overwrite
        if (fs.existsSync(targetPath) && this.options.force) {
          const backupPath = targetPath + '.backup';
          try { fs.copyFileSync(targetPath, backupPath); } catch {}
        }

        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * Record the sha256 of every framework file as installed in `.claude/.autopm-manifest`
   * ("<sha256>  <path relative to .claude>", sha256sum format). `install/update.sh` reads it to
   * tell a file the user edited from one it may replace (#790). Files the framework does not ship
   * are not recorded, so update leaves them alone.
   */
  writeFrameworkManifest() {
    const crypto = require('crypto');
    const sourceRoot = path.join(this.autopmDir, '.claude');
    const targetRoot = path.join(this.targetDir, '.claude');
    if (!fs.existsSync(sourceRoot) || !fs.existsSync(targetRoot)) return;

    const lines = [];
    const walk = (rel) => {
      for (const entry of fs.readdirSync(path.join(sourceRoot, rel), { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(childRel);
        } else if (entry.isFile()) {
          const target = path.join(targetRoot, childRel);
          if (fs.existsSync(target) && fs.statSync(target).isFile()) {
            const hash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
            lines.push(`${hash}  ${childRel}`);
          }
        }
      }
    };
    walk('');
    fs.writeFileSync(path.join(targetRoot, '.autopm-manifest'), lines.join('\n') + (lines.length ? '\n' : ''));
  }

  installFramework() {
    this.printStep('Installing ClaudeAutoPM framework files...');

    for (const item of this.installItems) {
      const sourcePath = path.join(this.autopmDir, item);
      const targetPath = path.join(this.targetDir, item);

      if (!fs.existsSync(sourcePath)) {
        this.printWarning(`Source not found: ${item}`);
        continue;
      }

      this.printStep(`Installing ${item}...`);

      const stats = fs.statSync(sourcePath);
      if (stats.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
          this.printWarning(`Skipping ${item}: target is a directory`);
        } else if (fs.existsSync(targetPath) && !this.options.force) {
          this.printWarning(`File exists, skipping: ${item}`);
        } else {
          if (fs.existsSync(targetPath) && this.options.force) {
            const backupPath = targetPath + '.backup';
            try { fs.copyFileSync(targetPath, backupPath); } catch {}
          }
          fs.copyFileSync(sourcePath, targetPath);
        }
      }

      this.printSuccess(`Installed ${item}`);
    }
  }

  installScripts() {
    this.printStep('Installing utility scripts...');

    const scriptsDir = path.join(this.targetDir, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Install both .sh wrappers and .js implementations
    const scripts = [
      'safe-commit.sh',
      'safe-commit.js',
      'setup-hooks.sh',
      'setup-hooks.js',
      'epic-status.sh'
    ];

    for (const script of scripts) {
      const sourcePath = path.join(this.autopmDir, 'scripts', script);
      const targetPath = path.join(scriptsDir, script);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        // Make .sh files executable
        if (script.endsWith('.sh')) {
          fs.chmodSync(targetPath, 0o755);
        }
        this.printSuccess(`Installed ${script}`);
      }
    }

    // Install package.json if it doesn't exist
    const packageJsonPath = path.join(this.targetDir, 'package.json');
    const packageJsonTemplatePath = path.join(this.autopmDir, 'scripts', 'package.json.template');

    if (!fs.existsSync(packageJsonPath) && fs.existsSync(packageJsonTemplatePath)) {
      this.printStep('Creating package.json from template...');
      const templateContent = fs.readFileSync(packageJsonTemplatePath, 'utf-8');

      // Try to get project name from directory
      const projectName = path.basename(this.targetDir);

      // Parse template and add name field
      const packageJson = JSON.parse(templateContent);
      packageJson.name = projectName;
      packageJson.version = packageJson.version || '1.0.0';
      packageJson.description = packageJson.description || '';
      packageJson.main = packageJson.main || 'index.js';
      packageJson.license = packageJson.license || 'ISC';

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      this.printSuccess('Created package.json');
    } else if (fs.existsSync(packageJsonPath)) {
      this.printStep('package.json already exists, skipping');
    }
  }

  installDependencies() {
    const packageJsonPath = path.join(this.targetDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      this.printStep('No package.json found, skipping dependency installation');
      return;
    }

    this.printStep('Installing npm dependencies...');

    try {
      // Check if package.json has dependencies
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
        this.printStep('No dependencies to install');
        return;
      }

      // Run npm install
      execSync('npm install', {
        cwd: this.targetDir,
        encoding: 'utf-8',
        stdio: 'inherit'
      });

      this.printSuccess('Dependencies installed successfully');
    } catch (error) {
      this.printWarning(`Failed to install dependencies: ${error.message}`);
      this.printStep('You can manually run: npm install');
    }
  }

  checkToolAvailability() {
    const tools = {
      docker: false,
      kubectl: false
    };

    try {
      execSync('docker --version', { encoding: 'utf-8', stdio: 'pipe' });
      tools.docker = true;
    } catch {
      tools.docker = false;
    }

    try {
      execSync('kubectl version --client', { encoding: 'utf-8', stdio: 'pipe' });
      tools.kubectl = true;
    } catch {
      tools.kubectl = false;
    }

    return tools;
  }

  async selectScenario() {
    if (this.options.scenario) {
      return this.options.scenario;
    }

    // Check available tools
    const availableTools = this.checkToolAvailability();

    // Show tool availability status
    console.log(`
${this.colors.BOLD}Detected Tools:${this.colors.NC}`);
    console.log(`  • Docker:     ${availableTools.docker ? this.colors.GREEN + '✓ Available' : this.colors.RED + '✗ Not installed'}${this.colors.NC}`);
    console.log(`  • kubectl:    ${availableTools.kubectl ? this.colors.GREEN + '✓ Available' : this.colors.RED + '✗ Not installed'}${this.colors.NC}`);

    if (!availableTools.docker || !availableTools.kubectl) {
      console.log(`
${this.colors.YELLOW}Note:${this.colors.NC} Some installation options require additional tools.`);
      if (!availableTools.docker) {
        console.log(`  Install Docker: ${this.colors.CYAN}https://docs.docker.com/get-docker/${this.colors.NC}`);
      }
      if (!availableTools.kubectl) {
        console.log(`  Install kubectl: ${this.colors.CYAN}https://kubernetes.io/docs/tasks/tools/${this.colors.NC}`);
      }
    }

    console.log(`
${this.colors.BOLD}Select installation scenario:${this.colors.NC}
`);

    // Option 0: Lite PM (always available) - local only, no provider sync
    console.log(`${this.colors.CYAN}0. Lite${this.colors.NC} - Local PM only (no provider sync)
   • Core + PM essentials (~32 commands)
   • Lowest context footprint
   • Best for: Local-first PM, learning
   • No GitHub or Azure sync
   ${this.colors.DIM}• Plugins: core, pm (2 plugins)${this.colors.NC}
`);

    // Option 1: GitHub (always available)
    console.log(`${this.colors.GREEN}1. GitHub${this.colors.NC} - PM with GitHub integration
   • Core + languages + PM + GitHub sync (~50 commands)
   • Issues, PRs, and workflow sync
   • Best for: GitHub-based projects
   ${this.colors.DIM}• Plugins: core, languages, pm, pm-github (4 plugins)${this.colors.NC}
`);

    // Option 2: Azure (always available)
    console.log(`${this.colors.CYAN}2. Azure${this.colors.NC} - PM with Azure DevOps integration
   • Core + languages + PM + Azure sync (~70 commands)
   • Work items, sprints, and feature sync
   • Best for: Azure DevOps projects
   ${this.colors.DIM}• Plugins: core, languages, pm, pm-azure (4 plugins)${this.colors.NC}
`);

    // Option 3: Docker-only (requires Docker)
    if (availableTools.docker) {
      console.log(`${this.colors.CYAN}3. Docker${this.colors.NC} - Containerized development (GitHub)
   • Adaptive execution (smart sequential/parallel choice)
   • Docker containers for development environment
   • GitHub integration included
   ${this.colors.DIM}• Plugins: core, languages, frameworks, testing, devops, pm, pm-github (7 plugins)${this.colors.NC}
`);
    } else {
      console.log(`${this.colors.DIM}3. Docker${this.colors.NC} ${this.colors.RED}(Docker not installed)${this.colors.NC}
`);
    }

    // Option 4: Full DevOps (requires Docker and kubectl)
    if (availableTools.docker && availableTools.kubectl) {
      console.log(`${this.colors.GREEN}4. Full DevOps${this.colors.NC} - Complete CI/CD pipeline ${this.colors.BOLD}(RECOMMENDED)${this.colors.NC}
   • Adaptive execution with Docker-first priority
   • Kubernetes + cloud deployment ready
   • GitHub integration included
   • Best for: Production applications, enterprise projects
   ${this.colors.DIM}• Plugins: core, languages, frameworks, testing, devops, cloud, databases, pm, pm-github, ai (10 plugins)${this.colors.NC}
`);
    } else if (availableTools.docker) {
      console.log(`${this.colors.DIM}4. Full DevOps${this.colors.NC} ${this.colors.RED}(kubectl not installed)${this.colors.NC}
`);
    } else {
      console.log(`${this.colors.DIM}4. Full DevOps${this.colors.NC} ${this.colors.RED}(Docker and kubectl not installed)${this.colors.NC}
`);
    }

    // Option 5: Performance (requires Docker and kubectl)
    if (availableTools.docker && availableTools.kubectl) {
      console.log(`${this.colors.YELLOW}5. Performance${this.colors.NC} - Maximum parallel execution
   • Hybrid strategy: up to 5 parallel agents
   • Advanced context isolation and security
   • GitHub integration included
   • Best for: Large projects, power users
   ${this.colors.DIM}• Plugins: ALL except Azure (12 plugins including data, ml)${this.colors.NC}
`);
    } else if (availableTools.docker) {
      console.log(`${this.colors.DIM}5. Performance${this.colors.NC} ${this.colors.RED}(kubectl not installed)${this.colors.NC}
`);
    } else {
      console.log(`${this.colors.DIM}5. Performance${this.colors.NC} ${this.colors.RED}(Docker and kubectl not installed)${this.colors.NC}
`);
    }

    // Option 6: Custom (always available)
    console.log(`${this.colors.CYAN}6. Custom${this.colors.NC} - Manual configuration
   • Configure execution strategy manually
   • Choose your own agents and workflows
   • Advanced users only
`);

    // Option 7: Obsidian (always available)
    console.log(`${this.colors.CYAN}7. Obsidian${this.colors.NC} - PM + Obsidian vault integration (rsync, Dataview, templates)
   • Core + PM + Obsidian vault sync
   • Unidirectional project → vault mirroring
   • Best for: Knowledge management, documentation-heavy projects
   • After install, run: ${this.colors.BOLD}autopm obsidian setup --vault-path "<path>"${this.colors.NC}
   ${this.colors.DIM}• Plugins: core, pm, obsidian (3 plugins)${this.colors.NC}
`);

    if (process.env.AUTOPM_TEST_MODE === '1') {
      this.printMsg('CYAN', 'Auto-selecting option 0 (lite) for test mode');
      return 'lite';
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Determine default based on available tools
    const defaultChoice = availableTools.docker && availableTools.kubectl ? '4' : '1';

    return new Promise((resolve) => {
      const askQuestion = () => {
        rl.question(`${this.colors.CYAN}Enter your choice (0-7) [${defaultChoice}]: ${this.colors.NC}`, (answer) => {
          const choice = answer.trim() || defaultChoice;
          const scenarios = {
            '0': 'lite',
            '1': 'github',
            '2': 'azure',
            '3': 'docker',
            '4': 'full',
            '5': 'performance',
            '6': 'custom',
            '7': 'obsidian'
          };

          const selectedScenario = scenarios[choice];

          // Validate choice based on available tools
          // Option 3 (Docker-only) requires Docker
          if (choice === '3' && !availableTools.docker) {
            console.log(`${this.colors.RED}✗ Docker is required for this option. Please install Docker first or choose option 0-2.${this.colors.NC}`);
            askQuestion();
            return;
          }

          // Options 4 (Full) and 5 (Performance) require Docker
          if ((choice === '4' || choice === '5') && !availableTools.docker) {
            console.log(`${this.colors.RED}✗ Docker is required for this option. Please install Docker first or choose option 0-2.${this.colors.NC}`);
            askQuestion();
            return;
          }

          // Options 4 (Full) and 5 (Performance) require kubectl
          if ((choice === '4' || choice === '5') && availableTools.docker && !availableTools.kubectl) {
            console.log(`${this.colors.RED}✗ kubectl is required for this option. Please install kubectl first or choose option 3 (Docker-only).${this.colors.NC}`);
            askQuestion();
            return;
          }

          if (!selectedScenario) {
            console.log(`${this.colors.RED}✗ Invalid choice. Please select 0-7.${this.colors.NC}`);
            askQuestion();
            return;
          }

          rl.close();
          resolve(selectedScenario);
        });
      };

      askQuestion();
    });
  }

  generateConfig(scenario) {
    // Get version from package.json
    let version = 'unknown';
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.baseDir, 'package.json'), 'utf-8'));
      version = packageJson.version;
    } catch (error) {
      // Fallback to unknown if package.json can't be read
    }

    const configs = {
      lite: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'sequential',
        tools: {
          docker: { enabled: false },
          kubernetes: { enabled: false }
        },
        plugins: ['plugin-core', 'plugin-pm']
      },
      github: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'sequential',
        tools: {
          docker: { enabled: false },
          kubernetes: { enabled: false }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-pm', 'plugin-pm-github']
      },
      azure: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'sequential',
        tools: {
          docker: { enabled: false },
          kubernetes: { enabled: false }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-pm', 'plugin-pm-azure']
      },
      docker: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'adaptive',
        tools: {
          docker: { enabled: true, first: false },
          kubernetes: { enabled: false }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-frameworks', 'plugin-testing', 'plugin-devops', 'plugin-pm', 'plugin-pm-github']
      },
      full: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'adaptive',
        tools: {
          docker: { enabled: true, first: true },
          kubernetes: { enabled: true }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-frameworks', 'plugin-testing', 'plugin-devops', 'plugin-cloud', 'plugin-databases', 'plugin-pm', 'plugin-pm-github', 'plugin-ai']
      },
      'full-azure': {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'adaptive',
        tools: {
          docker: { enabled: true, first: true },
          kubernetes: { enabled: true }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-frameworks', 'plugin-testing', 'plugin-devops', 'plugin-cloud', 'plugin-databases', 'plugin-pm', 'plugin-pm-github', 'plugin-pm-azure', 'plugin-ai']
      },
      performance: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'hybrid',
        parallel_limit: 5,
        tools: {
          docker: { enabled: true, first: false },
          kubernetes: { enabled: true }
        },
        plugins: ['plugin-core', 'plugin-languages', 'plugin-frameworks', 'plugin-testing', 'plugin-devops', 'plugin-cloud', 'plugin-databases', 'plugin-data', 'plugin-pm', 'plugin-pm-github', 'plugin-ai', 'plugin-ml']
      },
      obsidian: {
        version: version,
        installed: new Date().toISOString(),
        execution_strategy: 'sequential',
        tools: {
          docker: { enabled: false },
          kubernetes: { enabled: false }
        },
        plugins: ['plugin-core', 'plugin-pm', 'plugin-obsidian']
      }
    };

    return configs[scenario] || configs.full;
  }

  installConfig(scenario) {
    this.printStep(`Installing configuration for scenario: ${scenario}`);

    const configDir = path.join(this.targetDir, '.claude');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'config.json');
    const config = this.generateConfig(scenario);

    // Store for use in CLAUDE.md generation
    this.currentScenario = scenario;
    this.currentConfig = config;

    if (fs.existsSync(configPath)) {
      this.backupExisting(configPath);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.printSuccess('Configuration installed');
  }

  installClaudeMd() {
    this.printStep('Setting up CLAUDE.md...');

    const targetPath = path.join(this.targetDir, 'CLAUDE.md');

    try {
      // Generate CLAUDE.md from templates based on configuration
      const claudeContent = this.generateClaudeFromTemplates();

      if (fs.existsSync(targetPath)) {
        if (this.options.merge) {
          // Use merge script for intelligent merging
          const mergeScript = path.join(this.scriptDir, 'merge-claude.sh');
          if (fs.existsSync(mergeScript)) {
            // Create temporary file with new content
            const tempFile = path.join(this.targetDir, 'CLAUDE.md.new');
            fs.writeFileSync(tempFile, claudeContent);

            try {
              execSync(`bash "${mergeScript}" "${targetPath}" "${tempFile}"`, { stdio: 'inherit' });
              // Clean up temp file
              fs.unlinkSync(tempFile);
              this.printSuccess('CLAUDE.md merged successfully');
            } catch (error) {
              fs.unlinkSync(tempFile);
              this.printError('Failed to merge CLAUDE.md, using backup method');
              // Fallback: backup and replace
              this.backupExisting(targetPath);
              fs.writeFileSync(targetPath, claudeContent);
              this.printSuccess('CLAUDE.md replaced (original backed up)');
            }
          } else {
            // No merge script, append new content
            const existing = fs.readFileSync(targetPath, 'utf-8');
            fs.writeFileSync(targetPath, existing + '\n\n<!-- NEW CLAUDE.md CONTENT -->\n\n' + claudeContent);
            this.printSuccess('CLAUDE.md content appended');
          }
        } else {
          this.backupExisting(targetPath);
          fs.writeFileSync(targetPath, claudeContent);
          this.printSuccess('CLAUDE.md updated from templates');
        }
      } else {
        fs.writeFileSync(targetPath, claudeContent);
        this.printSuccess('CLAUDE.md created from templates');
      }
    } catch (error) {
      this.printError(`Failed to generate CLAUDE.md: ${error.message}`);

      // Fallback to basic template
      const basicTemplate = `# ClaudeAutoPM Configuration

This project is configured with ClaudeAutoPM for autonomous project management.

## Configuration
- Execution Strategy: ${this.currentScenario || 'adaptive'}
- Docker Support: ${this.currentConfig?.tools?.docker?.enabled ? 'Enabled' : 'Disabled'}

## Available Commands
- \`/pm:validate\` - Validate project configuration
- \`/pm:status\` - Check project status
- \`/pm:help\` - Show available PM commands

## Documentation
See: https://github.com/rafeekpro/ClaudeAutoPM
`;

      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, basicTemplate);
        this.printSuccess('CLAUDE.md created with fallback template');
      }
    }
  }

  generateClaudeFromTemplates() {
    const templatesDir = path.join(this.autopmDir, '.claude', 'templates', 'claude-templates');
    const basePath = path.join(templatesDir, 'base.md');
    const addonsDir = path.join(templatesDir, 'addons');

    if (!fs.existsSync(basePath)) {
      throw new Error('Base template not found');
    }

    // Start with base template
    let content = fs.readFileSync(basePath, 'utf-8');

    // Determine which addons to include based on configuration
    const addons = this.getRequiredAddons();

    // Replace placeholder sections with addon content
    for (const addon of addons) {
      const addonPath = path.join(addonsDir, `${addon}.md`);
      if (fs.existsSync(addonPath)) {
        const addonContent = fs.readFileSync(addonPath, 'utf-8');
        content = this.mergeAddonContent(content, addon, addonContent);
      }
    }

    // Process variable substitutions
    content = this.processTemplateVariables(content);

    return content;
  }

  /**
   * Resolve the CI/CD provider from config.
   *
   * Historically this read `cicd.provider` only — a key nothing in the repo
   * ever writes, which made the github/azure/gitlab branches unreachable and
   * silently stamped every scaffolded repo with a "no CI/CD" CLAUDE.md. We now
   * check the keys that are actually populated, most explicit first.
   *
   * @returns {'github'|'azure'|'gitlab'|null} null when nothing indicates a provider
   */
  resolveCicdProvider(config) {
    if (!config) return null;

    const normalize = (value) => {
      if (typeof value !== 'string') return null;
      const v = value.trim().toLowerCase();
      if (v === 'none' || v === 'no' || v === 'false') return null;
      if (v.startsWith('github')) return 'github';
      if (v.startsWith('azure')) return 'azure';
      if (v.startsWith('gitlab')) return 'gitlab';
      return null;
    };

    // 1. Explicit declaration wins.
    if (typeof config.cicd?.provider === 'string') {
      return normalize(config.cicd.provider);
    }

    // 2. The key the rest of the CLI reads/writes (bin/commands/config.js).
    if (typeof config.features?.cicd === 'string') {
      return normalize(config.features.cicd);
    }

    // 3. Infer from the GitHub Actions signals the config templates do set.
    //    Unlike `kubernetes`, the github_actions block carries no `enabled`
    //    key, so only a truthy toggle counts as evidence — an all-false block
    //    means "no GHA features on", not "GitHub Actions is the provider".
    if (config.features?.github_actions_k8s === true) return 'github';
    if (config.github_actions && typeof config.github_actions === 'object') {
      if (Object.values(config.github_actions).some(Boolean)) return 'github';
    }

    return null;
  }

  getRequiredAddons() {
    const addons = [];

    // ALWAYS include task-workflow (standard workflow for all projects)
    addons.push('task-workflow');

    // Based on scenario/configuration, determine required addons
    if (this.currentConfig) {
      if (this.currentConfig.tools?.docker?.enabled) {
        addons.push('docker-agents', 'docker-workflow');
      }

      if (this.currentConfig.execution_strategy === 'sequential' || this.currentConfig.execution?.strategy === 'minimal') {
        addons.push('minimal-agents', 'minimal-workflow');
      } else {
        addons.push('devops-agents', 'devops-workflow');
      }

      const cicdAddon = {
        github: 'github-actions',
        azure: 'azure-devops',
        gitlab: 'gitlab-ci'
      }[this.resolveCicdProvider(this.currentConfig)];

      // An unresolved provider adds nothing: the scaffold must not assert a
      // CI/CD arrangement it has no evidence for. `no-cicd` is opt-in only.
      if (cicdAddon) {
        addons.push(cicdAddon);
      } else if (this.currentConfig.cicd?.emitPlaceholder) {
        addons.push('no-cicd');
      }

      if (this.currentConfig.git?.safety) {
        addons.push('git-safety');
      }
    } else {
      // Default addons for fallback
      addons.push('devops-agents', 'devops-workflow', 'github-actions');
    }

    return addons;
  }

  mergeAddonContent(baseContent, addonName, addonContent) {
    // Define section mapping for different addons
    const sectionMap = {
      'docker-agents': 'AGENT_SELECTION_SECTION',
      'devops-agents': 'AGENT_SELECTION_SECTION',
      'minimal-agents': 'AGENT_SELECTION_SECTION',
      'task-workflow': 'WORKFLOW_SECTION',
      'docker-workflow': 'WORKFLOW_SECTION',
      'devops-workflow': 'WORKFLOW_SECTION',
      'minimal-workflow': 'WORKFLOW_SECTION',
      'github-actions': 'CICD_SECTION',
      'azure-devops': 'CICD_SECTION',
      'gitlab-ci': 'CICD_SECTION',
      'no-cicd': 'CICD_SECTION',
      'git-safety': 'WORKFLOW_SECTION'
    };

    const placeholder = sectionMap[addonName];
    if (placeholder && baseContent.includes(`<!-- ${placeholder} -->`)) {
      return baseContent.replace(`<!-- ${placeholder} -->`, addonContent);
    }

    // If no placeholder found, append to end
    return baseContent + '\n\n' + addonContent;
  }

  processTemplateVariables(content) {
    // Replace template variables with actual values
    const variables = {
      PROJECT_NAME: path.basename(this.targetDir),
      EXECUTION_STRATEGY: this.currentScenario || 'adaptive',
      DOCKER_ENABLED: this.currentConfig?.tools?.docker?.enabled ? 'true' : 'false',
      PROVIDER: this.currentConfig?.provider || 'local',
      DATE: new Date().toISOString().split('T')[0]
    };

    let processedContent = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }

    // Generate agent @include directives from installed plugins
    const agentIncludes = this.generateAgentIncludes();
    processedContent = processedContent.replace(
      /<!-- AGENTS_START -->\s*<!-- AGENTS_END -->/,
      `<!-- AGENTS_START -->\n${agentIncludes}\n<!-- AGENTS_END -->`
    );

    return processedContent;
  }

  generateAgentIncludes() {
    if (!this.currentConfig?.installedPlugins) {
      return '';
    }

    const packagesDir = path.join(this.baseDir, 'packages');
    const agentsByCategory = {};

    // Collect all agents from installed plugins
    for (const plugin of this.currentConfig.installedPlugins) {
      const pluginPath = path.join(packagesDir, plugin.name);
      const pluginJsonPath = path.join(pluginPath, 'plugin.json');

      if (!fs.existsSync(pluginJsonPath)) {
        continue;
      }

      try {
        const metadata = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));

        if (metadata.agents && metadata.agents.length > 0) {
          for (const agent of metadata.agents) {
            const category = agent.category || 'other';

            if (!agentsByCategory[category]) {
              agentsByCategory[category] = [];
            }

            const filename = path.basename(agent.file);
            const installedPath = `.claude/agents/${category}/${filename}`;

            agentsByCategory[category].push({
              name: agent.name,
              path: installedPath,
              description: agent.description
            });
          }
        }
      } catch (error) {
        this.printWarning(`Failed to read plugin metadata for ${plugin.name}: ${error.message}`);
      }
    }

    // Generate @include directives organized by category
    const lines = [];
    const categoryOrder = ['core', 'languages', 'frameworks', 'testing', 'devops', 'cloud', 'databases', 'data', 'ai', 'ml'];

    for (const category of categoryOrder) {
      if (agentsByCategory[category]) {
        for (const agent of agentsByCategory[category]) {
          lines.push(`- @include ${agent.path}`);
        }
      }
    }

    for (const category of Object.keys(agentsByCategory)) {
      if (!categoryOrder.includes(category)) {
        for (const agent of agentsByCategory[category]) {
          lines.push(`- @include ${agent.path}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate XML entries for plugin agents to inject into agent-registry.xml
   */
  generatePluginAgentXml(installedPlugins) {
    const packagesDir = path.join(this.baseDir, 'packages');
    const agentsByCategory = {};
    const categoryOrder = ['languages', 'frameworks', 'testing', 'integration', 'devops', 'cloud', 'databases', 'data', 'ai', 'ml'];

    for (const pluginName of installedPlugins) {
      const pluginJsonPath = path.join(packagesDir, pluginName, 'plugin.json');
      if (!fs.existsSync(pluginJsonPath)) continue;

      try {
        const metadata = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        if (!metadata.agents) continue;

        for (const agent of metadata.agents) {
          if (agent.category === 'core') continue; // core agents are static in XML
          const category = agent.category || 'other';
          if (!agentsByCategory[category]) agentsByCategory[category] = [];

          const filename = path.basename(agent.file);
          agentsByCategory[category].push({
            name: agent.name,
            path: `agents/${category}/${filename}`,
            description: agent.description || agent.name
          });
        }
      } catch (error) {
        this.printWarning(`Failed to read plugin agents for ${pluginName}: ${error.message}`);
      }
    }

    const lines = [];
    const allCategories = [...categoryOrder, ...Object.keys(agentsByCategory).filter(c => !categoryOrder.includes(c))];

    for (const category of allCategories) {
      if (!agentsByCategory[category] || agentsByCategory[category].length === 0) continue;
      lines.push(`  <agents category="${category}">`);
      for (const agent of agentsByCategory[category]) {
        const escaped = agent.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        lines.push(`    <agent name="${agent.name}" path="${agent.path}">${escaped}</agent>`);
      }
      lines.push(`  </agents>`);
    }

    return lines.join('\n');
  }

  /**
   * Update agent-registry.xml with plugin agent entries
   */
  updateAgentRegistry(installedPlugins) {
    const registryPath = path.join(this.targetDir, '.claude', 'agents', 'agent-registry.xml');
    if (!fs.existsSync(registryPath)) {
      this.printWarning('agent-registry.xml not found, skipping plugin agent injection');
      return;
    }

    const pluginXml = this.generatePluginAgentXml(installedPlugins);
    let content = fs.readFileSync(registryPath, 'utf8');

    const startMarker = '<!-- PLUGIN_AGENTS_START -->';
    const endMarker = '<!-- PLUGIN_AGENTS_END -->';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      this.printWarning('Plugin agent markers not found in agent-registry.xml');
      return;
    }

    const before = content.substring(0, startIdx + startMarker.length);
    const after = content.substring(endIdx);

    content = pluginXml ? `${before}\n${pluginXml}\n  ${after}` : `${before}\n  ${after}`;
    fs.writeFileSync(registryPath, content, 'utf8');

    const agentCount = (pluginXml.match(/<agent /g) || []).length;
    if (agentCount > 0) {
      this.printSuccess(`Injected ${agentCount} plugin agents into agent-registry.xml`);
    }
  }

  /**
   * Basenames of the rules the given plugins currently ship.
   */
  collectPluginRuleNames(packagesDir, pluginNames) {
    const names = new Set();

    for (const pluginName of pluginNames) {
      const pluginJsonPath = path.join(packagesDir, pluginName, 'plugin.json');
      if (!fs.existsSync(pluginJsonPath)) continue;

      try {
        const metadata = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        for (const rule of metadata.rules || []) {
          if (rule.file) names.add(path.basename(rule.file));
        }
      } catch {
        // A malformed plugin.json is reported by the install loop below; here
        // we just decline to treat its rules as removable.
      }
    }

    return [...names];
  }

  /**
   * Remove stale plugin rules from the target, preserving framework rules.
   *
   * The previous implementation deleted every file in `.claude/rules/`, which
   * also removed the framework `.xml` rules installFramework() had copied
   * moments earlier — leaving base.md and the quick-ref docs pointing at files
   * that no longer existed. Framework-owned rules are now never deleted.
   */
  cleanPluginRules(pluginRuleNames = []) {
    const rulesDir = path.join(this.targetDir, '.claude', 'rules');
    if (!fs.existsSync(rulesDir)) return;

    const frameworkRulesDir = path.join(this.autopmDir, '.claude', 'rules');
    const frameworkRules = fs.existsSync(frameworkRulesDir)
      ? new Set(fs.readdirSync(frameworkRulesDir))
      : new Set();
    const currentPluginRules = new Set(pluginRuleNames);

    const stale = fs.readdirSync(rulesDir).filter(file =>
      !frameworkRules.has(file) &&
      !currentPluginRules.has(file) &&
      fs.statSync(path.join(rulesDir, file)).isFile()
    );

    if (stale.length === 0) return;

    this.printStep(`Removing ${stale.length} stale plugin rule(s)...`);
    for (const file of stale) {
      fs.unlinkSync(path.join(rulesDir, file));
    }
  }

  async installPlugins() {
    if (!this.currentConfig || !this.currentConfig.plugins) {
      this.printStep('No plugins configured for this scenario');
      return;
    }

    const pluginsToInstall = this.currentConfig.plugins;

    console.log('');
    this.printStep('Installing plugins for selected scenario...');
    console.log('');
    this.printMsg('CYAN', `📦 Plugins to install (${pluginsToInstall.length}):`);

    for (const plugin of pluginsToInstall) {
      console.log(`  • ${plugin}`);
    }
    console.log('');

    const packagesDir = path.join(this.baseDir, 'packages');
    const installedPlugins = [];
    const failedPlugins = [];

    // Drop plugin rules that are no longer shipped, keeping the framework
    // rules installFramework() just laid down (base.md and the quick-ref docs
    // point at those; wiping them left the pointers dangling).
    this.cleanPluginRules(this.collectPluginRuleNames(packagesDir, pluginsToInstall));

    // Install each plugin directly
    for (const pluginName of pluginsToInstall) {
      try {
        this.printStep(`Installing ${pluginName}...`);

        const pluginPath = path.join(packagesDir, pluginName);
        const pluginJsonPath = path.join(pluginPath, 'plugin.json');

        if (!fs.existsSync(pluginJsonPath)) {
          throw new Error(`Plugin metadata not found: ${pluginJsonPath}`);
        }

        const metadata = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        let agentsInstalled = 0;
        let commandsInstalled = 0;
        let rulesInstalled = 0;

        // Install agents
        if (metadata.agents && metadata.agents.length > 0) {
          for (const agent of metadata.agents) {
            // Validate agent has required properties
            if (!agent.file) {
              this.printWarning(`Agent ${agent.name || 'unknown'} missing file property, skipping`);
              continue;
            }
            if (!agent.category) {
              this.printWarning(`Agent ${agent.name || 'unknown'} missing category property, skipping`);
              continue;
            }

            const targetDir = path.join(this.targetDir, '.claude', 'agents', agent.category);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const sourcePath = path.join(pluginPath, agent.file);
            const targetPath = path.join(targetDir, path.basename(agent.file));

            if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
              fs.copyFileSync(sourcePath, targetPath);
              agentsInstalled++;
            }
          }
        }

        // Install commands
        if (metadata.commands && metadata.commands.length > 0) {
          const targetDir = path.join(this.targetDir, '.claude', 'commands');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const command of metadata.commands) {
            // Handle subdirectory collections with auto-discovery
            if (command.subdirectory && command.discovery === 'auto') {
              const commandsSourceDir = path.join(pluginPath, command.subdirectory);

              if (fs.existsSync(commandsSourceDir)) {
                // Auto-discover all .md files in subdirectory
                const files = fs.readdirSync(commandsSourceDir);
                for (const file of files) {
                  if (file.endsWith('.md')) {
                    const sourcePath = path.join(commandsSourceDir, file);
                    const targetPath = path.join(targetDir, file);

                    if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
                      fs.copyFileSync(sourcePath, targetPath);
                      commandsInstalled++;
                    }
                  }
                }
              }
            } else if (command.file) {
              // Handle individual command files
              const sourcePath = path.join(pluginPath, command.file);
              const targetPath = path.join(targetDir, path.basename(command.file));

              if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
                fs.copyFileSync(sourcePath, targetPath);
                commandsInstalled++;
              }
            }
          }
        }

        // Install hooks
        if (metadata.hooks && metadata.hooks.length > 0) {
          const targetDir = path.join(this.targetDir, '.claude', 'hooks');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const hook of metadata.hooks) {
            const files = hook.files || (hook.file ? [hook.file] : []);
            for (const file of files) {
              const sourcePath = path.join(pluginPath, file);
              const targetPath = path.join(targetDir, path.basename(file));

              if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
                fs.copyFileSync(sourcePath, targetPath);
                // Make executable if shell script
                if (file.endsWith('.sh')) {
                  fs.chmodSync(targetPath, 0o755);
                }
              }
            }
          }
        }

        // Install scripts
        if (metadata.scripts && metadata.scripts.length > 0) {
          const targetDir = path.join(this.targetDir, '.claude');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const script of metadata.scripts) {
            if (script.subdirectory && script.files) {
              // Handle subdirectory with multiple files
              // scripts/pm/epic-sync/ -> .claude/scripts/pm/epic-sync/
              const cleanSubdir = script.subdirectory;
              const subdirTarget = path.join(targetDir, cleanSubdir);
              if (!fs.existsSync(subdirTarget)) {
                fs.mkdirSync(subdirTarget, { recursive: true });
              }

              for (const file of script.files) {
                const sourcePath = path.join(pluginPath, script.subdirectory, file);
                const targetPath = path.join(subdirTarget, file);

                if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
                  fs.copyFileSync(sourcePath, targetPath);
                  if (file.endsWith('.sh')) {
                    fs.chmodSync(targetPath, 0o755);
                  }
                }
              }
            } else if (script.file) {
              // Handle single script file
              // Keep full path structure (scripts/pm/file.js -> scripts/pm/file.js)
              const cleanFile = script.file;
              const sourcePath = path.join(pluginPath, script.file);
              const targetPath = path.join(targetDir, cleanFile);

              // Create subdirectories if needed (e.g., lib/)
              const scriptTargetDir = path.dirname(targetPath);
              if (!fs.existsSync(scriptTargetDir)) {
                fs.mkdirSync(scriptTargetDir, { recursive: true });
              }

              if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
                fs.copyFileSync(sourcePath, targetPath);
                if (script.file.endsWith('.sh')) {
                  fs.chmodSync(targetPath, 0o755);
                }
              }
            }
          }
        }

        // Install rules
        if (metadata.rules && metadata.rules.length > 0) {
          const targetDir = path.join(this.targetDir, '.claude', 'rules');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const rule of metadata.rules) {
            const sourcePath = path.join(pluginPath, rule.file);
            const targetPath = path.join(targetDir, path.basename(rule.file));

            if (fs.existsSync(sourcePath) && (!fs.existsSync(targetPath) || this.options.force)) {
              fs.copyFileSync(sourcePath, targetPath);
              rulesInstalled++;
            }
          }
        }

        const displayName = metadata.displayName || metadata.name || pluginName;

        installedPlugins.push({
          name: pluginName,
          displayName: displayName,
          agents: agentsInstalled,
          commands: commandsInstalled,
          rules: rulesInstalled
        });

        const summary = [];
        if (agentsInstalled > 0) summary.push(`${agentsInstalled} agents`);
        if (commandsInstalled > 0) summary.push(`${commandsInstalled} commands`);
        if (rulesInstalled > 0) summary.push(`${rulesInstalled} rules`);

        this.printSuccess(`${displayName} installed (${summary.join(', ') || 'no resources'})`);
      } catch (error) {
        failedPlugins.push({ name: pluginName, error: error.message });
        this.printWarning(`Failed to install ${pluginName}: ${error.message}`);
      }
    }

    // Update agent-registry.xml with plugin agents
    const pluginNames = installedPlugins.map(p => p.name);
    this.updateAgentRegistry(pluginNames);

    // Store installation results in config
    this.currentConfig.installedPlugins = installedPlugins;
    this.currentConfig.failedPlugins = failedPlugins;

    // Update config file with installation results
    const configPath = path.join(this.targetDir, '.claude', 'config.json');
    if (fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(this.currentConfig, null, 2));
    }

    console.log('');
    if (installedPlugins.length > 0) {
      this.printMsg('GREEN', `✓ Successfully installed ${installedPlugins.length} plugin(s)`);
    }
    if (failedPlugins.length > 0) {
      this.printMsg('YELLOW', `⚠ Failed to install ${failedPlugins.length} plugin(s)`);
      this.printMsg('CYAN', '💡 Tip: Install missing plugins with: autopm plugin install <name>');
    }
    console.log('');
  }

  setupMCPIntegration() {
    const mcpServersPath = path.join(this.targetDir, '.claude', 'mcp-servers.json');
    const configPath = path.join(this.targetDir, '.claude', 'config.json');

    // Check if MCP servers configuration exists
    if (!fs.existsSync(mcpServersPath)) {
      return; // No MCP configuration, skip
    }

    try {
      // Read config to check for active servers
      let hasActiveServers = false;
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        hasActiveServers = config.mcp?.activeServers?.length > 0;
      }

      // Read mcp-servers.json to check for any configured servers
      const mcpConfig = JSON.parse(fs.readFileSync(mcpServersPath, 'utf8'));
      const hasServers = Object.keys(mcpConfig.mcpServers || {}).length > 0;

      if (hasServers) {
        this.printStep('Setting up Claude Code MCP integration...');

        // Create .mcp.json for Claude Code
        const mcpJsonPath = path.join(this.targetDir, '.mcp.json');
        const claudeCodeConfig = {
          mcpServers: mcpConfig.mcpServers
        };

        fs.writeFileSync(mcpJsonPath, JSON.stringify(claudeCodeConfig, null, 2));
        this.printSuccess('.mcp.json created for Claude Code');

        if (!hasActiveServers) {
          // Scan for available server definitions
          const mcpDir = path.join(this.targetDir, '.claude', 'mcp');
          const availableServers = [];
          if (fs.existsSync(mcpDir)) {
            const files = fs.readdirSync(mcpDir).filter(f => f.endsWith('.md') && f !== 'MCP-REGISTRY.md');
            for (const file of files) {
              try {
                const content = fs.readFileSync(path.join(mcpDir, file), 'utf8');
                const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (fmMatch && fmMatch[1].includes('command:')) {
                  availableServers.push(path.basename(file, '.md'));
                }
              } catch (e) {
                // skip unreadable files
              }
            }
          }
          if (availableServers.length > 0) {
            console.log(`  📡 MCP Servers available: ${availableServers.join(', ')}`);
            console.log(`     Enable: autopm mcp enable ${availableServers[0]}`);
            console.log('     List all: autopm mcp list');
          } else {
            this.printMsg('CYAN', '💡 Tip: Run "autopm mcp enable <server>" to activate servers');
          }
        }
      }
    } catch (error) {
      this.printWarning(`Could not setup MCP integration: ${error.message}`);
    }
  }

  async setupGitHooks() {
    const gitDir = path.join(this.targetDir, '.git');
    if (!fs.existsSync(gitDir)) {
      this.printWarning('Not a git repository, skipping hooks setup');
      return;
    }

    this.printStep('Setting up git hooks...');

    const setupScript = path.join(this.targetDir, 'scripts', 'setup-hooks.sh');
    if (fs.existsSync(setupScript)) {
      try {
        execSync(`bash "${setupScript}"`, {
          stdio: 'inherit',
          cwd: this.targetDir
        });
        this.printSuccess('Git hooks configured');
      } catch (error) {
        this.printError('Failed to setup git hooks');
      }
    }
  }

  async runPostInstallCheck() {
    const PostInstallChecker = require('./post-install-check.js');
    const checker = new PostInstallChecker();

    try {
      await checker.runAllChecks();
    } catch (error) {
      this.printWarning(`Configuration check failed: ${error.message}`);
      console.log('You can run the check later with: autopm config validate\n');
    }
  }

  async run() {
    // Handle help and version
    if (this.options.help) {
      this.showHelp();
      process.exit(0);
    }

    if (this.options.version) {
      this.showVersion();
      process.exit(0);
    }

    // Print banner
    this.printBanner();

    // Check environment if requested
    if (this.options.checkEnv) {
      const envOk = this.checkEnvironment();
      process.exit(envOk ? 0 : 1);
    }

    // Validate target directory
    if (!this.validateTargetDir()) {
      process.exit(1);
    }

    this.printStep(`Installing to: ${this.targetDir}`);

    // Select scenario
    const scenario = await this.selectScenario();

    // Install framework files
    this.installFramework();

    // Install scripts
    this.installScripts();

    // Install configuration
    this.installConfig(scenario);

    // Install plugins based on scenario
    await this.installPlugins();

    // Install CLAUDE.md
    this.installClaudeMd();

    // Record install-time hashes so `autopm update` keeps local edits (#790)
    this.writeFrameworkManifest();

    // Setup MCP integration for Claude Code
    this.setupMCPIntegration();

    // Setup git hooks if requested
    if (this.options.setupHooks) {
      await this.setupGitHooks();
    }

    // Install npm dependencies
    this.installDependencies();

    // Final success message
    console.log('');
    this.printMsg('GREEN', '╔══════════════════════════════════════════╗');
    this.printMsg('GREEN', '║     Installation complete! 🎉            ║');
    this.printMsg('GREEN', '╚══════════════════════════════════════════╝');
    console.log('');

    // Scenario-specific next steps
    this.printScenarioNextSteps();

    // Run post-installation configuration check
    await this.runPostInstallCheck();

    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const installer = new Installer();
  installer.run().catch(error => {
    console.error(`${installer.colors.RED}Error:${installer.colors.NC} ${error.message}`);
    process.exit(1);
  });
}

module.exports = Installer;