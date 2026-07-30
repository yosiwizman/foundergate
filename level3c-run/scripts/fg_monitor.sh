#!/bin/bash
# Corrected resource monitor -> writes to FIXED evidence root, fail-closed.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; source "$HERE/fg_run_env.sh"
SUB="${FG_SUBDIR:-}"; PFX="${SUB:+$SUB/}"
INT="${FG_MONITOR_INTERVAL:-60}"
fg_init_root || { echo "init root failed" >&2; exit 3; }
while true; do
  line="$(fg_now) | load=$(uptime | sed 's/.*load average[s]*: //') | disk=$(df -h / | tail -1 | awk '{print $4" free/"$5}') | caffeinate=$(pgrep -x caffeinate >/dev/null && echo on || echo off) | tmux/claude=$(ps aux | egrep -i 'tmux|claude' | grep -v grep | wc -l | tr -d ' ') | lock=$([ -e "$HOME/.foundergate/locks/active-product-operation.lock" ] && echo held || echo none)"
  fg_append "${PFX}monitor.log" "$line" || exit 3
  sleep "$INT"
done
