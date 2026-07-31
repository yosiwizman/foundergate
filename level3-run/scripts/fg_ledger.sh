#!/bin/bash
# Corrected ledger -> writes to FIXED evidence root, fail-closed.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; source "$HERE/fg_run_env.sh"
SUB="${FG_SUBDIR:-}"; PFX="${SUB:+$SUB/}"
REPO="${FG_REPO:-}"; INT="${FG_LEDGER_INTERVAL:-60}"
fg_init_root || { echo "init root failed" >&2; exit 3; }
while true; do
  om="$(git -C "$REPO" rev-parse origin/main 2>/dev/null | cut -c1-7)"
  lk="$([ -e "$HOME/.foundergate/locks/active-product-operation.lock" ] && echo held || echo none)"
  line="$(fg_now) | run=$FG_RUN_ID | origin_main=${om:-NA} | lock=$lk | provider_used=0 | external_sends=0 | heartbeat=ok"
  fg_append "${PFX}ledger.log" "$line" || exit 3
  sleep "$INT"
done
