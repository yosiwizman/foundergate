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
// Auto-discovered by scripts/run-selftests.mjs (scans src/ for *.selftest.mjs).

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const R = (p) => {
  const full = join(REPO, p);
  assert.ok(existsSync(full), `MISSING FILE: ${p} — this guard expects it to exist at ${full}`);
  return readFileSync(full, "utf8");
};
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

// EXCLUDED — known, DISCLOSED residuals still carrying the stale term. They are outside the
// PR #186 checker's findings F-1..F-4 and outside this change's authorized scope. Listed here
// so the omission is visible in every run rather than silent.
const REMAINING_RESIDUAL = [
  "docs/commercial/FOUNDERGATE_EVIDENCE_PACK_DESIGN_PARTNER_OFFER.md",
  "docs/commercial/FOUNDERGATE_DESIGN_PARTNER_INTAKE.md",
  "docs/product/FOUNDERGATE_EVIDENCE_PACK_SPEC.md",
  "docs/product/FOUNDER_URL_DROP_UI_STRANGER_TEST.md",
  "docs/testing/FOUNDER_URL_DROP_UI_ACCESSIBILITY_PLAN.md",
  "docs/testing/FOUNDER_URL_DROP_UI_PLAYWRIGHT_PLAN.md",
  "tools/qual/headed-capture.mjs",
  "src/founder_url_drop/ui/urldrop.js (line 19 source comment only — not founder-visible)",
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

check("safety.html: result badge, lead paragraph and limitations bullet agree", () => {
  const p = "src/founder_url_drop/ui/safety.html";
  const t = R(p);
  assert.ok(
    t.includes(`<span class="badge badge-green" id="badge-compile">${LABEL}</span>`),
    `${p}: the green result badge must read exactly "${LABEL}" (id="badge-compile").`
  );
  assert.ok(
    t.includes(`<li>${LABEL} (structure parses)`),
    `${p}: the limitations card must open with "${LABEL} (structure parses)" so the badge and the ` +
      `explanation on the SAME page agree.`
  );
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
  const t = R(p);
  assert.ok(
    t.includes(`<span class="badge badge-green" id="badge-compile">${LABEL}</span>`),
    `${p}: the green result badge must read exactly "${LABEL}" (id="badge-compile").`
  );
  assert.ok(
    t.includes(`<li>${LABEL} (structure parses)</li>`),
    `${p}: the limitations bullet must read "${LABEL} (structure parses)" so the badge and the ` +
      `explanation on the SAME page agree.`
  );
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

// ---------------------------------------------------------------------------
// Disclosed residuals (informational, always printed).
// ---------------------------------------------------------------------------

console.log("  REMAINING_RESIDUAL (out of scope for this guard, disclosed not silent):");
for (const p of REMAINING_RESIDUAL) console.log(`    - ${p}`);

console.log(`copy-truth-consistency.selftest: ${pass} checks OK ` +
  `(label present; stale wording absent; ${TOKEN} invariant; byte-compilation rationale; ` +
  `same-page agreement; Evidence Pack agreement; history intact)`);
