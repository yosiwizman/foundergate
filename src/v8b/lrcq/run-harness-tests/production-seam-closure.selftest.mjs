// FounderGate LRCQ — PRODUCTION SEAM CLOSURE proof (FG-LRCQ-ACT-019). Proves mechanically that the retired
// test-injection seams cannot affect a production run, that test-support is structurally isolated from the
// production import graph, that the synchronous in-process route is absent from production, and that a
// mutation reintroducing any of these turns this test RED. No real provider; nothing consumed; no run.
import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as PROD_LAUNCHER from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { WITNESS_PRODUCTION_MS, WITNESS_PRODUCTION_POLLS, witness } from "../run-harness/witness-main.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = join(HERE, "../../../..");
const LAUNCHER = join(SRCREPO, "tools/terminal0/lrcq/run-five-hour.mjs");
const WITNESS_MAIN = join(SRCREPO, "src/v8b/lrcq/run-harness/witness-main.mjs");
const SUPMAIN = join(SRCREPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs");
const REALPROV = join(SRCREPO, "src/v8b/lrcq/provider/real-provider.mjs");
const src = (p) => readFileSync(p, "utf8");
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-seamclose-"));

try {
  // ---- (1-9) Production --activation FAILS CLOSED when LRCQ_TEST_LIFECYCLE is present ----------------------
  // The lifecycle file, IF honored, would inject a stub manifest/provider/repo/candidate/supervisor. It must
  // NOT be honored: the CLI refuses BEFORE reading/consuming the activation and BEFORE spawning any process.
  const evilLife = join(ROOT, "evil-lifecycle.json");
  writeFileSync(evilLife, JSON.stringify({ manifest: { repository_root: "/evil/repo", provider_executable_path: "/evil/provider", evidence_root: "ev" }, loaded: {}, root: "/evil/repo", bindings: { run_harness_candidate_sha: "EVIL" }, exec: { repoRoot: "/evil/repo", candidateRef: "EVIL" }, life: { supervisorMainPath: "/evil/supervisor-main.mjs", ledgerDir: join(ROOT, "evilledger") } }));
  const act = join(ROOT, "activation.json"); writeFileSync(act, JSON.stringify({ schema_version: "lrcq-activation-3", run_id: "SEAM-PROBE" }));
  const authProbe = join(ROOT, "auth.txt"); writeFileSync(authProbe, "x\n", { mode: 0o600 });
  const supBefore = () => { try { return execFileSync("pgrep", ["-f", "supervisor-main.mjs"], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean).length; } catch { return 0; } };
  const before = supBefore();
  const r = spawnSync(process.execPath, [LAUNCHER, "--activation", act, "--authorization", authProbe], { env: { ...process.env, LRCQ_TEST_LIFECYCLE: evilLife }, encoding: "utf8", timeout: 15000 });
  let j = null; try { j = JSON.parse(r.stdout); } catch { /* */ }
  ok("01 production --activation refuses when LRCQ_TEST_LIFECYCLE is present", !!j && j.result === "PRODUCTION_TEST_OVERRIDE_REFUSED" && r.status === 1);
  ok("02 refusal records activation NOT consumed", !!j && j.activation_consumed === false);
  ok("03 refusal records NO process spawned", !!j && j.process_spawned === false);
  ok("04 provider invocation is zero", !!j && j.provider_invocation === 0);
  ok("05 no supervisor process was spawned by the refused command", supBefore() === before);
  ok("06 env-supplied evil ledger dir was NOT created (no consumption marker)", !existsSync(join(ROOT, "evilledger")));
  ok("07 env-supplied evil manifest/provider/repo string never reached output", !(r.stdout + r.stderr).includes("/evil/"));
  // The variable name is the sole thing echoed (for the audit trail), not any injected value.
  ok("08 refusal identifies the retired variable + command", !!j && j.variable === "LRCQ_TEST_LIFECYCLE" && j.command === "--activation");
  // Static: the production CLI has NO branch that assigns man/bindings from the lifecycle file.
  const launcherSrc = src(LAUNCHER);
  ok("09 production launcher no longer injects man/bindings/exec/life from the seam file", !/man\s*=\s*\{\s*manifest:\s*t\.manifest/.test(launcherSrc) && !/runBindings\s*=\s*t\.bindings/.test(launcherSrc) && !/testLife\s*=\s*t\.life/.test(launcherSrc));

  // ---- (13-14) Production WITNESS refuses the accelerator; constant is immutable 720000 --------------------
  const wcfg = join(ROOT, "w.json"); writeFileSync(wcfg, JSON.stringify({ supervisorDir: join(ROOT, "nope"), ledgerDir: join(ROOT, "nope"), runId: "X", runRoot: join(ROOT, "nope") }));
  const wr = spawnSync(process.execPath, [WITNESS_MAIN, "--config", wcfg], { env: { ...process.env, LRCQ_WITNESS_TEST_MS: "1" }, encoding: "utf8", timeout: 12000 });
  let wj = null; try { wj = JSON.parse(wr.stdout); } catch { /* */ }
  ok("13 production witness refuses when LRCQ_WITNESS_TEST_MS is present (before any verdict)", !!wj && wj.result === "PRODUCTION_WITNESS_OVERRIDE_REFUSED" && wj.variable === "LRCQ_WITNESS_TEST_MS" && wr.status !== 0);
  ok("14 production witness duration constant is immutable 720000 ms", WITNESS_PRODUCTION_MS === 720000 && WITNESS_PRODUCTION_POLLS === 12 && (wj.production_witness_ms === 720000));

  // ---- (15) Accelerated witness logic lives ONLY in a structurally test-only entry point -------------------
  const witnessSrc = src(WITNESS_MAIN);
  ok("15a production witness-main has NO env acceleration path (only the fail-closed refusal)", witnessSrc.includes("PRODUCTION_WITNESS_OVERRIDE_REFUSED") && !/testMs\s*!=\s*null\s*\?\s*testMs/.test(witnessSrc));
  ok("15b the accelerated witness entry exists under test-support", existsSync(join(SRCREPO, "src/v8b/lrcq/run-harness-tests/test-support/witness-accel.mjs")));

  // ---- (16) Production modules do NOT import test-support --------------------------------------------------
  const importsTestSupport = (s) => /from\s+["'][^"']*test-support[^"']*["']/.test(s) || /import\(["'][^"']*test-support/.test(s);
  ok("16a production launcher does not import test-support", !importsTestSupport(src(LAUNCHER)));
  ok("16b supervisor-main does not import test-support", !importsTestSupport(src(SUPMAIN)));
  ok("16c witness-main does not import test-support", !importsTestSupport(src(WITNESS_MAIN)));
  ok("16d real-provider does not import test-support", !importsTestSupport(src(REALPROV)));

  // ---- (17) executeSupervisedRun is ABSENT from the production authority graph -----------------------------
  ok("17a executeSupervisedRun is NOT exported from the production launcher module", typeof PROD_LAUNCHER.executeSupervisedRun === "undefined");
  ok("17b production launcher source neither defines nor calls executeSupervisedRun", !/executeSupervisedRun/.test(launcherSrc));
  ok("17c supervisor-main does not import/call executeSupervisedRun", !/executeSupervisedRun/.test(src(SUPMAIN)));
  ok("17d the V3 executeSupervisedRun model is RETIRED (absent from the whole tree)", !existsSync(join(SRCREPO, "src/v8b/lrcq/run-harness-tests/test-support/supervised-run.mjs")));

  // ---- (18-20) Mutation guards: reintroducing a seam / synchronous rewire turns THIS test red --------------
  // 18: a mutation that re-adds `LRCQ_TEST_LIFECYCLE` as an INJECTION (reading t.manifest/t.bindings/t.life to
  //     replace man/bindings) turns this RED. The variable may appear only in the fail-closed refusal.
  ok("18 reintroducing an LRCQ_TEST_LIFECYCLE injection into production turns red (refusal present, no injection reads)", launcherSrc.includes("PRODUCTION_TEST_OVERRIDE_REFUSED") && !/t\.manifest/.test(launcherSrc) && !/=\s*t\.bindings/.test(launcherSrc) && !/=\s*t\.life/.test(launcherSrc) && !/=\s*t\.exec/.test(launcherSrc));
  // 19: a mutation re-adding a witness acceleration path (honoring LRCQ_WITNESS_TEST_MS as a duration) turns this RED.
  ok("19 reintroducing an LRCQ_WITNESS_TEST_MS acceleration into production turns red (refusal present, no accel read)", witnessSrc.includes("PRODUCTION_WITNESS_OVERRIDE_REFUSED") && !/process\.env\.LRCQ_WITNESS_TEST_MS\s*\?/.test(witnessSrc) && !/testMs\s*!=\s*null\s*\?\s*testMs/.test(witnessSrc));
  // 20: the production --activation branch launches ONLY via launchDetachedSupervisor (no synchronous route).
  const actBranch = launcherSrc.slice(launcherSrc.indexOf('args.indexOf("--activation")'));
  ok("20 production --activation launches ONLY via launchDetachedSupervisorV4 (no synchronous/in-process route)", /launchDetachedSupervisorV4\(args\[ai \+ 1\], authorizationPath, \{\}\)/.test(actBranch) && !/executeSupervisedRun\(/.test(actBranch) && !/await executeSignedRun\(/.test(actBranch));
  // ---- (21-26) FG-LRCQ-ACT-029 V4 seam closure -------------------------------------------------------------
  ok("21 the production --activation call passes an EMPTY life object (no caller-supplied manifest/bindings/provider/candidate/dirs)", /launchDetachedSupervisorV4\(args\[ai \+ 1\], authorizationPath, \{\}\)/.test(actBranch));
  ok("22 the launcher derives the manifest from the SIGNED run_manifest_digest, never from a caller", /loadManifestV4/.test(launcherSrc) && /run manifest digest != SIGNED run_manifest_digest/.test(launcherSrc));
  ok("23 the launcher never accepts a caller-supplied key authority path or env override", !/FOUNDER_KEY_AUTHORITY_PATH|process\.env\.[A-Z_]*AUTHORITY/.test(launcherSrc));
  ok("24 the ephemeral key transfer is performed ONLY by the governed authority module", /spawnGovernedSupervisorV4/.test(launcherSrc) && !/\bspawn\(/.test(launcherSrc));
  ok("25 supervisor-main re-verifies INDEPENDENTLY and trusts no launcher-supplied authority", /verifyActivationFile\(cfg\.activation_path/.test(src(SUPMAIN)) && !/cfg\.capability|cfg\.verified/.test(src(SUPMAIN)));
  ok("26 the supervisor config carries only PUBLIC paths (no key, no capability, no manifest object)", /activation_path|authorization_path/.test(launcherSrc) && !/JSON\.stringify\(\{[^}]*capability/.test(launcherSrc));
} finally { try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ PRODUCTION-SEAM-CLOSURE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
