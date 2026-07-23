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
# Options:
#   --check           run every verification and stop before creating anything
#   --host <m4>       host profile (must be a profile that holds M4 authority)
#   --repo <path>     M4 repository path (else FG_RF_M4_REPO, else the profile
#                     default). The path is configuration, never a guess.
#   --expect-version  package version the operator expects to be running
#   --allow-start     actually create the M4 session after all checks pass
#
# Verification order (each failure is a named refusal, never a warning):
#   1. host profile holds M4 authority
#   2. tmux present            (never installed)
#   3. claude CLI present      (never installed)
#   4. repository exists, is a git repository, and matches the expected identity
#   5. branch and package version
#   6. package file digests against PACKAGE_DIGESTS.txt
#   7. protected role prompt digests
# Only then may the shared start implementation create the M4 session.
set -u

FG_RF_BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/claude-adapter.sh
. "${FG_RF_BIN_DIR}/../lib/claude-adapter.sh"

HOST="m4"; REPO=""; MODE="check"; EXPECT_VERSION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) MODE="check" ;;
    --allow-start) MODE="start" ;;
    --host) shift; HOST="${1:-}" ;;
    --repo) shift; REPO="${1:-}" ;;
    --expect-version) shift; EXPECT_VERSION="${1:-}" ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
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

# --- 2/3. prerequisites, verified and never installed ----------------------

command -v "$FG_RF_TMUX_BIN" >/dev/null 2>&1 || blocked "tmux"
command -v jq >/dev/null 2>&1 || blocked "jq"
command -v git >/dev/null 2>&1 || blocked "git"
command -v "$FG_RF_CLAUDE_BIN" >/dev/null 2>&1 || blocked "claude CLI"
TMUX_VERSION="$("$FG_RF_TMUX_BIN" -V 2>/dev/null || echo unknown)"
CLAUDE_VERSION="$("$FG_RF_CLAUDE_BIN" --version 2>/dev/null | head -1 || echo unknown)"

# --- 4. repository identity, configured rather than guessed ----------------

[ -n "$REPO" ] || REPO="${FG_RF_M4_REPO:-}"
[ -n "$REPO" ] || REPO="$(eval printf '%s' "$(fg_host_expected_repo_default)")"
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

# --- 5. package version ----------------------------------------------------

if [ -n "$EXPECT_VERSION" ] && [ "$EXPECT_VERSION" != "$FG_RF_VERSION" ]; then
  refuse "BOOTSTRAP_REFUSED_VERSION_MISMATCH" "expected ${EXPECT_VERSION}, package is ${FG_RF_VERSION}"
fi

# --- 6. package digests ----------------------------------------------------

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

# --- 7. protected prompts --------------------------------------------------

PROMPTS="$(fg_prompt_templates_verify)"
[ "$PROMPTS" = "PROMPT_DIGESTS_OK" ] || refuse "BOOTSTRAP_REFUSED_PROMPT_DIGEST_MISMATCH" "$PROMPTS"

# --- report ----------------------------------------------------------------

printf 'STATUS: M4_BOOTSTRAP_VERIFIED\n'
printf 'host_profile         : %s\n' "$FG_RF_HOST"
printf 'package_version      : %s\n' "$FG_RF_VERSION"
printf 'package_digests      : OK (%s entries)\n' "$(grep -c '^[0-9a-f]' "$DIGESTS")"
printf 'prompt_digests       : OK\n'
printf 'repository           : %s\n' "$REPO"
printf 'origin               : %s\n' "${ORIGIN_URL:-none}"
printf 'branch               : %s\n' "$REPO_BRANCH"
printf 'head_sha/tree        : %s / %s\n' "$REPO_SHA" "$REPO_TREE"
printf 'tmux                 : %s\n' "$TMUX_VERSION"
printf 'claude               : %s\n' "$CLAUDE_VERSION"
printf 'installed_anything   : no\n'
printf 'role_windows         : %s\n' "$FG_RF_WINDOWS"
printf 'terminal0_boundary   : preserved (the floor never claims Terminal-0)\n'
printf 'merge_authority      : merge-sheriff, gated by exact final PASS + founder receipt\n'
printf 'founder_authorities  : signature, activation, deployment remain sealed here\n'

if [ "$MODE" != "start" ]; then
  printf '\nverification only; nothing was created.\n'
  printf 'to start after authorization:\n'
  printf '  bash tools/role-floor/bin/fg-m4-bootstrap.sh --repo %s --allow-start\n' "$REPO"
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
