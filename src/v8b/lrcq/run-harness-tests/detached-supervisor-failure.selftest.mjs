// FounderGate LRCQ — detached-launch FAIL-CLOSED cases (FG-LRCQ-ACT-017; migrated to V4 authority by
// FG-LRCQ-ACT-029). Exercises launchDetachedSupervisorV4's refusals BEFORE any run: a V3 record, an
// unsigned/foreign-key V4 record, a tampered payload, a manifest whose digest is not the SIGNED digest,
// provider-binding drift, replay of a consumed activation, a supervisor entrypoint that is missing or a
// symlink, and a supervisor that never publishes RUN_ACTIVE. Disposable keys + repos; no real provider.
import { launchDetachedSupervisorV4 } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { makeDisposableRunWorld } from "./test-support/v4-run-world.mjs";
import { writeFileSync, symlinkSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + detail + "]" : "")); } else console.log("  ok   " + name); };

// Every case gets its own disposable world (the lifecycle is genuinely one-shot per activation).
const worlds = [];
function world(nonce, opts = {}) { const w = makeDisposableRunWorld({ prefix: "fg-detfail-", nonce, ...opts }); worlds.push(w); return w; }
// `life` supplies only TEST-ONLY plumbing the production CLI never passes: the disposable key authority,
// loose-perm authorization reads, and a version runner. Manifest/bindings/provider/candidate all come from
// the SIGNED activation.
const life = (w, over = {}) => ({
  now: w.now, verifyDeps: { keyDeps: w.keyDeps }, authDeps: { allowLoosePerms: true },
  providerDeps: { versionRunner: () => w.run.providerVersion },
  startupTimeoutMs: 900, pollMs: 80, heartbeatMs: 100, ...over,
});
function authFile(w) { const p = join(w.repoRoot, "authorization.txt"); writeFileSync(p, w.authorizationBytes); return p; }

try {
  // 01 a V3 record is refused outright, before any consumption or spawn
  { const w = world("v3"); const p = join(w.repoRoot, "v3.json");
    writeFileSync(p, JSON.stringify({ schema_version: "lrcq-activation-3", founder_signature: "SYN", run_id: "F-RUN" }));
    const r = await launchDetachedSupervisorV4(p, authFile(w), life(w));
    ok("01 V3 record refused (V3_REFUSED_FOR_EXECUTION; not consumed, not launched)", r.ready === false && r.consumed === false && r.launched === false && r.refused.reasons.join(" ").includes("V3_REFUSED_FOR_EXECUTION"), JSON.stringify(r.refused)); }

  // 02 a V4 record with NO founder signature -> refused at the founder gate
  { const w = world("unsigned"); const p = join(w.repoRoot, "unsigned.json");
    const { founder_signature, ...unsigned } = w.signed; writeFileSync(p, JSON.stringify(unsigned));
    const r = await launchDetachedSupervisorV4(p, authFile(w), life(w));
    ok("02 unsigned V4 refused (not consumed, not launched)", r.ready === false && r.consumed === false && r.launched === false, JSON.stringify(r.refused)); }

  // 03 the GOVERNED key authority has no current key -> KEY_ENROLLMENT gate (production default)
  { const w = world("nokey");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { verifyDeps: {} }));
    ok("03 no enrolled founder key -> refused with the KEY_ENROLLMENT founder gate", r.ready === false && r.consumed === false && r.founder_gate && r.founder_gate.gate === "KEY_ENROLLMENT", JSON.stringify(r.founder_gate)); }

  // 04 a TAMPERED signed payload (one field changed after signing) -> SIGNATURE_INVALID
  { const w = world("tamper"); const p = join(w.repoRoot, "tampered.json");
    writeFileSync(p, JSON.stringify({ ...w.signed, max_budget_usd: 9 }));
    const r = await launchDetachedSupervisorV4(p, authFile(w), life(w));
    ok("04 tampered signed payload refused (SIGNATURE_INVALID; nothing consumed)", r.ready === false && r.consumed === false && r.refused.reasons.join(" ").includes("SIGNATURE_INVALID"), JSON.stringify(r.refused)); }

  // 05 the authorization bytes do not match the SIGNED authorization_text_digest
  { const w = world("auth"); const p = join(w.repoRoot, "other-authorization.txt"); writeFileSync(p, "A DIFFERENT AUTHORIZATION\n");
    const r = await launchDetachedSupervisorV4(w.activationPath, p, life(w));
    ok("05 wrong authorization bytes refused (AUTHORIZATION_DIGEST_MISMATCH)", r.ready === false && r.consumed === false && r.refused.reasons.join(" ").includes("AUTHORIZATION_DIGEST_MISMATCH"), JSON.stringify(r.refused)); }

  // 06 the manifest on disk no longer matches the SIGNED run_manifest_digest
  { const w = world("mandrift");
    appendFileSync(w.run.manifestPath, "\n");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w));
    ok("06 manifest drift from the SIGNED digest refused (nothing consumed)", r.ready === false && r.consumed === false && r.final_state === "MANIFEST_DEFECT", JSON.stringify(r.refused)); }

  // 07 provider-binding drift: the reviewed versioned target's bytes changed after signing
  { const w = world("provdrift");
    appendFileSync(w.run.providerTarget, "\n# drift\n");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w));
    ok("07 provider target drift refused BEFORE consumption", r.ready === false && r.consumed === false && r.final_state === "PROVIDER_BINDING_REFUSED", JSON.stringify(r.refused)); }

  // 08 a supervisor entrypoint that does not exist -> the signed launch intent refuses
  { const w = world("noentry");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { supervisorMainPath: join(w.repoRoot, "missing-supervisor.mjs") }));
    ok("08 missing supervisor entrypoint -> refused, never launched", r.ready === false && r.launched === false, JSON.stringify(r.refused)); }

  // 09 a SYMLINK supervisor entrypoint -> refused (the intent digests a real regular file only)
  { const w = world("linkentry");
    const link = join(w.repoRoot, "sup-link.mjs"); symlinkSync(join(w.repoRoot, "run", "backlog.json"), link);
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { supervisorMainPath: link }));
    ok("09 symlinked supervisor entrypoint -> refused, never launched", r.ready === false && r.launched === false, JSON.stringify(r.refused)); }

  // 10 a supervisor that exits without ever acknowledging -> bounded refusal (consumed, not launched)
  // FG-FFIN-197-F1: this noop supervisor never reads the key and never mints a claim, so it is now refused
  // EARLIER and more precisely — at the acknowledgment gate (SUPERVISOR_NEVER_ACKNOWLEDGED) rather than after
  // waiting out the RUN_ACTIVE window. The governing property is unchanged and still asserted: bounded
  // refusal, activation consumed, supervisor NOT launched.
  { const w = world("noactive");
    const noop = join(w.repoRoot, "noop-supervisor.mjs"); writeFileSync(noop, "process.exit(0);\n");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { supervisorMainPath: noop }));
    ok("10 a supervisor that never acknowledges -> bounded refusal (consumed, not launched)",
      r.ready === false && r.launched === false && r.consumed === true && r.final_state === "SUPERVISOR_NEVER_ACKNOWLEDGED", r.final_state);
    ok("10b the refusal names the acknowledgment stage and the exact lifecycle code",
      !!r.refused && r.refused.stage === "supervisor_acknowledgment" && /SUPERVISOR_TERMINATED_BEFORE_CLAIM|SUPERVISOR_CLAIM_TIMEOUT/.test(String(r.refused.reasons)), JSON.stringify(r.refused));
    ok("10c the launcher reports the supervisor as NOT acknowledged", r.supervisor_acknowledged === false);
    // 11 replay: the SAME activation cannot be consumed again
    const r2 = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { supervisorMainPath: noop }));
    ok("11 replay of a consumed activation -> REPLAY_BLOCKED before any spawn", r2.ready === false && r2.final_state === "REPLAY_BLOCKED" && r2.launched === false, r2.final_state); }

  // 12 an elapsed hard deadline is refused at verification (no consumption, no spawn)
  { const w = world("deadline", { payloadOverrides: { hard_deadline_epoch: 1_700_000_050 } });
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w));
    ok("12 elapsed hard deadline refused (not consumed, not launched)", r.ready === false && r.consumed === false && r.launched === false, JSON.stringify(r.refused)); }
} finally { for (const w of worlds) w.cleanup(); }

console.log("\nLRCQ DETACHED-SUPERVISOR-FAILURE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
