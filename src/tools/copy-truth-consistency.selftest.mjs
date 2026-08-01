// FounderGate — FOUNDER COPY-TRUTH consistency guard (PR #186 follow-up; findings F-1..F-4).
//
// Why this exists. PR #186 renamed the founder-facing result label to "Source parsing
// observed" on two live surfaces, but the normative specs, the UI truth contract, the claim
// register, the same-page lead/limitations copy, the progress-stage names and the
// design-partner Evidence Pack still said "compileability". The ONLY assertion on either
// phrase lived in tests/e2e/safety.spec.mjs, which needs Playwright + browsers and therefore
// never runs in the pure-Node suite. This selftest is the executable coverage for those
// strings: it reads the CURRENT files from disk and fails with a path-specific message.
//
// NON-TAUTOLOGY RULE: every expected string below is a LITERAL in THIS file. Nothing is read
// out of a file under test and then asserted back against that same file.
//
// TOKEN RULE: the stable machine classification token is assembled at runtime from two
// literals (see TOKEN) instead of being written out, so that merely adding this guard does
// not change the token's whole-tree occurrence count — the very invariant it protects.
//
// HISTORY RULE: historical evidence is protected by PINNED CONTENT DIGESTS (HISTORICAL_PINNED),
// not by "does the word still appear somewhere in the file". A presence test is satisfied by
// partial history: deleting one line, or falsifying the substance of a record while leaving the
// word in place, both keep the word present. Every pinned sha256 below is a LITERAL in this
// file, measured once at PR #186's head be3209d632702403c05b555620949092986ad0a3, so any edit,
// truncation or deletion of a historical file fails with that file's own path.
//
// ELEMENT-ID RULE: this guard checks founder-visible TEXT and same-page agreement. It must not
// pin HTML element ids. The result badge is located by its CLASS, never by id="badge-compile" —
// that identifier is itself known-stale (sealed informational finding F-7) and a legitimate
// future rename of it must not turn this suite red.
//
// Pure Node, deterministic, read-only. Needs no network, no dependency and no `.git` state.
// Auto-discovered by scripts/run-selftests.mjs (scans src/ for *.selftest.mjs).

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const R = (p) => {
  const full = join(REPO, p);
  assert.ok(existsSync(full), `MISSING FILE: ${p} — this guard expects it to exist at ${full}`);
  return readFileSync(full, "utf8");
};
// Byte-exact read, used only for historical digest pinning. Deletion is itself a rewrite of the
// record, so a missing historical file fails here with its own path.
const RBYTES = (p) => {
  const full = join(REPO, p);
  assert.ok(
    existsSync(full),
    `MISSING HISTORICAL FILE: ${p} — historical evidence must not be deleted or moved ` +
      `(expected at ${full}). Restore it from PR #186's head be3209d6.`
  );
  return readFileSync(full);
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const count = (hay, needle) => hay.split(needle).length - 1;

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== founder copy-truth consistency guard (PR #186 follow-up: F-1..F-4) ==");

// ---------------------------------------------------------------------------
// Vocabulary — all literals.
// ---------------------------------------------------------------------------

// The approved CURRENT founder-facing label.
const LABEL = "Source parsing observed";

// The stable machine classification token and the machine JSON key derived from it.
// Assembled, never written literally (see TOKEN RULE above).
const TOKEN = ["COMPILEABILITY", "OBSERVED"].join("_");
const TOKEN_KEY = TOKEN.toLowerCase();

// The stale founder-facing term.
const STALE = "compileability";

// Stale founder-facing PHRASES that must not appear on any current surface.
const STALE_PHRASES = [
  "Compileability observed",
  "compileability observed",
  "COMPILEABILITY OBSERVED",
  "checking compileability",
  "compileability check",
  "harness-owned compileability",
  "compileability look",
  "compileability-observed",
  "Compileability may be observed",
];

// The accurate rationale. `python -m compileall` BYTE-COMPILES; it is not a text search, it
// does not execute the project, and it proves none of the listed properties.
const RATIONALE_CMD = "python -m compileall";
const RATIONALE_BYTECOMPILE = "byte-compile";
const RATIONALE_NOT_TEXT = "does not merely search text";
const RATIONALE_NOT_EXEC = "does not execute the project";
const RATIONALE_NOT_PROVEN =
  "runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness";

// The inaccurate justification that must never stand unqualified anywhere.
const FORBIDDEN_CLAIM = "no compiler runs";
const FORBIDDEN_CLAIM_QUALIFIED = `Never describe this check as "no compiler runs": a compiler does run`;

// Founder-facing progress-stage copy (must agree across UI, service and job script).
const STAGE_SAFETY = "running harness-owned source parsing check";
const STAGE_URLDROP = "checking source parsing";

// ---------------------------------------------------------------------------
// Scope: CURRENT surfaces only. Historical evidence is excluded by construction.
// ---------------------------------------------------------------------------

const CURRENT_SURFACES = [
  // live founder-facing UI
  "src/founder_url_drop/ui/safety.html",
  "src/founder_url_drop/ui/safety.js",
  "src/founder_url_drop/ui/urldrop.html",
  // live founder-facing servers / stage names
  "src/founder_url_drop/server.mjs",
  "src/safety_check/service.mjs",
  "src/safety_check/run-job.sh",
  // partner-facing Evidence Pack generator
  "src/safety_check/evidence-pack.mjs",
  // current normative specs / contracts / copy registers
  "docs/product/FOUNDER_URL_DROP_UI_SPEC.md",
  "docs/product/FOUNDER_SAFETY_CHECK_UI_TRUTH_CONTRACT.md",
  "docs/product/FOUNDER_SAFETY_CHECK_COPY_REGISTER.md",
  "docs/product/FOUNDER_URL_DROP_UI_COPY_REGISTER.md",
  "docs/product/FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md",
  // current design-partner / commercial copy
  "docs/commercial/FOUNDERGATE_EVIDENCE_PACK_SCOPE_AND_LIMITATIONS.md",
  // the browser assertion that names the label (kept in sync even though it cannot run here)
  "tests/e2e/safety.spec.mjs",
];

// EXCLUDED — historical evidence. These record what a past run actually displayed and MUST
// keep their original wording. Rewriting them would falsify the record.
const HISTORICAL_EXCLUDED = [
  "docs/product/FOUNDER_URL_DROP_UI_WITNESS_PROTOCOL.md",
  "docs/testing/FOUNDER_URL_DROP_UI_ACCESSIBILITY_EVIDENCE.md",
  "docs/testing/FOUNDER_URL_DROP_UI_BROWSER_PROOF.md",
  "docs/testing/FOUNDER_URL_DROP_UI_FALSE_GREEN_REPORT.md",
  "docs/witness/FOUNDER_SAFETY_CHECK_PHASE7_1_WITNESS_CARD.md",
  "docs/witness/FOUNDER_URL_DROP_UI_WITNESS_CARD.md",
  "docs/witness/PHASE7_1_LIVE_WITNESS_RUN_AUTHORIZATION.md",
  "docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/EVIDENCE_PACK/evidence-pack.md",
];

// PINNED — the frozen historical corpus. Every file below lives in a path the authorized scope
// forbids rewriting AND carries the stale term or the machine token, i.e. it is part of the
// record of what past runs actually displayed. Each sha256 is a LITERAL measured at PR #186's
// head be3209d632702403c05b555620949092986ad0a3 and is byte-identical at that ref, at this
// branch and on main. Pinning the CONTENT (not the presence of a word) is what makes partial
// deletion, substantive falsification-with-the-word-retained, and any edit to a historical file
// beyond the small HISTORICAL_EXCLUDED list detectable.
//
// Deliberately NOT pinned: docs/testing/FOUNDER_URL_DROP_UI_ACCESSIBILITY_PLAN.md and
// docs/testing/FOUNDER_URL_DROP_UI_PLAYWRIGHT_PLAN.md. They sit in docs/testing/ but are current
// PLANS on the disclosed REMAINING_RESIDUAL list, not evidence of a past run; correcting their
// wording later is legitimate and must not fail this suite.
const HISTORICAL_PINNED = [
  ["docs/architecture/EVIDENCE_PACK_VERSIONING_AND_MIGRATION.md", "5645d4ac15e67f9ff58f4bbcb97f3140e15746d37948589f1455bed4fb52063e"],
  ["docs/architecture/FOUNDERGATE_PROJECT_ADOPTION_CONTRACT.md", "7ad0dc1a4388a3cd3499e2994196975504491a9680525ff657376ac722a9fa53"],
  ["docs/architecture/SAFETY_CHECK_EXTENSION_ARCHITECTURE.md", "849a92c7be4190a96c6dab5c4ad2b88647eadbc98047b02eff6fc5949c65a7fa"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/EVIDENCE_PACK/evidence-pack.html", "308fa22733417f2209c6cd90f24f6c4c68e8a98a5651e81e7177443de494900b"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/EVIDENCE_PACK/evidence-pack.json", "3e728dc7194576b0a70e7230ca974544b4ec0b3c0f9eec3ab9b4bd40b6fc3ee0"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/EVIDENCE_PACK/evidence-pack.md", "ad9d701bb6d6bb8f8aa4847d77f21f22ae721157da2a5d754174ec8bfbf2d6e1"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_LEDGER.jsonl", "c3d68613b3ad0961a6bc569d30cc7c29acb4475ea29e4f7200d624740607edb7"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_LIMITATIONS.json", "7d537b6d369ed6c016e5a1dfb1024870dc5270eea282d9918846f16936b1c78d"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_RESULT.json", "ec35059fe97301cf0c2bfdddd5abfe821ea630b069692f67744400056bfcbe2e"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_VERIFIER.json", "0b05e1d1e7b17dcd0a6d2a197b70309137975504a8e14343b608fa24145b8038"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/EVIDENCE_PACK/evidence-pack.html", "c5a23e3ed9606e57ba74cddd2a6171f280bf3436e21590f853b02d257bf30b7a"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/EVIDENCE_PACK/evidence-pack.json", "c83593834af5a771725245b811f1b02dd7c3eb05a7bb17f0d9adcb8f61c595fd"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/EVIDENCE_PACK/evidence-pack.md", "f0430a496a5ff127ced984ef3163ea0fbb327501e451f9d075b417e40c6e4dc7"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_LEDGER.jsonl", "1669baaba36ea629b4d97408412539b3fc6a63f4cdc0f9e92762124b124b197b"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_LIMITATIONS.json", "7d537b6d369ed6c016e5a1dfb1024870dc5270eea282d9918846f16936b1c78d"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_RESULT.json", "8f1576bdbefccdf649d46cd0e4e4cf93514d9df0192dd846f49bf9e29c2fb0dc"],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_VERIFIER.json", "fc7b2fccbb26a69e6545abb7492c71ce9ff1221d43698d015f74321e7a4f9373"],
  ["docs/coordination/OPEN_SANDBOX_PHASE6_RUN_LEDGER.jsonl", "7b89d3adbe1134bca5998f99cae7381bdb5b5c852fd1a4ce8d38138ffbf187a4"],
  ["docs/lanes/FOUNDER_SAFETY_CHECK_PHASE7_1_PROGRAM.md", "2d9ae1a8e115a9e7bdc5f0c58bf06dd33c79a38c0681b4dafa5de2ec80185015"],
  ["docs/lanes/FOUNDER_URL_DROP_UI_PHASE7_PROGRAM.md", "bce79f09a0ad4d85d96c73b8d5cb505d0ae6042a343989084f3aba8236df3661"],
  ["docs/lanes/OPEN_SANDBOX_PHASE6_PUBLIC_REPO_RUNTIME_LANE.md", "9ccaedd55a3661a7be0390adc5bc1c7058dc34a23bcf6d01d44970c4c99ca11b"],
  ["docs/product/FOUNDER_URL_DROP_UI_WITNESS_PROTOCOL.md", "9600961b696849d5684acf2eca31ef636cc72cbfe753abe776e3e0e7a44f0a33"],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_CHECKER_REPORT.md", "3ff0552b59c2c9d8e2c750e2b69b96e813c138d2b8e1b979431dbb936b59d8fb"],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_COMMAND_TRANSCRIPT.md", "b62e11e65e9fc8aceb6fefb08ad8c407c45a86ed95578c81d4455813e8b98f98"],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_RESULT.md", "2b49fa567a2be2a9c0e9624bb8ddbf633e3ed06cf76829bd54f249757509c8e0"],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_RUNTIME_EVIDENCE.json", "d284fc04bb62345d7e291cfdffb6d7a6b1cffa79edfc334269e04033baf254b9"],
  ["docs/research/opensandbox/phase7/OPEN_SANDBOX_PHASE7_UI_RUN_STATE.json", "d78b114152976b0ad9f89881a4078e42bb1e986d14ebe482c3038c1833bcd166"],
  ["docs/research/opensandbox/phase7/PHASE6_ADVISOR_AUDIT.md", "72a3750e9ee4a253dae601fe881db133c94d09298f16260c2e7523cd6abcc93d"],
  ["docs/research/opensandbox/phase7_1/PHASE7_1_FINAL_CHECKER_REPORT.md", "b1555a62dca2aab4ec83cc6ff1f304af757ed84c363d85b56c3ff7ba960c190b"],
  ["docs/research/opensandbox/phase7_1/PHASE7_INDEPENDENT_ADVISOR_AUDIT.md", "62441e41e8ac409c8613e411ecc9f28113d72be7f36e72649fb44532beff267d"],
  ["docs/status/FOUNDER_SAFETY_CHECK_PHASE7_1_DECISION_PACKET.md", "8fe59f125847e1f8f11347c4336a05dc35384296a990bd7697cd84e7044a07f6"],
  ["docs/status/FOUNDER_URL_DROP_UI_PHASE7_DECISION_PACKET.md", "250e11a10c1e1dc09974eedb079e4bb7130af17e65b157bbe60ed50147ec031e"],
  ["docs/status/OPEN_SANDBOX_PHASE6_DECISION_PACKET.md", "c69d0a417fe4cc82aaf894d140914c20912297beb0aaa20162d619785d57cdd6"],
  ["docs/status/PHASE7_1_FOUNDER_WITNESS_ACCEPTANCE.md", "625579cf44e7137efcd28eed83020298879df7f0018ed5371c208365e97841a8"],
  ["docs/status/PHASE7_1_FUTURE_ADOPTION_READINESS_MATRIX.md", "3e8115fa1f75d73142f5e9f9bb657fd092cbf43706ed2ef273209b9135deb50f"],
  ["docs/testing/FOUNDER_URL_DROP_UI_ACCESSIBILITY_EVIDENCE.md", "bad1c5582aca99b2549b667943b871327ab6e5d4d4d85e61c3996124689108ba"],
  ["docs/testing/FOUNDER_URL_DROP_UI_BROWSER_PROOF.md", "d3293ac80c888290d0dc441db37dcfa8f67b4731d8257c45e16eacbb564f1f85"],
  ["docs/testing/FOUNDER_URL_DROP_UI_FALSE_GREEN_REPORT.md", "9a6e16deed86e5944a43815997ed4f4d7e2ac03814da02baab5009397f021f08"],
  ["docs/testing/evidence/phase7-1-q/headed/HEADED_NOTE.md", "91e69694af56714efcfb2abf6efaeb1c8fce0cb8d575b50e15853ed589d6c258"],
  ["docs/testing/evidence/phase7-1-q/headed/STATES_INDEX.json", "79e8e1ab1956c97257aaf60afd6dd2b9208397dc6fc778bbfb9ccbd240667239"],
  ["docs/witness/FOUNDER_SAFETY_CHECK_PHASE7_1_EVIDENCE_INDEX.md", "2d75a3ce31533536488bc04077b7e68ea71852c8364e97b80b8be9cea7a77f7b"],
  ["docs/witness/FOUNDER_SAFETY_CHECK_PHASE7_1_WITNESS_CARD.md", "a93623173dcf96f73c353fbc5abdfc9a061ae885f378f7531c42f540f73f53b5"],
  ["docs/witness/FOUNDER_URL_DROP_UI_WITNESS_CARD.md", "9a63827b376a19a898bff8ce7918d9185ce6969f5fcf63de0620697ca88137ca"],
  ["docs/witness/PHASE7_1_LIVE_WITNESS_RUN_AUTHORIZATION.md", "c521ae50b75f6e40bec87ec8fd2f008b709c58f8b049f1c09a8df48e134c0893"],
];

// EXCLUDED — known, DISCLOSED residuals still carrying the stale term. They are outside the
// PR #186 checker's findings F-1..F-4 and outside this change's authorized scope. Listed here
// so the omission is visible in every run rather than silent.
//
// This list is the RUNTIME copy of the disclosure of record and must match it entry for entry
// (all 11) — a printed list shorter than the written disclosure is itself a small false-green.
const REMAINING_RESIDUAL = [
  "docs/commercial/FOUNDERGATE_EVIDENCE_PACK_DESIGN_PARTNER_OFFER.md",
  "docs/commercial/FOUNDERGATE_DESIGN_PARTNER_INTAKE.md",
  "docs/product/FOUNDERGATE_EVIDENCE_PACK_SPEC.md",
  "docs/product/FOUNDER_URL_DROP_UI_STRANGER_TEST.md",
  "docs/testing/FOUNDER_URL_DROP_UI_ACCESSIBILITY_PLAN.md",
  "docs/testing/FOUNDER_URL_DROP_UI_PLAYWRIGHT_PLAN.md",
  "tools/qual/headed-capture.mjs",
  "src/founder_url_drop/ui/urldrop.js (line 19 source comment only — not founder-visible)",
  "docs/product/FOUNDER_URL_DROP_UI_WITNESS_PROTOCOL.md (line 10 — historical record of what a " +
    "past run displayed, and also a re-runnable procedure; disclosed dual nature, left verbatim)",
  'the element id id="badge-compile" on safety.html and urldrop.html (sealed informational ' +
    "finding F-7 — a stale identifier, not founder-visible text; this guard deliberately does " +
    "NOT pin it, so renaming it later is a legitimate fix and stays green)",
  "prototypes/** (implementation + test fixtures)",
];

// Machine contracts that legitimately keep the old stem. Scrubbed before the residual scan so
// the scan cannot be satisfied by renaming a machine contract.
const scrubMachineContracts = (text) =>
  text
    .split(TOKEN).join("<TOKEN>")                   // the stable classification token (see TOKEN)
    .split(TOKEN_KEY).join("<TOKEN_KEY>")           // its lower-case JSON-key form
    .split("`" + STALE + "`").join("<DOC_KEYREF>")  // documented machine-key reference in markdown
    .split(STALE + ":").join("<JS_KEY>");           // claims.<key> / CLAIM_LABELS object key

// ---------------------------------------------------------------------------
// F-1 / F-2 / F-3 — the approved current label is present where required.
// ---------------------------------------------------------------------------

// Files that must carry the approved label, with the minimum number of occurrences.
const LABEL_REQUIRED = [
  ["src/founder_url_drop/ui/safety.html", 2],   // result badge + limitations bullet (same page)
  ["src/founder_url_drop/ui/safety.js", 1],     // result literal
  ["src/founder_url_drop/ui/urldrop.html", 2],  // result badge + limitations bullet (same page)
  ["src/founder_url_drop/ui/urldrop.js", 1],    // result literal
  ["docs/product/FOUNDER_URL_DROP_UI_SPEC.md", 1],
  ["docs/product/FOUNDER_SAFETY_CHECK_UI_TRUTH_CONTRACT.md", 1],
  ["docs/product/FOUNDER_SAFETY_CHECK_COPY_REGISTER.md", 1],
  ["docs/product/FOUNDER_URL_DROP_UI_COPY_REGISTER.md", 1],
  ["docs/product/FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md", 1],
  ["docs/commercial/FOUNDERGATE_EVIDENCE_PACK_SCOPE_AND_LIMITATIONS.md", 1],
  ["tests/e2e/safety.spec.mjs", 1],
];

check(`the approved current label "${LABEL}" is present on every required surface`, () => {
  for (const [p, min] of LABEL_REQUIRED) {
    const n = count(R(p), LABEL);
    assert.ok(
      n >= min,
      `${p}: found ${n} occurrence(s) of "${LABEL}", expected at least ${min}. ` +
        `Restore the approved founder-facing label in ${p} (do NOT invent a different label).`
    );
  }
});

// ---------------------------------------------------------------------------
// F-3 — stale founder-facing terminology is ABSENT from current surfaces.
// ---------------------------------------------------------------------------

check("no stale founder-facing phrase survives on any current surface", () => {
  for (const p of CURRENT_SURFACES) {
    const text = R(p);
    for (const phrase of STALE_PHRASES) {
      assert.ok(
        !text.includes(phrase),
        `${p}: still contains the stale founder-facing phrase "${phrase}". ` +
          `Current surfaces must use "${LABEL}" / "source parsing" wording. ` +
          `Historical evidence is excluded from this rule (see HISTORICAL_EXCLUDED in ${"src/tools/copy-truth-consistency.selftest.mjs"}).`
      );
    }
  }
});

check(`no bare "${STALE}" remains on a current surface once machine contracts are excluded`, () => {
  for (const p of CURRENT_SURFACES) {
    const scrubbed = scrubMachineContracts(R(p));
    const idx = scrubbed.toLowerCase().indexOf(STALE);
    if (idx !== -1) {
      const line = scrubbed.slice(0, idx).split("\n").length;
      const snippet = scrubbed.split("\n")[line - 1].trim().slice(0, 160);
      assert.fail(
        `${p}:${line}: residual founder-facing "${STALE}" wording -> ${snippet}\n` +
          `      Machine contracts are already excluded (the ${TOKEN} token, the ` +
          `${TOKEN_KEY} JSON key, a backticked \`${STALE}\` key reference in markdown, and the ` +
          `"${STALE}:" object key). Anything else on a current surface must be reworded to ` +
          `"source parsing".`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Invariance — the stable machine classification token is UNCHANGED.
// ---------------------------------------------------------------------------

// Expected files and per-file occurrence counts, measured at PR #186's head
// be3209d632702403c05b555620949092986ad0a3 (27 files, 28 occurrences). This guard fails if any
// listed file LOSES the token or changes its count — renaming or deleting the machine contract
// is the risk being guarded. Files added elsewhere later are tolerated (checked as a floor).
const TOKEN_EXPECTED = [
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_RESULT.json", 1],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/RUN_VERIFIER.json", 1],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_RESULT.json", 1],
  ["docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/RUN_VERIFIER.json", 1],
  ["docs/coordination/OPEN_SANDBOX_PHASE6_RUN_LEDGER.jsonl", 1],
  ["docs/lanes/FOUNDER_SAFETY_CHECK_PHASE7_1_PROGRAM.md", 1],
  ["docs/lanes/FOUNDER_URL_DROP_UI_PHASE7_PROGRAM.md", 1],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_CHECKER_REPORT.md", 1],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_COMMAND_TRANSCRIPT.md", 1],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_RESULT.md", 1],
  ["docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_RUNTIME_EVIDENCE.json", 1],
  ["docs/research/opensandbox/phase7/OPEN_SANDBOX_PHASE7_UI_RUN_STATE.json", 1],
  ["docs/research/opensandbox/phase7/PHASE6_ADVISOR_AUDIT.md", 1],
  ["docs/research/opensandbox/phase7_1/PHASE7_1_FINAL_CHECKER_REPORT.md", 1],
  ["docs/research/opensandbox/phase7_1/PHASE7_INDEPENDENT_ADVISOR_AUDIT.md", 1],
  ["docs/status/FOUNDER_SAFETY_CHECK_PHASE7_1_DECISION_PACKET.md", 1],
  ["docs/status/FOUNDER_URL_DROP_UI_PHASE7_DECISION_PACKET.md", 1],
  ["docs/status/OPEN_SANDBOX_PHASE6_DECISION_PACKET.md", 1],
  ["docs/witness/FOUNDER_SAFETY_CHECK_PHASE7_1_EVIDENCE_INDEX.md", 1],
  ["prototypes/customer_repository_intake/runtime_driver.py", 1],
  ["src/founder_url_drop/ui/safety.js", 1],
  ["src/founder_url_drop/ui/urldrop.js", 2],
  ["src/founder_url_drop/urldrop.selftest.mjs", 1],
  ["src/safety_check/evidence-pack.mjs", 1],
  ["src/safety_check/evidence-pack.selftest.mjs", 1],
  ["src/safety_check/run-job.sh", 1],
  ["src/safety_check/service.mjs", 1],
];

check(`the machine classification token ${TOKEN} is unchanged (27 files, 28 occurrences)`, () => {
  let total = 0;
  for (const [p, expected] of TOKEN_EXPECTED) {
    const n = count(R(p), TOKEN);
    assert.equal(
      n,
      expected,
      `${p}: ${TOKEN} occurs ${n} time(s), expected exactly ${expected}. ` +
        `That token is a MACHINE CONTRACT (classification value in run results, evidence and ` +
        `green-gating conditions). It must never be renamed as part of a copy change.`
    );
    total += n;
  }
  assert.equal(TOKEN_EXPECTED.length, 27, "expected 27 files carrying the token");
  assert.equal(total, 28, `expected 28 total occurrences of ${TOKEN}, counted ${total}`);
});

check(`the machine JSON keys (${TOKEN_KEY}, claims key) are unchanged`, () => {
  for (const p of ["src/founder_url_drop/server.mjs", "src/safety_check/service.mjs", "src/safety_check/run-job.sh"]) {
    assert.ok(
      R(p).includes(TOKEN_KEY),
      `${p}: the machine JSON key "${TOKEN_KEY}" is gone. It is a machine contract in the ` +
        `run limitations payload and must not be renamed by a copy change.`
    );
  }
  const ep = R("src/safety_check/evidence-pack.mjs");
  assert.ok(
    ep.includes(STALE + ":"),
    `src/safety_check/evidence-pack.mjs: the canonical Evidence Pack claims key "${STALE}" is gone. ` +
      `evidence-pack.json is the machine authority; rename the DISPLAY label only.`
  );
  const sel = R("src/safety_check/evidence-pack.selftest.mjs");
  assert.ok(
    sel.includes("claims." + STALE),
    `src/safety_check/evidence-pack.selftest.mjs: no longer asserts claims.${STALE}; the machine ` +
      `contract lost its guard.`
  );
});

// ---------------------------------------------------------------------------
// The compileall rationale is accurate and states its limits.
// ---------------------------------------------------------------------------

const RATIONALE_DOCS = [
  "docs/product/FOUNDER_URL_DROP_UI_SPEC.md",
  "docs/product/FOUNDER_SAFETY_CHECK_UI_TRUTH_CONTRACT.md",
  "docs/product/FOUNDER_SAFETY_CHECK_COPY_REGISTER.md",
  "docs/product/FOUNDER_URL_DROP_UI_COPY_REGISTER.md",
  "docs/product/FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md",
  "docs/commercial/FOUNDERGATE_EVIDENCE_PACK_SCOPE_AND_LIMITATIONS.md",
  "src/safety_check/evidence-pack.mjs",
];

check("every current rationale states that compileall BYTE-COMPILES and what it does NOT prove", () => {
  for (const p of RATIONALE_DOCS) {
    const t = R(p);
    for (const needed of [RATIONALE_CMD, RATIONALE_BYTECOMPILE, RATIONALE_NOT_TEXT, RATIONALE_NOT_EXEC, RATIONALE_NOT_PROVEN]) {
      assert.ok(
        t.includes(needed),
        `${p}: the compileall rationale is missing "${needed}". ` +
          `Every current rationale must say that \`${RATIONALE_CMD}\` byte-compiles the Python ` +
          `source to bytecode, that it does not merely search text, that it does not execute the ` +
          `project, and that it proves nothing about ${RATIONALE_NOT_PROVEN}.`
      );
    }
  }
});

check(`"${FORBIDDEN_CLAIM}" never appears unqualified on a current surface`, () => {
  for (const p of CURRENT_SURFACES) {
    const t = R(p);
    const bare = count(t, FORBIDDEN_CLAIM);
    if (bare === 0) continue;
    const qualified = count(t, FORBIDDEN_CLAIM_QUALIFIED);
    assert.equal(
      bare,
      qualified,
      `${p}: "${FORBIDDEN_CLAIM}" appears ${bare} time(s) but only ${qualified} are qualified. ` +
        `\`${RATIONALE_CMD}\` DOES run a compiler (it emits bytecode). Replace the claim with the ` +
        `bounded statement, or keep it only inside the qualifying sentence ` +
        `'${FORBIDDEN_CLAIM_QUALIFIED}...'.`
    );
  }
});

// ---------------------------------------------------------------------------
// F-3 — same-page agreement: badge, lead and limitations tell one story.
// ---------------------------------------------------------------------------

// Same-page agreement, checked on TEXT and located by CLASS — never by element id.
// See ELEMENT-ID RULE at the top of this file: id="badge-compile" is itself known-stale
// (sealed informational finding F-7); pinning it here would make the correct future fix fail.
const badgeAndExplanationAgree = (p, t) => {
  const badges = [...t.matchAll(/<span class="badge badge-green"[^>]*>([^<]*)<\/span>/g)];
  assert.equal(
    badges.length,
    1,
    `${p}: expected exactly 1 green result badge (<span class="badge badge-green" ...>), found ` +
      `${badges.length}. The founder result surface must make exactly one green claim.`
  );
  const badgeText = badges[0][1].trim();
  const bullet = t.match(/<li>([^<(]*)\(structure parses\)/);
  assert.ok(
    bullet,
    `${p}: the same-page limitations card must open with "<label> (structure parses)" so the ` +
      `badge is explained on the page that shows it. That bullet is missing.`
  );
  const explanationText = bullet[1].trim();
  assert.equal(
    badgeText,
    LABEL,
    `${p}: the green result badge reads "${badgeText}" but must read exactly "${LABEL}". ` +
      `(The badge is matched by its class, not its id — renaming the element id is allowed.)`
  );
  assert.equal(
    explanationText,
    badgeText,
    `${p}: SAME-PAGE DESYNC — the green badge says "${badgeText}" but the limitations ` +
      `explanation on the same page says "${explanationText}". A founder must not read two ` +
      `different claims about the same result. Make both read "${LABEL}".`
  );
};

check("safety.html: result badge, lead paragraph and limitations bullet agree", () => {
  const p = "src/founder_url_drop/ui/safety.html";
  const t = R(p);
  badgeAndExplanationAgree(p, t);
  assert.ok(
    /class="lead"[^>]*>[^<]*(?:<[^>]+>[^<]*)*byte-compile/i.test(t) || t.includes(RATIONALE_BYTECOMPILE),
    `${p}: the lead paragraph must say what actually happens (the source is byte-compiled) instead ` +
      `of a vague or stale description.`
  );
  assert.ok(
    t.includes("never executes") || t.includes("never executed"),
    `${p}: founder copy must state that the project itself is never executed.`
  );
  assert.ok(
    t.includes("not a text search"),
    `${p}: founder copy must state that the check is not a text search (compileall byte-compiles).`
  );
  assert.ok(
    t.includes(RATIONALE_NOT_PROVEN),
    `${p}: the limitations card must list what is NOT proven: ${RATIONALE_NOT_PROVEN}.`
  );
});

check("urldrop.html: result badge and limitations bullet agree", () => {
  const p = "src/founder_url_drop/ui/urldrop.html";
  badgeAndExplanationAgree(p, R(p));
});

check("progress-stage copy agrees across UI, service and job script", () => {
  for (const p of ["src/founder_url_drop/ui/safety.js", "src/safety_check/service.mjs"]) {
    assert.ok(
      R(p).includes(STAGE_SAFETY),
      `${p}: the founder-visible stage name must be "${STAGE_SAFETY}". The UI matches ledger events ` +
        `by name, so safety.js, service.mjs and run-job.sh must all use the identical string.`
    );
  }
  const job = R("src/safety_check/run-job.sh");
  assert.equal(
    count(job, `"${STAGE_SAFETY}"`),
    3,
    `src/safety_check/run-job.sh: expected 3 emissions of "${STAGE_SAFETY}" (RUNNING, failure path, ` +
      `DONE). The ledger names must match src/founder_url_drop/ui/safety.js exactly.`
  );
  for (const p of ["src/founder_url_drop/server.mjs", "docs/product/FOUNDER_URL_DROP_UI_SPEC.md"]) {
    assert.ok(
      R(p).includes(STAGE_URLDROP),
      `${p}: the URL-drop stage list must name the stage "${STAGE_URLDROP}" to match the spec and the ` +
        `founder-facing result label.`
    );
  }
});

// ---------------------------------------------------------------------------
// F-3 — the design-partner Evidence Pack agrees with the UI.
// ---------------------------------------------------------------------------

check("Evidence Pack generator: partner-facing wording agrees with the founder UI", () => {
  const p = "src/safety_check/evidence-pack.mjs";
  const t = R(p);
  assert.ok(
    t.includes("harness-owned source parsing"),
    `${p}: check_modules must name the module "harness-owned source parsing" — the downloadable ` +
      `packet is read side-by-side with the UI badge "${LABEL}".`
  );
  assert.ok(
    t.includes("source parsing observed only — build/tests/security/production NOT proven"),
    `${p}: the first limitation must read "source parsing observed only — build/tests/security/` +
      `production NOT proven" (plus the byte-compilation rationale).`
  );
  assert.ok(
    t.includes(`{ ${STALE}: "source parsing" }`) || /CLAIM_LABELS\s*=/.test(t),
    `${p}: the packet must map the canonical claim key to a founder-facing display label instead of ` +
      `printing the raw machine key to design partners.`
  );
  assert.ok(
    t.includes("claimLabel(k)"),
    `${p}: the Markdown and HTML renderers must render claim labels through claimLabel() so the ` +
      `packet shows founder-facing wording while evidence-pack.json keeps its machine keys.`
  );
  assert.ok(
    R("docs/product/FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md").includes(LABEL),
    `docs/product/FOUNDERGATE_EVIDENCE_PACK_CLAIM_REGISTER.md: the claim register must record the ` +
      `founder/partner-facing label "${LABEL}" for the source-parsing claim.`
  );
});

// ---------------------------------------------------------------------------
// Historical evidence must NOT be rewritten.
// ---------------------------------------------------------------------------

check("historical evidence still carries its original wording (not rewritten)", () => {
  for (const p of HISTORICAL_EXCLUDED) {
    const t = R(p).toLowerCase();
    assert.ok(
      t.includes(STALE),
      `${p}: this is HISTORICAL evidence of what a past run displayed. It must keep its original ` +
        `"${STALE}" wording — rewriting it would falsify the record. Revert this file.`
    );
    assert.ok(
      !t.includes(LABEL.toLowerCase()),
      `${p}: historical evidence must not be back-dated with the current label "${LABEL}".`
    );
  }
});

// The check above only proves the WORD survived. That is satisfied by partial history: delete
// one line, or rewrite "Build was not proven" to "Build WAS proven", and the word is still
// there. Content pinning is what actually protects the record — and it covers the whole frozen
// corpus, not just the handful of files named above.
check(`historical evidence is byte-for-byte intact (${HISTORICAL_PINNED.length} pinned digests)`, () => {
  for (const [p, expected] of HISTORICAL_PINNED) {
    const actual = sha256(RBYTES(p));
    assert.equal(
      actual,
      expected,
      `${p}: HISTORICAL EVIDENCE MODIFIED.\n` +
        `      sha256 now    ${actual}\n` +
        `      sha256 pinned ${expected}\n` +
        `      This file records what a past run actually displayed. Editing it — even deleting a ` +
        `single line, or changing a verdict while leaving the word "${STALE}" in place — falsifies ` +
        `the record. Revert ${p} to its content at PR #186's head be3209d6. If this file genuinely ` +
        `must change, that is a governance decision: re-pin the digest deliberately and say so in ` +
        `the change description.`
    );
  }
  assert.equal(
    HISTORICAL_PINNED.length,
    44,
    `expected 44 pinned historical files; found ${HISTORICAL_PINNED.length}. Silently shrinking ` +
      `the pinned corpus would reopen the coverage gap this check exists to close.`
  );
});

// ---------------------------------------------------------------------------
// Disclosure and self-integrity.
// ---------------------------------------------------------------------------

check("the disclosed residual list is complete (11 entries, matching the written disclosure)", () => {
  assert.equal(
    REMAINING_RESIDUAL.length,
    11,
    `REMAINING_RESIDUAL prints ${REMAINING_RESIDUAL.length} entries but the disclosure of record ` +
      `has 11. The list printed at runtime must match the written disclosure exactly, otherwise a ` +
      `reader of the test output under-counts what was left undone.`
  );
  assert.equal(new Set(REMAINING_RESIDUAL).size, REMAINING_RESIDUAL.length, "duplicate residual entry");
});

check("this guard does not perturb the token invariant it asserts", () => {
  const selfPath = fileURLToPath(import.meta.url);
  const self = readFileSync(selfPath, "utf8");
  assert.ok(
    !self.includes(TOKEN),
    `${selfPath}: this guard must NOT contain the literal machine token. Writing it out would ` +
      `change the whole-tree occurrence count (27 files / 28 occurrences) that this same file ` +
      `asserts — the guard would corrupt its own subject. Assemble it from parts (see TOKEN).`
  );
  assert.ok(
    !self.includes(TOKEN_KEY),
    `${selfPath}: this guard must NOT contain the literal lower-case machine JSON key, for the ` +
      `same reason (it would perturb the 5-file/5-occurrence invariant asserted above).`
  );
});

// ---------------------------------------------------------------------------
// Disclosed residuals (informational, always printed).
// ---------------------------------------------------------------------------

console.log("  REMAINING_RESIDUAL (out of scope for this guard, disclosed not silent):");
for (const p of REMAINING_RESIDUAL) console.log(`    - ${p}`);

console.log(`copy-truth-consistency.selftest: ${pass} checks OK ` +
  `(label present; stale wording absent; ${TOKEN} invariant; byte-compilation rationale; ` +
  `same-page agreement; Evidence Pack agreement; history byte-pinned by digest)`);
