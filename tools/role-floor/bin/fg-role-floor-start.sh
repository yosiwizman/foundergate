#!/usr/bin/env bash
# FounderGate role floor - start or safely resume a governed role floor.
#
#   bash tools/role-floor/bin/fg-role-floor-start.sh --host m1
#   bash tools/role-floor/bin/fg-role-floor-start.sh --host m4
#
# One implementation, two host profiles:
#   m1 - orchestrator, builder, checker, advisor (4 windows)
#   m4 - the same four plus serial-integration, final-verifier, merge-sheriff
#        (7 windows)
#
# Options:
#   --host <m1|m4>    host profile to load (default: m1)
#   --plan            print the deterministic tmux window plan and exit
#                     (creates no session, no run root, no process)
#   --run-id <id>     start or resume a specific run
#   --repo <path>     source repository under supervision (default: cwd repo)
#   --resume-check    verify an existing run and print the resume verdict only
#
# This script installs nothing. If a prerequisite is missing it returns
# BLOCKED with the exact missing prerequisite and changes no state.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

MODE="start"
RUN_ID=""
REPO=""
HOST="${FG_RF_HOST:-m1}"

while [ $# -gt 0 ]; do
  case "$1" in
    --host) shift; HOST="${1:-}" ;;
    --plan) MODE="plan" ;;
    --resume-check) MODE="resume-check" ;;
    --run-id) shift; RUN_ID="${1:-}" ;;
    --repo) shift; REPO="${1:-}" ;;
    -h|--help) sed -n '2,21p' "$0"; exit 0 ;;
    *) fg_err "unknown argument: $1"; echo "BLOCKED"; exit 2 ;;
  esac
  shift
done

# Loaded in THIS shell, not a subshell: a host profile that only exists in a
# command substitution configures nothing.
fg_host_load "$HOST" >/dev/null || {
  printf 'STATUS: BLOCKED\nreason: HOST_PROFILE_UNKNOWN:%s\nknown_hosts: %s\n' "$HOST" "$(fg_host_list | tr '\n' ' ')"
  exit 2
}

# ---------------------------------------------------------------------------
# Deterministic window plan
# ---------------------------------------------------------------------------

fg_window_plan() {
  local i=0 w
  for w in $FG_RF_WINDOWS; do
    printf '%d\t%s\t%s\n' "$i" "$w" \
      "$( [ "$w" = "$FG_RF_FOUNDER_WINDOW" ] && echo founder-facing || echo parked-until-dispatched )"
    i=$(( i + 1 ))
  done
}

if [ "$MODE" = "plan" ]; then
  printf 'host\t%s\n' "$FG_RF_HOST"
  printf 'session\t%s\n' "$FG_RF_SESSION"
  printf 'window_count\t%d\n' "$(fg_window_plan | wc -l | tr -d ' ')"
  fg_window_plan
  exit 0
fi

# ---------------------------------------------------------------------------
# Prerequisites - verified, never installed
# ---------------------------------------------------------------------------

fg_blocked() {
  printf 'STATUS: BLOCKED\n'
  printf 'missing_prerequisite: %s\n' "$1"
  printf 'remediation: %s\n' "${2:-install it yourself; this package never installs software}"
  exit 3
}

command -v "$FG_RF_TMUX_BIN" >/dev/null 2>&1 || \
  fg_blocked "tmux (binary '${FG_RF_TMUX_BIN}' not found on PATH)" \
             "install tmux manually, then re-run; the floor requires four tmux windows"
command -v jq >/dev/null 2>&1 || fg_blocked "jq"
command -v git >/dev/null 2>&1 || fg_blocked "git"

CLAUDE_DETECT="$(fg_claude_detect "" 2>/dev/null || echo CLAUDE_MISSING)"
case "$CLAUDE_DETECT" in
  CLAUDE_MISSING) fg_blocked "claude CLI (binary '${FG_RF_CLAUDE_BIN}' not found on PATH)" ;;
esac

# Repository contract.
if [ -z "$REPO" ]; then REPO="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"; fi
[ -n "$REPO" ] && [ -d "${REPO}/.git" ] || fg_blocked "a git repository (--repo <path>)"
REPO_BRANCH="$(fg_git_branch "$REPO")"
REPO_SHA="$(fg_git_head_sha "$REPO")"
REPO_TREE="$(fg_git_head_tree "$REPO")"
if fg_branch_is_protected "$REPO_BRANCH"; then
  printf 'STATUS: BLOCKED\n'
  printf 'reason: repository is on protected branch %s; the M1 floor never operates a writable lane on protected main\n' "$REPO_BRANCH"
  exit 3
fi

# Protected prompt templates.
PROMPT_CHECK="$(fg_prompt_templates_verify)"
[ "$PROMPT_CHECK" = "PROMPT_DIGESTS_OK" ] || {
  printf 'STATUS: BLOCKED\n'
  printf 'reason: %s\n' "$PROMPT_CHECK"
  exit 3
}

# ---------------------------------------------------------------------------
# Run selection and resume verification
# ---------------------------------------------------------------------------

# Only ever auto-select a run that was created under THIS host profile. Run
# roots are per-host by default, but an operator may pin one shared root, and a
# floor must never adopt another profile's run by accident.
fg_latest_run() {
  local d m
  [ -d "$FG_RF_RUN_ROOT" ] || return 1
  for d in $(ls -1t "$FG_RF_RUN_ROOT" 2>/dev/null); do
    m="${FG_RF_RUN_ROOT}/${d}/control/RUN_MANIFEST.json"
    [ -f "$m" ] || continue
    [ "$(fg_json_get "$m" '.host_profile')" = "$FG_RF_HOST" ] || continue
    printf '%s\n' "$d"; return 0
  done
  return 1
}

# fg_resume_verify <run> - RESUME_OK | RESUME_REFUSED_<reason>
fg_resume_verify() {
  local run="$1" chain sums task status recorded_host
  fg_run_exists "$run" || { echo "RESUME_REFUSED_NO_RUN"; return 1; }

  # A run carries the authority table it was created under. Resuming it from a
  # different host profile would run one profile's role windows against the
  # other profile's recorded rules, so the two must match exactly.
  recorded_host="$(fg_json_get "$(fg_control_dir "$run")/RUN_MANIFEST.json" '.host_profile')"
  if [ -n "$recorded_host" ] && [ "$recorded_host" != "$FG_RF_HOST" ]; then
    echo "RESUME_REFUSED_HOST_PROFILE_MISMATCH:recorded=${recorded_host}:requested=${FG_RF_HOST}"
    return 1
  fi

  chain="$(fg_events_verify "$run")"
  case "$chain" in EVENT_CHAIN_OK*) : ;; *) echo "RESUME_REFUSED_EVENT_CHAIN:${chain}"; return 1 ;; esac

  if [ -f "$(fg_control_dir "$run")/SHA256SUMS.txt" ]; then
    sums="$(fg_verify_checksums "$run")"
    case "$sums" in CHECKSUMS_OK) : ;; *) echo "RESUME_REFUSED_CORRUPTED_STATE:${sums}"; return 1 ;; esac
  fi

  for task in $(fg_task_list "$run"); do
    status="$(fg_task_get "$run" "$task" status)"
    fg_status_valid "$status" || { echo "RESUME_REFUSED_AMBIGUOUS_STATE:${task}:${status}"; return 1; }
    # A completed verdict is never re-run and never re-graded.
    if [ -f "$(fg_role_artifact_path "$run" "$task" checker_verdict)" ]; then
      [ "$(fg_role_result_verify "$run" "$task" checker_verdict)" = "RESULT_BINDING_OK" ] || {
        echo "RESUME_REFUSED_INVALID_VERDICT_BINDING:${task}"; return 1; }
    fi
  done
  echo "RESUME_OK"
  return 0
}

# fg_resume_plan <run> - what resume would relaunch, honouring completed verdicts.
fg_resume_plan() {
  local run="$1" task decision
  for task in $(fg_task_list "$run"); do
    decision="$(fg_continuation_decision "$run" "$task" "$REPO")"
    if [ "$decision" = "AUTO:launch_checker" ] && \
       [ -f "$(fg_role_artifact_path "$run" "$task" checker_verdict)" ]; then
      decision="SKIP:VERDICT_ALREADY_COMPLETE"
    fi
    if [ "$decision" = "AUTO:launch_advisor" ] && \
       [ -f "$(fg_role_artifact_path "$run" "$task" advisor_packet)" ]; then
      decision="SKIP:ADVISOR_ALREADY_COMPLETE"
    fi
    printf '%s\t%s\n' "$task" "$decision"
  done
}

if [ -z "$RUN_ID" ]; then RUN_ID="$(fg_latest_run || echo "")"; fi

if [ "$MODE" = "resume-check" ]; then
  [ -n "$RUN_ID" ] || { echo "RESUME_REFUSED_NO_RUN"; exit 4; }
  V="$(fg_resume_verify "$RUN_ID")"
  printf '%s\n' "$V"
  case "$V" in RESUME_OK) fg_resume_plan "$RUN_ID"; exit 0 ;; *) exit 4 ;; esac
fi

RESUMING=false
if [ -n "$RUN_ID" ] && fg_run_exists "$RUN_ID"; then
  V="$(fg_resume_verify "$RUN_ID")"
  case "$V" in
    RESUME_OK) RESUMING=true ;;
    *)
      printf 'STATUS: BLOCKED\n'
      printf 'reason: %s\n' "$V"
      printf 'the existing run state is ambiguous or corrupted; it will not be resumed and was not modified\n'
      exit 4 ;;
  esac
else
  RUN_ID="m1-$(date -u +%Y%m%dT%H%M%SZ)-$(head -c 8 /dev/urandom | shasum -a 256 | cut -c1-8)"
fi

# ---------------------------------------------------------------------------
# tmux session
# ---------------------------------------------------------------------------

if "$FG_RF_TMUX_BIN" has-session -t "$FG_RF_SESSION" 2>/dev/null; then
  if [ "$RESUMING" = "true" ]; then
    printf 'STATUS: ALREADY_RUNNING\n'
    printf 'attach: tmux attach -t %s\n' "$FG_RF_SESSION"
    exit 0
  fi
  printf 'STATUS: BLOCKED\n'
  printf 'reason: conflicting tmux session already exists: %s\n' "$FG_RF_SESSION"
  printf 'remediation: attach to it, or stop it with fg-role-floor-stop.sh before starting a new run\n'
  exit 3
fi

fg_run_init "$RUN_ID" "$REPO" || { printf 'STATUS: BLOCKED\nreason: run root not writable: %s\n' "$FG_RF_RUN_ROOT"; exit 3; }
fg_claude_detect "$RUN_ID" >/dev/null 2>&1 || true
fg_event_append "$RUN_ID" "floor_start" "orchestrator" "" \
  "$(jq -n --arg r "$REPO" --arg b "$REPO_BRANCH" --arg s "$REPO_SHA" --arg t "$REPO_TREE" \
     --argjson resume "$( [ "$RESUMING" = "true" ] && echo true || echo false )" \
     '{repository:$r, branch:$b, head_sha:$s, head_tree:$t, resumed:$resume}')" >/dev/null

DISPATCH="${FG_RF_BIN_DIR}/fg-role-floor-dispatch.sh"
SUPERVISOR="${FG_RF_BIN_DIR}/fg-role-floor-supervisor.sh"
LOGS="$(fg_logs_dir "$RUN_ID")"

# Window 0 is the founder-facing orchestrator; every other role window in the
# host profile is parked until the orchestrator dispatches it a task behind a
# valid lease and gate.
FIRST_WINDOW=1
for W in $FG_RF_WINDOWS; do
  PARK_CMD="FG_RF_HOST='${FG_RF_HOST}' FG_RF_RUN_ROOT='${FG_RF_RUN_ROOT}' bash '${DISPATCH}' park '${RUN_ID}' ${W} '${REPO}'"
  if [ "$FIRST_WINDOW" = "1" ]; then
    "$FG_RF_TMUX_BIN" new-session -d -s "$FG_RF_SESSION" -n "$W" "$PARK_CMD" || {
      printf 'STATUS: BLOCKED\nreason: tmux session creation failed\n'; exit 3; }
    FIRST_WINDOW=0
  else
    "$FG_RF_TMUX_BIN" new-window -t "${FG_RF_SESSION}" -n "$W" "$PARK_CMD" || {
      printf 'STATUS: BLOCKED\nreason: tmux window creation failed for %s\n' "$W"; exit 3; }
  fi
done

"$FG_RF_TMUX_BIN" select-window -t "${FG_RF_SESSION}:0" 2>/dev/null || true

# Supervisor runs detached; it needs no visible window.
# FG_RF_NO_SUPERVISOR=1 is used by the selftest so no background process is
# ever left behind by a test run.
if [ "${FG_RF_NO_SUPERVISOR:-0}" != "1" ]; then
  nohup env FG_RF_RUN_ROOT="$FG_RF_RUN_ROOT" bash "$SUPERVISOR" "$RUN_ID" "$REPO" \
    >> "${LOGS}/supervisor.log" 2>&1 &
  echo $! > "$(fg_control_dir "$RUN_ID")/supervisor.pid"
fi

fg_next_safe_action_write "$RUN_ID" \
  "Floor started. Four windows are up; builder, checker and advisor are parked." \
  "Attach to the orchestrator window and describe the lane. No writable work begins without a lease."
fg_seal_checksums "$RUN_ID"

printf 'host:   %s\n' "$FG_RF_HOST"
printf 'run_id: %s\n' "$RUN_ID"
printf 'attach: tmux attach -t %s\n' "$FG_RF_SESSION"
printf 'status: bash tools/role-floor/bin/fg-role-floor-status.sh --host %s\n' "$FG_RF_HOST"
printf 'stop:   bash tools/role-floor/bin/fg-role-floor-stop.sh --host %s\n' "$FG_RF_HOST"
exit 0
