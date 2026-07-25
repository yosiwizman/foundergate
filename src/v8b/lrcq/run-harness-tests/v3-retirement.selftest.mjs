// FounderGate LRCQ — V3 RETIREMENT + PRODUCTION AUTHORITY-GRAPH PURITY (FG-LRCQ-ACT-029).
//
// Replaces the former launcher-supervised family, whose subject (the V3 in-process `executeSupervisedRun`
// model and the V3 durable consumer) is RETIRED. Every property it proved — one-time consumption, durable
// replay blocking across processes, single-supervisor ownership, immutable deadline, durable terminal state,
// read-only witness — is now proven against the REAL V4 chain with REAL processes by
// detached-supervisor.selftest.mjs and detached-supervisor-failure.selftest.mjs.
//
// This family proves the RETIREMENT itself, mechanically:
//   R1 the production launcher exposes no V3 route and no V3 export;
//   R2 the retired V3 supervised-run model is gone from the tree;
//   R3 the V3 durable consumer's MUTATING claim is absent from the production import graph;
//   R4 the V3 activation validator is reachable in the harness only under DETERMINISTIC_TEST;
//   R5 a V3 record is refused at EVERY new production entrypoint (launcher CLI, launchDetachedSupervisorV4,
//      the REAL harness route, and the provider spawn boundary) with zero side effects;
//   R6 the historical V3 validators remain available for evidence/incident reconstruction.
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as PROD_LAUNCHER from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { launchDetachedSupervisorV4, verifyActivationFile } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { runHarness, RUNTIME_KIND } from "../run-harness/harness.mjs";
import { runJob } from "../provider/real-provider.mjs";
import { validateActivationV3 } from "../assurance/assurance-core.mjs";
import { V4_CODES } from "../assurance/activation-v4.mjs";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 300) + "]" : "")); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = realpathSync(resolve(HERE, "../../../.."));
const src = (p) => readFileSync(join(SRCREPO, p), "utf8");
const LAUNCHER_SRC = src("tools/terminal0/lrcq/run-five-hour.mjs");
const HARNESS_SRC = src("src/v8b/lrcq/run-harness/harness.mjs");
const SUPMAIN_SRC = src("src/v8b/lrcq/run-harness/supervisor-main.mjs");
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-v3ret-"));

// The V3 production import graph: every non-test module reachable as production source.
const prodFiles = [];
(function walk(d) { for (const e of readdirSync(d)) { const p = join(d, e); const st = statSync(p); if (st.isDirectory()) { if (e === "node_modules" || /-tests$/.test(e) || e === "test-support") continue; walk(p); } else if (e.endsWith(".mjs") && !e.endsWith(".selftest.mjs")) prodFiles.push(p); } })(join(SRCREPO, "src"));
(function walk(d) { for (const e of readdirSync(d)) { const p = join(d, e); const st = statSync(p); if (st.isDirectory()) { if (e === "node_modules") continue; walk(p); } else if (e.endsWith(".mjs") && !e.endsWith(".selftest.mjs")) prodFiles.push(p); } })(join(SRCREPO, "tools"));

try {
  // ---- R1: the production launcher exposes no V3 route ----
  ok("R1a the launcher exports no V3 launch route", typeof PROD_LAUNCHER.launchDetachedSupervisor === "undefined" && typeof PROD_LAUNCHER.executeSignedRun === "undefined" && typeof PROD_LAUNCHER.buildRealCfg === "undefined");
  ok("R1b the launcher exports the V4 route", typeof PROD_LAUNCHER.launchDetachedSupervisorV4 === "function" && typeof PROD_LAUNCHER.executeSignedRunV4 === "function" && typeof PROD_LAUNCHER.buildRealCfgV4 === "function");
  ok("R1c the launcher never imports the V3 activation validator or the V3 composer", !/validateActivationV3/.test(LAUNCHER_SRC) && !/compose-adapter-activation/.test(LAUNCHER_SRC));
  ok("R1d the launcher never imports the V3 mutating consumer", !/\bconsumeActivation\b(?!V4)/.test(LAUNCHER_SRC.replace(/consumeVerifiedActivation/g, "")));
  ok("R1e the --activation branch launches ONLY via launchDetachedSupervisorV4", (() => { const b = LAUNCHER_SRC.slice(LAUNCHER_SRC.indexOf('args.indexOf("--activation")')); return /launchDetachedSupervisorV4\(/.test(b) && !/executeSupervisedRun\(/.test(b) && !/await executeSignedRun\(/.test(b); })());
  ok("R1f the --activation branch requires an explicit --authorization file", /requires --authorization/.test(LAUNCHER_SRC));

  // ---- R2: the retired V3 supervised-run model is gone ----
  ok("R2a the V3 executeSupervisedRun model no longer exists anywhere", !existsSync(join(SRCREPO, "src/v8b/lrcq/run-harness-tests/test-support/supervised-run.mjs")));
  ok("R2b no source anywhere still references executeSupervisedRun", prodFiles.every((p) => !/executeSupervisedRun/.test(readFileSync(p, "utf8"))));

  // ---- R3: the V3 mutating consumer is absent from the production import graph ----
  const v3ConsumerUsers = prodFiles.filter((p) => { const s = readFileSync(p, "utf8"); return /import\s*\{[^}]*\bconsumeActivation\b[^}]*\}\s*from/.test(s); });
  ok("R3a no production module imports the V3 mutating consumeActivation: " + JSON.stringify(v3ConsumerUsers.map((p) => p.replace(SRCREPO + "/", ""))), v3ConsumerUsers.length === 0);
  ok("R3b the supervisor no longer reads a V3 consumption receipt", !/readConsumedReceipt/.test(SUPMAIN_SRC));
  ok("R3c the supervisor derives the immutable deadline from SIGNED facts on the capability", /cap\.hard_deadline_epoch/.test(SUPMAIN_SRC) && /consumed_once:\s*true/.test(SUPMAIN_SRC));
  ok("R3d the supervisor attaches ONLY over the inherited descriptor", /attachSupervisorFromInheritedFdV4/.test(SUPMAIN_SRC) && !/receiveEphemeralKeyFromFd/.test(SUPMAIN_SRC));

  // ---- R4: the V3 validator is reachable in the harness only under DETERMINISTIC_TEST ----
  ok("R4a the harness refuses V3 explicitly on the REAL route", /V3_REFUSED_FOR_EXECUTION/.test(HARNESS_SRC));
  ok("R4b the harness's V3 validator call is inside the non-REAL branch", (() => {
    const i = HARNESS_SRC.indexOf("validateActivationV3(cfg.activation, bindings)");
    if (i < 0) return false;
    const before = HARNESS_SRC.slice(Math.max(0, i - 700), i);
    return /runtime_kind === RUNTIME_KIND\.REAL[\s\S]*\} else \{/.test(before);
  })());
  ok("R4c the REAL route requires the V4 capability before anything else", /V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED/.test(HARNESS_SRC));

  // ---- R5: a V3 record is refused at EVERY new production entrypoint, with zero side effects ----
  const v3 = { schema_version: "lrcq-activation-3", founder_signature: "SYN", run_id: "V3-RUN", hard_deadline_epoch: 9_000_000_000 };
  const v3Path = join(ROOT, "v3.json"); writeFileSync(v3Path, JSON.stringify(v3));
  const authPath = join(ROOT, "auth.txt"); writeFileSync(authPath, "x\n", { mode: 0o600 });
  // (a) the verification gate
  ok("R5a verifyActivationFile refuses a V3 record", verifyActivationFile(v3Path, authPath, {}).code === V4_CODES.V3_REFUSED_FOR_EXECUTION);
  // (b) the detached launch route
  { const r = await launchDetachedSupervisorV4(v3Path, authPath, { authDeps: { allowLoosePerms: true } });
    ok("R5b launchDetachedSupervisorV4 refuses a V3 record (not consumed, not launched, zero provider)", r.ready === false && r.consumed === false && r.launched === false && r.provider_invocation === 0, JSON.stringify(r.refused)); }
  // (c) the production CLI
  { const cli = spawnSync(process.execPath, [join(SRCREPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "--activation", v3Path, "--authorization", authPath], { encoding: "utf8", timeout: 30000 });
    let j = null; try { j = JSON.parse(cli.stdout); } catch { /* */ }
    ok("R5c the production CLI refuses a V3 record", !!j && j.launched === false && j.consumed === false && JSON.stringify(j.refused).includes("V3_REFUSED_FOR_EXECUTION"), (cli.stdout || "").slice(-300)); }
  // (d) the REAL harness route
  { const r = await runHarness({ run_id: "V3-RUN", runtime_kind: RUNTIME_KIND.REAL, activation: v3, bindings: {}, setupChecks: {}, lockManager: { acquire: () => ({ ok: true }), release() {} }, liveClock: () => 1000, controlReader: () => ({ pause: false, stop: false }), evidenceWriter: { append() {}, index() {} }, recoveryWriter: { write() {}, nextSafeAction() {} }, transactionWriter: { record() {} }, replayWriter: { append() {} }, machineVerifier: async () => ({ pass: true }), checker: async () => ({ result: "CLEAN" }), dispatch: async () => ({ ok: true }), teardownVerifier: async () => ({ torn_down: true }) });
    ok("R5d the REAL harness route refuses a V3 record at the V4 authority gate", r.ready === false && r.refused.stage === "v4_execution_authority" && r.dispatched === false, JSON.stringify(r.refused)); }
  // (e) the provider spawn boundary
  { const r = await runJob({ schema_version: "lrcq-activation-2", founder_signature: "sig" }, { job_id: "v3", risk_class: "WIDE_SAFE", gate_trigger: "NONE", worktree: ROOT, branch: "lane/x" }, {}, { env: { PATH: process.env.PATH } });
    ok("R5e the provider spawn boundary refuses without the V4 capability (nothing spawned)", r.outcome === "ACTIVATION_REFUSED" && r.started === false && r.pid === null && (r.refusals || []).some((x) => /V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED/.test(x)), JSON.stringify(r.refusals)); }

  // ---- R6: the historical V3 validators remain readable for evidence/incident reconstruction ----
  ok("R6a validateActivationV3 still exists (evidence-only)", typeof validateActivationV3 === "function" && validateActivationV3({}, {}).valid === false);
  ok("R6b the V3 consumer module still exists for read-only evidence reconstruction", existsSync(join(SRCREPO, "src/v8b/lrcq/run-harness/activation-consumer.mjs")) && /read-only/i.test(src("src/v8b/lrcq/run-harness/activation-consumer.mjs")));
} finally { try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ V3-RETIREMENT SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
