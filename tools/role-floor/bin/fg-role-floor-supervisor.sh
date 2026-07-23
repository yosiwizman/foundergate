#!/usr/bin/env bash
# FounderGate role floor - bounded continuation supervisor.
#
#   bash fg-role-floor-supervisor.sh <run-id> <repo> [--once]
#
# The supervisor advances a lane only when the next action is already
# authorized. It never merges, never signs, never activates, never writes to a
# protected branch, and never converts findings into CLEAN. Every refusal is
# recorded as a durable event and surfaced as the next safe action.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

fg_host_load "${FG_RF_HOST:-m1}" >/dev/null || { printf 'BLOCKED: HOST_PROFILE_UNKNOWN:%s\n' "${FG_RF_HOST:-m1}"; exit 2; }

RUN="${1:-}"; REPO="${2:-}"
ONCE="no"; [ "${3:-}" = "--once" ] && ONCE="yes"
[ -n "$RUN" ] || { fg_err "usage: fg-role-floor-supervisor.sh <run-id> <repo> [--once]"; exit 2; }
INTERVAL="${FG_RF_SUPERVISOR_INTERVAL:-10}"
DISPATCH="${FG_RF_BIN_DIR}/fg-role-floor-dispatch.sh"

# The heavy-test lock lives in lib/state.sh so status, dispatch and the
# selftest share one implementation with the supervisor.

# ---------------------------------------------------------------------------
# Session exit reconciliation
# ---------------------------------------------------------------------------

fg_reconcile_exit() {
  local run="$1" task="$2" repo="$3" role exitf code log class
  role="$(fg_task_get "$run" "$task" role)"
  [ -n "$role" ] || return 0
  exitf="$(fg_roles_dir "$run")/${task}/${role}.exit"
  [ -f "$exitf" ] || return 0

  code="$(cat "$exitf" 2>/dev/null | tr -d '[:space:]')"
  log="$(fg_logs_dir "$run")/${task}.${role}.log"
  class="$(fg_classify_exit "$run" "$task" "$role" "${code:-1}" "$log")"

  fg_event_append "$run" "session_exit" "$role" "$task" \
    "$(jq -n --arg c "${code:-unknown}" --arg k "$class" '{exit_code:$c, classification:$k}')" >/dev/null
  rm -f "$exitf"

  case "$class" in
    CONTEXT_EXHAUSTED)
      fg_task_set_status "$run" "$task" "CONTEXT_EXHAUSTED" "${role} context exhausted" >/dev/null ;;
    SESSION_FAILED)
      fg_task_set_status "$run" "$task" "BLOCKED" "${role} session failed with exit ${code}" >/dev/null ;;
    SESSION_INCOMPLETE)
      fg_task_set_status "$run" "$task" "ESCALATED" "${role} exited without a result and without a context signature" >/dev/null ;;
    SESSION_COMPLETED)
      : ;;  # the role's own artifact drives the next status transition
  esac
}

# ---------------------------------------------------------------------------
# One supervision sweep
# ---------------------------------------------------------------------------

fg_sweep() {
  local run="$1" repo="$2" task decision action out stopped=0 acted=0

  if fg_run_stop_requested "$run"; then
    fg_next_safe_action_write "$run" \
      "STOP_REQUESTED is set. Dispatch is disabled and all state is preserved." \
      "Re-run fg-role-floor-start.sh to resume, or inspect the sealed evidence under the run root."
    echo "SWEEP:STOP_REQUESTED"
    return 0
  fi

  for task in $(fg_task_list "$run"); do
    fg_reconcile_exit "$run" "$task" "$repo"
    decision="$(fg_continuation_decision "$run" "$task" "$repo")"

    case "$decision" in
      AUTO:*)
        action="${decision#AUTO:}"
        case "$action" in
          wait) ;;
          launch_checker)
            out="$(bash "$DISPATCH" launch "$run" "$task" checker "$repo" 2>&1 || true)"
            acted=$(( acted + 1 )) ;;
          launch_advisor)
            out="$(bash "$DISPATCH" launch "$run" "$task" advisor "$repo" 2>&1 || true)"
            acted=$(( acted + 1 )) ;;
          launch_correction_cycle)
            out="$(fg_correction_open "$run" "$task" 2>&1 || true)"
            acted=$(( acted + 1 )) ;;
          restart_role_from_handoff)
            out="$(bash "$DISPATCH" restart "$run" "$task" "$(fg_task_get "$run" "$task" role)" "$repo" 2>&1 || true)"
            acted=$(( acted + 1 )) ;;
          launch_builder)
            out="$(bash "$DISPATCH" launch "$run" "$task" builder "$repo" 2>&1 || true)"
            acted=$(( acted + 1 )) ;;
        esac
        [ "$action" = "wait" ] || fg_event_append "$run" "auto_continuation" "orchestrator" "$task" \
          "$(jq -n --arg a "$action" --arg o "${out:-}" '{action:$a, outcome:$o}')" >/dev/null ;;
      STOP:*)
        stopped=$(( stopped + 1 ))
        fg_event_append "$run" "continuation_stopped" "orchestrator" "$task" \
          "$(jq -n --arg r "${decision#STOP:}" '{reason:$r}')" >/dev/null
        fg_next_safe_action_write "$run" \
          "Lane ${task} stopped automatic continuation: ${decision#STOP:}." \
          "$(case "${decision#STOP:}" in
               FOUNDER_GATE) echo "Read the founder gate packet under founder-gates/ and decide. The floor will not act." ;;
               M4_HANDOFF_REQUIRED) echo "Hand this candidate to the M4 serial integration path. Nothing merges here." ;;
               HUMAN_ACTION_REQUIRED) echo "A human authority is required. The floor performed no part of it." ;;
               RETRY_BUDGET_EXHAUSTED) echo "Correction budget is spent. Re-scope the lane or raise the budget deliberately." ;;
               CANDIDATE_DRIFT) echo "The candidate identity moved. Re-freeze from the builder before any checking." ;;
               *) echo "Inspect the lane state, then dispatch deliberately." ;;
             esac)" ;;
    esac
  done

  fg_seal_checksums "$run"
  echo "SWEEP:acted=${acted}:stopped=${stopped}"
  return 0
}

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

fg_run_exists "$RUN" || { fg_err "no such run: $RUN"; exit 2; }

if [ "$ONCE" = "yes" ]; then
  fg_sweep "$RUN" "$REPO"
  exit 0
fi

trap 'fg_event_append "$RUN" "supervisor_exit" "orchestrator" "" "{}" >/dev/null 2>&1; exit 0' TERM INT

fg_event_append "$RUN" "supervisor_start" "orchestrator" "" \
  "$(jq -n --argjson i "$INTERVAL" '{interval_seconds:$i}')" >/dev/null

while :; do
  fg_sweep "$RUN" "$REPO" >/dev/null 2>&1 || true
  if fg_run_stop_requested "$RUN"; then
    fg_event_append "$RUN" "supervisor_stopped" "orchestrator" "" '{"reason":"STOP_REQUESTED"}' >/dev/null
    exit 0
  fi
  sleep "$INTERVAL"
done
