#!/bin/sh
# Anti-repeat test for FOUNDER-CAUGHT-BUG: MAC-LAUNCHER-CANNOT-LOCATE-EXISTING-NODE-FROM-FINDER.
#
# Exercises the source-controlled launcher logic under a CLEAN Finder-like environment
# (PATH=/usr/bin:/bin:/usr/sbin:/sbin), proving Node is discovered WITHOUT the interactive
# terminal PATH. CI-compatible: no macOS UI (no osascript / no dialog / no real browser).
# Runs on macOS and Linux. Exit 0 = all pass.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
RESOLVE="$HERE/resolve-node.sh"
LAUNCH="$HERE/launch-foundergate-safety-check.sh"
REPO="$(cd "$HERE/../.." && pwd)"
FINDER_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
PORT="${FG_TEST_PORT:-4791}"
TMP="$(mktemp -d)"
RUNS="$TMP/runs"; LOGDIR="$TMP/logs"
mkdir -p "$RUNS" "$LOGDIR"
PASS=0; FAIL=0
ok() { PASS=$((PASS+1)); echo "  PASS $1"; }
no() { FAIL=$((FAIL+1)); echo "  FAIL $1"; }
cleanup() {
  env -i HOME="$HOME" PATH="$FINDER_PATH" FG_SAFETY_PORT="$PORT" FG_PID_FILE="$TMP/pid" \
    FG_LAUNCH_LOGDIR="$LOGDIR" /bin/sh "$LAUNCH" --stop >/dev/null 2>&1 || true
  rm -rf "$TMP" 2>/dev/null || true
}
trap cleanup EXIT

# Discover the real Node absolute path from the NORMAL environment (as the build would).
REAL_NODE="$(command -v node 2>/dev/null || true)"
[ -n "$REAL_NODE" ] && REAL_NODE="$(cd "$(dirname "$REAL_NODE")" && pwd)/$(basename "$REAL_NODE")"
echo "real node (build-discovered): ${REAL_NODE:-<none>}"

mkdir -p "$TMP/emptyhome"
run_finder() {  # run under the real HOME (fallback allowed) + clean Finder PATH
  env -i HOME="$HOME" PATH="$FINDER_PATH" "$@"
}
run_isolated() {  # run under an EMPTY HOME so no version-manager fallback exists
  env -i HOME="$TMP/emptyhome" PATH="$FINDER_PATH" "$@"
}

echo "== resolver cases =="
# 1. embedded verified Node path works
out="$(run_finder /bin/sh "$RESOLVE" "$REAL_NODE" 2>/dev/null)"
[ "$out" = "$REAL_NODE" ] && ok "1 embedded verified node path works" || no "1 embedded node ($out)"

# 2. Apple Silicon Homebrew path works where applicable (skip if absent)
if [ -x /opt/homebrew/bin/node ]; then
  out="$(run_finder /bin/sh "$RESOLVE" "" 2>/dev/null)"
  [ -n "$out" ] && ok "2 homebrew/known-location node found" || no "2 homebrew node"
else ok "2 (skip: /opt/homebrew/bin/node not present on this host)"; fi

# 3. invalid embedded Node path is rejected (isolated: must NOT be returned; nothing else exists)
out="$(run_isolated /bin/sh "$RESOLVE" "/nonexistent/node" 2>/dev/null)"; rc=$?
{ [ "$rc" -ne 0 ] && [ -z "$out" ]; } && ok "3 invalid node path rejected" || no "3 invalid path accepted ($out)"

# 4. Node below version 20 is rejected (isolated)
printf '#!/bin/sh\necho v18.19.0\n' > "$TMP/oldnode"; chmod +x "$TMP/oldnode"
out="$(run_isolated /bin/sh "$RESOLVE" "$TMP/oldnode" 2>/dev/null)"
[ "$out" != "$TMP/oldnode" ] && ok "4 node below 20 rejected" || no "4 node<20 accepted ($out)"

# 5. malicious project-local ./node is ignored (isolated + cwd holds a fake v99 node)
mkdir -p "$TMP/evil"; printf '#!/bin/sh\necho v99.0.0\n' > "$TMP/evil/node"; chmod +x "$TMP/evil/node"
out="$(cd "$TMP/evil" && run_isolated /bin/sh "$RESOLVE" "" 2>/dev/null)"
[ "$out" != "$TMP/evil/node" ] && ok "5 project-local ./node ignored (out='${out:-<none>}')" || no "5 malicious project-local node used"

echo "== launcher cases (need a real node) =="
if [ -z "$REAL_NODE" ]; then
  echo "  (no real node discoverable — skipping start/stop cases 6-10; running node-missing cases 11-12)"
else
  L() { env -i HOME="$HOME" PATH="$FINDER_PATH" FG_EMBEDDED_NODE="$REAL_NODE" FG_REPO_ROOT="$REPO" \
        FG_SAFETY_PORT="$PORT" FG_OPEN_BROWSER=0 FG_PID_FILE="$TMP/pid" FG_LAUNCH_LOGDIR="$LOGDIR" \
        FG_SAFETY_RUNS_DIR="$RUNS" /bin/sh "$LAUNCH" "$@"; }
  out="$(L 2>/dev/null)"
  # 6 minimal Finder PATH still starts the service  &  7 health becomes ready
  echo "$out" | grep -q "STARTED" && ok "6 minimal Finder PATH started the service" || no "6 start under Finder PATH ($out)"
  code="$(run_finder curl -s -m 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" 2>/dev/null)"; [ -n "$code" ] || code=000
  [ "$code" = "200" ] && ok "7 health endpoint ready (200)" || no "7 health ($code)"
  # 8 browser-open request generated
  echo "$out" | grep -q "OPEN http://127.0.0.1:$PORT/" && ok "8 browser-open request generated" || no "8 open line"
  # 9 duplicate launcher invocation does not start a second server
  pid1="$(cat "$TMP/pid" 2>/dev/null)"
  out2="$(L 2>/dev/null)"; pid2="$(cat "$TMP/pid" 2>/dev/null)"
  { echo "$out2" | grep -q "ALREADY_UP" && [ "$pid1" = "$pid2" ]; } && ok "9 duplicate launch → ALREADY_UP, same PID" || no "9 duplicate ($out2 pid1=$pid1 pid2=$pid2)"
  # 10 stop path terminates the governed server
  sout="$(L --stop 2>/dev/null)"
  sleep 1
  code="$(run_finder curl -s -m 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" 2>/dev/null)"; [ -n "$code" ] || code=000
  { echo "$sout" | grep -q "STOPPED" && [ "$code" != "200" ]; } && ok "10 stop terminated server (health now $code)" || no "10 stop ($sout health=$code)"
fi

echo "== node-missing cases =="
# 11 missing Node yields the honest failure token (app maps this to the no-install dialog)
NM() { env -i HOME="$TMP/emptyhome" PATH="$FINDER_PATH" FG_EMBEDDED_NODE="" FG_REPO_ROOT="$REPO" \
       FG_SAFETY_PORT="$PORT" FG_OPEN_BROWSER=0 FG_PID_FILE="$TMP/pid2" FG_LAUNCH_LOGDIR="$LOGDIR" \
       FG_MIN_NODE_MAJOR=999 FG_SAFETY_RUNS_DIR="$RUNS" /bin/sh "$LAUNCH" "$@"; }
mkdir -p "$TMP/emptyhome"
git -C "$REPO" status --porcelain > "$TMP/before.txt" 2>/dev/null || true
out="$(NM 2>/dev/null)"
echo "$out" | grep -q "NODE_NOT_FOUND" && ok "11 missing node → NODE_NOT_FOUND (honest failure token)" || no "11 missing node ($out)"
# 12 missing Node performs no repository or evidence mutation
git -C "$REPO" status --porcelain > "$TMP/after.txt" 2>/dev/null || true
if diff -q "$TMP/before.txt" "$TMP/after.txt" >/dev/null 2>&1; then ok "12 no repo/evidence mutation on missing node"; else no "12 repo changed on missing node"; fi

echo "launcher.test: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
