---
title: Contributing
description: How to contribute to ClaudeAutoPM, PR process, and coding standards
---

# Contributing

Thank you for your interest in contributing to ClaudeAutoPM! This guide covers the contribution process, coding standards, and best practices for submitting changes.

## Quick Start

All changes land through pull requests into `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feat/your-feature
# Make changes (tests first)
npm test
git commit -m "feat: description"
git push origin feat/your-feature
# Open a PR into develop on GitHub
```

## Branches

- **`develop`** is the default branch: every feature, fix and docs PR targets it.
- **`main`** is the release branch. It is protected (pull requests only) and accepts PRs only from `develop`.
- Outside contributors: fork the repository and open the PR from your fork into `develop`.

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Git
- Claude Code CLI (for testing)

### Setup Steps

```bash
# Clone the repository
git clone https://github.com/lagowski/ClaudeAutoPM.git
cd ClaudeAutoPM

# Install dependencies
npm install

# Setup git hooks
npm run setup:githooks

# Verify setup
npm test
```

### Local Testing

```bash
# Install locally for testing
npm link

# Test CLI
autopm --help

# Test installation
./install/install.sh /tmp/test-project
```

## Commit Guidelines

### Conventional Commits

All commits must use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

### Good Commit Messages

```bash
# Good
feat: add GitLab CI/CD support
fix: resolve installation error on Windows
docs: clarify Azure DevOps setup
test: add integration tests for plugin loading
refactor: simplify PluginManager discovery logic
```

### Bad Commit Messages

```bash
# Bad
fixed stuff
update
wip
changes
```

### Important: No Claude Attribution

Do NOT include Claude collaboration signatures in commits:

```bash
# DO NOT DO THIS
git commit -m "feat: add feature

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

This is a human development project. While Claude may assist, commits should be attributed only to human contributors.

## Workflow Guidelines

### Pull Requests

Required for every change, including hotfixes and documentation.

Benefits:
- Code review
- CI/CD validation
- Discussion platform
- Change documentation

## Pull Request Process

### Creating a PR

1. **Create feature branch**

```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-feature
```

2. **Make changes following TDD**

```bash
# Write failing test
# Implement feature
# Verify tests pass
npm test
```

3. **Commit changes**

```bash
git add .
git commit -m "feat: add my feature"
```

4. **Push and create PR**

```bash
git push origin feat/my-feature
gh pr create --title "feat: add my feature" --body "Description of changes"
```

### PR Template

```markdown
## Summary

Brief description of the changes.

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing

- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes to public API
```

### PR Review Process

1. **Automated checks** run on PR creation
2. **Code review** by maintainers
3. **Feedback incorporation** by contributor
4. **Approval** and merge

## Coding Standards

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| JavaScript | kebab-case | `plugin-manager.js` |
| Tests | *.test.js | `plugin-manager.test.js` |
| Agents | kebab-case | `code-analyzer.md` |
| Commands | kebab-case | `epic-list.md` |

### Code Style

```javascript
// Good: Clear, readable code
async function discoverPlugins() {
  const scopePath = path.join(this.pluginDir, this.scopePrefix);

  if (!fs.existsSync(scopePath)) {
    return [];
  }

  const packages = fs.readdirSync(scopePath);
  return packages.filter(pkg => pkg.startsWith('plugin-'));
}

// Bad: Dense, unclear code
async function discoverPlugins(){
const p=path.join(this.pluginDir,this.scopePrefix);
if(!fs.existsSync(p))return[];
return fs.readdirSync(p).filter(x=>x.startsWith('plugin-'))}
```

### Naming Conventions

**NEVER use these suffixes:**
- `_advanced`, `_fixed`, `_improved`, `_new`, `_old`
- `_v2`, `_v3`, `_backup`, `_copy`, `_temp`

**DO use:**
- Descriptive names that explain purpose
- Consistent patterns with existing code
- Language conventions (camelCase for JS, kebab-case for files)

### Code Quality

**ALWAYS:**
- Follow TDD methodology
- Write clear error messages
- Handle edge cases
- Clean up resources
- Use meaningful variable names

**NEVER:**
- Leave TODO comments without tests
- Create duplicate functions
- Mix concerns (UI with DB logic)
- Skip error handling
- Use magic numbers/strings

## Testing Requirements

### Before Submitting

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run security tests
npm run test:security

# Run regression tests
npm run test:regression

# Validate paths
npm run validate:paths
```

### Test Coverage

- 100% coverage for new code
- Tests written BEFORE implementation
- Edge cases covered
- Error paths tested

## Areas for Contribution

### High Priority

- Additional CI/CD platform support (GitLab, Jenkins)
- Windows compatibility improvements
- More language-specific templates
- Performance optimizations
- Agent registry expansion

### Good First Issues

- Documentation improvements
- Add examples to `autopm/.claude/examples/`
- Improve error messages
- Add unit tests for existing commands
- Update agent documentation

### Feature Ideas

- Web UI for configuration
- More specialized AI agents
- Integration with project management tools
- Context optimization features

## Review Criteria

PRs are evaluated on:

1. **Code Quality**
   - Follows project conventions
   - Well-tested
   - Clear and readable

2. **Documentation**
   - Code comments where needed
   - README updates if applicable
   - API documentation for new features

3. **Testing**
   - Tests written first (TDD)
   - Coverage maintained or improved
   - Edge cases considered

4. **Compatibility**
   - No breaking changes without discussion
   - Cross-platform considerations
   - Backward compatibility

## Communication

### Where to Discuss

- **Questions**: [GitHub Discussions](https://github.com/lagowski/ClaudeAutoPM/discussions)
- **Bugs**: [GitHub Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
- **Ideas**: [Discussion - Ideas Category](https://github.com/lagowski/ClaudeAutoPM/discussions/categories/ideas)

### Getting Help

1. Check existing documentation
2. Search closed issues/PRs
3. Ask in discussions
4. Tag maintainers if needed

## Recognition

Contributors are recognized in:
- Release notes
- Contributors file
- Project README

## Code of Conduct

### Be Respectful
- Constructive feedback only
- Help newcomers
- Respect different opinions

### Be Professional
- Stay on topic
- No spam or self-promotion
- Follow GitHub's terms

## Security

For security vulnerabilities:
- Do NOT open public issues
- Email maintainers directly
- Follow responsible disclosure

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Summary Checklist

Before submitting any contribution:

- [ ] Tests written and passing (TDD)
- [ ] Code follows style guidelines
- [ ] Commit messages follow conventional commits
- [ ] No Claude attribution in commits
- [ ] Documentation updated if needed
- [ ] Path validation passes
- [ ] Security tests pass
- [ ] PR description is clear

## Next Steps

- [Architecture](./architecture.md) - Understand the codebase
- [Testing](./testing.md) - Write proper tests
- [Plugin Development](./plugin-development.md) - Extend the framework

Thank you for contributing to ClaudeAutoPM!
