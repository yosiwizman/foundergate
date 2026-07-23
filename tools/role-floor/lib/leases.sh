#!/usr/bin/env bash
# FounderGate role floor - lease and one-writer control.
#
# Every writable task requires a lease. Read-only roles (checker, advisor) may
# hold concurrent read leases; writable leases are exclusive over their path
# space, their branch, and their repository.
#
# All refusals are mechanical and named. A refusal never degrades to a warning.
set -u

# shellcheck source=./state.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/state.sh"

FG_RF_LEASE_TTL_DEFAULT="${FG_RF_LEASE_TTL_DEFAULT:-3600}"

fg_lease_file() { printf '%s/%s.lease.json\n' "$(fg_leases_dir "$1")" "$2"; }

fg_lease_digest_compute() { fg_sha256_json_canonical "$1" digest; }

# ---------------------------------------------------------------------------
# Inspection
# ---------------------------------------------------------------------------

fg_lease_is_expired() {
  local f="$1" exp now
  exp="$(fg_json_get "$f" '.expires_at_epoch')"
  [ -z "$exp" ] && return 1
  now="$(fg_epoch)"
  [ "$now" -gt "$exp" ]
}

fg_lease_active_files() {
  local run="$1" f status
  for f in "$(fg_leases_dir "$run")"/*.lease.json; do
    [ -f "$f" ] || continue
    status="$(fg_json_get "$f" '.status')"
    [ "$status" = "ACTIVE" ] || continue
    fg_lease_is_expired "$f" && continue
    printf '%s\n' "$f"
  done
}

# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

# fg_lease_request <run> <task> <role> <mode> <repo> <branch> \
#                  <allowed_globs> <forbidden_globs> <start_sha> <start_tree> [ttl]
#
# mode: writable | read_only
# Emits LEASE_GRANTED:<digest> on success, or one refusal code on stdout.
fg_lease_request() {
  local run="$1" task="$2" role="$3" mode="$4" repo="$5" branch="$6"
  local allowed="$7" forbidden="$8" start_sha="$9" start_tree="${10}"
  local ttl="${11:-$FG_RF_LEASE_TTL_DEFAULT}"
  local f other og ng shared="none" now exp digest

  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }

  # Only the roles named by the host profile may hold a writable lease.
  # m1: builder. m4: builder and serial-integration.
  if [ "$mode" = "writable" ] && ! fg_in_list "$role" "$FG_RF_WRITABLE_LEASE_ROLES"; then
    fg_event_append "$run" "lease_rejected" "$role" "$task" \
      '{"reason":"LEASE_REJECTED_ROLE_MISMATCH"}' >/dev/null
    echo "LEASE_REJECTED_ROLE_MISMATCH"; return 1
  fi

  # A protected branch needs an explicit protected-main writer authority, and
  # even then only the host's shared-surface writer role may target it.
  if [ "$mode" = "writable" ] && fg_branch_is_protected "$branch"; then
    if ! fg_host_authority protected_main_writer || \
       ! fg_in_list "$role" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
      fg_event_append "$run" "lease_rejected" "$role" "$task" \
        "$(jq -n --arg b "$branch" '{reason:"LEASE_REJECTED_PROTECTED_BRANCH", branch:$b}')" >/dev/null
      echo "LEASE_REJECTED_PROTECTED_BRANCH"; return 1
    fi
  fi

  # Shared integration surfaces belong to the serial integration writer, which
  # exists only where the host profile grants it.
  if [ "$mode" = "writable" ]; then
    for og in $allowed; do
      if fg_path_is_shared_surface "$(fg_glob_literal_prefix "$og")"; then
        if fg_host_authority serial_integration_writer && \
           fg_in_list "$role" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
          shared="shared_integration_surface"
        else
          fg_event_append "$run" "m4_handoff_required" "$role" "$task" \
            "$(jq -n --arg p "$og" '{reason:"M4_HANDOFF_REQUIRED", path:$p,
               authority:"serial_integration_writer"}')" >/dev/null
          echo "M4_HANDOFF_REQUIRED"; return 1
        fi
      fi
    done
  fi

  # One shared-surface integration writer at a time, everywhere. This is
  # stricter than path overlap: two serial writers on disjoint paths are still
  # two serial writers.
  if [ "$mode" = "writable" ] && fg_in_list "$role" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
    for other in $(fg_lease_active_files "$run"); do
      [ "$(fg_json_get "$other" '.task_id')" = "$task" ] && continue
      [ "$(fg_json_get "$other" '.mode')" = "writable" ] || continue
      if fg_in_list "$(fg_json_get "$other" '.writer_role')" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
        fg_event_append "$run" "lease_rejected" "$role" "$task" \
          "$(jq -n --arg t "$(fg_json_get "$other" '.task_id')" \
             '{reason:"LEASE_REJECTED_SERIAL_WRITER_ACTIVE", held_by:$t}')" >/dev/null
        echo "LEASE_REJECTED_SERIAL_WRITER_ACTIVE"; return 1
      fi
    done
  fi

  # Collision checks against live leases.
  if [ "$mode" = "writable" ]; then
    for other in $(fg_lease_active_files "$run"); do
      [ "$(fg_json_get "$other" '.mode')" = "writable" ] || continue
      [ "$(fg_json_get "$other" '.task_id')" = "$task" ] && continue

      if [ "$(fg_json_get "$other" '.repository')" = "$repo" ] && \
         [ "$(fg_json_get "$other" '.branch')" = "$branch" ]; then
        fg_event_append "$run" "lease_rejected" "$role" "$task" \
          "$(jq -n --arg b "$branch" '{reason:"LEASE_REJECTED_BRANCH_WRITER_EXISTS", branch:$b}')" >/dev/null
        echo "LEASE_REJECTED_BRANCH_WRITER_EXISTS"; return 1
      fi

      if [ "$(fg_json_get "$other" '.repository')" = "$repo" ]; then
        for og in $(fg_json_get "$other" '.allowed_globs[]'); do
          for ng in $allowed; do
            if fg_globs_overlap "$og" "$ng"; then
              fg_event_append "$run" "lease_rejected" "$role" "$task" \
                "$(jq -n --arg a "$og" --arg b "$ng" \
                   '{reason:"LEASE_REJECTED_OVERLAP", existing:$a, requested:$b}')" >/dev/null
              echo "LEASE_REJECTED_OVERLAP"; return 1
            fi
          done
        done
      fi
    done
  fi

  # A previous lease for this task may not be silently reused once stale.
  f="$(fg_lease_file "$run" "$task")"
  if [ -f "$f" ]; then
    if [ "$(fg_json_get "$f" '.status')" = "ACTIVE" ] && fg_lease_is_expired "$f"; then
      fg_event_append "$run" "lease_rejected" "$role" "$task" \
        '{"reason":"LEASE_REJECTED_STALE_REUSE"}' >/dev/null
      echo "LEASE_REJECTED_STALE_REUSE"; return 1
    fi
  fi

  now="$(fg_epoch)"
  exp=$(( now + ttl ))
  mkdir -p "$(dirname "$f")"
  jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" \
    --arg role "$role" --arg mode "$mode" --arg repo "$repo" --arg branch "$branch" \
    --arg allowed "$allowed" --arg forbidden "$forbidden" --arg shared "$shared" \
    --arg ss "$start_sha" --arg st "$start_tree" \
    --arg ts "$(fg_now)" --argjson now "$now" --argjson exp "$exp" \
    '{schema_version:$sv, run_id:$run, task_id:$task, writer_role:$role, mode:$mode,
      repository:$repo, branch:$branch,
      allowed_globs:($allowed|split(" ")|map(select(length>0))),
      forbidden_paths:($forbidden|split(" ")|map(select(length>0))),
      shared_surface_classification:$shared,
      start_sha:$ss, start_tree:$st,
      granted_at:$ts, granted_at_epoch:$now, expires_at_epoch:$exp,
      heartbeat_at_epoch:$now, status:"ACTIVE"}' \
    | fg_atomic_write_json "$f" || { echo "LEASE_WRITE_FAILED"; return 1; }

  digest="$(fg_lease_digest_compute "$f")"
  jq --arg d "$digest" '. + {digest:$d}' "$f" | fg_atomic_write_json "$f" || {
    echo "LEASE_WRITE_FAILED"; return 1; }

  fg_task_update "$run" "$task" ".lease_digest=\"${digest}\"" >/dev/null 2>&1 || true
  fg_event_append "$run" "lease_granted" "$role" "$task" \
    "$(jq -n --arg d "$digest" --arg m "$mode" --arg b "$branch" \
       '{digest:$d, mode:$m, branch:$b}')" >/dev/null
  echo "LEASE_GRANTED:${digest}"
  return 0
}

# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

# fg_lease_verify <run> <task> [expected_digest] [expected_role]
# LEASE_OK | LEASE_MISSING | LEASE_DIGEST_MISMATCH | LEASE_STALE |
# LEASE_ROLE_MISMATCH | LEASE_RELEASED
fg_lease_verify() {
  local run="$1" task="$2" expect_digest="${3:-}" expect_role="${4:-}" f stored recomputed
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }

  stored="$(fg_json_get "$f" '.digest')"
  recomputed="$(fg_lease_digest_compute "$f")"
  if [ "$stored" != "$recomputed" ]; then echo "LEASE_DIGEST_MISMATCH"; return 1; fi
  if [ -n "$expect_digest" ] && [ "$expect_digest" != "$stored" ]; then
    echo "LEASE_DIGEST_MISMATCH"; return 1
  fi
  if [ -n "$expect_role" ] && [ "$expect_role" != "$(fg_json_get "$f" '.writer_role')" ]; then
    echo "LEASE_ROLE_MISMATCH"; return 1
  fi
  [ "$(fg_json_get "$f" '.status')" = "ACTIVE" ] || { echo "LEASE_RELEASED"; return 1; }
  fg_lease_is_expired "$f" && { echo "LEASE_STALE"; return 1; }
  echo "LEASE_OK"
  return 0
}

# fg_lease_path_allowed <run> <task> <path> - PATH_ALLOWED | PATH_FORBIDDEN |
# PATH_OUTSIDE_LEASE | M4_HANDOFF_REQUIRED
fg_lease_path_allowed() {
  local run="$1" task="$2" path="$3" f g
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }

  if fg_path_is_shared_surface "$path"; then
    fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
    if ! fg_host_authority serial_integration_writer || \
       ! fg_in_list "$(fg_json_get "$f" '.writer_role')" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
      echo "M4_HANDOFF_REQUIRED"; return 1
    fi
  fi

  for g in $(fg_json_get "$f" '.forbidden_paths[]'); do
    case "$path" in $g) echo "PATH_FORBIDDEN"; return 1 ;; esac
  done
  for g in $(fg_json_get "$f" '.allowed_globs[]'); do
    case "$path" in $g) echo "PATH_ALLOWED"; return 0 ;; esac
  done
  echo "PATH_OUTSIDE_LEASE"
  return 1
}

fg_lease_heartbeat() {
  local run="$1" task="$2" f out now ttl
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }
  now="$(fg_epoch)"
  ttl="$FG_RF_LEASE_TTL_DEFAULT"
  out="$(jq --argjson n "$now" --argjson t "$ttl" \
    '.heartbeat_at_epoch=$n | .expires_at_epoch=($n + $t) | del(.digest)' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  out="$(fg_lease_digest_compute "$f")"
  jq --arg d "$out" '. + {digest:$d}' "$f" | fg_atomic_write_json "$f"
}

fg_lease_release() {
  local run="$1" task="$2" f out
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }
  out="$(jq --arg ts "$(fg_now)" '.status="RELEASED" | .released_at=$ts | del(.digest)' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  out="$(fg_lease_digest_compute "$f")"
  jq --arg d "$out" '. + {digest:$d}' "$f" | fg_atomic_write_json "$f" || return 1
  fg_event_append "$run" "lease_released" "$(fg_json_get "$f" '.writer_role')" "$task" '{}' >/dev/null
  echo "LEASE_RELEASED"
}
