#!/bin/bash
# FounderGate — LOCAL repeatability CI hook. Rerunnable by ONE command.
# Runs the continuous repeatability trend (synthetic, no network). Exits non-zero on
# any flake / fail / false-green. Appends to a durable trend history.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
: "${LADDER_N:=10}"
: "${TREND_OUT:=$HOME/.foundergate/ci/repeatability_trend}"
mkdir -p "$TREND_OUT"
TREND_OUT="$TREND_OUT" LADDER_N="$LADDER_N" node tests/repeatability/continuous-ci.mjs
