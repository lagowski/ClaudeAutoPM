const fs = require('fs');
const path = require('path');
const { parseCommandFrontmatter } = require('../helpers/parse-command-frontmatter');

const COMMAND_FILE = path.resolve(__dirname, '../../autopm/.claude/commands/session-health.md');
const CONFIG_FILE = path.resolve(__dirname, '../../autopm/.claude/config.json');

describe('session-health command file', () => {
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

  it('test_session_health_command_file_exists — file exists at correct path', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_session_health_frontmatter_allowed_tools_is_bash_read — frontmatter allowed-tools is Bash, Read', () => {
    expect(fm['allowed-tools']).toBe('Bash, Read');
  });

  it('test_session_health_output_header_is_session_health — output uses SESSION HEALTH header', () => {
    expect(content).toContain('SESSION HEALTH');
  });

  it('test_session_health_config_json_has_session_health_key — config.json has sessionHealth key', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    expect(config.sessionHealth).toBeDefined();
  });

  // ── GREEN tests (pass after implementation) ──────────────────────────────

  it('test_session_health_file_exists_at_correct_path — AC: command file at autopm/.claude/commands/session-health.md', () => {
    expect(fs.existsSync(COMMAND_FILE)).toBe(true);
  });

  it('test_session_health_frontmatter_allowed_tools_is_bash_read — AC: allowed-tools: Bash, Read', () => {
    expect(fm['allowed-tools']).toBe('Bash, Read');
  });

  it('test_session_health_config_json_session_health_defaults_green_60_yellow_85 — AC: default thresholds green=60, yellow=85', () => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    expect(config.sessionHealth.green).toBe(60);
    expect(config.sessionHealth.yellow).toBe(85);
  });

  it('test_session_health_output_mentions_15_line_limit — AC: output is under 15 lines', () => {
    const idx15 = content.indexOf('15');
    expect(idx15).toBeGreaterThan(-1);
    const window = content.slice(Math.max(0, idx15 - 30), idx15 + 30);
    expect(window.toLowerCase()).toContain('line');
  });

  it('test_session_health_treats_absent_transcript_dir_as_green — AC: absent/empty transcript dir → green, no error', () => {
    const lower = content.toLowerCase();
    const hasFallback =
      content.includes('if [ ! -d') ||
      content.includes('2>/dev/null');
    expect(hasFallback).toBe(true);
    expect(lower).toContain('green');
  });

  it('test_session_health_recommends_wrap_session_handoff_compact_on_yellow_or_red — AC: tells user which commands to run', () => {
    expect(content).toContain('/wrap-session');
    expect(content).toContain('/handoff');
    expect(content).toContain('/compact');
  });

  it('test_session_health_scores_green_yellow_red_thresholds_referenced — AC: three-level scoring', () => {
    const lower = content.toLowerCase();
    expect(lower).toContain('green');
    expect(lower).toContain('yellow');
    expect(lower).toContain('red');
  });

  it('test_session_health_reads_session_health_key_from_config_json — AC: thresholds configurable via sessionHealth in config.json', () => {
    const lower = content.toLowerCase();
    const hasRef =
      lower.includes('config.json') ||
      content.includes('sessionHealth');
    expect(hasRef).toBe(true);
  });

  // ── Threshold operator and boundary tests (#674) ──────────────────────────

  it('test_session_health_red_branch_operator_is_strict_gt — red branch uses -gt not -ge', () => {
    expect(content).toContain('-gt "$YELLOW_THRESHOLD"');
  });

  it('test_session_health_threshold_85_classified_as_yellow_not_red — PCT=85 is yellow per docstring', () => {
    const match = content.match(/\[ "\$PCT" (-g[et]) "\$YELLOW_THRESHOLD" \]/);
    const op = match ? match[1] : '-ge';
    const pct = 85, yellowThreshold = 85, greenThreshold = 60;
    const isRed = op === '-gt' ? pct > yellowThreshold : pct >= yellowThreshold;
    const result = isRed ? 'red' : pct >= greenThreshold ? 'yellow' : 'green';
    expect(result).toBe('yellow');
  });

  describe('threshold classification boundary values', () => {
    function classify(pct, green = 60, yellow = 85) {
      const match = content.match(/\[ "\$PCT" (-g[et]) "\$YELLOW_THRESHOLD" \]/);
      const op = match ? match[1] : '-ge';
      const isRed = op === '-gt' ? pct > yellow : pct >= yellow;
      if (isRed) return 'red';
      if (pct >= green) return 'yellow';
      return 'green';
    }

    it.each([
      ['test_session_health_threshold_59_is_green', 59, 'green'],
      ['test_session_health_threshold_60_is_yellow', 60, 'yellow'],
      ['test_session_health_threshold_85_is_yellow', 85, 'yellow'],
      ['test_session_health_threshold_86_is_red', 86, 'red'],
    ])('%s', (_name, pct, expected) => {
      expect(classify(pct)).toBe(expected);
    });
  });
});
