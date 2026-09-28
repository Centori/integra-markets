#!/usr/bin/env bash
#
# Regenerate the "where we left off" section of handoff.md after a period of
# inactivity, so a session that stops mid-flight leaves a usable record instead
# of whatever the last commit message happened to say.
#
# WHY IT ONLY TOUCHES A DELIMITED BLOCK
# handoff.md is tracked, hand-written and carries reasoning that nothing can
# regenerate — why a bug existed, what was ruled out, what was deliberately not
# done. A daemon that rewrote the file would destroy exactly the part worth
# keeping. It writes between HANDOFF:AUTO markers and leaves every other byte
# alone, and it preserves a HANDOFF:NEXT block so a human-set queue survives
# regeneration too.
#
# WHAT COUNTS AS ACTIVITY
# The newest mtime across the source tree plus .git/index and .git/HEAD, which
# between them cover editing, staging, committing and switching branches. Build
# output, dependencies and caches are pruned — node_modules alone would make
# every `npm install` look like work in progress.
#
# IT DOES NOT COMMIT. An automatic commit is a surprise in someone else's
# history, and the point here is to leave a note, not to take an action.
#
# Usage:
#   scripts/handoff-daemon.sh            run in the foreground
#   scripts/handoff-daemon.sh --once     evaluate once and exit (for testing)
#   scripts/handoff-daemon.sh --force    regenerate now, ignoring the idle gate
#   scripts/handoff-daemon.sh --status   is it running, and when did it last write
#   scripts/handoff-daemon.sh --install  load as a launchd agent (macOS)
#   scripts/handoff-daemon.sh --uninstall
#
# Environment:
#   HANDOFF_IDLE_SECONDS  idle before a regeneration (default 600 = 10 minutes)
#   HANDOFF_POLL_SECONDS  how often to check         (default 60)
#   HANDOFF_NO_NETWORK=1  skip the `gh` calls

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Git tracks this as lowercase. On a case-insensitive filesystem HANDOFF.md is
# the SAME inode, so writing to the other spelling silently edits this file
# while `git status` reports nothing — use the tracked name.
HANDOFF="$REPO/handoff.md"
STATE_DIR="$REPO/.handoff"
LOG="$STATE_DIR/daemon.log"
PIDFILE="$STATE_DIR/daemon.pid"
STAMP="$STATE_DIR/last-write"

IDLE_SECONDS="${HANDOFF_IDLE_SECONDS:-600}"
POLL_SECONDS="${HANDOFF_POLL_SECONDS:-60}"

AUTO_BEGIN="<!-- HANDOFF:AUTO:BEGIN -->"
AUTO_END="<!-- HANDOFF:AUTO:END -->"
NEXT_BEGIN="<!-- HANDOFF:NEXT:BEGIN -->"
NEXT_END="<!-- HANDOFF:NEXT:END -->"

mkdir -p "$STATE_DIR"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG"; }

# --- activity ---------------------------------------------------------------

# Newest mtime in the working tree, as a unix timestamp.
#
# Pruned rather than filtered: `find | grep -v node_modules` still walks every
# file in it, and this runs once a minute.
newest_source_mtime() {
  find "$REPO" \
    \( -name node_modules -o -name .git -o -name .next -o -name __pycache__ \
       -o -name .worktrees -o -name .expo -o -name dist -o -name build \
       -o -name .venv -o -name venv -o -name .handoff -o -name ml_models \
       -o -name .pytest_cache -o -name .mypy_cache \) -prune -o \
    -type f -print0 2>/dev/null \
  | xargs -0 stat -f '%m' 2>/dev/null \
  | sort -rn | head -1
}

git_meta_mtime() {
  stat -f '%m' "$REPO/.git/index" "$REPO/.git/HEAD" 2>/dev/null | sort -rn | head -1
}

last_activity() {
  { newest_source_mtime; git_meta_mtime; } | sort -rn | head -1
}

# --- report -----------------------------------------------------------------

# Everything between the NEXT markers in the current file, so a hand-written
# queue survives regeneration. Empty if the block is absent.
existing_next_block() {
  [ -f "$HANDOFF" ] || return 0
  awk -v b="$NEXT_BEGIN" -v e="$NEXT_END" '
    index($0,b){f=1;next} index($0,e){f=0;next} f' "$HANDOFF"
}

render() {
  local idle_min=$1 now
  now="$(date '+%Y-%m-%d %H:%M %Z')"

  local branch dirty ahead behind upstream
  branch="$(git -C "$REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  upstream="$(git -C "$REPO" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
  if [ -n "$upstream" ]; then
    ahead="$(git -C "$REPO" rev-list --count "$upstream..HEAD" 2>/dev/null || echo 0)"
    behind="$(git -C "$REPO" rev-list --count "HEAD..$upstream" 2>/dev/null || echo 0)"
  fi

  echo "$AUTO_BEGIN"
  echo
  echo "## Where we left off"
  echo
  echo "_Captured $now after $idle_min minutes idle, by \`scripts/handoff-daemon.sh\`._"
  echo "_Everything in this block is derived and will be overwritten; write anything"
  echo "you want kept outside it._"
  echo

  # --- position ---
  printf '**Branch** `%s`' "$branch"
  if [ -n "$upstream" ]; then
    if [ "${ahead:-0}" != 0 ] || [ "${behind:-0}" != 0 ]; then
      printf ' — %s ahead, %s behind `%s`' "${ahead:-0}" "${behind:-0}" "$upstream"
    else
      printf ' — in sync with `%s`' "$upstream"
    fi
  else
    printf ' — no upstream'
  fi
  echo; echo

  # --- uncommitted ---
  dirty="$(git -C "$REPO" status --porcelain 2>/dev/null)"
  if [ -z "$dirty" ]; then
    echo "**Working tree** clean."
  else
    echo "**Uncommitted changes** — this is the part most easily lost:"
    echo
    echo '```'
    echo "$dirty" | head -40
    [ "$(echo "$dirty" | wc -l)" -gt 40 ] && echo "... $(( $(echo "$dirty" | wc -l) - 40 )) more"
    echo '```'
  fi
  echo

  # --- stashes: invisible in every other view, and easy to forget entirely ---
  local stashes
  stashes="$(git -C "$REPO" stash list 2>/dev/null)"
  if [ -n "$stashes" ]; then
    echo "**Stashed** — not shown by \`git status\`, so worth stating:"
    echo
    echo '```'
    echo "$stashes"
    echo '```'
    echo
  fi

  # --- recent history ---
  echo "**Last commits**"
  echo
  echo '```'
  git -C "$REPO" log --oneline -6 2>/dev/null
  echo '```'
  echo

  # --- open work ---
  if [ "${HANDOFF_NO_NETWORK:-0}" != "1" ] && command -v gh >/dev/null 2>&1; then
    local prs
    prs="$(gh pr list --repo "$(git -C "$REPO" remote get-url origin 2>/dev/null \
            | sed -E 's#.*github.com[:/]##; s#\.git$##')" \
            --state open --limit 10 \
            --json number,title,isDraft,statusCheckRollup \
            --jq '.[] | "#\(.number) \(.title)\((.isDraft|if . then " [draft]" else "" end)) — checks: \([.statusCheckRollup[]?|select(.conclusion!=null)|.conclusion]|if length==0 then "none reported" else (unique|join(", ")) end)"' \
            2>/dev/null)"
    if [ -n "$prs" ]; then
      echo "**Open pull requests**"
      echo
      while IFS= read -r line; do echo "- $line"; done <<<"$prs"
      echo
    else
      echo "**Open pull requests** none."
      echo
    fi
  fi

  # --- preserved intent ---
  local next
  next="$(existing_next_block)"
  echo "$NEXT_BEGIN"
  if [ -n "$next" ]; then
    echo "$next"
  else
    echo "**Next**"
    echo
    echo "_Nothing recorded. Anything written between the NEXT markers is kept"
    echo "across regenerations — this is where the queue goes._"
  fi
  echo "$NEXT_END"
  echo
  echo "$AUTO_END"
}

# Replace the AUTO block in place, or prepend it below the title if absent.
write_report() {
  local body tmp
  body="$(render "$1")"
  tmp="$(mktemp)"

  if [ -f "$HANDOFF" ] && grep -qF "$AUTO_BEGIN" "$HANDOFF"; then
    # Swap the old block for the new one. The body goes through a file rather
    # than an awk -v because it contains newlines, backticks and quotes.
    printf '%s\n' "$body" >"$tmp.body"
    awk -v b="$AUTO_BEGIN" -v e="$AUTO_END" -v f="$tmp.body" '
      index($0,b){skip=1; while((getline line < f)>0) print line; close(f); next}
      index($0,e){skip=0; next}
      !skip' "$HANDOFF" >"$tmp"
    rm -f "$tmp.body"
  else
    { printf '%s\n\n' "$body"; [ -f "$HANDOFF" ] && cat "$HANDOFF"; } >"$tmp"
  fi

  # Only write when something actually changed. Rewriting an identical file
  # every ten minutes would show up as a permanently dirty working tree, and a
  # dirty tree that means nothing is worse than no note at all.
  if [ -f "$HANDOFF" ] && cmp -s "$tmp" "$HANDOFF"; then
    rm -f "$tmp"
    log "no change"
    return 1
  fi
  mv "$tmp" "$HANDOFF"
  date +%s >"$STAMP"
  log "wrote handoff.md (idle ${1}m)"
  return 0
}

evaluate() {
  local now last idle
  now="$(date +%s)"
  last="$(last_activity)"
  [ -z "$last" ] && { log "could not determine last activity"; return; }
  idle=$(( now - last ))

  if [ "$idle" -lt "$IDLE_SECONDS" ]; then
    return
  fi
  # Once per idle period, not once per poll.
  if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" -gt "$last" ]; then
    return
  fi
  write_report "$(( idle / 60 ))" >/dev/null
}

# --- entry points -----------------------------------------------------------

case "${1:-}" in
  --once)   evaluate; exit 0 ;;
  --force)  write_report "$(( ( $(date +%s) - $(last_activity) ) / 60 ))"; exit 0 ;;
  --status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "running (pid $(cat "$PIDFILE")), idle threshold ${IDLE_SECONDS}s"
    else
      echo "not running"
    fi
    [ -f "$STAMP" ] && echo "last wrote: $(date -r "$(cat "$STAMP")" '+%Y-%m-%d %H:%M:%S')"
    exit 0 ;;
  --install)
    PLIST="$HOME/Library/LaunchAgents/app.integramarkets.handoff.plist"
    mkdir -p "$(dirname "$PLIST")"
    cat >"$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>app.integramarkets.handoff</string>
  <key>ProgramArguments</key>
  <array>
    <string>$REPO/scripts/handoff-daemon.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$STATE_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$STATE_DIR/launchd.err.log</string>
  <key>WorkingDirectory</key><string>$REPO</string>
</dict>
</plist>
PLISTEOF
    launchctl unload "$PLIST" 2>/dev/null
    launchctl load "$PLIST" && echo "loaded app.integramarkets.handoff"
    exit 0 ;;
  --uninstall)
    PLIST="$HOME/Library/LaunchAgents/app.integramarkets.handoff.plist"
    launchctl unload "$PLIST" 2>/dev/null
    rm -f "$PLIST" && echo "unloaded and removed"
    exit 0 ;;
  --help|-h)
    sed -n '3,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0 ;;
esac

# --- daemon loop ------------------------------------------------------------

# One instance. Two daemons writing the same file would race on the temp file
# and could interleave a half-written report into a tracked document.
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "already running (pid $(cat "$PIDFILE"))" >&2
  exit 1
fi
echo $$ >"$PIDFILE"
trap 'rm -f "$PIDFILE"; log "stopped"; exit 0' INT TERM EXIT

log "started (idle ${IDLE_SECONDS}s, poll ${POLL_SECONDS}s, repo $REPO)"
while true; do
  evaluate
  # Backgrounded so the trap runs immediately. A foreground `sleep` is not
  # interrupted by a signal — bash defers the handler until the current command
  # returns — so `launchctl unload` or Ctrl-C would hang for up to a full poll
  # interval before the daemon acknowledged it.
  sleep "$POLL_SECONDS" &
  wait $! 2>/dev/null
done
