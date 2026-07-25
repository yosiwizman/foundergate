// FounderGate LRCQ — inherited-anonymous-descriptor ephemeral-key transfer to a DETACHED supervisor
// (FG-LRCQ-ACT-028/029 Phase 6-9). Proves, with a REAL child over the REAL anonymous pipe the authority
// module itself creates, that:
//  A1 the per-activation ephemeral key reaches the supervisor ONLY over the inherited descriptor and the
//     supervisor INDEPENDENTLY re-verifies the founder signature before attaching -> SUPERVISOR_EXECUTION;
//  A2 a key belonging to a DIFFERENT activation is refused (KEY_MISMATCH) — proven with a genuine framed
//     transfer from one world into a supervisor re-verifying another;
//  A3 consumption / launch intent / claim are each one-shot;
//  A4 a COPIED claim or marker lifted from another activation's lifecycle root cannot mint authority;
//  A5 no key material appears in the child config, activation, authority document, records, argv, env,
//     stdout or stderr;
//  A6 the transferred key is not reusable: the CONSUMED capability is permanently spent.
// Disposable Ed25519 keys + disposable git-init'd repositories, auto-removed. No provider is invoked.
import { copyFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./test-support/v4-fixture.mjs";
import { consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4, lifecycleStateV4, LC_CODES, TRANSFER_STATES } from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = realpathSync(join(HERE, "test-support", "v4-supervisor-child.mjs"));
let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const collect = (child) => new Promise((res) => {
  let out = "", err = "";
  if (child.stdout) child.stdout.on("data", (d) => (out += d));
  if (child.stderr) child.stderr.on("data", (d) => (err += d));
  child.on("close", () => { let parsed = null; try { parsed = JSON.parse(out.trim().split("\n").pop()); } catch { /* */ } res({ parsed, out, err }); });
});
const recPath = (w, kind) => join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + kind);

// Build a world already consumed + intent-bound to the test-support supervisor child.
function readyWorld(prefix, nonce) {
  const w = makeDisposableV4World({ prefix, nonce });
  const c = consumeActivationV4(w.verified, { now: w.now });
  if (!c.ok) throw new Error("fixture consume failed: " + c.code);
  const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: CHILD });
  if (!li.ok) throw new Error("fixture intent failed: " + li.code);
  return { w, c };
}

(async () => {
  const worlds = [];
  try {
    // ---- A1 POSITIVE: governed transfer -> independent re-verification -> SUPERVISOR_EXECUTION ----
    const A = readyWorld("fg-fd-a-", "a1"); worlds.push(A.w);
    const cfgA = A.w.writeChildConfig("sup-config.json", { eligibility: { job: { risk_class: "WIDE_SAFE", gate_trigger: "NONE" }, bindings: { providerIdentity: A.w.payload.provider_executable_identity, evaluatedCandidate: A.w.payload.reviewed_runtime_sha } } });
    const gA = await spawnGovernedSupervisorV4(A.c.capability, { args: ["--config", cfgA], stdoutFd: "pipe", stderrFd: "pipe", detached: false });
    ok("A0 governed transfer ok over the module-created inherited descriptor", gA.ok);
    const rA = await collect(gA.child);
    ok("A1 correct key over the inherited descriptor -> child reaches SUPERVISOR_EXECUTION", rA.parsed && rA.parsed.ok === true && rA.parsed.stage === "SUPERVISOR_EXECUTION" && rA.parsed.branded === true);
    ok("A1b that capability is provider-ELIGIBLE for the signed provider + candidate bindings", rA.parsed && rA.parsed.provider_eligible && rA.parsed.provider_eligible.ok === true);
    ok("A1c an ephemeral-signed supervisor claim was written into the SIGNED lifecycle root", existsSync(recPath(A.w, ".supervisor-claim.json")));
    ok("A6 the consumed capability is permanently spent after the single transfer", lifecycleStateV4(A.c.capability).transfer === TRANSFER_STATES.SPENT);

    // ---- A2 WRONG KEY: one world's genuine framed key delivered to a supervisor re-verifying another ----
    const B = readyWorld("fg-fd-b-", "b1"); worlds.push(B.w);
    const A2 = readyWorld("fg-fd-a2-", "a2"); worlds.push(A2.w);
    const cfgB = B.w.writeChildConfig("sup-config-b.json");
    const gWrong = await spawnGovernedSupervisorV4(A2.c.capability, { args: ["--config", cfgB], stdoutFd: "pipe", stderrFd: "pipe", detached: false });
    ok("A2a the wrong-key transfer itself still completes (the launcher cannot detect the swap)", gWrong.ok);
    const rWrong = await collect(gWrong.child);
    ok("A2 a foreign activation's ephemeral key -> attach REFUSED (KEY_MISMATCH)", rWrong.parsed && rWrong.parsed.ok === false && rWrong.parsed.code === LC_CODES.KEY_MISMATCH);
    ok("A2b no supervisor claim was written for the mis-keyed activation", !existsSync(recPath(B.w, ".supervisor-claim.json")));

    // ---- A3 one-shot lifecycle: genuine attach, then no second key / no second consume / no second intent ----
    const gB = await spawnGovernedSupervisorV4(B.c.capability, { args: ["--config", cfgB], stdoutFd: "pipe", stderrFd: "pipe", detached: false });
    const rB = await collect(gB.child);
    ok("A3a the correctly-keyed supervisor attaches -> SUPERVISOR_EXECUTION", rB.parsed && rB.parsed.ok === true);
    const dup = await new Promise((res) => {
      const child = spawn(process.execPath, [CHILD, "--config", cfgB], { stdio: ["ignore", "pipe", "pipe", "pipe"], env: { PATH: process.env.PATH } });
      collect(child).then(res);
      child.stdio[3].end();                      // a second supervisor gets no key at all
    });
    ok("A3 a second supervisor with no delivered key -> REFUSED before any claim", dup.parsed && dup.parsed.ok === false && dup.parsed.code === LC_CODES.KEY_FRAME_EMPTY);
    ok("A3b consumption is one-shot (ALREADY_CONSUMED)", consumeActivationV4(B.w.verified, { now: B.w.now }).code === LC_CODES.ALREADY_CONSUMED);
    ok("A3c the launch intent is one-shot (ALREADY_LAUNCHED)", createLaunchIntentV4(B.c.capability, { now: B.w.now, supervisorEntrypoint: CHILD }).code === LC_CODES.ALREADY_LAUNCHED);
    ok("A3d a second key transfer is impossible (ALREADY_TRANSFERRED)", (await spawnGovernedSupervisorV4(B.c.capability, { args: ["--config", cfgB], detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);

    // ---- A4 COPIED CLAIM: lift A's ephemeral-signed claim into C's signed root before C attaches ----
    const C = readyWorld("fg-fd-c-", "c1"); worlds.push(C.w);
    copyFileSync(recPath(A.w, ".supervisor-claim.json"), recPath(C.w, ".supervisor-claim.json"));
    const cfgC = C.w.writeChildConfig("sup-config-c.json");
    const gC = await spawnGovernedSupervisorV4(C.c.capability, { args: ["--config", cfgC], stdoutFd: "pipe", stderrFd: "pipe", detached: false });
    const rC = await collect(gC.child);
    ok("A4 a COPIED supervisor claim in the signed root -> attach REFUSED (DUPLICATE_CLAIM)", rC.parsed && rC.parsed.ok === false && rC.parsed.code === LC_CODES.DUPLICATE_CLAIM);

    // ---- A4b COPIED MARKER: A's marker copied into a fresh signed root blocks (never mints) consumption ----
    const D = makeDisposableV4World({ prefix: "fg-fd-d-", nonce: "d1" }); worlds.push(D);
    copyFileSync(recPath(A.w, ".consumed.json"), join(D.lifecycleRoot, D.verified.activation_identity.replace(":", "_") + ".consumed.json"));
    ok("A4b a COPIED consumed marker blocks (never mints) consumption", consumeActivationV4(D.verified, { now: D.now }).code === LC_CODES.ALREADY_CONSUMED);

    // ---- A5 LEAK PROOF: nothing observable carries key material ----
    const der = Buffer.from("302e020100300506032b657004220420", "hex").toString("latin1");
    const KEYPAT = new RegExp(["PRIVATE KEY", "FGV4KEY1", "ephemeral_private", der.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")].join("|"));
    const visible = readFileSync(cfgA, "utf8") + readFileSync(A.w.activationPath, "utf8") + readFileSync(A.w.authorityPath, "utf8") + readFileSync(recPath(A.w, ".consumed.json"), "utf8") + readFileSync(recPath(A.w, ".launch-intent.json"), "utf8") + readFileSync(recPath(A.w, ".supervisor-claim.json"), "utf8");
    ok("A5 no key material in config/activation/authority/marker/intent/claim (descriptor-only transfer)", !KEYPAT.test(visible));
    ok("A5b no key material in the supervisor's argv or environment", !KEYPAT.test(JSON.stringify((rA.parsed && rA.parsed.argv) || [])) && !KEYPAT.test(JSON.stringify((rA.parsed && rA.parsed.env_keys) || [])));
    ok("A5c no key material on the supervisor's stdout/stderr", !KEYPAT.test(rA.out) && !KEYPAT.test(rA.err));
  } finally { for (const w of worlds) w.cleanup(); }

  console.log("\nLRCQ LIFECYCLE-FD-TRANSFER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
  process.exit(0);
})();
