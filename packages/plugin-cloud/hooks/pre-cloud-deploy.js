#!/usr/bin/env node

/**
 * Pre-Cloud-Deploy Hook
 *
 * Enforces cloud security compliance before any infrastructure deployment.
 * This hook validates terraform/IAC configurations against security best practices.
 *
 * @blocking true
 * @type pre-command
 * @triggers cloud:deploy, infra-deploy, k8s-deploy, terraform-deploy
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for output
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
  log(`🔒 ${message}`, 'cyan');
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
 * Parse command arguments to extract deployment details
 */
function parseCommandArgs(args) {
  const commandString = args.join(' ');

  return {
    isCloudDeploy: commandString.includes('cloud:deploy') ||
                   commandString.includes('infra-deploy') ||
                   commandString.includes('k8s-deploy') ||
                   commandString.includes('terraform'),
    provider: extractProvider(commandString),
    environment: extractEnvironment(commandString),
    dryRun: commandString.includes('--dry-run') || commandString.includes('--plan'),
    force: commandString.includes('--force') || commandString.includes('-f'),
  };
}

function extractProvider(command) {
  if (command.includes('aws')) return 'aws';
  if (command.includes('azure')) return 'azure';
  if (command.includes('gcp')) return 'gcp';
  if (command.includes('k8s') || command.includes('kubernetes')) return 'kubernetes';
  return 'unknown';
}

function extractEnvironment(command) {
  if (command.includes('prod')) return 'production';
  if (command.includes('staging')) return 'staging';
  if (command.includes('dev')) return 'development';
  return 'unknown';
}

/**
 * Check if Terraform is being used
 */
function isTerraformProject() {
  return fs.existsSync('main.tf') ||
         fs.existsSync('terraform.tf') ||
         fs.existsSync('.terraform') ||
         fs.existsSync('terraform.tfstate');
}

/**
 * Run Terraform security validation
 */
function validateTerraform() {
  const issues = {
    critical: [],
    warnings: [],
  };

  header('Terraform Security Validation');

  // Check terraform validate
  try {
    info('Running terraform validate...');
    execSync('terraform validate', { stdio: 'inherit' });
    checkmark('Terraform configuration is valid');
  } catch (e) {
    error('Terraform validation failed');
    issues.critical.push('Terraform configuration is invalid');
  }

  // Check for tfsec (if installed)
  try {
    execSync('which tfsec', { stdio: 'ignore' });
    info('Running tfsec security scan...');

    try {
      execSync('tfsec . --format json > /tmp/tfsec-results.json', { stdio: 'ignore' });

      if (fs.existsSync('/tmp/tfsec-results.json')) {
        const results = JSON.parse(fs.readFileSync('/tmp/tfsec-results.json', 'utf8'));

        if (results.results && results.results.length > 0) {
          results.results.forEach(result => {
            if (result.severity === 'CRITICAL' || result.severity === 'HIGH') {
              issues.critical.push(`${result.rule_id}: ${result.description}`);
            } else {
              issues.warnings.push(`${result.rule_id}: ${result.description}`);
            }
          });
        } else {
          checkmark('No security issues found by tfsec');
        }
      }
    } catch (e) {
      warning('tfsec scan completed with findings');
    }
  } catch (e) {
    info('tfsec not installed - skipping advanced security scan');
    info('Install with: brew install tfsec (or see https://aquasecurity.github.io/tfsec)');
  }

  return issues;
}

/**
 * Check for common security anti-patterns in Terraform files
 */
function checkSecurityPatterns() {
  const issues = {
    critical: [],
    warnings: [],
  };

  header('Security Pattern Analysis');

  const tfFiles = findTerraformFiles('.');

  tfFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Check for public S3 buckets
    if (content.includes('acl') && content.includes('public-read')) {
      issues.critical.push(`${file}: Public S3 bucket detected (acl = "public-read")`);
    }

    // Check for unrestricted security groups
    if (content.includes('0.0.0.0/0') &&
        (content.includes('port') || content.includes('ingress'))) {

      // Check if it's SSH/RDP
      if (content.includes('"22"') || content.includes('"3389"')) {
        issues.critical.push(`${file}: SSH/RDP open to internet (0.0.0.0/0)`);
      } else {
        issues.warnings.push(`${file}: Ingress rule allows 0.0.0.0/0 - verify if intended`);
      }
    }

    // Check for missing encryption
    if (content.includes('aws_s3_bucket') &&
        !content.includes('server_side_encryption')) {
      issues.warnings.push(`${file}: S3 bucket without encryption configuration`);
    }

    if (content.includes('aws_ebs_volume') &&
        !content.includes('encrypted')) {
      issues.warnings.push(`${file}: EBS volume without encryption`);
    }

    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /access[_-]?key\s*=\s*["'][^"']+["']/i,
    ];

    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.critical.push(`${file}: Potential hardcoded secret detected`);
      }
    });

    // Check for wildcard IAM permissions
    if (content.includes('"*"') &&
        (content.includes('Action') || content.includes('Resource'))) {
      issues.warnings.push(`${file}: Wildcard IAM permissions detected`);
    }
  });

  if (issues.critical.length === 0 && issues.warnings.length === 0) {
    checkmark('No security anti-patterns detected');
  }

  return issues;
}

/**
 * Find all Terraform files recursively
 */
function findTerraformFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip common directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        findTerraformFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tf')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check for required tags
 */
function checkRequiredTags() {
  header('Required Tags Validation');

  const requiredTags = ['Environment', 'Owner', 'CostCenter'];
  const issues = [];

  const tfFiles = findTerraformFiles('.');
  let taggedResources = 0;
  let totalResources = 0;

  tfFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Simple heuristic: count resources
    const resourceMatches = content.match(/resource\s+"[^"]+"\s+"[^"]+"/g);
    if (resourceMatches) {
      totalResources += resourceMatches.length;

      // Check if tags block exists
      if (content.includes('tags')) {
        taggedResources += resourceMatches.length;
      }
    }
  });

  if (totalResources > 0) {
    const taggedPercentage = ((taggedResources / totalResources) * 100).toFixed(1);

    if (taggedPercentage < 100) {
      warning(`Only ${taggedPercentage}% of resources have tags`);
      issues.push(`Required tags (${requiredTags.join(', ')}) should be present on all resources`);
    } else {
      checkmark('All resources have tags defined');
    }
  } else {
    info('No resources found for tag validation');
  }

  return issues;
}

/**
 * Remind about Context7 queries
 */
function remindContext7Queries(provider) {
  header('Context7 Documentation Queries');

  info('Before deployment, query Context7 (resolve-library-id, then query-docs) for:');
  console.log('');

  const queries = [];

  if (provider === 'aws') {
    queries.push('aws: security');
    queries.push('aws: best-practices');
  } else if (provider === 'azure') {
    queries.push('azure: security');
    queries.push('azure: best-practices');
  } else if (provider === 'gcp') {
    queries.push('gcp: security');
    queries.push('gcp: best-practices');
  }

  if (isTerraformProject()) {
    queries.push('terraform: security');
  }

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

  const commandInfo = parseCommandArgs(args);

  if (!commandInfo.isCloudDeploy) {
    // Not a cloud deployment command, exit silently
    process.exit(0);
  }

  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         CLOUD SECURITY COMPLIANCE PRE-DEPLOY HOOK          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  info(`Provider: ${commandInfo.provider}`);
  info(`Environment: ${commandInfo.environment}`);
  info(`Dry Run: ${commandInfo.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Remind about Context7 queries
  remindContext7Queries(commandInfo.provider);

  let allIssues = {
    critical: [],
    warnings: [],
  };

  // Run validations if Terraform project
  if (isTerraformProject()) {
    const tfIssues = validateTerraform();
    allIssues.critical.push(...tfIssues.critical);
    allIssues.warnings.push(...tfIssues.warnings);

    const patternIssues = checkSecurityPatterns();
    allIssues.critical.push(...patternIssues.critical);
    allIssues.warnings.push(...patternIssues.warnings);

    const tagIssues = checkRequiredTags();
    allIssues.warnings.push(...tagIssues);
  } else {
    info('Not a Terraform project - skipping Terraform-specific checks');
  }

  // Display results
  header('Validation Summary');

  if (allIssues.critical.length === 0 && allIssues.warnings.length === 0) {
    checkmark('All security checks passed!');
    console.log('');
    log('✨ Deployment can proceed safely', 'green');
    console.log('');
    process.exit(0);
  }

  // Display critical issues
  if (allIssues.critical.length > 0) {
    console.log('');
    error(`Found ${allIssues.critical.length} CRITICAL security issue(s):`);
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

  console.log('');

  // Decision logic
  if (allIssues.critical.length > 0) {
    if (commandInfo.force) {
      warning('CRITICAL issues found, but --force flag provided');
      warning('Proceeding with deployment (NOT RECOMMENDED)');
      console.log('');
      process.exit(0);
    } else {
      error('🚫 DEPLOYMENT BLOCKED due to critical security issues');
      console.log('');
      info('To proceed anyway (NOT RECOMMENDED), use --force flag');
      info('To fix issues, review the findings above and update your configuration');
      console.log('');
      process.exit(1);
    }
  }

  // Only warnings
  if (allIssues.warnings.length > 0) {
    if (commandInfo.environment === 'production') {
      warning('Warnings detected in PRODUCTION deployment');
      warning('Strongly recommended to address warnings before deploying');
    } else {
      info('Warnings detected - recommended to fix, but not blocking deployment');
    }
  }

  console.log('');
  checkmark('Deployment can proceed (with warnings)');
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

  // Don't block deployment on hook errors (fail open)
  log('⚠️  Allowing deployment to proceed despite hook error', 'yellow');
  process.exit(0);
}
