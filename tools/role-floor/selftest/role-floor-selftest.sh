#!/usr/bin/env bash
# FounderGate role floor - package selftest.
#
#   bash tools/role-floor/selftest/role-floor-selftest.sh [--json <path>]
#
# Everything runs against deterministic fixtures inside one temporary
# directory: a throwaway git repository, a recording tmux stub, and a Claude
# stub that is never fed a prompt. No real Builder, Checker or Advisor session
# is launched, no model or provider is contacted, and no repository other than
# the fixture is touched.
#
# Exit 0 = all pass.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="$(cd "${HERE}/.." && pwd)"
CLONE="$(cd "${PKG}/../.." && pwd)"

JSON_OUT=""
[ "${1:-}" = "--json" ] && JSON_OUT="${2:-}"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/fgm1-selftest.XXXXXX")" || exit 1
export FG_RF_RUN_ROOT="${TMP}/runroot"
export FG_RF_TMUX_BIN="${TMP}/bin/tmux"
export FG_RF_CLAUDE_BIN="${TMP}/bin/claude"
export FG_RF_NO_SUPERVISOR=1
export FG_TEST_TMUX_LOG="${TMP}/tmux.calls"
export FG_TEST_TMUX_STATE="${TMP}/tmuxstate"
export FG_TEST_CLAUDE_LOG="${TMP}/claude.calls"
FIX="${TMP}/fixture-repo"
PASS=0; FAIL=0; SKIP=0
RESULTS="${TMP}/results.jsonl"
CLONE_STATUS_BEFORE="$(git -C "$CLONE" status --porcelain=v1 2>/dev/null | sort)"

cleanup() {
  # Never kill anything outside this test's own temporary tree.
  pkill -f "$TMP" 2>/dev/null || true
  rm -rf "$TMP" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ok()   { PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; printf '{"id":"%s","result":"PASS"}\n' "$1" >> "$RESULTS"; }
no()   { FAIL=$((FAIL+1)); printf '  FAIL  %s\n     -> %s\n' "$1" "${2:-}"; printf '{"id":"%s","result":"FAIL","detail":"%s"}\n' "$1" "$(printf '%s' "${2:-}" | tr -d '"' | tr '\n' ' ')" >> "$RESULTS"; }
skip() { SKIP=$((SKIP+1)); printf '  SKIP  %s\n     -> %s\n' "$1" "${2:-}"; printf '{"id":"%s","result":"SKIP","detail":"%s"}\n' "$1" "$(printf '%s' "${2:-}" | tr -d '"')" >> "$RESULTS"; }

# assert_eq <id> <expected> <actual>
assert_eq() {
  if [ "$2" = "$3" ]; then ok "$1"; else no "$1" "expected [$2] got [$3]"; fi
}
assert_contains() {
  case "$3" in *"$2"*) ok "$1" ;; *) no "$1" "expected to contain [$2] got [$3]" ;; esac
}

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

mkdir -p "${TMP}/bin" "$FG_TEST_TMUX_STATE"
: > "$FG_TEST_TMUX_LOG"
: > "$FG_TEST_CLAUDE_LOG"

cat > "${TMP}/bin/tmux" <<'STUB_TMUX'
#!/usr/bin/env bash
# Recording tmux stub. Creates no server, no session, no process.
printf '%s\n' "$*" >> "$FG_TEST_TMUX_LOG"
sub="${1:-}"; shift 2>/dev/null || true
name=""
prev=""
for a in "$@"; do
  [ "$prev" = "-n" ] && name="$a"
  prev="$a"
done
case "$sub" in
  has-session) [ -f "${FG_TEST_TMUX_STATE}/session" ] && exit 0 || exit 1 ;;
  new-session) : > "${FG_TEST_TMUX_STATE}/session"
               [ -n "$name" ] && printf '%s\n' "$name" >> "${FG_TEST_TMUX_STATE}/windows"
               exit 0 ;;
  new-window)  [ -n "$name" ] && printf '%s\n' "$name" >> "${FG_TEST_TMUX_STATE}/windows"
               exit 0 ;;
  respawn-window) printf 'respawn %s\n' "$*" >> "${FG_TEST_TMUX_STATE}/respawns"; exit 0 ;;
  kill-session) rm -f "${FG_TEST_TMUX_STATE}/session"; exit 0 ;;
  *) exit 0 ;;
esac
STUB_TMUX

cat > "${TMP}/bin/claude" <<'STUB_CLAUDE'
#!/usr/bin/env bash
# Claude stub. Capability probes are recorded as probes; anything else would be
# a real role launch and is recorded as such so the selftest can assert none.
case "${1:-}" in
  --version) printf 'probe --version\n' >> "$FG_TEST_CLAUDE_LOG"; echo "0.0.0-stub (selftest)"; exit 0 ;;
  --help)    printf 'probe --help\n' >> "$FG_TEST_CLAUDE_LOG"; echo "usage: claude [prompt]"; exit 0 ;;
esac
printf 'LAUNCH %s\n' "$*" >> "$FG_TEST_CLAUDE_LOG"
cat > /dev/null
exit 0
STUB_CLAUDE

chmod +x "${TMP}/bin/tmux" "${TMP}/bin/claude"

git init -q "$FIX" 2>/dev/null
git -C "$FIX" config user.email "selftest@example.invalid"
git -C "$FIX" config user.name "M1 Role Floor Selftest"
git -C "$FIX" checkout -q -b lane/fixture 2>/dev/null
mkdir -p "${FIX}/src" "${FIX}/docs"
echo "base" > "${FIX}/src/a.txt"
echo "docs" > "${FIX}/docs/b.txt"
git -C "$FIX" add -A >/dev/null 2>&1
git -C "$FIX" commit -q -m "fixture base" >/dev/null 2>&1
BASE_SHA="$(git -C "$FIX" rev-parse HEAD)"
BASE_TREE="$(git -C "$FIX" rev-parse 'HEAD^{tree}')"

# The founder decision key belongs to the founder, not to the floor. The test
# holds it here because the test is playing the founder.
export FG_RF_FOUNDER_KEY_FILE="${TMP}/founder.key"
printf 'selftest-founder-key-%s\n' "$$" > "$FG_RF_FOUNDER_KEY_FILE"

# shellcheck source=../lib/claude-adapter.sh
. "${PKG}/lib/claude-adapter.sh"
fg_host_load m1 >/dev/null

printf 'FOUNDERGATE ROLE FLOOR SELFTEST\n'
printf '  package : %s %s\n' "$FG_RF_PACKAGE" "$FG_RF_VERSION"
printf '  hosts   : %s\n' "$(fg_host_list | tr '\n' ' ')"
printf '  tmpdir  : %s\n\n' "$TMP"

mk_run() {
  local run="$1"
  fg_run_init "$run" "$FIX" >/dev/null 2>&1
  printf '%s\n' "$run"
}
mint_founder_receipt() {
  # Signs with the founder key. The package can verify this; it can never
  # produce it, which is the whole point of the gate.
  local run="$1" task="$2" sha="$3" tree="$4" decision="${5:-APPROVE}" f body digest
  f="$(fg_gates_dir "$run")/${task}.decision.json"
  mkdir -p "$(dirname "$f")"
  jq -n --arg t "$task" --arg s "$sha" --arg tr "$tree" --arg d "$decision" --arg ts "$(fg_now)" \
    '{task_id:$t, candidate_sha:$s, candidate_tree:$tr, decision:$d,
      founder:"selftest-founder", issued_at:$ts}' > "$f"
  body="$(jq -S -c 'del(.digest)' "$f")"
  digest="$(fg_sha256_string "${body}|$(cat "$FG_RF_FOUNDER_KEY_FILE")")"
  jq --arg d "$digest" '. + {digest:$d}' "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
}
mk_task() {
  local run="$1" task="$2" lane="${3:-lane-a}"
  fg_task_create "$run" "$task" "$lane" "builder" "$FIX" "lane/fixture" "$BASE_SHA" "$BASE_TREE" >/dev/null 2>&1
}
mk_lease() {
  local run="$1" task="$2" allowed="${3:-src/*}"
  fg_lease_request "$run" "$task" "builder" "writable" "$FIX" "lane/fixture" \
    "$allowed" "docs/*" "$BASE_SHA" "$BASE_TREE" 3600
}
new_commit() {
  local msg="$1"
  echo "$msg $(date -u +%s%N 2>/dev/null || date -u +%s)" >> "${FIX}/src/a.txt"
  git -C "$FIX" add -A >/dev/null 2>&1
  git -C "$FIX" commit -q -m "$msg" >/dev/null 2>&1
}

# ===========================================================================
printf -- '-- tmux surface --\n'
# ===========================================================================

START_OUT="$(bash "${PKG}/bin/fg-role-floor-start.sh" --host m1 --repo "$FIX" 2>&1)"
RUN_A="$(printf '%s' "$START_OUT" | awk '/^run_id:/{print $2}')"
WINDOWS="$(cat "${FG_TEST_TMUX_STATE}/windows" 2>/dev/null)"
WCOUNT="$(printf '%s\n' "$WINDOWS" | grep -c . || true)"

assert_eq "T01 exactly four primary tmux windows are created" "4" "$WCOUNT"
assert_eq "T02 founder-facing window is orchestrator" "orchestrator" "$(printf '%s\n' "$WINDOWS" | head -1)"
assert_eq "T02b window set is exactly orchestrator/builder/checker/advisor" \
  "advisor builder checker orchestrator" "$(printf '%s\n' "$WINDOWS" | sort | tr '\n' ' ' | sed 's/ $//')"
assert_eq "T02c start printed only attach/status/stop guidance" "3" \
  "$(printf '%s\n' "$START_OUT" | grep -c -E '^(attach|status|stop):' || true)"

PLAN="$(bash "${PKG}/bin/fg-role-floor-start.sh" --host m1 --plan)"
assert_eq "T02d deterministic window plan reports four windows" "4" \
  "$(printf '%s' "$PLAN" | awk -F'\t' '/^window_count/{print $2}')"

if command -v tmux >/dev/null 2>&1; then
  TS="fgm1-selftest-$$"
  tmux -f /dev/null new-session -d -s "$TS" -n orchestrator "sleep 30" 2>/dev/null
  RC=$?
  if [ "$RC" -eq 0 ]; then
    for w in builder checker advisor; do tmux new-window -t "$TS" -n "$w" "sleep 30" 2>/dev/null; done
    LIVE="$(tmux list-windows -t "$TS" -F '#{window_name}' 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//')"
    tmux kill-session -t "$TS" 2>/dev/null
    assert_eq "T01b live tmux creates the same four-window surface" "advisor builder checker orchestrator" "$LIVE"
  else
    skip "T01b live tmux four-window creation" "tmux present but session creation failed"
  fi
else
  skip "T01b live tmux four-window creation" "tmux is not installed on this machine; window behaviour proven against the recording stub only"
fi

# ===========================================================================
printf -- '-- role gating --\n'
# ===========================================================================

RUN_B="$(mk_run "run-gates")"
mk_task "$RUN_B" "t-gate" "lane-gate"

OUT="$(bash "${PKG}/bin/fg-role-floor-dispatch.sh" launch "$RUN_B" "t-gate" builder "$FIX" 2>&1)"
assert_contains "T03 builder is parked until a valid writable lease exists" "BUILDER_BLOCKED:LEASE_MISSING" "$OUT"

assert_contains "T04 checker cannot start before candidate freeze" "CHECKER_BLOCKED_NO_CANDIDATE" \
  "$(fg_gate_checker_start "$RUN_B" "t-gate" "$FIX" 2>&1)"

assert_contains "T05 advisor cannot start before CLEAN" "ADVISOR_BLOCKED_NO_VERDICT" \
  "$(fg_gate_advisor_start "$RUN_B" "t-gate" 2>&1)"

# ===========================================================================
printf -- '-- role-forgery defence --\n'
# ===========================================================================

RUN_C="$(mk_run "run-forgery")"
mk_task "$RUN_C" "t-forge" "lane-forge"
B_TOKEN="$(fg_role_token_mint "$RUN_C" "t-forge" builder "digest-b" "sid-b")"
C_TOKEN="$(fg_role_token_mint "$RUN_C" "t-forge" checker "digest-c" "sid-c")"
A_TOKEN="$(fg_role_token_mint "$RUN_C" "t-forge" advisor "digest-a" "sid-a")"

assert_contains "T06 builder cannot write checker state" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"verdict":"CLEAN"}' | fg_role_result_write "$RUN_C" "t-forge" builder checker_verdict "$B_TOKEN" 2>&1)"
assert_contains "T07 checker cannot write advisor state" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"ready":true}' | fg_role_result_write "$RUN_C" "t-forge" checker advisor_packet "$C_TOKEN" 2>&1)"
assert_contains "T08 advisor cannot write merge state" "M4_AUTHORITY_SEALED" \
  "$(echo '{"merged":true}' | fg_role_result_write "$RUN_C" "t-forge" advisor merge_receipt "$A_TOKEN" 2>&1)"
assert_contains "T08b no role at all can write a merge receipt" "M4_AUTHORITY_SEALED" \
  "$(echo '{"merged":true}' | fg_role_result_write "$RUN_C" "t-forge" orchestrator merge_receipt "$B_TOKEN" 2>&1)"
assert_contains "T08c a forged role token is rejected" "ROLE_TOKEN_INVALID" \
  "$(echo '{"verdict":"CLEAN"}' | fg_role_result_write "$RUN_C" "t-forge" checker checker_verdict "not-the-real-token" 2>&1)"
assert_contains "T08d the legitimate role writer still works" "RESULT_WRITTEN:" \
  "$(echo '{"verdict":"FINDINGS"}' | fg_role_result_write "$RUN_C" "t-forge" checker checker_verdict "$C_TOKEN" 2>&1)"

# ===========================================================================
printf -- '-- leases --\n'
# ===========================================================================

RUN_D="$(mk_run "run-leases")"
mk_task "$RUN_D" "t-w1" "lane-w1"
mk_task "$RUN_D" "t-w2" "lane-w2"
mk_task "$RUN_D" "t-w3" "lane-w3"

assert_contains "T09a first writable lease is granted" "LEASE_GRANTED" "$(mk_lease "$RUN_D" "t-w1" "src/*")"
assert_eq "T09 two overlapping writer leases are rejected" "LEASE_REJECTED_OVERLAP" \
  "$(fg_lease_request "$RUN_D" "t-w2" builder writable "$FIX" "lane/other" "src/a.txt" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_contains "T10 two disjoint writer leases are allowed" "LEASE_GRANTED" \
  "$(fg_lease_request "$RUN_D" "t-w2" builder writable "$FIX" "lane/other" "docs/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T11 writable lease against protected main is rejected" "LEASE_REJECTED_PROTECTED_BRANCH" \
  "$(fg_lease_request "$RUN_D" "t-w3" builder writable "$FIX" "main" "lib/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T12 shared integration surfaces require M4 handoff" "M4_HANDOFF_REQUIRED" \
  "$(fg_lease_request "$RUN_D" "t-w3" builder writable "$FIX" "lane/x" ".foundergate/state/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T12b a second writer on the same branch is rejected" "LEASE_REJECTED_BRANCH_WRITER_EXISTS" \
  "$(fg_lease_request "$RUN_D" "t-w3" builder writable "$FIX" "lane/fixture" "totally/other/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T12c only the builder may hold a writable lease" "LEASE_REJECTED_ROLE_MISMATCH" \
  "$(fg_lease_request "$RUN_D" "t-w3" checker writable "$FIX" "lane/y" "elsewhere/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_contains "T12d concurrent read-only leases are allowed" "LEASE_GRANTED" \
  "$(fg_lease_request "$RUN_D" "t-w3" checker read_only "$FIX" "lane/fixture" "src/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T12e a stale writable lease cannot be silently reused" "LEASE_REJECTED_STALE_REUSE" \
  "$( fg_lease_request "$RUN_D" "t-stale" builder writable "$FIX" "lane/stale" "stale/*" "" "$BASE_SHA" "$BASE_TREE" -1 >/dev/null 2>&1
     fg_lease_request "$RUN_D" "t-stale" builder writable "$FIX" "lane/stale" "stale/*" "" "$BASE_SHA" "$BASE_TREE" 3600 )"
assert_eq "T12f lease digest tampering is detected" "LEASE_DIGEST_MISMATCH" \
  "$( jq '.allowed_globs=["everything/*"]' "$(fg_lease_file "$RUN_D" "t-w1")" > "${TMP}/tamper.json"
     cp "${TMP}/tamper.json" "$(fg_lease_file "$RUN_D" "t-w1")"
     fg_lease_verify "$RUN_D" "t-w1" )"
assert_eq "T12g writes outside the lease are refused" "PATH_OUTSIDE_LEASE" \
  "$(fg_lease_path_allowed "$RUN_D" "t-w2" "src/a.txt")"

# Regression: lease globs must never be expanded against the current working
# directory. Run the same overlap check from a directory that DOES contain a
# matching src/ tree; a cwd-sensitive check silently admits a second writer.
mkdir -p "${TMP}/globtrap/src"
: > "${TMP}/globtrap/src/decoy-one.txt"
: > "${TMP}/globtrap/src/decoy-two.txt"
mk_task "$RUN_D" "t-w4" "lane-w4"
mk_task "$RUN_D" "t-w5" "lane-w5"
assert_contains "T09b a writable lease is granted from a glob-trap directory" "LEASE_GRANTED" \
  "$(cd "${TMP}/globtrap" && fg_lease_request "$RUN_D" "t-w4" builder writable "${TMP}/other-repo" "lane/g1" "src/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T09c overlap detection does not depend on the working directory" "LEASE_REJECTED_OVERLAP" \
  "$(cd "${TMP}/globtrap" && fg_lease_request "$RUN_D" "t-w5" builder writable "${TMP}/other-repo" "lane/g2" "src/a.txt" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "T09d shared-surface detection does not depend on the working directory" "M4_HANDOFF_REQUIRED" \
  "$(cd "${TMP}/globtrap" && fg_lease_request "$RUN_D" "t-w6" builder writable "${TMP}/other-repo" "lane/g3" ".foundergate/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"

# ===========================================================================
printf -- '-- candidate freeze and sequencing --\n'
# ===========================================================================

RUN_E="$(mk_run "run-seq")"
mk_task "$RUN_E" "t-seq" "lane-seq"
mk_lease "$RUN_E" "t-seq" "src/*" >/dev/null
E_BTOK="$(fg_role_token_mint "$RUN_E" "t-seq" builder "d-b" "s-b")"
echo '{"claim":"fixture change"}' | fg_role_result_write "$RUN_E" "t-seq" builder builder_report "$E_BTOK" >/dev/null
new_commit "candidate one"
CAND_SHA="$(git -C "$FIX" rev-parse HEAD)"
FREEZE="$(fg_candidate_freeze "$RUN_E" "t-seq" "$FIX" "$E_BTOK")"
assert_contains "T13a candidate freeze binds the exact commit" "CANDIDATE_FROZEN:${CAND_SHA}" "$FREEZE"
assert_eq "T13b checker may start on a matching frozen candidate" "CHECKER_START_ALLOWED" \
  "$(fg_gate_checker_start "$RUN_E" "t-seq" "$FIX")"

new_commit "head moved after freeze"
assert_eq "T13 candidate SHA drift blocks checking" "CHECKER_BLOCKED_CANDIDATE_DRIFT" \
  "$(fg_gate_checker_start "$RUN_E" "t-seq" "$FIX")"

echo "dirty" >> "${FIX}/src/a.txt"
assert_eq "T13c a dirty working tree cannot be frozen" "CANDIDATE_DIRTY" \
  "$(fg_candidate_freeze "$RUN_E" "t-seq" "$FIX" "$E_BTOK")"
git -C "$FIX" checkout -q -- . 2>/dev/null

# Re-freeze at live HEAD so the sequencing tests continue from a valid candidate.
FREEZE2="$(fg_candidate_freeze "$RUN_E" "t-seq" "$FIX" "$E_BTOK")"
E_CTOK="$(fg_role_token_mint "$RUN_E" "t-seq" checker "d-c" "s-c")"
jq -n --arg s "$(git -C "$FIX" rev-parse HEAD)" --arg t "$(git -C "$FIX" rev-parse 'HEAD^{tree}')" \
  '{verdict:"FINDINGS", candidate_sha:$s, candidate_tree:$t, findings:[{id:"F1",severity:"HIGH"}]}' \
  | fg_role_result_write "$RUN_E" "t-seq" checker checker_verdict "$E_CTOK" >/dev/null
fg_task_set_status "$RUN_E" "t-seq" "FINDINGS" "checker returned findings" >/dev/null

assert_eq "T14 checker findings suppress the advisor" "ADVISOR_BLOCKED_NOT_CLEAN" \
  "$(fg_gate_advisor_start "$RUN_E" "t-seq")"
assert_eq "T14b findings do not auto-continue to the advisor" "AUTO:launch_correction_cycle" \
  "$(fg_continuation_decision "$RUN_E" "t-seq" "$FIX")"

CORR_BEFORE="$(fg_retry_get "$RUN_E" "t-seq" correction_attempts)"
assert_eq "T15a a bounded correction cycle opens" "CORRECTION_CYCLE_OPENED" "$(fg_correction_open "$RUN_E" "t-seq")"
assert_eq "T15 the correction cycle invalidates the old checker evidence" "false" \
  "$( [ -f "$(fg_role_artifact_path "$RUN_E" "t-seq" checker_verdict)" ] && echo true || echo false )"
assert_eq "T15b the superseded verdict is archived, not deleted" "true" \
  "$(jq -r '.payload.superseded' "$(fg_roles_dir "$RUN_E")/t-seq/invalidated/checker.verdict.${CORR_BEFORE}.json" 2>/dev/null)"
assert_eq "T15c the old candidate freeze is parked" "false" \
  "$( [ -f "$(fg_role_artifact_path "$RUN_E" "t-seq" candidate_freeze)" ] && echo true || echo false )"
assert_eq "T15d a correction attempt was consumed" "$((CORR_BEFORE + 1))" \
  "$(fg_retry_get "$RUN_E" "t-seq" correction_attempts)"

# Exhaust the correction budget.
fg_task_set_status "$RUN_E" "t-seq" "FINDINGS" "second findings" >/dev/null
fg_correction_open "$RUN_E" "t-seq" >/dev/null
fg_task_set_status "$RUN_E" "t-seq" "FINDINGS" "third findings" >/dev/null
assert_eq "T16 retry limits are respected" "RETRY_BUDGET_EXHAUSTED" "$(fg_correction_open "$RUN_E" "t-seq")"
assert_eq "T16b an exhausted budget stops automatic continuation" "STOP:ESCALATED" \
  "$(fg_continuation_decision "$RUN_E" "t-seq" "$FIX")"

# CLEAN path: advisor is admitted only on an exact, bound, CLEAN verdict.
RUN_F="$(mk_run "run-clean")"
mk_task "$RUN_F" "t-clean" "lane-clean"
mk_lease "$RUN_F" "t-clean" "src/*" >/dev/null
F_BTOK="$(fg_role_token_mint "$RUN_F" "t-clean" builder "d-b" "s-b")"
echo '{"claim":"ok"}' | fg_role_result_write "$RUN_F" "t-clean" builder builder_report "$F_BTOK" >/dev/null
fg_candidate_freeze "$RUN_F" "t-clean" "$FIX" "$F_BTOK" >/dev/null
F_CTOK="$(fg_role_token_mint "$RUN_F" "t-clean" checker "d-c" "s-c")"
jq -n --arg s "$(git -C "$FIX" rev-parse HEAD)" --arg t "$(git -C "$FIX" rev-parse 'HEAD^{tree}')" \
  '{verdict:"CLEAN", candidate_sha:$s, candidate_tree:$t, findings:[]}' \
  | fg_role_result_write "$RUN_F" "t-clean" checker checker_verdict "$F_CTOK" >/dev/null
fg_task_set_status "$RUN_F" "t-clean" "CLEAN" "checker clean" >/dev/null
assert_eq "T05b advisor is admitted after an exact CLEAN verdict" "ADVISOR_START_ALLOWED" \
  "$(fg_gate_advisor_start "$RUN_F" "t-clean")"
cp "$(fg_role_artifact_path "$RUN_F" "t-clean" checker_verdict)" "${TMP}/verdict.orig.json"
jq -n --arg t "$(git -C "$FIX" rev-parse 'HEAD^{tree}')" \
  '{verdict:"CLEAN", candidate_sha:"0000000000000000000000000000000000000000", candidate_tree:$t, findings:[]}' \
  | fg_role_result_write "$RUN_F" "t-clean" checker checker_verdict "$F_CTOK" >/dev/null
assert_eq "T05c a properly written CLEAN verdict bound to another SHA is rejected" "ADVISOR_BLOCKED_CANDIDATE_DRIFT" \
  "$(fg_gate_advisor_start "$RUN_F" "t-clean")"
jq '.payload.findings=["silently edited"]' "${TMP}/verdict.orig.json" > "${TMP}/v.json"
cp "${TMP}/v.json" "$(fg_role_artifact_path "$RUN_F" "t-clean" checker_verdict)"
assert_eq "T05d an edited verdict fails its binding before anything else" "ADVISOR_BLOCKED_INVALID_BINDING" \
  "$(fg_gate_advisor_start "$RUN_F" "t-clean")"
cp "${TMP}/verdict.orig.json" "$(fg_role_artifact_path "$RUN_F" "t-clean" checker_verdict)"
assert_eq "T05e the untampered verdict still admits the advisor" "ADVISOR_START_ALLOWED" \
  "$(fg_gate_advisor_start "$RUN_F" "t-clean")"

# ===========================================================================
printf -- '-- context exhaustion --\n'
# ===========================================================================

RUN_G="$(mk_run "run-context")"
mk_task "$RUN_G" "t-ctx" "lane-ctx"
mk_lease "$RUN_G" "t-ctx" "src/*" >/dev/null
LEASE_BEFORE="$(fg_task_get "$RUN_G" "t-ctx" lease_digest)"
fg_task_update "$RUN_G" "t-ctx" '.role="builder"' >/dev/null
CORR_G_BEFORE="$(fg_retry_get "$RUN_G" "t-ctx" correction_attempts)"; CORR_G_BEFORE="${CORR_G_BEFORE:-0}"

LOGF="$(fg_logs_dir "$RUN_G")/t-ctx.builder.log"
mkdir -p "$(dirname "$LOGF")"
printf 'working\nprompt is too long\n' > "$LOGF"
assert_eq "T17a a context-exhaustion exit is classified mechanically" "CONTEXT_EXHAUSTED" \
  "$(fg_classify_exit "$RUN_G" "t-ctx" builder 0 "$LOGF")"
printf 'segfault\n' > "$LOGF"
assert_eq "T17b a non-zero exit is not treated as context exhaustion" "SESSION_FAILED" \
  "$(fg_classify_exit "$RUN_G" "t-ctx" builder 137 "$LOGF")"
assert_eq "T17c a silent exit is escalated, not assumed" "SESSION_INCOMPLETE" \
  "$(fg_classify_exit "$RUN_G" "t-ctx" builder 0 "$LOGF")"

HANDOFF="$(fg_handoff_build "$RUN_G" "t-ctx" builder "$FIX")"
fg_retry_bump_context_restart "$RUN_G" "t-ctx" >/dev/null
assert_eq "T17 context restart preserves the role" "builder" "$(jq -r '.role' "$HANDOFF")"
assert_eq "T17d context restart preserves the lease digest" "$LEASE_BEFORE" "$(jq -r '.lease_digest' "$HANDOFF")"
assert_eq "T17e the handoff binds exact repository truth" "$(git -C "$FIX" rev-parse HEAD)" "$(jq -r '.current_sha' "$HANDOFF")"
assert_eq "T17f the handoff demands disk revalidation" "true" "$(jq -r '.revalidate_disk_truth_before_continuing' "$HANDOFF")"
assert_eq "T18 context restart does not consume a correction attempt" "$CORR_G_BEFORE" \
  "$(fg_retry_get "$RUN_G" "t-ctx" correction_attempts)"
assert_eq "T18b the context restart counter advanced separately" "1" \
  "$(fg_retry_get "$RUN_G" "t-ctx" context_restarts)"
assert_contains "T18c a builder is never restarted as a checker" "ROLE_SWITCH_REFUSED" \
  "$(bash "${PKG}/bin/fg-role-floor-dispatch.sh" restart "$RUN_G" "t-ctx" checker "$FIX" 2>&1)"

# ===========================================================================
printf -- '-- bounded continuation and sealed authorities --\n'
# ===========================================================================

RUN_H="$(mk_run "run-authority")"
mk_task "$RUN_H" "t-auth" "lane-auth"

fg_task_set_status "$RUN_H" "t-auth" "HUMAN_ACTION_REQUIRED" "founder decision" >/dev/null
assert_eq "T19 HUMAN_ACTION_REQUIRED stops continuation" "STOP:HUMAN_ACTION_REQUIRED" \
  "$(fg_continuation_decision "$RUN_H" "t-auth" "$FIX")"
fg_task_set_status "$RUN_H" "t-auth" "M4_HANDOFF_REQUIRED" "serial integration" >/dev/null
assert_eq "T20 M4_HANDOFF_REQUIRED stops continuation" "STOP:M4_HANDOFF_REQUIRED" \
  "$(fg_continuation_decision "$RUN_H" "t-auth" "$FIX")"

assert_eq "T21 a merge request is refused" "M4_HANDOFF_REQUIRED" \
  "$(fg_authority_request "$RUN_H" "t-auth" advisor merge)"
assert_eq "T21b the refused merge was never executed locally" "false" \
  "$(jq -r '.executed_locally' "$(fg_gates_dir "$RUN_H")/t-auth.merge.json")"
assert_eq "T22a a signature request is refused" "HUMAN_ACTION_REQUIRED" \
  "$(fg_authority_request "$RUN_H" "t-auth" orchestrator signature)"
assert_eq "T22 an activation request is refused" "HUMAN_ACTION_REQUIRED" \
  "$(fg_authority_request "$RUN_H" "t-auth" orchestrator activation)"
assert_eq "T22b a protected-main push is refused" "M4_HANDOFF_REQUIRED" \
  "$(fg_authority_request "$RUN_H" "t-auth" builder push_protected_main)"
assert_eq "T22c every M4 authority is modelled as external" "7" \
  "$(printf '%s' "$FG_RF_M4_AUTHORITIES" | wc -w | tr -d ' ')"

fg_task_set_status "$RUN_H" "t-auth" "READY_FOR_FOUNDER_GATE" "packet ready" >/dev/null
assert_eq "T19b a founder gate stops continuation" "STOP:FOUNDER_GATE" \
  "$(fg_continuation_decision "$RUN_H" "t-auth" "$FIX")"

# ===========================================================================
printf -- '-- status, stop, resume --\n'
# ===========================================================================

STATUS_JSON="$(bash "${PKG}/bin/fg-role-floor-status.sh" --run-id "$RUN_H" --repo "$FIX" --json 2>/dev/null)"
assert_eq "T23 status accurately reflects fixture state" "READY_FOR_FOUNDER_GATE" \
  "$(printf '%s' "$STATUS_JSON" | jq -r '.tasks[] | select(.task=="t-auth") | .status')"
assert_eq "T23b status counts the founder action" "1" \
  "$(printf '%s' "$STATUS_JSON" | jq -r '.founder_action_required')"
assert_eq "T23c status reports merge as sealed" "true" \
  "$(printf '%s' "$STATUS_JSON" | jq -r '.merge_sealed')"
assert_contains "T23d status renders without a live tmux session" "FOUNDERGATE ROLE FLOOR - STATUS" \
  "$(bash "${PKG}/bin/fg-role-floor-status.sh" --run-id "$RUN_H" --repo "$FIX" 2>/dev/null)"

RETRY_BEFORE="$(cat "$(fg_retry_file "$RUN_E")")"
EVENTS_BEFORE="$(fg_event_count "$RUN_E")"
VERDICT_ARCHIVE_BEFORE="$(ls -1 "$(fg_roles_dir "$RUN_E")/t-seq/invalidated" 2>/dev/null | wc -l | tr -d ' ')"
STOP_OUT="$(bash "${PKG}/bin/fg-role-floor-stop.sh" --run-id "$RUN_E" 2>&1)"
assert_contains "T24a graceful stop reports STOPPED" "STATUS: STOPPED" "$STOP_OUT"
assert_eq "T24 graceful stop preserves the retry ledger" "$RETRY_BEFORE" "$(cat "$(fg_retry_file "$RUN_E")")"
assert_eq "T24b graceful stop preserves archived verdicts" "$VERDICT_ARCHIVE_BEFORE" \
  "$(ls -1 "$(fg_roles_dir "$RUN_E")/t-seq/invalidated" 2>/dev/null | wc -l | tr -d ' ')"
assert_eq "T24c graceful stop only appends events" "true" \
  "$( [ "$(fg_event_count "$RUN_E")" -ge "$EVENTS_BEFORE" ] && echo true || echo false )"
assert_eq "T24d stop disables further dispatch" "STOP:STOP_REQUESTED" \
  "$(fg_continuation_decision "$RUN_E" "t-seq" "$FIX")"
assert_eq "T24e stop leaves a resumable state" "true" \
  "$( [ -f "$(fg_control_dir "$RUN_E")/NEXT_SAFE_ACTION.md" ] && echo true || echo false )"

assert_eq "T27 event records are append-only and chain-verified" "EVENT_CHAIN_OK:$(fg_event_count "$RUN_F")" \
  "$(fg_events_verify "$RUN_F")"

# Resume: completed verdicts are neither duplicated nor re-graded.
RESUME_PLAN="$(bash "${PKG}/bin/fg-role-floor-start.sh" --resume-check --run-id "$RUN_F" --repo "$FIX" 2>&1)"
assert_contains "T26a resume verification passes on healthy state" "RESUME_OK" "$RESUME_PLAN"
fg_task_set_status "$RUN_F" "t-clean" "READY_FOR_CHECK" "re-entry" >/dev/null
RESUME_PLAN2="$(bash "${PKG}/bin/fg-role-floor-start.sh" --resume-check --run-id "$RUN_F" --repo "$FIX" 2>&1)"
assert_contains "T26 resume does not duplicate a completed verdict" "SKIP:VERDICT_ALREADY_COMPLETE" "$RESUME_PLAN2"

RUN_I="$(mk_run "run-corrupt")"
mk_task "$RUN_I" "t-corrupt" "lane-corrupt"
fg_seal_checksums "$RUN_I"
EV="$(fg_events_file "$RUN_I")"
sed 's/"type":"task_created"/"type":"tampered_event"/' "$EV" > "${TMP}/ev.tampered"
cp "${TMP}/ev.tampered" "$EV"
assert_contains "T25 resume rejects corrupted state" "RESUME_REFUSED_EVENT_CHAIN" \
  "$(bash "${PKG}/bin/fg-role-floor-start.sh" --resume-check --run-id "$RUN_I" --repo "$FIX" 2>&1)"
assert_contains "T25b an in-place event rewrite breaks the chain" "EVENT_CHAIN_BROKEN" "$(fg_events_verify "$RUN_I")"

RUN_J="$(mk_run "run-sums")"
mk_task "$RUN_J" "t-sums" "lane-sums"
fg_seal_checksums "$RUN_J"
jq '.status="CLEAN"' "$(fg_task_file "$RUN_J" "t-sums")" > "${TMP}/s.json"
cp "${TMP}/s.json" "$(fg_task_file "$RUN_J" "t-sums")"
assert_contains "T25c sealed state tampering is detected" "CHECKSUMS_MISMATCH" "$(fg_verify_checksums "$RUN_J")"
assert_contains "T25d resume refuses tampered sealed state" "RESUME_REFUSED_CORRUPTED_STATE" \
  "$(bash "${PKG}/bin/fg-role-floor-start.sh" --resume-check --run-id "$RUN_J" --repo "$FIX" 2>&1)"

# ===========================================================================
printf -- '-- prompts, adapter, isolation --\n'
# ===========================================================================

assert_eq "T28 role prompt digests are verified" "PROMPT_DIGESTS_OK" "$(fg_prompt_templates_verify)"
cp -R "$PKG" "${TMP}/pkgcopy"
printf '\ntampered\n' >> "${TMP}/pkgcopy/prompts/checker.md"
assert_contains "T28b a tampered prompt template is rejected" "PROMPT_DIGEST_MISMATCH" \
  "$(bash -c ". '${TMP}/pkgcopy/lib/claude-adapter.sh' >/dev/null 2>&1; fg_prompt_templates_verify" 2>&1)"

RENDER_DEST="${TMP}/rendered.md"
RD="$(fg_prompt_render builder "$RENDER_DEST" "$(jq -n '{PACKAGE_VERSION:"1.0.0",RUN_ID:"r",TASK_ID:"t",ROLE:"builder",LANE:"l",REPO_PATH:"/p",BRANCH:"b",BASE_SHA:"s",BASE_TREE:"t2",CANDIDATE_SHA:"c",CANDIDATE_TREE:"ct",ALLOWED_PATHS:"src/*",FORBIDDEN_PATHS:"docs/*",LEASE_DIGEST:"ld",SESSION_ID:"sid",RUN_ROOT:"/rr",REPORT_PATH:"/rp",ROLE_TOKEN_FILE:"/tf",RETRY_LIMIT:"2",HANDOFF_PATH:"none",TEST_CONTRACT:"tc",STOP_CONDITIONS:"sc"}')")"
assert_eq "T28c a rendered prompt leaves no unbound placeholder" "0" \
  "$(grep -c '{{' "$RENDER_DEST" 2>/dev/null | head -1)"
assert_eq "T28d the rendered prompt digest is reproducible" "$RD" "$(fg_prompt_rendered_digest "$RENDER_DEST")"
assert_contains "T28e an incomplete binding set is refused" "PROMPT_BINDING_MISSING" \
  "$(fg_prompt_render builder "${TMP}/bad.md" '{"ROLE":"builder"}' 2>&1)"

LAUNCH_CMD="$(fg_claude_launch_command "/tmp/p.md" "/tmp/l.log" "/tmp/e")"
assert_eq "T29a the launch command carries no context-fusing flag" "LAUNCH_COMMAND_OK" \
  "$(fg_claude_assert_no_forbidden_flags "$LAUNCH_CMD")"
assert_contains "T29b --continue is mechanically refused" "FORBIDDEN_CLAUDE_FLAG" \
  "$(fg_claude_assert_no_forbidden_flags "claude --continue < p.md")"
assert_contains "T29c --resume is mechanically refused" "FORBIDDEN_CLAUDE_FLAG" \
  "$(fg_claude_assert_no_forbidden_flags "claude --resume abc < p.md")"
assert_contains "T29d permission bypass is mechanically refused" "FORBIDDEN_CLAUDE_FLAG" \
  "$(fg_claude_assert_no_forbidden_flags "claude --dangerously-skip-permissions")"

REAL_LAUNCHES="$(grep -c '^LAUNCH ' "$FG_TEST_CLAUDE_LOG" 2>/dev/null || true)"
assert_eq "T29 no test invokes a real model or provider" "0" "${REAL_LAUNCHES:-0}"
assert_eq "T29e the only Claude calls made were capability probes" "0" \
  "$(grep -v '^probe ' "$FG_TEST_CLAUDE_LOG" 2>/dev/null | grep -c . || true)"

assert_eq "T30 no repository other than the fixture was modified" "$CLONE_STATUS_BEFORE" \
  "$(git -C "$CLONE" status --porcelain=v1 2>/dev/null | sort)"
assert_eq "T30b all mutable run state lives outside the source repository" "true" \
  "$(printf '%s' "$FG_RF_RUN_ROOT" | grep -q "^${TMP}" && echo true || echo false)"
assert_eq "T30c every state record points at the fixture repository" "0" \
  "$(find "$FG_RF_RUN_ROOT" -name '*.state.json' -exec jq -r '.repository' {} \; 2>/dev/null \
     | grep -v "^${FIX}$" | grep -c . || true)"

# ===========================================================================
printf -- '-- supervisor, heavy-test lock, static checks --\n'
# ===========================================================================

RUN_K="$(mk_run "run-sup")"
mk_task "$RUN_K" "t-sup" "lane-sup"
fg_task_set_status "$RUN_K" "t-sup" "HUMAN_ACTION_REQUIRED" "gate" >/dev/null
SWEEP="$(bash "${PKG}/bin/fg-role-floor-supervisor.sh" "$RUN_K" "$FIX" --once 2>&1 | tail -1)"
assert_eq "T31 one supervisor sweep stops at the gate without acting" "SWEEP:acted=0:stopped=1" "$SWEEP"
assert_contains "T31b the supervisor records why it stopped" "HUMAN_ACTION_REQUIRED" \
  "$(cat "$(fg_control_dir "$RUN_K")/NEXT_SAFE_ACTION.md")"

assert_contains "T32 the heavy-test lock admits one holder" "HEAVY_TEST_LOCK_ACQUIRED" \
  "$(fg_heavy_lock_acquire "$RUN_K" "t-sup" 2>&1)"
assert_contains "T32b a second heavy test is refused" "HEAVY_TEST_LOCK_HELD" \
  "$(fg_heavy_lock_acquire "$RUN_K" "t-other" 2>&1)"

STATIC_HITS=0
for pat in 'dangerously-skip-permissions' 'brew install' 'npm install -g' 'tmux kill-server' 'git push' 'gh pr create' 'gh pr merge'; do
  if grep -rn -- "$pat" "${PKG}/bin" "${PKG}/lib" 2>/dev/null | grep -v '^.*FORBIDDEN' | grep -v 'FG_RF_FORBIDDEN_CLAUDE_FLAGS' | grep -q .; then
    STATIC_HITS=$((STATIC_HITS+1))
    printf '     static hit: %s\n' "$pat"
  fi
done
assert_eq "T33 no forbidden command appears in the package" "0" "$STATIC_HITS"

assert_eq "T33b every package script parses under bash -n" "0" \
  "$( rc=0
     for f in "${PKG}"/bin/*.sh "${PKG}"/lib/*.sh "${PKG}"/selftest/*.sh; do
       bash -n "$f" 2>/dev/null || rc=$((rc+1))
     done; echo "$rc" )"

assert_eq "T34 no orphan process survives the test run" "0" \
  "$(pgrep -f "$TMP" 2>/dev/null | grep -v "^$$\$" | grep -c . || true)"

assert_eq "T35 the lane status vocabulary is complete" "22" \
  "$(printf '%s' "$FG_RF_STATUSES" | wc -w | tr -d ' ')"

# ===========================================================================
printf -- '-- cross-host: M1 profile boundaries --\n'
# ===========================================================================

fg_host_load m1 >/dev/null
RUN_M1="$(mk_run "run-m1-profile")"
mk_task "$RUN_M1" "t-m1" "lane-m1"
M1_TOK="$(fg_role_token_mint "$RUN_M1" "t-m1" builder "d" "s")"
M1_ATOK="$(fg_role_token_mint "$RUN_M1" "t-m1" advisor "d" "s")"

assert_eq "M03a M1 cannot publish integration authority" "M4_AUTHORITY_SEALED" \
  "$(echo '{"integrated":true}' | fg_role_result_write "$RUN_M1" "t-m1" builder integration_write "$M1_TOK" 2>&1)"
assert_eq "M03b M1 cannot publish a final verification" "M4_AUTHORITY_SEALED" \
  "$(echo '{"verdict":"PASS"}' | fg_role_result_write "$RUN_M1" "t-m1" advisor final_verification_report "$M1_ATOK" 2>&1)"
assert_eq "M03c M1 cannot publish merge authority" "M4_AUTHORITY_SEALED" \
  "$(echo '{"merged":true}' | fg_role_result_write "$RUN_M1" "t-m1" advisor merge_receipt "$M1_ATOK" 2>&1)"
assert_eq "M03d M1 has no serial-integration role at all" "false" \
  "$(fg_host_has_role serial-integration && echo true || echo false)"
assert_eq "M03e M1 refuses the merge-sheriff gate outright" "M4_HANDOFF_REQUIRED" \
  "$(fg_merge_sheriff_gate "$RUN_M1" "t-m1")"
assert_eq "M03f M1 refuses the serial-integration gate outright" "M4_HANDOFF_REQUIRED" \
  "$(fg_serial_integration_gate "$RUN_M1" "t-m1" "abc" "def")"
assert_eq "M03g M1 routes a merge request to M4" "M4_HANDOFF_REQUIRED" \
  "$(fg_authority_request "$RUN_M1" "t-m1" advisor merge)"

# ===========================================================================
printf -- '-- cross-host: M4 profile --\n'
# ===========================================================================

rm -f "${FG_TEST_TMUX_STATE}/session" "${FG_TEST_TMUX_STATE}/windows"
M4_START="$(bash "${PKG}/bin/fg-role-floor-start.sh" --host m4 --repo "$FIX" 2>&1)"
M4_WINDOWS="$(cat "${FG_TEST_TMUX_STATE}/windows" 2>/dev/null)"
assert_eq "M02 M4 creates the seven governed role windows" "7" \
  "$(printf '%s\n' "$M4_WINDOWS" | grep -c . || true)"
assert_eq "M02b the M4 window set is exactly the seven required roles" \
  "advisor builder checker final-verifier merge-sheriff orchestrator serial-integration" \
  "$(printf '%s\n' "$M4_WINDOWS" | sort | tr '\n' ' ' | sed 's/ $//')"
assert_eq "M02c the M4 founder-facing window is still the orchestrator" "orchestrator" \
  "$(printf '%s\n' "$M4_WINDOWS" | head -1)"
assert_contains "M02d the M4 session name is distinct from M1" "foundergate-m4" "$M4_START"

fg_host_load m4 >/dev/null
RUN_M4="$(mk_run "run-m4-profile")"
mk_task "$RUN_M4" "t-m4" "lane-m4"
M4_BTOK="$(fg_role_token_mint "$RUN_M4" "t-m4" builder "d" "s")"
M4_CTOK="$(fg_role_token_mint "$RUN_M4" "t-m4" checker "d" "s")"
M4_ATOK="$(fg_role_token_mint "$RUN_M4" "t-m4" advisor "d" "s")"
M4_STOK="$(fg_role_token_mint "$RUN_M4" "t-m4" serial-integration "d" "s")"
M4_VTOK="$(fg_role_token_mint "$RUN_M4" "t-m4" final-verifier "d" "s")"
M4_MTOK="$(fg_role_token_mint "$RUN_M4" "t-m4" merge-sheriff "d" "s")"

assert_eq "M04 the M4 builder cannot invoke serial integration" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"integrated":true}' | fg_role_result_write "$RUN_M4" "t-m4" builder integration_write "$M4_BTOK" 2>&1)"
assert_eq "M05 the M4 checker cannot write advisor state" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"ready":true}' | fg_role_result_write "$RUN_M4" "t-m4" checker advisor_packet "$M4_CTOK" 2>&1)"
assert_eq "M06 the M4 advisor cannot write verifier state" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"verdict":"PASS"}' | fg_role_result_write "$RUN_M4" "t-m4" advisor final_verification_report "$M4_ATOK" 2>&1)"
assert_eq "M06b the M4 serial writer cannot write a merge receipt" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"merged":true}' | fg_role_result_write "$RUN_M4" "t-m4" serial-integration merge_receipt "$M4_STOK" 2>&1)"
assert_eq "M06c the M4 builder still cannot check its own work" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"verdict":"CLEAN"}' | fg_role_result_write "$RUN_M4" "t-m4" builder checker_verdict "$M4_BTOK" 2>&1)"
assert_eq "M06d the M4 checker still cannot repair via a candidate freeze" "ROLE_FORGERY_REJECTED" \
  "$(echo '{"commit_sha":"x"}' | fg_role_result_write "$RUN_M4" "t-m4" checker candidate_freeze "$M4_CTOK" 2>&1)"
assert_eq "M06e founder signature stays sealed on M4" "HUMAN_ACTION_REQUIRED" \
  "$(fg_authority_request "$RUN_M4" "t-m4" merge-sheriff signature)"
assert_eq "M06f production activation stays sealed on M4" "HUMAN_ACTION_REQUIRED" \
  "$(fg_authority_request "$RUN_M4" "t-m4" orchestrator activation)"

# Serial integration: exact inputs, one writer.
mk_task "$RUN_M4" "t-si-a" "lane-si-a"
mk_task "$RUN_M4" "t-si-b" "lane-si-b"
assert_contains "M07a M4 grants a shared-surface lease to the serial writer" "LEASE_GRANTED" \
  "$(fg_lease_request "$RUN_M4" "t-si-a" serial-integration writable "$FIX" "lane/int-a" ".foundergate/state/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "M07 serial integration rejects a second concurrent writer" "LEASE_REJECTED_SERIAL_WRITER_ACTIVE" \
  "$(fg_lease_request "$RUN_M4" "t-si-b" serial-integration writable "$FIX" "lane/int-b" "unrelated/path/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "M07b the M4 builder still cannot write a shared surface" "M4_HANDOFF_REQUIRED" \
  "$(fg_lease_request "$RUN_M4" "t-si-b" builder writable "$FIX" "lane/int-c" ".github/workflows/*" "" "$BASE_SHA" "$BASE_TREE" 3600)"
assert_eq "M07c serial integration refuses an inexact input" "SERIAL_INTEGRATION_REFUSED_INEXACT_INPUT" \
  "$(fg_serial_integration_gate "$RUN_M4" "t-si-a" "not-frozen" "not-frozen")"
assert_eq "M07d serial integration refuses an unaccepted candidate" "SERIAL_INTEGRATION_REFUSED_NOT_ACCEPTED" \
  "$(fg_serial_integration_gate "$RUN_M4" "t-si-a" "$(git -C "$FIX" rev-parse HEAD)" "$(git -C "$FIX" rev-parse 'HEAD^{tree}')")"

# Final verification: the exact final tree and SHA, or nothing.
FINAL_SHA="$(git -C "$FIX" rev-parse HEAD)"
FINAL_TREE="$(git -C "$FIX" rev-parse 'HEAD^{tree}')"
assert_eq "M08a the final verifier accepts the exact final SHA and tree" "FINAL_VERIFICATION_ALLOWED" \
  "$(fg_final_verifier_gate "$RUN_M4" "t-m4" "$FIX" "$FINAL_SHA" "$FINAL_TREE")"
assert_eq "M08 the final verifier refuses a moved final SHA" "FINAL_VERIFICATION_REFUSED_SHA_MOVED" \
  "$(fg_final_verifier_gate "$RUN_M4" "t-m4" "$FIX" "0000000000000000000000000000000000000000" "$FINAL_TREE")"
assert_eq "M08b the final verifier refuses a moved final tree" "FINAL_VERIFICATION_REFUSED_TREE_MOVED" \
  "$(fg_final_verifier_gate "$RUN_M4" "t-m4" "$FIX" "$FINAL_SHA" "0000000000000000000000000000000000000000")"

# Merge sheriff: exact PASS plus a valid founder receipt, or no receipt at all.
assert_eq "M09a the merge sheriff refuses without a final verification" "MERGE_REFUSED_NO_FINAL_VERIFICATION" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
jq -n --arg s "$FINAL_SHA" --arg t "$FINAL_TREE" \
  '{verdict:"PASS", final_sha:$s, final_tree:$t}' \
  | fg_role_result_write "$RUN_M4" "t-m4" final-verifier final_verification_report "$M4_VTOK" >/dev/null
assert_eq "M09 the merge sheriff refuses a missing founder receipt" "MERGE_REFUSED_FOUNDER_RECEIPT_MISSING" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
mint_founder_receipt "$RUN_M4" "t-m4" "$FINAL_SHA" "$FINAL_TREE" "APPROVE"
jq '.decision="APPROVE" | .candidate_sha="tampered"' "$(fg_founder_receipt_file "$RUN_M4" "t-m4")" > "${TMP}/r.json"
cp "${TMP}/r.json" "$(fg_founder_receipt_file "$RUN_M4" "t-m4")"
assert_eq "M09b the merge sheriff refuses a tampered founder receipt" "MERGE_REFUSED_FOUNDER_RECEIPT_INVALID" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
mint_founder_receipt "$RUN_M4" "t-m4" "$FINAL_SHA" "$FINAL_TREE" "REJECT"
assert_eq "M09c the merge sheriff refuses a rejecting receipt" "MERGE_REFUSED_FOUNDER_RECEIPT_NOT_APPROVED" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
mint_founder_receipt "$RUN_M4" "t-m4" "0000000000000000000000000000000000000000" "$FINAL_TREE" "APPROVE"
assert_eq "M09d the merge sheriff refuses a receipt for another candidate" "MERGE_REFUSED_FOUNDER_RECEIPT_WRONG_CANDIDATE" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
mint_founder_receipt "$RUN_M4" "t-m4" "$FINAL_SHA" "$FINAL_TREE" "APPROVE"
assert_eq "M09e a valid founder receipt opens the merge gate" "MERGE_GATE_OPEN" \
  "$(fg_merge_sheriff_gate "$RUN_M4" "t-m4")"
assert_contains "M09f only the merge sheriff may then write the receipt" "RESULT_WRITTEN:" \
  "$(echo '{"receipt":"prepared"}' | fg_role_result_write "$RUN_M4" "t-m4" merge-sheriff merge_receipt "$M4_MTOK" 2>&1)"
assert_eq "M09g even then the package never executes the merge itself" "0" \
  "$(grep -rlE 'git +(-C +[^ ]+ +)?merge' "${PKG}/bin" "${PKG}/lib" 2>/dev/null | grep -c . || true)"

# ===========================================================================
printf -- '-- M4 bootstrap --\n'
# ===========================================================================

BOOT="${PKG}/bin/fg-m4-bootstrap.sh"
assert_contains "M10 the M4 bootstrap refuses the wrong host profile" "BOOTSTRAP_REFUSED_WRONG_HOST_PROFILE" \
  "$(bash "$BOOT" --host m1 --check --repo "$FIX" 2>&1)"
assert_contains "M10b the M4 bootstrap refuses an unknown host profile" "BOOTSTRAP_REFUSED_UNKNOWN_HOST_PROFILE" \
  "$(bash "$BOOT" --host m9 --check --repo "$FIX" 2>&1)"
assert_contains "M10c the M4 bootstrap refuses the wrong repository" "BOOTSTRAP_REFUSED_WRONG_REPOSITORY" \
  "$(bash "$BOOT" --host m4 --check --repo "$FIX" 2>&1)"
assert_contains "M10d the M4 bootstrap refuses a non-repository path" "BOOTSTRAP_REFUSED_WRONG_REPOSITORY" \
  "$(bash "$BOOT" --host m4 --check --repo "${TMP}/not-a-repo" 2>&1)"

cp -R "$PKG" "${TMP}/pkgm4"
printf '\n# tampered\n' >> "${TMP}/pkgm4/lib/roles.sh"
git -C "$FIX" remote add origin "https://example.invalid/foundergate.git" 2>/dev/null || true
assert_contains "M11 the M4 bootstrap refuses a package digest mismatch" "BOOTSTRAP_REFUSED_DIGEST_MISMATCH" \
  "$(bash "${TMP}/pkgm4/bin/fg-m4-bootstrap.sh" --host m4 --check --repo "$FIX" 2>&1)"
assert_contains "M11b a matching digest set passes verification" "M4_BOOTSTRAP_VERIFIED" \
  "$(bash "$BOOT" --host m4 --check --repo "$FIX" 2>&1)"
assert_contains "M11c the bootstrap refuses a package version mismatch" "BOOTSTRAP_REFUSED_VERSION_MISMATCH" \
  "$(bash "$BOOT" --host m4 --check --repo "$FIX" --expect-version 9.9.9 2>&1)"
assert_contains "M12 the M4 bootstrap installs nothing" "installed_anything   : no" \
  "$(bash "$BOOT" --host m4 --check --repo "$FIX" 2>&1)"
assert_eq "M12b the bootstrap contains no installation command" "0" \
  "$(grep -cE 'brew |apt-get |npm install|pip install|curl .*\| *(ba)?sh' "$BOOT" || true)"

assert_eq "M13 both host profiles run the same implementation" "1" \
  "$(ls -1 "${PKG}/bin/fg-role-floor-start.sh" | wc -l | tr -d ' ')"
assert_eq "M13b no host-specific implementation directory exists" "0" \
  "$(cd "$PKG" && find bin lib \( -name '*m1*' -o -name '*m4*' \) 2>/dev/null | grep -v 'fg-m4-bootstrap.sh' | grep -c . || true)"
assert_eq "M13c host behaviour comes from configuration, not code" "2" \
  "$(ls -1 "${PKG}/config/hosts"/*.json | wc -l | tr -d ' ')"
assert_eq "M13d the M4 bootstrap delegates to the shared start script" "1" \
  "$(grep -c 'fg-role-floor-start.sh' "$BOOT" || true)"

REAL_LAUNCHES_FINAL="$(grep -c '^LAUNCH ' "$FG_TEST_CLAUDE_LOG" 2>/dev/null || true)"
assert_eq "M14 no cross-host test launched a real model or product run" "0" "${REAL_LAUNCHES_FINAL:-0}"

if [ -n "${FG_RF_TEST_BUNDLE:-}" ] && [ -f "${FG_RF_TEST_BUNDLE}" ]; then
  assert_contains "M15 the git bundle verifies" "is okay" \
    "$(git -C "$CLONE" bundle verify "${FG_RF_TEST_BUNDLE}" 2>&1)"
else
  skip "M15 git bundle verification" "the bundle is created after the commit; verified at build level and recorded in TEST_RESULTS.json"
fi

fg_host_load m1 >/dev/null

# ---------------------------------------------------------------------------

printf '\n----------------------------------------\n'
printf '  PASS: %d   FAIL: %d   SKIP: %d\n' "$PASS" "$FAIL" "$SKIP"
printf -- '----------------------------------------\n'

if [ -n "$JSON_OUT" ]; then
  jq -n --argjson pass "$PASS" --argjson fail "$FAIL" --argjson skip "$SKIP" \
        --argjson results "$(jq -s '.' "$RESULTS")" \
        --arg tmux "$(command -v tmux >/dev/null 2>&1 && tmux -V || echo 'NOT_INSTALLED')" \
        --arg claude "$(command -v claude >/dev/null 2>&1 && claude --version 2>/dev/null | head -1 || echo 'NOT_INSTALLED')" \
        --arg pkg "$FG_RF_VERSION" \
    '{package_version:$pkg, totals:{pass:$pass, fail:$fail, skip:$skip},
      tmux_available:$tmux, claude_available:$claude,
      real_model_invocations:0, results:$results}' > "$JSON_OUT"
fi

[ "$FAIL" -eq 0 ]
