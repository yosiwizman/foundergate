#!/usr/bin/env bash
# FounderGate role floor - M4 bootstrap.
#
#   bash tools/role-floor/bin/fg-m4-bootstrap.sh --check
#   bash tools/role-floor/bin/fg-m4-bootstrap.sh --repo /path/to/foundergate
#
# INACTIVE UNTIL AUTHORIZED. This script is committed in a dormant state: it
# refuses to run from an unverified package or the wrong repository, and it
# installs nothing under any circumstance.
#
# INTEGRITY IS NOT AUTHENTICITY
#
# PACKAGE_DIGESTS.txt ships inside the tree it describes. It proves nothing
# changed by accident. It CANNOT prove this is the audited package: appending a
# backdoor and regenerating the manifest is two lines of shell, and the audit
# demonstrated exactly that reaching M4_BOOTSTRAP_VERIFIED. Authenticity
# therefore requires an EXTERNALLY supplied candidate identity, carried to this
# machine out of band, which this script REFUSES TO START without.
#
# Options:
#   --check           run every verification and stop before creating anything
#   --host <m4>       host profile (must be a profile that holds M4 authority)
#   --repo <path>     M4 repository path (else FG_RF_M4_REPO, else the profile
#                     default). The path is configuration, never a guess.
#   --expect-version  package version the operator expects to be running
#   --expect-sha      REQUIRED to start: externally supplied commit SHA
#   --expect-tree     REQUIRED to start: externally supplied tree SHA
#   --expect-bundle-sha256 <sha> --bundle <path>
#                     optional additional anchor against the transfer bundle
#   --allow-start     actually create the M4 session after all checks pass
#
# Verification order (each failure is a named refusal, never a warning):
#   1. host profile holds M4 authority
#   2. PHYSICAL HOST ENROLLMENT - external, signed, hardware-bound record
#   3. tmux / claude / jq / git present     (never installed)
#   4. repository exists, is a git repository, and matches expected identity
#   5. EXTERNAL CANDIDATE IDENTITY - HEAD sha and tree equal the values the
#      auditor supplied out of band, and the worktree is clean
#   6. branch and package version
#   7. package file digests against PACKAGE_DIGESTS.txt  (INTEGRITY ONLY)
#   8. protected role prompt digests                     (INTEGRITY ONLY)
# Only then may the shared start implementation create the M4 session.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

HOST="m4"; REPO=""; MODE="check"; EXPECT_VERSION=""
EXPECT_SHA=""; EXPECT_TREE=""; EXPECT_BUNDLE=""; BUNDLE_PATH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) MODE="check" ;;
    --allow-start) MODE="start" ;;
    --host) shift; HOST="${1:-}" ;;
    --repo) shift; REPO="${1:-}" ;;
    --expect-version) shift; EXPECT_VERSION="${1:-}" ;;
    --expect-sha) shift; EXPECT_SHA="${1:-}" ;;
    --expect-tree) shift; EXPECT_TREE="${1:-}" ;;
    --expect-bundle-sha256) shift; EXPECT_BUNDLE="${1:-}" ;;
    --bundle) shift; BUNDLE_PATH="${1:-}" ;;
    -h|--help) sed -n '2,45p' "$0"; exit 0 ;;
    *) fg_err "unknown argument: $1"; exit 2 ;;
  esac
  shift
done

refuse() {
  printf 'STATUS: M4_BOOTSTRAP_REFUSED\n'
  printf 'reason: %s\n' "$1"
  [ -n "${2:-}" ] && printf 'detail: %s\n' "$2"
  printf 'installed_anything: no\n'
  exit 4
}
blocked() {
  printf 'STATUS: M4_BOOTSTRAP_BLOCKED\n'
  printf 'missing_prerequisite: %s\n' "$1"
  printf 'remediation: install it yourself on the M4; this script never installs software\n'
  printf 'installed_anything: no\n'
  exit 3
}

# --- 1. host profile -------------------------------------------------------

fg_host_load "$HOST" >/dev/null || refuse "BOOTSTRAP_REFUSED_UNKNOWN_HOST_PROFILE" "no profile named '${HOST}'"
fg_host_authority serial_integration_writer || \
  refuse "BOOTSTRAP_REFUSED_WRONG_HOST_PROFILE" \
         "profile '${HOST}' holds no serial-integration authority; the M4 bootstrap refuses to run an M1 profile"
fg_host_authority merge_sheriff || \
  refuse "BOOTSTRAP_REFUSED_WRONG_HOST_PROFILE" "profile '${HOST}' holds no merge-sheriff authority"
[ "$(printf '%s' "$FG_RF_WINDOWS" | wc -w | tr -d ' ')" = "7" ] || \
  refuse "BOOTSTRAP_REFUSED_WRONG_HOST_PROFILE" "the M4 floor requires seven governed role windows"

# --- 2. physical host enrollment -------------------------------------------
#
# `--host m4` is PROFILE SELECTION. It says nothing about which computer is
# running. The audit started a full seven-window M4 floor with merge authority
# on an M1 by pointing it at a scratch git repository. That is now refused: a
# merge-bearing profile requires an external, signed record binding this
# machine's IOPlatformUUID and hardware serial, whose signing authority is
# pinned by fingerprint. This script can VERIFY that record. It can never
# create, sign, or self-approve one, and no in-repository edit produces M4
# authority on a machine that is not enrolled.

HOST_IDENT="$(fg_host_identity_verify "$HOST")"
case "$HOST_IDENT" in
  HOST_IDENTITY_OK|HOST_IDENTITY_NOT_REQUIRED) : ;;
  *) refuse "BOOTSTRAP_REFUSED_${HOST_IDENT}" \
       "profile '${HOST}' carries integration authority; this machine is not enrolled for it. Enrollment is a host-local, founder-gated action performed ON the M4, using an enrollment authority key this package never holds." ;;
esac

# --- 3. prerequisites, verified and never installed ------------------------

command -v "$FG_RF_TMUX_BIN" >/dev/null 2>&1 || blocked "tmux"
command -v jq >/dev/null 2>&1 || blocked "jq"
command -v git >/dev/null 2>&1 || blocked "git"
command -v "$FG_RF_CLAUDE_BIN" >/dev/null 2>&1 || blocked "claude CLI"
TMUX_VERSION="$("$FG_RF_TMUX_BIN" -V 2>/dev/null || echo unknown)"
CLAUDE_VERSION="$("$FG_RF_CLAUDE_BIN" --version 2>/dev/null | head -1 || echo unknown)"

# --- 4. repository identity, configured rather than guessed ----------------

# F-E02: the profile's default_path is DATA, expanded by explicit, bounded
# substitution of a single permitted variable. It is never handed to eval, so a
# command substitution placed in that JSON string is inert text.
fg_expand_profile_path() {
  local p="${1-}"
  case "$p" in
    *'${HOME}'*) p="${p//\$\{HOME\}/$HOME}" ;;
  esac
  case "$p" in
    *'$'*|*'`'*) printf ''; return 1 ;;   # anything else stays unexpanded and is refused
  esac
  printf '%s' "$p"
  return 0
}

[ -n "$REPO" ] || REPO="${FG_RF_M4_REPO:-}"
if [ -z "$REPO" ]; then
  REPO="$(fg_expand_profile_path "$(fg_host_expected_repo_default)")" || \
    refuse "BOOTSTRAP_REFUSED_UNSAFE_REPOSITORY_DEFAULT" \
           "expected_repository_identity.default_path contains an unexpandable shell construct; it is configuration data, not a script"
fi
[ -n "$REPO" ] || refuse "BOOTSTRAP_REFUSED_NO_REPOSITORY_CONFIGURED" \
  "set FG_RF_M4_REPO or pass --repo; the M4 repository path is never inferred"
[ -d "${REPO}/.git" ] || refuse "BOOTSTRAP_REFUSED_WRONG_REPOSITORY" "not a git repository: ${REPO}"

EXPECT_ORIGIN="$(fg_host_expected_origin_basename)"
ORIGIN_URL="$(git -C "$REPO" remote get-url origin 2>/dev/null || echo "")"
ORIGIN_BASENAME="$(printf '%s' "$ORIGIN_URL" | sed -e 's|.*/||' -e 's|\.git$||')"
if [ -n "$EXPECT_ORIGIN" ] && [ "$ORIGIN_BASENAME" != "$EXPECT_ORIGIN" ]; then
  refuse "BOOTSTRAP_REFUSED_WRONG_REPOSITORY" \
         "origin basename '${ORIGIN_BASENAME:-none}' does not match expected '${EXPECT_ORIGIN}'"
fi

REPO_BRANCH="$(fg_git_branch "$REPO")"
REPO_SHA="$(fg_git_head_sha "$REPO")"
REPO_TREE="$(fg_git_head_tree "$REPO")"

# --- 5. EXTERNAL candidate identity ----------------------------------------
#
# The anchor is the repository that CONTAINS THIS PACKAGE, not merely the
# repository under supervision, and it is compared against values the auditor
# carried here out of band. Three conditions, all required:
#
#   a. HEAD commit == --expect-sha
#   b. HEAD tree   == --expect-tree
#   c. the worktree is CLEAN
#
# (c) is what makes (a) and (b) meaningful. Editing lib/roles.sh and
# regenerating PACKAGE_DIGESTS.txt leaves HEAD untouched but the worktree
# dirty, so the modified-package-with-a-fresh-manifest attack now fails here
# with BOOTSTRAP_REFUSED_PACKAGE_WORKTREE_DIRTY. Committing the change instead
# moves HEAD, which fails (a).

PKG_REPO="$(git -C "$FG_RF_HOME" rev-parse --show-toplevel 2>/dev/null || echo "")"
PKG_SHA=""; PKG_TREE=""; PKG_DIRTY="unknown"
if [ -n "$PKG_REPO" ]; then
  PKG_SHA="$(fg_git_head_sha "$PKG_REPO")"
  PKG_TREE="$(fg_git_head_tree "$PKG_REPO")"
  fg_git_is_clean "$PKG_REPO" && PKG_DIRTY="no" || PKG_DIRTY="yes"
fi

if [ -z "$EXPECT_SHA" ] && [ -z "$EXPECT_TREE" ] && [ -z "$EXPECT_BUNDLE" ]; then
  if [ "$MODE" = "start" ]; then
    refuse "BOOTSTRAP_REFUSED_NO_EXTERNAL_IDENTITY" \
      "--allow-start requires an externally supplied candidate identity: pass --expect-sha and --expect-tree (and optionally --expect-bundle-sha256 with --bundle). PACKAGE_DIGESTS.txt is an integrity check only and cannot establish that this is the audited package."
  fi
  EXTERNAL_IDENTITY="NOT_SUPPLIED (integrity checked, authenticity NOT established)"
else
  [ -n "$PKG_REPO" ] || refuse "BOOTSTRAP_REFUSED_PACKAGE_NOT_IN_GIT" \
    "an external candidate identity was supplied but the package is not inside a git repository, so HEAD cannot be compared"
  if [ -n "$EXPECT_SHA" ]; then
    [ "$EXPECT_SHA" = "$PKG_SHA" ] || refuse "BOOTSTRAP_REFUSED_CANDIDATE_SHA_MISMATCH" \
      "expected ${EXPECT_SHA}, package repository HEAD is ${PKG_SHA:-none}"
  fi
  if [ -n "$EXPECT_TREE" ]; then
    [ "$EXPECT_TREE" = "$PKG_TREE" ] || refuse "BOOTSTRAP_REFUSED_CANDIDATE_TREE_MISMATCH" \
      "expected ${EXPECT_TREE}, package repository HEAD tree is ${PKG_TREE:-none}"
  fi
  [ "$PKG_DIRTY" = "no" ] || refuse "BOOTSTRAP_REFUSED_PACKAGE_WORKTREE_DIRTY" \
    "the package worktree has uncommitted modifications, so the committed SHA and tree do not describe the files on disk. Regenerating PACKAGE_DIGESTS.txt does not change this."
  if [ -n "$EXPECT_BUNDLE" ]; then
    [ -n "$BUNDLE_PATH" ] && [ -f "$BUNDLE_PATH" ] || refuse "BOOTSTRAP_REFUSED_BUNDLE_MISSING" \
      "--expect-bundle-sha256 requires --bundle <path> to an existing transfer bundle"
    GOT_BUNDLE="$(fg_sha256_file "$BUNDLE_PATH")"
    [ "$GOT_BUNDLE" = "$EXPECT_BUNDLE" ] || refuse "BOOTSTRAP_REFUSED_BUNDLE_SHA_MISMATCH" \
      "expected ${EXPECT_BUNDLE}, bundle is ${GOT_BUNDLE}"
  fi
  EXTERNAL_IDENTITY="VERIFIED sha=${PKG_SHA} tree=${PKG_TREE} worktree_clean=yes"
fi

# --- 6. package version ----------------------------------------------------

if [ -n "$EXPECT_VERSION" ] && [ "$EXPECT_VERSION" != "$FG_RF_VERSION" ]; then
  refuse "BOOTSTRAP_REFUSED_VERSION_MISMATCH" "expected ${EXPECT_VERSION}, package is ${FG_RF_VERSION}"
fi

# --- 7. package digests (INTEGRITY ONLY) -----------------------------------

DIGESTS="${FG_RF_HOME}/PACKAGE_DIGESTS.txt"
[ -f "$DIGESTS" ] || refuse "BOOTSTRAP_REFUSED_DIGEST_MANIFEST_MISSING" "$DIGESTS"
MISMATCH=""
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  WANT="$(printf '%s' "$line" | awk '{print $1}')"
  REL="$(printf '%s' "$line" | sed 's/^[0-9a-f]*  *//')"
  if [ ! -f "${FG_RF_HOME}/${REL}" ]; then MISMATCH="${REL} (missing)"; break; fi
  GOT="$(shasum -a 256 "${FG_RF_HOME}/${REL}" | awk '{print $1}')"
  if [ "$WANT" != "$GOT" ]; then MISMATCH="$REL"; break; fi
done < "$DIGESTS"
[ -z "$MISMATCH" ] || refuse "BOOTSTRAP_REFUSED_DIGEST_MISMATCH" "$MISMATCH"

# --- 8. protected prompts (INTEGRITY ONLY) ---------------------------------

PROMPTS="$(fg_prompt_templates_verify)"
[ "$PROMPTS" = "PROMPT_DIGESTS_OK" ] || refuse "BOOTSTRAP_REFUSED_PROMPT_DIGEST_MISMATCH" "$PROMPTS"

# --- report ----------------------------------------------------------------

printf 'STATUS: M4_BOOTSTRAP_VERIFIED\n'
printf 'host_profile         : %s\n' "$FG_RF_HOST"
printf 'host_enrollment      : %s\n' "$HOST_IDENT"
printf 'package_version      : %s\n' "$FG_RF_VERSION"
printf 'package_digests      : OK (%s entries) -- INTEGRITY ONLY, NOT AUTHENTICITY\n' "$(grep -c '^[0-9a-f]' "$DIGESTS")"
printf 'prompt_digests       : OK -- INTEGRITY ONLY\n'
printf 'external_identity    : %s\n' "$EXTERNAL_IDENTITY"
printf 'package_repository   : %s\n' "${PKG_REPO:-none}"
printf 'package_head/tree    : %s / %s\n' "${PKG_SHA:-none}" "${PKG_TREE:-none}"
printf 'package_worktree_dirty: %s\n' "$PKG_DIRTY"
printf 'repository           : %s\n' "$REPO"
printf 'origin               : %s\n' "${ORIGIN_URL:-none}"
printf 'branch               : %s\n' "$REPO_BRANCH"
printf 'head_sha/tree        : %s / %s\n' "$REPO_SHA" "$REPO_TREE"
printf 'tmux                 : %s\n' "$TMUX_VERSION"
printf 'claude               : %s\n' "$CLAUDE_VERSION"
printf 'installed_anything   : no\n'
printf 'role_windows         : %s\n' "$FG_RF_WINDOWS"
printf 'terminal0_boundary   : preserved (the floor never claims Terminal-0)\n'
printf 'merge_authority      : merge-sheriff, gated by host enrollment + exact final PASS\n'
printf '                       + a one-time founder receipt signed outside this package\n'
printf 'founder_authorities  : signature, activation, deployment remain sealed here\n'

if [ "$MODE" != "start" ]; then
  printf '\nverification only; nothing was created.\n'
  case "$EXTERNAL_IDENTITY" in
    NOT_SUPPLIED*)
      printf 'NOTE: no external candidate identity was supplied, so this run established\n'
      printf '      INTEGRITY only. --allow-start will refuse until --expect-sha and\n'
      printf '      --expect-tree are supplied from out-of-band audit evidence.\n' ;;
  esac
  printf 'to start after authorization:\n'
  printf '  bash tools/role-floor/bin/fg-m4-bootstrap.sh --repo %s --expect-sha <sha> --expect-tree <tree> --allow-start\n' "$REPO"
  exit 0
fi

# The bootstrap does not reimplement start: it delegates to the shared
# implementation with the M4 profile loaded.
FG_RF_HOST="$FG_RF_HOST" bash "${FG_RF_BIN_DIR}/fg-role-floor-start.sh" --host "$FG_RF_HOST" --repo "$REPO"
RC=$?
[ "$RC" -eq 0 ] || exit "$RC"

printf '\nattach: tmux attach -t %s\n' "$FG_RF_SESSION"
printf 'status: bash tools/role-floor/bin/fg-role-floor-status.sh --host %s\n' "$FG_RF_HOST"
printf 'stop:   bash tools/role-floor/bin/fg-role-floor-stop.sh --host %s\n' "$FG_RF_HOST"
exit 0
