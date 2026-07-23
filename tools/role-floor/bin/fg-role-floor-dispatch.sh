#!/usr/bin/env bash
# FounderGate role floor - task dispatch and role window control.
#
# Subcommands:
#   park     <run> <role> <repo>              hold a role window until dispatched
#   banner   <run> <role> [task]              render the role window header
#   lease    <run> <task> <role> <mode> <repo> <branch> <allowed> <forbidden>
#   launch   <run> <task> <role> <repo>       launch a FRESH role context
#   freeze   <run> <task> <repo>              builder candidate freeze
#   restart  <run> <task> <role> <repo>       context-exhaustion restart
#   verdict  <run> <task> <verdict> <summary> record a checker verdict (checker role)
#
# Each launch creates a new Claude process with its own transcript. No role
# ever inherits another role's context.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

fg_host_load "${FG_RF_HOST:-m1}" >/dev/null || { printf 'BLOCKED: HOST_PROFILE_UNKNOWN:%s\n' "${FG_RF_HOST:-m1}"; exit 2; }

CMD="${1:-}"; shift 2>/dev/null || true

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

fg_banner() {
  local run="$1" role="$2" task="${3:-}" status lane attempt lease cand auth last founder
  status="-"; lane="-"; attempt="-"; lease="-"; cand="-"; auth="-"; founder="no"

  if [ -n "$task" ] && fg_task_exists "$run" "$task"; then
    status="$(fg_task_get "$run" "$task" status)"
    lane="$(fg_task_get "$run" "$task" lane)"
    attempt="$(fg_task_get "$run" "$task" attempt)"
    lease="$(fg_task_get "$run" "$task" lease_digest)"
    cand="$(fg_task_get "$run" "$task" candidate_sha)"
    [ -z "$lease" ] && lease="none"
    [ -z "$cand" ] && cand="not-frozen"
    case "$status" in
      HUMAN_ACTION_REQUIRED|READY_FOR_FOUNDER_GATE|M4_HANDOFF_REQUIRED|ESCALATED) founder="YES" ;;
    esac
  fi

  case "$role" in
    orchestrator)       auth="dispatch, lease, handoff, status (no source writes, no verdicts)" ;;
    builder)            auth="write inside lease only (no self-check, no CLEAN, no merge)" ;;
    checker)            auth="read-only on frozen SHA (no repair, no push, no advisor role)" ;;
    advisor)            auth="read-only after CLEAN (no code, no rerun, no decision execution)" ;;
    serial-integration) auth="single shared-surface writer from exact accepted SHAs (no verdicts, no merge)" ;;
    final-verifier)     auth="read-only on the exact final SHA and tree (no repair, no merge)" ;;
    merge-sheriff)      auth="merge receipt only, behind an exact final PASS and a valid founder receipt" ;;
  esac

  last="$(tail -n 1 "$(fg_events_file "$run")" 2>/dev/null | jq -r '"\(.seq) \(.type)"' 2>/dev/null || echo "none")"

  printf '============== FOUNDERGATE ROLE FLOOR (%s) ==============\n' "$FG_RF_HOST"
  printf ' role                : %s\n' "$role"
  printf ' run                 : %s\n' "$run"
  printf ' lane                : %s\n' "$lane"
  printf ' task                : %s\n' "${task:--}"
  printf ' authorization       : %s\n' "$auth"
  printf ' candidate sha       : %s\n' "$cand"
  printf ' lease               : %s\n' "$lease"
  printf ' attempt             : %s\n' "$attempt"
  printf ' status              : %s\n' "$status"
  printf ' last durable event  : %s\n' "$last"
  printf ' founder action req. : %s\n' "$founder"
  if fg_host_authority merge_sheriff; then
    printf ' sealed on this host : founder signature, activation, deployment\n'
    printf ' governed on this host: serial integration, final verification, merge receipt\n'
  else
    printf ' sealed on this host : merge, signature, activation, protected-main\n'
  fi
  printf '===========================================================\n'
}

# ---------------------------------------------------------------------------
# Park
# ---------------------------------------------------------------------------

fg_park() {
  local run="$1" role="$2" repo="${3:-}" marker
  marker="$(fg_roles_dir "$run")/${role}.current_task"
  mkdir -p "$(dirname "$marker")"
  while :; do
    clear 2>/dev/null || true
    fg_banner "$run" "$role" "$(cat "$marker" 2>/dev/null || echo "")"
    if fg_run_stop_requested "$run"; then
      printf '\nSTOP_REQUESTED: this window is idle and safe to close.\n'
      break
    fi
    printf '\nparked - waiting for orchestrator dispatch (refresh 5s)\n'
    sleep 5
  done
}

# ---------------------------------------------------------------------------
# Launch a fresh role context
# ---------------------------------------------------------------------------

fg_role_prompt_template() {
  case "$1" in
    orchestrator) echo "orchestrator" ;;
    builder)      echo "builder" ;;
    checker)      echo "checker" ;;
    advisor)      echo "advisor" ;;
    # The three M4 governance roles share one protected template; each launch
    # binds its own role, gate and report path.
    serial-integration|final-verifier|merge-sheriff) echo "m4-roles" ;;
    *)            echo "" ;;
  esac
}

fg_launch() {
  local run="$1" task="$2" role="$3" repo="$4" recovery="${5:-no}"
  local tpl prompt digest token session_id cmd log exitf gate lease_state secret bindings report_path

  fg_run_stop_requested "$run" && { echo "STOP_REQUESTED"; return 1; }
  fg_run_dispatch_enabled "$run" || { echo "DISPATCH_DISABLED"; return 1; }
  fg_task_exists "$run" "$task" || { echo "NO_SUCH_TASK"; return 1; }

  # A role that the host profile does not define cannot be launched on it.
  fg_host_has_role "$role" || { echo "ROLE_NOT_ON_HOST:${FG_RF_HOST}:${role}"; return 1; }

  # Sequencing and lease gates, enforced before any process is created.
  case "$role" in
    builder)
      lease_state="$(fg_lease_verify "$run" "$task" "" "builder")"
      [ "$lease_state" = "LEASE_OK" ] || { echo "BUILDER_BLOCKED:${lease_state}"; return 1; }
      [ "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.mode')" = "writable" ] || {
        echo "BUILDER_BLOCKED:LEASE_NOT_WRITABLE"; return 1; } ;;
    checker)
      gate="$(fg_gate_checker_start "$run" "$task" "$repo")"
      [ "$gate" = "CHECKER_START_ALLOWED" ] || { echo "$gate"; return 1; } ;;
    advisor)
      gate="$(fg_gate_advisor_start "$run" "$task")"
      [ "$gate" = "ADVISOR_START_ALLOWED" ] || { echo "$gate"; return 1; } ;;
    serial-integration)
      lease_state="$(fg_lease_verify "$run" "$task" "" "serial-integration")"
      [ "$lease_state" = "LEASE_OK" ] || { echo "SERIAL_INTEGRATION_BLOCKED:${lease_state}"; return 1; }
      gate="$(fg_serial_integration_gate "$run" "$task" \
              "$(fg_task_get "$run" "$task" candidate_sha)" "$(fg_task_get "$run" "$task" candidate_tree)")"
      [ "$gate" = "SERIAL_INTEGRATION_ALLOWED" ] || { echo "$gate"; return 1; } ;;
    final-verifier)
      gate="$(fg_final_verifier_gate "$run" "$task" "$repo" \
              "$(fg_task_get "$run" "$task" candidate_sha)" "$(fg_task_get "$run" "$task" candidate_tree)")"
      [ "$gate" = "FINAL_VERIFICATION_ALLOWED" ] || { echo "$gate"; return 1; } ;;
    merge-sheriff)
      gate="$(fg_merge_sheriff_gate "$run" "$task")"
      [ "$gate" = "MERGE_GATE_OPEN" ] || { echo "$gate"; return 1; } ;;
  esac

  tpl="$(fg_role_prompt_template "$role")"
  [ -n "$tpl" ] || { echo "UNKNOWN_ROLE"; return 1; }
  [ "$recovery" = "recovery" ] && tpl="context-recovery"

  session_id="${run}:${task}:${role}:$(fg_task_get "$run" "$task" attempt):$(fg_epoch)"
  prompt="$(fg_run_dir "$run")/tmp/${task}.${role}.$(fg_epoch).prompt.md"
  report_path="$(fg_role_artifact_path "$run" "$task" \
    "$(case "$role" in
         builder) echo builder_report ;;
         checker) echo checker_verdict ;;
         advisor) echo advisor_packet ;;
         serial-integration) echo integration_report ;;
         final-verifier) echo final_verification_report ;;
         merge-sheriff) echo merge_receipt ;;
         *) echo status ;;
       esac)")"

  bindings="$(jq -n \
    --arg pv "$FG_RF_VERSION" --arg run "$run" --arg task "$task" --arg role "$role" \
    --arg lane "$(fg_task_get "$run" "$task" lane)" --arg repo "$repo" \
    --arg branch "$(fg_git_branch "$repo")" \
    --arg bs "$(fg_task_get "$run" "$task" base_sha)" \
    --arg bt "$(fg_task_get "$run" "$task" base_tree)" \
    --arg cs "$(fg_task_get "$run" "$task" candidate_sha)" \
    --arg ct "$(fg_task_get "$run" "$task" candidate_tree)" \
    --arg allowed "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.allowed_globs | join(", ")' 2>/dev/null)" \
    --arg forbidden "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.forbidden_paths | join(", ")' 2>/dev/null)" \
    --arg lease "$(fg_task_get "$run" "$task" lease_digest)" \
    --arg sid "$session_id" \
    --arg runroot "$(fg_run_dir "$run")" \
    --arg report "$report_path" \
    --arg tokenfile "$(fg_roles_dir "$run")/${task}/${role}.token.secret" \
    --arg retry "$(fg_retry_get "$run" "$task" correction_limit)" \
    --arg handoff "$(ls -1t "$(fg_handoffs_dir "$run")"/${task}.${role}.*.json 2>/dev/null | head -1)" \
    --arg host "$FG_RF_HOST" \
    --arg sealed "$FG_RF_UNIVERSAL_SEALED_AUTHORITIES" \
    '{HOST_PROFILE:$host, SEALED_AUTHORITIES:$sealed,
      PACKAGE_VERSION:$pv, RUN_ID:$run, TASK_ID:$task, ROLE:$role, LANE:$lane,
      REPO_PATH:$repo, BRANCH:$branch, BASE_SHA:$bs, BASE_TREE:$bt,
      CANDIDATE_SHA:(if $cs=="" then "not-frozen" else $cs end),
      CANDIDATE_TREE:(if $ct=="" then "not-frozen" else $ct end),
      ALLOWED_PATHS:(if $allowed=="" then "none" else $allowed end),
      FORBIDDEN_PATHS:(if $forbidden=="" then "everything outside the lease" else $forbidden end),
      LEASE_DIGEST:(if $lease=="" then "none" else $lease end),
      SESSION_ID:$sid, RUN_ROOT:$runroot, REPORT_PATH:$report,
      ROLE_TOKEN_FILE:$tokenfile,
      RETRY_LIMIT:(if $retry=="" then "2" else $retry end),
      HANDOFF_PATH:(if $handoff=="" then "none" else $handoff end),
      TEST_CONTRACT:"only the tests named in the lane contract; no provider calls",
      STOP_CONDITIONS:"merge, signature, activation, protected-main write, deployment, credential change, lease collision, candidate drift, retry exhaustion, next unauthorized gate"}')"

  digest="$(fg_prompt_render "$tpl" "$prompt" "$bindings")" || { echo "$digest"; return 1; }

  token="$(fg_role_token_mint "$run" "$task" "$role" "$digest" "$session_id")"
  secret="$(fg_roles_dir "$run")/${task}/${role}.token.secret"
  ( umask 077; printf '%s\n' "$token" > "$secret" )

  log="$(fg_logs_dir "$run")/${task}.${role}.log"
  exitf="$(fg_roles_dir "$run")/${task}/${role}.exit"
  mkdir -p "$(dirname "$log")" "$(dirname "$exitf")"
  rm -f "$exitf"

  cmd="$(fg_claude_launch_command "$prompt" "$log" "$exitf")" || { echo "FORBIDDEN_CLAUDE_FLAG"; return 1; }

  printf '%s\n' "$task" > "$(fg_roles_dir "$run")/${role}.current_task"

  # respawn-window -k guarantees a fresh process in the role's own window.
  "$FG_RF_TMUX_BIN" respawn-window -k -t "${FG_RF_SESSION}:${role}" "$cmd" 2>/dev/null || \
    "$FG_RF_TMUX_BIN" new-window -t "${FG_RF_SESSION}" -n "$role" "$cmd" 2>/dev/null || {
      echo "TMUX_LAUNCH_FAILED"; return 1; }

  fg_task_update "$run" "$task" \
    ".role=\"${role}\" | .session_id=\"${session_id}\" | .prompt_digest=\"${digest}\" | .tmux_target=\"${FG_RF_SESSION}:${role}\"" >/dev/null
  case "$role" in
    checker) fg_task_set_status "$run" "$task" "CHECKING" "checker launched on frozen candidate" >/dev/null ;;
    advisor) fg_task_set_status "$run" "$task" "ADVISING" "advisor launched after CLEAN" >/dev/null ;;
    serial-integration|final-verifier|merge-sheriff)
             fg_task_set_status "$run" "$task" "RUNNING" "${role} launched behind its gate" >/dev/null ;;
    *)       fg_task_set_status "$run" "$task" "RUNNING" "${role} context launched" >/dev/null ;;
  esac
  fg_event_append "$run" "role_launched" "$role" "$task" \
    "$(jq -n --arg d "$digest" --arg s "$session_id" --arg t "$tpl" \
       '{prompt_digest:$d, session_id:$s, template:$t, fresh_context:true}')" >/dev/null

  echo "LAUNCHED:${role}:${digest}"
  return 0
}

# ---------------------------------------------------------------------------
# Context-exhaustion restart
# ---------------------------------------------------------------------------

fg_restart() {
  local run="$1" task="$2" role="$3" repo="$4" handoff prev_role
  prev_role="$(fg_task_get "$run" "$task" role)"
  if [ -n "$prev_role" ] && [ "$prev_role" != "$role" ]; then
    echo "ROLE_SWITCH_REFUSED:${prev_role}->${role}"; return 1
  fi
  fg_retry_context_available "$run" "$task" || { echo "CONTEXT_RESTART_BUDGET_EXHAUSTED"; return 1; }
  [ "$(fg_lease_verify "$run" "$task")" = "LEASE_OK" ] || \
    [ ! -f "$(fg_lease_file "$run" "$task")" ] || { echo "LEASE_INVALID_ON_RESTART"; return 1; }

  handoff="$(fg_handoff_build "$run" "$task" "$role" "$repo")" || { echo "HANDOFF_FAILED"; return 1; }
  fg_retry_bump_context_restart "$run" "$task" >/dev/null
  fg_launch "$run" "$task" "$role" "$repo" "recovery"
}

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

case "$CMD" in
  park)    fg_park "$1" "$2" "${3:-}" ;;
  banner)  fg_banner "$1" "$2" "${3:-}" ;;
  lease)   fg_lease_request "$1" "$2" "$3" "$4" "$5" "$6" "$7" "${8:-}" \
             "$(fg_git_head_sha "$5")" "$(fg_git_head_tree "$5")" ;;
  launch)  fg_launch "$1" "$2" "$3" "$4" "${5:-no}" ;;
  restart) fg_restart "$1" "$2" "$3" "$4" ;;
  freeze)  fg_candidate_freeze "$1" "$2" "$3" "$(cat "$(fg_roles_dir "$1")/$2/builder.token.secret" 2>/dev/null || echo none)" ;;
  banner-only) fg_banner "$1" "$2" "${3:-}" ;;
  *) fg_err "usage: fg-role-floor-dispatch.sh {park|banner|lease|launch|restart|freeze} ..."; exit 2 ;;
esac
