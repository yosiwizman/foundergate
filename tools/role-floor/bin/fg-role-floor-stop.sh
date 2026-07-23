#!/usr/bin/env bash
# FounderGate role floor - graceful stop.
#
#   bash tools/role-floor/bin/fg-role-floor-stop.sh [--run-id <id>] [--kill-session]
#
# Writes STOP_REQUESTED, disables further dispatch, lets in-flight atomic
# writes finish, and asks the role windows to wind down. It deletes no
# evidence, resets no retry ledger, and leaves a resumable disk state.
# Works when the Claude sessions are already dead.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

RUN_ID=""; KILL_SESSION="no"; GRACE="${FG_RF_STOP_GRACE:-3}"; HOST="${FG_RF_HOST:-m1}"
while [ $# -gt 0 ]; do
  case "$1" in
    --host) shift; HOST="${1:-}" ;;
    --run-id) shift; RUN_ID="${1:-}" ;;
    --kill-session) KILL_SESSION="yes" ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) fg_err "unknown argument: $1"; exit 2 ;;
  esac
  shift
done

fg_host_load "$HOST" >/dev/null || { printf 'STATUS: BLOCKED\nreason: HOST_PROFILE_UNKNOWN:%s\n' "$HOST"; exit 2; }

if [ -z "$RUN_ID" ]; then
  for d in $(ls -1t "$FG_RF_RUN_ROOT" 2>/dev/null); do
    [ -f "${FG_RF_RUN_ROOT}/${d}/control/RUN_MANIFEST.json" ] && { RUN_ID="$d"; break; }
  done
fi
[ -n "$RUN_ID" ] && fg_run_exists "$RUN_ID" || { printf 'STATUS: NO_RUN_FOUND\n'; exit 0; }

# 1. Refuse new dispatch first, so nothing new starts while we wind down.
fg_run_state_update "$RUN_ID" '.stop_requested=true | .dispatch_enabled=false | .run_status="STOP_REQUESTED"'
fg_event_append "$RUN_ID" "stop_requested" "orchestrator" "" \
  "$(jq -n --arg by "$(id -un 2>/dev/null || echo unknown)" '{requested_by:$by, evidence_preserved:true}')" >/dev/null

# 2. Ask the supervisor to finish its current sweep, then stop.
SUP_PID_FILE="$(fg_control_dir "$RUN_ID")/supervisor.pid"
if [ -f "$SUP_PID_FILE" ]; then
  SUP_PID="$(cat "$SUP_PID_FILE" 2>/dev/null | tr -d '[:space:]')"
  if [ -n "$SUP_PID" ] && kill -0 "$SUP_PID" 2>/dev/null; then
    kill -TERM "$SUP_PID" 2>/dev/null || true
    N=0
    while [ "$N" -lt "$GRACE" ] && kill -0 "$SUP_PID" 2>/dev/null; do sleep 1; N=$(( N + 1 )); done
  fi
fi

# 3. Mark live lanes as stopped without destroying their verdicts.
for T in $(fg_task_list "$RUN_ID"); do
  ST="$(fg_task_get "$RUN_ID" "$T" status)"
  case "$ST" in
    RUNNING|STARTING|CHECKING|ADVISING|QUEUED|STARTING)
      fg_task_set_status "$RUN_ID" "$T" "STOP_REQUESTED" "graceful stop requested; work preserved" >/dev/null ;;
  esac
done

# 4. Role windows notice STOP_REQUESTED on their own refresh. Killing the tmux
#    session is opt-in, and only ever targets this package's own session name.
if [ "$KILL_SESSION" = "yes" ] && command -v "$FG_RF_TMUX_BIN" >/dev/null 2>&1; then
  if "$FG_RF_TMUX_BIN" has-session -t "$FG_RF_SESSION" 2>/dev/null; then
    "$FG_RF_TMUX_BIN" kill-session -t "$FG_RF_SESSION" 2>/dev/null || true
    fg_event_append "$RUN_ID" "tmux_session_killed" "orchestrator" "" \
      "$(jq -n --arg s "$FG_RF_SESSION" '{session:$s}')" >/dev/null
  fi
fi

fg_run_state_update "$RUN_ID" '.run_status="STOPPED"'
fg_event_append "$RUN_ID" "stopped" "orchestrator" "" '{"resumable":true}' >/dev/null
fg_next_safe_action_write "$RUN_ID" \
  "Run stopped gracefully. Leases, reports, logs, verdicts and the retry ledger are intact." \
  "Resume with fg-role-floor-start.sh --run-id ${RUN_ID}. Resume refuses corrupted or ambiguous state and never re-grades a completed verdict."
fg_seal_checksums "$RUN_ID"

printf 'STATUS: STOPPED\n'
printf 'run_id: %s\n' "$RUN_ID"
printf 'evidence_preserved: yes\n'
printf 'retry_ledger_reset: no\n'
printf 'resume: bash tools/role-floor/bin/fg-role-floor-start.sh --run-id %s\n' "$RUN_ID"
exit 0
