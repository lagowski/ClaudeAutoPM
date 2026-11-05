# TDD Cycle (Quick Reference)

> Source of truth: .claude/rules/tdd.enforcement.xml

<tdd_cycle>
<phase id="RED">
<action>Write failing test FIRST</action>
<verify>@test-runner confirms RED</verify>
<commit>test: add failing test for [feature]</commit>
<gate>Test MUST fail. If it passes immediately, rewrite the test.</gate>
</phase>

<phase id="GREEN">
<action>Write MINIMUM code to pass</action>
<verify>@test-runner confirms GREEN</verify>
<commit>feat: implement [feature]</commit>
<gate>Only the minimum code needed. No extra features.</gate>
</phase>

<phase id="REFACTOR">
<action>Improve code structure</action>
<verify>@test-runner confirms ALL still GREEN</verify>
<commit>refactor: improve [feature] structure</commit>
<gate>All tests must remain green. No new features in this phase.</gate>
</phase>
</tdd_cycle>

<execution>
<rule>Always delegate test runs to @test-runner agent</rule>
<rule>Verbose output with full stack traces</rule>
<rule>Check test structure first before assuming code bugs</rule>
<rule>Cleanup after tests: Stop only the processes you started, by their PID. Never kill by name or pattern: other agents and CI jobs share the host, and a pattern kill sends them SIGTERM too (exit code 143, veracrew#2296). Example: npm test & pid=$!; wait "$pid" (or kill "$pid" if you must stop it)</rule>
</execution>

<example>
```bash
# RED
touch tests/test_auth.py
# Write test
@test-runner run tests/test_auth.py  # Must be RED
git commit -m "test: add failing test for auth"

# GREEN
# Write minimal implementation
@test-runner run tests/test_auth.py  # Must be GREEN
git commit -m "feat: implement auth endpoint"

# REFACTOR
# Improve code
@test-runner run all tests  # Must be GREEN
git commit -m "refactor: improve auth structure"
```
</example>

<prohibited>
- Code before test
- Skip any phase
- "TODO: add tests"
- Mock services in tests (use real implementations)
- Tests written after implementation
</prohibited>

<full_docs>.claude/rules/tdd.enforcement.xml</full_docs>
