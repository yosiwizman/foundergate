// FounderGate LRCQ — EXACT full 25-job production-route rehearsal (FG-LRCQ-ACT-013; migrated to V4 by
// FG-LRCQ-ACT-029). All 25 jobs cross the real provider spawn boundary, which requires a genuine
// SUPERVISOR_EXECUTION capability, so the rehearsal runs in test-support/bodies/full-rehearsal.body.mjs
// under the governed execution child. Deterministic protocol-faithful stub only; NO real Claude.
import { realpathSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = realpathSync(resolve(HERE, "../../../.."));
const STUB = realpathSync(join(HERE, "../provider-tests/productive-stub.mjs"));
const BODY = join(HERE, "test-support/bodies/full-rehearsal.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const res = await runV4Body({
  worldOpts: { prefix: "fg-full-", nonce: "full", realTemporal: true, run_id: "REAL-RUN", providerPath: STUB, resolvedProviderTarget: STUB, providerVersion: "v", providerIdentity: "id" },
  bodyModule: BODY, bodyArgs: { srcRepo: SRCREPO }, configName: "full-config.json", timeoutMs: 600000,
});
reportChecks(res, ok);

console.log("\nLRCQ FULL-REHEARSAL SELFTEST: " + (n - fails.length) + "/" + n + " passed (25 jobs, cost <= $10)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
