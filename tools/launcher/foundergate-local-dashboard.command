#!/bin/bash
# FounderGate — local no-terminal dashboard launcher (loopback only).
# Starts the local run-server on 127.0.0.1 and opens the canonical founder dashboard.
# NO provider, NO deploy, NO billing, NO external network. Local synthetic demo only.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${OP_PORT:-4880}"
cd "$REPO_ROOT"
# start server if not already listening
if ! curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  OP_PORT="$PORT" node src/operator_console/run-server.mjs >/tmp/foundergate-run-server.log 2>&1 &
  for i in $(seq 1 30); do curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 && break; sleep 0.2; done
fi
open "http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html"
echo "FounderGate local dashboard opened at http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html"
