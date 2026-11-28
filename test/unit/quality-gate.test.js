const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/quality-gate.md');
const ISSUE_FINISH_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/pm:issue-finish.md');

describe('quality-gate command file', () => {
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

  it('test_quality_gate_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_quality_gate_frontmatter_has_allowed_tools_bash — frontmatter allowed-tools is Bash', () => {
    expect(fm['allowed-tools']).toBe('Bash');
  });

  it('test_quality_gate_pm_issue_finish_delegates_to_quality_gate — pm:issue-finish contains /quality-gate', () => {
    const issueFinishContent = fs.existsSync(ISSUE_FINISH_FILE)
      ? fs.readFileSync(ISSUE_FINISH_FILE, 'utf8')
      : '';
    expect(issueFinishContent).toContain('/quality-gate');
  });

  // ── GREEN tests (pass after implementation) ──────────────────────────────

  it('test_quality_gate_file_exists_at_correct_path — AC: command file lives at .claude/commands/quality-gate.md', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_quality_gate_frontmatter_allowed_tools_is_bash — AC: consistent with existing command files', () => {
    expect(fm['allowed-tools']).toBe('Bash');
  });

  it('test_quality_gate_detects_nodejs_from_package_json — AC: auto-detects language without args', () => {
    expect(content).toContain('package.json');
  });

  it('test_quality_gate_accepts_node_flag_override — AC: accepts --node override', () => {
    expect(content).toContain('--node');
  });

  it('test_quality_gate_runs_npm_lint_for_nodejs — AC: for Node.js detection, runs npm run lint', () => {
    expect(content).toContain('npm run lint');
  });

  it('test_quality_gate_nodejs_skips_format_check_and_typecheck — AC: format:check and typecheck scripts do not exist', () => {
    expect(content).not.toContain('format:check');
    expect(content).not.toContain('npm run typecheck');
  });

  it('test_quality_gate_coverage_thresholds_match_coverage_thresholds_xml — AC: lines/functions/statements >= 80%, branches >= 75%', () => {
    expect(content).toContain('80');
    expect(content).toContain('75');
  });

  it('test_quality_gate_exits_nonzero_on_failure — AC: non-zero exit on failure (hookable)', () => {
    expect(content).toContain('exit 1');
  });

  it('test_quality_gate_pm_issue_finish_delegates_step2_to_quality_gate — AC: pm:issue-finish delegates its quality gate step', () => {
    const issueFinishContent = fs.existsSync(ISSUE_FINISH_FILE)
      ? fs.readFileSync(ISSUE_FINISH_FILE, 'utf8')
      : '';
    expect(issueFinishContent).toContain('/quality-gate');
  });

  it('test_quality_gate_output_fits_20_lines — AC: output fits in ~20 lines', () => {
    // Find the QUALITY GATE report template section
    const start = content.indexOf('QUALITY GATE');
    const gateLineIdx = content.indexOf('Gate:', start);
    expect(start).toBeGreaterThan(-1);
    expect(gateLineIdx).toBeGreaterThan(start);
    const section = content.slice(start, gateLineIdx + content.slice(gateLineIdx).indexOf('\n'));
    const nonEmptyLines = section.split('\n').filter(l => l.trim().length > 0);
    expect(nonEmptyLines.length).toBeLessThanOrEqual(20);
  });
});
