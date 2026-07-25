// FounderGate LRCQ — INTEGRATED launcher path (FG-LRCQ-ACT-009..013; migrated to V4 by FG-LRCQ-ACT-029).
// executeSignedRunV4 requires a genuine SUPERVISOR_EXECUTION capability, so the integration runs in
// test-support/bodies/launcher-integration.body.mjs under the governed execution child. Deterministic
// protocol-faithful STUB provider only — NEVER real Claude.
import { realpathSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = realpathSync(resolve(HERE, "../../../.."));
const STUB = realpathSync(join(HERE, "../provider-tests/productive-stub.mjs"));
const BODY = join(HERE, "test-support/bodies/launcher-integration.body.mjs");

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const res = await runV4Body({
  worldOpts: { prefix: "fg-int-", nonce: "int", realTemporal: true, run_id: "INT-RUN", providerPath: STUB, resolvedProviderTarget: STUB, providerVersion: "stub-1", providerIdentity: "sha256:" + "a".repeat(64) },
  bodyModule: BODY, bodyArgs: { srcRepo: SRCREPO, stub: STUB }, configName: "int-config.json", timeoutMs: 300000,
});
reportChecks(res, ok);

console.log("\nLRCQ LAUNCHER-INTEGRATION SELFTEST: " + (n - fails.length) + "/" + n + " passed (3 jobs through executeSignedRunV4 + real worktrees, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
