#!/usr/bin/env bash
# FounderGate role floor - host profiles.
#
# One implementation serves both hosts. A host profile is configuration:
# config/hosts/m1.json and config/hosts/m4.json declare the window set, the
# role/artifact authority table, the writable-lease roles, the sealed artifact
# classes and the hard-stop actions. Nothing in bin/ or lib/ branches on the
# host name to choose behaviour; it reads the loaded profile.
#
# A PROFILE IS NOT A MACHINE. `--host m4` selects a configuration; on its own
# it proves nothing about which physical computer is running. Any profile that
# carries integration authority must additionally pass fg_host_identity_verify,
# which requires an external, signed, hardware-bound enrollment record this
# package can only verify and never create.
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

# ---------------------------------------------------------------------------
# Founder trust root (VERIFY only)
# ---------------------------------------------------------------------------

# The pinned SHA256 fingerprint of the founder's PUBLIC verification key, or
# empty when this host has not been given one. Empty is a closed refusal, not
# a permissive default.
fg_host_founder_pin() {
  fg_host_require || return 1
  jq -r '.founder_trust_root.public_key_fingerprint // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null
}

fg_host_founder_namespace() {
  fg_host_require || return 1
  local ns
  ns="$(jq -r '.founder_trust_root.signature_namespace // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null)"
  printf '%s\n' "${ns:-$FG_RF_FOUNDER_SIG_NAMESPACE}"
}

fg_host_founder_principal() {
  fg_host_require || return 1
  local p
  p="$(jq -r '.founder_trust_root.signature_principal // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null)"
  printf '%s\n' "${p:-$FG_RF_FOUNDER_SIG_PRINCIPAL}"
}

fg_host_receipt_max_age_seconds() {
  fg_host_require || return 1
  local n
  n="$(jq -r '.founder_trust_root.max_receipt_age_seconds // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null)"
  printf '%s\n' "${n:-86400}"
}

# fg_founder_pubkey_resolve - locate the pinned public key and PROVE it is the
# pinned one. FG_RF_FOUNDER_PUBKEY_FILE may only LOCATE a candidate; it cannot
# redirect the trust root, because the located key's fingerprint must equal the
# profile pin (F-D02).
#
# Emits the key path on success. Refusals:
#   FOUNDER_TRUST_ROOT_NOT_ENROLLED  - no fingerprint pinned in the profile
#   FOUNDER_PUBKEY_MISSING           - nothing at the configured location
#   FOUNDER_PUBKEY_UNREADABLE        - present but not a parseable public key
#   FOUNDER_PUBKEY_FINGERPRINT_MISMATCH - an attacker-supplied key
fg_founder_pubkey_resolve() {
  local pin fpr f
  pin="$(fg_host_founder_pin)"
  [ -n "$pin" ] || { echo "FOUNDER_TRUST_ROOT_NOT_ENROLLED"; return 1; }
  f="$FG_RF_FOUNDER_PUBKEY_FILE"
  [ -f "$f" ] || { echo "FOUNDER_PUBKEY_MISSING"; return 1; }
  fpr="$(fg_pubkey_fingerprint "$f")" || { echo "FOUNDER_PUBKEY_UNREADABLE"; return 1; }
  [ -n "$fpr" ] || { echo "FOUNDER_PUBKEY_UNREADABLE"; return 1; }
  [ "$fpr" = "$pin" ] || { echo "FOUNDER_PUBKEY_FINGERPRINT_MISMATCH"; return 1; }
  printf '%s\n' "$f"
  return 0
}

# ---------------------------------------------------------------------------
# Physical host enrollment
# ---------------------------------------------------------------------------
#
# A --host argument selects a CONFIGURATION. It proves nothing about the
# machine. Any profile that carries integration authority additionally requires
# an EXTERNAL, SIGNED, HARDWARE-BOUND enrollment record that this package can
# only verify. The package never writes, mints or self-approves one, and the
# requirement is derived from the authority set rather than from a profile
# boolean, so deleting a "requires_enrollment": true line does not remove it.

fg_host_requires_enrollment() {
  fg_host_require || return 1
  local a
  for a in serial_integration_writer protected_main_writer final_integration_verifier merge_sheriff; do
    if [ "$(jq -r --arg a "$a" '.authorities[$a] // false' "$FG_RF_PROFILE_FILE" 2>/dev/null)" = "true" ]; then
      return 0
    fi
  done
  return 1
}

fg_host_enrollment_authority_pin() {
  fg_host_require || return 1
  jq -r '.host_enrollment.enrollment_authority_fingerprint // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null
}

fg_host_enrollment_namespace() {
  fg_host_require || return 1
  local ns
  ns="$(jq -r '.host_enrollment.signature_namespace // empty' "$FG_RF_PROFILE_FILE" 2>/dev/null)"
  printf '%s\n' "${ns:-foundergate.host-enrollment.v1}"
}

fg_host_enrollment_file()     { printf '%s/%s.enrollment.json\n' "$FG_RF_HOST_ENROLLMENT_DIR" "${1:-$FG_RF_HOST}"; }
fg_host_enrollment_sig_file() { printf '%s/%s.enrollment.json.sig\n' "$FG_RF_HOST_ENROLLMENT_DIR" "${1:-$FG_RF_HOST}"; }
fg_host_enrollment_key_file() { printf '%s/%s.enrollment-authority.pub\n' "$FG_RF_HOST_ENROLLMENT_DIR" "${1:-$FG_RF_HOST}"; }

# fg_host_identity_verify [host]
#
# HOST_IDENTITY_OK
# HOST_IDENTITY_NOT_REQUIRED            - profile carries no integration authority
# HOST_ENROLLMENT_NOT_CONFIGURED        - no enrollment authority pinned
# HOST_ENROLLMENT_MISSING               - no external record on this machine
# HOST_ENROLLMENT_KEY_MISSING           - no enrollment authority public key
# HOST_ENROLLMENT_KEY_FINGERPRINT_MISMATCH
# HOST_ENROLLMENT_UNSIGNED              - signature does not verify
# HOST_ENROLLMENT_WRONG_PROFILE
# HOST_ENROLLMENT_EXPIRED
# HOST_HARDWARE_UNAVAILABLE             - platform identity unreadable
# HOST_HARDWARE_MISMATCH                - this is not the enrolled machine
# HOST_KEY_FINGERPRINT_MISMATCH         - host key is not the enrolled key
fg_host_identity_verify() {
  local host="${1:-$FG_RF_HOST}" rec sig keyf pin fpr body tmp ns
  local want_uuid want_serial live_uuid live_serial want_hostkey hostkey_f not_after now
  fg_host_require || { echo "HOST_PROFILE_NOT_LOADED"; return 1; }
  fg_host_requires_enrollment || { echo "HOST_IDENTITY_NOT_REQUIRED"; return 0; }

  pin="$(fg_host_enrollment_authority_pin)"
  [ -n "$pin" ] || { echo "HOST_ENROLLMENT_NOT_CONFIGURED"; return 1; }

  rec="$(fg_host_enrollment_file "$host")"
  sig="$(fg_host_enrollment_sig_file "$host")"
  keyf="$(fg_host_enrollment_key_file "$host")"
  [ -f "$rec" ] || { echo "HOST_ENROLLMENT_MISSING"; return 1; }
  [ -f "$sig" ] || { echo "HOST_ENROLLMENT_MISSING"; return 1; }
  [ -f "$keyf" ] || { echo "HOST_ENROLLMENT_KEY_MISSING"; return 1; }
  jq -e . "$rec" >/dev/null 2>&1 || { echo "HOST_ENROLLMENT_MISSING"; return 1; }

  fpr="$(fg_pubkey_fingerprint "$keyf")" || { echo "HOST_ENROLLMENT_KEY_MISSING"; return 1; }
  [ "$fpr" = "$pin" ] || { echo "HOST_ENROLLMENT_KEY_FINGERPRINT_MISMATCH"; return 1; }

  ns="$(fg_host_enrollment_namespace)"
  tmp="$(mktemp "${TMPDIR:-/tmp}/.fgenroll.XXXXXX")" || return 1
  jq -S -c . "$rec" > "$tmp" 2>/dev/null || { rm -f "$tmp"; echo "HOST_ENROLLMENT_MISSING"; return 1; }
  if [ "$(fg_sshsig_verify "$keyf" "$ns" "host-enrollment-authority" "$sig" "$tmp")" != "SIGNATURE_OK" ]; then
    rm -f "$tmp"; echo "HOST_ENROLLMENT_UNSIGNED"; return 1
  fi
  rm -f "$tmp"

  [ "$(fg_json_get "$rec" '.host_profile')" = "$host" ] || { echo "HOST_ENROLLMENT_WRONG_PROFILE"; return 1; }

  not_after="$(fg_json_get "$rec" '.not_after_epoch')"
  now="$(fg_epoch)"
  if [ -n "$not_after" ] && [ "$now" -gt "$not_after" ]; then
    echo "HOST_ENROLLMENT_EXPIRED"; return 1
  fi

  want_uuid="$(fg_json_get "$rec" '.hardware.platform_uuid')"
  want_serial="$(fg_json_get "$rec" '.hardware.serial_number')"
  live_uuid="$(fg_machine_uuid)"
  live_serial="$(fg_machine_serial)"
  [ -n "$live_uuid" ] && [ -n "$live_serial" ] || { echo "HOST_HARDWARE_UNAVAILABLE"; return 1; }
  [ -n "$want_uuid" ] && [ -n "$want_serial" ] || { echo "HOST_ENROLLMENT_MISSING"; return 1; }
  [ "$want_uuid" = "$live_uuid" ] || { echo "HOST_HARDWARE_MISMATCH"; return 1; }
  [ "$want_serial" = "$live_serial" ] || { echo "HOST_HARDWARE_MISMATCH"; return 1; }

  # The enrolled record names the host's own public key by fingerprint; the key
  # must be present on this machine and must match.
  want_hostkey="$(fg_json_get "$rec" '.host_public_key_fingerprint')"
  if [ -n "$want_hostkey" ]; then
    hostkey_f="$(fg_json_get "$rec" '.host_public_key_path')"
    [ -n "$hostkey_f" ] || hostkey_f="${FG_RF_HOST_ENROLLMENT_DIR}/${host}.host.pub"
    [ -f "$hostkey_f" ] || { echo "HOST_KEY_FINGERPRINT_MISMATCH"; return 1; }
    [ "$(fg_pubkey_fingerprint "$hostkey_f")" = "$want_hostkey" ] || {
      echo "HOST_KEY_FINGERPRINT_MISMATCH"; return 1; }
  fi

  echo "HOST_IDENTITY_OK"
  return 0
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
