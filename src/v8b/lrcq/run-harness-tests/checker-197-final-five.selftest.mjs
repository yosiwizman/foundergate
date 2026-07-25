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
    ok("FA18 [DYNAMIC] the outcome is a structured result with a known lifecycle code",
      !!g2 && typeof g2.code === "string" && Object.values(LC_CODES).includes(g2.code), JSON.stringify(g2 && { ok: g2.ok, code: g2.code }));
    ok("FA19 [DYNAMIC] the authority is TRANSFERRED_SPENT regardless of which race arm won", lifecycleStateV4(c.capability).transfer === TRANSFER_STATES.SPENT, g2 && g2.code);
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
    const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--receipt", rp, "--fd", "3"], detached: false });
    ok("FA22 [DYNAMIC] a normal governed transfer still returns OK", g.ok === true && g.code === LC_CODES.OK, g.code + " " + (g.detail || ""));
    await new Promise((res) => { if (g.child) { g.child.on("close", res); setTimeout(res, 8000); } else res(); });
    const receipt = existsSync(rp) ? JSON.parse(readFileSync(rp, "utf8")) : null;
    ok("FA23 [DYNAMIC] the supervisor really received the key frame over the inherited descriptor", !!receipt && receipt.frame_bytes > 0, JSON.stringify(receipt));
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
    const g3 = await spawnGovernedSupervisorV4(c3.capability, { args: ["--receipt", rp, "--fd", "3"], detached: false });
    ok("FD18 [DYNAMIC] an UNTOUCHED lifecycle root still completes the governed transfer", g3.ok === true, g3.code + " " + (g3.detail || ""));
    await new Promise((res) => { if (g3.child) { g3.child.on("close", res); setTimeout(res, 8000); } else res(); });
    ok("FD19 [DYNAMIC] the supervisor received the key over the untouched root", existsSync(rp) && JSON.parse(readFileSync(rp, "utf8")).frame_bytes > 0);
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

  console.log("");
  console.log("LRCQ CHECKER-197-FINAL-FIVE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exitCode = 1; }
} finally {
  for (const w of worlds) w.cleanup();
}
})();
