#!/usr/bin/env bash
# FounderGate role floor - disk-backed control plane.
#
# Owns the run root layout, the keyed append-only event log, task state
# records, the retry ledger, and the sealed checksum manifest.
#
# Mutable JSON and Markdown are replaced atomically.
#
# EVENTS.jsonl is append-only and chained. Each line carries a KEYED digest
# (HMAC over the canonical line body under the per-run writer secret) and
# commits to its predecessor's digest, and the chain's length and head are
# committed separately in control/EVENTS.anchor.json plus, when the operator
# has configured one, an external witness file outside the run root. That
# combination detects in-place edits, insertions, deletions, TAIL TRUNCATION
# and wholesale rewrites (F-H02): a valid prefix is no longer a valid chain,
# because the anchored length no longer matches.
#
# HONEST SCOPE: the writer secret lives at control/.writer_secret, mode 0600,
# owned by the same macOS user every role process runs as. An actor who reads
# it can recompute every line digest AND the anchor, and the external witness
# is written by that same user. Against that actor this log is evidence of
# tampering-by-accident and tampering-by-a-careless-attacker, not proof against
# a determined same-user attacker. It is not an external notary.
set -u

# shellcheck source=./hosts.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/hosts.sh"

FG_RF_EVENT_GENESIS="GENESIS"

# Optional external chain witness. When this directory exists, the chain head
# and length are mirrored outside the run root and verification fails closed if
# the mirror is missing or disagrees. Same user, same machine: a convenience
# against careless rewriting, not an independent notary.
FG_RF_EVENT_WITNESS_DIR="${FG_RF_EVENT_WITNESS_DIR:-${HOME}/.foundergate/witness}"

# ---------------------------------------------------------------------------
# Run initialisation
# ---------------------------------------------------------------------------

fg_run_init() {
  local run_id="$1" repo="${2:-}" root ctl d
  fg_host_require || return 1
  fg_id_require run "$run_id" || return 1
  root="$(fg_run_dir "$run_id")"
  for d in $(fg_run_layout_dirs); do
    mkdir -p "${root}/${d}" || return 1
  done
  ctl="$(fg_control_dir "$run_id")"

  # The run-scoped writer secret must exist BEFORE the first keyed seal, so it
  # is created first rather than last.
  if [ ! -f "${ctl}/.writer_secret" ]; then
    ( umask 077; head -c 32 /dev/urandom | shasum -a 256 | awk '{print $1}' > "${ctl}/.writer_secret" )
  fi

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

  # Durable one-time-consumption ledger for founder decision receipts. Created
  # at run init so its ABSENCE later is an unambiguous failure rather than an
  # ambiguous "nothing consumed yet".
  [ -f "${ctl}/CONSUMED_RECEIPTS.json" ] || {
    jq -n --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run_id" --arg ts "$(fg_now)" \
      '{schema_version:$sv, run_id:$run, created_at:$ts, consumed:[]}' \
      | fg_atomic_write_json "${ctl}/CONSUMED_RECEIPTS.json"
    fg_receipt_ledger_seal "$run_id" >/dev/null 2>&1 || true
  }

  # Anchor the (currently empty) chain so a later truncation to zero is caught.
  fg_event_anchor_update "$run_id" >/dev/null 2>&1 || true
  return 0
}

fg_run_exists() { [ -f "$(fg_control_dir "$1")/RUN_MANIFEST.json" ]; }

# ---------------------------------------------------------------------------
# Append-only hash-chained events
# ---------------------------------------------------------------------------

fg_events_file()  { printf '%s/EVENTS.jsonl\n' "$(fg_control_dir "$1")"; }
fg_event_anchor_file() { printf '%s/EVENTS.anchor.json\n' "$(fg_control_dir "$1")"; }
# The witness is an APPEND-ONLY log of anchors kept OUTSIDE the run root. Its
# purpose is prefix-immutability: the highest length ever witnessed, and the
# head digest at that length, must still be present in the live chain. That
# catches a wholesale rewrite as well as a truncation, which the in-run anchor
# alone cannot, because the in-run anchor is refreshed on every append.
fg_event_witness_file() {
  printf '%s/%s.%s.anchors.jsonl\n' "$FG_RF_EVENT_WITNESS_DIR" "$FG_RF_HOST" "$1"
}

fg_event_last_digest() {
  local f; f="$(fg_events_file "$1")"
  if [ ! -s "$f" ]; then printf '%s\n' "$FG_RF_EVENT_GENESIS"; return 0; fi
  tail -n 1 "$f" | jq -r '.digest // empty' 2>/dev/null
}

fg_event_count() {
  local f; f="$(fg_events_file "$1")"
  [ -s "$f" ] && awk 'END{print NR}' "$f" || echo 0
}

# fg_event_line_digest <run> <canonical_body> - the KEYED per-line digest.
# Recomputing it requires the run writer secret, so a chain cannot be rebuilt
# from public inputs alone (F-H02).
fg_event_line_digest() {
  local run="$1" body="$2" key
  key="$(fg_run_key "$run")"
  [ -n "$key" ] || { echo "NO_RUN_KEY"; return 1; }
  printf '%s' "$body" | jq -S -c . | fg_hmac_sha256 "$key"
}

# fg_event_anchor_update <run> - commit the current length and head digest.
# Written to control/ and, when a witness directory exists, mirrored outside
# the run root. A truncated tail no longer verifies, because the anchored
# length no longer matches the file.
fg_event_anchor_update() {
  local run="$1" n head a key body seal w
  key="$(fg_run_key "$run")"
  [ -n "$key" ] || return 1
  n="$(fg_event_count "$run")"
  head="$(fg_event_last_digest "$run")"
  [ -n "$head" ] || head="$FG_RF_EVENT_GENESIS"
  a="$(fg_event_anchor_file "$run")"
  body="$(jq -c -n --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" \
      --argjson n "$n" --arg head "$head" --arg ts "$(fg_now)" \
      '{schema_version:$sv, run_id:$run, event_count:$n, head_digest:$head, anchored_at:$ts}')" || return 1
  seal="$(printf '%s' "$body" | jq -S -c . | fg_hmac_sha256 "$key")"
  printf '%s' "$body" | jq -c --arg s "$seal" '. + {seal:$s}' | fg_atomic_write_json "$a" || return 1
  if [ -d "$FG_RF_EVENT_WITNESS_DIR" ]; then
    w="$(fg_event_witness_file "$run")"
    ( umask 077; jq -c . "$a" >> "$w" ) 2>/dev/null || true
  fi
  return 0
}

# fg_event_anchor_verify <run> <observed_count> <observed_head>
# EVENT_ANCHOR_OK | EVENT_ANCHOR_MISSING | EVENT_ANCHOR_UNSEALED |
# EVENT_CHAIN_TRUNCATED:<anchored>:<observed> | EVENT_ANCHOR_HEAD_MISMATCH |
# EVENT_ANCHOR_WITNESS_MISSING | EVENT_ANCHOR_WITNESS_MISMATCH
fg_event_anchor_verify() {
  local run="$1" n="$2" head="$3" a w key stored recomputed an ah
  a="$(fg_event_anchor_file "$run")"
  [ -f "$a" ] || { echo "EVENT_ANCHOR_MISSING"; return 1; }
  key="$(fg_run_key "$run")"
  [ -n "$key" ] || { echo "EVENT_ANCHOR_UNSEALED"; return 1; }
  stored="$(fg_json_get "$a" '.seal')"
  recomputed="$(jq -S -c 'del(.seal)' "$a" | fg_hmac_sha256 "$key")"
  [ -n "$stored" ] && [ "$stored" = "$recomputed" ] || { echo "EVENT_ANCHOR_UNSEALED"; return 1; }
  an="$(fg_json_get "$a" '.event_count')"
  ah="$(fg_json_get "$a" '.head_digest')"
  if [ "${an:-0}" -gt "${n:-0}" ]; then
    echo "EVENT_CHAIN_TRUNCATED:anchored_${an}:observed_${n}"; return 1
  fi
  if [ "${an:-0}" -ne "${n:-0}" ] || [ "$ah" != "$head" ]; then
    echo "EVENT_ANCHOR_HEAD_MISMATCH:anchored_${an}:observed_${n}"; return 1
  fi
  if [ -d "$FG_RF_EVENT_WITNESS_DIR" ]; then
    w="$(fg_event_witness_file "$run")"
    [ -f "$w" ] || { echo "EVENT_ANCHOR_WITNESS_MISSING"; return 1; }
    local wn wh live conflict
    # A length may only ever have been witnessed with ONE head digest. Two
    # different heads at the same length is a rewrite: the attacker emptied the
    # log and rebuilt it, and the witness recorded both histories.
    conflict="$(jq -s -r '
        group_by(.event_count)
        | map(select((map(.head_digest) | unique | length) > 1) | .[0].event_count)
        | first // empty' "$w" 2>/dev/null)"
    [ -z "$conflict" ] || { echo "EVENT_CHAIN_REWRITTEN:conflicting_head_at_${conflict}"; return 1; }

    wn="$(jq -s 'map(.event_count) | max // 0' "$w" 2>/dev/null)"; wn="${wn:-0}"
    wh="$(jq -s -r --argjson n "$wn" 'map(select(.event_count == $n)) | last | .head_digest // ""' "$w" 2>/dev/null)"
    if [ "${wn:-0}" -gt "${n:-0}" ]; then
      echo "EVENT_CHAIN_TRUNCATED:witnessed_${wn}:observed_${n}"; return 1
    fi
    # Prefix immutability: the line at the highest witnessed length must still
    # carry the witnessed head digest.
    if [ "${wn:-0}" -gt 0 ] && [ -n "$wh" ]; then
      live="$(sed -n "${wn}p" "$(fg_events_file "$run")" 2>/dev/null | jq -r '.digest // ""' 2>/dev/null)"
      [ "$live" = "$wh" ] || { echo "EVENT_CHAIN_REWRITTEN:witnessed_head_at_${wn}"; return 1; }
    fi
  fi
  echo "EVENT_ANCHOR_OK"
  return 0
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

  digest="$(fg_event_line_digest "$run_id" "$body")" || return 1
  printf '%s\n' "$(printf '%s' "$body" | jq -c --arg d "$digest" '. + {digest:$d}')" >> "$f"
  fg_event_anchor_update "$run_id" >/dev/null 2>&1 || true
}

# fg_events_verify <run_id> - recompute the keyed chain and check it against
# the committed length and head. Insertion, deletion, in-place edit, tail
# truncation and wholesale rewrite are all named refusals.
fg_events_verify() {
  local run_id="$1" f prev line seq expect_seq body digest claimed anchor n
  f="$(fg_events_file "$run_id")"
  [ -f "$f" ] || { echo "EVENTS_MISSING"; return 1; }
  [ -n "$(fg_run_key "$run_id")" ] || { echo "EVENT_CHAIN_UNKEYED"; return 1; }
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
    if [ "$(printf '%s' "$line" | jq -r '.run_id')" != "$run_id" ]; then
      echo "EVENT_CHAIN_BROKEN:seq_${seq}:run_id_mismatch"; return 1
    fi
    claimed="$(printf '%s' "$line" | jq -r '.digest')"
    body="$(printf '%s' "$line" | jq -c 'del(.digest)')"
    digest="$(fg_event_line_digest "$run_id" "$body")"
    if [ "$claimed" != "$digest" ]; then
      echo "EVENT_CHAIN_BROKEN:seq_${seq}:digest_mismatch"; return 1
    fi
    prev="$claimed"
    expect_seq=$(( expect_seq + 1 ))
  done < "$f"
  n=$(( expect_seq - 1 ))
  anchor="$(fg_event_anchor_verify "$run_id" "$n" "$prev")"
  [ "$anchor" = "EVENT_ANCHOR_OK" ] || { printf '%s\n' "$anchor"; return 1; }
  echo "EVENT_CHAIN_OK:${n}"
  return 0
}

# fg_events_count_type <run> <type> [task] - authoritative counter derived from
# the keyed chain rather than from a rewritable ledger (F-H01).
fg_events_count_type() {
  local run="$1" type="$2" task="${3:-}" f
  f="$(fg_events_file "$run")"
  [ -f "$f" ] || { echo 0; return 0; }
  jq -s --arg t "$type" --arg k "$task" \
    '[ .[] | select(.type == $t) | select($k == "" or .task_id == $k) ] | length' "$f" 2>/dev/null || echo 0
}

# ---------------------------------------------------------------------------
# Task state records
# ---------------------------------------------------------------------------

fg_task_file() { printf '%s/%s.state.json\n' "$(fg_queue_dir "$1")" "$2"; }

# fg_task_create <run> <task> <lane> <role> <repo> <branch> <base_sha> <base_tree>
#
# Identifiers are validated against a strict allowlist HERE, at creation time,
# before any of them can reach a filesystem path or a command string. A task id
# containing shell metacharacters is refused outright (F-J01); it is never
# quoted-and-accepted, because a task id is not free text.
fg_task_create() {
  local run="$1" task="$2" lane="$3" role="$4" repo="$5" branch="$6" base_sha="$7" base_tree="$8"
  local f nb
  fg_id_require run "$run"   || return 1
  fg_id_require task "$task" || return 1
  fg_id_require lane "$lane" || return 1
  fg_id_require role "$role" || return 1
  nb="$(fg_branch_normalise "$branch")" || { printf '%s\n' "INVALID_BRANCH"; return 1; }
  branch="$nb"
  f="$(fg_task_file "$run" "$task")"
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

#
# The ledger is a CACHE, not the authority. The authoritative attempt count is
# derived from the keyed event chain (F-H01): resetting the ledger with jq no
# longer restores budget, because fg_retry_used takes the MAXIMUM of the
# ledger's count and the number of matching events in the chain, and the chain
# is both keyed and length-anchored. The ledger additionally carries a keyed
# seal so a naive edit is visible on its own.
#
# HONEST SCOPE: an actor holding control/.writer_secret can append fabricated
# events, re-seal the ledger and re-anchor the chain. This raises the bar; it
# does not eliminate the class.

fg_retry_file() { printf '%s/RETRY_LEDGER.json\n' "$(fg_control_dir "$1")"; }

fg_retry_seal() {
  local run="$1" f seal
  f="$(fg_retry_file "$run")"
  [ -f "$f" ] || return 1
  seal="$(fg_hmac_json_canonical "$run" "$f" seal)" || return 1
  jq --arg s "$seal" '. + {seal:$s}' "$f" | fg_atomic_write_json "$f"
}

# fg_retry_seal_verify <run> - RETRY_LEDGER_OK | RETRY_LEDGER_UNSEALED |
# RETRY_LEDGER_MISSING
fg_retry_seal_verify() {
  local run="$1" f stored recomputed
  f="$(fg_retry_file "$run")"
  [ -f "$f" ] || { echo "RETRY_LEDGER_MISSING"; return 1; }
  stored="$(fg_json_get "$f" '.seal')"
  recomputed="$(fg_hmac_json_canonical "$run" "$f" seal)"
  [ -n "$stored" ] && [ "$stored" = "$recomputed" ] || { echo "RETRY_LEDGER_UNSEALED"; return 1; }
  echo "RETRY_LEDGER_OK"
  return 0
}

fg_retry_ensure_task() {
  local run="$1" task="$2" f out
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" \
    'if (.tasks[$t] == null) then .tasks[$t] = {correction_attempts:0, context_restarts:0, correction_limit:.defaults.correction_limit, context_restart_limit:.defaults.context_restart_limit} else . end' \
    "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_retry_seal "$run" >/dev/null 2>&1 || true
  return 0
}

fg_retry_get() { fg_json_get "$(fg_retry_file "$1")" ".tasks[\"$2\"].$3"; }

# fg_retry_used <run> <task> <correction_attempts|context_restarts>
# The AUTHORITATIVE count: max(ledger cache, keyed event-chain count).
fg_retry_used() {
  local run="$1" task="$2" field="$3" cached chained type
  case "$field" in
    correction_attempts) type="correction_attempt" ;;
    context_restarts)    type="context_restart" ;;
    *) fg_retry_get "$run" "$task" "$field"; return 0 ;;
  esac
  cached="$(fg_retry_get "$run" "$task" "$field")"; cached="${cached:-0}"
  chained="$(fg_events_count_type "$run" "$type" "$task")"; chained="${chained:-0}"
  if [ "$chained" -gt "$cached" ]; then printf '%s\n' "$chained"; else printf '%s\n' "$cached"; fi
}

fg_retry_bump_correction() {
  local run="$1" task="$2" f out
  fg_retry_ensure_task "$run" "$task" || return 1
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" '.tasks[$t].correction_attempts += 1 | del(.seal)' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_retry_seal "$run" >/dev/null 2>&1 || true
  fg_event_append "$run" "correction_attempt" "orchestrator" "$task" \
    "$(jq -n --argjson n "$(fg_retry_get "$run" "$task" correction_attempts)" '{correction_attempts:$n}')"
}

fg_retry_bump_context_restart() {
  local run="$1" task="$2" f out
  fg_retry_ensure_task "$run" "$task" || return 1
  f="$(fg_retry_file "$run")"
  out="$(jq --arg t "$task" '.tasks[$t].context_restarts += 1 | del(.seal)' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_retry_seal "$run" >/dev/null 2>&1 || true
  fg_task_update "$run" "$task" ".context_restarts=$(fg_retry_get "$run" "$task" context_restarts)" || return 1
  fg_event_append "$run" "context_restart" "orchestrator" "$task" \
    "$(jq -n --argjson n "$(fg_retry_get "$run" "$task" context_restarts)" '{context_restarts:$n}')"
}

fg_retry_correction_available() {
  local run="$1" task="$2" used limit
  fg_retry_ensure_task "$run" "$task" || return 1
  used="$(fg_retry_used "$run" "$task" correction_attempts)"
  limit="$(fg_retry_get "$run" "$task" correction_limit)"
  [ "${used:-0}" -lt "${limit:-0}" ]
}

fg_retry_context_available() {
  local run="$1" task="$2" used limit
  fg_retry_ensure_task "$run" "$task" || return 1
  used="$(fg_retry_used "$run" "$task" context_restarts)"
  limit="$(fg_retry_get "$run" "$task" context_restart_limit)"
  [ "${used:-0}" -lt "${limit:-0}" ]
}

# ---------------------------------------------------------------------------
# Consumed founder receipt ledger (durable one-time use)
# ---------------------------------------------------------------------------
#
# A founder receipt nonce is spent exactly once. The record is kept in TWO
# places that must agree: this keyed ledger, and a founder_receipt_consumed
# event in the keyed, length-anchored chain. Deleting the ledger does NOT
# re-enable a receipt: fg_receipt_ledger_verify returns
# CONSUMED_LEDGER_MISSING and every consumer treats that as a closed refusal,
# never as "not yet used".

fg_receipt_ledger_file() { printf '%s/CONSUMED_RECEIPTS.json\n' "$(fg_control_dir "$1")"; }

fg_receipt_ledger_seal() {
  local run="$1" f seal
  f="$(fg_receipt_ledger_file "$run")"
  [ -f "$f" ] || return 1
  seal="$(fg_hmac_json_canonical "$run" "$f" seal)" || return 1
  jq --arg s "$seal" '. + {seal:$s}' "$f" | fg_atomic_write_json "$f"
}

# CONSUMED_LEDGER_OK | CONSUMED_LEDGER_MISSING | CONSUMED_LEDGER_UNREADABLE |
# CONSUMED_LEDGER_UNSEALED | CONSUMED_LEDGER_DESYNC
fg_receipt_ledger_verify() {
  local run="$1" f stored recomputed in_ledger in_chain
  f="$(fg_receipt_ledger_file "$run")"
  [ -f "$f" ] || { echo "CONSUMED_LEDGER_MISSING"; return 1; }
  [ -r "$f" ] || { echo "CONSUMED_LEDGER_UNREADABLE"; return 1; }
  jq -e . "$f" >/dev/null 2>&1 || { echo "CONSUMED_LEDGER_UNREADABLE"; return 1; }
  stored="$(fg_json_get "$f" '.seal')"
  recomputed="$(fg_hmac_json_canonical "$run" "$f" seal)"
  [ -n "$stored" ] && [ "$stored" = "$recomputed" ] || { echo "CONSUMED_LEDGER_UNSEALED"; return 1; }
  # The ledger and the keyed event chain must agree on how many receipts were
  # spent. Truncating one of them is therefore not enough.
  in_ledger="$(jq -r '.consumed | length' "$f" 2>/dev/null || echo 0)"
  in_chain="$(fg_events_count_type "$run" "founder_receipt_consumed")"
  [ "${in_ledger:-0}" -ge "${in_chain:-0}" ] || { echo "CONSUMED_LEDGER_DESYNC"; return 1; }
  echo "CONSUMED_LEDGER_OK"
  return 0
}

# fg_receipt_nonce_spent <run> <nonce> - true when already consumed.
fg_receipt_nonce_spent() {
  local run="$1" nonce="$2" f
  f="$(fg_receipt_ledger_file "$run")"
  [ -f "$f" ] || return 1
  jq -e --arg n "$nonce" '[.consumed[]? | select(.nonce == $n)] | length > 0' "$f" >/dev/null 2>&1
}

# fg_receipt_nonce_record <run> <nonce> <task> <action> <sha> <tree>
fg_receipt_nonce_record() {
  local run="$1" nonce="$2" task="$3" action="$4" sha="$5" tree="$6" f out
  f="$(fg_receipt_ledger_file "$run")"
  [ -f "$f" ] || return 1
  out="$(jq --arg n "$nonce" --arg t "$task" --arg a "$action" --arg s "$sha" \
            --arg tr "$tree" --arg ts "$(fg_now)" \
    'del(.seal) | .consumed += [{nonce:$n, task_id:$t, action:$a, candidate_sha:$s,
      candidate_tree:$tr, consumed_at:$ts}]' "$f")" || return 1
  printf '%s\n' "$out" | fg_atomic_write_json "$f" || return 1
  fg_receipt_ledger_seal "$run" || return 1
  fg_event_append "$run" "founder_receipt_consumed" "merge-sheriff" "$task" \
    "$(jq -n --arg n "$nonce" --arg a "$action" --arg s "$sha" \
       '{nonce:$n, action:$a, candidate_sha:$s, one_time:true}')" >/dev/null
  return 0
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
# (which carries its own keyed chain and anchor) and the writer secret. The
# manifest itself carries a keyed MAC in SHA256SUMS.mac, so regenerating it
# requires the run writer secret rather than two lines of shell.
fg_seal_checksums() {
  local run="$1" root ctl
  root="$(fg_run_dir "$run")"
  ctl="$(fg_control_dir "$run")"
  ( cd "$root" && \
    find control queue leases roles handoffs reports founder-gates -type f 2>/dev/null \
      | grep -v 'control/SHA256SUMS.txt' \
      | grep -v 'control/SHA256SUMS.mac' \
      | grep -v 'control/EVENTS.jsonl' \
      | grep -v 'control/.writer_secret' \
      | LC_ALL=C sort \
      | while IFS= read -r rel; do shasum -a 256 "$rel"; done ) \
    | fg_atomic_write "${ctl}/SHA256SUMS.txt"
  fg_hmac_sha256 "$(fg_run_key "$run")" < "${ctl}/SHA256SUMS.txt" > "${ctl}/SHA256SUMS.mac" 2>/dev/null || true
}

# fg_verify_checksums <run> - CHECKSUMS_OK | CHECKSUMS_MISMATCH:<file> |
# CHECKSUMS_MANIFEST_UNSEALED
fg_verify_checksums() {
  local run="$1" root ctl line want got rel mac
  root="$(fg_run_dir "$run")"
  ctl="$(fg_control_dir "$run")"
  [ -f "${ctl}/SHA256SUMS.txt" ] || { echo "CHECKSUMS_MISSING"; return 1; }
  if [ -f "${ctl}/SHA256SUMS.mac" ]; then
    mac="$(fg_hmac_sha256 "$(fg_run_key "$run")" < "${ctl}/SHA256SUMS.txt")"
    [ "$mac" = "$(cat "${ctl}/SHA256SUMS.mac" 2>/dev/null)" ] || {
      echo "CHECKSUMS_MANIFEST_UNSEALED"; return 1; }
  fi
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
