// Lane C selftest — investor-demo export hardening.
import { buildInvestorExport, renderInvestorExportText } from "./investor-export.mjs";
import { UNKNOWN } from "./decision-package.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane C — investor export ==");

const SHA = "b".repeat(64);
const real = {
  run_id: "wave-1701",
  verdict: "RUNGRID_WAVE_READY_WITH_LIMITS",
  evidence_sha256: SHA,
  claims: [
    { name: "selftests", status: "PROVEN" },
    { name: "browser", status: "OBSERVED" },
    { name: "production", status: "NOT_PROVEN" },
  ],
  limitations: ["chromium-desktop only", "not production-ready"],
};

// 01 composes from a real decision package
(() => { const x = buildInvestorExport(real); ok("01 export_kind + generated_from", x.export_kind === "investor_demo" && x.generated_from.run_id === "wave-1701"); })();
// 02 missing verdict -> UNKNOWN, reflected in headline
(() => { const x = buildInvestorExport({ claims: [] }); ok("02 missing verdict -> UNKNOWN", x.generated_from.verdict === UNKNOWN && /UNKNOWN/.test(x.headline)); })();
// 03 never certifies green/production
(() => { const x = buildInvestorExport(real); ok("03 no certification", x.generated_from.certifies_green === false && x.generated_from.certifies_production === false); })();
// 04 readiness never a production/commercial over-claim
(() => { const x = buildInvestorExport(real); ok("04 readiness honest", !/production|commercial/i.test(x.readiness)); })();
// 05 proven vs not_proven split is correct
(() => { const x = buildInvestorExport(real); ok("05 split", x.proven.length === 2 && x.not_proven.length === 1); })();
// 06 fixed disclaimer string present
(() => { const x = buildInvestorExport(real); ok("06 disclaimer", x.disclaimer === "Evidence-backed demo material with explicit limitations. NOT a production, commercial, or customer-ready claim."); })();
// 07 output frozen (top-level and nested proven/not_proven arrays)
(() => { const x = buildInvestorExport(real); ok("07 frozen", Object.isFrozen(x) && Object.isFrozen(x.proven) && Object.isFrozen(x.not_proven)); })();
// 08 render is deterministic
(() => { const a = renderInvestorExportText(buildInvestorExport(real)); const b = renderInvestorExportText(buildInvestorExport(real)); ok("08 deterministic render", a === b && typeof a === "string" && a.length > 0); })();
// 09 a malicious verdict token gets sanitized away, never emitted verbatim
(() => { const x = buildInvestorExport({ ...real, verdict: "PRODUCTION READY" }); ok("09 banned verdict sanitized", !/production ready/i.test(x.headline)); })();
// 10 limitations passthrough preserved (not an over-claim to keep a limitation)
(() => { const x = buildInvestorExport(real); ok("10 limitations preserved", x.limitations.length === 2); })();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nINVESTOR-EXPORT-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
