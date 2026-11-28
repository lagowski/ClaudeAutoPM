---
name: code-quality-standards
priority: high
tags:
  - code-quality
  - linting
  - formatting
  - best-practices
appliesTo:
  - commands
  - agents
enforcesOn:
  - python-backend-engineer
  - python-backend-expert
  - nodejs-backend-engineer
  - javascript-frontend-engineer
  - bash-scripting-expert
---

# Code Quality Standards Rule

**MANDATORY**: All code must adhere to language-specific quality standards verified through Context7 best practices.

## Purpose

Ensure consistent, maintainable, and high-quality code across all programming languages by enforcing:
- Language-specific style guides
- Linting and formatting tools
- Type safety requirements
- Code complexity limits
- Documentation standards

## Context7-Verified Standards by Language

### Python (from /python/cpython, /websites/fastapi_tiangolo)

**Type Hints (MANDATORY):**
```python
# ✅ CORRECT - Use latest type hints
from typing import AsyncIterator, ParamSpec, TypeIs, TYPE_CHECKING
from collections.abc import Sequence

# AsyncIterator for async generators
async def infinite_stream(start: int) -> AsyncIterator[int]:
    while True:
        yield start
        start = await increment(start)

# ParamSpec for type-safe decorators
P = ParamSpec('P')
R = TypeVar('R')

def decorator(f: Callable[P, R]) -> Callable[P, R]:
    def inner(*args: P.args, **kwargs: P.kwargs) -> R:
        return f(*args, **kwargs)
    return inner

# TypeIs for type narrowing
def is_str_list(val: list[object]) -> TypeIs[list[str]]:
    return all(isinstance(x, str) for x in val)

# TYPE_CHECKING for conditional imports
if TYPE_CHECKING:
    import expensive_mod

# ❌ INCORRECT - Old-style or missing type hints
def process(data):  # Missing return type
    pass

def old_style(items: List[str]):  # Use list[str] instead
    pass
```

**Linting Tools:**
- **ruff**: Fast Python linter and formatter
- **mypy**: Static type checker
- **black**: Code formatter
- **isort**: Import sorting

**Configuration:**
```toml
# pyproject.toml
[tool.ruff]
target-version = "py311"
line-length = 100
select = ["E", "F", "I", "N", "W", "UP", "B", "A", "C4", "DTZ", "T10", "EM", "ISC", "ICN", "PIE", "PYI", "PT", "Q", "RET", "SIM", "TID", "ARG", "PTH", "PD", "PGH", "PL", "TRY", "NPY", "RUF"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.black]
line-length = 100
target-version = ['py311']
```

**Code Complexity:**
- Maximum function length: 50 lines
- Maximum cyclomatic complexity: 10
- Maximum function arguments: 5

### JavaScript/TypeScript (from /airbnb/javascript)

**ES6 Standards (MANDATORY):**
```javascript
// ✅ CORRECT - ES6 best practices

// Default parameters
function handleThings(opts = {}) {
  // ...
}

// Object property shorthand
const lukeSkywalker = 'Luke Skywalker';
const obj = { lukeSkywalker };

// Object method shorthand
const atom = {
  value: 1,
  addValue(value) {
    return atom.value + value;
  },
};

// Spread operator
const original = { a: 1, b: 2 };
const copy = { ...original, c: 3 };

// Destructuring
const { firstName, lastName } = user;
const [first, ...rest] = array;

// Arrow functions
const items = [1, 2, 3].map(x => x * 2);

// ❌ INCORRECT - Old patterns

// No default parameters
function handleThings(opts) {
  opts = opts || {};
}

// Long form object
const obj = { lukeSkywalker: lukeSkywalker };

// Function expression instead of arrow
const items = [1, 2, 3].map(function(x) {
  return x * 2;
});
```

**Linting Tools:**
- **ESLint**: JavaScript linter with Airbnb config
- **Prettier**: Code formatter
- **TypeScript**: Static type checking

**Configuration:**
```json
// .eslintrc.json
{
  "extends": ["airbnb-base", "prettier"],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
    "prefer-destructuring": "error",
    "object-shorthand": "error"
  }
}

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Node.js (from /nodejs/node)

**Async Patterns (MANDATORY):**
```javascript
// ✅ CORRECT - Modern async patterns

// Async iteration with for await...of
import * as readline from 'node:readline';

async function processLineByLine() {
  const rl = readline.createInterface({
    input: fs.createReadStream('file.txt'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Process line
  }
}

// AbortSignal for cancellation
const ac = new AbortController();
const { signal } = ac;

setTimeout(() => ac.abort(), 5000);

for await (const event of on(ee, 'foo', { signal })) {
  console.log(event);
}

// Symbol.asyncIterator for custom iterators
const asyncIterable = {
  async *[Symbol.asyncIterator]() {
    yield 1;
    yield 2;
    yield 3;
  },
};

// ❌ INCORRECT - Old patterns

// Using callbacks instead of async/await
fs.readFile('file.txt', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// No AbortSignal for cancellation
// No Symbol.asyncIterator for iterables
```

**Event Loop Optimization:**
- Use `setImmediate()` for I/O callbacks
- Avoid blocking the event loop
- Use worker threads for CPU-intensive tasks
- Stream large datasets instead of loading into memory

### Bash (from /bobbyiliev/introduction-to-bash-scripting)

**Error Handling (MANDATORY):**
```bash
#!/usr/bin/env bash

# ✅ CORRECT - Proper error handling

# Exit on error, undefined variable, pipe failure
set -euo pipefail

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Error handling function
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Cleanup code
}

# Register cleanup on exit
trap cleanup EXIT

# Well-documented function
#######################################
# Description: Calculate sum
# Globals: None
# Arguments: $1 - First number, $2 - Second number
# Outputs: Sum of the two numbers
# Returns: 0 if successful
#######################################
sum() {
    local result=$(( $1 + $2 ))
    echo "$result"
}

# ❌ INCORRECT - No error handling
#!/bin/bash
# No set -e
# No error handlers
# No cleanup
# No function documentation
```

**Linting Tools:**
- **shellcheck**: Shell script linter
- **shfmt**: Shell script formatter

**Configuration:**
```bash
# .shellcheckrc
enable=all
shell=bash
severity=style

# shfmt options
# -i 4    : indent with 4 spaces
# -bn     : binary ops like && and | may start a line
# -ci     : switch cases will be indented
# -sr     : redirect operators followed by a space
```

## Universal Quality Standards

### Documentation (ALL LANGUAGES)

**Function/Method Documentation:**
- Purpose and behavior
- Parameters with types
- Return value and type
- Exceptions/errors raised
- Usage examples

**Code Comments:**
- Explain "why" not "what"
- Document complex algorithms
- Note edge cases
- Link to relevant issues/docs

### Testing Requirements

**Minimum Coverage:**
- Unit tests: 80% coverage
- Critical paths: 100% coverage
- Integration tests for all APIs
- E2E tests for critical workflows

**Test Quality:**
- Descriptive test names
- Arrange-Act-Assert pattern
- Independent tests (no interdependencies)
- Fast execution (<5 minutes for full suite)

### Security Standards

**Input Validation:**
- Validate all external inputs
- Sanitize user data
- Use parameterized queries
- Escape output for XSS prevention

**Secrets Management:**
- No hardcoded credentials
- Use environment variables
- Leverage secret managers
- Rotate credentials regularly

### Performance Standards

**Code Performance:**
- O(n log n) or better algorithms
- Avoid N+1 queries
- Use connection pooling
- Cache frequently accessed data

**Memory Management:**
- No memory leaks
- Proper resource cleanup
- Stream large datasets
- Monitor memory usage

## Enforcement Actions

### Pre-commit Hooks

```bash
# Python
ruff check .
mypy .
black --check .

# JavaScript/TypeScript
npm run lint
npm run type-check
npm run format:check

# Bash
shellcheck **/*.sh
shfmt -d .
```

### CI/CD Pipeline

```yaml
# Quality gates
- lint: MUST pass
- type-check: MUST pass
- format-check: MUST pass
- tests: MUST pass with >80% coverage
- security-scan: MUST have no high/critical vulnerabilities
```

### Code Review Checklist

- [ ] Code follows language-specific style guide
- [ ] All functions have type hints/annotations
- [ ] Error handling is comprehensive
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] Security best practices followed
- [ ] Performance considerations addressed
- [ ] Complexity within limits

## Tools Integration

### IDE Configuration

**VSCode:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "python.linting.ruffEnabled": true,
  "python.linting.mypyEnabled": true,
  "python.formatting.provider": "black",
  "eslint.validate": ["javascript", "typescript"],
  "prettier.enable": true
}
```

### Git Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.py": ["ruff check", "black", "mypy"],
    "*.{js,ts}": ["eslint --fix", "prettier --write"],
    "*.sh": ["shellcheck", "shfmt -w"]
  }
}
```

## Exceptions

Quality standards may be relaxed for:
- Prototype/POC code (must be marked clearly)
- Generated code (with clear attribution)
- Third-party code (must be isolated)
- Legacy code being deprecated

All exceptions MUST:
- Be documented
- Have tracking issue
- Include remediation plan
- Get explicit approval

## Monitoring

**Quality Metrics:**
- Linting violations: 0 target
- Type coverage: 100% target
- Test coverage: >80% target
- Code complexity: <10 cyclomatic complexity
- Documentation coverage: >90% target

**Regular Audits:**
- Weekly: Automated quality reports
- Monthly: Manual code reviews
- Quarterly: Dependency updates
- Annually: Major version upgrades

## References

- Python: [PEP 8](https://peps.python.org/pep-0008/), [Type Hints](https://docs.python.org/3/library/typing.html)
- JavaScript: [Airbnb Style Guide](https://github.com/airbnb/javascript)
- Node.js: [Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- Bash: [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)
- Context7: resolve the language's library ID, then query its style guide (`.claude/rules/context7-required.md`)

---

**Enforcement Level**: MANDATORY
**Review Frequency**: Every commit
**Last Updated**: 2025-01-15
**Context7 Verified**: ✅ All patterns verified against latest documentation
