// FounderGate LRCQ — catalog-consistency + unsupported-claim guard.
// The gate is eligible only when EVERY first-internal-run BLOCKER row is non-PLANNED/UNKNOWN and
// backed by evidence + tests, with any residual limitation being external-only HELD. PRE_CUSTOMER
// / EXTERNAL_PROOF / ENTERPRISE_LATER requirements must NOT be reclassified into green claims.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cat = JSON.parse(readFileSync(resolve(REPO, ".foundergate/backlog/assurance-control-master-v1.json"), "utf8"));
const blockers = cat.items.filter((i) => i.first_internal_5h_requirement === "BLOCKER");
const OK_STATUS = ["BUILT", "PROVEN", "CHECKER-CLEAN"];
const EXTERNAL_MARK = /HELD|NOT PROVEN|PRE_CUSTOMER|external|no real|deterministic test key|production/i;

ok("01 exactly 15 internal-run BLOCKERs", blockers.length === 15);
ok("02 NO blocker is PLANNED/UNKNOWN", !blockers.some((i) => i.status === "PLANNED" || i.status === "UNKNOWN"));
ok("03 every blocker status is BUILT/PROVEN/CHECKER-CLEAN", blockers.every((i) => OK_STATUS.includes(i.status)));
ok("04 every blocker has evidence paths", blockers.every((i) => Array.isArray(i.required_evidence) && i.required_evidence.length > 0));
ok("05 every blocker has tests", blockers.every((i) => Array.isArray(i.tests) && i.tests.length > 0));
ok("06 every blocker bound to an evaluated_sha", blockers.every((i) => typeof i.evaluated_sha === "string" && i.evaluated_sha.length >= 7));
// any residual limitation on a BUILT (not PROVEN) blocker must be external-only HELD language
ok("07 residual limitations are external-only HELD (not silent gaps)", blockers.every((i) => (i.limitations || []).every((l) => EXTERNAL_MARK.test(l))));
// no unsupported "green" reclassification of non-internal-run requirements
const nonBlocker = cat.items.filter((i) => i.first_internal_5h_requirement !== "BLOCKER");
ok("08 PRE_CUSTOMER/EXTERNAL_PROOF/ENTERPRISE_LATER requirements unchanged (not turned green)", nonBlocker.every((i) => ["PRE_CUSTOMER", "EXTERNAL_PROOF", "SUPPORTING", "ENTERPRISE_LATER"].includes(i.first_internal_5h_requirement)));
// unsupported-claim: a BUILT/PROVEN status must not claim more than "internal" without an external limitation
ok("09 no blocker claims production/customer/certified", !blockers.some((i) => /production-ready|customer-proven|certified|compliance-complete/i.test(JSON.stringify(i))));
ok("10 catalog totals preserved (46 items)", cat.items.length === 46);

console.log("\nLRCQ CATALOG-CONSISTENCY SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
