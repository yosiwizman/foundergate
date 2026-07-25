// FounderGate LRCQ — production-equivalent deterministic rehearsal (FG-LRCQ-ACT-005..008; migrated to V4 by
// FG-LRCQ-ACT-029). Every stage reaches the real provider spawn boundary, which requires a genuine
// SUPERVISOR_EXECUTION capability — mintable only inside a process that received the per-activation
// ephemeral key over the governed inherited anonymous descriptor. The matrix therefore runs in
// test-support/bodies/productive-rehearsal.body.mjs under the governed execution child. NO real Claude.
import { realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = realpathSync(join(HERE, "../provider-tests/productive-stub.mjs"));
const BODY = join(HERE, "test-support/bodies/productive-rehearsal.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const res = await runV4Body({
  worldOpts: { prefix: "fg-reh-", nonce: "reh", realTemporal: true, run_id: "reh", providerPath: STUB, resolvedProviderTarget: STUB, providerVersion: "v", providerIdentity: "id" },
  bodyModule: BODY, configName: "reh-config.json",
});
reportChecks(res, ok);

console.log("\nLRCQ PRODUCTIVE-REHEARSAL SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
