#!/bin/bash
# FounderGate no-terminal launcher (double-clickable). Local, loopback-only.
# Starts the local run-server and opens the founder dashboard in the default browser.
# No provider, no network egress, no deployment.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${OP_PORT:-4880}"
cd "$REPO_ROOT"
# start the loopback server if not already up
if ! curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  OP_PORT="$PORT" nohup node src/operator_console/run-server.mjs >/tmp/foundergate-server.log 2>&1 &
  for i in $(seq 1 30); do curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 && break; sleep 0.3; done
fi
open "http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html"
echo "FounderGate local dashboard opened at http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html"
