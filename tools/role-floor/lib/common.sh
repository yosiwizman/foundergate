#!/usr/bin/env bash
# FounderGate role floor - common primitives.
#
# Sourced by every bin/ entry point and lib/ module. Contains no side effects
# beyond variable definition: sourcing this file must never create a run root,
# a tmux session, or a Claude process.
#
# Compatibility target: bash 3.2 (stock macOS). No associative arrays, no
# mapfile, no ${var^^}.
#
# ---------------------------------------------------------------------------
# THREAT MODEL - read this before relying on anything below
# ---------------------------------------------------------------------------
#
# What this package enforces:
#   * ASYMMETRIC founder authority. Founder decision receipts are SSHSIG
#     signatures verified against a fingerprint-pinned PUBLIC key. The package
#     contains no signing verb and no private key, so no process running this
#     code can author a founder APPROVE, whatever it can read.
#   * MECHANICAL sequencing, lease, drift, expiry, replay and one-time-use
#     refusals that a cooperative operator cannot bypass by accident.
#   * A keyed, length-anchored audit trail that makes casual rewriting of
#     history detectable.
#
# What this package does NOT enforce, and never claims to:
#   * It is NOT a boundary against a hostile process running as the same macOS
#     user. Role windows are separate transcripts, not separate principals.
#     Every keyed seal below (role capability commitments, artifact MACs, lease
#     seals, the retry ledger, the event chain) is keyed with a per-run secret
#     stored at ${run}/control/.writer_secret in mode 0600 under that same
#     user. An actor who can read that file can recompute those seals. Such an
#     actor still cannot forge a founder receipt the floor will accept, because
#     that requires a private key the machine does not hold and the signature is
#     verified by a system ssh-keygen resolved from a pinned absolute path (see
#     fg_sshsig_bin). An actor who can additionally rewrite the package tree,
#     control the floor's PATH/environment, or replace the system ssh-keygen
#     binary is OUTSIDE this guarantee -- see the SSHSIG section below.
#   * PACKAGE_DIGESTS.txt proves INTEGRITY (nothing changed by accident), never
#     AUTHENTICITY (this is the audited package). Authenticity requires the
#     externally supplied --expect-sha/--expect-tree anchor in the M4
#     bootstrap.
#   * A host profile name proves nothing about the physical machine. Physical
#     host authority requires an external, signed, hardware-bound enrollment
#     record that this package can only verify and never create.
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

# ---------------------------------------------------------------------------
# Founder decision trust root - VERIFY ONLY
# ---------------------------------------------------------------------------
#
# The floor holds a PUBLIC verification key and nothing else. Founder receipts
# are SSHSIG signatures (ssh-keygen -Y sign) produced OUTSIDE this package by a
# private key the package never sees. There is deliberately no signing verb
# anywhere under bin/ or lib/: grep -rn 'ssh-keygen -Y sign' bin lib returns
# nothing, and that grep is asserted by the selftest.
#
# FG_RF_FOUNDER_PUBKEY_FILE may only LOCATE a candidate public key. It cannot
# redirect the trust root: the located key's SHA256 fingerprint must equal the
# fingerprint pinned in the loaded host profile, and any mismatch is a closed
# refusal. Pointing this variable at an attacker key therefore fails.
#
# HONEST SCOPE: the pin lives in a package file. An attacker who can rewrite
# the package working tree can rewrite the pin. That is exactly why
# fg-m4-bootstrap.sh requires an EXTERNALLY supplied --expect-sha/--expect-tree
# and refuses a dirty worktree. Package-internal digests prove integrity, never
# authenticity.
FG_RF_FOUNDER_PUBKEY_FILE="${FG_RF_FOUNDER_PUBKEY_FILE:-${HOME}/.foundergate/founder_receipt.pub}"
FG_RF_FOUNDER_SIG_NAMESPACE="foundergate.founder-receipt.v2"
FG_RF_FOUNDER_SIG_PRINCIPAL="foundergate-founder"

# External, host-local, founder-gated machine enrollment record. Never written
# by this package. Its absence is a closed refusal for any profile that carries
# integration authority.
FG_RF_HOST_ENROLLMENT_DIR="${FG_RF_HOST_ENROLLMENT_DIR:-${HOME}/.foundergate/host-enrollment}"

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
# Keyed digests (HMAC-SHA256)
# ---------------------------------------------------------------------------
#
# Every seal that a same-user actor could otherwise recompute from public
# inputs is keyed with the per-run writer secret. This raises the bar from
# "two lines of jq" to "read the writer secret first". It is NOT a defence
# against an actor who can read ${run}/control/.writer_secret -- and on a
# single macOS user account, any process the founder runs can read it. Say so;
# do not claim otherwise.

# fg_hmac_sha256 <key> - message on stdin, lowercase hex on stdout.
fg_hmac_sha256() {
  local key="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 -mac HMAC -macopt "key:${key}" 2>/dev/null | awk '{print $NF}'
  else
    # Deterministic fallback with an explicit key separator. Weaker than HMAC
    # (length-extension applies to the underlying construction) and used only
    # where openssl is unavailable.
    printf 'FGRFMAC1|%s|' "$key" | cat - /dev/stdin | shasum -a 256 | awk '{print $1}'
  fi
}

fg_hmac_string() { printf '%s' "$2" | fg_hmac_sha256 "$1"; }

fg_writer_secret_file() { printf '%s/.writer_secret\n' "$(fg_control_dir "$1")"; }

# fg_run_key <run> - the per-run keying material, or empty when absent.
fg_run_key() { cat "$(fg_writer_secret_file "$1")" 2>/dev/null || printf ''; }

# fg_hmac_json_canonical <run> <file> [excluded_field] - keyed seal over a JSON
# document's canonical content with the seal field removed.
fg_hmac_json_canonical() {
  local run="$1" file="$2" field="${3:-seal}" key
  [ -f "$file" ] || { echo "MISSING"; return 1; }
  key="$(fg_run_key "$run")"
  [ -n "$key" ] || { echo "NO_RUN_KEY"; return 1; }
  jq -S -c "del(.${field})" "$file" 2>/dev/null | fg_hmac_sha256 "$key"
}

# ---------------------------------------------------------------------------
# Asymmetric signature verification (SSHSIG) - VERIFY ONLY
# ---------------------------------------------------------------------------
#
# This package verifies detached SSHSIG signatures. It NEVER produces one.
# `ssh-keygen -Y sign` appears nowhere under bin/ or lib/ and there is no code
# path, exported function, alias or template that reaches it. The only verbs
# used are `-Y verify` and `-l -f` (fingerprint). A grep for the signing verb
# over bin/ and lib/ must return zero, and the selftest asserts exactly that.
#
# THE VERIFIER BINARY IS PINNED. The founder receipt is the one authority the
# floor asks to resist a same-user actor, and its verdict is only as trustworthy
# as the binary that renders it. A bare `ssh-keygen` resolved through PATH would
# let any actor who controls PATH (which a same-user account does) prepend a
# fake `ssh-keygen` that echoes the pinned fingerprint and exits 0 for any
# signature -- forging FOUNDER_RECEIPT_OK with a throwaway key and no founder
# private key at all. fg_sshsig_bin therefore selects the FIRST existing
# executable from a fixed allowlist of trusted ABSOLUTE system paths, with the
# SIP-protected /usr/bin/ssh-keygen first so a writable homebrew/usr-local bin
# earlier in PATH cannot win. It fails closed (empty output, non-zero) when none
# is present, so every caller refuses rather than fall back to a PATH name.
#
# The FG_RF_SSH_KEYGEN_BIN override exists ONLY so the selftest can inject a
# deterministic stub. It is honoured ONLY under the explicit test-mode flag
# FG_RF_ALLOW_TEST_SSH_KEYGEN=1 and is IGNORED otherwise, so a same-user
# attacker who merely exports the variable in normal operation cannot redirect
# the verifier. (Pinning ssh-keygen removes PATH from the trust base for the
# signature check itself; the shell helpers around it -- awk, cat, mktemp -- are
# still PATH-resolved, which is why the shipped wording narrows the claim to an
# actor who cannot alter the floor's PATH/environment, tree, or system binary.)
FG_RF_SSH_KEYGEN_TRUSTED_PATHS="/usr/bin/ssh-keygen /opt/homebrew/bin/ssh-keygen /usr/local/bin/ssh-keygen"

fg_sshsig_bin() {
  local cand
  # Test mode ONLY: an explicit, clearly-named flag must be set before the
  # override is even consulted. Absent the flag, FG_RF_SSH_KEYGEN_BIN is dead.
  if [ "${FG_RF_ALLOW_TEST_SSH_KEYGEN:-}" = "1" ] && [ -n "${FG_RF_SSH_KEYGEN_BIN:-}" ]; then
    cand="${FG_RF_SSH_KEYGEN_BIN}"
    if [ -f "$cand" ] && [ -x "$cand" ]; then
      printf '%s\n' "$cand"
      return 0
    fi
    return 1
  fi
  # Trusted absolute system paths, /usr/bin first. No PATH lookup.
  for cand in ${FG_RF_SSH_KEYGEN_TRUSTED_PATHS}; do
    case "$cand" in
      /*) ;;            # absolute only; never a bare name
      *)  continue ;;
    esac
    if [ -f "$cand" ] && [ -x "$cand" ]; then
      printf '%s\n' "$cand"
      return 0
    fi
  done
  return 1
}

# fg_pubkey_fingerprint <public_key_file> - "SHA256:..." or empty.
fg_pubkey_fingerprint() {
  local f="$1" out kg
  [ -f "$f" ] || { printf ''; return 1; }
  kg="$(fg_sshsig_bin)" || { printf ''; return 1; }
  out="$("$kg" -l -f "$f" 2>/dev/null | awk '{print $2}')" || { printf ''; return 1; }
  case "$out" in SHA256:*) printf '%s\n' "$out"; return 0 ;; esac
  printf ''
  return 1
}

# fg_sshsig_verify <pubkey_file> <namespace> <principal> <signature_file>
#                  <message_file>
# SIGNATURE_OK | SIGNATURE_INVALID | SIGNATURE_TOOLING_MISSING |
# SIGNATURE_MATERIAL_MISSING
fg_sshsig_verify() {
  local pub="$1" ns="$2" principal="$3" sig="$4" msg="$5" allowed rc kg
  kg="$(fg_sshsig_bin)" || { echo "SIGNATURE_TOOLING_MISSING"; return 1; }
  [ -x "$kg" ] || { echo "SIGNATURE_TOOLING_MISSING"; return 1; }
  [ -f "$pub" ] && [ -f "$sig" ] && [ -f "$msg" ] || { echo "SIGNATURE_MATERIAL_MISSING"; return 1; }
  allowed="$(mktemp "${TMPDIR:-/tmp}/.fgsig.XXXXXX")" || { echo "SIGNATURE_MATERIAL_MISSING"; return 1; }
  printf '%s %s\n' "$principal" "$(cat "$pub")" > "$allowed"
  "$kg" -Y verify -f "$allowed" -I "$principal" -n "$ns" -s "$sig" < "$msg" >/dev/null 2>&1
  rc=$?
  rm -f "$allowed"
  [ "$rc" -eq 0 ] || { echo "SIGNATURE_INVALID"; return 1; }
  echo "SIGNATURE_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Machine identity (read-only)
# ---------------------------------------------------------------------------
#
# Read from the platform, never invented and never written. Used only to
# COMPARE against an externally enrolled record.

fg_machine_uuid() {
  ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null \
    | awk -F'"' '/IOPlatformUUID/{print $4; exit}'
}

fg_machine_serial() {
  ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null \
    | awk -F'"' '/IOPlatformSerialNumber/{print $4; exit}'
}

# ---------------------------------------------------------------------------
# Identifier allowlist and safe interpolation
# ---------------------------------------------------------------------------

# fg_id_valid <value> - strict allowlist for every identifier that ever reaches
# a path or a command string: run ids, task ids, role names, lane ids and tmux
# session names. [A-Za-z0-9._-]{1,64}, no leading hyphen or dot, no "..".
fg_id_valid() {
  local v="${1-}"
  [ -n "$v" ] || return 1
  [ "${#v}" -le 64 ] || return 1
  case "$v" in
    -*|.*) return 1 ;;
    *..*)  return 1 ;;
  esac
  case "$v" in
    *[!A-Za-z0-9._-]*) return 1 ;;
  esac
  return 0
}

# fg_id_require <kind> <value> - INVALID_<KIND>_ID:<value> on refusal.
fg_id_require() {
  local kind="$1" v="${2-}"
  if ! fg_id_valid "$v"; then
    printf 'INVALID_%s_ID\n' "$(printf '%s' "$kind" | tr '[:lower:]' '[:upper:]')"
    return 1
  fi
  return 0
}

# fg_shquote <value> - single-argument shell quoting. Every value interpolated
# into a command string that a shell will later parse must pass through this.
fg_shquote() {
  local v="${1-}"
  printf "'%s'" "$(printf '%s' "$v" | sed "s/'/'\\\\''/g")"
}

# ---------------------------------------------------------------------------
# Path and branch normalisation
# ---------------------------------------------------------------------------

# fg_fs_case_insensitive [dir] - true when the filesystem folds case. Probed
# once per process; git's core.ignorecase is consulted first when available.
FG_RF_CASE_FOLD_CACHE=""
fg_fs_case_insensitive() {
  local dir="${1:-${TMPDIR:-/tmp}}" probe
  if [ -n "$FG_RF_CASE_FOLD_CACHE" ]; then
    [ "$FG_RF_CASE_FOLD_CACHE" = "yes" ]
    return $?
  fi
  probe="$(mktemp "${dir%/}/.fgcase.XXXXXX" 2>/dev/null)" || probe=""
  if [ -n "$probe" ]; then
    if [ -e "$(printf '%s' "$probe" | tr '[:lower:]' '[:upper:]')" ] && \
       [ "$probe" != "$(printf '%s' "$probe" | tr '[:lower:]' '[:upper:]')" ]; then
      FG_RF_CASE_FOLD_CACHE="yes"
    else
      FG_RF_CASE_FOLD_CACHE="no"
    fi
    rm -f "$probe"
  else
    FG_RF_CASE_FOLD_CACHE="yes"   # fail safe: fold when we cannot tell
  fi
  [ "$FG_RF_CASE_FOLD_CACHE" = "yes" ]
}

fg_casefold() { printf '%s' "${1-}" | tr '[:upper:]' '[:lower:]'; }

# fg_compare_key <value> - the form used for every path/branch comparison.
# Case-folded on a case-insensitive filesystem, verbatim otherwise.
fg_compare_key() {
  if fg_fs_case_insensitive; then fg_casefold "${1-}"; else printf '%s' "${1-}"; fi
}

# fg_path_normalise <path> - collapse "./", resolve "." and ".." segments
# lexically, strip duplicate and trailing slashes. Emits PATH_ESCAPES_ROOT when
# the path resolves above its own root, and PATH_IS_ABSOLUTE for absolute input.
# Runs in a subshell so `set -f` and IFS never leak to the caller.
fg_path_normalise() (
  p="${1-}"
  case "$p" in
    '') echo "PATH_EMPTY"; exit 1 ;;
    /*) echo "PATH_IS_ABSOLUTE"; exit 1 ;;
  esac
  case "$p" in
    *"$(printf '\t')"*) echo "PATH_CONTROL_CHARACTER"; exit 1 ;;
  esac
  case "$p" in
    *"
"*) echo "PATH_CONTROL_CHARACTER"; exit 1 ;;
  esac
  set -f
  IFS=/
  out=""
  depth=0
  for seg in $p; do
    case "$seg" in
      ''|'.') continue ;;
      '..')
        [ "$depth" -gt 0 ] || { echo "PATH_ESCAPES_ROOT"; exit 1; }
        depth=$(( depth - 1 ))
        out="${out%/*}"
        [ "$depth" -gt 0 ] || out=""
        ;;
      *)
        if [ "$depth" -eq 0 ]; then out="$seg"; else out="${out}/${seg}"; fi
        depth=$(( depth + 1 ))
        ;;
    esac
  done
  [ "$depth" -gt 0 ] || { echo "PATH_EMPTY"; exit 1; }
  printf '%s\n' "$out"
)

# fg_realpath <path> - resolve symlinks with a bounded loop. Pure shell; no
# dependency on a realpath(1) that stock macOS does not ship.
fg_realpath() {
  local p="$1" i=0 link dir base
  while [ "$i" -lt 40 ]; do
    if [ -L "$p" ]; then
      link="$(readlink "$p" 2>/dev/null)" || break
      case "$link" in
        /*) p="$link" ;;
        *)  p="$(dirname "$p")/${link}" ;;
      esac
      i=$(( i + 1 ))
      continue
    fi
    break
  done
  dir="$(dirname "$p")"; base="$(basename "$p")"
  if [ -d "$dir" ]; then
    printf '%s/%s\n' "$(cd "$dir" && pwd -P)" "$base"
  else
    printf '%s\n' "$p"
  fi
}

# fg_path_contained <repo_root> <relative_path> - normalises the candidate,
# resolves symlinks, and asserts the result stays under the repository root.
# PATH_CONTAINED | PATH_ESCAPES_REPOSITORY | PATH_ESCAPES_ROOT | PATH_IS_ABSOLUTE
fg_path_contained() {
  local root="$1" rel="$2" norm real rootreal dir base probe
  norm="$(fg_path_normalise "$rel")" || { printf '%s\n' "$norm"; return 1; }
  rootreal="$(cd "$root" 2>/dev/null && pwd -P)" || { echo "PATH_NO_REPOSITORY"; return 1; }
  probe="${rootreal}/${norm}"
  # Resolve the deepest existing ancestor, then re-attach the remainder, so a
  # not-yet-created file inside a symlinked directory is still resolved.
  dir="$(dirname "$probe")"; base="$(basename "$probe")"
  while [ ! -d "$dir" ] && [ "$dir" != "/" ]; do
    base="$(basename "$dir")/${base}"
    dir="$(dirname "$dir")"
  done
  real="$(cd "$dir" 2>/dev/null && pwd -P)/${base}" || { echo "PATH_UNRESOLVABLE"; return 1; }
  real="$(fg_realpath "$real")"
  case "$(fg_compare_key "$real")/" in
    "$(fg_compare_key "$rootreal")"/*) echo "PATH_CONTAINED"; return 0 ;;
  esac
  echo "PATH_ESCAPES_REPOSITORY"
  return 1
}

# fg_branch_normalise <branch> - strip refs/heads/, reject leading/trailing
# whitespace, control characters, git-illegal characters and empty values.
#
# The character set follows git-check-ref-format: a legal branch name cannot
# contain a space, ~, ^, :, ?, *, [, \, or a control character, and cannot
# contain "..". Everything a shell would treat as a metacharacter is therefore
# either already illegal in git or explicitly refused here, so a branch value
# is inert data even before it is quoted.
fg_branch_normalise() {
  local b="${1-}"
  case "$b" in
    ''|' '*|*' ') echo "BRANCH_WHITESPACE"; return 1 ;;
  esac
  case "$b" in
    *$'\t'*|*$'\n'*|*$'\r'*) echo "BRANCH_WHITESPACE"; return 1 ;;
  esac
  case "$b" in
    *'~'*|*'^'*|*':'*|*'?'*|*'*'*|*'['*|*'\'*|*'..'*) echo "BRANCH_ILLEGAL_CHARACTER"; return 1 ;;
    *'$'*|*'`'*|*';'*|*'|'*|*'&'*|*'<'*|*'>'*|*'('*|*')'*|*'"'*|*"'"*|*'!'*|*'#'*)
      echo "BRANCH_ILLEGAL_CHARACTER"; return 1 ;;
  esac
  b="${b#refs/heads/}"
  b="${b%/}"
  [ -n "$b" ] || { echo "BRANCH_EMPTY"; return 1; }
  case "$b" in
    -*|/*|*/) echo "BRANCH_ILLEGAL_CHARACTER"; return 1 ;;
  esac
  printf '%s\n' "$b"
  return 0
}

# fg_patharg_safe <path> - a filesystem path supplied by an operator or a role.
# It is quoted wherever it reaches a command string, but a path carrying shell
# metacharacters is refused outright rather than relied on to stay quoted
# through every future edit of this package.
fg_patharg_safe() {
  local p="${1-}"
  [ -n "$p" ] || return 1
  case "$p" in
    *$'\n'*|*$'\r'*|*$'\t'*) return 1 ;;
    *'$'*|*'`'*|*';'*|*'|'*|*'&'*|*'<'*|*'>'*|*'('*|*')'*|*'"'*|*"'"*|*'\'*|*'!'*) return 1 ;;
  esac
  return 0
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
#
# The candidate is normalised ("./x", "a/../x" and "x" are one path) and, on a
# case-insensitive filesystem, case-folded, so "Package.json" no longer slips
# past a rule written as "package.json" (F-G02). An absolute or escaping path
# is treated as shared-surface-bearing, i.e. refused, rather than admitted.
fg_path_is_shared_surface() {
  local p="$1" s n pk sk
  n="$(fg_path_normalise "$p")" || return 0
  pk="$(fg_compare_key "$n")"
  while IFS= read -r s; do
    [ -n "$s" ] || continue
    case "$s" in
      */) sk="$(fg_compare_key "${s%/}")"
          case "$pk" in "$sk"|"$sk"/*) return 0 ;; esac ;;
      *)  sk="$(fg_compare_key "$s")"
          [ "$pk" = "$sk" ] && return 0 ;;
    esac
  done <<< "$(fg_split_noglob "$FG_RF_SHARED_SURFACES")"
  return 1
}

# fg_branch_is_protected <branch> - refs/heads/ stripped, whitespace refused,
# case-folded on a case-insensitive repository. "Main" is "main" (F-G03).
# A branch value that cannot be normalised is treated as protected: an
# unparseable branch never earns a writable lease by being unparseable.
fg_branch_is_protected() {
  local b n p
  n="$(fg_branch_normalise "${1-}")" || return 0
  n="$(fg_compare_key "$n")"
  for p in ${FG_RF_PROTECTED_BRANCHES}; do
    [ "$n" = "$(fg_compare_key "$p")" ] && return 0
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

# fg_split_noglob <space separated list> - one item per line, with pathname
# expansion DISABLED.
#
# An unquoted list of path globs is expanded against the current directory
# before it is ever compared. A lease allowing "src/*" iterated that way turns
# into whatever src/ happens to contain, so an overlap check silently depends
# on where the floor was launched from. Always read glob lists through this.
# The subshell keeps `set -f` from leaking to the caller.
fg_split_noglob() {
  ( set -f
    local item
    for item in $1; do
      [ -n "$item" ] && printf '%s\n' "$item"
    done )
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

# fg_glob_compare_prefix <glob> - the literal prefix in comparison form:
# normalised ("./src/a" -> "src/a") and case-folded where the filesystem folds.
# An absolute or escaping glob yields the sentinel "\1ABSOLUTE", which overlaps
# nothing and is separately refused at lease request time (F-G05).
fg_glob_compare_prefix() {
  local lit n
  lit="$(fg_glob_literal_prefix "$1")"
  [ -n "$lit" ] && n="$(fg_path_normalise "$lit")" || n=""
  case "$n" in
    ''|PATH_*) printf '%s' "$(fg_compare_key "$lit")"; return 0 ;;
  esac
  printf '%s' "$(fg_compare_key "$n")"
}

# fg_globs_overlap <globA> <globB> - conservative: true when either normalised,
# case-folded literal prefix contains the other. Prefers false positives
# (rejecting a safe lease) over false negatives (admitting two writers to one
# file). Path spelling no longer decides: "./src/a.txt", "src/a.txt" and
# "SRC/a.txt" all collide with an existing "src/*" lease.
fg_globs_overlap() {
  local a b
  a="$(fg_glob_compare_prefix "$1")"
  b="$(fg_glob_compare_prefix "$2")"
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
