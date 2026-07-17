#!/usr/bin/env bash
# Build the local unsigned witness app from the AppleScript using macOS osacompile (no install).
# Output: "/Users/yosiwizman/Desktop/FounderGate Safety Check.app" (NOT committed).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="/Users/yosiwizman/Desktop/FounderGate Safety Check.app"
osacompile -o "$OUT" "$HERE/foundergate-safety-check-launcher.applescript"
echo "built: $OUT"
