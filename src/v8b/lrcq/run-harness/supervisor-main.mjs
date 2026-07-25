#!/usr/bin/env node
// FounderGate LRCQ — the REAL dedicated SUPERVISOR process (FG-LRCQ-ACT-017/029). Spawned DETACHED by the
// governed lifecycle authority (new process group, stdin disconnected, stdout/stderr redirected to durable
// run files, one inherited ANONYMOUS descriptor carrying the per-activation ephemeral key) so it OUTLIVES
// the launcher/terminal and owns the supervised run to the immutable deadline.
//
// It owns: INDEPENDENT V4 re-verification, the supervisor claim -> SUPERVISOR_EXECUTION capability,
// RUN_ACTIVE publication + PID + process-start identity, the heartbeat, execution via the ONE executor and
// provider adapter, the immutable deadline, durable terminal state, and process-group teardown.
//
// It NEVER: trusts a value handed to it by the launcher as authority (it re-reads and re-verifies the signed
// activation from disk itself); re-consumes the activation; mints a new deadline window; invokes real Claude
// directly (it runs whatever provider the SIGNED activation binds — a deterministic stub in tests).
import { readFileSync, appendFileSync } from "node:fs";
import { assertAuthorityObject, FS_CLASS } from "../assurance/fs-authority-guards.mjs";
import { fixedPs } from "../assurance/fixed-executables.mjs";
import { startSupervisor } from "./supervisor.mjs";
import { attachSupervisorFromInheritedFdV4, isSupervisorExecutionCapabilityV4 } from "../assurance/lifecycle-authority-v4.mjs";
import { verifyActivationFile, loadManifestV4, executeSignedRunV4 } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";

export const V4_KEY_FD = 3;

// FG-CHK-197-03: the EXHAUSTIVE allow-list of supervisor-config keys. The config may locate the signed
// activation, the authorization bytes, the expected activation identity and the durable run directories — and
// nothing else. `exec` and `now` were authority-bearing (exec.repoRoot/candidateRef reached `git worktree add`
// and so chose which commit every job worktree was built from; `now` replaced the clock used by the
// supervisor's INDEPENDENT re-verification). Any key outside this list — and those two in particular — is
// refused fail-closed BEFORE the lifecycle claim and before any provider access, mirroring the launcher's
// PRODUCTION_TEST_OVERRIDE_REFUSED treatment of a retired test variable.
export const SUPERVISOR_CONFIG_KEYS = Object.freeze([
  "schema", "activation_path", "authorization_path", "activation_identity", "run_id",
  "supervisorDir", "runRoot", "heartbeatMs", "eventLog",
]);
export const FORBIDDEN_SUPERVISOR_CONFIG_KEYS = Object.freeze(["exec", "now", "man", "manifest", "bindings", "capability", "verified", "key", "keyFd", "clock", "nowFn", "provider", "candidateRef", "repoRoot"]);

// Returns { ok } or { ok:false, code, keys }. Pure, so a test can assert it without spawning.
export function validateSupervisorConfig(cfg) {
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return { ok: false, code: "SUPERVISOR_CONFIG_MALFORMED", keys: [] };
  const present = Object.keys(cfg);
  const forbidden = present.filter((k) => FORBIDDEN_SUPERVISOR_CONFIG_KEYS.includes(k));
  if (forbidden.length) return { ok: false, code: "SUPERVISOR_CONFIG_AUTHORITY_FIELD_REFUSED", keys: forbidden };
  const unknown = present.filter((k) => !SUPERVISOR_CONFIG_KEYS.includes(k));
  if (unknown.length) return { ok: false, code: "SUPERVISOR_CONFIG_UNKNOWN_FIELD_REFUSED", keys: unknown };
  if (typeof cfg.activation_path !== "string" || !cfg.activation_path) return { ok: false, code: "SUPERVISOR_CONFIG_NO_ACTIVATION_PATH", keys: [] };
  if (cfg.heartbeatMs !== undefined && !(typeof cfg.heartbeatMs === "number" && cfg.heartbeatMs > 0 && cfg.heartbeatMs <= 600000)) return { ok: false, code: "SUPERVISOR_CONFIG_BAD_HEARTBEAT", keys: ["heartbeatMs"] };
  return { ok: true, code: "OK", keys: [] };
}

// FG-CHK-197-02: the published process-start identity comes from the FIXED ABSOLUTE /bin/ps, not a
// PATH-resolved `ps`, so it cannot be forged by an environment the supervisor inherits.
function processStartIdentity(pid) { try { return fixedPs(["-o", "lstart=", "-p", String(pid)]); } catch { return null; } }

async function supervise(cfgPath) {
  // FG-CHK-197-04: the supervisor config is a SECRET_OR_MUTABLE authority object — owner + 0600, no symlink,
  // regular file — checked before it is parsed.
  const cg = assertAuthorityObject(cfgPath, FS_CLASS.SECRET_OR_MUTABLE);
  if (!cg.ok) { console.error("SUPERVISOR_CONFIG_UNSAFE: " + cg.code + " " + (cg.mode || "")); process.exit(2); }
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  const log = (o) => { try { appendFileSync(cfg.eventLog || "/dev/null", JSON.stringify({ ...o, pid: process.pid, at: Math.floor(Date.now() / 1000) }) + "\n"); } catch { /* */ } };
  // FG-CHK-197-03: refuse an authority-bearing or unknown config field BEFORE the lifecycle claim.
  const vcfg = validateSupervisorConfig(cfg);
  if (!vcfg.ok) {
    log({ evt: "SUPERVISOR_ABORT", reason: vcfg.code, refused_keys: vcfg.keys });
    console.error(vcfg.code + ": " + JSON.stringify(vcfg.keys));
    process.exit(2);
  }
  // Production time is the ACTUAL system clock. The config cannot select a clock.
  const now = Math.floor(Date.now() / 1000);

  // (1) INDEPENDENT re-verification: read the founder-signed V4 activation + the exact authorization bytes
  // from disk and verify against the GOVERNED public-key authority. Nothing the launcher said is trusted.
  const vr = verifyActivationFile(cfg.activation_path, cfg.authorization_path, { nowEpoch: now });
  if (!vr.ok) { log({ evt: "SUPERVISOR_ABORT", reason: "independent V4 re-verification failed: " + vr.code }); process.exit(3); }
  if (cfg.activation_identity && vr.capability.activation_identity !== cfg.activation_identity) { log({ evt: "SUPERVISOR_ABORT", reason: "activation identity mismatch" }); process.exit(3); }

  // (2) Attach over the inherited anonymous descriptor: the ephemeral key is read and consumed inside the
  // authority module, which verifies the marker + intent ephemeral signatures, proves this program IS the
  // intent's supervisor entrypoint, and writes the atomic ephemeral-signed supervisor claim.
  const sup = attachSupervisorFromInheritedFdV4(vr.capability, V4_KEY_FD, { now });
  if (!sup.ok || !isSupervisorExecutionCapabilityV4(sup.capability)) { log({ evt: "SUPERVISOR_ABORT", reason: "V4 supervisor attach refused: " + sup.code + (sup.detail ? " (" + sup.detail + ")" : "") }); process.exit(4); }
  const cap = sup.capability;

  // (3) The SIGNED manifest (bound by the signed run_manifest_digest) — loaded by THIS process.
  const man = loadManifestV4(cap);
  if (!man.ok) { log({ evt: "SUPERVISOR_ABORT", reason: "signed manifest invalid: " + man.reason }); process.exit(4); }

  // (4) Single-supervisor ownership + the IMMUTABLE deadline, derived from SIGNED facts on the capability
  // (never from a V3 consumption receipt, never a new window).
  const receipt = {
    consumed_once: true, activation_id: cap.activation_identity,
    immutable_hard_deadline_epoch: cap.hard_deadline_epoch,
    run_duration_s: cap.limits.run_duration_s, max_budget_usd: cap.limits.max_budget_usd,
  };
  const own = startSupervisor({ stateDir: cfg.supervisorDir, run_id: cap.run_id, consumerReceipt: receipt, pid: process.pid, process_start_identity: processStartIdentity(process.pid), now });
  if (!own.ok) { log({ evt: "SUPERVISOR_REFUSED", reason: own.reason }); process.exit(4); }
  log({ evt: "RUN_ACTIVE", run_id: cap.run_id, activation_id: cap.activation_identity, supervisor_pid: process.pid, supervisor_claim_digest: cap.supervisor_claim_digest, immutable_hard_deadline_epoch: receipt.immutable_hard_deadline_epoch });

  // Advance the heartbeat on a bounded interval while the run executes (in THIS process, not the launcher).
  const hbMs = typeof cfg.heartbeatMs === "number" ? cfg.heartbeatMs : 30000;
  const hb = setInterval(() => { try { own.handle.heartbeat(Math.floor(Date.now() / 1000)); } catch { /* */ } }, hbMs);
  if (hb.unref) hb.unref();

  const counters = { c: {}, wrap(name, fn) { this.c[name] = 0; return async (...a) => { this.c[name]++; return fn(...a); }; } };
  let term = "HELD", reason = "unmapped terminal (fail-closed)";
  try {
    // FG-CHK-197-03: production execution behaviour comes from the reviewed modules and the SIGNED
    // capability/manifest bindings. NOTHING from the config can select an execution function, a git runner,
    // a repository root, or a candidate ref — executeSignedRunV4 derives all of those from `cap` + `man`.
    const result = await executeSignedRunV4(cap, vr.activation, man, counters, {});
    const fstate = result && result.final_state;
    const ostat = result && result.outcome_status;
    // EXHAUSTIVE terminal mapping. A held/failed/defect/unknown terminal NEVER falls through to
    // STOPPED_EXHAUSTED (clean queue exhaustion); anything unrecognized fails closed to HELD.
    const held = (x) => !!x && /HELD|TEARDOWN_DEFECT|PROVIDER_FAILURE|CHECKER_FAILURE|EVIDENCE_DEFECT|RECONCILE|BUILDER_OUTPUT_INVALID/.test(x);
    if (fstate === "STOPPED_DEADLINE" || ostat === "CONTROLLED_DEADLINE_STOP") { term = "STOPPED_DEADLINE"; reason = "hard deadline reached"; }
    else if (fstate === "STOPPED_BY_STOP") { term = "STOPPED_BY_STOP"; reason = "stop control"; }
    else if (fstate === "CONTROLLED_BUDGET_STOP" || fstate === "STOPPED_BUDGET" || ostat === "CONTROLLED_BUDGET_STOP") { term = "CONTROLLED_BUDGET_STOP"; reason = "run-wide budget ceiling"; }
    else if (held(fstate) || held(ostat) || (result && result.ready === false)) { term = "HELD"; reason = ostat || fstate || (result && result.refused && result.refused.stage) || "held"; }
    else if (fstate === "STOPPED_EXHAUSTED" && !held(ostat)) { term = "STOPPED_EXHAUSTED"; reason = "queue drained / run complete"; }
    else { term = "HELD"; reason = "UNKNOWN_TERMINAL (fail-closed): final_state=" + fstate + " outcome_status=" + ostat; }
    log({ evt: "RUN_TERMINAL", final_state: fstate, outcome_status: ostat, mapped: term, productive_jobs_completed: result && result.productive_jobs_completed, refused: result && result.refused });
  } catch (e) { term = "FAILED_CLOSED"; reason = (e && e.message) || "error"; log({ evt: "RUN_FAILED_CLOSED", reason }); }
  clearInterval(hb);
  try { own.handle.setTerminal(term, reason); } catch { /* */ }
  // Bounded process-group teardown: reap any lingering descendant provider process in our group.
  try { process.kill(-process.pid, "SIGTERM"); } catch { /* no descendants / already gone */ }
  log({ evt: "TORN_DOWN", terminal: term });
  process.exit(0);
}

if (process.argv[1] && /supervisor-main\.mjs$/.test(process.argv[1])) {
  const ci = process.argv.indexOf("--config");
  if (ci < 0 || !process.argv[ci + 1]) { console.error("usage: supervisor-main.mjs --config <cfg.json>"); process.exit(2); }
  supervise(process.argv[ci + 1]).catch((e) => { console.error("supervisor error:", e && e.message); process.exit(5); });
}
