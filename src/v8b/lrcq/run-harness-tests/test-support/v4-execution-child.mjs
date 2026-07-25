// FounderGate LRCQ — TEST-SUPPORT generic V4 execution child (FG-LRCQ-ACT-029).
// Structurally test-only. A genuine SUPERVISOR_EXECUTION capability can ONLY be minted by a process that
// received the per-activation ephemeral key over the governed inherited anonymous descriptor. Therefore
// every migrated test family that needs to reach the real provider-spawn boundary runs its assertions
// INSIDE this child: it models the detached supervisor exactly (independent V4 re-verification -> attach
// over the inherited descriptor -> SUPERVISOR_EXECUTION), then dynamically imports the test body module
// named in its config and hands it the genuine capability.
//
// The body module's default export is `async (cap, args) => ({ checks: [{ name, ok, detail? }], ... })`.
// The child prints that object as one JSON line on stdout so the parent selftest can report it.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { attachSupervisorFromInheritedFdV4, isSupervisorExecutionCapabilityV4 } from "../../assurance/lifecycle-authority-v4.mjs";

async function main() {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.log(JSON.stringify({ ok: false, code: "NO_CONFIG" })); process.exit(2); }
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
  const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
  const keyDeps = { repo: "/disposable", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authorizationBytes = Buffer.from(cfg.authorizationB64, "base64");
  const vr = verifyActivation(signed, { authorizationBytes, nowEpoch: cfg.now }, { keyDeps });
  if (!vr.ok) { console.log(JSON.stringify({ ok: false, code: "REVERIFY_FAILED", detail: vr.code })); process.exit(4); }
  const sup = attachSupervisorFromInheritedFdV4(vr.capability, cfg.keyFd || 3, { now: cfg.now });
  if (!sup.ok || !isSupervisorExecutionCapabilityV4(sup.capability)) { console.log(JSON.stringify({ ok: false, code: "ATTACH_REFUSED", detail: sup.code })); process.exit(5); }
  let out;
  try {
    const mod = await import(pathToFileURL(cfg.bodyModule).href);
    out = await mod.default(sup.capability, cfg.bodyArgs || {}, { signedActivation: signed, verified: vr.capability, keyDeps, authorizationBytes });
  } catch (e) {
    console.log(JSON.stringify({ ok: false, code: "BODY_THREW", detail: String((e && e.stack) || e) }));
    process.exit(6);
  }
  console.log("__V4_BODY_RESULT__" + JSON.stringify({ ok: true, ...out }));
  process.exit(0);
}
main();
