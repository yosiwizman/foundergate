// FounderGate — provider-gated build/check flow. FounderGate is the GATE: it runs a provider adapter, takes
// its CLAIM, then INDEPENDENTLY verifies the artifacts/tests/preview (via the same classifier used everywhere)
// and issues PASS/HOLD/REFUSED based on VERIFICATION, not the provider's word. A provider that lies (hostile),
// mutates the wrong artifact, omits tests, or requests a forbidden action → HOLD/REFUSED, never PASS.
import { ADAPTERS } from './adapters.mjs';
import { FORBIDDEN_ACTIONS, validateProviderOutput, REPO } from './provider_contract.mjs';
import { classifyApp } from '../generated_app_runner/validate-app.mjs';
import { join } from 'node:path';

export async function runGatedFlow(adapterId, request, runId) {
  const adapter = ADAPTERS[adapterId];
  if (!adapter) throw new Error('unknown adapter ' + adapterId);

  // 1. run the provider (simulated) → CLAIM (untrusted)
  const claim = adapter.run(request, runId);
  const shape = validateProviderOutput(claim);

  const result = {
    provider_id: adapterId, provider_label: adapter.provider_label, mode: adapter.mode,
    request, run_id: runId, provider_claim: claim, claim_shape_ok: shape.ok,
    // provider can NEVER set these — the gate reserves them for the independent reviewers
    checker_verdict: 'PENDING_INDEPENDENT_CHECKER', terminal_advisor_verdict: 'PENDING_INDEPENDENT_TERMINAL_ADVISOR',
  };

  // 2. GATE: refuse any forbidden action the provider CLAIMS to want, before any verification
  if (claim.requested_action && FORBIDDEN_ACTIONS.includes(claim.requested_action)) {
    return { ...result, foundergate_verification: { classification: 'REFUSED_FORBIDDEN_ACTION', reason: `provider requested forbidden action: ${claim.requested_action}` }, preview_allowed: false, final_status: 'REFUSED_FORBIDDEN_ACTION' };
  }
  // 3. GATE: the provider's claimed_readiness (production/SaaS/customer) is IGNORED — never elevated to PASS
  const readiness_claim_ignored = claim.claimed_readiness || null;

  // 4. GATE: independent verification of the claimed artifact (NOT the provider's tests_claimed)
  const relDir = (claim.claimed_artifacts && claim.claimed_artifacts[0]) || null;
  if (!relDir) {
    return { ...result, readiness_claim_ignored, foundergate_verification: { classification: 'HOLD_NO_ARTIFACT_CLAIMED', reason: 'provider claimed success but named no artifact' }, preview_allowed: false, final_status: 'HOLD_NO_ARTIFACT_CLAIMED' };
  }
  const absDir = join(REPO, relDir);
  const verification = await classifyApp(absDir, { currentRunId: runId });
  const final_status = verification.classification === 'OK' ? 'PASS_VERIFIED' : verification.classification;

  return {
    ...result, readiness_claim_ignored,
    foundergate_verification: verification,
    preview_url: verification.preview_allowed ? null : null,   // preview only exposed when OK (UI derives from manifest)
    verified_test_result: verification.test_result,
    preview_allowed: verification.preview_allowed,
    final_status,
    // honesty: did the provider's claim match FounderGate's verification?
    claim_vs_verification: (/PASS/i.test(String(claim.tests_claimed)) && verification.classification !== 'OK') ? 'PROVIDER_OVERCLAIMED_CAUGHT' : 'consistent',
  };
}
