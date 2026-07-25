// FounderGate LRCQ — TEST-SUPPORT model of the detached V4 supervisor (FG-LRCQ-ACT-028).
// Structurally test-only (lives under run-harness-tests). It faithfully models what the real detached
// supervisor does: (1) receive the per-activation ephemeral private key over the INHERITED anonymous
// descriptor fd 3 — never argv/env/temp-file; (2) INDEPENDENTLY re-verify the founder-signed V4 activation
// from disk (its own verifyActivation, not a value handed by the launcher); (3) attachSupervisorV4 with the
// fd-delivered key to mint the opaque SUPERVISOR_EXECUTION capability; (4) print a machine-readable result.
// Only the (public) signed activation + key-authority fixture arrive via the config path; the SECRET
// ephemeral key arrives only over fd 3.
import { readFileSync } from "node:fs";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { receiveEphemeralKeyFromFd, attachSupervisorV4, isSupervisorExecutionCapabilityV4 } from "../../assurance/lifecycle-authority-v4.mjs";

function main() {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.log(JSON.stringify({ ok: false, code: "NO_CONFIG" })); process.exit(2); }
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  // (1) receive the ephemeral key ONLY over the inherited fd (default 3).
  let ephKey;
  try { ephKey = receiveEphemeralKeyFromFd(cfg.keyFd || 3); }
  catch (e) { console.log(JSON.stringify({ ok: false, code: "FD_KEY_UNREADABLE", detail: String(e && e.message) })); process.exit(3); }
  // (2) INDEPENDENT re-verification of the founder-signed activation from disk.
  const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
  const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authorizationBytes = Buffer.from(cfg.authorizationB64, "base64");
  const vr = verifyActivation(signed, { authorizationBytes, nowEpoch: cfg.now }, { keyDeps });
  if (!vr.ok) { console.log(JSON.stringify({ ok: false, code: "REVERIFY_FAILED", detail: vr.code })); process.exit(4); }
  // (3) attach with the fd-delivered ephemeral key.
  const sup = attachSupervisorV4(vr.capability, ephKey, { now: cfg.now });
  console.log(JSON.stringify({ ok: sup.ok, code: sup.code, stage: sup.ok ? "SUPERVISOR_EXECUTION" : null, branded: sup.ok ? isSupervisorExecutionCapabilityV4(sup.capability) : false }));
  process.exit(sup.ok ? 0 : 5);
}
main();
