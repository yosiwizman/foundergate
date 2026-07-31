// Lane C selftest — evidence decision package / investor-demo export skeleton.
import { buildDecisionPackage, buildInvestorExportSkeleton, renderDecisionText, readinessIsHonest, UNKNOWN } from "./decision-package.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Lane C — evidence decision package ==");

const SHA = "a".repeat(64);
const real = {
  run_id: "wave-1623",
  verdict: "RUNGRID_WAVE_READY_WITH_LIMITS",
  evidence_sha256: SHA,
  claims: [
    { name: "selftests", status: "PROVEN" },
    { name: "browser", status: "OBSERVED" },
    { name: "production", status: "NOT_PROVEN" },
  ],
  limitations: ["chromium-desktop only", "not production-ready"],
};

// 01 real inputs pass through with correct counts
(() => { const p = buildDecisionPackage(real); ok("01 counts", p.claim_counts.proven === 1 && p.claim_counts.observed === 1 && p.claim_counts.not_proven === 1 && p.claim_counts.total === 3); })();
// 02 verdict + sha preserved
(() => { const p = buildDecisionPackage(real); ok("02 verdict+sha", p.verdict === real.verdict && p.evidence_sha256 === SHA); })();
// 03 missing verdict -> UNKNOWN (never invented)
ok("03 missing verdict -> UNKNOWN", buildDecisionPackage({ claims: [] }).verdict === UNKNOWN);
// 04 invalid sha -> UNKNOWN
ok("04 bad sha -> UNKNOWN", buildDecisionPackage({ evidence_sha256: "nope" }).evidence_sha256 === UNKNOWN);
// 05 unknown claim status coerced to UNKNOWN (never upgraded to PROVEN)
(() => { const p = buildDecisionPackage({ claims: [{ name: "x", status: "totally-green" }] }); ok("05 bogus status -> UNKNOWN", p.claims[0].status === UNKNOWN); })();
// 06 NEVER certifies green/production
(() => { const p = buildDecisionPackage(real); ok("06 no green/production certification", p.certifies_green === false && p.certifies_production === false); })();
// 07 readiness never a production/commercial over-claim
(() => { const p = buildDecisionPackage(real); ok("07 readiness honest", readinessIsHonest(p) && !/production|commercial/i.test(p.readiness)); })();
// 08 no claims -> readiness UNKNOWN
ok("08 empty claims -> UNKNOWN readiness", buildDecisionPackage({ claims: [] }).readiness === UNKNOWN);
// 09 missing sha but claims present -> UNVERIFIED_EVIDENCE (not backed)
(() => { const p = buildDecisionPackage({ claims: [{ name: "a", status: "PROVEN" }] }); ok("09 no sha -> UNVERIFIED_EVIDENCE", p.readiness === "UNVERIFIED_EVIDENCE"); })();
// 10 not_proven present -> PARTIAL_EVIDENCE_WITH_LIMITS
(() => { const p = buildDecisionPackage(real); ok("10 not_proven -> PARTIAL", p.readiness === "PARTIAL_EVIDENCE_WITH_LIMITS"); })();
// 11 all proven + sha -> EVIDENCE_BACKED_WITH_LIMITS (still 'with limits')
(() => { const p = buildDecisionPackage({ evidence_sha256: SHA, claims: [{ name: "a", status: "PROVEN" }] }); ok("11 backed", p.readiness === "EVIDENCE_BACKED_WITH_LIMITS"); })();
// 12 investor skeleton splits proven vs not-proven, carries disclaimer
(() => { const p = buildDecisionPackage(real); const e = buildInvestorExportSkeleton(p); ok("12 skeleton split+disclaimer", e.what_is_proven.length === 2 && e.what_is_not_proven.length === 1 && /NOT a production/.test(e.disclaimer)); })();
// 13 render does NOT throw on a 'not production-ready' limitation (passthrough allowed)
(() => { let threw = false; try { renderDecisionText(buildDecisionPackage(real)); } catch { threw = true; } ok("13 render passthrough safe", threw === false); })();
// 14 deterministic render
(() => { ok("14 deterministic", renderDecisionText(buildDecisionPackage(real)) === renderDecisionText(buildDecisionPackage(real))); })();
// 15 outputs frozen
(() => { const p = buildDecisionPackage(real); ok("15 frozen", Object.isFrozen(p) && Object.isFrozen(p.claims) && Object.isFrozen(p.claim_counts) && Object.isFrozen(buildInvestorExportSkeleton(p))); })();
// 16 empty limitations -> render notes UNKNOWN, never blank invented content
(() => { const t = renderDecisionText(buildDecisionPackage({ claims: [], limitations: [] })); ok("16 empty limitations noted UNKNOWN", t.includes("(none recorded — treat as UNKNOWN)")); })();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-C-DECISION-PACKAGE-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
