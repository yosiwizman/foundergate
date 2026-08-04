// FounderGate — Repo Gate Classifier (LOCAL / SYNTHETIC ONLY).
// Keeps the FIVE repo classes strictly separate so a label can never silently upgrade
// (e.g. a synthetic fixture must never be treated as a customer production repo, and a
// founder-owned sandbox proof must never be treated as an existing valuable / customer repo).

export const REPO_CLASS = {
  SYNTHETIC_FIXTURE: 'SYNTHETIC_FIXTURE',
  FOUNDER_SANDBOX: 'FOUNDER_SANDBOX',                 // the founder-owned throwaway sandbox (deploy-key proof)
  EXISTING_FOUNDER_PRIVATE: 'EXISTING_FOUNDER_PRIVATE', // a real, valuable founder repo — TRUE FOUNDER GATE
  CUSTOMER_LIKE_PRIVATE: 'CUSTOMER_LIKE_PRIVATE',     // synthetic stand-in shaped like a customer repo
  CUSTOMER_PRODUCTION: 'CUSTOMER_PRODUCTION',         // real customer/production repo — TRUE FOUNDER GATE
};

// Ordered from least to most privileged. A classification may never move UP a level without an
// explicit founder gate token for that exact target level.
const ORDER = [
  REPO_CLASS.SYNTHETIC_FIXTURE,
  REPO_CLASS.FOUNDER_SANDBOX,
  REPO_CLASS.CUSTOMER_LIKE_PRIVATE, // synthetic stand-in — still not a real customer repo
  REPO_CLASS.EXISTING_FOUNDER_PRIVATE,
  REPO_CLASS.CUSTOMER_PRODUCTION,
];

const GATE_STATUS = {
  [REPO_CLASS.SYNTHETIC_FIXTURE]: 'LOCAL_OK_WITH_LIMITS',
  [REPO_CLASS.FOUNDER_SANDBOX]: 'PROVEN_WITH_LIMITS',
  [REPO_CLASS.CUSTOMER_LIKE_PRIVATE]: 'LOCAL_SYNTHETIC_ONLY',
  [REPO_CLASS.EXISTING_FOUNDER_PRIVATE]: 'TRUE_FOUNDER_GATE_BLOCKED',
  [REPO_CLASS.CUSTOMER_PRODUCTION]: 'TRUE_FOUNDER_GATE_BLOCKED',
};

export function classify(descriptor = {}) {
  const cls = descriptor.repo_class;
  if (!ORDER.includes(cls)) return { status: 'HELD_UNKNOWN_CLASS', repo_class: cls || null };
  return { status: 'CLASSIFIED', repo_class: cls, gate_status: GATE_STATUS[cls], level: ORDER.indexOf(cls) };
}

// Attempt to treat `from` as `to`. Only allowed if a matching founder gate token authorizes the exact target
// AND the target is not a TRUE_FOUNDER_GATE class being crossed without that class's own token.
export function attemptUpgrade(from, to, founderGateTokenForTarget = null) {
  if (!ORDER.includes(from) || !ORDER.includes(to)) return { allowed: false, reason: 'UNKNOWN_CLASS' };
  if (ORDER.indexOf(to) <= ORDER.indexOf(from)) return { allowed: true, reason: 'NO_UPGRADE_OR_DOWNGRADE' };
  // Moving up requires the founder gate token that names exactly this target class.
  const needsGate = `FOUNDER_GATE:${to}`;
  if (founderGateTokenForTarget !== needsGate) {
    return { allowed: false, reason: 'REFUSED_SILENT_UPGRADE', required_gate: needsGate };
  }
  return { allowed: true, reason: 'FOUNDER_GATE_PRESENT', target: to };
}

export function invariants() {
  const trueGates = [REPO_CLASS.EXISTING_FOUNDER_PRIVATE, REPO_CLASS.CUSTOMER_PRODUCTION]
    .every(c => GATE_STATUS[c] === 'TRUE_FOUNDER_GATE_BLOCKED');
  const sandboxNotCustomer = classify({ repo_class: REPO_CLASS.FOUNDER_SANDBOX }).gate_status !== GATE_STATUS[REPO_CLASS.CUSTOMER_PRODUCTION];
  return { trueGates, sandboxNotCustomer, ok: trueGates && sandboxNotCustomer };
}
