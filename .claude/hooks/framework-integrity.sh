#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): after an edit to framework sources, run the
# sync checks and the path validator that CI (commands-sync-check.yml,
# scripts-sync-check.yml) and .githooks/pre-commit would otherwise catch later.
# Exit 2 feeds the failure back to Claude.
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  */packages/*|*/autopm/.claude/*|*/.claude/scripts/*|*/lib/*|*/bin/*|*/scripts/*) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(npm run -s sync:commands:check 2>&1 && npm run -s sync:scripts:check 2>&1 && bash scripts/validate-framework-paths.sh 2>&1); then
  echo "$out" | tail -30 >&2
  echo "Framework integrity failed: edit the packages/ source, then npm run sync:commands / sync:scripts" >&2
  exit 2
fi
exit 0
