const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Jest Tests for epic-sync shell scripts
 * Tests for Bug #1-#5 fixes in create-epic-issue.sh and create-task-issues.sh
 */

const SCRIPTS_DIR = path.join(__dirname, '..', '..', 'packages', 'plugin-pm', 'scripts', 'pm', 'epic-sync');

describe('epic-sync shell scripts', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epic-sync-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Bug #1: stdout contamination', () => {
    test('create-epic-issue.sh should only output issue number on stdout', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      // All echo statements except the final return value should redirect to stderr
      const lines = script.split('\n');
      const echoLines = lines.filter(line => {
        const trimmed = line.trim();
        // Match echo statements that are NOT the final return value
        return trimmed.startsWith('echo ') && !trimmed.startsWith('echo "$');
      });

      const stdoutEchos = echoLines.filter(line => {
        const trimmed = line.trim();
        // Should redirect to stderr (>&2) unless it's the final value output
        return !trimmed.includes('>&2') && !trimmed.startsWith('echo "$');
      });

      expect(stdoutEchos).toEqual([]);
    });

    test('create-task-issues.sh should only output mapping file path on stdout', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      const lines = script.split('\n');
      const echoLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('echo ') && !trimmed.startsWith('echo "$');
      });

      const stdoutEchos = echoLines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.includes('>&2') && !trimmed.startsWith('echo "$');
      });

      expect(stdoutEchos).toEqual([]);
    });
  });

  describe('Bug #2: grep pattern for gh CLI output', () => {
    test('create-epic-issue.sh should extract issue number from URL format', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      // Should NOT use grep -o '#[0-9]\+' which only matches old gh format
      expect(script).not.toMatch(/grep -o '#\[0-9\]/);

      // Should NOT merge stderr into stdout with 2>&1 on gh issue create
      expect(script).not.toMatch(/gh issue create[\s\S]*?2>&1\s*\|\s*grep/);
    });

    test('create-task-issues.sh should extract issue number from URL format', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      // Should NOT use grep -o '#[0-9]\+' which only matches old gh format
      expect(script).not.toMatch(/grep -o '#\[0-9\]/);

      // Should NOT merge stderr into stdout with 2>&1 on gh issue create
      expect(script).not.toMatch(/gh issue create[\s\S]*?2>&1\s*\|\s*grep/);
    });

    test('URL-based extraction pattern correctly extracts issue number', () => {
      // Simulate what the fixed grep does
      const ghOutput = 'https://github.com/user/repo/issues/42';
      const result = execSync(
        `echo "${ghOutput}" | grep -o '[0-9]\\+$'`,
        { encoding: 'utf8' }
      ).trim();

      expect(result).toBe('42');
    });
  });

  describe('Bug #3: awk frontmatter stripping with --- horizontal rules', () => {
    test('should preserve content after --- horizontal rules in markdown body', () => {
      // Create a test file with frontmatter AND a --- horizontal rule in body
      const testFile = path.join(tempDir, 'test-task.md');
      fs.writeFileSync(testFile, `---
name: test-task
status: open
---

# Test Task

Some content here.

---

## More Content After HR

This should NOT be dropped.

Final paragraph.
`);

      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      // Extract the awk command used for stripping frontmatter
      const awkMatch = script.match(/awk '([^']+)'/);
      expect(awkMatch).not.toBeNull();

      // Run the awk command from the script against the test file
      const result = execSync(
        `awk '${awkMatch[1]}' "${testFile}"`,
        { encoding: 'utf8' }
      );

      // Content after the horizontal rule MUST be preserved
      expect(result).toContain('More Content After HR');
      expect(result).toContain('This should NOT be dropped');
      expect(result).toContain('Final paragraph');
    });

    test('should strip frontmatter correctly for simple files', () => {
      const testFile = path.join(tempDir, 'simple.md');
      fs.writeFileSync(testFile, `---
name: simple
---

# Simple Task

Just content, no horizontal rules.
`);

      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      const awkMatch = script.match(/awk '([^']+)'/);
      const result = execSync(
        `awk '${awkMatch[1]}' "${testFile}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Simple Task');
      expect(result).toContain('Just content');
      expect(result).not.toContain('name: simple');
    });
  });

  describe('Bug #4: --body-file usage', () => {
    test('create-epic-issue.sh should use --body-file instead of --body', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      // Should use --body-file for gh issue create
      expect(script).toContain('--body-file');
      // Should NOT use --body "$var" for the main issue creation
      // (--body-file in comment creation is fine, we check the main create)
      const mainCreateBlock = script.split('gh issue create')[1]?.split('\n').slice(0, 10).join('\n') || '';
      expect(mainCreateBlock).not.toMatch(/--body "\$/);
    });

    test('create-task-issues.sh should use --body-file instead of --body', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      // The main gh issue create should use --body-file
      expect(script).toContain('--body-file');
    });

    test('should use mktemp for temp files, not hardcoded paths', () => {
      const epicScript = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );
      const taskScript = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      // Should NOT use hardcoded /tmp paths
      expect(epicScript).not.toMatch(/\/tmp\/epic-doc-comment\.md/);
      expect(taskScript).not.toMatch(/\/tmp\/task-doc-comment\.md/);

      // Should use mktemp
      expect(epicScript).toContain('mktemp');
      expect(taskScript).toContain('mktemp');
    });
  });

  describe('Bug #6: comma-separated labels in --label flag', () => {
    test('create-task-issues.sh should use separate --label flags', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      // Must NOT contain comma-separated labels in a single --label flag
      expect(script).not.toMatch(/--label\s+"[^"]*,[^"]*"/);
      // Must have separate --label "task" and --label "epic:
      expect(script).toMatch(/--label\s+"task"/);
      expect(script).toMatch(/--label\s+"epic:/);
    });

    test('create-epic-issue.sh should use separate --label flags', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-epic-issue.sh'),
        'utf8'
      );

      // Must NOT contain comma-separated labels in a single --label flag
      expect(script).not.toMatch(/--label\s+"[^"]*,[^"]*"/);
      // Must NOT pass $labels as a single --label (which contained comma-separated values)
      expect(script).not.toMatch(/--label\s+"\$\{?labels\}?"/);
    });

    test('github-utils.sh create_github_issue should use build_label_flags', () => {
      const script = fs.readFileSync(
        path.join(__dirname, '..', '..', '.claude', 'scripts', 'lib', 'github-utils.sh'),
        'utf8'
      );

      // Should have a build_label_flags function
      expect(script).toContain('build_label_flags()');
      // create_github_issue should NOT use --label "$labels" directly
      expect(script).not.toMatch(/gh issue create[\s\S]*?--label "\$\{?labels\}?"/);
      // Should use "${label_flags[@]}" instead
      expect(script).toContain('"${label_flags[@]}"');
    });

    test('github-utils.sh create_github_subissue should use build_label_flags', () => {
      const script = fs.readFileSync(
        path.join(__dirname, '..', '..', '.claude', 'scripts', 'lib', 'github-utils.sh'),
        'utf8'
      );

      // The sub-issue create block should NOT use --label "$labels"
      const subissueBlock = script.split('create_github_subissue')[1] || '';
      expect(subissueBlock).not.toMatch(/--label "\$\{?labels\}?"/);
      // Should use label_flags
      expect(subissueBlock).toContain('label_flags');
    });

    test('no comma-separated labels in any epic-sync script', () => {
      const scriptFiles = fs.readdirSync(SCRIPTS_DIR)
        .filter(f => f.endsWith('.sh'));

      for (const file of scriptFiles) {
        const content = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');
        const commaLabelMatches = content.match(/--label\s+"[^"]*,[^"]*"/g);
        expect(commaLabelMatches).toBeNull();
      }
    });
  });

  describe('Bug #5: title fallback', () => {
    test('create-task-issues.sh should have separate fallback for empty title', () => {
      const script = fs.readFileSync(
        path.join(SCRIPTS_DIR, 'create-task-issues.sh'),
        'utf8'
      );

      // Should have an explicit check for empty title with fallback
      expect(script).toMatch(/if \[\[ -z "\$task_title" \]\]/);
    });

    test('title extraction should work for file with heading', () => {
      const testFile = path.join(tempDir, 'with-heading.md');
      fs.writeFileSync(testFile, `---
name: test
---

# My Task Title

Content here.
`);

      // Simulate the fixed title extraction
      const result = execSync(
        `content=$(awk 'BEGIN{p=0; done=0} /^---$/ && !done {p++; if(p==2) done=1; next} p>=2{print}' "${testFile}"); title=$(echo "$content" | grep -m1 "^#" | sed 's/^# *//'); if [ -z "$title" ]; then title="Fallback"; fi; echo "$title"`,
        { encoding: 'utf8' }
      ).trim();

      expect(result).toBe('My Task Title');
    });

    test('title extraction should use fallback for file without heading', () => {
      const testFile = path.join(tempDir, 'no-heading.md');
      fs.writeFileSync(testFile, `---
name: test
---

Just content, no heading.
`);

      const result = execSync(
        `content=$(awk 'BEGIN{p=0; done=0} /^---$/ && !done {p++; if(p==2) done=1; next} p>=2{print}' "${testFile}"); title=$(echo "$content" | grep -m1 "^#" | sed 's/^# *//' || true); if [ -z "$title" ]; then title="Task fallback"; fi; echo "$title"`,
        { encoding: 'utf8' }
      ).trim();

      expect(result).toBe('Task fallback');
    });
  });

  // AI-gate findings on promotion #920 (fix round of #899): run the scripts
  // for real against a fake `gh` on PATH.
  describe('gate findings #920: scripts run under set -euo pipefail', () => {
    const { spawnSync } = require('child_process');
    const EPIC = 'demo';
    let binDir;
    let epicDir;
    let ghLog;

    const FAKE_GH = `#!/bin/bash
log="$FAKE_GH_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "repo view") echo "o/r"; exit 0 ;;
  "issue comment") shift 2; num="$1"; shift
    while [[ $# -gt 0 ]]; do [[ "$1" == --body-file ]] && { echo "COMMENT $num"; cat "$2"; } >> "$log"; shift; done
    exit 0 ;;
  "issue create") shift 2; title=""; labels=""; body=""
    while [[ $# -gt 0 ]]; do
      case "$1" in --title) title="$2"; shift ;; --label) labels="$labels $2"; shift ;; --body-file) body="$(cat "$2")"; shift ;; esac
      shift
    done
    if [[ -n "\${FAKE_GH_FAIL_TITLE:-}" && "$title" == "$FAKE_GH_FAIL_TITLE" ]]; then echo "boom" >&2; exit 1; fi
    n=$(( $(cat "$FAKE_GH_LOG.n" 2>/dev/null || echo 100) + 1 )); echo "$n" > "$FAKE_GH_LOG.n"
    { echo "CREATE $n title=$title labels=$labels"; echo "$body"; echo "END"; } >> "$log"
    echo "https://github.com/o/r/issues/$n"; exit 0 ;;
esac
exit 0
`;

    const run = (script, args, env = {}) => spawnSync('bash', [script, ...args], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, FAKE_GH_LOG: ghLog, ...env }
    });
    const write = (rel, content) => fs.writeFileSync(path.join(epicDir, rel), content);
    const log = () => (fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8') : '');

    beforeEach(() => {
      binDir = path.join(tempDir, 'bin');
      epicDir = path.join(tempDir, '.claude', 'epics', EPIC);
      ghLog = path.join(tempDir, 'gh.log');
      fs.mkdirSync(binDir, { recursive: true });
      fs.mkdirSync(epicDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'gh'), FAKE_GH, { mode: 0o755 });
    });

    test('update-references:76 restores the backup and prints FAILED when awk fails', () => {
      write('001.md', '---\nname: t\n---\n# Task one\n');
      write('.map', '001 46\n');
      // An awk that writes partial output and fails.
      fs.writeFileSync(path.join(binDir, 'awk'), '#!/bin/sh\necho partial\nexit 2\n', { mode: 0o755 });
      const r = run(path.join(SCRIPTS_DIR, 'update-references.sh'), [EPIC, path.join(epicDir, '.map')]);
      expect(r.stdout).toContain('FAILED');
      expect(r.status).not.toBe(0);
      expect(fs.readFileSync(path.join(epicDir, '001.md'), 'utf8')).toBe('---\nname: t\n---\n# Task one\n');
      expect(fs.existsSync(path.join(epicDir, '46.md'))).toBe(false);
      expect(fs.existsSync(path.join(epicDir, '001.md.backup'))).toBe(false);
    });

    test('update-references:97 does one validated pass, so substitutions never chain', () => {
      write('10.md', '---\nname: t\n---\n# Ten\n');
      write('99.md', 'See #10 and task 20, depends on 10. Not #0x1.\n');
      // 10->20 then 20->30 would chain #10 -> #20 -> #30; "0.1" is not a valid id.
      write('.map', '10 20\n20 30\n0.1 7\n');
      const r = run(path.join(SCRIPTS_DIR, 'update-references.sh'), [EPIC, path.join(epicDir, '.map')]);
      expect(r.status).toBe(0);
      expect(fs.readFileSync(path.join(epicDir, '99.md'), 'utf8'))
        .toBe('See #20 and task #30, depends on #20. Not #0x1.\n');
      expect(r.stdout + r.stderr).toMatch(/invalid mapping/i);
    });

    test('create-task-issues:45 does not abort on the first loop iteration', () => {
      write('001.md', '---\nname: t\n---\n# Task one\n');
      const r = run(path.join(SCRIPTS_DIR, 'create-task-issues.sh'), [EPIC, '7']);
      expect(r.status).toBe(0);
      expect(fs.readFileSync(path.join(epicDir, '.task-mapping.txt'), 'utf8')).toBe('001 101\n');
    });

    test('create-task-issues:55 keeps the body of a task file without frontmatter', () => {
      write('001.md', '# Plain task\n\nBody text stays.\n');
      const r = run(path.join(SCRIPTS_DIR, 'create-task-issues.sh'), [EPIC, '7']);
      expect(r.status).toBe(0);
      expect(log()).toContain('title=Plain task');
      expect(log()).toContain('Body text stays.');
    });

    test('create-task-issues:113 counts only created issues and exits non-zero on a shortfall', () => {
      write('001.md', '# One\n');
      write('002.md', '# Two\n');
      const r = run(path.join(SCRIPTS_DIR, 'create-task-issues.sh'), [EPIC, '7'], { FAKE_GH_FAIL_TITLE: 'Two' });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain('Created 1 of 2 task issues');
      expect(r.stdout.trim()).toBe('.claude/epics/demo/.task-mapping.txt');
    });

    test('create-epic-issue:89 a missing prd: does not orphan the epic issue', () => {
      write('epic.md', '---\nname: demo\nstatus: backlog\n---\n# Demo\n');
      const r = run(path.join(SCRIPTS_DIR, 'create-epic-issue.sh'), [EPIC]);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe('101');
      expect(log()).toContain('.claude/prds/demo.md');
    });

    test('create-epic-issue:89 reads a one-line prd: value', () => {
      write('epic.md', '---\nname: demo\nprd: my-prd\nstatus: backlog\n---\n# Demo\n');
      const r = run(path.join(SCRIPTS_DIR, 'create-epic-issue.sh'), [EPIC]);
      expect(r.status).toBe(0);
      expect(log()).toContain('.claude/prds/my-prd.md');
    });

    test('create-epic-issue:47 classifies bug/feature on whole words only', () => {
      write('epic.md', '---\nname: demo\n---\n# Sync GitHub issues\n\nHandle errors and prefix lines.\n');
      expect(run(path.join(SCRIPTS_DIR, 'create-epic-issue.sh'), [EPIC]).status).toBe(0);
      expect(log()).toMatch(/labels= epic feature/);
      fs.rmSync(ghLog);
      write('epic.md', '---\nname: demo\n---\n# Login bug\n');
      expect(run(path.join(SCRIPTS_DIR, 'create-epic-issue.sh'), [EPIC]).status).toBe(0);
      expect(log()).toMatch(/labels= epic bug/);
    });

    test('epic-sync.sh:120 summary counts created tasks and exits non-zero on a shortfall', () => {
      write('epic.md', '---\nname: demo\n---\n# Demo\n');
      write('001.md', '# One\n');
      write('002.md', '# Two\n');
      const r = run(path.join(SCRIPTS_DIR, '..', 'epic-sync.sh'), [EPIC], { FAKE_GH_FAIL_TITLE: 'Two' });
      expect(r.status).not.toBe(0);
      expect(r.stdout).toContain('Tasks: 1 of 2 issues created');
      expect(r.stdout).not.toContain('Tasks: 2 issues created');
    });
  });

  describe('gate findings #920 round 2', () => {
    const { spawnSync } = require('child_process');
    const EPIC = 'demo';
    let binDir;
    let epicDir;
    let ghLog;

    const FAKE_GH = `#!/bin/bash
case "$1 $2" in
  "repo view") [[ -n "\${FAKE_GH_NO_REPO:-}" ]] && exit 1; echo "o/r"; exit 0 ;;
  "issue create") n=$(( $(cat "$FAKE_GH_LOG.n" 2>/dev/null || echo 100) + 1 )); echo "$n" > "$FAKE_GH_LOG.n"
    echo "CREATE $n" >> "$FAKE_GH_LOG"; echo "https://github.com/o/r/issues/$n"; exit 0 ;;
esac
exit 0
`;
    const run = (script, args, env = {}) => spawnSync('bash', [script, ...args], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, FAKE_GH_LOG: ghLog, ...env }
    });
    const write = (rel, content) => fs.writeFileSync(path.join(epicDir, rel), content);
    const read = (rel) => fs.readFileSync(path.join(epicDir, rel), 'utf8');
    const log = () => (fs.existsSync(ghLog) ? fs.readFileSync(ghLog, 'utf8') : '');
    const REFS = path.join(SCRIPTS_DIR, 'update-references.sh');
    const EPIC_FILE = path.join(SCRIPTS_DIR, 'update-epic-file.sh');
    const TASKS = path.join(SCRIPTS_DIR, 'create-task-issues.sh');

    beforeEach(() => {
      binDir = path.join(tempDir, 'bin');
      epicDir = path.join(tempDir, '.claude', 'epics', EPIC);
      ghLog = path.join(tempDir, 'gh.log');
      fs.mkdirSync(binDir, { recursive: true });
      fs.mkdirSync(epicDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'gh'), FAKE_GH, { mode: 0o755 });
    });

    test('update-references:114 an all-invalid mapping never truncates task files', () => {
      write('001.md', '---\nname: t\n---\nSee #5\n');
      write('77.md', '# Seventy-seven, see #001\n');
      write('.map', 'abc 5\n');
      const r = run(REFS, [EPIC, path.join(epicDir, '.map')]);
      expect(read('001.md')).toBe('---\nname: t\n---\nSee #5\n');
      expect(read('77.md')).toBe('# Seventy-seven, see #001\n');
      expect(r.status).not.toBe(0);
      expect(r.stdout).not.toContain('✅');
    });

    test('update-epic-file:65 rejects non-numeric mapping values instead of feeding them to sed', () => {
      write('epic.md', '---\nname: demo\ngithub: x\n---\n- [ ] 001\n- [x] 002\nTask 003\n');
      write('.task-mapping.txt', '001 2&x\n002 9\n003 12\n');
      const r = run(EPIC_FILE, [EPIC, '50']);
      expect(r.status).toBe(0);
      expect(read('epic.md')).toBe(
        '---\nname: demo\ngithub: https://github.com/o/r/issues/50\n---\n- [ ] 001\n- [x] #9\nTask #12\n'
      );
      expect(r.stdout + r.stderr).toMatch(/invalid mapping/i);
    });

    test('update-epic-file:64 does not chain substitutions (single pass)', () => {
      write('epic.md', '---\nname: demo\n---\n- [ ] 10\n- [ ] 20\n');
      write('.task-mapping.txt', '10 20\n20 30\n');
      expect(run(EPIC_FILE, [EPIC, '50']).status).toBe(0);
      expect(read('epic.md')).toBe(
        '---\nname: demo\ngithub: https://github.com/o/r/issues/50\n---\n- [ ] #20\n- [ ] #30\n'
      );
    });

    test('update-references:28 and update-epic-file fail instead of writing unknown/repo', () => {
      write('001.md', '---\nname: t\ngithub: x\n---\n# One\n');
      write('epic.md', '---\nname: demo\ngithub: x\n---\n');
      write('.map', '001 46\n');
      const refs = run(REFS, [EPIC, path.join(epicDir, '.map')], { FAKE_GH_NO_REPO: '1' });
      expect(refs.status).not.toBe(0);
      expect(read('001.md')).toBe('---\nname: t\ngithub: x\n---\n# One\n');
      expect(fs.existsSync(path.join(epicDir, '46.md'))).toBe(false);
      const ep = run(EPIC_FILE, [EPIC, '50'], { FAKE_GH_NO_REPO: '1' });
      expect(ep.status).not.toBe(0);
      expect(read('epic.md')).toBe('---\nname: demo\ngithub: x\n---\n');
    });

    test('update-references:112 a failed cross-reference pass fails the script', () => {
      write('001.md', '---\nname: t\n---\nSee #5\n');
      write('.map', '001 46\n');
      fs.writeFileSync(path.join(binDir, 'perl'), '#!/bin/sh\nexit 3\n', { mode: 0o755 });
      const r = run(REFS, [EPIC, path.join(epicDir, '.map')]);
      expect(r.status).not.toBe(0);
      expect(r.stdout).not.toContain('✅');
      expect(read('46.md')).toContain('See #5');
      expect(fs.existsSync(path.join(epicDir, '46.md.tmp'))).toBe(false);
    });

    test('create-task-issues:36 skips task files already synced to an issue', () => {
      write('001.md', '# One\n');
      write('46.md', '---\nname: t\ngithub: https://github.com/o/r/issues/46\n---\n# Done\n');
      const r = run(TASKS, [EPIC, '7']);
      expect(r.status).toBe(0);
      expect(log().match(/CREATE/g)).toHaveLength(1);
      expect(read('.task-mapping.txt')).toBe('001 101\n');
      expect(r.stderr).toMatch(/already synced.*46\.md/);
    });

    test('epic-sync.sh refuses a re-run before creating a duplicate epic issue', () => {
      write('epic.md', '---\nname: demo\n---\n# Demo\n');
      write('46.md', '---\nname: t\ngithub: https://github.com/o/r/issues/46\n---\n# Done\n');
      const r = run(path.join(SCRIPTS_DIR, '..', 'epic-sync.sh'), [EPIC]);
      expect(r.status).not.toBe(0);
      expect(log()).not.toContain('CREATE');
      expect(r.stdout + r.stderr).toMatch(/already synced/);
    });

    test('format-comment:52 prints only the comment path on stdout', () => {
      // Installed layout: .claude/scripts/{lib,pm/issue-sync}
      const scripts = path.join(tempDir, '.claude', 'scripts');
      const libSrc = path.join(__dirname, '..', '..', 'packages', 'plugin-core', 'scripts', 'lib');
      fs.mkdirSync(path.join(scripts, 'pm', 'issue-sync'), { recursive: true });
      fs.cpSync(libSrc, path.join(scripts, 'lib'), { recursive: true });
      const fc = path.join(scripts, 'pm', 'issue-sync', 'format-comment.sh');
      fs.copyFileSync(path.join(SCRIPTS_DIR, '..', 'issue-sync', 'format-comment.sh'), fc);
      fs.writeFileSync(path.join(tempDir, 'updates.md'), '## Progress\n- did a thing\n');
      fs.writeFileSync(path.join(tempDir, 'progress.md'), '---\ncompletion: 50\n---\n# Progress\n');
      const r = run(fc, ['12', 'updates.md', 'progress.md']);
      expect(r.status).toBe(0);
      const out = r.stdout.trim();
      expect(out.split('\n')).toHaveLength(1);
      expect(fs.existsSync(out)).toBe(true);
    });

    // gate findings #920 round 3 (#933)
    test('update-epic-file:48 opens frontmatter only on line 1, never at a body --- rule', () => {
      // No frontmatter, body has a --- rule: body kept byte-for-byte, a fresh
      // frontmatter carrying github: is prepended.
      const body = '# Demo\n\n---\ngithub: keep-me\nupdated: keep-me\n---\nend\n';
      const fm = (n) => new RegExp(`^---\\ngithub: https://github\\.com/o/r/issues/${n}\\nupdated: \\S+\\n---\\n`);
      write('epic.md', body);
      const ep = run(EPIC_FILE, [EPIC, '50']);
      expect(ep.status).toBe(0);
      expect(read('epic.md')).toMatch(fm(50));
      expect(read('epic.md').replace(fm(50), '')).toBe(body);

      write('001.md', body);
      write('.map', '001 46\n');
      const refs = run(REFS, [EPIC, path.join(epicDir, '.map')]);
      expect(refs.status).toBe(0);
      expect(read('46.md')).toMatch(fm(46));
      expect(read('46.md').replace(fm(46), '')).toBe(body);
    });

    test('update-epic-file:48 an unclosed frontmatter fails and changes nothing', () => {
      const bad = '---\nname: demo\ngithub: x\n';
      write('epic.md', bad);
      const ep = run(EPIC_FILE, [EPIC, '50']);
      expect(ep.status).not.toBe(0);
      expect(ep.stdout).not.toContain('✅');
      expect(read('epic.md')).toBe(bad);
      expect(fs.existsSync(path.join(epicDir, 'epic.md.backup'))).toBe(false);

      write('001.md', bad);
      write('.map', '001 46\n');
      const refs = run(REFS, [EPIC, path.join(epicDir, '.map')]);
      expect(refs.status).not.toBe(0);
      expect(read('001.md')).toBe(bad);
      expect(fs.existsSync(path.join(epicDir, '46.md'))).toBe(false);
    });

    test('update-references:88 writes github: when the frontmatter has none', () => {
      write('001.md', '---\nname: t\n---\n# One\n');
      write('epic.md', '---\nname: demo\n---\n# Demo\n');
      write('.map', '001 46\n');
      const refs = run(REFS, [EPIC, path.join(epicDir, '.map')]);
      expect(refs.status).toBe(0);
      expect(read('46.md')).toBe('---\nname: t\ngithub: https://github.com/o/r/issues/46\n---\n# One\n');
      const ep = run(EPIC_FILE, [EPIC, '50']);
      expect(ep.status).toBe(0);
      expect(read('epic.md')).toBe('---\nname: demo\ngithub: https://github.com/o/r/issues/50\n---\n# Demo\n');
    });
  });
});
