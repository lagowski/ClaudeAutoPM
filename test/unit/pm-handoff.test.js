const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');
const { assertRealTimestamp } = require('../helpers/assert-real-timestamp');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/handoff.md');

describe('handoff command file', () => {
  let content;
  let fm;

  beforeAll(() => {
    if (fs.existsSync(COMMAND_FILE)) {
      content = fs.readFileSync(COMMAND_FILE, 'utf8');
      fm = parseCommandFrontmatter(content);
    } else {
      content = '';
      fm = {};
    }
  });

  // ── RED tests (fail before implementation) ───────────────────────────────

  it('test_handoff_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_handoff_frontmatter_allowed_tools_is_read_bash — frontmatter allowed-tools is Read, Bash', () => {
    expect(fm['allowed-tools']).toBe('Read, Bash');
  });

  it('test_handoff_output_header_is_handoff_ready_copy_between_lines — output uses correct header', () => {
    expect(content).toContain('📋 Handoff ready — copy everything between the lines:');
  });

  it('test_handoff_writes_to_tmp_with_real_timestamp_pattern — uses real timestamp, no placeholder', () => {
    assertRealTimestamp(content);
  });

  // ── GREEN tests (pass after implementation) ──────────────────────────────

  it('test_handoff_captures_git_branch_and_diff_commands — mentions git branch and git diff --name-only HEAD', () => {
    const hasBranch = content.includes('git branch') || content.includes('git rev-parse --abbrev-ref');
    expect(hasBranch).toBe(true);
    expect(content).toContain('git diff --name-only HEAD');
  });

  it('test_handoff_writes_to_tmp_with_real_timestamp_no_placeholder — /tmp/handoff- with real date cmd, no placeholder strings', () => {
    assertRealTimestamp(content);
  });

  it('test_handoff_primer_includes_context_branch_next_saved_to_lines — primer has required fields', () => {
    expect(content).toContain('Context:');
    expect(content).toContain('Branch:');
    expect(content).toContain('Next:');
    expect(content).toContain('Saved to:');
  });

  it('test_handoff_output_header_is_handoff_ready_copy_between_lines — AC: output format has exact header', () => {
    expect(content).toContain('📋 Handoff ready — copy everything between the lines:');
  });

  it('test_handoff_states_200_word_limit_for_primer — documents the 200-word limit', () => {
    const idx200 = content.indexOf('200');
    expect(idx200).toBeGreaterThan(-1);
    const window = content.slice(Math.max(0, idx200 - 30), idx200 + 30);
    const hasWord = window.toLowerCase().includes('word');
    expect(hasWord).toBe(true);
  });

  it('test_handoff_has_fallback_when_not_on_feature_branch — handles detached HEAD or non-feature branch', () => {
    const lower = content.toLowerCase();
    const hasFallback =
      lower.includes('fallback') ||
      lower.includes('unknown') ||
      lower.includes('not on a feature') ||
      lower.includes('main') ||
      lower.includes('develop');
    expect(hasFallback).toBe(true);
  });
});
