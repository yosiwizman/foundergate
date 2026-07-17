#!/bin/sh
# FounderGate Safety Check — headless launcher core (called by the Finder app and by tests).
#
# Modes:
#   (default)  start the loopback service if not already up, wait for health, emit OPEN <url>.
#   --stop     terminate the governed server recorded in the PID file.
#
# Merely starting the service does NOT run a Safety Check and does NOT create a VM — the
# disposable runtime only starts on POST /api/check. Binds 127.0.0.1 only. No admin, no daemon.
#
# Machine-readable stdout tokens (one of): ALREADY_UP | STARTED | NODE_NOT_FOUND |
# REPO_MISSING | HEALTH_TIMEOUT | STOPPED | NOT_RUNNING, plus (on success) an "OPEN <url>" line.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${FG_SAFETY_PORT:-4700}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
URL="http://127.0.0.1:${PORT}/"
LOGDIR="${FG_LAUNCH_LOGDIR:-${HOME:-/tmp}/Library/Logs/FounderGate}"
PIDFILE="${FG_PID_FILE:-${LOGDIR}/safety-check.pid}"
LOG="${FG_LAUNCH_LOG:-${LOGDIR}/safety-check.log}"
REPO="${FG_REPO_ROOT:-}"
OPEN_BROWSER="${FG_OPEN_BROWSER:-1}"
mkdir -p "$LOGDIR" 2>/dev/null || true

_ts() { date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?"; }
# Redacted log: replace the user's home dir with ~ so committed evidence carries no private path.
_log() { printf '%s %s\n' "$(_ts)" "$(printf '%s' "$1" | sed "s#${HOME:-/nonexistent}#~#g")" >> "$LOG" 2>/dev/null || true; }
_health() { curl -s -m 2 -o /dev/null -w '%{http_code}' "$HEALTH" 2>/dev/null || echo 000; }

if [ "${1:-}" = "--stop" ]; then
  if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null; sleep 1; kill -9 "$pid" 2>/dev/null || true
      rm -f "$PIDFILE" 2>/dev/null || true
      _log "stopped pid=$pid"; echo "STOPPED"; exit 0
    fi
    rm -f "$PIDFILE" 2>/dev/null || true
  fi
  _log "stop: not running"; echo "NOT_RUNNING"; exit 0
fi

# Idempotent: if health already answers, do not start a second server.
if [ "$(_health)" = "200" ]; then
  _log "already-up"; echo "ALREADY_UP"; echo "OPEN ${URL}"
  [ "$OPEN_BROWSER" = "1" ] && command -v open >/dev/null 2>&1 && open "$URL" >/dev/null 2>&1
  exit 0
fi

NODE="$("$HERE/resolve-node.sh" "${FG_EMBEDDED_NODE:-}" 2>/dev/null)" || NODE=""
if [ -z "$NODE" ]; then _log "node-not-found"; echo "NODE_NOT_FOUND"; exit 3; fi
_log "node=$NODE version=$("$NODE" --version 2>/dev/null)"

if [ -z "$REPO" ] || [ ! -f "$REPO/src/safety_check/service.mjs" ]; then
  _log "repo-missing repo=$REPO"; echo "REPO_MISSING"; exit 4
fi

# Start detached, loopback only, record PID. No VM is created by this.
FG_SAFETY_PORT="$PORT" nohup "$NODE" "$REPO/src/safety_check/service.mjs" >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"
_log "started pid=$(cat "$PIDFILE" 2>/dev/null) port=$PORT"

i=0
while [ "$i" -lt 20 ]; do
  sleep 1
  if [ "$(_health)" = "200" ]; then
    _log "health-ok"; echo "STARTED"; echo "OPEN ${URL}"
    [ "$OPEN_BROWSER" = "1" ] && command -v open >/dev/null 2>&1 && open "$URL" >/dev/null 2>&1
    exit 0
  fi
  i=$((i + 1))
done
_log "health-timeout"; echo "HEALTH_TIMEOUT"; exit 5
