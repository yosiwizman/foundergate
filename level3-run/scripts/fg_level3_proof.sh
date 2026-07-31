#!/bin/bash
# Part B — actual Level-2 two-hour unattended proof.
# Self-contained: caffeinate + monitor + ledger + driver -> FIXED move-immune
# evidence root. Waits for the driver to reach the wall-clock minimum, then
# classifies STRICTLY from monitor+ledger disk spans. Timer alone is never a pass.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN="${FG_RUN_OVERRIDE:-FounderGate_Level3C_LoggingFix_Level2_Proof_20260730T0845ET}"
REPO="$1"
FIXED="$HOME/.foundergate/runs/$RUN"
SUB="${FG_SUB_OVERRIDE:-level2-proof}"
PROOF="$FIXED/$SUB"
mkdir -p "$PROOF"
LOG="$FIXED/part_b_launcher.log"
say(){ printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG"; }

# precondition: no active operation lock
if [ -e "$HOME/.foundergate/locks/active-product-operation.lock" ]; then
  say "ABORT: active operation lock present"; exit 2
fi

export FG_RUN_ID="$RUN" FG_SUBDIR="$SUB" FG_REPO="$REPO"
# defaults are the real Level-2 proof settings; overridable via env for a smoke test
export FG_MONITOR_INTERVAL="${FG_MONITOR_INTERVAL:-60}" FG_LEDGER_INTERVAL="${FG_LEDGER_INTERVAL:-60}"
export FG_DRIVER_TICK="${FG_DRIVER_TICK:-30}" FG_MIN_MINUTES="${FG_MIN_MINUTES:-120}"
export FG_HEALTH_EVERY="${FG_HEALTH_EVERY:-10}" FG_GITLK_EVERY="${FG_GITLK_EVERY:-10}" FG_REC_EVERY="${FG_REC_EVERY:-30}"
GUARD_WAIT="${FG_GUARD_WAIT:-90}"

# keep the Mac awake for the whole run (self-expiring so it never lingers)
caffeinate -dimsu -t 21600 >/dev/null 2>&1 & CAF=$!
say "caffeinate started pid=$CAF (self-expires ~135min)"

nohup bash "$HERE/fg_monitor.sh" >"$FIXED/monitor.stdout" 2>&1 & MON=$!; disown $MON
nohup bash "$HERE/fg_ledger.sh"  >"$FIXED/ledger.stdout" 2>&1 & LED=$!; disown $LED
nohup bash "$HERE/fg_driver.sh"  >"$FIXED/driver.stdout" 2>&1 & DRV=$!; disown $DRV
say "launched monitor=$MON ledger=$LED driver=$DRV (writing to $PROOF)"
printf '{"caffeinate":%s,"monitor":%s,"ledger":%s,"driver":%s,"start_utc":"%s"}\n' "$CAF" "$MON" "$LED" "$DRV" "$(date -u +%FT%TZ)" > "$FIXED/part_b_pids.json"

# startup guard: monitor+ledger must actually be writing before we commit to the run
sleep "$GUARD_WAIT"
mL=$(wc -l < "$PROOF/monitor.log" 2>/dev/null || echo 0)
lL=$(wc -l < "$PROOF/ledger.log" 2>/dev/null || echo 0)
if [ "${mL:-0}" -lt 1 ] || [ "${lL:-0}" -lt 1 ]; then
  say "ABORT startup guard: monitor_lines=$mL ledger_lines=$lL — loops not writing"
  kill "$MON" "$LED" "$DRV" "$CAF" 2>/dev/null
  printf '{"state":"HELD_EVIDENCE_WRITE_FAILURE","reason":"startup guard: monitor/ledger not writing"}\n' > "$FIXED/status.json"
  exit 3
fi
say "startup guard OK: monitor_lines=$mL ledger_lines=$lL"

# poll for driver completion (works for disowned PIDs; driver exits at >=120min or fails closed)
while kill -0 "$DRV" 2>/dev/null; do sleep 30; done
say "driver process ended"

# stop the sampling loops and caffeinate
kill "$MON" "$LED" 2>/dev/null; kill "$CAF" 2>/dev/null
say "stopped monitor/ledger/caffeinate"

# classify STRICTLY from disk. --status points at the ROOT status.json (per Checker caveat)
node "$HERE/fg_duration_classify.mjs" \
  --monitor "$PROOF/monitor.log" \
  --ledger  "$PROOF/ledger.log" \
  --status  "$FIXED/status.json" \
  --min "${FG_CLASSIFY_MIN:-300}" --max-gap 5 > "$PROOF/duration_summary.json" 2>&1
CLS_RC=$?
say "classification rc=$CLS_RC verdict=$(python3 -c "import json;print(json.load(open('$PROOF/duration_summary.json'))['verdict'])" 2>/dev/null)"
say "PART_B_COMPLETE"
cat "$PROOF/duration_summary.json"
python3 "$HERE/fg_level3_relabel.py" "$PROOF/duration_summary.json" "${FG_CLASSIFY_MIN:-300}" > "$PROOF/level3_duration_summary.json" 2>&1 || true
say "level3_verdict=$(python3 -c "import json;print(json.load(open('$PROOF/level3_duration_summary.json'))['level3_verdict'])" 2>/dev/null)"
