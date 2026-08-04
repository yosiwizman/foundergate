// FounderGate — Private Repo Credential Route Policy Model (LOCAL / SYNTHETIC ONLY).
// No real credential is created or used here. This is a static, deterministic policy model that
// separates the ONE proven route (read-only deploy key, with limits) from the PLANNED / BLOCKED
// routes, so a future route can never silently inherit "proven" status from the deploy-key proof.

// Proof status vocabulary — deliberately small and honest.
export const PROOF_STATUS = {
  PROVEN_WITH_LIMITS: 'PROVEN_WITH_LIMITS', // demonstrated locally against a founder-owned sandbox, with explicit limits
  PLANNED_BLOCKED: 'PLANNED_BLOCKED',       // contract defined; needs a separate founder gate + real proof
  FUTURE_BLOCKED: 'FUTURE_BLOCKED',         // further out; depends on other parties
  TRUE_FOUNDER_GATE: 'TRUE_FOUNDER_GATE',   // categorical escalation; only the founder can open
};

export const RISK = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CATEGORICAL: 'CATEGORICAL' };

// The seven routes. Order is not a sequencing commitment.
export const ROUTES = [
  {
    id: 'deploy_key',
    title: 'Repo-scoped read-only deploy key',
    credential_scope: 'single repo, read-only (read_only=true)',
    revocation_model: 'delete the deploy key via GitHub API; post-revocation access mechanically fails',
    auditability: 'high — one key id, one repo, create+delete recorded; fingerprint bound',
    setup_burden: 'low (FounderGate creates/deletes the key; founder does nothing)',
    risk_class: RISK.LOW,
    proof_status: PROOF_STATUS.PROVEN_WITH_LIMITS,
    next_required_gate: null, // already proven with limits
    forbidden_claims: ['private-repo-support-complete', 'customer-repo', 'production-ready'],
  },
  {
    id: 'fine_grained_pat',
    title: 'Fine-grained Personal Access Token (read-only contents)',
    credential_scope: 'selected repos, Contents:read only; no write, no workflow, no org-wide',
    revocation_model: 'revoke/delete the token in GitHub settings; expiry enforced',
    auditability: 'medium — token is account-level; scope must be verified, value never printed',
    setup_burden: 'medium (founder mints + pastes a token out-of-band; never into chat)',
    risk_class: RISK.MEDIUM,
    proof_status: PROOF_STATUS.PLANNED_BLOCKED,
    next_required_gate: 'FOUNDER: authorize a fine-grained PAT proof on the sandbox (separate gate)',
    forbidden_claims: ['fine-grained-PAT-proven', 'private-repo-support-complete'],
  },
  {
    id: 'github_app',
    title: 'GitHub App installation (read-only contents)',
    credential_scope: 'one installation, Contents:read; short-lived installation tokens',
    revocation_model: 'uninstall the app / revoke installation; installation tokens expire (~1h)',
    auditability: 'high — installation id + permission set + audit log',
    setup_burden: 'medium-high (create + install an app; per-repo permission grant)',
    risk_class: RISK.MEDIUM,
    proof_status: PROOF_STATUS.PLANNED_BLOCKED,
    next_required_gate: 'FOUNDER: authorize a GitHub App read-only proof on the sandbox (separate gate)',
    forbidden_claims: ['github-app-proven', 'private-repo-support-complete'],
  },
  {
    id: 'uploaded_archive',
    title: 'Founder-uploaded archive (no live credential)',
    credential_scope: 'none — founder hands over a snapshot archive out-of-band',
    revocation_model: 'n/a (no standing credential); archive is deleted after intake',
    auditability: 'high — exact archive digest bound; no network access',
    setup_burden: 'low-medium (founder exports + provides an archive)',
    risk_class: RISK.LOW,
    proof_status: PROOF_STATUS.PLANNED_BLOCKED,
    next_required_gate: 'FOUNDER: authorize an uploaded-archive intake proof (separate gate)',
    forbidden_claims: ['private-repo-support-complete', 'customer-repo'],
  },
  {
    id: 'customer_relay',
    title: 'Customer-controlled relay (customer runs the read on their side)',
    credential_scope: 'none held by FounderGate — the customer controls their own credential',
    revocation_model: 'customer-side; FounderGate never holds the credential',
    auditability: 'depends on the customer relay contract (future)',
    setup_burden: 'high (requires a customer-side integration)',
    risk_class: RISK.HIGH,
    proof_status: PROOF_STATUS.FUTURE_BLOCKED,
    next_required_gate: 'FOUNDER + CUSTOMER: define the relay contract (separate future gate)',
    forbidden_claims: ['customer-repo', 'production-ready', 'private-repo-support-complete'],
  },
  {
    id: 'existing_founder_private_repo',
    title: 'Existing valuable founder private repo (read-only)',
    credential_scope: 'a real, valuable founder repo — NOT a synthetic sandbox',
    revocation_model: 'per chosen route (deploy key / PAT / App), but higher blast radius',
    auditability: 'per chosen route',
    setup_burden: 'founder authorization required',
    risk_class: RISK.HIGH,
    proof_status: PROOF_STATUS.TRUE_FOUNDER_GATE,
    next_required_gate: 'TRUE FOUNDER GATE: explicitly authorize one real founder repo (read-only)',
    forbidden_claims: ['existing-founder-repo-proven', 'private-repo-support-complete'],
  },
  {
    id: 'customer_private_production_repo',
    title: 'Customer private / production repo (read-only)',
    credential_scope: 'third-party data; consent + legal obligations',
    revocation_model: 'per chosen route + customer contract',
    auditability: 'per chosen route + customer contract',
    setup_burden: 'founder + customer authorization required',
    risk_class: RISK.CATEGORICAL,
    proof_status: PROOF_STATUS.TRUE_FOUNDER_GATE,
    next_required_gate: 'TRUE FOUNDER GATE: explicit founder + customer authorization',
    forbidden_claims: ['customer-repo', 'production-ready', 'private-repo-support-complete'],
  },
];

// Deterministic accessors.
export function getRoute(id) { return ROUTES.find(r => r.id === id) || null; }

export function provenRoutes() { return ROUTES.filter(r => r.proof_status === PROOF_STATUS.PROVEN_WITH_LIMITS); }

// The single most-conservative recommended next gate (never auto-advances past a TRUE_FOUNDER_GATE).
export function recommendedNextGate() {
  const planned = ROUTES.find(r => r.proof_status === PROOF_STATUS.PLANNED_BLOCKED);
  return planned ? { id: planned.id, gate: planned.next_required_gate } : null;
}

// Guard: exactly one route may be PROVEN_WITH_LIMITS today (the deploy key); everything else is blocked/future/gate.
export function invariantsHold() {
  const proven = provenRoutes();
  const onlyDeployKeyProven = proven.length === 1 && proven[0].id === 'deploy_key';
  const noProductionClaim = ROUTES.every(r => (r.forbidden_claims || []).length > 0);
  const trueGates = ROUTES.filter(r => r.proof_status === PROOF_STATUS.TRUE_FOUNDER_GATE).map(r => r.id);
  const bothRealReposAreTrueGates = trueGates.includes('existing_founder_private_repo') && trueGates.includes('customer_private_production_repo');
  return { onlyDeployKeyProven, noProductionClaim, bothRealReposAreTrueGates, ok: onlyDeployKeyProven && noProductionClaim && bothRealReposAreTrueGates };
}

export function buildMatrix() {
  return {
    kind: 'CREDENTIAL_ROUTE_MATRIX',
    generated_by: 'credential_route_policy_model (local/synthetic; no real credential)',
    routes: ROUTES,
    proven_with_limits: provenRoutes().map(r => r.id),
    recommended_next_gate: recommendedNextGate(),
    invariants: invariantsHold(),
    forbidden_program_claims: [
      'fine-grained-PAT-proven', 'github-app-proven', 'existing-founder-repo-proven',
      'customer-repo', 'private-repo-support-complete', 'production/SaaS/commercial/paid/security-ready',
      'merge-ready', 'Gate-8-complete', 'Codex-supported',
    ],
  };
}
