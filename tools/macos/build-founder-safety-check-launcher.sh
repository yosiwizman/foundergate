#!/usr/bin/env bash
# Build the local unsigned witness app from the AppleScript via osacompile (no install).
# The generated .app is NOT committed. This build EMBEDS a verified absolute Node (>=20) path
# and the repo root into the app so it works from Finder (which gives apps a minimal PATH).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
OUT="${FG_LAUNCHER_OUT:-$HOME/Desktop/FounderGate Safety Check.app}"
PORT="${FG_SAFETY_PORT:-4700}"
LAUNCH_SH="$HERE/launch-foundergate-safety-check.sh"
RESOLVE_SH="$HERE/resolve-node.sh"
TEMPLATE="$HERE/foundergate-safety-check-launcher.applescript"

# 1. Discover + verify a Node >=20 absolute path using the SAME resolver the app will use.
NODE_BIN="$("/bin/sh" "$RESOLVE_SH" "${FG_EMBEDDED_NODE:-$(command -v node || true)}" || true)"
if [ -z "${NODE_BIN:-}" ]; then
  echo "BUILD-FAIL (operator): no verified Node >=20 was discoverable to embed into the app. Ensure a Node 20+ runtime is present in this build environment, then rerun this build script." >&2
  exit 2
fi
NODE_VER="$("$NODE_BIN" --version)"
echo "embedding node: $NODE_BIN ($NODE_VER)"

# 2. Render the AppleScript template with embedded absolute paths (build-time only).
TMP="$(mktemp -t fg-launcher).applescript"
trap 'rm -f "$TMP"' EXIT
sed -e "s#@@NODE_BIN@@#${NODE_BIN}#g" \
    -e "s#@@REPO_ROOT@@#${REPO_ROOT}#g" \
    -e "s#@@LAUNCH_SH@@#${LAUNCH_SH}#g" \
    -e "s#@@PORT@@#${PORT}#g" \
    "$TEMPLATE" > "$TMP"

# 3. Compile to the .app (unsigned, local, no install).
chmod +x "$LAUNCH_SH" "$RESOLVE_SH"
rm -rf "$OUT"
osacompile -o "$OUT" "$TMP"
echo "built: $OUT"
echo "note: the .app is local-only and is NOT committed to git."
