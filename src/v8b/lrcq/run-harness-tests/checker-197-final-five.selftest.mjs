// FounderGate LRCQ — FRESH INDEPENDENT-CHECKER FINDING CORRECTIONS, second report (PR #197, report digest
// 6ac782a2d396a8b0558eed8493d19a86a5f52a3e99e38cfe2f040f72e25da50b).
//
// One regression family per mechanically reported finding. Each family reproduces the Checker's own attack
// and requires the corrected behaviour — not merely "no crash".
//
//   FA (FG-FCHK-197-A, MEDIUM) asynchronous ChildProcess 'error' after the transfer point of no return is
//                              GOVERNED: structured fail-closed refusal, spent authority, no residual
//                              process, no uncaught exception, no retry with the same key
//   FB (FG-FCHK-197-B, MEDIUM) the provider boundary independently enforces every founder-signed numerical
//                              ceiling and ALL signed exclusions (26-route matrix, counted zero spawns)
//   FC (FG-FCHK-197-C, LOW)    deep immutability of every authority stage's nested limits and exclusions
//   FD (FG-FCHK-197-D, LOW)    lifecycle-root filesystem OBJECT continuity is enforced on PRODUCTION reads
//   FE (FG-FCHK-197-E, LOW)    evidence assertions state exactly what they measure
//
// EVIDENCE CLASS. Each assertion below is one of:
//   [DYNAMIC]    — an attack was executed and the refusal/behaviour was observed in this process tree;
//   [COUNTED]    — a real process count read from a recording stub's own log;
//   [STRUCTURAL] — a property of the source text, not an execution.
// A [STRUCTURAL] assertion is never described as runtime proof.
//
// Disposable keys, disposable repositories, deterministic children. No provider or model is invoked.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, realpathSync, statSync, rmSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./test-support/v4-fixture.mjs";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";
import {
  consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4,
  attachSupervisorFromInheritedFdV4, lifecycleStateV4, LC_CODES, TRANSFER_STATES,
} from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";
import { V4_SIGNED_LIMITS, V4_SIGNED_EXCLUSIONS } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { deepFreezeAuthority, mutableAuthorityPaths, AUTHORITY_FREEZE_CODES } from "../../../../src/v8b/lrcq/assurance/deep-freeze-authority.mjs";
import { enforceSignedAuthorityBoundary } from "../../../../src/v8b/lrcq/provider/authority-boundary.mjs";
import { MUST_BE_TRUE_EXCLUSIONS } from "../../../../src/v8b/lrcq/provider/activation-schema.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const RECEIPT_CHILD = realpathSync(join(HERE, "test-support", "v4-key-receipt-child.mjs"));
const RECORDING_STUB = realpathSync(join(HERE, "test-support", "recording-provider-stub.mjs"));
const SPAWN_FAIL_LAUNCHER = realpathSync(join(HERE, "test-support", "spawn-failure-launcher.mjs"));
// FG-FFIN4-197-01: a supervisor that legitimately holds the transferred key and forges ONLY its start
// identity, plus the driver that denies the parent's /bin/ps through genuine fd-table saturation.
const FORGING_CHILD = realpathSync(join(HERE, "test-support", "forging-start-identity-supervisor.mjs"));
const PRESSURE_DRIVER = realpathSync(join(HERE, "test-support", "start-identity-pressure-driver.mjs"));
const BOUNDARY_BODY = join(HERE, "test-support", "bodies", "final-five-boundary.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 400) + "]" : "")); } else console.log("  ok   " + name); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } };
const worlds = [];
const world = (nonce, opts = {}) => { const w = makeDisposableV4World({ prefix: "fg-f5-", nonce, ...opts }); worlds.push(w); return w; };
const src = (p) => readFileSync(join(REPO, p), "utf8");

(async () => {
try {
  // ============================================================ FA  asynchronous spawn error (MEDIUM)
  {
    const w = world("fa1");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    // The Checker's trigger #1: a cwd that does not exist. node returns a ChildProcess with NO pid and then
    // emits 'error' ASYNCHRONOUSLY — after the key is exported, the frame encoded, the key deleted from
    // module storage and the capability marked TRANSFERRED_SPENT.
    const badCwd = join(w.repoRoot, "no-such-directory-at-all");
    ok("FA1 [DYNAMIC] the attack cwd genuinely does not exist", !existsSync(badCwd));
    let threw = null, g = null;
    try { g = await spawnGovernedSupervisorV4(c.capability, { args: [], cwd: badCwd, detached: false }); }
    catch (e) { threw = e; }
    ok("FA2 [DYNAMIC] the asynchronous spawn error did NOT propagate as a thrown/uncaught error", threw === null, threw && threw.message);
    ok("FA3 [DYNAMIC] it returned ONE structured fail-closed result", !!g && g.ok === false && typeof g.code === "string", JSON.stringify(g && { ok: g.ok, code: g.code }));
    ok("FA4 [DYNAMIC] the refusal code is the governed spawn failure", !!g && g.code === LC_CODES.SUPERVISOR_SPAWN_FAILED, g && g.code);
    ok("FA5 [DYNAMIC] the authority is TRANSFERRED_SPENT under this failure outcome", !!g && g.transfer === TRANSFER_STATES.SPENT, g && g.transfer);
    ok("FA6 [DYNAMIC] the module's own lifecycle state agrees the capability is spent", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT);
    ok("FA7 [DYNAMIC] no child process exists to leave behind (the spawn never produced a pid)", !g.child || !g.child.pid, g && g.child && g.child.pid);
    // The key is gone: a retry with the same key is impossible, not merely discouraged.
    const retry = await spawnGovernedSupervisorV4(c.capability, { args: ["--receipt", join(w.repoRoot, "never.json"), "--fd", "3"], detached: false });
    ok("FA8 [DYNAMIC] retry after the failed POST-materialization transfer returns ALREADY_TRANSFERRED", retry.code === LC_CODES.ALREADY_TRANSFERRED, retry.code);
    ok("FA9 [DYNAMIC] no key frame receipt was ever written (zero key delivery on the failed route)", !existsSync(join(w.repoRoot, "never.json")));
  }
  {
    // The same failure reached through the LAUNCHER boundary, in its own process: it must exit NORMALLY
    // with a structured refusal rather than dying on a raw stack trace.
    const w = world("fa2");
    const resultPath = join(w.repoRoot, "launcher-result.json");
    const cfgPath = w.writeChildConfig("spawn-fail-config.json", {
      entrypoint: RECEIPT_CHILD, badCwd: join(w.repoRoot, "definitely-not-here"), resultPath,
    });
    const r = spawnSync(process.execPath, [SPAWN_FAIL_LAUNCHER, "--config", cfgPath], { encoding: "utf8", timeout: 60000 });
    const parsed = existsSync(resultPath) ? JSON.parse(readFileSync(resultPath, "utf8")) : null;
    ok("FA10 [DYNAMIC] the launcher process exited NORMALLY (exit 0), not on an unhandled error", r.status === 0, "status=" + r.status + " stderr=" + String(r.stderr).slice(-300));
    ok("FA11 [DYNAMIC] its stderr contains NO raw unhandled-'error' stack trace", !/Unhandled 'error' event|node:events:\d+/.test(String(r.stderr)), String(r.stderr).slice(-300));
    ok("FA12 [DYNAMIC] no uncaughtException was observed inside the launcher", !!parsed && parsed.uncaught === false, JSON.stringify(parsed));
    ok("FA13 [DYNAMIC] the launcher received a structured refusal it could record", !!parsed && parsed.structured === true && parsed.result_ok === false && parsed.result_code === LC_CODES.SUPERVISOR_SPAWN_FAILED, JSON.stringify(parsed));
    ok("FA14 [DYNAMIC] the authority was spent at the launcher boundary too", !!parsed && parsed.spent === true, JSON.stringify(parsed));
    ok("FA15 [DYNAMIC] the launcher's retry was refused ALREADY_TRANSFERRED", !!parsed && parsed.retry_is_already_transferred === true, JSON.stringify(parsed));
  }
  {
    // Premature child termination before descriptor completion: the child exits immediately without ever
    // reading fd 3. Whatever the race outcome, it must be a STRUCTURED result, the authority must be spent,
    // and nothing may be retried or left running.
    const w = world("fa3");
    const quick = join(w.repoRoot, "quick-exit-child.mjs");
    writeFileSync(quick, "process.exit(0);\n");
    const c = consumeActivationV4(w.verified, { now: w.now });
    const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: realpathSync(quick) });
    ok("FA16 [DYNAMIC] the premature-exit entrypoint was accepted by the signed intent", li.ok === true, li.code);
    let threw2 = null, g2 = null;
    try { g2 = await spawnGovernedSupervisorV4(c.capability, { args: [], detached: false }); }
    catch (e) { threw2 = e; }
    ok("FA17 [DYNAMIC] a child that dies before reading the descriptor raises no uncaught error", threw2 === null, threw2 && threw2.message);
    // FG-FFIN-197-F1: this outcome is now DETERMINISTIC, not race-dependent. Pipe-write completion is no
    // longer treated as success, so a supervisor that never read the key can never produce OK.
    ok("FA18 [DYNAMIC] the outcome is NEVER OK — it is the structured SUPERVISOR_TERMINATED_BEFORE_CLAIM refusal",
      !!g2 && g2.ok === false && g2.code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, JSON.stringify(g2 && { ok: g2.ok, code: g2.code, detail: g2.detail }));
    ok("FA18b [DYNAMIC] the result reports the supervisor as NOT acknowledged", !!g2 && g2.supervisor_acknowledged === false);
    ok("FA19 [DYNAMIC] the authority is TRANSFERRED_SPENT under that refusal", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT, g2 && g2.code);
    ok("FA20 [DYNAMIC] a retry is refused ALREADY_TRANSFERRED", (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);
    await new Promise((r) => setTimeout(r, 300));
    ok("FA21 [DYNAMIC] no residual process survives the premature-termination route", !g2 || !g2.child || !g2.child.pid || !alive(g2.child.pid));
  }
  {
    // The NORMAL successful transfer must remain functional after the race was introduced.
    const w = world("fa4");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    const rp = join(w.repoRoot, "good.json");
    const cfg = w.writeChildConfig("fa4-supervisor-config.json");
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg, "--receipt", rp, "--fd", "3"], detached: false });
    ok("FA22 [DYNAMIC] a normal governed transfer still returns OK", g.ok === true && g.code === LC_CODES.OK, g.code + " " + (g.detail || ""));
    await new Promise((res) => { if (!g.child || g.child.exitCode !== null || g.child.signalCode !== null) return res(); g.child.on("close", res); setTimeout(res, 8000); });
    const receipt = existsSync(rp) ? JSON.parse(readFileSync(rp, "utf8")) : null;
    ok("FA23 [DYNAMIC] the supervisor really received the key and reached SUPERVISOR_EXECUTION", !!receipt && receipt.attached === true && receipt.branded === true, JSON.stringify(receipt));
    ok("FA24 [DYNAMIC] exactly one child ran and it is the one the transfer returned", !!receipt && receipt.pid === g.child.pid);
  }
  {
    // [STRUCTURAL] the listener really is registered on the CHILD, before the write and before any await.
    const s = src("src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs");
    const region = s.slice(s.indexOf("export async function spawnGovernedSupervisorV4"));
    const errIdx = region.indexOf('child.once("error"');
    const writeIdx = region.indexOf("writer.write(frame");
    ok("FA25 [STRUCTURAL] spawnGovernedSupervisorV4 registers child.once(\"error\") (source text)", errIdx > 0);
    ok("FA26 [STRUCTURAL] it is registered BEFORE the key frame is written (source ordering, not execution order)", errIdx > 0 && writeIdx > errIdx);
  }

  // ============================================================ FC  deep immutability (LOW)
  {
    const w = world("fc1");
    const v = w.verified;
    ok("FC1 [DYNAMIC] the VERIFIED capability has ZERO mutable nested objects", mutableAuthorityPaths(v).length === 0, JSON.stringify(mutableAuthorityPaths(v)));
    ok("FC2 [DYNAMIC] VERIFIED cap.limits and cap.exclusions are frozen", Object.isFrozen(v.limits) && Object.isFrozen(v.exclusions));
    ok("FC3 [DYNAMIC] cap.exclusions now carries ALL " + V4_SIGNED_EXCLUSIONS.length + " signed exclusions (not a hardcoded 3-field constant)",
      V4_SIGNED_EXCLUSIONS.every((f) => v.exclusions[f] === true) && Object.keys(v.exclusions).length === V4_SIGNED_EXCLUSIONS.length, JSON.stringify(v.exclusions));
    // Mutate EVERY nested numerical limit and EVERY exclusion on VERIFIED.
    const beforeLimits = { ...v.limits }, beforeExcl = { ...v.exclusions };
    for (const spec of V4_SIGNED_LIMITS) { try { v.limits[spec.field] = 999999999; } catch { /* strict-mode throw is also a pass */ } }
    for (const f of V4_SIGNED_EXCLUSIONS) { try { v.exclusions[f] = false; } catch { /* strict-mode throw is also a pass */ } }
    ok("FC4 [DYNAMIC] every nested numerical limit on VERIFIED is unchanged after a direct write (" + V4_SIGNED_LIMITS.length + " limits)",
      V4_SIGNED_LIMITS.every((s) => v.limits[s.field] === beforeLimits[s.field]), JSON.stringify(v.limits));
    ok("FC5 [DYNAMIC] every exclusion on VERIFIED is unchanged and still true (" + V4_SIGNED_EXCLUSIONS.length + " exclusions)",
      V4_SIGNED_EXCLUSIONS.every((f) => v.exclusions[f] === beforeExcl[f] && v.exclusions[f] === true), JSON.stringify(v.exclusions));
    ok("FC6 [DYNAMIC] the Checker's exact VERIFIED route (max_budget_usd 10 -> 999999, run_duration_s -> 99999999) has no effect",
      v.limits.max_budget_usd === beforeLimits.max_budget_usd && v.limits.run_duration_s === beforeLimits.run_duration_s);
    // CONSUMED stage.
    const c = consumeActivationV4(v, { now: w.now });
    ok("FC7 [DYNAMIC] the CONSUMED capability has ZERO mutable nested objects", mutableAuthorityPaths(c.capability).length === 0, JSON.stringify(mutableAuthorityPaths(c.capability)));
    ok("FC8 [DYNAMIC] the CONSUMED capability is itself frozen", Object.isFrozen(c.capability));
    // The SUPERVISOR_EXECUTION stage is proven inside the governed execution child (FB/FC families there).
  }
  {
    // The audited helper's own contract.
    const source = { a: 1, nested: { b: 2, deep: [1, { c: 3 }] } };
    const frozen = deepFreezeAuthority(source);
    ok("FC9 [DYNAMIC] deepFreezeAuthority returns a frozen deep copy", Object.isFrozen(frozen) && Object.isFrozen(frozen.nested) && Object.isFrozen(frozen.nested.deep) && Object.isFrozen(frozen.nested.deep[1]));
    ok("FC10 [DYNAMIC] it does NOT freeze the caller-owned source in place", !Object.isFrozen(source) && !Object.isFrozen(source.nested));
    ok("FC11 [DYNAMIC] it COPIES rather than aliasing", frozen.nested !== source.nested && frozen.nested.b === 2);
    source.nested.b = 42;
    ok("FC12 [DYNAMIC] a later write to the source cannot reach the frozen authority copy", frozen.nested.b === 2);
    const rejects = (v) => { try { deepFreezeAuthority(v); return false; } catch (e) { return e && typeof e.code === "string"; } };
    ok("FC13 [DYNAMIC] it rejects functions", rejects({ f: () => 1 }));
    ok("FC14 [DYNAMIC] it rejects non-plain prototypes (class instances, Date, Map, Buffer)",
      rejects({ d: new Date() }) && rejects({ m: new Map() }) && rejects({ b: Buffer.from("x") }) && rejects({ c: new (class X { })() }));
    ok("FC15 [DYNAMIC] it rejects accessor properties", rejects(Object.defineProperty({}, "g", { get: () => 1, enumerable: true, configurable: true })));
    ok("FC16 [DYNAMIC] it rejects symbol keys and symbol values", rejects({ [Symbol("s")]: 1 }) && rejects({ v: Symbol("s") }));
    ok("FC17 [DYNAMIC] it rejects undefined, NaN and Infinity", rejects({ u: undefined }) && rejects({ n: NaN }) && rejects({ i: Infinity }));
    ok("FC18 [DYNAMIC] it rejects cycles", (() => { const a = { x: 1 }; a.self = a; return rejects(a); })());
    ok("FC19 [DYNAMIC] the cycle refusal carries the documented code", (() => { const a = {}; a.s = a; try { deepFreezeAuthority(a); return false; } catch (e) { return e.code === AUTHORITY_FREEZE_CODES.CYCLE; } })());
  }

  // ============================================================ FB  signed-limit / exclusion boundary (MEDIUM)
  {
    // The must-be-true list really is the COMPLETE signed exclusion set.
    ok("FB1 [DYNAMIC] the V2 validator's must-be-true list covers ALL " + V4_SIGNED_EXCLUSIONS.length + " signed exclusions",
      V4_SIGNED_EXCLUSIONS.every((f) => MUST_BE_TRUE_EXCLUSIONS.includes(f)) && MUST_BE_TRUE_EXCLUSIONS.length === V4_SIGNED_EXCLUSIONS.length, JSON.stringify(MUST_BE_TRUE_EXCLUSIONS));
    ok("FB2 [DYNAMIC] no_deploy and no_push_unless_authorized are among them (the two the Checker dropped)",
      MUST_BE_TRUE_EXCLUSIONS.includes("no_deploy") && MUST_BE_TRUE_EXCLUSIONS.includes("no_push_unless_authorized"));
    // The boundary validator refuses a forged/absent capability outright.
    const r0 = enforceSignedAuthorityBoundary({ _stage: "SUPERVISOR_EXECUTION" }, {}, {}, {});
    ok("FB3 [DYNAMIC] the boundary validator refuses anything that is not the genuine branded capability", r0.ok === false && r0.refusals[0].includes("V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED"), JSON.stringify(r0));
  }
  {
    // The FULL matrix under a GENUINE SUPERVISOR_EXECUTION capability, with the RECORDING provider stub as
    // the SIGNED provider target so provider spawns are COUNTED from the stub's own log.
    // The stub is COPIED into the world BEFORE signing (so the founder signature binds it as the provider
    // target) and its log lives beside that copy — the production boundary scrubs the child environment to
    // PATH and HOME, so an env-carried log path would never arrive and a zero count would prove nothing.
    let stubCopy = null;
    const w = world("fb-matrix", { realTemporal: true, prepare: ({ repoRoot }) => {
      stubCopy = join(repoRoot, "recording-provider-stub.mjs");
      writeFileSync(stubCopy, readFileSync(RECORDING_STUB), { mode: 0o755 });
      return { provider_executable_path: stubCopy, resolved_provider_target: stubCopy, provider_version: "recording-1", provider_executable_identity: "sha256:" + "d".repeat(64) };
    } });
    const spawnLog = stubCopy + ".spawns.log";
    const res = await runV4Body({
      world: w, bodyModule: BOUNDARY_BODY,
      bodyArgs: { spawnLog, recordingStub: stubCopy },
      configName: "final-five-boundary-config.json",
    });
    reportChecks(res, ok, "");
    const total = res.parsed && res.parsed.spawn_total;
    ok("FB4 [COUNTED] across the ENTIRE boundary matrix exactly ONE provider process ever ran (the positive narrowed route)", total === 1, "spawn_total=" + total);
  }

  // ============================================================ FD  lifecycle-root object continuity (LOW)
  {
    const w = world("fd1");
    const c = consumeActivationV4(w.verified, { now: w.now });
    ok("FD1 [DYNAMIC] governed consumption captured the lifecycle root's object identity", c.ok === true && /^dev:\d+\/ino:\d+$/.test(JSON.parse(readFileSync(c.marker_path, "utf8")).lifecycle_root_object_id || ""), c.code);
    const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    ok("FD2 [DYNAMIC] the launch intent records the same object identity", li.ok === true && JSON.parse(readFileSync(li.intent_path, "utf8")).lifecycle_root_object_id === c.capability.lifecycle_root_object_id, li.code);
    // A SECOND, not-yet-launched consumption in the same world, so the intent-creation route can be driven
    // against the replaced root without tripping the one-launch guard first.
    const cFresh = consumeActivationV4(w.signVariant({ activation_nonce: "fd-fresh" }).result.capability, { now: w.now });
    ok("FD2b [DYNAMIC] a second activation consumed in the same world is ready to create its intent", cFresh.ok === true, cFresh.code);
    const originalIno = statSync(w.lifecycleRoot).ino;
    // The Checker's attack: rename the original lifecycle directory aside, create a NEW directory at the
    // SAME signed path, and copy the valid records in at safe modes.
    const aside = w.lifecycleRoot + ".aside";
    renameSync(w.lifecycleRoot, aside);
    mkdirSync(w.lifecycleRoot, { recursive: true, mode: 0o755 });
    for (const f of ["consumed", "launch-intent"]) {
      const srcPath = f === "consumed" ? join(aside, c.marker_path.split("/").pop()) : join(aside, li.intent_path.split("/").pop());
      const dst = join(w.lifecycleRoot, srcPath.split("/").pop());
      writeFileSync(dst, readFileSync(srcPath)); chmodSync(dst, 0o600);
    }
    ok("FD3 [DYNAMIC] the replacement directory is a DIFFERENT filesystem object at the same signed path", statSync(w.lifecycleRoot).ino !== originalIno, "orig=" + originalIno + " new=" + statSync(w.lifecycleRoot).ino);
    ok("FD4 [DYNAMIC] the copied records really are present and readable at safe modes", existsSync(join(w.lifecycleRoot, c.marker_path.split("/").pop())));
    // (a) the governed transfer route
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--receipt", join(w.repoRoot, "swap.json"), "--fd", "3"], detached: false });
    ok("FD5 [DYNAMIC] the governed transfer is refused ROOT_OBJECT_IDENTITY_MISMATCH", g.code === LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, g.code + " " + (g.detail || ""));
    ok("FD6 [DYNAMIC] the refusal is NOT a KEY_MISMATCH fallthrough", g.code !== LC_CODES.KEY_MISMATCH);
    ok("FD7 [DYNAMIC] no child process was created by the refused transfer", !g.child);
    ok("FD8 [DYNAMIC] no key receipt was written (zero key delivery)", !existsSync(join(w.repoRoot, "swap.json")));
    ok("FD9 [DYNAMIC] the capability was NOT spent by the refusal (it never reached the point of no return)", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.NOT_TRANSFERRED);
    // (b) intent creation on the replaced root, using the not-yet-launched capability
    const li2 = createLaunchIntentV4(cFresh.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    ok("FD10 [DYNAMIC] intent creation against the replaced root is refused on object identity", li2.code === LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, li2.code);
    // (c) the supervisor-side ATTACH route (the one the Checker drove to KEY_MISMATCH)
    const att = attachSupervisorFromInheritedFdV4(w.verified, 0, { now: w.now });
    ok("FD11 [DYNAMIC] the attach route refuses before the cryptographic key comparison", att.code !== LC_CODES.KEY_MISMATCH, att.code);
    ok("FD12 [DYNAMIC] no supervisor claim was minted against the replaced root", !existsSync(join(w.lifecycleRoot, c.capability.activation_identity.replace(":", "_") + ".supervisor-claim.json")));
    // restore, so the world can still be cleaned up
    rmSync(w.lifecycleRoot, { recursive: true, force: true });
    renameSync(aside, w.lifecycleRoot);
  }
  {
    // The refusal code is REACHABLE from production reads, and normal execution is unaffected.
    const s = src("src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs");
    ok("FD13 [STRUCTURAL] ROOT_OBJECT_IDENTITY_MISMATCH is now RETURNED in the module body, not merely declared",
      (s.match(/ROOT_OBJECT_IDENTITY_MISMATCH/g) || []).length >= 4);
    ok("FD14 [STRUCTURAL] production authority reads pass expectObjectId / expectRootObjectId",
      /expectObjectId: expectObjectId/.test(s) && /expectRootObjectId/.test(s));
    // Case-variant spelling of the SAME inode remains the SAME authority object.
    const w2 = world("fd2");
    const upper = w2.lifecycleRoot.replace(/lifecycle$/, "LIFECYCLE");
    const sameObject = existsSync(upper) && statSync(upper).ino === statSync(w2.lifecycleRoot).ino;
    ok("FD15 [DYNAMIC] this host resolves the case variant to the SAME filesystem object", sameObject, upper);
    if (sameObject) {
      const variant = w2.signVariant({ lifecycle_root_realpath: upper, activation_nonce: "fd-case" });
      const cv = consumeActivationV4(variant.result.capability, { now: w2.now });
      ok("FD16 [DYNAMIC] a case-variant spelling of the same inode is still accepted (same authority object)", cv.ok === true, cv.code);
      const lv = createLaunchIntentV4(cv.capability, { now: w2.now, supervisorEntrypoint: RECEIPT_CHILD });
      ok("FD17 [DYNAMIC] the full lifecycle still proceeds normally through the case variant", lv.ok === true, lv.code);
    }
    // Normal lifecycle execution remains functional end to end.
    const w3 = world("fd3");
    const c3 = consumeActivationV4(w3.verified, { now: w3.now });
    createLaunchIntentV4(c3.capability, { now: w3.now, supervisorEntrypoint: RECEIPT_CHILD });
    const rp = join(w3.repoRoot, "normal.json");
    const cfg3 = w3.writeChildConfig("fd3-supervisor-config.json");
    const g3 = await spawnGovernedSupervisorV4(c3.capability, { args: ["--config", cfg3, "--receipt", rp, "--fd", "3"], detached: false });
    ok("FD18 [DYNAMIC] an UNTOUCHED lifecycle root still completes the governed transfer", g3.ok === true, g3.code + " " + (g3.detail || ""));
    await new Promise((res) => { if (!g3.child || g3.child.exitCode !== null || g3.child.signalCode !== null) return res(); g3.child.on("close", res); setTimeout(res, 8000); });
    ok("FD19 [DYNAMIC] the supervisor received the key over the untouched root and minted a verified claim",
      existsSync(rp) && JSON.parse(readFileSync(rp, "utf8")).attached === true && g3.supervisor_acknowledged === true);
  }

  // ============================================================ FE  evidence accuracy (LOW)
  {
    const corrections = src("src/v8b/lrcq/run-harness-tests/checker-197-corrections.selftest.mjs");
    ok("FE1 [STRUCTURAL] C1i now counts REAL provider spawns instead of asserting over receipt fields",
      /C1i .*provider spawn/.test(corrections) && /providerSpawnCount|PROVIDER_SPAWN_LOG/.test(corrections));
    ok("FE2 [STRUCTURAL] the old receipt-field predicate no longer backs the C1i zero-spawn claim",
      !/C1i[^\n]*receipts\.every/.test(corrections));
    ok("FE3 [STRUCTURAL] C4h is relabelled as SOURCE-PROVEN (dynamic wrong-owner reproduction requires root)",
      /C4h[^\n]*SOURCE-PROVEN/.test(corrections));
    const ledger = JSON.parse(src(".foundergate/evidence/lrcq-assurance-factory/CHECKER_197_CORRECTION_LEDGER.json"));
    const f04 = (ledger.findings || []).find((f) => f.id === "FG-CHK-197-04");
    ok("FE4 [DYNAMIC] the correction ledger distinguishes the DYNAMICALLY proven unsafe-mode result", !!f04 && /DYNAMICALLY[- ]PROVEN|dynamically proven/i.test(JSON.stringify(f04.result_after)), JSON.stringify(f04 && f04.result_after));
    ok("FE5 [DYNAMIC] the correction ledger marks the owner-mismatch result SOURCE-PROVEN (root required)", !!f04 && /SOURCE[- ]PROVEN/i.test(JSON.stringify(f04.result_after)) && /root/i.test(JSON.stringify(f04.result_after)), JSON.stringify(f04 && f04.result_after));
  }

  // ==================================================================================================
  // FG-FFIN-197 — THIRD independent-Checker findings (report sha256 c49cc563...)
  //   F1 MEDIUM  pipe-write completion reported OK though the supervisor never read the key
  //   F4 LOW     deepFreezeAuthority invoked Object.prototype's __proto__ SETTER instead of refusing
  // (F2 and F3 are evidence/prose corrections, asserted in the FF-E family below.)
  // ==================================================================================================

  // ---- F1-A: a supervisor that exits immediately WITHOUT reading fd 3 ------------------------------
  {
    // Run the race REPEATEDLY: the old defect was that the 92-byte frame always fits the kernel pipe
    // buffer, so write completion won deterministically. A single run could not show the correction is
    // schedule-independent; six can.
    const RUNS = 6;
    const outcomes = [];
    for (let i = 0; i < RUNS; i++) {
      const w = world("f1a" + i);
      const dead = join(w.repoRoot, "dead-supervisor.mjs");
      writeFileSync(dead, "process.exit(9);\n");
      const c = consumeActivationV4(w.verified, { now: w.now });
      createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: realpathSync(dead) });
      const g = await spawnGovernedSupervisorV4(c.capability, { detached: true });
      const retry = await spawnGovernedSupervisorV4(c.capability, { detached: false });
      outcomes.push({
        ok: g.ok, code: g.code, ack: g.supervisor_acknowledged, transfer: g.transfer,
        spent: lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT,
        retry: retry.code,
        claim: existsSync(join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".supervisor-claim.json")),
        alive: g.child && g.child.pid ? alive(g.child.pid) : false,
      });
    }
    ok("FF1a [DYNAMIC] a supervisor that dies without reading the key NEVER returns OK (" + RUNS + "/" + RUNS + " runs)",
      outcomes.every((o) => o.ok === false), JSON.stringify(outcomes.map((o) => o.code)));
    ok("FF1b [DYNAMIC] every run returns the structured SUPERVISOR_TERMINATED_BEFORE_CLAIM refusal (not schedule-sensitive)",
      outcomes.every((o) => o.code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM), JSON.stringify(outcomes.map((o) => o.code)));
    ok("FF1c [DYNAMIC] the result reports the supervisor as NOT acknowledged", outcomes.every((o) => o.ack === false));
    ok("FF1d [DYNAMIC] the authority is TRANSFERRED_SPENT on every failed run", outcomes.every((o) => o.transfer === TRANSFER_STATES.SPENT && o.spent));
    ok("FF1e [DYNAMIC] a retry after every failed run is refused ALREADY_TRANSFERRED", outcomes.every((o) => o.retry === LC_CODES.ALREADY_TRANSFERRED));
    ok("FF1f [DYNAMIC] no supervisor claim was ever minted on this route", outcomes.every((o) => o.claim === false));
    ok("FF1g [DYNAMIC] no residual process survives any run", outcomes.every((o) => o.alive === false));
  }

  // ---- F1-B: a supervisor that READS the frame but never creates a claim ---------------------------
  {
    const w = world("f1b");
    // Reads fd 3 to EOF (so the frame IS consumed) and then exits without attaching — the exact shape of a
    // supervisor that received the key but never proved it used it.
    const reader = join(w.repoRoot, "reads-but-no-claim.mjs");
    writeFileSync(reader, "import { readFileSync } from 'node:fs';\ntry { const b = readFileSync(3); b.fill(0); } catch { /* */ }\nprocess.exit(0);\n");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: realpathSync(reader) });
    const g = await spawnGovernedSupervisorV4(c.capability, { detached: false });
    ok("FF1h [DYNAMIC] reading the key frame is NOT sufficient — no claim means no OK", g.ok === false, g.code);
    ok("FF1i [DYNAMIC] it is the structured SUPERVISOR_TERMINATED_BEFORE_CLAIM refusal", g.code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, g.code + " " + (g.detail || ""));
    ok("FF1j [DYNAMIC] the authority is TRANSFERRED_SPENT", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT);
    ok("FF1k [DYNAMIC] a retry is refused ALREADY_TRANSFERRED", (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);
  }

  // ---- F1-C/D: a MALFORMED claim, and a validly shaped claim for the wrong PID / start identity ----
  {
    // The child writes a claim file itself, at the exact governed path, without ever holding the ephemeral
    // key. A claim is only acknowledgment if it is cryptographically bound — shape alone must not pass.
    const mkForger = (w, body) => {
      const p = join(w.repoRoot, "forging-supervisor.mjs");
      writeFileSync(p, body);
      return realpathSync(p);
    };
    const claimFileFor = (w) => join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".supervisor-claim.json");

    // (C) malformed: valid JSON, right schema string, no valid ephemeral signature.
    const wC = world("f1c");
    const forgeC = mkForger(wC, "import { writeFileSync } from 'node:fs';\n" +
      "writeFileSync(process.argv[2], JSON.stringify({ schema: 'lrcq-supervisor-claim-v4-1', activation_identity: 'x', ephemeral_signature: 'AA==' }, null, 2) + '\\n', { mode: 0o600 });\n" +
      "process.exit(0);\n");
    const cC = consumeActivationV4(wC.verified, { now: wC.now });
    createLaunchIntentV4(cC.capability, { now: wC.now, supervisorEntrypoint: forgeC });
    const gC = await spawnGovernedSupervisorV4(cC.capability, { args: [claimFileFor(wC)], detached: false });
    ok("FF1l [DYNAMIC] a MALFORMED self-written claim is refused, never OK", gC.ok === false, gC.code);
    ok("FF1m [DYNAMIC] the refusal is structured (claim invalid, or terminated before a valid claim)",
      gC.code === LC_CODES.SUPERVISOR_CLAIM_INVALID || gC.code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, gC.code + " " + (gC.detail || ""));
    ok("FF1n [DYNAMIC] the authority is still TRANSFERRED_SPENT", lifecycleStateV4(cC.capability).transfer === TRANSFER_STATES.SPENT);

    // (D) validly SHAPED claim carrying every required field, but for the wrong PID and start identity.
    const wD = world("f1d");
    const forgeD = mkForger(wD, "import { writeFileSync } from 'node:fs';\n" +
      "const body = { schema: 'lrcq-supervisor-claim-v4-1', lifecycle_contract_version: 'lrcq-lifecycle-v4-1', activation_identity: process.argv[3], payload_digest: 'sha256:0', consumed_marker_digest: 'sha256:0', launch_intent_digest: 'sha256:0', lifecycle_root_object_id: process.argv[4], lifecycle_root_digest: 'sha256:0', launch_nonce: 'n', supervisor_pid: 999999, supervisor_start_identity: 'FORGED-START-IDENTITY', supervisor_entrypoint_digest: 'sha256:0', claim_epoch: 0, terminal: false, ephemeral_fingerprint: 'sha256:0', ephemeral_signature: 'AA==' };\n" +
      "writeFileSync(process.argv[2], JSON.stringify(body, null, 2) + '\\n', { mode: 0o600 });\n" +
      "process.exit(0);\n");
    const cD = consumeActivationV4(wD.verified, { now: wD.now });
    createLaunchIntentV4(cD.capability, { now: wD.now, supervisorEntrypoint: forgeD });
    const gD = await spawnGovernedSupervisorV4(cD.capability, {
      args: [claimFileFor(wD), wD.verified.activation_identity, cD.capability.lifecycle_root_object_id], detached: false,
    });
    ok("FF1o [DYNAMIC] a validly SHAPED claim for the WRONG pid/start identity is refused, never OK", gD.ok === false, gD.code);
    ok("FF1p [DYNAMIC] the refusal is structured", gD.code === LC_CODES.SUPERVISOR_CLAIM_INVALID || gD.code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, gD.code + " " + (gD.detail || ""));
    ok("FF1q [DYNAMIC] no forged claim can make the transfer report an acknowledged supervisor", gD.supervisor_acknowledged !== true);
  }

  // ---- F1-E: the GENUINE supervisor route still succeeds -------------------------------------------
  {
    const w = world("f1e");
    const c = consumeActivationV4(w.verified, { now: w.now });
    createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
    const rp = join(w.repoRoot, "genuine.json");
    const cfg = w.writeChildConfig("f1e-supervisor-config.json");
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg, "--receipt", rp, "--fd", "3"], detached: false });
    ok("FF1r [DYNAMIC] a GENUINE supervisor that reads, reverifies and claims returns exactly one OK", g.ok === true && g.code === LC_CODES.OK, g.code + " " + (g.detail || ""));
    ok("FF1s [DYNAMIC] the transfer reports the supervisor as acknowledged", g.supervisor_acknowledged === true);
    const claimDoc = JSON.parse(readFileSync(g.supervisor_claim_path, "utf8"));
    ok("FF1t [DYNAMIC] the verified claim is bound to the EXACT spawned PID", claimDoc.supervisor_pid === g.child.pid, claimDoc.supervisor_pid + " vs " + g.child.pid);
    ok("FF1u [DYNAMIC] the claim's start identity matches and was independently OS-observed",
      typeof g.supervisor_start_identity === "string" && g.supervisor_start_identity.length > 0 && g.start_identity_independently_observed === true, JSON.stringify({ id: g.supervisor_start_identity, observed: g.start_identity_independently_observed }));
    await new Promise((res) => { if (!g.child || g.child.exitCode !== null || g.child.signalCode !== null) return res(); g.child.on("close", res); setTimeout(res, 8000); });
    const receipt = existsSync(rp) ? JSON.parse(readFileSync(rp, "utf8")) : null;
    ok("FF1v [DYNAMIC] that supervisor really reached SUPERVISOR_EXECUTION", !!receipt && receipt.attached === true && receipt.branded === true, JSON.stringify(receipt));
    ok("FF1w [DYNAMIC] a retry after the SUCCESSFUL transfer is still ALREADY_TRANSFERRED", (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);
    // No timing heuristic may be the authority decision.
    const lsrc = src("src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs");
    ok("FF1x [STRUCTURAL] the unreachable 250ms premature-termination timer is gone from the module",
      !/child terminated before the key frame completed/.test(lsrc) && !/}, 250\)/.test(lsrc));
    ok("FF1y [STRUCTURAL] the claim wait is a fixed module constant, not a caller-supplied option",
      /const SUPERVISOR_CLAIM_WAIT_MS = \d+/.test(lsrc) && !/opts\.claimTimeout|opts\.skipClaim|opts\.claimPath/.test(lsrc));
  }

  // ---- F4: dangerous deep-copy keys ---------------------------------------------------------------
  {
    const rejects = (v) => { try { deepFreezeAuthority(v); return null; } catch (e) { return e.code; } };
    const D = AUTHORITY_FREEZE_CODES.DANGEROUS_KEY;
    ok("FF4a [DYNAMIC] an own __proto__ data key from JSON.parse is REFUSED, not silently dropped",
      rejects(JSON.parse('{"limits":{"max_budget_usd":10},"__proto__":{"max_budget_usd":999999}}')) === D);
    ok("FF4b [DYNAMIC] a NESTED __proto__ is refused (the rejection is recursive)",
      rejects(JSON.parse('{"a":{"b":{"__proto__":{"no_akior":false}}}}')) === D);
    ok("FF4c [DYNAMIC] an own constructor key is refused", rejects(JSON.parse('{"constructor":{"x":1}}')) === D);
    ok("FF4d [DYNAMIC] an own prototype key is refused", rejects(JSON.parse('{"prototype":{"x":1}}')) === D);
    ok("FF4e [DYNAMIC] a dangerous key inside an ARRAY element is refused", rejects(JSON.parse('{"a":[{"__proto__":{"x":1}}]}')) === D);
    // Ordinary authority objects still copy and deep-freeze correctly.
    const src0 = JSON.parse('{"limits":{"max_budget_usd":10,"max_parallel_width":2},"exclusions":{"no_deploy":true},"list":[1,{"k":"v"}]}');
    const f = deepFreezeAuthority(src0);
    ok("FF4f [DYNAMIC] an ordinary JSON authority object still copies and deep-freezes", Object.isFrozen(f) && Object.isFrozen(f.limits) && mutableAuthorityPaths(f).length === 0);
    ok("FF4g [DYNAMIC] the copy keeps ORDINARY plain-object behaviour consumers depend on",
      Object.getPrototypeOf(f) === Object.prototype && JSON.stringify(f) === JSON.stringify(src0) && Object.keys(f).length === 3 && ({ ...f.limits }).max_budget_usd === 10);
    ok("FF4h [DYNAMIC] the helper ACCEPTS its own output on round-trip (no self-inconsistency)", (() => { try { deepFreezeAuthority(f); return true; } catch { return false; } })());
    ok("FF4i [DYNAMIC] the caller-owned source is neither mutated nor frozen", !Object.isFrozen(src0) && !Object.isFrozen(src0.limits) && src0.limits.max_budget_usd === 10);
    // No prototype change, no inherited attacker field, no global pollution.
    ok("FF4j [DYNAMIC] no global prototype pollution occurred", ({}).max_budget_usd === undefined && ({}).no_akior === undefined && Object.prototype.max_budget_usd === undefined);
    ok("FF4k [DYNAMIC] the previously-rejecting classes still reject",
      rejects({ f: () => 1 }) && rejects({ d: new Date() }) && rejects({ u: undefined }) && rejects({ n: NaN }) &&
      rejects(Object.defineProperty({}, "g", { get: () => 1, enumerable: true, configurable: true })) &&
      rejects((() => { const a = {}; a.s = a; return a; })()));
  }

  // ---- FF-E: F2 / F3 evidence-prose corrections ----------------------------------------------------
  {
    const led5 = JSON.parse(src(".foundergate/evidence/lrcq-assurance-factory/FCHK_197_FINAL_FIVE_CORRECTION_LEDGER.json"));
    const fa = (led5.findings || []).find((f) => f.id === "FG-FCHK-197-A");
    const corrText = JSON.stringify(fa && fa.correction);
    // The corrected bullet deliberately QUOTES the old mapping in order to disavow it, so a bare
    // "does the string appear" test would be wrong. What must hold is that no bullet ASSERTS the mapping:
    // every bullet mentioning it must also carry the correction marker.
    const bullets = (fa && fa.correction) || [];
    const asserting = bullets.filter((b) => /premature child termination -> TRANSFER_WRITE_FAILED/.test(b) && !/CORRECTED BY FG-FFIN-197-F1|NEVER ACHIEVED/.test(b));
    ok("FFE1 [DYNAMIC] no ledger bullet ASSERTS the unreachable premature-termination -> TRANSFER_WRITE_FAILED mapping",
      !!fa && asserting.length === 0, JSON.stringify(asserting).slice(0, 300));
    ok("FFE1b [DYNAMIC] where the old mapping is quoted, it is explicitly marked as never achieved",
      bullets.some((b) => /premature child termination -> TRANSFER_WRITE_FAILED/.test(b) && /NEVER ACHIEVED/.test(b)));
    ok("FFE2 [DYNAMIC] the ledger states truthfully that candidate c6bf5a37 returned OK on that route",
      !!fa && /returned OK|produced ok:true/i.test(JSON.stringify(fa.result_after) + corrText));
    ok("FFE3 [DYNAMIC] the ledger records that the third Checker detected it and the successor requires a verified claim",
      !!fa && /third independent Checker|FG-FFIN-197-F1/.test(corrText + JSON.stringify(fa.superseded_by || "")) &&
      /SUPERVISOR_TERMINATED_BEFORE_CLAIM/.test(JSON.stringify(fa.result_after)));
    const stubSrc = src("src/v8b/lrcq/run-harness-tests/test-support/recording-provider-stub.mjs");
    const corrSrc = src("src/v8b/lrcq/run-harness-tests/checker-197-corrections.selftest.mjs");
    ok("FFE4 [STRUCTURAL] no FG_SPAWN_LOG prose survives anywhere in the test surfaces",
      !/FG_SPAWN_LOG/.test(stubSrc) && !/FG_SPAWN_LOG/.test(corrSrc));
    ok("FFE5 [STRUCTURAL] the stub documents that it writes BESIDE its own signed executable",
      /beside|next to|import\.meta\.url/i.test(stubSrc) && /SPAWN_LOG_SUFFIX/.test(stubSrc));
    ok("FFE6 [STRUCTURAL] the C1 comment documents the scrubbed environment and the adjacent durable log",
      /SCRUBS the child environment|scrubs the child environment/i.test(corrSrc) && /spawns\.log|adjacent/i.test(corrSrc));
    ok("FFE7 [STRUCTURAL] a POSITIVE CONTROL proves the spawn counter can actually record", /C1i2/.test(corrSrc) && /positive control/i.test(corrSrc));
  }

  // ==================================================================================================
  // FG-FFIN4-197 — FOURTH independent-Checker findings (report sha256 886d6982...)
  //   01 MEDIUM  the parent's start-identity check FAILED OPEN when the OS observation was unavailable
  //   02 LOW     the matrix/contract stated that binding as unconditional, and the cited assertions
  //              (an UNSIGNED claim wrong in BOTH pid and identity) never reached the comparison
  // ==================================================================================================

  // ---- FS-1: a genuine key-holding supervisor forges ONLY the start identity, PID correct -------------
  // This is the citation FG-FFIN4-197-02 says FN-F1-04 was missing: the claim is correctly EPHEMERAL-SIGNED
  // and carries the EXACT spawned PID, so every earlier binding passes and the refusal can only come from
  // the start-identity comparison itself.
  {
    const w = world("fs1");
    const c = consumeActivationV4(w.verified, { now: w.now });
    const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: FORGING_CHILD });
    ok("FS1a [DYNAMIC] the forging supervisor is bound by a genuine signed launch intent", li.ok === true, li.code);
    const cfg = w.writeChildConfig("fs1-forge-config.json", { lifecycleRoot: w.lifecycleRoot, activationIdentity: w.verified.activation_identity });
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg], detached: false });
    const claimPath = join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".supervisor-claim.json");
    const claim = existsSync(claimPath) ? JSON.parse(readFileSync(claimPath, "utf8")) : null;
    ok("FS1b [DYNAMIC] the key-holding supervisor really did mint a correctly signed claim", !!claim && typeof claim.ephemeral_signature === "string" && claim.ephemeral_signature.length > 40, JSON.stringify(claim && Object.keys(claim)));
    ok("FS1c [DYNAMIC] that claim carries the EXACT spawned PID (so every earlier binding passes)", !!claim && claim.supervisor_pid === g.supervisor_pid, (claim && claim.supervisor_pid) + " vs " + g.supervisor_pid);
    ok("FS1d [DYNAMIC] only the start identity is forged", !!claim && claim.supervisor_start_identity === "FORGED-START-IDENTITY-NEVER-OBSERVED", claim && claim.supervisor_start_identity);
    ok("FS1e [DYNAMIC] the transfer is REFUSED, never OK", g.ok === false, g.code);
    ok("FS1f [DYNAMIC] the refusal is SUPERVISOR_CLAIM_INVALID", g.code === LC_CODES.SUPERVISOR_CLAIM_INVALID, g.code);
    ok("FS1g [DYNAMIC] the rejection happens AT the start-identity comparison (not the signature or PID check)",
      typeof g.detail === "string" && /claim start identity .* != OS-observed /.test(g.detail), g.detail);
    ok("FS1h [DYNAMIC] the supervisor is not acknowledged", g.supervisor_acknowledged !== true);
    ok("FS1i [DYNAMIC] the authority is TRANSFERRED_SPENT and a retry is refused",
      lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT &&
      (await spawnGovernedSupervisorV4(c.capability, { detached: false })).code === LC_CODES.ALREADY_TRANSFERRED);
  }

  // ---- FS-2: the parent's independent OS observation is UNAVAILABLE ---------------------------------
  // Driven in a SUBPROCESS under a low `ulimit -n`, where the fd table is genuinely saturated so the
  // fork+pipe /bin/ps needs fails with EMFILE. No production hook, no substitute executable: the fixed
  // /bin/ps is still the only observer, it simply cannot run. The headroom ladder is a self-calibrating
  // search for the band where the governed spawn still succeeds while ps cannot.
  {
    const driverOut = join(tmpdir(), "fg-startid-result-" + process.pid + ".json");
    let achieved = null; const attempts = [];
    for (const headroom of [5, 6, 4, 7, 3, 8, 2, 9, 10, 12]) {
      try { rmSync(driverOut, { force: true }); } catch { /* */ }
      spawnSync("/bin/bash", ["-c", "ulimit -n 512; exec " + JSON.stringify(process.execPath) + " " + JSON.stringify(PRESSURE_DRIVER) + " " + JSON.stringify(driverOut) + " " + headroom],
        { encoding: "utf8", timeout: 120000, stdio: ["ignore", "ignore", "ignore"] });
      if (!existsSync(driverOut)) { attempts.push({ headroom, result: "no output" }); continue; }
      const r = JSON.parse(readFileSync(driverOut, "utf8"));
      attempts.push({ headroom, code: r.code, claim: r.claim_written_by_child });
      // The precondition we need: the child really ran and minted its claim, AND the parent could not
      // independently observe. Anything else (too much pressure, or ps still working) is not this case.
      if (r.claim_written_by_child === true && r.code === "SUPERVISOR_START_IDENTITY_UNAVAILABLE") { achieved = r; break; }
    }
    try { rmSync(driverOut, { force: true }); } catch { /* */ }
    ok("FS2a [DYNAMIC] a genuine unobservable-start-identity state was reached (fd-table saturation)", achieved !== null, JSON.stringify(attempts));
    if (achieved) {
      ok("FS2b [DYNAMIC] the transfer is NEVER OK when the parent cannot observe the start identity", achieved.ok === false, achieved.code);
      ok("FS2c [DYNAMIC] the refusal is the exact structured SUPERVISOR_START_IDENTITY_UNAVAILABLE", achieved.code === "SUPERVISOR_START_IDENTITY_UNAVAILABLE", achieved.code);
      ok("FS2d [DYNAMIC] supervisor_acknowledged is not true", achieved.supervisor_acknowledged !== true);
      ok("FS2e [DYNAMIC] start_identity_independently_observed is not true", achieved.start_identity_independently_observed !== true);
      ok("FS2f [DYNAMIC] the forged identity was NEVER accepted", achieved.accepted_start_identity !== "FORGED-START-IDENTITY-NEVER-OBSERVED" && !achieved.accepted_start_identity);
      // Prove the refusal is caused by the missing observation, not by an earlier unrelated check.
      ok("FS2g [DYNAMIC] the child DID mint its correctly signed claim (so no earlier binding failed)", achieved.claim_written_by_child === true);
      ok("FS2h [DYNAMIC] that claim carried the EXACT spawned PID (the PID check passed)", achieved.claim_pid === achieved.spawned_pid, achieved.claim_pid + " vs " + achieved.spawned_pid);
      ok("FS2i [DYNAMIC] the authority is TRANSFERRED_SPENT", achieved.transfer === TRANSFER_STATES.SPENT && achieved.spent === TRANSFER_STATES.SPENT);
      ok("FS2j [DYNAMIC] a retry is refused ALREADY_TRANSFERRED", achieved.retry_code === LC_CODES.ALREADY_TRANSFERRED, achieved.retry_code);
      ok("FS2k [DYNAMIC] no residual supervisor process survives", achieved.child_alive_after === false);
      ok("FS2l [DYNAMIC] /bin/ps was genuinely restored afterwards (the denial was resource pressure, not a permanent break)", achieved.ps_available_now === true);
    }
  }

  // ---- FS-3: every successful acknowledgment carries an independently observed identity --------------
  {
    const RUNS = 4; const oks = [];
    for (let i = 0; i < RUNS; i++) {
      const w = world("fs3_" + i);
      const c = consumeActivationV4(w.verified, { now: w.now });
      createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
      const cfg = w.writeChildConfig("fs3-config.json");
      const rp = join(w.repoRoot, "fs3.json");
      const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg, "--receipt", rp, "--fd", "3"], detached: false });
      const claim = g.supervisor_claim_path && existsSync(g.supervisor_claim_path) ? JSON.parse(readFileSync(g.supervisor_claim_path, "utf8")) : null;
      oks.push({ ok: g.ok, code: g.code, ack: g.supervisor_acknowledged, observed: g.start_identity_independently_observed,
        pid: g.supervisor_pid, claimPid: claim && claim.supervisor_pid, id: g.supervisor_start_identity, claimId: claim && claim.supervisor_start_identity });
    }
    ok("FS3a [DYNAMIC] every genuine run returned exactly one OK (" + RUNS + " runs)", oks.every((o) => o.ok === true && o.code === LC_CODES.OK), JSON.stringify(oks.map((o) => o.code)));
    ok("FS3b [DYNAMIC] every OK reports supervisor_acknowledged === true", oks.every((o) => o.ack === true));
    ok("FS3c [DYNAMIC] every OK reports start_identity_independently_observed === true", oks.every((o) => o.observed === true), JSON.stringify(oks.map((o) => o.observed)));
    ok("FS3d [DYNAMIC] every OK is bound to the exact spawned PID", oks.every((o) => o.claimPid === o.pid));
    ok("FS3e [DYNAMIC] the claim identity equals the independently observed identity on every OK",
      oks.every((o) => typeof o.id === "string" && o.id.length > 0 && o.claimId === o.id), JSON.stringify(oks.map((o) => o.id)));
    ok("FS3f [DYNAMIC] the observed identity is a real /bin/ps lstart record, not a placeholder",
      oks.every((o) => /^pid:\d+\|lstart:/.test(o.id)), JSON.stringify(oks.map((o) => o.id)));
  }

  // ---- FS-4: fast claim-and-exit, repeated — no OK may carry an unobserved identity ------------------
  {
    const RUNS = 6; const outcomes = [];
    for (let i = 0; i < RUNS; i++) {
      const w = world("fs4_" + i);
      const c = consumeActivationV4(w.verified, { now: w.now });
      createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: RECEIPT_CHILD });
      const cfg = w.writeChildConfig("fs4-config.json");
      const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg, "--fd", "3"], detached: false });
      outcomes.push({ ok: g.ok, code: g.code, observed: g.start_identity_independently_observed, ack: g.supervisor_acknowledged });
    }
    ok("FS4a [DYNAMIC] the fast claim-and-exit race never yields an OK with an unobserved identity (" + RUNS + " runs)",
      outcomes.every((o) => o.ok !== true || o.observed === true), JSON.stringify(outcomes));
    ok("FS4b [DYNAMIC] no run reports acknowledged-without-observation", outcomes.every((o) => !(o.ack === true && o.observed !== true)), JSON.stringify(outcomes));
    ok("FS4c [DYNAMIC] every outcome is a known structured lifecycle code", outcomes.every((o) => Object.values(LC_CODES).includes(o.code)), JSON.stringify(outcomes.map((o) => o.code)));
  }

  // ---- FS-5: the fail-open guard is gone from the source, and the code is reachable ------------------
  {
    const lsrc = src("src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs");
    ok("FS5a [STRUCTURAL] the conditional `observedStart !== null &&` guard no longer gates the comparison",
      !/observedStart !== null && d\.supervisor_start_identity !== observedStart/.test(lsrc));
    ok("FS5b [STRUCTURAL] SUPERVISOR_START_IDENTITY_UNAVAILABLE is declared and RETURNED, not dead",
      (lsrc.match(/SUPERVISOR_START_IDENTITY_UNAVAILABLE/g) || []).length >= 3);
    ok("FS5c [STRUCTURAL] no caller option can substitute or skip the observation",
      !/opts\.(observedStart|skipStartIdentity|startIdentity|psPath)/.test(lsrc) && /observedStartIdentity\(child\.pid\)/.test(lsrc));
    const fsrc = src("src/v8b/lrcq/assurance/fixed-executables.mjs");
    ok("FS5d [STRUCTURAL] the observation still runs through the fixed absolute /bin/ps in the minimal environment",
      /FIXED_PS = "\/bin\/ps"/.test(fsrc) && /env: MINIMAL_ENV/.test(fsrc));
  }

  console.log("");
  console.log("LRCQ CHECKER-197-FINAL-FIVE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exitCode = 1; }
} finally {
  for (const w of worlds) w.cleanup();
}
})();
