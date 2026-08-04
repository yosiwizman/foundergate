// FounderGate — Fine-grained PAT Revocation / Expiry / Disable Model (LOCAL).
// A fine-grained PAT (unlike a deploy key) cannot be deleted through a repo-scoped API call; it is revoked in
// account settings or by expiry. This model records the honest revocation posture and NEVER claims a mechanical
// revocation that did not happen. It refuses to "revoke" an ambiguous or unlabeled token.

export const REVOCATION_LABEL = {
  REVOKED_AND_DENIED: 'PAT_REVOKED_AND_POST_REVOCATION_DENIED',
  EXPIRY_RECORDED: 'PAT_EXPIRY_RECORDED_REVOCATION_NOT_PROVEN',
  FOUNDER_MANUAL: 'PAT_REVOCATION_REQUIRES_FOUNDER_MANUAL_ACTION',
  GATE_REQUIRED: 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED',
};

// Decide the revocation label from the token state. Conservative by construction:
// - absent token → gate required;
// - present but not clearly this-proof's disposable sandbox PAT → founder manual (never auto-revoke ambiguous);
// - present, clearly labeled disposable, and a safe revocation was mechanically confirmed → revoked+denied;
// - present with a recorded expiry but no mechanical revocation → expiry recorded.
export function revocationLabel({ present, clearly_disposable_sandbox_pat, mechanical_revocation_confirmed, expiry_recorded }) {
  if (!present) return REVOCATION_LABEL.GATE_REQUIRED;
  if (!clearly_disposable_sandbox_pat) return REVOCATION_LABEL.FOUNDER_MANUAL; // do NOT revoke ambiguous
  if (mechanical_revocation_confirmed) return REVOCATION_LABEL.REVOKED_AND_DENIED;
  if (expiry_recorded) return REVOCATION_LABEL.EXPIRY_RECORDED;
  return REVOCATION_LABEL.FOUNDER_MANUAL;
}

// Guard: never auto-revoke unless clearly disposable AND safe (no value exposure, no permission broadening).
export function mayAutoRevoke({ clearly_disposable_sandbox_pat, would_expose_value, would_broaden_permission }) {
  return !!clearly_disposable_sandbox_pat && !would_expose_value && !would_broaden_permission;
}
