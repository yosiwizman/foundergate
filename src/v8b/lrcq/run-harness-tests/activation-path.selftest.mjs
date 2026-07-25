// FounderGate LRCQ — activation-path correction (FG-LRCQ-ACT-001..004; migrated to V4 by FG-LRCQ-ACT-029).
// runHarness in REAL runtime kind now requires a genuine SUPERVISOR_EXECUTION capability, so this family runs
// in test-support/bodies/activation-path.body.mjs under the governed execution child. Deterministic; no Claude.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BODY = join(HERE, "test-support/bodies/activation-path.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const res = await runV4Body({
  worldOpts: { prefix: "fg-actpath-", nonce: "actpath", realTemporal: true, run_id: "run-X", reviewedRuntimeSha: "R", backlogDigest: "FD", providerPath: "/a", providerIdentity: "id" },
  bodyModule: BODY, configName: "actpath-config.json",
});
reportChecks(res, ok);

console.log("\nLRCQ ACTIVATION-PATH SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
