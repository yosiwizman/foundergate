#!/usr/bin/env bash
# FounderGate role floor - role separation, candidate freeze, sequencing,
# bounded continuation, and context recovery.
#
# Role-forgery defence: every role result is written through a role-scoped
# writer. The writer refuses any artifact class outside the role's registry
# entry, and requires a run-scoped role token that is minted at dispatch and
# bound to (run, task, role, prompt digest, session identity). A Builder
# therefore cannot publish a Checker verdict even with full disk access to the
# run root, and no role at all can publish a merge receipt.
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
# Role tokens
# ---------------------------------------------------------------------------

fg_role_token_compute() {
  local run="$1" task="$2" role="$3" prompt_digest="$4" session_id="$5" secret
  secret="$(cat "$(fg_control_dir "$run")/.writer_secret" 2>/dev/null || echo "NO_SECRET")"
  fg_sha256_string "${run}|${task}|${role}|${prompt_digest}|${session_id}|${secret}"
}

fg_role_token_mint() {
  local run="$1" task="$2" role="$3" prompt_digest="$4" session_id="$5" tok d
  tok="$(fg_role_token_compute "$run" "$task" "$role" "$prompt_digest" "$session_id")"
  d="$(fg_roles_dir "$run")/${task}"
  mkdir -p "$d"
  jq -n --arg r "$role" --arg pd "$prompt_digest" --arg sid "$session_id" --arg ts "$(fg_now)" \
    '{role:$r, prompt_digest:$pd, session_id:$sid, minted_at:$ts}' \
    | fg_atomic_write_json "${d}/${role}.token.json"
  printf '%s\n' "$tok"
}

fg_role_token_verify() {
  local run="$1" task="$2" role="$3" token="$4" d pd sid expect
  d="$(fg_roles_dir "$run")/${task}"
  [ -f "${d}/${role}.token.json" ] || { echo "ROLE_TOKEN_MISSING"; return 1; }
  pd="$(fg_json_get "${d}/${role}.token.json" '.prompt_digest')"
  sid="$(fg_json_get "${d}/${role}.token.json" '.session_id')"
  expect="$(fg_role_token_compute "$run" "$task" "$role" "$pd" "$sid")"
  [ "$token" = "$expect" ] || { echo "ROLE_TOKEN_INVALID"; return 1; }
  echo "ROLE_TOKEN_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Role-scoped result writer
# ---------------------------------------------------------------------------

# fg_role_result_write <run> <task> <role> <class> <token>   (payload on stdin)
#
# RESULT_WRITTEN:<report_digest>
# ROLE_FORGERY_REJECTED | M4_AUTHORITY_SEALED | ROLE_TOKEN_INVALID |
# ROLE_TOKEN_MISSING | RESULT_WRITE_FAILED
fg_role_result_write() {
  local run="$1" task="$2" role="$3" class="$4" token="$5"
  local payload dest report_digest seq tokcheck pd sid tdir gate

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
  if [ "$class" = "merge_receipt" ]; then
    gate="$(fg_merge_sheriff_gate "$run" "$task")"
    if [ "$gate" != "MERGE_GATE_OPEN" ]; then
      fg_event_append "$run" "merge_refused" "$role" "$task" \
        "$(jq -n --arg g "$gate" '{reason:$g, executed:false}')" >/dev/null
      echo "$gate"; return 1
    fi
  fi

  tokcheck="$(fg_role_token_verify "$run" "$task" "$role" "$token")" || {
    fg_event_append "$run" "role_write_rejected" "$role" "$task" \
      "$(jq -n --arg c "$tokcheck" '{reason:$c}')" >/dev/null
    echo "$tokcheck"; return 1; }

  tdir="$(fg_roles_dir "$run")/${task}"
  pd="$(fg_json_get "${tdir}/${role}.token.json" '.prompt_digest')"
  sid="$(fg_json_get "${tdir}/${role}.token.json" '.session_id')"
  report_digest="$(printf '%s' "$payload" | jq -S -c . | fg_sha256_stdin)"
  seq=$(( $(fg_event_count "$run") + 1 ))
  dest="$(fg_role_artifact_path "$run" "$task" "$class")"

  jq -n \
    --arg sv "$FG_RF_SCHEMA_VERSION" --arg run "$run" --arg task "$task" \
    --arg role "$role" --arg class "$class" --arg pd "$pd" --arg sid "$sid" \
    --arg rd "$report_digest" --arg ts "$(fg_now)" --argjson seq "$seq" \
    --arg csha "$(fg_task_get "$run" "$task" candidate_sha)" \
    --arg ctree "$(fg_task_get "$run" "$task" candidate_tree)" \
    --argjson payload "$payload" \
    '{schema_version:$sv, run_id:$run, task_id:$task, role:$role,
      artifact_class:$class, prompt_digest:$pd, session_id:$sid,
      candidate_sha:(if $csha=="" then null else $csha end),
      candidate_tree:(if $ctree=="" then null else $ctree end),
      report_digest:$rd, event_seq:$seq, written_at:$ts, payload:$payload}' \
    | fg_atomic_write_json "$dest" || { echo "RESULT_WRITE_FAILED"; return 1; }

  fg_event_append "$run" "role_result" "$role" "$task" \
    "$(jq -n --arg c "$class" --arg d "$report_digest" '{artifact_class:$c, report_digest:$d}')" >/dev/null
  echo "RESULT_WRITTEN:${report_digest}"
  return 0
}

# fg_role_result_verify <run> <task> <class> - rebinds the stored digest.
fg_role_result_verify() {
  local run="$1" task="$2" class="$3" f stored recomputed
  f="$(fg_role_artifact_path "$run" "$task" "$class")"
  [ -f "$f" ] || { echo "RESULT_MISSING"; return 1; }
  stored="$(fg_json_get "$f" '.report_digest')"
  recomputed="$(jq -S -c '.payload' "$f" | fg_sha256_stdin)"
  [ "$stored" = "$recomputed" ] || { echo "RESULT_BINDING_INVALID"; return 1; }
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
  local run="$1" task="$2" sha="$3" tree="$4" f vsha vtree other
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority serial_integration_writer || { echo "M4_HANDOFF_REQUIRED"; return 1; }

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
  local run="$1" task="$2" repo="$3" sha="$4" tree="$5" live_sha live_tree
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority final_integration_verifier || { echo "M4_HANDOFF_REQUIRED"; return 1; }

  fg_git_is_clean "$repo" || { echo "FINAL_VERIFICATION_REFUSED_DIRTY"; return 1; }
  live_sha="$(fg_git_head_sha "$repo")"
  live_tree="$(fg_git_head_tree "$repo")"
  [ "$live_sha" = "$sha" ] || { echo "FINAL_VERIFICATION_REFUSED_SHA_MOVED"; return 1; }
  [ "$live_tree" = "$tree" ] || { echo "FINAL_VERIFICATION_REFUSED_TREE_MOVED"; return 1; }
  echo "FINAL_VERIFICATION_ALLOWED"
  return 0
}

# ---------------------------------------------------------------------------
# Founder decision receipts
#
# The receipt is signed with a key that lives outside the package and outside
# the run root. The floor can verify a receipt; it has no way to mint one. A
# floor that could sign its own approval would not be a gate.
# ---------------------------------------------------------------------------

fg_founder_receipt_file() { printf '%s/%s.decision.json\n' "$(fg_gates_dir "$1")" "$2"; }

fg_founder_receipt_expected_digest() {
  local file="$1" key body
  [ -f "$FG_RF_FOUNDER_KEY_FILE" ] || { echo "NO_FOUNDER_KEY"; return 1; }
  key="$(cat "$FG_RF_FOUNDER_KEY_FILE")"
  body="$(jq -S -c 'del(.digest)' "$file")" || return 1
  fg_sha256_string "${body}|${key}"
}

# fg_founder_receipt_verify <run> <task> <candidate_sha> <candidate_tree>
# FOUNDER_RECEIPT_OK | FOUNDER_RECEIPT_MISSING | FOUNDER_RECEIPT_INVALID |
# FOUNDER_RECEIPT_NOT_APPROVED | FOUNDER_RECEIPT_WRONG_CANDIDATE |
# FOUNDER_KEY_UNAVAILABLE
fg_founder_receipt_verify() {
  local run="$1" task="$2" sha="$3" tree="$4" f expect stored
  f="$(fg_founder_receipt_file "$run" "$task")"
  [ -f "$f" ] || { echo "FOUNDER_RECEIPT_MISSING"; return 1; }
  [ -f "$FG_RF_FOUNDER_KEY_FILE" ] || { echo "FOUNDER_KEY_UNAVAILABLE"; return 1; }

  expect="$(fg_founder_receipt_expected_digest "$f")" || { echo "FOUNDER_RECEIPT_INVALID"; return 1; }
  stored="$(fg_json_get "$f" '.digest')"
  [ "$expect" = "$stored" ] || { echo "FOUNDER_RECEIPT_INVALID"; return 1; }
  [ "$(fg_json_get "$f" '.decision')" = "APPROVE" ] || { echo "FOUNDER_RECEIPT_NOT_APPROVED"; return 1; }
  [ "$(fg_json_get "$f" '.task_id')" = "$task" ] || { echo "FOUNDER_RECEIPT_WRONG_CANDIDATE"; return 1; }
  if [ -n "$sha" ]; then
    [ "$(fg_json_get "$f" '.candidate_sha')" = "$sha" ] || { echo "FOUNDER_RECEIPT_WRONG_CANDIDATE"; return 1; }
  fi
  if [ -n "$tree" ]; then
    [ "$(fg_json_get "$f" '.candidate_tree')" = "$tree" ] || { echo "FOUNDER_RECEIPT_WRONG_CANDIDATE"; return 1; }
  fi
  echo "FOUNDER_RECEIPT_OK"
  return 0
}

# fg_merge_sheriff_gate <run> <task>
# MERGE_GATE_OPEN | M4_HANDOFF_REQUIRED | MERGE_REFUSED_NO_FINAL_VERIFICATION |
# MERGE_REFUSED_FINAL_VERIFICATION_FAILED | MERGE_REFUSED_<founder receipt code>
#
# MERGE_GATE_OPEN authorises writing a merge RECEIPT. The package never runs
# the merge itself on any host.
fg_merge_sheriff_gate() {
  local run="$1" task="$2" f sha tree receipt
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_authority merge_sheriff || { echo "M4_HANDOFF_REQUIRED"; return 1; }

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
  if [ -f "$(fg_lease_file "$run" "$task")" ] && \
     [ "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.mode')" = "writable" ] && \
     [ "$(fg_json_get "$(fg_lease_file "$run" "$task")" '.status')" = "ACTIVE" ]; then
    lease_state="$(fg_lease_verify "$run" "$task")"
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
