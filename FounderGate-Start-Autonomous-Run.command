#!/usr/bin/env bash
# Double-clickable FounderGate autonomous-run launcher. Calls the same starter
# implementation as the one-line command. Safe: narrow allowlist, no launchd,
# no credential material, Terminal-0 owns merges.
cd "$(dirname "$0")" || exit 1
exec bash "tools/terminal0/paes/start-wave2-session"
