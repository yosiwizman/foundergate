#!/bin/bash
# Corrected endurance/proof driver -> FIXED evidence root, fail-closed.
# Timer/health/git-lock/recovery loops. Reaching the wall-clock minimum is
# NOT a PASS by itself: PASS is decided afterward by fg_duration_classify.mjs
# from monitor+ledger disk spans. Enters WATCH MODE if work finishes early.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; source "$HERE/fg_run_env.sh"
SUB="${FG_SUBDIR:-}"; PFX="${SUB:+$SUB/}"
REPO="${FG_REPO:-}"
MIN="${FG_MIN_MINUTES:-120}"          # required wall-clock minimum
TICK="${FG_DRIVER_TICK:-30}"          # seconds between ticks
HEALTH_EVERY="${FG_HEALTH_EVERY:-10}" # minutes
GITLK_EVERY="${FG_GITLK_EVERY:-10}"   # minutes
REC_EVERY="${FG_REC_EVERY:-30}"       # minutes
fg_init_root || { echo "init root failed" >&2; exit 3; }
START=$(date +%s)
printf '{"run_id":"%s","evidence_root":"%s","desktop_convenience_only":true,"start_utc":"%s","min_minutes":%s}\n' \
  "$FG_RUN_ID" "$FG_EVIDENCE_ROOT" "$(fg_now)" "$MIN" > "$FG_EVIDENCE_ROOT/${PFX}run_root_identity.json" 2>/dev/null || { fg_held "identity write failed"; exit 3; }
lh=-999; lg=-999; lr=-999
while true; do
  NOW=$(date +%s); EL=$(( (NOW-START)/60 ))
  fg_append "${PFX}timer.log" "$(fg_now) heartbeat elapsed=${EL}min min=${MIN}" || exit 3
  fg_status_running "$EL" || exit 3
  if [ $((EL-lh)) -ge "$HEALTH_EVERY" ]; then
    node -e 'process.exit(0)' >/dev/null 2>&1 && NODE=ok || NODE=bad
    CAF=$(pgrep -x caffeinate >/dev/null && echo on || echo off)
    RW=$([ -w "$FG_EVIDENCE_ROOT" ] && echo yes || echo no)
    fg_append "${PFX}health_checks.log" "$(fg_now) node=$NODE caffeinate=$CAF evidence_root_writable=$RW disk=$(df -h / | tail -1 | awk '{print $4}')" || exit 3
    lh=$EL
  fi
  if [ $((EL-lg)) -ge "$GITLK_EVERY" ]; then
    fg_append "${PFX}git_lock_checks.log" "$(fg_now) origin_main=$(git -C "$REPO" rev-parse origin/main 2>/dev/null | cut -c1-7) lock=$([ -e "$HOME/.foundergate/locks/active-product-operation.lock" ] && echo held || echo none) dirty=$(git -C "$REPO" status --porcelain 2>/dev/null | wc -l | tr -d ' ')" || exit 3
    lg=$EL
  fi
  if [ $((EL-lr)) -ge "$REC_EVERY" ]; then
    fg_append "${PFX}recovery_checks.log" "$(fg_now) recovery_readable=$([ -r "$FG_EVIDENCE_ROOT/${PFX}status.json" ] && echo yes || echo no) evidence_root=$FG_EVIDENCE_ROOT" || exit 3
    lr=$EL
  fi
  if [ "$EL" -ge "$MIN" ]; then
    fg_append "${PFX}timer.log" "$(fg_now) WALL_CLOCK_MINIMUM_REACHED elapsed=${EL}min (NOT a pass; classifier decides from monitor+ledger spans)" || exit 3
    printf '{"state":"TIMER_MINIMUM_REACHED","elapsed_min":%s,"utc":"%s","note":"PASS pending disk-span classification"}\n' "$EL" "$(fg_now)" > "$FG_EVIDENCE_ROOT/${PFX}status.json" 2>/dev/null
    break
  fi
  sleep "$TICK"
done
echo "driver reached wall-clock minimum ($MIN min) at $(fg_now)"
