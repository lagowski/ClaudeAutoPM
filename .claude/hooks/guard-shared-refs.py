#!/usr/bin/env python3
# fmt: off
# ruff: noqa
"""PreToolUse(Bash) guard: refuse `git stash` and `pkill` for Claude Code agents.

Distributed fleet-wide by lagowski/pr-review-gate (templates/claude-guard-shared-refs.py) —
do NOT hand-edit it here: drift-check alarms on a changed copy and the next deploy replaces
it. Change it once, in canon. Each repo wires it itself in .claude/settings.json:

    "hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command",
      "command": "python3 \\"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-shared-refs.py\\"",
      "timeout": 10}]}]}

Both commands reach past a git worktree into state that parallel agents SHARE:

  * `git stash` — `refs/stash` is repository-wide, shared by every worktree. A `stash push`
    with nothing to save succeeds silently, and the next `stash pop` applies ANOTHER agent's
    stash (first seen in lagowski/cfd, 2026-08-19). To revert-and-restore a file, copy it
    aside and copy it back.
  * `pkill` — matches by PATTERN across every process of the user on the machine, including
    other agents' sessions (a peer's `pkill -f <id>` reaped an unrelated ssh wrapper, cfd
    2026-08-19). Stop processes by PID.

Deliberately narrow: it matches the command WORD at a command position, so a commit message,
a grep, or a doc that merely mentions the phrase is not refused. It fails OPEN on unparseable
input: a guard that blocks every command when its own parsing breaks gets switched off, and
then it guards nothing.

Pinned in both directions by lagowski/pr-review-gate tests/test_claude_guard_hook.py.

`# fmt: off` / `# ruff: noqa` above: this file is canon-owned and byte-checked, so no repo's
formatter or linter may rewrite it — and repos pin different black/ruff line lengths, so no
single formatting could satisfy all of them (news-sentiment's changed-lines black check
failed the first sync, #517). The exemption is the only fleet-stable choice.
"""
from __future__ import annotations

import json
import re
import sys

# A command position: start of string, or after ; & | ( ` $( or a newline, with optional
# leading env assignments / sudo / command wrappers we can see through cheaply.
_START = r"(?:^|[;&|()`\n]|\$\()\s*(?:(?:sudo|command|exec|nohup|time)\s+|[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*"

RULES: list[tuple[str, re.Pattern[str], str]] = [
    (
        "git stash",
        # git [-C dir | -c k=v | --git-dir=...]* stash
        re.compile(_START + r"git(?:\s+(?:-C\s+\S+|-c\s+\S+|--[a-z-]+(?:=\S+)?))*\s+stash\b"),
        "`git stash` is blocked for agents: refs/stash is shared by every worktree of this "
        "repository, so a later `stash pop` can apply ANOTHER agent's stash. To revert and "
        "restore a file, copy it aside (e.g. `cp f /tmp/f.bak`) and copy it back.",
    ),
    (
        "pkill",
        re.compile(_START + r"pkill\b"),
        "`pkill` is blocked for agents: it matches by pattern across every process of this user, "
        "including other agents' sessions. Find the PID (e.g. `pgrep -a <name>` and read the "
        "list) and `kill <PID>`.",
    ),
]


def _deny(reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        command = payload.get("tool_input", {}).get("command", "")
    except Exception:  # noqa: BLE001 — fail open, see module docstring
        return 0
    if not isinstance(command, str):
        return 0
    for _name, pattern, reason in RULES:
        if pattern.search(command):
            _deny(reason)
            return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
