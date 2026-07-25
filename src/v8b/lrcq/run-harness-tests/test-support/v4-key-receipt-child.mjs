// FounderGate LRCQ — TEST-SUPPORT key-receipt supervisor (FG-CHK-197-01 / FG-FFIN-197-F1 regression).
// Structurally test-only.
//
// It models a MINIMAL but GENUINE supervisor. It re-verifies the signed V4 activation independently, then
// attaches over the inherited anonymous descriptor — which reads and decodes the key frame, matches the
// ephemeral key to the consumed marker, proves this program IS the entrypoint the signed intent names, and
// mints the ephemeral-signed supervisor claim bound to this PID and OS-observed start identity.
//
// FG-FFIN-197-F1: it must do the real attach, not merely count bytes off fd 3. A governed transfer now
// reports OK only after that verified claim exists, precisely because pipe-write completion proves nothing
// about whether the supervisor received the key. A byte-counting probe would (correctly) be refused
// SUPERVISOR_TERMINATED_BEFORE_CLAIM, so the byte counter is no longer the instrument: the claim is. The
// receipt records what was proven, never recoverable key material — the key here is a disposable
// per-activation ephemeral key inside an auto-removed temp world.
import { readFileSync, writeFileSync } from "node:fs";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { attachSupervisorFromInheritedFdV4, isSupervisorExecutionCapabilityV4 } from "../../assurance/lifecycle-authority-v4.mjs";

const at = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; };
const out = at("--receipt");
const fd = at("--fd") !== null ? Number(at("--fd")) : 3;
const cfgPath = at("--config");

const receipt = { pid: process.pid, attached: false, code: null, stage: null, branded: false, claim_digest: null, error: null };
try {
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
  const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
  const keyDeps = { repo: "/disposable", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authorizationBytes = Buffer.from(cfg.authorizationB64, "base64");
  const vr = verifyActivation(signed, { authorizationBytes, nowEpoch: cfg.now }, { keyDeps });
  if (!vr.ok) { receipt.code = "REVERIFY_FAILED:" + vr.code; }
  else {
    const sup = attachSupervisorFromInheritedFdV4(vr.capability, fd, { now: cfg.now });
    receipt.code = sup.code;
    receipt.attached = sup.ok === true;
    receipt.branded = isSupervisorExecutionCapabilityV4(sup.capability);
    receipt.stage = sup.capability ? sup.capability._stage : null;
    receipt.claim_digest = sup.capability ? sup.capability.supervisor_claim_digest : null;
  }
} catch (e) { receipt.error = String((e && e.message) || e); }

if (out) writeFileSync(out, JSON.stringify(receipt) + "\n");
console.log(JSON.stringify(receipt));
process.exit(receipt.attached ? 0 : 7);
