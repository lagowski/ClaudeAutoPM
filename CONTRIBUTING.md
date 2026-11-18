# Contributing to ClaudeAutoPM

Thank you for your interest in contributing to ClaudeAutoPM! All changes land through pull requests into `develop`.

## 🎯 Quick Start

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature
# Make your changes (tests first)
npm test
git commit -m "feat: description"
git push origin feat/your-feature
# Open a PR into develop on GitHub
```

## 🌿 Branches

- **`develop`** is the default branch: every feature, fix and docs PR targets it.
- **`main`** is the release branch. It is protected (pull requests only) and accepts PRs only from `develop`; the `Verify PR source is develop` check rejects anything else.
- Outside contributors: fork the repository and open the PR from your fork into `develop`.

## 🔧 Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/lagowski/ClaudeAutoPM.git
   cd ClaudeAutoPM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Install locally for testing**
   ```bash
   npm link
   autopm --help
   ```

## 📝 Commit Guidelines

We use **Conventional Commits** for all contributions:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

### Good Commit Messages
✅ `fix: resolve installation error on Windows`
✅ `feat: add GitLab CI/CD support`
✅ `docs: clarify Azure DevOps setup`

### Bad Commit Messages
❌ `fixed stuff`
❌ `update`
❌ `wip`

## 🔄 Pull Requests

Every change goes through a pull request, including hotfixes and documentation:

- Keep the PR small and focused on one change
- Pass tests and lint locally before pushing
- Follow the commit conventions above
- Wait for the required checks and a review before it is merged

## 🧪 Testing

This project follows **strict TDD methodology**. Before submitting any contribution:

1. **Run all tests**
   ```bash
   npm test                    # Jest unit tests
   npm run test:node          # Node.js native tests
   npm run test:security      # Security validation
   npm run test:regression    # Regression tests
   ```

2. **Run linting**
   ```bash
   npm run lint
   npm run lint:fix
   ```

3. **Test installation scenarios**
   ```bash
   npm run test:install       # Installation validation
   npm run test:install:scenarios
   ```

4. **For new features - TDD approach REQUIRED**
   - **Write failing tests FIRST** - Before implementing any code
   - Create test files in `test/` directory
   - Use Jest framework for new tests
   - Follow existing patterns in `test/unit/` and `test/integration/`
   - Ensure 100% coverage for new code

## 🏗️ Project Structure

```
AUTOPM/
├── autopm/           # Framework resources
│   └── .claude/      # Claude configuration
├── bin/              # CLI executables
├── lib/              # CLI command implementations and helpers
├── packages/         # @claudeautopm/plugin-* workspaces (agents, commands, scripts)
├── install/          # Installation scripts
├── test/             # Test suites
├── docs/             # Plugin documentation and assets
└── docs-site/        # Documentation website (VitePress)
```

## 🔄 CI/CD Pipeline

GitHub Actions run on every pull request into `develop` or `main`, and on pushes to both branches.

### What Gets Checked
- JavaScript lint (`npm run lint:js`)
- Jest tests and coverage (`npm test`, `npm run test:coverage`) on Node.js 22.x and 24.x
- Synced copies: `npm run sync:scripts:check` and `npm run sync:commands:check` must report no divergence (see [install/README.md](install/README.md))
- PRs into `main` must come from `develop`

## 💡 Development Tips

### Local Testing
```bash
# Test installation locally
./install/install.sh /tmp/test-project

# Test specific scenario
echo "1" | ./install/install.sh /tmp/test-minimal

# Test CLI commands
node bin/autopm.js --help
```

### Debug Mode
```bash
# Enable verbose output
export VERBOSE=1
npm test

# Debug installation
export AUTOPM_DEBUG=1
autopm install
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Additional CI/CD platform support (GitLab CI, Jenkins)
- [ ] Windows compatibility improvements
- [ ] More language-specific templates
- [ ] Performance optimizations
- [ ] Agent registry expansion (currently 50+ agents)

### Good First Issues
- [ ] Documentation improvements
- [ ] Add more examples to `autopm/.claude/examples/`
- [ ] Improve error messages in commands
- [ ] Add unit tests for existing commands
- [ ] Update agent documentation

### Feature Ideas
- [ ] Web UI for configuration
- [ ] Plugin system for custom commands
- [ ] More specialized AI agents
- [ ] Integration with more project management tools
- [ ] Context optimization features

## 🤝 Code of Conduct

### Be Respectful
- Constructive feedback only
- Help newcomers
- Respect different opinions

### Be Professional
- Stay on topic
- No spam or self-promotion
- Follow GitHub's terms

## 📞 Getting Help

- **Questions**: Open a [Discussion](https://github.com/lagowski/ClaudeAutoPM/discussions)
- **Bugs**: Open an [Issue](https://github.com/lagowski/ClaudeAutoPM/issues)
- **Ideas**: Start a [Discussion](https://github.com/lagowski/ClaudeAutoPM/discussions/categories/ideas)

## 🏆 Recognition

Contributors are recognized in:
- Release notes
- Contributors file
- Project README

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🔐 Security

For security vulnerabilities, please email directly instead of opening a public issue.

---

Thank you for helping make ClaudeAutoPM better! 🚀