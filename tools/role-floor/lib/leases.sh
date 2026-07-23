#!/usr/bin/env bash
# FounderGate role floor - lease and one-writer control.
#
# Every writable task requires a lease. Read-only roles (checker, advisor) may
# hold concurrent read leases; writable leases are exclusive over their path
# space, their branch, and their repository.
#
# All refusals are mechanical and named. A refusal never degrades to a warning.
#
# The lease seal is KEYED with the per-run writer secret (F-G04). The previous
# seal was sha256(canonical body) with no secret, so the party the lease
# constrains could push out its own expiry, or rewrite writer_role, and re-seal
# in two lines of jq. fg_lease_verify additionally REQUIRES an expected role
# from its caller: a role-less verification is now LEASE_ROLE_UNSPECIFIED, not
# a pass.
#
# HONEST SCOPE: the keying material is control/.writer_secret, readable by the
# same macOS user. This defeats casual and accidental rewriting; it does not
# defeat an attacker who reads that file.
set -u

# shellcheck source=./state.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/state.sh"

FG_RF_LEASE_TTL_DEFAULT="${FG_RF_LEASE_TTL_DEFAULT:-3600}"

fg_lease_file() { printf '%s/%s.lease.json\n' "$(fg_leases_dir "$1")" "$2"; }

# fg_lease_digest_compute <run> <file> - keyed seal.
fg_lease_digest_compute() { fg_hmac_json_canonical "$1" "$2" digest; }

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
  local f other og ng shared="none" now exp digest nb norm

  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }

  # Identifiers and branch names are validated before they reach a path or a
  # comparison (F-J01, F-G03).
  fg_id_require run "$run"   || { echo "LEASE_REJECTED_INVALID_RUN_ID"; return 1; }
  fg_id_require task "$task" || { echo "LEASE_REJECTED_INVALID_TASK_ID"; return 1; }
  fg_id_require role "$role" || { echo "LEASE_REJECTED_INVALID_ROLE"; return 1; }
  nb="$(fg_branch_normalise "$branch")" || { echo "LEASE_REJECTED_INVALID_BRANCH"; return 1; }
  branch="$nb"
  fg_patharg_safe "$repo" || { echo "LEASE_REJECTED_UNSAFE_REPOSITORY_PATH"; return 1; }

  # Every requested glob must normalise to a relative, non-escaping path that
  # is contained inside the repository once symlinks are resolved (F-G01).
  # "src/../../../etc/passwd", "/abs/path" and a symlink out of the tree are
  # refused at REQUEST time, not later at write time.
  while IFS= read -r og; do
    [ -n "$og" ] || continue
    norm="$(fg_path_normalise "$(fg_glob_literal_prefix "$og")")" || {
      fg_event_append "$run" "lease_rejected" "$role" "$task" \
        "$(jq -n --arg p "$og" --arg r "$norm" '{reason:"LEASE_REJECTED_UNSAFE_PATH", path:$p, detail:$r}')" >/dev/null
      echo "LEASE_REJECTED_UNSAFE_PATH"; return 1; }
    if [ -d "$repo" ]; then
      case "$(fg_path_contained "$repo" "$norm")" in
        PATH_CONTAINED) : ;;
        *) fg_event_append "$run" "lease_rejected" "$role" "$task" \
             "$(jq -n --arg p "$og" '{reason:"LEASE_REJECTED_PATH_ESCAPES_REPOSITORY", path:$p}')" >/dev/null
           echo "LEASE_REJECTED_PATH_ESCAPES_REPOSITORY"; return 1 ;;
      esac
    fi
  done <<< "$(fg_split_noglob "$allowed")"

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
    while IFS= read -r og; do
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
    done <<< "$(fg_split_noglob "$allowed")"
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
        while IFS= read -r og; do
          while IFS= read -r ng; do
            if fg_globs_overlap "$og" "$ng"; then
              fg_event_append "$run" "lease_rejected" "$role" "$task" \
                "$(jq -n --arg a "$og" --arg b "$ng" \
                   '{reason:"LEASE_REJECTED_OVERLAP", existing:$a, requested:$b}')" >/dev/null
              echo "LEASE_REJECTED_OVERLAP"; return 1
            fi
          done <<< "$(fg_split_noglob "$allowed")"
        done <<< "$(fg_split_noglob "$(fg_json_get "$other" '.allowed_globs | join(" ")')")"
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

  digest="$(fg_lease_digest_compute "$run" "$f")" || { echo "LEASE_WRITE_FAILED"; return 1; }
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

# fg_lease_verify <run> <task> [expected_digest] <expected_role>
#
# The expected role is MANDATORY (F-G04). A caller that does not know which
# role it expects gets LEASE_ROLE_UNSPECIFIED, not LEASE_OK.
#
# LEASE_OK | LEASE_MISSING | LEASE_DIGEST_MISMATCH | LEASE_STALE |
# LEASE_ROLE_MISMATCH | LEASE_ROLE_UNSPECIFIED | LEASE_RELEASED |
# LEASE_WRONG_RUN | LEASE_WRONG_TASK
fg_lease_verify() {
  local run="$1" task="$2" expect_digest="${3:-}" expect_role="${4:-}" f stored recomputed
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }
  [ -n "$expect_role" ] || { echo "LEASE_ROLE_UNSPECIFIED"; return 1; }

  [ "$(fg_json_get "$f" '.run_id')"  = "$run" ]  || { echo "LEASE_WRONG_RUN"; return 1; }
  [ "$(fg_json_get "$f" '.task_id')" = "$task" ] || { echo "LEASE_WRONG_TASK"; return 1; }

  stored="$(fg_json_get "$f" '.digest')"
  recomputed="$(fg_lease_digest_compute "$run" "$f")"
  if [ -z "$stored" ] || [ "$stored" != "$recomputed" ]; then echo "LEASE_DIGEST_MISMATCH"; return 1; fi
  if [ -n "$expect_digest" ] && [ "$expect_digest" != "$stored" ]; then
    echo "LEASE_DIGEST_MISMATCH"; return 1
  fi
  if [ "$expect_role" != "$(fg_json_get "$f" '.writer_role')" ]; then
    echo "LEASE_ROLE_MISMATCH"; return 1
  fi
  [ "$(fg_json_get "$f" '.status')" = "ACTIVE" ] || { echo "LEASE_RELEASED"; return 1; }
  fg_lease_is_expired "$f" && { echo "LEASE_STALE"; return 1; }
  echo "LEASE_OK"
  return 0
}

# fg_lease_path_allowed <run> <task> <path>
#
# The candidate is normalised and, on a case-insensitive filesystem, folded
# before ANY comparison, so "src/SECRET.txt", "./src/secret.txt" and
# "src/sub/../secret.txt" are all the same path as "src/secret.txt" (F-G02).
# A path that escapes the lease's repository is refused outright rather than
# glob-matched (F-G01).
#
# PATH_ALLOWED | PATH_FORBIDDEN | PATH_OUTSIDE_LEASE | PATH_UNSAFE |
# PATH_ESCAPES_REPOSITORY | M4_HANDOFF_REQUIRED | LEASE_MISSING
fg_lease_path_allowed() {
  local run="$1" task="$2" path="$3" f g norm key repo
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }

  norm="$(fg_path_normalise "$path")" || { echo "PATH_UNSAFE"; return 1; }
  repo="$(fg_json_get "$f" '.repository')"
  if [ -n "$repo" ] && [ -d "$repo" ]; then
    case "$(fg_path_contained "$repo" "$norm")" in
      PATH_CONTAINED) : ;;
      *) echo "PATH_ESCAPES_REPOSITORY"; return 1 ;;
    esac
  fi
  key="$(fg_compare_key "$norm")"

  if fg_path_is_shared_surface "$norm"; then
    fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
    if ! fg_host_authority serial_integration_writer || \
       ! fg_in_list "$(fg_json_get "$f" '.writer_role')" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
      echo "M4_HANDOFF_REQUIRED"; return 1
    fi
  fi

  # Forbidden first, and forbidden wins: a path matching both lists is refused.
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    case "$key" in $(fg_compare_key "$g")) echo "PATH_FORBIDDEN"; return 1 ;; esac
  done <<< "$(fg_split_noglob "$(fg_json_get "$f" '.forbidden_paths | join(" ")')")"
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    case "$key" in $(fg_compare_key "$g")) echo "PATH_ALLOWED"; return 0 ;; esac
  done <<< "$(fg_split_noglob "$(fg_json_get "$f" '.allowed_globs | join(" ")')")"
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
  out="$(fg_lease_digest_compute "$run" "$f")" || return 1
  jq --arg d "$out" '. + {digest:$d}' "$f" | fg_atomic_write_json "$f"
}

fg_lease_release() {
  local run="$1" task="$2" f out
  f="$(fg_lease_file "$run" "$task")"
  [ -f "$f" ] || { echo "LEASE_MISSING"; return 1; }
  out="$(jq --arg ts "$(fg_now)" '.status="RELEASED" | .released_at=$ts | del(.digest)' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  out="$(fg_lease_digest_compute "$run" "$f")" || return 1
  jq --arg d "$out" '. + {digest:$d}' "$f" | fg_atomic_write_json "$f" || return 1
  fg_event_append "$run" "lease_released" "$(fg_json_get "$f" '.writer_role')" "$task" '{}' >/dev/null
  echo "LEASE_RELEASED"
}
