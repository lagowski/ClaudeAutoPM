# Troubleshooting

Common issues and solutions for ClaudeAutoPM installation, configuration, and daily usage. This guide covers the most frequently encountered problems and their step-by-step solutions.

## 🚨 Quick Diagnostics

Before diving into specific issues, run these commands to identify problems:

```bash
# Check installation status
autopm --version

# Validate configuration
autopm validate

# Check system health
npm run pm:health

# View recent logs
tail -f ~/.autopm/logs/autopm.log
```

## Installation Issues

### NPM Installation Fails

**Problem**: `npm install -g claude-autopm` fails with permission errors

**Solution**:
```bash
# Option 1: Use different npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g claude-autopm

# Option 2: Use sudo (not recommended)
sudo npm install -g claude-autopm

# Option 3: Use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
npm install -g claude-autopm
```

### Package Not Found

**Problem**: `autopm: command not found` after installation

**Solutions**:
```bash
# Check if installed
npm list -g claude-autopm

# Check PATH
echo $PATH
which autopm

# Reinstall if needed
npm uninstall -g claude-autopm
npm install -g claude-autopm

# Add to PATH manually
echo 'export PATH=$PATH:~/.npm-global/bin' >> ~/.bashrc
source ~/.bashrc
```

### Version Conflicts

**Problem**: Multiple versions of ClaudeAutoPM installed

**Solution**:
```bash
# Remove all versions
npm uninstall -g claude-autopm
npm cache clean --force

# Check for local installations
find . -name "node_modules" -type d -exec rm -rf {} +

# Fresh install
npm install -g claude-autopm@latest
```

### Node.js Version Issues

**Problem**: `Node.js version not supported` error

**Requirements**: Node.js ≥ 22.0.0, npm ≥ 10.0.0

**Solution**:
```bash
# Check versions
node --version
npm --version

# Update Node.js
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

## Configuration Issues

### Environment Variables Not Loaded

**Problem**: Environment variables in `.claude/.env` not recognized

**Solution**:
```bash
# Check if .env exists
ls -la .claude/.env

# Verify format (no spaces around =)
cat .claude/.env

# Check for BOM or special characters
file .claude/.env

# Reload environment
source .claude/.env
autopm validate
```

### Invalid Configuration File

**Problem**: `Invalid configuration in .claude/config.json`

**Solution**:
```bash
# Validate JSON
cat .claude/config.json | jq .

# If invalid, reset to defaults
cp .claude/config.json .claude/config.json.backup
autopm init --reset-config

# Or manually fix
nano .claude/config.json
autopm validate
```

### Provider Not Detected

**Problem**: GitHub/Azure DevOps provider not detected automatically

**Solution**:
```bash
# Check remote URLs
git remote -v

# For GitHub
git remote set-url origin https://github.com/user/repo.git

# For Azure DevOps
git remote set-url origin https://dev.azure.com/org/project/_git/repo

# Force provider detection
autopm configure --provider github
# or
autopm configure --provider azure
```

### Missing Credentials

**Problem**: `Authentication failed` for GitHub/Azure DevOps

**GitHub Solution**:
```bash
# Set GitHub token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" >> .claude/.env

# Test connection
gh auth status
autopm validate
```

**Azure DevOps Solution**:
```bash
# Set Azure DevOps PAT
export AZURE_DEVOPS_PAT=xxxxxxxxxxxx
echo "AZURE_DEVOPS_PAT=xxxxxxxxxxxx" >> .claude/.env

# Test connection
az devops configure --defaults organization=https://dev.azure.com/yourorg
autopm validate
```

## Docker Issues

### Docker Not Running

**Problem**: `Cannot connect to Docker daemon`

**Solution**:
```bash
# Start Docker Desktop
open -a Docker

# Or start Docker service (Linux)
sudo systemctl start docker
sudo systemctl enable docker

# Check Docker status
docker info
docker --version
```

### Docker Compose Fails

**Problem**: `docker-compose: command not found` or services won't start

**Solution**:
```bash
# Install Docker Compose
# macOS (with Docker Desktop - already included)
# Linux
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Check docker-compose.yml syntax
docker compose config

# Check for port conflicts
docker compose ps
lsof -i :3000  # Check specific port

# Fresh start
docker compose down
docker compose up --build
```

### Permission Issues (Linux)

**Problem**: Permission denied when accessing Docker

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Test without sudo
docker run hello-world
```

### Container Build Failures

**Problem**: Docker build fails or containers crash

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache

# Check logs
docker compose logs app

# Check resources
docker stats

# Increase memory in Docker Desktop settings
# Settings > Resources > Memory > 4GB+
```

## Git and Version Control Issues

### Pre-commit Hook Failures

**Problem**: Commits rejected by pre-commit hooks

**Solution**:
```bash
# Check hook status
ls -la .git/hooks/

# Run hooks manually
./scripts/safe-commit.sh "test commit"

# Fix hook permissions
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Bypass hooks temporarily (emergency only)
git commit --no-verify -m "Emergency fix"

# Re-install hooks
./scripts/setup-hooks.sh
```

### Branch Protection Issues

**Problem**: Cannot push directly to main branch

**Expected Behavior**: This is intentional - use PR workflow

**Solution**:
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/my-feature
gh pr create --title "Add new feature" --body "Description"
```

### Merge Conflicts

**Problem**: Conflicts when merging or rebasing

**Solution**:
```bash
# For merge conflicts
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git commit

# For rebase conflicts
git rebase --continue
# or abort if needed
git rebase --abort

# Use merge helper
autopm merge --assist
```

## Claude Code Integration Issues

### Agent Not Responding

**Problem**: AI agents don't respond to commands

**Solution**:
```bash
# Check if agents directory exists
ls -la .claude/agents/

# Verify agent files
ls .claude/agents/core/
ls .claude/agents/frameworks/

# Check Claude Code connection
# In Claude Code, try: /help

# Reinstall if needed
autopm install --repair
```

### Commands Not Recognized

**Problem**: `/pm:` commands not working in Claude Code

**Solution**:
```bash
# Check command files
ls .claude/commands/pm/

# Verify provider configuration
cat .claude/config.json | jq '.projectManagement'

# Test simple command first
# In Claude Code: /pm:help

# Reload Claude Code workspace
# CMD+Shift+P > Reload Window
```

### Context Issues

**Problem**: Claude Code can't access project files

**Solution**:
```bash
# Check workspace directory
pwd

# Ensure .claude directory is present
ls -la .claude/

# Check file permissions
find .claude -type f -exec ls -l {} \;

# Restart Claude Code
# Close and reopen the application
```

## Testing Issues

### Tests Failing

**Problem**: Test suite fails unexpectedly

**Solution**:
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:security

# Check test dependencies
docker compose run app npm ci

# Clear test cache
npm test -- --clearCache

# Check for port conflicts
lsof -i :3000 :5432 :6379
```

### E2E Tests Failing

**Problem**: Playwright/Cypress tests fail

**Solution**:
```bash
# Install browser dependencies
npx playwright install

# Run tests in headed mode
docker compose run -e HEADLESS=false e2e npm run test:e2e

# Check for timing issues
# Add waits in test code
await page.waitForLoadState('networkidle');

# Debug specific test
npx playwright test --debug test-name

# Check for browser compatibility
npx playwright test --project=chromium
```

### Coverage Issues

**Problem**: Test coverage below threshold

**Solution**:
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Identify uncovered files
npm run test:coverage -- --verbose

# Add tests for uncovered code
# Focus on high-impact areas first
```

## Performance Issues

### Slow Command Execution

**Problem**: PM commands take too long to execute

**Solution**:
```bash
# Check system resources
top
df -h

# Clear cache
npm run pm:clean --cache

# Check network connectivity
ping github.com
ping dev.azure.com

# Enable performance monitoring
DEBUG=autopm:* autopm issue:list

# Update to latest version
npm update -g claude-autopm
```

### Memory Issues

**Problem**: High memory usage or out-of-memory errors

**Solution**:
```bash
# Check memory usage
free -h  # Linux
vm_stat  # macOS

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Check for memory leaks
node --inspect-brk autopm issue:list
# Open chrome://inspect in Chrome

# Restart Docker with more memory
# Docker Desktop > Settings > Resources > Memory
```

### API Rate Limiting

**Problem**: `API rate limit exceeded` errors

**Solution**:
```bash
# Check rate limit status
gh api rate_limit  # GitHub
# Or check Azure DevOps usage

# Use caching to reduce calls
echo "CACHE_TTL=300" >> .claude/.env

# Implement exponential backoff
echo "RETRY_DELAY=1000" >> .claude/.env

# Use personal access token with higher limits
# GitHub: Increase PAT permissions
# Azure: Use organization PAT
```

## Network and Connectivity Issues

### Proxy Issues

**Problem**: Behind corporate proxy, can't reach external APIs

**Solution**:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com

# Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Configure git proxy
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080
```

### SSL Certificate Issues

**Problem**: SSL certificate verification failures

**Solution**:
```bash
# Temporary bypass (not recommended for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Add corporate certificates
export NODE_EXTRA_CA_CERTS=/path/to/corporate-certs.pem

# Update certificates
# macOS
brew install ca-certificates
# Linux
sudo apt-get update && sudo apt-get install ca-certificates
```

### DNS Issues

**Problem**: Cannot resolve hostnames

**Solution**:
```bash
# Test DNS resolution
nslookup github.com
nslookup dev.azure.com

# Use different DNS servers
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Flush DNS cache
# macOS
sudo dscacheutil -flushcache
# Linux
sudo systemctl restart systemd-resolved
```

## Advanced Troubleshooting

### Debug Mode

Enable detailed logging for complex issues:

```bash
# Enable debug output
export DEBUG=autopm:*
autopm issue:list

# Enable verbose npm logging
npm config set loglevel verbose

# Enable Docker BuildKit debug
export BUILDKIT_PROGRESS=plain
docker compose build

# Enable Claude Code debug mode
# Help > Toggle Developer Tools
```

### Log Analysis

```bash
# Application logs
tail -f ~/.autopm/logs/autopm.log

# System logs
# macOS
log show --predicate 'process == "autopm"' --last 1h
# Linux
journalctl -u autopm --since "1 hour ago"

# Docker logs
docker compose logs --tail=100 -f

# Git hooks logs
cat .git/hooks/pre-commit.log
```

### Clean Reinstall

When all else fails, perform a clean reinstall:

```bash
# 1. Backup important files
cp .claude/.env ~/.autopm-env-backup
cp .claude/config.json ~/.autopm-config-backup

# 2. Remove all ClaudeAutoPM files
npm uninstall -g claude-autopm
rm -rf .claude/
rm -rf node_modules/
rm -f package-lock.json

# 3. Clean npm cache
npm cache clean --force

# 4. Fresh installation
npm install -g claude-autopm@latest
autopm install

# 5. Restore configuration
cp ~/.autopm-env-backup .claude/.env
# Manually merge config if needed
```

## Getting Help

### Community Support

1. **GitHub Issues**: [Report bugs and get help](https://github.com/lagowski/ClaudeAutoPM/issues)
2. **Discussions**: [Community Q&A](https://github.com/lagowski/ClaudeAutoPM/discussions)
3. **Wiki**: [Complete documentation](https://github.com/lagowski/ClaudeAutoPM/wiki)

### Creating Bug Reports

When reporting issues, include:

```bash
# System information
autopm --version
node --version
npm --version
docker --version
git --version

# Configuration (remove sensitive data)
cat .claude/config.json | jq 'del(.tokens)'

# Recent logs
tail -50 ~/.autopm/logs/autopm.log

# Error reproduction steps
# Exact commands that cause the issue
```

### Feature Requests

1. Check [existing issues](https://github.com/lagowski/ClaudeAutoPM/issues)
2. Use the feature request template
3. Provide use case and business justification
4. Include mockups or examples if applicable

## Emergency Procedures

### Bypass All Validations

For critical hotfixes when validations block deployment:

```bash
# Bypass pre-commit hooks
git commit --no-verify -m "hotfix: critical security patch"

# Bypass CI/CD temporarily
git push -o ci.skip

# Direct push to main (if absolutely necessary)
git push --force-with-lease origin main
```

### Rollback Deployment

If deployment causes issues:

```bash
# Rollback to previous version
git revert HEAD --no-edit
git push origin main

# Or reset to previous commit
git reset --hard HEAD~1
git push --force-with-lease origin main

# Rollback npm package
npm install -g claude-autopm@1.1.0
```

### Recovery Mode

If ClaudeAutoPM becomes completely unresponsive:

```bash
# Enter recovery mode
autopm --recovery-mode

# Or manual recovery
rm -f .claude/.lock
rm -rf .claude/cache/
autopm validate --repair
```

## Related Pages

- [Installation Guide](/getting-started/installation) - Proper installation steps
- [Configuration Options](/reference/configuration) - Configuration reference
- GitHub Actions - CI/CD troubleshooting
- [Testing Strategies](/developer-guide/testing) - Test troubleshooting