#!/bin/bash
# Phase-4 repair qualification (NOT Level 2 / NOT endurance). Proves:
#  - fixed evidence root is outside the Desktop run folder
#  - monitor/ledger/timer write to the fixed root
#  - moving the Desktop folder does NOT stop fixed-root logging
#  - a fixed-root write failure -> HELD_EVIDENCE_WRITE_FAILURE (fail closed)
#  - duration proof reads fixed-root logs only
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN="FounderGate_Level3C_LoggingFix_Level2_Proof_20260730T0845ET"
QID="${RUN}_QUAL"
FIXED="$HOME/.foundergate/runs/$QID"
DESK="$HOME/Desktop/_l3c_qual_disposable_run"
OUT="$1"   # result dir (workspace evidence/logging_fix)
REPO="$2"
LOG="$OUT/simulated_move_test.log"
rm -rf "$FIXED" "$DESK" "${DESK}_MOVED"; mkdir -p "$DESK"
: > "$LOG"
say(){ printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG"; }

export FG_RUN_ID="$QID" FG_SUBDIR="level2-proof" FG_REPO="$REPO"
export FG_MONITOR_INTERVAL=5 FG_LEDGER_INTERVAL=5 FG_DRIVER_TICK=5
export FG_MIN_MINUTES=999 FG_HEALTH_EVERY=1 FG_GITLK_EVERY=1 FG_REC_EVERY=1

# a convenience file inside the DESKTOP folder (non-authoritative)
echo "human summary only - authoritative evidence in $FIXED" > "$DESK/README_convenience.txt"

say "FIXED_ROOT=$FIXED"
say "DESKTOP_FOLDER=$DESK"
case "$FIXED" in "$DESK"/*) say "ERROR: fixed root inside desktop"; exit 2;; esac
say "CHECK fixed root is OUTSIDE desktop folder: PASS"

bash "$HERE/fg_monitor.sh" >>"$LOG" 2>&1 & MON=$!
bash "$HERE/fg_ledger.sh"  >>"$LOG" 2>&1 & LED=$!
bash "$HERE/fg_driver.sh"  >>"$LOG" 2>&1 & DRV=$!
say "launched monitor=$MON ledger=$LED driver=$DRV"
sleep 45

M="$FIXED/level2-proof/monitor.log"; L="$FIXED/level2-proof/ledger.log"; T="$FIXED/level2-proof/timer.log"
b_m=$(wc -l < "$M" 2>/dev/null||echo 0); b_l=$(wc -l < "$L" 2>/dev/null||echo 0); b_t=$(wc -l < "$T" 2>/dev/null||echo 0)
say "T1 fixed-root lines monitor=$b_m ledger=$b_l timer=$b_t"
[ -f "$M" ] && say "CHECK monitor writes to fixed root: PASS" || say "CHECK monitor writes to fixed root: FAIL"
[ -f "$L" ] && say "CHECK ledger writes to fixed root: PASS" || say "CHECK ledger writes to fixed root: FAIL"
[ -f "$T" ] && say "CHECK timer writes to fixed root: PASS" || say "CHECK timer writes to fixed root: FAIL"

# ---- simulate the founder moving the Desktop run folder in Finder ----
mv "$DESK" "${DESK}_MOVED"
say "MOVED desktop folder $DESK -> ${DESK}_MOVED"
sleep 40
a_m=$(wc -l < "$M" 2>/dev/null||echo 0); a_l=$(wc -l < "$L" 2>/dev/null||echo 0); a_t=$(wc -l < "$T" 2>/dev/null||echo 0)
say "T2 fixed-root lines monitor=$a_m ledger=$a_l timer=$a_t"
if [ "$a_m" -gt "$b_m" ] && [ "$a_l" -gt "$b_l" ] && [ "$a_t" -gt "$b_t" ]; then
  say "CHECK fixed-root logging CONTINUES after desktop move: PASS"
else
  say "CHECK fixed-root logging CONTINUES after desktop move: FAIL"
fi

# duration classification uses fixed-root logs ONLY
node "$HERE/fg_duration_classify.mjs" --monitor "$M" --ledger "$L" --min 0 --max-gap 5 > "$OUT/qual_classify_beforefail.json" 2>&1
say "CHECK duration proof reads fixed-root logs only: $(python3 -c "import json;print(json.load(open('$OUT/qual_classify_beforefail.json'))['verdict'])" 2>/dev/null)"

# ---- simulate a fixed-root WRITE FAILURE (subdir made non-writable) ----
chmod 555 "$FIXED/level2-proof"
say "FORCED write failure: chmod 555 $FIXED/level2-proof"
sleep 25
ST="$FIXED/status.json"
if [ -f "$ST" ] && grep -q HELD_EVIDENCE_WRITE_FAILURE "$ST" 2>/dev/null; then
  say "CHECK write failure -> HELD_EVIDENCE_WRITE_FAILURE: PASS ($(cat "$ST"))"
else
  say "CHECK write failure -> HELD_EVIDENCE_WRITE_FAILURE: FAIL (status=$(cat "$ST" 2>/dev/null))"
fi
# confirm the loops actually died (fail-closed), not still spinning
sleep 3
alive=0; for p in $MON $LED $DRV; do kill -0 "$p" 2>/dev/null && alive=$((alive+1)); done
say "CHECK loops halted after write failure: $([ "$alive" -eq 0 ] && echo PASS || echo "PARTIAL(alive=$alive)")"

chmod 755 "$FIXED/level2-proof" 2>/dev/null
for p in $MON $LED $DRV; do kill "$p" 2>/dev/null; done
say "QUALIFICATION COMPLETE"
