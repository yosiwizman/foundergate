#!/usr/bin/env bash
# FounderGate role floor - common primitives.
#
# Sourced by every bin/ entry point and lib/ module. Contains no side effects
# beyond variable definition: sourcing this file must never create a run root,
# a tmux session, or a Claude process.
#
# Compatibility target: bash 3.2 (stock macOS). No associative arrays, no
# mapfile, no ${var^^}.
set -u

# ---------------------------------------------------------------------------
# Package identity and layout
# ---------------------------------------------------------------------------

FG_RF_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FG_RF_HOME="$(cd "${FG_RF_LIB_DIR}/.." && pwd)"
FG_RF_PACKAGE="role-floor"
FG_RF_VERSION="$(cat "${FG_RF_HOME}/VERSION" 2>/dev/null || echo "0.0.0-unknown")"
FG_RF_SCHEMA_VERSION="1.1.0"

# One implementation, two host profiles. Everything host-specific below is a
# DEFAULT for the m1 profile and is replaced wholesale by fg_host_load (see
# lib/hosts.sh) from config/hosts/<host>.json. No host duplicates the
# implementation; a host is a configuration, not a fork.
FG_RF_HOST="${FG_RF_HOST:-m1}"
# Remember which values the caller pinned explicitly, so loading a host profile
# overrides package defaults without ever overriding an operator's choice.
FG_RF_SESSION_SET="${FG_RF_SESSION+yes}"
FG_RF_RUN_ROOT_SET="${FG_RF_RUN_ROOT+yes}"
FG_RF_SESSION="${FG_RF_SESSION:-foundergate-m1}"
FG_RF_WINDOWS="orchestrator builder checker advisor"
FG_RF_FOUNDER_WINDOW="orchestrator"

# Binaries are indirected so the selftest can inject deterministic stubs
# without ever launching a real tmux server or a real model provider.
FG_RF_TMUX_BIN="${FG_RF_TMUX_BIN:-tmux}"
FG_RF_CLAUDE_BIN="${FG_RF_CLAUDE_BIN:-claude}"

# Mutable campaign state lives outside the source repository by default.
# The host profile is part of the path so an M1 run and an M4 run can never
# collide on one machine.
FG_RF_RUN_ROOT="${FG_RF_RUN_ROOT:-${HOME}/FounderGateRuns/role-floor/${FG_RF_HOST}}"

# The founder decision key lives outside the package and outside the run root.
# The floor can VERIFY a founder receipt; it can never mint one.
FG_RF_FOUNDER_KEY_FILE="${FG_RF_FOUNDER_KEY_FILE:-${HOME}/.foundergate/founder_receipt.key}"

# ---------------------------------------------------------------------------
# Authority boundaries (host-profile defaults; m1 values shown)
# ---------------------------------------------------------------------------

# Branches that no writable lease may target without protected-main authority.
FG_RF_PROTECTED_BRANCHES="main master release production protected-main"

# Shared integration surfaces. Writing these requires a serial-integration
# writer, which exists only on the M4 profile.
FG_RF_SHARED_SURFACES=".foundergate/ .github/ package.json package-lock.json FounderGate-Start-Autonomous-Run.command"

# Authorities that are external to the M1 profile.
FG_RF_M4_AUTHORITIES="serial_integration_writer protected_main_writer final_integration_verifier merge_sheriff production_deployment activation_consumption founder_signature_execution"

# Authorities that are hard stops on EVERY host, M4 included. M4 holds
# integration authority; it never holds founder authority.
FG_RF_UNIVERSAL_SEALED_AUTHORITIES="production_deployment activation_consumption founder_signature_execution"

# Requests that must always halt bounded continuation on this host.
FG_RF_HARD_STOP_ACTIONS="merge sign signature activate activation deploy deployment push_protected_main credential_change permission_change destructive_action"

# Roles permitted to hold a writable lease on this host.
FG_RF_WRITABLE_LEASE_ROLES="builder"
FG_RF_SHARED_SURFACE_WRITER_ROLES=""
FG_RF_SEALED_CLASSES="merge_receipt integration_write integration_report final_verification_report signature_receipt activation_receipt protected_main_write deployment_receipt"

# Claude CLI flags the package must never emit: they would fuse role contexts
# or disable the permission surface.
FG_RF_FORBIDDEN_CLAUDE_FLAGS="--continue --resume --dangerously-skip-permissions"

# ---------------------------------------------------------------------------
# Lane status vocabulary
# ---------------------------------------------------------------------------

FG_RF_STATUSES="NOT_STARTED QUEUED STARTING RUNNING WAITING_DEPENDENCY WAITING_FOR_FREEZE READY_FOR_CHECK CHECKING CLEAN FINDINGS BLOCKED READY_FOR_ADVISOR ADVISING READY_FOR_FOUNDER_GATE HUMAN_ACTION_REQUIRED M4_HANDOFF_REQUIRED CONTEXT_EXHAUSTED ESCALATED STOP_REQUESTED STOPPED STALE DRIFT"

fg_status_valid() {
  local candidate="$1" s
  for s in ${FG_RF_STATUSES}; do
    [ "$s" = "$candidate" ] && return 0
  done
  return 1
}

# Statuses that must never lead to an Advisor launch.
fg_status_blocks_advisor() {
  case "$1" in
    FINDINGS|BLOCKED|STALE|DRIFT|INSUFFICIENT|CONTEXT_EXHAUSTED|ESCALATED) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

fg_log()  { printf '%s\n' "$*" >&2; }
fg_info() { printf '[m1-floor] %s\n' "$*" >&2; }
fg_warn() { printf '[m1-floor][warn] %s\n' "$*" >&2; }
fg_err()  { printf '[m1-floor][error] %s\n' "$*" >&2; }

# fg_fail <code> <message...> - deterministic refusal with a machine-readable code.
fg_fail() {
  local code="$1"; shift
  printf '%s: %s\n' "$code" "$*" >&2
  printf '%s\n' "$code"
  return 1
}

fg_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
fg_epoch() { date -u +%s; }

fg_require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    fg_err "missing prerequisite: $1"
    return 1
  }
  return 0
}

# ---------------------------------------------------------------------------
# Digests
# ---------------------------------------------------------------------------

fg_sha256_stdin() { shasum -a 256 | awk '{print $1}'; }
fg_sha256_string() { printf '%s' "$1" | fg_sha256_stdin; }
fg_sha256_file() {
  [ -f "$1" ] || { echo "MISSING"; return 1; }
  shasum -a 256 "$1" | awk '{print $1}'
}

# Digest of a JSON document's canonical content, ignoring the digest field
# itself so a record can carry its own digest.
fg_sha256_json_canonical() {
  local file="$1" field="${2:-digest}"
  [ -f "$file" ] || { echo "MISSING"; return 1; }
  jq -S "del(.${field})" "$file" 2>/dev/null | fg_sha256_stdin
}

# ---------------------------------------------------------------------------
# Atomic replacement
# ---------------------------------------------------------------------------

# fg_atomic_write <path> - content on stdin. Never leaves a partial file at
# <path>: the reader either sees the old bytes or the complete new bytes.
fg_atomic_write() {
  local dest="$1" dir tmp
  dir="$(dirname "$dest")"
  mkdir -p "$dir" || return 1
  tmp="$(mktemp "${dir}/.fgm1.XXXXXX")" || return 1
  cat > "$tmp" || { rm -f "$tmp"; return 1; }
  mv -f "$tmp" "$dest" || { rm -f "$tmp"; return 1; }
  return 0
}

# fg_atomic_write_json <path> - validates JSON before replacing the target.
fg_atomic_write_json() {
  local dest="$1" dir tmp
  dir="$(dirname "$dest")"
  mkdir -p "$dir" || return 1
  tmp="$(mktemp "${dir}/.fgm1.XXXXXX")" || return 1
  cat > "$tmp" || { rm -f "$tmp"; return 1; }
  if ! jq -e . "$tmp" >/dev/null 2>&1; then
    rm -f "$tmp"
    fg_err "refusing to write invalid JSON to ${dest}"
    return 1
  fi
  mv -f "$tmp" "$dest" || { rm -f "$tmp"; return 1; }
  return 0
}

# ---------------------------------------------------------------------------
# Run root layout
# ---------------------------------------------------------------------------

fg_run_dir()       { printf '%s/%s\n' "${FG_RF_RUN_ROOT}" "$1"; }
fg_control_dir()   { printf '%s/control\n' "$(fg_run_dir "$1")"; }
fg_queue_dir()     { printf '%s/queue\n' "$(fg_run_dir "$1")"; }
fg_leases_dir()    { printf '%s/leases\n' "$(fg_run_dir "$1")"; }
fg_roles_dir()     { printf '%s/roles\n' "$(fg_run_dir "$1")"; }
fg_handoffs_dir()  { printf '%s/handoffs\n' "$(fg_run_dir "$1")"; }
fg_reports_dir()   { printf '%s/reports\n' "$(fg_run_dir "$1")"; }
fg_logs_dir()      { printf '%s/logs\n' "$(fg_run_dir "$1")"; }
fg_gates_dir()     { printf '%s/founder-gates\n' "$(fg_run_dir "$1")"; }
fg_tmp_dir()       { printf '%s/tmp\n' "$(fg_run_dir "$1")"; }

fg_run_layout_dirs() {
  echo "control queue leases roles handoffs reports logs founder-gates tmp"
}

# ---------------------------------------------------------------------------
# Path classification
# ---------------------------------------------------------------------------

# fg_path_is_shared_surface <path> - true when the path belongs to a shared
# integration surface that only the M4 serial writer may touch.
fg_path_is_shared_surface() {
  local p="$1" s
  for s in ${FG_RF_SHARED_SURFACES}; do
    case "$s" in
      */) case "$p" in "$s"*) return 0 ;; esac ;;
      *)  [ "$p" = "$s" ] && return 0 ;;
    esac
  done
  return 1
}

fg_branch_is_protected() {
  local b="$1" p
  for p in ${FG_RF_PROTECTED_BRANCHES}; do
    [ "$b" = "$p" ] && return 0
  done
  return 1
}

fg_is_m4_authority() {
  local a="$1" m
  for m in ${FG_RF_M4_AUTHORITIES}; do
    [ "$a" = "$m" ] && return 0
  done
  return 1
}

# Sealed on every host, M4 included.
fg_is_universally_sealed_authority() {
  local a="$1" m
  for m in ${FG_RF_UNIVERSAL_SEALED_AUTHORITIES}; do
    [ "$a" = "$m" ] && return 0
  done
  return 1
}

# fg_in_list <needle> <space separated list>
fg_in_list() {
  local needle="$1" item
  for item in $2; do
    [ "$item" = "$needle" ] && return 0
  done
  return 1
}

fg_is_hard_stop_action() {
  local a="$1" h
  for h in ${FG_RF_HARD_STOP_ACTIONS}; do
    [ "$a" = "$h" ] && return 0
  done
  return 1
}

# The literal prefix of a glob, i.e. everything before the first wildcard.
# Used for conservative overlap detection between lease path globs.
fg_glob_literal_prefix() {
  printf '%s' "$1" | sed -e 's/[*?[].*$//'
}

# fg_globs_overlap <globA> <globB> - conservative: true when either literal
# prefix contains the other. Prefers false positives (rejecting a safe lease)
# over false negatives (admitting two writers to one file).
fg_globs_overlap() {
  local a b
  a="$(fg_glob_literal_prefix "$1")"
  b="$(fg_glob_literal_prefix "$2")"
  case "$a" in "$b"*) return 0 ;; esac
  case "$b" in "$a"*) return 0 ;; esac
  return 1
}

# ---------------------------------------------------------------------------
# Git truth (read-only helpers)
# ---------------------------------------------------------------------------

fg_git() { git -C "$1" "${@:2}"; }

fg_git_head_sha()  { git -C "$1" rev-parse HEAD 2>/dev/null; }
fg_git_head_tree() { git -C "$1" rev-parse 'HEAD^{tree}' 2>/dev/null; }
fg_git_branch()    { git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null; }

fg_git_is_clean() {
  local out
  out="$(git -C "$1" status --porcelain=v1 2>/dev/null)" || return 1
  [ -z "$out" ]
}

# Digest of the uncommitted working tree, for dirty-tree handoff binding.
fg_git_dirty_digest() {
  git -C "$1" status --porcelain=v1 2>/dev/null | sort | fg_sha256_stdin
}

fg_git_diff_digest() {
  local repo="$1" base="$2" head="$3"
  git -C "$repo" diff --no-color "${base}..${head}" 2>/dev/null | fg_sha256_stdin
}

fg_git_changed_files() {
  local repo="$1" base="$2" head="$3"
  git -C "$repo" diff --name-only "${base}..${head}" 2>/dev/null
}

# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

fg_json_get() {
  local file="$1" filter="$2"
  [ -f "$file" ] || { echo ""; return 1; }
  jq -r "$filter // empty" "$file" 2>/dev/null
}

fg_json_lines_to_array() {
  [ -f "$1" ] || { echo "[]"; return 0; }
  jq -s '.' "$1" 2>/dev/null || echo "[]"
}
