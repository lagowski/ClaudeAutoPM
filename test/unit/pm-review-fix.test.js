const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/pm:review-fix.md');

describe('pm:review-fix command file', () => {
  let content;

  beforeAll(() => {
    if (fs.existsSync(COMMAND_FILE)) {
      content = fs.readFileSync(COMMAND_FILE, 'utf8');
    } else {
      content = '';
    }
  });

  // ── RED tests ────────────────────────────────────────────────────────────

  it('test_review_fix_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_review_fix_frontmatter_includes_allowed_tools_bash_read_edit — frontmatter allowed-tools', () => {
    const fm = parseCommandFrontmatter(content);
    expect(fm['allowed-tools']).toBe('Bash, Read, Edit');
  });

  it('test_review_fix_instructs_gh_pr_view_with_reviewThreads_json — uses gh pr view with reviewThreads', () => {
    expect(content).toContain('gh pr view');
    expect(content).toContain('reviewThreads');
  });

  it('test_review_fix_specifies_errors_first_fix_order — error before style before comment', () => {
    const errorIdx = content.indexOf('error');
    const styleIdx = content.indexOf('style');
    const commentIdx = content.indexOf('comment');
    expect(errorIdx).toBeGreaterThan(-1);
    expect(styleIdx).toBeGreaterThan(errorIdx);
    expect(commentIdx).toBeGreaterThan(styleIdx);
  });

  // ── GREEN tests ──────────────────────────────────────────────────────────

  it('test_review_fix_file_exists_at_correct_path — AC: file created at naming-convention path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_review_fix_frontmatter_allowed_tools_is_bash_read_edit — AC: frontmatter matches pattern', () => {
    const fm = parseCommandFrontmatter(content);
    expect(fm['allowed-tools']).toBe('Bash, Read, Edit');
  });

  it('test_review_fix_blocks_push_when_tests_fail_instruction_present — AC: no push on test failure', () => {
    const lower = content.toLowerCase();
    const hasBlock = lower.includes('do not push') ||
      lower.includes('block') ||
      lower.includes('skip') ||
      (lower.includes('push') && lower.includes('fail'));
    expect(hasBlock).toBe(true);
  });

  it('test_review_fix_delegates_to_test_runner_agent — AC: references @test-runner', () => {
    expect(content).toContain('@test-runner');
  });

  it('test_review_fix_outputs_per_comment_status — AC: mentions fixed, responded, skipped', () => {
    expect(content).toContain('fixed');
    expect(content).toContain('responded');
    expect(content).toContain('skipped');
  });
});
