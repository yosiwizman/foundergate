#!/bin/sh
# FounderGate launcher — deterministic Node (>=20) resolver.
#
# Finder-launched apps do NOT inherit the interactive shell PATH or a version
# manager's init (nvm/fnm/asdf), so a bare `node` / `command -v node` fails from
# Finder even when Node is installed. This resolver finds a VERIFIED Node without
# the interactive terminal PATH.
#
# Prints the FIRST valid absolute node path to stdout and exits 0.
# If none is valid, prints nothing and exits 1.
#
# Safety: only ever considers ABSOLUTE known locations + version-manager dirs +
# a bounded non-interactive login-shell lookup. NEVER uses a project-local ./node
# or $PWD. Never prepends the repo to PATH. Never installs/downloads/modifies.
set -u
MIN_MAJOR="${FG_MIN_NODE_MAJOR:-20}"

_valid_node() {
  n="$1"
  case "$n" in /*) : ;; *) return 1 ;; esac      # must be absolute
  [ -f "$n" ] || return 1
  [ -x "$n" ] || return 1
  v="$("$n" --version 2>/dev/null)" || return 1
  case "$v" in v[0-9]*) : ;; *) return 1 ;; esac  # must look like vNN.NN.NN
  major="$(printf '%s' "$v" | sed 's/^v\([0-9][0-9]*\).*/\1/')"
  [ -n "$major" ] || return 1
  [ "$major" -ge "$MIN_MAJOR" ] 2>/dev/null || return 1
  return 0
}

_emit() { printf '%s\n' "$1"; exit 0; }

# 1. Embedded verified path (from the build process), via env or first arg.
EMB="${FG_EMBEDDED_NODE:-${1:-}}"
[ -n "$EMB" ] && _valid_node "$EMB" && _emit "$EMB"

# 2-4. Known absolute install locations (Apple Silicon Homebrew, Intel Homebrew, Volta).
for c in /opt/homebrew/bin/node /usr/local/bin/node "${HOME:-/nonexistent}/.volta/bin/node"; do
  _valid_node "$c" && _emit "$c"
done

# 5. Version managers — highest installed version first (nvm, fnm, asdf).
for base in \
  "${HOME:-/nonexistent}/.nvm/versions/node" \
  "${HOME:-/nonexistent}/.local/share/fnm/node-versions" \
  "${HOME:-/nonexistent}/.asdf/installs/nodejs"; do
  [ -d "$base" ] || continue
  for d in $(ls -1 "$base" 2>/dev/null | sort -Vr); do
    for sub in bin/node installation/bin/node; do
      _valid_node "$base/$d/$sub" && _emit "$base/$d/$sub"
    done
  done
done

# 6. Bounded non-interactive login-shell lookup (zsh then bash). Absolute-only.
for sh in /bin/zsh /bin/bash; do
  [ -x "$sh" ] || continue
  cand="$("$sh" -lc 'command -v node' 2>/dev/null)" || cand=""
  case "$cand" in /*) _valid_node "$cand" && _emit "$cand" ;; esac
done

exit 1
