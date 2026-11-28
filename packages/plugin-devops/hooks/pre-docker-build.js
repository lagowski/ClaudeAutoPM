#!/usr/bin/env node

/**
 * Pre-Docker-Build Hook
 *
 * Validates Dockerfile and docker-compose.yml before building images.
 * Enforces best practices from Context7 /docker/docs documentation.
 *
 * @blocking true
 * @type pre-command
 * @triggers docker:build, docker:optimize, docker-compose:up
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('━'.repeat(60), 'cyan');
  log(`🐳 ${message}`, 'cyan');
  log('━'.repeat(60), 'cyan');
}

function checkmark(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Parse command to detect Docker operations
 */
function parseCommand(args) {
  const command = args.join(' ');
  return {
    isDockerBuild: command.includes('docker:build') ||
                   command.includes('docker build') ||
                   command.includes('docker:optimize'),
    isCompose: command.includes('docker-compose') || command.includes('compose'),
    dockerfile: extractDockerfile(args),
    force: command.includes('--force') || command.includes('-f'),
  };
}

function extractDockerfile(args) {
  const fileIndex = args.findIndex(arg => arg === '--file' || arg === '-f');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    return args[fileIndex + 1];
  }
  return 'Dockerfile';
}

/**
 * Check if Dockerfile exists
 */
function checkDockerfileExists(dockerfile) {
  if (!fs.existsSync(dockerfile)) {
    error(`Dockerfile not found: ${dockerfile}`);
    return false;
  }
  checkmark(`Dockerfile found: ${dockerfile}`);
  return true;
}

/**
 * Analyze Dockerfile for best practices
 * Based on Context7 /docker/docs patterns
 */
function analyzeDockerfile(dockerfile) {
  const issues = {
    critical: [],
    warnings: [],
    improvements: [],
  };

  const content = fs.readFileSync(dockerfile, 'utf8');
  const lines = content.split('\n');

  header('Dockerfile Best Practices Analysis');

  // Check 1: FROM base image
  const fromLines = lines.filter(l => l.trim().startsWith('FROM '));
  if (fromLines.length === 0) {
    issues.critical.push('No FROM instruction found');
  } else {
    // Check for latest tag
    const hasLatest = fromLines.some(l => l.includes(':latest') || !l.includes(':'));
    if (hasLatest) {
      issues.warnings.push('Using :latest tag or no tag - pin specific version for reproducibility');
    }

    // Check for multi-stage
    if (fromLines.length > 1) {
      checkmark(`Multi-stage build detected (${fromLines.length} stages)`);
    } else {
      issues.improvements.push('Consider multi-stage build for smaller final image');
    }

    // Check for Alpine/slim variants
    const hasOptimized = fromLines.some(l => l.includes('alpine') || l.includes('slim') || l.includes('distroless'));
    if (!hasOptimized) {
      issues.improvements.push('Consider using Alpine or slim base images for smaller size');
    } else {
      checkmark('Using optimized base image (alpine/slim/distroless)');
    }
  }

  // Check 2: COPY vs ADD
  const addInstructions = lines.filter(l => l.trim().startsWith('ADD '));
  if (addInstructions.length > 0) {
    issues.warnings.push(`Found ${addInstructions.length} ADD instruction(s) - prefer COPY unless extracting archives`);
  }

  // Check 3: Layer optimization - COPY before dependency install
  let foundCopyAll = false;
  let foundInstall = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('COPY . ') || trimmed.startsWith('COPY ./ ')) {
      foundCopyAll = true;
    }

    if (!foundCopyAll && (
      trimmed.includes('npm install') ||
      trimmed.includes('pip install') ||
      trimmed.includes('yarn install') ||
      trimmed.includes('go mod download')
    )) {
      foundInstall = true;
    }
  }

  if (foundCopyAll && !foundInstall) {
    issues.warnings.push('COPY . before dependency installation - poor layer caching');
    issues.improvements.push('Copy package/requirements files first, install deps, then copy source');
  } else if (foundInstall) {
    checkmark('Dependencies installed before copying all source files');
  }

  // Check 4: Running as root
  const hasUser = lines.some(l => l.trim().startsWith('USER ') && !l.includes('USER root'));
  if (!hasUser) {
    issues.critical.push('No non-root USER specified - security risk');
  } else {
    checkmark('Non-root user configured');
  }

  // Check 5: WORKDIR usage
  const hasWorkdir = lines.some(l => l.trim().startsWith('WORKDIR '));
  if (!hasWorkdir) {
    issues.warnings.push('No WORKDIR specified - use WORKDIR instead of cd commands');
  }

  // Check 6: apt-get without cleanup
  const aptGetLines = lines.filter(l => l.includes('apt-get install'));
  for (const line of aptGetLines) {
    if (!line.includes('rm -rf /var/lib/apt/lists')) {
      issues.warnings.push('apt-get install without cleanup - image size not optimized');
      break;
    }
  }

  // Check 7: Multiple RUN commands that could be chained
  const runCommands = lines.filter(l => l.trim().startsWith('RUN '));
  if (runCommands.length > 5) {
    issues.improvements.push(`${runCommands.length} RUN commands - consider chaining with && for fewer layers`);
  }

  // Check 8: HEALTHCHECK
  const hasHealthcheck = lines.some(l => l.trim().startsWith('HEALTHCHECK '));
  if (!hasHealthcheck) {
    issues.improvements.push('No HEALTHCHECK defined - add for better container monitoring');
  } else {
    checkmark('HEALTHCHECK configured');
  }

  // Check 9: LABEL for metadata
  const hasLabels = lines.some(l => l.trim().startsWith('LABEL '));
  if (!hasLabels) {
    issues.improvements.push('No LABELs defined - add metadata for better organization');
  }

  // Check 10: Hardcoded secrets
  const secretPatterns = [
    /password\s*=\s*["'][^"']+["']/i,
    /secret\s*=\s*["'][^"']+["']/i,
    /api[_-]?key\s*=\s*["'][^"']+["']/i,
    /token\s*=\s*["'][^"']+["']/i,
  ];

  for (const line of lines) {
    for (const pattern of secretPatterns) {
      if (pattern.test(line)) {
        issues.critical.push('Potential hardcoded secret detected in Dockerfile');
        break;
      }
    }
  }

  // Check 11: BuildKit syntax
  const hasBuildKitSyntax = lines.some(l => l.includes('# syntax=docker/dockerfile:'));
  if (!hasBuildKitSyntax) {
    issues.improvements.push('Add # syntax=docker/dockerfile:1 for BuildKit features');
  } else {
    checkmark('BuildKit syntax enabled');
  }

  return issues;
}

/**
 * Check for .dockerignore
 */
function checkDockerignore() {
  header('.dockerignore Validation');

  if (!fs.existsSync('.dockerignore')) {
    warning('.dockerignore file not found');
    info('Creating .dockerignore can reduce build context and improve security');
    return false;
  }

  checkmark('.dockerignore file exists');

  const content = fs.readFileSync('.dockerignore', 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const recommended = [
    { pattern: '.git', description: 'Version control' },
    { pattern: 'node_modules', description: 'Dependencies' },
    { pattern: '.env', description: 'Environment files' },
    { pattern: '*.log', description: 'Log files' },
    { pattern: 'README.md', description: 'Documentation' },
  ];

  let missing = [];
  for (const rec of recommended) {
    if (!lines.some(l => l.includes(rec.pattern))) {
      missing.push(rec);
    }
  }

  if (missing.length > 0) {
    warning('Recommended patterns missing from .dockerignore:');
    missing.forEach(m => {
      log(`  - ${m.pattern} (${m.description})`, 'yellow');
    });
  } else {
    checkmark('All recommended patterns present');
  }

  return true;
}

/**
 * Check for docker-compose.yml
 */
function checkDockerCompose() {
  const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  const found = composeFiles.find(f => fs.existsSync(f));

  if (!found) {
    return null;
  }

  header('Docker Compose Validation');
  checkmark(`Docker Compose file found: ${found}`);

  try {
    execSync('docker-compose config', { stdio: 'ignore' });
    checkmark('Docker Compose configuration is valid');
    return { valid: true, issues: [] };
  } catch (e) {
    error('Docker Compose configuration is invalid');
    return { valid: false, issues: ['Invalid docker-compose configuration'] };
  }
}

/**
 * Remind about Context7 queries
 */
function remindContext7() {
  header('Context7 Documentation Queries');

  info('Before building, query Context7 (resolve-library-id, then query-docs) for:');
  console.log('');

  const queries = [
    'docker: best-practices',
    'docker: multi-stage-builds',
    'docker: security',
    'docker: buildkit',
  ];

  queries.forEach(query => {
    log(`  → ${query}`, 'cyan');
  });

  console.log('');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    error('No command arguments provided');
    process.exit(1);
  }

  const command = parseCommand(args);

  if (!command.isDockerBuild && !command.isCompose) {
    // Not a Docker command, exit silently
    process.exit(0);
  }

  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         DOCKER BUILD VALIDATION PRE-BUILD HOOK             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  // Remind about Context7
  remindContext7();

  let allIssues = {
    critical: [],
    warnings: [],
    improvements: [],
  };

  // Check Dockerfile
  if (command.isDockerBuild) {
    if (!checkDockerfileExists(command.dockerfile)) {
      process.exit(1);
    }

    const dockerfileIssues = analyzeDockerfile(command.dockerfile);
    allIssues.critical.push(...dockerfileIssues.critical);
    allIssues.warnings.push(...dockerfileIssues.warnings);
    allIssues.improvements.push(...dockerfileIssues.improvements);
  }

  // Check .dockerignore
  checkDockerignore();

  // Check docker-compose if present
  if (command.isCompose) {
    const composeResult = checkDockerCompose();
    if (composeResult && !composeResult.valid) {
      allIssues.critical.push(...composeResult.issues);
    }
  }

  // Display results
  header('Validation Summary');

  if (allIssues.critical.length === 0 &&
      allIssues.warnings.length === 0 &&
      allIssues.improvements.length === 0) {
    checkmark('All checks passed! Ready to build.');
    console.log('');
    log('✨ Docker build can proceed safely', 'green');
    console.log('');
    process.exit(0);
  }

  // Display critical issues
  if (allIssues.critical.length > 0) {
    console.log('');
    error(`Found ${allIssues.critical.length} CRITICAL issue(s):`);
    allIssues.critical.forEach((issue, index) => {
      log(`  ${index + 1}. ${issue}`, 'red');
    });
  }

  // Display warnings
  if (allIssues.warnings.length > 0) {
    console.log('');
    warning(`Found ${allIssues.warnings.length} warning(s):`);
    allIssues.warnings.forEach((issue, index) => {
      log(`  ${index + 1}. ${issue}`, 'yellow');
    });
  }

  // Display improvements
  if (allIssues.improvements.length > 0) {
    console.log('');
    info(`${allIssues.improvements.length} improvement suggestion(s):`);
    allIssues.improvements.forEach((issue, index) => {
      log(`  ${index + 1}. ${issue}`, 'blue');
    });
  }

  console.log('');

  // Decision logic
  if (allIssues.critical.length > 0) {
    if (command.force) {
      warning('CRITICAL issues found, but --force flag provided');
      warning('Proceeding with build (NOT RECOMMENDED)');
      console.log('');
      process.exit(0);
    } else {
      error('🚫 BUILD BLOCKED due to critical issues');
      console.log('');
      info('To proceed anyway (NOT RECOMMENDED), use --force flag');
      info('To fix issues, review the findings above and update your Dockerfile');
      console.log('');
      process.exit(1);
    }
  }

  // Only warnings or improvements
  if (allIssues.warnings.length > 0) {
    warning('Warnings detected - recommended to address before building');
  }

  if (allIssues.improvements.length > 0) {
    info('Consider improvements for better optimization and security');
  }

  console.log('');
  checkmark('Build can proceed (with warnings/improvements)');
  console.log('');

  process.exit(0);
}

// Run main function
try {
  main();
} catch (error) {
  console.error('');
  log('❌ Hook execution failed:', 'red');
  console.error(error.message);
  console.error('');

  // Don't block build on hook errors (fail open)
  log('⚠️  Allowing build to proceed despite hook error', 'yellow');
  process.exit(0);
}
