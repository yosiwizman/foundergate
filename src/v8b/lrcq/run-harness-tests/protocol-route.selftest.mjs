// FounderGate LRCQ — ACT-009 PRODUCTION-ROUTE proof (FG-LRCQ-ACT-029 migration).
// The whole matrix reaches the real provider spawn boundary, which now requires a genuine
// SUPERVISOR_EXECUTION capability. That capability is mintable only inside a process that received the
// per-activation ephemeral key over the governed inherited anonymous descriptor, so the assertions run in
// test-support/bodies/protocol-route.body.mjs under the governed execution child. Deterministic stub only.
import { realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = realpathSync(join(HERE, "../provider-tests/productive-stub.mjs"));
const BODY = join(HERE, "test-support/bodies/protocol-route.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const res = await runV4Body({
  worldOpts: { prefix: "fg-proto-", nonce: "proto", realTemporal: true, run_id: "R", providerPath: STUB, resolvedProviderTarget: STUB, providerVersion: "v", providerIdentity: "id" },
  bodyModule: BODY, configName: "proto-config.json",
});
reportChecks(res, ok);

console.log("\nLRCQ PROTOCOL-ROUTE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
