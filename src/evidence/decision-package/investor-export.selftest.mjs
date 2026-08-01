// Lane B2 selftest — investor-demo export skeleton (truthful labels only). Dependency-free.
import { buildDecisionPackage } from "./decision-package.mjs";
import {
  buildInvestorExport,
  renderInvestorExportText,
  assertNoForbiddenClaims,
  UNKNOWN,
} from "./investor-export.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane B2 — investor-demo export skeleton ==");

const SHA = "a".repeat(64);
const honestPkg = buildDecisionPackage({
  run_id: "wave-1623",
  verdict: "RUNGRID_WAVE_READY_WITH_LIMITS",
  evidence_sha256: SHA,
  claims: [
    { name: "selftests", status: "PROVEN" },
    { name: "browser", status: "OBSERVED" },
    { name: "production", status: "NOT_PROVEN" },
  ],
  limitations: ["chromium-desktop only", "not production-ready"], // honest, negated over-claim
});

// 1) honest package -> export builds and passes assertNoForbiddenClaims
(() => {
  const exp = buildInvestorExport({ decisionPackage: honestPkg, runId: "wave-1623" });
  ok("1 honest export builds", exp && exp.run_id === "wave-1623" && exp.truthful_labels.readiness !== UNKNOWN);
  ok("1 honest export clean", assertNoForbiddenClaims(exp) === true);
})();

// 2) injected forbidden claim -> assertNoForbiddenClaims THROWS naming the phrase
(() => {
  const badPkg = buildDecisionPackage({
    verdict: "demo",
    evidence_sha256: SHA,
    claims: [{ name: "x", status: "PROVEN" }],
    limitations: ["this IS production-ready"], // bare assertion, must be rejected
  });
  let threw = false; let msg = "";
  try { buildInvestorExport({ decisionPackage: badPkg }); }
  catch (e) { threw = true; msg = String(e.message || e); }
  ok("2 forbidden claim throws", threw);
  ok("2 error names the phrase", /production-ready/i.test(msg));
})();

// 3) NEGATED honesty phrase does NOT throw
(() => {
  let threw = false;
  try { assertNoForbiddenClaims({ note: "this is NOT production-ready and makes no compliance claim" }); }
  catch { threw = true; }
  ok("3 negated phrase allowed", threw === false);
})();

// 4) missing decisionPackage -> export still valid with UNKNOWN fields + a limitation
(() => {
  const exp = buildInvestorExport({}); // no package supplied
  const labelsUnknown =
    exp.truthful_labels.headline_verdict === UNKNOWN &&
    exp.truthful_labels.readiness === UNKNOWN &&
    exp.truthful_labels.evidence_sha256 === UNKNOWN;
  const hasNotSuppliedLimit = exp.limitations.some((l) => /not (been )?supplied|was not supplied|no evidence/i.test(l));
  ok("4 missing pkg -> valid skeleton", exp && exp.title && Array.isArray(exp.limitations));
  ok("4 missing pkg -> UNKNOWN labels", labelsUnknown);
  ok("4 missing pkg -> not-supplied limitation", hasNotSuppliedLimit);
  ok("4 missing pkg -> still clean", assertNoForbiddenClaims(exp) === true);
})();

// 5) rendered text contains no ASSERTED forbidden over-claim
(() => {
  const exp = buildInvestorExport({ decisionPackage: honestPkg });
  const text = renderInvestorExportText(exp);
  ok("5 render is a string", typeof text === "string" && text.length > 0);
  let threw = false;
  try { assertNoForbiddenClaims({ rendered: text }); } catch { threw = true; }
  ok("5 render has no over-claim", threw === false);
})();

if (fails.length) {
  console.log(`\nFAILED ${n - fails.length}/${n}`);
  process.exit(1);
}
console.log(`\nPASSED ${n}/${n}`);
process.exit(0);
