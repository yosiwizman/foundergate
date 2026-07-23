#!/usr/bin/env bash
# FounderGate role floor - disk-backed control plane.
#
# Owns the run root layout, the append-only hash-chained event log, task state
# records, the retry ledger, and the sealed checksum manifest.
#
# Mutable JSON and Markdown are replaced atomically. EVENTS.jsonl is append
# only and self-verifying: every line commits to the digest of its predecessor,
# so a silent rewrite of history is mechanically detectable.
set -u

# shellcheck source=./hosts.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/hosts.sh"

FG_RF_EVENT_GENESIS="GENESIS"

# ---------------------------------------------------------------------------
# Run initialisation
# ---------------------------------------------------------------------------

fg_run_init() {
  local run_id="$1" repo="${2:-}" root ctl d
  fg_host_require || return 1
  root="$(fg_run_dir "$run_id")"
  for d in $(fg_run_layout_dirs); do
    mkdir -p "${root}/${d}" || return 1
  done
  ctl="$(fg_control_dir "$run_id")"

  if [ ! -f "${ctl}/RUN_MANIFEST.json" ]; then
    jq -n \
      --arg sv "$FG_RF_SCHEMA_VERSION" \
      --arg pkg "$FG_RF_PACKAGE" \
      --arg ver "$FG_RF_VERSION" \
      --arg run "$run_id" \
      --arg ts "$(fg_now)" \
      --arg host "$(hostname 2>/dev/null || echo unknown)" \
      --arg repo "$repo" \
      --arg session "$FG_RF_SESSION" \
      --arg windows "$FG_RF_WINDOWS" \
      --arg profile "$FG_RF_HOST" \
      --arg fw "$FG_RF_FOUNDER_WINDOW" \
      --arg sealed "$FG_RF_UNIVERSAL_SEALED_AUTHORITIES" \
      --argjson authorities "$(jq -c '.authorities' "$FG_RF_PROFILE_FILE")" \
      '{schema_version:$sv, package:$pkg, package_version:$ver, run_id:$run,
        created_at:$ts, machine:$host, source_repository:$repo,
        host_profile:$profile,
        tmux_session:$session, tmux_windows:($windows|split(" ")),
        founder_window:$fw, host_authorities:$authorities,
        universally_sealed_authorities:($sealed|split(" "))}' \
      | fg_atomic_write_json "${ctl}/RUN_MANIFEST.json" || return 1
  fi

  if [ ! -f "${ctl}/RUN_STATE.json" ]; then
    jq -n --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run_id" --arg ts "$(fg_now)" \
      '{schema_version:$sv, run_id:$run, run_status:"ACTIVE", stop_requested:false,
        dispatch_enabled:true, updated_at:$ts, heavy_test_lock:null}' \
      | fg_atomic_write_json "${ctl}/RUN_STATE.json" || return 1
  fi

  # The role registry is the host profile's authority table, copied into the
  # run so an auditor reads the rules that were actually in force.
  [ -f "${ctl}/ROLE_REGISTRY.json" ] || jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg profile "$FG_RF_HOST" \
    --argjson roles "$(jq -c '.roles' "$FG_RF_PROFILE_FILE")" \
    --argjson sealed "$(jq -c '.sealed_artifact_classes' "$FG_RF_PROFILE_FILE")" \
    --arg wl "$FG_RF_WRITABLE_LEASE_ROLES" --arg ssw "$FG_RF_SHARED_SURFACE_WRITER_ROLES" \
    '{schema_version:$sv, host_profile:$profile, roles:$roles,
      sealed_artifact_classes:$sealed,
      writable_lease_roles:($wl|split(" ")|map(select(length>0))),
      shared_surface_writer_roles:($ssw|split(" ")|map(select(length>0)))}' \
    | fg_atomic_write_json "${ctl}/ROLE_REGISTRY.json"

  [ -f "${ctl}/LANE_REGISTRY.json" ] || jq -n --arg sv "$FG_RF_SCHEMA_VERSION" \
    '{schema_version:$sv, lanes:{}}' | fg_atomic_write_json "${ctl}/LANE_REGISTRY.json"

  [ -f "${ctl}/RETRY_LEDGER.json" ] || jq -n --arg sv "$FG_RF_SCHEMA_VERSION" \
    --argjson cl "${FG_RF_CORRECTION_LIMIT:-2}" --argjson rl "${FG_RF_CONTEXT_RESTART_LIMIT:-3}" \
    '{schema_version:$sv, tasks:{}, defaults:{correction_limit:$cl, context_restart_limit:$rl}}' \
    | fg_atomic_write_json "${ctl}/RETRY_LEDGER.json"

  : > /dev/null
  [ -f "${ctl}/TASK_QUEUE.jsonl" ] || : >> "${ctl}/TASK_QUEUE.jsonl"
  [ -f "${ctl}/EVENTS.jsonl" ] || : >> "${ctl}/EVENTS.jsonl"
  [ -f "${ctl}/NEXT_SAFE_ACTION.md" ] || fg_next_safe_action_write "$run_id" \
    "Run initialised. No lane dispatched yet." "Dispatch a builder task with a valid writable lease."

  # Run-scoped writer secret. Role result tokens are derived from it, so a
  # transcript alone cannot forge a role write.
  if [ ! -f "${ctl}/.writer_secret" ]; then
    ( umask 077; head -c 32 /dev/urandom | shasum -a 256 | awk '{print $1}' > "${ctl}/.writer_secret" )
  fi
  return 0
}

fg_run_exists() { [ -f "$(fg_control_dir "$1")/RUN_MANIFEST.json" ]; }

# ---------------------------------------------------------------------------
# Append-only hash-chained events
# ---------------------------------------------------------------------------

fg_events_file() { printf '%s/EVENTS.jsonl\n' "$(fg_control_dir "$1")"; }

fg_event_last_digest() {
  local f; f="$(fg_events_file "$1")"
  if [ ! -s "$f" ]; then printf '%s\n' "$FG_RF_EVENT_GENESIS"; return 0; fi
  tail -n 1 "$f" | jq -r '.digest // empty' 2>/dev/null
}

fg_event_count() {
  local f; f="$(fg_events_file "$1")"
  [ -s "$f" ] && awk 'END{print NR}' "$f" || echo 0
}

# fg_event_append <run_id> <type> <role> <task> <payload_json>
fg_event_append() {
  local run_id="$1" type="$2" role="$3" task="$4" payload="${5:-{\}}"
  local f seq prev body digest
  f="$(fg_events_file "$run_id")"
  mkdir -p "$(dirname "$f")"
  [ -f "$f" ] || : >> "$f"
  seq=$(( $(fg_event_count "$run_id") + 1 ))
  prev="$(fg_event_last_digest "$run_id")"
  echo "$payload" | jq -e . >/dev/null 2>&1 || payload='{"note":"unparseable payload discarded"}'

  body="$(jq -c -n \
    --argjson seq "$seq" \
    --arg ts "$(fg_now)" \
    --arg run "$run_id" \
    --arg type "$type" \
    --arg role "$role" \
    --arg task "$task" \
    --arg prev "$prev" \
    --argjson payload "$payload" \
    '{seq:$seq, ts:$ts, run_id:$run, type:$type, role:$role, task_id:$task,
      prev_digest:$prev, payload:$payload}')" || return 1

  digest="$(printf '%s' "$(printf '%s' "$body" | jq -S -c .)" | fg_sha256_stdin)"
  printf '%s\n' "$(printf '%s' "$body" | jq -c --arg d "$digest" '. + {digest:$d}')" >> "$f"
}

# fg_events_verify <run_id> - recompute the chain. Any insertion, deletion or
# in-place edit of a prior line breaks it.
fg_events_verify() {
  local run_id="$1" f prev line seq expect_seq body digest claimed
  f="$(fg_events_file "$run_id")"
  [ -f "$f" ] || { echo "EVENTS_MISSING"; return 1; }
  prev="$FG_RF_EVENT_GENESIS"
  expect_seq=1
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if ! printf '%s' "$line" | jq -e . >/dev/null 2>&1; then
      echo "EVENT_CHAIN_BROKEN:line_${expect_seq}:unparseable"; return 1
    fi
    seq="$(printf '%s' "$line" | jq -r '.seq')"
    if [ "$seq" != "$expect_seq" ]; then
      echo "EVENT_CHAIN_BROKEN:seq_${seq}:expected_${expect_seq}"; return 1
    fi
    if [ "$(printf '%s' "$line" | jq -r '.prev_digest')" != "$prev" ]; then
      echo "EVENT_CHAIN_BROKEN:seq_${seq}:prev_digest_mismatch"; return 1
    fi
    claimed="$(printf '%s' "$line" | jq -r '.digest')"
    body="$(printf '%s' "$line" | jq -c 'del(.digest)')"
    digest="$(printf '%s' "$(printf '%s' "$body" | jq -S -c .)" | fg_sha256_stdin)"
    if [ "$claimed" != "$digest" ]; then
      echo "EVENT_CHAIN_BROKEN:seq_${seq}:digest_mismatch"; return 1
    fi
    prev="$claimed"
    expect_seq=$(( expect_seq + 1 ))
  done < "$f"
  echo "EVENT_CHAIN_OK:$(( expect_seq - 1 ))"
  return 0
}

# ---------------------------------------------------------------------------
# Task state records
# ---------------------------------------------------------------------------

fg_task_file() { printf '%s/%s.state.json\n' "$(fg_queue_dir "$1")" "$2"; }

# fg_task_create <run> <task> <lane> <role> <repo> <branch> <base_sha> <base_tree>
fg_task_create() {
  local run="$1" task="$2" lane="$3" role="$4" repo="$5" branch="$6" base_sha="$7" base_tree="$8"
  local f; f="$(fg_task_file "$run" "$task")"
  mkdir -p "$(dirname "$f")"
  jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" \
    --arg lane "$lane" --arg role "$role" --arg repo "$repo" --arg branch "$branch" \
    --arg bs "$base_sha" --arg bt "$base_tree" --arg ts "$(fg_now)" \
    '{schema_version:$sv, run_id:$run, task_id:$task, lane:$lane, role:$role,
      session_id:null, tmux_target:null, pid:null,
      repository:$repo, branch:$branch, base_sha:$bs, base_tree:$bt,
      candidate_sha:null, candidate_tree:null,
      lease_digest:null, prompt_digest:null,
      attempt:1, retry_budget:2, context_restarts:0,
      started_at:$ts, last_activity_at:$ts,
      status:"NOT_STARTED", summary:"created",
      dependencies:[], blockers:[], next_safe_action:"dispatch"}' \
    | fg_atomic_write_json "$f" || return 1
  printf '%s\n' "$(jq -c '{task_id:.task_id, lane:.lane, role:.role, created_at:.started_at}' "$f")" \
    >> "$(fg_control_dir "$run")/TASK_QUEUE.jsonl"
  fg_event_append "$run" "task_created" "orchestrator" "$task" \
    "$(jq -n --arg l "$lane" --arg r "$role" '{lane:$l, role:$r}')"
}

fg_task_exists() { [ -f "$(fg_task_file "$1" "$2")" ]; }

fg_task_get() { fg_json_get "$(fg_task_file "$1" "$2")" ".$3"; }

# fg_task_update <run> <task> <jq_assignment>
fg_task_update() {
  local run="$1" task="$2" assign="$3" f tmp
  f="$(fg_task_file "$run" "$task")"
  [ -f "$f" ] || { fg_err "no such task record: $task"; return 1; }
  tmp="$(jq --arg ts "$(fg_now)" "${assign} | .last_activity_at=\$ts" "$f")" || return 1
  printf '%s\n' "$tmp" | fg_atomic_write_json "$f"
}

# fg_task_set_status <run> <task> <status> [summary]
fg_task_set_status() {
  local run="$1" task="$2" status="$3" summary="${4:-}"
  if ! fg_status_valid "$status"; then
    fg_err "invalid lane status: $status"
    return 1
  fi
  fg_task_update "$run" "$task" \
    ".status=\"${status}\" | .summary=\"$(printf '%s' "$summary" | sed 's/"/\\"/g')\"" || return 1
  fg_event_append "$run" "status_change" "$(fg_task_get "$run" "$task" role)" "$task" \
    "$(jq -n --arg s "$status" --arg m "$summary" '{status:$s, summary:$m}')"
}

fg_task_list() {
  local run="$1" f
  for f in "$(fg_queue_dir "$run")"/*.state.json; do
    [ -f "$f" ] || continue
    basename "$f" .state.json
  done
}

# ---------------------------------------------------------------------------
# Retry ledger
# ---------------------------------------------------------------------------
# Correction attempts and context restarts are counted separately: a context
# restart must never consume a correction attempt.

fg_retry_file() { printf '%s/RETRY_LEDGER.json\n' "$(fg_control_dir "$1")"; }

fg_retry_ensure_task() {
  local run="$1" task="$2" f out
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" \
    'if (.tasks[$t] == null) then .tasks[$t] = {correction_attempts:0, context_restarts:0, correction_limit:.defaults.correction_limit, context_restart_limit:.defaults.context_restart_limit} else . end' \
    "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f"
}

fg_retry_get() { fg_json_get "$(fg_retry_file "$1")" ".tasks[\"$2\"].$3"; }

fg_retry_bump_correction() {
  local run="$1" task="$2" f out
  fg_retry_ensure_task "$run" "$task" || return 1
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" '.tasks[$t].correction_attempts += 1' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_event_append "$run" "correction_attempt" "orchestrator" "$task" \
    "$(jq -n --argjson n "$(fg_retry_get "$run" "$task" correction_attempts)" '{correction_attempts:$n}')"
}

fg_retry_bump_context_restart() {
  local run="$1" task="$2" f out
  fg_retry_ensure_task "$run" "$task" || return 1
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" '.tasks[$t].context_restarts += 1' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_task_update "$run" "$task" ".context_restarts=$(fg_retry_get "$run" "$task" context_restarts)" || return 1
  fg_event_append "$run" "context_restart" "orchestrator" "$task" \
    "$(jq -n --argjson n "$(fg_retry_get "$run" "$task" context_restarts)" '{context_restarts:$n}')"
}

fg_retry_correction_available() {
  local run="$1" task="$2" used limit
  fg_retry_ensure_task "$run" "$task" || return 1
  used="$(fg_retry_get "$run" "$task" correction_attempts)"
  limit="$(fg_retry_get "$run" "$task" correction_limit)"
  [ "${used:-0}" -lt "${limit:-0}" ]
}

fg_retry_context_available() {
  local run="$1" task="$2" used limit
  fg_retry_ensure_task "$run" "$task" || return 1
  used="$(fg_retry_get "$run" "$task" context_restarts)"
  limit="$(fg_retry_get "$run" "$task" context_restart_limit)"
  [ "${used:-0}" -lt "${limit:-0}" ]
}

# ---------------------------------------------------------------------------
# Run-level stop control
# ---------------------------------------------------------------------------

fg_run_state_file() { printf '%s/RUN_STATE.json\n' "$(fg_control_dir "$1")"; }

fg_run_state_update() {
  local run="$1" assign="$2" f out
  f="$(fg_run_state_file "$run")"
  out="$(jq --arg ts "$(fg_now)" "${assign} | .updated_at=\$ts" "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f"
}

fg_run_stop_requested() {
  [ "$(fg_json_get "$(fg_run_state_file "$1")" '.stop_requested')" = "true" ]
}

fg_run_dispatch_enabled() {
  [ "$(fg_json_get "$(fg_run_state_file "$1")" '.dispatch_enabled')" = "true" ]
}

# ---------------------------------------------------------------------------
# Heavy-test lock: one heavy test at a time on an 8 GiB machine.
# ---------------------------------------------------------------------------

fg_heavy_lock_holder() { fg_json_get "$(fg_run_state_file "$1")" '.heavy_test_lock'; }

fg_heavy_lock_acquire() {
  local run="$1" task="$2" holder
  holder="$(fg_heavy_lock_holder "$run")"
  if [ -n "$holder" ] && [ "$holder" != "$task" ]; then echo "HEAVY_TEST_LOCK_HELD:${holder}"; return 1; fi
  fg_run_state_update "$run" ".heavy_test_lock=\"${task}\"" || return 1
  echo "HEAVY_TEST_LOCK_ACQUIRED"
}

fg_heavy_lock_release() {
  local run="$1" task="$2" holder
  holder="$(fg_heavy_lock_holder "$run")"
  [ "$holder" = "$task" ] || { echo "HEAVY_TEST_LOCK_NOT_HELD"; return 1; }
  fg_run_state_update "$run" '.heavy_test_lock=null' || return 1
  echo "HEAVY_TEST_LOCK_RELEASED"
}

# ---------------------------------------------------------------------------
# Next safe action
# ---------------------------------------------------------------------------

fg_next_safe_action_write() {
  local run="$1" situation="$2" action="$3"
  {
    printf '# NEXT SAFE ACTION\n\n'
    printf -- '- run: %s\n' "$run"
    printf -- '- generated: %s\n' "$(fg_now)"
    printf -- '- package: %s %s\n\n' "$FG_RF_PACKAGE" "$FG_RF_VERSION"
    printf '## Situation\n\n%s\n\n' "$situation"
    printf '## Next safe action\n\n%s\n\n' "$action"
    printf '## Sealed on this machine\n\n'
    printf 'merge, founder signature, activation, protected-main write, deployment.\n'
    printf 'These require M4 handoff and are never executed by the M1 floor.\n'
  } | fg_atomic_write "$(fg_control_dir "$run")/NEXT_SAFE_ACTION.md"
}

# ---------------------------------------------------------------------------
# Checksum sealing
# ---------------------------------------------------------------------------

# Seals every control and role artifact except the append-only event log
# (which carries its own chain) and the writer secret.
fg_seal_checksums() {
  local run="$1" root ctl
  root="$(fg_run_dir "$run")"
  ctl="$(fg_control_dir "$run")"
  ( cd "$root" && \
    find control queue leases roles handoffs reports founder-gates -type f 2>/dev/null \
      | grep -v 'control/SHA256SUMS.txt' \
      | grep -v 'control/EVENTS.jsonl' \
      | grep -v 'control/.writer_secret' \
      | LC_ALL=C sort \
      | while IFS= read -r rel; do shasum -a 256 "$rel"; done ) \
    | fg_atomic_write "${ctl}/SHA256SUMS.txt"
}

# fg_verify_checksums <run> - CHECKSUMS_OK | CHECKSUMS_MISMATCH:<file>
fg_verify_checksums() {
  local run="$1" root ctl line want got rel
  root="$(fg_run_dir "$run")"
  ctl="$(fg_control_dir "$run")"
  [ -f "${ctl}/SHA256SUMS.txt" ] || { echo "CHECKSUMS_MISSING"; return 1; }
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    want="$(printf '%s' "$line" | awk '{print $1}')"
    rel="$(printf '%s' "$line" | sed 's/^[0-9a-f]*  //')"
    if [ ! -f "${root}/${rel}" ]; then echo "CHECKSUMS_MISMATCH:${rel}:missing"; return 1; fi
    got="$(shasum -a 256 "${root}/${rel}" | awk '{print $1}')"
    if [ "$want" != "$got" ]; then echo "CHECKSUMS_MISMATCH:${rel}"; return 1; fi
  done < "${ctl}/SHA256SUMS.txt"
  echo "CHECKSUMS_OK"
  return 0
}
