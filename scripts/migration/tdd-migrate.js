#!/usr/bin/env node

/**
 * TDD Migration Assistant
 * Helps migrate Bash scripts to Node.js using Test-Driven Development
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
// Use our custom colors module instead of chalk
const colors = require('../../lib/utils/colors');

class TDDMigrationAssistant {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.testsDir = path.join(this.projectRoot, 'test/node-scripts');
    this.nodeScriptsDir = path.join(this.projectRoot, 'bin/node');
  }

  /**
   * Main entry point
   */
  async run(cliAction = null) {
    console.log(colors.boldCyan('\n🚀 TDD Migration Assistant\n'));

    // Use CLI action if provided, otherwise prompt
    let action = cliAction;

    if (!action) {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Start new migration (TDD)', value: 'new' },
            { name: 'Generate tests for bash script', value: 'generate-tests' },
            { name: 'Check migration status', value: 'status' },
            { name: 'Run migration tests', value: 'run-tests' },
            { name: 'Compare bash vs node output', value: 'compare' },
            { name: 'Generate migration report', value: 'report' }
          ]
        }
      ]);
      action = answer.action;
    }

    switch (action) {
      case 'new':
      case 'next':
        await this.startNewMigration();
        break;
      case 'generate-tests':
        await this.generateTests();
        break;
      case 'status':
        await this.checkStatus();
        break;
      case 'run-tests':
        await this.runTests();
        break;
      case 'compare':
        await this.compareOutputs();
        break;
      case 'report':
        await this.generateReport();
        break;
    }
  }

  /**
   * Start a new TDD migration
   */
  async startNewMigration() {
    // List available bash scripts
    const bashScripts = this.findBashScripts();

    const { script } = await inquirer.prompt([
      {
        type: 'list',
        name: 'script',
        message: 'Select script to migrate:',
        choices: bashScripts.map(s => ({
          name: `${s.name} (${s.priority}, ${s.lines} lines)`,
          value: s.path
        }))
      }
    ]);

    console.log(colors.yellow('\n📝 Starting TDD migration for:'), script);

    // Step 1: Analyze the bash script
    console.log(colors.blue('\n1. Analyzing bash script...'));
    const analysis = await this.analyzeBashScript(script);

    // Step 2: Generate test file
    console.log(colors.blue('\n2. Generating test file...'));
    const testFile = await this.createTestFile(script, analysis);
    console.log(colors.green('✓ Test file created:'), testFile);

    // Step 3: Run tests (should fail)
    console.log(colors.blue('\n3. Running tests (expected to fail)...'));
    await this.runTestFile(testFile);

    // Step 4: Generate Node.js skeleton
    console.log(colors.blue('\n4. Generating Node.js skeleton...'));
    const nodeFile = await this.generateSkeleton(script, analysis);
    console.log(colors.green('✓ Skeleton created:'), nodeFile);

    // Step 5: Open files for implementation
    console.log(colors.cyan('\n📋 Next steps:'));
    console.log('1. Implement the Node.js version to make tests pass');
    console.log('2. Run: npm run test:migration --', path.basename(testFile));
    console.log('3. Refactor and optimize once tests are green');
  }

  /**
   * Analyze a bash script
   */
  async analyzeBashScript(scriptPath) {
    const content = await fs.readFile(scriptPath, 'utf8');
    const lines = content.split('\n');

    const analysis = {
      path: scriptPath,
      name: path.basename(scriptPath),
      lines: lines.length,
      functions: [],
      dependencies: [],
      arguments: [],
      environment: [],
      commands: []
    };

    // Extract functions
    const funcRegex = /^(?:function\s+)?(\w+)\s*\(\)/gm;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      analysis.functions.push(match[1]);
    }

    // Extract external commands
    const cmdRegex = /(?:^|\s)(git|npm|docker|kubectl|gh|az|curl|wget|jq|awk|sed|grep)\b/gm;
    const commands = new Set();
    while ((match = cmdRegex.exec(content)) !== null) {
      commands.add(match[1]);
    }
    analysis.commands = Array.from(commands);

    // Extract argument handling
    if (content.includes('$1') || content.includes('$@') || content.includes('$*')) {
      analysis.arguments = ['uses positional arguments'];
    }
    if (content.includes('getopts')) {
      analysis.arguments.push('uses getopts');
    }

    // Extract environment variables
    const envRegex = /\$\{?([A-Z_][A-Z0-9_]*)\}?/g;
    const envVars = new Set();
    while ((match = envRegex.exec(content)) !== null) {
      if (!['PATH', 'HOME', 'USER', 'PWD', 'SHELL'].includes(match[1])) {
        envVars.add(match[1]);
      }
    }
    analysis.environment = Array.from(envVars);

    return analysis;
  }

  /**
   * Create test file for a script
   */
  async createTestFile(scriptPath, analysis) {
    const scriptName = path.basename(scriptPath, '.sh');
    const priority = this.detectPriority(scriptPath);
    const testDir = path.join(this.testsDir, priority);
    const testFile = path.join(testDir, `${scriptName}.test.js`);

    await fs.ensureDir(testDir);

    const testContent = this.generateTestContent(scriptName, analysis);
    await fs.writeFile(testFile, testContent);

    return testFile;
  }

  /**
   * Generate test content
   */
  generateTestContent(scriptName, analysis) {
    return `#!/usr/bin/env node

/**
 * TDD Tests for ${scriptName}
 * Generated on ${new Date().toISOString()}
 *
 * Bash script analysis:
 * - Lines: ${analysis.lines}
 * - Functions: ${analysis.functions.join(', ') || 'none'}
 * - External commands: ${analysis.commands.join(', ') || 'none'}
 * - Environment vars: ${analysis.environment.join(', ') || 'none'}
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

describe('${scriptName} Migration Tests', () => {
  let tempDir;
  let scriptPath;

  beforeEach(async () => {
    // Setup test environment
    tempDir = path.join(os.tmpdir(), 'test-${scriptName}-' + Date.now());
    await fs.ensureDir(tempDir);
    scriptPath = path.join(__dirname, '../../../bin/node/${scriptName}.js');
  });

  afterEach(async () => {
    // Cleanup
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Core Functionality', () => {
    it('should execute without errors', async () => {
      // This test should fail initially (script doesn't exist)
      assert.ok(await fs.pathExists(scriptPath), 'Script file should exist');
    });

    it('should handle --help flag', async () => {
      // Test help output
      const output = execSync(\`node \${scriptPath} --help\`, {
        encoding: 'utf8',
        cwd: tempDir
      });
      assert.ok(output.includes('Usage:'), 'Should show usage information');
    });

    it('should handle --version flag', async () => {
      // Test version output
      const output = execSync(\`node \${scriptPath} --version\`, {
        encoding: 'utf8',
        cwd: tempDir
      });
      assert.ok(output.match(/\\d+\\.\\d+\\.\\d+/), 'Should show version number');
    });
  });

${analysis.functions.length > 0 ? `
  describe('Function Tests', () => {
${analysis.functions.map(func => `
    it('should implement ${func} function', async () => {
      // TODO: Test ${func} functionality
      assert.ok(true, 'Implement ${func} test');
    });
`).join('')}
  });
` : ''}

${analysis.commands.length > 0 ? `
  describe('External Command Integration', () => {
${analysis.commands.map(cmd => `
    it('should handle ${cmd} command execution', async () => {
      // TODO: Test ${cmd} integration
      assert.ok(true, 'Implement ${cmd} integration test');
    });
`).join('')}
  });
` : ''}

${analysis.environment.length > 0 ? `
  describe('Environment Variables', () => {
${analysis.environment.map(env => `
    it('should handle ${env} environment variable', async () => {
      process.env.${env} = 'test-value';
      // TODO: Test ${env} handling
      assert.ok(true, 'Implement ${env} handling test');
    });
`).join('')}
  });
` : ''}

  describe('Error Handling', () => {
    it('should handle missing arguments gracefully', async () => {
      // Test missing arguments
      try {
        execSync(\`node \${scriptPath}\`, {
          encoding: 'utf8',
          cwd: tempDir
        });
      } catch (error) {
        assert.ok(error.message.includes('Usage'), 'Should show usage on error');
      }
    });

    it('should handle invalid inputs', async () => {
      // Test invalid inputs
      assert.ok(true, 'Implement invalid input test');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain same CLI interface as bash script', async () => {
      // Compare CLI interfaces
      assert.ok(true, 'Implement CLI compatibility test');
    });

    it('should produce same output format as bash script', async () => {
      // Compare output formats
      assert.ok(true, 'Implement output format test');
    });
  });

  describe('Performance', () => {
    it('should execute faster than bash script', async () => {
      // Benchmark performance
      const start = Date.now();
      // Execute Node version
      const duration = Date.now() - start;
      assert.ok(duration < 1000, 'Should execute within 1 second');
    });
  });
});
`;
  }

  /**
   * Generate Node.js skeleton
   */
  async generateSkeleton(scriptPath, analysis) {
    const scriptName = path.basename(scriptPath, '.sh');
    const nodeFile = path.join(this.nodeScriptsDir, `${scriptName}.js`);

    const skeleton = `#!/usr/bin/env node

/**
 * ${scriptName} - Node.js implementation
 * Migrated from: ${scriptPath}
 *
 * Original script had:
 * - ${analysis.lines} lines
 * - Functions: ${analysis.functions.join(', ') || 'none'}
 * - Commands: ${analysis.commands.join(', ') || 'none'}
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs');
const colors = require('../../lib/utils/colors');

class ${this.toPascalCase(scriptName)} {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
  }

${analysis.functions.map(func => `
  /**
   * ${func} - TODO: Implement
   */
  async ${this.toCamelCase(func)}() {
    // TODO: Implement ${func}
    throw new Error(\`Not implemented: \${func}\`);
  }
`).join('')}

  /**
   * Main execution
   */
  async run() {
    try {
      // TODO: Implement main logic
      console.log('${scriptName}: Not yet implemented');

      // Call functions as needed
${analysis.functions.map(func => `      // await this.${this.toCamelCase(func)}();`).join('\n')}

    } catch (error) {
      console.error(colors.red('Error:'), error.message);
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// CLI setup
const argv = yargs
  .usage('Usage: $0 [options]')
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Verbose output'
  })
  .option('help', {
    alias: 'h',
    type: 'boolean',
    description: 'Show help'
  })
  .option('version', {
    type: 'boolean',
    description: 'Show version'
  })
  .help()
  .argv;

// Run if called directly
if (require.main === module) {
  const instance = new ${this.toPascalCase(scriptName)}(argv);
  instance.run();
}

module.exports = ${this.toPascalCase(scriptName)};
`;

    await fs.writeFile(nodeFile, skeleton);
    return nodeFile;
  }

  /**
   * Find all bash scripts grouped by priority
   */
  findBashScripts() {
    const scripts = [];
    const priorities = {
      'install/autopm.sh': 'P1',
      'scripts/test.sh': 'P2',
      'test/installation/integration.test.sh': 'P2',
    };

    for (const [scriptPath, priority] of Object.entries(priorities)) {
      const fullPath = path.join(this.projectRoot, scriptPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        scripts.push({
          name: path.basename(scriptPath),
          path: fullPath,
          priority,
          lines: content.split('\n').length,
          size: stats.size
        });
      }
    }

    return scripts.sort((a, b) => {
      const priorityOrder = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Detect priority from path
   */
  detectPriority(scriptPath) {
    if (scriptPath.includes('autopm.sh')) return 'p1';
    if (scriptPath.includes('test')) return 'p2';
    if (scriptPath.includes('clean') || scriptPath.includes('migrate')) return 'p3';
    if (scriptPath.includes('/pm/')) return 'p4';
    return 'p5';
  }

  /**
   * Run test file
   */
  async runTestFile(testFile) {
    try {
      console.log(colors.yellow('\nRunning tests...'));
      execSync(`node --test ${testFile}`, {
        stdio: 'inherit',
        cwd: this.projectRoot
      });
      console.log(colors.green('✓ Tests passed!'));
    } catch (error) {
      console.log(colors.red('✗ Tests failed (expected for new migration)'));
    }
  }

  /**
   * Check migration status
   */
  async checkStatus() {
    console.log(colors.bold('\n📊 Migration Status\n'));

    const migrated = fs.readdirSync(this.nodeScriptsDir).filter(f => f.endsWith('.js'));
    const tests = [];

    for (const priority of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      const testDir = path.join(this.testsDir, priority);
      if (fs.existsSync(testDir)) {
        tests.push(...fs.readdirSync(testDir).filter(f => f.endsWith('.test.js')));
      }
    }

    console.log('Migrated scripts:', colors.green(migrated.length));
    console.log('Test files:', colors.yellow(tests.length));
    console.log('Coverage:', colors.cyan(`${Math.round((migrated.length / 56) * 100)}%`));

    console.log('\nRecent migrations:');
    migrated.slice(-5).forEach(file => {
      console.log(`  ✓ ${file}`);
    });
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    console.log(colors.bold('\n📝 Migration Report\n'));

    const bashScripts = this.findBashScripts();
    const migrated = fs.readdirSync(this.nodeScriptsDir)
      .filter(file => file.endsWith('.js'));

    console.log(colors.cyan('='.repeat(50)));
    console.log(colors.bold('Overall Progress'));
    console.log(colors.cyan('='.repeat(50)));
    console.log(`Total Bash scripts: ${bashScripts.length}`);
    console.log(`Migrated to Node.js: ${migrated.length}`);
    console.log(`Remaining: ${bashScripts.length - migrated.length}`);
    console.log(`Progress: ${colors.green(`${Math.round((migrated.length / bashScripts.length) * 100)}%`)}`);

    console.log('\n' + colors.cyan('='.repeat(50)));
    console.log(colors.bold('Scripts by Priority'));
    console.log(colors.cyan('='.repeat(50)));

    const byPriority = {};
    bashScripts.forEach(script => {
      if (!byPriority[script.priority]) {
        byPriority[script.priority] = { total: 0, migrated: 0, scripts: [] };
      }
      byPriority[script.priority].total++;
      byPriority[script.priority].scripts.push(script);

      const nodeName = script.name.replace(/\.(sh|bash)$/, '.js');
      if (migrated.includes(nodeName)) {
        byPriority[script.priority].migrated++;
      }
    });

    for (const [priority, data] of Object.entries(byPriority)) {
      const pct = Math.round((data.migrated / data.total) * 100);
      const statusText = `${data.migrated}/${data.total}`;
      const coloredStatus = pct === 100 ? colors.green(statusText) :
                           pct > 0 ? colors.yellow(statusText) :
                           colors.red(statusText);
      console.log(`\n${colors.bold(priority)}: ${coloredStatus} (${pct}%)`);
      data.scripts.forEach(script => {
        const nodeName = script.name.replace(/\.(sh|bash)$/, '.js');
        const status = migrated.includes(nodeName) ? colors.green('✓') : colors.red('✗');
        console.log(`  ${status} ${script.name}`);
      });
    }

    console.log('\n' + colors.cyan('='.repeat(50)));
    console.log(colors.bold('Next Steps'));
    console.log(colors.cyan('='.repeat(50)));
    console.log('1. Run: npm run migration:next');
    console.log('2. Follow TDD process (RED → GREEN → REFACTOR)');
    console.log('3. Run: npm run migration:test');
    console.log('4. Commit when tests pass');
  }

  /**
   * Helper functions
   */
  toPascalCase(str) {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
      .replace(/\s/g, '');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

// Run if called directly
if (require.main === module) {
  const assistant = new TDDMigrationAssistant();

  // Get command from CLI arguments
  const args = process.argv.slice(2);
  const command = args[0];

  // Map common commands to actions
  const commandMap = {
    'status': 'status',
    'next': 'next',
    'new': 'new',
    'test': 'run-tests',
    'tests': 'run-tests',
    'report': 'report',
    'compare': 'compare'
  };

  const action = commandMap[command] || command;

  assistant.run(action).catch(error => {
    console.error(colors.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = TDDMigrationAssistant;