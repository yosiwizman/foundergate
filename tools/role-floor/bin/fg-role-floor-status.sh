#!/usr/bin/env bash
# FounderGate role floor - compact founder-readable status.
#
#   bash tools/role-floor/bin/fg-role-floor-status.sh --host m1
#   bash tools/role-floor/bin/fg-role-floor-status.sh --host m4 [--run-id <id>] [--json]
#
# Reads disk truth only. Works when the tmux session is gone and when every
# Claude session is dead.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

RUN_ID=""; AS_JSON="no"; REPO=""; HOST="${FG_RF_HOST:-m1}"
while [ $# -gt 0 ]; do
  case "$1" in
    --host) shift; HOST="${1:-}" ;;
    --run-id) shift; RUN_ID="${1:-}" ;;
    --repo) shift; REPO="${1:-}" ;;
    --json) AS_JSON="yes" ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) fg_err "unknown argument: $1"; exit 2 ;;
  esac
  shift
done

fg_host_load "$HOST" >/dev/null || { printf 'STATUS: BLOCKED\nreason: HOST_PROFILE_UNKNOWN:%s\n' "$HOST"; exit 2; }

# Auto-selection stays inside this host profile, so status never describes
# another profile's run under this profile's rules.
if [ -z "$RUN_ID" ]; then
  for d in $(ls -1t "$FG_RF_RUN_ROOT" 2>/dev/null); do
    M="${FG_RF_RUN_ROOT}/${d}/control/RUN_MANIFEST.json"
    [ -f "$M" ] || continue
    [ "$(fg_json_get "$M" '.host_profile')" = "$FG_RF_HOST" ] || continue
    RUN_ID="$d"; break
  done
fi
[ -n "$RUN_ID" ] && fg_run_exists "$RUN_ID" || { printf 'STATUS: NO_RUN_FOUND\nrun_root: %s\n' "$FG_RF_RUN_ROOT"; exit 0; }

RUN_STATE="$(fg_run_state_file "$RUN_ID")"
CHAIN="$(fg_events_verify "$RUN_ID")"
SUMS="$(fg_verify_checksums "$RUN_ID" 2>/dev/null || true)"
HEAVY="$(fg_json_get "$RUN_STATE" '.heavy_test_lock')"; [ -z "$HEAVY" ] && HEAVY="free"
STOPREQ="$(fg_json_get "$RUN_STATE" '.stop_requested')"
SESSION_LIVE="no"
command -v "$FG_RF_TMUX_BIN" >/dev/null 2>&1 && \
  "$FG_RF_TMUX_BIN" has-session -t "$FG_RF_SESSION" 2>/dev/null && SESSION_LIVE="yes"

FOUNDER_REQ=0; M4_REQ=0; BLOCKERS=0

fg_elapsed() {
  local started now s
  started="$1"
  s="$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$started" '+%s' 2>/dev/null || echo "")"
  [ -n "$s" ] || { echo "-"; return 0; }
  now="$(fg_epoch)"
  printf '%dm\n' $(( (now - s) / 60 ))
}

TASK_JSON="[]"
for T in $(fg_task_list "$RUN_ID"); do
  ST="$(fg_task_get "$RUN_ID" "$T" status)"
  case "$ST" in
    HUMAN_ACTION_REQUIRED|READY_FOR_FOUNDER_GATE) FOUNDER_REQ=$(( FOUNDER_REQ + 1 )) ;;
    M4_HANDOFF_REQUIRED) M4_REQ=$(( M4_REQ + 1 )) ;;
    BLOCKED|ESCALATED|DRIFT|STALE) BLOCKERS=$(( BLOCKERS + 1 )) ;;
  esac
  TASK_JSON="$(printf '%s' "$TASK_JSON" | jq \
    --arg t "$T" \
    --arg lane "$(fg_task_get "$RUN_ID" "$T" lane)" \
    --arg role "$(fg_task_get "$RUN_ID" "$T" role)" \
    --arg st "$ST" \
    --arg cand "$(fg_task_get "$RUN_ID" "$T" candidate_sha)" \
    --arg el "$(fg_elapsed "$(fg_task_get "$RUN_ID" "$T" started_at)")" \
    --arg corr "$(fg_retry_get "$RUN_ID" "$T" correction_attempts)" \
    --arg climit "$(fg_retry_get "$RUN_ID" "$T" correction_limit)" \
    --arg ctx "$(fg_retry_get "$RUN_ID" "$T" context_restarts)" \
    --arg lease "$(fg_lease_verify "$RUN_ID" "$T" 2>/dev/null || true)" \
    --arg next "$(fg_continuation_decision "$RUN_ID" "$T" "$REPO")" \
    '. + [{task:$t, lane:$lane, role:$role, status:$st,
           candidate_sha:(if $cand=="" then "not-frozen" else $cand end),
           elapsed:$el, corrections:($corr + "/" + $climit), context_restarts:$ctx,
           lease:$lease, next_automatic_action:$next}]')"
done

if [ "$AS_JSON" = "yes" ]; then
  jq -n --arg run "$RUN_ID" --arg chain "$CHAIN" --arg sums "$SUMS" --arg heavy "$HEAVY" \
        --arg stop "$STOPREQ" --arg live "$SESSION_LIVE" --argjson tasks "$TASK_JSON" \
        --argjson founder "$FOUNDER_REQ" --argjson m4 "$M4_REQ" --argjson blockers "$BLOCKERS" \
        --arg host "$FG_RF_HOST" --arg windows "$FG_RF_WINDOWS" \
        --argjson mergeauth "$(fg_host_authority merge_sheriff && echo true || echo false)" \
    '{run_id:$run, host_profile:$host, role_windows:($windows|split(" ")),
      event_chain:$chain, checksums:$sums, heavy_test_lock:$heavy,
      stop_requested:$stop, tmux_session_live:$live, tasks:$tasks,
      founder_action_required:$founder, m4_handoff_required:$m4, blocker_count:$blockers,
      merge_sealed:($mergeauth|not), signature_sealed:true, activation_sealed:true,
      merge_requires_founder_receipt:true}'
  exit 0
fi

printf 'FOUNDERGATE ROLE FLOOR - STATUS\n'
printf '  host profile        : %s (%s)\n' "$FG_RF_HOST" "$(printf '%s' "$FG_RF_WINDOWS" | wc -w | tr -d ' ') role windows"
printf '  run                 : %s\n' "$RUN_ID"
printf '  tmux session live   : %s (%s)\n' "$SESSION_LIVE" "$FG_RF_SESSION"
printf '  stop requested      : %s\n' "${STOPREQ:-false}"
printf '  event chain         : %s\n' "$CHAIN"
printf '  checksums           : %s\n' "${SUMS:-not-sealed}"
printf '  heavy test lock     : %s\n' "$HEAVY"
printf '  authorized gate     : %s\n' "$( [ "$FOUNDER_REQ" -gt 0 ] && echo "FOUNDER DECISION" || echo "builder -> freeze -> checker -> advisor -> founder packet -> STOP" )"
printf '\n  %-14s %-10s %-22s %-12s %-7s %-6s %-5s %s\n' LANE ROLE STATE CANDIDATE ELAPSED CORR CTX "NEXT AUTOMATIC ACTION"
printf '%s' "$TASK_JSON" | jq -r \
  '.[] | "  " + (.lane[0:13]|.+" "*(14-length)) + " " +
         (.role[0:9]|.+" "*(10-length)) + " " +
         (.status[0:21]|.+" "*(22-length)) + " " +
         (.candidate_sha[0:11]|.+" "*(12-length)) + " " +
         (.elapsed[0:6]|.+" "*(7-length)) + " " +
         (.corrections[0:5]|.+" "*(6-length)) + " " +
         ((.context_restarts|tostring)[0:4]|.+" "*(5-length)) + " " + .next_automatic_action'
printf '\n  blockers open       : %s\n' "$BLOCKERS"
printf '  founder action req. : %s\n' "$FOUNDER_REQ"
printf '  M4 handoff required : %s\n' "$M4_REQ"
if fg_host_authority merge_sheriff; then
  printf '  merge                : governed by merge-sheriff, requires an exact final-verifier PASS\n'
  printf '                         and a mechanically valid founder decision receipt\n'
else
  printf '  merge                : SEALED on this host (M4_HANDOFF_REQUIRED)\n'
fi
printf '  signature / activation / deployment : SEALED on every host (founder authority)\n'
printf '\n  next safe action    : %s\n' "$(fg_control_dir "$RUN_ID")/NEXT_SAFE_ACTION.md"
exit 0
