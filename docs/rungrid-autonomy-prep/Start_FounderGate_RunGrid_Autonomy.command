#!/bin/bash
# FounderGate RunGrid Autonomy launcher.
# ONE founder action: double-click. It verifies state, stages the Terminal-0 supervisor prompt,
# and sets up a run workspace + monitor. It performs NO product mutation, NO merge, NO mark-ready,
# NO deploy, NO provider/key, NO PR mutation, NO AKIOR/M1. Read-only toward Git/GitHub except lock.
set -u

REPO="/Users/yosiwizman/Projects/Recovery-Audit/FounderGate-Core-Discovery/clone-foundergate-20260728T003016Z"
PREP="/Users/yosiwizman/Desktop/FounderGate_RunGrid_AutonomyPrep_20260729T1235ET"
LOCK="/Users/yosiwizman/.foundergate/locks/active-product-operation.lock"
PROMPTS="$PREP/prompts"
# Expected pinned baseline (update only via a new authorized prep run):
EXP_PR201_HEAD="a6a1595cf8e00e829db4e0f4d1b9ff60acd97ae7"
EXP_PR200_HEAD="7d865fe61e3a3d1615e97711724ad00909d97359"
EXP_ORIGIN_MAIN="4f2394a5fa78581507ec08ee5a18cedc96cbdadf"

say(){ printf '%s\n' "$*"; }
fail(){ say "STOP: $*"; say "Launcher halted safely. No changes were made."; exit 1; }

say "============================================================"
say " FounderGate RunGrid Autonomy launcher"
say "============================================================"

# 1) tools
for t in git gh tmux node npm zip unzip shasum python3 pbcopy osascript caffeinate; do
  command -v "$t" >/dev/null 2>&1 || fail "required tool missing: $t"
done
say "tools: ok"

# 2) repo
[ -d "$REPO/.git" ] || fail "canonical repo not found at $REPO"
DIRTY="$(cd "$REPO" && git status --porcelain | wc -l | tr -d ' ')"
[ "$DIRTY" = "0" ] || say "note: repo working tree has $DIRTY uncommitted change(s) (run will use isolated worktrees)"
say "repo: ok"

# 3) no competing live operation lock
if [ -e "$LOCK" ]; then
  LW="$(cat "$LOCK/workspace" 2>/dev/null || echo unknown)"
  fail "an active operation lock exists (workspace: $LW). Resolve/retire it before starting a new wave."
fi
say "lock: free"

# 4) verify PR/main baseline (read-only)
gh auth status >/dev/null 2>&1 || fail "gh not authenticated"
PR201="$(gh pr view 201 --repo yosiwizman/foundergate --json headRefOid,state,isDraft --jq '.headRefOid+" "+.state+" draft="+(.isDraft|tostring)' 2>/dev/null || echo '')"
PR200="$(gh pr view 200 --repo yosiwizman/foundergate --json headRefOid --jq '.headRefOid' 2>/dev/null || echo '')"
OMAIN="$(cd "$REPO" && git ls-remote origin refs/heads/main 2>/dev/null | awk '{print $1}')"
case "$PR201" in "$EXP_PR201_HEAD "*) : ;; *) fail "PR #201 drift (got: $PR201, expected head $EXP_PR201_HEAD)";; esac
[ "$PR200" = "$EXP_PR200_HEAD" ] || fail "PR #200 drift (got: $PR200, expected $EXP_PR200_HEAD)"
[ "$OMAIN" = "$EXP_ORIGIN_MAIN" ] || fail "origin/main drift (got: $OMAIN, expected $EXP_ORIGIN_MAIN)"
say "PR #201 / PR #200 / origin-main: match expected baseline"

# 5) timestamped run workspace
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN="/Users/yosiwizman/Desktop/FounderGate_RunGrid_Wave_${TS}"
mkdir -p "$RUN"/{reports,evidence,prompts,logs} || fail "cannot create run workspace"
say "run workspace: $RUN"

# 6) tmux sessions (create if absent; never kill existing)
for s in fg-build fg-control fg-review; do
  tmux has-session -t "$s" 2>/dev/null || tmux new-session -d -s "$s" -c "$REPO" 2>/dev/null || true
done
say "tmux: ensured (fg-build/fg-control/fg-review)"

# 7) evidence ledger + read-only monitor
LEDGER="$RUN/evidence/EVIDENCE_LEDGER.log"
printf '%s  launcher: run workspace created; baseline verified\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LEDGER"
MON="$RUN/RunGrid_ReadOnly_Monitor.command"
cat > "$MON" <<'MONEOF'
#!/bin/bash
RUN="$(cd "$(dirname "$0")" && pwd)"
while true; do
  clear
  echo "FounderGate RunGrid — READ-ONLY monitor"
  echo "run: $RUN"
  echo "utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "--- lock ---"; ls -la /Users/yosiwizman/.foundergate/locks/active-product-operation.lock 2>/dev/null || echo "  (none)"
  echo "--- recent evidence ---"; ls -t "$RUN/evidence" 2>/dev/null | head -10 | sed 's/^/  /'
  echo "--- ledger tail ---"; tail -12 "$RUN/evidence/EVIDENCE_LEDGER.log" 2>/dev/null | sed 's/^/  /'
  echo "--- final zip ---"; ls -1 "$RUN"/*.zip 2>/dev/null | sed 's/^/  /' || echo "  (not yet)"
  echo "Control-C closes this monitor only (read-only)."
  sleep 5
done
MONEOF
chmod +x "$MON"
say "monitor + ledger: created"

# 8) stage the Terminal-0 supervisor prompt (fill placeholders)
STAGED="$RUN/prompts/TERMINAL0_SUPERVISOR_STAGED.md"
MACHINE="$(scutil --get ComputerName 2>/dev/null || hostname)"
WHEN="$(date '+%Y-%m-%d %H:%M %Z')"
if [ -f "$PROMPTS/TERMINAL0_SUPERVISOR.md" ]; then
  sed -e "s|{{MACHINE}}|$MACHINE|g" \
      -e "s|{{WHEN}}|$WHEN|g" \
      -e "s|{{RUN_WORKSPACE}}|$RUN|g" \
      -e "s|{{CANONICAL_REPO}}|$REPO|g" \
      "$PROMPTS/TERMINAL0_SUPERVISOR.md" > "$STAGED"
else
  fail "Terminal-0 prompt template not found at $PROMPTS/TERMINAL0_SUPERVISOR.md"
fi
pbcopy < "$STAGED" 2>/dev/null && say "Terminal-0 prompt staged + copied to clipboard" || say "Terminal-0 prompt staged at: $STAGED"

# 9) open the monitor for visibility (does not act)
open "$MON" 2>/dev/null || true

say "------------------------------------------------------------"
say "NEXT (one action): open your visible Claude Code window and paste (Cmd-V), then Return."
say "Terminal-0 will drive the wave gate-to-gate and stop only at a true founder gate."
say "This launcher performed NO merge/mark-ready/deploy/provider/PR mutation."
say "------------------------------------------------------------"
exit 0
