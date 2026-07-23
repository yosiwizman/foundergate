#!/usr/bin/env bash
# FounderGate role floor - role separation, candidate freeze, sequencing,
# bounded continuation, and context recovery.
#
# ---------------------------------------------------------------------------
# WHAT ROLE SEPARATION IS, AND WHAT IT IS NOT
# ---------------------------------------------------------------------------
#
# Four tmux windows are four transcripts. They are NOT four security
# principals, and this package no longer claims they are.
#
# What is mechanically enforced:
#   * The artifact-class table. A Builder presenting a Builder capability
#     cannot write a checker_verdict: that is ROLE_FORGERY_REJECTED before any
#     credential is even examined.
#   * A per-launch, single-use CAPABILITY that is never written to a reusable
#     file and never derivable from anything on disk. The old design stored
#     sha256(run|task|role|prompt_digest|session_id|writer_secret) in
#     <role>.token.secret; every input was same-user readable, so a Builder
#     could either copy the file or recompute the value. The capability is now
#     32 random bytes generated at launch, handed to the launched process ONCE
#     over a mode-0600 FIFO that is unlinked on first read, and represented on
#     disk only by a keyed commitment. Copying the commitment confers nothing.
#   * Binding of the capability to run, task, role, prompt digest, session id,
#     candidate sha/tree, the issuing event-chain position, a launch nonce and
#     an expiry, with relaunch invalidating every earlier capability.
#   * Every consuming gate re-verifies the artifact's keyed MAC and its
#     embedded run_id/task_id IMMEDIATELY before it decides, so a payload
#     swapped after an earlier check is not used.
#
# What is NOT enforced, stated plainly:
#   * This is not a boundary against a hostile process running as the same
#     macOS user. Such a process can read control/.writer_secret and recompute
#     every keyed seal here; it can read the launched process's environment;
#     and it can call these library functions directly. Real role isolation
#     requires separate OS users with filesystem ACLs on the run root, or
#     separate machines. Neither is implemented.
#   * Consequently: role separation on one user account is ACCIDENT RESISTANCE
#     plus an audit trail, not forgery resistance. The one authority that does
#     survive a fully compromised same-user account is the founder decision
#     receipt, because forging it needs a private key this machine never holds.
set -u

# shellcheck source=./leases.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/leases.sh"

FG_RF_CONTEXT_SIGNATURE="${FG_RF_CONTEXT_SIGNATURE:-context low|context limit reached|context window exhausted|prompt is too long}"

# ---------------------------------------------------------------------------
# Role / artifact authority table
# ---------------------------------------------------------------------------

# The authority table comes from the loaded host profile, never from a
# hard-coded list, so m1 and m4 share one enforcement path.
fg_role_allowed_classes() {
  fg_host_require || { echo ""; return 1; }
  fg_host_role_writes "$1"
}

# A sealed class has no writer on this host at all.
#   m1: merge_receipt, integration_write, final_verification_report, ...
#   m4: signature_receipt, activation_receipt, deployment_receipt
fg_class_is_sealed() { fg_host_require || return 0; fg_host_class_sealed "$1"; }

fg_role_can_write() {
  local role="$1" class="$2" c
  fg_class_is_sealed "$class" && return 1
  for c in $(fg_role_allowed_classes "$role"); do
    [ "$c" = "$class" ] && return 0
  done
  return 1
}

fg_role_artifact_path() {
  local run="$1" task="$2" class="$3" d
  d="$(fg_roles_dir "$run")/${task}"
  case "$class" in
    builder_report)   printf '%s/builder.report.json\n' "$d" ;;
    candidate_freeze) printf '%s/candidate.json\n' "$d" ;;
    checker_verdict)  printf '%s/checker.verdict.json\n' "$d" ;;
    checker_report)   printf '%s/checker.report.json\n' "$d" ;;
    advisor_packet)   printf '%s/advisor.packet.json\n' "$d" ;;
    integration_write)          printf '%s/integration.write.json\n' "$d" ;;
    integration_report)         printf '%s/integration.report.json\n' "$d" ;;
    final_verification_report)  printf '%s/final.verification.json\n' "$d" ;;
    merge_receipt)              printf '%s/merge.receipt.json\n' "$d" ;;
    lane_contract)    printf '%s/lane.contract.json\n' "$d" ;;
    dispatch)         printf '%s/dispatch.json\n' "$d" ;;
    handoff)          printf '%s/handoff.latest.json\n' "$d" ;;
    status)           printf '%s/status.json\n' "$d" ;;
    founder_packet_request) printf '%s/founder.packet.request.json\n' "$d" ;;
    *)                printf '%s/UNKNOWN.%s.json\n' "$d" "$class" ;;
  esac
}

# ---------------------------------------------------------------------------
# Per-launch role capabilities
# ---------------------------------------------------------------------------
#
# A capability is 32 random bytes. It is NEVER stored in a reusable file and
# NEVER placed in the issuing process's environment. Disk holds only
# <role>.cap.json, whose cap_commit is HMAC(run key, canonical binding | cap):
# reading it tells an attacker nothing it can present, and the capability
# cannot be recomputed from any combination of on-disk values.
#
# Delivery is a one-shot FIFO created mode 0600 by the issuer and unlinked by
# the launched process on first read. A second reader gets nothing.
#
# HONEST SCOPE: once delivered, the capability lives in the launched process's
# environment, which another process running as the same user can read; and any
# same-user process can call fg_role_capability_issue itself. Issuance is
# recorded in the keyed event chain naming the issuing pid, so ad-hoc issuance
# is DETECTABLE, not prevented. Detection is not prevention. Say so.

FG_RF_ROLE_CAP_TTL="${FG_RF_ROLE_CAP_TTL:-7200}"

fg_role_cap_file()  { printf '%s/%s/%s.cap.json\n' "$(fg_roles_dir "$1")" "$2" "$3"; }
fg_role_cap_fifo()  { printf '%s/%s/.%s.cap.fifo\n' "$(fg_roles_dir "$1")" "$2" "$3"; }

fg_role_cap_commit() {
  local run="$1" binding="$2" cap="$3" key
  key="$(fg_run_key "$run")"
  [ -n "$key" ] || { echo "NO_RUN_KEY"; return 1; }
  printf '%s|%s' "$(printf '%s' "$binding" | jq -S -c .)" "$cap" | fg_hmac_sha256 "$key"
}

# fg_role_capability_issue <run> <task> <role> <prompt_digest> <session_id> [ttl]
#
# Emits the capability on stdout for the issuer to deliver. Any capability
# previously issued for this (task, role) is invalidated by being overwritten
# with a new launch nonce (F-C05).
fg_role_capability_issue() {
  local run="$1" task="$2" role="$3" pd="$4" sid="$5" ttl="${6:-$FG_RF_ROLE_CAP_TTL}"
  local d cap binding commit now nonce
  fg_id_require run "$run"   || return 1
  fg_id_require task "$task" || return 1
  fg_id_require role "$role" || return 1
  [ -n "$(fg_run_key "$run")" ] || { echo "NO_RUN_KEY"; return 1; }

  d="$(fg_roles_dir "$run")/${task}"
  mkdir -p "$d"; chmod 0700 "$d" 2>/dev/null || true
  cap="$(head -c 32 /dev/urandom | shasum -a 256 | awk '{print $1}')"
  nonce="$(head -c 16 /dev/urandom | shasum -a 256 | awk '{print $1}' | cut -c1-32)"
  now="$(fg_epoch)"

  binding="$(jq -c -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" --arg role "$role" \
    --arg pd "$pd" --arg sid "$sid" --arg nonce "$nonce" \
    --arg csha "$(fg_task_get "$run" "$task" candidate_sha)" \
    --arg ctree "$(fg_task_get "$run" "$task" candidate_tree)" \
    --arg host "$FG_RF_HOST" \
    --argjson seq "$(fg_event_count "$run")" \
    --arg head "$(fg_event_last_digest "$run")" \
    --argjson now "$now" --argjson exp "$(( now + ttl ))" \
    --argjson pid "$$" \
    '{schema_version:$sv, run_id:$run, task_id:$task, role:$role, host_profile:$host,
      prompt_digest:$pd, session_id:$sid, launch_nonce:$nonce,
      candidate_sha:$csha, candidate_tree:$ctree,
      issue_event_seq:$seq, issue_chain_head:$head,
      issued_at_epoch:$now, not_after_epoch:$exp, issuer_pid:$pid}')" || return 1

  commit="$(fg_role_cap_commit "$run" "$binding" "$cap")" || return 1
  printf '%s' "$binding" | jq -c --arg c "$commit" '. + {cap_commit:$c}' \
    | fg_atomic_write_json "$(fg_role_cap_file "$run" "$task" "$role")" || return 1
  chmod 0600 "$(fg_role_cap_file "$run" "$task" "$role")" 2>/dev/null || true

  fg_event_append "$run" "role_capability_issued" "$role" "$task" \
    "$(jq -n --arg n "$nonce" --arg pd "$pd" --argjson pid "$$" \
       '{launch_nonce:$n, prompt_digest:$pd, issuer_pid:$pid, single_use:true}')" >/dev/null
  printf '%s\n' "$cap"
  return 0
}

# fg_role_capability_deliver <run> <task> <role> <cap>
# Opens a one-shot FIFO and writes the capability into it exactly once, in the
# background. The reader unlinks the FIFO. Nothing is written to a file.
fg_role_capability_deliver() {
  local run="$1" task="$2" role="$3" cap="$4" fifo
  fifo="$(fg_role_cap_fifo "$run" "$task" "$role")"
  rm -f "$fifo"
  ( umask 077; mkfifo -m 0600 "$fifo" 2>/dev/null ) || { echo "CAP_CHANNEL_FAILED"; return 1; }
  ( printf '%s\n' "$cap" > "$fifo" 2>/dev/null; rm -f "$fifo" 2>/dev/null ) &
  printf '%s\n' "$fifo"
  return 0
}

# fg_role_capability_verify <run> <task> <role> <cap>
# ROLE_CAPABILITY_OK | ROLE_CAPABILITY_MISSING | ROLE_CAPABILITY_INVALID |
# ROLE_CAPABILITY_EXPIRED | ROLE_CAPABILITY_WRONG_RUN | ROLE_CAPABILITY_WRONG_TASK |
# ROLE_CAPABILITY_WRONG_ROLE | ROLE_CAPABILITY_SUPERSEDED
fg_role_capability_verify() {
  local run="$1" task="$2" role="$3" cap="$4" f stored binding recomputed exp now pd live_pd
  f="$(fg_role_cap_file "$run" "$task" "$role")"
  [ -f "$f" ] || { echo "ROLE_CAPABILITY_MISSING"; return 1; }
  [ -n "$cap" ] || { echo "ROLE_CAPABILITY_INVALID"; return 1; }

  # The record must describe THIS run, task and role. A copied capability
  # record from another run or task is refused on its own contents (F-C04).
  [ "$(fg_json_get "$f" '.run_id')"  = "$run" ]  || { echo "ROLE_CAPABILITY_WRONG_RUN"; return 1; }
  [ "$(fg_json_get "$f" '.task_id')" = "$task" ] || { echo "ROLE_CAPABILITY_WRONG_TASK"; return 1; }
  [ "$(fg_json_get "$f" '.role')"    = "$role" ] || { echo "ROLE_CAPABILITY_WRONG_ROLE"; return 1; }

  stored="$(fg_json_get "$f" '.cap_commit')"
  binding="$(jq -c 'del(.cap_commit)' "$f")" || { echo "ROLE_CAPABILITY_INVALID"; return 1; }
  recomputed="$(fg_role_cap_commit "$run" "$binding" "$cap")" || { echo "ROLE_CAPABILITY_INVALID"; return 1; }
  [ -n "$stored" ] && [ "$stored" = "$recomputed" ] || { echo "ROLE_CAPABILITY_INVALID"; return 1; }

  exp="$(fg_json_get "$f" '.not_after_epoch')"; now="$(fg_epoch)"
  if [ -n "$exp" ] && [ "$now" -gt "$exp" ]; then echo "ROLE_CAPABILITY_EXPIRED"; return 1; fi

  # A relaunch mints a new prompt digest and a new launch nonce; a capability
  # whose prompt digest no longer matches the task's live launch is stale.
  pd="$(fg_json_get "$f" '.prompt_digest')"
  live_pd="$(fg_task_get "$run" "$task" prompt_digest)"
  if [ -n "$live_pd" ] && [ -n "$pd" ] && [ "$live_pd" != "$pd" ] && \
     [ "$(fg_task_get "$run" "$task" role)" = "$role" ]; then
    echo "ROLE_CAPABILITY_SUPERSEDED"; return 1
  fi

  echo "ROLE_CAPABILITY_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Role-scoped result writer
# ---------------------------------------------------------------------------

# fg_role_result_write <run> <task> <role> <class> <capability>  (payload stdin)
#
# RESULT_WRITTEN:<report_digest>
# ROLE_FORGERY_REJECTED | M4_AUTHORITY_SEALED | ROLE_CAPABILITY_* |
# RESULT_WRITE_FAILED
fg_role_result_write() {
  local run="$1" task="$2" role="$3" class="$4" token="$5"
  local payload dest report_digest artifact_mac seq tokcheck pd sid tdir gate capnonce

  fg_id_require run "$run"   || { echo "RESULT_WRITE_FAILED"; return 1; }
  fg_id_require task "$task" || { echo "RESULT_WRITE_FAILED"; return 1; }
  fg_id_require role "$role" || { echo "RESULT_WRITE_FAILED"; return 1; }

  payload="$(cat)"
  printf '%s' "$payload" | jq -e . >/dev/null 2>&1 || { echo "RESULT_WRITE_FAILED"; return 1; }

  if fg_class_is_sealed "$class"; then
    fg_event_append "$run" "authority_sealed" "$role" "$task" \
      "$(jq -n --arg c "$class" --arg r "$role" --arg h "$FG_RF_HOST" \
         '{reason:"M4_AUTHORITY_SEALED", artifact_class:$c, attempted_by:$r, host_profile:$h}')" >/dev/null
    echo "M4_AUTHORITY_SEALED"; return 1
  fi


  if ! fg_role_can_write "$role" "$class"; then
    fg_event_append "$run" "role_forgery_rejected" "$role" "$task" \
      "$(jq -n --arg c "$class" --arg r "$role" \
         '{reason:"ROLE_FORGERY_REJECTED", artifact_class:$c, attempted_by:$r}')" >/dev/null
    echo "ROLE_FORGERY_REJECTED"; return 1
  fi

  # Only once the role is entitled to the class do we test the merge gate, so
  # an unentitled role is answered as forgery rather than as an ungated merge.
  # The gate is re-evaluated HERE, immediately before the write, rather than
  # relying on any earlier check.
  if [ "$class" = "merge_receipt" ]; then
    gate="$(fg_merge_sheriff_gate "$run" "$task")"
    if [ "$gate" != "MERGE_GATE_OPEN" ]; then
      fg_event_append "$run" "merge_refused" "$role" "$task" \
        "$(jq -n --arg g "$gate" '{reason:$g, executed:false}')" >/dev/null
      echo "$gate"; return 1
    fi
    # Spend the founder receipt exactly once, at the moment its authority is
    # used. A replay of the same receipt for a second merge receipt fails.
    if fg_host_requires_founder_receipt_for_merge; then
      local fvf fsha ftree consumed
      fvf="$(fg_role_artifact_path "$run" "$task" final_verification_report)"
      fsha="$(fg_json_get "$fvf" '.payload.final_sha')"
      ftree="$(fg_json_get "$fvf" '.payload.final_tree')"
      consumed="$(fg_founder_receipt_consume "$run" "$task" "$fsha" "$ftree" merge)"
      if [ "$consumed" != "FOUNDER_RECEIPT_CONSUMED" ]; then
        fg_event_append "$run" "merge_refused" "$role" "$task" \
          "$(jq -n --arg g "$consumed" '{reason:$g, executed:false}')" >/dev/null
        echo "MERGE_REFUSED_${consumed}"; return 1
      fi
    fi
  fi

  # The capability, not a copyable token file. A Builder holding only its own
  # capability, or a copied capability record, or a recomputed digest of
  # on-disk values, fails here.
  tokcheck="$(fg_role_capability_verify "$run" "$task" "$role" "$token")" || {
    fg_event_append "$run" "role_write_rejected" "$role" "$task" \
      "$(jq -n --arg c "$tokcheck" '{reason:$c}')" >/dev/null
    echo "$tokcheck"; return 1; }

  tdir="$(fg_roles_dir "$run")/${task}"
  pd="$(fg_json_get "$(fg_role_cap_file "$run" "$task" "$role")" '.prompt_digest')"
  sid="$(fg_json_get "$(fg_role_cap_file "$run" "$task" "$role")" '.session_id')"
  capnonce="$(fg_json_get "$(fg_role_cap_file "$run" "$task" "$role")" '.launch_nonce')"
  report_digest="$(printf '%s' "$payload" | jq -S -c . | fg_sha256_stdin)"
  seq=$(( $(fg_event_count "$run") + 1 ))
  dest="$(fg_role_artifact_path "$run" "$task" "$class")"

  jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" \
    --arg role "$role" --arg class "$class" --arg pd "$pd" --arg sid "$sid" \
    --arg cn "$capnonce" --arg host "$FG_RF_HOST" \
    --arg rd "$report_digest" --arg ts "$(fg_now)" --argjson seq "$seq" \
    --arg csha "$(fg_task_get "$run" "$task" candidate_sha)" \
    --arg ctree "$(fg_task_get "$run" "$task" candidate_tree)" \
    --argjson payload "$payload" \
    '{schema_version:$sv, run_id:$run, task_id:$task, role:$role,
      artifact_class:$class, host_profile:$host, prompt_digest:$pd, session_id:$sid,
      launch_nonce:$cn,
      candidate_sha:(if $csha=="" then null else $csha end),
      candidate_tree:(if $ctree=="" then null else $ctree end),
      report_digest:$rd, event_seq:$seq, written_at:$ts, payload:$payload}' \
    | fg_atomic_write_json "$dest" || { echo "RESULT_WRITE_FAILED"; return 1; }

  # Keyed seal over the WHOLE artifact, not an unkeyed self-digest of its own
  # payload. Recomputing it after a payload swap needs the run key (F-C03).
  artifact_mac="$(fg_hmac_json_canonical "$run" "$dest" artifact_mac)" || {
    echo "RESULT_WRITE_FAILED"; return 1; }
  jq --arg m "$artifact_mac" '. + {artifact_mac:$m}' "$dest" | fg_atomic_write_json "$dest" || {
    echo "RESULT_WRITE_FAILED"; return 1; }

  fg_event_append "$run" "role_result" "$role" "$task" \
    "$(jq -n --arg c "$class" --arg d "$report_digest" --arg m "$artifact_mac" \
       '{artifact_class:$c, report_digest:$d, artifact_mac:$m}')" >/dev/null
  echo "RESULT_WRITTEN:${report_digest}"
  return 0
}

# fg_role_result_verify <run> <task> <class>
#
# Called IMMEDIATELY before every consuming decision, never once at write time.
# Checks, in order: the keyed artifact MAC, the unkeyed payload digest, and the
# artifact's own embedded run_id / task_id / artifact_class against the run and
# task being evaluated -- so a whole run directory copied to a new run id is
# refused on its own contents (F-C04).
#
# RESULT_BINDING_OK | RESULT_MISSING | RESULT_BINDING_INVALID |
# RESULT_MAC_INVALID | RESULT_WRONG_RUN | RESULT_WRONG_TASK | RESULT_WRONG_CLASS
fg_role_result_verify() {
  local run="$1" task="$2" class="$3" f stored recomputed mac_stored mac_recomputed
  f="$(fg_role_artifact_path "$run" "$task" "$class")"
  [ -f "$f" ] || { echo "RESULT_MISSING"; return 1; }

  mac_stored="$(fg_json_get "$f" '.artifact_mac')"
  mac_recomputed="$(fg_hmac_json_canonical "$run" "$f" artifact_mac)"
  [ -n "$mac_stored" ] && [ "$mac_stored" = "$mac_recomputed" ] || {
    echo "RESULT_MAC_INVALID"; return 1; }

  stored="$(fg_json_get "$f" '.report_digest')"
  recomputed="$(jq -S -c '.payload' "$f" | fg_sha256_stdin)"
  [ "$stored" = "$recomputed" ] || { echo "RESULT_BINDING_INVALID"; return 1; }

  [ "$(fg_json_get "$f" '.run_id')"         = "$run" ]   || { echo "RESULT_WRONG_RUN"; return 1; }
  [ "$(fg_json_get "$f" '.task_id')"        = "$task" ]  || { echo "RESULT_WRONG_TASK"; return 1; }
  [ "$(fg_json_get "$f" '.artifact_class')" = "$class" ] || { echo "RESULT_WRONG_CLASS"; return 1; }

  echo "RESULT_BINDING_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Candidate freeze
# ---------------------------------------------------------------------------

# fg_candidate_freeze <run> <task> <repo> <builder_token>
# CANDIDATE_FROZEN:<sha>:<tree> | CANDIDATE_DIRTY | CANDIDATE_FREEZE_FAILED
fg_candidate_freeze() {
  local run="$1" task="$2" repo="$3" token="$4"
  local sha tree parent branch base diff_digest changed clean remote report_digest out

  if ! fg_git_is_clean "$repo"; then
    fg_event_append "$run" "candidate_refused" "builder" "$task" \
      '{"reason":"CANDIDATE_DIRTY"}' >/dev/null
    echo "CANDIDATE_DIRTY"; return 1
  fi

  sha="$(fg_git_head_sha "$repo")"
  tree="$(fg_git_head_tree "$repo")"
  branch="$(fg_git_branch "$repo")"
  parent="$(git -C "$repo" rev-parse 'HEAD^' 2>/dev/null || echo "")"
  base="$(fg_task_get "$run" "$task" base_sha)"
  [ -n "$base" ] || base="$parent"
  diff_digest="$(fg_git_diff_digest "$repo" "$base" "$sha")"
  changed="$(fg_git_changed_files "$repo" "$base" "$sha" | jq -R -s 'split("\n")|map(select(length>0))')"
  clean=true
  remote="$(git -C "$repo" remote get-url --push origin 2>/dev/null || echo "NONE")"
  report_digest="$(fg_json_get "$(fg_role_artifact_path "$run" "$task" builder_report)" '.report_digest')"

  out="$(jq -n \
    --arg sha "$sha" --arg tree "$tree" --arg parent "$parent" --arg branch "$branch" \
    --arg base "$base" --arg dd "$diff_digest" --argjson changed "$changed" \
    --argjson clean "$clean" --arg remote "$remote" --arg brd "${report_digest:-none}" \
    --arg repo "$repo" \
    '{commit_sha:$sha, tree_sha:$tree, parent_sha:$parent, branch:$branch,
      base_sha:$base, diff_digest:$dd, changed_files:$changed,
      working_tree_clean:$clean, repository:$repo, remote_push_url:$remote,
      builder_report_digest:$brd, test_evidence:{recorded:true, source:"builder_report"}}')"

  printf '%s' "$out" | fg_role_result_write "$run" "$task" "builder" "candidate_freeze" "$token" >/dev/null || {
    echo "CANDIDATE_FREEZE_FAILED"; return 1; }

  fg_task_update "$run" "$task" ".candidate_sha=\"${sha}\" | .candidate_tree=\"${tree}\"" >/dev/null
  fg_task_set_status "$run" "$task" "READY_FOR_CHECK" "candidate frozen at ${sha}" >/dev/null
  echo "CANDIDATE_FROZEN:${sha}:${tree}"
  return 0
}

# fg_candidate_verify <run> <task> <repo>
# CANDIDATE_OK | CANDIDATE_MISSING | CANDIDATE_DIRTY | CANDIDATE_DRIFT |
# CANDIDATE_TREE_MISSING | CANDIDATE_UNBOUND
fg_candidate_verify() {
  local run="$1" task="$2" repo="$3" f fsha ftree live_sha live_tree
  f="$(fg_role_artifact_path "$run" "$task" candidate_freeze)"
  [ -f "$f" ] || { echo "CANDIDATE_MISSING"; return 1; }

  [ "$(fg_role_result_verify "$run" "$task" candidate_freeze)" = "RESULT_BINDING_OK" ] || {
    echo "CANDIDATE_UNBOUND"; return 1; }

  fsha="$(fg_json_get "$f" '.payload.commit_sha')"
  ftree="$(fg_json_get "$f" '.payload.tree_sha')"
  [ -n "$fsha" ] && [ -n "$ftree" ] || { echo "CANDIDATE_UNBOUND"; return 1; }

  if ! fg_git_is_clean "$repo"; then echo "CANDIDATE_DIRTY"; return 1; fi

  git -C "$repo" cat-file -e "${ftree}^{tree}" 2>/dev/null || { echo "CANDIDATE_TREE_MISSING"; return 1; }

  live_sha="$(fg_git_head_sha "$repo")"
  live_tree="$(fg_git_head_tree "$repo")"
  if [ "$live_sha" != "$fsha" ] || [ "$live_tree" != "$ftree" ]; then
    echo "CANDIDATE_DRIFT"; return 1
  fi
  echo "CANDIDATE_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Sequencing gates
# ---------------------------------------------------------------------------

# CHECKER_START_ALLOWED | CHECKER_BLOCKED_NO_CANDIDATE | CHECKER_BLOCKED_<reason>
fg_gate_checker_start() {
  local run="$1" task="$2" repo="$3" v
  if [ ! -f "$(fg_role_artifact_path "$run" "$task" candidate_freeze)" ]; then
    echo "CHECKER_BLOCKED_NO_CANDIDATE"; return 1
  fi
  v="$(fg_candidate_verify "$run" "$task" "$repo")"
  case "$v" in
    CANDIDATE_OK) echo "CHECKER_START_ALLOWED"; return 0 ;;
    *) echo "CHECKER_BLOCKED_${v}"; return 1 ;;
  esac
}

# ADVISOR_START_ALLOWED | ADVISOR_BLOCKED_NO_VERDICT | ADVISOR_BLOCKED_NOT_CLEAN |
# ADVISOR_BLOCKED_CANDIDATE_DRIFT | ADVISOR_BLOCKED_INVALID_BINDING |
# ADVISOR_BLOCKED_SUPERSEDED
fg_gate_advisor_start() {
  local run="$1" task="$2" f verdict vsha vtree csha ctree
  f="$(fg_role_artifact_path "$run" "$task" checker_verdict)"
  [ -f "$f" ] || { echo "ADVISOR_BLOCKED_NO_VERDICT"; return 1; }

  [ "$(fg_role_result_verify "$run" "$task" checker_verdict)" = "RESULT_BINDING_OK" ] || {
    echo "ADVISOR_BLOCKED_INVALID_BINDING"; return 1; }

  [ "$(fg_json_get "$f" '.payload.superseded')" = "true" ] && {
    echo "ADVISOR_BLOCKED_SUPERSEDED"; return 1; }

  verdict="$(fg_json_get "$f" '.payload.verdict')"
  if [ "$verdict" != "CLEAN" ]; then echo "ADVISOR_BLOCKED_NOT_CLEAN"; return 1; fi

  vsha="$(fg_json_get "$f" '.payload.candidate_sha')"
  vtree="$(fg_json_get "$f" '.payload.candidate_tree')"
  csha="$(fg_task_get "$run" "$task" candidate_sha)"
  ctree="$(fg_task_get "$run" "$task" candidate_tree)"
  if [ "$vsha" != "$csha" ] || [ "$vtree" != "$ctree" ]; then
    echo "ADVISOR_BLOCKED_CANDIDATE_DRIFT"; return 1
  fi
  echo "ADVISOR_START_ALLOWED"
  return 0
}

# ---------------------------------------------------------------------------
# M4 gates: serial integration, final verification, merge sheriff
#
# These exist in the shared implementation on every host. On m1 the host
# profile withholds the authority, so each one refuses with
# M4_HANDOFF_REQUIRED rather than being absent. Absence is not enforcement.
# ---------------------------------------------------------------------------

# fg_serial_integration_gate <run> <task> <accepted_sha> <accepted_tree>
# SERIAL_INTEGRATION_ALLOWED | M4_HANDOFF_REQUIRED |
# SERIAL_INTEGRATION_REFUSED_INEXACT_INPUT | SERIAL_INTEGRATION_REFUSED_NOT_ACCEPTED |
# SERIAL_INTEGRATION_REFUSED_CONCURRENT_WRITER
fg_serial_integration_gate() {
  local run="$1" task="$2" sha="$3" tree="$4" f vsha vtree other ident
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority serial_integration_writer || { echo "M4_HANDOFF_REQUIRED"; return 1; }
  ident="$(fg_host_identity_verify)"
  case "$ident" in
    HOST_IDENTITY_OK|HOST_IDENTITY_NOT_REQUIRED) : ;;
    *) echo "SERIAL_INTEGRATION_REFUSED_${ident}"; return 1 ;;
  esac

  case "$sha" in ''|not-frozen) echo "SERIAL_INTEGRATION_REFUSED_INEXACT_INPUT"; return 1 ;; esac
  case "$tree" in ''|not-frozen) echo "SERIAL_INTEGRATION_REFUSED_INEXACT_INPUT"; return 1 ;; esac

  # Inputs must be exact accepted candidates: a CLEAN checker verdict bound to
  # precisely this SHA and tree. Prose acceptance is not acceptance.
  f="$(fg_role_artifact_path "$run" "$task" checker_verdict)"
  [ -f "$f" ] || { echo "SERIAL_INTEGRATION_REFUSED_NOT_ACCEPTED"; return 1; }
  [ "$(fg_role_result_verify "$run" "$task" checker_verdict)" = "RESULT_BINDING_OK" ] || {
    echo "SERIAL_INTEGRATION_REFUSED_NOT_ACCEPTED"; return 1; }
  [ "$(fg_json_get "$f" '.payload.verdict')" = "CLEAN" ] || {
    echo "SERIAL_INTEGRATION_REFUSED_NOT_ACCEPTED"; return 1; }
  vsha="$(fg_json_get "$f" '.payload.candidate_sha')"
  vtree="$(fg_json_get "$f" '.payload.candidate_tree')"
  if [ "$vsha" != "$sha" ] || [ "$vtree" != "$tree" ]; then
    echo "SERIAL_INTEGRATION_REFUSED_INEXACT_INPUT"; return 1
  fi

  # One integration writer at a time across the whole run.
  for other in $(fg_lease_active_files "$run"); do
    [ "$(fg_json_get "$other" '.task_id')" = "$task" ] && continue
    [ "$(fg_json_get "$other" '.mode')" = "writable" ] || continue
    if fg_in_list "$(fg_json_get "$other" '.writer_role')" "$FG_RF_SHARED_SURFACE_WRITER_ROLES"; then
      echo "SERIAL_INTEGRATION_REFUSED_CONCURRENT_WRITER"; return 1
    fi
  done
  echo "SERIAL_INTEGRATION_ALLOWED"
  return 0
}

# fg_final_verifier_gate <run> <task> <repo> <final_sha> <final_tree>
# FINAL_VERIFICATION_ALLOWED | M4_HANDOFF_REQUIRED |
# FINAL_VERIFICATION_REFUSED_SHA_MOVED | FINAL_VERIFICATION_REFUSED_TREE_MOVED |
# FINAL_VERIFICATION_REFUSED_DIRTY
fg_final_verifier_gate() {
  local run="$1" task="$2" repo="$3" sha="$4" tree="$5" live_sha live_tree ident
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority final_integration_verifier || { echo "M4_HANDOFF_REQUIRED"; return 1; }
  ident="$(fg_host_identity_verify)"
  case "$ident" in
    HOST_IDENTITY_OK|HOST_IDENTITY_NOT_REQUIRED) : ;;
    *) echo "FINAL_VERIFICATION_REFUSED_${ident}"; return 1 ;;
  esac

  fg_git_is_clean "$repo" || { echo "FINAL_VERIFICATION_REFUSED_DIRTY"; return 1; }
  live_sha="$(fg_git_head_sha "$repo")"
  live_tree="$(fg_git_head_tree "$repo")"
  [ "$live_sha" = "$sha" ] || { echo "FINAL_VERIFICATION_REFUSED_SHA_MOVED"; return 1; }
  [ "$live_tree" = "$tree" ] || { echo "FINAL_VERIFICATION_REFUSED_TREE_MOVED"; return 1; }
  echo "FINAL_VERIFICATION_ALLOWED"
  return 0
}

# ---------------------------------------------------------------------------
# Founder decision receipts - ASYMMETRIC, VERIFY ONLY
# ---------------------------------------------------------------------------
#
# WHAT CHANGED AND WHY
#
# The previous receipt was sha256(canonical_body | symmetric_key). The verifier
# computed exactly the value a forger had to store, so any process that could
# read the key could author an APPROVE. That is not a signature; verify and
# forge were the same operation.
#
# A receipt is now a detached SSHSIG signature over the receipt's canonical
# body, produced by an Ed25519 PRIVATE key that exists only on founder-
# controlled hardware. This machine holds a PUBLIC key and nothing else, pinned
# by SHA256 fingerprint in the digest-covered host profile. There is no signing
# verb anywhere under bin/ or lib/. No process running this package can produce
# a receipt that verifies -- not a Claude role context, not the orchestrator,
# not an attacker who has read every file in the run root and the package.
#
# CANONICAL SERIALIZATION (documented, deterministic, must be reproduced by the
# founder's signing tool). The signed bytes are exactly:
#
#     jq -S -c 'del(.signature)' <receipt.json> > body
#
# i.e. the receipt object with the signature field removed, keys sorted
# lexicographically, compact, terminated by the single newline jq emits. That
# file is signed with:
#
#     ssh-keygen -Y sign -f <founder private key> \
#                -n foundergate.founder-receipt.v2 body
#
# and the resulting armored signature (body.sig) is stored verbatim in the
# receipt's .signature field. The verifier below reconstructs those exact bytes
# with printf '%s\n' over the same jq output, so the round trip is byte-exact.
#
# BOUND FIELDS - the receipt is refused unless its key set is EXACTLY these
# plus "signature", in sorted order, with no duplicates:
FG_RF_RECEIPT_FIELDS="action branch candidate_sha candidate_tree decision expires_at_epoch host_profile issued_at issued_at_epoch nonce repository repository_origin run_id schema signer_fingerprint task_id verification_report_digest version"
FG_RF_RECEIPT_SCHEMA="foundergate.founder-receipt"
FG_RF_RECEIPT_VERSION="2"

fg_founder_receipt_file() { printf '%s/%s.decision.json\n' "$(fg_gates_dir "$1")" "$2"; }

# fg_founder_receipt_canonical_body <file> - the exact bytes that are signed.
fg_founder_receipt_canonical_body() {
  jq -S -c 'del(.signature)' "$1" 2>/dev/null
}

# fg_founder_receipt_shape <file> - structural validation before any crypto.
# RECEIPT_SHAPE_OK | duplicate_field | field_set | field_order | unparseable
fg_founder_receipt_shape() {
  local f="$1" want got order sorted dupes
  jq -e . "$f" >/dev/null 2>&1 || { echo "unparseable"; return 1; }
  # Duplicate top-level keys survive in the raw stream even though jq's object
  # model collapses them, so stream the document to see them.
  dupes="$(jq --stream -r 'select(length==2) | .[0] | select(length==1) | .[0]' "$f" 2>/dev/null \
           | sort | uniq -d | head -1)"
  [ -z "$dupes" ] || { echo "duplicate_field"; return 1; }
  want="$(printf '%s\n' $FG_RF_RECEIPT_FIELDS signature | LC_ALL=C sort | tr '\n' ' ')"
  got="$(jq -r 'keys[]' "$f" 2>/dev/null | LC_ALL=C sort | tr '\n' ' ')"
  [ "$want" = "$got" ] || { echo "field_set"; return 1; }
  order="$(jq -c 'keys_unsorted' "$f" 2>/dev/null)"
  sorted="$(jq -c 'keys' "$f" 2>/dev/null)"
  [ "$order" = "$sorted" ] || { echo "field_order"; return 1; }
  echo "RECEIPT_SHAPE_OK"
  return 0
}

# fg_founder_receipt_verify <run> <task> <candidate_sha> <candidate_tree> [action]
#
# FOUNDER_RECEIPT_OK
# FOUNDER_RECEIPT_MISSING            FOUNDER_RECEIPT_MALFORMED:<why>
# FOUNDER_TRUST_ROOT_NOT_ENROLLED    FOUNDER_PUBKEY_MISSING
# FOUNDER_PUBKEY_UNREADABLE          FOUNDER_PUBKEY_FINGERPRINT_MISMATCH
# FOUNDER_RECEIPT_WRONG_SIGNER       FOUNDER_RECEIPT_WRONG_SCHEMA
# FOUNDER_RECEIPT_SIGNATURE_INVALID  FOUNDER_RECEIPT_NOT_APPROVED
# FOUNDER_RECEIPT_WRONG_RUN          FOUNDER_RECEIPT_WRONG_TASK
# FOUNDER_RECEIPT_WRONG_HOST_PROFILE FOUNDER_RECEIPT_WRONG_ACTION
# FOUNDER_RECEIPT_WRONG_REPOSITORY   FOUNDER_RECEIPT_WRONG_BRANCH
# FOUNDER_RECEIPT_WRONG_CANDIDATE    FOUNDER_RECEIPT_WRONG_VERIFICATION
# FOUNDER_RECEIPT_EXPIRED            FOUNDER_RECEIPT_ALREADY_CONSUMED
# FOUNDER_RECEIPT_LEDGER_<code>
#
# Performs no git operation of any kind, and in particular never a merge.
fg_founder_receipt_verify() {
  local run="$1" task="$2" sha="$3" tree="$4" action="${5:-merge}"
  local f pub pin shape ns principal body tmp sigf sigtxt now issued exp maxage
  local want_repo got_repo want_branch got_branch vf vdigest ledger

  f="$(fg_founder_receipt_file "$run" "$task")"
  [ -f "$f" ] || { echo "FOUNDER_RECEIPT_MISSING"; return 1; }

  shape="$(fg_founder_receipt_shape "$f")"
  [ "$shape" = "RECEIPT_SHAPE_OK" ] || { echo "FOUNDER_RECEIPT_MALFORMED:${shape}"; return 1; }

  # Trust root. An env var can only LOCATE the key; the pin decides.
  pub="$(fg_founder_pubkey_resolve)" || { printf '%s\n' "$pub"; return 1; }
  pin="$(fg_host_founder_pin)"
  [ "$(fg_json_get "$f" '.signer_fingerprint')" = "$pin" ] || {
    echo "FOUNDER_RECEIPT_WRONG_SIGNER"; return 1; }

  [ "$(fg_json_get "$f" '.schema')"  = "$FG_RF_RECEIPT_SCHEMA" ]  || { echo "FOUNDER_RECEIPT_WRONG_SCHEMA"; return 1; }
  [ "$(fg_json_get "$f" '.version')" = "$FG_RF_RECEIPT_VERSION" ] || { echo "FOUNDER_RECEIPT_WRONG_SCHEMA"; return 1; }

  # Signature over the documented canonical body.
  ns="$(fg_host_founder_namespace)"
  principal="$(fg_host_founder_principal)"
  body="$(fg_founder_receipt_canonical_body "$f")" || { echo "FOUNDER_RECEIPT_MALFORMED:canonical"; return 1; }
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/.fgrcpt.XXXXXX")" || { echo "FOUNDER_RECEIPT_MALFORMED:tmp"; return 1; }
  printf '%s\n' "$body" > "${tmp}/body"
  sigtxt="$(fg_json_get "$f" '.signature')"
  printf '%s\n' "$sigtxt" > "${tmp}/sig"
  sigf="$(fg_sshsig_verify "$pub" "$ns" "$principal" "${tmp}/sig" "${tmp}/body")"
  rm -rf "$tmp"
  [ "$sigf" = "SIGNATURE_OK" ] || { echo "FOUNDER_RECEIPT_SIGNATURE_INVALID"; return 1; }

  # Scope binding. Every one of these is inside the signed body, so none of
  # them can be adjusted without the founder's private key.
  [ "$(fg_json_get "$f" '.decision')" = "APPROVE" ] || { echo "FOUNDER_RECEIPT_NOT_APPROVED"; return 1; }
  [ "$(fg_json_get "$f" '.run_id')"   = "$run" ]    || { echo "FOUNDER_RECEIPT_WRONG_RUN"; return 1; }
  [ "$(fg_json_get "$f" '.task_id')"  = "$task" ]   || { echo "FOUNDER_RECEIPT_WRONG_TASK"; return 1; }
  [ "$(fg_json_get "$f" '.host_profile')" = "$FG_RF_HOST" ] || {
    echo "FOUNDER_RECEIPT_WRONG_HOST_PROFILE"; return 1; }
  [ "$(fg_json_get "$f" '.action')"   = "$action" ] || { echo "FOUNDER_RECEIPT_WRONG_ACTION"; return 1; }

  want_repo="$(fg_json_get "$(fg_control_dir "$run")/RUN_MANIFEST.json" '.source_repository')"
  got_repo="$(fg_json_get "$f" '.repository')"
  if [ -n "$want_repo" ]; then
    [ "$(fg_realpath "$got_repo")" = "$(fg_realpath "$want_repo")" ] || {
      echo "FOUNDER_RECEIPT_WRONG_REPOSITORY"; return 1; }
  fi

  want_branch="$(fg_task_get "$run" "$task" branch)"
  got_branch="$(fg_json_get "$f" '.branch')"
  if [ -n "$want_branch" ]; then
    [ "$(fg_compare_key "$(fg_branch_normalise "$got_branch" 2>/dev/null || echo "$got_branch")")" = \
      "$(fg_compare_key "$want_branch")" ] || { echo "FOUNDER_RECEIPT_WRONG_BRANCH"; return 1; }
  fi

  if [ -n "$sha" ]; then
    [ "$(fg_json_get "$f" '.candidate_sha')" = "$sha" ] || { echo "FOUNDER_RECEIPT_WRONG_CANDIDATE"; return 1; }
  fi
  if [ -n "$tree" ]; then
    [ "$(fg_json_get "$f" '.candidate_tree')" = "$tree" ] || { echo "FOUNDER_RECEIPT_WRONG_CANDIDATE"; return 1; }
  fi

  # The receipt names the exact final-verifier result it was issued against.
  vf="$(fg_role_artifact_path "$run" "$task" final_verification_report)"
  if [ -f "$vf" ]; then
    vdigest="$(fg_json_get "$vf" '.report_digest')"
    [ "$(fg_json_get "$f" '.verification_report_digest')" = "$vdigest" ] || {
      echo "FOUNDER_RECEIPT_WRONG_VERIFICATION"; return 1; }
  fi

  now="$(fg_epoch)"
  exp="$(fg_json_get "$f" '.expires_at_epoch')"
  issued="$(fg_json_get "$f" '.issued_at_epoch')"
  maxage="$(fg_host_receipt_max_age_seconds)"
  case "$exp" in ''|*[!0-9]*) echo "FOUNDER_RECEIPT_MALFORMED:expires_at_epoch"; return 1 ;; esac
  case "$issued" in ''|*[!0-9]*) echo "FOUNDER_RECEIPT_MALFORMED:issued_at_epoch"; return 1 ;; esac
  [ "$now" -le "$exp" ] || { echo "FOUNDER_RECEIPT_EXPIRED"; return 1; }
  [ $(( now - issued )) -le "${maxage:-86400}" ] || { echo "FOUNDER_RECEIPT_EXPIRED"; return 1; }

  # One-time use. A missing or unreadable ledger is a REFUSAL, never an
  # optimistic "nothing consumed yet".
  ledger="$(fg_receipt_ledger_verify "$run")"
  [ "$ledger" = "CONSUMED_LEDGER_OK" ] || { echo "FOUNDER_RECEIPT_LEDGER_${ledger}"; return 1; }
  if fg_receipt_nonce_spent "$run" "$(fg_json_get "$f" '.nonce')"; then
    echo "FOUNDER_RECEIPT_ALREADY_CONSUMED"; return 1
  fi

  echo "FOUNDER_RECEIPT_OK"
  return 0
}

# fg_founder_receipt_consume <run> <task> <sha> <tree> [action]
#
# Re-verifies immediately before spending, then records the nonce in BOTH the
# keyed consumed-receipt ledger and the keyed event chain. A second call
# returns FOUNDER_RECEIPT_ALREADY_CONSUMED. Deleting the ledger does not
# restore the receipt: verification then fails with
# FOUNDER_RECEIPT_LEDGER_CONSUMED_LEDGER_MISSING.
fg_founder_receipt_consume() {
  local run="$1" task="$2" sha="$3" tree="$4" action="${5:-merge}" v f nonce
  v="$(fg_founder_receipt_verify "$run" "$task" "$sha" "$tree" "$action")"
  [ "$v" = "FOUNDER_RECEIPT_OK" ] || { printf '%s\n' "$v"; return 1; }
  f="$(fg_founder_receipt_file "$run" "$task")"
  nonce="$(fg_json_get "$f" '.nonce')"
  [ -n "$nonce" ] || { echo "FOUNDER_RECEIPT_MALFORMED:nonce"; return 1; }
  fg_receipt_nonce_record "$run" "$nonce" "$task" "$action" "$sha" "$tree" || {
    echo "FOUNDER_RECEIPT_CONSUME_FAILED"; return 1; }
  echo "FOUNDER_RECEIPT_CONSUMED"
  return 0
}

# fg_merge_sheriff_gate <run> <task>
# MERGE_GATE_OPEN | M4_HANDOFF_REQUIRED | MERGE_REFUSED_NO_FINAL_VERIFICATION |
# MERGE_REFUSED_FINAL_VERIFICATION_FAILED | MERGE_REFUSED_<founder receipt code>
#
# MERGE_GATE_OPEN authorises writing a merge RECEIPT. The package never runs
# the merge itself on any host.
fg_merge_sheriff_gate() {
  local run="$1" task="$2" f sha tree receipt ident
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority merge_sheriff || { echo "M4_HANDOFF_REQUIRED"; return 1; }

  # A merge-bearing profile must be running on an enrolled machine. A --host
  # argument is not an attestation.
  ident="$(fg_host_identity_verify)"
  case "$ident" in
    HOST_IDENTITY_OK|HOST_IDENTITY_NOT_REQUIRED) : ;;
    *) echo "MERGE_REFUSED_${ident}"; return 1 ;;
  esac

  f="$(fg_role_artifact_path "$run" "$task" final_verification_report)"
  [ -f "$f" ] || { echo "MERGE_REFUSED_NO_FINAL_VERIFICATION"; return 1; }
  [ "$(fg_role_result_verify "$run" "$task" final_verification_report)" = "RESULT_BINDING_OK" ] || {
    echo "MERGE_REFUSED_NO_FINAL_VERIFICATION"; return 1; }
  [ "$(fg_json_get "$f" '.payload.verdict')" = "PASS" ] || {
    echo "MERGE_REFUSED_FINAL_VERIFICATION_FAILED"; return 1; }

  sha="$(fg_json_get "$f" '.payload.final_sha')"
  tree="$(fg_json_get "$f" '.payload.final_tree')"
  if fg_host_requires_founder_receipt_for_merge; then
    receipt="$(fg_founder_receipt_verify "$run" "$task" "$sha" "$tree")"
    [ "$receipt" = "FOUNDER_RECEIPT_OK" ] || { echo "MERGE_REFUSED_${receipt}"; return 1; }
  fi
  echo "MERGE_GATE_OPEN"
  return 0
}

# ---------------------------------------------------------------------------
# Bounded correction cycle
# ---------------------------------------------------------------------------

# Parks the candidate, invalidates the checker evidence bound to it, and opens
# one fresh Builder correction context. Never converts findings into CLEAN.
fg_correction_open() {
  local run="$1" task="$2" f n inv out
  if ! fg_retry_correction_available "$run" "$task"; then
    fg_task_set_status "$run" "$task" "ESCALATED" "correction retry budget exhausted" >/dev/null
    echo "RETRY_BUDGET_EXHAUSTED"; return 1
  fi
  f="$(fg_role_artifact_path "$run" "$task" checker_verdict)"
  if [ -f "$f" ]; then
    n="$(fg_retry_get "$run" "$task" correction_attempts)"
    inv="$(fg_roles_dir "$run")/${task}/invalidated"
    mkdir -p "$inv"
    out="$(jq --arg ts "$(fg_now)" '.payload.superseded=true | .superseded_at=$ts' "$f")"
    printf '%s\n' "$out" | fg_atomic_write_json "${inv}/checker.verdict.${n:-0}.json"
    rm -f "$f"
    rm -f "$(fg_role_artifact_path "$run" "$task" checker_report)"
    fg_event_append "$run" "checker_evidence_invalidated" "orchestrator" "$task" \
      "$(jq -n --arg p "${inv}/checker.verdict.${n:-0}.json" '{archived_to:$p}')" >/dev/null
  fi
  # The frozen candidate is parked: a correction must produce a new SHA.
  rm -f "$(fg_role_artifact_path "$run" "$task" candidate_freeze)"
  fg_task_update "$run" "$task" '.candidate_sha=null | .candidate_tree=null | .attempt=(.attempt+1)' >/dev/null
  fg_retry_bump_correction "$run" "$task" >/dev/null
  fg_task_set_status "$run" "$task" "QUEUED" "bounded correction cycle opened" >/dev/null
  echo "CORRECTION_CYCLE_OPENED"
  return 0
}

# ---------------------------------------------------------------------------
# Session exit classification and context recovery
# ---------------------------------------------------------------------------

# fg_classify_exit <run> <task> <role> <exit_code> <log_file>
# SESSION_COMPLETED | CONTEXT_EXHAUSTED | SESSION_FAILED | SESSION_INCOMPLETE
fg_classify_exit() {
  local run="$1" task="$2" role="$3" code="$4" log="${5:-}"
  local produced=""

  case "$role" in
    builder)  produced="$(fg_role_artifact_path "$run" "$task" builder_report)" ;;
    checker)  produced="$(fg_role_artifact_path "$run" "$task" checker_verdict)" ;;
    advisor)  produced="$(fg_role_artifact_path "$run" "$task" advisor_packet)" ;;
  esac
  if [ -n "$produced" ] && [ -f "$produced" ]; then
    echo "SESSION_COMPLETED"; return 0
  fi

  if [ -n "$log" ] && [ -f "$log" ] && tail -n 200 "$log" 2>/dev/null | grep -Eqi "$FG_RF_CONTEXT_SIGNATURE"; then
    echo "CONTEXT_EXHAUSTED"; return 0
  fi

  if [ "$code" != "0" ]; then echo "SESSION_FAILED"; return 0; fi
  echo "SESSION_INCOMPLETE"
  return 0
}

# fg_handoff_build <run> <task> <role> <repo>
# Emits the handoff path. Binds disk truth so the fresh context never inherits
# narrative from the exhausted one.
fg_handoff_build() {
  local run="$1" task="$2" role="$3" repo="$4" n dest lease_digest cand_sha cand_tree dirty
  local attempt corrections
  fg_retry_ensure_task "$run" "$task" >/dev/null 2>&1 || true
  n="$(fg_retry_get "$run" "$task" context_restarts)"; n="${n:-0}"
  corrections="$(fg_retry_get "$run" "$task" correction_attempts)"; corrections="${corrections:-0}"
  attempt="$(fg_task_get "$run" "$task" attempt)"; attempt="${attempt:-1}"
  dest="$(fg_handoffs_dir "$run")/${task}.${role}.$(( n + 1 )).json"
  mkdir -p "$(dirname "$dest")"
  lease_digest="$(fg_json_get "$(fg_lease_file "$run" "$task")" '.digest')"
  cand_sha="$(fg_task_get "$run" "$task" candidate_sha)"
  cand_tree="$(fg_task_get "$run" "$task" candidate_tree)"
  dirty=""
  fg_git_is_clean "$repo" || dirty="$(fg_git_dirty_digest "$repo")"

  jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" --arg role "$role" \
    --arg lane "$(fg_task_get "$run" "$task" lane)" \
    --arg repo "$repo" --arg branch "$(fg_git_branch "$repo")" \
    --arg base_sha "$(fg_task_get "$run" "$task" base_sha)" \
    --arg base_tree "$(fg_task_get "$run" "$task" base_tree)" \
    --arg cur_sha "$(fg_git_head_sha "$repo")" \
    --arg cur_tree "$(fg_git_head_tree "$repo")" \
    --arg dirty "$dirty" \
    --arg cand_sha "$cand_sha" --arg cand_tree "$cand_tree" \
    --arg lease "$lease_digest" \
    --argjson allowed "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.allowed_globs' 2>/dev/null || echo '[]')" \
    --argjson forbidden "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.forbidden_paths' 2>/dev/null || echo '[]')" \
    --argjson attempt "$attempt" \
    --argjson restarts "$(( n + 1 ))" \
    --argjson corrections "$corrections" \
    --arg ts "$(fg_now)" \
    '{schema_version:$sv, run_id:$run, task_id:$task, role:$role, lane:$lane,
      repository:$repo, branch:$branch,
      base_sha:$base_sha, base_tree:$base_tree,
      current_sha:$cur_sha, current_tree:$cur_tree,
      dirty_tree_digest:(if $dirty=="" then null else $dirty end),
      candidate_sha:(if $cand_sha=="" then null else $cand_sha end),
      candidate_tree:(if $cand_tree=="" then null else $cand_tree end),
      lease_digest:$lease, allowed_paths:$allowed, forbidden_paths:$forbidden,
      completed_work:[], remaining_work:[], tests:[], findings:[], dependencies:[],
      retry_state:{attempt:$attempt, context_restarts:$restarts, correction_attempts:$corrections},
      stop_conditions:["merge","signature","activation","protected_main_write","m4_handoff","retry_exhaustion"],
      revalidate_disk_truth_before_continuing:true,
      built_at:$ts}' \
    | fg_atomic_write_json "$dest" || return 1

  fg_event_append "$run" "handoff_built" "orchestrator" "$task" \
    "$(jq -n --arg p "$dest" --arg r "$role" '{path:$p, role:$r}')" >/dev/null
  printf '%s\n' "$dest"
}

# ---------------------------------------------------------------------------
# Bounded continuation decision
# ---------------------------------------------------------------------------

# fg_continuation_decision <run> <task> [repo]
# AUTO:<action> | STOP:<reason>
fg_continuation_decision() {
  local run="$1" task="$2" repo="${3:-}" status blockers lease_state gate
  fg_run_stop_requested "$run" && { echo "STOP:STOP_REQUESTED"; return 0; }
  fg_run_dispatch_enabled "$run" || { echo "STOP:DISPATCH_DISABLED"; return 0; }

  status="$(fg_task_get "$run" "$task" status)"
  blockers="$(fg_json_get "$(fg_task_file "$run" "$task")" '.blockers | length')"
  [ "${blockers:-0}" -gt 0 ] && { echo "STOP:BLOCKER_OPEN"; return 0; }

  case "$status" in
    HUMAN_ACTION_REQUIRED)   echo "STOP:HUMAN_ACTION_REQUIRED"; return 0 ;;
    M4_HANDOFF_REQUIRED)     echo "STOP:M4_HANDOFF_REQUIRED"; return 0 ;;
    READY_FOR_FOUNDER_GATE)  echo "STOP:FOUNDER_GATE"; return 0 ;;
    DRIFT|STALE)             echo "STOP:CANDIDATE_DRIFT"; return 0 ;;
    BLOCKED|ESCALATED)       echo "STOP:ESCALATED"; return 0 ;;
    STOP_REQUESTED|STOPPED)  echo "STOP:STOP_REQUESTED"; return 0 ;;
  esac

  # A live writable lease must still be valid before any writer continues.
  # fg_lease_verify now REQUIRES an expected role from its caller (F-G04), so
  # the writer_role field can no longer be swapped and re-sealed unchallenged.
  if [ -f "$(fg_lease_file "$run" "$task")" ] && \
     [ "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.mode')" = "writable" ] && \
     [ "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.status')" = "ACTIVE" ]; then
    lease_state="$(fg_lease_verify "$run" "$task" "" "$(fg_task_get "$run" "$task" role)")"
    case "$lease_state" in
      LEASE_OK) : ;;
      *) echo "STOP:${lease_state}"; return 0 ;;
    esac
  fi

  case "$status" in
    READY_FOR_CHECK)
      if [ -n "$repo" ]; then
        gate="$(fg_gate_checker_start "$run" "$task" "$repo")"
        [ "$gate" = "CHECKER_START_ALLOWED" ] || { echo "STOP:${gate}"; return 0; }
      fi
      echo "AUTO:launch_checker"; return 0 ;;
    CLEAN)
      gate="$(fg_gate_advisor_start "$run" "$task")"
      [ "$gate" = "ADVISOR_START_ALLOWED" ] || { echo "STOP:${gate}"; return 0; }
      echo "AUTO:launch_advisor"; return 0 ;;
    FINDINGS)
      if fg_retry_correction_available "$run" "$task"; then
        echo "AUTO:launch_correction_cycle"; return 0
      fi
      echo "STOP:RETRY_BUDGET_EXHAUSTED"; return 0 ;;
    CONTEXT_EXHAUSTED)
      if fg_retry_context_available "$run" "$task"; then
        echo "AUTO:restart_role_from_handoff"; return 0
      fi
      echo "STOP:CONTEXT_RESTART_BUDGET_EXHAUSTED"; return 0 ;;
    READY_FOR_ADVISOR)  echo "AUTO:launch_advisor"; return 0 ;;
    QUEUED)             echo "AUTO:launch_builder"; return 0 ;;
    RUNNING|STARTING|CHECKING|ADVISING) echo "AUTO:wait"; return 0 ;;
    WAITING_DEPENDENCY) echo "STOP:WAITING_DEPENDENCY"; return 0 ;;
  esac
  echo "STOP:NO_AUTHORIZED_ACTION"
  return 0
}

# ---------------------------------------------------------------------------
# Authority requests (never executed locally)
# ---------------------------------------------------------------------------

# fg_authority_request <run> <task> <role> <action>
# Always refuses. Emits HUMAN_ACTION_REQUIRED or M4_HANDOFF_REQUIRED and writes
# a founder gate packet stub. Never performs the action.
fg_authority_request() {
  local run="$1" task="$2" role="$3" action="$4" verdict gate
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }

  # Founder authorities are hard stops on every host, M4 included.
  case "$action" in
    sign|signature|activate|activation|deploy|deployment|credential_change|permission_change|destructive_action)
      verdict="HUMAN_ACTION_REQUIRED" ;;
    merge)
      if fg_host_authority merge_sheriff; then verdict="GOVERNED_ROLE_REQUIRED:merge-sheriff"
      else verdict="M4_HANDOFF_REQUIRED"; fi ;;
    push_protected_main)
      if fg_host_authority protected_main_writer; then verdict="GOVERNED_ROLE_REQUIRED:serial-integration"
      else verdict="M4_HANDOFF_REQUIRED"; fi ;;
    serial_integration_write)
      if fg_host_authority serial_integration_writer; then verdict="GOVERNED_ROLE_REQUIRED:serial-integration"
      else verdict="M4_HANDOFF_REQUIRED"; fi ;;
    final_verification)
      if fg_host_authority final_integration_verifier; then verdict="GOVERNED_ROLE_REQUIRED:final-verifier"
      else verdict="M4_HANDOFF_REQUIRED"; fi ;;
    *)
      if fg_is_universally_sealed_authority "$action"; then verdict="HUMAN_ACTION_REQUIRED"
      elif fg_is_m4_authority "$action" && ! fg_host_authority "$action"; then verdict="M4_HANDOFF_REQUIRED"
      elif fg_is_hard_stop_action "$action"; then verdict="HUMAN_ACTION_REQUIRED"
      else echo "NOT_AN_AUTHORITY_REQUEST"; return 1; fi ;;
  esac

  gate="$(fg_gates_dir "$run")/${task}.${action}.json"
  mkdir -p "$(dirname "$gate")"
  jq -n --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" \
        --arg role "$role" --arg action "$action" --arg v "$verdict" --arg ts "$(fg_now)" \
        --arg host "$FG_RF_HOST" \
    '{schema_version:$sv, run_id:$run, task_id:$task, host_profile:$host,
      requested_by_role:$role, requested_action:$action, verdict:$v,
      executed_locally:false,
      authority_location:(if $v|startswith("GOVERNED_ROLE_REQUIRED")
                          then "governed role on this host, behind its own gate"
                          else "M4 / founder" end),
      created_at:$ts}' \
    | fg_atomic_write_json "$gate"

  fg_event_append "$run" "authority_refused" "$role" "$task" \
    "$(jq -n --arg a "$action" --arg v "$verdict" '{action:$a, verdict:$v, executed:false}')" >/dev/null
  fg_task_set_status "$run" "$task" "$verdict" "refused local ${action}" >/dev/null 2>&1 || true
  echo "$verdict"
  return 0
}
