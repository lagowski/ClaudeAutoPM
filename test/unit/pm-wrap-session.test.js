const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/wrap-session.md');

describe('wrap-session command file', () => {
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

  // ── RED tests ────────────────────────────────────────────────────────────

  it('test_wrap_session_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_wrap_session_frontmatter_allowed_tools_lists_read_edit_write_bash — frontmatter allowed-tools', () => {
    expect(fm['allowed-tools']).toBe('Read, Edit, Write, Bash');
  });

  it('test_wrap_session_output_header_is_wrap_session_complete — output uses correct header', () => {
    expect(content).toContain('✅ wrap-session complete');
  });

  it('test_wrap_session_lists_all_four_memory_types — mentions all four types', () => {
    expect(content).toContain('user');
    expect(content).toContain('feedback');
    expect(content).toContain('project');
    expect(content).toContain('reference');
  });

  // ── GREEN tests ──────────────────────────────────────────────────────────

  it('test_wrap_session_file_exists_at_correct_path — AC: file created at naming-convention path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_wrap_session_frontmatter_allowed_tools_is_read_edit_write_bash — AC: frontmatter matches spec', () => {
    expect(fm['allowed-tools']).toBe('Read, Edit, Write, Bash');
  });

  it('test_wrap_session_lists_all_four_memory_types — AC: Update memories step covers all four types', () => {
    expect(content).toContain('user');
    expect(content).toContain('feedback');
    expect(content).toContain('project');
    expect(content).toContain('reference');
  });

  it('test_wrap_session_enforces_memory_md_200_line_guard — AC: MEMORY.md stays under 200 lines', () => {
    expect(content).toContain('200');
    expect(content.toLowerCase()).toContain('memory.md');
  });

  it('test_wrap_session_marks_idempotency_requirement — AC: running twice does not duplicate entries', () => {
    const lower = content.toLowerCase();
    const hasIdempotent = lower.includes('idempotent');
    const hasDuplicateTwice = lower.includes('duplicate') && lower.includes('twice');
    expect(hasIdempotent || hasDuplicateTwice).toBe(true);
  });

  it('test_wrap_session_output_header_is_wrap_session_complete — AC: output format has exact header', () => {
    expect(content).toContain('✅ wrap-session complete');
  });

  it('test_wrap_session_output_includes_next_line — AC: output format has Next: line per standard-patterns.md', () => {
    expect(content).toContain('Next:');
  });

  it('test_wrap_session_output_includes_fenced_primer_block — AC: ready-to-paste primer in fenced block after Next:', () => {
    const nextIdx = content.indexOf('Next:');
    const fenceIdx = content.indexOf('```');
    expect(nextIdx).toBeGreaterThan(-1);
    expect(fenceIdx).toBeGreaterThan(nextIdx);
  });

  it('test_wrap_session_contains_five_numbered_steps — AC: 5-step Instructions body per technical spec', () => {
    const lower = content.toLowerCase();
    expect(lower).toContain('summarize');
    expect(lower).toContain('memories');
    expect(lower).toContain('claude.md');
    expect(lower).toContain('hooks');
    expect(lower).toContain('primer');
  });

  it('test_wrap_session_step5_delegates_to_handoff_command — step 5 references /handoff', () => {
    expect(content).toContain('/handoff');
  });
});
