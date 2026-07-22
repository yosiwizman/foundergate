// FounderGate LRCQ — Model/provider change gate (B20).
// Captures the exact provider/model fingerprint and FAILS CLOSED (HELD) on any drift from the
// founder-approved fingerprint, requiring fresh approval + a regression-probe run + a canary plan
// before a changed provider/model may be used. NO real provider/model canary is run here.
export const PROVIDER_FINGERPRINT_DIMS = [
  "provider_executable_path", "resolved_provider_target", "provider_executable_identity",
  "provider_version", "model_identifier", "cli_settings_digest", "system_prompt_digest",
  "policy_digest", "tool_setting_digest",
];

export function captureFingerprint(src) {
  const fp = {};
  for (const d of PROVIDER_FINGERPRINT_DIMS) fp[d] = src[d] ?? null;
  return fp;
}

// Detect drift between an approved fingerprint and the current one.
export function detectChange(approved, current) {
  const changed = [];
  for (const d of PROVIDER_FINGERPRINT_DIMS) if ((approved[d] ?? null) !== (current[d] ?? null)) changed.push(d);
  return changed;
}

// Gate decision. Any drift -> HELD (fail-closed). A stale approval (nonce/epoch) -> HELD.
// opts: { approval_nonce, consumed_nonces:Set, now_epoch, approval_expiry_epoch }
export function gateDecision(approved, current, opts = {}) {
  const changed = detectChange(approved, current);
  const refusals = [];
  if (changed.length) refusals.push("provider/model drift: " + changed.join(","));
  if (opts.approval_nonce && opts.consumed_nonces && opts.consumed_nonces.has(opts.approval_nonce)) refusals.push("approval nonce already consumed (stale)");
  if (typeof opts.now_epoch === "number" && typeof opts.approval_expiry_epoch === "number" && opts.now_epoch >= opts.approval_expiry_epoch) refusals.push("provider approval expired");
  if (refusals.length) {
    return {
      state: "HELD", allowed: false, refusals,
      required_before_use: ["fresh founder approval of the new fingerprint", "regression-probe suite must pass on the new provider/model", "canary plan recorded"],
      regression_probe_required: true,
      canary_plan: { required: true, executed_in_preparation: false, note: "no real provider/model canary is run during preparation" },
    };
  }
  return { state: "APPROVED_UNCHANGED", allowed: true, refusals: [], regression_probe_required: false, canary_plan: { required: false, executed_in_preparation: false } };
}
