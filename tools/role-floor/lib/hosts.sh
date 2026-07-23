#!/usr/bin/env bash
# FounderGate role floor - host profiles.
#
# One implementation serves both hosts. A host profile is configuration:
# config/hosts/m1.json and config/hosts/m4.json declare the window set, the
# role/artifact authority table, the writable-lease roles, the sealed artifact
# classes and the hard-stop actions. Nothing in bin/ or lib/ branches on the
# host name to choose behaviour; it reads the loaded profile.
#
#   m1 - orchestrator, builder, checker, advisor.
#        No serial integration, no final verification, no merge, no
#        protected-main writer. Those become M4_HANDOFF_REQUIRED.
#
#   m4 - the same four, plus serial-integration, final-verifier and
#        merge-sheriff. Founder signature, production activation and
#        destructive actions remain hard stops on M4 as well.
set -u

# shellcheck source=./common.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

fg_host_profile_file() { printf '%s/config/hosts/%s.json\n' "$FG_RF_HOME" "$1"; }

fg_host_list() {
  local f
  for f in "${FG_RF_HOME}"/config/hosts/*.json; do
    [ -f "$f" ] || continue
    basename "$f" .json
  done
}

# fg_host_load <host> - HOST_PROFILE_LOADED:<host> | HOST_PROFILE_UNKNOWN:<host>
fg_host_load() {
  local host="$1" f
  f="$(fg_host_profile_file "$host")"
  if [ ! -f "$f" ]; then echo "HOST_PROFILE_UNKNOWN:${host}"; return 1; fi
  if ! jq -e . "$f" >/dev/null 2>&1; then echo "HOST_PROFILE_INVALID:${host}"; return 1; fi

  FG_RF_HOST="$host"
  FG_RF_PROFILE_FILE="$f"
  FG_RF_WINDOWS="$(jq -r '.windows | join(" ")' "$f")"
  FG_RF_FOUNDER_WINDOW="$(jq -r '.founder_window' "$f")"
  FG_RF_PROTECTED_BRANCHES="$(jq -r '.protected_branches | join(" ")' "$f")"
  FG_RF_SHARED_SURFACES="$(jq -r '.shared_surfaces | join(" ")' "$f")"
  FG_RF_HARD_STOP_ACTIONS="$(jq -r '.hard_stop_actions | join(" ")' "$f")"
  FG_RF_WRITABLE_LEASE_ROLES="$(jq -r '.writable_lease_roles | join(" ")' "$f")"
  FG_RF_SHARED_SURFACE_WRITER_ROLES="$(jq -r '.shared_surface_writer_roles | join(" ")' "$f")"
  FG_RF_SEALED_CLASSES="$(jq -r '.sealed_artifact_classes | join(" ")' "$f")"
  FG_RF_CORRECTION_LIMIT="$(jq -r '.correction_limit' "$f")"
  FG_RF_CONTEXT_RESTART_LIMIT="$(jq -r '.context_restart_limit' "$f")"
  FG_RF_PRIMARY_WINDOW_COUNT="$(jq -r '.primary_window_count' "$f")"

  [ "$FG_RF_SESSION_SET" = "yes" ] || FG_RF_SESSION="$(jq -r '.tmux_session' "$f")"
  [ "$FG_RF_RUN_ROOT_SET" = "yes" ] || FG_RF_RUN_ROOT="${HOME}/FounderGateRuns/role-floor/${host}"

  # Only the host name is exported. Exporting the derived session or run root
  # would make them look like operator pins in a child process, and the child's
  # own profile load could then no longer correct them.
  export FG_RF_HOST
  echo "HOST_PROFILE_LOADED:${host}"
  return 0
}

fg_host_loaded() { [ -n "${FG_RF_PROFILE_FILE:-}" ]; }

fg_host_require() {
  fg_host_loaded || fg_host_load "${FG_RF_HOST:-m1}" >/dev/null || return 1
  return 0
}

# ---------------------------------------------------------------------------
# Profile queries
# ---------------------------------------------------------------------------

fg_host_has_role() {
  fg_host_require || return 1
  jq -e --arg r "$1" '.roles | has($r)' "$FG_RF_PROFILE_FILE" >/dev/null 2>&1
}

fg_host_role_writes() {
  fg_host_require || return 1
  jq -r --arg r "$1" '.roles[$r].writes // [] | join(" ")' "$FG_RF_PROFILE_FILE" 2>/dev/null
}

fg_host_class_sealed() { fg_host_require || return 1; fg_in_list "$1" "$FG_RF_SEALED_CLASSES"; }

# fg_host_authority <name> - true when this host holds the authority.
fg_host_authority() {
  fg_host_require || return 1
  # Founder authorities are never granted by a host profile, whatever it says.
  fg_is_universally_sealed_authority "$1" && return 1
  [ "$(jq -r --arg a "$1" '.authorities[$a] // false' "$FG_RF_PROFILE_FILE" 2>/dev/null)" = "true" ]
}

fg_host_requires_founder_receipt_for_merge() {
  fg_host_require || return 1
  [ "$(jq -r '.requires_founder_receipt_for_merge // true' "$FG_RF_PROFILE_FILE" 2>/dev/null)" = "true" ]
}

fg_host_expected_repo_default() {
  fg_host_require || return 1
  jq -r '.expected_repository_identity.default_path // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null
}

fg_host_expected_origin_basename() {
  fg_host_require || return 1
  jq -r '.expected_repository_identity.expected_origin_basename // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null
}

# fg_host_window_index <window> - 0-based position, or empty when absent.
fg_host_window_index() {
  local w i=0 target="$1"
  for w in $FG_RF_WINDOWS; do
    [ "$w" = "$target" ] && { printf '%d\n' "$i"; return 0; }
    i=$(( i + 1 ))
  done
  return 1
}

# fg_host_action_needs_handoff <action> - true when this host must hand the
# action to M4 instead of performing it.
fg_host_action_needs_handoff() {
  fg_host_require || return 1
  jq -e --arg a "$1" '.m4_handoff_required_for | index($a) != null' "$FG_RF_PROFILE_FILE" >/dev/null 2>&1
}
