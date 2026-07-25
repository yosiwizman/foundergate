#!/usr/bin/env node
// FounderGate LRCQ — TEST-SUPPORT driver for FG-FFIN4-197-01. Structurally test-only.
//
// It drives ONE governed transfer whose supervisor is the adversarial forging child, while the PARENT's
// independent /bin/ps observation is made unavailable by GENUINE OPERATING-SYSTEM RESOURCE PRESSURE: the
// process file-descriptor table is filled and only a few descriptors are released, so the fork+pipe that
// /bin/ps needs fails with EMFILE exactly as it would during a long multi-process run. This is the same
// mechanism the fourth independent Checker used.
//
// NOTHING is injected into production source: there is no hook, no flag and no substitute executable. The
// observation still runs through the fixed absolute /bin/ps in the minimal controlled environment; it simply
// cannot succeed under the pressure. Run under a low `ulimit -n` so the pressure is cheap and bounded.
//
// argv: <result.json> <headroom>   (headroom = descriptors released from the fully-saturated state)
import { openSync, closeSync, writeFileSync, realpathSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./v4-fixture.mjs";
import { consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4, lifecycleStateV4 } from "../../assurance/lifecycle-authority-v4.mjs";
import { observedStartIdentity } from "../../assurance/activation-v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FORGER = realpathSync(join(HERE, "forging-start-identity-supervisor.mjs"));
const outPath = process.argv[2];
const headroom = Number(process.argv[3] || 6);

const w = makeDisposableV4World({ prefix: "fg-startid-", nonce: "sid" + headroom });
const result = { headroom };
try {
  const c = consumeActivationV4(w.verified, { now: w.now });
  createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: FORGER });
  const cfg = w.writeChildConfig("forge-config.json", { lifecycleRoot: w.lifecycleRoot, activationIdentity: w.verified.activation_identity });

  // ---- genuine OS resource pressure, held across the ENTIRE governed transfer ----
  const held = [];
  try { for (;;) held.push(openSync("/dev/null", "r")); } catch { /* table full */ }
  for (let i = 0; i < headroom && held.length; i++) { try { closeSync(held.pop()); } catch { /* */ } }
  const g = await spawnGovernedSupervisorV4(c.capability, { args: ["--config", cfg], detached: false });
  for (const fd of held) { try { closeSync(fd); } catch { /* */ } }

  const claimPath = join(w.lifecycleRoot, w.verified.activation_identity.replace(":", "_") + ".supervisor-claim.json");
  const claim = existsSync(claimPath) ? JSON.parse(readFileSync(claimPath, "utf8")) : null;
  const retry = await spawnGovernedSupervisorV4(c.capability, { detached: false });
  Object.assign(result, {
    ok: g.ok, code: g.code, detail: g.detail,
    supervisor_acknowledged: g.supervisor_acknowledged,
    start_identity_independently_observed: g.start_identity_independently_observed,
    accepted_start_identity: g.supervisor_start_identity || null,
    spawned_pid: g.supervisor_pid || null,
    claim_written_by_child: !!claim,
    claim_pid: claim ? claim.supervisor_pid : null,
    claim_identity: claim ? claim.supervisor_start_identity : null,
    transfer: g.transfer, retry_code: retry.code,
    spent: lifecycleStateV4(c.capability).transfer,
    child_alive_after: g.child && g.child.pid ? (() => { try { process.kill(g.child.pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } })() : false,
    ps_available_now: observedStartIdentity(process.pid) !== null,
  });
} catch (e) {
  result.driver_error = String((e && e.message) || e);
} finally {
  w.cleanup();
}
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
