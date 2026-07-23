#!/usr/bin/env bash
# FounderGate role floor - Claude CLI launch adapter.
#
# Capabilities are detected from the installed CLI at runtime. The package
# never assumes an unsupported command-line option, never fuses two roles into
# one transcript, and never disables the permission surface.
#
# Selected launch method: deterministic stdin from a protected prompt file.
# The rendered prompt is written to the run root, digested, and fed to a fresh
# Claude process on stdin. No clipboard relaying and no character-by-character
# tmux send-keys of prompt text.
set -u

# shellcheck source=./roles.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/roles.sh"

FG_RF_LAUNCH_METHOD_PREFERRED="stdin_prompt_file"
FG_RF_LAUNCH_METHOD_FALLBACK="tmux_buffer_paste"

# ---------------------------------------------------------------------------
# Forbidden flag guard
# ---------------------------------------------------------------------------

# Every constructed launch command passes through this guard. A forbidden flag
# is a build defect, not a warning.
fg_claude_assert_no_forbidden_flags() {
  local cmd="$1" flag
  for flag in $FG_RF_FORBIDDEN_CLAUDE_FLAGS; do
    case " $cmd " in
      *" $flag "*|*" $flag="*) echo "FORBIDDEN_CLAUDE_FLAG:${flag}"; return 1 ;;
    esac
  done
  echo "LAUNCH_COMMAND_OK"
  return 0
}

# ---------------------------------------------------------------------------
# Capability detection
# ---------------------------------------------------------------------------

# fg_claude_detect <run_id> - probes the installed CLI and records the result.
fg_claude_detect() {
  local run="$1" bin ver help supports_print supports_positional dest method
  bin="$FG_RF_CLAUDE_BIN"

  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "CLAUDE_MISSING"; return 1
  fi
  ver="$("$bin" --version 2>/dev/null | head -1 | tr -d '\r')"
  help="$("$bin" --help 2>&1 || true)"

  supports_print=false
  supports_positional=false
  printf '%s' "$help" | grep -q -- '--print' && supports_print=true
  printf '%s' "$help" | grep -Eq '\[prompt\]|<prompt>|\[--\] \[prompt\]' && supports_positional=true

  # stdin is always available and is the only method that needs no unstable
  # flag surface, so it stays preferred regardless of detected extras.
  method="$FG_RF_LAUNCH_METHOD_PREFERRED"

  if [ -n "$run" ] && fg_run_exists "$run"; then
    dest="$(fg_control_dir "$run")/CLAUDE_ADAPTER.json"
    jq -n --arg bin "$bin" --arg ver "$ver" --arg m "$method" \
          --argjson sp "$supports_print" --argjson spos "$supports_positional" \
          --arg fb "$FG_RF_LAUNCH_METHOD_FALLBACK" --arg ts "$(fg_now)" \
          --arg forbidden "$FG_RF_FORBIDDEN_CLAUDE_FLAGS" \
      '{binary:$bin, version:$ver, supports_print_flag:$sp,
        supports_positional_prompt:$spos, launch_method:$m, fallback_method:$fb,
        forbidden_flags:($forbidden|split(" ")), fresh_context_per_role:true,
        detected_at:$ts}' \
      | fg_atomic_write_json "$dest" || return 1
  fi
  echo "CLAUDE_OK:${ver}"
  return 0
}

# ---------------------------------------------------------------------------
# Prompt rendering
# ---------------------------------------------------------------------------

FG_RF_PROMPT_DIGEST_MARKER='fg-prompt-digest'

fg_prompt_template() { printf '%s/prompts/%s.md\n' "$FG_RF_HOME" "$1"; }

# fg_prompt_templates_verify - recomputes every protected template digest from
# the package digest manifest (the prompts/ subset of PACKAGE_DIGESTS.txt).
#
# INTEGRITY ONLY. PACKAGE_DIGESTS.txt ships inside the tree it describes, so it
# proves that no template changed by accident. It cannot prove the package is
# the audited package: regenerating the manifest is two lines of shell.
# Authenticity comes from the external --expect-sha/--expect-tree anchor in
# fg-m4-bootstrap.sh, never from here.
#
# PROMPT_DIGESTS_OK | PROMPT_DIGEST_MISMATCH:<file> | PROMPT_DIGESTS_MISSING
fg_prompt_templates_verify() {
  local manifest="${FG_RF_HOME}/PACKAGE_DIGESTS.txt" line want rel got seen=0
  [ -f "$manifest" ] || { echo "PROMPT_DIGESTS_MISSING"; return 1; }
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue ;; esac
    rel="$(printf '%s' "$line" | sed 's/^[0-9a-f]*  *//')"
    case "$rel" in prompts/*) : ;; *) continue ;; esac
    want="$(printf '%s' "$line" | awk '{print $1}')"
    [ -f "${FG_RF_HOME}/${rel}" ] || { echo "PROMPT_DIGEST_MISMATCH:${rel}:missing"; return 1; }
    got="$(fg_sha256_file "${FG_RF_HOME}/${rel}")"
    [ "$want" = "$got" ] || { echo "PROMPT_DIGEST_MISMATCH:${rel}"; return 1; }
    seen=$(( seen + 1 ))
  done < "$manifest"
  [ "$seen" -gt 0 ] || { echo "PROMPT_DIGESTS_MISSING"; return 1; }
  echo "PROMPT_DIGESTS_OK"
  return 0
}

# Digest of a rendered prompt, excluding its own digest footer.
fg_prompt_rendered_digest() {
  grep -v "$FG_RF_PROMPT_DIGEST_MARKER" "$1" | fg_sha256_stdin
}

# fg_prompt_render <template_name> <dest> <bindings_json>
# Emits the prompt digest. Every {{KEY}} placeholder must be bound; an unbound
# placeholder is a refusal, never a silently empty binding.
fg_prompt_render() {
  local tpl="$1" dest="$2" bindings="$3" src sedfile digest leftover
  src="$(fg_prompt_template "$tpl")"
  [ -f "$src" ] || { echo "PROMPT_TEMPLATE_MISSING:${tpl}"; return 1; }
  printf '%s' "$bindings" | jq -e . >/dev/null 2>&1 || { echo "PROMPT_BINDINGS_INVALID"; return 1; }

  mkdir -p "$(dirname "$dest")"
  sedfile="$(mktemp)" || return 1
  printf '%s' "$bindings" \
    | jq -r 'to_entries[] | "s|{{" + .key + "}}|" +
             ((.value|tostring)|gsub("\\\\";"\\\\\\\\")|gsub("\\|";"\\\\|")|gsub("&";"\\\\&")) + "|g"' \
    > "$sedfile" || { rm -f "$sedfile"; echo "PROMPT_BINDINGS_INVALID"; return 1; }

  sed -f "$sedfile" "$src" > "${dest}.part" || { rm -f "$sedfile"; echo "PROMPT_RENDER_FAILED"; return 1; }
  rm -f "$sedfile"

  leftover="$(grep -o '{{[A-Z0-9_]*}}' "${dest}.part" | head -1 || true)"
  if [ -n "$leftover" ]; then
    rm -f "${dest}.part"
    echo "PROMPT_BINDING_MISSING:${leftover}"
    return 1
  fi

  digest="$(fg_sha256_file "${dest}.part")"
  # The footer is a whole line and nothing else, so stripping it reproduces the
  # digested bytes exactly.
  {
    cat "${dest}.part"
    printf '<!-- %s: %s -->\n' "$FG_RF_PROMPT_DIGEST_MARKER" "$digest"
  } | fg_atomic_write "$dest"
  rm -f "${dest}.part"
  chmod 0444 "$dest" 2>/dev/null || true
  printf '%s\n' "$digest"
  return 0
}

# ---------------------------------------------------------------------------
# Launch command construction
# ---------------------------------------------------------------------------

# fg_claude_launch_command <prompt_file> <log_file> <exit_file> [cap_fifo]
#
# Emits a shell command string for one FRESH role context. It is executed
# inside a tmux window by the dispatcher; this function never executes it.
# Note the absence of --continue / --resume: each role gets its own transcript.
#
# EVERY interpolated value is shell-quoted (F-J01). The previous version used
# a bare printf '%s < %s ...' with three unquoted paths, and the prompt path
# embeds the task id, so a task id of 't;touch /tmp/PWNED;x' became arbitrary
# command execution when tmux ran the string through sh -c. Quoting is the
# second line of defence; the first is that fg_task_create refuses such a task
# id outright.
#
# The one-shot capability FIFO, when supplied, is consumed by the launched
# process into its own environment and then unlinked. The capability is never
# written to a reusable file.
fg_claude_launch_command() {
  local prompt="$1" log="$2" exitf="$3" fifo="${4:-}" cmd capprefix=""
  # A path containing a newline or carriage return can never be represented
  # safely in a single-line shell command; refuse rather than emit something
  # ambiguous. (Note: $(printf '\n') would be the EMPTY string here, because
  # command substitution strips trailing newlines, and an empty pattern would
  # match everything. The literal newline below is deliberate.)
  case "${prompt}${log}${exitf}${fifo}" in
    *'
'*) echo "LAUNCH_PATH_CONTROL_CHARACTER"; return 1 ;;
  esac
  case "${prompt}${log}${exitf}${fifo}" in
    *$'\r'*) echo "LAUNCH_PATH_CONTROL_CHARACTER"; return 1 ;;
  esac
  if [ -n "$fifo" ]; then
    capprefix="$(printf 'FG_RF_ROLE_CAP="$(cat %s 2>/dev/null)"; export FG_RF_ROLE_CAP; rm -f %s; ' \
                 "$(fg_shquote "$fifo")" "$(fg_shquote "$fifo")")"
  fi
  cmd="${capprefix}$(printf '%s < %s 2>&1 | tee -a %s; printf %%s "${PIPESTATUS[0]}" > %s' \
        "$(fg_shquote "$FG_RF_CLAUDE_BIN")" "$(fg_shquote "$prompt")" \
        "$(fg_shquote "$log")" "$(fg_shquote "$exitf")")"
  if [ "$(fg_claude_assert_no_forbidden_flags "$cmd")" != "LAUNCH_COMMAND_OK" ]; then
    echo "FORBIDDEN_CLAUDE_FLAG"
    return 1
  fi
  printf '%s\n' "$cmd"
  return 0
}

# fg_prompt_reverify <prompt_file> <expected_digest>
# PROMPT_DIGEST_OK | PROMPT_DIGEST_DRIFT:<observed> | PROMPT_MISSING
#
# Called immediately before the respawn-window call (F-J02). fg_prompt_render
# chmods the rendered prompt 0444, but the owning user can chmod it back and
# rewrite it, so the digest recorded at mint time describes what was rendered,
# not necessarily what the role process is about to read. This closes that
# window to the interval between this check and exec.
fg_prompt_reverify() {
  local f="$1" expect="$2" got
  [ -f "$f" ] || { echo "PROMPT_MISSING"; return 1; }
  got="$(fg_prompt_rendered_digest "$f")"
  [ "$got" = "$expect" ] || { echo "PROMPT_DIGEST_DRIFT:${got}"; return 1; }
  echo "PROMPT_DIGEST_OK"
  return 0
}
