const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/pm:issue-finish.md');

describe('pm:issue-finish command file', () => {
  let content;

  beforeAll(() => {
    if (fs.existsSync(COMMAND_FILE)) {
      content = fs.readFileSync(COMMAND_FILE, 'utf8');
    } else {
      content = '';
    }
  });

  // ── RED tests ─────────────────────────────────────────────────────────────

  it('test_pm_issue_finish_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_pm_issue_finish_has_allowed_tools_frontmatter — frontmatter includes allowed-tools: Bash, Read', () => {
    const fm = parseCommandFrontmatter(content);
    expect(fm['allowed-tools']).toBe('Bash, Read');
  });

  it('test_pm_issue_finish_blocks_on_main_or_develop_branch — exact error message present', () => {
    expect(content).toContain('❌ Must be on a feature branch, not main/develop');
  });

  it('test_pm_issue_finish_contains_coverage_table_with_four_rows — all four metric labels and thresholds present', () => {
    expect(content).toContain('Lines');
    expect(content).toContain('Branches');
    expect(content).toContain('Functions');
    expect(content).toContain('Statements');
    expect(content).toContain('80%');
    expect(content).toContain('75%');
  });

  // ── GREEN tests ───────────────────────────────────────────────────────────

  it('test_pm_issue_finish_detects_issue_number_from_branch_name — git branch command with number extraction', () => {
    const hasBranchCmd = content.includes('git branch') || content.includes('git rev-parse');
    const hasNumberExtract = content.includes('grep -oE') || content.includes('[0-9]');
    expect(hasBranchCmd).toBe(true);
    expect(hasNumberExtract).toBe(true);
  });

  it('test_pm_issue_finish_accepts_explicit_issue_number_argument — references $ARGUMENTS or $1', () => {
    const hasArgs = content.includes('$ARGUMENTS') || content.includes('$1');
    expect(hasArgs).toBe(true);
  });

  it('test_pm_issue_finish_blocks_pr_when_tests_fail — /quality-gate before gh pr create with block on failure', () => {
    expect(content).toContain('/quality-gate || exit 1');
    const gateIdx = content.indexOf('/quality-gate || exit 1');
    const prIdx = content.indexOf('gh pr create');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(prIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(prIdx);
    const lower = content.toLowerCase();
    const hasBlock = lower.includes('block') || lower.includes('exit 1') || lower.includes('no pr');
    expect(hasBlock).toBe(true);
  });

  it('test_pm_issue_finish_blocks_pr_when_coverage_below_threshold — /quality-gate as quality-gate mechanism', () => {
    expect(content).toContain('/quality-gate || exit 1');
    const lower = content.toLowerCase();
    const hasBlock = lower.includes('exit 1') || lower.includes('no pr');
    expect(hasBlock).toBe(true);
  });

  it('test_pm_issue_finish_pr_body_includes_coverage_table — gh pr create body has four-row coverage table with status symbols', () => {
    expect(content).toContain('gh pr create');
    expect(content).toContain('✅');
    expect(content).toContain('❌');
    expect(content).toContain('Lines');
    expect(content).toContain('Branches');
    expect(content).toContain('Functions');
    expect(content).toContain('Statements');
  });

  it('test_pm_issue_finish_ends_with_review_prompt — exact output string present', () => {
    expect(content).toContain('Waiting for review. Run /pm:review-fix after Copilot comments.');
  });
});
