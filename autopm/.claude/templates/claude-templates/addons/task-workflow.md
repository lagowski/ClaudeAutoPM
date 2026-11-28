## 🔄 STANDARD TASK WORKFLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚨 CRITICAL: ALL DEVELOPMENT FOLLOWS TDD (RED-GREEN-REFACTOR)     │
├─────────────────────────────────────────────────────────────────────┤
│  1. 🔴 RED:     Write FAILING test first                            │
│  2. ✅ GREEN:   Write MINIMUM code to pass                          │
│  3. ♻️  REFACTOR: Improve while tests stay green                    │
│                                                                     │
│  ❌ NO CODE WITHOUT TESTS                                           │
│  ❌ NO PARTIAL IMPLEMENTATIONS                                      │
│  ❌ NO "TODO: ADD TESTS LATER"                                      │
│                                                                     │
│  See: .claude/rules/tdd.enforcement.xml (HIGHEST PRIORITY)         │
└─────────────────────────────────────────────────────────────────────┘
```

### 🎯 Core Workflow Principles

1. **Follow TDD Religiously** - Test FIRST, code SECOND
2. **Work in Branches** - Never commit directly to main
3. **Create Pull Requests** - All changes go through PR review
4. **Resolve Conflicts** - Address merge conflicts immediately
5. **Address Feedback** - Interpret and resolve all PR comments
6. **Merge When Ready** - Only merge after all checks pass
7. **Mark Complete** - Update task status and move to next task

### 🚀 Task Execution Steps

#### 1. Pick Task → 2. Create Branch → 3. Implement (TDD) → 4. Verify → 5. Create PR → 6. Address Feedback → 7. Merge → 8. Complete → 9. Next Task

**TDD Implementation (Step 3):**
```bash
# 🔴 RED: Write failing test FIRST
touch tests/test_feature.py
@test-runner run tests/test_feature.py  # MUST FAIL ❌
git commit -m "test: add failing test for feature"

# ✅ GREEN: Write MINIMUM code to pass
@test-runner run tests/test_feature.py  # MUST PASS ✅
git commit -m "feat: implement feature"

# ♻️ REFACTOR: Improve while tests stay green
@test-runner run all tests  # ALL MUST PASS ✅
git commit -m "refactor: improve feature structure"
```

**Integration with Context7:**
Query documentation BEFORE implementing: `resolve-library-id` for the framework, then `query-docs`
with the topic (testing, authentication). See `.claude/rules/context7-required.md`.

**Quality Checks (Step 4):**
```bash
npm test          # or pytest, go test, etc.
npm run lint      # or ruff check, golangci-lint, etc.
npm run typecheck # or mypy, go vet, etc.
```

**PR Creation (Step 5):**
```bash
git push origin feature/TASK-ID-description
gh pr create --title "Feature: TASK-ID Description" --body "..."
```

### 📊 Definition of Done

- [ ] Code Complete (Acceptance Criteria met, no TODOs)
- [ ] Tests Pass (unit, integration, e2e, coverage threshold met)
- [ ] Quality Checks (linters pass, formatters applied, type checking)
- [ ] Documentation (code comments, API docs, README, CHANGELOG)
- [ ] Review Complete (PR approved, comments addressed, CI/CD green)
- [ ] Deployed (merged to main, deployed, verified in production)
- [ ] Task Closed (issue closed, status updated)

### ⚠️ Critical Rules

**🚨 HIGHEST PRIORITY:**
1. **FOLLOW TDD CYCLE** - ZERO TOLERANCE for code without tests
2. **ALWAYS query Context7** before implementing (`resolve-library-id`, then `query-docs`)
3. **NEVER commit code before tests** - Test first, code second, refactor third
4. **ALWAYS use specialized agents** for non-trivial tasks

**❌ PROHIBITED PATTERNS:**
- Writing code before tests
- Committing "WIP" or "TODO: add tests"
- Partial implementations without test coverage
- Skipping refactor phase
- Mock services in tests (use real implementations)

### 🎯 Quick Commands

```bash
# Start task
/pm:backlog
git checkout -b feature/ID-desc

# During work
@<agent> <task>
# Context7: resolve-library-id <lib>, then query-docs <topic>
git commit -m "type: message"

# Before PR
npm test && npm run lint
git push origin <branch>

# Create & merge PR
gh pr create
gh pr merge --squash --delete-branch
gh issue close ID
```
