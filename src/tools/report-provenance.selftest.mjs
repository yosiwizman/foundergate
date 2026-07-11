// FounderGate — PROVENANCE LAW guard (Assembly Manual §26).
//
// Proves the bundle-completion-report provenance validator: a claimed lane with no
// resolvable PR + SHA is INVALID; a claim citing a real, on-disk SHA is VALID. This is
// the permanent lock against the phantom-"VA-REPAIR-5" class (a bundle believed-reviewed
// that was never built — no branch, no PR, no commit).

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { validateReport, extractShas, shaResolves } from "./report-provenance.mjs";

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== bundle-report provenance law ==");

// HEAD always resolves (present even in a shallow CI checkout); an all-zero SHA never does.
const HEAD = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const ZERO = "0000000000000000000000000000000000000000";
// A valid-LOOKING but non-resolvable 40-hex SHA (not decimal, not a repeated char, so
// it survives extractShas and exercises the "does not resolve" path).
const BADSHA = "deadbeefcafe1234deadbeefcafe1234deadbeef";

check("a real HEAD SHA resolves; an all-zero SHA does not", () => {
  assert.ok(shaResolves(HEAD), "HEAD must resolve");
  assert.ok(!shaResolves(ZERO), "all-zero SHA must not resolve");
});

check("extractShas ignores decimals and repeated-char look-alikes", () => {
  assert.deepEqual(extractShas("see #7 and 2026 and abc1234"), ["abc1234"]);
  assert.equal(extractShas("0000000 1111111").length, 0, "repeated-char shas are not real citations");
});

check("a phantom lane claim (no PR, no SHA) is INVALID — the VA-REPAIR-5 class", () => {
  const report = "## VA-REPAIR-5 complete\n- L4 What's-Next panel built and reviewed\n- L1 active signal shipped\n";
  const r = validateReport(report);
  assert.equal(r.valid, false, "a lane claim with no PR/SHA must be invalid");
  assert.ok(r.claims.some((c) => !c.ok && /no SHA cited|no PR/.test(c.reasons.join())), "must flag the missing provenance");
});

check("a lane claim citing a real PR + resolvable SHA is VALID", () => {
  const report = `## VA-REPAIR-4 complete\n- J1 running-state chip built — PR #65, SHA ${HEAD}\n`;
  const r = validateReport(report);
  assert.equal(r.valid, true, `expected valid, got: ${JSON.stringify(r.claims)}`);
});

check("a lane claim citing a NON-resolvable SHA is INVALID (even with a PR)", () => {
  const report = `## bundle\n- L9 mystery lane done — PR #999, SHA ${BADSHA}\n`;
  const r = validateReport(report);
  assert.equal(r.valid, false, "an unresolvable SHA must be invalid");
  assert.ok(r.claims.some((c) => /do not resolve/.test(c.reasons.join())), "must flag the unresolvable SHA");
});

check("a report with no lane claims is vacuously valid (nothing asserted)", () => {
  assert.equal(validateReport("Just a note. Nothing claimed here.").valid, true);
});

// Written-Authority Law (Assembly Manual §28) — the completion table's AUTHORITY column.
check("AUTHORITY column: a resolvable path + SHA is VALID", () => {
  const report = `| Lane | Authority (path @ SHA) |\n| --- | --- |\n| L1 built — PR #1, SHA ${HEAD} | \`docs/ROADMAP.md\` @ \`${HEAD}\` |\n`;
  const r = validateReport(report);
  assert.equal(r.valid, true, `expected valid, got ${JSON.stringify(r.authorities)}`);
});

check("AUTHORITY column: a non-resolvable authority path is INVALID (phantom authority)", () => {
  const report = `| Lane | Authority |\n| --- | --- |\n| J9 done — PR #2, SHA ${HEAD} | \`docs/nope/ghost-spec.md\` @ \`${HEAD}\` |\n`;
  const r = validateReport(report);
  assert.equal(r.valid, false, "an authority whose path does not resolve must be invalid");
  assert.ok(r.authorities.some((a) => !a.ok && /does not resolve on disk/.test(a.reasons.join())), "must flag the missing authority path");
});

check("AUTHORITY 'AUTHORITY-UNRECORDED (historical)' marker is accepted (grandfathered)", () => {
  const report = `| Lane | Authority |\n| --- | --- |\n| K3 done — PR #3, SHA ${HEAD} | AUTHORITY-UNRECORDED (historical) |\n`;
  assert.equal(validateReport(report).valid, true);
});

// Honest-Duration & Soak-Proof Law (Assembly Manual §29).
check("SOAK PASS with start/end timestamps spanning >= the claimed duration is VALID", () => {
  const report = "FOUNDERGATE HARNESS 8-HOUR SOAK PASS\nstart: 2026-07-11T00:00:00Z\nend: 2026-07-11T09:00:00Z\n";
  const r = validateReport(report);
  assert.equal(r.valid, true, `expected valid, got ${JSON.stringify(r.soaks)}`);
});

check("SOAK PASS whose timestamps span LESS than the claimed duration is INVALID (phantom soak)", () => {
  const report = "FOUNDERGATE HARNESS 8-HOUR SOAK PASS\nstart: 2026-07-11T00:00:00Z\nend: 2026-07-11T03:00:00Z\n";
  const r = validateReport(report);
  assert.equal(r.valid, false, "a soak whose window is shorter than the claim must be invalid");
  assert.ok(r.soaks.some((s) => !s.ok && /span only/.test(s.reasons.join())), "must flag the too-short span");
});

check("SOAK PASS with NO timestamps is INVALID", () => {
  const r = validateReport("FOUNDERGATE HARNESS 24-HOUR SOAK PASS — all green\n");
  assert.equal(r.valid, false);
  assert.ok(r.soaks.some((s) => !s.ok && /two parseable/.test(s.reasons.join())));
});

check("a report with no SOAK PASS line is unaffected (vacuously valid)", () => {
  assert.equal(validateReport("No soak here. Just notes.").valid, true);
});

console.log(`\nV8-PROVENANCE-LAW: PASS ${pass}`);
