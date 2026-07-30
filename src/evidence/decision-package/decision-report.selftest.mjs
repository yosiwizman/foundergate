// Lane C selftest — decision report (founder + investor readable, real evidence only).
import { buildDecisionReport, renderDecisionReportText } from "./decision-report.mjs";
import { UNKNOWN } from "./decision-package.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane C — decision report ==");

const SHA = "c".repeat(64);
const real = {
  run_id: "wave-2201",
  verdict: "RUNGRID_WAVE_READY_WITH_LIMITS",
  evidence_sha256: SHA,
  claims: [
    { name: "selftests", status: "PROVEN" },
    { name: "browser", status: "OBSERVED" },
    { name: "production", status: "NOT_PROVEN" },
  ],
  limitations: ["chromium-desktop only", "not production-ready"],
};

// 01 composes decision + investor from a real package
(() => {
  const r = buildDecisionReport(real);
  ok("01 composes decision + investor", r.decision.run_id === "wave-2201" && r.investor.generated_from.run_id === "wave-2201");
})();
// 02 missing verdict -> UNKNOWN
(() => {
  const r = buildDecisionReport({ claims: [] });
  ok("02 missing verdict -> UNKNOWN", r.decision.verdict === UNKNOWN && r.readiness === UNKNOWN);
})();
// 03 never certifies green/production (flags false)
(() => {
  const r = buildDecisionReport(real);
  ok("03 certifies flags false", r.decision.certifies_green === false && r.decision.certifies_production === false);
})();
// 04 readiness token never claims production/commercial
(() => {
  const r = buildDecisionReport(real);
  ok("04 readiness honest", !/production|commercial/i.test(r.readiness));
})();
// 05 disclaimer present and exact
(() => {
  const r = buildDecisionReport(real);
  ok("05 disclaimer", r.disclaimer === "Evidence-backed decision material with explicit limitations. NOT a production, commercial, or customer-ready claim.");
})();
// 06 both narrative summaries present and non-empty
(() => {
  const r = buildDecisionReport(real);
  ok("06 summaries present", typeof r.founder_summary === "string" && r.founder_summary.length > 0 && typeof r.investor_summary === "string" && r.investor_summary.length > 0);
})();
// 07 narratives never over-claim production/customer-ready/certified-green readiness
// (bare "commercial" is allowed only inside honest negations, e.g. "NOT ... a commercial claim")
(() => {
  const r = buildDecisionReport(real);
  const banned = /(?<!not[ -])(production[- ]ready|customer[- ]ready|certified green)/i;
  ok("07 summaries honest", !banned.test(r.founder_summary) && !banned.test(r.investor_summary));
})();
// 08 output frozen
(() => {
  const r = buildDecisionReport(real);
  ok("08 frozen", Object.isFrozen(r) && Object.isFrozen(r.decision) && Object.isFrozen(r.investor));
})();
// 09 render is deterministic
(() => {
  const a = renderDecisionReportText(buildDecisionReport(real));
  const b = renderDecisionReportText(buildDecisionReport(real));
  ok("09 deterministic render", a === b && typeof a === "string" && a.length > 0);
})();
// 10 limitations passthrough preserved
(() => {
  const r = buildDecisionReport(real);
  ok("10 limitations preserved", r.limitations.length === 2);
})();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nDECISION-REPORT-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
