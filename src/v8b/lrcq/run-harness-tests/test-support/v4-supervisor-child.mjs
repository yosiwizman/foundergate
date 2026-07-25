// FounderGate LRCQ — TEST-SUPPORT model of the detached V4 supervisor (FG-LRCQ-ACT-028/029).
// Structurally test-only (lives under run-harness-tests). It faithfully models what the real detached
// supervisor does: (1) INDEPENDENTLY re-verify the founder-signed V4 activation from disk (its own
// verifyActivation, not a value handed by the launcher); (2) attach over the INHERITED anonymous descriptor
// — the ephemeral private key is read and consumed INSIDE the authority module and is never materialized in
// this file; (3) print a machine-readable result. Only the (public) signed activation + key-authority
// fixture arrive via the config path; the SECRET ephemeral key arrives only over the inherited descriptor.
import { readFileSync } from "node:fs";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { attachSupervisorFromInheritedFdV4, isSupervisorExecutionCapabilityV4, providerEligibilityV4 } from "../../assurance/lifecycle-authority-v4.mjs";

function main() {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.log(JSON.stringify({ ok: false, code: "NO_CONFIG" })); process.exit(2); }
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  // (1) INDEPENDENT re-verification of the founder-signed activation from disk.
  const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
  const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authorizationBytes = Buffer.from(cfg.authorizationB64, "base64");
  const vr = verifyActivation(signed, { authorizationBytes, nowEpoch: cfg.now }, { keyDeps });
  if (!vr.ok) { console.log(JSON.stringify({ ok: false, code: "REVERIFY_FAILED", detail: vr.code })); process.exit(4); }
  // (2) attach over the inherited anonymous descriptor (default fd 3). No KeyObject crosses this boundary.
  const sup = attachSupervisorFromInheritedFdV4(vr.capability, cfg.keyFd || 3, { now: cfg.now });
  // (3) provider eligibility is reachable ONLY from the SUPERVISOR_EXECUTION stage.
  let eligible = null;
  if (sup.ok && cfg.eligibility) { const e = providerEligibilityV4(sup.capability, cfg.eligibility.job, cfg.eligibility.bindings || {}); eligible = { ok: e.ok, code: e.code }; }
  console.log(JSON.stringify({
    ok: sup.ok, code: sup.code, detail: sup.detail || null,
    stage: sup.ok ? "SUPERVISOR_EXECUTION" : null,
    branded: sup.ok ? isSupervisorExecutionCapabilityV4(sup.capability) : false,
    provider_eligible: eligible,
    claim_digest: sup.ok ? sup.capability.supervisor_claim_digest : null,
    // leak proof: this process's own argv + environment, so the test can assert no key material is present
    argv: process.argv.slice(1), env_keys: Object.keys(process.env).sort(),
  }));
  process.exit(sup.ok ? 0 : 5);
}
main();
