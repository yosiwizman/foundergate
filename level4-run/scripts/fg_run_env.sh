#!/bin/bash
# Level-3C move-resilient logging: fixed evidence root + fail-closed write guard.
# Sourced by fg_monitor.sh / fg_ledger.sh / fg_driver.sh.
#
# The FIXED evidence root lives OUTSIDE any Finder/Desktop folder so relocating
# the Desktop run folder can never break duration evidence.
: "${FG_RUN_ID:?FG_RUN_ID required}"
FG_EVIDENCE_ROOT="$HOME/.foundergate/runs/$FG_RUN_ID"
export FG_EVIDENCE_ROOT

fg_now() { date -u +%FT%TZ; }

fg_init_root() {
  mkdir -p "$FG_EVIDENCE_ROOT" || return 3
  # create the run subdir up front so identity/status writes never race a missing dir
  [ -n "${FG_SUBDIR:-}" ] && { mkdir -p "$FG_EVIDENCE_ROOT/$FG_SUBDIR" || return 3; }
  printf '{"run_id":"%s","evidence_root":"%s","created_utc":"%s","note":"authoritative duration evidence; NOT on Desktop"}\n' \
    "$FG_RUN_ID" "$FG_EVIDENCE_ROOT" "$(fg_now)" > "$FG_EVIDENCE_ROOT/evidence_root_identity.json" || return 3
  return 0
}

# Record a HELD_EVIDENCE_WRITE_FAILURE marker (best effort) + stderr; never PASS.
fg_held() {
  local reason="$1"
  printf '{"state":"HELD_EVIDENCE_WRITE_FAILURE","reason":"%s","utc":"%s"}\n' "$reason" "$(fg_now)" \
    > "$FG_EVIDENCE_ROOT/status.json" 2>/dev/null \
    || printf '{"state":"HELD_EVIDENCE_WRITE_FAILURE","reason":"%s (root unreachable)","utc":"%s"}\n' "$reason" "$(fg_now)" >&2
  echo "HELD_EVIDENCE_WRITE_FAILURE: $reason" >&2
}

# fg_append <relpath> <line...>  -> append to fixed root, VERIFY bytes grew, fail closed.
fg_append() {
  local rel="$1"; shift; local line="$*"
  local f="$FG_EVIDENCE_ROOT/$rel"
  if [ ! -d "$FG_EVIDENCE_ROOT" ] || [ ! -w "$FG_EVIDENCE_ROOT" ]; then fg_held "evidence root unavailable: $FG_EVIDENCE_ROOT"; return 3; fi
  local dir; dir="$(dirname "$f")"
  mkdir -p "$dir" 2>/dev/null || { fg_held "mkdir failed: $dir"; return 3; }
  if [ ! -w "$dir" ]; then fg_held "evidence dir not writable: $dir"; return 3; fi
  local before after
  before=$([ -f "$f" ] && wc -c < "$f" 2>/dev/null || echo 0)
  if ! printf '%s\n' "$line" >> "$f" 2>/dev/null; then fg_held "append failed: $f"; return 3; fi
  after=$([ -f "$f" ] && wc -c < "$f" 2>/dev/null || echo 0)
  if [ "${after:-0}" -le "${before:-0}" ]; then fg_held "no bytes written: $f"; return 3; fi
  return 0
}

fg_status_running() {
  local rel="${FG_SUBDIR:+$FG_SUBDIR/}status.json"
  printf '{"state":"RUNNING","last_heartbeat_utc":"%s","elapsed_min":%s}\n' "$(fg_now)" "${1:-0}" \
    > "$FG_EVIDENCE_ROOT/$rel" 2>/dev/null || { fg_held "status write failed"; return 3; }
  return 0
}
