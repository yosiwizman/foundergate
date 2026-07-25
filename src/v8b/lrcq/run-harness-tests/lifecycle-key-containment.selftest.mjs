// FounderGate LRCQ — LIFECYCLE-PRIVATE-KEY CONTAINMENT (FG-LRCQ-ACT-029).
// Proves the lifecycle-private-key export boundary is closed:
//   S1  no production module exports anything that returns a lifecycle private KeyObject or DER bytes;
//   S2  the test-only extraction surface lives ONLY under run-harness-tests and production never imports it;
//   T1  transfer requires a genuine opaque CONSUMED capability (a forged look-alike is refused);
//   T2  transfer BEFORE a launch intent exists is refused;
//   T3  a MISMATCHED / foreign intent is refused;
//   T4  a tampered intent (broken ephemeral signature) is refused;
//   T5  the entrypoint must be the signed intent's non-symlink regular file with the exact digest;
//   T6  the key is transferred exactly ONCE — every second transfer fails, and the key is gone from
//       module-private storage (transfer state becomes permanently TRANSFERRED_SPENT);
//   T7  the temporary DER buffer is zeroed and the writer closed (child observes exactly one framed key
//       then EOF);
//   L1  no key material reaches argv, environment, the supervisor config JSON, disk, git, logs, receipts,
//       stdout or stderr.
// Disposable keys + a disposable git repository only. No provider is invoked.
import { readFileSync, writeFileSync, readdirSync, statSync, symlinkSync, copyFileSync, appendFileSync, realpathSync, openSync, closeSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./test-support/v4-fixture.mjs";
import { consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4, isConsumedCapabilityV4, lifecycleStateV4, LC_CODES, TRANSFER_STATES } from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";
import * as LIFECYCLE from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const CHILD = realpathSync(join(HERE, "test-support", "v4-supervisor-child.mjs"));

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// Read the child's JSON line from a governed spawn (stdout piped by the authority module).
// FG-FFIN-197-F1: a governed transfer now returns only AFTER the supervisor's VERIFIED claim exists, so a
// short-lived supervisor has usually ALREADY exited by the time the caller gets the result — and node has by
// then emitted 'close' and DESTROYED the stdio pipes, so a listener attached afterwards receives nothing.
// Module-spawned supervisors therefore write to FILE descriptors we open ourselves (the governed transfer's
// supported stdoutFd/stderrFd), which we read once the child is done.
function collect(child) {
  return new Promise((res) => {
    let out = "", err = "";
    if (child.stdout) child.stdout.on("data", (d) => (out += d));
    if (child.stderr) child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => { let parsed = null; try { parsed = JSON.parse(out.trim().split("\n").pop()); } catch { /* */ } res({ parsed, out, err, code }); });
  });
}
function capture(w, tag) {
  const o = join(w.repoRoot, tag + ".out"), e = join(w.repoRoot, tag + ".err");
  return { outPath: o, errPath: e, outFd: openSync(o, "a", 0o600), errFd: openSync(e, "a", 0o600) };
}
async function collectCaptured(child, cap) {
  if (child && child.exitCode === null && child.signalCode === null) await new Promise((res) => child.on("close", res));
  try { closeSync(cap.outFd); } catch { /* */ }
  try { closeSync(cap.errFd); } catch { /* */ }
  const rd = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
  const out = rd(cap.outPath), err = rd(cap.errPath);
  let parsed = null; try { parsed = JSON.parse(out.trim().split("\n").pop()); } catch { /* */ }
  return { parsed, out, err, code: child ? child.exitCode : null };
}

// ---------------------------------------------------------------- S: static surface proofs
{
  const src = readFileSync(join(REPO, "src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs"), "utf8");
  ok("S1a no exported __test* helper remains in the production authority module", !/export\s+function\s+__test/.test(src));
  ok("S1b no exported sendEphemeralKeyToStream / receiveEphemeralKeyFromFd remains", !/export\s+function\s+sendEphemeralKeyToStream/.test(src) && !/export\s+function\s+receiveEphemeralKeyFromFd/.test(src));
  // Mechanical: every exported binding is inspected; none may return a private KeyObject or DER bytes.
  const exported = Object.keys(LIFECYCLE).sort();
  ok("S1c module exports only the governed surface (no key accessor)", !exported.some((k) => /key(of)?$/i.test(k) && /eph/i.test(k)));
  const keyLike = exported.filter((k) => /^(get|export|read|receive|send)?.*(EphemeralKey|PrivateKey)/i.test(k));
  ok("S1d no export name suggests private-key egress: " + JSON.stringify(keyLike), keyLike.length === 0);
  // No production source imports the test-only surfaces.
  const prod = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); const st = statSync(p); if (st.isDirectory()) { if (e === "node_modules" || e.endsWith("-tests")) continue; walk(p); } else if (e.endsWith(".mjs") && !e.endsWith(".selftest.mjs")) prod.push(p); } };
  walk(join(REPO, "src")); walk(join(REPO, "tools"));
  const offenders = prod.filter((p) => /run-harness-tests|test-support/.test(readFileSync(p, "utf8")) && /from\s+["'][^"']*(run-harness-tests|test-support)/.test(readFileSync(p, "utf8")));
  ok("S2 no production module imports a test-only surface: " + JSON.stringify(offenders.map((o) => o.replace(REPO + "/", ""))), offenders.length === 0);
}

// ---------------------------------------------------------------- T: governed transfer negatives
const w = makeDisposableV4World({ prefix: "fg-cont-" });
(async () => {
  try {
    // T1: a forged look-alike "consumed capability" cannot transfer.
    const forged = { _stage: "CONSUMED", activation_identity: w.verified.activation_identity, lifecycle_root: w.lifecycleRoot, consumed_marker_digest: "sha256:0", ephemeral_fingerprint: "sha256:0", __state: { launched: false, transfer: TRANSFER_STATES.NOT_TRANSFERRED } };
    ok("T1 forged consumed capability -> transfer REFUSED (FORGED)", (await spawnGovernedSupervisorV4(forged, {})).code === LC_CODES.FORGED);
    ok("T1b forged object is not branded CONSUMED", isConsumedCapabilityV4(forged) === false);

    // Governed consume -> genuine CONSUMED capability.
    const c = consumeActivationV4(w.verified, { now: w.now });
    ok("T0 governed consume -> genuine CONSUMED capability", c.ok && isConsumedCapabilityV4(c.capability));

    // T2: transfer BEFORE the launch intent exists.
    ok("T2 transfer before launch intent -> REFUSED (INTENT_MISSING)", (await spawnGovernedSupervisorV4(c.capability, {})).code === LC_CODES.INTENT_MISSING);
    ok("T2b transfer state still NOT_TRANSFERRED after the refusal", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.NOT_TRANSFERRED);

    // T5a: an intent naming a SYMLINK entrypoint is refused at intent creation.
    const linkPath = join(w.repoRoot, "sup-link.mjs");
    try { symlinkSync(CHILD, linkPath); } catch { /* */ }
    ok("T5a launch intent naming a symlink entrypoint -> REFUSED (ENTRYPOINT_INVALID)", createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: linkPath }).code === LC_CODES.ENTRYPOINT_INVALID);
    ok("T5b launch intent naming a directory -> REFUSED", createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: w.lifecycleRoot }).code === LC_CODES.ENTRYPOINT_INVALID);
    ok("T5c launch intent naming a missing file -> REFUSED", createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: join(w.repoRoot, "nope.mjs") }).code === LC_CODES.ENTRYPOINT_INVALID);

    // Create the real intent bound to the real (non-symlink, realpath) child entrypoint.
    const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: CHILD, hardDeadlineEpoch: 19000 });
    ok("T0b launch intent created + digested from the real entrypoint", li.ok);
    const intentDoc = JSON.parse(readFileSync(join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".launch-intent.json"), "utf8"));
    ok("T0c intent records the entrypoint realpath + its real sha256", intentDoc.supervisor_entrypoint_realpath === CHILD && /^sha256:[0-9a-f]{64}$/.test(intentDoc.supervisor_entrypoint_digest));

    // T5d: entrypoint content drift between intent and transfer -> ENTRYPOINT_DIGEST_MISMATCH.
    {
      const w2 = makeDisposableV4World({ prefix: "fg-cont-drift-", nonce: "drift" });
      const copy = join(w2.repoRoot, "sup-copy.mjs"); copyFileSync(CHILD, copy);
      const c2 = consumeActivationV4(w2.verified, { now: w2.now });
      createLaunchIntentV4(c2.capability, { now: w2.now, supervisorEntrypoint: copy });
      appendFileSync(copy, "\n// drift\n");                       // mutate AFTER the intent was signed
      const r = await spawnGovernedSupervisorV4(c2.capability, {});
      ok("T5d entrypoint content drift after the signed intent -> REFUSED (ENTRYPOINT_DIGEST_MISMATCH)", r.code === LC_CODES.ENTRYPOINT_DIGEST_MISMATCH);
      ok("T5e a refused entrypoint leaves the transfer UNSPENT (no key released)", lifecycleStateV4(c2.capability).transfer === TRANSFER_STATES.NOT_TRANSFERRED);
      w2.cleanup();
    }

    // T3/T4: a foreign / tampered intent for the same activation identity.
    {
      const w3 = makeDisposableV4World({ prefix: "fg-cont-tamper-", nonce: "tamper" });
      const c3 = consumeActivationV4(w3.verified, { now: w3.now });
      createLaunchIntentV4(c3.capability, { now: w3.now, supervisorEntrypoint: CHILD });
      const ip = join(w3.lifecycleRoot, w3.verified.activation_identity.replace(":", "_") + ".launch-intent.json");
      const doc = JSON.parse(readFileSync(ip, "utf8"));
      writeFileSync(ip, JSON.stringify({ ...doc, run_id: "SWAPPED-RUN" }, null, 2) + "\n");   // body edited, sig stale
      const r = await spawnGovernedSupervisorV4(c3.capability, {});
      ok("T4 tampered intent body -> REFUSED (EPHEMERAL_SIGNATURE_INVALID)", r.code === LC_CODES.EPHEMERAL_SIGNATURE_INVALID);
      // now swap in an intent whose marker binding points elsewhere
      writeFileSync(ip, JSON.stringify({ ...doc, consumed_marker_digest: "sha256:" + "9".repeat(64) }, null, 2) + "\n");
      const r2 = await spawnGovernedSupervisorV4(c3.capability, {});
      ok("T3 mismatched intent->marker binding -> REFUSED", r2.code === LC_CODES.EPHEMERAL_SIGNATURE_INVALID || r2.code === LC_CODES.BINDING_MISMATCH);
      ok("T3b neither refusal spent the transfer", lifecycleStateV4(c3.capability).transfer === TRANSFER_STATES.NOT_TRANSFERRED);
      w3.cleanup();
    }

    // ---------------------------------------------------------------- T6/T7/L1: the ONE real transfer
    const cfgPath = w.writeChildConfig("supervisor-config.json", { eligibility: { job: { risk_class: "WIDE_SAFE", gate_trigger: "NONE" }, bindings: {} } });
    const capT = capture(w, "t7");
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfgPath], stdoutFd: capT.outFd, stderrFd: capT.errFd, detached: false });
    ok("T7a governed transfer succeeded over the module-created inherited descriptor", g.ok && g.key_fd === 3 && typeof g.supervisor_pid === "number");
    ok("T6a transfer state is permanently TRANSFERRED_SPENT", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT && g.transfer === TRANSFER_STATES.SPENT);
    const res = await collectCaptured(g.child, capT);
    ok("T7b supervisor read exactly one framed key then EOF -> SUPERVISOR_EXECUTION", res.parsed && res.parsed.ok === true && res.parsed.stage === "SUPERVISOR_EXECUTION" && res.parsed.branded === true);
    ok("T7c provider eligibility reachable only from that stage", res.parsed && res.parsed.provider_eligible && res.parsed.provider_eligible.ok === true);

    // T6: second transfer always fails, and the key is gone from module-private storage.
    const again = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfgPath], detached: false });
    ok("T6b second transfer -> REFUSED (ALREADY_TRANSFERRED)", again.code === LC_CODES.ALREADY_TRANSFERRED);
    ok("T6c no second child was spawned", again.child === undefined);

    // L1: leak proof across every observable channel.
    const childArgv = (res.parsed && res.parsed.argv) || [];
    const childEnvKeys = (res.parsed && res.parsed.env_keys) || [];
    // The ephemeral key's real egress forms: a PEM header, the pkcs8 DER prefix for ed25519, the governed
    // frame magic, or a property name suggesting a private key. (Case-sensitive on purpose: macOS tmp paths
    // legitimately contain "/private/var/...".)
    const der = Buffer.from("302e020100300506032b657004220420", "hex").toString("latin1"); // ed25519 pkcs8 prefix
    const KEYPAT = new RegExp(["PRIVATE KEY", "FGV4KEY1", "ephemeralPrivate", "ephemeral_private", der.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")].join("|"));
    ok("L1a no key material in the supervisor argv", !KEYPAT.test(JSON.stringify(childArgv)));
    ok("L1b no key material in the supervisor environment", !KEYPAT.test(JSON.stringify(childEnvKeys)) && !childEnvKeys.some((k) => /KEY|SECRET|TOKEN/i.test(k)));
    ok("L1c no key material in the supervisor config JSON", !KEYPAT.test(readFileSync(cfgPath, "utf8")));
    ok("L1d no key material on the child's stdout/stderr", !KEYPAT.test(res.out) && !KEYPAT.test(res.err));
    // every file written anywhere under the disposable world (lifecycle records, git objects, receipts)
    const allFiles = [];
    const walkAll = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); const st = statSync(p); if (st.isDirectory()) walkAll(p); else allFiles.push(p); } };
    walkAll(w.repoRoot);
    const leaks = allFiles.filter((p) => { try { return KEYPAT.test(readFileSync(p, "latin1")); } catch { return false; } });
    ok("L1e no key material on disk / in git / in receipts across " + allFiles.length + " files" + (leaks.length ? " LEAKS=" + JSON.stringify(leaks) : ""), leaks.length === 0);
    ok("L1f the marker holds only the ephemeral PUBLIC key + signature", (() => { const s = readFileSync(c.marker_path, "utf8"); return /ephemeral_public_key_spki_b64/.test(s) && /ephemeral_signature/.test(s) && !/PRIVATE/i.test(s); })());
    ok("L1g the CONSUMED capability serializes without any key property", !KEYPAT.test(JSON.stringify(c.capability)) && !Object.keys(c.capability).some((k) => /private|secret/i.test(k)));

    // ---------------------------------------------------------------- F: supervisor-side frame validation
    // These write RAW bytes to a directly-spawned child's inherited fd 3 (no governed transfer), proving the
    // supervisor refuses missing / empty / malformed / truncated / oversized descriptor input.
    const frameCase = (cfg, name, bytes, expected) => new Promise((res2) => {
      const child = spawn(process.execPath, [CHILD, "--config", cfg], { stdio: ["ignore", "pipe", "pipe", "pipe"], env: { PATH: process.env.PATH } });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.on("close", () => {
        let parsed = null; try { parsed = JSON.parse(out.trim().split("\n").pop()); } catch { /* */ }
        ok(name, !!parsed && parsed.ok === false && parsed.code === expected);
        res2();
      });
      const fd3 = child.stdio[3];
      if (bytes === null) { try { fd3.destroy(); } catch { /* */ } }
      else fd3.write(bytes, () => fd3.end());
    });
    // A fresh world so marker+intent exist but no genuine key is delivered.
    const w4 = makeDisposableV4World({ prefix: "fg-cont-frame-", nonce: "frame" });
    const c4 = consumeActivationV4(w4.verified, { now: w4.now });
    createLaunchIntentV4(c4.capability, { now: w4.now, supervisorEntrypoint: CHILD });
    const cfg4 = w4.writeChildConfig("frame-config.json");
    await frameCase(cfg4, "F1 EMPTY descriptor input -> KEY_FRAME_EMPTY", Buffer.alloc(0), LC_CODES.KEY_FRAME_EMPTY);
    await frameCase(cfg4, "F2 MALFORMED (bad magic) -> KEY_FRAME_MAGIC", Buffer.concat([Buffer.from("NOTAKEY1"), Buffer.alloc(60)]), LC_CODES.KEY_FRAME_MAGIC);
    await frameCase(cfg4, "F3 TOO SHORT -> KEY_FRAME_TOO_SHORT", Buffer.from("FGV4KEY1abc"), LC_CODES.KEY_FRAME_TOO_SHORT);
    await frameCase(cfg4, "F4 TRUNCATED (declared length disagrees with the delivered bytes) -> KEY_FRAME_TRUNCATED", (() => { const len = Buffer.alloc(4); len.writeUInt32BE(48, 0); return Buffer.concat([Buffer.from("FGV4KEY1"), len, Buffer.alloc(70)]); })(), LC_CODES.KEY_FRAME_TRUNCATED);
    await frameCase(cfg4, "F5 OVERSIZED -> KEY_FRAME_OVERSIZED", Buffer.concat([Buffer.from("FGV4KEY1"), Buffer.alloc(4 + 4096)]), LC_CODES.KEY_FRAME_OVERSIZED);
    await frameCase(cfg4, "F6 CORRUPT tag (digest mismatch) -> KEY_FRAME_DIGEST", (() => { const der = Buffer.alloc(48, 7); const len = Buffer.alloc(4); len.writeUInt32BE(48, 0); return Buffer.concat([Buffer.from("FGV4KEY1"), len, der, Buffer.alloc(32, 1)]); })(), LC_CODES.KEY_FRAME_DIGEST);
    w4.cleanup();
  } finally { w.cleanup(); }

  console.log("\nLRCQ LIFECYCLE-KEY-CONTAINMENT SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
  process.exit(0);
})();
